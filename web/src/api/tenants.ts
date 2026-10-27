import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  rut?: string;
  planTier: 'BASICO' | 'PRO' | 'ENTERPRISE' | 'PERSONALIZADO';
  status: 'ACTIVO' | 'SUSPENDIDO' | 'EN_PRUEBA' | 'CANCELADO';
  enabledModules: string[];
  maxUsers: number;
  maxAssets: number;
  maxFaenas: number;
  maxMonthlyEmails: number;
  maxMonthlyMessages: number;
  maxMonthlyAiTokens: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingNotes?: string;
  createdAt: string;
  _count?: {
    users: number;
    assets: number;
    faenas: number;
  };
}

export interface CreateTenantPayload extends Partial<Tenant> {
  adminEmail?: string;
  adminName?: string;
  adminInitialPassword?: string;
  sendWelcomeEmail?: boolean;
}

export interface BackendAdmin {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  tenantId?: string | null;
}

export interface TenantUsageSummary {
  tenantId: string;
  tenantName: string;
  planTier: string;
  billingPeriod: string;
  limits: {
    maxUsers: number;
    maxAssets: number;
    maxFaenas: number;
    maxMonthlyEmails: number;
    maxMonthlyMessages: number;
    maxMonthlyAiTokens: number;
  };
  currentCounts: {
    users: number;
    assets: number;
    faenas: number;
  };
  monthlyConsumption: {
    emailsSent: number;
    messagesSent: number;
    aiTokensUsed: number;
    storageBytes: number;
  };
  percentages: {
    emailsPercent: string;
    messagesPercent: string;
    aiTokensPercent: string;
  };
}

export function useTenants() {
  return useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data } = await api.get<Tenant[]>('/tenants');
      return data;
    },
  });
}

export function useTenantUsage(tenantId?: string, period?: string) {
  return useQuery<TenantUsageSummary>({
    queryKey: ['tenant-usage', tenantId, period],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID required');
      const params = period ? `?period=${period}` : '';
      const { data } = await api.get<TenantUsageSummary>(`/tenants/${tenantId}/usage${params}`);
      return data;
    },
    enabled: Boolean(tenantId),
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTenantPayload) => {
      const { data } = await api.post<any>('/tenants', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Tenant> }) => {
      const res = await api.patch<Tenant>(`/tenants/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useImpersonateTenant() {
  return useMutation({
    mutationFn: async (tenantId: string) => {
      const { data } = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: any;
      }>(`/tenants/${tenantId}/impersonate`);
      return data;
    },
  });
}

export function useBackendAdmins() {
  return useQuery<BackendAdmin[]>({
    queryKey: ['backend-admins'],
    queryFn: async () => {
      const { data } = await api.get<BackendAdmin[]>('/tenants/backend-admins');
      return data;
    },
  });
}

export function useCreateBackendAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { email: string; name: string; password: string }) => {
      const { data } = await api.post<BackendAdmin>('/tenants/backend-admins', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backend-admins'] });
    },
  });
}

export async function downloadTenantBackup(id: string, slug: string) {
  const { data } = await api.get(`/tenants/${id}/export`);
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `backup-${slug}-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
