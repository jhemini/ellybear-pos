import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LoginDto,
  PinLoginDto,
  RegisterOrganizationDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ─── Validate email + password ────────────────────────────────────────────────
  async validateCredentials(email: string, password: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { email, isActive: true, deletedAt: null },
      include: { organization: true },
    });
    if (!employee) return null;

    // Employees store password in the `pin` field for owners/managers using full login
    // For simplicity we store a bcrypt hash there for email-based auth
    const isValid = await bcrypt.compare(password, employee.pin || '');
    return isValid ? employee : null;
  }

  // ─── Email / password login ───────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const employee = await this.validateCredentials(dto.email, dto.password);
    if (!employee) throw new UnauthorizedException('Invalid email or password');

    // Resolve primary store so storeId is always present in the session
    const primaryStore = await this.prisma.storeEmployee.findFirst({
      where: { employeeId: employee.id, isPrimary: true },
    });
    const fallbackStore = primaryStore
      ? null
      : await this.prisma.storeEmployee.findFirst({ where: { employeeId: employee.id } });

    const storeId = (primaryStore ?? fallbackStore)?.storeId;
    return this.generateTokens(employee, storeId);
  }

  // ─── PIN login (fast POS cashier access) ─────────────────────────────────────
  async pinLogin(dto: PinLoginDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, isActive: true, deletedAt: null },
      include: {
        storeEmployees: { where: { storeId: dto.storeId } },
      },
    });

    if (!employee || !employee.storeEmployees.length) {
      throw new UnauthorizedException('Employee not found in this store');
    }

    const pinValid = await bcrypt.compare(dto.pin, employee.pin || '');
    if (!pinValid) throw new UnauthorizedException('Invalid PIN');

    return this.generateTokens(employee, dto.storeId);
  }

  // ─── Register new organization + owner employee ───────────────────────────────
  async registerOrganization(dto: RegisterOrganizationDto) {
    const existing = await this.prisma.employee.findFirst({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const slug = dto.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug: `${slug}-${Date.now()}`,
          email: dto.email,
          phone: dto.phone,
        },
      });

      // Default store
      const store = await tx.store.create({
        data: {
          organizationId: organization.id,
          name: `${dto.organizationName} - Main`,
        },
      });

      // Owner employee
      const employee = await tx.employee.create({
        data: {
          organizationId: organization.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          role: 'OWNER',
          pin: hashedPassword,
          storeEmployees: {
            create: { storeId: store.id, isPrimary: true },
          },
        },
      });

      return { organization, store, employee };
    });

    return this.generateTokens(result.employee, result.store.id);
  }

  // ─── Refresh access token ─────────────────────────────────────────────────────
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });

      const employee = await this.prisma.employee.findFirst({
        where: { id: payload.sub, isActive: true, deletedAt: null },
      });
      if (!employee) throw new UnauthorizedException();

      return this.generateTokens(employee, payload.storeId);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ─── Change password ──────────────────────────────────────────────────────────
  async changePassword(employeeId: string, dto: ChangePasswordDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new BadRequestException('Employee not found');

    const isValid = await bcrypt.compare(dto.currentPassword, employee.pin || '');
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { pin: hashed },
    });

    return { message: 'Password changed successfully' };
  }

  // ─── Token generation ─────────────────────────────────────────────────────────
  private generateTokens(employee: any, storeId?: string) {
    const payload: JwtPayload = {
      sub: employee.id,
      organizationId: employee.organizationId,
      storeId,
      role: employee.role,
      email: employee.email,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return {
      accessToken,
      refreshToken,
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        role: employee.role,
        organizationId: employee.organizationId,
        storeId,
      },
    };
  }
}
