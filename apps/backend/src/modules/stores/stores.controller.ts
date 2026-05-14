import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmployeeRole } from '@prisma/client';

@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoresController {
  constructor(private storesService: StoresService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.storesService.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.storesService.findById(id, user.organizationId);
  }

  @Post()
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateStoreDto) {
    return this.storesService.create(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @Roles(EmployeeRole.OWNER)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.storesService.remove(id, user.organizationId);
  }
}
