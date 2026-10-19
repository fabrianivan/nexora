import React from 'react';
import {
  Building2,
  Users,
  BookOpen,
  Calendar,
  BarChart3,
  Calculator,
  FileCheck2,
  CreditCard,
  X,
  GitBranch,
} from 'lucide-react';

export type PrimaryNav = 'companies' | 'calculation' | 'tax_return' | 'payment';
export type SubNav = 'corporate' | 'individual' | 'studies' | 'calendar' | 'reports';

export interface SidebarNavProps {
  primaryNav: PrimaryNav;
  subNav: SubNav;
  onNavigate: (primary: PrimaryNav, sub?: SubNav) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function SidebarNav({
  primaryNav,
  subNav,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}: SidebarNavProps) {
  const companyNavItems = [
    { id: 'corporate', label: 'Corporate Management', icon: Building2 },
    { id: 'individual', label: 'Individual & UBO', icon: Users },
    { id: 'studies', label: 'Studies & Fraud Engine', icon: BookOpen },
    { id: 'calendar', label: 'Tax Calendar', icon: Calendar },
    { id: 'reports', label: 'Compliance Reports', icon: BarChart3 },
  ] as const;

  const complianceNavItems = [
    { id: 'calculation', label: 'Fiscal Calculation', icon: Calculator },
    { id: 'tax_return', label: 'Tax Return & Forms', icon: FileCheck2 },
    { id: 'payment', label: 'Tax Payment & Billing', icon: CreditCard },
  ] as const;

  const content = (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-300 w-64 select-none">
      {/* Top Mobile Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            NX
          </div>
          <span className="font-bold text-white text-sm">Nexora Navigation</span>
        </div>
        <button
          onClick={onCloseMobile}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {/* Group 1: Companies & Governance */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <GitBranch className="w-3 h-3 text-blue-400" />
            <span>Companies & Governance</span>
          </div>
          <div className="space-y-0.5">
            {companyNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = primaryNav === 'companies' && subNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate('companies', item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/20 text-white font-semibold border-l-2 border-blue-500 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Group 2: Compliance & Operations */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calculator className="w-3 h-3 text-emerald-400" />
            <span>Compliance & Filing</span>
          </div>
          <div className="space-y-0.5">
            {complianceNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = primaryNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/20 text-white font-semibold border-l-2 border-blue-500 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3.5 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <span>AI Builder Cup 2026</span>
          <span className="text-emerald-400 font-mono text-[10px]">Track 1: BFSI</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-slate-800 z-20">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0F172A] z-10 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
