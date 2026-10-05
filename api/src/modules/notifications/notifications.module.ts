import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationChannelsService } from './notification-channels.service';
import { NotificationSchedulerService } from './notification-scheduler.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationChannelsService,
    NotificationSchedulerService,
  ],
  exports: [
    NotificationsService,
    NotificationChannelsService,
    NotificationSchedulerService,
  ],
})
export class NotificationsModule {}
