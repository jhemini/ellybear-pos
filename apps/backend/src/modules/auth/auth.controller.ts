import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginDto,
  PinLoginDto,
  RegisterOrganizationDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { Public } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /api/v1/auth/register
  @Public()
  @Post('register')
  register(@Body() dto: RegisterOrganizationDto) {
    return this.authService.registerOrganization(dto);
  }

  // POST /api/v1/auth/login
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // POST /api/v1/auth/pin-login (cashier quick-access)
  @Public()
  @Post('pin-login')
  pinLogin(@Body() dto: PinLoginDto) {
    return this.authService.pinLogin(dto);
  }

  // POST /api/v1/auth/refresh
  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  // GET /api/v1/auth/me
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  // POST /api/v1/auth/change-password
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@CurrentUser('sub') employeeId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(employeeId, dto);
  }
}
