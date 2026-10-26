import { CountryCode } from '@/lib/domain';

export interface TaxIdValidationResult {
  valid: boolean;
  formatted: string;
  reason?: string;
}

export interface DocumentTypeOption {
  type: string;
  label: string;
  required: boolean;
  acceptedMimeTypes: string[];
}

export interface RiskRuleDefinition {
  id: string;
  name: string;
  category: 'fraud' | 'compliance' | 'transfer_pricing' | 'beps';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  regulationBasis: string;
}

export interface FiscalAdjustmentRule {
  id: string;
  description: string;
  type: 'positive' | 'negative';
  regulationBasis: string;
  verified: boolean;
}

export interface DeadlineRuleDefinition {
  key: string;
  label: string;
  obligationType: string;
  deadlineRule: string;
  regulation: string;
  defaultDueDay: number;
}

export interface PaymentCodeGenerator {
  taxType: string;
  generateCode(entityTaxId: string, period: string, amount: number): string;
  formatInstructions: string;
}

export interface CorporateTaxCalculationParams {
  taxableIncome: number;
  grossRevenue?: number;
  isSme?: boolean;
}

export interface CorporateTaxCalculationResult {
  taxableIncome: number;
  taxDue: number;
  effectiveRate: number;
  breakdown?: Record<string, number>;
  explanation: string;
}

export interface DeadlineItem {
  id: string;
  key: string;
  label: string;
  dueDate: string;
  obligationType: string;
  status: 'pending' | 'completed' | 'urgent';
  daysLeft: number;
  finePenalty?: string;
}

export interface ReturnDraftParams {
  entity: {
    id: string;
    name: string;
    country: CountryCode;
    taxId: string;
    address?: string;
    fiscalYearEnd?: string;
    createdAt?: string;
  };
  fiscalYear: number;
  taxableIncome: number;
  taxDue: number;
  adjustments?: Array<{
    id: string;
    fiscalYear: number;
    accountCode?: string;
    accountName: string;
    commercialAmount: number;
    adjustmentType: 'positive' | 'negative';
    adjustmentAmount: number;
    fiscalAmount: number;
    legalBasis: string;
    notes?: string;
  }>;
  creator: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
}

export interface CountryAdapter {
  code: CountryCode;
  countryCode: CountryCode;
  name: string;
  authority: string;
  currency: string;
  currencySymbol: string;
  taxIdLabel: string;
  taxIdFormat: RegExp;
  status: 'full' | 'preview';
  isSupported: boolean;
  
  validateTaxId(taxId: string): TaxIdValidationResult;
  calculateCorporateTax(params: CorporateTaxCalculationParams): CorporateTaxCalculationResult;
  getDeadlines(year?: number): DeadlineItem[];
  generateReturnDraft(params: ReturnDraftParams): Record<string, unknown>;

  documentTypes: DocumentTypeOption[];
  riskRules: RiskRuleDefinition[];
  fiscalAdjustmentRules: FiscalAdjustmentRule[];
  deadlineRules: DeadlineRuleDefinition[];
  paymentCodeGenerators: PaymentCodeGenerator[];
  standardCITRate: number;
  standardVATRate: number;
}
