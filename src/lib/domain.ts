import { z } from 'zod';

export const countryCodes = ['ID', 'SG', 'MY', 'US'] as const;
export type CountryCode = (typeof countryCodes)[number];
export const countrySchema = z.enum(countryCodes);

export const taxIdPatterns: Record<CountryCode, RegExp> = {
  ID: /^\d{15,16}$/,
  SG: /^(?:\d{8}[A-Z]|[STFG]\d{7}[A-Z]|\d{9}[A-Z])$/i,
  MY: /^[A-Z]{1,2}\d{8,12}$/i,
  US: /^\d{2}-?\d{7}$/,
};

export function validateCountryTaxId(country: CountryCode, rawTaxId: string): {
  valid: boolean;
  normalized: string;
  message?: string;
} {
  const cleaned = rawTaxId.replace(/\s*\(.*?\)\s*/g, '').replace(/[ .\s]/g, '').trim();
  const valid = taxIdPatterns[country].test(cleaned);
  return {
    valid,
    normalized: cleaned,
    message: valid ? undefined : `Format identitas pajak ${country} tidak valid`,
  };
}

// ============================================================================
// CORE ENTITY & GROUP SCHEMAS
// ============================================================================

export const entityStatusValues = ['ACTIVE', 'PENDING', 'UNDER_REVIEW'] as const;
export type EntityStatus = (typeof entityStatusValues)[number];

export const entitySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(2).max(160),
    tradeName: z.string().trim().max(160).optional(),
    country: z.enum(countryCodes),
    taxId: z.string().trim().min(1),
    secondaryTaxId: z.string().trim().max(100).optional(),
    currency: z.enum(['IDR', 'SGD', 'MYR', 'USD']).optional(),
    status: z.enum(entityStatusValues).optional(),
    address: z.string().trim().min(5).max(500),
    fiscalYearEnd: z.string().regex(/^\d{2}-\d{2}$/, 'Gunakan format MM-DD'),
    industryCode: z.string().max(64).optional(),
    createdAt: z.string().datetime(),
  })
  .superRefine((entity, ctx) => {
    const check = validateCountryTaxId(entity.country, entity.taxId);
    if (!check.valid) {
      ctx.addIssue({
        code: 'custom',
        path: ['taxId'],
        message: check.message ?? `Format identitas pajak ${entity.country} tidak valid`,
      });
    }
  });
export type CorporateEntity = z.infer<typeof entitySchema>;
export type Entity = CorporateEntity;

export const groupSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  headquartersCountry: z.enum(countryCodes),
  consolidatedRevenueEur: z.number().min(0),
  fiscalYear: z.number().int().min(2020).max(2035),
  entityIds: z.array(z.string()),
});
export type Group = z.infer<typeof groupSchema>;

export const ownershipLinkTypes = ['DIRECT', 'INDIRECT', 'INTERMEDIATE_CONDUIT'] as const;
export type OwnershipLinkType = (typeof ownershipLinkTypes)[number];

export const ownershipSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  ownedId: z.string().min(1),
  percentage: z.number().gt(0).lte(100),
  linkType: z.enum(ownershipLinkTypes).optional(),
  effectivePercentage: z.number().min(0).max(100).optional(),
});
export type Ownership = z.infer<typeof ownershipSchema>;
export type OwnershipLink = Ownership;

export const shareholderSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  type: z.enum(['INDIVIDUAL', 'CORPORATE']),
  isBeneficialOwner: z.boolean(),
  beneficialOwnerConfirmed: z.boolean().default(true),
  jurisdiction: z.string().min(2).max(80),
  taxId: z.string().min(1).max(80),
  percentage: z.number().min(0).max(100),
  effectivePercentage: z.number().min(0).max(100),
  highRiskJurisdiction: z.boolean().default(false),
  dividendRegimeNote: z.string().max(300).optional(),
});
export type Shareholder = z.infer<typeof shareholderSchema>;

// ============================================================================
// DOCUMENT & EXTRACTED FIELD SCHEMAS
// ============================================================================

