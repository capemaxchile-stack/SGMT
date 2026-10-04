import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { FaenasModule } from './modules/faenas/faenas.module';
import { AssetsModule } from './modules/assets/assets.module';
import { ItemsModule } from './modules/items/items.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { UsersModule } from './modules/users/users.module';
import { MovementsModule } from './modules/movements/movements.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { AuditModule } from './modules/audit/audit.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { FuelModule } from './modules/fuel/fuel.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CopilotModule } from './modules/copilot/copilot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    FaenasModule,
    AssetsModule,
    ItemsModule,
    SuppliersModule,
    WarehousesModule,
    UsersModule,
    MovementsModule,
    PurchasesModule,
    AuditModule,
    DashboardModule,
    MaintenanceModule,
    FuelModule,
    ReportsModule,
    NotificationsModule,
    CopilotModule,
  ],
})
export class AppModule {}
