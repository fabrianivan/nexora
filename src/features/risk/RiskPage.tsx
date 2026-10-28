'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, FileText, Search, ShieldCheck, Sparkles, Wallet, Scale } from 'lucide-react';
import type { RiskFinding } from '@/lib/compliance';
import { RULES, isUnresolved } from '@/lib/compliance';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { dateShort, dateTime, money, moneyCompact } from '@/lib/format';
import { toIdr } from '@/lib/fx';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  PageHeader,
  Segmented,
  Sheet,
  StackBar,
  Stat,
  STATUS,
  Table,
  TD,
  TH,
  THead,
  TR,
  cn,
} from '@/ui';
import { CycleFooter } from '@/shell/CycleFooter';
import { EntityName, ReviewBadge, ScopeToggle, SeverityBadge, useScopedIds, type Scope } from '../shared';

type StatusFilter = 'open' | 'all' | 'closed';

const CATEGORY_LABEL = { fraud: 'Fraud', compliance: 'Kepatuhan', cross_validation: 'Validasi silang' } as const;

export function FindingDetail({ finding }: { finding: RiskFinding }) {
  const ws = useWorkspace();
  const review = ws.reviewOf(finding.id);
  const docs = ws.compliance.documents.filter((d) => finding.documentIds.includes(d.doc.id));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={finding.severity} />
        <Badge>{CATEGORY_LABEL[finding.category]}</Badge>
        <ReviewBadge status={review.status} />
        <span className="text-xs text-ink-3">Skor risiko <span className="text-ink font-medium num">{finding.score}</span>/100</span>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink">Mengapa ditandai</h3>
        <p className="mt-1 text-[13px] text-ink-2 leading-relaxed">{finding.explanation}</p>
        <p className="mt-2 text-xs text-ink-3">Dasar: {RULES[finding.rule]?.basis}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink mb-2">Bukti</h3>
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink bg-subtle border border-line rounded-lg px-3.5 py-3">{finding.evidence}</pre>
      </div>

      {docs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink mb-2">Dokumen sumber</h3>
          <ul className="rounded-xl border border-line divide-y divide-line">
            {docs.map((d) => (
              <li key={d.doc.id}>
                <Link href={`/documents?d=${encodeURIComponent(d.doc.id)}`} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-subtle">
                  <FileText className="size-4 text-ink-3 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-ink truncate">{d.doc.counterparty.value}</span>
                    <span className="block text-xs text-ink-3 font-mono truncate">{d.doc.number.value} · {dateShort(d.doc.date.value)}</span>
                  </span>
                  <span className="text-[13px] text-ink num">{d.doc.type === 'e_invoice' ? money(d.doc.totalAmount.value, d.doc.country) : `${d.doc.ownershipPercentage.value}%`}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-ink mb-1">Rekomendasi tindakan</h3>
        <p className="text-[13px] text-ink-2">{finding.remediation}</p>
      </div>

      {finding.correction && (
        <Callout tone={review.correctionApplied ? 'success' : 'brand'} icon={<Scale />} title={review.correctionApplied ? 'Koreksi fiskal diterapkan' : review.status === 'confirmed' ? 'Koreksi fiskal siap diterapkan' : 'Usulan koreksi fiskal jika dikonfirmasi'}>
          Akun {finding.correction.accountCode} · {finding.correction.accountName}: koreksi positif <strong>{money(finding.correction.amount, finding.country)}</strong>, dampak PPh badan ±{' '}
          <strong>{money(finding.taxImpact, finding.country)}</strong> (tarif normal).
        </Callout>
      )}

      {review.history.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink mb-2">Riwayat keputusan</h3>
          <ol className="relative border-l border-line ml-1.5 space-y-3">
            {review.history.map((h, i) => (
              <li key={i} className="pl-4">
                <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-surface ring-2 ring-line-strong" />
                <div className="text-[13px] text-ink">
                  <span className="font-medium">{h.by}</span> <span className="text-ink-3">· {h.role}</span>
                </div>
                <div className="text-xs text-ink-3">{dateTime(h.at)}</div>
                {h.note && <div className="text-[13px] text-ink-2 mt-0.5">{h.note}</div>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function RiskPage() {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();
  const params = useSearchParams();
  const [scope, setScope] = useState<Scope>(ws.isParentExec ? 'group' : 'entity');
  const ids = useScopedIds(scope);
  const [status, setStatus] = useState<StatusFilter>('open');
  const [rule, setRule] = useState<string>('all');
  const [q, setQ] = useState('');
  const openId = params.get('f');

  const all = useMemo(() => ws.findings.filter((f) => ids.includes(f.entityId)), [ws.findings, ids]);
  const open = all.filter((f) => isUnresolved(ws.reviewOf(f.id).status));
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all
      .filter((f) => {
        const st = ws.reviewOf(f.id).status;
        return status === 'all' ? true : status === 'open' ? isUnresolved(st) : !isUnresolved(st);
      })
      .filter((f) => rule === 'all' || f.rule === rule)
      .filter((f) => !term || `${f.ruleName} ${f.evidence} ${f.explanation}`.toLowerCase().includes(term));
  }, [all, status, rule, q, ws]);

  const exposure = open.reduce((s, f) => s + toIdr(f.amountAtRisk, f.country), 0);
  const impact = open.reduce((s, f) => s + toIdr(f.taxImpact, f.country), 0);
  const ruleCounts = Object.keys(RULES)
    .map((r) => ({ r, n: all.filter((f) => f.rule === r && isUnresolved(ws.reviewOf(f.id).status)).length, total: all.filter((f) => f.rule === r).length }))
    .filter((x) => x.total > 0);
  const selected = openId ? ws.findings.find((f) => f.id === openId) : undefined;

  const setOpen = (id: string | null) => {
    const sp = new URLSearchParams(params.toString());
    if (id) sp.set('f', id);
    else sp.delete('f');
    router.replace(`/risk${sp.toString() ? `?${sp}` : ''}`, { scroll: false });
  };

  return (
    <div>
      <PageHeader
        eyebrow={<span>Langkah 3 · Siklus kepatuhan</span>}
        title="Risiko & fraud"
        description={`Mesin aturan memeriksa ${ws.compliance.documents.filter((d) => ids.includes(d.doc.entityId)).length} dokumen: faktur TBTS, missing trader, split invoicing, anomali Z-Score${ws.zScoreReady ? '' : ' (butuh ≥ 5 invoice)'}, UUID MyInvois, bukti biaya, dan validasi silang master data.`}
        actions={
          <>
            <Button icon={<Sparkles className="text-brand-600" />} onClick={() => ui.askCopilot(`Jelaskan prioritas penanganan ${open.length} temuan risiko terbuka kami, mulai dari yang kritis.`)}>
              Prioritaskan dengan Copilot
            </Button>
            <Button variant="primary" iconRight={<ArrowRight />} onClick={() => router.push('/review')}>
              Ke review temuan
            </Button>
          </>
        }
      >
        <ScopeToggle value={scope} onChange={setScope} />
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader title={`${open.length} temuan terbuka`} description="Berdasarkan tingkat keparahan" />
          <CardBody>
            <StackBar
              parts={[
                { key: 'critical', label: 'Kritis', value: open.filter((f) => f.severity === 'critical').length, color: STATUS.critical },
                { key: 'high', label: 'Tinggi', value: open.filter((f) => f.severity === 'high').length, color: STATUS.serious },
                { key: 'medium', label: 'Sedang', value: open.filter((f) => f.severity === 'medium').length, color: STATUS.warning },
              ]}
            />
          </CardBody>
        </Card>
        <Stat label="Eksposur dokumen" value={moneyCompact(exposure)} hint="Nilai dokumen dengan temuan terbuka (≈ IDR)" icon={<Wallet />} />
        <Stat label="Potensi koreksi PPh" value={moneyCompact(impact)} hint="Jika semua usulan koreksi dikonfirmasi" icon={<Scale />} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filter aturan">
        <button type="button" onClick={() => setRule('all')} className={cn('h-8 px-3 rounded-full border text-[13px] cursor-pointer', rule === 'all' ? 'bg-ink text-white border-ink' : 'bg-surface border-line text-ink-2 hover:border-line-strong')}>
          Semua aturan
        </button>
        {ruleCounts.map(({ r, n, total }) => (
          <button
            key={r}
            type="button"
            onClick={() => setRule(rule === r ? 'all' : r)}
            className={cn('h-8 px-3 rounded-full border text-[13px] cursor-pointer inline-flex items-center gap-2', rule === r ? 'bg-ink text-white border-ink' : 'bg-surface border-line text-ink-2 hover:border-line-strong')}
          >
            {RULES[r].name}
            <span className={cn('num text-xs', rule === r ? 'text-white/70' : 'text-ink-4')}>{n}/{total}</span>
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
          <Segmented<StatusFilter>
            value={status}
            onChange={setStatus}
            items={[
              { id: 'open', label: 'Terbuka', count: open.length },
              { id: 'closed', label: 'Selesai', count: all.length - open.length },
              { id: 'all', label: 'Semua' },
            ]}
          />
          <div className="w-full sm:w-72 sm:ml-auto">
            <Input leading={<Search />} placeholder="Cari vendor, nomor, aturan…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari temuan" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<ShieldCheck />} title="Tidak ada temuan di filter ini" description={status === 'open' ? 'Semua temuan sudah diputuskan.' : 'Ubah filter untuk melihat temuan lain.'} />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Temuan</TH>
                {scope === 'group' && <TH>Entitas</TH>}
                <TH>Tingkat</TH>
                <TH align="right">Nilai</TH>
                <TH align="right">Skor</TH>
                <TH>Review</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((f) => (
                <TR key={f.id} onClick={() => setOpen(f.id)} selected={f.id === openId}>
                  <TD>
                    <div className="text-ink font-medium">{f.ruleName}</div>
                    <div className="text-xs text-ink-3 truncate max-w-[440px]">{f.evidence.split('\n')[0]}</div>
                  </TD>
                  {scope === 'group' && <TD className="max-w-[200px]"><EntityName id={f.entityId} short /></TD>}
                  <TD><SeverityBadge severity={f.severity} /></TD>
                  <TD align="right" className="text-ink">{f.amountAtRisk ? money(f.amountAtRisk, f.country) : '—'}</TD>
                  <TD align="right">{f.score}</TD>
                  <TD><ReviewBadge status={ws.reviewOf(f.id).status} /></TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <CycleFooter current="/risk" />

      <Sheet
        open={Boolean(selected)}
        onClose={() => setOpen(null)}
        width="max-w-2xl"
        title={selected?.ruleName}
        description={selected ? <EntityName id={selected.entityId} /> : undefined}
        footer={
          selected && (
            <>
              <Button
                icon={<Sparkles className="text-brand-600" />}
                onClick={() =>
                  ui.askCopilot(
                    `Analisis temuan "${selected.ruleName}" pada ${ws.entityById(selected.entityId)?.legalName}. Bukti: ${selected.evidence.replace(/\n/g, '; ')}. Apa dasar hukumnya dan langkah mitigasinya?`,
                  )
                }
              >
                Tanya Copilot
              </Button>
              <Button variant="primary" iconRight={<ArrowRight />} onClick={() => router.push(`/review?f=${encodeURIComponent(selected.id)}`)}>
                {isUnresolved(ws.reviewOf(selected.id).status) ? 'Putuskan temuan' : 'Lihat keputusan'}
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div className="p-6">
            <FindingDetail finding={selected} />
          </div>
        )}
      </Sheet>
    </div>
  );
}