export const documentTypes = [
  'deed',
  'shareholder',
  'financial_statement',
  'previous_tax_return',
  'e_invoice',
  'withholding_slip',
] as const;
export type DocumentType = (typeof documentTypes)[number];
export const documentTypeSchema = z.enum(documentTypes);
export type DataSource = 'ai' | 'manual';

export const extractedFieldItemSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  location: z.string().min(1), // e.g. "Hal. 1, Blok Header NSFP"
  source: z.enum(['ai', 'manual']),
  manuallyCorrected: z.boolean().default(false),
  previousValue: z.string().optional(),
  correctedAt: z.string().datetime().optional(),
  correctedBy: z.string().optional(),
  validationStatus: z.enum(['valid', 'warning', 'error']).default('valid'),
  validationNote: z.string().optional(),
});
export type ExtractedField = z.infer<typeof extractedFieldItemSchema>;

const fieldSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    value: schema,
    source: z.enum(['ai', 'manual']),
    confidence: z.number().min(0).max(1).optional(),
    location: z.string().optional(),
    manuallyCorrected: z.boolean().optional(),
  });

export const allowedAttachmentTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/json',
  'application/xml',
  'text/xml',
] as const;

export const documentSchema = z
  .object({
    id: z.string().min(1),
    entityId: z.string().min(1),
    country: z.enum(countryCodes),
    type: z.enum(documentTypes),
    title: z.string().optional(),
    version: z.number().int().min(1).optional(),
    extractionStatus: z
      .enum(['EXTRACTED', 'NEEDS_REVIEW', 'VERIFIED', 'FAILED'])
      .optional(),
    attachmentName: z.string().min(1),
    attachmentType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
    attachmentSize: z.number().positive().max(10 * 1024 * 1024),
    number: fieldSchema(z.string().trim().min(1)),
    date: fieldSchema(z.string().date()),
    counterparty: fieldSchema(z.string().trim().min(2)),
    counterpartyTaxId: fieldSchema(z.string().trim().min(1)),
    counterpartyBankAccount: z.string().optional(),
    expectedBankAccount: z.string().optional(),
    counterpartyJurisdiction: z.string().optional(),
    isRelatedParty: z.boolean().optional(),
    hasTransferPricingDoc: z.boolean().optional(),
    isNewVendor: z.boolean().optional(),
    nsfpWithinAllocatedRange: z.boolean().optional(),
    creditableVat: z.boolean().optional(),
    taxableBase: fieldSchema(z.number().min(0)),
    taxAmount: fieldSchema(z.number().min(0)),
    totalAmount: fieldSchema(z.number().min(0)),
    ownershipPercentage: fieldSchema(z.number().min(0).max(100).nullable()),
    invoiceUuid: fieldSchema(z.string()),
    taxIdValidated: z.boolean(),
    hasSupportingEvidence: z.boolean(),
    deductible: z.boolean(),
    extractedFieldsList: z.array(extractedFieldItemSchema).optional(),
    rawTextPreview: z.string().optional(),
    createdAt: z.string().datetime(),
  })
  .superRefine((document, ctx) => {
    if (document.taxIdValidated) {
      const check = validateCountryTaxId(
        document.country,
        document.counterpartyTaxId.value
      );
      if (!check.valid) {
        ctx.addIssue({
          code: 'custom',
          path: ['counterpartyTaxId', 'value'],
          message: 'Format identitas pajak tidak valid',
        });
      }
    }
    const expected = document.taxableBase.value + document.taxAmount.value;
    if (Math.abs(expected - document.totalAmount.value) > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['totalAmount', 'value'],
        message: 'Total harus sama dengan DPP + pajak',
      });
    }
  });
export type TaxDocument = z.infer<typeof documentSchema>;

// ============================================================================
// FINDING (EXPLAINABLE RISK & FRAUD) SCHEMA
// ============================================================================

