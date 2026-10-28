'use client';

import React, { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Copy, Landmark, Plus, ReceiptText, Wallet, AlertTriangle } from 'lucide-react';
import type { CountryCode } from '@/data/multiCountryTaxData';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { daysUntil, dateShort, money, moneyCompact, relativeDays } from '@/lib/format';
import { toIdr, FX_NOTE } from '@/lib/fx';
import { paymentStatus } from '@/lib/schedule';
import type { PaymentLiability } from '@/state/types';
import {
  Badge,
  Button,
  Callout,
  Card,
  DescriptionList,
  Dialog,
  EmptyState,
  PageHeader,
  Segmented,
  SelectField,
  Stat,
  Table,
  TD,
  TextField,
  TH,
  THead,
  TR,
  cn,
} from '@/ui';
import { CycleFooter } from '@/shell/CycleFooter';
import { EntityName, ScopeToggle, useScopedIds, type Scope } from '../shared';

type Filter = 'open' | 'paid' | 'all';

const CHANNELS: Record<CountryCode, string[]> = {
  ID: ['Bank/Pos persepsi (teller)', 'ATM & mobile banking (menu pajak)', 'Internet banking korporasi (MPN G3)', 'Coretax DJP — deposit pajak'],
  SG: ['GIRO (auto-debit)', 'PayNow QR / Internet banking', 'AXS station'],
  MY: ['FPX via MyTax ByrHASiL', 'Kaunter bank ejen (CIMB, Maybank)', 'Pemindahan telegraf (luar negara)'],
  US: ['EFTPS (Electronic Federal Tax Payment System)', 'Same-day wire via financial institution'],
};

/** Indicative late-payment penalty (not legal advice). */
function penaltyFor(p: PaymentLiability, country: CountryCode): number {
  const late = -daysUntil(p.dueDate);
  if (late <= 0 || p.status === 'Dibayar') return 0;
  const months = Math.max(1, Math.ceil(late / 30));
  if (country === 'ID') return p.amount * 0.0061 * Math.min(months, 24); // bunga KMK ±0,61%/bulan (ilustrasi)
  if (country === 'SG') return p.amount * 0.05;
  if (country === 'MY') return p.amount * 0.1;
  return p.amount * 0.005 * months;
}

