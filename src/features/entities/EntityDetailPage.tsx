'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowLeft,
  Building2,
  Eye,
  FileText,
  Lock,
  Pencil,
  Plus,
  ScanText,
  ShieldAlert,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import type { CorporateDocument, CorporateEntity, IndividualShareholder, IntermediateShareholder } from '@/data/entities';
import { MULTI_COUNTRY_DATA } from '@/data/multiCountryTaxData';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { entityRiskScore, isUnresolved, riskBand } from '@/lib/compliance';
import { money } from '@/lib/format';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  DescriptionList,
  EmptyState,
  IconButton,
  Meter,
  PageHeader,
  Sheet,
  Table,
  TD,
  TextField,
  TH,
  THead,
  TR,
  Tabs,
} from '@/ui';
import { ReviewBadge, SeverityBadge } from '../shared';
import { AddEntityDialog, CorporateShareholderDialog, IndividualDialog } from './dialogs';
import { docStatusLabel, docStatusTone } from './helpers';

type Tab = 'profile' | 'documents' | 'structure' | 'shareholders' | 'risk';

// ── Profile ──────────────────────────────────────────────────────────────
const PROFILE_FIELDS: { key: keyof CorporateEntity; label: string; mono?: boolean; wide?: boolean }[] = [
  { key: 'legalName', label: 'Nama legal' },
  { key: 'tradeName', label: 'Nama dagang' },
  { key: 'taxId', label: 'Identitas pajak', mono: true },
  { key: 'nitkuOrBranchId', label: 'NITKU / ID cabang', mono: true },
  { key: 'registrationNumber', label: 'Nomor registrasi', mono: true },
  { key: 'incorporationDate', label: 'Tanggal pendirian' },
  { key: 'businessClassification', label: 'Klasifikasi usaha (KLU)', wide: true },
  { key: 'taxOfficeName', label: 'Kantor pajak terdaftar' },
  { key: 'vatOrGstStatus', label: 'Status PPN / GST' },
  { key: 'fiscalYearEnd', label: 'Tahun buku' },
  { key: 'functionalCurrency', label: 'Mata uang fungsional' },
  { key: 'paidUpCapital', label: 'Modal disetor' },
  { key: 'address', label: 'Alamat', wide: true },
  { key: 'cityAndPostal', label: 'Kota & kode pos' },
  { key: 'authorizedTaxOfficer', label: 'Kuasa / pejabat pajak' },
  { key: 'officerPosition', label: 'Jabatan pejabat' },
  { key: 'contactEmail', label: 'Email kepatuhan' },
  { key: 'contactPhone', label: 'Telepon' },
];

function ProfileTab({ entity }: { entity: CorporateEntity }) {
  const ws = useWorkspace();
  const ui = useUi();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entity);
  useEffect(() => setDraft(entity), [entity]);
  const canEdit = ws.canAccess(entity.id);

  const save = () => {
    const changed = PROFILE_FIELDS.filter((f) => draft[f.key] !== entity[f.key]).map((f) => f.label);
    ws.saveEntity(draft);
    if (changed.length) ws.logAudit('UPDATE_ENTITY_PROFILE', entity.legalName, `Diubah: ${changed.join(', ')}`);
    ui.toast(changed.length ? 'Profil entitas disimpan.' : 'Tidak ada perubahan.');
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader
        title="Informasi korporasi"
        description="Data ini dipakai di SPT, kode billing, dan dokumen transfer pricing."
        actions={
          editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setDraft(entity); setEditing(false); }}>Batal</Button>
              <Button variant="primary" size="sm" onClick={save}>Simpan</Button>
            </>
          ) : (
            <Button size="sm" icon={<Pencil />} onClick={() => setEditing(true)} disabled={!canEdit}>Ubah</Button>
          )
        }
      />
      <CardBody>
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PROFILE_FIELDS.map((f) => (
              <TextField
                key={f.key}
                label={f.label}
                mono={f.mono}
                className={f.wide ? 'sm:col-span-2' : undefined}
                value={String(draft[f.key] ?? '')}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              />
            ))}
          </div>
        ) : (
          <DescriptionList
            columns={3}
            items={PROFILE_FIELDS.map((f) => ({ label: f.label, value: String(entity[f.key] || '—'), mono: f.mono }))}
          />
        )}
      </CardBody>
    </Card>
  );
}

