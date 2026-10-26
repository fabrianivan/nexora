import { CountryAdapter, TaxIdValidationResult } from './types';
import myRules from '@/config/taxRules.my.json';

export const myAdapter: CountryAdapter = {
  code: 'MY',
  name: 'Malaysia',
  authority: myRules.taxAuthority,
  currency: myRules.currency,
  currencySymbol: myRules.currencySymbol,
  taxIdLabel: 'TIN / Company Registration No.',
  taxIdFormat: /^[A-Z]{1,2}\d{8,12}$/i,
  status: 'preview',

  validateTaxId(taxId: string): TaxIdValidationResult {
    const cleaned = taxId.trim().toUpperCase();
    if (!cleaned) return { valid: false, formatted: taxId, reason: 'TIN cannot be blank' };
    const isValid = this.taxIdFormat.test(cleaned);
    return {
      valid: isValid,
      formatted: cleaned,
      reason: isValid ? undefined : 'Invalid Malaysia Tax Identification Number (e.g. C12345678901)',
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
