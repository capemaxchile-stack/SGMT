import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Movement, CreateMovementDto, KardexEntry } from '../types/movements';

export const movementsKeys = {
  all: ['movements'] as const,
  lists: () => [...movementsKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...movementsKeys.lists(), filters] as const,
  kardex: (itemId: string) => [...movementsKeys.all, 'kardex', itemId] as const,
};

export const fetchMovements = async (params?: Record<string, any>): Promise<Movement[]> => {
  const { data } = await api.get<Movement[]>('/movements', { params });
  return data;
};

export const createMovement = async (payload: CreateMovementDto): Promise<Movement> => {
  const { data } = await api.post<Movement>('/movements', payload);
  return data;
};

export const fetchItemKardex = async (itemId: string): Promise<KardexEntry[]> => {
  const { data } = await api.get<KardexEntry[]>('/inventory/kardex/' + itemId);
  return data;
};

export const useMovements = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: movementsKeys.list(filters),
    queryFn: () => fetchMovements(filters),
  });
};

export const useCreateMovement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: movementsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
};

export const useItemKardex = (itemId: string) => {
  return useQuery({
    queryKey: movementsKeys.kardex(itemId),
    queryFn: () => fetchItemKardex(itemId),
    enabled: Boolean(itemId),
  });
};
