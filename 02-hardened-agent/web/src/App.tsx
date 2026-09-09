import React from 'react';

export function App() {
  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-lg font-bold tracking-tight">Demo 2: Hardened Agent</h1>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400 font-mono">Port 5174</span>
          <span className="rounded bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 text-xs text-emerald-400 font-medium">Zod + HITL Guard</span>
        </div>
        <div className="text-xs text-slate-500">Schema Validation · Self-Correction · 3-Tier Approval</div>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <section className="flex-1 border-r border-slate-800 p-4">
          <p className="text-sm text-slate-400">Chat Stream placeholder</p>
        </section>
        <section className="w-1/2 p-4 bg-slate-900/50">
          <p className="text-sm text-slate-400">Tool Trace & Validation Badges placeholder</p>
        </section>
      </main>
    </div>
  );
}

export default App;
