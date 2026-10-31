'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, RotateCw, ScanText, ShieldAlert, UploadCloud, X } from 'lucide-react';
import type { TaxDocument } from '@/lib/domain';
import { runRiskEngine, type WorkspaceDocument } from '@/lib/compliance';
import { MULTI_COUNTRY_DATA } from '@/data/multiCountryTaxData';
import { TAX_CONFIG } from '@/lib/tax';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { money } from '@/lib/format';
import { Button, Callout, Checkbox, Dialog, SelectField, Spinner, TextField, cn } from '@/ui';
import { useRouter } from 'next/navigation';

const LEDGERS = [
  { accountCode: '5100', accountName: 'Beban Pokok Pendapatan' },
  { accountCode: '6100', accountName: 'Beban Gaji, Tunjangan & Honorarium' },
  { accountCode: '6200', accountName: 'Beban Pemasaran, Jamuan & Representasi' },
  { accountCode: '6300', accountName: 'Beban Sewa Kantor, Utilitas & Operasional Umum' },
];

interface FormState {
  entityId: string;
  type: TaxDocument['type'];
  number: string;
  date: string;
  vendor: string;
  vendorTaxId: string;
  base: string;
  tax: string;
  uuid: string;
  ownership: string;
  validated: boolean;
  evidence: boolean;
  deductible: boolean;
  ledger: string;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Plausible counterparty tax id for AI-extracted demo invoices. */
function sampleTaxId(country: 'ID' | 'SG' | 'MY' | 'US'): string {
  const n = String(Date.now());
  if (country === 'ID') return `0${n.slice(-15).padStart(15, '7')}`;
  if (country === 'SG') return `${n.slice(-8)}K`;
  if (country === 'MY') return `C${n.slice(-10)}`;
  return `${n.slice(-9, -7)}-${n.slice(-7)}`;
}

type ScanState =
  | { state: 'idle' }
  | { state: 'scanning' }
  | { state: 'done'; filled: number; risk: boolean }
  | { state: 'error' };

/** Fields shown for every document type; the rest only apply to invoices. */
const COMMON_KEYS: (keyof FormState)[] = ['number', 'vendor', 'vendorTaxId'];

const pick = (src: Partial<FormState>, keys: Iterable<keyof FormState>) =>
  Object.fromEntries([...keys].map((k) => [k, src[k]])) as Partial<FormState>;

function AiTag() {
  return (
    <span aria-hidden title="Diisi Document AI" className="rounded px-1 py-px text-[10px] font-semibold leading-none tracking-wide bg-brand-50 text-brand-700 ring-1 ring-brand-200">
      AI
    </span>
  );
}

export function UploadDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: (id: string) => void }) {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scan, setScan] = useState<ScanState>({ state: 'idle' });
  const [dragging, setDragging] = useState(false);
  /** Fields whose current value came from Document AI. */
  const [aiKeys, setAiKeys] = useState<Set<keyof FormState>>(new Set());
  /** Fields the user typed into; extraction never overwrites them. */
  const manual = useRef(new Set<keyof FormState>());
  /** Only the latest extraction may write to the form. */
  const request = useRef(0);
  const [touched, setTouched] = useState(false);
  const blank = (): FormState => ({
    entityId: ws.activeEntityId,
    type: 'e_invoice',
    number: '',
    date: today(),
    vendor: '',
    vendorTaxId: '',
    base: '',
    tax: '',
    uuid: '',
    ownership: '',
    validated: false,
    evidence: true,
    deductible: true,
    ledger: '5100',
  });
  const [f, setF] = useState<FormState>(blank);
  const latest = useRef(f);
  useEffect(() => {
    latest.current = f;
  }, [f]);

  useEffect(() => {
    if (open) {
      request.current++;
      manual.current = new Set();
      setF(blank());
      setFile(null);
      setScan({ state: 'idle' });
      setAiKeys(new Set());
      setTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const entity = ws.entityById(f.entityId) ?? ws.activeEntity;
  const country = entity.countryCode;
  const rate = TAX_CONFIG[country].indirectRate;
  const base = Number(f.base) || 0;
  const tax = f.tax === '' ? Math.round(base * rate) : Number(f.tax) || 0;
  const scanning = scan.state === 'scanning';
  const aiFilled = aiKeys.size > 0;

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    manual.current.add(k);
    setAiKeys((s) => {
      if (!s.has(k)) return s;
      const next = new Set(s);
      next.delete(k);
      return next;
    });
    setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));
  };

  /** Read the file with Document AI and fill every field the user has not typed into. */
  async function extract(target: File, entityId = latest.current.entityId) {
    const id = ++request.current;
    const ctry = (ws.entityById(entityId) ?? ws.activeEntity).countryCode;
    const current = latest.current;
    setScan({ state: 'scanning' });
    try {
      const res = await fetch('/api/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: target.name,
          country: ctry,
          customVendor: manual.current.has('vendor') ? current.vendor : undefined,
          customDpp: manual.current.has('base') ? Number(current.base) || undefined : undefined,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (id !== request.current) return;
      const risk = data.status === 'RISIKO_FRAUD';
      const extracted: Partial<FormState> = {
        number: data.docNumber ?? '',
        vendor: data.vendorName ?? '',
        vendorTaxId: risk ? '' : sampleTaxId(ctry),
        base: data.dpp != null ? String(data.dpp) : '',
        tax: data.taxAmount != null ? String(data.taxAmount) : '',
        uuid: ctry === 'MY' ? `MYINV-${Date.now().toString(36).toUpperCase()}` : `UUID-${Date.now().toString(36).toUpperCase()}`,
        validated: !risk,
      };
      const invoice = latest.current.type === 'e_invoice';
      const keys = (Object.keys(extracted) as (keyof FormState)[]).filter(
        (k) => !manual.current.has(k) && (invoice || COMMON_KEYS.includes(k)),
      );
      setF((x) => ({ ...x, ...pick(extracted, keys) }));
      const filled = keys.filter((k) => extracted[k] !== '');
      setAiKeys(new Set(filled));
      setScan({ state: 'done', filled: filled.filter((k) => k !== 'validated').length, risk });
    } catch {
      if (id !== request.current) return;
      setScan({ state: 'error' });
    }
  }

  const pickFile = (next: File | undefined) => {
    if (!next) return;
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(next.type)) {
      ui.toast('Format harus PDF, PNG, atau JPG.', 'danger');
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      ui.toast('Ukuran maksimum 10 MB.', 'danger');
      return;
    }
    setFile(next);
    void extract(next);
  };

  /** Drop the file and everything Document AI filled from it; manual input stays. */
  const removeFile = () => {
    request.current++;
    setFile(null);
    setScan({ state: 'idle' });
    setF((x) => ({ ...x, ...pick(blank(), aiKeys) }));
    setAiKeys(new Set());
  };

  const onEntityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    set('entityId')(e);
    // Amounts and tax ids depend on the jurisdiction, so read the file again.
    if (file) void extract(file, e.target.value);
  };

  const label = (text: string, k: keyof FormState): React.ReactNode =>
    aiKeys.has(k) ? (
      <span className="inline-flex items-center gap-1.5">
        {text}
        <AiTag />
      </span>
    ) : (
      text
    );

  const errors = {
    number: f.number.trim() ? '' : 'Nomor wajib diisi',
    vendor: f.vendor.trim().length >= 2 ? '' : 'Nama pihak lawan wajib diisi',
    vendorTaxId: f.vendorTaxId.trim() ? '' : 'Identitas pajak wajib diisi',
    base: f.type === 'e_invoice' && base <= 0 ? 'DPP harus > 0' : '',
    ownership: f.type === 'shareholder' && !(Number(f.ownership) > 0 && Number(f.ownership) <= 100) ? 'Persentase 1–100' : '',
  };
  const valid = !Object.values(errors).some(Boolean);

  function save() {
    setTouched(true);
    if (!valid) return;
    const id = `DOC-${country}-${Date.now().toString(36).toUpperCase()}`;
    // Provenance per field: AI-extracted values keep their confidence, typed values are manual.
    const fld = <T,>(value: T, ...keys: (keyof FormState)[]) =>
      keys.some((k) => aiKeys.has(k)) ? { value, source: 'ai' as const, confidence: 0.93 } : { value, source: 'manual' as const, confidence: 1 };
    const isInvoice = f.type === 'e_invoice';
    const doc: TaxDocument = {
      id,
      entityId: entity.id,
      country,
      type: f.type,
      attachmentName: file?.name ?? `${f.number.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`,
      attachmentType: (file?.type as TaxDocument['attachmentType']) ?? 'application/pdf',
      attachmentSize: file?.size ?? 120_000,
      number: fld(f.number.trim(), 'number'),
      date: fld(f.date),
      counterparty: fld(f.vendor.trim(), 'vendor'),
      counterpartyTaxId: fld(f.vendorTaxId.trim(), 'vendorTaxId'),
      taxableBase: fld(isInvoice ? base : 0, 'base'),
      taxAmount: fld(isInvoice ? tax : 0, 'tax'),
      totalAmount: fld(isInvoice ? base + tax : 0, 'base', 'tax'),
      ownershipPercentage: fld(f.type === 'shareholder' ? Number(f.ownership) : null),
      invoiceUuid: fld(f.uuid.trim(), 'uuid'),
      taxIdValidated: f.validated,
      hasSupportingEvidence: f.evidence,
      deductible: f.deductible,
      createdAt: new Date().toISOString(),
    };
    const item: WorkspaceDocument = {
      doc,
      status: 'extracted',
      uploadedBy: ws.persona.name,
      ledger: isInvoice ? LEDGERS.find((l) => l.accountCode === f.ledger) : undefined,
    };
    const before = new Set(ws.findings.map((x) => x.id));
    ws.updateCompliance((s) => ({ ...s, documents: [item, ...s.documents] }));
    ws.logAudit('UPLOAD_DOCUMENT', `${doc.number.value} · ${doc.counterparty.value}`, `${aiFilled ? `Diekstraksi Document AI dari ${file?.name ?? 'berkas'}` : 'Input manual'} untuk ${entity.legalName}.`);
    onClose();
    onSaved?.(id);
    // Preview what the engine will find with this document included.
    const after = runRiskEngine(
      [item, ...ws.compliance.documents],
      ws.entities.map((e) => ({ id: e.id, legalName: e.legalName, countryCode: e.countryCode, taxId: e.taxId })),
    ).findings.filter((x) => !before.has(x.id));
    ui.toast(
      after.length ? `Dokumen disimpan — ${after.length} temuan risiko baru (${after.map((x) => x.ruleName).join(', ')}).` : 'Dokumen disimpan dan lolos analisis risiko.',
      after.length ? 'warning' : 'success',
      after.length ? { label: 'Lihat', onClick: () => router.push(`/risk?f=${encodeURIComponent(after[0].id)}`) } : undefined,
    );
  }

  const kb = file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : '';
  const zoneTone = dragging
    ? 'border-brand-400 bg-brand-50'
    : scan.state === 'done' && scan.risk
      ? 'border-warning-500/40 bg-warning-50/50'
      : scan.state === 'done'
        ? 'border-success-500/30 bg-success-50/50'
        : scan.state === 'error'
          ? 'border-danger-500/30 bg-danger-50/40'
          : file
            ? 'border-brand-300 bg-brand-50/40'
            : 'border-line-strong bg-subtle';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Unggah dokumen"
      description="PDF, PNG, atau JPG hingga 10 MB. Document AI langsung membaca berkas dan mengisi field; Anda tetap bisa mengoreksi."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button variant="primary" loading={scanning} onClick={save}>{scanning ? 'Membaca dokumen…' : 'Simpan & analisis'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragging) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          className={cn('rounded-xl border-2 border-dashed px-4 py-4 flex flex-col sm:flex-row items-center gap-4 transition-colors', zoneTone)}
        >
          <span className="size-10 rounded-xl bg-surface border border-line flex items-center justify-center text-ink-3 shrink-0">
            {scanning ? (
              <Spinner className="size-5 text-brand-600" />
            ) : scan.state === 'done' ? (
              scan.risk ? <ShieldAlert className="size-5 text-warning-600" /> : <CheckCircle2 className="size-5 text-success-600" />
            ) : scan.state === 'error' ? (
              <AlertTriangle className="size-5 text-danger-600" />
            ) : file ? (
              <FileText className="size-5" />
            ) : (
              <UploadCloud className="size-5" />
            )}
          </span>
          <div className="flex-1 min-w-0 text-center sm:text-left" aria-live="polite">
            {file ? (
              <>
                <div className="text-sm font-medium text-ink truncate">{file.name}</div>
                <div className="text-xs text-ink-3">
                  {scanning && <span className="text-brand-700">{kb} · Document AI sedang membaca dokumen…</span>}
                  {scan.state === 'done' && (
                    <span className={scan.risk ? 'text-warning-700' : 'text-success-700'}>
                      {kb} · {scan.filled} field terisi otomatis{scan.risk ? ' · indikasi risiko terdeteksi' : ''}
                    </span>
                  )}
                  {scan.state === 'error' && <span className="text-danger-700">Dokumen gagal dibaca. Coba lagi atau isi field secara manual.</span>}
                  {scan.state === 'idle' && kb}
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-medium text-ink">{dragging ? 'Lepaskan untuk mulai membaca' : 'Seret berkas ke sini'}</div>
                <div className="text-xs text-ink-3">Document AI langsung membaca dan mengisi field. Tanpa berkas? Isi manual di bawah.</div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {file && (
              <Button size="sm" variant="ghost" icon={<X />} onClick={removeFile}>Hapus</Button>
            )}
            {file && scan.state === 'error' && (
              <Button size="sm" variant="subtle" icon={<RotateCw />} onClick={() => void extract(file)}>Coba lagi</Button>
            )}
            <Button size="sm" disabled={scanning} onClick={() => fileRef.current?.click()}>{file ? 'Ganti berkas' : 'Pilih berkas'}</Button>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" aria-label="Berkas dokumen" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>

        {scan.state === 'done' && scan.risk && (
          <Callout tone="warning" icon={<ShieldAlert />} title="Document AI menandai indikasi risiko">
            Identitas pajak vendor gagal divalidasi. Lengkapi identitas pajaknya; mesin risiko akan menilai dokumen ini saat disimpan.
          </Callout>
        )}
        {scan.state === 'done' && !scan.risk && aiFilled && (
          <Callout tone="brand" icon={<ScanText />} title="Field diisi Document AI">
            Periksa field bertanda AI sebelum menyimpan. Perubahan Anda dicatat sebagai input manual.
          </Callout>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Entitas" value={f.entityId} onChange={onEntityChange}>
            {ws.accessibleEntities.map((e) => (
              <option key={e.id} value={e.id}>{e.flag} {e.legalName}</option>
            ))}
          </SelectField>
          <SelectField label="Jenis dokumen" value={f.type} onChange={set('type')}>
            <option value="e_invoice">e-Faktur / invoice pembelian</option>
            <option value="shareholder">Register pemegang saham</option>
          </SelectField>
          <TextField label={label('Nomor dokumen', 'number')} mono value={f.number} onChange={set('number')} error={touched && errors.number} placeholder={country === 'ID' ? '010.000-26.00001234' : 'INV-2026-0001'} />
          <TextField label="Tanggal" type="date" value={f.date} onChange={set('date')} />
          <TextField label={label(f.type === 'shareholder' ? 'Nama pemegang saham' : 'Vendor / pemasok', 'vendor')} value={f.vendor} onChange={set('vendor')} error={touched && errors.vendor} />
          <TextField label={label('Identitas pajak pihak lawan', 'vendorTaxId')} mono value={f.vendorTaxId} onChange={set('vendorTaxId')} error={touched && errors.vendorTaxId} />
          {f.type === 'e_invoice' ? (
            <>
              <TextField label={label(`DPP (${MULTI_COUNTRY_DATA[country].currencyCode})`, 'base')} type="number" min={0} value={f.base} onChange={set('base')} error={touched && errors.base} />
              <TextField
                label={label(`${MULTI_COUNTRY_DATA[country].indirectTaxName.split(' ')[0]} (${MULTI_COUNTRY_DATA[country].currencyCode})`, 'tax')}
                type="number"
                min={0}
                value={f.tax}
                placeholder={String(Math.round(base * rate))}
                onChange={set('tax')}
                hint={`Kosongkan untuk tarif standar ${(rate * 100).toFixed(rate * 100 % 1 ? 2 : 0)}% · total ${money(base + tax, country)}`}
              />
              <SelectField label="Akun buku besar" value={f.ledger} onChange={set('ledger')}>
                {LEDGERS.map((l) => <option key={l.accountCode} value={l.accountCode}>{l.accountCode} · {l.accountName}</option>)}
              </SelectField>
              <TextField label={label(country === 'MY' ? 'UUID MyInvois' : 'UUID / nomor seri e-invoice', 'uuid')} mono value={f.uuid} onChange={set('uuid')} hint={country === 'MY' ? 'Wajib untuk klaim biaya di Malaysia' : undefined} />
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <Checkbox label="Vendor tervalidasi" checked={f.validated} onChange={set('validated')} />
                <Checkbox label="Bukti pendukung ada" checked={f.evidence} onChange={set('evidence')} />
                <Checkbox label="Deductible" checked={f.deductible} onChange={set('deductible')} />
              </div>
            </>
          ) : (
            <TextField label="Persentase saham (%)" type="number" min={0} max={100} value={f.ownership} onChange={set('ownership')} error={touched && errors.ownership} />
          )}
        </div>
      </div>
    </Dialog>
  );
}
