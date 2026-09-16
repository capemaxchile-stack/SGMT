import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Faena } from '../types/models';

export const faenasKeys = {
  all: ['faenas'] as const,
  lists: () => [...faenasKeys.all, 'list'] as const,
  list: (filters: string) => [...faenasKeys.lists(), { filters }] as const,
  details: () => [...faenasKeys.all, 'detail'] as const,
  detail: (id: string) => [...faenasKeys.details(), id] as const,
};

export const fetchFaenas = async (): Promise<Faena[]> => {
  const { data } = await api.get<Faena[]>('/faenas');
  return data;
};

export const createFaena = async (faena: Partial<Faena>): Promise<Faena> => {
  const { data } = await api.post<Faena>('/faenas', faena);
  return data;
};

export const useFaenas = () => {
  return useQuery({
    queryKey: faenasKeys.lists(),
    queryFn: fetchFaenas,
    // Provide some mock data if the API fails for demonstration
    initialData: [
      {
        id: '1', name: 'Mina Los Pelambres', location: 'Coquimbo', status: 'ACTIVA',
        contractsCount: 3, assetsCount: 15, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: '2', name: 'Proyecto Quebrada Blanca', location: 'Tarapacá', status: 'EN_FORMACION',
        contractsCount: 1, assetsCount: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      }
    ]
  });
};

export const useCreateFaena = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFaena,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faenasKeys.lists() });
    },
  });
};
