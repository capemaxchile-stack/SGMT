import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { TENANT_MODULE_KEY } from '../decorators/tenant-modules.decorator';

@Injectable()
export class TenantModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<string>(
      TENANT_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredModule) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super user or admin without tenant restriction can bypass
    if (user?.roles?.includes('SUPER_USUARIO') && !user?.tenantId) {
      return true;
    }

    const tenantHeader = request.headers['x-tenant-id'];
    let tenant = null;

    if (!tenantHeader && user?.tenant) {
      tenant = user.tenant;
    } else {
      const tenantId = tenantHeader || user?.tenantId;
      if (!tenantId) {
        return true;
      }
      tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          status: true,
          planTier: true,
          enabledModules: true,
        },
      });
    }

    if (!tenant) {
      return true;
    }

    if (tenant.status === 'SUSPENDIDO') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'TENANT_SUSPENDED',
        message: 'La suscripción de tu empresa se encuentra temporalmente suspendida por administración.',
      });
    }

    const isModuleEnabled = (tenant.enabledModules || []).includes(requiredModule);

    if (!isModuleEnabled) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'PLAN_UPGRADE_REQUIRED',
        message: `El módulo '${requiredModule}' no está incluido en tu suscripción actual (${tenant.planTier}). Contacta a administración para activarlo en tu plan.`,
        module: requiredModule,
        currentPlan: tenant.planTier,
        tenantName: tenant.name,
      });
    }

    // Attach tenant to request for downstream usage
    request.tenant = tenant;
    return true;
  }
}
