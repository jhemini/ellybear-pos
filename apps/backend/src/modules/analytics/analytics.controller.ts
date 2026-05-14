import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService, DateRangeDto } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmployeeRole } from '@prisma/client';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  // GET /api/v1/analytics/revenue?from=&to=&storeId=
  @Get('revenue')
  getRevenue(@CurrentUser() user: JwtPayload, @Query() dto: DateRangeDto) {
    return this.analyticsService.getRevenueSummary(user.organizationId, dto);
  }

  // GET /api/v1/analytics/revenue/by-period?from=&to=&groupBy=day
  @Get('revenue/by-period')
  getRevenueByPeriod(
    @CurrentUser() user: JwtPayload,
    @Query() dto: DateRangeDto,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.analyticsService.getRevenueByPeriod(user.organizationId, dto, groupBy);
  }

  // GET /api/v1/analytics/products/top
  @Get('products/top')
  getTopProducts(
    @CurrentUser() user: JwtPayload,
    @Query() dto: DateRangeDto,
    @Query('limit') limit = 20,
  ) {
    return this.analyticsService.getTopProducts(user.organizationId, dto, +limit);
  }

  // GET /api/v1/analytics/categories
  @Get('categories')
  getSalesByCategory(@CurrentUser() user: JwtPayload, @Query() dto: DateRangeDto) {
    return this.analyticsService.getSalesByCategory(user.organizationId, dto);
  }

  // GET /api/v1/analytics/payments
  @Get('payments')
  getPaymentBreakdown(@CurrentUser() user: JwtPayload, @Query() dto: DateRangeDto) {
    return this.analyticsService.getPaymentBreakdown(user.organizationId, dto);
  }

  // GET /api/v1/analytics/inventory/turnover?storeId=
  @Get('inventory/turnover')
  getInventoryTurnover(@Query('storeId') storeId: string, @Query() dto: DateRangeDto) {
    return this.analyticsService.getInventoryTurnover(storeId, dto);
  }

  // GET /api/v1/analytics/employees
  @Get('employees')
  getEmployeePerformance(@CurrentUser() user: JwtPayload, @Query() dto: DateRangeDto) {
    return this.analyticsService.getEmployeePerformance(user.organizationId, dto);
  }

  // GET /api/v1/analytics/stores/comparison
  @Get('stores/comparison')
  getStoreComparison(@CurrentUser() user: JwtPayload, @Query() dto: DateRangeDto) {
    return this.analyticsService.getStoreComparison(user.organizationId, dto);
  }
}
