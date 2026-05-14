import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateOrganizationDto } from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: {
        stores: { where: { deletedAt: null, isActive: true } },
        _count: { select: { employees: true, customers: true, products: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findById(id);
    return this.prisma.organization.update({
      where: { id },
      data: dto as any,
    });
  }

  async getStats(organizationId: string) {
    const [totalStores, totalEmployees, totalProducts, totalCustomers, recentOrders] =
      await Promise.all([
        this.prisma.store.count({ where: { organizationId, deletedAt: null } }),
        this.prisma.employee.count({ where: { organizationId, deletedAt: null, isActive: true } }),
        this.prisma.product.count({ where: { organizationId, deletedAt: null, isActive: true } }),
        this.prisma.customer.count({ where: { organizationId, deletedAt: null } }),
        this.prisma.order.aggregate({
          where: {
            store: { organizationId },
            status: 'COMPLETED',
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          _sum: { total: true },
          _count: true,
        }),
      ]);

    return {
      totalStores,
      totalEmployees,
      totalProducts,
      totalCustomers,
      last30DaysRevenue: recentOrders._sum.total ?? 0,
      last30DaysOrders: recentOrders._count,
    };
  }
}
