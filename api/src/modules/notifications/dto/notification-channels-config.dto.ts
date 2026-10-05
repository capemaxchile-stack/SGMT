import { IsBoolean, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationEventsDto {
  @IsBoolean()
  radarAlerts: boolean;

  @IsBoolean()
  lowStock: boolean;

  @IsBoolean()
  pendingApprovals: boolean;

  @IsBoolean()
  abnormalFuel: boolean;
}

export class TelegramConfigDto {
  @IsBoolean()
  enabled: boolean;

  @IsString()
  @IsOptional()
  botToken?: string;

  @IsString()
  @IsOptional()
  chatId?: string;

  @ValidateNested()
  @Type(() => NotificationEventsDto)
  events: NotificationEventsDto;
}

export class BrevoEmailConfigDto {
  @IsBoolean()
  enabled: boolean;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsOptional()
  senderEmail?: string;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  recipientEmails?: string[];

  @ValidateNested()
  @Type(() => NotificationEventsDto)
  events: NotificationEventsDto;
}

export class WebhookConfigDto {
  @IsBoolean()
  enabled: boolean;

  @IsString()
  @IsOptional()
  url?: string;

  @ValidateNested()
  @Type(() => NotificationEventsDto)
  events: NotificationEventsDto;
}

export class ScheduleRulesDto {
  @IsString()
  digestFrequency: 'DAILY' | 'HOURLY' | 'REALTIME_ONLY' | 'DISABLED';

  @IsString()
  @IsOptional()
  dailyDigestTime?: string; // e.g. "08:00"

  @IsBoolean()
  enableRealtimeEvents: boolean;

  @IsBoolean()
  cooldownPreventDuplicateDaily: boolean;
}

export class NotificationChannelsConfigDto {
  @ValidateNested()
  @Type(() => TelegramConfigDto)
  telegram: TelegramConfigDto;

  @ValidateNested()
  @Type(() => BrevoEmailConfigDto)
  brevo: BrevoEmailConfigDto;

  @ValidateNested()
  @Type(() => WebhookConfigDto)
  @IsOptional()
  webhook?: WebhookConfigDto;

  @ValidateNested()
  @Type(() => ScheduleRulesDto)
  @IsOptional()
  scheduleRules?: ScheduleRulesDto;
}

export class TestChannelDto {
  @IsString()
  channel: 'TELEGRAM' | 'BREVO' | 'WEBHOOK';

  @IsOptional()
  @ValidateNested()
  @Type(() => TelegramConfigDto)
  telegramConfig?: TelegramConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BrevoEmailConfigDto)
  brevoConfig?: BrevoEmailConfigDto;
}

