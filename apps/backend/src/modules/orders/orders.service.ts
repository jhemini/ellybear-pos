import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  CreateOrderDto,
  ProcessPaymentDto,
  ProcessMultiPaymentDto,
  RefundDto,
  SyncOfflineOrderDto,
} from './dto/order.dto';
import { PaginationDto, paginationToSkipTake } from '../../common/pipes/parse-pagination.pipe';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}

  // ─── Create order ─────────────────────────────────────────────────────────────
  async create(employeeId: string, dto: CreateOrderDto) {
    // Check for duplicate offline order
    if (dto.offlineId) {
      const existing = await this.prisma.order.findFirst({
        where: { offlineId: dto.offlineId },
      });
      if (existing) return existing; // idempotent
    }

    // Resolve product prices and validate items
    const resolvedItems = await this.resolveOrderItems(dto.storeId, dto.items);

    // Calculate totals
    const subtotal = resolvedItems.reduce((sum, i) => sum + i.total, 0);
    const discountAmount = resolvedItems.reduce((sum, i) => sum + (i.discountAmount ?? 0), 0);

    // Apply order-level discounts
    let orderDiscountAmount = 0;
    const discountRecords: any[] = [];
    if (dto.discountIds?.length) {
      const discounts = await this.prisma.discount.findMany({
        where: { id: { in: dto.discountIds }, isActive: true },
      });
      for (const d of discounts) {
        const amt =
          d.type === 'PERCENTAGE'
            ? (subtotal * Number(d.value)) / 100
            : Number(d.value);
        orderDiscountAmount += amt;
        discountRecords.push({ discountId: d.id, name: d.name, type: d.type, value: Number(d.value), amount: amt });
      }
    }

    const taxableAmount = subtotal - discountAmount - orderDiscountAmount;
    const taxAmount = resolvedItems.reduce((sum, i) => sum + i.taxAmount, 0);
    const total = Math.max(0, taxableAmount + taxAmount);

    // Generate order number
    const orderNumber = await this.generateOrderNumber(dto.storeId);

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          storeId: dto.storeId,
          registerId: dto.registerId,
          tableId: dto.tableId,
          customerId: dto.customerId,
          employeeId,
          orderNumber,
          type: dto.type,
          notes: dto.notes,
          subtotal,
          discountAmount: discountAmount + orderDiscountAmount,
          taxAmount,
          total,
          offlineId: dto.offlineId,
          isOffline: dto.isOffline ?? false,
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              name: item.name,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPrice: item.costPrice,
              discountAmount: item.discountAmount ?? 0,
              taxAmount: item.taxAmount,
              taxRate: item.taxRate,
              total: item.total,
              notes: item.notes,
              modifiers: item.modifiers?.length
                ? { create: item.modifiers }
                : undefined,
            })),
          },
          discounts: discountRecords.length
            ? { create: discountRecords }
            : undefined,
        },
        include: { items: true },
      });

      // Deduct inventory for each item
      for (const item of dto.items) {
        await this.inventoryService.deductForSale(
          tx,
          dto.storeId,
          newOrder.id,
          item.productId,
          item.quantity,
          item.variantId,
        );
      }

      // Update discount usage count
      if (dto.discountIds?.length) {
        await tx.discount.updateMany({
          where: { id: { in: dto.discountIds } },
          data: { usedCount: { increment: 1 } },
        });
      }

      return newOrder;
    });

    // Send to KDS if dine-in or takeaway
    if (dto.type === 'DINE_IN' || dto.type === 'TAKEAWAY') {
      await this.sendToKds(order.id, dto.storeId, resolvedItems);
    }

    return this.findById(order.id);
  }

  // ─── Sync offline order ───────────────────────────────────────────────────────
  async syncOfflineOrder(employeeId: string, dto: SyncOfflineOrderDto) {
    const existing = await this.prisma.order.findFirst({
      where: { offlineId: dto.offlineId },
    });
    if (existing) {
      // Mark as synced
      return this.prisma.order.update({
        where: { id: existing.id },
        data: { syncedAt: new Date() },
      });
    }

    // Create the order with offline timestamp
    const order = await this.create(employeeId, dto);

    // Process payments
    for (const payment of dto.payments) {
      await this.processPayment(order.id, payment);
    }

    // Mark as synced
    return this.prisma.order.update({
      where: { id: order.id },
      data: { syncedAt: new Date(), createdAt: new Date(dto.createdAt) },
    });
  }

  // ─── Process payment ──────────────────────────────────────────────────────────
  async processPayment(orderId: string, dto: ProcessPaymentDto) {
    const order = await this.findById(orderId);
    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException('Order is already completed');
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          orderId,
          method: dto.method,
          status: 'COMPLETED',
          amount: dto.amount,
          tipAmount: dto.tipAmount ?? 0,
          reference: dto.reference,
          processedAt: new Date(),
        },
      });

      // Calculate total paid across all payments
      const payments = await tx.payment.findMany({
        where: { orderId, status: 'COMPLETED' },
      });
      const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const changeAmount = Math.max(0, paidAmount - Number(order.total));

      const isFullyPaid = paidAmount >= Number(order.total);

      await tx.order.update({
        where: { id: orderId },
        data: {
          paidAmount,
          changeAmount,
          tipAmount: payments.reduce((sum, p) => sum + Number(p.tipAmount), 0),
          status: isFullyPaid ? OrderStatus.COMPLETED : OrderStatus.OPEN,
          completedAt: isFullyPaid ? new Date() : null,
        },
      });

      // Award loyalty points if customer exists
      if (order.customerId && isFullyPaid) {
        await this.awardLoyaltyPoints(tx, order.customerId, paidAmount);
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            totalSpent: { increment: paidAmount },
            totalOrders: { increment: 1 },
          },
        });
      }

      return payment;
    });
  }

  // ─── Process split payment ────────────────────────────────────────────────────
  async processSplitPayment(orderId: string, dto: ProcessMultiPaymentDto) {
    const results: Awaited<ReturnType<typeof this.processPayment>>[] = [];
    for (const payment of dto.payments) {
      results.push(await this.processPayment(orderId, payment));
    }
    return results;
  }

  // ─── Refund ───────────────────────────────────────────────────────────────────
  async refund(orderId: string, employeeId: string, dto: RefundDto) {
    const order = await this.findById(orderId);
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Only completed orders can be refunded');
    }

    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          orderId,
          paymentId: dto.paymentId,
          amount: dto.amount,
          reason: dto.reason,
          processedAt: new Date(),
        },
      });

      await tx.payment.update({
        where: { id: dto.paymentId },
        data: { status: 'REFUNDED' },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REFUNDED },
      });

      // Restore inventory for refunded items
      if (dto.items?.length) {
        for (const refundItem of dto.items) {
          const orderItem = await tx.orderItem.findUnique({
            where: { id: refundItem.orderItemId },
          });
          if (!orderItem) continue;

          await this.inventoryService.reverseForRefund(
            tx,
            order.storeId,
            orderId,
            orderItem.productId,
            refundItem.quantity,
            orderItem.variantId ?? undefined,
          );

          await tx.orderItem.update({
            where: { id: refundItem.orderItemId },
            data: {
              isRefunded: refundItem.quantity >= Number(orderItem.quantity),
              refundedQty: { increment: refundItem.quantity },
            },
          });
        }
      }

      return refund;
    });
  }

  // ─── Find orders ──────────────────────────────────────────────────────────────
  async findAll(storeId: string, pagination: PaginationDto & { status?: OrderStatus }) {
    const { page = 1, limit = 20, status } = pagination;
    const { skip, take } = paginationToSkipTake(page, limit);

    const where: Prisma.OrderWhereInput = {
      storeId,
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: true, modifiers: true } },
          payments: true,
          customer: true,
          employee: true,
          table: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { include: { taxRate: true } },
            variant: true,
            modifiers: true,
          },
        },
        payments: true,
        refunds: true,
        discounts: true,
        customer: true,
        employee: true,
        table: true,
        kdsTickets: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, status: OrderStatus) {
    await this.findById(id);
    return this.prisma.order.update({ where: { id }, data: { status } });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private async resolveOrderItems(storeId: string, items: CreateOrderDto['items']) {
    const resolved: Array<{
      productId: string; variantId?: string; name: string; sku: string | null;
      quantity: number; unitPrice: number; costPrice?: number; discountAmount: number;
      taxAmount: number; taxRate: number; total: number; notes?: string;
      modifiers: { modifierId: string; name: string; priceAdjustment: number }[];
    }> = [];

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: { taxRate: true, variants: true },
      });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

      let unitPrice = Number(product.price);
      let costPrice = product.cost ? Number(product.cost) : undefined;

      // Apply variant price override
      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (variant?.price) unitPrice = Number(variant.price);
        if (variant?.cost) costPrice = Number(variant.cost);
      }

      // Add modifier price adjustments
      const modifiers = item.modifiers ?? [];
      const modifierTotal = modifiers.reduce((sum, m) => sum + m.priceAdjustment, 0);
      unitPrice += modifierTotal;

      const discountAmount = item.discountAmount ?? 0;
      const taxRate = product.taxRate ? Number(product.taxRate.rate) : 0;
      const taxablePrice = (unitPrice * item.quantity - discountAmount);
      const taxAmount = taxablePrice * taxRate;
      const total = taxablePrice + taxAmount;

      resolved.push({
        productId: item.productId,
        variantId: item.variantId,
        name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice,
        costPrice,
        discountAmount,
        taxAmount,
        taxRate,
        total,
        notes: item.notes,
        modifiers: modifiers.map((m) => ({
          modifierId: m.modifierId,
          name: m.name,
          priceAdjustment: m.priceAdjustment,
        })),
      });
    }

    return resolved;
  }

  private async generateOrderNumber(storeId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.order.count({
      where: {
        storeId,
        createdAt: { gte: new Date(today.setHours(0, 0, 0, 0)) },
      },
    });
    return `${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  private async sendToKds(orderId: string, storeId: string, items: any[]) {
    try {
      await this.prisma.kdsTicket.create({
        data: {
          orderId,
          storeId,
          station: 'KITCHEN',
          status: 'NEW',
          items: items as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.error('Failed to create KDS ticket', err);
      // Non-fatal — order is already created, don't block checkout
    }
  }

  private async awardLoyaltyPoints(tx: any, customerId: string, amount: number) {
    const account = await tx.loyaltyAccount.findUnique({ where: { customerId } });
    if (!account) return;

    const program = await tx.loyaltyProgram.findUnique({
      where: { id: account.loyaltyProgramId },
    });
    if (!program || !program.isActive) return;

    const points = Math.floor(amount * Number(program.pointsPerCurrency));
    if (points <= 0) return;

    await tx.loyaltyAccount.update({
      where: { customerId },
      data: {
        points: { increment: points },
        lifetimePoints: { increment: points },
      },
    });

    await tx.loyaltyTransaction.create({
      data: {
        loyaltyAccountId: account.id,
        points,
        description: `Earned from sale`,
      },
    });
  }
}
