import { CountryAdapter, TaxIdValidationResult, CorporateTaxCalculationParams, CorporateTaxCalculationResult, DeadlineItem, ReturnDraftParams } from './types';
import usRules from '@/config/taxRules.us.json';

export const usAdapter: CountryAdapter = {
  code: 'US',
  countryCode: 'US',
  name: 'United States',
  authority: usRules.taxAuthority,
  currency: usRules.currency,
  currencySymbol: usRules.currencySymbol,
  taxIdLabel: 'EIN (Employer Identification Number)',
  taxIdFormat: /^\d{2}-?\d{7}$/,
  status: 'preview',
  isSupported: true,

  validateTaxId(taxId: string): TaxIdValidationResult {
    const cleaned = taxId.trim();
    if (!cleaned) return { valid: false, formatted: taxId, reason: 'EIN cannot be blank' };
    const isValid = this.taxIdFormat.test(cleaned);
    const digitsOnly = cleaned.replace(/\D/g, '');
    const formatted = digitsOnly.length === 9 ? `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2)}` : cleaned;
    return {
      valid: isValid && digitsOnly.length === 9,
      formatted,
      reason: isValid ? undefined : 'Invalid US EIN format (must be 9 digits, e.g. 12-3456789)',
    };
  },

  calculateCorporateTax(params: CorporateTaxCalculationParams): CorporateTaxCalculationResult {
    const { taxableIncome } = params;
    const rate = 0.21;
    const taxDue = Math.round(taxableIncome * rate);
    const effectiveRate = taxableIncome > 0 ? rate : 0;

    return {
      taxableIncome,
      taxDue,
      effectiveRate,
      breakdown: {
        'Federal Taxable Income': taxableIncome,
        'Federal Corporate Tax @ 21%': taxDue,
      },
      explanation: 'US Federal Corporate Income Tax: Flat 21% under Internal Revenue Code Section 11.',
    };
  },

  getDeadlines(year = 2026): DeadlineItem[] {
    return [
      {
        id: 'us-form-1120',
        key: 'us-form-1120',
        label: 'U.S. Corporation Income Tax Return (Form 1120)',
        dueDate: `${year}-04-15`,
        obligationType: 'Federal CIT',
        status: 'pending',
        daysLeft: 76,
        finePenalty: 'IRC Section 6651 late filing penalty (5% per month up to 25%)',
      },
    ];
  },

  generateReturnDraft(params: ReturnDraftParams) {
    return {
      id: `draft_us_${params.entity.id}_${params.fiscalYear}`,
      formType: 'Form 1120',
      status: 'draft',
      fiscalYear: params.fiscalYear,
      entity: params.entity,
      induk: {
        netIncome: params.taxableIncome,
        taxPayable: params.taxDue,
        tariffs: '21% (IRC Section 11 Flat Rate)',
      },
      adjustments: params.adjustments || [],
      makerChecker: {
        draftedBy: params.creator,
        approvedBy: null,
        status: 'Draft',
      },
    };
  },

  documentTypes: [
    { type: 'deed', label: 'Certificate of Incorporation & Bylaws', required: true, acceptedMimeTypes: ['application/pdf'] },
    { type: 'financial_statement', label: 'US GAAP Audited Financial Statements', required: true, acceptedMimeTypes: ['application/pdf'] },
    { type: 'e_invoice', label: 'Commercial Invoice / W-9 Forms', required: false, acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
  ],

  riskRules: [
    {
      id: 'US_BEAT_SECTION_59A',
      name: 'Base Erosion and Anti-Abuse Tax (BEAT) Risk',
      category: 'beps',
      severity: 'high',
      description: 'Deductible payments to foreign related parties exceed 3% base erosion percentage.',
      regulationBasis: 'IRC Section 59A Base Erosion Minimum Tax Amount',
    },
    {
      id: 'US_ECONOMIC_SUBSTANCE',
      name: 'Economic Substance Doctrine Violation',
      category: 'compliance',
      severity: 'critical',
      description: 'Transaction lacks meaningful economic substance apart from federal tax benefits.',
      regulationBasis: 'IRC Section 7701(o)',
    },
  ],

  fiscalAdjustmentRules: [
    {
      id: 'US_ADJ_SECTION_162_MEALS',
      description: '50% Disallowance of Business Meals and 100% Entertainment Disallowance',
      type: 'positive',
      regulationBasis: 'IRC Section 274(a) & 274(n)',
      verified: true,
    },
  ],

  deadlineRules: [
    {
      key: 'US_FORM_1120',
      label: 'U.S. Corporation Income Tax Return (Form 1120)',
      obligationType: 'Federal Corporate Income Tax',
      deadlineRule: '15th day of 4th month following close of tax year (April 15)',
      regulation: 'IRC Section 6072(b)',
      defaultDueDay: 15,
    },
  ],

  paymentCodeGenerators: [
    {
      taxType: 'Federal Tax Deposit (EFTPS Form 1120)',
      generateCode(entityTaxId, period) {
        return `EFTPS-${entityTaxId.replace(/\D/g, '')}-${period.slice(0, 4)}`;
      },
      formatInstructions: 'Pay via Electronic Federal Tax Payment System (EFTPS).',
    },
  ],

  standardCITRate: 0.21,
  standardVATRate: 0.0,
};
