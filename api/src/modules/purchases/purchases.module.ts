import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [RequestsController, OrdersController],
  providers: [RequestsService, OrdersService],
  exports: [RequestsService, OrdersService],
})
export class PurchasesModule {}
