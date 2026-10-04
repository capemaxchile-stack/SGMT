import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { ExecutiveReport, FaenaClosingReport } from '../types/models';

export interface FilterReportsParams {
  faenaId?: string;
  startDate?: string;
  endDate?: string;
  period?: string;
}

export const useExecutiveReport = (params?: FilterReportsParams) => {
  return useQuery<ExecutiveReport>({
    queryKey: ['executive-report', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/executive', { params });
      return data;
    },
  });
};

export const useFaenaClosing = (faenaId: string, params?: FilterReportsParams) => {
  return useQuery<FaenaClosingReport>({
    queryKey: ['faena-closing', faenaId, params],
    queryFn: async () => {
      const { data } = await api.get(`/reports/faena-closing/${faenaId}`, { params });
      return data;
    },
    enabled: Boolean(faenaId),
  });
};
