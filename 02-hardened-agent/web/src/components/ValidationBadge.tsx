import React from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, ZapOff } from 'lucide-react';
import { ValidationBadgeType } from '../types';

interface ValidationBadgeProps {
  badge: ValidationBadgeType;
}

export const ValidationBadge: React.FC<ValidationBadgeProps> = ({ badge }) => {
  switch (badge) {
    case 'Passed':
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Passed Zod
        </span>
      );
    case 'Hallucinated':
      return (
        <span className="inline-flex items-center gap-1 rounded bg-rose-950/80 border border-rose-700/60 px-2 py-0.5 text-[10px] font-bold text-rose-400">
          <AlertTriangle className="h-3 w-3" />
          Hallucinated
        </span>
      );
    case 'Correcting':
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-950/80 border border-amber-700/60 px-2 py-0.5 text-[10px] font-bold text-amber-400 animate-pulse">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Self-Correcting
        </span>
      );
    case 'Circuit Breaker':
      return (
        <span className="inline-flex items-center gap-1 rounded bg-purple-950/90 border border-purple-600 px-2 py-0.5 text-[10px] font-bold text-purple-300">
          <ZapOff className="h-3 w-3" />
          Circuit Breaker
        </span>
      );
    default:
      return null;
  }
};
