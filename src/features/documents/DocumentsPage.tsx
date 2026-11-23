'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Inbox, Pencil, Search, ShieldAlert, Trash2, Upload } from 'lucide-react';
import type { TaxDocument } from '@/lib/domain';
import { hasAiFields, lowestConfidence } from '@/lib/cases';
import type { WorkspaceDocument } from '@/lib/compliance';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { dateShort, money } from '@/lib/format';
import {
  Badge,
  BandLead,
  Button,
  Callout,
  Card,
  Checkbox,
  ComplianceRing,
  ConfirmDialog,
  DescriptionList,
  EmptyState,
  Input,
  MetricBand,
  PageHeader,
  Segmented,
  Select,
  Sheet,
  Table,
  TD,
  TH,
  THead,
  TR,
  cn,
} from '@/ui';
import { CycleFooter } from '@/shell/CycleFooter';
import { CycleNext } from '@/shell/CycleNext';
import { EntityName, ScopeToggle, SeverityBadge, useScopedIds, type Scope } from '../shared';
import { UploadDialog } from './UploadDialog';

type StatusFilter = 'all' | 'pending' | 'flagged' | 'verified';
type TypeFilter = 'all' | 'e_invoice' | 'shareholder';

export const DOC_TYPE_LABEL: Record<TaxDocument['type'], string> = {
  e_invoice: 'e-Faktur / invoice',
  shareholder: 'Register saham',
  deed: 'Akta',
  financial_statement: 'Laporan keuangan',
  previous_tax_return: 'SPT sebelumnya',
  tax_payment_slip: 'Bukti setor',
};

