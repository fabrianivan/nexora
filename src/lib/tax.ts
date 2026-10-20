import type { CountryCode } from './domain';

export const TAX_CONFIG: Record<CountryCode, { currency: string; corporateRate: number; indirectRate: number; domesticWht: number; treatyWht: number; returnName: string; payment: string }> = {
  ID: { currency: 'IDR', corporateRate: .22, indirectRate: .11, domesticWht: .20, treatyWht: .10, returnName: 'SPT 1771', payment: 'e-Billing' },
  SG: { currency: 'SGD', corporateRate: .17, indirectRate: .09, domesticWht: .15, treatyWht: .10, returnName: 'Form C-S / Form C', payment: 'GIRO' },
  MY: { currency: 'MYR', corporateRate: .24, indirectRate: .08, domesticWht: .10, treatyWht: .08, returnName: 'Form C', payment: 'FPX' },
  US: { currency: 'USD', corporateRate: .21, indirectRate: .0825, domesticWht: .30, treatyWht: .10, returnName: 'Form 1120', payment: 'EFTPS' },
};
export interface TaxSimulationInput { country: CountryCode; taxableIncome: number; taxableSales: number; crossBorderPayment: number; treatyEligible: boolean; consolidatedRevenueEur: number; coveredTaxes: number }
export function simulateTax(input: TaxSimulationInput) {
  const config = TAX_CONFIG[input.country];
  const corporateTax = Math.max(0, input.taxableIncome) * config.corporateRate;
  const indirectTax = Math.max(0, input.taxableSales) * config.indirectRate;
  const withholdingRate = input.treatyEligible ? config.treatyWht : config.domesticWht;
  const withholdingTax = Math.max(0, input.crossBorderPayment) * withholdingRate;
  const effectiveRate = input.taxableIncome > 0 ? input.coveredTaxes / input.taxableIncome : 0;
  const pillarTwoApplies = input.consolidatedRevenueEur >= 750_000_000;
  const pillarTwoTopUp = pillarTwoApplies ? Math.max(0, .15 - effectiveRate) * Math.max(0, input.taxableIncome) : 0;
  return { corporateTax, indirectTax, withholdingTax, withholdingRate, pillarTwoApplies, pillarTwoTopUp, total: corporateTax + indirectTax + withholdingTax + pillarTwoTopUp };
}
