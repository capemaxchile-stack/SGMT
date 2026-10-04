import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { NotificationsResponse } from '../types/models';

export const useNotifications = () => {
  return useQuery<NotificationsResponse>({
    queryKey: ['system-notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
};
