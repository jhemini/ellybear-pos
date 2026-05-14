import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmployeeRole } from '@prisma/client';
import { IsNumber, IsOptional, IsString, IsBoolean, Min } from 'class-validator';

class UpdateProgramDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() @Min(0) pointsPerCurrency?: number;
  @IsOptional() @IsNumber() @Min(0) pointsValue?: number;
  @IsOptional() @IsNumber() @Min(0) minimumRedeemPoints?: number;
  @IsOptional() @IsNumber() expiryDays?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class RedeemPointsDto {
  @IsNumber() @Min(1) points: number;
}

@Controller('loyalty')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyController {
  constructor(private loyaltyService: LoyaltyService) {}

  @Get('program')
  getProgram(@CurrentUser() user: JwtPayload) {
    return this.loyaltyService.getProgram(user.organizationId);
  }

  @Put('program')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  updateProgram(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProgramDto) {
    return this.loyaltyService.createOrUpdateProgram(user.organizationId, dto);
  }

  @Get('customers/:customerId')
  getAccount(@Param('customerId') customerId: string) {
    return this.loyaltyService.getAccount(customerId);
  }

  @Post('customers/:customerId/enroll')
  enroll(@Param('customerId') customerId: string, @CurrentUser() user: JwtPayload) {
    return this.loyaltyService.enrollCustomer(customerId, user.organizationId);
  }

  @Post('customers/:customerId/redeem')
  redeem(
    @Param('customerId') customerId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RedeemPointsDto,
  ) {
    return this.loyaltyService.redeemPoints(customerId, user.organizationId, dto.points);
  }
}
