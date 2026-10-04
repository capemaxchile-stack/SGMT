import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { CopilotChatResponse, CopilotSuggestion } from '../types/copilot';

export interface SendChatMessagePayload {
  message: string;
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

export function useCopilotChat() {
  return useMutation({
    mutationFn: async (payload: SendChatMessagePayload): Promise<CopilotChatResponse> => {
      const { data } = await api.post<CopilotChatResponse>('/copilot/chat', payload);
      return data;
    },
  });
}

export function useCopilotSuggestions() {
  return useQuery({
    queryKey: ['copilot', 'suggestions'],
    queryFn: async (): Promise<CopilotSuggestion[]> => {
      const { data } = await api.get<CopilotSuggestion[]>('/copilot/suggestions');
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
