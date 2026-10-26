import { CountryAdapter, TaxIdValidationResult } from './types';
import sgRules from '@/config/taxRules.sg.json';

export const sgAdapter: CountryAdapter = {
  code: 'SG',
  name: 'Singapore',
  authority: sgRules.taxAuthority,
  currency: sgRules.currency,
  currencySymbol: sgRules.currencySymbol,
  taxIdLabel: 'UEN (Unique Entity Number)',
  taxIdFormat: /^(?:\d{8}[A-Z]|[STFG]\d{7}[A-Z])$/i,
  status: 'preview',

  validateTaxId(taxId: string): TaxIdValidationResult {
    const cleaned = taxId.trim().toUpperCase();
    if (!cleaned) return { valid: false, formatted: taxId, reason: 'UEN cannot be blank' };
    const isValid = this.taxIdFormat.test(cleaned);
    return {
      valid: isValid,
      formatted: cleaned,
      reason: isValid ? undefined : 'Invalid Singapore UEN format (e.g. 201812345A or T12LL1234B)',
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
