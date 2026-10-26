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
  defaultDueDay: number; // Day of month or specific rule
}

export interface PaymentCodeGenerator {
  taxType: string;
  generateCode(entityTaxId: string, period: string, amount: number): string;
  formatInstructions: string;
}

export interface CountryAdapter {
  code: CountryCode;
  name: string;
  authority: string;
  currency: string;
  currencySymbol: string;
  taxIdLabel: string;
  taxIdFormat: RegExp;
  status: 'full' | 'preview';
  
  validateTaxId(taxId: string): TaxIdValidationResult;
  documentTypes: DocumentTypeOption[];
  riskRules: RiskRuleDefinition[];
  fiscalAdjustmentRules: FiscalAdjustmentRule[];
  deadlineRules: DeadlineRuleDefinition[];
  paymentCodeGenerators: PaymentCodeGenerator[];
  standardCITRate: number;
  standardVATRate: number;
}
