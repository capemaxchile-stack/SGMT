import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import {
  PurchaseOrder,
  PurchaseRequest,
  Quotation,
  ProcurementInsights,
  OrderTimeline,
  PendingReceptionOrder,
  CreatePurchaseOrderDto,
  CreatePurchaseRequestDto,
  CreateQuotationDto,
  UpdateQuotationDto,
  ReceptionDestination,
  BudgetSummary,
  UpsertBudgetPayload,
  SuggestionsResponse,
  GenerateRequestFromSuggestionPayload,
  FraudRadarResponse,
} from '../types/compras';

export const comprasKeys = {
  all: ['compras'] as const,
  orders: () => [...comprasKeys.all, 'orders'] as const,
  order: (id: string) => [...comprasKeys.orders(), id] as const,
  orderTimeline: (id: string) => [...comprasKeys.orders(), 'timeline', id] as const,
  pendingReception: () => [...comprasKeys.orders(), 'pending-reception'] as const,
  requests: () => [...comprasKeys.all, 'requests'] as const,
  request: (id: string) => [...comprasKeys.requests(), id] as const,
  requestTimeline: (id: string) => [...comprasKeys.requests(), 'timeline', id] as const,
  quotations: () => [...comprasKeys.all, 'quotations'] as const,
  quotation: (id: string) => [...comprasKeys.quotations(), id] as const,
  itemInsights: (itemId: string) => [...comprasKeys.all, 'insights', itemId] as const,
  budgetSummary: (faenaId: string, year?: number, month?: number) => [...comprasKeys.all, 'budget', faenaId, year, month] as const,
  suggestions: (faenaId?: string) => [...comprasKeys.all, 'suggestions', faenaId] as const,
  fraudRadar: (faenaId?: string) => [...comprasKeys.all, 'fraudRadar', faenaId] as const,
};

// Purchase Orders
export const fetchPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  const { data } = await api.get<PurchaseOrder[]>('/purchases/orders');
  return data;
};

export const fetchOrderTimeline = async (id: string): Promise<OrderTimeline> => {
  const { data } = await api.get<OrderTimeline>(`/purchases/orders/${id}/timeline`);
  return data;
};

export const fetchPendingReceptionOrders = async (): Promise<PendingReceptionOrder[]> => {
  const { data } = await api.get<PendingReceptionOrder[]>('/purchases/orders/pending-reception');
  return data;
};

export const createPurchaseOrder = async (payload: CreatePurchaseOrderDto): Promise<PurchaseOrder> => {
  const { data } = await api.post<PurchaseOrder>('/purchases/orders', payload);
  return data;
};

export const updateOrderStatus = async ({
  id,
  action,
  level,
  comments,
  exceptionReason,
  superKey,
}: {
  id: string;
  action: string;
  level: number;
  comments?: string;
  exceptionReason?: string;
  superKey?: string;
}): Promise<PurchaseOrder> => {
  const { data } = await api.patch<PurchaseOrder>(`/purchases/orders/${id}/status`, {
    action,
    level,
    comments,
    exceptionReason,
    superKey,
  });
  return data;
};

export const receivePurchaseOrder = async ({
  id,
  warehouseId,
  destination,
  targetAssetId,
  workOrderId,
  gateTicketNumber,
  notes,
}: {
  id: string;
  warehouseId?: string;
  destination?: ReceptionDestination;
  targetAssetId?: string;
  workOrderId?: string;
  gateTicketNumber?: string;
  notes?: string;
}): Promise<PurchaseOrder> => {
  const { data } = await api.post<PurchaseOrder>(`/purchases/orders/${id}/receive`, {
    warehouseId,
    destination,
    targetAssetId,
    workOrderId,
    gateTicketNumber,
    notes,
  });
  return data;
};

// Purchase Requests
export const fetchPurchaseRequests = async (): Promise<PurchaseRequest[]> => {
  const { data } = await api.get<PurchaseRequest[]>('/purchases/requests');
  return data;
};

export const fetchRequestTimeline = async (id: string): Promise<OrderTimeline> => {
  const { data } = await api.get<OrderTimeline>(`/purchases/requests/${id}/timeline`);
  return data;
};

export const createPurchaseRequest = async (payload: CreatePurchaseRequestDto): Promise<PurchaseRequest> => {
  const { data } = await api.post<PurchaseRequest>('/purchases/requests', payload);
  return data;
};

export const updatePurchaseRequestStatus = async ({
  id,
  status,
  rejectionReason,
}: {
  id: string;
  status: string;
  rejectionReason?: string;
}): Promise<PurchaseRequest> => {
  const { data } = await api.patch<PurchaseRequest>(`/purchases/requests/${id}/status`, { status, rejectionReason });
  return data;
};

// Quotations & Catalog
export const fetchQuotations = async (purchaseRequestId?: string): Promise<Quotation[]> => {
  const { data } = await api.get<Quotation[]>('/purchases/quotations', {
    params: purchaseRequestId ? { purchaseRequestId } : undefined,
  });
  return data;
};

export const createQuotation = async (payload: CreateQuotationDto): Promise<Quotation> => {
  const { data } = await api.post<Quotation>('/purchases/quotations', payload);
  return data;
};

