'use client';

import React, { useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';

export interface DataPersistenceControlProps {
  onResetSampleData?: () => void;
  isLiveGemini?: boolean;
  className?: string;
}

export function DataPersistenceControl({ onResetSampleData, className }: DataPersistenceControlProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    onResetSampleData?.();
    setTimeout(() => setIsSyncing(false), 900);
  };

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={isSyncing}
      className={`group relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer disabled:cursor-not-allowed border ${
        isSyncing
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/20'
          : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border-slate-700/70 hover:border-slate-600 shadow-2xs hover:shadow-xs'
      } ${className || ''}`}
      title="Sinkronisasi ulang & muat ulang data default korporasi"
    >
      {isSyncing ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-75 duration-150 shrink-0" />
          <span className="font-semibold text-emerald-300 tracking-tight">Tersinkron</span>
        </>
      ) : (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 group-hover:rotate-180 transition-transform duration-500 shrink-0" />
          <span className="tracking-tight text-slate-300 group-hover:text-white">Sinkron Data</span>
        </>
      )}
    </button>
  );
}
