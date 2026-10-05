import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import {
  AssetDocument,
  OperatorCertification,
  DocumentRadarResponse,
} from '../types/models';

export const certificationsApi = {
  getRadar: async (daysAhead?: number): Promise<DocumentRadarResponse> => {
    const params = daysAhead ? { daysAhead } : {};
    const res = await api.get<DocumentRadarResponse>('/certifications/radar', { params });
    return res.data;
  },

  getAssetDocs: async (params?: any): Promise<AssetDocument[]> => {
    const res = await api.get<AssetDocument[]>('/certifications/assets', { params });
    return res.data;
  },

  createAssetDoc: async (data: any): Promise<AssetDocument> => {
    const res = await api.post<AssetDocument>('/certifications/assets', data);
    return res.data;
  },

  updateAssetDoc: async ({ id, data }: { id: string; data: any }): Promise<AssetDocument> => {
    const res = await api.patch<AssetDocument>(`/certifications/assets/${id}`, data);
    return res.data;
  },

  deleteAssetDoc: async (id: string): Promise<void> => {
    await api.delete(`/certifications/assets/${id}`);
  },

  getOperatorCerts: async (params?: any): Promise<OperatorCertification[]> => {
    const res = await api.get<OperatorCertification[]>('/certifications/operators', { params });
    return res.data;
  },

  createOperatorCert: async (data: any): Promise<OperatorCertification> => {
    const res = await api.post<OperatorCertification>('/certifications/operators', data);
    return res.data;
  },

  updateOperatorCert: async ({ id, data }: { id: string; data: any }): Promise<OperatorCertification> => {
    const res = await api.patch<OperatorCertification>(`/certifications/operators/${id}`, data);
    return res.data;
  },

  deleteOperatorCert: async (id: string): Promise<void> => {
    await api.delete(`/certifications/operators/${id}`);
  },
};

export function useDocumentRadar(daysAhead?: number) {
  return useQuery({
    queryKey: ['documentRadar', daysAhead],
    queryFn: () => certificationsApi.getRadar(daysAhead),
    refetchInterval: 30000,
  });
}

export function useAssetDocuments(params?: any) {
  return useQuery({
    queryKey: ['assetDocuments', params],
    queryFn: () => certificationsApi.getAssetDocs(params),
  });
}

export function useCreateAssetDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: certificationsApi.createAssetDoc,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['documentRadar'] });
    },
  });
}

export function useUpdateAssetDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: certificationsApi.updateAssetDoc,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['documentRadar'] });
    },
  });
}

export function useDeleteAssetDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: certificationsApi.deleteAssetDoc,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['documentRadar'] });
    },
  });
}

export function useOperatorCertifications(params?: any) {
  return useQuery({
    queryKey: ['operatorCertifications', params],
    queryFn: () => certificationsApi.getOperatorCerts(params),
  });
}

export function useCreateOperatorCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: certificationsApi.createOperatorCert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operatorCertifications'] });
      queryClient.invalidateQueries({ queryKey: ['documentRadar'] });
    },
  });
}

export function useUpdateOperatorCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: certificationsApi.updateOperatorCert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operatorCertifications'] });
      queryClient.invalidateQueries({ queryKey: ['documentRadar'] });
    },
  });
}

export function useDeleteOperatorCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: certificationsApi.deleteOperatorCert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operatorCertifications'] });
      queryClient.invalidateQueries({ queryKey: ['documentRadar'] });
    },
  });
}
