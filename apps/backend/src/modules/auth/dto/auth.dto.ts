import { IsEmail, IsString, MinLength, IsOptional, Length } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

// PIN login for quick POS access (cashiers)
export class PinLoginDto {
  @IsString()
  employeeId: string;

  @IsString()
  @Length(4, 6)
  pin: string;

  @IsString()
  storeId: string;
}

export class RegisterOrganizationDto {
  @IsString()
  organizationName: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
