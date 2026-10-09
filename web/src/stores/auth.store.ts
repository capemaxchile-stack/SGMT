import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest, AuthResponse } from '../types/auth';
import { api } from '../lib/axios';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  isAuthenticated: () => boolean;
  hasRole: (roleName: string) => boolean;
  can: (module: string, action?: 'read' | 'write' | 'approve' | 'admin') => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      login: async (credentials) => {
        const { data } = await api.post<AuthResponse>('/auth/login', credentials);
        set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      },
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
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
        const roles = user.roles || [];
        if (roles.includes('ADMIN_SISTEMA') || roles.includes('SUPER_USUARIO')) {
          return true;
        }
        const perm = user.permissions?.[module];
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
    }),
    {
      name: 'auth-storage',
    }
  )
);
