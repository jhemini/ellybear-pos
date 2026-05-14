import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, CreateCategoryDto } from './dto/product.dto';
import { PaginationDto } from '../../common/pipes/parse-pagination.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmployeeRole } from '@prisma/client';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // GET /api/v1/products
  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query() pagination: PaginationDto) {
    return this.productsService.findAll(user.organizationId, pagination);
  }

  // GET /api/v1/products/barcode/:barcode
  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.findByBarcode(barcode, user.organizationId);
  }

  // GET /api/v1/products/categories
  @Get('categories')
  findCategories(@CurrentUser() user: JwtPayload) {
    return this.productsService.findCategories(user.organizationId);
  }

  // POST /api/v1/products/categories
  @Post('categories')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  createCategory(@CurrentUser() user: JwtPayload, @Body() dto: CreateCategoryDto) {
    return this.productsService.createCategory(user.organizationId, dto);
  }

  // PATCH /api/v1/products/categories/:id
  @Patch('categories/:id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  updateCategory(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: Partial<CreateCategoryDto>,
  ) {
    return this.productsService.updateCategory(id, user.organizationId, dto);
  }

  // DELETE /api/v1/products/categories/:id
  @Delete('categories/:id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  deleteCategory(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.deleteCategory(id, user.organizationId);
  }

  // GET /api/v1/products/tax-rates
  @Get('tax-rates')
  findTaxRates(@CurrentUser() user: JwtPayload) {
    return this.productsService.findTaxRates(user.organizationId);
  }

  // POST /api/v1/products/tax-rates
  @Post('tax-rates')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  createTaxRate(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { name: string; rate: number; isDefault?: boolean },
  ) {
    return this.productsService.createTaxRate(user.organizationId, dto);
  }

  // PATCH /api/v1/products/tax-rates/:id
  @Patch('tax-rates/:id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  updateTaxRate(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: { name?: string; rate?: number; isDefault?: boolean; isActive?: boolean },
  ) {
    return this.productsService.updateTaxRate(id, user.organizationId, dto);
  }

  // DELETE /api/v1/products/tax-rates/:id
  @Delete('tax-rates/:id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  deleteTaxRate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.deleteTaxRate(id, user.organizationId);
  }

  // GET /api/v1/products/:id
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.findById(id, user.organizationId);
  }

  // POST /api/v1/products
  @Post()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY_MANAGER)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.organizationId, dto);
  }

  // PATCH /api/v1/products/:id
  @Patch(':id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY_MANAGER)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, user.organizationId, dto);
  }

  // DELETE /api/v1/products/:id
  @Delete(':id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.remove(id, user.organizationId);
  }
}
