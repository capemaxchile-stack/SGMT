import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationChannelsService } from './notification-channels.service';

@Injectable()
export class NotificationSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly channelsService: NotificationChannelsService,
  ) {}

  onModuleInit() {
    // Run initial sweep 20 seconds after boot, then every 30 minutes
    setTimeout(() => {
      this.runOperationalSweep().catch((err) =>
        this.logger.warn(`Error on initial notification sweep: ${err.message}`),
      );
    }, 20000);

    this.timer = setInterval(() => {
      this.runOperationalSweep().catch((err) =>
        this.logger.warn(`Error on periodic notification sweep: ${err.message}`),
      );
    }, 1000 * 60 * 30); // 30 minutes
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /**
   * Evaluates active system alerts and dispatches automatic digest
   */
  async runOperationalSweep(): Promise<{ dispatched: boolean; count: number }> {
    const alerts = await this.notificationsService.getNotifications();
    if (alerts.criticalCount === 0 && alerts.highCount === 0) {
      return { dispatched: false, count: 0 };
    }

    const radarCount = alerts.notifications.filter((n) => n.category === 'MANTENIMIENTO').length;
    const stockCount = alerts.notifications.filter((n) => n.category === 'STOCK').length;
    const ordersCount = alerts.notifications.filter((n) => n.category === 'COMPRAS').length;

    const summaryParts: string[] = [];
    if (radarCount > 0) summaryParts.push(`🛡️ *${radarCount}* alerta(s) de mantenimiento en radar`);
    if (stockCount > 0) summaryParts.push(`📦 *${stockCount}* ítem(s) bajo stock mínimo en bodega`);
    if (ordersCount > 0) summaryParts.push(`📝 *${ordersCount}* orden(es) de compra pendientes de autorización`);

    if (summaryParts.length > 0) {
      // Determine primary event category for filter check
      const eventType =
        ordersCount > 0
          ? 'pendingApprovals'
          : radarCount > 0
          ? 'radarAlerts'
          : 'lowStock';

      await this.channelsService.dispatchSystemAlert({
        event: eventType,
        title: `Resumen Operativo: ${alerts.totalCount} Alertas Activas`,
        summary: `Se detectaron avisos pendientes en el sistema:\n\n${summaryParts.map((s) => `• ${s}`).join('\n')}`,
        link: '/dashboard',
      });

      return { dispatched: true, count: alerts.totalCount };
    }

    return { dispatched: false, count: 0 };
  }
}
