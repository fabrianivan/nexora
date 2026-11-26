'use client';

import React, { useState } from 'react';
import { HelpCircle, RotateCw, Sparkles, Wrench } from 'lucide-react';
import type { RiskFinding } from '@/lib/compliance';
import { RECOMMENDATION_LABEL, type Investigation } from '@/lib/investigation';
import { dateTime } from '@/lib/format';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { EngineTag } from '@/shell/EngineTag';
import { Button, Callout, EmptyState, cn } from '@/ui';

const SIGNAL_DOT = { risk: 'bg-danger-500', clear: 'bg-success-500', info: 'bg-ink-4' } as const;
const SIGNAL_LABEL = { risk: 'sinyal risiko', clear: 'tidak ada masalah', info: 'informasi' } as const;

/**
 * The investigation agent: it calls deterministic tools over workspace data and
 * writes a brief whose every line cites the steps it relies on.
 */
export function InvestigationPanel({ finding }: { finding: RiskFinding }) {
  const ws = useWorkspace();
  const ui = useUi();
  const [running, setRunning] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const inv = ws.compliance.investigations?.[finding.id];
  const entityName = ws.entityById(finding.entityId)?.legalName ?? finding.entityId;

  async function run() {
    if (running) return;
    setRunning(true);
    try {
      const documents = ws.compliance.documents.filter((d) => ws.canAccess(d.doc.entityId));
      const res = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finding, documents, entityName }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const result = (await res.json()) as Investigation;
      ws.updateCompliance((s) => ({ ...s, investigations: { ...(s.investigations ?? {}), [finding.id]: result } }));
      ws.logAudit(
        'AI_INVESTIGATION',
        `${finding.ruleName} · ${entityName}`,
        `${result.steps.length} langkah, saran: ${RECOMMENDATION_LABEL[result.recommendation]} (${result.engine.label}${result.engine.model ? ` · ${result.engine.model}` : ''})`,
      );
      ui.toast('Investigasi selesai. Tinjau ringkasan dan langkahnya.', 'success');
    } catch {
      ui.toast('Investigasi gagal dijalankan. Coba lagi.', 'danger');
    } finally {
      setRunning(false);
    }
  }

  if (!inv) {
    return (
      <EmptyState
        icon={<Sparkles />}
        title="Belum ada investigasi"
        description="Agen memeriksa master vendor, histori, hitungan pajak, bukti pendukung, dan keyakinan ekstraksi, lalu menulis ringkasan yang menyebut langkah sumbernya. Hasilnya saran untuk maker, bukan keputusan."
        action={<Button variant="primary" icon={<Sparkles />} loading={running} onClick={() => void run()}>Jalankan investigasi</Button>}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
          <EngineTag engine={inv.engine} />
          <span>{dateTime(inv.at)}</span>
          {inv.engine.notice && <span className="text-ink-4">· {inv.engine.notice}</span>}
        </div>
        <Button size="sm" variant="ghost" icon={<RotateCw />} loading={running} onClick={() => void run()}>Jalankan ulang</Button>
      </div>

      <Callout
        tone={inv.recommendation === 'confirm' ? 'warning' : inv.recommendation === 'dismiss' ? 'success' : 'neutral'}
        icon={<Sparkles />}
        title={`Saran: ${RECOMMENDATION_LABEL[inv.recommendation]}`}
      >
        AI tidak memutuskan. Maker menilai bukti dan checker induk menyetujui.
      </Callout>

      <section>
        <h3 className="font-serif text-[18px] text-ink mb-2">Ringkasan kasus</h3>
        <ul className="space-y-2">
          {inv.brief.map((line, i) => (
            <li key={i} className="text-[13px] text-ink-2 leading-relaxed">
              {line.text}{' '}
              {line.steps.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setHighlight((cur) => (cur === n ? null : n))}
                  onMouseEnter={() => setHighlight(n)}
                  onMouseLeave={() => setHighlight(null)}
                  onFocus={() => setHighlight(n)}
                  onBlur={() => setHighlight(null)}
                  aria-label={`Langkah ${n}`}
                  className={cn(
                    'mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-medium ring-1 align-text-top cursor-pointer transition-colors',
                    highlight === n ? 'bg-brand-100 text-brand-900 ring-brand-400' : 'bg-muted text-ink-2 ring-line',
                  )}
                >
                  {n}
                </button>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-serif text-[18px] text-ink mb-2">Langkah yang dijalankan</h3>
        <ol className="rounded-lg border border-line divide-y divide-line">
          {inv.steps.map((s) => (
            <li key={s.n} className={cn('flex items-start gap-3 px-3.5 py-2.5 transition-colors', highlight === s.n && 'bg-brand-50/60')}>
              <span className="num text-xs text-ink-4 w-4 shrink-0 pt-0.5">{s.n}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                  <Wrench className="size-3.5 text-ink-4" aria-hidden />
                  {s.title}
                  <span className={cn('size-1.5 rounded-full', SIGNAL_DOT[s.signal])} title={SIGNAL_LABEL[s.signal]} />
                </span>
                <span className="block text-xs text-ink-2 mt-0.5 break-words">{s.summary}</span>
                <span className="block text-[11px] text-ink-4 font-mono mt-0.5 truncate">{s.tool}({Object.entries(s.args).map(([k, v]) => `${k}: ${v}`).join(', ')})</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {inv.openQuestions.length > 0 && (
        <section>
          <h3 className="font-serif text-[18px] text-ink mb-2">Pertanyaan terbuka untuk maker</h3>
          <ul className="space-y-1.5">
            {inv.openQuestions.map((q) => (
              <li key={q} className="flex items-start gap-2 text-[13px] text-ink-2">
                <HelpCircle className="size-3.5 mt-0.5 text-ink-4 shrink-0" />
                {q}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
