'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Globe2, Lock, Plus, Search } from 'lucide-react';
import type { CorporateEntity } from '@/data/entities';
import { useWorkspace } from '@/state/workspace';
import { entityRiskScore, isUnresolved } from '@/lib/compliance';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  PageHeader,
  Segmented,
  Table,
  TD,
  TH,
  THead,
  TR,
  cn,
} from '@/ui';
import { CycleFooter } from '@/shell/CycleFooter';
import { AddEntityDialog, ConsolidationDialog, RestrictedDialog } from './dialogs';
import { docStatusTone } from './helpers';

type Filter = 'all' | 'parent' | 'sub';

function OrgNode({ entity, onOpen }: { entity: CorporateEntity; onOpen: (e: CorporateEntity) => void }) {
  const ws = useWorkspace();
  const allowed = ws.canAccess(entity.id);
  const active = entity.id === ws.activeEntityId;
  const open = ws.findings.filter((f) => f.entityId === entity.id && isUnresolved(ws.reviewOf(f.id).status)).length;
  return (
    <button
      type="button"
      onClick={() => onOpen(entity)}
      className={cn(
        'relative w-[220px] text-left rounded-xl border bg-surface px-3.5 py-3 shadow-xs transition cursor-pointer hover:shadow-md',
        active ? 'border-brand-400 ring-4 ring-brand-500/10' : 'border-line hover:border-line-strong',
      )}
    >
      {entity.parentCompanyId && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 px-1.5 rounded-md bg-ink text-white text-[11px] font-medium num flex items-center">
          {entity.ownershipByParent}%
        </span>
      )}
      <div className="flex items-start gap-2.5">
        <span className="text-xl leading-none mt-0.5">{entity.flag}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-ink leading-snug line-clamp-2">{entity.legalName}</div>
          <div className="text-xs text-ink-3 mt-0.5 truncate">{entity.taxAuthority.split('(')[0].split('—')[0].trim()}</div>
        </div>
        {!allowed && <Lock className="size-3.5 text-ink-4 shrink-0" />}
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <Badge tone={entity.status === 'ACTIVE' ? 'success' : 'warning'} dot>
          {entity.status === 'ACTIVE' ? 'Aktif' : 'Draf'}
        </Badge>
        {open > 0 && <Badge tone="danger">{open} temuan</Badge>}
      </div>
    </button>
  );
}

