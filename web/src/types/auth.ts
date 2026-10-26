/** Action permissions matrix available per domain module */
export interface ModulePermission {
  canRead: boolean;
  canWrite: boolean;
  canApprove: boolean;
  canAdmin: boolean;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  planTier: 'BASICO' | 'PRO' | 'ENTERPRISE' | 'PERSONALIZADO';
  status: 'ACTIVO' | 'SUSPENDIDO' | 'EN_PRUEBA' | 'CANCELADO';
  enabledModules: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  tenantId?: string | null;
  tenant?: TenantInfo | null;
  permissions?: Record<string, ModulePermission>;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
