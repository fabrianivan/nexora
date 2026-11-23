'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Lock, LogOut, Settings2, ShieldCheck, Users } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { roleDefFor } from '@/lib/account';
import { Avatar, Badge, Button, Dialog, Popover, Table, TD, TH, THead, TR, TextField, cn } from '@/ui';

export function AccountMenu() {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [matrix, setMatrix] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [displayName, setDisplayName] = useState(ws.persona.name);
  const p = ws.persona;
  const member = ws.activeMember;
  const roleDef = roleDefFor(member.roleId);
  const waitingCount = ws.account.members.filter((m) => m.status === 'waiting' || m.roleId === 'view_only').length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-md hover:bg-muted cursor-pointer"
        aria-label="Akun & peran"
      >
        <Avatar initials={p.avatarInitials} className={p.avatarBg} />
        <span className="hidden xl:block text-left leading-tight max-w-[170px]">
          <span className="block text-[13px] font-medium text-ink truncate">{p.name}</span>
          <span className="block text-[11px] text-ink-3 truncate">{member.isOwner ? `Pemilik · ${roleDef.label}` : ws.actor.role}</span>
        </span>
        <ChevronDown className="size-3.5 text-ink-4 hidden sm:block" />
      </button>

      <Popover open={open} onClose={() => setOpen(false)} className="w-[min(340px,calc(100vw-1.5rem))] p-1.5">
        <div className="px-3 pt-2.5 pb-3 flex items-start gap-3 border-b border-line mb-1.5">
          <Avatar initials={p.avatarInitials} className={p.avatarBg} size="lg" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink truncate">{p.name}</div>
            <div className="text-xs text-ink-3 truncate">{p.email}</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {member.isOwner && <Badge tone="dark">Pemilik</Badge>}
              <Badge tone={ws.isParentExec ? 'brand' : ws.isViewOnly ? 'warning' : 'neutral'}>
                {ws.isParentExec ? `Melihat ${ws.entities.length} entitas` : ws.isViewOnly ? 'Menunggu peran' : `Akses ${p.accessibleEntityIds.length} entitas`}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-px pb-1.5 mb-1.5 border-b border-line">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push('/settings/team');
            }}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[13px] text-ink-2 hover:bg-muted hover:text-ink cursor-pointer"
          >
            <span className="inline-flex items-center gap-2.5">
              <Users className="size-4 text-ink-3" />
              <span>Tim & peran</span>
            </span>
            {waitingCount > 0 && <Badge tone="warning" dot>{waitingCount} menunggu</Badge>}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setDisplayName(p.name);
              setSettingsOpen(true);
            }}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[13px] text-ink-2 hover:bg-muted hover:text-ink cursor-pointer"
          >
            <span className="inline-flex items-center gap-2.5">
              <Settings2 className="size-4 text-ink-3" />
              <span>Pengaturan akun</span>
            </span>
            <span className="text-[11px] text-ink-4">Profil & sandi</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setMatrix(true);
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-ink-2 hover:bg-muted hover:text-ink cursor-pointer"
          >
            <ShieldCheck className="size-4 text-ink-3" />
            Matriks hak akses & segregasi tugas
          </button>
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
                className={cn('w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left hover:bg-muted cursor-pointer', !ws.isViewOnly && x.id === p.id && 'bg-muted')}
              >
                <Avatar initials={x.avatarInitials} className={x.avatarBg} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-ink truncate">{x.name}</span>
                  <span className="block text-[11px] text-ink-3 truncate">{x.title}</span>
                </span>
                {!ws.isViewOnly && x.id === p.id ? <Check className="size-4 text-brand-600" /> : x.entityRole === 'SUBSIDIARY' ? <Lock className="size-3.5 text-ink-4" /> : null}
              </button>
            </li>
          ))}
        </ul>

        <div className="border-t border-line mt-1.5 pt-1.5">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push('/sign-in');
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-ink-2 hover:bg-muted hover:text-ink cursor-pointer"
          >
            <LogOut className="size-4 text-ink-3" />
            Keluar / ganti akun
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

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        size="sm"
        title="Pengaturan akun"
        description={`Masuk sebagai ${p.email}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>Tutup</Button>
            <Button
              variant="primary"
              onClick={() => {
                ws.updateAccount((prev) => ({
                  ...prev,
                  members: prev.members.map((m) => (m.id === member.id ? { ...m, name: displayName.trim() || m.name } : m)),
                }));
                ws.logAudit('UPDATE_ACCOUNT_SETTINGS', p.email, `Profil akun diperbarui (${displayName.trim() || p.name}).`);
                ui.toast('Pengaturan akun disimpan.');
                setSettingsOpen(false);
              }}
            >
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <TextField label="Nama tampilan" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <TextField label="Email kerja" value={p.email} disabled />
          <div className="rounded-lg border border-line bg-subtle px-3.5 py-2.5 flex items-center justify-between text-xs">
            <span className="text-ink-3">Kata sandi & sesi</span>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(false);
                router.push('/reset-password');
              }}
              className="font-medium text-brand-700 hover:underline cursor-pointer"
            >
              Atur ulang sandi
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
