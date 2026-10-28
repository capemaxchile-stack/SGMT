import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextData {
  tenantId?: string | null;
  userId?: string | null;
  isSuperUser?: boolean;
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContextData>();

export function getTenantContext(): TenantContextData | undefined {
  return tenantContextStorage.getStore();
}

export function getCurrentTenantId(): string | undefined {
  return tenantContextStorage.getStore()?.tenantId || undefined;
}
