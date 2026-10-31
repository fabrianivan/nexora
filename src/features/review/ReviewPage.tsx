'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeftRight, Check, CheckCheck, CircleSlash, ListChecks, RotateCcw, Scale, Undo2, UserCog } from 'lucide-react';
import {
  applyCorrectionToItems,
  canApprove,
  decide,
  isCorrectionReflected,
  isUnresolved,
  markCorrectionApplied,
  proposeDecision,
  reopen,
  type FindingReview,
  type ReviewAction,
  type RiskFinding,
} from '@/lib/compliance';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { money } from '@/lib/format';
import { Avatar, Badge, Button, Callout, Card, EmptyState, PageHeader, Tabs, Textarea, cn } from '@/ui';
import { CycleFooter } from '@/shell/CycleFooter';
import { EntityName, ReviewBadge, SeverityBadge } from '../shared';
import { FindingDetail } from '../risk/RiskPage';

type Tab = 'todo' | 'proposed' | 'done';

function DecisionPanel({ finding }: { finding: RiskFinding }) {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();
  const review = ws.reviewOf(finding.id);
  const [action, setAction] = useState<ReviewAction>('confirm');
  const [note, setNote] = useState('');
  const [checkerNote, setCheckerNote] = useState('');
  useEffect(() => {
    setNote('');
    setCheckerNote('');
    setAction('confirm');
  }, [finding.id]);

  const write = (next: FindingReview) => ws.updateCompliance((s) => ({ ...s, reviews: { ...s.reviews, [finding.id]: next } }));
  const target = `${finding.ruleName} · ${ws.entityById(finding.entityId)?.legalName ?? finding.entityId}`;
  const approval = canApprove(review, ws.actor);
  const checker = ws.personas.find((p) => p.canViewAll && p.entityRole === 'PARENT' && p.id !== review.proposal?.byId);

  const propose = () => {
    try {
      write(proposeDecision(review, ws.actor, action, note));
      ws.logAudit('PROPOSE_FINDING', target, `${action === 'confirm' ? 'Konfirmasi' : 'Tolak'}: ${note.trim()}`);
      ui.toast('Usulan dikirim ke checker.');
    } catch (e) {
      ui.toast((e as Error).message, 'warning');
    }
  };

  const approve = (ok: boolean) => {
    try {
      write(decide(review, ws.actor, ok, checkerNote));
      ws.logAudit(ok ? 'APPROVE_FINDING' : 'RETURN_FINDING', target, ok ? `Disetujui: ${review.proposal?.action === 'confirm' ? 'temuan dikonfirmasi' : 'temuan ditolak (aman)'}` : `Dikembalikan ke maker. ${checkerNote}`);
      ui.toast(ok ? 'Keputusan disetujui.' : 'Usulan dikembalikan ke maker.', ok ? 'success' : 'info');
    } catch (e) {
      ui.toast((e as Error).message, 'warning');
    }
  };

  const calc = ws.calculationFor(finding.entityId);
  const reflected = finding.correction ? isCorrectionReflected(calc.items, finding.correction, `[${finding.id}]`) : false;
  const canApplyHere = Boolean(finding.correction && calc.items.some((i) => i.accountCode === finding.correction?.accountCode));

  const applyCorrection = () => {
    if (!finding.correction) return;
    if (!reflected) {
      const { items, changed } = applyCorrectionToItems(calc.items, finding.correction, `[${finding.id}]`, finding.ruleName);
      if (changed) ws.setCalculation(finding.entityId, { ...calc, items });
    }
    const detail = `Akun ${finding.correction.accountCode} · +${money(finding.correction.amount, finding.country)}${reflected ? ' (sudah tercermin)' : ''}`;
    write(markCorrectionApplied(review, ws.actor, detail));
    ws.logAudit('APPLY_FISCAL_CORRECTION', target, detail);
    ui.toast(reflected ? 'Ditandai: koreksi sudah tercermin di rekonsiliasi.' : 'Koreksi fiskal diterapkan ke rekonsiliasi.', 'success', { label: 'Buka rekonsiliasi', onClick: () => router.push('/calculation') });
  };

  return (
    <div className="rounded-xl border border-line bg-subtle p-4 space-y-3">
      {review.status === 'open' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">Usulan keputusan (maker)</h3>
            <span className="text-xs text-ink-3">sebagai {ws.persona.name.split(',')[0]}</span>
          </div>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Keputusan">
            {(
              [
                { id: 'confirm', label: 'Konfirmasi temuan', desc: finding.correction ? 'Terapkan koreksi fiskal' : 'Tindak lanjuti risiko', icon: <Check /> },
                { id: 'dismiss', label: 'Tolak (aman)', desc: 'Bukti cukup, bukan risiko', icon: <CircleSlash /> },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={action === o.id}
                onClick={() => setAction(o.id)}
                className={cn(
                  'text-left rounded-lg border px-3 py-2.5 bg-surface cursor-pointer transition [&_svg]:size-4',
                  action === o.id ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-line hover:border-line-strong',
                )}
              >
                <span className="flex items-center gap-2 text-[13px] font-medium text-ink">{o.icon}{o.label}</span>
                <span className="block text-xs text-ink-3 mt-0.5">{o.desc}</span>
              </button>
            ))}
          </div>
          <Textarea aria-label="Catatan maker" placeholder="Alasan & bukti yang diperiksa (wajib, min. 5 karakter)…" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          <div className="flex justify-end">
            <Button variant="primary" icon={<ArrowLeftRight />} onClick={propose} disabled={note.trim().length < 5}>
              Ajukan ke checker
            </Button>
          </div>
        </>
      )}

      {review.status === 'proposed' && review.proposal && (
        <>
          <div className="flex items-start gap-3">
            <Avatar initials={review.proposal.by.split(' ').map((x) => x[0]).slice(0, 2).join('')} size="sm" className="bg-ink-3" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-ink">
                <span className="font-medium">{review.proposal.by}</span> mengusulkan{' '}
                <Badge tone={review.proposal.action === 'confirm' ? 'danger' : 'success'}>{review.proposal.action === 'confirm' ? 'Konfirmasi' : 'Tolak (aman)'}</Badge>
              </div>
              <p className="text-[13px] text-ink-2 mt-1">“{review.proposal.note}”</p>
            </div>
          </div>
          {approval.ok ? (
            <>
              <Textarea aria-label="Catatan checker" placeholder="Catatan checker (opsional)…" value={checkerNote} onChange={(e) => setCheckerNote(e.target.value)} rows={2} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button icon={<Undo2 />} onClick={() => approve(false)}>Kembalikan</Button>
                <Button variant="primary" icon={<CheckCheck />} onClick={() => approve(true)}>Setujui</Button>
              </div>
            </>
          ) : (
            <Callout
              tone="warning"
              icon={<UserCog />}
              title="Menunggu checker"
              action={
                checker && (
                  <Button size="sm" onClick={() => { ws.setPersonaId(checker.id); ui.toast(`Masuk sebagai ${checker.name} (checker)`, 'info'); }}>
                    Masuk sebagai {checker.name.split(',')[0].split(' ').slice(0, 2).join(' ')}
                  </Button>
                )
              }
            >
              {approval.reason}
            </Callout>
          )}
        </>
      )}

      {(review.status === 'confirmed' || review.status === 'dismissed') && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ReviewBadge status={review.status} />
              <span className="text-xs text-ink-3">oleh {review.decidedBy}</span>
            </div>
            {ws.isParentExec && (
              <Button size="xs" variant="ghost" icon={<RotateCcw />} onClick={() => { write(reopen(review, ws.actor)); ws.logAudit('REOPEN_FINDING', target, 'Temuan dibuka kembali.'); ui.toast('Temuan dibuka kembali.'); }}>
                Buka kembali
              </Button>
            )}
          </div>
          {review.status === 'confirmed' && finding.correction && (
            review.correctionApplied ? (
              <Callout tone="success" icon={<Scale />} title="Koreksi fiskal sudah diterapkan">
                Akun {finding.correction.accountCode} · {money(finding.correction.amount, finding.country)}
              </Callout>
            ) : canApplyHere ? (
              <Callout
                tone="brand"
                icon={<Scale />}
                title={reflected ? 'Koreksi sudah tercermin di rekonsiliasi' : 'Koreksi fiskal siap diterapkan'}
                action={<Button size="sm" variant="primary" onClick={applyCorrection}>{reflected ? 'Tandai selesai' : 'Terapkan'}</Button>}
              >
                Akun {finding.correction.accountCode} · +{money(finding.correction.amount, finding.country)} ke koreksi positif.
              </Callout>
            ) : (
              <Callout tone="neutral" icon={<Scale />}>Rekonsiliasi entitas ini dikelola di sistem lokal; catat koreksi secara manual.</Callout>
            )
          )}
        </>
      )}
    </div>
  );
}

