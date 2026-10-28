import { SetMetadata } from '@nestjs/common';

export const TENANT_MODULE_KEY = 'tenant_required_module';
export const RequireTenantModule = (moduleName: string) => SetMetadata(TENANT_MODULE_KEY, moduleName);
