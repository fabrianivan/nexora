'use client';

import React from 'react';
import { ArrowRight, Coins } from 'lucide-react';
import type { RiskFinding } from '@/lib/compliance';
import { rupiahTrail } from '@/lib/rupiahTrail';
import { money } from '@/lib/format';
import { FACILITY } from '@/lib/cit';
import { useWorkspace } from '@/state/workspace';

function Row({ label, before, after, country, strong }: { label: string; before: number; after: number; country: RiskFinding['country']; strong?: boolean }) {
  const delta = after - before;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 py-1.5">
      <span className="text-xs text-ink-3">{label}</span>
      <span className={strong ? 'text-[13px] font-semibold text-ink num' : 'text-[13px] text-ink num'}>
        <span className="text-ink-3">{money(before, country)}</span>
        <ArrowRight className="inline size-3 mx-1 text-ink-4" aria-label="menjadi" />
        {money(after, country)}
        {delta !== 0 && <span className={delta > 0 ? 'ml-1.5 text-danger-600' : 'ml-1.5 text-success-600'}>({delta > 0 ? '+' : '−'}{money(Math.abs(delta), country).replace(/^−/, '')})</span>}
      </span>
    </div>
  );
}

/**
 * What the correction does to the return, computed by the same CIT engine as the
 * Calculation page — facilities and credits included.
 */
export function RupiahTrailCard({ finding }: { finding: RiskFinding }) {
  const ws = useWorkspace();
  const entity = ws.entityById(finding.entityId);
  if (!entity) return null;
  const trail = rupiahTrail(finding, ws.calculationFor(finding.entityId), entity.countryCode);
  if (!trail) return null;
  const c = entity.countryCode;
  const facility = FACILITY[c];
  const gap = Math.round(trail.flatEstimate - trail.taxDelta);
  return (
    <section aria-label="Jejak Rupiah" className="rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-[19px] text-ink">
          <Coins className="size-4 text-ink-3" /> Jejak Rupiah
        </h3>
        <span className="text-xs text-ink-3">{trail.reflected ? 'Sudah masuk rekonsiliasi' : 'Jika koreksi diterapkan'}</span>
      </div>
      <p className="mt-1 text-xs text-ink-3">
        Koreksi positif <span className="text-ink font-medium num">{money(trail.amount, c)}</span> pada akun {trail.accountCode} {trail.accountName}.
      </p>
      <div className="mt-2 divide-y divide-line">
        <Row label="Penghasilan kena pajak" before={trail.before.taxableIncome} after={trail.after.taxableIncome} country={c} />
        <Row label="PPh terutang" before={trail.before.taxDue} after={trail.after.taxDue} country={c} strong />
        <Row label={trail.after.overpaid > 0 ? 'Lebih bayar' : 'Kurang bayar'} before={trail.after.overpaid > 0 ? trail.before.overpaid : trail.before.payable} after={trail.after.overpaid > 0 ? trail.after.overpaid : trail.after.payable} country={c} />
      </div>
      {trail.facilityApplied && facility && Math.abs(gap) >= 1 && (
        <p className="mt-2 text-xs text-ink-3">
          {facility.label} aktif, jadi dampaknya {money(trail.taxDelta, c)}, bukan {money(trail.flatEstimate, c)} pada tarif normal.
        </p>
      )}
    </section>
  );
}
