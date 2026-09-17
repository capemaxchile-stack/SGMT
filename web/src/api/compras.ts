import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { PurchaseOrder, PurchaseRequest, CreatePurchaseOrderDto, CreatePurchaseRequestDto } from '../types/compras';

export const comprasKeys = {
  all: ['compras'] as const,
  orders: () => [...comprasKeys.all, 'orders'] as const,
  order: (id: string) => [...comprasKeys.orders(), id] as const,
  requests: () => [...comprasKeys.all, 'requests'] as const,
  request: (id: string) => [...comprasKeys.requests(), id] as const,
};

export const fetchPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  const { data } = await api.get<PurchaseOrder[]>('/purchases/orders');
  return data;
};

export const createPurchaseOrder = async (payload: CreatePurchaseOrderDto): Promise<PurchaseOrder> => {
  const { data } = await api.post<PurchaseOrder>('/purchases/orders', payload);
  return data;
};

export const updateOrderStatus = async ({ id, action, level, comments, exceptionReason, superKey }: { id: string; action: string; level: number; comments?: string; exceptionReason?: string; superKey?: string }): Promise<PurchaseOrder> => {
  const { data } = await api.patch<PurchaseOrder>('/purchases/orders/' + id + '/status', { action, level, comments, exceptionReason, superKey });
  return data;
};

export const receivePurchaseOrder = async ({ id, warehouseId, notes }: { id: string; warehouseId: string; notes?: string }): Promise<PurchaseOrder> => {
  const { data } = await api.post<PurchaseOrder>('/purchases/orders/' + id + '/receive', { warehouseId, notes });
  return data;
};

export const fetchPurchaseRequests = async (): Promise<PurchaseRequest[]> => {
  const { data } = await api.get<PurchaseRequest[]>('/purchases/requests');
  return data;
};

export const createPurchaseRequest = async (payload: CreatePurchaseRequestDto): Promise<PurchaseRequest> => {
  const { data } = await api.post<PurchaseRequest>('/purchases/requests', payload);
  return data;
};

export const updatePurchaseRequestStatus = async ({ id, status }: { id: string; status: string }): Promise<PurchaseRequest> => {
  const { data } = await api.patch<PurchaseRequest>('/purchases/requests/' + id + '/status', { status });
  return data;
};

// Hooks
export const usePurchaseOrders = () => {
  return useQuery({
    queryKey: comprasKeys.orders(),
    queryFn: fetchPurchaseOrders,
  });
};

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.orders() });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.orders() });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });
};

export const useReceivePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: receivePurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.orders() });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });
};

export const usePurchaseRequests = () => {
  return useQuery({
    queryKey: comprasKeys.requests(),
    queryFn: fetchPurchaseRequests,
  });
};

export const useCreatePurchaseRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPurchaseRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.requests() });
    },
  });
};

export const useUpdatePurchaseRequestStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePurchaseRequestStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.requests() });
    },
  });
};
