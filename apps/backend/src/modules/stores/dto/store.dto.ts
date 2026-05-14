import { IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateStoreDto extends CreateStoreDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  settings?: Record<string, unknown>;
}
