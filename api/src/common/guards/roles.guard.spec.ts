import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard Empirical Security Tests (SEC-007)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('1. Rejects unauthenticated request (user is null or undefined)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN_SISTEMA']);
    expect(guard.canActivate(createMockContext(null))).toBe(false);
    expect(guard.canActivate(createMockContext(undefined))).toBe(false);
  });

  it('2. Rejects deactivated users even if they have required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN_SISTEMA']);
    const deactivatedUser = {
      id: 'u-1',
      isActive: false,
      roles: ['ADMIN_SISTEMA'],
    };
    expect(guard.canActivate(createMockContext(deactivatedUser))).toBe(false);
  });

  it('3. Rejects users with empty roles array', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['BODEGUERO']);
    const userWithoutRoles = {
      id: 'u-2',
      isActive: true,
      roles: [],
    };
    expect(guard.canActivate(createMockContext(userWithoutRoles))).toBe(false);
  });

  it('4. Allows ADMIN_SISTEMA and SUPER_USUARIO to access any protected route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['CONTADOR']);
    
    const adminUser = {
      id: 'u-admin',
      isActive: true,
      roles: ['ADMIN_SISTEMA'],
    };
    expect(guard.canActivate(createMockContext(adminUser))).toBe(true);

    const superUser = {
      id: 'u-super',
      isActive: true,
      roles: ['SUPER_USUARIO'],
    };
    expect(guard.canActivate(createMockContext(superUser))).toBe(true);
  });

  it('5. Correctly normalizes complex Prisma nested role objects', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['BODEGUERO']);
    const userWithNestedRoles = {
      id: 'u-bodega',
      isActive: true,
      roles: [
        { role: { id: 'r1', name: 'BODEGUERO' } },
      ],
    };
    expect(guard.canActivate(createMockContext(userWithNestedRoles))).toBe(true);
  });

  it('6. Blocks unauthorized roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['GERENTE_OPERACIONES']);
    const regularUser = {
      id: 'u-regular',
      isActive: true,
      roles: ['BODEGUERO'],
    };
    expect(guard.canActivate(createMockContext(regularUser))).toBe(false);
  });
});
