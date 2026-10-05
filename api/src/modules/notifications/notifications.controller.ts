import { Controller, Get, Put, Post, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationChannelsService } from './notification-channels.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import {
  NotificationChannelsConfigDto,
  TestChannelDto,
} from './dto/notification-channels-config.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly channelsService: NotificationChannelsService,
  ) {}

  @Get()
  getNotifications() {
    return this.notificationsService.getNotifications();
  }

  @Get('channels/config')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO')
  getChannelsConfig() {
    return this.channelsService.getConfig(false);
  }

  @Put('channels/config')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO')
  updateChannelsConfig(@Body() dto: NotificationChannelsConfigDto) {
    return this.channelsService.updateConfig(dto);
  }

  @Post('channels/test')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO')
  testChannel(@Body() dto: TestChannelDto) {
    return this.channelsService.sendTest(dto);
  }
}
