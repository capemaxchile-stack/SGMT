export interface CopilotActionCard {
  type: 'CRITICAL_STOCK' | 'MAINTENANCE_RADAR' | 'PENDING_APPROVALS' | 'FLEET_STATUS' | 'FAENA_COSTS' | 'GENERAL';
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: 'danger' | 'warning' | 'info' | 'success';
  data?: any;
  actionButton?: {
    label: string;
    route: string;
    variant?: 'primary' | 'secondary' | 'danger';
  };
}

export interface CopilotChatResponse {
  answer: string;
  cards?: CopilotActionCard[];
  suggestedQuestions?: string[];
  toolsExecuted?: string[];
  timestamp: string;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  cards?: CopilotActionCard[];
  suggestedQuestions?: string[];
  toolsExecuted?: string[];
  timestamp: string;
}

export interface CopilotSuggestion {
  text: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
}
