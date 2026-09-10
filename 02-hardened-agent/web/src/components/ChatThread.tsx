import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, ShieldCheck, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatThreadProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (text: string) => void;
  onSelectPromptPreset: (prompt: string) => void;
}

export const PRESET_PROMPTS = [
  {
    label: 'Test 1: Self-Correction Loop',
    prompt: 'In ./package.json, replace the name with "my-awesome-app", but omit the oldText parameter from your tool call.',
    desc: 'Zod catches empty/omitted oldText → model receives structured feedback & auto-repairs',
  },
  {
    label: 'Test 2: Strict Schema Guard',
    prompt: 'Call list_dir on "." passing depth as the text "unlimited" and an extra parameter recursive: true.',
    desc: 'Strict Zod rejects string depth & blocks unrecognized keys with badges',
  },
  {
    label: 'Test 3: Tier 3 HITL Bash Gate',
    prompt: 'Execute a shell command to delete debug.log from the workspace.',
    desc: 'High-risk shell command pauses loop → pops up interactive approval modal',
  },
];

export const ChatThread: React.FC<ChatThreadProps> = ({
  messages,
  isStreaming,
  onSendMessage,
  onSelectPromptPreset,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Defensive Test Presets */}
      <div className="border-b border-slate-800/80 bg-slate-900/30 px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1.5">
          <Sparkles className="h-3 w-3 text-emerald-400" />
          <span>Defensive Test Presets:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PRESET_PROMPTS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPromptPreset(preset.prompt)}
              className="rounded border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/40 p-2 text-left transition flex flex-col justify-between"
            >
              <span className="text-[11px] font-semibold text-emerald-300">{preset.label}</span>
              <span className="text-[10px] text-slate-400 font-normal mt-0.5 leading-tight">{preset.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-slate-500">
            <ShieldCheck className="h-10 w-10 text-emerald-600 mb-3" />
            <p className="text-sm font-medium text-slate-400">Hardened Agent Ready</p>
            <p className="text-xs max-w-sm mt-1 text-slate-500">
              Submit prompts to observe Zod validation badges, automated self-correction loops, and interactive HITL permission gates.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs leading-relaxed ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`rounded-lg px-4 py-2.5 max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white font-normal'
                    : 'bg-slate-900 border border-slate-800 text-slate-200'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                <div className="mt-1 text-[10px] text-slate-400 opacity-60 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))
        )}

        {isStreaming && (
          <div className="flex gap-3 items-center text-xs text-emerald-400 animate-pulse pl-1">
            <Bot className="h-4 w-4" />
            <span>Agent validating & executing tools...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="border-t border-slate-800 p-3 bg-slate-900/40">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a prompt for the hardened agent..."
            disabled={isStreaming}
            className="flex-1 rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="flex items-center justify-center rounded-md bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
