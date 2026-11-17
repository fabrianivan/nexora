'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileSearch, History, ListChecks, MessageSquareText, Scale, Search, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { RULES, groupRiskScore, isUnresolved, riskBand, type RiskFinding } from '@/lib/compliance';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { dateTime, money, moneyCompact } from '@/lib/format';
import { toIdr } from '@/lib/fx';
import { CASE_QUESTIONS } from '@/shell/Copilot';
import {
  Badge,
  BandLead,
  Button,
  Card,
  ComplianceRing,
  EmptyState,
  Input,
  MetricBand,
  PageHeader,
  Tabs,
  cn,
} from '@/ui';
import { CycleFooter } from '@/shell/CycleFooter';
import { CycleNext } from '@/shell/CycleNext';
import { EntityName, ReviewBadge, ScopeToggle, SeverityBadge, useScopedIds, type Scope } from '../shared';
import { DecisionPanel } from './DecisionPanel';
import { Evidence } from './Evidence';
import { InvestigationPanel } from './InvestigationPanel';
import { RupiahTrailCard } from './RupiahTrail';

type StatusTab = 'todo' | 'proposed' | 'done';
type PaneTab = 'evidence' | 'investigation' | 'history';

const CATEGORY_LABEL = { fraud: 'Fraud', compliance: 'Kepatuhan', cross_validation: 'Validasi silang' } as const;

function statusTab(status: string): StatusTab {
  return status === 'open' ? 'todo' : status === 'proposed' ? 'proposed' : 'done';
}

function CaseHistory({ finding }: { finding: RiskFinding }) {
  const ws = useWorkspace();
  const review = ws.reviewOf(finding.id);
  const inv = ws.compliance.investigations?.[finding.id];
  const events = [
    ...review.history.map((h) => ({ at: h.at, who: `${h.by}`, role: h.role, note: h.note ?? '' })),
    ...(inv ? [{ at: inv.at, who: 'Agen investigasi', role: inv.engine.label, note: `${inv.steps.length} langkah · saran: ${inv.recommendation}` }] : []),
  ].sort((a, b) => a.at.localeCompare(b.at));
  if (!events.length) return <EmptyState icon={<History />} title="Belum ada riwayat" description="Usulan, persetujuan, investigasi, dan koreksi tercatat di sini." />;
  return (
    <ol className="relative border-l border-line ml-1.5 space-y-3">
      {events.map((h, i) => (
        <li key={i} className="pl-4">
          <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-surface ring-2 ring-line-strong" />
          <div className="text-[13px] text-ink">
            <span className="font-medium">{h.who}</span> <span className="text-ink-3">· {h.role}</span>
          </div>
          <div className="text-xs text-ink-3">{dateTime(h.at)}</div>
          {h.note && <div className="text-[13px] text-ink-2 mt-0.5">{h.note}</div>}
        </li>
      ))}
    </ol>
  );
}

function CasePane({ finding }: { finding: RiskFinding }) {
  const ws = useWorkspace();
  const ui = useUi();
  const [tab, setTab] = useState<PaneTab>('evidence');
  const review = ws.reviewOf(finding.id);
  const inv = ws.compliance.investigations?.[finding.id];
  useEffect(() => setTab('evidence'), [finding.id]);

  return (
    <Card>
      <div className="px-6 pt-5 pb-4 border-b border-line">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-ink-3"><EntityName id={finding.entityId} /></div>
            <h2 className="font-serif text-[28px] leading-8 text-ink mt-1">{finding.ruleName}</h2>
          </div>
          <Button size="sm" icon={<MessageSquareText />} onClick={() => ui.askCopilot(CASE_QUESTIONS[0], { caseId: finding.id })}>
            Tanya Copilot
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <SeverityBadge severity={finding.severity} />
          <Badge>{CATEGORY_LABEL[finding.category]}</Badge>
          <ReviewBadge status={review.status} />
          <span className="text-xs text-ink-3" title="Urutan penanganan: tingkat temuan ditambah nilai dokumen. Bukan probabilitas fraud.">
            Prioritas <span className="text-ink font-medium num">{finding.score}</span>
          </span>
          {finding.amountAtRisk > 0 && <span className="text-xs text-ink-3">· nilai dokumen <span className="text-ink num">{money(finding.amountAtRisk, finding.country)}</span></span>}
        </div>
      </div>
      <div className="p-6 space-y-6">
        <DecisionPanel finding={finding} />
        <RupiahTrailCard finding={finding} />
        <div>
          <Tabs<PaneTab>
            className="mb-4"
            value={tab}
            onChange={setTab}
            items={[
              { id: 'evidence', label: 'Bukti', icon: <FileSearch /> },
              { id: 'investigation', label: inv ? 'Investigasi AI' : 'Investigasi AI · belum', icon: <Sparkles /> },
              { id: 'history', label: 'Riwayat', icon: <History />, count: review.history.length || undefined },
            ]}
          />
          {tab === 'evidence' && <Evidence finding={finding} />}
          {tab === 'investigation' && <InvestigationPanel finding={finding} />}
          {tab === 'history' && <CaseHistory finding={finding} />}
        </div>
      </div>
    </Card>
  );
}

