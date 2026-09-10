import React, { useState } from 'react';
import { Settings2, ShieldCheck, Lock } from 'lucide-react';
import { AgentConfig } from '../types';

interface ConfigHeaderProps {
  config: AgentConfig;
  onChangeConfig: (newConfig: AgentConfig) => void;
}

export const ConfigHeader: React.FC<ConfigHeaderProps> = ({ config, onChangeConfig }) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">Demo 2: The Hardened Agent</h1>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">Port 5174</span>
              <span className="rounded bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Zod + HITL Guard
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Strict Schema · 2-Retry Circuit Breaker · 3-Tier Interactive Permission Gate</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{config.model}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500 text-[11px] truncate max-w-[180px]">{config.baseUrl}</span>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-200 border border-slate-700 transition"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>Endpoint</span>
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Inference Base URL</label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => onChangeConfig({ ...config, baseUrl: e.target.value })}
              className="w-full rounded bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              placeholder="http://localhost:11434/v1"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-medium mb-1">Model Name</label>
            <input
              type="text"
              value={config.model}
              onChange={(e) => onChangeConfig({ ...config, model: e.target.value })}
              className="w-full rounded bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              placeholder="llama3.2"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-medium mb-1">API Key</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => onChangeConfig({ ...config, apiKey: e.target.value })}
              className="w-full rounded bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              placeholder="ollama"
            />
          </div>
        </div>
      )}
    </header>
  );
};
