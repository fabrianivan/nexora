'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CalendarClock, FileCheck2, ListChecks, ShieldAlert } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { daysUntil, dateShort, relativeDays } from '@/lib/format';
import { canApprove, isUnresolved } from '@/lib/compliance';
import { IconButton, Popover, EmptyState, cn } from '@/ui';

interface Note {
  id: string;
  icon: React.ReactNode;
  tone: 'danger' | 'warning' | 'brand';
  title: string;
  body: string;
  href: string;
}

export function useNotifications(): Note[] {
  const ws = useWorkspace();
  return useMemo(() => {
    const notes: Note[] = [];
    const scoped = ws.findings.filter((f) => ws.canAccess(f.entityId));
    const critical = scoped.filter((f) => f.severity === 'critical' && isUnresolved(ws.reviewOf(f.id).status));
    critical.slice(0, 3).forEach((f) => {
      const ent = ws.entityById(f.entityId);
      notes.push({ id: `crit-${f.id}`, icon: <ShieldAlert />, tone: 'danger', title: `Temuan kritis: ${f.ruleName}`, body: `${ent?.flag ?? ''} ${ent?.legalName ?? f.entityId} · ${f.evidence.split('\n')[0]}`, href: `/risk?f=${encodeURIComponent(f.id)}` });
    });
    const approvals = scoped.filter((f) => canApprove(ws.reviewOf(f.id), ws.actor).ok);
    if (approvals.length) {
      notes.push({ id: 'approvals', icon: <ListChecks />, tone: 'warning', title: `${approvals.length} usulan menunggu persetujuan Anda`, body: 'Sebagai checker, tinjau usulan maker sebelum koreksi diterapkan.', href: '/review?tab=proposed' });
    }
    ws.accessibleEntities
      .filter((e) => ws.returnFor(e.id).returnStatus === 'Review')
      .forEach((e) =>
        notes.push({ id: `spt-${e.id}`, icon: <FileCheck2 />, tone: 'brand', title: `SPT tahunan ${e.legalName} menunggu checker`, body: 'Draf sudah diajukan maker dan menunggu persetujuan Group CFO/CEO.', href: '/tax-return' }),
      );
    ws.calendar
      .filter((e) => ws.canAccess(e.entityId) && e.status !== 'Completed')
      .map((e) => ({ e, d: daysUntil(e.dueDate) }))
      .filter(({ d }) => d <= 14)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .forEach(({ e, d }) => {
        notes.push({ id: `cal-${e.id}`, icon: <CalendarClock />, tone: d < 0 ? 'danger' : 'warning', title: e.title, body: `${e.jurisdiction} · ${dateShort(e.dueDate)} (${relativeDays(e.dueDate)})`, href: '/calendar' });
      });
    return notes;
  }, [ws]);
}

export function Notifications() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const notes = useNotifications();
  const router = useRouter();
  const unread = notes.filter((n) => !seen.has(n.id)).length;

  return (
    <div className="relative">
      <IconButton label="Notifikasi" onClick={() => setOpen((v) => !v)} className="relative">
        <Bell />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger-500 ring-2 ring-surface" />}
      </IconButton>
      <Popover open={open} onClose={() => setOpen(false)} className="w-[min(380px,calc(100vw-1.5rem))]">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-line">
          <span className="text-sm font-semibold text-ink">Notifikasi</span>
          <button type="button" className="text-xs text-ink-3 hover:text-ink cursor-pointer" onClick={() => setSeen(new Set(notes.map((n) => n.id)))}>
            Tandai semua dibaca
          </button>
        </div>
        {notes.length === 0 ? (
          <EmptyState icon={<Bell />} title="Semua beres" description="Tidak ada temuan kritis, persetujuan, atau tenggat dekat." />
        ) : (
          <ul className="max-h-[420px] overflow-y-auto p-1.5">
            {notes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSeen((s) => new Set(s).add(n.id));
                    setOpen(false);
                    router.push(n.href);
                  }}
                  className="w-full flex items-start gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-muted cursor-pointer"
                >
                  <span
                    className={cn(
                      'mt-0.5 size-7 rounded-lg flex items-center justify-center shrink-0 [&_svg]:size-4',
                      n.tone === 'danger' ? 'bg-danger-50 text-danger-600' : n.tone === 'warning' ? 'bg-warning-50 text-warning-600' : 'bg-brand-50 text-brand-600',
                    )}
                  >
                    {n.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-ink truncate">{n.title}</span>
                      {!seen.has(n.id) && <span className="size-1.5 rounded-full bg-brand-500 shrink-0" />}
                    </span>
                    <span className="block text-xs text-ink-3 mt-0.5 line-clamp-2">{n.body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Popover>
    </div>
  );
}
