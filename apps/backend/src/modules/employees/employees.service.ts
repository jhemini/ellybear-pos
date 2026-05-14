import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { EmployeeRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginationToSkipTake } from '../../common/pipes/parse-pagination.pipe';
import {
  IsString, IsOptional, IsEmail, IsEnum, IsNumber, IsArray, Min,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @IsEnum(EmployeeRole) role: EmployeeRole;
  @IsString() password: string;        // used for full login
  @IsOptional() @IsString() pin?: string; // 4-6 digit POS PIN
  @IsOptional() @IsNumber() @Min(0) hourlyWage?: number;
  @IsOptional() @IsNumber() @Min(0) commissionRate?: number;
  @IsArray() storeIds: string[];
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEnum(EmployeeRole) role?: EmployeeRole;
  @IsOptional() @IsNumber() @Min(0) hourlyWage?: number;
  @IsOptional() @IsNumber() @Min(0) commissionRate?: number;
  @IsOptional() @IsArray() storeIds?: string[];
  @IsOptional() @IsString() pin?: string;
  @IsOptional() @IsString() password?: string;
}

export class ClockDto {
  @IsString() storeId: string;
  @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20, search } = pagination;
    const { skip, take } = paginationToSkipTake(page, limit);

    const where: any = {
      organizationId, deletedAt: null,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where, skip, take,
        include: { storeEmployees: { include: { store: true } } },
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    // Strip PIN hash from response
    return {
      items: items.map(({ pin, ...e }) => e),
      total, page, limit,
    };
  }

  async findById(id: string, organizationId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { storeEmployees: { include: { store: true } } },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    const { pin, ...rest } = employee;
    return rest;
  }

  async create(organizationId: string, dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findFirst({
      where: { organizationId, email: dto.email },
    });
    if (existing) throw new ConflictException('Employee with this email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const hashedPin = dto.pin ? await bcrypt.hash(dto.pin, 10) : null;

    const { password, pin, storeIds, ...rest } = dto;

    const employee = await this.prisma.employee.create({
      data: {
        ...rest,
        organizationId,
        pin: hashedPassword, // main login uses pin field
        storeEmployees: {
          create: storeIds.map((storeId, i) => ({
            storeId,
            isPrimary: i === 0,
          })),
        },
      },
    });

    const { pin: _, ...safeEmployee } = employee;
    return safeEmployee;
  }

  async update(id: string, organizationId: string, dto: UpdateEmployeeDto) {
    await this.findById(id, organizationId);
    const { storeIds, pin, password, ...rest } = dto;

    const updateData: any = { ...rest };
    if (password) updateData.pin = await bcrypt.hash(password, 12);
    else if (pin)  updateData.pin = await bcrypt.hash(pin, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.employee.update({ where: { id }, data: updateData });

      if (storeIds !== undefined) {
        await tx.storeEmployee.deleteMany({ where: { employeeId: id } });
        await tx.storeEmployee.createMany({
          data: storeIds.map((storeId, i) => ({
            storeId, employeeId: id, isPrimary: i === 0,
          })),
        });
      }
    });

    return this.findById(id, organizationId);
  }

  async remove(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    return this.prisma.employee.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  // ─── Time tracking ────────────────────────────────────────────────────────────
  async clockIn(employeeId: string, dto: ClockDto) {
    const openEntry = await this.prisma.timeEntry.findFirst({
      where: { employeeId, clockOut: null },
    });
    if (openEntry) return openEntry; // already clocked in

    return this.prisma.timeEntry.create({
      data: { employeeId, clockIn: new Date(), notes: dto.notes },
    });
  }

  async clockOut(employeeId: string, dto: ClockDto) {
    const openEntry = await this.prisma.timeEntry.findFirst({
      where: { employeeId, clockOut: null },
      orderBy: { clockIn: 'desc' },
    });
    if (!openEntry) throw new NotFoundException('No active clock-in found');

    return this.prisma.timeEntry.update({
      where: { id: openEntry.id },
      data: { clockOut: new Date() },
    });
  }

  async getTimeEntries(employeeId: string, from?: Date, to?: Date) {
    return this.prisma.timeEntry.findMany({
      where: {
        employeeId,
        ...(from && { clockIn: { gte: from } }),
        ...(to && { clockIn: { lte: to } }),
      },
      orderBy: { clockIn: 'desc' },
    });
  }

  // ─── Performance ──────────────────────────────────────────────────────────────
  async getPerformance(employeeId: string, from: Date, to: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        employeeId,
        status: 'COMPLETED',
        createdAt: { gte: from, lte: to },
      },
      include: { payments: true },
    });

    const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;

    return {
      employeeId,
      totalOrders,
      totalSales,
      averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
    };
  }
}
