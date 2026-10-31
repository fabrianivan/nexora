'use client';

import React, { useMemo, useState } from 'react';
import { Bell, BellOff, CalendarDays, Check, ChevronLeft, ChevronRight, Download, List, Plus, RotateCcw } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { dateShort, daysUntil, relativeDays } from '@/lib/format';
import { eventStatus } from '@/lib/schedule';
import { downloadFile } from '@/lib/download';
import type { CalendarEvent } from '@/state/types';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  IconButton,
  PageHeader,
  Segmented,
  Select,
  SelectField,
  TextField,
  cn,
} from '@/ui';
import { ScopeToggle, useScopedIds, type Scope } from '../shared';

type View = 'list' | 'month';
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const STATUS_META = {
  Upcoming: { label: 'Akan datang', tone: 'neutral' as const },
  Today: { label: 'Hari ini', tone: 'warning' as const },
  Overdue: { label: 'Terlambat', tone: 'danger' as const },
  Completed: { label: 'Selesai', tone: 'success' as const },
};

function toIcs(events: CalendarEvent[], entityName: (id: string) => string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const body = events
    .map((e) => {
      const d = e.dueDate.replace(/-/g, '');
      return [
        'BEGIN:VEVENT',
        `UID:${e.id}@nexora`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${d}`,
        `SUMMARY:${esc(`${e.title} — ${entityName(e.entityId)}`)}`,
        `DESCRIPTION:${esc(`${e.description}\nDasar: ${e.regulationBasis}\nPIC: ${e.assignee}`)}`,
        'BEGIN:VALARM',
        'TRIGGER:-P3D',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(e.title)}`,
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n');
    })
    .join('\r\n');
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Nexora//Tax Calendar//ID\r\nCALSCALE:GREGORIAN\r\n${body}\r\nEND:VCALENDAR\r\n`;
}

function EventRow({ e }: { e: CalendarEvent }) {
  const ws = useWorkspace();
  const ui = useUi();
  const st = eventStatus(e);
  const ent = ws.entityById(e.entityId);
  const update = (patch: Partial<CalendarEvent>, msg: string, audit?: string) => {
    ws.setCalendar(ws.calendar.map((x) => (x.id === e.id ? { ...x, ...patch } : x)));
    if (audit) ws.logAudit(audit, e.title, `${ent?.legalName ?? ''} · ${dateShort(e.dueDate)}`);
    ui.toast(msg);
  };
  const [d, m] = dateShort(e.dueDate).split(' ');
  return (
    <li className="flex items-start gap-4 px-5 py-4">
      <div className={cn('w-12 shrink-0 rounded-lg border text-center py-1.5', st === 'Overdue' ? 'border-danger-100 bg-danger-50' : st === 'Completed' ? 'border-line bg-subtle opacity-60' : 'border-line bg-subtle')}>
        <div className={cn('text-[10px] uppercase', st === 'Overdue' ? 'text-danger-600' : 'text-ink-3')}>{m}</div>
        <div className={cn('text-base font-semibold num leading-tight', st === 'Overdue' ? 'text-danger-700' : 'text-ink')}>{d}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('text-sm font-medium', st === 'Completed' ? 'text-ink-3 line-through' : 'text-ink')}>{e.title}</span>
          <Badge tone={STATUS_META[st].tone} dot>{st === 'Completed' ? 'Selesai' : st === 'Upcoming' ? relativeDays(e.dueDate) : STATUS_META[st].label}</Badge>
        </div>
        <div className="text-[13px] text-ink-3 mt-0.5">{e.description}</div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
          <span>{ent?.flag} {ent?.legalName}</span>
          <span>{e.taxType}</span>
          <span>PIC {e.assignee}</span>
          <span>{e.regulationBasis}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <IconButton label={e.reminder ? 'Matikan pengingat' : 'Aktifkan pengingat (H-3)'} size="sm" onClick={() => update({ reminder: !e.reminder }, e.reminder ? 'Pengingat dimatikan.' : 'Pengingat H-3 diaktifkan.')}>
          {e.reminder ? <Bell className="text-brand-600" /> : <BellOff />}
        </IconButton>
        {st === 'Completed' ? (
          <IconButton label="Tandai belum selesai" size="sm" onClick={() => update({ status: 'Upcoming' }, 'Tenggat dibuka kembali.', 'REOPEN_DEADLINE')}>
            <RotateCcw />
          </IconButton>
        ) : (
          <Button size="sm" icon={<Check />} onClick={() => update({ status: 'Completed' }, 'Tenggat ditandai selesai.', 'COMPLETE_DEADLINE')}>
            Selesai
          </Button>
        )}
      </div>
    </li>
  );
}

