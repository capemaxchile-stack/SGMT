import { Module, Global, forwardRef } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TenantUsageService } from './tenant-usage.service';
import { TenantModuleGuard } from './guards/tenant-module.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [TenantsController],
  providers: [TenantsService, TenantUsageService, TenantModuleGuard],
  exports: [TenantsService, TenantUsageService, TenantModuleGuard],
})
export class TenantsModule {}
