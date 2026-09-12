import React, { useState } from 'react';
import { Settings2, Terminal, Network, ChevronDown, ArrowRight } from 'lucide-react';
import { AgentConfig, McpServerStatus } from '../types';
import { McpStatusBadge } from './McpStatusBadge';

interface ConfigHeaderProps {
  config: AgentConfig;
  onChangeConfig: (config: AgentConfig) => void;
  mcpStatus: McpServerStatus | null;
  onRefreshMcp: () => void;
}

export function ConfigHeader({ config, onChangeConfig, mcpStatus, onRefreshMcp }: ConfigHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);

  const demoUrl = (port: number) => {
    const url = new URL(window.location.href);
    url.port = String(port);
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url.href;
  };

  return (
    <header className="app-header">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Terminal size={19} />
          </span>
          <span>
            Local Agent
            <span className="brand-sub">Architecture lab</span>
          </span>
        </div>
        <nav className="demo-nav" aria-label="Agent demos">
          {['Naive', 'Hardened', 'MCP'].map((name, idx) => (
            <a
              key={name}
              href={demoUrl(5173 + idx)}
              aria-current={idx === 2 ? 'page' : undefined}
            >
              <span>0{idx + 1}</span>
              {name}
            </a>
          ))}
        </nav>
        <button
          className="secondary-button settings-toggle"
          aria-expanded={showSettings}
          aria-controls="endpoint-settings"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings2 size={16} />
          Endpoint settings
          <ChevronDown size={14} className={showSettings ? 'rotate-180' : ''} />
        </button>
      </div>

      {showSettings && (
        <section id="endpoint-settings" className="endpoint-settings" aria-label="Endpoint settings">
          <div className="settings-caption">
            <strong>Inference connection</strong>
            <span>Changes apply to the next request.</span>
          </div>
          <div className="settings-fields">
            <label htmlFor="base-url">
              Inference base URL
              <input
                id="base-url"
                type="url"
                value={config.baseUrl}
                onChange={(e) => onChangeConfig({ ...config, baseUrl: e.target.value })}
                placeholder="http://localhost:11434/v1"
                spellCheck={false}
              />
            </label>
            <label htmlFor="model-name">
              Model name
              <input
                id="model-name"
                value={config.model}
                onChange={(e) => onChangeConfig({ ...config, model: e.target.value })}
                placeholder="Model identifier"
                spellCheck={false}
              />
            </label>
            <label htmlFor="api-key">
              API key
              <input
                id="api-key"
                type="password"
                value={config.apiKey}
                onChange={(e) => onChangeConfig({ ...config, apiKey: e.target.value })}
                placeholder="API key (if required)"
                autoComplete="off"
              />
            </label>
          </div>
        </section>
      )}

      <div className="demo-heading">
        <div>
          <div className="eyebrow">
            EXPERIMENT 03<span>PORT 5175</span>
          </div>
          <div className="demo-title">
            <h1>MCP agent</h1>
            <span className="mode-badge">
              <Network size={13} />
              Tools over MCP
            </span>
          </div>
          <p>Discover tools dynamically and follow calls into a separate MCP process.</p>
        </div>
        <div className="connection-summary">
          <div className="model-label">CONFIGURED MODEL</div>
          <strong>{config.model || 'Not configured'}</strong>
          <span className="endpoint-address" title={config.baseUrl}>
            {config.baseUrl || 'Choose an endpoint to get started'}
          </span>
          <McpStatusBadge status={mcpStatus} onRefresh={onRefreshMcp} />
        </div>
      </div>
      <div className="architecture-path" aria-label="Execution architecture">
        <span>Model</span>
        <ArrowRight size={13} />
        <span>Approval gate</span>
        <ArrowRight size={13} />
        <span>MCP server</span>
        <span className="path-note">Dynamic discovery · stdio transport</span>
      </div>
    </header>
  );
}
