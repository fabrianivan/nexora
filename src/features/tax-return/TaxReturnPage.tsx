'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  CheckCheck,
  CircleDashed,
  FileCode2,
  FileJson2,
  Printer,
  ReceiptText,
  RotateCcw,
  Send,
  Undo2,
  UserCog,
} from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { computeCit, fiscalOf, RETURN_FORM } from '@/lib/cit';
import { isUnresolved } from '@/lib/compliance';
import { createReturnDraft, returnDraftToXml } from '@/lib/returns';
import { downloadFile } from '@/lib/download';
import { dateShort, dateTime, money } from '@/lib/format';
import type { ReturnStatus, TaxReturnState } from '@/state/types';
import { Badge, Button, Callout, Card, CardBody, CardHeader, PageHeader, Table, TD, TH, THead, TR, Tabs, cn, type Tone } from '@/ui';
import { CycleFooter } from '@/shell/CycleFooter';

type Section = 'main' | 'l1' | 'l2' | 'l3';

const STATUS_META: Record<ReturnStatus, { label: string; tone: Tone }> = {
  Draft: { label: 'Draf', tone: 'neutral' },
  Review: { label: 'Menunggu checker', tone: 'warning' },
  Approved: { label: 'Disetujui', tone: 'success' },
  Ready: { label: 'Siap lapor · billing terbit', tone: 'brand' },
};

const FLOW: { status: ReturnStatus; label: string }[] = [
  { status: 'Draft', label: 'Draf disusun' },
  { status: 'Review', label: 'Review checker' },
  { status: 'Approved', label: 'Disetujui' },
  { status: 'Ready', label: 'Kode billing' },
];

