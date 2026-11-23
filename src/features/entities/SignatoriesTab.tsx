'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, FileText, Send, ShieldCheck, UserPlus } from 'lucide-react';
import type { CorporateEntity } from '@/data/entities';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { computeOwnershipChain, computeSignatoryPlan, type SignatoryItem } from '@/lib/ownershipChain';
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  Dialog,
  MetricBand,
  SelectField,
  Table,
  TD,
  TH,
  THead,
  TR,
} from '@/ui';

export function SignatoriesTab({ entity }: { entity: CorporateEntity }) {
  const ws = useWorkspace();
  const ui = useUi();

  const chain = useMemo(() => computeOwnershipChain(ws.ownership, entity), [ws.ownership, entity]);
  const plan = useMemo(() => computeSignatoryPlan(ws.ownership, entity, chain), [ws.ownership, entity, chain]);
  const config = ws.ownership.companies[entity.id];
  const individuals = useMemo(
    () => ws.ownership.profiles.filter((p) => p.kind === 'individual'),
    [ws.ownership.profiles],
  );

  const [addingFor, setAddingFor] = useState<{ entityId: string; entityName: string; isTarget: boolean } | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const openAddDirector = (targetEntityId: string, targetEntityName: string) => {
    setSelectedPersonId(individuals[0]?.id ?? '');
    setAddingFor({
      entityId: targetEntityId,
      entityName: targetEntityName,
      isTarget: targetEntityId === entity.id,
    });
  };

  const assignDirector = () => {
    if (!addingFor || !selectedPersonId) return;
    if (addingFor.isTarget) {
      ws.updateOwnership((prev) => {
        const cur = prev.companies[entity.id] ?? {
          entityId: entity.id,
          issuedShares: 20_000,
          shareClass: 'Ordinary',
          consideration: entity.paidUpCapital || '—',
          directorIds: [],
        };
        const nextDirs = cur.directorIds.includes(selectedPersonId)
          ? cur.directorIds
          : [...cur.directorIds, selectedPersonId];
        return {
          ...prev,
          companies: {
            ...prev.companies,
            [entity.id]: { ...cur, directorIds: nextDirs },
          },
        };
      });
    } else {
      ws.updateOwnership((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === addingFor.entityId && !p.directorIds.includes(selectedPersonId)
            ? { ...p, directorIds: [...p.directorIds, selectedPersonId] }
            : p,
        ),
      }));
    }
    const person = individuals.find((i) => i.id === selectedPersonId);
    ws.logAudit('ASSIGN_SIGNATORY_DIRECTOR', addingFor.entityName, `${person?.legalName ?? selectedPersonId} ditetapkan sebagai direktur penanda tangan.`);
    ui.toast(`Direktur ditambahkan untuk ${addingFor.entityName}.`);
    setAddingFor(null);
  };

  const sendForSignature = () => {
    if (plan.blocked) return;
    ws.updateOwnership((prev) => ({
      ...prev,
      companies: {
        ...prev.companies,
        [entity.id]: {
          ...(prev.companies[entity.id] ?? {
            entityId: entity.id,
            issuedShares: 20_000,
            shareClass: 'Ordinary',
            consideration: entity.paidUpCapital || '—',
            directorIds: [],
          }),
          sentForSignatureAt: new Date().toISOString(),
        },
      },
    }));
    ws.logAudit('SEND_SIGNATORY_DOCUMENTS', entity.legalName, `${plan.totalNeeded} tanda tangan (${plan.documents.join(', ')}) dikirim ke penanda tangan.`);
    ui.toast(`Paket ${plan.documents.join(', ')} dikirim untuk tanda tangan.`);
  };

  const renderStatus = (item: SignatoryItem) =>
    item.status === 'Ready' ? (
      <Badge tone="success" dot>Siap</Badge>
    ) : (
      <Badge tone="danger" dot>Belum ada</Badge>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-[22px] text-ink">Penanda tangan & dokumen</h3>
          <p className="text-[13px] text-ink-3">
            {plan.assignedCount} dari {plan.totalNeeded} tanda tangan ditugaskan berdasarkan rantai kepemilikan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<Eye />} onClick={() => setPreviewOpen(true)}>
            Pratinjau dokumen
          </Button>
          <Button
            variant="primary"
            icon={<Send />}
            disabled={plan.blocked}
            onClick={sendForSignature}
            title={plan.blocked ? 'Terblokir hingga setiap perusahaan di rantai memiliki direktur' : undefined}
          >
            {config?.sentForSignatureAt ? 'Kirim ulang untuk tanda tangan' : 'Kirim untuk tanda tangan'}
          </Button>
        </div>
      </div>

      {plan.blocked ? (
        <Callout
          tone="warning"
          icon={<AlertTriangle />}
          title={`Terblokir · ${plan.missingCount} tanda tangan belum memiliki penanda tangan`}
          action={
            plan.missingEntities[0] ? (
              <Button
                size="sm"
                icon={<UserPlus />}
                onClick={() => openAddDirector(plan.missingEntities[0].id, plan.missingEntities[0].name)}
              >
                Tambah direktur
              </Button>
            ) : undefined
          }
        >
          {plan.missingEntities.map((m) => m.name).join(' dan ')} belum memiliki direktur tercatat. Tambahkan minimal satu direktur untuk masing-masing perusahaan sebelum dokumen dapat dikirim.
        </Callout>
      ) : (
        <Callout tone="success" icon={<CheckCircle2 />} title="Seluruh penanda tangan lengkap">
          {config?.sentForSignatureAt
            ? `Dokumen ${plan.documents.join(', ')} telah dikirim untuk tanda tangan elektronik.`
            : `Semua perusahaan dalam rantai memiliki direktur penanda tangan. Anda siap mengirim paket ${plan.documents.join(', ')}.`}
        </Callout>
      )}

      <MetricBand
        label="Ringkasan penandatanganan"
        metrics={[
          {
            label: 'Dokumen',
            value: plan.documents.length,
            detail: plan.documents.join(', '),
            icon: <FileText />,
          },
          {
            label: 'Tanda tangan dibutuhkan',
            value: plan.totalNeeded,
            detail: 'Satu per entitas per dokumen',
            icon: <ShieldCheck />,
          },
          {
            label: 'Sudah ditugaskan',
            value: plan.assignedCount,
            detail: 'Direktur tercatat',
            tone: 'success',
          },
          {
            label: 'Belum ada',
            value: plan.missingCount,
            detail: plan.missingCount > 0 ? 'Belum ada direktur tercatat' : 'Lengkap',
            tone: plan.missingCount > 0 ? 'danger' : 'success',
          },
        ]}
      />

      <Card>
        <CardHeader
          title="Rencana penandatanganan"
          description="Dihasilkan otomatis dari rantai kepemilikan. Menambah perusahaan ke rantai otomatis menambahkan tanda tangan yang diwajibkan."
          actions={<Badge tone="neutral">{plan.totalNeeded} tanda tangan</Badge>}
        />
        <Table>
          <THead>
            <tr>
              <TH>Dokumen</TH>
              <TH>Entitas</TH>
              <TH>Ditandatangani oleh</TH>
              <TH>Penanda tangan</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <tbody>
            {plan.items.map((item) => (
              <TR key={item.id} className={item.status === 'Missing' ? 'bg-danger-50/45' : undefined}>
                <TD>
                  <Badge tone="neutral" className="font-mono">{item.docCode}</Badge>
                </TD>
                <TD>
                  <div className="font-medium text-ink">{item.entityName}</div>
                  <div className="text-xs text-ink-3">{item.entityRole}</div>
                </TD>
                <TD className="text-xs text-ink-2">{item.signedByLabel}</TD>
                <TD>
                  {item.signatoryName ? (
                    <div className="flex items-center gap-2">
                      <Avatar initials={item.signatoryInitials ?? 'DR'} className="bg-ink" size="sm" />
                      <span className="text-[13px] font-medium text-ink">{item.signatoryName}</span>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-danger-700">Belum ada direktur tercatat</div>
                      <button
                        type="button"
                        onClick={() => openAddDirector(item.entityId, item.entityName)}
                        className="text-xs font-semibold text-brand-700 hover:underline cursor-pointer"
                      >
                        Tambah direktur
                      </button>
                    </div>
                  )}
                </TD>
                <TD>{renderStatus(item)}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
        <div className="px-5 py-3 border-t border-line text-xs text-ink-3">
          Jika suatu entitas memiliki lebih dari satu direktur, direktur pertama yang terdaftar menandatangani secara default.
        </div>
      </Card>

      {addingFor && (
        <Dialog
          open
          onClose={() => setAddingFor(null)}
          size="sm"
          title={`Tambah direktur untuk ${addingFor.entityName}`}
          description="Pilih profil perorangan sebagai direktur penanda tangan."
          footer={
            <>
              <Button variant="ghost" onClick={() => setAddingFor(null)}>Batal</Button>
              <Button variant="primary" disabled={!selectedPersonId} onClick={assignDirector}>
                Simpan direktur
              </Button>
            </>
          }
        >
          <SelectField label="Direktur" value={selectedPersonId} onChange={(e) => setSelectedPersonId(e.target.value)}>
            {individuals.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.legalName} ({ind.jurisdictionOrNationality})
              </option>
            ))}
          </SelectField>
        </Dialog>
      )}

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        size="lg"
        title={`Pratinjau paket dokumen · ${entity.legalName}`}
        description="Ringkasan dokumen deklarasi kepemilikan & penanda tangan yang dihasilkan dari rantai kepemilikan."
        footer={<Button onClick={() => setPreviewOpen(false)}>Tutup</Button>}
      >
        <div className="space-y-3">
          {[
            { code: 'D9', title: 'Deklarasi Pemegang Saham Korporasi & Perantara', scope: 'Ditandatangani direktur setiap pemegang saham korporasi dan perantara.' },
            { code: 'D100', title: 'Formulir Konfirmasi Struktur Pemegang Saham Langsung', scope: 'Ditandatangani direktur setiap pemegang saham korporasi langsung.' },
            { code: 'D101 / D102', title: 'Resolusi Direksi & Pernyataan Pemilik Manfaat Perusahaan Target', scope: `Ditandatangani direksi ${entity.legalName}.` },
          ].map((doc) => (
            <div key={doc.code} className="rounded-lg border border-line px-4 py-3 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="brand" className="font-mono">{doc.code}</Badge>
                  <span className="font-medium text-ink text-sm">{doc.title}</span>
                </div>
                <p className="text-xs text-ink-3 mt-1">{doc.scope}</p>
              </div>
              <Badge tone={plan.blocked ? 'warning' : 'success'} dot>
                {plan.blocked ? 'Menunggu direktur' : 'Siap kirim'}
              </Badge>
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