function MonthGrid({ events, month, year }: { events: CalendarEvent[]; month: number; year: number }) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => i - offset + 1);
  const today = new Date();
  return (
    <div className="grid grid-cols-7 border-t border-line">
      {DAYS.map((d) => (
        <div key={d} className="px-2 py-2 text-xs font-medium text-ink-3 border-b border-line">{d}</div>
      ))}
      {cells.map((day, i) => {
        const inMonth = day >= 1 && day <= days;
        const iso = inMonth ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
        const evs = inMonth ? events.filter((e) => e.dueDate === iso) : [];
        const isToday = inMonth && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
        return (
          <div key={i} className={cn('min-h-[96px] border-b border-line p-1.5 text-xs', (i + 1) % 7 !== 0 && 'border-r', !inMonth && 'bg-subtle/60')}>
            {inMonth && (
              <>
                <div className={cn('size-6 rounded-full flex items-center justify-center num mb-1', isToday ? 'bg-ink text-white font-semibold' : 'text-ink-3')}>{day}</div>
                <div className="space-y-1">
                  {evs.map((e) => {
                    const st = eventStatus(e);
                    return (
                      <div
                        key={e.id}
                        title={`${e.title} — ${e.description}`}
                        className={cn(
                          'truncate rounded px-1.5 py-0.5 text-[11px]',
                          st === 'Overdue' ? 'bg-danger-50 text-danger-700' : st === 'Completed' ? 'bg-muted text-ink-3 line-through' : 'bg-brand-50 text-brand-800',
                        )}
                      >
                        {e.title}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AddEventDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ws = useWorkspace();
  const ui = useUi();
  const [f, setF] = useState({ entityId: ws.activeEntityId, title: '', taxType: '', dueDate: new Date().toISOString().slice(0, 10), assignee: ws.persona.name, regulationBasis: '', description: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const ent = ws.entityById(f.entityId);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tambah tenggat"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button
            variant="primary"
            disabled={f.title.trim().length < 3}
            onClick={() => {
              const e: CalendarEvent = { id: `EVT-${Date.now().toString(36).toUpperCase()}`, entityId: f.entityId, title: f.title.trim(), jurisdiction: `${ent?.flag} ${ent?.jurisdictionName}`, taxType: f.taxType || '-', dueDate: f.dueDate, status: 'Upcoming', assignee: f.assignee, regulationBasis: f.regulationBasis || '-', description: f.description || f.title, reminder: true };
              ws.setCalendar([...ws.calendar, e]);
              ws.logAudit('ADD_DEADLINE', e.title, `${ent?.legalName} · ${e.dueDate}`);
              ui.toast('Tenggat ditambahkan dengan pengingat H-3.');
              onClose();
            }}
          >
            Simpan
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Entitas" value={f.entityId} onChange={set('entityId')} className="sm:col-span-2">
          {ws.accessibleEntities.map((e) => <option key={e.id} value={e.id}>{e.flag} {e.legalName}</option>)}
        </SelectField>
        <TextField label="Judul" value={f.title} onChange={set('title')} className="sm:col-span-2" placeholder="Lapor SPT Masa PPh 23 November" />
        <TextField label="Jenis pajak" value={f.taxType} onChange={set('taxType')} />
        <TextField label="Tanggal jatuh tempo" type="date" value={f.dueDate} onChange={set('dueDate')} />
        <TextField label="PIC" value={f.assignee} onChange={set('assignee')} />
        <TextField label="Dasar hukum" value={f.regulationBasis} onChange={set('regulationBasis')} />
        <TextField label="Keterangan" value={f.description} onChange={set('description')} className="sm:col-span-2" />
      </div>
    </Dialog>
  );
}

export function CalendarPage() {
  const ws = useWorkspace();
  const ui = useUi();
  const [scope, setScope] = useState<Scope>(ws.isParentExec ? 'group' : 'entity');
  const ids = useScopedIds(scope);
  const [view, setView] = useState<View>('list');
  const [type, setType] = useState('all');
  const [showDone, setShowDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const now = new Date();
  const [cursor, setCursor] = useState({ m: now.getMonth(), y: now.getFullYear() });

  const scoped = useMemo(() => ws.calendar.filter((e) => ids.includes(e.entityId)), [ws.calendar, ids]);
  const types = Array.from(new Set(scoped.map((e) => e.taxType))).sort();
  const filtered = scoped.filter((e) => type === 'all' || e.taxType === type).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const visible = filtered.filter((e) => showDone || eventStatus(e) !== 'Completed');
  const overdue = filtered.filter((e) => eventStatus(e) === 'Overdue').length;
  const next30 = filtered.filter((e) => eventStatus(e) !== 'Completed' && daysUntil(e.dueDate) >= 0 && daysUntil(e.dueDate) <= 30).length;

  const groups = visible.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
    const k = e.dueDate.slice(0, 7);
    (acc[k] ||= []).push(e);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Kalender pajak"
        description={`${next30} tenggat dalam 30 hari${overdue ? ` · ${overdue} terlambat` : ''}. Status dihitung otomatis dari tanggal jatuh tempo.`}
        actions={
          <>
            <Button
              icon={<Download />}
              onClick={() => {
                downloadFile('nexora-kalender-pajak.ics', toIcs(visible, (id) => ws.entityById(id)?.legalName ?? id), 'text/calendar');
                ui.toast(`${visible.length} tenggat diekspor ke .ics (pengingat H-3).`);
              }}
            >
              Ekspor .ics
            </Button>
            <Button variant="primary" icon={<Plus />} onClick={() => setAdding(true)}>Tambah tenggat</Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <ScopeToggle value={scope} onChange={setScope} />
          <Segmented<View> value={view} onChange={setView} items={[{ id: 'list', label: 'Daftar', icon: <List /> }, { id: 'month', label: 'Bulan', icon: <CalendarDays /> }]} />
          <div className="w-48">
            <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Jenis pajak">
              <option value="all">Semua jenis pajak</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          {view === 'list' && (
            <label className="inline-flex items-center gap-2 text-[13px] text-ink-2 cursor-pointer">
              <input type="checkbox" className="size-4 accent-brand-600" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
              Tampilkan yang selesai
            </label>
          )}
        </div>
      </PageHeader>

      {view === 'list' ? (
        Object.keys(groups).length === 0 ? (
          <Card><EmptyState icon={<CalendarDays />} title="Tidak ada tenggat" description="Ubah filter atau tambahkan tenggat baru." /></Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groups).map(([k, evs]) => {
              const [y, m] = k.split('-').map(Number);
              return (
                <Card key={k}>
                  <div className="px-5 pt-4 pb-2 text-sm font-semibold text-ink">{MONTHS[m - 1]} {y}</div>
                  <ul className="divide-y divide-line border-t border-line">
                    {evs.map((e) => <EventRow key={e.id} e={e} />)}
                  </ul>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="text-sm font-semibold text-ink">{MONTHS[cursor.m]} {cursor.y}</div>
            <div className="flex items-center gap-1">
              <IconButton label="Bulan sebelumnya" size="sm" onClick={() => setCursor((c) => (c.m === 0 ? { m: 11, y: c.y - 1 } : { m: c.m - 1, y: c.y }))}><ChevronLeft /></IconButton>
              <Button size="xs" variant="ghost" onClick={() => setCursor({ m: now.getMonth(), y: now.getFullYear() })}>Hari ini</Button>
              <IconButton label="Bulan berikutnya" size="sm" onClick={() => setCursor((c) => (c.m === 11 ? { m: 0, y: c.y + 1 } : { m: c.m + 1, y: c.y }))}><ChevronRight /></IconButton>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <MonthGrid events={filtered} month={cursor.m} year={cursor.y} />
            </div>
          </div>
        </Card>
      )}
      <AddEventDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
