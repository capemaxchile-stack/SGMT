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
    }),
    {
      name: 'auth-storage',
    }
  )
);
