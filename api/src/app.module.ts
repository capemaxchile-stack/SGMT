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
  ],
})
export class AppModule {}
