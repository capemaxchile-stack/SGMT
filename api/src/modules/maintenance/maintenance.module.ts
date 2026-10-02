import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlansController, WorkOrdersController],
  providers: [PlansService, WorkOrdersService],
  exports: [PlansService, WorkOrdersService],
})
export class MaintenanceModule {}
