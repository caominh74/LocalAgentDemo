import React, { useEffect, useRef } from 'react';
import { Terminal, CheckCircle2, AlertOctagon, Clock, Trash2, Code2, Bot } from 'lucide-react';
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
      {/* Panel Header */}
      <div className="trace-heading">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-amber-400" />
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

      {/* Trace Log Body */}
      <div className="trace-list" ref={listRef}>
        {traces.length === 0 ? (
          <div className="trace-empty">
            <span className="trace-empty-icon"><Code2 size={26} strokeWidth={1.5} /></span>
            <h3>See what actually runs</h3>
            <p className="trace-empty-description">
              Raw JSON payloads, tool arguments, stdout/stderr, and runtime exceptions will stream here in real time.
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
                    <AlertOctagon className="h-3.5 w-3.5" />
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
                <span className="trace-round-result">
                  {trace.error || trace.result || ''}
                </span>
              </div>
            ) : (
            <details
              open
              key={trace.id}
              className={`trace-card rounded-lg border p-3 transition ${
                trace.status === 'error'
                  ? 'border-red-900/80 bg-red-950/20'
                  : trace.status === 'success'
                  ? 'border-emerald-900/50 bg-slate-900/80'
                  : 'border-slate-800 bg-slate-900/60'
              }`}
            >
              {/* Header line of trace card */}
              <summary className="trace-card-heading">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold">
                    {trace.toolName}
                  </span>
                  {trace.status === 'invoked' && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-400">
                      <Clock className="h-3 w-3 animate-spin" /> Invoking
                    </span>
                  )}
                  {trace.status === 'success' && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Success
                    </span>
                  )}
                  {trace.status === 'error' && (
                    <span className="flex items-center gap-1 text-[11px] text-red-400 font-semibold">
                      <AlertOctagon className="h-3 w-3" /> Runtime Failure
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(trace.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </summary>

              {/* Arguments Section */}
              <div className="mt-2 space-y-1">
                <div className="text-[10px] uppercase text-slate-500 font-semibold">Arguments (Raw JSON):</div>
                <pre className="rounded bg-slate-950 p-2 text-[11px] text-slate-300 overflow-x-auto border border-slate-800/80">
                  {trace.arguments ? JSON.stringify(trace.arguments, null, 2) : trace.rawArguments || '{}'}
                </pre>
              </div>

              {/* Success Result */}
              {trace.result && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] uppercase text-emerald-500 font-semibold">Execution Output:</div>
                  <pre className="rounded bg-slate-950 p-2 text-[11px] text-emerald-300/90 overflow-x-auto border border-slate-800/80 max-h-40">
                    {trace.result}
                  </pre>
                </div>
              )}

              {/* Error Stack */}
              {trace.error && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] uppercase text-red-400 font-bold flex items-center gap-1">
                    <AlertOctagon className="h-3 w-3" /> Error / Stack Trace:
                  </div>
                  <div className="rounded bg-red-950/40 p-2 text-[11px] text-red-300 overflow-x-auto border border-red-900/60 font-mono">
                    <p className="font-semibold text-red-200">{trace.error}</p>
                    {trace.stack && (
                      <pre className="mt-1 text-[10px] text-red-400/80 whitespace-pre-wrap">{trace.stack}</pre>
                    )}
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
