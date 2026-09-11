import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Check, X, Terminal, FileEdit, FilePlus } from 'lucide-react';
import { PendingApprovalAction } from '../types';

interface ApprovalModalProps {
  action: PendingApprovalAction;
  onApprove: (actionId: string) => void;
  onReject: (actionId: string, reason?: string) => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({ action, onApprove, onReject }) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const isTier3 = action.tier === 'TIER_3_HIGH_RISK';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl rounded-xl border p-6 shadow-2xl bg-slate-900 ${
          isTier3 ? 'border-red-600/80 ring-1 ring-red-500/50' : 'border-amber-600/80 ring-1 ring-amber-500/50'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isTier3 ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isTier3 ? <ShieldAlert className="h-6 w-6 text-red-400" /> : <AlertTriangle className="h-6 w-6 text-amber-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Human-in-the-Loop Gate</h3>
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                    isTier3
                      ? 'bg-red-950 text-red-300 border border-red-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {action.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{action.description}</p>
            </div>
          </div>
        </div>

        {/* Action Details & Argument Preview */}
        <div className="my-5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Requested Tool:</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200 font-bold flex items-center gap-1.5">
              {action.toolName === 'bash' && <Terminal className="h-3 w-3 text-red-400" />}
              {action.toolName === 'edit' && <FileEdit className="h-3 w-3 text-amber-400" />}
              {action.toolName === 'write' && <FilePlus className="h-3 w-3 text-amber-400" />}
              {action.toolName}
            </span>
          </div>

          {/* Bash Specific Command Preview */}
          {action.toolName === 'bash' && (
            <div>
              <label className="text-[11px] text-red-400 font-semibold uppercase block mb-1">
                Command to Execute ({/windows/i.test(navigator.userAgent) ? 'PowerShell' : 'bash'}):
              </label>
              <div className="rounded-lg border border-red-950/80 bg-slate-950 p-3 text-red-300 font-mono text-xs flex items-center gap-2">
                <span className="text-slate-600 select-none">{/windows/i.test(navigator.userAgent) ? 'PS>' : '$'}</span>
                <span className="font-bold">{action.arguments.command}</span>
              </div>
            </div>
          )}

          {/* Edit Specific Diff Preview */}
          {action.toolName === 'edit' && (
            <div className="space-y-2">
              <div className="text-slate-300 font-semibold text-[11px]">File: {action.arguments.path}</div>
              <div className="rounded border border-red-900/50 bg-red-950/20 p-2 text-red-300 text-[11px]">
                <div className="text-[10px] text-red-500 font-bold mb-1">- Target Text to Replace:</div>
                <pre className="whitespace-pre-wrap">{action.arguments.oldText}</pre>
              </div>
              <div className="rounded border border-emerald-900/50 bg-emerald-950/20 p-2 text-emerald-300 text-[11px]">
                <div className="text-[10px] text-emerald-500 font-bold mb-1">+ Replacement Text:</div>
                <pre className="whitespace-pre-wrap">{action.arguments.newText}</pre>
              </div>
            </div>
          )}

          {/* Generic / Write Arguments Preview */}
          {action.toolName !== 'bash' && action.toolName !== 'edit' && (
            <div>
              <label className="text-[11px] text-slate-400 uppercase font-semibold block mb-1">Arguments:</label>
              <pre className="rounded bg-slate-950 p-3 text-[11px] text-slate-300 border border-slate-800 overflow-x-auto max-h-48">
                {JSON.stringify(action.arguments, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Optional Rejection Input */}
        {showRejectInput && (
          <div className="mb-4">
            <label className="block text-[11px] text-slate-400 mb-1">Rejection reason (fed back to LLM):</label>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Command is too dangerous, use another approach"
              className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
            />
          </div>
        )}

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          {!showRejectInput ? (
            <button
              onClick={() => setShowRejectInput(true)}
              className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              <span>Deny Action</span>
            </button>
          ) : (
            <button
              onClick={() => onReject(action.actionId, rejectReason)}
              className="rounded-lg border border-red-800 bg-red-950 hover:bg-red-900 px-4 py-2 text-xs font-semibold text-red-200 transition flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              <span>Confirm Denial</span>
            </button>
          )}

          <button
            onClick={() => onApprove(action.actionId)}
            className={`rounded-lg px-5 py-2 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg ${
              isTier3
                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/30'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
            }`}
          >
            <Check className="h-4 w-4" />
            <span>Approve & Execute</span>
          </button>
        </div>
      </div>
    </div>
  );
};
