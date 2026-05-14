import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmployeeRole } from '@prisma/client';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  // GET /api/v1/organizations/me
  @Get('me')
  getMyOrg(@CurrentUser() user: JwtPayload) {
    return this.organizationsService.findById(user.organizationId);
  }

  // GET /api/v1/organizations/me/stats
  @Get('me/stats')
  getStats(@CurrentUser() user: JwtPayload) {
    return this.organizationsService.getStats(user.organizationId);
  }

  // PATCH /api/v1/organizations/me
  @Patch('me')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(user.organizationId, dto);
  }
}
