import { TAX_CONFIG } from './tax';
import type { CountryCode, ReconciliationLine } from './domain';

export interface ReconciliationSummary {
  commercialProfit: number;
  positiveCorrections: number;
  negativeCorrections: number;
  taxableIncome: number;
  taxDue: number;
}

export interface WhatIfReconciliationOptions {
  revenueMultiplierPct?: number; // default 100
  applyArticle31ERelief?: boolean; // Indonesia SME 50% discount on portion up to 4.8B
  includeUnverifiedAdjustments?: boolean; // default true
  additionalPositiveAdjustment?: number;
  additionalNegativeAdjustment?: number;
}

export function calculateReconciliation(
  lines: ReconciliationLine[],
  country: CountryCode
): ReconciliationSummary {
  const commercialProfit = lines.reduce(
    (sum, line) => sum + line.commercialAmount,
    0
  );
  const positiveCorrections = lines.reduce(
    (sum, line) => sum + line.positiveCorrection,
    0
  );
  const negativeCorrections = lines.reduce(
    (sum, line) => sum + line.negativeCorrection,
    0
  );
  const taxableIncome = Math.max(
    0,
    commercialProfit + positiveCorrections - negativeCorrections
  );
  const taxDue = taxableIncome * TAX_CONFIG[country].corporateRate;
  return {
    commercialProfit,
    positiveCorrections,
    negativeCorrections,
    taxableIncome,
    taxDue,
  };
}

export function simulateWhatIfReconciliation(
  lines: ReconciliationLine[],
  country: CountryCode,
  options: WhatIfReconciliationOptions = {}
) {
  const multiplier = (options.revenueMultiplierPct ?? 100) / 100;
  const includeUnverified = options.includeUnverifiedAdjustments ?? true;

  const filteredLines = includeUnverified
    ? lines
    : lines.filter((l) => l.verificationStatus === 'VERIFIED');

  const baseCommercial = lines.reduce((sum, l) => sum + l.commercialAmount, 0);
  const commercialProfit = Math.round(baseCommercial * multiplier);

  const positiveCorrections =
    filteredLines.reduce((sum, l) => sum + l.positiveCorrection, 0) +
    (options.additionalPositiveAdjustment ?? 0);
  const negativeCorrections =
    filteredLines.reduce((sum, l) => sum + l.negativeCorrection, 0) +
    (options.additionalNegativeAdjustment ?? 0);

  const taxableIncome = Math.max(
    0,
    commercialProfit + positiveCorrections - negativeCorrections
  );

  const statutoryRate = TAX_CONFIG[country].corporateRate;
  const baselineTaxDue = Math.round(taxableIncome * statutoryRate);

  let effectiveTaxDue = baselineTaxDue;
  let effectiveRate = statutoryRate;
  let reliefNote = 'Tarif korporasi standar tanpa fasilitas khusus';

  if (country === 'ID' && options.applyArticle31ERelief) {
    // Pasal 31E UU PPh simulation (50% discount on portion of taxable income for revenue <= 4.8B)
    effectiveRate = statutoryRate * 0.5;
    effectiveTaxDue = Math.round(taxableIncome * effectiveRate);
    reliefNote =
      'Simulasi Fasilitas Pasal 31E UU PPh (pengurangan tarif 50% -> efektif 11%, perlu verifikasi syarat peredaran bruto)';
  }

  return {
    commercialProfit,
    positiveCorrections,
    negativeCorrections,
    taxableIncome,
    statutoryRate,
    effectiveRate,
    taxDue: effectiveTaxDue,
    baselineTaxDue,
    taxDeltaFromWhatIf: effectiveTaxDue - baselineTaxDue,
    reliefNote,
    verifiedCount: lines.filter((l) => l.verificationStatus === 'VERIFIED').length,
    unverifiedCount: lines.filter((l) => l.verificationStatus !== 'VERIFIED').length,
  };
}
