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
  status: 'thinking' | 'model_replied' | 'invoked' | 'success' | 'error';
  rawArguments?: string;
  arguments?: any;
  result?: string;
  error?: string;
  stack?: string;
  iteration?: number;
  maxIterations?: number;
  timestamp: string;
}

export interface AgentConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}
