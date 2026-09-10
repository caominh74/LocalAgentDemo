import React, { useState, useEffect } from 'react';
import { ConfigHeader } from './components/ConfigHeader';
import { ChatThread } from './components/ChatThread';
import { ToolExecutionTrace } from './components/ToolExecutionTrace';
import { ChatMessage, ToolTraceItem, AgentConfig } from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');

export function App() {
  const [config, setConfig] = useState<AgentConfig>({
    baseUrl: import.meta.env.VITE_LLM_BASE_URL || '',
    model: import.meta.env.VITE_LLM_MODEL || '',
    apiKey: import.meta.env.VITE_LLM_API_KEY || '',
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [traces, setTraces] = useState<ToolTraceItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/chat/config`);
        if (res.ok) {
          const data = await res.json();
          setConfig((prev) => ({
            baseUrl: prev.baseUrl || data.defaultBaseUrl || '',
            model: prev.model || data.defaultModel || '',
            apiKey: prev.apiKey || data.defaultApiKey || '',
          }));
        }
      } catch (e) {
        // Backend not yet reachable; keep fallback env defaults
      }
    };
    fetchConfig();
  }, []);

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

    // Prepare payload for backend
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

            if (event.type === 'TOOL_INVOCATION') {
              const newTrace: ToolTraceItem = {
                id: crypto.randomUUID(),
                toolCallId: event.data.toolCallId,
                toolName: event.data.toolName,
                status: 'invoked',
                arguments: event.data.arguments,
                rawArguments: event.data.rawArguments,
                timestamp: new Date().toISOString(),
              };
              setTraces((prev) => [...prev, newTrace]);
            } else if (event.type === 'TOOL_RESULT') {
              setTraces((prev) =>
                prev.map((t) =>
                  t.toolCallId === event.data.toolCallId
                    ? { ...t, status: 'success', result: event.data.result }
                    : t
                )
              );
            } else if (event.type === 'TOOL_ERROR') {
              setTraces((prev) => {
                const existing = prev.find((t) => t.toolCallId === event.data.toolCallId);
                if (existing) {
                  return prev.map((t) =>
                    t.toolCallId === event.data.toolCallId
                      ? { ...t, status: 'error', error: event.data.error, stack: event.data.stack }
                      : t
                  );
                } else {
                  return [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      toolCallId: event.data.toolCallId || crypto.randomUUID(),
                      toolName: event.data.toolName,
                      status: 'error',
                      error: event.data.error,
                      stack: event.data.stack,
                      rawArguments: event.data.rawArgs,
                      timestamp: new Date().toISOString(),
                    },
                  ];
                }
              });
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
              setMessages((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: `⚠️ Execution Failure: ${event.data.message}`,
                  timestamp: new Date().toISOString(),
                },
              ]);
            }
          } catch (parseErr) {
            console.error('Failed to parse SSE event:', parseErr, jsonStr);
          }
        }
      }
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
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 antialiased overflow-hidden">
      <ConfigHeader config={config} onChangeConfig={setConfig} />
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

        {/* Right Column: Real-time Tool Execution Trace */}
        <div className="w-1/2 min-w-[380px] max-w-xl">
          <ToolExecutionTrace
            traces={traces}
            onClearTraces={() => setTraces([])}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
