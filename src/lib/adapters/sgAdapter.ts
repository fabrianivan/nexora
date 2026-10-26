import { CountryAdapter, TaxIdValidationResult, CorporateTaxCalculationParams, CorporateTaxCalculationResult, DeadlineItem, ReturnDraftParams } from './types';
import sgRules from '@/config/taxRules.sg.json';

export const sgAdapter: CountryAdapter = {
  code: 'SG',
  countryCode: 'SG',
  name: 'Singapore',
  authority: sgRules.taxAuthority,
  currency: sgRules.currency,
  currencySymbol: sgRules.currencySymbol,
  taxIdLabel: 'UEN (Unique Entity Number)',
  taxIdFormat: /^(?:\d{8,9}[A-Z]|[STFG]\d{2}[A-Z]{2}\d{4}[A-Z]|[STFG]\d{7}[A-Z])$/i,
  status: 'preview',
  isSupported: true,

  validateTaxId(taxId: string): TaxIdValidationResult {
    const cleaned = taxId.trim().toUpperCase();
    if (!cleaned) return { valid: false, formatted: taxId, reason: 'UEN cannot be blank' };
    const isValid = this.taxIdFormat.test(cleaned);
    return {
      valid: isValid,
      formatted: cleaned,
      reason: isValid ? undefined : 'Invalid Singapore UEN format (e.g. 201812345A or T18LL1234A)',
    };
  },

  calculateCorporateTax(params: CorporateTaxCalculationParams): CorporateTaxCalculationResult {
    const { taxableIncome } = params;
    const rate = 0.17;
    let taxableAfterExemption = taxableIncome;
    let exemptionAmount = 0;

    // Partial Tax Exemption (PTE) Scheme for Companies
    // First $10k @ 75% exempt
    const tier1Income = Math.min(taxableIncome, 10_000);
    const tier1Exemption = tier1Income * 0.75;

    // Next $190k @ 50% exempt
    const tier2Income = Math.max(0, Math.min(taxableIncome - 10_000, 190_000));
    const tier2Exemption = tier2Income * 0.5;

    exemptionAmount = tier1Exemption + tier2Exemption;
    taxableAfterExemption = Math.max(0, taxableIncome - exemptionAmount);

    const taxDue = Math.round(taxableAfterExemption * rate);
    const effectiveRate = taxableIncome > 0 ? Number((taxDue / taxableIncome).toFixed(4)) : 0;

    return {
      taxableIncome,
      taxDue,
      effectiveRate,
      breakdown: {
        'Qualifying Chargeable Income': taxableIncome,
        'Partial Tax Exemption (PTE)': -exemptionAmount,
        'Net Chargeable Income': taxableAfterExemption,
        'Tax at Headline 17%': taxDue,
      },
      explanation: `Singapore Corporate Income Tax under Partial Tax Exemption (PTE): First S$10k exempt 75%, next S$190k exempt 50%. Balance taxed at headline 17%.`,
    };
  },

  getDeadlines(year = 2026): DeadlineItem[] {
    return [
      {
        id: 'sg-form-cs',
        key: 'sg-form-cs',
        label: 'Corporate Income Tax (Form C-S / Form C)',
        dueDate: `${year}-11-30`,
        obligationType: 'Corporate Income Tax',
        status: 'pending',
        daysLeft: 218,
        finePenalty: 'S$ 1,000 notice under Section 94 ITA',
      },
      {
        id: 'sg-gst-f5',
        key: 'sg-gst-f5',
        label: 'Quarterly GST Return (Form F5 Q1)',
        dueDate: `${year}-04-30`,
        obligationType: 'GST Return',
        status: 'pending',
        daysLeft: 91,
        finePenalty: '5% penalty for late payment under GST Act',
      },
    ];
  },

  generateReturnDraft(params: ReturnDraftParams) {
    return {
      id: `draft_sg_${params.entity.id}_${params.fiscalYear}`,
      formType: 'Form C-S',
      status: 'draft',
      fiscalYear: params.fiscalYear,
      entity: params.entity,
      induk: {
        netIncome: params.taxableIncome,
        taxPayable: params.taxDue,
        tariffs: '17% (Headline Rate with Partial Tax Exemption)',
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
    { type: 'deed', label: 'ACRA Business Profile / Constitution', required: true, acceptedMimeTypes: ['application/pdf'] },
    { type: 'financial_statement', label: 'Audited Financial Statements (SFRS)', required: true, acceptedMimeTypes: ['application/pdf'] },
    { type: 'e_invoice', label: 'InvoiceNow Peppol e-Invoice', required: false, acceptedMimeTypes: ['application/pdf', 'application/xml'] },
  ],

  riskRules: [
    {
      id: 'SG_FRAUD_MTIC_01',
      name: 'Missing Trader Intra-Community (MTIC) GST Risk',
      category: 'fraud',
      severity: 'critical',
      description: 'Indicator of carousel GST evasion via rapid high-value cross-border supplies.',
      regulationBasis: 'Singapore GST Act Section 20A & IRAS Circular on MTIC Fraud',
    },
    {
      id: 'SG_COMP_INVOICENOW_02',
      name: 'InvoiceNow Peppol Registration Inconsistency',
      category: 'compliance',
      severity: 'medium',
      description: 'Vendor claiming GST does not match active Peppol directory registration.',
      regulationBasis: 'IRAS InvoiceNow Mandate Guideline',
    },
  ],

  fiscalAdjustmentRules: [
    {
      id: 'SG_ADJ_SECTION_15',
      description: 'Non-Deductible Private Expenses & Fines (Section 15 ITA)',
      type: 'positive',
      regulationBasis: 'Singapore Income Tax Act 1947 Section 15',
      verified: true,
    },
    {
      id: 'SG_ADJ_TAX_EXEMPTION',
      description: 'Partial Tax Exemption Scheme (First S$10k @ 75%, Next S$190k @ 50%)',
      type: 'negative',
      regulationBasis: 'IRAS Corporate Tax Exemption Scheme',
      verified: true,
    },
  ],

  deadlineRules: [
    {
      key: 'SG_FORM_C_S',
      label: 'Corporate Income Tax (Form C-S / Form C)',
      obligationType: 'Corporate Income Tax',
      deadlineRule: '30 November (Year of Assessment)',
      regulation: 'IRAS Statutory Deadline',
      defaultDueDay: 30,
    },
    {
      key: 'SG_GST_F5',
      label: 'Quarterly GST Return (Form F5)',
      obligationType: 'GST Return',
      deadlineRule: '1 month after end of quarterly prescribed accounting period',
      regulation: 'GST Act Section 23',
      defaultDueDay: 30,
    },
  ],

  paymentCodeGenerators: [
    {
      taxType: 'Corporate Income Tax Payment',
      generateCode(entityTaxId, period) {
        return `IRAS-${entityTaxId}-${period.slice(0, 4)}`;
      },
      formatInstructions: 'Pay via GIRO or PayNow Corporate with IRAS Payment Reference Number.',
    },
  ],

  standardCITRate: 0.17,
  standardVATRate: 0.09,
};
