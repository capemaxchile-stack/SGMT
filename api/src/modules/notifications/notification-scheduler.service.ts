import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationChannelsService } from './notification-channels.service';
import { PrismaService } from '../../prisma/prisma.service';

const LAST_DIGEST_DATE_KEY = 'LAST_DIGEST_SENT_DATE';

@Injectable()
export class NotificationSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly channelsService: NotificationChannelsService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    // Evaluate scheduled digest check every 2 minutes
    this.timer = setInterval(() => {
      this.evaluateScheduledDispatch().catch((err) =>
        this.logger.warn(`Error during scheduled alert evaluation: ${err.message}`),
      );
    }, 1000 * 60 * 2); // Every 2 minutes
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /**
   * Evaluates rules tenant by tenant (Daily at target time, Realtime vs Digest, Anti-spam cooldown)
   */
  async evaluateScheduledDispatch(): Promise<void> {
    const activeTenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVO' },
    });

    const now = new Date();
    const localTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const localDateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    for (const tenant of activeTenants) {
      try {
        const config = await this.channelsService.getConfig(true, tenant.id);
        const rules = config.scheduleRules || {
          digestFrequency: 'DAILY',
          dailyDigestTime: '08:00',
          enableRealtimeEvents: false,
          cooldownPreventDuplicateDaily: true,
        };

        if (rules.digestFrequency === 'DISABLED' || rules.digestFrequency === 'REALTIME_ONLY') {
          continue;
        }

        if (rules.digestFrequency === 'DAILY') {
          const targetTime = rules.dailyDigestTime || '08:00';
          if (localTimeStr >= targetTime) {
            const tenantDigestKey = `${LAST_DIGEST_DATE_KEY}_${tenant.id}`;
            const lastSentSetting = await this.prisma.systemSetting.findUnique({
              where: { key: tenantDigestKey },
            });

            if (lastSentSetting?.value === localDateStr && rules.cooldownPreventDuplicateDaily) {
              continue;
            }

            const result = await this.runOperationalSweepForTenant(tenant, config);
            if (result.dispatched) {
              await this.prisma.systemSetting.upsert({
                where: { key: tenantDigestKey },
                create: {
                  key: tenantDigestKey,
                  value: localDateStr,
                  description: `Fecha del último resumen diario enviado para ${tenant.name}`,
                },
                update: { value: localDateStr },
              });
              this.logger.log(`Daily digest dispatched for tenant ${tenant.name} (${tenant.id}) on ${localDateStr}`);
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed digest check for tenant ${tenant.slug}: ${err.message}`);
      }
    }
  }

  /**
   * Evaluates active system alerts for a single tenant and dispatches automatic digest
   */
  async runOperationalSweepForTenant(
    tenant: { id: string; name: string },
    config: any,
  ): Promise<{ dispatched: boolean; count: number }> {
    const alerts = await this.notificationsService.getNotifications(tenant.id);
    if (alerts.criticalCount === 0 && alerts.highCount === 0) {
      return { dispatched: false, count: 0 };
    }

    const radarCount = alerts.notifications.filter((n) => n.category === 'MANTENIMIENTO').length;
    const stockCount = alerts.notifications.filter((n) => n.category === 'STOCK').length;
    const ordersCount = alerts.notifications.filter((n) => n.category === 'COMPRAS').length;

    const summaryParts: string[] = [];
    if (radarCount > 0) summaryParts.push(`🛡️ *${radarCount}* maquinaria(s) con pauta de mantenimiento en radar`);
    if (stockCount > 0) summaryParts.push(`📦 *${stockCount}* insumo(s) bajo stock mínimo en bodega`);
    if (ordersCount > 0) summaryParts.push(`📝 *${ordersCount}* orden(es) de compra pendientes de aprobación`);

    if (summaryParts.length > 0) {
      const mdText =
        `📋 *${tenant.name} — Resumen Operacional Diario* 🚜🔔\n\n` +
        `Buenos días. Este es el consolidado matutino de alertas activas en faena:\n\n` +
        `${summaryParts.map((s) => `• ${s}`).join('\n')}\n\n` +
        `📍 *Panel:* \`/dashboard\`\n` +
        `📅 *Fecha:* ${new Date().toLocaleString('es-CL')}`;

      // 1. Send to Telegram
      if (config.telegram?.enabled && config.telegram.botToken && config.telegram.chatId) {
        (this.channelsService as any).executeTelegramSend(
          config.telegram.botToken,
          config.telegram.chatId,
          mdText,
        ).catch((err: any) => this.logger.warn(`Failed telegram sweep for ${tenant.name}: ${err.message}`));
      }

      // 2. Send to Brevo
      if (config.brevo?.enabled && config.brevo.apiKey && (config.brevo.recipientEmails?.length || 0) > 0) {
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 24px; text-align: center; color: white;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 800;">${tenant.name} &bull; Resumen Operacional Diario</h2>
              <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Consolidado Matutino de Alertas en Faena</p>
            </div>
            <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
              <p style="margin-top: 0;">Se detectaron las siguientes alertas activas en el sistema:</p>
              <ul style="padding-left: 20px; margin: 16px 0; color: #334155;">
                ${summaryParts.map((s) => `<li style="margin-bottom: 8px;">${s.replace(/\*/g, '')}</li>`).join('')}
              </ul>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-top: 20px; font-size: 12px; color: #64748b;">
                Fecha: <strong>${new Date().toLocaleString('es-CL')}</strong>
              </div>
            </div>
          </div>
        `;

        (this.channelsService as any).executeBrevoSend(
          config.brevo.apiKey,
          config.brevo.senderEmail || 'alertas@katei.cl',
          config.brevo.senderName || `${tenant.name} Alertas`,
          config.brevo.recipientEmails || [],
          `${tenant.name} — Resumen Matutino de Alertas (${alerts.totalCount} activas)`,
          html,
        ).catch((err: any) => this.logger.warn(`Failed brevo sweep for ${tenant.name}: ${err.message}`));
      }

      return { dispatched: true, count: alerts.totalCount };
    }

    return { dispatched: false, count: 0 };
  }

  /**
   * Legacy method for backward compatibility
   */
  async runOperationalSweep(): Promise<{ dispatched: boolean; count: number }> {
    const config = await this.channelsService.getConfig(true);
    return this.runOperationalSweepForTenant({ id: '11111111-1111-4111-a111-111111111111', name: 'KATEI' }, config);
  }
}
