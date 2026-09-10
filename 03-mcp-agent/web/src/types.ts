export interface RpcLogEntry {
  id: string;
  method: string;
  params?: any;
  result?: any;
  error?: any;
  timestamp: string;
  durationMs: number;
}

export interface McpServerStatus {
  connected: boolean;
  serverName: string;
  serverVersion: string;
  toolsCount: number;
  tools: Array<{ name: string; description?: string; inputSchema?: any }>;
  recentRpcLogs: RpcLogEntry[];
}

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
  status: 'invoked' | 'waiting_approval' | 'approved' | 'rejected' | 'success' | 'error';
  arguments?: any;
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
