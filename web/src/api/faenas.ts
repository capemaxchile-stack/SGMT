import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Faena, Contract, CostCenter, User } from '../types/models';

export const faenasKeys = {
  all: ['faenas'] as const,
  lists: () => [...faenasKeys.all, 'list'] as const,
  list: (filters?: { status?: string; search?: string }) => [...faenasKeys.lists(), filters] as const,
  details: () => [...faenasKeys.all, 'detail'] as const,
  detail: (id: string) => [...faenasKeys.details(), id] as const,
  users: ['users'] as const,
};

export const fetchFaenas = async (params?: { status?: string; search?: string }): Promise<Faena[]> => {
  const { data } = await api.get<Faena[]>('/faenas', { params });
  return data;
};

export const fetchFaena = async (id: string): Promise<Faena> => {
  const { data } = await api.get<Faena>(`/faenas/${id}`);
  return data;
};

export const createFaena = async (payload: {
  name: string;
  location: string;
  status: string;
  startDate?: string;
  endDate?: string;
  chiefId?: string;
}): Promise<Faena> => {
  const { data } = await api.post<Faena>('/faenas', payload);
  return data;
};

export const updateFaena = async ({ id, payload }: { id: string; payload: Partial<Faena> }): Promise<Faena> => {
  const { data } = await api.patch<Faena>(`/faenas/${id}`, payload);
  return data;
};

export const deleteFaena = async (id: string): Promise<void> => {
  await api.delete(`/faenas/${id}`);
};

export const createContract = async ({
  faenaId,
  payload,
}: {
  faenaId: string;
  payload: { number: string; clientName: string; amount: number; startDate: string; endDate?: string };
}): Promise<Contract> => {
  const { data } = await api.post<Contract>(`/faenas/${faenaId}/contracts`, payload);
  return data;
};

export const createCostCenter = async ({
  contractId,
  payload,
}: {
  contractId: string;
  payload: { code: string; name: string };
}): Promise<CostCenter> => {
  const { data } = await api.post<CostCenter>(`/faenas/contracts/${contractId}/cost-centers`, payload);
  return data;
};

export const fetchUsers = async (): Promise<User[]> => {
  const { data } = await api.get<User[]>('/users');
  return data;
};

export const useFaenas = (params?: { status?: string; search?: string }) => {
  return useQuery({
    queryKey: faenasKeys.list(params),
    queryFn: () => fetchFaenas(params),
  });
};

export const useFaena = (id: string) => {
  return useQuery({
    queryKey: faenasKeys.detail(id),
    queryFn: () => fetchFaena(id),
    enabled: Boolean(id),
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: faenasKeys.users,
    queryFn: fetchUsers,
  });
};

export const useCreateFaena = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFaena,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faenasKeys.all });
    },
  });
};

export const useUpdateFaena = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFaena,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faenasKeys.all });
    },
  });
};

export const useDeleteFaena = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFaena,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faenasKeys.all });
    },
  });
};

export const useCreateContract = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faenasKeys.all });
    },
  });
};