export const findingSeverityValues = ['critical', 'high', 'medium', 'low'] as const;
export type FindingSeverity = (typeof findingSeverityValues)[number];

export const findingReviewStatusValues = [
  'Baru',
  'Ditinjau',
  'Dikonfirmasi',
  'Ditolak',
] as const;
export type FindingReviewStatus = (typeof findingReviewStatusValues)[number];

export const findingEvidenceSchema = z.object({
  field: z.string(),
  location: z.string(),
  value: z.string(),
  expectedOrStatistic: z.string().optional(),
});
export type FindingEvidence = z.infer<typeof findingEvidenceSchema>;

export const findingV2Schema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  documentId: z.string().optional(),
  country: z.enum(countryCodes),
  ruleId: z.string().min(1),
  category: z.enum([
    'FRAUD',
    'COMPLIANCE',
    'OWNERSHIP',
    'CROSS_VALIDATION',
    'TRANSFER_PRICING',
    'STATISTICAL',
  ]),
  title: z.string().min(1),
  severity: z.enum(findingSeverityValues),
  score: z.number().min(0).max(100),
  ruleScoreContribution: z.number().min(0).max(100),
  statScoreContribution: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
  evidence: z.array(findingEvidenceSchema),
  recommendation: z.string().min(1),
  status: z.enum(findingReviewStatusValues).default('Baru'),
  isFalsePositive: z.boolean().default(false),
  reviewer: z.string().optional(),
  reviewNote: z.string().optional(),
  linkedAdjustmentId: z.string().optional(),
  computeLabel: z
    .string()
    .default('Dihitung lokal (aturan deterministik + simulasi BigQuery)'),
  timestamp: z.string().datetime(),
});
export type FindingV2 = z.infer<typeof findingV2Schema>;

// ============================================================================
// FISCAL ADJUSTMENT & RECONCILIATION SCHEMAS
// ============================================================================

export const reconciliationLineSchema = z.object({
  id: z.string(),
  entityId: z.string(),
  accountCode: z.string().optional(),
  category: z.enum(['REVENUE', 'COGS', 'OPEX', 'OTHER']).optional(),
  description: z.string().min(2),
  commercialAmount: z.number(),
  positiveCorrection: z.number().min(0),
  negativeCorrection: z.number().min(0),
  ruleBasis: z.string().optional(),
  reason: z.string().optional(),
  verificationStatus: z
    .enum(['VERIFIED', 'NEEDS_VERIFICATION'])
    .optional(),
  linkedFindingId: z.string().optional(),
});
export type ReconciliationLine = z.infer<typeof reconciliationLineSchema>;
export type FiscalAdjustment = ReconciliationLine;

// ============================================================================
// AUDIT LOG & COPILOT SCHEMAS
// ============================================================================

export const auditLogEntrySchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().datetime(),
  actor: z.string().min(1),
  action: z.enum([
    'LOAD_SAMPLE_DATASET',
    'UPLOAD_DOCUMENT',
    'EDIT_EXTRACTED_FIELD',
    'UPDATE_FINDING_STATUS',
    'MARK_FALSE_POSITIVE',
    'BULK_UPDATE_FINDINGS',
    'UPDATE_RECONCILIATION',
    'VERIFY_RECONCILIATION_LINE',
    'EXPORT_DRAFT_RETURN',
    'ASK_COPILOT',
    'ADD_OWNERSHIP_LINK',
  ]),
  objectType: z.enum([
    'WORKSPACE',
    'DOCUMENT',
    'EXTRACTED_FIELD',
    'FINDING',
    'RECONCILIATION',
    'TAX_RETURN_DRAFT',
    'COPILOT',
    'OWNERSHIP',
  ]),
  objectId: z.string().min(1),
  beforeValue: z.string().nullable(),
  afterValue: z.string().nullable(),
  note: z.string().optional(),
});
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

export const copilotCitationSchema = z.object({
  id: z.string(),
  regulation: z.string(),
  article: z.string(),
  jurisdiction: z.enum(['ID', 'SG', 'MY', 'US', 'OECD']),
  summary: z.string(),
  needsVerification: z.boolean().default(false),
});
export type CopilotCitation = z.infer<typeof copilotCitationSchema>;