function PayDialog({ p, onClose }: { p: PaymentLiability | null; onClose: () => void }) {
  const ws = useWorkspace();
  const ui = useUi();
  const [ntpn, setNtpn] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  React.useEffect(() => {
    setNtpn('');
    setDate(new Date().toISOString().slice(0, 10));
  }, [p]);
  if (!p) return null;
  const entity = ws.entityById(p.entityId)!;
  const country = entity.countryCode;
  const paid = p.status === 'Dibayar';
  const validNtpn = country === 'ID' ? /^[A-Z0-9]{16}$/i.test(ntpn.trim()) : ntpn.trim().length >= 6;

  const generateBilling = () => {
    const code = country === 'ID' ? `${Math.floor(1e14 + Math.random() * 9e14)}` : `${country}-${Date.now().toString(36).toUpperCase()}`;
    ws.setPayments(ws.payments.map((x) => (x.id === p.id ? { ...x, billingCode: code } : x)));
    ws.logAudit('ISSUE_BILLING_CODE', `${p.taxType} · ${entity.legalName}`, `Kode billing ${code} · ${money(p.amount, country)}`);
    ui.toast(`Kode billing ${code} diterbitkan (berlaku 7 hari).`);
  };

  const record = () => {
    ws.setPayments(ws.payments.map((x) => (x.id === p.id ? { ...x, status: 'Dibayar', ntpn: ntpn.trim().toUpperCase(), paidAt: `${date} ${new Date().toTimeString().slice(0, 8)}` } : x)));
    ws.logAudit('RECORD_PAYMENT', `${p.taxType} · ${entity.legalName}`, `NTPN/ref ${ntpn.trim().toUpperCase()} · ${money(p.amount, country)} · ${date}`);
    ui.toast('Pembayaran dicatat. Status kewajiban lunas.');
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={paid ? 'Bukti penerimaan negara' : country === 'ID' ? 'Surat setoran elektronik (SSE)' : 'Payment instruction'}
      description={`${entity.flag} ${entity.legalName}`}
      footer={
        paid ? (
          <Button onClick={onClose}>Tutup</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Batal</Button>
            {p.billingCode ? (
              <Button variant="primary" icon={<CheckCircle2 />} disabled={!validNtpn} onClick={record}>Catat pembayaran</Button>
            ) : (
              <Button variant="primary" icon={<ReceiptText />} onClick={generateBilling}>Buat kode billing</Button>
            )}
          </>
        )
      }
    >
      <div className="space-y-5">
        <DescriptionList
          columns={2}
          items={[
            { label: 'Jenis setoran', value: p.taxType },
            { label: 'Kode akun / jenis', value: p.kapKjs, mono: true },
            { label: 'Masa / periode', value: p.period },
            { label: 'Jatuh tempo', value: `${dateShort(p.dueDate)} (${relativeDays(p.dueDate)})` },
            { label: 'Identitas pajak', value: entity.taxId.split('(')[0].trim(), mono: true },
            { label: 'Jumlah', value: <span className="text-base font-semibold">{money(p.amount, country)}</span> },
          ]}
        />
        {p.billingCode && (
          <div className="rounded-xl bg-ink text-white px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-white/60">{country === 'ID' ? 'Kode billing (15 digit)' : 'Payment reference'}</div>
              <div className="font-mono text-lg tracking-wider">{p.billingCode}</div>
            </div>
            <button
              type="button"
              aria-label="Salin kode billing"
              onClick={() => {
                void navigator.clipboard?.writeText(p.billingCode ?? '');
                ui.toast('Kode billing disalin.', 'info');
              }}
              className="size-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
            >
              <Copy className="size-4" />
            </button>
          </div>
        )}
        {paid ? (
          <Callout tone="success" icon={<CheckCircle2 />} title={`NTPN ${p.ntpn}`}>Dibayar {p.paidAt}</Callout>
        ) : p.billingCode ? (
          <>
            <div>
              <div className="text-[13px] font-medium text-ink mb-1.5">Kanal pembayaran</div>
              <ul className="text-[13px] text-ink-2 list-disc pl-5 space-y-0.5">
                {CHANNELS[country].map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label={country === 'ID' ? 'NTPN (16 karakter)' : 'Bank reference'}
                mono
                value={ntpn}
                onChange={(e) => setNtpn(e.target.value)}
                placeholder={country === 'ID' ? '8291048291048291' : 'REF-…'}
                error={ntpn && !validNtpn ? (country === 'ID' ? 'NTPN harus 16 karakter alfanumerik' : 'Minimal 6 karakter') : undefined}
              />
              <TextField label="Tanggal bayar" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </>
        ) : (
          <Callout tone="neutral">Buat kode billing terlebih dahulu. Kode berlaku 7 hari dan harus sesuai jumlah setoran.</Callout>
        )}
      </div>
    </Dialog>
  );
}

function AddLiabilityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ws = useWorkspace();
  const ui = useUi();
  const [f, setF] = useState({ entityId: ws.activeEntityId, taxType: '', kapKjs: '', period: '', amount: '', dueDate: new Date().toISOString().slice(0, 10) });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const valid = f.taxType.trim().length > 2 && Number(f.amount) > 0;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tambah kewajiban"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() => {
              const p: PaymentLiability = { id: `PAY-${Date.now().toString(36).toUpperCase()}`, entityId: f.entityId, taxType: f.taxType.trim(), kapKjs: f.kapKjs.trim() || '-', period: f.period.trim() || '-', amount: Number(f.amount), dueDate: f.dueDate, status: 'Belum dibayar' };
              ws.setPayments([p, ...ws.payments]);
              ws.logAudit('ADD_LIABILITY', `${p.taxType} · ${ws.entityById(p.entityId)?.legalName}`, `${p.amount} jatuh tempo ${p.dueDate}`);
              ui.toast('Kewajiban ditambahkan.');
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
        <TextField label="Jenis pajak" value={f.taxType} onChange={set('taxType')} placeholder="PPh Pasal 23 Masa November" className="sm:col-span-2" />
        <TextField label="Kode akun / jenis setoran" mono value={f.kapKjs} onChange={set('kapKjs')} placeholder="411124-104" />
        <TextField label="Masa / periode" value={f.period} onChange={set('period')} placeholder="Masa 11-2026" />
        <TextField label="Jumlah" type="number" min={0} value={f.amount} onChange={set('amount')} />
        <TextField label="Jatuh tempo" type="date" value={f.dueDate} onChange={set('dueDate')} />
      </div>
    </Dialog>
  );
}

