import { IsString, IsEmail, IsOptional, IsUrl, IsEnum } from 'class-validator';
import { SubscriptionPlan } from '@prisma/client';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  settings?: Record<string, unknown>;
}
