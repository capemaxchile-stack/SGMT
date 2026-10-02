import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

export interface DashboardMetrics {
  activeFaenasCount: number;
  totalAssetsCount: number;
  operationalAssetsCount: number;
  operationalPercentage: number;
  totalStockItemsCount: number;
  lowStockItemsCount: number;
  pendingOrdersCount: number;
  openWorkOrdersCount: number;
  criticalWorkOrdersCount: number;
  totalFuelLiters: number;
  totalFuelSpend: number;
  recentMovements: any[];
  recentOrders: any[];
  recentWorkOrders: any[];
  recentFuelLogs: any[];
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
