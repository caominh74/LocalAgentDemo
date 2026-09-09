import React from 'react';

export function App() {
  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
          <h1 className="text-lg font-bold tracking-tight">Demo 1: The Naive Agent</h1>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400 font-mono">Port 5173</span>
        </div>
        <div className="text-xs text-slate-500">Unvalidated JSON.parse · Direct Execution</div>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <section className="flex-1 border-r border-slate-800 p-4">
          <p className="text-sm text-slate-400">Chat Stream placeholder</p>
        </section>
        <section className="w-1/2 p-4 bg-slate-900/50">
          <p className="text-sm text-slate-400">Tool Trace placeholder</p>
        </section>
      </main>
    </div>
  );
}

export default App;
