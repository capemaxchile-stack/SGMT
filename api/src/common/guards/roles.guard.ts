import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.roles) {
      return false;
    }

    const userRoles: string[] = Array.isArray(user.roles) ? user.roles : [];

    // System Admins and Super Users always bypass specific role restrictions
    if (
      userRoles.includes('ADMIN_SISTEMA') ||
      userRoles.includes('SUPER_USUARIO') ||
      userRoles.includes('ADMIN')
    ) {
      return true;
    }

    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