// ── Legal documents ──────────────────────────────────────────────────────
function DocumentsTab({ entity }: { entity: CorporateEntity }) {
  const ws = useWorkspace();
  const ui = useUi();
  const [viewing, setViewing] = useState<CorporateDocument | null>(null);
  const [scanning, setScanning] = useState<string | 'all' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const verified = entity.documents.filter((d) => d.status === 'Verified by Document AI').length;

  const update = (docs: CorporateDocument[], extra: Partial<CorporateEntity> = {}) => ws.saveEntity({ ...entity, documents: docs, ...extra });

  const verifyAll = () => {
    setScanning('all');
    window.setTimeout(() => {
      const docs = entity.documents.map((d) =>
        d.fileName ? { ...d, status: 'Verified by Document AI' as const, confidenceScore: d.confidenceScore || 96.5 } : d,
      );
      const allOk = docs.every((d) => d.status === 'Verified by Document AI');
      update(docs, { status: allOk ? 'ACTIVE' : entity.status, aiComplianceScore: Math.min(99, entity.aiComplianceScore + 4) });
      ws.logAudit('VERIFY_LEGAL_DOCUMENTS', entity.legalName, `Document AI memverifikasi ${docs.filter((d) => d.fileName).length} dokumen legal.`);
      ui.toast(allOk ? 'Semua dokumen legal terverifikasi. Entitas aktif.' : 'Dokumen yang tersedia sudah diverifikasi. Lengkapi yang belum diunggah.');
      setScanning(null);
    }, 900);
  };

  const onFile = (file: File) => {
    if (!uploadFor) return;
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(file.type)) {
      ui.toast('Format harus PDF, PNG, atau JPG.', 'danger');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      ui.toast('Ukuran maksimum 10 MB.', 'danger');
      return;
    }
    const id = uploadFor;
    setScanning(id);
    window.setTimeout(() => {
      const docs = entity.documents.map((d) =>
        d.id === id
          ? {
              ...d,
              fileName: file.name,
              fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
              uploadedAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
              status: 'Verified by Document AI' as const,
              confidenceScore: 94 + (file.name.length % 6),
              extractedNote: `Diekstraksi otomatis dari ${file.name}. Periksa kembali field kunci sebelum dipakai.`,
              extractedFields: [
                { key: 'Nama entitas', val: entity.legalName },
                { key: 'Identitas pajak', val: entity.taxId.split('(')[0].trim() },
                { key: 'Tanggal dokumen', val: new Date().toISOString().slice(0, 10) },
              ],
            }
          : d,
      );
      update(docs);
      ws.logAudit('UPLOAD_LEGAL_DOCUMENT', `${entity.legalName} · ${file.name}`, 'Dokumen diunggah & diekstraksi Document AI.');
      ui.toast(`${file.name} diunggah dan diekstraksi.`);
      setScanning(null);
      setUploadFor(null);
    }, 1000);
  };

  return (
    <Card>
      <CardHeader
        title="Dokumen legal wajib"
        description={`${verified} dari ${entity.documents.length} terverifikasi Document AI`}
        actions={
          <Button size="sm" icon={<ScanText />} loading={scanning === 'all'} onClick={verifyAll}>
            Verifikasi ulang semua
          </Button>
        }
      />
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      <ul className="divide-y divide-line border-t border-line">
        {entity.documents.map((d) => (
          <li key={d.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-5 py-3.5">
            <span className="size-9 rounded-lg bg-muted text-ink-3 flex items-center justify-center shrink-0">
              <FileText className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-ink font-medium">{d.label}</div>
              <div className="text-xs text-ink-3 truncate">
                {d.fileName ? `${d.fileName} · ${d.fileSize} · ${d.uploadedAt}` : 'Belum diunggah'}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-12 sm:ml-0">
              {d.fileName && d.confidenceScore > 0 && <span className="text-xs text-ink-3 num">{d.confidenceScore.toFixed(1)}%</span>}
              <Badge tone={d.fileName ? docStatusTone(d.status) : 'neutral'} dot>
                {d.fileName ? docStatusLabel(d.status) : 'Kosong'}
              </Badge>
              {d.fileName && (
                <IconButton label="Lihat hasil ekstraksi" size="sm" onClick={() => setViewing(d)}>
                  <Eye />
                </IconButton>
              )}
              <Button
                size="sm"
                variant={d.fileName ? 'ghost' : 'secondary'}
                icon={<Upload />}
                loading={scanning === d.id}
                onClick={() => {
                  setUploadFor(d.id);
                  fileRef.current?.click();
                }}
              >
                {d.fileName ? 'Ganti' : 'Unggah'}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Sheet open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.label} description={viewing?.fileName}>
        {viewing && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Badge tone={docStatusTone(viewing.status)} dot>{docStatusLabel(viewing.status)}</Badge>
              <span className="text-xs text-ink-3">Confidence {viewing.confidenceScore.toFixed(1)}%</span>
            </div>
            <Callout tone="neutral">{viewing.extractedNote}</Callout>
            <div>
              <h3 className="text-sm font-semibold text-ink mb-2">Field hasil ekstraksi</h3>
              <DescriptionList columns={1} items={viewing.extractedFields.map((f) => ({ label: f.key, value: f.val }))} />
            </div>
          </div>
        )}
      </Sheet>
    </Card>
  );
}

// ── Ownership structure ──────────────────────────────────────────────────
function StructureTab({ entity }: { entity: CorporateEntity }) {
  const ws = useWorkspace();
  const router = useRouter();
  const [addSub, setAddSub] = useState(false);
  const [shDialog, setShDialog] = useState<{ open: boolean; sh: IntermediateShareholder | null }>({ open: false, sh: null });
  const children = ws.entities.filter((e) => e.parentCompanyId === entity.id);
  const parent = entity.parentCompanyId ? ws.entityById(entity.parentCompanyId) : undefined;
  const direct = entity.intermediateShareholders;
  const total = direct.reduce((s, x) => s + x.sharePercent, 0);
  const ubos = entity.individualShareholders.filter((i) => i.effectiveSharePercent >= 25 || i.type === 'Individual Shareholder (UBO)');

  return (
    <div className="space-y-6">
      {direct.length > 0 && Math.abs(total - 100) > 0.01 && (
        <Callout tone="warning" title={`Total kepemilikan langsung ${total}%`}>
          Register pemegang saham {entity.legalName} tidak berjumlah 100%. Rekonsiliasi dengan akta terakhir sebelum pelaporan pemilik manfaat.
        </Callout>
      )}
      <Card>
        <CardHeader
          title="Peta kepemilikan"
          description="Pemegang saham → entitas → anak usaha"
          actions={
            <>
              <Button size="sm" icon={<Plus />} onClick={() => setShDialog({ open: true, sh: null })}>Pemegang saham</Button>
              <Button size="sm" icon={<Plus />} onClick={() => setAddSub(true)} disabled={!ws.isParentExec}>Anak usaha</Button>
            </>
          }
        />
        <CardBody>
          <div className="text-xs font-medium text-ink-3 mb-2">Pemilik ({direct.length + (parent ? 1 : 0)})</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {parent && (
              <button type="button" onClick={() => router.push(`/entities/${parent.id}`)} className="text-left rounded-xl border border-line px-3.5 py-3 hover:border-line-strong cursor-pointer">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="dark">Induk</Badge>
                  <span className="text-sm font-semibold text-ink num">{entity.ownershipByParent}%</span>
                </div>
                <div className="mt-2 text-[13px] font-medium text-ink">{parent.flag} {parent.legalName}</div>
              </button>
            )}
            {direct.map((sh) => (
              <div key={sh.id} className="group rounded-xl border border-line px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={sh.bepsRisk.startsWith('High') ? 'danger' : 'neutral'}>{sh.bepsRisk.startsWith('High') ? 'Risiko conduit' : 'Korporasi'}</Badge>
                  <span className="text-sm font-semibold text-ink num">{sh.sharePercent}%</span>
                </div>
                <div className="mt-2 text-[13px] font-medium text-ink">{sh.name}</div>
                <div className="text-xs text-ink-3">{sh.jurisdiction}</div>
                <div className="mt-2 flex gap-1 opacity-70 group-hover:opacity-100">
                  <Button size="xs" variant="ghost" icon={<Pencil />} onClick={() => setShDialog({ open: true, sh })}>Ubah</Button>
                </div>
              </div>
            ))}
            {ubos.map((u) => (
              <div key={u.id} className="rounded-xl border border-dashed border-line-strong px-3.5 py-3 bg-subtle">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="brand"><UserRound className="size-3" /> UBO</Badge>
                  <span className="text-xs text-ink-3">efektif <span className="text-ink font-semibold num">{u.effectiveSharePercent}%</span></span>
                </div>
                <div className="mt-2 text-[13px] font-medium text-ink">{u.fullName}</div>
                <div className="text-xs text-ink-3">{u.taxResidency}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-center py-3 text-ink-4"><ArrowDown className="size-4" /></div>

          <div className="mx-auto max-w-md rounded-xl border-2 border-ink px-4 py-3 text-center">
            <div className="text-xl">{entity.flag}</div>
            <div className="text-sm font-semibold text-ink">{entity.legalName}</div>
            <div className="text-xs text-ink-3 font-mono mt-0.5">{entity.taxId.split('(')[0].trim()}</div>
          </div>

          {children.length > 0 && (
            <>
              <div className="flex justify-center py-3 text-ink-4"><ArrowDown className="size-4" /></div>
              <div className="text-xs font-medium text-ink-3 mb-2">Anak usaha ({children.length})</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {children.map((c) => {
                  const node = entity.structureNodes.find((n) => n.entityName === c.legalName);
                  return (
                    <button key={c.id} type="button" onClick={() => router.push(`/entities/${c.id}`)} className="text-left rounded-xl border border-line px-3.5 py-3 hover:border-line-strong cursor-pointer">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-lg">{c.flag}</span>
                        <span className="text-sm font-semibold text-ink num">{c.ownershipByParent}%</span>
                      </div>
                      <div className="mt-1.5 text-[13px] font-medium text-ink">{c.legalName}</div>
                      {node && (
                        <div className="mt-2 space-y-1 text-xs text-ink-3">
                          <div>{node.intercompanyTransaction}</div>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge>{node.transferPricingMethod.split(' (')[0]}</Badge>
                            <Badge tone={node.treatyFormStatus.startsWith('Verified') ? 'success' : 'warning'}>WHT {node.whtTreatyRate.split(' ')[0]}</Badge>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardBody>
      </Card>
      <AddEntityDialog open={addSub} onClose={() => setAddSub(false)} defaultParentId={entity.id} />
      <CorporateShareholderDialog open={shDialog.open} onClose={() => setShDialog({ open: false, sh: null })} entity={entity} initial={shDialog.sh} />
    </div>
  );
}

// ── Shareholders table ───────────────────────────────────────────────────
function ShareholdersTab({ entity }: { entity: CorporateEntity }) {
  const ws = useWorkspace();
  const ui = useUi();
  const [ind, setInd] = useState<{ open: boolean; p: IndividualShareholder | null }>({ open: false, p: null });
  const [sh, setSh] = useState<{ open: boolean; s: IntermediateShareholder | null }>({ open: false, s: null });
  const [del, setDel] = useState<{ kind: 'sh' | 'ind'; id: string; name: string } | null>(null);

  const remove = () => {
    if (!del) return;
    if (del.kind === 'sh') ws.saveEntity({ ...entity, intermediateShareholders: entity.intermediateShareholders.filter((x) => x.id !== del.id) });
    else ws.saveEntity({ ...entity, individualShareholders: entity.individualShareholders.filter((x) => x.id !== del.id) });
    ws.logAudit('REMOVE_SHAREHOLDER', `${entity.legalName} · ${del.name}`, 'Pemegang saham dihapus dari register.');
    ui.toast(`${del.name} dihapus.`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Pemegang saham korporasi" actions={<Button size="sm" icon={<Plus />} onClick={() => setSh({ open: true, s: null })}>Tambah</Button>} />
        {entity.intermediateShareholders.length === 0 ? (
          <EmptyState icon={<Building2 />} title="Belum ada pemegang saham korporasi" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Nama</TH>
                <TH>Yurisdiksi</TH>
                <TH>Identitas pajak</TH>
                <TH align="right">Saham</TH>
                <TH>Risiko BEPS</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {entity.intermediateShareholders.map((s) => (
                <TR key={s.id}>
                  <TD className="text-ink font-medium">{s.name}</TD>
                  <TD>{s.jurisdiction}</TD>
                  <TD className="font-mono">{s.taxId || '—'}</TD>
                  <TD align="right" className="text-ink">{s.sharePercent}%</TD>
                  <TD><Badge tone={s.bepsRisk.startsWith('High') ? 'danger' : 'success'} dot>{s.bepsRisk.startsWith('High') ? 'Tinggi' : 'Rendah'}</Badge></TD>
                  <TD align="right">
                    <IconButton label="Ubah" size="sm" onClick={() => setSh({ open: true, s })}><Pencil /></IconButton>
                    <IconButton label="Hapus" size="sm" onClick={() => setDel({ kind: 'sh', id: s.id, name: s.name })}><Trash2 /></IconButton>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Card>
        <CardHeader title="Pemegang saham perorangan & pemilik manfaat" actions={<Button size="sm" icon={<Plus />} onClick={() => setInd({ open: true, p: null })}>Tambah</Button>} />
        {entity.individualShareholders.length === 0 ? (
          <EmptyState icon={<UserRound />} title="Belum ada pemegang saham perorangan" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Nama</TH>
                <TH>Residensi pajak</TH>
                <TH align="right">Langsung</TH>
                <TH align="right">Efektif</TH>
                <TH>PEP / KYC</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {entity.individualShareholders.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <div className="text-ink font-medium">{p.fullName}</div>
                    <div className="text-xs text-ink-3">{p.roleTitle}</div>
                  </TD>
                  <TD>{p.taxResidency.split('(')[0]}</TD>
                  <TD align="right">{p.directSharePercent}%</TD>
                  <TD align="right" className="text-ink font-medium">{p.effectiveSharePercent}%</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={p.pepAndSanctionStatus.startsWith('Verified') ? 'success' : 'warning'}>{p.pepAndSanctionStatus.startsWith('Verified') ? 'Non-PEP' : 'PEP · EDD'}</Badge>
                      <Badge tone={p.kycDocStatus.startsWith('Verified') ? 'success' : 'warning'}>{p.kycDocStatus.startsWith('Verified') ? 'KYC ok' : 'KYC pending'}</Badge>
                    </div>
                  </TD>
                  <TD align="right">
                    <IconButton label="Ubah" size="sm" onClick={() => setInd({ open: true, p })}><Pencil /></IconButton>
                    <IconButton label="Hapus" size="sm" onClick={() => setDel({ kind: 'ind', id: p.id, name: p.fullName })}><Trash2 /></IconButton>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <IndividualDialog open={ind.open} onClose={() => setInd({ open: false, p: null })} entity={entity} initial={ind.p} />
      <CorporateShareholderDialog open={sh.open} onClose={() => setSh({ open: false, s: null })} entity={entity} initial={sh.s} />
      <ConfirmDialog open={Boolean(del)} onClose={() => setDel(null)} onConfirm={remove} danger confirmLabel="Hapus" title={`Hapus ${del?.name}?`} description="Perubahan register dicatat di jejak audit." />
    </div>
  );
}

// ── Entity risk summary ──────────────────────────────────────────────────
function RiskTab({ entity }: { entity: CorporateEntity }) {
  const ws = useWorkspace();
  const router = useRouter();
  const findings = ws.findings.filter((f) => f.entityId === entity.id);
  if (!findings.length) return <Card><EmptyState icon={<ShieldAlert />} title="Tidak ada temuan" description="Mesin risiko tidak menemukan indikasi pada dokumen entitas ini." /></Card>;
  return (
    <Card>
      <CardHeader title="Temuan risiko entitas" actions={<Link href="/risk" className="text-[13px] font-medium text-brand-600">Buka pusat risiko</Link>} />
      <Table>
        <THead>
          <tr>
            <TH>Temuan</TH>
            <TH>Tingkat</TH>
            <TH align="right">Nilai dokumen</TH>
            <TH>Status review</TH>
          </tr>
        </THead>
        <tbody>
          {findings.map((f) => (
            <TR key={f.id} onClick={() => router.push(`/risk?f=${encodeURIComponent(f.id)}`)}>
              <TD>
                <div className="text-ink font-medium">{f.ruleName}</div>
                <div className="text-xs text-ink-3 truncate max-w-[420px]">{f.evidence.split('\n')[0]}</div>
              </TD>
              <TD><SeverityBadge severity={f.severity} /></TD>
              <TD align="right">{f.amountAtRisk ? money(f.amountAtRisk, f.country) : '—'}</TD>
              <TD><ReviewBadge status={ws.reviewOf(f.id).status} /></TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────
export function EntityDetailPage({ id }: { id: string }) {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();
  const entity = ws.entityById(id);
  const [tab, setTab] = useState<Tab>('profile');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (entity && ws.canAccess(entity.id) && ws.activeEntityId !== entity.id) ws.selectEntity(entity.id);
  }, [entity, ws]);

  const findings = useMemo(() => ws.findings.filter((f) => f.entityId === id), [ws.findings, id]);

  if (!entity) {
    return (
      <Card>
        <EmptyState icon={<Building2 />} title="Entitas tidak ditemukan" description="Mungkin sudah dihapus." action={<Button onClick={() => router.push('/entities')}>Kembali ke daftar</Button>} />
      </Card>
    );
  }

  if (!ws.canAccess(entity.id)) {
    return (
      <Card>
        <EmptyState icon={<Lock />} title="Di luar cakupan akses Anda" description={`Data ${entity.legalName} memerlukan otorisasi Group CEO/CFO induk (segregasi ISO 27001).`} action={<Button onClick={() => router.push('/entities')}>Kembali</Button>} />
      </Card>
    );
  }

  const open = findings.filter((f) => isUnresolved(ws.reviewOf(f.id).status));
  const score = entityRiskScore(findings, ws.compliance.reviews);
  const band = riskBand(score);
  const meta = MULTI_COUNTRY_DATA[entity.countryCode];
  const children = ws.entities.filter((e) => e.parentCompanyId === entity.id);

  return (
    <div>
      <Link href="/entities" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink mb-4">
        <ArrowLeft className="size-4" /> Semua entitas
      </Link>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Badge tone={entity.status === 'ACTIVE' ? 'success' : 'warning'} dot>{entity.status === 'ACTIVE' ? 'Aktif' : 'Draf'}</Badge>
            <span>{entity.parentCompanyId ? `Anak usaha ${entity.ownershipByParent}% · ${entity.parentCompanyName}` : 'Induk grup (Ultimate Parent Entity)'}</span>
          </span>
        }
        title={
          <span className="inline-flex items-center gap-3">
            <span>{entity.flag}</span>
            {entity.legalName}
          </span>
        }
        description={`${entity.taxAuthority} · ${meta.indirectTaxName} · PPh badan ${(meta.corporateTaxNormalRate * 100).toFixed(0)}%`}
        actions={
          <>
            <Button icon={<ShieldAlert />} onClick={() => router.push('/risk')}>Temuan ({open.length})</Button>
            {entity.parentCompanyId && ws.isParentExec && (
              <Button variant="ghost" icon={<Trash2 />} onClick={() => setConfirmDelete(true)} disabled={children.length > 0} title={children.length ? 'Pindahkan anak usaha terlebih dahulu' : undefined}>
                Hapus
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <div className="text-xs text-ink-3">Identitas pajak</div>
          <div className="mt-1 font-mono text-sm text-ink truncate">{entity.taxId.split('(')[0].trim()}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <div className="text-xs text-ink-3">Skor kepatuhan</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm font-semibold text-ink num">{score}</span>
            <Meter value={score} tone={band.tone === 'rose' ? 'danger' : band.tone === 'amber' ? 'warning' : 'success'} className="flex-1" label="Skor kepatuhan" />
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <div className="text-xs text-ink-3">Dokumen legal</div>
          <div className="mt-1 text-sm text-ink">{entity.documents.filter((d) => d.status === 'Verified by Document AI').length}/{entity.documents.length} terverifikasi</div>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <div className="text-xs text-ink-3">Mata uang · sistem e-faktur</div>
          <div className="mt-1 text-sm text-ink truncate">{meta.currencyCode} · {meta.eInvoiceSystem.split('(')[0]}</div>
        </div>
      </div>

      <Tabs<Tab>
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'profile', label: 'Profil' },
          { id: 'documents', label: 'Dokumen legal', count: entity.documents.length },
          { id: 'structure', label: 'Struktur' },
          { id: 'shareholders', label: 'Pemegang saham', count: entity.intermediateShareholders.length + entity.individualShareholders.length },
          { id: 'risk', label: 'Risiko', count: open.length },
        ]}
      />
      {tab === 'profile' && <ProfileTab entity={entity} />}
      {tab === 'documents' && <DocumentsTab entity={entity} />}
      {tab === 'structure' && <StructureTab entity={entity} />}
      {tab === 'shareholders' && <ShareholdersTab entity={entity} />}
      {tab === 'risk' && <RiskTab entity={entity} />}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        danger
        confirmLabel="Hapus entitas"
        title={`Hapus ${entity.legalName}?`}
        description="Entitas dan relasinya dihapus dari database. Tindakan ini tercatat di jejak audit."
        onConfirm={() => {
          const parent = entity.parentCompanyId ? ws.entityById(entity.parentCompanyId) : undefined;
          if (parent) ws.saveEntity({ ...parent, structureNodes: parent.structureNodes.filter((n) => n.entityName !== entity.legalName) });
          ws.deleteEntity(entity.id);
          ws.logAudit('DELETE_ENTITY', entity.legalName, 'Entitas dihapus oleh eksekutif induk.');
          ui.toast(`${entity.legalName} dihapus.`);
          router.push('/entities');
        }}
      />
    </div>
  );
}
