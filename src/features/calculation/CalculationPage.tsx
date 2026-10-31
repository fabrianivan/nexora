'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Info, Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import type { FiscalReconciliationItem } from '@/data/indonesiaTaxData';
import { MULTI_COUNTRY_DATA } from '@/data/multiCountryTaxData';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { computeCit, FACILITY, fiscalOf, RETURN_FORM, STANDARD_RATE, type CreditLine } from '@/lib/cit';
import { isUnresolved } from '@/lib/compliance';
import { money, pct } from '@/lib/format';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Dialog,
  IconButton,
  Input,
  PageHeader,
  SelectField,
  Stat,
  Switch,
  Table,
  TD,
  TextField,
  TH,
  THead,
  TR,
  Tabs,
  cn,
} from '@/ui';
import { CycleFooter } from '@/shell/CycleFooter';
import { shortMonth } from '../shared';

type Tab = 'recon' | 'vat' | 'wht' | 'whatif';

const GROUP_LABEL: Record<FiscalReconciliationItem['group'], string> = {
  PENDAPATAN: 'Pendapatan',
  HPP: 'HPP',
  BEBAN_USAHA: 'Beban usaha',
  PENDAPATAN_LAIN: 'Pendapatan lain',
};

// ── Line dialog ──────────────────────────────────────────────────────────
function LineDialog({ open, onClose, initial, onSave }: { open: boolean; onClose: () => void; initial: FiscalReconciliationItem | null; onSave: (i: FiscalReconciliationItem) => void }) {
  const blank: FiscalReconciliationItem = { id: `REC-${Date.now().toString(36).toUpperCase()}`, accountCode: '', accountName: '', group: 'BEBAN_USAHA', commercialAmount: 0, positiveCorrection: 0, negativeCorrection: 0, fiscalAmount: 0, correctionReason: '', legalBasis: '' };
  const [f, setF] = useState<FiscalReconciliationItem>(initial ?? blank);
  const [touched, setTouched] = useState(false);
  React.useEffect(() => {
    if (open) {
      setF(initial ?? { ...blank, id: `REC-${Date.now().toString(36).toUpperCase()}` });
      setTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);
  const set = (k: keyof FiscalReconciliationItem) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((x) => ({ ...x, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }));
  const err = !f.accountCode.trim() || f.accountName.trim().length < 3;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={initial ? 'Ubah baris rekonsiliasi' : 'Tambah koreksi fiskal'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button
            variant="primary"
            onClick={() => {
              setTouched(true);
              if (err) return;
              onSave({ ...f, fiscalAmount: fiscalOf(f) });
              onClose();
            }}
          >
            Simpan
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Kode akun" mono value={f.accountCode} onChange={set('accountCode')} error={touched && !f.accountCode.trim() ? 'Wajib' : undefined} autoFocus />
        <SelectField label="Kelompok" value={f.group} onChange={set('group')}>
          {Object.entries(GROUP_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </SelectField>
        <TextField label="Nama akun" value={f.accountName} onChange={set('accountName')} className="sm:col-span-2" error={touched && f.accountName.trim().length < 3 ? 'Minimal 3 karakter' : undefined} />
        <TextField label="Nilai komersial" type="number" value={f.commercialAmount} onChange={set('commercialAmount')} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Koreksi (+)" type="number" min={0} value={f.positiveCorrection} onChange={set('positiveCorrection')} />
          <TextField label="Koreksi (−)" type="number" min={0} value={f.negativeCorrection} onChange={set('negativeCorrection')} />
        </div>
        <TextField label="Alasan koreksi" value={f.correctionReason} onChange={set('correctionReason')} className="sm:col-span-2" />
        <TextField label="Dasar hukum" value={f.legalBasis} onChange={set('legalBasis')} className="sm:col-span-2" placeholder="mis. Pasal 9 ayat (1) huruf a UU PPh" />
      </div>
    </Dialog>
  );
}

// ── Reconciliation tab ───────────────────────────────────────────────────
function ReconTab() {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();
  const entity = ws.activeEntity;
  const country = entity.countryCode;
  const calc = ws.calculationFor(entity.id);
  const credits = calc.credits ?? [];
  const result = computeCit(calc.items, country, calc.apply31EFacility, credits);
  const facility = FACILITY[country];
  const [dialog, setDialog] = useState<{ open: boolean; item: FiscalReconciliationItem | null }>({ open: false, item: null });
  const [del, setDel] = useState<FiscalReconciliationItem | null>(null);
  const findingsByAccount = useMemo(() => {
    const map = new Map<string, { id: string; name: string; open: boolean }[]>();
    ws.findings
      .filter((f) => f.entityId === entity.id && f.correction)
      .forEach((f) => {
        const arr = map.get(f.correction!.accountCode) ?? [];
        arr.push({ id: f.id, name: f.ruleName, open: isUnresolved(ws.reviewOf(f.id).status) });
        map.set(f.correction!.accountCode, arr);
      });
    return map;
  }, [ws, entity.id]);

  const save = (items: FiscalReconciliationItem[], msg: string, audit?: [string, string]) => {
    ws.setCalculation(entity.id, { ...calc, items });
    if (audit) ws.logAudit(audit[0], `Rekonsiliasi ${entity.legalName}`, audit[1]);
    ui.toast(msg);
  };
  const setCredits = (next: CreditLine[]) => ws.setCalculation(entity.id, { ...calc, credits: next });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Laba komersial" value={money(result.commercialProfit, country)} hint={`Pendapatan ${money(result.revenue, country)}`} />
        <Stat label="Koreksi positif" value={`+${money(result.positive, country)}`} hint="Biaya tidak dapat dikurangkan" tone="danger" />
        <Stat label="Penghasilan kena pajak" value={money(result.taxableIncome, country)} hint={`Koreksi negatif ${money(result.negative, country)}`} />
        <Stat label={result.payable > 0 ? 'Kurang bayar' : 'Lebih bayar'} value={money(result.payable || result.overpaid, country)} hint={`Pajak terutang ${money(result.taxDue, country)}`} tone={result.payable > 0 ? 'warning' : 'success'} />
      </div>

      <Card>
        <CardHeader
          title="Rekonsiliasi laba komersial ke fiskal"
          description="Setiap koreksi wajib memiliki dasar hukum. Koreksi dari temuan yang dikonfirmasi diberi tautan."
          actions={<Button size="sm" icon={<Plus />} onClick={() => setDialog({ open: true, item: null })}>Tambah koreksi</Button>}
        />
        <Table>
          <THead>
            <tr>
              <TH>Akun</TH>
              <TH align="right">Komersial</TH>
              <TH align="right">Koreksi (+)</TH>
              <TH align="right">Koreksi (−)</TH>
              <TH align="right">Fiskal</TH>
              <TH>Dasar koreksi</TH>
              <TH />
            </tr>
          </THead>
          <tbody>
            {calc.items.map((i) => {
              const linked = findingsByAccount.get(i.accountCode) ?? [];
              return (
                <TR key={i.id}>
                  <TD className="min-w-[220px] max-w-[280px]">
                    <div className="text-ink font-medium">{i.accountName}</div>
                    <div className="text-xs text-ink-3"><span className="font-mono">{i.accountCode}</span> · {GROUP_LABEL[i.group]}</div>
                  </TD>
                  <TD align="right" className="text-ink">{money(i.commercialAmount, country)}</TD>
                  <TD align="right" className={i.positiveCorrection ? 'text-danger-700 font-medium' : 'text-ink-4'}>{i.positiveCorrection ? money(i.positiveCorrection, country) : '—'}</TD>
                  <TD align="right" className={i.negativeCorrection ? 'text-success-700 font-medium' : 'text-ink-4'}>{i.negativeCorrection ? money(i.negativeCorrection, country) : '—'}</TD>
                  <TD align="right" className="text-ink font-medium">{money(fiscalOf(i), country)}</TD>
                  <TD className="min-w-[260px]">
                    <div className="text-[13px] text-ink-2 line-clamp-2">{i.correctionReason.replace(/\s*\[[^\]]+\]/g, '') || '—'}</div>
                    {i.legalBasis && <div className="text-xs text-ink-3 mt-0.5">{i.legalBasis}</div>}
                    {linked.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {linked.map((l) => (
                          <button key={l.id} type="button" onClick={() => router.push(`/review?f=${encodeURIComponent(l.id)}`)} className="cursor-pointer">
                            <Badge tone={l.open ? 'warning' : 'brand'}><Link2 className="size-3" />{l.name}{l.open ? ' · belum diputuskan' : ''}</Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </TD>
                  <TD align="right" className="whitespace-nowrap">
                    <IconButton label="Ubah" size="sm" onClick={() => setDialog({ open: true, item: i })}><Pencil /></IconButton>
                    <IconButton label="Hapus" size="sm" onClick={() => setDel(i)}><Trash2 /></IconButton>
                  </TD>
                </TR>
              );
            })}
            <tr className="bg-subtle border-t border-line font-medium">
              <TD className="text-ink">Total</TD>
              <TD align="right" className="text-ink">{money(result.commercialProfit, country)}</TD>
              <TD align="right" className="text-danger-700">{money(result.positive, country)}</TD>
              <TD align="right" className="text-success-700">{money(result.negative, country)}</TD>
              <TD align="right" className="text-ink">{money(result.taxableIncome, country)}</TD>
              <TD colSpan={2} className="text-xs text-ink-3">Laba komersial + koreksi positif − koreksi negatif</TD>
            </tr>
          </tbody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader
            title={`Perhitungan ${country === 'ID' ? 'PPh badan' : 'pajak korporasi'}`}
            description={`Tarif normal ${pct(STANDARD_RATE[country], 0)} · ${MULTI_COUNTRY_DATA[country].authorityShort}`}
          />
          <CardBody className="space-y-4">
            {facility && (
              <div className="rounded-lg border border-line px-3.5 py-3">
                <Switch
                  checked={calc.apply31EFacility}
                  onChange={(v) => {
                    ws.setCalculation(entity.id, { ...calc, apply31EFacility: v });
                    ws.logAudit('TOGGLE_FACILITY', `Rekonsiliasi ${entity.legalName}`, `${facility.label} ${v ? 'diterapkan' : 'tidak diterapkan'}.`);
                  }}
                  label={<span className="font-medium text-ink">{facility.label}</span>}
                />
                <p className="text-xs text-ink-3 mt-1.5 pl-[46px]">{facility.basis}</p>
              </div>
            )}
            <dl className="divide-y divide-line rounded-lg border border-line">
              <div className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-[13px]">
                <dt className="text-ink-2">Penghasilan kena pajak</dt>
                <dd className="text-ink font-medium num">{money(result.taxableIncome, country)}</dd>
              </div>
              {result.steps.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-[13px]">
                  <dt>
                    <div className="text-ink-2">{s.label}</div>
                    <div className="text-xs text-ink-4 font-mono">{s.formula}</div>
                  </dt>
                  <dd className="text-ink num">{money(s.amount, country)}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-[13px] bg-subtle">
                <dt className="text-ink font-medium">Pajak terutang</dt>
                <dd className="text-ink font-semibold num">{money(result.taxDue, country)}</dd>
              </div>
            </dl>
            <p className="text-xs text-ink-3">Tarif efektif terhadap laba komersial: {pct(result.effectiveRate)}</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Kredit pajak" description="Pajak yang sudah dipotong/dipungut/diangsur tahun berjalan" actions={<Button size="sm" icon={<Plus />} onClick={() => setCredits([...credits, { id: `c-${Date.now().toString(36)}`, label: 'Kredit pajak lain', amount: 0 }])}>Tambah</Button>} />
          <CardBody className="space-y-2">
            {credits.map((c, idx) => (
              <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_150px_auto] gap-2 items-center">
                <Input aria-label="Uraian kredit" value={c.label} onChange={(e) => setCredits(credits.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))} />
                <Input aria-label="Nilai kredit" type="number" min={0} className="text-right num" value={c.amount} onChange={(e) => setCredits(credits.map((x, i) => (i === idx ? { ...x, amount: Number(e.target.value) || 0 } : x)))} />
                <IconButton label="Hapus kredit" size="sm" onClick={() => setCredits(credits.filter((_, i) => i !== idx))}><Trash2 /></IconButton>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-line text-[13px]">
              <span className="text-ink-2">Total kredit</span>
              <span className="text-ink font-medium num">{money(result.credits, country)}</span>
            </div>
            <div className={cn('flex items-center justify-between rounded-lg px-3.5 py-3 text-sm', result.payable > 0 ? 'bg-warning-50 text-warning-700' : 'bg-success-50 text-success-700')}>
              <span className="font-medium">{result.payable > 0 ? `Kurang bayar (${country === 'ID' ? 'PPh Pasal 29' : 'balance due'})` : 'Lebih bayar'}</span>
              <span className="font-semibold num">{money(result.payable || result.overpaid, country)}</span>
            </div>
            <div className="flex justify-end pt-1">
              <Button variant="primary" iconRight={<ArrowRight />} onClick={() => router.push('/tax-return')}>
                Susun {RETURN_FORM[country].short}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <LineDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, item: null })}
        initial={dialog.item}
        onSave={(item) => {
          const exists = calc.items.some((x) => x.id === item.id);
          save(exists ? calc.items.map((x) => (x.id === item.id ? item : x)) : [...calc.items, item], exists ? 'Baris rekonsiliasi diperbarui.' : 'Koreksi fiskal ditambahkan.', [exists ? 'UPDATE_FISCAL_LINE' : 'ADD_FISCAL_CORRECTION', `${item.accountCode} ${item.accountName}: +${item.positiveCorrection} / −${item.negativeCorrection}`]);
        }}
      />
      <ConfirmDialog
        open={Boolean(del)}
        onClose={() => setDel(null)}
        danger
        confirmLabel="Hapus"
        title={`Hapus akun ${del?.accountCode}?`}
        description="Baris dan koreksinya dihapus dari rekonsiliasi."
        onConfirm={() => del && save(calc.items.filter((x) => x.id !== del.id), 'Baris dihapus.', ['DELETE_FISCAL_LINE', `${del.accountCode} ${del.accountName}`])}
      />
    </div>
  );
}

// ── VAT tab ──────────────────────────────────────────────────────────────
function VatTab() {
  const ws = useWorkspace();
  const entity = ws.activeEntity;
  const country = entity.countryCode;
  const cfg = MULTI_COUNTRY_DATA[country];
  const vatName = cfg.indirectTaxName.split(' ')[0];
  const blocked = ws.findings
    .filter((f) => f.entityId === entity.id && (f.rule === 'TBTS' || f.rule === 'MISSING_TRADER') && ws.reviewOf(f.id).status !== 'dismissed')
    .map((f) => ({ f, doc: ws.compliance.documents.find((d) => d.doc.id === f.documentIds[0])?.doc }))
    .filter((x) => x.doc);
  const blockedTotal = blocked.reduce((s, x) => s + (x.doc?.taxAmount.value ?? 0), 0);
  const rows = cfg.monthlyMetrics;
  const last = rows[rows.length - 1];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label={`${vatName} keluaran (${shortMonth(last.month)})`} value={money(last.ppnKeluaran, country)} />
        <Stat label={`${vatName} masukan (${shortMonth(last.month)})`} value={money(last.ppnMasukan, country)} />
        <Stat label="Kurang bayar masa ini" value={money(Math.max(0, last.ppnKeluaran - last.ppnMasukan + blockedTotal), country)} hint={blockedTotal ? 'Termasuk masukan yang diblokir' : undefined} tone="warning" />
        <Stat label="Masukan diblokir" value={money(blockedTotal, country)} hint={`${blocked.length} faktur berisiko`} tone={blockedTotal ? 'danger' : undefined} />
      </div>
      {blocked.length > 0 && (
        <Callout tone="danger" title={`${vatName} masukan dari ${blocked.length} faktur tidak dikreditkan`}>
          {blocked.map((b) => `${b.doc!.counterparty.value} (${money(b.doc!.taxAmount.value, country)})`).join(', ')} — menunggu keputusan atau sudah dikonfirmasi berisiko.{' '}
          <Link href="/risk" className="underline">Lihat temuan</Link>
        </Callout>
      )}
      <Card>
        <CardHeader title={`Rekapitulasi ${vatName} per masa`} description={cfg.filingFormName} />
        <Table>
          <THead>
            <tr>
              <TH>Masa</TH>
              <TH align="right">Penyerahan (omzet)</TH>
              <TH align="right">{vatName} keluaran</TH>
              <TH align="right">{vatName} masukan</TH>
              <TH align="right">Selisih</TH>
              <TH align="right">Anomali</TH>
            </tr>
          </THead>
          <tbody>
            {rows.map((m) => {
              const diff = m.ppnKeluaran - m.ppnMasukan;
              return (
                <TR key={m.month}>
                  <TD className="text-ink">{m.month}</TD>
                  <TD align="right">{money(m.omzet, country)}</TD>
                  <TD align="right" className="text-ink">{money(m.ppnKeluaran, country)}</TD>
                  <TD align="right" className="text-ink">{money(m.ppnMasukan, country)}</TD>
                  <TD align="right" className="text-ink font-medium">{money(diff, country)}</TD>
                  <TD align="right">{m.anomalyCount ? <Badge tone={m.anomalyCount > 2 ? 'danger' : 'warning'}>{m.anomalyCount}</Badge> : <span className="text-ink-4">0</span>}</TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

// ── Withholding tax calculator ───────────────────────────────────────────
const WHT_TYPES: Record<string, { id: string; label: string; rate: (o: { hasId: boolean; treaty: boolean }) => number; base?: number; basis: string; idToggle?: string; treatyToggle?: boolean }[]> = {
  ID: [
    { id: 'pph23', label: 'PPh 23 — jasa teknik/manajemen/konsultan', rate: ({ hasId }) => (hasId ? 0.02 : 0.04), basis: 'Pasal 23 UU PPh; tarif 100% lebih tinggi tanpa NPWP', idToggle: 'Penerima punya NPWP' },
    { id: 'pph4', label: 'PPh 4(2) — sewa tanah/bangunan', rate: () => 0.1, basis: 'PP 34/2017 — final 10%' },
    { id: 'pph21', label: 'PPh 21 — bukan pegawai', rate: () => 0.05, base: 0.5, basis: 'PMK 168/2023 — DPP 50% × bruto, tarif Pasal 17 lapisan pertama' },
    { id: 'pph26', label: 'PPh 26 — WPLN (royalti/jasa)', rate: ({ treaty }) => (treaty ? 0.1 : 0.2), basis: 'Pasal 26 UU PPh; tarif P3B dengan DGT', treatyToggle: true },
  ],
  SG: [
    { id: 'svc', label: 'Section 12(7) — technical services', rate: () => 0.17, basis: 'ITA s.12(7) & s.45 — prevailing corporate rate' },
    { id: 'roy', label: 'Royalty to non-resident', rate: ({ treaty }) => (treaty ? 0.08 : 0.1), basis: 'ITA s.12(7); reduced under DTA', treatyToggle: true },
    { id: 'int', label: 'Interest to non-resident', rate: ({ treaty }) => (treaty ? 0.1 : 0.15), basis: 'ITA s.12(6)', treatyToggle: true },
  ],
  MY: [
    { id: 'roy', label: 'Royalti — Seksyen 109', rate: ({ treaty }) => (treaty ? 0.08 : 0.1), basis: 'ITA 1967 s.109', treatyToggle: true },
    { id: 'svc', label: 'Perkhidmatan — Seksyen 109B', rate: () => 0.1, basis: 'ITA 1967 s.109B' },
    { id: 'int', label: 'Faedah — Seksyen 109', rate: ({ treaty }) => (treaty ? 0.1 : 0.15), basis: 'ITA 1967 s.109', treatyToggle: true },
  ],
  US: [
    { id: 'fdap', label: 'FDAP income to foreign person', rate: ({ treaty }) => (treaty ? 0.1 : 0.3), basis: 'IRC §1442 — Form 1042-S; treaty rate with W-8BEN-E', treatyToggle: true },
    { id: 'backup', label: 'Backup withholding (no TIN)', rate: ({ hasId }) => (hasId ? 0 : 0.24), basis: 'IRC §3406', idToggle: 'Penerima memberikan TIN (W-9)' },
  ],
};

function WhtTab() {
  const ws = useWorkspace();
  const ui = useUi();
  const country = ws.country;
  const types = WHT_TYPES[country];
  const [typeId, setTypeId] = useState(types[0].id);
  const [gross, setGross] = useState(country === 'ID' ? 25_000_000 : 10_000);
  const [hasId, setHasId] = useState(true);
  const [treaty, setTreaty] = useState(true);
  const t = types.find((x) => x.id === typeId) ?? types[0];
  const base = gross * (t.base ?? 1);
  const rate = t.rate({ hasId, treaty });
  const tax = base * rate;
  React.useEffect(() => setTypeId(types[0].id), [country, types]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <Card>
        <CardHeader title="Kalkulator pemotongan pajak" description={`${ws.activeEntity.flag} ${MULTI_COUNTRY_DATA[country].authorityShort}`} />
        <CardBody className="space-y-4">
          <SelectField label="Jenis penghasilan" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {types.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </SelectField>
          <TextField label={`Penghasilan bruto (${MULTI_COUNTRY_DATA[country].currencyCode})`} type="number" min={0} value={gross} onChange={(e) => setGross(Number(e.target.value) || 0)} />
          {t.idToggle && <Switch checked={hasId} onChange={setHasId} label={t.idToggle} />}
          {t.treatyToggle && <Switch checked={treaty} onChange={setTreaty} label="Formulir treaty valid (DGT / COR / W-8BEN-E)" />}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Hasil" />
        <CardBody className="space-y-4">
          <dl className="divide-y divide-line rounded-lg border border-line text-[13px]">
            <div className="flex justify-between px-3.5 py-2.5"><dt className="text-ink-2">Dasar pengenaan</dt><dd className="text-ink num">{money(base, country)}</dd></div>
            <div className="flex justify-between px-3.5 py-2.5"><dt className="text-ink-2">Tarif</dt><dd className="text-ink num">{pct(rate, 2)}</dd></div>
            <div className="flex justify-between px-3.5 py-2.5 bg-subtle"><dt className="text-ink font-medium">Pajak dipotong</dt><dd className="text-ink font-semibold num">{money(tax, country)}</dd></div>
            <div className="flex justify-between px-3.5 py-2.5"><dt className="text-ink-2">Diterima penerima</dt><dd className="text-ink num">{money(gross - tax, country)}</dd></div>
          </dl>
          <Callout tone="neutral" icon={<Info />}>{t.basis}</Callout>
          <Button size="sm" onClick={() => ui.askCopilot(`Jelaskan pemotongan ${t.label} atas ${money(gross, country)} untuk ${ws.activeEntity.legalName}, termasuk bukti potong dan tenggat setor/lapor.`)}>Tanya Copilot</Button>
        </CardBody>
      </Card>
    </div>
  );
}

// ── What-if simulator ────────────────────────────────────────────────────
function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[13px] text-ink-2 mb-1.5">
        {label}
        <span className={cn('font-medium num', value > 0 ? 'text-success-700' : value < 0 ? 'text-danger-700' : 'text-ink')}>{value > 0 ? '+' : ''}{value}%</span>
      </span>
      <input type="range" min={-50} max={50} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-brand-600 cursor-pointer" />
    </label>
  );
}

function WhatIfTab() {
  const ws = useWorkspace();
  const entity = ws.activeEntity;
  const country = entity.countryCode;
  const calc = ws.calculationFor(entity.id);
  const [revenuePct, setRevenuePct] = useState(0);
  const [expensePct, setExpensePct] = useState(0);
  const [cleanCorrections, setCleanCorrections] = useState(false);
  const [facility, setFacility] = useState(calc.apply31EFacility);
  const base = computeCit(calc.items, country, calc.apply31EFacility, calc.credits ?? []);
  const scenarioItems = calc.items.map((i) => {
    const income = i.group === 'PENDAPATAN' || i.group === 'PENDAPATAN_LAIN';
    const factor = 1 + (income ? revenuePct : expensePct) / 100;
    return { ...i, commercialAmount: Math.round(i.commercialAmount * factor), positiveCorrection: cleanCorrections ? 0 : i.positiveCorrection };
  });
  const sc = computeCit(scenarioItems, country, facility, calc.credits ?? []);
  const delta = sc.taxDue - base.taxDue;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 sm:gap-6">
      <Card>
        <CardHeader title="Asumsi skenario" description="Tidak mengubah data rekonsiliasi" />
        <CardBody className="space-y-5">
          <Slider label="Perubahan pendapatan" value={revenuePct} onChange={setRevenuePct} />
          <Slider label="Perubahan beban" value={expensePct} onChange={setExpensePct} />
          <Switch checked={cleanCorrections} onChange={setCleanCorrections} label="Semua biaya lolos uji (tanpa koreksi positif)" />
          {FACILITY[country] && <Switch checked={facility} onChange={setFacility} label={FACILITY[country]!.label} />}
          <Button variant="ghost" size="sm" onClick={() => { setRevenuePct(0); setExpensePct(0); setCleanCorrections(false); setFacility(calc.apply31EFacility); }}>Reset skenario</Button>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Dampak" />
        <Table>
          <THead>
            <tr>
              <TH />
              <TH align="right">Saat ini</TH>
              <TH align="right">Skenario</TH>
              <TH align="right">Selisih</TH>
            </tr>
          </THead>
          <tbody>
            {[
              ['Laba komersial', base.commercialProfit, sc.commercialProfit],
              ['Penghasilan kena pajak', base.taxableIncome, sc.taxableIncome],
              ['Pajak terutang', base.taxDue, sc.taxDue],
              ['Kurang (lebih) bayar', base.payable - base.overpaid, sc.payable - sc.overpaid],
            ].map(([label, a, b]) => (
              <TR key={label as string}>
                <TD className="text-ink">{label}</TD>
                <TD align="right">{money(a as number, country)}</TD>
                <TD align="right" className="text-ink font-medium">{money(b as number, country)}</TD>
                <TD align="right" className={cn((b as number) - (a as number) > 0 ? 'text-danger-700' : (b as number) - (a as number) < 0 ? 'text-success-700' : 'text-ink-4')}>
                  {(b as number) - (a as number) === 0 ? '—' : `${(b as number) - (a as number) > 0 ? '+' : ''}${money((b as number) - (a as number), country)}`}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
        <CardBody className="pt-4">
          <Callout tone={delta > 0 ? 'warning' : delta < 0 ? 'success' : 'neutral'}>
            {delta === 0 ? 'Skenario sama dengan posisi saat ini.' : `Pajak terutang ${delta > 0 ? 'naik' : 'turun'} ${money(Math.abs(delta), country)} (tarif efektif ${pct(sc.effectiveRate)}).`}
          </Callout>
        </CardBody>
      </Card>
    </div>
  );
}

export function CalculationPage() {
  const ws = useWorkspace();
  const [tab, setTab] = useState<Tab>('recon');
  const country = ws.country;
  return (
    <div>
      <PageHeader
        eyebrow={<span>Langkah 5 · Siklus kepatuhan</span>}
        title="Rekonsiliasi fiskal"
        description={`${ws.activeEntity.flag} ${ws.activeEntity.legalName} · tahun pajak 2026 · ${RETURN_FORM[country].name}`}
      />
      <Tabs<Tab>
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'recon', label: 'Rekonsiliasi & PPh badan' },
          { id: 'vat', label: country === 'ID' ? 'PPN masukan/keluaran' : 'Indirect tax' },
          { id: 'wht', label: 'Pemotongan pajak' },
          { id: 'whatif', label: 'Simulasi what-if' },
        ]}
      />
      {tab === 'recon' && <ReconTab />}
      {tab === 'vat' && <VatTab />}
      {tab === 'wht' && <WhtTab />}
      {tab === 'whatif' && <WhatIfTab />}
      <CycleFooter current="/calculation" />
    </div>
  );
}
