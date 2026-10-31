'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, FileText, Inbox, Pencil, Search, ShieldAlert, Trash2, Upload } from 'lucide-react';
import type { TaxDocument } from '@/lib/domain';
import type { WorkspaceDocument } from '@/lib/compliance';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { dateShort, money } from '@/lib/format';
import {
  Badge,
  Button,
  Callout,
  Card,
  Checkbox,
  ConfirmDialog,
  DescriptionList,
  EmptyState,
  Input,
  PageHeader,
  Segmented,
  Select,
  Sheet,
  Stat,
  Table,
  TD,
  TH,
  THead,
  TR,
  cn,
} from '@/ui';
import { CycleFooter } from '@/shell/CycleFooter';
import { EntityName, ScopeToggle, SeverityBadge, useScopedIds, type Scope } from '../shared';
import { UploadDialog } from './UploadDialog';

type StatusFilter = 'all' | 'pending' | 'verified';
type TypeFilter = 'all' | 'e_invoice' | 'shareholder';

export const DOC_TYPE_LABEL: Record<TaxDocument['type'], string> = {
  e_invoice: 'e-Faktur / invoice',
  shareholder: 'Register saham',
  deed: 'Akta',
  financial_statement: 'Laporan keuangan',
  previous_tax_return: 'SPT sebelumnya',
  tax_payment_slip: 'Bukti setor',
};

function ConfidenceCell({ value }: { value?: number }) {
  if (value === undefined) return <span className="text-ink-4">—</span>;
  const pct = Math.round(value * 100);
  return (
    <span className={cn('num', pct < 90 ? 'text-warning-700 font-medium' : 'text-ink-2')} title={pct < 90 ? 'Confidence rendah — periksa manual' : undefined}>
      {pct}%
    </span>
  );
}

