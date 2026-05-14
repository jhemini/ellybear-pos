import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto, ProcessPaymentDto, ProcessMultiPaymentDto,
  RefundDto, SyncOfflineOrderDto,
} from './dto/order.dto';
import { PaginationDto } from '../../common/pipes/parse-pagination.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmployeeRole, OrderStatus } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // GET /api/v1/orders?storeId=&status=
  @Get()
  findAll(
    @Query('storeId') storeId: string,
    @Query('status') status: OrderStatus,
    @Query() pagination: PaginationDto,
  ) {
    return this.ordersService.findAll(storeId, { ...pagination, status });
  }

  // GET /api/v1/orders/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  // POST /api/v1/orders
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.sub, dto);
  }

  // POST /api/v1/orders/sync (offline sync)
  @Post('sync')
  sync(@CurrentUser() user: JwtPayload, @Body() dto: SyncOfflineOrderDto) {
    return this.ordersService.syncOfflineOrder(user.sub, dto);
  }

  // POST /api/v1/orders/:id/payment
  @Post(':id/payment')
  processPayment(@Param('id') id: string, @Body() dto: ProcessPaymentDto) {
    return this.ordersService.processPayment(id, dto);
  }

  // POST /api/v1/orders/:id/split-payment
  @Post(':id/split-payment')
  processSplitPayment(@Param('id') id: string, @Body() dto: ProcessMultiPaymentDto) {
    return this.ordersService.processSplitPayment(id, dto);
  }

  // POST /api/v1/orders/:id/refund
  @Post(':id/refund')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  refund(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RefundDto,
  ) {
    return this.ordersService.refund(id, user.sub, dto);
  }

  // PATCH /api/v1/orders/:id/status
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateStatus(id, status);
  }
}
