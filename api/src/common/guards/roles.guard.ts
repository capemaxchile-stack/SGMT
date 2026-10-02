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

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.roles) {
      return false;
    }

    if (user.isActive === false) {
      return false;
    }

    let userRoles: string[] = [];
    if (Array.isArray(user.roles)) {
      userRoles = user.roles
        .map((r: any) => {
          if (typeof r === 'string') return r;
          return r?.role?.name || r?.name || '';
        })
        .filter(Boolean);
    } else if (typeof user.roles === 'string') {
      userRoles = [user.roles];
    }

    if (userRoles.length === 0) {
      return false;
    }

    // System Admins and Super Users always bypass specific role restrictions
    if (
      userRoles.includes('ADMIN_SISTEMA') ||
      userRoles.includes('SUPER_USUARIO')
    ) {
      return true;
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
