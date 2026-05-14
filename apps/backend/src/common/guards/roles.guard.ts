import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmployeeRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Role hierarchy — higher index = more permissions
const ROLE_HIERARCHY: EmployeeRole[] = [
  EmployeeRole.KITCHEN_STAFF,
  EmployeeRole.WAITER,
  EmployeeRole.CASHIER,
  EmployeeRole.INVENTORY_MANAGER,
  EmployeeRole.MANAGER,
  EmployeeRole.OWNER,
];

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<EmployeeRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('No authenticated user');

    const userRoleIndex = ROLE_HIERARCHY.indexOf(user.role);
    const hasRole = requiredRoles.some(
      (role) => userRoleIndex >= ROLE_HIERARCHY.indexOf(role),
    );

    if (!hasRole) {
      throw new ForbiddenException(`Requires one of: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