function DocumentSheet({ item, onClose }: { item: WorkspaceDocument | null; onClose: () => void }) {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WorkspaceDocument | null>(item);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    setDraft(item);
    setEditing(false);
  }, [item]);
  if (!item || !draft) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const d = draft.doc;
  const findings = ws.findings.filter((f) => f.documentIds.includes(item.doc.id));
  const country = d.country;

  const setField = <K extends 'number' | 'date' | 'counterparty' | 'counterpartyTaxId' | 'taxableBase' | 'taxAmount' | 'invoiceUuid'>(k: K, value: TaxDocument[K]['value']) =>
    setDraft((x) => {
      if (!x) return x;
      const doc = { ...x.doc, [k]: { ...x.doc[k], value, source: 'manual' as const, confidence: 1 } } as TaxDocument;
      if (k === 'taxableBase' || k === 'taxAmount') doc.totalAmount = { ...doc.totalAmount, value: doc.taxableBase.value + doc.taxAmount.value, source: 'manual' };
      return { ...x, doc };
    });

  const save = (verify = false) => {
    const next: WorkspaceDocument = { ...draft, status: verify ? 'verified' : draft.status === 'extracting' ? 'extracted' : draft.status };
    ws.updateCompliance((s) => ({ ...s, documents: s.documents.map((x) => (x.doc.id === next.doc.id ? next : x)) }));
    ws.logAudit(verify ? 'VERIFY_DOCUMENT' : 'EDIT_DOCUMENT', `${d.number.value} · ${d.counterparty.value}`, verify ? 'Dokumen diverifikasi manual; masuk analisis risiko.' : 'Field dokumen dikoreksi manual (override AI).');
    ui.toast(verify ? 'Dokumen diverifikasi.' : 'Perubahan disimpan. Mesin risiko menghitung ulang.');
    setEditing(false);
    if (verify) onClose();
  };

  const fields: { k: 'number' | 'date' | 'counterparty' | 'counterpartyTaxId' | 'taxableBase' | 'taxAmount' | 'invoiceUuid'; label: string; money?: boolean; mono?: boolean }[] = [
    { k: 'number', label: 'Nomor dokumen', mono: true },
    { k: 'date', label: 'Tanggal' },
    { k: 'counterparty', label: d.type === 'shareholder' ? 'Pemegang saham' : 'Vendor' },
    { k: 'counterpartyTaxId', label: 'Identitas pajak pihak lawan', mono: true },
    ...(d.type === 'e_invoice'
      ? ([
          { k: 'taxableBase', label: 'DPP', money: true },
          { k: 'taxAmount', label: 'Pajak (PPN/GST)', money: true },
          { k: 'invoiceUuid', label: 'UUID e-invoice', mono: true },
        ] as const)
      : []),
  ];

  return (
    <Sheet
      open
      onClose={onClose}
      width="max-w-2xl"
      title={d.counterparty.value}
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="font-mono">{d.number.value}</span>
          <span>·</span>
          <EntityName id={d.entityId} />
        </span>
      }
      footer={
        editing ? (
          <>
            <Button variant="ghost" onClick={() => { setDraft(item); setEditing(false); }}>Batal</Button>
            <Button variant="primary" onClick={() => save(false)}>Simpan koreksi</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" icon={<Trash2 />} onClick={() => setConfirmDelete(true)} className="mr-auto">Hapus</Button>
            <Button icon={<Pencil />} onClick={() => setEditing(true)}>Koreksi field</Button>
            {item.status !== 'verified' && <Button variant="primary" icon={<CheckCircle2 />} onClick={() => save(true)}>Verifikasi</Button>}
          </>
        )
      }
    >
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={item.status === 'verified' ? 'success' : 'warning'} dot>{item.status === 'verified' ? 'Terverifikasi' : 'Perlu verifikasi'}</Badge>
          <Badge>{DOC_TYPE_LABEL[d.type]}</Badge>
          <span className="text-xs text-ink-3">{d.attachmentName} · {(d.attachmentSize / 1024).toFixed(0)} KB · diunggah {item.uploadedBy}</span>
        </div>

        {findings.length > 0 && (
          <Callout
            tone="danger"
            icon={<ShieldAlert />}
            title={`${findings.length} temuan risiko pada dokumen ini`}
            action={<Button size="sm" onClick={() => router.push(`/risk?f=${encodeURIComponent(findings[0].id)}`)}>Buka</Button>}
          >
            {findings.map((f) => f.ruleName).join(' · ')}
          </Callout>
        )}

        <div>
          <h3 className="text-sm font-semibold text-ink mb-3">Field hasil ekstraksi</h3>
          <div className="rounded-xl border border-line divide-y divide-line">
            {fields.map((f) => {
              const field = d[f.k] as { value: string | number; source: 'ai' | 'manual'; confidence?: number };
              return (
                <div key={f.k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-3 px-4 py-2.5">
                  <span className="text-[13px] text-ink-3">{f.label}</span>
                  {editing ? (
                    <Input
                      aria-label={f.label}
                      className={cn('h-8', f.mono && 'font-mono')}
                      type={f.money ? 'number' : f.k === 'date' ? 'date' : 'text'}
                      value={String(field.value)}
                      onChange={(e) => setField(f.k, (f.money ? Number(e.target.value) : e.target.value) as never)}
                    />
                  ) : (
                    <span className={cn('text-[13px] text-ink break-words', f.mono && 'font-mono')}>
                      {f.money ? money(Number(field.value), country) : f.k === 'date' ? dateShort(String(field.value)) : String(field.value) || <span className="text-danger-600">kosong</span>}
                    </span>
                  )}
                  <span className="justify-self-end">
                    {field.source === 'manual' ? <Badge tone="brand">Manual</Badge> : <span className={cn('text-xs num', (field.confidence ?? 1) < 0.9 ? 'text-warning-700' : 'text-ink-3')}>AI {Math.round((field.confidence ?? 1) * 100)}%</span>}
                  </span>
                </div>
              );
            })}
            {d.type === 'e_invoice' && (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-3 px-4 py-2.5 bg-subtle">
                <span className="text-[13px] text-ink-3">Total</span>
                <span className="text-[13px] text-ink font-semibold num">{money(d.totalAmount.value, country)}</span>
                <span />
              </div>
            )}
            {d.type === 'shareholder' && (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-3 px-4 py-2.5">
                <span className="text-[13px] text-ink-3">Persentase saham</span>
                <span className="text-[13px] text-ink num">{d.ownershipPercentage.value ?? '—'}%</span>
                <span />
              </div>
            )}
          </div>
        </div>

        {d.type === 'e_invoice' && (
          <div>
            <h3 className="text-sm font-semibold text-ink mb-3">Verifikasi kepatuhan</h3>
            <div className="space-y-3">
              <Checkbox
                label="Identitas vendor tervalidasi di registri otoritas"
                description="Status PKP/GST aktif & nomor seri faktur terdaftar"
                checked={d.taxIdValidated}
                disabled={!editing}
                onChange={(e) => setDraft((x) => (x ? { ...x, doc: { ...x.doc, taxIdValidated: e.target.checked } } : x))}
              />
              <Checkbox
                label="Bukti pendukung lengkap"
                description="Kontrak/PO, surat jalan, bukti bayar, atau daftar nominatif"
                checked={d.hasSupportingEvidence}
                disabled={!editing}
                onChange={(e) => setDraft((x) => (x ? { ...x, doc: { ...x.doc, hasSupportingEvidence: e.target.checked } } : x))}
              />
              <Checkbox
                label="Biaya dapat dikurangkan (deductible)"
                checked={d.deductible}
                disabled={!editing}
                onChange={(e) => setDraft((x) => (x ? { ...x, doc: { ...x.doc, deductible: e.target.checked } } : x))}
              />
            </div>
          </div>
        )}

        {draft.ledger && (
          <DescriptionList
            columns={2}
            items={[
              { label: 'Akun buku besar', value: `${draft.ledger.accountCode} · ${draft.ledger.accountName}` },
              { label: 'Mata uang', value: country === 'ID' ? 'IDR' : country === 'SG' ? 'SGD' : country === 'MY' ? 'MYR' : 'USD' },
            ]}
          />
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        danger
        confirmLabel="Hapus dokumen"
        title="Hapus dokumen ini?"
        description="Temuan yang hanya bersumber dari dokumen ini ikut hilang dari analisis."
        onConfirm={() => {
          ws.updateCompliance((s) => ({ ...s, documents: s.documents.filter((x) => x.doc.id !== item.doc.id) }));
          ws.logAudit('DELETE_DOCUMENT', `${d.number.value} · ${d.counterparty.value}`, 'Dokumen dihapus dari inbox.');
          ui.toast('Dokumen dihapus.');
          onClose();
        }}
      />
    </Sheet>
  );
}

export function DocumentsPage() {
  const ws = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const [scope, setScope] = useState<Scope>(ws.isParentExec ? 'group' : 'entity');
  const ids = useScopedIds(scope);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [type, setType] = useState<TypeFilter>('all');
  const [q, setQ] = useState('');
  const [upload, setUpload] = useState(false);
  const openId = params.get('d');

  const docs = useMemo(() => ws.compliance.documents.filter((d) => ids.includes(d.doc.entityId)), [ws.compliance.documents, ids]);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return docs
      .filter((d) => (status === 'all' ? true : status === 'verified' ? d.status === 'verified' : d.status !== 'verified'))
      .filter((d) => (type === 'all' ? true : d.doc.type === type))
      .filter((d) => !term || `${d.doc.number.value} ${d.doc.counterparty.value} ${d.doc.counterpartyTaxId.value}`.toLowerCase().includes(term))
      .sort((a, b) => (a.status === 'verified' ? 1 : 0) - (b.status === 'verified' ? 1 : 0) || b.doc.date.value.localeCompare(a.doc.date.value));
  }, [docs, status, type, q]);

  const pending = docs.filter((d) => d.status !== 'verified').length;
  const conf = docs.length ? docs.reduce((s, d) => s + (d.doc.counterparty.confidence ?? 1), 0) / docs.length : 1;
  const flagged = new Set(ws.findings.flatMap((f) => f.documentIds));
  const flaggedCount = docs.filter((d) => flagged.has(d.doc.id)).length;
  const openItem = openId ? ws.compliance.documents.find((d) => d.doc.id === openId) ?? null : null;

  const setOpen = (id: string | null) => {
    const sp = new URLSearchParams(params.toString());
    if (id) sp.set('d', id);
    else sp.delete('d');
    router.replace(`/documents${sp.toString() ? `?${sp}` : ''}`, { scroll: false });
  };

  return (
    <div>
      <PageHeader
        eyebrow={<span>Langkah 2 · Siklus kepatuhan</span>}
        title="Dokumen"
        description="Faktur, invoice, dan register yang diekstraksi Document AI. Setiap dokumen otomatis dianalisis mesin risiko."
        actions={
          <Button variant="primary" icon={<Upload />} onClick={() => setUpload(true)}>
            Unggah dokumen
          </Button>
        }
      >
        <ScopeToggle value={scope} onChange={setScope} />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Stat label="Dokumen" value={docs.length} hint={`${docs.filter((d) => d.doc.type === 'e_invoice').length} faktur/invoice`} icon={<FileText />} />
        <Stat label="Perlu verifikasi" value={pending} hint="Belum masuk status terverifikasi" icon={<Inbox />} tone={pending ? 'warning' : undefined} onClick={() => setStatus('pending')} />
        <Stat label="Rata-rata confidence AI" value={`${Math.round(conf * 100)}%`} hint="Field < 90% ditandai" icon={<CheckCircle2 />} />
        <Stat label="Dokumen bertemuan" value={flaggedCount} hint="Terkait temuan risiko" icon={<ShieldAlert />} tone={flaggedCount ? 'danger' : undefined} onClick={() => router.push('/risk')} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
          <Segmented<StatusFilter>
            value={status}
            onChange={setStatus}
            items={[
              { id: 'all', label: 'Semua' },
              { id: 'pending', label: 'Perlu verifikasi', count: pending },
              { id: 'verified', label: 'Terverifikasi' },
            ]}
          />
          <div className="w-44">
            <Select value={type} onChange={(e) => setType(e.target.value as TypeFilter)} aria-label="Jenis dokumen">
              <option value="all">Semua jenis</option>
              <option value="e_invoice">e-Faktur / invoice</option>
              <option value="shareholder">Register saham</option>
            </Select>
          </div>
          <div className="w-full sm:w-72 sm:ml-auto">
            <Input leading={<Search />} placeholder="Nomor, vendor, NPWP…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari dokumen" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<Inbox />} title="Tidak ada dokumen" description="Ubah filter atau unggah dokumen baru." action={<Button icon={<Upload />} onClick={() => setUpload(true)}>Unggah dokumen</Button>} />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Dokumen</TH>
                {scope === 'group' && <TH>Entitas</TH>}
                <TH>Tanggal</TH>
                <TH align="right">DPP</TH>
                <TH align="right">Pajak</TH>
                <TH align="right">Confidence</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((w) => {
                const d = w.doc;
                const fs = ws.findings.filter((f) => f.documentIds.includes(d.id));
                const worst = fs.sort((a, b) => b.score - a.score)[0];
                return (
                  <TR key={d.id} onClick={() => setOpen(d.id)} selected={openId === d.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="size-8 rounded-lg bg-muted text-ink-3 flex items-center justify-center shrink-0"><FileText className="size-4" /></span>
                        <div className="min-w-0">
                          <div className="text-ink font-medium truncate max-w-[280px]">{d.counterparty.value}</div>
                          <div className="text-xs text-ink-3 font-mono truncate">{d.number.value} · {DOC_TYPE_LABEL[d.type]}</div>
                        </div>
                      </div>
                    </TD>
                    {scope === 'group' && (
                      <TD className="max-w-[200px]"><EntityName id={d.entityId} short /></TD>
                    )}
                    <TD className="whitespace-nowrap">{dateShort(d.date.value)}</TD>
                    <TD align="right" className="text-ink">{d.type === 'e_invoice' ? money(d.taxableBase.value, d.country) : <span className="text-ink-4">{d.ownershipPercentage.value}% saham</span>}</TD>
                    <TD align="right">{d.type === 'e_invoice' ? money(d.taxAmount.value, d.country) : '—'}</TD>
                    <TD align="right"><ConfidenceCell value={d.counterparty.confidence} /></TD>
                    <TD>
                      <div className="flex items-center gap-1.5">
                        {worst ? <SeverityBadge severity={worst.severity} /> : null}
                        {w.status !== 'verified' && <Badge tone="warning" dot>Perlu verifikasi</Badge>}
                        {!worst && w.status === 'verified' && <Badge tone="success" dot>Bersih</Badge>}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <CycleFooter current="/documents" />
      <DocumentSheet item={openItem} onClose={() => setOpen(null)} />
      <UploadDialog open={upload} onClose={() => setUpload(false)} onSaved={(id) => setOpen(id)} />
    </div>
  );
}