export const copilotMessageSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  citations: z.array(copilotCitationSchema),
  confidence: z.number().min(0).max(1),
  grounded: z.boolean(),
  engineMode: z.enum(['demo', 'live']),
  fallbackUsed: z.boolean().default(false),
  timestamp: z.string().datetime(),
});
export type CopilotMessage = z.infer<typeof copilotMessageSchema>;

// ============================================================================
// WORKSPACE SCHEMA (BACKWARDS COMPATIBLE + V2 EXTENSIONS)
// ============================================================================

const corporateCompanySnapshotSchema = z
  .object({
    id: z.string().min(1).max(100),
    legalName: z.string().min(1).max(200),
    tradeName: z.string().max(200),
    parentCompanyId: z.string().nullable(),
    parentCompanyName: z.string().max(200),
    ownershipByParent: z.number().min(0).max(100),
    registrationNumber: z.string().max(200),
    taxId: z.string().max(100),
    countryCode: z.enum(countryCodes),
    entityType: z.enum([
      'Parent Holding Company',
      'Subsidiary (Anak Perusahaan)',
      'Regional Hub Subsidiary',
      'Foreign Operating Subsidiary',
    ]),
    jurisdictionName: z.string().max(100),
    status: z.enum(['ACTIVE', 'PENDING']),
    aiComplianceScore: z.number().min(0).max(100),
    documents: z.array(z.record(z.string(), z.unknown())).max(200),
    structureNodes: z.array(z.record(z.string(), z.unknown())).max(500),
    intermediateShareholders: z
      .array(z.record(z.string(), z.unknown()))
      .max(500),
    individualShareholders: z.array(z.record(z.string(), z.unknown())).max(500),
  })
  .passthrough();

export const workspaceSchema = z.object({
  version: z.literal(1),
  entities: z.array(entitySchema),
  ownerships: z.array(ownershipSchema),
  shareholders: z.array(shareholderSchema).optional(),
  documents: z.array(documentSchema),
  findings: z.array(findingV2Schema).optional(),
  suppressedRules: z.array(z.string()).optional(),
  reconciliation: z.array(reconciliationLineSchema),
  auditLog: z.array(auditLogEntrySchema).optional(),
  corporateCompanies: z.array(corporateCompanySnapshotSchema).max(100).optional(),
});
export type Workspace = z.infer<typeof workspaceSchema>;

export const emptyWorkspace: Workspace = {
  version: 1,
  entities: [],
  ownerships: [],
  shareholders: [],
  documents: [],
  findings: [],
  suppressedRules: [],
  reconciliation: [],
  auditLog: [],
  corporateCompanies: [],
};

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

// ============================================================================
// PRIVACY MASKING & PROMPT SANITIZATION HELPERS
// ============================================================================

export function maskSensitiveId(raw: string, maskEnabled = true): string {
  if (!maskEnabled || !raw) return raw;
  const trimmed = raw.trim();
  if (trimmed.length <= 6) return '••••';
  return `${trimmed.slice(0, 4)}${'•'.repeat(Math.min(8, trimmed.length - 7))}${trimmed.slice(-3)}`;
}

export function maskBankAccount(raw: string, maskEnabled = true): string {
  if (!maskEnabled || !raw) return raw;
  const trimmed = raw.trim();
  if (trimmed.length <= 4) return '••••';
  return `••••-${trimmed.slice(-4)}`;
}

export function sanitizeForPrompt(untrustedInput: string, maxLength = 1500): string {
  return untrustedInput
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<\s*\/?\s*(?:system|instruction|prompt|ignore|assistant|developer)[^>]*>/gi, '[TAG_REMOVED]')
    .replace(/(?:ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions|system\s+override|you\s+are\s+now)/gi, '[FILTERED_DATA]')
    .slice(0, maxLength)
    .trim();
}
