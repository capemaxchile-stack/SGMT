import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [RequestsController, OrdersController, QuotationsController],
  providers: [RequestsService, OrdersService, QuotationsService],
  exports: [RequestsService, OrdersService, QuotationsService],
})
export class PurchasesModule {}