export function ReviewPage() {
  const ws = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const initialTab = (params.get('tab') as Tab) || 'todo';
  const [tab, setTab] = useState<Tab>(initialTab);
  const scoped = useMemo(() => ws.findings.filter((f) => ws.canAccess(f.entityId)), [ws]);
  const groups = {
    todo: scoped.filter((f) => ws.reviewOf(f.id).status === 'open'),
    proposed: scoped.filter((f) => ws.reviewOf(f.id).status === 'proposed'),
    done: scoped.filter((f) => !isUnresolved(ws.reviewOf(f.id).status)),
  };
  const list = groups[tab];
  const paramId = params.get('f');
  const [selectedId, setSelectedId] = useState<string | null>(paramId);

  // When arriving with ?f=, jump to the tab that holds the finding.
  useEffect(() => {
    if (!paramId) return;
    const st = ws.reviewOf(paramId).status;
    setTab(st === 'open' ? 'todo' : st === 'proposed' ? 'proposed' : 'done');
    setSelectedId(paramId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramId]);

  const selected = list.find((f) => f.id === selectedId) ?? list[0];
  const pendingCorrections = groups.done.filter((f) => ws.reviewOf(f.id).status === 'confirmed' && f.correction && !ws.reviewOf(f.id).correctionApplied).length;

  return (
    <div>
      <PageHeader
        eyebrow={<span>Langkah 4 · Siklus kepatuhan</span>}
        title="Review temuan"
        description="Setiap keputusan melewati dua orang: maker mengusulkan dengan alasan, checker induk menyetujui. Temuan yang dikonfirmasi mengalir ke rekonsiliasi fiskal."
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 h-9 text-[13px]">
            <Avatar initials={ws.persona.avatarInitials} size="sm" className={ws.persona.avatarBg} />
            <span className="text-ink-2">Anda: <span className="text-ink font-medium">{ws.isParentExec ? 'Maker & checker' : 'Maker'}</span></span>
          </div>
        }
      />

      {pendingCorrections > 0 && (
        <Callout tone="brand" icon={<Scale />} className="mb-4" title={`${pendingCorrections} koreksi fiskal menunggu diterapkan`}>
          Buka tab Selesai untuk menerapkan koreksi temuan yang sudah dikonfirmasi ke rekonsiliasi.
        </Callout>
      )}

      <Tabs<Tab>
        className="mb-5"
        value={tab}
        onChange={(t) => {
          setTab(t);
          setSelectedId(null);
          router.replace(`/review?tab=${t}`, { scroll: false });
        }}
        items={[
          { id: 'todo', label: 'Perlu keputusan', count: groups.todo.length },
          { id: 'proposed', label: 'Menunggu checker', count: groups.proposed.length },
          { id: 'done', label: 'Selesai', count: groups.done.length },
        ]}
      />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ListChecks />}
            title={tab === 'todo' ? 'Tidak ada temuan yang perlu diputuskan' : tab === 'proposed' ? 'Tidak ada usulan yang menunggu' : 'Belum ada keputusan'}
            description={tab === 'todo' ? 'Semua temuan sudah diusulkan atau diputuskan.' : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-4 items-start">
          <Card className="overflow-hidden lg:sticky lg:top-20">
            <ul className="divide-y divide-line max-h-[70vh] overflow-y-auto" role="listbox" aria-label="Daftar temuan">
              {list.map((f) => {
                const active = selected?.id === f.id;
                const r = ws.reviewOf(f.id);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setSelectedId(f.id)}
                      className={cn('w-full text-left px-4 py-3 cursor-pointer transition border-l-2', active ? 'bg-brand-50/50 border-brand-500' : 'border-transparent hover:bg-subtle')}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-ink truncate">{f.ruleName}</span>
                        <SeverityBadge severity={f.severity} />
                      </div>
                      <div className="mt-1 text-xs text-ink-3 truncate">{f.evidence.split('\n')[0]}</div>
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="text-ink-3 min-w-0"><EntityName id={f.entityId} short /></span>
                        {r.status === 'confirmed' && f.correction && !r.correctionApplied ? (
                          <Badge tone="brand">Koreksi belum diterapkan</Badge>
                        ) : (
                          <span className="text-ink-2 num">{f.amountAtRisk ? money(f.amountAtRisk, f.country) : '—'}</span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          {selected && (
            <Card>
              <div className="px-5 pt-4 pb-3 border-b border-line">
                <div className="text-xs text-ink-3"><EntityName id={selected.entityId} /></div>
                <h2 className="text-lg font-semibold text-ink mt-0.5">{selected.ruleName}</h2>
              </div>
              <div className="p-5 space-y-6">
                <DecisionPanel finding={selected} />
                <FindingDetail finding={selected} />
              </div>
            </Card>
          )}
        </div>
      )}

      <CycleFooter current="/review" />
    </div>
  );
}
