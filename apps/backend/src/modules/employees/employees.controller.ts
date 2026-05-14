import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { EmployeesService, CreateEmployeeDto, UpdateEmployeeDto, ClockDto } from './employees.service';
import { PaginationDto } from '../../common/pipes/parse-pagination.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmployeeRole } from '@prisma/client';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Get()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  findAll(@CurrentUser() user: JwtPayload, @Query() pagination: PaginationDto) {
    return this.employeesService.findAll(user.organizationId, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.employeesService.findById(id, user.organizationId);
  }

  @Post()
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @Roles(EmployeeRole.OWNER)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.employeesService.remove(id, user.organizationId);
  }

  @Post('clock-in')
  clockIn(@CurrentUser() user: JwtPayload, @Body() dto: ClockDto) {
    return this.employeesService.clockIn(user.sub, dto);
  }

  @Post('clock-out')
  clockOut(@CurrentUser() user: JwtPayload, @Body() dto: ClockDto) {
    return this.employeesService.clockOut(user.sub, dto);
  }

  @Get(':id/time-entries')
  timeEntries(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.employeesService.getTimeEntries(
      id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get(':id/performance')
  performance(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.employeesService.getPerformance(
      id,
      new Date(from),
      new Date(to),
    );
  }
}
