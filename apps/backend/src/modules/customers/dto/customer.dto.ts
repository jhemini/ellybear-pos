import { IsString, IsOptional, IsEmail, IsDateString, IsArray } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class UpdateCustomerDto extends CreateCustomerDto {}
