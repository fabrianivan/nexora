'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Check, CheckCheck, CircleSlash, RotateCcw, Scale, Sparkles, Undo2, UserCog } from 'lucide-react';
import {
  applyCorrectionToItems,
  canApprove,
  decide,
  isCorrectionReflected,
  markCorrectionApplied,
  proposeDecision,
  reopen,
  type FindingReview,
  type ReviewAction,
  type RiskFinding,
} from '@/lib/compliance';
import { RECOMMENDATION_LABEL } from '@/lib/investigation';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { money } from '@/lib/format';
import { Avatar, Badge, Button, Callout, Textarea, cn } from '@/ui';
import { ReviewBadge } from '../shared';

/** Maker proposes, an independent parent-company checker approves, then the correction flows to the return. */
export function DecisionPanel({ finding }: { finding: RiskFinding }) {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();
  const review = ws.reviewOf(finding.id);
  const investigation = ws.compliance.investigations?.[finding.id];
  const [action, setAction] = useState<ReviewAction>('confirm');
  const [note, setNote] = useState('');
  const [fromDraft, setFromDraft] = useState(false);
  const [checkerNote, setCheckerNote] = useState('');
  useEffect(() => {
    setNote('');
    setCheckerNote('');
    setAction('confirm');
    setFromDraft(false);
  }, [finding.id]);

  const write = (next: FindingReview) => ws.updateCompliance((s) => ({ ...s, reviews: { ...s.reviews, [finding.id]: next } }));
  const target = `${finding.ruleName} · ${ws.entityById(finding.entityId)?.legalName ?? finding.entityId}`;
  const approval = canApprove(review, ws.actor);
  const checker = ws.personas.find((p) => p.canViewAll && p.entityRole === 'PARENT' && p.id !== review.proposal?.byId);

  const applyDraft = () => {
    if (!investigation) return;
    setNote(investigation.draftNote);
    if (investigation.recommendation === 'dismiss') setAction('dismiss');
    if (investigation.recommendation === 'confirm') setAction('confirm');
    setFromDraft(true);
  };

  const propose = () => {
    try {
      write(proposeDecision(review, ws.actor, action, note));
      ws.logAudit('PROPOSE_FINDING', target, `${action === 'confirm' ? 'Konfirmasi' : 'Tolak'}: ${note.trim()}${fromDraft ? ' (catatan dari draf AI, ditinjau maker)' : ''}`);
      ui.toast('Usulan dikirim ke checker.');
    } catch (e) {
      ui.toast((e as Error).message, 'warning');
    }
  };

  const approve = (ok: boolean) => {
    try {
      write(decide(review, ws.actor, ok, checkerNote));
      ws.logAudit(ok ? 'APPROVE_FINDING' : 'RETURN_FINDING', target, ok ? `Disetujui: ${review.proposal?.action === 'confirm' ? 'temuan dikonfirmasi' : 'temuan ditolak (aman)'}` : `Dikembalikan ke maker. ${checkerNote}`);
      ui.toast(ok ? 'Keputusan disetujui.' : 'Usulan dikembalikan ke maker.', ok ? 'success' : 'info');
    } catch (e) {
      ui.toast((e as Error).message, 'warning');
    }
  };

  const calc = ws.calculationFor(finding.entityId);
  const reflected = finding.correction ? isCorrectionReflected(calc.items, finding.correction, `[${finding.id}]`) : false;
  const canApplyHere = Boolean(finding.correction && calc.items.some((i) => i.accountCode === finding.correction?.accountCode));

  const applyCorrection = () => {
    if (!finding.correction) return;
    if (!reflected) {
      const { items, changed } = applyCorrectionToItems(calc.items, finding.correction, `[${finding.id}]`, finding.ruleName);
      if (changed) ws.setCalculation(finding.entityId, { ...calc, items });
    }
    const detail = `Akun ${finding.correction.accountCode} · +${money(finding.correction.amount, finding.country)}${reflected ? ' (sudah tercermin)' : ''}`;
    write(markCorrectionApplied(review, ws.actor, detail));
    ws.logAudit('APPLY_FISCAL_CORRECTION', target, detail);
    ui.toast(reflected ? 'Ditandai: koreksi sudah tercermin di rekonsiliasi.' : 'Koreksi fiskal diterapkan ke rekonsiliasi.', 'success', { label: 'Buka rekonsiliasi', onClick: () => router.push('/calculation') });
  };

  return (
    <div className="rounded-lg border border-line bg-subtle p-4 space-y-3">
      {review.status === 'open' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">Usulan keputusan (maker)</h3>
            <span className="text-xs text-ink-3">sebagai {ws.persona.name.split(',')[0]}</span>
          </div>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Keputusan">
            {(
              [
                { id: 'confirm', label: 'Konfirmasi temuan', desc: finding.correction ? 'Lanjut ke koreksi fiskal' : 'Tindak lanjuti risiko', icon: <Check /> },
                { id: 'dismiss', label: 'Tolak (aman)', desc: 'Bukti cukup, bukan risiko', icon: <CircleSlash /> },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={action === o.id}
                onClick={() => setAction(o.id)}
                className={cn(
                  'text-left rounded-lg border px-3 py-2.5 bg-surface cursor-pointer transition [&_svg]:size-4',
                  action === o.id ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-line hover:border-line-strong',
                )}
              >
                <span className="flex items-center gap-2 text-[13px] font-medium text-ink">{o.icon}{o.label}</span>
                <span className="block text-xs text-ink-3 mt-0.5">{o.desc}</span>
              </button>
            ))}
          </div>
          {investigation && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-200/70 bg-brand-50/60 px-3 py-2 text-xs text-brand-900">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-brand-600" />
                Saran investigasi: <strong className="font-medium">{RECOMMENDATION_LABEL[investigation.recommendation]}</strong>
              </span>
              <Button size="xs" variant="ghost" onClick={applyDraft}>Pakai draf catatan</Button>
            </div>
          )}
          <Textarea
            aria-label="Catatan maker"
            placeholder="Alasan & bukti yang diperiksa (wajib, min. 5 karakter)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-ink-3">{fromDraft ? 'Draf dari investigasi AI. Sunting sebelum mengajukan; Anda yang bertanggung jawab.' : ''}</span>
            <Button variant="primary" icon={<ArrowLeftRight />} onClick={propose} disabled={note.trim().length < 5}>
              Ajukan ke checker
            </Button>
          </div>
        </>
      )}

      {review.status === 'proposed' && review.proposal && (
        <>
          <div className="flex items-start gap-3">
            <Avatar initials={review.proposal.by.split(' ').map((x) => x[0]).slice(0, 2).join('')} size="sm" className="bg-ink-3" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-ink">
                <span className="font-medium">{review.proposal.by}</span> mengusulkan{' '}
                <Badge tone={review.proposal.action === 'confirm' ? 'danger' : 'success'}>{review.proposal.action === 'confirm' ? 'Konfirmasi' : 'Tolak (aman)'}</Badge>
              </div>
              <p className="text-[13px] text-ink-2 mt-1">“{review.proposal.note}”</p>
            </div>
          </div>
          {approval.ok ? (
            <>
              <Textarea aria-label="Catatan checker" placeholder="Catatan checker (opsional)…" value={checkerNote} onChange={(e) => setCheckerNote(e.target.value)} rows={2} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button icon={<Undo2 />} onClick={() => approve(false)}>Kembalikan</Button>
                <Button variant="primary" icon={<CheckCheck />} onClick={() => approve(true)}>Setujui</Button>
              </div>
            </>
          ) : (
            <Callout
              tone="warning"
              icon={<UserCog />}
              title="Menunggu checker"
              action={
                checker && (
                  <Button size="sm" onClick={() => { ws.setPersonaId(checker.id); ui.toast(`Masuk sebagai ${checker.name} (checker)`, 'info'); }}>
                    Masuk sebagai {checker.name.split(',')[0].split(' ').slice(0, 2).join(' ')}
                  </Button>
                )
              }
            >
              {approval.reason}
            </Callout>
          )}
        </>
      )}

      {(review.status === 'confirmed' || review.status === 'dismissed') && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ReviewBadge status={review.status} />
              <span className="text-xs text-ink-3">oleh {review.decidedBy}</span>
            </div>
            {ws.isParentExec && (
              <Button size="xs" variant="ghost" icon={<RotateCcw />} onClick={() => { write(reopen(review, ws.actor)); ws.logAudit('REOPEN_FINDING', target, 'Temuan dibuka kembali.'); ui.toast('Temuan dibuka kembali.'); }}>
                Buka kembali
              </Button>
            )}
          </div>
          {review.status === 'confirmed' && finding.correction && (
            review.correctionApplied ? (
              <Callout tone="success" icon={<Scale />} title="Koreksi fiskal sudah diterapkan">
                Akun {finding.correction.accountCode} · {money(finding.correction.amount, finding.country)}
              </Callout>
            ) : canApplyHere ? (
              <Callout
                tone="brand"
                icon={<Scale />}
                title={reflected ? 'Koreksi sudah tercermin di rekonsiliasi' : 'Koreksi fiskal siap diterapkan'}
                action={<Button size="sm" variant="primary" onClick={applyCorrection}>{reflected ? 'Tandai selesai' : 'Terapkan'}</Button>}
              >
                Akun {finding.correction.accountCode} · +{money(finding.correction.amount, finding.country)} ke koreksi positif.
              </Callout>
            ) : (
              <Callout tone="neutral" icon={<Scale />}>Rekonsiliasi entitas ini dikelola di sistem lokal; catat koreksi secara manual.</Callout>
            )
          )}
        </>
      )}
    </div>
  );
}
