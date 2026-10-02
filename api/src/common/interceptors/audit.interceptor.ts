import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'superkey',
  'superkeyhash',
  'token',
  'refreshtoken',
  'secret',
  'authorization',
]);

function sanitizeData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  if (typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, ip, params } = request;

    const cleanUrl = (url || '').split('?')[0];
    const pathSegments = cleanUrl.split('/').filter(Boolean);
    const relevantSegments = pathSegments[0] === 'api' ? pathSegments.slice(1) : pathSegments;
    let entity = relevantSegments.length > 0 ? relevantSegments[0] : 'unknown';
    if (
      relevantSegments.length >= 2 &&
      ['purchases', 'movements'].includes(relevantSegments[0]) &&
      !/^[0-9a-f-]{36}$/i.test(relevantSegments[1])
    ) {
      entity = `${relevantSegments[0]}_${relevantSegments[1]}`;
    }

    let defaultAction = method;
    if (entity === 'auth' && relevantSegments[1]) {
      defaultAction = relevantSegments[1].toUpperCase();
    }

    const sanitizedBody = sanitizeData(body);

    return next.handle().pipe(
      tap({
        next: async (response) => {
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            let entityId: string | null = null;
            if (response && response.id !== undefined && response.id !== null) {
              entityId = String(response.id);
            } else if (response && response.user && response.user.id) {
              entityId = String(response.user.id);
            } else if (params && params.id) {
              entityId = String(params.id);
            }

            const userId = user?.id || (response?.user?.id ? String(response.user.id) : null);

            try {
              await this.prisma.auditLog.create({
                data: {
                  userId,
                  action: defaultAction,
                  entity,
                  entityId,
                  detail: sanitizedBody,
                  ipAddress: ip || null,
                },
              });
            } catch (e) {
              console.error('Failed to create audit log', e);
            }
          }
        },
        error: async (err) => {
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && entity === 'auth') {
            try {
              await this.prisma.auditLog.create({
                data: {
                  userId: null,
                  action: `${defaultAction}_FAILED`,
                  entity,
                  entityId: null,
                  detail: {
                    ...sanitizedBody,
                    error: err?.message || 'Authentication error',
                  },
                  ipAddress: ip || null,
                },
              });
            } catch (e) {
              console.error('Failed to create failure audit log', e);
            }
          }
        },
      }),
    );
  }
}
