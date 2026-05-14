import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmployeeRole, IntegrationType } from '@prisma/client';

@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.integrationsService.findAll(user.organizationId);
  }

  @Post(':type/connect')
  connect(
    @Param('type') type: IntegrationType,
    @CurrentUser() user: JwtPayload,
    @Body() credentials: Record<string, string>,
  ) {
    return this.integrationsService.connect(user.organizationId, type, credentials);
  }

  @Delete(':type')
  disconnect(@Param('type') type: IntegrationType, @CurrentUser() user: JwtPayload) {
    return this.integrationsService.disconnect(user.organizationId, type);
  }

  @Get('webhooks')
  getWebhooks(@CurrentUser() user: JwtPayload) {
    return this.integrationsService.findWebhooks(user.organizationId);
  }

  @Post('webhooks')
  createWebhook(@CurrentUser() user: JwtPayload, @Body() dto: any) {
    return this.integrationsService.createWebhook(user.organizationId, dto);
  }
}
