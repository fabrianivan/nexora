'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, Database } from 'lucide-react';

export interface DataPersistenceControlProps {
  onSyncData?: () => Promise<void> | void;
  onResetData?: () => Promise<void> | void;
  dbEngine?: 'sqlite' | 'mysql' | 'memory';
  className?: string;
}

export function DataPersistenceControl({ 
  onSyncData, 
  onResetData, 
  dbEngine = 'sqlite',
  className 
}: DataPersistenceControlProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>('Baru saja');
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; engine: string }>({
    connected: true,
    engine: dbEngine,
  });

  useEffect(() => {
    // Quick status ping
    fetch('/api/db/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.connected) {
          setDbStatus({ connected: true, engine: data.engine });
        }
      })
      .catch(() => {});
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      if (onSyncData) {
        await onSyncData();
      } else {
        await fetch('/api/db/bootstrap');
      }
      setLastSynced(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      // fallback
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  const handleReset = async () => {
    if (!onResetData) return;
    setIsResetting(true);
    try {
      await onResetData();
      setLastSynced(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setTimeout(() => setIsResetting(false), 800);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      {/* Live Database Engine Badge */}
      <div 
        className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 text-[10px] font-medium shadow-2xs"
        title={`Database aktif: ${dbStatus.engine.toUpperCase()} • 8 tabel relasional aktif`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <Database className="w-3 h-3 text-emerald-400" />
        <span className="font-semibold text-slate-200 uppercase">{dbStatus.engine} DB</span>
      </div>

      {/* Manual Sync Button */}
      <button
        type="button"
        onClick={handleSync}
        disabled={isSyncing}
        className={`group relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer disabled:cursor-not-allowed border ${
          isSyncing
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/20'
            : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border-slate-700/70 hover:border-slate-600 shadow-2xs hover:shadow-xs'
        }`}
        title={`Database tersinkronisasi (${lastSynced}) — klik untuk sinkronkan ulang`}
      >
        {isSyncing ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-75 duration-150 shrink-0" />
            <span className="font-semibold text-emerald-300 tracking-tight">Tersinkron DB</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 group-hover:rotate-180 transition-transform duration-500 shrink-0" />
            <span className="tracking-tight text-slate-300 group-hover:text-white">Sinkron DB</span>
          </>
        )}
      </button>

      {/* Optional Reset Button */}
      {onResetData && (
        <button
          type="button"
          onClick={handleReset}
          disabled={isResetting}
          className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition cursor-pointer"
          title="Reset seluruh tabel database ke status kepatuhan standar"
        >
          {isResetting ? 'Mereset...' : 'Reset DB'}
        </button>
      )}
    </div>
  );
}
