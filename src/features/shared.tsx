'use client';

import React from 'react';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import type { Severity } from '@/lib/fraud';
import type { ReviewStatus } from '@/lib/compliance';
import { useWorkspace } from '@/state/workspace';
import { Badge, Segmented, type Tone } from '@/ui';

export const SEVERITY_META: Record<Severity, { label: string; tone: Tone; icon: React.ReactNode; color: string }> = {
  critical: { label: 'Kritis', tone: 'danger', icon: <AlertOctagon />, color: '#d03b3b' },
  high: { label: 'Tinggi', tone: 'warning', icon: <AlertTriangle />, color: '#ec835a' },
  medium: { label: 'Sedang', tone: 'neutral', icon: <Info />, color: '#fab219' },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const m = SEVERITY_META[severity];
  return (
    <Badge tone={m.tone} className="[&_svg]:size-3">
      {m.icon}
      {m.label}
    </Badge>
  );
}

export const REVIEW_META: Record<ReviewStatus, { label: string; tone: Tone }> = {
  open: { label: 'Terbuka', tone: 'neutral' },
  proposed: { label: 'Menunggu checker', tone: 'warning' },
  confirmed: { label: 'Dikonfirmasi', tone: 'danger' },
  dismissed: { label: 'Ditolak (aman)', tone: 'success' },
};

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  const m = REVIEW_META[status];
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}

export function EntityName({ id, short }: { id: string; short?: boolean }) {
  const ws = useWorkspace();
  const e = ws.entityById(id);
  if (!e) return <span className="text-ink-3">{id}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span aria-hidden>{e.flag}</span>
      <span className="truncate">{short ? e.legalName.replace(/^PT\s+/, '').split(' ').slice(0, 2).join(' ') : e.legalName}</span>
    </span>
  );
}

export type Scope = 'entity' | 'group';

/** Entity ids in view: the active entity, or every entity the persona can access. */
export function useScopedIds(scope: Scope): string[] {
  const ws = useWorkspace();
  return scope === 'group' ? ws.accessibleEntities.map((e) => e.id) : [ws.activeEntityId];
}

export function ScopeToggle({ value, onChange }: { value: Scope; onChange: (s: Scope) => void }) {
  const ws = useWorkspace();
  return (
    <Segmented<Scope>
      value={value}
      onChange={onChange}
      items={[
        { id: 'entity', label: <span className="inline-flex items-center gap-1.5">{ws.activeEntity.flag} Entitas aktif</span> },
        { id: 'group', label: ws.isParentExec ? 'Seluruh grup' : 'Semua akses saya' },
      ]}
    />
  );
}

const MONTH_ID: Record<string, string> = { May: 'Mei', Aug: 'Agu', Oct: 'Okt', Dec: 'Des' };
export function shortMonth(label: string): string {
  const m = label.slice(0, 3);
  return MONTH_ID[m] ?? m;
}
