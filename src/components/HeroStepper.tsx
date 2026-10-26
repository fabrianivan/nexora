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
  ChevronRight
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

export function HeroStepper({ currentStep, onSelectStep, entityName }: HeroStepperProps) {
  return (
    <div className="bg-white border-b border-slate-200/90 shadow-2xs py-2 px-4 sm:px-8">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left Badge & Context */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            SIKLUS KEPATUHAN PAJAK
          </span>
          {entityName && (
            <span className="text-xs text-slate-700 font-semibold truncate max-w-[240px]">
              {entityName}
            </span>
          )}
        </div>

        {/* Horizontal Modern Stepper */}
        <div className="flex items-center overflow-x-auto w-full md:w-auto scrollbar-none py-0.5 gap-1.5">
          {HERO_STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = s.step < currentStep;
            const isCurrent = s.step === currentStep;

            return (
              <React.Fragment key={s.step}>
                <button
                  type="button"
                  onClick={() => onSelectStep(s.step)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isCurrent
                      ? 'bg-rose-600 text-white shadow-xs font-bold ring-2 ring-rose-600/20'
                      : isCompleted
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-white text-rose-700'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {isCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : s.step}
                  </span>
                  <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-white' : isCompleted ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span>{s.title}</span>
                </button>

                {idx < HERO_STEPS.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 hidden xl:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
