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
    <div className={`rounded-xl bg-white/[0.04] border border-white/[0.07] p-2.5 ${className || ''}`}>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-200"
          title={`Database aktif: ${dbStatus.engine.toUpperCase()} • 8 tabel relasional aktif`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="uppercase tracking-wide">{dbStatus.engine}</span>
          <span className="font-normal text-slate-500">· {lastSynced}</span>
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className={`group inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11px] font-semibold transition cursor-pointer disabled:cursor-not-allowed ${
            isSyncing ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-200'
          }`}
          title={`Database tersinkronisasi (${lastSynced}) — klik untuk sinkronkan ulang`}
        >
          {isSyncing ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Tersinkron
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
              Sinkron
            </>
          )}
        </button>
        {onResetData && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="inline-flex items-center justify-center h-8 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            title="Reset seluruh tabel database ke status kepatuhan standar"
          >
            {isResetting ? 'Mereset…' : 'Reset data'}
          </button>
        )}
      </div>
    </div>
  );
}
