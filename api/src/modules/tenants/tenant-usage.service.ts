import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantUsageService {
  private readonly logger = new Logger(TenantUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  async getOrCreateCurrentMetric(tenantId: string) {
    const billingPeriod = this.getCurrentPeriod();

    return this.prisma.tenantUsageMetric.upsert({
      where: {
        tenantId_billingPeriod: {
          tenantId,
          billingPeriod,
        },
      },
      update: {},
      create: {
        tenantId,
        billingPeriod,
      },
    });
  }

  async recordEmailSent(tenantId: string, count: number = 1) {
    if (!tenantId) return;
    const billingPeriod = this.getCurrentPeriod();

    try {
      await this.prisma.tenantUsageMetric.upsert({
        where: { tenantId_billingPeriod: { tenantId, billingPeriod } },
        update: { emailsSent: { increment: count } },
        create: { tenantId, billingPeriod, emailsSent: count },
      });
    } catch (e: any) {
      this.logger.warn(`Could not increment email metric for tenant ${tenantId}: ${e.message}`);
    }
  }

  async recordMessageSent(tenantId: string, count: number = 1) {
    if (!tenantId) return;
    const billingPeriod = this.getCurrentPeriod();

    try {
      await this.prisma.tenantUsageMetric.upsert({
        where: { tenantId_billingPeriod: { tenantId, billingPeriod } },
        update: { messagesSent: { increment: count } },
        create: { tenantId, billingPeriod, messagesSent: count },
      });
    } catch (e: any) {
      this.logger.warn(`Could not increment message metric for tenant ${tenantId}: ${e.message}`);
    }
  }

  async recordAiTokens(tenantId: string, tokens: number) {
    if (!tenantId || tokens <= 0) return;
    const billingPeriod = this.getCurrentPeriod();

    try {
      await this.prisma.tenantUsageMetric.upsert({
        where: { tenantId_billingPeriod: { tenantId, billingPeriod } },
        update: { aiTokensUsed: { increment: tokens } },
        create: { tenantId, billingPeriod, aiTokensUsed: tokens },
      });
    } catch (e: any) {
      this.logger.warn(`Could not increment AI tokens metric for tenant ${tenantId}: ${e.message}`);
    }
  }

  async assertQuota(tenantId: string, resource: 'USERS' | 'ASSETS' | 'FAENAS') {
    if (!tenantId) return true;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true,
            assets: true,
            faenas: true,
          },
        },
      },
    });

    if (!tenant) return true;

    if (resource === 'USERS' && tenant._count.users >= tenant.maxUsers) {
      throw new BadRequestException(
        `Límite de usuarios alcanzado (${tenant._count.users}/${tenant.maxUsers}) para el plan ${tenant.planTier}. Solicita una ampliación de capacidad.`,
      );
    }

    if (resource === 'ASSETS' && tenant._count.assets >= tenant.maxAssets) {
      throw new BadRequestException(
        `Límite de maquinarias/equipos alcanzado (${tenant._count.assets}/${tenant.maxAssets}) para el plan ${tenant.planTier}. Solicita una ampliación de flota.`,
      );
    }

    if (resource === 'FAENAS' && tenant._count.faenas >= tenant.maxFaenas) {
      throw new BadRequestException(
        `Límite de faenas activas alcanzado (${tenant._count.faenas}/${tenant.maxFaenas}) para el plan ${tenant.planTier}.`,
      );
    }

    return true;
  }
}
