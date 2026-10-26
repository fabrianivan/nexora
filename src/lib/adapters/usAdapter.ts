import { CountryAdapter, TaxIdValidationResult } from './types';
import usRules from '@/config/taxRules.us.json';

export const usAdapter: CountryAdapter = {
  code: 'US',
  name: 'United States',
  authority: usRules.taxAuthority,
  currency: usRules.currency,
  currencySymbol: usRules.currencySymbol,
  taxIdLabel: 'EIN (Employer Identification Number)',
  taxIdFormat: /^\d{2}-?\d{7}$/,
  status: 'preview',

  validateTaxId(taxId: string): TaxIdValidationResult {
    const cleaned = taxId.trim().replace(/\s+/g, '');
    if (!cleaned) return { valid: false, formatted: taxId, reason: 'EIN cannot be blank' };
    const isValid = this.taxIdFormat.test(cleaned);
    const formatted = cleaned.length === 9 && !cleaned.includes('-')
      ? `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`
      : cleaned;
    return {
      valid: isValid,
      formatted,
      reason: isValid ? undefined : 'Invalid US EIN format (must be 9 digits, e.g. 12-3456789)',
    };
  },

  documentTypes: [
    { type: 'deed', label: 'Certificate of Incorporation & Bylaws', required: true, acceptedMimeTypes: ['application/pdf'] },
    { type: 'financial_statement', label: 'Audited US GAAP Financial Statements', required: true, acceptedMimeTypes: ['application/pdf'] },
    { type: 'previous_tax_return', label: 'Prior Year Form 1120 / Schedule M-3', required: true, acceptedMimeTypes: ['application/pdf'] },
  ],

  riskRules: [
    {
      id: 'US_TP_SECTION_482_01',
      name: 'IRC Section 482 Intercompany Transfer Pricing Exposure',
      category: 'transfer_pricing',
      severity: 'high',
      description: 'Cross-border intercompany services or intangible transfers outside arm’s-length range.',
      regulationBasis: 'Internal Revenue Code Section 482 & Treas. Reg. § 1.482',
    },
    {
      id: 'US_BEAT_SECTION_59A_02',
      name: 'Base Erosion and Anti-Abuse Tax (BEAT) Trigger Risk',
      category: 'beps',
      severity: 'medium',
      description: 'Deductible payments to foreign affiliates exceeding 3% base erosion percentage.',
      regulationBasis: 'IRC Section 59A',
    },
  ],

  fiscalAdjustmentRules: [
    {
      id: 'US_ADJ_MEALS_ENTERTAINMENT',
      description: 'Section 274 Disallowance of Entertainment and 50% Meals Limit',
      type: 'positive',
      regulationBasis: 'Internal Revenue Code Section 274(a)',
      verified: true,
    },
    {
      id: 'US_ADJ_MACRS_DEPRECIATION',
      description: 'Tax MACRS Bonus Depreciation vs Book Straight-Line Difference',
      type: 'negative',
      regulationBasis: 'IRC Section 168(k)',
      verified: true,
    },
  ],

  deadlineRules: [
    {
      key: 'US_FORM_1120',
      label: 'US Corporation Income Tax Return (Form 1120)',
      obligationType: 'Federal CIT Return',
      deadlineRule: '15th day of the 4th month following the close of the tax year (April 15)',
      regulation: 'IRC Section 6072(b)',
      defaultDueDay: 15,
    },
  ],

  paymentCodeGenerators: [
    {
      taxType: 'Federal Corporate Tax Deposit (Form 1120)',
      generateCode(entityTaxId, period) {
        return `EFTPS-${entityTaxId.replace('-', '')}-${period.slice(0, 4)}`;
      },
      formatInstructions: 'Deposit electronically via EFTPS (Electronic Federal Tax Payment System).',
    },
  ],

  standardCITRate: 0.21,
  standardVATRate: 0.0,
};
