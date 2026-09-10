import React from 'react';
import { Terminal, Cpu, Trash2, Code2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ToolTraceItem } from '../types';

interface ToolExecutionTraceProps {
  traces: ToolTraceItem[];
  onClearTraces: () => void;
}

export const ToolExecutionTrace: React.FC<ToolExecutionTraceProps> = ({ traces, onClearTraces }) => {
  return (
    <div className="flex h-full flex-col bg-slate-900/40 border-l border-slate-800">
      <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">MCP Tool Execution Trace</h2>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
            {traces.length}
          </span>
        </div>
        {traces.length > 0 && (
          <button
            onClick={onClearTraces}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
        {traces.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
            <Code2 className="h-8 w-8 text-slate-700 mb-2" />
            <p className="text-xs text-slate-500">No MCP tool invocations yet</p>
            <p className="text-[11px] text-slate-600 max-w-xs mt-1">
              Tool dispatches routed through the Model Context Protocol over stdio transport will stream here.
            </p>
          </div>
        ) : (
          traces.map((trace) => (
            <div
              key={trace.id}
              className={`rounded-lg border p-3 transition ${
                trace.status === 'error'
                  ? 'border-rose-900/70 bg-rose-950/20'
                  : trace.status === 'waiting_approval'
                  ? 'border-amber-700/80 bg-amber-950/20'
                  : trace.status === 'success'
                  ? 'border-cyan-900/50 bg-slate-900/80'
                  : 'border-slate-800 bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 text-[11px] font-bold">
                    {trace.toolName}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-cyan-950/80 border border-cyan-700/60 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
                    <Cpu className="h-3 w-3" />
                    stdio RPC
                  </span>
                  {trace.status === 'waiting_approval' && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-950/80 border border-amber-600 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      <ShieldAlert className="h-3 w-3" />
                      Approval Required
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(trace.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              <div className="mt-2 space-y-1">
                <div className="text-[10px] uppercase text-slate-500 font-semibold">Arguments (JSON-RPC `tools/call`):</div>
                <pre className="rounded bg-slate-950 p-2 text-[11px] text-slate-300 overflow-x-auto border border-slate-800/80">
                  {JSON.stringify(trace.arguments, null, 2)}
                </pre>
              </div>

              {trace.result && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] uppercase text-cyan-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> MCP Response:
                  </div>
                  <pre className="rounded bg-slate-950 p-2 text-[11px] text-cyan-200/90 overflow-x-auto border border-slate-800/80 max-h-40">
                    {trace.result}
                  </pre>
                </div>
              )}

              {trace.error && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] uppercase text-rose-400 font-bold">MCP Error:</div>
                  <div className="rounded bg-rose-950/40 p-2 text-[11px] text-rose-300 border border-rose-900/60">
                    {trace.error}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
