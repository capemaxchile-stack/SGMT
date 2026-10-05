import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationChannelsConfigDto,
  TestChannelDto,
} from './dto/notification-channels-config.dto';

const CONFIG_SETTING_KEY = 'NOTIFICATION_CHANNELS_CONFIG';

const DEFAULT_CONFIG: NotificationChannelsConfigDto = {
  telegram: {
    enabled: false,
    botToken: '',
    chatId: '',
    events: {
      radarAlerts: true,
      lowStock: true,
      pendingApprovals: true,
      abnormalFuel: true,
    },
  },
  brevo: {
    enabled: false,
    apiKey: '',
    senderEmail: 'alertas@sgmt.local',
    senderName: 'SGMT Alertas Operacionales',
    recipientEmails: [],
    events: {
      radarAlerts: true,
      lowStock: true,
      pendingApprovals: true,
      abnormalFuel: true,
    },
  },
  webhook: {
    enabled: false,
    url: '',
    events: {
      radarAlerts: false,
      lowStock: false,
      pendingApprovals: false,
      abnormalFuel: false,
    },
  },
  scheduleRules: {
    digestFrequency: 'DAILY',
    dailyDigestTime: '08:00',
    enableRealtimeEvents: false,
    cooldownPreventDuplicateDaily: true,
  },
};

