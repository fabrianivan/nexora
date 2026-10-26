'use client';

import React from 'react';
import { 
  Building2, 
  FileText, 
  ShieldAlert, 
  UserCheck, 
  Calculator, 
  FileCheck2, 
  CreditCard,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export interface HeroStepperProps {
  currentStep: number; // 1 to 7
  onSelectStep: (stepNumber: number) => void;
  entityName?: string;
}

export const HERO_STEPS = [
  { step: 1, title: 'Entitas & Struktur', icon: Building2, desc: 'Profil korporasi & hierarki' },
  { step: 2, title: 'Upload & Ekstraksi', icon: FileText, desc: 'Document AI & OCR' },
  { step: 3, title: 'Deteksi Risiko', icon: ShieldAlert, desc: 'TBTS, Z-Score & Anomali' },
  { step: 4, title: 'Review Manusia', icon: UserCheck, desc: 'Verifikasi bukti & catatan' },
  { step: 5, title: 'Rekonsiliasi Fiskal', icon: Calculator, desc: 'Laba komersial ke fiskal' },
  { step: 6, title: 'Draf SPT & Approval', icon: FileCheck2, desc: 'Maker-checker & ekspor' },
  { step: 7, title: 'Billing & Kalender', icon: CreditCard, desc: 'Kode bayar & tenggat' },
];

export function HeroStepper({ currentStep, onSelectStep, entityName }: HeroStepperProps) {
  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-600/30 text-blue-400 border border-blue-500/30">
            HERO FLOW SIKLUS KEPATUHAN
          </span>
          {entityName && (
            <span className="text-xs text-slate-300 font-medium truncate max-w-[200px]">
              • {entityName}
            </span>
          )}
        </div>

        {/* Horizontal Stepper */}
        <div className="flex items-center overflow-x-auto w-full md:w-auto scrollbar-none py-1 gap-1">
          {HERO_STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = s.step < currentStep;
            const isCurrent = s.step === currentStep;

            return (
              <React.Fragment key={s.step}>
                <button
                  type="button"
                  onClick={() => onSelectStep(s.step)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                      : isCompleted
                      ? 'bg-slate-800/80 text-emerald-400 hover:bg-slate-800'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  title={`${s.step}. ${s.title}: ${s.desc}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-white' : 'text-slate-400'}`} />
                  )}
                  <span>{s.step}. {s.title}</span>
                </button>
                {idx < HERO_STEPS.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
