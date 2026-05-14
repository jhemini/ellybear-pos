import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface DateRangeDto {
  from: string;
  to: string;
  storeId?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ─── Revenue summary ──────────────────────────────────────────────────────────
  async getRevenueSummary(organizationId: string, dto: DateRangeDto) {
    const where = this.buildOrderWhere(organizationId, dto);

    const [result, orderCount, refundSum] = await Promise.all([
      this.prisma.order.aggregate({
        where,
        _sum: { total: true, taxAmount: true, discountAmount: true, tipAmount: true },
        _avg: { total: true },
        _count: true,
      }),
      this.prisma.order.count({ where }),
      this.prisma.refund.aggregate({
        where: { order: where },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalRevenue: result._sum.total ?? 0,
      totalTax: result._sum.taxAmount ?? 0,
      totalDiscounts: result._sum.discountAmount ?? 0,
      totalTips: result._sum.tipAmount ?? 0,
      totalRefunds: refundSum._sum.amount ?? 0,
      netRevenue:
        Number(result._sum.total ?? 0) - Number(refundSum._sum.amount ?? 0),
      totalOrders: orderCount,
      averageOrderValue: result._avg.total ?? 0,
    };
  }

  // ─── Revenue by day/week/month ────────────────────────────────────────────────
  async getRevenueByPeriod(
    organizationId: string,
    dto: DateRangeDto,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    const where = this.buildOrderWhere(organizationId, dto);

    const orders = await this.prisma.order.findMany({
      where,
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group in JS (simpler than raw SQL for cross-DB compat)
    const grouped: Record<string, number> = {};
    for (const order of orders) {
      const key = this.formatDateKey(order.createdAt, groupBy);
      grouped[key] = (grouped[key] ?? 0) + Number(order.total);
    }

    return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
  }

  // ─── Top-selling products ─────────────────────────────────────────────────────
  async getTopProducts(organizationId: string, dto: DateRangeDto, limit = 20) {
    const where = this.buildOrderWhere(organizationId, dto);

    const items = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: where },
      _sum: { quantity: true, total: true },
      _count: true,
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    // Enrich with product names
    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, category: { select: { name: true } } },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    return items.map((item) => ({
      ...item,
      product: productMap[item.productId],
    }));
  }

  // ─── Sales by category ────────────────────────────────────────────────────────
  async getSalesByCategory(organizationId: string, dto: DateRangeDto) {
    const where = this.buildOrderWhere(organizationId, dto);

    const items = await this.prisma.orderItem.findMany({
      where: { order: where },
      include: { product: { include: { category: true } } },
    });

    const grouped: Record<string, { name: string; revenue: number; count: number }> = {};
    for (const item of items) {
      const catId = item.product.categoryId ?? 'uncategorized';
      const catName = item.product.category?.name ?? 'Uncategorized';
      if (!grouped[catId]) grouped[catId] = { name: catName, revenue: 0, count: 0 };
      grouped[catId].revenue += Number(item.total);
      grouped[catId].count += Number(item.quantity);
    }

    return Object.entries(grouped).map(([id, data]) => ({ categoryId: id, ...data }));
  }

  // ─── Payment methods breakdown ────────────────────────────────────────────────
  async getPaymentBreakdown(organizationId: string, dto: DateRangeDto) {
    const where = this.buildOrderWhere(organizationId, dto);

    return this.prisma.payment.groupBy({
      by: ['method'],
      where: { order: where, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    });
  }

  // ─── Inventory turnover ───────────────────────────────────────────────────────
  async getInventoryTurnover(storeId: string, dto: DateRangeDto) {
    const movements = await this.prisma.inventoryMovement.groupBy({
      by: ['productId'],
      where: {
        storeId,
        type: 'SALE',
        createdAt: { gte: new Date(dto.from), lte: new Date(dto.to) },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 50,
    });

    const productIds = movements.map((m) => m.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    return movements.map((m) => ({
      ...m,
      product: productMap[m.productId],
    }));
  }

  // ─── Employee performance ─────────────────────────────────────────────────────
  async getEmployeePerformance(organizationId: string, dto: DateRangeDto) {
    const where = this.buildOrderWhere(organizationId, dto);

    const byEmployee = await this.prisma.order.groupBy({
      by: ['employeeId'],
      where,
      _sum: { total: true },
      _count: true,
    });

    const employeeIds = byEmployee.filter((e) => e.employeeId).map((e) => e.employeeId!);
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

    return byEmployee.map((row) => ({
      ...row,
      employee: row.employeeId ? empMap[row.employeeId] : null,
    }));
  }

  // ─── Multi-store comparison ───────────────────────────────────────────────────
  async getStoreComparison(organizationId: string, dto: DateRangeDto) {
    const from = new Date(dto.from);
    const to = new Date(dto.to);

    const stores = await this.prisma.store.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, name: true },
    });

    const results = await Promise.all(
      stores.map(async (store) => {
        const agg = await this.prisma.order.aggregate({
          where: {
            storeId: store.id,
            status: 'COMPLETED',
            createdAt: { gte: from, lte: to },
          },
          _sum: { total: true },
          _count: true,
        });
        return {
          store,
          totalRevenue: agg._sum.total ?? 0,
          totalOrders: agg._count,
        };
      }),
    );

    return results;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  private buildOrderWhere(organizationId: string, dto: DateRangeDto) {
    return {
      store: { organizationId },
      status: 'COMPLETED' as const,
      createdAt: { gte: new Date(dto.from), lte: new Date(dto.to) },
      ...(dto.storeId && { storeId: dto.storeId }),
    };
  }

  private formatDateKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    if (groupBy === 'month') return date.toISOString().slice(0, 7);
    if (groupBy === 'week') {
      const d = new Date(date);
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  }
}
