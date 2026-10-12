import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { User } from '../types/models';

export interface AuditLog {
  id: string;
  timestamp?: string;
  createdAt?: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  detail?: any;
  details?: any;
  ipAddress?: string | null;
  user?: User;
}

export const fetchAuditLogs = async (params?: { entity?: string; action?: string }): Promise<AuditLog[]> => {
  const { data } = await api.get<AuditLog[]>('/audit', { params });
  return data;
};

export const fetchUsers = async (): Promise<User[]> => {
  const { data } = await api.get<User[]>('/users');
  return data;
};

export const useAuditLogs = (params?: { entity?: string; action?: string }) => {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: () => fetchAuditLogs(params),
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
};
