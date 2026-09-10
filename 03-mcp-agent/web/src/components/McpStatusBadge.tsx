import React, { useState } from 'react';
import { Cpu, CheckCircle2, XCircle, Activity, ChevronRight, X } from 'lucide-react';
import { McpServerStatus } from '../types';

interface McpStatusBadgeProps {
  status: McpServerStatus | null;
  onRefresh: () => void;
}

export const McpStatusBadge: React.FC<McpStatusBadgeProps> = ({ status, onRefresh }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 rounded-md bg-cyan-950/60 border border-cyan-700/60 hover:border-cyan-500 px-3 py-1.5 text-xs text-cyan-300 transition"
      >
        <div className="flex items-center gap-1.5 font-semibold">
          {status?.connected ? (
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-rose-500" />
          )}
          <Cpu className="h-3.5 w-3.5 text-cyan-400" />
          <span>MCP stdio:</span>
          <span className="font-bold text-white">
            {status?.connected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
        <span className="rounded bg-cyan-900/60 px-1.5 py-0.5 text-[10px] font-mono text-cyan-200 border border-cyan-800">
          {status?.toolsCount ?? 0} Tools Discovered
        </span>
      </button>

      {/* Discovery & RPC Telemetry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-xl border border-cyan-800/80 bg-slate-900 shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Model Context Protocol (MCP) Runtime
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Server Info */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Transport</div>
                  <div className="text-cyan-300 font-bold">stdio (Bun Subprocess)</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Status</div>
                  <div className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Ready
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Discovered Tools</div>
                  <div className="text-white font-bold">{status?.toolsCount ?? 0} Active Tools</div>
                </div>
              </div>

              {/* Dynamic Tools List */}
              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase mb-1.5 flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Dynamically Discovered MCP Tools (JSON-RPC `tools/list`):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {status?.tools.map((tool) => (
                    <div
                      key={tool.name}
                      className="rounded border border-slate-800 bg-slate-950/80 p-2 text-[11px]"
                    >
                      <div className="font-bold text-cyan-300 flex items-center gap-1">
                        <ChevronRight className="h-3 w-3 text-cyan-500" />
                        {tool.name}
                      </div>
                      <div className="text-slate-400 text-[10px] mt-0.5 line-clamp-1">{tool.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent JSON-RPC Telemetry */}
              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase mb-1.5">
                  Live JSON-RPC Message Log:
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 p-2 space-y-1.5 max-h-44 overflow-y-auto">
                  {status?.recentRpcLogs.length === 0 ? (
                    <div className="text-slate-600 text-[11px]">No RPC calls recorded yet.</div>
                  ) : (
                    status?.recentRpcLogs.map((log) => (
                      <div key={log.id} className="border-b border-slate-900 pb-1 text-[10px] text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-400 font-bold">{log.method}</span>
                          <span className="text-slate-500">{log.durationMs}ms</span>
                        </div>
                        {log.params && (
                          <div className="text-slate-500 truncate max-w-md">
                            Params: {JSON.stringify(log.params)}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-1.5 text-xs text-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
