import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { PaginationDto, paginationToSkipTake } from '../../common/pipes/parse-pagination.pipe';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20, search } = pagination;
    const { skip, take } = paginationToSkipTake(page, limit);

    const where: any = {
      organizationId,
      deletedAt: null,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where, skip, take,
        include: { loyaltyAccount: true },
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string, organizationId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        loyaltyAccount: { include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } } },
        orders: {
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { items: { include: { product: true } }, payments: true },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(organizationId: string, dto: CreateCustomerDto) {
    if (dto.email) {
      const existing = await this.prisma.customer.findFirst({
        where: { organizationId, email: dto.email, deletedAt: null },
      });
      if (existing) throw new ConflictException('Customer with this email already exists');
    }

    return this.prisma.customer.create({
      data: { ...dto, organizationId },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateCustomerDto) {
    await this.findById(id, organizationId);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getPurchaseHistory(customerId: string, organizationId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const { skip, take } = paginationToSkipTake(page, limit);

    return this.prisma.order.findMany({
      where: { customerId, status: 'COMPLETED', store: { organizationId } },
      skip, take,
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } }, payments: true },
    });
  }
}
