'use client';

import React, { useState } from 'react';
import { ChevronDown, ShieldCheck, Check, Lock } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { Avatar, Popover, Dialog, Badge, Button, cn } from '@/ui';
import { Table, THead, TH, TR, TD } from '@/ui';

export function AccountMenu() {
  const ws = useWorkspace();
  const ui = useUi();
  const [open, setOpen] = useState(false);
  const [matrix, setMatrix] = useState(false);
  const p = ws.persona;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg hover:bg-muted cursor-pointer"
        aria-label="Akun & peran"
      >
        <Avatar initials={p.avatarInitials} className={p.avatarBg} />
        <span className="hidden xl:block text-left leading-tight max-w-[170px]">
          <span className="block text-[13px] font-medium text-ink truncate">{p.name}</span>
          <span className="block text-[11px] text-ink-3 truncate">{ws.actor.role}</span>
        </span>
        <ChevronDown className="size-3.5 text-ink-4 hidden sm:block" />
      </button>

      <Popover open={open} onClose={() => setOpen(false)} className="w-[min(340px,calc(100vw-1.5rem))] p-1.5">
        <div className="px-3 pt-2.5 pb-3 flex items-start gap-3 border-b border-line mb-1.5">
          <Avatar initials={p.avatarInitials} className={p.avatarBg} size="lg" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink truncate">{p.name}</div>
            <div className="text-xs text-ink-3 truncate">{p.title}</div>
            <div className="mt-1.5">
              <Badge tone={ws.isParentExec ? 'brand' : 'warning'}>{ws.isParentExec ? 'Akses seluruh grup' : `Akses ${p.accessibleEntityIds.length} entitas`}</Badge>
            </div>
          </div>
        </div>
        <div className="px-2.5 pt-1 pb-1 text-[11px] font-medium text-ink-4 uppercase tracking-wider">Ganti peran (demo RBAC)</div>
        <ul className="space-y-px">
          {ws.personas.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => {
                  ws.setPersonaId(x.id);
                  setOpen(false);
                  ui.toast(`Masuk sebagai ${x.name}`, 'info');
                }}
                className={cn('w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left hover:bg-muted cursor-pointer', x.id === p.id && 'bg-muted')}
              >
                <Avatar initials={x.avatarInitials} className={x.avatarBg} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-ink truncate">{x.name}</span>
                  <span className="block text-[11px] text-ink-3 truncate">{x.title}</span>
                </span>
                {x.id === p.id ? <Check className="size-4 text-brand-600" /> : x.entityRole === 'SUBSIDIARY' ? <Lock className="size-3.5 text-ink-4" /> : null}
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-line mt-1.5 pt-1.5">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setMatrix(true);
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-ink-2 hover:bg-muted cursor-pointer"
          >
            <ShieldCheck className="size-4 text-ink-3" />
            Matriks hak akses & segregasi tugas
          </button>
        </div>
      </Popover>

      <Dialog
        open={matrix}
        onClose={() => setMatrix(false)}
        size="lg"
        title="Matriks hak akses (RBAC)"
        description="Eksekutif induk melihat seluruh entitas; staf anak usaha dibatasi pada yurisdiksinya. Maker tidak boleh menyetujui usulannya sendiri."
        footer={<Button onClick={() => setMatrix(false)}>Tutup</Button>}
      >
        <Table className="-mx-6">
          <THead>
            <tr>
              <TH>Peran</TH>
              {ws.entities.map((e) => (
                <TH key={e.id} align="center">{e.flag}</TH>
              ))}
              <TH align="center">Checker</TH>
            </tr>
          </THead>
          <tbody>
            {ws.personas.map((x) => {
              const parent = x.canViewAll && x.entityRole === 'PARENT';
              return (
                <TR key={x.id}>
                  <TD>
                    <div className="text-ink font-medium">{x.name}</div>
                    <div className="text-xs text-ink-3">{x.title}</div>
                  </TD>
                  {ws.entities.map((e) => (
                    <TD key={e.id} align="center">
                      {parent || x.accessibleEntityIds.includes(e.id) ? <Check className="size-4 text-success-600 inline" /> : <span className="text-ink-4">—</span>}
                    </TD>
                  ))}
                  <TD align="center">{parent ? <Check className="size-4 text-success-600 inline" /> : <span className="text-ink-4">—</span>}</TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      </Dialog>
    </div>
  );
}
