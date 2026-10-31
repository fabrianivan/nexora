'use client';

import React, { useState } from 'react';
import { Check, ChevronsUpDown, Lock } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { Popover, cn } from '@/ui';

export function EntitySwitcher() {
  const ws = useWorkspace();
  const ui = useUi();
  const [open, setOpen] = useState(false);
  const e = ws.activeEntity;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-muted transition cursor-pointer"
      >
        <span className="size-8 rounded-lg bg-muted border border-line flex items-center justify-center text-base shrink-0">{e.flag}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-ink truncate">{e.legalName}</span>
          <span className="block text-xs text-ink-3 truncate">
            {e.parentCompanyId ? 'Anak usaha' : 'Induk grup'} · {e.jurisdictionName}
          </span>
        </span>
        <ChevronsUpDown className="size-4 text-ink-4 shrink-0" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} align="left" className="w-[296px] p-1.5">
        <div className="px-2.5 pt-1.5 pb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-ink-3">Entitas aktif</span>
          <span className="text-[11px] text-ink-4">{ws.isParentExec ? 'Akses seluruh grup' : 'Akses terbatas'}</span>
        </div>
        <ul role="listbox" className="space-y-0.5">
          {ws.entities.map((ent) => {
            const allowed = ws.canAccess(ent.id);
            const selected = ent.id === e.id;
            return (
              <li key={ent.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setOpen(false);
                    if (!ws.selectEntity(ent.id)) {
                      ui.toast(`Akses ke ${ent.legalName} memerlukan otorisasi CEO induk (segregasi ISO 27001).`, 'warning');
                      return;
                    }
                    if (!selected) ui.toast(`Beralih ke ${ent.legalName}`, 'info');
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left cursor-pointer transition',
                    selected ? 'bg-brand-50' : 'hover:bg-muted',
                    !allowed && 'opacity-55',
                  )}
                >
                  <span className="text-lg leading-none">{ent.flag}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[13px] truncate', selected ? 'text-brand-700 font-medium' : 'text-ink')}>{ent.legalName}</span>
                    <span className="block text-xs text-ink-3 truncate">{ent.taxAuthority.split('(')[0].trim()}</span>
                  </span>
                  {selected ? <Check className="size-4 text-brand-600" /> : !allowed ? <Lock className="size-3.5 text-ink-4" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </Popover>
    </div>
  );
}