export const updateQuotation = async ({ id, payload }: { id: string; payload: UpdateQuotationDto }): Promise<Quotation> => {
  const { data } = await api.put<Quotation>(`/purchases/quotations/${id}`, payload);
  return data;
};

export const selectQuotation = async (id: string): Promise<Quotation> => {
  const { data } = await api.patch<Quotation>(`/purchases/quotations/${id}/select`);
  return data;
};

export const fetchItemProcurementInsights = async (itemId: string): Promise<ProcurementInsights> => {
  const { data } = await api.get<ProcurementInsights>(`/purchases/quotations/insights/${itemId}`);
  return data;
};

// Hooks
export const usePurchaseOrders = () => {
  return useQuery({
    queryKey: comprasKeys.orders(),
    queryFn: fetchPurchaseOrders,
  });
};

export const useOrderTimeline = (orderId: string | null) => {
  return useQuery({
    queryKey: comprasKeys.orderTimeline(orderId || ''),
    queryFn: () => fetchOrderTimeline(orderId!),
    enabled: !!orderId,
  });
};

export const usePendingReceptionOrders = () => {
  return useQuery({
    queryKey: comprasKeys.pendingReception(),
    queryFn: fetchPendingReceptionOrders,
  });
};

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.orders() });
      queryClient.invalidateQueries({ queryKey: comprasKeys.requests() });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.orders() });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
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
      queryClient.invalidateQueries({ queryKey: comprasKeys.pendingReception() });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
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

export const useRequestTimeline = (requestId: string | null) => {
  return useQuery({
    queryKey: comprasKeys.requestTimeline(requestId || ''),
    queryFn: () => fetchRequestTimeline(requestId!),
    enabled: !!requestId,
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

export const useQuotations = (purchaseRequestId?: string) => {
  return useQuery({
    queryKey: purchaseRequestId ? [...comprasKeys.quotations(), purchaseRequestId] : comprasKeys.quotations(),
    queryFn: () => fetchQuotations(purchaseRequestId),
  });
};

export const useCreateQuotation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.quotations() });
      queryClient.invalidateQueries({ queryKey: comprasKeys.requests() });
    },
  });
};

export const useUpdateQuotation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.quotations() });
    },
  });
};

export const useSelectQuotation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: selectQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.quotations() });
      queryClient.invalidateQueries({ queryKey: comprasKeys.requests() });
    },
  });
};

export const useItemProcurementInsights = (itemId: string | null) => {
  return useQuery({
    queryKey: comprasKeys.itemInsights(itemId || ''),
    queryFn: () => fetchItemProcurementInsights(itemId!),
    enabled: !!itemId,
  });
};

// Budget Management
export const fetchBudgetSummary = async (
  faenaId: string,
  year?: number,
  month?: number,
): Promise<BudgetSummary> => {
  const { data } = await api.get<BudgetSummary>(`/purchases/budgets/summary/${faenaId}`, {
    params: { year, month },
  });
  return data;
};

export const upsertBudget = async (payload: UpsertBudgetPayload): Promise<any> => {
  const { data } = await api.post('/purchases/budgets', payload);
  return data;
};

export const useBudgetSummary = (faenaId: string | null, year?: number, month?: number) => {
  return useQuery({
    queryKey: comprasKeys.budgetSummary(faenaId || '', year, month),
    queryFn: () => fetchBudgetSummary(faenaId!, year, month),
    enabled: !!faenaId,
  });
};

export const useUpsertBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...comprasKeys.all, 'budget'] });
    },
  });
};

// Replenishment & AI Suggestions
export const fetchPurchaseSuggestions = async (faenaId?: string): Promise<SuggestionsResponse> => {
  const { data } = await api.get<SuggestionsResponse>('/purchases/suggestions', {
    params: faenaId ? { faenaId } : undefined,
  });
  return data;
};

export const generateRequestFromSuggestion = async (
  payload: GenerateRequestFromSuggestionPayload,
): Promise<PurchaseRequest> => {
  const { data } = await api.post<PurchaseRequest>('/purchases/suggestions/generate-request', payload);
  return data;
};

export const usePurchaseSuggestions = (faenaId?: string) => {
  return useQuery({
    queryKey: comprasKeys.suggestions(faenaId),
    queryFn: () => fetchPurchaseSuggestions(faenaId),
  });
};

export const useGenerateRequestFromSuggestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateRequestFromSuggestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comprasKeys.requests() });
      queryClient.invalidateQueries({ queryKey: [...comprasKeys.all, 'suggestions'] });
    },
  });
};

// Anti-Fraud & Audit Radar
export const fetchFraudRadar = async (faenaId?: string): Promise<FraudRadarResponse> => {
  const { data } = await api.get<FraudRadarResponse>('/purchases/audit/fraud-radar', {
    params: faenaId ? { faenaId } : undefined,
  });
  return data;
};

export const useFraudRadar = (faenaId?: string) => {
  return useQuery({
    queryKey: comprasKeys.fraudRadar(faenaId),
    queryFn: () => fetchFraudRadar(faenaId),
  });
};

