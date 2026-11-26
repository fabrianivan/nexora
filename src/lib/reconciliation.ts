import { TAX_CONFIG } from './tax';
import type { CountryCode, ReconciliationLine } from './domain';

export function calculateReconciliation(lines: ReconciliationLine[], country: CountryCode) {
  const commercialProfit = lines.reduce((sum, line) => sum + line.commercialAmount, 0);
  const positiveCorrections = lines.reduce((sum, line) => sum + line.positiveCorrection, 0);
  const negativeCorrections = lines.reduce((sum, line) => sum + line.negativeCorrection, 0);
  const taxableIncome = Math.max(0, commercialProfit + positiveCorrections - negativeCorrections);
  const taxDue = taxableIncome * TAX_CONFIG[country].corporateRate;
  return { commercialProfit, positiveCorrections, negativeCorrections, taxableIncome, taxDue };
}
