import React, { useState, useEffect } from 'react';
import { ConfigHeader } from './components/ConfigHeader';
import { ChatThread } from './components/ChatThread';
import { ToolExecutionTrace } from './components/ToolExecutionTrace';
import { ApprovalModal } from './components/ApprovalModal';
import { ChatMessage, ToolTraceItem, AgentConfig, PendingApprovalAction, McpServerStatus } from './types';

export function App() {
  const [config, setConfig] = useState<AgentConfig>({
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
    apiKey: 'ollama',
  });

  const [mcpStatus, setMcpStatus] = useState<McpServerStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [traces, setTraces] = useState<ToolTraceItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApprovalAction | null>(null);

  const fetchMcpStatus = async () => {
    try {
      const res = await fetch('http://localhost:3003/api/mcp/status');
      if (res.ok) {
        const data = await res.json();
        setMcpStatus(data);
      }
    } catch (e) {
      // Backend not yet reached
    }
  };

  useEffect(() => {
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

          if (event.type === 'TOOL_DISPATCH_MCP') {
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
      const response = await fetch('http://localhost:3003/api/chat/stream', {
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
          content: `⚠️ Network / Connection Error: ${err.message}. Is backend running on port 3003?`,
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
      const response = await fetch('http://localhost:3003/api/chat/action/approve', {
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
      const response = await fetch('http://localhost:3003/api/chat/action/reject', {
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
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 antialiased overflow-hidden">
      <ConfigHeader
        config={config}
        mcpStatus={mcpStatus}
        onChangeConfig={setConfig}
        onRefreshMcp={fetchMcpStatus}
      />
      <main className="flex flex-1 overflow-hidden">
        {/* Left Column: Chat Thread */}
        <div className="flex-1 min-w-0">
          <ChatThread
            messages={messages}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
            onSelectPromptPreset={(prompt) => handleSendMessage(prompt)}
          />
        </div>

        {/* Right Column: MCP Tool Execution Trace */}
        <div className="w-1/2 min-w-[380px] max-w-xl">
          <ToolExecutionTrace traces={traces} onClearTraces={() => setTraces([])} />
        </div>
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
