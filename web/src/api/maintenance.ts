import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import {
  MaintenancePlan,
  WorkOrder,
  WorkOrderItem,
  MaintenanceAlert,
  WorkOrderStatus,
  WorkOrderType,
  WorkOrderPriority,
  AssetType,
} from '../types/models';

export interface CreatePlanPayload {
  assetType: AssetType;
  name: string;
  intervalHours?: number;
  intervalKm?: number;
  description?: string;
  checklist?: string[];
}

export interface UpdatePlanPayload {
  assetType?: AssetType;
  name?: string;
  intervalHours?: number;
  intervalKm?: number;
  description?: string;
  checklist?: string[];
  isActive?: boolean;
}

export interface CreateWorkOrderPayload {
  assetId: string;
  faenaId?: string;
  maintenancePlanId?: string;
  type: WorkOrderType;
  priority?: WorkOrderPriority;
  description: string;
  failureReport?: string;
  currentHourmeter?: number;
  currentKilometrage?: number;
  technicianName?: string;
  notes?: string;
}

export interface UpdateWorkOrderPayload {
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  technicianName?: string;
  notes?: string;
  description?: string;
  failureReport?: string;
}

export interface ConsumeItemPayload {
  itemId: string;
  quantity: number;
  warehouseId: string;
}

export interface CompleteWorkOrderPayload {
  notes?: string;
  technicianName?: string;
  finalHourmeter?: number;
  finalKilometrage?: number;
}

// ----------------- Plans -----------------
export const useMaintenancePlans = (assetType?: AssetType) => {
  return useQuery<MaintenancePlan[]>({
    queryKey: ['maintenance-plans', assetType],
    queryFn: async () => {
      const { data } = await api.get('/maintenance/plans', {
        params: { assetType },
      });
      return data;
    },
  });
};

export const useCreateMaintenancePlan = () => {
  const queryClient = useQueryClient();
  return useMutation<MaintenancePlan, Error, CreatePlanPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/maintenance/plans', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
    },
  });
};

export const useUpdateMaintenancePlan = () => {
  const queryClient = useQueryClient();
  return useMutation<MaintenancePlan, Error, { id: string; data: UpdatePlanPayload }>({
    mutationFn: async ({ id, data }) => {
      const res = await api.patch(`/maintenance/plans/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
    },
  });
};

export const useDeleteMaintenancePlan = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/maintenance/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
    },
  });
};

// ----------------- Work Orders -----------------
export const useWorkOrders = (filters?: {
  status?: WorkOrderStatus;
  type?: WorkOrderType;
  priority?: WorkOrderPriority;
  assetId?: string;
  faenaId?: string;
  search?: string;
}) => {
  return useQuery<WorkOrder[]>({
    queryKey: ['work-orders', filters],
    queryFn: async () => {
      const { data } = await api.get('/maintenance/work-orders', {
        params: filters,
      });
      return data;
    },
  });
};

export const useWorkOrder = (id: string) => {
  return useQuery<WorkOrder>({
    queryKey: ['work-order', id],
    queryFn: async () => {
      const { data } = await api.get(`/maintenance/work-orders/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
};

export const useCreateWorkOrder = () => {
  const queryClient = useQueryClient();
  return useMutation<WorkOrder, Error, CreateWorkOrderPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/maintenance/work-orders', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });
};

export const useUpdateWorkOrder = () => {
  const queryClient = useQueryClient();
  return useMutation<WorkOrder, Error, { id: string; data: UpdateWorkOrderPayload }>({
    mutationFn: async ({ id, data }) => {
      const res = await api.patch(`/maintenance/work-orders/${id}`, data);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
};

export const useConsumeWorkOrderItem = () => {
  const queryClient = useQueryClient();
  return useMutation<WorkOrderItem, Error, { workOrderId: string; data: ConsumeItemPayload }>({
    mutationFn: async ({ workOrderId, data }) => {
      const res = await api.post(`/maintenance/work-orders/${workOrderId}/items`, data);
      return res.data;
    },
    onSuccess: (_, { workOrderId }) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });
};

export const useCompleteWorkOrder = () => {
  const queryClient = useQueryClient();
  return useMutation<WorkOrder, Error, { id: string; data: CompleteWorkOrderPayload }>({
    mutationFn: async ({ id, data }) => {
      const res = await api.post(`/maintenance/work-orders/${id}/complete`, data);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });
};

// ----------------- Alerts & Radar -----------------
export const useMaintenanceAlerts = () => {
  return useQuery<MaintenanceAlert[]>({
    queryKey: ['maintenance-alerts'],
    queryFn: async () => {
      const { data } = await api.get('/maintenance/alerts');
      return data;
    },
  });
};
