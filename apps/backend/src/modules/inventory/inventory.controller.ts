import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto, SetLowStockAlertDto, TransferStockDto } from './dto/inventory.dto';
import { PaginationDto } from '../../common/pipes/parse-pagination.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmployeeRole } from '@prisma/client';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  // GET /api/v1/inventory/stores/:storeId
  @Get('stores/:storeId')
  findByStore(
    @Param('storeId') storeId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.inventoryService.findByStore(storeId, pagination);
  }

  // GET /api/v1/inventory/stores/:storeId/low-stock
  @Get('stores/:storeId/low-stock')
  getLowStock(@Param('storeId') storeId: string) {
    return this.inventoryService.getLowStockAlerts(storeId);
  }

  // GET /api/v1/inventory/stores/:storeId/products/:productId/movements
  @Get('stores/:storeId/products/:productId/movements')
  getMovements(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.inventoryService.getMovements(storeId, productId, pagination);
  }

  // POST /api/v1/inventory/adjust
  @Post('adjust')
  @Roles(EmployeeRole.INVENTORY_MANAGER, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  adjust(@CurrentUser() user: JwtPayload, @Body() dto: AdjustInventoryDto) {
    // storeId must come from auth context or request body
    return this.inventoryService.adjust(user.storeId!, user.sub, dto);
  }

  // PATCH /api/v1/inventory/alerts
  @Patch('alerts')
  @Roles(EmployeeRole.INVENTORY_MANAGER, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  setAlerts(@CurrentUser() user: JwtPayload, @Body() dto: SetLowStockAlertDto) {
    return this.inventoryService.setAlertThresholds(user.storeId!, dto);
  }

  // POST /api/v1/inventory/transfer
  @Post('transfer')
  @Roles(EmployeeRole.INVENTORY_MANAGER, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  transfer(@CurrentUser() user: JwtPayload, @Body() dto: TransferStockDto) {
    return this.inventoryService.transfer(user.organizationId, user.sub, dto);
  }
}
