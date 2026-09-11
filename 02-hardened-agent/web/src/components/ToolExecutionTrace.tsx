import React from 'react';
import { Terminal, Shield, Trash2, Code2, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ToolTraceItem } from '../types';
import { ValidationBadge } from './ValidationBadge';

interface ToolExecutionTraceProps {
  traces: ToolTraceItem[];
  onClearTraces: () => void;
}

export const ToolExecutionTrace: React.FC<ToolExecutionTraceProps> = ({ traces, onClearTraces }) => {
  return (
    <div className="trace-panel">
      {/* Panel Header */}
      <div className="trace-heading">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
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

      {/* Trace Items */}
      <div className="trace-list">
        {traces.length === 0 ? (
          <div className="trace-empty">
            <span className="trace-empty-icon"><Code2 size={26} strokeWidth={1.5} /></span>
            <h3>See what actually runs</h3>
            <p className="trace-empty-description">
              Zod validation results, self-correction iterations, permission decisions, and execution outputs will appear here.
            </p>
          </div>
        ) : (
          traces.map((trace) => (
            <details
              open
              key={trace.id}
              className={`trace-card rounded-lg border p-3 transition ${
                trace.status === 'circuit_breaker'
                  ? 'border-purple-800 bg-purple-950/20'
                  : trace.status === 'hallucinated' || trace.status === 'error' || trace.status === 'rejected'
                  ? 'border-rose-900/70 bg-rose-950/20'
                  : trace.status === 'waiting_approval'
                  ? 'border-amber-700/80 bg-amber-950/20'
                  : trace.status === 'success' || trace.status === 'passed'
                  ? 'border-emerald-900/50 bg-slate-900/80'
                  : 'border-slate-800 bg-slate-900/60'
              }`}
            >
              {/* Header with tool name and validation badge */}
              <summary className="trace-card-heading">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 text-[11px] font-bold">
                    {trace.toolName}
                  </span><span className="trace-state">{trace.status.replace(/_/g, ' ')}</span>
                  {trace.validationBadge && <ValidationBadge badge={trace.validationBadge} />}
                  {trace.status === 'waiting_approval' && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-950/80 border border-amber-600 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      <ShieldAlert className="h-3 w-3" />
                      HITL Approval Required
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

              {/* Arguments Section */}
              <div className="mt-2 space-y-1">
                <div className="text-[10px] uppercase text-slate-500 font-semibold">Arguments:</div>
                <pre className="rounded bg-slate-950 p-2 text-[11px] text-slate-300 overflow-x-auto border border-slate-800/80">
                  {trace.arguments ? JSON.stringify(trace.arguments, null, 2) : trace.rawArguments || '{}'}
                </pre>
              </div>

              {/* Validation Errors & Feedback */}
              {trace.errors && trace.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] uppercase text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Zod Validation Errors:
                  </div>
                  <div className="rounded bg-rose-950/30 p-2 text-[11px] text-rose-300 border border-rose-900/60 font-mono space-y-0.5">
                    {trace.errors.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Self-Correction Feedback message */}
              {trace.feedback && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] uppercase text-amber-400 font-semibold">Correction Prompt Fed to LLM:</div>
                  <pre className="rounded bg-amber-950/20 p-2 text-[10px] text-amber-300/90 whitespace-pre-wrap border border-amber-900/50">
                    {trace.feedback}
                  </pre>
                </div>
              )}

              {trace.error && <div className="rounded border border-rose-900/60 bg-rose-950/30 p-3 text-rose-300"><strong>Execution error</strong><pre className="whitespace-pre-wrap">{trace.error}</pre></div>}

              {/* Success Result */}
              {trace.result && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] uppercase text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Execution Result:
                  </div>
                  <pre className="rounded bg-slate-950 p-2 text-[11px] text-emerald-300/90 overflow-x-auto border border-slate-800/80 max-h-40">
                    {trace.result}
                  </pre>
                </div>
              )}
            </details>
          ))
        )}
      </div>
    </div>
  );
};
