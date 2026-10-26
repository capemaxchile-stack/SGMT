import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantPlanTier, TenantStatus } from '@prisma/client';

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
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.tenant.create({
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
}