@Injectable()
export class NotificationChannelsService {
  private readonly logger = new Logger(NotificationChannelsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to mask sensitive keys for client display (e.g., '1234••••••••••••abcd')
   */
  private maskSecret(secret?: string): string {
    if (!secret || secret.trim().length < 8) return secret || '';
    const clean = secret.trim();
    const start = clean.substring(0, 4);
    const end = clean.substring(clean.length - 4);
    return `${start}••••••••••••${end}`;
  }

  /**
   * Retrieve current notification channels configuration (masked for security)
   */
  async getConfig(rawSecrets = false): Promise<NotificationChannelsConfigDto> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: CONFIG_SETTING_KEY },
    });

    if (!setting || !setting.value) {
      return DEFAULT_CONFIG;
    }

    try {
      const parsed: NotificationChannelsConfigDto = JSON.parse(setting.value);
      if (rawSecrets) return parsed;

      return {
        ...parsed,
        telegram: {
          ...parsed.telegram,
          botToken: this.maskSecret(parsed.telegram?.botToken),
        },
        brevo: {
          ...parsed.brevo,
          apiKey: this.maskSecret(parsed.brevo?.apiKey),
        },
      };
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Update notification channels configuration (merges unmasked secrets if unmodified)
   */
  async updateConfig(dto: NotificationChannelsConfigDto): Promise<NotificationChannelsConfigDto> {
    const current = await this.getConfig(true);

    // If submitted botToken is masked, keep existing secret
    let finalBotToken = dto.telegram.botToken;
    if (finalBotToken && finalBotToken.includes('••••')) {
      finalBotToken = current.telegram.botToken;
    }

    // If submitted Brevo apiKey is masked, keep existing secret
    let finalBrevoApiKey = dto.brevo.apiKey;
    if (finalBrevoApiKey && finalBrevoApiKey.includes('••••')) {
      finalBrevoApiKey = current.brevo.apiKey;
    }

    const mergedConfig: NotificationChannelsConfigDto = {
      telegram: {
        ...dto.telegram,
        botToken: finalBotToken,
      },
      brevo: {
        ...dto.brevo,
        apiKey: finalBrevoApiKey,
      },
      webhook: dto.webhook || current.webhook,
      scheduleRules: dto.scheduleRules || current.scheduleRules || DEFAULT_CONFIG.scheduleRules,
    };

    await this.prisma.systemSetting.upsert({
      where: { key: CONFIG_SETTING_KEY },
      create: {
        key: CONFIG_SETTING_KEY,
        value: JSON.stringify(mergedConfig),
        description: 'Configuración de canales de notificación (Telegram, Brevo Email, Webhook)',
      },
      update: {
        value: JSON.stringify(mergedConfig),
      },
    });

    return this.getConfig(false);
  }

  /**
   * Send test message to a specified channel
   */
  async sendTest(dto: TestChannelDto): Promise<{ success: boolean; message: string; details?: any }> {
    const config = await this.getConfig(true);

    if (dto.channel === 'TELEGRAM') {
      const botToken = dto.telegramConfig?.botToken?.includes('••••')
        ? config.telegram.botToken
        : dto.telegramConfig?.botToken || config.telegram.botToken;

      const chatId = dto.telegramConfig?.chatId || config.telegram.chatId;

      if (!botToken || !chatId) {
        throw new BadRequestException('Debes ingresar el Token del Bot y el ID del Chat de Telegram');
      }

      return this.executeTelegramSend(
        botToken,
        chatId,
        `🚜 *SGMT PRO - Notificación de Prueba* 🔔\n\n` +
          `✅ *¡Conexión Exitosa!*\n` +
          `El canal de alertas vía Telegram Bot está correctamente enlazado con SGMT PRO.\n\n` +
          `📍 *Servidor:* LXC Node 106\n` +
          `📅 *Fecha:* ${new Date().toLocaleString('es-CL')}\n` +
          `🛡️ *Eventos activos:* Radar de Mantención, Stock Crítico, OCs y Combustible.`,
      );
    }

    if (dto.channel === 'BREVO') {
      const apiKey = dto.brevoConfig?.apiKey?.includes('••••')
        ? config.brevo.apiKey
        : dto.brevoConfig?.apiKey || config.brevo.apiKey;

      const senderEmail = dto.brevoConfig?.senderEmail || config.brevo.senderEmail || 'alertas@sgmt.local';
      const senderName = dto.brevoConfig?.senderName || config.brevo.senderName || 'SGMT Alertas';
      const recipients = dto.brevoConfig?.recipientEmails || config.brevo.recipientEmails || [];

      if (!apiKey) {
        throw new BadRequestException('Debes ingresar la API Key de Brevo (xkeysib-...)');
      }
      if (!recipients || recipients.length === 0) {
        throw new BadRequestException('Debes ingresar al menos un correo de destinatario para la prueba');
      }

      return this.executeBrevoSend(
        apiKey,
        senderEmail,
        senderName,
        recipients,
        'SGMT PRO — Alerta de Prueba Brevo Email',
        `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 800;">SGMT PRO — Centro de Alertas</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Notificación de Prueba de Correo Brevo</p>
          </div>
          <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; color: #166534; font-weight: 600;">
              ✅ ¡Conexión con Brevo SMTP/API establecida exitosamente!
            </div>
            <p>Este es un correo de validación enviado desde tu servidor de <strong>SGMT PRO</strong> para confirmar que los avisos automáticos de maquinaria, compras y bodega llegarán correctamente a la casilla configurada.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">Servidor:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">LXC Node 106 (PostgreSQL 16)</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">Fecha y Hora:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${new Date().toLocaleString('es-CL')}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; color: #64748b;">Canal:</td>
                <td style="padding: 8px;">Brevo Transactional API v3</td>
              </tr>
            </table>
          </div>
          <div style="background: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            Sistema de Gestión Movimiento de Tierra (SGMT PRO) &bull; Notificación Automática
          </div>
        </div>
        `,
      );
    }

    throw new BadRequestException(`Canal no soportado: ${dto.channel}`);
  }

  /**
   * Native Telegram Send Implementation
   */
  private async executeTelegramSend(
    botToken: string,
    chatId: string,
    text: string,
  ): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.ok) {
        throw new BadRequestException(
          `Error de Telegram API: ${resData.description || response.statusText}`,
        );
      }

      return {
        success: true,
        message: '¡Mensaje de prueba enviado exitosamente a Telegram!',
        details: resData.result,
      };
    } catch (err: any) {
      this.logger.error(`Error sending Telegram alert: ${err.message}`);
      throw new BadRequestException(err.message || 'Error al conectar con la API de Telegram');
    }
  }

  /**
   * Native Brevo Send Implementation
   */
  private async executeBrevoSend(
    apiKey: string,
    senderEmail: string,
    senderName: string,
    recipients: string[],
    subject: string,
    htmlContent: string,
  ): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const url = 'https://api.brevo.com/v3/smtp/email';
      const to = recipients.map((email) => ({ email: email.trim() }));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to,
          subject,
          htmlContent,
        }),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new BadRequestException(
          `Error de Brevo API (${response.status}): ${resData.message || response.statusText}`,
        );
      }

      return {
        success: true,
        message: `¡Correo de prueba enviado exitosamente a ${recipients.length} destinatario(s) vía Brevo!`,
        details: resData,
      };
    } catch (err: any) {
      this.logger.error(`Error sending Brevo email: ${err.message}`);
      throw new BadRequestException(err.message || 'Error al conectar con la API de Brevo');
    }
  }

  /**
   * Dispatch system alert to all enabled channels configured for this event type
   */
  async dispatchSystemAlert(payload: {
    event: 'radarAlerts' | 'lowStock' | 'pendingApprovals' | 'abnormalFuel';
    title: string;
    summary: string;
    details?: Record<string, any>;
    link?: string;
  }) {
    try {
      const config = await this.getConfig(true);

      // Check if immediate realtime event dispatch is active (otherwise captured in daily digest)
      const allowRealtime = config.scheduleRules?.enableRealtimeEvents ?? false;
      if (!allowRealtime) {
        return;
      }

      // 1. Dispatch to Telegram if enabled and event is subscribed
      if (config.telegram?.enabled && config.telegram.events?.[payload.event]) {
        const botToken = config.telegram.botToken;
        const chatId = config.telegram.chatId;
        if (botToken && chatId) {
          const mdText =
            `🚨 *SGMT PRO - Alerta Automática* 🔔\n\n` +
            `📋 *${payload.title}*\n` +
            `${payload.summary}\n\n` +
            `📍 *Módulo:* \`${payload.link || '/dashboard'}\`\n` +
            `📅 *Fecha:* ${new Date().toLocaleString('es-CL')}\n` +
            `⚙️ *Servidor:* LXC Node 106`;

          this.executeTelegramSend(botToken, chatId, mdText).catch((err) =>
            this.logger.warn(`Failed async telegram dispatch: ${err.message}`),
          );
        }
      }

      // 2. Dispatch to Brevo Email if enabled and event is subscribed
      if (config.brevo?.enabled && config.brevo.events?.[payload.event]) {
        const apiKey = config.brevo.apiKey;
        const senderEmail = config.brevo.senderEmail || 'alertas@sgmt.local';
        const senderName = config.brevo.senderName || 'SGMT Alertas';
        const recipients = config.brevo.recipientEmails || [];

        if (apiKey && recipients.length > 0) {
          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 20px; text-align: center; color: white;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 800;">SGMT PRO &bull; Alerta Operacional</h2>
                <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">${payload.title}</p>
              </div>
              <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
                <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; margin-bottom: 16px; border-radius: 4px;">
                  ${payload.summary.replace(/\n/g, '<br/>')}
                </div>
                <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
                  Fecha del evento: <strong>${new Date().toLocaleString('es-CL')}</strong> &bull; Servidor: <strong>LXC Node 106</strong>
                </p>
              </div>
            </div>
          `;

          this.executeBrevoSend(
            apiKey,
            senderEmail,
            senderName,
            recipients,
            `SGMT Alerta: ${payload.title}`,
            html,
          ).catch((err) => this.logger.warn(`Failed async brevo dispatch: ${err.message}`));
        }
      }

      // 3. Dispatch to Webhook if enabled and event is subscribed
      if (config.webhook?.enabled && config.webhook.url && config.webhook.events?.[payload.event]) {
        fetch(config.webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: payload.event,
            title: payload.title,
            summary: payload.summary,
            details: payload.details,
            link: payload.link,
            timestamp: new Date().toISOString(),
          }),
        }).catch((err) => this.logger.warn(`Failed async webhook dispatch: ${err.message}`));
      }
    } catch (err: any) {
      this.logger.error(`Error in dispatchSystemAlert: ${err.message}`);
    }
  }
}
