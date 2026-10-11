import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { BudgetService } from './budget.service';
import { BudgetController } from './budget.controller';
import { PurchaseSuggestionsService } from './purchase-suggestions.service';
import { SuggestionsController } from './suggestions.controller';
import { ProcurementAuditService } from './procurement-audit.service';
import { ProcurementAuditController } from './audit.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [
    RequestsController,
    OrdersController,
    QuotationsController,
    BudgetController,
    SuggestionsController,
    ProcurementAuditController,
  ],
  providers: [
    RequestsService,
    OrdersService,
    QuotationsService,
    BudgetService,
    PurchaseSuggestionsService,
    ProcurementAuditService,
  ],
  exports: [
    RequestsService,
    OrdersService,
    QuotationsService,
    BudgetService,
    PurchaseSuggestionsService,
    ProcurementAuditService,
  ],
})
export class PurchasesModule {}
