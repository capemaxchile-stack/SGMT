import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import {
  NotificationsResponse,
  NotificationChannelsConfig,
  TestChannelPayload,
} from '../types/models';

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

export const useNotificationChannelsConfig = () => {
  return useQuery<NotificationChannelsConfig>({
    queryKey: ['notification-channels-config'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/channels/config');
      return data;
    },
  });
};

export const useUpdateNotificationChannelsConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: NotificationChannelsConfig) => {
      const { data } = await api.put('/notifications/channels/config', config);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels-config'] });
    },
  });
};

export const useTestNotificationChannel = () => {
  return useMutation({
    mutationFn: async (payload: TestChannelPayload) => {
      const { data } = await api.post('/notifications/channels/test', payload);
      return data;
    },
  });
};

