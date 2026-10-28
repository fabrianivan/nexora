'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ScanText, UploadCloud, FileText, X } from 'lucide-react';
import type { TaxDocument } from '@/lib/domain';
import { runRiskEngine, type WorkspaceDocument } from '@/lib/compliance';
import { MULTI_COUNTRY_DATA } from '@/data/multiCountryTaxData';
import { TAX_CONFIG } from '@/lib/tax';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { money } from '@/lib/format';
import { Button, Callout, Checkbox, Dialog, SelectField, TextField, cn } from '@/ui';
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

export function UploadDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: (id: string) => void }) {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
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

  useEffect(() => {
    if (open) {
      setF(blank());
      setFile(null);
      setAiFilled(false);
      setTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const entity = ws.entityById(f.entityId) ?? ws.activeEntity;
  const country = entity.countryCode;
  const rate = TAX_CONFIG[country].indirectRate;
  const base = Number(f.base) || 0;
  const tax = f.tax === '' ? Math.round(base * rate) : Number(f.tax) || 0;
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
      ui.toast('Format harus PDF, PNG, atau JPG.', 'danger');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      ui.toast('Ukuran maksimum 10 MB.', 'danger');
      return;
    }
    setFile(file);
  };

  async function extract() {
    setScanning(true);
    try {
      const res = await fetch('/api/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file?.name ?? 'faktur.pdf', customVendor: f.vendor || undefined, customDpp: Number(f.base) || undefined, country }),
      });
      const data = await res.json();
      setF((x) => ({
        ...x,
        number: data.docNumber ?? x.number,
        vendor: x.vendor || data.vendorName || '',
        vendorTaxId: x.vendorTaxId || (data.status === 'RISIKO_FRAUD' ? '' : sampleTaxId(country)),
        base: String(data.dpp ?? x.base),
        tax: String(data.taxAmount ?? ''),
        validated: data.status !== 'RISIKO_FRAUD',
        uuid: country === 'MY' ? `MYINV-${Date.now().toString(36).toUpperCase()}` : `UUID-${Date.now().toString(36).toUpperCase()}`,
      }));
      setAiFilled(true);
      ui.toast(data.status === 'RISIKO_FRAUD' ? 'Ekstraksi selesai — Document AI menandai indikasi risiko.' : 'Ekstraksi selesai. Periksa field sebelum menyimpan.', data.status === 'RISIKO_FRAUD' ? 'warning' : 'success');
    } catch {
      ui.toast('Document AI tidak dapat dihubungi. Isi field secara manual.', 'warning');
    } finally {
      setScanning(false);
    }
  }

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
    const src = aiFilled ? ('ai' as const) : ('manual' as const);
    const c = aiFilled ? 0.93 : 1;
    const fld = <T,>(value: T) => ({ value, source: src, confidence: c });
    const isInvoice = f.type === 'e_invoice';
    const doc: TaxDocument = {
      id,
      entityId: entity.id,
      country,
      type: f.type,
      attachmentName: file?.name ?? `${f.number.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`,
      attachmentType: (file?.type as TaxDocument['attachmentType']) ?? 'application/pdf',
      attachmentSize: file?.size ?? 120_000,
      number: fld(f.number.trim()),
      date: fld(f.date),
      counterparty: fld(f.vendor.trim()),
      counterpartyTaxId: fld(f.vendorTaxId.trim()),
      taxableBase: fld(isInvoice ? base : 0),
      taxAmount: fld(isInvoice ? tax : 0),
      totalAmount: fld(isInvoice ? base + tax : 0),
      ownershipPercentage: fld(f.type === 'shareholder' ? Number(f.ownership) : null),
      invoiceUuid: fld(f.uuid.trim()),
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
    ws.logAudit('UPLOAD_DOCUMENT', `${doc.number.value} · ${doc.counterparty.value}`, `${aiFilled ? 'Diekstraksi Document AI' : 'Input manual'} untuk ${entity.legalName}.`);
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Unggah dokumen"
      description="PDF, PNG, atau JPG hingga 10 MB. Document AI mengisi field; Anda tetap bisa mengoreksi."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button variant="primary" onClick={save}>Simpan & analisis</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickFile(e.dataTransfer.files?.[0]);
          }}
          className={cn('rounded-xl border-2 border-dashed px-4 py-5 flex flex-col sm:flex-row items-center gap-4', file ? 'border-brand-300 bg-brand-50/40' : 'border-line-strong bg-subtle')}
        >
          <span className="size-10 rounded-xl bg-surface border border-line flex items-center justify-center text-ink-3 shrink-0">
            {file ? <FileText className="size-5" /> : <UploadCloud className="size-5" />}
          </span>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            {file ? (
              <>
                <div className="text-sm font-medium text-ink truncate">{file.name}</div>
                <div className="text-xs text-ink-3">{(file.size / 1024).toFixed(0)} KB</div>
              </>
            ) : (
              <>
                <div className="text-sm font-medium text-ink">Seret berkas ke sini</div>
                <div className="text-xs text-ink-3">atau pilih dari komputer — opsional untuk input manual</div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {file && (
              <Button size="sm" variant="ghost" icon={<X />} onClick={() => setFile(null)}>Hapus</Button>
            )}
            <Button size="sm" onClick={() => fileRef.current?.click()}>Pilih berkas</Button>
            <Button size="sm" variant="subtle" icon={<ScanText />} loading={scanning} onClick={extract}>Ekstrak AI</Button>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>

        {aiFilled && <Callout tone="brand" icon={<ScanText />} title="Field diisi Document AI">Field bertanda AI tetap dapat diubah; perubahan dicatat sebagai override manual.</Callout>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Entitas" value={f.entityId} onChange={set('entityId')}>
            {ws.accessibleEntities.map((e) => (
              <option key={e.id} value={e.id}>{e.flag} {e.legalName}</option>
            ))}
          </SelectField>
          <SelectField label="Jenis dokumen" value={f.type} onChange={set('type')}>
            <option value="e_invoice">e-Faktur / invoice pembelian</option>
            <option value="shareholder">Register pemegang saham</option>
          </SelectField>
          <TextField label="Nomor dokumen" mono value={f.number} onChange={set('number')} error={touched && errors.number} placeholder={country === 'ID' ? '010.000-26.00001234' : 'INV-2026-0001'} />
          <TextField label="Tanggal" type="date" value={f.date} onChange={set('date')} />
          <TextField label={f.type === 'shareholder' ? 'Nama pemegang saham' : 'Vendor / pemasok'} value={f.vendor} onChange={set('vendor')} error={touched && errors.vendor} />
          <TextField label="Identitas pajak pihak lawan" mono value={f.vendorTaxId} onChange={set('vendorTaxId')} error={touched && errors.vendorTaxId} />
          {f.type === 'e_invoice' ? (
            <>
              <TextField label={`DPP (${MULTI_COUNTRY_DATA[country].currencyCode})`} type="number" min={0} value={f.base} onChange={set('base')} error={touched && errors.base} />
              <TextField
                label={`${MULTI_COUNTRY_DATA[country].indirectTaxName.split(' ')[0]} (${MULTI_COUNTRY_DATA[country].currencyCode})`}
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
              <TextField label={country === 'MY' ? 'UUID MyInvois' : 'UUID / nomor seri e-invoice'} mono value={f.uuid} onChange={set('uuid')} hint={country === 'MY' ? 'Wajib untuk klaim biaya di Malaysia' : undefined} />
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
