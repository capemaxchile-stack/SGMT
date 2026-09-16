import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Asset, AssetType, AssetOperationalStatus } from '../types/models';

export const flotaKeys = {
  all: ['assets'] as const,
  lists: () => [...flotaKeys.all, 'list'] as const,
  list: (filters?: { type?: string; operationalStatus?: string; search?: string }) =>
    [...flotaKeys.lists(), filters] as const,
  details: () => [...flotaKeys.all, 'detail'] as const,
  detail: (id: string) => [...flotaKeys.details(), id] as const,
};

export const fetchAssets = async (params?: {
  type?: string;
  operationalStatus?: string;
  search?: string;
}): Promise<Asset[]> => {
  const { data } = await api.get<Asset[]>('/assets', { params });
  return data;
};

export const fetchAsset = async (id: string): Promise<Asset> => {
  const { data } = await api.get<Asset>(`/assets/${id}`);
  return data;
};

export const createAsset = async (payload: {
  type: AssetType;
  brand: string;
  model: string;
  year: number;
  licensePlate?: string;
  internalNumber: string;
  operationalStatus: AssetOperationalStatus;
  currentHourmeter?: number;
  currentKilometrage?: number;
}): Promise<Asset> => {
  const { data } = await api.post<Asset>('/assets', payload);
  return data;
};

export const updateAsset = async ({ id, payload }: { id: string; payload: Partial<Asset> }): Promise<Asset> => {
  const { data } = await api.patch<Asset>(`/assets/${id}`, payload);
  return data;
};

export const updateMeter = async ({
  id,
  currentHourmeter,
  currentKilometrage,
}: {
  id: string;
  currentHourmeter?: number;
  currentKilometrage?: number;
}): Promise<Asset> => {
  const { data } = await api.patch<Asset>(`/assets/${id}/meter`, { currentHourmeter, currentKilometrage });
  return data;
};

export const assignAsset = async ({
  id,
  faenaId,
  startDate,
}: {
  id: string;
  faenaId: string;
  startDate?: string;
}): Promise<void> => {
  await api.post(`/assets/${id}/assign`, { faenaId, startDate });
};

export const deleteAsset = async (id: string): Promise<void> => {
  await api.delete(`/assets/${id}`);
};

export const useFlota = (params?: { type?: string; operationalStatus?: string; search?: string }) => {
  return useQuery({
    queryKey: flotaKeys.list(params),
    queryFn: () => fetchAssets(params),
  });
};

export const useAsset = (id: string) => {
  return useQuery({
    queryKey: flotaKeys.detail(id),
    queryFn: () => fetchAsset(id),
    enabled: Boolean(id),
  });
};

export const useCreateAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flotaKeys.all });
    },
  });
};

export const useUpdateMeter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMeter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flotaKeys.all });
    },
  });
};

export const useAssignAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flotaKeys.all });
    },
  });
};
export const useUpdateAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flotaKeys.all });
    },
  });
};

export const useDeleteAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flotaKeys.all });
    },
  });
};
