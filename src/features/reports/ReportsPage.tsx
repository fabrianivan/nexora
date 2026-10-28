'use client';

import React, { useMemo, useState } from 'react';
import { Download, FileBarChart2, History, Lock, Printer, Search } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { computeCit, RETURN_FORM } from '@/lib/cit';
import { entityRiskScore, isUnresolved, riskBand } from '@/lib/compliance';
import { downloadFile, toCsv } from '@/lib/download';
import { dateShort, money } from '@/lib/format';
import { paymentStatus } from '@/lib/schedule';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, PageHeader, Stat, Table, TD, TH, THead, TR, Tabs, cn } from '@/ui';
import { ReviewBadge, SeverityBadge } from '../shared';

type Tab = 'summary' | 'audit';

function ExecutiveSummary() {
  const ws = useWorkspace();
  const e = ws.activeEntity;
  const country = e.countryCode;
  const findings = ws.findings.filter((f) => f.entityId === e.id);
  const unresolved = findings.filter((f) => isUnresolved(ws.reviewOf(f.id).status));
  const confirmed = findings.filter((f) => ws.reviewOf(f.id).status === 'confirmed');
  const dismissed = findings.filter((f) => ws.reviewOf(f.id).status === 'dismissed');
  const calc = ws.calculationFor(e.id);
  const cit = computeCit(calc.items, country, calc.apply31EFacility, calc.credits ?? []);
  const ret = ws.returnFor(e.id);
  const score = entityRiskScore(findings, ws.compliance.reviews);
  const band = riskBand(score);
  const pays = ws.payments.filter((p) => p.entityId === e.id);
  const unpaid = pays.filter((p) => p.status !== 'Dibayar');
  const late = unpaid.filter((p) => paymentStatus(p) === 'Terlambat');
  const prevented = confirmed.reduce((s, f) => s + (f.correction ? f.taxImpact : 0) + (f.rule === 'TBTS' || f.rule === 'MISSING_TRADER' ? ws.compliance.documents.find((d) => d.doc.id === f.documentIds[0])?.doc.taxAmount.value ?? 0 : 0), 0);
  const form = RETURN_FORM[country];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Skor kepatuhan" value={<span>{score}<span className="text-sm text-ink-3 font-medium"> / 100</span></span>} hint={`Risiko ${band.label.toLowerCase()}`} tone={band.tone === 'rose' ? 'danger' : band.tone === 'amber' ? 'warning' : 'success'} />
        <Stat label="Pajak terutang tahun berjalan" value={money(cit.taxDue, country)} hint={`${form.short}: ${ret.returnStatus === 'Draft' ? 'draf' : ret.returnStatus === 'Review' ? 'review checker' : 'disetujui'}`} />
        <Stat label="Kerugian/risiko dicegah" value={money(prevented, country)} hint="Kredit pajak diblokir + koreksi atas temuan dikonfirmasi" tone="success" />
        <Stat label="Kewajiban belum disetor" value={unpaid.length} hint={late.length ? `${late.length} terlambat` : 'Tidak ada yang terlambat'} tone={late.length ? 'danger' : undefined} />
      </div>

      <Card>
        <CardHeader title={`Laporan kepatuhan pajak — ${e.legalName}`} description={`Tahun buku 2026 · dibuat ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} oleh ${ws.persona.name}`} />
        <CardBody className="space-y-5 text-[13px] leading-relaxed text-ink-2">
          <section>
            <h3 className="text-sm font-semibold text-ink mb-1">1. Posisi perpajakan</h3>
            <p>
              Laba komersial sebesar <strong className="text-ink">{money(cit.commercialProfit, country)}</strong> disesuaikan dengan koreksi positif{' '}
              <strong className="text-ink">{money(cit.positive, country)}</strong> dan koreksi negatif <strong className="text-ink">{money(cit.negative, country)}</strong>, menghasilkan
              penghasilan kena pajak <strong className="text-ink">{money(cit.taxableIncome, country)}</strong>. Pajak terutang <strong className="text-ink">{money(cit.taxDue, country)}</strong>
              {cit.facilityApplied ? ' setelah fasilitas tarif' : ''}; setelah kredit pajak {money(cit.credits, country)}, posisi akhir{' '}
              <strong className="text-ink">{cit.payable ? `kurang bayar ${money(cit.payable, country)}` : `lebih bayar ${money(cit.overpaid, country)}`}</strong>.
            </p>
          </section>
          <section>
            <h3 className="text-sm font-semibold text-ink mb-1">2. Temuan risiko & fraud</h3>
            <p>
              Mesin risiko memeriksa {ws.compliance.documents.filter((d) => d.doc.entityId === e.id).length} dokumen dan menghasilkan {findings.length} temuan: {confirmed.length} dikonfirmasi,{' '}
              {dismissed.length} ditolak setelah review, dan {unresolved.length} masih terbuka. Seluruh keputusan melalui pemisahan maker-checker.
            </p>
            {findings.length > 0 && (
              <div className="mt-3 rounded-xl border border-line overflow-hidden">
                <Table>
                  <THead>
                    <tr>
                      <TH>Temuan</TH>
                      <TH>Tingkat</TH>
                      <TH align="right">Nilai</TH>
                      <TH>Status</TH>
                    </tr>
                  </THead>
                  <tbody>
                    {findings.map((f) => (
                      <TR key={f.id}>
                        <TD className="text-ink">{f.ruleName}<div className="text-xs text-ink-3 truncate max-w-[360px]">{f.evidence.split('\n')[0]}</div></TD>
                        <TD><SeverityBadge severity={f.severity} /></TD>
                        <TD align="right">{f.amountAtRisk ? money(f.amountAtRisk, country) : '—'}</TD>
                        <TD><ReviewBadge status={ws.reviewOf(f.id).status} /></TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </section>
          <section>
            <h3 className="text-sm font-semibold text-ink mb-1">3. Pelaporan & pembayaran</h3>
            <p>
              {form.name} berstatus <strong className="text-ink">{ret.returnStatus}</strong>
              {ret.approver ? `, disetujui ${ret.approver.name}` : ''}. Batas lapor {dateShort(form.deadline)}. Terdapat {unpaid.length} kewajiban belum disetor
              {late.length ? `, termasuk ${late.length} yang melewati jatuh tempo` : ''}.
            </p>
          </section>
          <section>
            <h3 className="text-sm font-semibold text-ink mb-1">4. Rekomendasi</h3>
            <ul className="list-disc pl-5 space-y-1">
              {unresolved.some((f) => f.severity === 'critical') && <li>Putuskan temuan kritis sebelum pengajuan SPT dan tahan pengkreditan pajak masukan terkait.</li>}
              {unresolved.length > 0 && <li>Selesaikan {unresolved.length} temuan terbuka melalui review maker-checker.</li>}
              {late.length > 0 && <li>Setor kewajiban terlambat segera untuk menghentikan akumulasi sanksi bunga.</li>}
              {ret.returnStatus !== 'Approved' && ret.returnStatus !== 'Ready' && <li>Ajukan dan setujui {form.short} setelah rekonsiliasi final.</li>}
              {unresolved.length === 0 && late.length === 0 && <li>Pertahankan pemindaian dokumen bulanan dan review berkala.</li>}
            </ul>
          </section>
        </CardBody>
      </Card>
    </div>
  );
}

function AuditTrail() {
  const ws = useWorkspace();
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ws.auditLogs.filter((l) => !term || `${l.actor} ${l.action} ${l.target} ${l.details}`.toLowerCase().includes(term));
  }, [ws.auditLogs, q]);
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex items-center gap-2 text-[13px] text-ink-3">
          <Lock className="size-4" /> Log hanya-tambah — setiap aksi pengguna dan mesin tercatat.
        </div>
        <div className="w-full sm:w-72">
          <Input leading={<Search />} placeholder="Cari aksi, pengguna, objek…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari log audit" />
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<History />} title="Tidak ada catatan" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Waktu</TH>
              <TH>Pengguna</TH>
              <TH>Aksi</TH>
              <TH>Objek & detail</TH>
            </tr>
          </THead>
          <tbody>
            {rows.map((l) => (
              <TR key={l.id}>
                <TD className="whitespace-nowrap font-mono text-xs">{l.timestamp}</TD>
                <TD>
                  <div className="text-ink">{l.actor}</div>
                  <div className="text-xs text-ink-3">{l.role}</div>
                </TD>
                <TD><Badge tone={/APPROVE|VERIFY|RECORD/.test(l.action) ? 'success' : /DELETE|REMOVE|REVEAL|RETURN|REOPEN/.test(l.action) ? 'warning' : 'neutral'} className="font-mono text-[11px]">{l.action}</Badge></TD>
                <TD className="min-w-[280px]">
                  <div className="text-ink">{l.target}</div>
                  <div className="text-xs text-ink-3">{l.details}</div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

export function ReportsPage() {
  const ws = useWorkspace();
  const ui = useUi();
  const [tab, setTab] = useState<Tab>('summary');

  const exportPack = () => {
    const findings = ws.findings.filter((f) => ws.canAccess(f.entityId));
    const csv = [
      ['# Temuan risiko'],
      ['id', 'entitas', 'aturan', 'tingkat', 'nilai', 'status_review', 'diputuskan_oleh', 'koreksi_akun', 'koreksi_nilai'],
      ...findings.map((f) => {
        const r = ws.reviewOf(f.id);
        return [f.id, ws.entityById(f.entityId)?.legalName ?? f.entityId, f.ruleName, f.severity, f.amountAtRisk, r.status, r.decidedBy ?? '', f.correction?.accountCode ?? '', f.correction?.amount ?? ''];
      }),
      [],
      ['# Jejak audit'],
      ['waktu', 'pengguna', 'peran', 'aksi', 'objek', 'detail'],
      ...ws.auditLogs.map((l) => [l.timestamp, l.actor, l.role, l.action, l.target, l.details]),
    ];
    downloadFile(`nexora-paket-audit-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(csv as (string | number)[][]), 'text/csv');
    ws.logAudit('EXPORT_AUDIT_PACK', 'Paket audit CSV', `${findings.length} temuan · ${ws.auditLogs.length} log`);
    ui.toast('Paket audit diunduh.');
  };

  return (
    <div>
      <PageHeader
        title="Laporan & audit"
        description={`Ringkasan eksekutif ${ws.activeEntity.flag} ${ws.activeEntity.legalName} dan jejak audit seluruh aksi.`}
        actions={
          <>
            <Button icon={<Printer />} onClick={() => window.print()}>Cetak / PDF</Button>
            <Button variant="primary" icon={<Download />} onClick={exportPack}>Paket audit (CSV)</Button>
          </>
        }
      />
      <Tabs<Tab>
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'summary', label: 'Ringkasan eksekutif', icon: <FileBarChart2 /> },
          { id: 'audit', label: 'Jejak audit', icon: <History />, count: ws.auditLogs.length },
        ]}
      />
      <div className={cn(tab !== 'summary' && 'hidden print:block')}>{tab === 'summary' && <ExecutiveSummary />}</div>
      {tab === 'audit' && <AuditTrail />}
    </div>
  );
}
