import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  controllers: [RequestsController, OrdersController],
  providers: [RequestsService, OrdersService],
  exports: [RequestsService, OrdersService],
})
export class PurchasesModule {}
