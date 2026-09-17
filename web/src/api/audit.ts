import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { User, BaseEntity } from '../types/models';

export interface AuditLog extends BaseEntity {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: Record<string, any>;
  ipAddress: string;
  user?: User;
}

export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
  const { data } = await api.get<AuditLog[]>('/audit');
  return data;
};

export const fetchUsers = async (): Promise<User[]> => {
  const { data } = await api.get<User[]>('/users');
  return data;
};

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['audit'],
    queryFn: fetchAuditLogs,
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
};