function OrgTree({ parentId, onOpen }: { parentId: string | null; onOpen: (e: CorporateEntity) => void }) {
  const ws = useWorkspace();
  const ids = new Set(ws.entities.map((e) => e.id));
  const children = ws.entities.filter((e) => (parentId === null ? !e.parentCompanyId || !ids.has(e.parentCompanyId) : e.parentCompanyId === parentId));
  if (!children.length) return null;
  return (
    <ul>
      {children.map((c) => (
        <li key={c.id}>
          <OrgNode entity={c} onOpen={onOpen} />
          <OrgTree parentId={c.id} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

export function EntitiesPage() {
  const ws = useWorkspace();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [consolidation, setConsolidation] = useState(false);
  const [restricted, setRestricted] = useState<CorporateEntity | null>(null);

  const open = (e: CorporateEntity) => {
    if (!ws.selectEntity(e.id)) {
      setRestricted(e);
      return;
    }
    router.push(`/entities/${e.id}`);
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ws.entities.filter((e) => {
      const role = filter === 'all' || (filter === 'parent' ? !e.parentCompanyId : Boolean(e.parentCompanyId));
      const match = !term || `${e.legalName} ${e.tradeName} ${e.taxId} ${e.jurisdictionName}`.toLowerCase().includes(term);
      return role && match;
    });
  }, [ws.entities, filter, q]);

  const countries = new Set(ws.entities.map((e) => e.countryCode)).size;

  return (
    <div>
      <PageHeader
        eyebrow={<span>Langkah 1 · Siklus kepatuhan</span>}
        title="Entitas & struktur grup"
        description={`${ws.entities.length} entitas di ${countries} yurisdiksi. Struktur ini menjadi dasar konsolidasi, transfer pricing, dan hak akses.`}
        actions={
          <>
            <Button icon={<Globe2 />} onClick={() => setConsolidation(true)}>
              Konsolidasi grup
            </Button>
            <Button variant="primary" icon={<Plus />} onClick={() => setAdding(true)} disabled={!ws.isParentExec} title={ws.isParentExec ? undefined : 'Hanya eksekutif induk yang dapat menambah entitas'}>
              Tambah entitas
            </Button>
          </>
        }
      />

      <Card className="mb-6">
        <CardHeader title="Struktur kepemilikan" description="Klik entitas untuk membuka profil, dokumen legal, dan pemegang sahamnya." />
        <CardBody className="overflow-x-auto">
          <div className="org min-w-fit py-3 px-2 mx-auto w-max">
            <OrgTree parentId={null} onOpen={open} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            items={[
              { id: 'all', label: 'Semua', count: ws.entities.length },
              { id: 'parent', label: 'Induk', count: ws.entities.filter((e) => !e.parentCompanyId).length },
              { id: 'sub', label: 'Anak usaha', count: ws.entities.filter((e) => e.parentCompanyId).length },
            ]}
          />
          <div className="w-full sm:w-72">
            <Input leading={<Search />} placeholder="Cari nama, NPWP, negara…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari entitas" />
          </div>
        </div>
        <Table>
          <THead>
            <tr>
              <TH>Entitas</TH>
              <TH>Identitas pajak</TH>
              <TH>Peran</TH>
              <TH>Dokumen legal</TH>
              <TH align="right">Skor kepatuhan</TH>
              <TH />
            </tr>
          </THead>
          <tbody>
            {rows.map((e) => {
              const allowed = ws.canAccess(e.id);
              const verified = e.documents.filter((d) => docStatusTone(d.status) === 'success').length;
              const score = entityRiskScore(ws.findings.filter((f) => f.entityId === e.id), ws.compliance.reviews);
              return (
                <TR key={e.id} onClick={() => open(e)} selected={e.id === ws.activeEntityId}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <span className="text-xl leading-none">{e.flag}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-ink font-medium">{e.legalName}</span>
                          {!allowed && <Lock className="size-3.5 text-ink-4" />}
                        </div>
                        <div className="text-xs text-ink-3">{e.jurisdictionName} · {e.taxAuthority.split('(')[0].split('—')[0].trim()}</div>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <div className="font-mono text-ink-2">{e.taxId.split('(')[0].trim()}</div>
                    <div className="text-xs text-ink-4 font-mono truncate max-w-[220px]">{e.registrationNumber}</div>
                  </TD>
                  <TD>
                    <div className="text-ink">{e.parentCompanyId ? `Anak usaha · ${e.ownershipByParent}%` : 'Induk grup (UPE)'}</div>
                    <div className="text-xs text-ink-3 truncate max-w-[240px]">{e.parentCompanyId ? e.parentCompanyName : e.tradeName}</div>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {e.documents.map((d) => (
                          <span key={d.id} title={`${d.label} — ${d.status}`} className={cn('h-4 w-1.5 rounded-full', docStatusTone(d.status) === 'success' ? 'bg-success-500' : docStatusTone(d.status) === 'danger' ? 'bg-danger-500' : 'bg-warning-500')} />
                        ))}
                      </div>
                      <span className="text-xs text-ink-3 num">{verified}/{e.documents.length}</span>
                    </div>
                  </TD>
                  <TD align="right">
                    <span className={cn('font-medium', score >= 80 ? 'text-success-700' : score >= 55 ? 'text-warning-700' : 'text-danger-700')}>{score}</span>
                    <span className="text-ink-4"> / 100</span>
                  </TD>
                  <TD align="right">
                    <ChevronRight className="size-4 text-ink-4 inline" />
                  </TD>
                </TR>
              );
            })}
            {rows.length === 0 && (
              <TR>
                <TD colSpan={6} className="py-10 text-center text-ink-3">Tidak ada entitas yang cocok.</TD>
              </TR>
            )}
          </tbody>
        </Table>
      </Card>

      <CycleFooter current="/entities" />

      <AddEntityDialog open={adding} onClose={() => setAdding(false)} onCreated={(e) => router.push(`/entities/${e.id}`)} />
      <ConsolidationDialog open={consolidation} onClose={() => setConsolidation(false)} />
      <RestrictedDialog entity={restricted} onClose={() => setRestricted(null)} />
    </div>
  );
}
