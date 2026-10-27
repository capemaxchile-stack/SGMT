import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantContextStorage, TenantContextData } from './tenant-context';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    let tenantId: string | null = null;
    let userId: string | null = null;
    let isSuperUser = false;

    // 1. Header direct override (if provided e.g. for API clients or proxies)
    const headerTenant = req.headers['x-tenant-id'];
    if (headerTenant && typeof headerTenant === 'string') {
      tenantId = headerTenant.trim();
    }

    // 2. Extract from Authorization Bearer JWT
    const authHeader = req.headers['authorization'];
    if (!tenantId && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded: any = jwt.decode(token);
        if (decoded) {
          userId = decoded.sub || null;
          isSuperUser = Array.isArray(decoded.roles) && decoded.roles.includes('SUPER_USUARIO');
          if (decoded.tenantId) {
            tenantId = decoded.tenantId;
          }
        }
      } catch {
        // Will be rejected by auth guard
      }
    }

    const contextData: TenantContextData = {
      tenantId,
      userId,
      isSuperUser,
    };

    tenantContextStorage.run(contextData, () => {
      next();
    });
  }
}
