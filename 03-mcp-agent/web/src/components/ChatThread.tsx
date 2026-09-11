import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Bot, Network, ArrowUpRight, ChevronDown, FlaskConical } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatThreadProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (text: string) => void;
  onSelectPromptPreset: (prompt: string) => void;
}

export const PRESET_PROMPTS = [
  {
    label: 'Test 1: Dynamic Tool Call',
    prompt: 'Inspect the files in the current directory using list_dir.',
    desc: 'Autonomous Tier 1 tool executed over decoupled stdio JSON-RPC',
    tool: 'list_dir',
  },
  {
    label: 'Test 2: Tier 2 MCP Write',
    prompt: 'Create a file named demo-mcp.txt with the content "Hello from Model Context Protocol!".',
    desc: 'HITL gate intercepts mutation before dispatching tools/call to MCP server',
    tool: 'write',
  },
  {
    label: 'Test 3: Tier 3 MCP Shell',
    prompt: 'Execute a bash command to check the current date and time.',
    desc: 'High-risk shell execution with preview delegated to isolated MCP process',
    tool: 'bash',
  },
  {
    label: 'Test 4: Tier 3 MCP PowerShell (Windows)',
    prompt: 'Use the bash tool to print the current date and time with this PowerShell command: Get-Date',
    desc: 'Windows host: Get-Date runs in PowerShell after MCP approval',
    tool: 'bash',
    os: 'windows',
  },
];

export function ChatThread({ messages, isStreaming, onSendMessage, onSelectPromptPreset }: ChatThreadProps) {
  const [input, setInput] = useState('');
  const [showPresets, setShowPresets] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="chat-panel">
      <section className="scenario-section" aria-label="Demo scenarios">
        <button
          className="scenario-toggle"
          onClick={() => setShowPresets(!showPresets)}
          aria-expanded={showPresets}
          aria-controls="scenario-grid"
        >
          <span>
            <FlaskConical size={15} />
            Try a scenario
            <span className="count-badge">{String(PRESET_PROMPTS.length).padStart(2, '0')}</span>
          </span>
          <ChevronDown size={16} className={showPresets ? 'rotate-180' : ''} />
        </button>
        {showPresets && (
          <div id="scenario-grid" className="scenario-grid">
            {PRESET_PROMPTS.map((preset, idx) => (
              <button
                key={preset.label}
                className={preset.os === 'windows' ? 'scenario-card scenario-card-windows' : 'scenario-card'}
                disabled={isStreaming}
                title={preset.prompt}
                onClick={() => {
                  if (!isStreaming) onSelectPromptPreset(preset.prompt);
                }}
              >
                <div className="scenario-meta">
                  <span>0{idx + 1}</span>
                  <code>{preset.tool}</code>
                  {preset.os === 'windows' && <span className="scenario-os">Windows</span>}
                  <ArrowUpRight size={15} />
                </div>
                <strong>{preset.label}</strong>
                <p>{preset.desc}</p>
                <span className="scenario-run">
                  Run scenario <span aria-hidden="true">→</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="message-list" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span className="empty-icon">
              <Network size={28} strokeWidth={1.5} />
            </span>
            <span className="eyebrow">THE PROTOCOL LAYER</span>
            <h2>Follow a tool beyond the agent.</h2>
            <p>
              Explore dynamic tool discovery and execution over stdio. Inspect MCP activity and review file or shell
              actions before dispatch.
            </p>
            <div className="tool-chips">
              {['read', 'write', 'edit', 'bash', 'list_dir'].map((tool) => (
                <code key={tool}>{tool}</code>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <article key={msg.id} className={'message message-' + msg.role}>
              <div className="message-meta">
                <span>{msg.role === 'user' ? 'You' : 'MCP agent'}</span>
                <time dateTime={msg.timestamp}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </time>
              </div>
              <div className="message-content">{msg.content}</div>
            </article>
          ))
        )}
        {isStreaming && (
          <div className="working-status" role="status">
            <Bot size={17} />
            <span>
              Agent is working<span className="working-dots">…</span>
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="composer">
        <div className="composer-box">
          <textarea
            aria-label="Message to the agent"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            placeholder="Ask the agent to do something…"
            rows={2}
            disabled={isStreaming}
          />
          <button className="send-button" type="submit" aria-label="Send message" disabled={isStreaming || !input.trim()}>
            <ArrowUp size={20} />
          </button>
        </div>
        <div className="composer-hint">
          <span>
            Enter to send <span aria-hidden="true">·</span> Shift + Enter for a new line
          </span>
          <span>File changes & shell calls need approval</span>
        </div>
      </form>
    </div>
  );
}