export function CasesPage() {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();
  const params = useSearchParams();
  const [scope, setScope] = useState<Scope>(ws.isParentExec ? 'group' : 'entity');
  const ids = useScopedIds(scope);
  const paramId = params.get('f');
  const [tab, setTab] = useState<StatusTab>((params.get('tab') as StatusTab) || 'todo');
  const [selectedId, setSelectedId] = useState<string | null>(paramId);
  const [rule, setRule] = useState('all');
  const [q, setQ] = useState('');

  const all = useMemo(() => ws.findings.filter((f) => ids.includes(f.entityId) && ws.canAccess(f.entityId)), [ws, ids]);
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const visible = all
      .filter((f) => rule === 'all' || f.rule === rule)
      .filter((f) => !term || `${f.ruleName} ${f.evidence} ${f.explanation}`.toLowerCase().includes(term));
    return {
      todo: visible.filter((f) => ws.reviewOf(f.id).status === 'open'),
      proposed: visible.filter((f) => ws.reviewOf(f.id).status === 'proposed'),
      done: visible.filter((f) => !isUnresolved(ws.reviewOf(f.id).status)),
    };
  }, [all, rule, q, ws]);
  const list = groups[tab];

  // Arriving with ?f= (from a notification, the overview, or an old /risk link): open that case,
  // widening the scope if the case belongs to another entity.
  useEffect(() => {
    if (!paramId) return;
    const f = ws.findings.find((x) => x.id === paramId);
    if (!f) return;
    if (!ids.includes(f.entityId) && ws.canAccess(f.entityId)) setScope('group');
    setTab(statusTab(ws.reviewOf(paramId).status));
    setSelectedId(paramId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramId]);

  const selected = list.find((f) => f.id === selectedId) ?? list[0];

  const changeTab = (t: StatusTab) => {
    setTab(t);
    setSelectedId(null);
    router.replace(`/cases?tab=${t}`, { scroll: false });
  };

  const select = (id: string) => {
    setSelectedId(id);
    router.replace(`/cases?tab=${tab}&f=${encodeURIComponent(id)}`, { scroll: false });
  };

  const open = all.filter((f) => isUnresolved(ws.reviewOf(f.id).status));
  const proposedCount = all.filter((f) => ws.reviewOf(f.id).status === 'proposed').length;
  const critical = open.filter((f) => f.severity === 'critical').length;
  const exposure = open.reduce((s, f) => s + toIdr(f.amountAtRisk, f.country), 0);
  const pendingCorrections = all.filter((f) => {
    const r = ws.reviewOf(f.id);
    return r.status === 'confirmed' && f.correction && !r.correctionApplied;
  }).length;
  const score = groupRiskScore(all, ids, ws.compliance.reviews);
  const band = riskBand(score);
  const ruleOptions = Object.keys(RULES).filter((r) => all.some((f) => f.rule === r));

  return (
    <div>
      <PageHeader
        next={<CycleNext current="/cases" />}
        eyebrow={<span>Langkah 3 dari 6 · Siklus kepatuhan</span>}
        title="Kasus"
        description={`Setiap temuan mesin aturan menjadi satu kasus: bukti per field, investigasi AI, keputusan maker-checker, dan dampaknya ke SPT. ${ws.compliance.documents.filter((d) => ids.includes(d.doc.entityId)).length} dokumen diperiksa${ws.zScoreReady ? '' : '; Z-score butuh ≥ 5 invoice'}.`}
        actions={
          <Button variant="ghost" icon={<Sparkles className="text-brand-600" />} onClick={() => ui.askCopilot('Urutkan prioritas penanganan kasus terbuka kami, mulai dari yang kritis.')}>
            Prioritaskan dengan Copilot
          </Button>
        }
      />

      <MetricBand
        variant="light"
        className="mb-6"
        label="Posisi kasus"
        lead={
          <BandLead
            eyebrow={scope === 'group' ? 'Skor kepatuhan grup' : 'Skor kepatuhan entitas'}
            title={`Risiko ${band.label.toLowerCase()}`}
            detail={`${open.length} kasus terbuka dari ${all.length} · nilai dokumen ${moneyCompact(exposure)}`}
            tone={band.tone === 'rose' ? 'danger' : band.tone === 'amber' ? 'warning' : 'success'}
            visual={<ComplianceRing value={score} tone={band.tone} size={80} label={`Skor kepatuhan ${score} dari 100`} />}
          />
        }
        metrics={[
          { label: 'Kasus terbuka', value: open.length, detail: `${critical} kritis · ${open.filter((f) => f.severity === 'high').length} tinggi`, icon: <ShieldCheck />, tone: critical ? 'danger' : undefined, onClick: () => changeTab('todo') },
          { label: 'Di checker', value: proposedCount, detail: 'Usulan maker menunggu persetujuan induk', icon: <UserCheck />, tone: proposedCount ? 'warning' : undefined, onClick: () => changeTab('proposed') },
          { label: 'Koreksi tertunda', value: pendingCorrections, detail: 'Dikonfirmasi, belum masuk rekonsiliasi', icon: <Scale />, tone: pendingCorrections ? 'brand' : undefined, onClick: () => changeTab('done') },
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <Tabs<StatusTab>
          className="flex-1 min-w-[300px]"
          value={tab}
          onChange={changeTab}
          items={[
            { id: 'todo', label: 'Perlu keputusan', count: groups.todo.length },
            { id: 'proposed', label: 'Menunggu checker', count: groups.proposed.length },
            { id: 'done', label: 'Selesai', count: groups.done.length },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <ScopeToggle value={scope} onChange={setScope} />
          <select
            aria-label="Filter aturan"
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            className="h-9 w-40 rounded-md border border-line-strong bg-surface px-2.5 text-[13px] text-ink-2 cursor-pointer"
          >
            <option value="all">Semua aturan</option>
            {ruleOptions.map((r) => <option key={r} value={r}>{RULES[r].name}</option>)}
          </select>
          <div className="w-48">
            <Input leading={<Search />} placeholder="Cari vendor, nomor…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari kasus" />
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ListChecks />}
            title={tab === 'todo' ? 'Tidak ada kasus yang perlu diputuskan' : tab === 'proposed' ? 'Tidak ada usulan yang menunggu' : 'Belum ada keputusan'}
            description={rule !== 'all' || q ? 'Ubah filter untuk melihat kasus lain.' : tab === 'todo' ? 'Semua kasus sudah diusulkan atau diputuskan.' : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-4 items-start">
          <Card className="overflow-hidden lg:sticky lg:top-20">
            <ul className="divide-y divide-line max-h-[72vh] overflow-y-auto" role="listbox" aria-label="Daftar kasus">
              {list.map((f) => {
                const active = selected?.id === f.id;
                const r = ws.reviewOf(f.id);
                const investigated = Boolean(ws.compliance.investigations?.[f.id]);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => select(f.id)}
                      className={cn('w-full text-left px-4 py-3.5 cursor-pointer transition border-l-2', active ? 'bg-mark-soft/70 border-ink' : 'border-transparent hover:bg-subtle')}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-ink truncate">{f.ruleName}</span>
                        <SeverityBadge severity={f.severity} />
                      </div>
                      <div className="mt-1 text-xs text-ink-3 truncate">{f.evidence.split('\n')[0]}</div>
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="text-ink-3 min-w-0 inline-flex items-center gap-1.5">
                          <EntityName id={f.entityId} short />
                          {investigated && <Sparkles className="size-3 text-brand-600 shrink-0" aria-label="Sudah diinvestigasi" />}
                        </span>
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

          {selected && <CasePane finding={selected} />}
        </div>
      )}

      <CycleFooter current="/cases" />
    </div>
  );
}
