import React, { useState, useEffect } from 'react';
import { PanelRightClose, PanelRightOpen, MessageSquare } from 'lucide-react';
import { ConfigHeader } from './components/ConfigHeader';
import { ChatThread } from './components/ChatThread';
import { ToolExecutionTrace } from './components/ToolExecutionTrace';
import { ApprovalModal } from './components/ApprovalModal';
import { ChatMessage, ToolTraceItem, AgentConfig, PendingApprovalAction } from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002').replace(/\/+$/, '');

export function App() {
  const [showTrace, setShowTrace] = useState(() => window.matchMedia('(min-width: 1080px)').matches);
  const [config, setConfig] = useState<AgentConfig>({
    baseUrl: import.meta.env.VITE_LLM_BASE_URL || '',
    model: import.meta.env.VITE_LLM_MODEL || '',
    apiKey: import.meta.env.VITE_LLM_API_KEY || '',
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [traces, setTraces] = useState<ToolTraceItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApprovalAction | null>(null);

  useEffect(() => {
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
        // Backend not yet reachable; keep fallback env defaults
      }
    };
    fetchConfig();
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

          if (event.type === 'VALIDATION_PASSED') {
            setTraces((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                toolCallId: event.data.toolCallId,
                toolName: event.data.toolName,
                status: 'passed',
                validationBadge: 'Passed',
                arguments: event.data.arguments,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else if (event.type === 'VALIDATION_FAILED') {
            setTraces((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                toolCallId: event.data.toolCallId,
                toolName: event.data.toolName,
                status: 'hallucinated',
                validationBadge: 'Hallucinated',
                arguments: event.data.arguments,
                rawArguments: event.data.rawArgs,
                errors: event.data.errors,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else if (event.type === 'SELF_CORRECTING') {
            setTraces((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                toolCallId: event.data.toolCallId,
                toolName: event.data.toolName,
                status: 'correcting',
                validationBadge: 'Correcting',
                feedback: event.data.feedback,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else if (event.type === 'CIRCUIT_BREAKER_TRIPPED') {
            setTraces((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                toolCallId: event.data.toolCallId,
                toolName: event.data.toolName,
                status: 'circuit_breaker',
                validationBadge: 'Circuit Breaker',
                error: event.data.message,
                timestamp: new Date().toISOString(),
              },
            ]);
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `⚡ Circuit Breaker Tripped: ${event.data.message}`,
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
          } else if (event.type === 'TOOL_RESULT') {
            setTraces((prev) =>
              prev.map((t) =>
                t.toolCallId === event.data.toolCallId
                  ? { ...t, status: 'success', result: event.data.result }
                  : t
              )
            );
          } else if (event.type === 'TOOL_ERROR') {
            setTraces((prev) =>
              prev.map((t) =>
                t.toolCallId === event.data.toolCallId
                  ? { ...t, status: 'error', error: event.data.error }
                  : t
              )
            );
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
      console.error('Failed to approve action:', err);
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
      console.error('Failed to reject action:', err);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="app-shell theme-emerald">
      <ConfigHeader config={config} onChangeConfig={setConfig} />
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
