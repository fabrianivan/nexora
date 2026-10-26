import { CountryAdapter, TaxIdValidationResult, CorporateTaxCalculationParams, CorporateTaxCalculationResult, DeadlineItem, ReturnDraftParams } from './types';
import myRules from '@/config/taxRules.my.json';

export const myAdapter: CountryAdapter = {
  code: 'MY',
  countryCode: 'MY',
  name: 'Malaysia',
  authority: myRules.taxAuthority,
  currency: myRules.currency,
  currencySymbol: myRules.currencySymbol,
  taxIdLabel: 'TIN / Company Registration No.',
  taxIdFormat: /^(?:[A-Z]{1,2}\d{8,12}|\d{12})$/i,
  status: 'preview',
  isSupported: true,

  validateTaxId(taxId: string): TaxIdValidationResult {
    const cleaned = taxId.trim().toUpperCase();
    if (!cleaned) return { valid: false, formatted: taxId, reason: 'TIN cannot be blank' };
    const isValid = this.taxIdFormat.test(cleaned);
    return {
      valid: isValid,
      formatted: cleaned,
      reason: isValid ? undefined : 'Invalid Malaysia Tax Identification Number (e.g. C12345678901 or 12-digit SSM No)',
    };
  },

  calculateCorporateTax(params: CorporateTaxCalculationParams): CorporateTaxCalculationResult {
    const { taxableIncome, isSme = false } = params;
    let taxDue = 0;
    const breakdown: Record<string, number> = {};

    if (isSme) {
      // SME preferential tier:
      // First RM 150,000 @ 15%
      const tier1 = Math.min(taxableIncome, 150_000);
      const tax1 = tier1 * 0.15;
      breakdown['First RM 150,000 @ 15%'] = tax1;

      // Next RM 450,000 @ 17%
      const tier2 = Math.max(0, Math.min(taxableIncome - 150_000, 450_000));
      const tax2 = tier2 * 0.17;
      if (tier2 > 0) breakdown['Next RM 450,000 @ 17%'] = tax2;

      // Balance @ 24%
      const tier3 = Math.max(0, taxableIncome - 600_000);
      const tax3 = tier3 * 0.24;
      if (tier3 > 0) breakdown['Balance exceeding RM 600,000 @ 24%'] = tax3;

      taxDue = Math.round(tax1 + tax2 + tax3);
    } else {
      taxDue = Math.round(taxableIncome * 0.24);
      breakdown['Standard Non-SME Rate @ 24%'] = taxDue;
    }

    const effectiveRate = taxableIncome > 0 ? Number((taxDue / taxableIncome).toFixed(4)) : 0;
    return {
      taxableIncome,
      taxDue,
      effectiveRate,
      breakdown,
      explanation: isSme 
        ? 'Malaysia SME Corporate Income Tax: Tiered 15% on first RM150k, 17% on next RM450k, and 24% on remaining balance.'
        : 'Malaysia Standard Corporate Income Tax: Flat 24% rate for non-SME entities.',
    };
  },

  getDeadlines(year = 2026): DeadlineItem[] {
    return [
      {
        id: 'my-form-c',
        key: 'my-form-c',
        label: 'Corporate Tax Return (Form C)',
        dueDate: `${year}-07-31`,
        obligationType: 'Form C Filing',
        status: 'pending',
        daysLeft: 180,
        finePenalty: 'Penalty under Section 112(1) Income Tax Act 1967',
      },
    ];
  },

  generateReturnDraft(params: ReturnDraftParams) {
    return {
      id: `draft_my_${params.entity.id}_${params.fiscalYear}`,
      formType: 'Form C',
      status: 'draft',
      fiscalYear: params.fiscalYear,
      entity: params.entity,
      induk: {
        netIncome: params.taxableIncome,
        taxPayable: params.taxDue,
        tariffs: '24% (Headline Non-SME Rate)',
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
    { type: 'deed', label: 'SSM Form 9 / Certificate of Incorporation', required: true, acceptedMimeTypes: ['application/pdf'] },
    { type: 'financial_statement', label: 'Audited Financial Statements (MPERS/MFRS)', required: true, acceptedMimeTypes: ['application/pdf'] },
    { type: 'e_invoice', label: 'MyInvois E-Invoice (LHDN Validated)', required: false, acceptedMimeTypes: ['application/pdf', 'application/json'] },
  ],

  riskRules: [
    {
      id: 'MY_MYINVOIS_UUID_01',
      name: 'Unverified MyInvois Validation UUID',
      category: 'compliance',
      severity: 'high',
      description: 'E-Invoice lacks valid cryptographic QR or validation UUID from LHDN MyInvois portal.',
      regulationBasis: 'LHDN E-Invoice Guidelines v3.0 Section 3',
    },
    {
      id: 'MY_WHT_SECTION_109_02',
      name: 'Withholding Tax Omission on Foreign Technical Fees',
      category: 'compliance',
      severity: 'medium',
      description: 'Payments to non-resident for technical services without evidence of Section 109B withholding deduction.',
      regulationBasis: 'Income Tax Act 1967 Section 109B',
    },
  ],

  fiscalAdjustmentRules: [
    {
      id: 'MY_ADJ_SECTION_39',
      description: 'Non-Deductible Expenses under Section 39 ITA (Entertainment & Capital Expenditure)',
      type: 'positive',
      regulationBasis: 'Income Tax Act 1967 Section 39',
      verified: true,
    },
  ],

  deadlineRules: [
    {
      key: 'MY_FORM_C',
      label: 'Corporate Tax Return (Form C)',
      obligationType: 'Form C Filing',
      deadlineRule: '7 months following the financial year end',
      regulation: 'Income Tax Act 1967 Section 77A',
      defaultDueDay: 30,
    },
  ],

  paymentCodeGenerators: [
    {
      taxType: 'Corporate Income Tax (CP204 / Form C)',
      generateCode(entityTaxId, period) {
        return `LHDN-BILL-${entityTaxId.slice(0, 8)}-${period.slice(0, 4)}`;
      },
      formatInstructions: 'Use FPX payment reference via ByrHASiL portal.',
    },
  ],

  standardCITRate: 0.24,
  standardVATRate: 0.08,
};
