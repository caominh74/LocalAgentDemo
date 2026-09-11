import React, { useEffect, useRef } from 'react';
import { Cpu, Trash2, Code2, CheckCircle2, ShieldAlert, Clock, Bot, AlertTriangle } from 'lucide-react';
import { ToolTraceItem } from '../types';

interface ToolExecutionTraceProps {
  traces: ToolTraceItem[];
  onClearTraces: () => void;
}

export const ToolExecutionTrace: React.FC<ToolExecutionTraceProps> = ({ traces, onClearTraces }) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [traces]);

  return (
    <div className="trace-panel">
      <div className="trace-heading">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-cyan-400" />
          <h2>Execution trace</h2>
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

      <div className="trace-list" ref={listRef}>
        {traces.length === 0 ? (
          <div className="trace-empty">
            <span className="trace-empty-icon"><Code2 size={26} strokeWidth={1.5} /></span>
            <h3>See what actually runs</h3>
            <p className="trace-empty-description">
              Tool dispatches routed through the Model Context Protocol over stdio transport will stream here.
            </p>
          </div>
        ) : (
          traces.map((trace) =>
            trace.toolName === 'llm' ? (
              <div key={trace.id} className="trace-round" data-state={trace.status}>
                <div className="trace-round-label">
                  {trace.status === 'thinking' ? (
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                  ) : trace.status === 'error' ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {trace.status === 'thinking'
                      ? 'Waiting on model'
                      : trace.status === 'error'
                      ? 'Model round failed'
                      : 'Model replied'}
                  </span>
                  {trace.iteration != null && (
                    <span className="trace-round-meta">
                      round {trace.iteration}/{trace.maxIterations ?? '?'}
                    </span>
                  )}
                </div>
                <span className="trace-round-result">{trace.error || trace.result || ''}</span>
              </div>
            ) : (
            <details
              open
              key={trace.id}
              className={`trace-card rounded-lg border p-3 transition ${
                trace.status === 'error' || trace.status === 'rejected'
                  ? 'border-rose-900/70 bg-rose-950/20'
                  : trace.status === 'waiting_approval'
                  ? 'border-amber-700/80 bg-amber-950/20'
                  : trace.status === 'success'
                  ? 'border-cyan-900/50 bg-slate-900/80'
                  : 'border-slate-800 bg-slate-900/60'
              }`}
            >
              <summary className="trace-card-heading">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 text-[11px] font-bold">
                    {trace.toolName}
                  </span><span className="trace-state">{trace.status.replace(/_/g, ' ')}</span>
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
                  {trace.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1 rounded bg-rose-950/80 border border-rose-600 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                      <ShieldAlert className="h-3 w-3" />
                      Operator Denied
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(trace.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </summary>

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
            </details>
            )
          )
        )}
      </div>
    </div>
  );
};
