import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { FuelLog, FuelStats } from '../types/models';

export interface CreateFuelLogPayload {
  assetId: string;
  faenaId?: string;
  warehouseId?: string;
  liters: number;
  unitPrice?: number;
  currentHourmeter?: number;
  currentKilometrage?: number;
  operatorName?: string;
  fuelTruckPlate?: string;
  dispatchTicketNumber?: string;
  notes?: string;
  dispatchDate?: string;
}

export interface FilterFuelLogsParams {
  assetId?: string;
  faenaId?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const useFuelLogs = (params?: FilterFuelLogsParams) => {
  return useQuery<FuelLog[]>({
    queryKey: ['fuel-logs', params],
    queryFn: async () => {
      const { data } = await api.get('/fuel', { params });
      return data;
    },
  });
};

export const useFuelStats = () => {
  return useQuery<FuelStats>({
    queryKey: ['fuel-stats'],
    queryFn: async () => {
      const { data } = await api.get('/fuel/stats');
      return data;
    },
  });
};

export const useCreateFuelLog = () => {
  const queryClient = useQueryClient();
  return useMutation<FuelLog, Error, CreateFuelLogPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/fuel', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-stats'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });
};
