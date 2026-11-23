'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDown, Building2, Check, FileCheck2, HelpCircle, Plus, ShieldCheck, UserCheck, UserRound } from 'lucide-react';
import type { CorporateEntity } from '@/data/entities';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import {
  computeOwnershipChain,
  computeSignatoryPlan,
  initialsFromName,
  type OwnershipChainNode,
} from '@/lib/ownershipChain';
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  MetricBand,
  SelectField,
  Table,
  TD,
  TH,
  THead,
  TR,
  TextField,
  cn,
} from '@/ui';
import { ShareholderFlowModal } from './ShareholderFlowModal';

function ChainBox({
  node,
  onTrace,
}: {
  node: OwnershipChainNode;
  onTrace?: (companyId: string, companyName: string, ratio: number) => void;
}) {
  if (node.kind === 'untraced') {
    return (
      <div className="rounded-lg border border-dashed border-danger-500/70 bg-danger-50/70 px-3.5 py-2.5 text-left min-w-[175px]">
        <div className="flex items-center justify-between gap-2">
          <Badge tone="danger" dot>Belum tertelusur</Badge>
          <span className="text-xs font-semibold text-danger-700 num">{node.effectivePercent}%</span>
        </div>
        <div className="mt-1.5 text-[13px] font-medium text-danger-700">{node.name}</div>
        {onTrace && (
          <button
            type="button"
            onClick={() => onTrace(node.profileId, node.name, node.effectivePercent / node.directPercent)}
            className="mt-1.5 text-[11.5px] font-semibold text-brand-700 hover:underline cursor-pointer"
          >
            + Tambah pemilik
          </button>
        )}
      </div>
    );
  }

  if (node.kind === 'individual') {
    return (
      <div
        className={cn(
          'rounded-lg border px-3.5 py-2.5 text-left min-w-[185px]',
          node.isUbo ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-[11px] font-medium inline-flex items-center gap-1', node.isUbo ? 'text-white/75' : 'text-ink-3')}>
            <UserRound className="size-3" />
            {node.isUbo ? 'UBO' : 'Perorangan'}
          </span>
          <span className={cn('text-xs font-semibold num', node.isUbo ? 'text-mark' : 'text-ink')}>
            {node.directPercent}% · eff {node.effectivePercent}%
          </span>
        </div>
        <div className="mt-1 text-[13px] font-medium leading-snug">{node.name}</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-left min-w-[185px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-ink-3 inline-flex items-center gap-1">
          <Building2 className="size-3" />
          {node.kind === 'corporate' ? 'Korporasi langsung' : 'Perantara'}
        </span>
        <span className="text-xs font-semibold text-ink num">{node.directPercent}%</span>
      </div>
      <div className="mt-1 text-[13px] font-medium text-ink leading-snug">{node.name}</div>
      {node.untracedChildrenPercent ? (
        <div className="mt-1 text-[11px] text-danger-600">{node.untracedChildrenPercent}% belum tercatat</div>
      ) : null}
    </div>
  );
}

export function OwnershipChainTab({
  entity,
  onGoSignatories,
}: {
  entity: CorporateEntity;
  onGoSignatories: () => void;
}) {
  const ws = useWorkspace();
  const ui = useUi();

  const chain = useMemo(() => computeOwnershipChain(ws.ownership, entity), [ws.ownership, entity]);
  const signPlan = useMemo(() => computeSignatoryPlan(ws.ownership, entity, chain), [ws.ownership, entity, chain]);
  const config = ws.ownership.companies[entity.id];

  const [traceTarget, setTraceTarget] = useState<{ companyId: string; companyName: string; ratio: number } | null>(null);
  const [controllerModal, setControllerModal] = useState(false);
  const [controllerId, setControllerId] = useState(config?.otherControllerId ?? '');
  const [controllerNote, setControllerNote] = useState(config?.controllerNote ?? '');

  // Group nodes by depth (highest depth on top, target depth=0 at bottom like Figma 07)
  const maxDepth = Math.max(0, ...chain.nodes.map((n) => n.depth));
  const depthLevels = Array.from({ length: maxDepth }, (_, idx) => maxDepth - idx);

  const firstUntraced = chain.untracedLeaves[0];
  const individualsList = ws.ownership.profiles.filter((p) => p.kind === 'individual');

  const exportChainJson = () => {
    const blob = new Blob([JSON.stringify(chain, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rantai-kepemilikan-${entity.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    ws.logAudit('EXPORT_OWNERSHIP_CHAIN', entity.legalName, `Ekspor bagan rantai kepemilikan (${chain.tracedPercent}% tertelusur).`);
    ui.toast('Bagan rantai kepemilikan diekspor.');
  };

  return (
    <div className="space-y-6">
      <MetricBand
        label="Ringkasan rantai kepemilikan"
        metrics={[
          {
            label: 'Kepemilikan tertelusur',
            value: `${chain.tracedPercent.toFixed(1)}%`,
            detail: chain.untracedPercent > 0 ? `${chain.untracedPercent.toFixed(1)}% berakhir di perusahaan tanpa pemilik` : 'Semua jalur berakhir di perorangan',
            tone: chain.untracedPercent > 0 ? 'warning' : 'success',
            icon: <ShieldCheck />,
          },
          {
            label: 'Pemilik manfaat (UBO)',
            value: chain.uboCount,
            detail: chain.uboCount > 0 ? 'Kepemilikan efektif > 25%' : 'Tidak ada individu > 25%',
            icon: <UserCheck />,
          },
          {
            label: 'Perorangan dalam rantai',
            value: chain.individualCount,
            detail: `Di ${Math.max(1, maxDepth)} tingkat kepemilikan`,
            icon: <UserRound />,
          },
          {
            label: 'Tanda tangan dibutuhkan',
            value: signPlan.totalNeeded,
            detail: signPlan.missingCount > 0 ? `${signPlan.missingCount} belum memiliki penanda tangan` : 'Semua penanda tangan siap',
            tone: signPlan.missingCount > 0 ? 'danger' : 'success',
            icon: <FileCheck2 />,
            onClick: onGoSignatories,
          },
        ]}
      />

      {/* Top-down Ownership Chart */}
      <Card>
        <CardHeader
          title="Bagan rantai kepemilikan"
          description="Menampilkan alur kepemilikan dari pemegang saham akhir ke perusahaan target. Persentase pada kartu adalah kepemilikan langsung."
          actions={
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-3 text-[11.5px] text-ink-3 mr-2">
                <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-xs bg-ink inline-block" /> UBO (&gt;25%)</span>
                <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-xs border border-line-strong bg-surface inline-block" /> Perorangan / Korporasi</span>
                <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-xs border border-dashed border-danger-500 bg-danger-50 inline-block" /> Belum tertelusur</span>
              </div>
              <Button size="sm" onClick={exportChainJson}>Ekspor bagan</Button>
              {firstUntraced && (
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Plus />}
                  onClick={() =>
                    setTraceTarget({
                      companyId: firstUntraced.companyId,
                      companyName: firstUntraced.companyName,
                      ratio: firstUntraced.effectiveMissingPercent / firstUntraced.missingPercent,
                    })
                  }
                >
                  Telusuri {firstUntraced.companyName}
                </Button>
              )}
            </div>
          }
        />
        <CardBody className="space-y-4 overflow-x-auto">
          {chain.nodes.length <= 1 ? (
            <Callout tone="warning" title="Belum ada pemegang saham tercatat">
              Tambahkan pemegang saham di tab <strong>Pemegang saham</strong> untuk membangun bagan rantai kepemilikan.
            </Callout>
          ) : (
            <div className="min-w-[680px] rounded-lg border border-line bg-canvas/70 p-6 space-y-5">
              {depthLevels.map((depth) => {
                const levelNodes = chain.nodes.filter((n) => n.depth === depth);
                return (
                  <React.Fragment key={depth}>
                    <div className="flex flex-wrap items-stretch justify-center gap-3">
                      {levelNodes.map((n) => (
                        <ChainBox
                          key={n.id}
                          node={n}
                          onTrace={(companyId, companyName, ratio) => {
                            const leaf = chain.untracedLeaves.find((u) => u.companyId === companyId);
                            setTraceTarget({
                              companyId,
                              companyName: leaf?.companyName ?? companyName,
                              ratio: leaf ? leaf.effectiveMissingPercent / leaf.missingPercent : ratio,
                            });
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-center text-ink-4">
                      <ArrowDown className="size-4" />
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Root target company */}
              <div className="flex justify-center">
                <div className="rounded-lg bg-ink text-white px-5 py-3 text-center min-w-[260px]">
                  <div className="eyebrow !text-[9.5px] !text-white/65">Perusahaan target</div>
                  <div className="mt-0.5 text-sm font-semibold">{entity.flag} {entity.legalName}</div>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* No individual > 25% edge state (Figma 09 Decision c) */}
      {chain.individualCount > 0 && !chain.hasUboAbove25 && (
        <Callout
          tone="warning"
          icon={<HelpCircle />}
          title="Tidak ada perorangan dengan kepemilikan efektif di atas 25%"
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={() => setControllerModal(true)}>
                Catat pengendali lain
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  ws.updateOwnership((prev) => ({
                    ...prev,
                    companies: {
                      ...prev.companies,
                      [entity.id]: { ...prev.companies[entity.id], entityId: entity.id, confirmedNoController: true },
                    },
                  }));
                  ws.logAudit('CONFIRM_NO_UBO_ABOVE_25', entity.legalName, 'Dikonfirmasi tidak ada individu dengan kepemilikan efektif > 25%.');
                  ui.toast('Konfirmasi dicatat.');
                }}
              >
                Konfirmasi tidak ada
              </Button>
            </div>
          }
        >
          {config?.otherControllerId
            ? `Pengendali berdasarkan kendali lain tercatat: ${individualsList.find((i) => i.id === config.otherControllerId)?.legalName ?? config.otherControllerId}.`
            : config?.confirmedNoController
              ? 'Sudah dikonfirmasi bahwa tidak ada pemilik manfaat di atas 25% maupun pengendali lainnya.'
              : 'Jika tidak ada individu melewati ambang 25%, Nexora tidak memilih otomatis. Catat individu pengendali melalui hak suara/perjanjian atau konfirmasi tidak ada.'}
        </Callout>
      )}

      {/* Beneficial ownership summary table */}
      <Card>
        <CardHeader
          title="Kepemilikan manfaat efektif"
          description="Kepemilikan efektif mengalikan porsi di tiap jalur dan menjumlahkan seluruh jalur yang bermuara ke orang yang sama."
          actions={<Badge tone="brand">Ambang UBO: &gt; 25%</Badge>}
        />
        <Table>
          <THead>
            <tr>
              <TH>Perorangan / Jalur</TH>
              <TH>Jalur ke {entity.legalName}</TH>
              <TH align="right">Efektif</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <tbody>
            {chain.individuals.map((row) => (
              <TR key={row.profileId}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    {row.kind === 'untraced' ? (
                      <span className="size-7 rounded-full border border-dashed border-danger-500 text-danger-600 text-xs flex items-center justify-center shrink-0">?</span>
                    ) : (
                      <Avatar initials={initialsFromName(row.name)} className={row.isUbo ? 'bg-ink' : 'bg-brand-700'} size="sm" />
                    )}
                    <span className={cn('font-medium', row.kind === 'untraced' ? 'text-danger-700' : 'text-ink')}>
                      {row.name}
                    </span>
                  </div>
                </TD>
                <TD className="text-xs text-ink-3">
                  <div className="space-y-0.5">
                    {row.paths.map((p) => (
                      <div key={p}>{p}</div>
                    ))}
                  </div>
                </TD>
                <TD align="right" className="font-medium text-ink num">{row.effectivePercent.toFixed(1)}%</TD>
                <TD>
                  {row.status === 'UBO' ? (
                    <Badge tone="dark">UBO</Badge>
                  ) : row.status === 'Belum tertelusur' ? (
                    <div className="flex items-center gap-2">
                      <Badge tone="danger" dot>Belum tertelusur</Badge>
                      {row.missingParentId && (
                        <button
                          type="button"
                          onClick={() => {
                            const leaf = chain.untracedLeaves.find((u) => u.companyId === row.missingParentId);
                            setTraceTarget({
                              companyId: row.missingParentId!,
                              companyName: row.missingParentName ?? row.missingParentId!,
                              ratio: leaf ? leaf.effectiveMissingPercent / leaf.missingPercent : 1,
                            });
                          }}
                          className="text-xs font-medium text-brand-700 hover:underline cursor-pointer"
                        >
                          Telusuri
                        </button>
                      )}
                    </div>
                  ) : (
                    <Badge tone="neutral">Di bawah ambang</Badge>
                  )}
                </TD>
              </TR>
            ))}
            <TR className="bg-subtle">
              <TD className="font-semibold text-ink">Total</TD>
              <TD className="text-xs text-ink-3">Seluruh jalur kepemilikan {entity.legalName}</TD>
              <TD align="right" className="font-semibold text-ink num">
                {(chain.tracedPercent + chain.untracedPercent).toFixed(1)}%
              </TD>
              <TD>
                {chain.untracedPercent === 0 ? (
                  <Badge tone="success" dot>
                    <Check className="size-3" /> Lengkap
                  </Badge>
                ) : (
                  <Badge tone="warning" dot>{chain.untracedPercent.toFixed(1)}% belum tertelusur</Badge>
                )}
              </TD>
            </TR>
          </tbody>
        </Table>
      </Card>

      {firstUntraced && (
        <Callout
          tone="neutral"
          title={`Langkah berikutnya: Telusuri ${firstUntraced.companyName}`}
          action={
            <Button
              size="sm"
              variant="primary"
              icon={<Plus />}
              onClick={() =>
                setTraceTarget({
                  companyId: firstUntraced.companyId,
                  companyName: firstUntraced.companyName,
                  ratio: firstUntraced.effectiveMissingPercent / firstUntraced.missingPercent,
                })
              }
            >
              Tambah pemilik
            </Button>
          }
        >
          {firstUntraced.effectiveMissingPercent.toFixed(1)}% kepemilikan {entity.legalName} berakhir di perusahaan tanpa pemilik tercatat. Tambahkan siapa pemilik {firstUntraced.companyName} untuk melengkapi rantai.
        </Callout>
      )}

      {traceTarget && (
        <ShareholderFlowModal
          open
          onClose={() => setTraceTarget(null)}
          targetId={traceTarget.companyId}
          targetName={traceTarget.companyName}
          rootCompanyId={entity.id}
          rootCompanyName={entity.legalName}
          mode="trace"
          parentEffectiveRatio={traceTarget.ratio}
        />
      )}

      <Dialog
        open={controllerModal}
        onClose={() => setControllerModal(false)}
        size="sm"
        title="Catat pengendali dengan cara lain"
        description="Gunakan bila tidak ada individu di atas 25% tetapi ada pengendali berdasarkan hak suara atau perjanjian pemegang saham."
        footer={
          <>
            <Button variant="ghost" onClick={() => setControllerModal(false)}>Batal</Button>
            <Button
              variant="primary"
              disabled={!controllerId}
              onClick={() => {
                ws.updateOwnership((prev) => ({
                  ...prev,
                  companies: {
                    ...prev.companies,
                    [entity.id]: {
                      ...prev.companies[entity.id],
                      entityId: entity.id,
                      otherControllerId: controllerId,
                      controllerNote,
                    },
                  },
                }));
                ws.logAudit('RECORD_CONTROLLER', entity.legalName, `Pengendali dicatat: ${controllerId} (${controllerNote || 'kendali efektif'}).`);
                ui.toast('Pengendali dicatat.');
                setControllerModal(false);
              }}
            >
              Simpan pengendali
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <SelectField label="Individu pengendali" value={controllerId} onChange={(e) => setControllerId(e.target.value)}>
            <option value="">Pilih profil perorangan…</option>
            {individualsList.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.legalName}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Dasar pengendalian"
            placeholder="Hak veto dewan / perjanjian pemegang saham"
            value={controllerNote}
            onChange={(e) => setControllerNote(e.target.value)}
          />
        </div>
      </Dialog>
    </div>
  );
}
