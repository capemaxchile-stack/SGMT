import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService, PLAN_PRESET_MODULES } from './tenants.service';
import { TenantUsageService } from './tenant-usage.service';
import { TenantModuleGuard } from './guards/tenant-module.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { Reflector } from '@nestjs/core';
import { TenantPlanTier, TenantStatus } from '@prisma/client';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { NotificationChannelsService } from '../notifications/notification-channels.service';

describe('Tenants Module Architecture', () => {
  let tenantsService: TenantsService;
  let usageService: TenantUsageService;
  let guard: TenantModuleGuard;
  let prismaMock: any;
  let reflector: Reflector;
  let authServiceMock: any;
  let notificationServiceMock: any;

  beforeEach(async () => {
    prismaMock = {
      tenant: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tenantUsageMetric: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    authServiceMock = {
      createImpersonationToken: jest.fn(),
    };

    notificationServiceMock = {
      getConfig: jest.fn().mockResolvedValue({}),
      executeBrevoSend: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        TenantUsageService,
        TenantModuleGuard,
        Reflector,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: NotificationChannelsService,
          useValue: notificationServiceMock,
        },
      ],
    }).compile();

    tenantsService = module.get<TenantsService>(TenantsService);
    usageService = module.get<TenantUsageService>(TenantUsageService);
    guard = module.get<TenantModuleGuard>(TenantModuleGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('TenantsService - Plan Presets & Creation', () => {
    it('should assign correct preset modules for BASICO plan', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue(null);
      prismaMock.tenant.create.mockImplementation((args: any) => Promise.resolve({ id: 't-1', ...args.data }));

      const result = await tenantsService.create({
        name: 'Constructora Austral SpA',
        slug: 'austral',
        planTier: TenantPlanTier.BASICO,
      });

      expect(result.enabledModules).toEqual(PLAN_PRESET_MODULES[TenantPlanTier.BASICO]);
      expect(result.enabledModules).not.toContain('COMPRAS');
      expect(result.enabledModules).not.toContain('COPILOT');
      expect(result.maxUsers).toBe(5);
    });

    it('should allow custom modules for PERSONALIZADO plan', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue(null);
      prismaMock.tenant.create.mockImplementation((args: any) => Promise.resolve({ id: 't-2', ...args.data }));

      const customModules = ['DASHBOARD', 'FLOTA', 'COPILOT'];
      const result = await tenantsService.create({
        name: 'Minera Los Andes',
        slug: 'los-andes',
        planTier: TenantPlanTier.PERSONALIZADO,
        enabledModules: customModules,
      });

      expect(result.enabledModules).toEqual(customModules);
    });

    it('should provision initial admin user and return credentials when adminEmail is given', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue(null);
      prismaMock.tenant.create.mockImplementation((args: any) => Promise.resolve({ id: 't-3', ...args.data }));
      prismaMock.role.findFirst.mockResolvedValue({ id: 'role-admin', name: 'ADMIN_SISTEMA' });
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'u-admin-1', email: args.data.email, name: args.data.name }),
      );

      const result = await tenantsService.create({
        name: 'Constructora del Sur',
        slug: 'delsur',
        planTier: TenantPlanTier.PRO,
        adminEmail: 'gerencia@delsur.cl',
        adminName: 'Carlos Sur',
      });

      expect(result.initialUser).toBeDefined();
      expect(result.initialUser.email).toBe('gerencia@delsur.cl');
      expect(result.initialUser.tempPassword).toBeDefined();
    });

    it('should delegate impersonation to authService.createImpersonationToken', async () => {
      const mockTenant = { id: 't-target', name: 'Cliente Objetivo' };
      prismaMock.tenant.findUnique.mockResolvedValue(mockTenant);
      authServiceMock.createImpersonationToken.mockResolvedValue({
        accessToken: 'mock-impersonated-token',
        user: { email: 'super@katei.cl', tenantId: 't-target' },
      });

      const res = await tenantsService.impersonate('t-target', {
        id: 'super-1',
        email: 'super@katei.cl',
        roles: ['SUPER_USUARIO'],
      });

      expect(authServiceMock.createImpersonationToken).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'super@katei.cl' }),
        mockTenant,
      );
      expect(res.accessToken).toBe('mock-impersonated-token');
    });

    it('should create backend admin user with SUPER_USUARIO role', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.role.findFirst.mockResolvedValue({ id: 'role-super', name: 'SUPER_USUARIO' });
      prismaMock.user.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'su-1', email: args.data.email, name: args.data.name, isActive: true }),
      );

      const admin = await tenantsService.createBackendAdmin({
        email: 'soporte@katei.cl',
        name: 'Soporte KATEI',
        password: 'PasswordMaster2026!',
      });

      expect(admin.email).toBe('soporte@katei.cl');
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'soporte@katei.cl',
            tenantId: null,
          }),
        }),
      );
    });
  });

  describe('TenantModuleGuard - Feature Gating (Spec S3)', () => {
    it('should allow access if required module is in tenant enabledModules', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('FLOTA');

      const mockContext: any = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              roles: ['OPERADOR'],
              tenant: {
                id: 't-1',
                name: 'Empresa Test',
                status: TenantStatus.ACTIVO,
                planTier: TenantPlanTier.BASICO,
                enabledModules: ['DASHBOARD', 'FLOTA'],
              },
            },
            headers: {},
          }),
        }),
      };

      const canActivate = await guard.canActivate(mockContext);
      expect(canActivate).toBe(true);
    });

    it('should throw ForbiddenException (PLAN_UPGRADE_REQUIRED) if module is not in tenant plan', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('COMPRAS');

      const mockContext: any = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              roles: ['SOLICITANTE_TERRENO'],
              tenant: {
                id: 't-1',
                name: 'Empresa Test',
                status: TenantStatus.ACTIVO,
                planTier: TenantPlanTier.BASICO,
                enabledModules: ['DASHBOARD', 'FLOTA'],
              },
            },
            headers: {},
          }),
        }),
      };

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('TenantUsageService - Quotas & Metering (Spec S4)', () => {
    it('should throw BadRequestException when max users quota is reached', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue({
        id: 't-1',
        planTier: TenantPlanTier.BASICO,
        maxUsers: 5,
        maxAssets: 10,
        maxFaenas: 1,
        _count: { users: 5, assets: 2, faenas: 1 },
      });

      await expect(usageService.assertQuota('t-1', 'USERS')).rejects.toThrow(BadRequestException);
    });

    it('should record sent emails and increment usage metric', async () => {
      prismaMock.tenantUsageMetric.upsert.mockResolvedValue({ emailsSent: 3 });

      await usageService.recordEmailSent('t-1', 3);

      expect(prismaMock.tenantUsageMetric.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { emailsSent: { increment: 3 } },
        }),
      );
    });
  });
});
