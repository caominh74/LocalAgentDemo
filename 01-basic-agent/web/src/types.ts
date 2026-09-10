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
  status: 'invoked' | 'success' | 'error';
  rawArguments?: string;
  arguments?: any;
  result?: string;
  error?: string;
  stack?: string;
  timestamp: string;
}

export interface AgentConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}
