import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

export interface DashboardMetrics {
  activeFaenasCount: number;
  totalAssetsCount: number;
  operationalPercentage: number;
  totalStockItemsCount: number;
  lowStockItemsCount: number;
  pendingOrdersCount: number;
}

export const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const { data } = await api.get<DashboardMetrics>('/dashboard/metrics');
  return data;
};

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: fetchDashboardMetrics,
  });
};
