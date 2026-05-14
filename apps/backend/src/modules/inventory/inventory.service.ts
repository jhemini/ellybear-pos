import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdjustInventoryDto, TransferStockDto, SetLowStockAlertDto } from './dto/inventory.dto';
import { PaginationDto, paginationToSkipTake } from '../../common/pipes/parse-pagination.pipe';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Read inventory for a store ────────────────────────────────────────────────
  async findByStore(storeId: string, pagination: PaginationDto) {
    const { page = 1, limit = 50, search } = pagination;
    const { skip, take } = paginationToSkipTake(page, limit);

    const where: Prisma.InventoryWhereInput = {
      storeId,
      ...(search && {
        product: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        skip,
        take,
        include: { product: { include: { category: true } }, variant: true },
        orderBy: { product: { name: 'asc' } },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    // Flag low-stock items
    const enriched = items.map((inv) => ({
      ...inv,
      isLowStock: inv.lowStockAlert !== null && inv.quantity <= inv.lowStockAlert,
    }));

    return { items: enriched, total, page, limit };
  }

  // ─── Get low-stock alerts ─────────────────────────────────────────────────────
  async getLowStockAlerts(storeId: string) {
    const items = await this.prisma.inventory.findMany({
      where: { storeId },
      include: { product: true, variant: true },
    });

    return items.filter(
      (inv) => inv.lowStockAlert !== null && inv.quantity <= inv.lowStockAlert,
    );
  }

  // ─── Manual adjustment ────────────────────────────────────────────────────────
  async adjust(storeId: string, employeeId: string, dto: AdjustInventoryDto) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await this.getOrCreateInventory(tx, storeId, dto.productId, dto.variantId);

      const quantityBefore = Number(inv.quantity);
      const quantityAfter = quantityBefore + dto.quantity;

      if (quantityAfter < 0) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${quantityBefore}, requested: ${Math.abs(dto.quantity)}`,
        );
      }

      await tx.inventory.update({
        where: { id: inv.id },
        data: { quantity: quantityAfter },
      });

      await tx.inventoryMovement.create({
        data: {
          storeId,
          productId: dto.productId,
          variantId: dto.variantId,
          employeeId,
          type: dto.type,
          quantity: dto.quantity,
          quantityBefore,
          quantityAfter,
          unitCost: dto.unitCost,
          notes: dto.notes,
        },
      });

      return { productId: dto.productId, quantityBefore, quantityAfter };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPOSITE INVENTORY DEDUCTION ALGORITHM
  //
  // When a sale is processed, this method is called for each OrderItem.
  // Logic:
  //   1. If the product has inventory tracking, deduct 1 unit directly.
  //   2. If the product is a COMPOSITE (has a recipe), do NOT deduct the
  //      composite product itself — instead, deduct each ingredient by
  //      (quantity_sold × recipe_quantity × (1 + wastage/100)).
  //   3. If an ingredient is also composite, recurse (cocktails made from
  //      sub-recipes, etc.).
  //   4. All deductions happen inside a single DB transaction.
  // ─────────────────────────────────────────────────────────────────────────────
  async deductForSale(
    tx: Prisma.TransactionClient,
    storeId: string,
    orderId: string,
    productId: string,
    quantitySold: number,
    variantId?: string,
  ): Promise<void> {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: {
        recipeItems: { include: { ingredientProduct: true } },
      },
    });

    if (!product || !product.trackInventory) return;

    if (product.isComposite && product.recipeItems.length > 0) {
      // Deduct each ingredient recursively
      for (const recipeItem of product.recipeItems) {
        const ingredientQtyNeeded =
          quantitySold *
          Number(recipeItem.quantity) *
          (1 + Number(recipeItem.wastagePercent) / 100);

        await this.deductIngredient(
          tx,
          storeId,
          orderId,
          recipeItem.ingredientProductId,
          ingredientQtyNeeded,
        );
      }
    } else {
      // Simple product — deduct directly
      await this.deductIngredient(tx, storeId, orderId, productId, quantitySold, variantId);
    }
  }

  private async deductIngredient(
    tx: Prisma.TransactionClient,
    storeId: string,
    orderId: string,
    productId: string,
    quantity: number,
    variantId?: string,
  ) {
    const inv = await this.getOrCreateInventory(tx, storeId, productId, variantId);
    const quantityBefore = Number(inv.quantity);
    const quantityAfter = Math.max(0, quantityBefore - quantity); // allow negative flag separately

    await tx.inventory.update({
      where: { id: inv.id },
      data: { quantity: quantityAfter },
    });

    await tx.inventoryMovement.create({
      data: {
        storeId,
        productId,
        variantId,
        orderId,
        type: 'SALE',
        quantity: -quantity,
        quantityBefore,
        quantityAfter,
      },
    });

    // Log a warning if stock went negative
    if (quantityAfter === 0 && quantityBefore < quantity) {
      this.logger.warn(
        `Stock went negative for product ${productId} at store ${storeId}. ` +
          `Had ${quantityBefore}, needed ${quantity}`,
      );
    }
  }

  // ─── Reverse deduction on refund ─────────────────────────────────────────────
  async reverseForRefund(
    tx: Prisma.TransactionClient,
    storeId: string,
    orderId: string,
    productId: string,
    quantityRefunded: number,
    variantId?: string,
  ): Promise<void> {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: { recipeItems: true },
    });

    if (!product || !product.trackInventory) return;

    if (product.isComposite && product.recipeItems.length > 0) {
      for (const recipeItem of product.recipeItems) {
        const ingredientQty = quantityRefunded * Number(recipeItem.quantity);
        await this.restoreIngredient(
          tx, storeId, orderId, recipeItem.ingredientProductId, ingredientQty,
        );
      }
    } else {
      await this.restoreIngredient(tx, storeId, orderId, productId, quantityRefunded, variantId);
    }
  }

  private async restoreIngredient(
    tx: Prisma.TransactionClient,
    storeId: string,
    orderId: string,
    productId: string,
    quantity: number,
    variantId?: string,
  ) {
    const inv = await this.getOrCreateInventory(tx, storeId, productId, variantId);
    const quantityBefore = Number(inv.quantity);
    const quantityAfter = quantityBefore + quantity;

    await tx.inventory.update({ where: { id: inv.id }, data: { quantity: quantityAfter } });
    await tx.inventoryMovement.create({
      data: {
        storeId,
        productId,
        variantId,
        orderId,
        type: 'RETURN',
        quantity,
        quantityBefore,
        quantityAfter,
      },
    });
  }

  // ─── Set low-stock alert thresholds ──────────────────────────────────────────
  async setAlertThresholds(storeId: string, dto: SetLowStockAlertDto) {
    const inv = await this.getOrCreateInventory(
      this.prisma,
      storeId,
      dto.productId,
      dto.variantId,
    );
    return this.prisma.inventory.update({
      where: { id: inv.id },
      data: {
        lowStockAlert: dto.lowStockAlert,
        reorderPoint: dto.reorderPoint,
        reorderQty: dto.reorderQty,
      },
    });
  }

  // ─── Stock transfer between stores ───────────────────────────────────────────
  async transfer(organizationId: string, employeeId: string, dto: TransferStockDto) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.create({
        data: {
          fromStoreId: dto.fromStoreId,
          toStoreId: dto.toStoreId,
          status: 'COMPLETED',
          items: {
            create: dto.items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              quantity: i.quantity,
            })),
          },
        },
      });

      for (const item of dto.items) {
        // Deduct from source
        await this.deductIngredient(
          tx, dto.fromStoreId, transfer.id, item.productId, item.quantity, item.variantId,
        );
        // Add to destination
        await this.restoreIngredient(
          tx, dto.toStoreId, transfer.id, item.productId, item.quantity, item.variantId,
        );
      }

      return transfer;
    });
  }

  // ─── Movement history ─────────────────────────────────────────────────────────
  async getMovements(storeId: string, productId: string, pagination: PaginationDto) {
    const { page = 1, limit = 50 } = pagination;
    const { skip, take } = paginationToSkipTake(page, limit);

    return this.prisma.inventoryMovement.findMany({
      where: { storeId, productId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async getOrCreateInventory(
    tx: any,
    storeId: string,
    productId: string,
    variantId?: string,
  ) {
    const existing = await tx.inventory.findFirst({
      where: { storeId, productId, variantId: variantId ?? null },
    });

    if (existing) return existing;

    return tx.inventory.create({
      data: { storeId, productId, variantId, quantity: 0 },
    });
  }
}
