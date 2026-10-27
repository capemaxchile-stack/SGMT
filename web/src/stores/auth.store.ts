import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest, AuthResponse } from '../types/auth';
import { api } from '../lib/axios';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  originalSession: { user: User; accessToken: string; refreshToken: string } | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  isAuthenticated: () => boolean;
  hasRole: (roleName: string) => boolean;
  can: (module: string, action?: 'read' | 'write' | 'approve' | 'admin') => boolean;
  isModuleEnabled: (module: string) => boolean;
  getPlanTier: () => string;
  getTenantName: () => string;
  isImpersonating: () => boolean;
  impersonateTenant: (tokenData: { accessToken: string; refreshToken: string; user: any }) => void;
  stopImpersonating: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      originalSession: null,
      login: async (credentials) => {
        const { data } = await api.post<AuthResponse>('/auth/login', credentials);
        set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, originalSession: null });
      },
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, originalSession: null });
        window.location.href = '/login';
      },
      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token available');
        const { data } = await api.post<AuthResponse>('/auth/refresh', { refreshToken });
        set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      },
      isAuthenticated: () => !!get().accessToken,
      hasRole: (roleName) => get().user?.roles?.includes(roleName) ?? false,
      can: (module, action = 'read') => {
        const user = get().user;
        if (!user) return false;
        const perm = user.permissions?.[module];
        if (module === 'COPILOT' && perm !== undefined) {
          switch (action) {
            case 'read':
              return perm.canRead;
            case 'write':
              return perm.canWrite;
            case 'approve':
              return perm.canApprove;
            case 'admin':
              return perm.canAdmin;
            default:
              return false;
          }
        }
        const roles = user.roles || [];
        if (roles.includes('ADMIN_SISTEMA') || roles.includes('SUPER_USUARIO')) {
          return true;
        }
        if (!perm) return false;
        switch (action) {
          case 'read':
            return perm.canRead;
          case 'write':
            return perm.canWrite;
          case 'approve':
            return perm.canApprove;
          case 'admin':
            return perm.canAdmin;
          default:
            return false;
        }
      },
      isModuleEnabled: (module: string) => {
        const user = get().user;
        if (!user) return false;
        const roles = user.roles || [];
        if (roles.includes('SUPER_USUARIO') && !get().isImpersonating()) return true;
        if (!user.tenant || !user.tenant.enabledModules) return true;
        return user.tenant.enabledModules.includes(module);
      },
      getPlanTier: () => {
        return get().user?.tenant?.planTier || 'ENTERPRISE';
      },
      getTenantName: () => {
        return get().user?.tenant?.name || 'KATEI Operaciones';
      },
      isImpersonating: () => {
        return Boolean(get().originalSession || (get().user as any)?.isImpersonating);
      },
      impersonateTenant: (tokenData) => {
        const current = get();
        if (!current.originalSession && current.user && current.accessToken && current.refreshToken) {
          set({
            originalSession: {
              user: current.user,
              accessToken: current.accessToken,
              refreshToken: current.refreshToken,
            },
          });
        }
        set({
          user: tokenData.user,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
        });
      },
      stopImpersonating: () => {
        const orig = get().originalSession;
        if (orig) {
          set({
            user: orig.user,
            accessToken: orig.accessToken,
            refreshToken: orig.refreshToken,
            originalSession: null,
          });
        }
        window.location.href = '/super-admin';
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