export function TaxReturnPage() {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();
  const entity = ws.activeEntity;
  const country = entity.countryCode;
  const form = RETURN_FORM[country];
  const calc = ws.calculationFor(entity.id);
  const live = computeCit(calc.items, country, calc.apply31EFacility, calc.credits ?? []);
  const ret = ws.returnFor(entity.id);
  const [section, setSection] = useState<Section>('main');
  const locked = ret.returnStatus === 'Approved' || ret.returnStatus === 'Ready';
  const snapshot = ret.figures;
  const fig = locked && snapshot ? snapshot : { commercialProfit: live.commercialProfit, positive: live.positive, negative: live.negative, taxableIncome: live.taxableIncome, taxDue: live.taxDue, credits: live.credits, payable: live.payable, overpaid: live.overpaid };
  const drift = locked && snapshot && Math.round(snapshot.taxDue) !== Math.round(live.taxDue);

  // Pre-submission checks
  const checks = useMemo(() => {
    const findings = ws.findings.filter((f) => f.entityId === entity.id);
    const unresolved = findings.filter((f) => isUnresolved(ws.reviewOf(f.id).status));
    const critical = unresolved.filter((f) => f.severity === 'critical');
    const pendingCorr = findings.filter((f) => ws.reviewOf(f.id).status === 'confirmed' && f.correction && !ws.reviewOf(f.id).correctionApplied);
    const pendingDocs = ws.compliance.documents.filter((d) => d.doc.entityId === entity.id && d.status !== 'verified');
    const legal = entity.documents.filter((d) => d.status !== 'Verified by Document AI');
    return [
      { key: 'critical', ok: critical.length === 0, blocking: true, label: 'Tidak ada temuan kritis terbuka', detail: critical.length ? `${critical.length} temuan kritis belum diputuskan` : 'Semua temuan kritis sudah diputuskan', href: '/review' },
      { key: 'review', ok: unresolved.length === 0, blocking: false, label: 'Semua temuan diputuskan', detail: unresolved.length ? `${unresolved.length} temuan terbuka` : 'Tidak ada temuan terbuka', href: '/review' },
      { key: 'corr', ok: pendingCorr.length === 0, blocking: true, label: 'Koreksi temuan diterapkan', detail: pendingCorr.length ? `${pendingCorr.length} koreksi belum masuk rekonsiliasi` : 'Rekonsiliasi mutakhir', href: '/review?tab=done' },
      { key: 'docs', ok: pendingDocs.length === 0, blocking: false, label: 'Dokumen transaksi terverifikasi', detail: pendingDocs.length ? `${pendingDocs.length} dokumen menunggu verifikasi` : 'Semua terverifikasi', href: '/documents' },
      { key: 'legal', ok: legal.length === 0, blocking: false, label: 'Dokumen legal lengkap', detail: legal.length ? `${legal.length} dokumen legal perlu review` : 'Lengkap', href: `/entities/${entity.id}` },
    ];
  }, [ws, entity]);
  const blocked = checks.some((c) => c.blocking && !c.ok);

  const now = () => new Date().toISOString();
  const role = ws.actor.role;
  const write = (next: TaxReturnState, audit: [string, string]) => {
    ws.setReturn(entity.id, next);
    ws.logAudit(audit[0], `${form.short} ${entity.legalName}`, audit[1]);
  };
  const history = ret.history ?? [];

  const submit = () => {
    write(
      { ...ret, returnStatus: 'Review', creator: { name: ws.persona.name, role }, submittedAt: now(), approver: null, history: [...history, { at: now(), by: ws.persona.name, role, action: 'Diajukan ke checker' }] },
      ['SUBMIT_TAX_RETURN', `Pajak terutang ${money(live.taxDue, country)}, ${live.payable ? `kurang bayar ${money(live.payable, country)}` : `lebih bayar ${money(live.overpaid, country)}`}.`],
    );
    ui.toast('Draf diajukan ke checker.');
  };
  const isCreator = ret.creator?.name === ws.persona.name;
  const canCheck = ws.isParentExec && !isCreator;
  const checker = ws.personas.find((p) => p.canViewAll && p.entityRole === 'PARENT' && p.name !== ret.creator?.name);

  const approve = () => {
    const figures = { commercialProfit: live.commercialProfit, positive: live.positive, negative: live.negative, taxableIncome: live.taxableIncome, taxDue: live.taxDue, credits: live.credits, payable: live.payable, overpaid: live.overpaid };
    write(
      { ...ret, returnStatus: 'Approved', approver: { name: ws.persona.name, role }, approvedAt: now(), figures, history: [...history, { at: now(), by: ws.persona.name, role, action: 'Disetujui checker' }] },
      ['APPROVE_TAX_RETURN', `Disetujui; pajak terutang ${money(live.taxDue, country)}.`],
    );
    ui.toast(`${form.short} disetujui dan dikunci.`);
  };
  const sendBack = () => {
    write({ ...ret, returnStatus: 'Draft', history: [...history, { at: now(), by: ws.persona.name, role, action: 'Dikembalikan ke maker' }] }, ['RETURN_TAX_RETURN', 'Dikembalikan ke draf untuk perbaikan.']);
    ui.toast('Draf dikembalikan ke maker.', 'info');
  };
  const reopen = () => {
    write({ ...ret, returnStatus: 'Draft', approver: null, figures: undefined, history: [...history, { at: now(), by: ws.persona.name, role, action: 'Dibuka kembali' }] }, ['REOPEN_TAX_RETURN', 'Persetujuan dicabut untuk revisi.']);
    ui.toast('SPT dibuka kembali sebagai draf.', 'info');
  };
  const issueBilling = () => {
    const amount = fig.payable;
    const code = country === 'ID' ? `0${Date.now().toString().slice(-14)}` : `${country}-${Date.now().toString(36).toUpperCase()}`;
    const id = `PAY-${entity.id}-CIT`;
    const label = country === 'ID' ? 'PPh Badan Tahunan (Pasal 29)' : `${form.short} — balance due`;
    const existing = ws.payments.find((p) => p.id === id || (p.entityId === entity.id && p.taxType === label && p.status !== 'Dibayar'));
    const liability = { id: existing?.id ?? id, entityId: entity.id, taxType: label, kapKjs: country === 'ID' ? '411126-200' : form.authority, period: 'Tahun Pajak 2026', amount, dueDate: form.deadline, status: 'Belum dibayar' as const, billingCode: code };
    ws.setPayments(existing ? ws.payments.map((p) => (p.id === existing.id ? liability : p)) : [liability, ...ws.payments]);
    write({ ...ret, returnStatus: 'Ready', history: [...history, { at: now(), by: ws.persona.name, role, action: `Kode billing ${code} diterbitkan` }] }, ['ISSUE_BILLING_CODE', `${label} ${money(amount, country)} · kode ${code}`]);
    ui.toast(`Kode billing ${code} diterbitkan.`, 'success', { label: 'Buka pembayaran', onClick: () => router.push('/payments') });
  };

  const exportDraft = (kind: 'xml' | 'json') => {
    const [mm, dd] = ['12', '31'];
    const draft = createReturnDraft(
      { id: entity.id, name: entity.legalName, country, taxId: entity.taxId.split('(')[0].trim(), address: entity.address || '-----', fiscalYearEnd: `${mm}-${dd}`, createdAt: now() },
      { commercialProfit: fig.commercialProfit, positiveCorrections: fig.positive, negativeCorrections: fig.negative, taxableIncome: fig.taxableIncome, taxDue: fig.taxDue },
    );
    const base = `${form.short.replace(/\s+/g, '')}-2026-${entity.id}${locked ? '' : '-DRAF'}`;
    if (kind === 'xml') downloadFile(`${base}.xml`, returnDraftToXml(draft), 'application/xml');
    else downloadFile(`${base}.json`, JSON.stringify({ ...draft, status: ret.returnStatus, lines: calc.items, credits: calc.credits ?? [] }, null, 2), 'application/json');
    ws.logAudit('EXPORT_TAX_RETURN', `${form.short} ${entity.legalName}`, `Ekspor ${kind.toUpperCase()}${locked ? '' : ' (draf)'}.`);
  };

  const flowIndex = FLOW.findIndex((f) => f.status === ret.returnStatus);

  const lines: [string, string, number, string?][] = [
    ['1', 'Penghasilan neto komersial', fig.commercialProfit],
    ['2', 'Koreksi fiskal positif', fig.positive, 'danger'],
    ['3', 'Koreksi fiskal negatif', -fig.negative, 'success'],
    ['4', 'Penghasilan kena pajak (1 + 2 − 3)', fig.taxableIncome, 'strong'],
    ['5', country === 'ID' ? 'PPh terutang (Pasal 17 jo. 31E)' : 'Tax payable', fig.taxDue, 'strong'],
    ['6', 'Kredit pajak', -fig.credits],
    ['7', fig.payable > 0 ? (country === 'ID' ? 'PPh kurang bayar (Pasal 29)' : 'Balance due') : 'Lebih bayar', fig.payable || fig.overpaid, 'total'],
  ];

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            Langkah 6 · Siklus kepatuhan
            <Badge tone={STATUS_META[ret.returnStatus].tone} dot>{STATUS_META[ret.returnStatus].label}</Badge>
          </span>
        }
        title={form.name}
        description={`${entity.flag} ${entity.legalName} · tahun pajak 2026 · lapor via ${form.authority} paling lambat ${dateShort(form.deadline)}`}
        actions={
          <>
            <Button icon={<FileCode2 />} onClick={() => exportDraft('xml')}>XML</Button>
            <Button icon={<FileJson2 />} onClick={() => exportDraft('json')}>JSON</Button>
            <Button icon={<Printer />} onClick={() => window.print()}>Cetak</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 sm:gap-6 items-start">
        <div className="space-y-4 sm:space-y-6 min-w-0">
          {drift && (
            <Callout tone="warning" icon={<AlertTriangle />} title="Rekonsiliasi berubah setelah persetujuan" action={ws.isParentExec ? <Button size="sm" onClick={reopen}>Buka kembali</Button> : undefined}>
              Pajak terutang kini {money(live.taxDue, country)} (disetujui {money(snapshot!.taxDue, country)}). Buka kembali draf untuk menyetujui angka terbaru.
            </Callout>
          )}

          <Card className="relative overflow-hidden">
            {!locked && (
              <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-[120px] font-bold text-ink/[0.03] -rotate-12 select-none">DRAF</span>
              </div>
            )}
            <Tabs<Section>
              className="px-3"
              value={section}
              onChange={setSection}
              items={[
                { id: 'main', label: country === 'ID' ? 'Formulir induk' : 'Main form' },
                { id: 'l1', label: country === 'ID' ? 'Lampiran I · rekonsiliasi' : 'Schedule · reconciliation' },
                { id: 'l2', label: country === 'ID' ? 'Lampiran II · HPP & beban' : 'Schedule · expenses' },
                { id: 'l3', label: country === 'ID' ? 'Lampiran III · kredit pajak' : 'Schedule · tax credits' },
              ]}
            />
            {section === 'main' && (
              <div className="divide-y divide-line">
                {lines.map(([no, label, amount, style]) => (
                  <div key={no} className={cn('flex items-center gap-4 px-5 py-3', style === 'total' && 'bg-subtle')}>
                    <span className="size-6 rounded-md bg-muted text-ink-3 text-xs font-medium flex items-center justify-center num shrink-0">{no}</span>
                    <span className={cn('flex-1 text-[13px]', style === 'strong' || style === 'total' ? 'text-ink font-medium' : 'text-ink-2')}>{label}</span>
                    <span className={cn('num text-sm', style === 'total' ? 'text-ink font-semibold text-base' : style === 'strong' ? 'text-ink font-medium' : style === 'danger' ? 'text-danger-700' : style === 'success' ? 'text-success-700' : 'text-ink')}>
                      {money(amount, country)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {section === 'l1' && (
              <Table>
                <THead>
                  <tr>
                    <TH>Akun</TH>
                    <TH align="right">Komersial</TH>
                    <TH align="right">(+)</TH>
                    <TH align="right">(−)</TH>
                    <TH align="right">Fiskal</TH>
                  </tr>
                </THead>
                <tbody>
                  {calc.items.map((i) => (
                    <TR key={i.id}>
                      <TD><span className="font-mono text-xs text-ink-3 mr-2">{i.accountCode}</span><span className="text-ink">{i.accountName}</span></TD>
                      <TD align="right">{money(i.commercialAmount, country)}</TD>
                      <TD align="right" className="text-danger-700">{i.positiveCorrection ? money(i.positiveCorrection, country) : '—'}</TD>
                      <TD align="right" className="text-success-700">{i.negativeCorrection ? money(i.negativeCorrection, country) : '—'}</TD>
                      <TD align="right" className="text-ink font-medium">{money(fiscalOf(i), country)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
            {section === 'l2' && (
              <Table>
                <THead>
                  <tr>
                    <TH>Beban</TH>
                    <TH align="right">Komersial</TH>
                    <TH align="right">Fiskal</TH>
                    <TH align="right">Porsi</TH>
                  </tr>
                </THead>
                <tbody>
                  {calc.items.filter((i) => i.group === 'HPP' || i.group === 'BEBAN_USAHA').map((i) => (
                    <TR key={i.id}>
                      <TD className="text-ink">{i.accountName}</TD>
                      <TD align="right">{money(i.commercialAmount, country)}</TD>
                      <TD align="right" className="text-ink">{money(fiscalOf(i), country)}</TD>
                      <TD align="right">{live.expenses ? `${((i.commercialAmount / live.expenses) * 100).toFixed(1)}%` : '—'}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
            {section === 'l3' && (
              <Table>
                <THead>
                  <tr>
                    <TH>Kredit pajak</TH>
                    <TH align="right">Nilai</TH>
                  </tr>
                </THead>
                <tbody>
                  {(calc.credits ?? []).map((c) => (
                    <TR key={c.id}>
                      <TD className="text-ink">{c.label}</TD>
                      <TD align="right" className="text-ink">{money(c.amount, country)}</TD>
                    </TR>
                  ))}
                  <TR>
                    <TD className="text-ink font-medium">Total</TD>
                    <TD align="right" className="text-ink font-semibold">{money(fig.credits, country)}</TD>
                  </TR>
                </tbody>
              </Table>
            )}
            <div className="px-5 py-3 border-t border-line text-xs text-ink-3 flex flex-wrap items-center justify-between gap-2">
              <span>Angka {locked ? 'dikunci saat persetujuan' : 'mengikuti rekonsiliasi fiskal secara langsung'}.</span>
              <Link href="/calculation" className="text-brand-600 font-medium">Buka rekonsiliasi</Link>
            </div>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-20">
          <Card>
            <CardHeader title="Persetujuan maker-checker" />
            <CardBody className="space-y-4">
              <ol className="flex items-center gap-1" aria-label="Alur persetujuan">
                {FLOW.map((f, i) => (
                  <li key={f.status} className="flex-1 min-w-0">
                    <div className={cn('h-1.5 rounded-full', i <= flowIndex ? 'bg-brand-500' : 'bg-muted')} />
                    <div className={cn('mt-1.5 text-[11px] truncate', i === flowIndex ? 'text-ink font-medium' : 'text-ink-3')}>{f.label}</div>
                  </li>
                ))}
              </ol>

              {(ret.returnStatus === 'Draft' || ret.returnStatus === 'Review') && (
                <ul className="space-y-2">
                    {checks.map((c) => (
                      <li key={c.key}>
                        <Link href={c.href} className="flex items-start gap-2.5 text-[13px] rounded-lg -mx-1.5 px-1.5 py-1 hover:bg-subtle">
                          {c.ok ? <Check className="size-4 text-success-600 mt-0.5 shrink-0" /> : c.blocking ? <AlertTriangle className="size-4 text-danger-600 mt-0.5 shrink-0" /> : <CircleDashed className="size-4 text-warning-600 mt-0.5 shrink-0" />}
                          <span>
                            <span className="block text-ink">{c.label}</span>
                            <span className={cn('block text-xs', c.ok ? 'text-ink-3' : c.blocking ? 'text-danger-600' : 'text-warning-700')}>{c.detail}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              )}

              {ret.returnStatus === 'Draft' && (
                <>
                  <Button variant="primary" className="w-full" icon={<Send />} onClick={submit} disabled={blocked}>
                    Ajukan ke checker
                  </Button>
                  {blocked && <p className="text-xs text-danger-600">Selesaikan pemeriksaan bertanda merah sebelum mengajukan.</p>}
                </>
              )}

              {ret.returnStatus === 'Review' && (
                <>
                  <div className="text-[13px] text-ink-2">
                    Diajukan oleh <span className="text-ink font-medium">{ret.creator?.name}</span>
                    {ret.submittedAt && <span className="text-ink-3"> · {dateTime(ret.submittedAt)}</span>}
                  </div>
                  {canCheck ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button icon={<Undo2 />} onClick={sendBack}>Kembalikan</Button>
                      <Button variant="primary" icon={<CheckCheck />} onClick={approve}>Setujui</Button>
                    </div>
                  ) : (
                    <Callout
                      tone="warning"
                      icon={<UserCog />}
                      title={isCreator ? 'Maker tidak boleh menyetujui draf sendiri' : 'Perlu Group CEO/CFO sebagai checker'}
                      action={checker && <Button size="sm" onClick={() => { ws.setPersonaId(checker.id); ui.toast(`Masuk sebagai ${checker.name}`, 'info'); }}>Masuk sebagai checker</Button>}
                    />
                  )}
                </>
              )}

              {ret.returnStatus === 'Approved' && (
                <>
                  <div className="text-[13px] text-ink-2">
                    Disetujui <span className="text-ink font-medium">{ret.approver?.name}</span>
                    {ret.approvedAt && <span className="text-ink-3"> · {dateTime(ret.approvedAt)}</span>}
                  </div>
                  {fig.payable > 0 ? (
                    <Button variant="primary" className="w-full" icon={<ReceiptText />} onClick={issueBilling}>
                      Terbitkan kode billing · {money(fig.payable, country)}
                    </Button>
                  ) : (
                    <Callout tone="success" title="Lebih bayar">Tidak ada setoran. Ajukan restitusi/pengembalian sesuai prosedur.</Callout>
                  )}
                </>
              )}

              {ret.returnStatus === 'Ready' && (
                <Callout tone="brand" icon={<ReceiptText />} title="Kode billing terbit" action={<Button size="sm" onClick={() => router.push('/payments')}>Bayar</Button>}>
                  Lanjutkan pembayaran {money(fig.payable, country)} sebelum melaporkan.
                </Callout>
              )}

              {locked && ws.isParentExec && (
                <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={reopen}>Buka kembali sebagai draf</Button>
              )}
            </CardBody>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardHeader title="Riwayat" />
              <CardBody>
                <ol className="relative border-l border-line ml-1.5 space-y-3">
                  {history.slice().reverse().map((h, i) => (
                    <li key={i} className="pl-4">
                      <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-surface ring-2 ring-line-strong" />
                      <div className="text-[13px] text-ink">{h.action}</div>
                      <div className="text-xs text-ink-3">{h.by} · {dateTime(h.at)}</div>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <CycleFooter current="/tax-return" />
    </div>
  );
}
