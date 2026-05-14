import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.store.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        _count: {
          select: {
            storeEmployees: true,
            orders: { where: { status: 'COMPLETED' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, organizationId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        storeEmployees: { include: { employee: true } },
        registers: { where: { isActive: true } },
        tables: { where: { isActive: true } },
      },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async create(organizationId: string, dto: CreateStoreDto) {
    return this.prisma.store.create({
      data: { ...dto, organizationId },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateStoreDto) {
    await this.findById(id, organizationId);
    return this.prisma.store.update({ where: { id }, data: dto as any });
  }

  async remove(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    return this.prisma.store.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Validate employee belongs to this store (used by guards)
  async validateEmployeeAccess(storeId: string, employeeId: string) {
    const link = await this.prisma.storeEmployee.findUnique({
      where: { storeId_employeeId: { storeId, employeeId } },
    });
    return !!link;
  }
}
