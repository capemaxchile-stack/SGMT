import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, ip } = request;

    return next.handle().pipe(
      tap(async (response) => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          let entity = url.split('/')[2] || 'unknown'; // assuming /api/entity/...
          let entityId = null;
          
          if (response && response.id) {
            entityId = response.id;
          }

          try {
            await this.prisma.auditLog.create({
              data: {
                userId: user?.id || null,
                action: method,
                entity: entity,
                entityId: entityId,
                detail: body,
                ipAddress: ip,
              }
            });
          } catch (e) {
            console.error('Failed to create audit log', e);
          }
        }
      }),
    );
  }
}
