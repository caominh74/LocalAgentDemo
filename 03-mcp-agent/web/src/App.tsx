import React, { useState, useEffect } from 'react';
import { PanelRightClose, PanelRightOpen, MessageSquare } from 'lucide-react';
import { ConfigHeader } from './components/ConfigHeader';
import { ChatThread } from './components/ChatThread';
import { ToolExecutionTrace } from './components/ToolExecutionTrace';
import { ApprovalModal } from './components/ApprovalModal';
import { ChatMessage, ToolTraceItem, AgentConfig, PendingApprovalAction, McpServerStatus } from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003').replace(/\/+$/, '');

export function App() {
  const [showTrace, setShowTrace] = useState(() => window.matchMedia('(min-width: 1080px)').matches);
  const [config, setConfig] = useState<AgentConfig>({
    baseUrl: import.meta.env.VITE_LLM_BASE_URL || '',
    model: import.meta.env.VITE_LLM_MODEL || '',
    apiKey: import.meta.env.VITE_LLM_API_KEY || '',
  });

  const [mcpStatus, setMcpStatus] = useState<McpServerStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [traces, setTraces] = useState<ToolTraceItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApprovalAction | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig((prev) => ({
          baseUrl: data.defaultBaseUrl || prev.baseUrl || '',
          model: data.defaultModel || prev.model || '',
          apiKey: data.defaultApiKey || prev.apiKey || '',
        }));
      }
    } catch (e) {
      // Backend not yet reached
    }
  };

  const fetchMcpStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/mcp/status`);
      if (res.ok) {
        const data = await res.json();
        setMcpStatus(data);
      }
    } catch (e) {
      // Backend not yet reached
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchMcpStatus();
    const interval = setInterval(fetchMcpStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const processSSEStream = async (response: Response) => {
    if (!response.ok || !response.body) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.replace(/^data: /, '').trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);

          if (event.type === 'LLM_ROUND_START') {
            setTraces((prev) => [
              ...prev.map((t) =>
                t.status === 'thinking' ? { ...t, status: 'model_replied' as const } : t
              ),
              {
                id: crypto.randomUUID(),
                toolCallId: event.data.roundId,
                toolName: 'llm',
                status: 'thinking',
                iteration: event.data.iteration,
                maxIterations: event.data.maxIterations,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else if (event.type === 'LLM_ROUND_DONE') {
            setTraces((prev) =>
              prev.map((t) =>
                t.toolCallId === event.data.roundId
                  ? {
                      ...t,
                      status: 'model_replied',
                      result: event.data.hasToolCalls
                        ? `${event.data.toolCount} tool call${event.data.toolCount === 1 ? '' : 's'}`
                        : 'final answer',
                    }
                  : t
              )
            );
          } else if (event.type === 'TOOL_DISPATCH_MCP') {
            setTraces((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                toolCallId: event.data.toolCallId,
                toolName: event.data.toolName,
                status: 'invoked',
                arguments: event.data.arguments,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else if (event.type === 'APPROVAL_REQUIRED') {
            setPendingApproval(event.data);
            setTraces((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                toolCallId: event.data.toolCallId,
                toolName: event.data.toolName,
                status: 'waiting_approval',
                arguments: event.data.arguments,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else if (event.type === 'ACTION_REJECTED') {
            setTraces((prev) =>
              prev.map((t) =>
                t.toolCallId === event.data.toolCallId
                  ? { ...t, status: 'rejected', error: event.data.reason }
                  : t
              )
            );
          } else if (event.type === 'TOOL_RESULT') {
            setTraces((prev) =>
              prev.map((t) =>
                t.toolCallId === event.data.toolCallId
                  ? { ...t, status: 'success', result: event.data.result }
                  : t
              )
            );
            fetchMcpStatus();
          } else if (event.type === 'TOOL_ERROR') {
            setTraces((prev) =>
              prev.map((t) =>
                t.toolCallId === event.data.toolCallId
                  ? { ...t, status: 'error', error: event.data.error }
                  : t
              )
            );
            fetchMcpStatus();
          } else if (event.type === 'FINAL_ANSWER') {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: event.data.content,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else if (event.type === 'ERROR') {
            setTraces((prev) =>
              prev.map((t) =>
                t.status === 'thinking' ? { ...t, status: 'error', error: event.data.message } : t
              )
            );
          }
        } catch (parseErr) {
          console.error('Failed to parse SSE event:', parseErr, jsonStr);
        }
      }
    }
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsStreaming(true);

    const apiMessages = newHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          baseUrl: config.baseUrl,
          model: config.model,
          apiKey: config.apiKey,
        }),
      });
      await processSSEStream(response);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ Network / Connection Error: ${err.message}. Is backend running at ${API_BASE_URL}?`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      if (!pendingApproval) {
        setIsStreaming(false);
      }
    }
  };

  const handleApprove = async (actionId: string) => {
    setPendingApproval(null);
    setIsStreaming(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/action/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });
      await processSSEStream(response);
    } catch (err: any) {
      console.error('Failed to approve MCP action:', err);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleReject = async (actionId: string, reason?: string) => {
    setPendingApproval(null);
    setIsStreaming(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/action/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, reason }),
      });
      await processSSEStream(response);
    } catch (err: any) {
      console.error('Failed to reject MCP action:', err);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="app-shell theme-cyan">
      <ConfigHeader
        config={config}
        mcpStatus={mcpStatus}
        onChangeConfig={setConfig}
        onRefreshMcp={fetchMcpStatus}
      />
      <div className="workspace-toolbar">
        <div>
          <MessageSquare size={16} />
          <h2>Conversation</h2>
          <span className="session-state" role="status">
            {pendingApproval ? 'Awaiting approval' : isStreaming ? 'Running' : 'Idle'}
          </span>
        </div>
        <button
          className="text-button"
          aria-expanded={showTrace}
          aria-controls="execution-panel"
          onClick={() => setShowTrace(!showTrace)}
        >
          {showTrace ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          {showTrace ? 'Hide trace' : 'Show trace'}
          <span className="count-badge">{traces.length}</span>
        </button>
      </div>
      <main className={showTrace ? 'workspace' : 'workspace trace-hidden'}>
        <div className="conversation-column">
          <ChatThread
            messages={messages}
            isStreaming={isStreaming || !!pendingApproval}
            onSendMessage={handleSendMessage}
            onSelectPromptPreset={(prompt) => handleSendMessage(prompt)}
          />
        </div>
        {showTrace && (
          <div id="execution-panel" className="trace-column">
            <ToolExecutionTrace traces={traces} onClearTraces={() => setTraces([])} />
          </div>
        )}
      </main>

      {/* Human-in-the-Loop Modal */}
      {pendingApproval && (
        <ApprovalModal
          action={pendingApproval}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}

export default App;
