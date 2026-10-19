import React from 'react';
import { Menu, ChevronDown, Bot, ShieldCheck } from 'lucide-react';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';

export interface TopHeaderProps {
  activePersona: {
    name: string;
    title: string;
    avatarBg: string;
    avatarInitials: string;
    badge: string;
  };
  selectedEntity: {
    flag: string;
    countryCode: string;
    legalName: string;
    entityType: string;
  };
  onOpenRbac: () => void;
  onToggleChat: () => void;
  onToggleMobileMenu: () => void;
  isChatOpen: boolean;
}

export function TopHeader({
  activePersona,
  selectedEntity,
  onOpenRbac,
  onToggleChat,
  onToggleMobileMenu,
  isChatOpen,
}: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200/80 shadow-2xs">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger + Brand logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs select-none">
              NX
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  Nexora
                </span>
                <Badge tone="info" size="sm" className="hidden sm:inline-flex uppercase text-[10px]">
                  Corporate Tax
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Active Entity Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-semibold text-slate-900">Active Entity:</span>
          <span className="truncate max-w-[260px] font-medium">
            {selectedEntity.flag} {selectedEntity.countryCode} — {selectedEntity.legalName}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">({selectedEntity.entityType})</span>
        </div>

        {/* Right: Persona / RBAC Button + Copilot Toggle */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={onToggleChat}
            leftIcon={<Bot className="w-4 h-4 text-blue-600" />}
            className="hidden sm:inline-flex"
            aria-label="Open AI Copilot"
          >
            {isChatOpen ? 'Hide Copilot' : 'AI Copilot'}
          </Button>

          <button
            type="button"
            onClick={onOpenRbac}
            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-slate-50 border border-slate-200 transition cursor-pointer text-left shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
            title="RBAC Governance & Persona Switcher"
          >
            <div
              className={`w-7 h-7 rounded-full ${activePersona.avatarBg} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
            >
              {activePersona.avatarInitials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="flex items-center gap-1">
                <span className="block text-xs font-semibold text-slate-900 leading-tight truncate max-w-[120px]">
                  {activePersona.name.split(',')[0]}
                </span>
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
              </div>
              <span className="block text-[10px] text-slate-500 truncate max-w-[130px]">
                {activePersona.badge}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
