/**
 * Rupiah trail: what a finding's fiscal correction does to the return, computed
 * with the same CIT engine as the Calculation page (facilities and credits included).
 */
import type { CountryCode } from '@/data/multiCountryTaxData';
import type { CalculationState } from '@/state/types';
import { computeCit, type CitResult } from './cit';
import { applyCorrectionToItems, isCorrectionReflected, type RiskFinding } from './compliance';

export interface TrailPoint {
  taxableIncome: number;
  taxDue: number;
  payable: number;
  overpaid: number;
}

export interface RupiahTrail {
  accountCode: string;
  accountName: string;
  amount: number;
  /** True when the reconciliation already carries this correction. */
  reflected: boolean;
  facilityApplied: boolean;
  before: TrailPoint;
  after: TrailPoint;
  /** after − before on tax due; the honest impact, unlike a flat statutory-rate estimate. */
  taxDelta: number;
  /** Statutory-rate estimate shown elsewhere, kept to explain any gap. */
  flatEstimate: number;
}

const point = (r: CitResult): TrailPoint => ({ taxableIncome: r.taxableIncome, taxDue: r.taxDue, payable: r.payable, overpaid: r.overpaid });

export function rupiahTrail(finding: RiskFinding, calc: CalculationState, country: CountryCode): RupiahTrail | null {
  const correction = finding.correction;
  if (!correction) return null;
  if (!calc.items.some((i) => i.accountCode === correction.accountCode)) return null;
  const credits = calc.credits ?? [];
  const marker = `[${finding.id}]`;
  const reflected = isCorrectionReflected(calc.items, correction, marker);

  let withoutItems = calc.items;
  let withItems = calc.items;
  if (reflected) {
    // Back the correction out to show where the return stood before it.
    withoutItems = calc.items.map((i) => {
      if (i.accountCode !== correction.accountCode) return i;
      const positiveCorrection = Math.max(0, i.positiveCorrection - correction.amount);
      const isRevenue = i.accountCode.startsWith('4') || i.accountCode.startsWith('7');
      const fiscalAmount = isRevenue
        ? i.commercialAmount + positiveCorrection - i.negativeCorrection
        : i.commercialAmount - positiveCorrection + i.negativeCorrection;
      return { ...i, positiveCorrection, fiscalAmount };
    });
  } else {
    withItems = applyCorrectionToItems(calc.items, correction, marker, finding.ruleName).items;
  }

  const before = computeCit(withoutItems, country, calc.apply31EFacility, credits);
  const after = computeCit(withItems, country, calc.apply31EFacility, credits);
  return {
    accountCode: correction.accountCode,
    accountName: correction.accountName,
    amount: correction.amount,
    reflected,
    facilityApplied: after.facilityApplied,
    before: point(before),
    after: point(after),
    taxDelta: after.taxDue - before.taxDue,
    flatEstimate: finding.taxImpact,
  };
}
