export interface ModulePermission {
  canRead: boolean;
  canWrite: boolean;
  canApprove: boolean;
  canAdmin: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
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
