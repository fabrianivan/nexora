'use client';

import React, { useState } from 'react';
import { RotateCcw, Check } from 'lucide-react';

export interface DataPersistenceControlProps {
  onResetSampleData?: () => void;
  isLiveGemini?: boolean;
}

export function DataPersistenceControl({ onResetSampleData }: DataPersistenceControlProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    onResetSampleData?.();
    setTimeout(() => setIsSyncing(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={handleSync}
      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-200 transition-colors shadow-2xs hover:border-slate-300"
      title="Sinkronisasi ulang data buku besar & entitas korporasi"
    >
      {isSyncing ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-75 duration-150" />
          <span className="text-emerald-700 font-bold">Tersinkronisasi</span>
        </>
      ) : (
        <>
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-600 hover:text-slate-900">Sinkron Data</span>
        </>
      )}
    </button>
  );
}
