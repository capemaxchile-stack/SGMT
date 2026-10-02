import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditInterceptor SEC-003 & SEC-011 Empirical Verification', () => {
  let interceptor: AuditInterceptor;
  let prismaService: any;

  beforeEach(() => {
    prismaService = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
      },
    };
    interceptor = new AuditInterceptor(prismaService as PrismaService);
  });

  function createMockContext(req: any): ExecutionContext {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(req),
      }),
    } as unknown as ExecutionContext;
  }

  it('SEC-003: recursively redacts password, superKey, refreshToken, and sensitive secrets in detail payload', async () => {
    const maliciousBody = {
      email: 'admin@sgmt.cl',
      password: 'PlaintextPassword123!',
      superKey: 'SecretSuperKey456!',
      metadata: {
        token: 'eySecretToken',
        nested: {
          refreshToken: 'eyRefreshSecret',
          authorization: 'Bearer 12345',
          safeField: 'visible_data',
        },
      },
      itemCount: 42,
    };

    const req = {
      method: 'POST',
      url: '/api/movements',
      user: { id: 'user-1' },
      body: maliciousBody,
      ip: '127.0.0.1',
      params: {},
    };

    const ctx = createMockContext(req);
    const next: CallHandler = {
      handle: () => of({ id: 'mov-100', status: 'OK' }),
    };

    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, next).subscribe({
        complete: () => resolve(),
      });
    });

    expect(prismaService.auditLog.create).toHaveBeenCalledTimes(1);
    const createCall = prismaService.auditLog.create.mock.calls[0][0];
    const loggedDetail = createCall.data.detail;

    // Verify all sensitive keys are replaced with [REDACTED]
    expect(loggedDetail.password).toBe('[REDACTED]');
    expect(loggedDetail.superKey).toBe('[REDACTED]');
    expect(loggedDetail.metadata.token).toBe('[REDACTED]');
    expect(loggedDetail.metadata.nested.refreshToken).toBe('[REDACTED]');
    expect(loggedDetail.metadata.nested.authorization).toBe('[REDACTED]');

    // Verify non-sensitive operational fields are preserved intact
    expect(loggedDetail.metadata.nested.safeField).toBe('visible_data');
    expect(loggedDetail.itemCount).toBe(42);
    expect(loggedDetail.email).toBe('admin@sgmt.cl');
  });

  it('SEC-011: captures entityId from response.user.id on auth/login endpoint', async () => {
    const req = {
      method: 'POST',
      url: '/api/auth/login',
      user: null, // Initial request has no user
      body: { email: 'user@sgmt.cl', password: 'mypassword' },
      ip: '192.168.1.10',
      params: {},
    };

    const ctx = createMockContext(req);
    const next: CallHandler = {
      handle: () =>
        of({
          accessToken: 'token',
          refreshToken: 'refresh',
          user: { id: 'auth-user-99', email: 'user@sgmt.cl' },
        }),
    };

    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, next).subscribe({
        complete: () => resolve(),
      });
    });

    expect(prismaService.auditLog.create).toHaveBeenCalledTimes(1);
    const createCall = prismaService.auditLog.create.mock.calls[0][0];

    expect(createCall.data.action).toBe('LOGIN');
    expect(createCall.data.entity).toBe('auth');
    expect(createCall.data.userId).toBe('auth-user-99');
    expect(createCall.data.entityId).toBe('auth-user-99');
    expect(createCall.data.detail.password).toBe('[REDACTED]');
  });
});
