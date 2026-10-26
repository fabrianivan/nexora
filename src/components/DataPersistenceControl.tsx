'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  Check, 
  HelpCircle, 
  ShieldCheck, 
  Cpu 
} from 'lucide-react';

export interface DataPersistenceControlProps {
  onResetSampleData: () => void;
  isLiveGemini?: boolean;
}

export function DataPersistenceControl({ onResetSampleData, isLiveGemini = false }: DataPersistenceControlProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = () => {
    onResetSampleData();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2500);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Live / Demo Transparency Badge */}
      <div className="relative">
        <button
          type="button"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(!showTooltip)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border transition-all ${
            isLiveGemini
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isLiveGemini ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>{isLiveGemini ? 'Live Gemini AI' : 'Demo Mode (Simulasi Lokal)'}</span>
          <HelpCircle className="w-3 h-3 text-slate-400" />
        </button>

        {showTooltip && (
          <div className="absolute right-0 top-8 z-50 w-72 bg-slate-900 border border-slate-700 text-white rounded-xl p-3 text-[11px] shadow-2xl leading-relaxed">
            <div className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>Transparansi Arsitektur AI & Data</span>
            </div>
            {isLiveGemini ? (
              <p className="text-slate-300">
                Terhubung langsung ke Google Cloud Gemini API untuk ekstraksi OCR & RAG copilot secara real-time.
              </p>
            ) : (
              <p className="text-slate-300">
                Berjalan dalam <strong>Smart Demo Mode</strong>: seluruh ekstraksi dokumen, skor Z-score, aturan fraud, dan rekonsiliasi fiskal diproses secara deterministik di server/klien tanpa biaya atau kebutuhan API key.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 1-Click Load Sample Data Button */}
      <button
        type="button"
        onClick={handleReset}
        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors shadow-xs"
        title="Muat ulang dataset multi-entitas contoh lengkap dalam 1 klik"
      >
        {resetSuccess ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400">Data Contoh Termuat!</span>
          </>
        ) : (
          <>
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Data Contoh</span>
          </>
        )}
      </button>
    </div>
  );
}
