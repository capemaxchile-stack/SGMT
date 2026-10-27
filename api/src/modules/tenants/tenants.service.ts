import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateBackendAdminDto } from './dto/create-backend-admin.dto';
import { TenantPlanTier, TenantStatus } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { NotificationChannelsService } from '../notifications/notification-channels.service';
import * as bcrypt from 'bcrypt';

export const PLAN_PRESET_MODULES: Record<TenantPlanTier, string[]> = {
  [TenantPlanTier.BASICO]: [
    'DASHBOARD',
    'FAENAS',
    'FLOTA',
    'CERTIFICACIONES',
    'REPORTES',
  ],
  [TenantPlanTier.PRO]: [
    'DASHBOARD',
    'FAENAS',
    'FLOTA',
    'CERTIFICACIONES',
    'MANTENIMIENTO',
    'COMBUSTIBLE',
    'BODEGA',
    'REPORTES',
    'TERRENO',
  ],
  [TenantPlanTier.ENTERPRISE]: [
    'DASHBOARD',
    'FAENAS',
    'FLOTA',
    'CERTIFICACIONES',
    'MANTENIMIENTO',
    'COMBUSTIBLE',
    'BODEGA',
    'COMPRAS',
    'REPORTES',
    'TERRENO',
    'COPILOT',
    'ADMINISTRACION',
  ],
  [TenantPlanTier.PERSONALIZADO]: [],
};

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @Inject(forwardRef(() => NotificationChannelsService))
    private readonly notificationChannelsService: NotificationChannelsService,
  ) {}

  async findAll() {
    return this.prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            users: true,
            assets: true,
            faenas: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            assets: true,
            faenas: true,
            items: true,
            purchaseOrders: true,
            workOrders: true,
          },
        },
        usageMetrics: {
          orderBy: { billingPeriod: 'desc' },
          take: 6,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant con id '${id}' no encontrado`);
    }

    return tenant;
  }

  async findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({
      where: { slug },
    });
  }

  async create(dto: CreateTenantDto) {
    const existingSlug = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug.toLowerCase().trim() },
    });
    if (existingSlug) {
      throw new ConflictException(`El slug '${dto.slug}' ya se encuentra registrado por otra empresa`);
    }

    if (dto.rut) {
      const existingRut = await this.prisma.tenant.findUnique({
        where: { rut: dto.rut.trim() },
      });
      if (existingRut) {
        throw new ConflictException(`El RUT '${dto.rut}' ya se encuentra registrado`);
      }
    }

    const planTier = dto.planTier || TenantPlanTier.PRO;
    let enabledModules = dto.enabledModules;

    if (!enabledModules || enabledModules.length === 0) {
      enabledModules = PLAN_PRESET_MODULES[planTier] || PLAN_PRESET_MODULES[TenantPlanTier.PRO];
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name.trim(),
        slug: dto.slug.toLowerCase().trim(),
        rut: dto.rut ? dto.rut.trim() : null,
        planTier,
        status: dto.status || TenantStatus.ACTIVO,
        enabledModules,
        maxUsers: dto.maxUsers ?? (planTier === TenantPlanTier.BASICO ? 5 : planTier === TenantPlanTier.PRO ? 20 : 100),
        maxAssets: dto.maxAssets ?? (planTier === TenantPlanTier.BASICO ? 10 : planTier === TenantPlanTier.PRO ? 50 : 300),
        maxFaenas: dto.maxFaenas ?? (planTier === TenantPlanTier.BASICO ? 1 : planTier === TenantPlanTier.PRO ? 5 : 25),
        maxMonthlyEmails: dto.maxMonthlyEmails ?? 500,
        maxMonthlyMessages: dto.maxMonthlyMessages ?? 1000,
        maxMonthlyAiTokens: dto.maxMonthlyAiTokens ?? 100000,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        billingNotes: dto.billingNotes,
      },
    });

    let initialUser: any = null;

    // Provision initial administrator if adminEmail is provided
    if (dto.adminEmail) {
      const email = dto.adminEmail.toLowerCase().trim();
      const rawPassword = dto.adminInitialPassword?.trim() || `Katei${Math.floor(1000 + Math.random() * 9000)}!`;
      const passwordHash = await bcrypt.hash(rawPassword, 12);

      // Find or create ADMIN_SISTEMA role
      let adminRole = await this.prisma.role.findFirst({
        where: { name: 'ADMIN_SISTEMA' },
      });

      if (!adminRole) {
        adminRole = await this.prisma.role.create({
          data: {
            name: 'ADMIN_SISTEMA',
            displayName: 'Administrador del Sistema',
            level: 100,
          },
        });
      }

      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        initialUser = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            tenantId: tenant.id,
            name: dto.adminName?.trim() || existingUser.name,
            passwordHash,
          },
          select: { id: true, email: true, name: true },
        });
      } else {
        initialUser = await this.prisma.user.create({
          data: {
            email,
            name: dto.adminName?.trim() || 'Administrador',
            passwordHash,
            tenantId: tenant.id,
            isActive: true,
            roles: {
              create: [{ roleId: adminRole.id }],
            },
          },
          select: { id: true, email: true, name: true },
        });
      }

      initialUser.tempPassword = rawPassword;

      // Send Welcome Email if requested
      if (dto.sendWelcomeEmail) {
        this.sendWelcomeEmail(tenant, initialUser, rawPassword).catch((err) =>
          this.logger.warn(`Could not dispatch welcome email to ${email}: ${err.message}`),
        );
      }
    }

    return {
      ...tenant,
      initialUser,
    };
  }

  private async sendWelcomeEmail(tenant: any, user: any, tempPass: string) {
    const config = await this.notificationChannelsService.getConfig(true);
    const apiKey = config.brevo?.apiKey;
    const senderEmail = config.brevo?.senderEmail || 'alertas@katei.cl';
    const senderName = 'KATEI Plataforma Operativa';

    if (!apiKey) {
      this.logger.log(`Brevo API key not configured, welcome email to ${user.email} logged only.`);
      return;
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">¡Bienvenido a KATEI!</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Plataforma de Gestión de Maquinaria y Operaciones</p>
        </div>
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p>Hola <strong>${user.name}</strong>,</p>
          <p>Se ha configurado exitosamente el espacio de trabajo para <strong>${tenant.name}</strong> en KATEI con el plan <strong>${tenant.planTier}</strong>.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <div style="font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">Credenciales de Acceso:</div>
            <div style="margin-bottom: 6px;"><strong>URL:</strong> <a href="https://sgmt.capemaxchile.com" style="color: #2563eb;">https://sgmt.capemaxchile.com</a></div>
            <div style="margin-bottom: 6px;"><strong>Usuario / Email:</strong> ${user.email}</div>
            <div><strong>Contraseña Temporal:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${tempPass}</code></div>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            Te recomendamos cambiar tu contraseña una vez que ingreses por primera vez a la plataforma.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          KATEI &bull; Soporte Operacional &bull; contacto@katei.cl
        </div>
      </div>
    `;

    await (this.notificationChannelsService as any).executeBrevoSend(
      apiKey,
      senderEmail,
      senderName,
      [user.email],
      `Bienvenido a KATEI - Credenciales de Acceso (${tenant.name})`,
      html,
    );
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);

    const data: any = { ...dto };
    if (dto.slug) data.slug = dto.slug.toLowerCase().trim();
    if (dto.planTier && (!dto.enabledModules || dto.enabledModules.length === 0)) {
      if (dto.planTier !== TenantPlanTier.PERSONALIZADO) {
        data.enabledModules = PLAN_PRESET_MODULES[dto.planTier];
      }
    }

    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  async getUsage(id: string, billingPeriod?: string) {
    const tenant = await this.findOne(id);
    const period = billingPeriod || new Date().toISOString().slice(0, 7);

    const metric = await this.prisma.tenantUsageMetric.findUnique({
      where: {
        tenantId_billingPeriod: {
          tenantId: id,
          billingPeriod: period,
        },
      },
    });

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      planTier: tenant.planTier,
      billingPeriod: period,
      limits: {
        maxUsers: tenant.maxUsers,
        maxAssets: tenant.maxAssets,
        maxFaenas: tenant.maxFaenas,
        maxMonthlyEmails: tenant.maxMonthlyEmails,
        maxMonthlyMessages: tenant.maxMonthlyMessages,
        maxMonthlyAiTokens: tenant.maxMonthlyAiTokens,
      },
      currentCounts: {
        users: (tenant as any)._count.users,
        assets: (tenant as any)._count.assets,
        faenas: (tenant as any)._count.faenas,
      },
      monthlyConsumption: {
        emailsSent: metric?.emailsSent || 0,
        messagesSent: metric?.messagesSent || 0,
        aiTokensUsed: metric?.aiTokensUsed || 0,
        storageBytes: metric?.storageBytes ? Number(metric.storageBytes) : 0,
      },
      percentages: {
        emailsPercent: tenant.maxMonthlyEmails > 0 ? (((metric?.emailsSent || 0) / tenant.maxMonthlyEmails) * 100).toFixed(1) : '0',
        messagesPercent: tenant.maxMonthlyMessages > 0 ? (((metric?.messagesSent || 0) / tenant.maxMonthlyMessages) * 100).toFixed(1) : '0',
        aiTokensPercent: tenant.maxMonthlyAiTokens > 0 ? (((metric?.aiTokensUsed || 0) / tenant.maxMonthlyAiTokens) * 100).toFixed(1) : '0',
      },
    };
  }

  async impersonate(id: string, superUser: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        planTier: true,
        status: true,
        enabledModules: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant con ID '${id}' no encontrado`);
    }

    return this.authService.createImpersonationToken(superUser, tenant);
  }

  async getBackendAdmins() {
    return this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: 'SUPER_USUARIO',
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        tenantId: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBackendAdmin(dto: CreateBackendAdminDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException(`El correo '${email}' ya está registrado en el sistema`);
    }

    let superRole = await this.prisma.role.findFirst({
      where: { name: 'SUPER_USUARIO' },
    });

    if (!superRole) {
      superRole = await this.prisma.role.create({
        data: {
          name: 'SUPER_USUARIO',
          displayName: 'Super Usuario KATEI',
          level: 1000,
        },
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash,
        tenantId: null,
        isActive: true,
        roles: {
          create: [{ roleId: superRole.id }],
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async exportTenantData(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            createdAt: true,
            roles: {
              select: {
                role: {
                  select: { name: true, displayName: true },
                },
              },
            },
          },
        },
        faenas: true,
        assets: true,
        warehouses: true,
        items: true,
        suppliers: true,
        purchaseOrders: {
          include: { lines: true },
        },
        workOrders: {
          include: { items: true },
        },
        fuelLogs: true,
        maintenancePlans: true,
        operatorCerts: true,
        budgets: true,
        usageMetrics: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant con ID '${id}' no encontrado`);
    }

    return {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      system: 'KATEI Multi-Tenant SaaS',
      tenantInfo: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        rut: tenant.rut,
        status: tenant.status,
        planTier: tenant.planTier,
        enabledModules: tenant.enabledModules,
        limits: {
          maxUsers: tenant.maxUsers,
          maxAssets: tenant.maxAssets,
          maxFaenas: tenant.maxFaenas,
          maxMonthlyEmails: tenant.maxMonthlyEmails,
          maxMonthlyMessages: tenant.maxMonthlyMessages,
          maxMonthlyAiTokens: tenant.maxMonthlyAiTokens,
        },
        createdAt: tenant.createdAt,
      },
      summary: {
        totalUsers: tenant.users.length,
        totalFaenas: tenant.faenas.length,
        totalAssets: tenant.assets.length,
        totalWarehouses: tenant.warehouses.length,
        totalItems: tenant.items.length,
        totalSuppliers: tenant.suppliers.length,
        totalPurchaseOrders: tenant.purchaseOrders.length,
        totalWorkOrders: tenant.workOrders.length,
        totalFuelLogs: tenant.fuelLogs.length,
      },
      records: {
        users: tenant.users,
        faenas: tenant.faenas,
        assets: tenant.assets,
        warehouses: tenant.warehouses,
        items: tenant.items,
        suppliers: tenant.suppliers,
        purchaseOrders: tenant.purchaseOrders,
        workOrders: tenant.workOrders,
        fuelLogs: tenant.fuelLogs,
        maintenancePlans: tenant.maintenancePlans,
        operatorCertifications: tenant.operatorCerts,
        budgets: tenant.budgets,
        usageMetrics: tenant.usageMetrics,
      },
    };
  }

  async getCommercialPlans() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'COMMERCIAL_PLANS' },
    });

    if (setting?.value) {
      try {
        return JSON.parse(setting.value);
      } catch (e) {
        this.logger.warn('Failed to parse COMMERCIAL_PLANS JSON, using defaults');
      }
    }

    const defaultPlans = [
      {
        id: 'BASICO',
        tier: 'BASICO',
        name: 'Plan Básico Operativo',
        priceMonthly: '12 UF / mes',
        priceClp: 450000,
        target: 'Contratistas pequeños, talleres o faenas unitarias',
        description: 'Gestión esencial de flota, control de certificaciones y reportes.',
        maxUsers: 5,
        maxAssets: 10,
        maxFaenas: 2,
        maxMonthlyEmails: 200,
        maxMonthlyMessages: 500,
        maxMonthlyAiTokens: 50000,
        enabledModules: ['DASHBOARD', 'FAENAS', 'FLOTA', 'CERTIFICACIONES', 'REPORTES'],
      },
      {
        id: 'PRO',
        tier: 'PRO',
        name: 'Plan Profesional Constructor',
        priceMonthly: '28 UF / mes',
        priceClp: 1050000,
        popular: true,
        target: 'Empresas constructoras medianas y flotas activas',
        description: 'Suite operativa completa: mantenimiento correctivo/preventivo, cargas de combustible, bodegas y pedidos terreno.',
        maxUsers: 20,
        maxAssets: 50,
        maxFaenas: 5,
        maxMonthlyEmails: 500,
        maxMonthlyMessages: 1000,
        maxMonthlyAiTokens: 100000,
        enabledModules: [
          'DASHBOARD',
          'FAENAS',
          'FLOTA',
          'CERTIFICACIONES',
          'MANTENIMIENTO',
          'COMBUSTIBLE',
          'BODEGA',
          'REPORTES',
          'TERRENO',
        ],
      },
      {
        id: 'ENTERPRISE',
        tier: 'ENTERPRISE',
        name: 'Plan Enterprise Corporativo',
        priceMonthly: '48 UF / mes',
        priceClp: 1800000,
        target: 'Grandes constructoras, minería y flotas pesadas',
        description: 'Acceso total sin restricciones: compras y abastecimiento, KATEI Copilot con IA, administración y soporte prioritario.',
        maxUsers: 999,
        maxAssets: 999,
        maxFaenas: 999,
        maxMonthlyEmails: 10000,
        maxMonthlyMessages: 20000,
        maxMonthlyAiTokens: 1000000,
        enabledModules: [
          'DASHBOARD',
          'FAENAS',
          'FLOTA',
          'CERTIFICACIONES',
          'MANTENIMIENTO',
          'COMBUSTIBLE',
          'BODEGA',
          'COMPRAS',
          'REPORTES',
          'TERRENO',
          'COPILOT',
          'DOCUMENTACION',
          'ADMINISTRACION',
        ],
      },
    ];

    await this.prisma.systemSetting.upsert({
      where: { key: 'COMMERCIAL_PLANS' },
      update: { value: JSON.stringify(defaultPlans) },
      create: {
        key: 'COMMERCIAL_PLANS',
        value: JSON.stringify(defaultPlans),
        description: 'Catálogo de planes comerciales SaaS y límites de servicio',
      },
    });

    return defaultPlans;
  }

  async saveCommercialPlans(plans: any[]) {
    await this.prisma.systemSetting.upsert({
      where: { key: 'COMMERCIAL_PLANS' },
      update: { value: JSON.stringify(plans) },
      create: {
        key: 'COMMERCIAL_PLANS',
        value: JSON.stringify(plans),
        description: 'Catálogo de planes comerciales SaaS y límites de servicio',
      },
    });
    return plans;
  }

  async resetBackendAdminPassword(id: string, newPass: string) {
    if (!newPass || newPass.trim().length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    }

    const admin = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!admin) {
      throw new NotFoundException(`Usuario con ID '${id}' no encontrado`);
    }

    const isSuper = admin.roles.some((r) => r.role?.name === 'SUPER_USUARIO');
    if (!isSuper) {
      throw new ForbiddenException('Solo se pueden resetear claves de usuarios maestros mediante este endpoint');
    }

    const passwordHash = await bcrypt.hash(newPass.trim(), 12);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return {
      success: true,
      message: `Contraseña reestablecida correctamente para ${admin.name} (${admin.email})`,
    };
  }

  async getTenantBusinessProfile(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            faenas: true,
            assets: true,
            purchaseOrders: true,
            workOrders: true,
            warehouses: true,
            fuelLogs: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Empresa con ID '${id}' no encontrada`);
    }

    const poAgg = await this.prisma.purchaseOrder.aggregate({
      where: {
        tenantId: id,
        status: { in: ['APROBADA', 'APROBADA_EXCEPCION', 'EMITIDA', 'RECEPCION_TOTAL'] },
      },
      _sum: {
        totalAmount: true,
      },
    });

    const now = new Date();
    const created = new Date(tenant.createdAt);
    const diffMonths = Math.max(
      1,
      (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth()) + 1,
    );

    return {
      tenant,
      businessMetrics: {
        createdAt: tenant.createdAt,
        monthsActive: diffMonths,
        totalPurchasesAmount: Number(poAgg._sum?.totalAmount || 0),
        counts: tenant._count,
      },
    };
  }

  async remove(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Empresa con ID '${id}' no encontrada`);
    }

    if (tenant.slug === 'principal' && tenant.id === '11111111-1111-4111-a111-111111111111') {
      throw new BadRequestException('No se permite eliminar la empresa principal raíz del sistema.');
    }

    // 1. Limpiar métricas de consumo
    await this.prisma.tenantUsageMetric.deleteMany({
      where: { tenantId: id },
    });

    // 2. Gestionar usuarios vinculados a este tenant que no sean SUPER_USUARIO
    const tenantUsers = await this.prisma.user.findMany({
      where: {
        tenantId: id,
        roles: {
          none: {
            role: {
              name: 'SUPER_USUARIO',
            },
          },
        },
      },
    });

    for (const u of tenantUsers) {
      try {
        await this.prisma.user.delete({ where: { id: u.id } });
      } catch {
        // En caso de que el usuario tenga registros inmutables como AuditLog
        await this.prisma.user.update({
          where: { id: u.id },
          data: { tenantId: null, isActive: false },
        });
      }
    }

    // 3. Eliminar la empresa
    await this.prisma.tenant.delete({
      where: { id },
    });

    return {
      message: `Empresa '${tenant.name}' eliminada correctamente.`,
      deletedId: id,
      deletedSlug: tenant.slug,
    };
  }
}
