import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Cpu, CheckCircle2, XCircle, Activity, X, RefreshCw } from 'lucide-react';
import { McpServerStatus } from '../types';

interface McpStatusBadgeProps {
  status: McpServerStatus | null;
  onRefresh: () => void;
}

function schemaHint(inputSchema: unknown): string {
  if (!inputSchema || typeof inputSchema !== 'object') return '';
  const schema = inputSchema as { properties?: Record<string, unknown>; required?: string[] };
  const properties = schema.properties;
  if (!properties) return '';
  const required = new Set(schema.required || []);
  return Object.keys(properties)
    .map((key) => (required.has(key) ? key : `${key}?`))
    .join(', ');
}

export const McpStatusBadge: React.FC<McpStatusBadgeProps> = ({ status, onRefresh }) => {
  const [showModal, setShowModal] = React.useState(false);

  useEffect(() => {
    if (!showModal) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowModal(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showModal]);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 rounded-md bg-cyan-950/60 border border-cyan-700/60 hover:border-cyan-500 px-3 py-1.5 text-xs text-cyan-300 transition"
        aria-haspopup="dialog"
        aria-expanded={showModal}
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

      {showModal &&
        createPortal(
          <div
            className="mcp-overlay"
            role="presentation"
            onClick={() => setShowModal(false)}
          >
            <div
              className="mcp-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mcp-dialog-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mcp-dialog-header">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-cyan-400" />
                  <h3 id="mcp-dialog-title">Model Context Protocol runtime</h3>
                </div>
                <button
                  type="button"
                  className="mcp-icon-button"
                  onClick={() => setShowModal(false)}
                  aria-label="Close MCP panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mcp-dialog-body">
                <div className="mcp-meta-grid">
                  <div>
                    <div className="mcp-meta-label">Transport</div>
                    <div className="text-cyan-300 font-bold">stdio (Bun subprocess)</div>
                  </div>
                  <div>
                    <div className="mcp-meta-label">Status</div>
                    <div className={`font-bold flex items-center gap-1 ${status?.connected ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {status?.connected ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {status?.connected ? 'Ready' : 'Disconnected'}
                    </div>
                  </div>
                  <div>
                    <div className="mcp-meta-label">Discovered tools</div>
                    <div className="text-white font-bold">{status?.toolsCount ?? 0} via tools/list</div>
                  </div>
                </div>

                <section>
                  <div className="mcp-section-label">
                    <Activity className="h-3.5 w-3.5 text-cyan-400" />
                    Dynamically discovered MCP tools
                  </div>
                  <ul className="mcp-tool-list">
                    {(status?.tools ?? []).length === 0 ? (
                      <li className="mcp-empty">No tools discovered yet.</li>
                    ) : (
                      (status?.tools ?? []).map((tool) => (
                        <li key={tool.name} className="mcp-tool-row">
                          <code>{tool.name}</code>
                          <span>{schemaHint(tool.inputSchema) || 'no parameters'}</span>
                          <p>{tool.description || 'No description provided.'}</p>
                        </li>
                      ))
                    )}
                  </ul>
                </section>

                <section className="mcp-rpc-section">
                  <div className="mcp-section-label">Live JSON-RPC message log</div>
                  <div className="mcp-rpc-log">
                    {(status?.recentRpcLogs ?? []).length === 0 ? (
                      <div className="mcp-empty">No RPC calls recorded yet.</div>
                    ) : (
                      status?.recentRpcLogs.map((log) => (
                        <article key={log.id} className="mcp-rpc-entry">
                          <header>
                            <span>{log.method}</span>
                            <time>{log.durationMs}ms</time>
                          </header>
                          {log.params != null && (
                            <pre>{JSON.stringify(log.params, null, 2)}</pre>
                          )}
                          {log.error != null && (
                            <pre className="mcp-rpc-error">{JSON.stringify(log.error, null, 2)}</pre>
                          )}
                        </article>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <div className="mcp-dialog-footer">
                <button type="button" className="mcp-secondary-button" onClick={onRefresh}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
                <button type="button" className="mcp-secondary-button" onClick={() => setShowModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
