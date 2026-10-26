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
    mutationFn: async (payload: Partial<Tenant>) => {
      const { data } = await api.post<Tenant>('/tenants', payload);
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