function ConfidenceCell({ doc }: { doc: TaxDocument }) {
  const low = lowestConfidence(doc);
  if (!low) return <span className="text-ink-3 text-xs">{hasAiFields(doc) ? 'Simulasi' : 'Manual'}</span>;
  const pct = Math.round(low.confidence * 100);
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

  const setField = <K extends 'number' | 'date' | 'counterparty' | 'counterpartyTaxId' | 'taxableBase' | 'taxAmount' | 'invoiceUuid' | 'ownershipPercentage'>(k: K, value: TaxDocument[K]['value']) =>
    setDraft((x) => {
      if (!x) return x;
      const doc = { ...x.doc, [k]: { ...x.doc[k], value, source: 'manual' as const, confidence: 1 } } as TaxDocument;
      if (k === 'taxableBase' || k === 'taxAmount') doc.totalAmount = { ...doc.totalAmount, value: doc.taxableBase.value + doc.taxAmount.value, source: 'manual', confidence: 1 };
      return { ...x, doc };
    });

  const stripInvestigations = (invs: typeof ws.compliance.investigations) => {
    if (!invs) return undefined;
    const stale = new Set(findings.map((f) => f.id));
    return Object.fromEntries(Object.entries(invs).filter(([k]) => !stale.has(k)));
  };

  const save = (verify = false) => {
    const next: WorkspaceDocument = { ...draft, status: verify ? 'verified' : draft.status === 'extracting' ? 'extracted' : draft.status };
    ws.updateCompliance((s) => ({
      ...s,
      documents: s.documents.map((x) => (x.doc.id === next.doc.id ? next : x)),
      investigations: verify ? s.investigations : stripInvestigations(s.investigations),
    }));
    ws.logAudit(verify ? 'VERIFY_DOCUMENT' : 'EDIT_DOCUMENT', `${d.number.value} · ${d.counterparty.value}`, verify ? 'Dokumen diverifikasi manual; masuk analisis risiko.' : 'Field dokumen dikoreksi manual (override AI).');
    ui.toast(verify ? 'Dokumen diverifikasi.' : 'Perubahan disimpan. Mesin risiko menghitung ulang.');
    setEditing(false);
    if (verify) onClose();
  };

  const fields: { k: 'number' | 'date' | 'counterparty' | 'counterpartyTaxId' | 'taxableBase' | 'taxAmount' | 'invoiceUuid' | 'ownershipPercentage'; label: string; money?: boolean; pct?: boolean; mono?: boolean }[] = [
    { k: 'number', label: 'Nomor dokumen', mono: true },
    { k: 'date', label: 'Tanggal' },
    { k: 'counterparty', label: d.type === 'shareholder' ? 'Pemegang saham' : 'Vendor' },
    { k: 'counterpartyTaxId', label: 'Identitas pajak pihak lawan', mono: true },
    ...(d.type === 'shareholder' ? ([{ k: 'ownershipPercentage', label: 'Persentase saham (%)', pct: true }] as const) : []),
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
            {findings.length > 0 && (
              <Button variant="secondary" icon={<ShieldAlert />} onClick={() => router.push(`/cases?f=${encodeURIComponent(findings[0].id)}`)}>
                Buka kasus
              </Button>
            )}
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
            title={`${findings.length} kasus risiko pada dokumen ini`}
            action={<Button size="sm" onClick={() => router.push(`/cases?f=${encodeURIComponent(findings[0].id)}`)}>Buka</Button>}
          >
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              {findings.map((f, i) => (
                <React.Fragment key={f.id}>
                  {i > 0 && <span aria-hidden>·</span>}
                  <button type="button" onClick={() => router.push(`/cases?f=${encodeURIComponent(f.id)}`)} className="underline hover:text-danger-700 cursor-pointer text-left">
                    {f.ruleName}
                  </button>
                </React.Fragment>
              ))}
            </span>
          </Callout>
        )}

        <div>
          <h3 className="font-serif text-[18px] text-ink mb-3">Field hasil ekstraksi</h3>
          <div className="rounded-lg border border-line divide-y divide-line">
            {fields.map((f) => {
              const field = d[f.k] as { value: string | number | null; source: 'ai' | 'manual'; confidence?: number };
              return (
                <div key={f.k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-3 px-4 py-2.5">
                  <span className="text-[13px] text-ink-3">{f.label}</span>
                  {editing ? (
                    <Input
                      aria-label={f.label}
                      className={cn('h-8', f.mono && 'font-mono')}
                      type={f.money || f.pct ? 'number' : f.k === 'date' ? 'date' : 'text'}
                      min={f.money || f.pct ? 0 : undefined}
                      max={f.pct ? 100 : undefined}
                      step={f.pct ? '0.1' : undefined}
                      value={field.value === null ? '' : String(field.value)}
                      onChange={(e) => {
                        if (f.money) setField(f.k, Math.max(0, Number(e.target.value) || 0) as never);
                        else if (f.pct) setField(f.k, Math.min(100, Math.max(0, Number(e.target.value) || 0)) as never);
                        else setField(f.k, e.target.value as never);
                      }}
                    />
                  ) : (
                    <span className={cn('text-[13px] text-ink break-words', f.mono && 'font-mono')}>
                      {f.money ? money(Number(field.value ?? 0), country) : f.pct ? `${field.value ?? '—'}%` : f.k === 'date' ? dateShort(String(field.value ?? '')) : String(field.value ?? '') || <span className="text-danger-600">kosong</span>}
                    </span>
                  )}
                  <span className="justify-self-end">
                    {field.source === 'manual' ? (
                      <Badge tone="brand">Manual</Badge>
                    ) : typeof field.confidence === 'number' ? (
                      <span className={cn('text-xs num', field.confidence < 0.9 ? 'text-warning-700' : 'text-ink-3')}>AI {Math.round(field.confidence * 100)}%</span>
                    ) : (
                      <span className="text-xs text-ink-3">AI</span>
                    )}
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
          </div>
        </div>

        {d.type === 'e_invoice' && (
          <div>
            <h3 className="font-serif text-[18px] text-ink mb-3">Verifikasi kepatuhan</h3>
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
        description="Kasus yang hanya bersumber dari dokumen ini ikut hilang dari analisis."
        onConfirm={() => {
          ws.updateCompliance((s) => ({
            ...s,
            documents: s.documents.filter((x) => x.doc.id !== item.doc.id),
            investigations: stripInvestigations(s.investigations),
          }));
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
  const flagged = useMemo(() => new Set(ws.findings.flatMap((f) => f.documentIds)), [ws.findings]);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return docs
      .filter((d) =>
        status === 'all'
          ? true
          : status === 'verified'
            ? d.status === 'verified'
            : status === 'flagged'
              ? flagged.has(d.doc.id)
              : d.status !== 'verified',
      )
      .filter((d) => (type === 'all' ? true : d.doc.type === type))
      .filter((d) => !term || `${d.doc.number.value} ${d.doc.counterparty.value} ${d.doc.counterpartyTaxId.value}`.toLowerCase().includes(term))
      .sort((a, b) => (a.status === 'verified' ? 1 : 0) - (b.status === 'verified' ? 1 : 0) || b.doc.date.value.localeCompare(a.doc.date.value));
  }, [docs, status, type, q, flagged]);

  const pending = docs.filter((d) => d.status !== 'verified').length;
  const verifiedPct = docs.length ? Math.round(((docs.length - pending) / docs.length) * 100) : 100;
  const verifiedTone = verifiedPct >= 90 ? 'emerald' : verifiedPct >= 60 ? 'amber' : 'rose';
  const conf = docs.length ? docs.reduce((s, d) => s + (lowestConfidence(d.doc)?.confidence ?? 1), 0) / docs.length : 1;
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
        next={<CycleNext current="/documents" />}
        eyebrow={<span>Langkah 2 dari 6 · Siklus kepatuhan</span>}
        title="Dokumen"
        description="Faktur, invoice, dan register pemegang saham. Field hasil ekstraksi AI ditandai dengan keyakinannya; setiap dokumen otomatis dianalisis mesin aturan."
        actions={
          <Button variant="primary" icon={<Upload />} onClick={() => setUpload(true)}>
            Unggah dokumen
          </Button>
        }
      />

      <MetricBand
        className="mb-6"
        label="Posisi inbox dokumen"
        lead={
          <BandLead
            eyebrow="Terverifikasi"
            title={`${verifiedPct}% selesai`}
            detail={`${docs.length} dokumen · ${docs.filter((d) => d.doc.type === 'e_invoice').length} faktur/invoice`}
            tone={verifiedTone === 'rose' ? 'danger' : verifiedTone === 'amber' ? 'warning' : 'success'}
            visual={
              <ComplianceRing
                value={verifiedPct}
                tone={verifiedTone}
                caption="%"
                label={`${verifiedPct} persen dokumen terverifikasi`}
              />
            }
          />
        }
        metrics={[
          {
            label: 'Perlu verifikasi',
            value: pending,
            detail: 'Belum masuk status terverifikasi',
            icon: <Inbox />,
            tone: pending ? 'warning' : undefined,
            onClick: () => setStatus('pending'),
          },
          {
            label: 'Keyakinan ekstraksi',
            value: `${Math.round(conf * 100)}%`,
            detail: 'Field di bawah 90% ditandai untuk ditinjau',
            icon: <CheckCircle2 />,
          },
          {
            label: 'Terkait kasus',
            value: flaggedCount,
            detail: 'Dokumen yang membuka kasus risiko',
            icon: <ShieldAlert />,
            tone: flaggedCount ? 'danger' : undefined,
            href: '/cases',
          },
        ]}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-line">
          <ScopeToggle value={scope} onChange={setScope} />
          <Segmented<StatusFilter>
            value={status}
            onChange={setStatus}
            items={[
              { id: 'all', label: 'Semua' },
              { id: 'pending', label: 'Perlu verifikasi', count: pending },
              { id: 'flagged', label: 'Terkait kasus', count: flaggedCount },
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
                <TH align="right">Nilai</TH>
                <TH align="right">Keyakinan</TH>
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
                      <div className="min-w-0">
                        <div className="text-ink font-medium truncate max-w-[300px]">{d.counterparty.value}</div>
                        <div className="text-xs text-ink-3 truncate"><span className="font-mono">{d.number.value}</span> · {DOC_TYPE_LABEL[d.type]}</div>
                      </div>
                    </TD>
                    {scope === 'group' && (
                      <TD className="max-w-[200px]"><EntityName id={d.entityId} short /></TD>
                    )}
                    <TD className="whitespace-nowrap">{dateShort(d.date.value)}</TD>
                    <TD align="right">
                      {d.type === 'e_invoice' ? (
                        <>
                          <div className="text-ink">{money(d.totalAmount.value, d.country)}</div>
                          <div className="text-xs text-ink-3">pajak {money(d.taxAmount.value, d.country)}</div>
                        </>
                      ) : (
                        <span className="text-ink-3">{d.ownershipPercentage.value}% saham</span>
                      )}
                    </TD>
                    <TD align="right"><ConfidenceCell doc={d} /></TD>
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