export function PaymentsPage() {
  const ws = useWorkspace();
  const [scope, setScope] = useState<Scope>(ws.isParentExec ? 'group' : 'entity');
  const ids = useScopedIds(scope);
  const [filter, setFilter] = useState<Filter>('open');
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const country = (id: string) => ws.entityById(id)?.countryCode ?? 'ID';

  const list = useMemo(() => ws.payments.filter((p) => ids.includes(p.entityId)), [ws.payments, ids]);
  const rows = list
    .filter((p) => (filter === 'all' ? true : filter === 'paid' ? p.status === 'Dibayar' : p.status !== 'Dibayar'))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const open = list.filter((p) => p.status !== 'Dibayar');
  const late = open.filter((p) => paymentStatus(p) === 'Terlambat');
  const week = open.filter((p) => daysUntil(p.dueDate) >= 0 && daysUntil(p.dueDate) <= 7);
  const openIdr = open.reduce((s, p) => s + toIdr(p.amount, country(p.entityId)), 0);
  const paidIdr = list.filter((p) => p.status === 'Dibayar').reduce((s, p) => s + toIdr(p.amount, country(p.entityId)), 0);
  const penalty = late.reduce((s, p) => s + toIdr(penaltyFor(p, country(p.entityId)), country(p.entityId)), 0);
  const selectedP = selected ? ws.payments.find((p) => p.id === selected) ?? null : null;

  return (
    <div>
      <PageHeader
        eyebrow={<span>Langkah 7 · Siklus kepatuhan</span>}
        title="Pembayaran"
        description="Kewajiban setor seluruh yurisdiksi: kode billing, bukti penerimaan (NTPN), dan estimasi sanksi keterlambatan."
        actions={<Button variant="primary" icon={<Plus />} onClick={() => setAdding(true)}>Tambah kewajiban</Button>}
      >
        <ScopeToggle value={scope} onChange={setScope} />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Stat label="Belum disetor" value={moneyCompact(openIdr)} hint={`${open.length} kewajiban`} icon={<Wallet />} />
        <Stat label="Jatuh tempo 7 hari" value={week.length} hint={week.length ? moneyCompact(week.reduce((s, p) => s + toIdr(p.amount, country(p.entityId)), 0)) : 'Tidak ada'} icon={<CalendarClock />} tone={week.length ? 'warning' : undefined} />
        <Stat label="Terlambat" value={late.length} hint={late.length ? `Estimasi sanksi ≈ ${moneyCompact(penalty)}` : 'Tidak ada'} icon={<AlertTriangle />} tone={late.length ? 'danger' : undefined} />
        <Stat label="Sudah disetor" value={moneyCompact(paidIdr)} hint="Dengan NTPN / referensi bank" icon={<Landmark />} tone="success" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            items={[
              { id: 'open', label: 'Belum disetor', count: open.length },
              { id: 'paid', label: 'Lunas', count: list.length - open.length },
              { id: 'all', label: 'Semua' },
            ]}
          />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<Landmark />} title="Tidak ada kewajiban di filter ini" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Kewajiban</TH>
                {scope === 'group' && <TH>Entitas</TH>}
                <TH>Jatuh tempo</TH>
                <TH align="right">Jumlah</TH>
                <TH>Status</TH>
                <TH>Billing / NTPN</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {rows.map((p) => {
                const st = paymentStatus(p);
                const c = country(p.entityId);
                const pen = penaltyFor(p, c);
                return (
                  <TR key={p.id} onClick={() => setSelected(p.id)}>
                    <TD>
                      <div className="text-ink font-medium">{p.taxType}</div>
                      <div className="text-xs text-ink-3"><span className="font-mono">{p.kapKjs}</span> · {p.period}</div>
                    </TD>
                    {scope === 'group' && <TD className="max-w-[200px]"><EntityName id={p.entityId} short /></TD>}
                    <TD className="whitespace-nowrap">
                      <div className="text-ink">{dateShort(p.dueDate)}</div>
                      {p.status !== 'Dibayar' && <div className={cn('text-xs', st === 'Terlambat' ? 'text-danger-600' : daysUntil(p.dueDate) <= 7 ? 'text-warning-700' : 'text-ink-3')}>{relativeDays(p.dueDate)}</div>}
                    </TD>
                    <TD align="right">
                      <div className="text-ink font-medium">{money(p.amount, c)}</div>
                      {pen > 0 && <div className="text-xs text-danger-600">+ sanksi ≈ {money(pen, c)}</div>}
                    </TD>
                    <TD>
                      <Badge tone={st === 'Dibayar' ? 'success' : st === 'Terlambat' ? 'danger' : 'warning'} dot>{st === 'Belum dibayar' ? 'Belum disetor' : st === 'Dibayar' ? 'Lunas' : st}</Badge>
                    </TD>
                    <TD className="font-mono text-xs">{p.ntpn ?? p.billingCode ?? <span className="font-sans text-ink-4">—</span>}</TD>
                    <TD align="right">
                      <Button size="sm" variant={p.status === 'Dibayar' ? 'ghost' : p.billingCode ? 'primary' : 'secondary'} onClick={() => setSelected(p.id)}>
                        {p.status === 'Dibayar' ? 'Bukti' : p.billingCode ? 'Bayar' : 'Buat billing'}
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <p className="mt-3 text-xs text-ink-4">{FX_NOTE}. Estimasi sanksi bersifat ilustratif: ID bunga ±0,61%/bulan, SG 5%, MY 10%, US 0,5%/bulan.</p>

      <CycleFooter current="/payments" />
      <PayDialog p={selectedP} onClose={() => setSelected(null)} />
      <AddLiabilityDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

