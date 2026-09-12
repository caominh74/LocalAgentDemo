export type ValidationBadgeType = 'Passed' | 'Hallucinated' | 'Correcting' | 'Circuit Breaker' | 'Denied';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
}

export interface ToolTraceItem {
  id: string;
  toolCallId: string;
  toolName: string;
  status: 'thinking' | 'model_replied' | 'invoked' | 'validating' | 'passed' | 'hallucinated' | 'correcting' | 'circuit_breaker' | 'waiting_approval' | 'approved' | 'rejected' | 'success' | 'error';
  iteration?: number;
  maxIterations?: number;
  validationBadge?: ValidationBadgeType;
  arguments?: any;
  rawArguments?: string;
  errors?: string[];
  feedback?: string;
  result?: string;
  error?: string;
  timestamp: string;
}

export interface PendingApprovalAction {
  actionId: string;
  toolCallId: string;
  toolName: string;
  arguments: any;
  tier: 'TIER_1_SAFE' | 'TIER_2_MUTATE' | 'TIER_3_HIGH_RISK';
  label: string;
  description: string;
}

export interface AgentConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}
