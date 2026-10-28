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
  Check,
} from 'lucide-react';

export interface HeroStepperProps {
  currentStep: number; // 1 to 7
  onSelectStep: (stepNumber: number) => void;
  entityName?: string;
}

export const HERO_STEPS = [
  { step: 1, title: 'Struktur Entitas', icon: Building2, desc: 'UPE & Hierarki' },
  { step: 2, title: 'Scanner Dokumen', icon: FileText, desc: 'e-Faktur & Dokumen' },
  { step: 3, title: 'Deteksi Risiko', icon: ShieldAlert, desc: 'TBTS & Z-Score' },
  { step: 4, title: 'Review Temuan', icon: UserCheck, desc: 'Verifikasi Bukti' },
  { step: 5, title: 'Rekonsiliasi Fiskal', icon: Calculator, desc: 'Koreksi & Pasal 31E' },
  { step: 6, title: 'Draf SPT 1771', icon: FileCheck2, desc: 'Maker-Checker' },
  { step: 7, title: 'Billing & Jadwal', icon: CreditCard, desc: 'e-Billing & NTPN' },
];

export function HeroStepper({ currentStep, onSelectStep }: HeroStepperProps) {
  const progress = ((currentStep - 1) / (HERO_STEPS.length - 1)) * 100;

  return (
    <div className="border-b border-slate-200/70 bg-white/60 backdrop-blur-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-4">
        <div className="hidden 2xl:flex flex-col shrink-0 w-36">
          <span className="text-[11px] font-semibold text-slate-500">Siklus kepatuhan</span>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-slate-200/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-[width] duration-500"
                style={{ width: `${Math.max(progress, 4)}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 tabular">
              {currentStep}/{HERO_STEPS.length}
            </span>
          </div>
        </div>

        <ol className="flex-1 min-w-0 flex items-center 2xl:justify-end gap-0.5 overflow-x-auto scrollbar-none mask-fade-x py-0.5" aria-label="Langkah siklus kepatuhan">
          {HERO_STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = s.step < currentStep;
            const isCurrent = s.step === currentStep;
            return (
              <li key={s.step} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectStep(s.step)}
                  aria-current={isCurrent ? 'step' : undefined}
                  title={`${s.title} — ${s.desc}`}
                  className={`group flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-[12px] font-medium transition cursor-pointer whitespace-nowrap ${
                    isCurrent
                      ? 'bg-ink-900 text-white shadow-md shadow-ink-900/15'
                      : isCompleted
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                      isCurrent
                        ? 'bg-brand-500 text-white'
                        : isCompleted
                        ? 'bg-emerald-500/15 text-emerald-700'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : s.step}
                  </span>
                  {isCurrent && <Icon className="w-3.5 h-3.5 text-brand-300 hidden sm:block" />}
                  <span>{s.title}</span>
                </button>
                {idx < HERO_STEPS.length - 1 && (
                  <span className={`w-3 h-px mx-0.5 ${isCompleted ? 'bg-emerald-400/60' : 'bg-slate-300/70'}`} aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
