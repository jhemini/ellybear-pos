import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, CreateCategoryDto } from './dto/product.dto';
import {
  PaginationDto,
  buildPaginationMeta,
  paginationToSkipTake,
} from '../../common/pipes/parse-pagination.pipe';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // ─── Products ─────────────────────────────────────────────────────────────────

  async findAll(organizationId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20, search, sortBy = 'name', sortOrder = 'asc' } = pagination;
    const { skip, take } = paginationToSkipTake(page, limit);

    const where: any = {
      organizationId,
      deletedAt: null,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: true,
          taxRate: true,
          variants: { where: { isActive: true } },
          recipeItems: { include: { ingredientProduct: true } },
          modifierGroups: {
            where: { isActive: true },
            include: { modifiers: { where: { isActive: true } } },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, ...buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        category: true,
        taxRate: true,
        variants: { where: { isActive: true } },
        recipeItems: { include: { ingredientProduct: true } },
        usedInRecipes: { include: { compositeProduct: true } },
        modifierGroups: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            modifiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findByBarcode(barcode: string, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: { barcode, organizationId, deletedAt: null, isActive: true },
      include: {
        category: true,
        taxRate: true,
        variants: { where: { isActive: true } },
        modifierGroups: {
          where: { isActive: true },
          include: { modifiers: { where: { isActive: true } } },
        },
      },
    });
    if (!product) throw new NotFoundException(`No product found for barcode: ${barcode}`);
    return product;
  }

  async create(organizationId: string, dto: CreateProductDto) {
    const { recipe, modifierGroups, ...productData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          organizationId,
          price: productData.price,
          cost: productData.cost,
        },
      });

      // Create recipe items (composite product ingredients)
      if (recipe?.length) {
        await tx.productRecipe.createMany({
          data: recipe.map((r) => ({
            compositeProductId: product.id,
            ingredientProductId: r.ingredientProductId,
            quantity: r.quantity,
            unit: r.unit ?? 'unit',
            wastagePercent: r.wastagePercent ?? 0,
          })),
        });
      }

      // Create modifier groups + options
      if (modifierGroups?.length) {
        for (const group of modifierGroups) {
          await tx.productModifierGroup.create({
            data: {
              productId: product.id,
              name: group.name,
              required: group.required ?? false,
              minSelect: group.minSelect ?? 0,
              maxSelect: group.maxSelect ?? 1,
              modifiers: {
                create: group.modifiers.map((m, i) => ({
                  name: m.name,
                  priceAdjustment: m.priceAdjustment,
                  isDefault: m.isDefault ?? false,
                  sortOrder: i,
                })),
              },
            },
          });
        }
      }

      return this.findById(product.id, organizationId);
    });
  }

  async update(id: string, organizationId: string, dto: UpdateProductDto) {
    await this.findById(id, organizationId);
    const { recipe, modifierGroups, ...productData } = dto;

    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: productData });

      // Replace recipe if provided
      if (recipe !== undefined) {
        await tx.productRecipe.deleteMany({ where: { compositeProductId: id } });
        if (recipe.length) {
          await tx.productRecipe.createMany({
            data: recipe.map((r) => ({
              compositeProductId: id,
              ingredientProductId: r.ingredientProductId,
              quantity: r.quantity,
              unit: r.unit ?? 'unit',
              wastagePercent: r.wastagePercent ?? 0,
            })),
          });
        }
      }

      return this.findById(id, organizationId);
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Categories ───────────────────────────────────────────────────────────────

  async findCategories(organizationId: string) {
    return this.prisma.category.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        children: { where: { deletedAt: null } },
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(organizationId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: { ...dto, organizationId } });
  }

  async updateCategory(id: string, organizationId: string, dto: Partial<CreateCategoryDto>) {
    const existing = await this.prisma.category.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Category not found');
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string, organizationId: string) {
    const existing = await this.prisma.category.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Category not found');
    return this.prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ─── Tax Rates ────────────────────────────────────────────────────────────────

  async findTaxRates(organizationId: string) {
    return this.prisma.taxRate.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async createTaxRate(organizationId: string, dto: { name: string; rate: number; isDefault?: boolean }) {
    if (dto.isDefault) {
      await this.prisma.taxRate.updateMany({ where: { organizationId }, data: { isDefault: false } });
    }
    return this.prisma.taxRate.create({ data: { ...dto, organizationId } });
  }

  async updateTaxRate(id: string, organizationId: string, dto: { name?: string; rate?: number; isDefault?: boolean; isActive?: boolean }) {
    const existing = await this.prisma.taxRate.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Tax rate not found');
    if (dto.isDefault) {
      await this.prisma.taxRate.updateMany({ where: { organizationId }, data: { isDefault: false } });
    }
    return this.prisma.taxRate.update({ where: { id }, data: dto });
  }

  async deleteTaxRate(id: string, organizationId: string) {
    const existing = await this.prisma.taxRate.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Tax rate not found');
    return this.prisma.taxRate.delete({ where: { id } });
  }
}
