import { z } from 'zod';

export const countryCodes = ['ID', 'SG', 'MY', 'US'] as const;
export type CountryCode = (typeof countryCodes)[number];

export const taxIdPatterns: Record<CountryCode, RegExp> = {
  ID: /^\d{15,16}$/,
  SG: /^(?:\d{8}[A-Z]|[STFG]\d{7}[A-Z])$/i,
  MY: /^[A-Z]{1,2}\d{8,12}$/i,
  US: /^\d{2}-?\d{7}$/,
};

// 1. Corporate Entities & Ownership
export const entitySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  country: z.enum(countryCodes),
  taxId: z.string().trim().min(1),
  address: z.string().trim().min(5).max(500),
  fiscalYearEnd: z.string().regex(/^\d{2}-\d{2}$/, 'Gunakan format MM-DD'),
  createdAt: z.string().datetime(),
  status: z.enum(['Active', 'Under Review', 'Dormant']).optional(),
  currency: z.string().optional(),
  parentGroupId: z.string().optional(),
}).superRefine((entity, ctx) => {
  const normalized = entity.taxId.replace(/[ .]/g, '');
  if (!taxIdPatterns[entity.country].test(normalized)) {
    ctx.addIssue({ code: 'custom', path: ['taxId'], message: `Format identitas pajak ${entity.country} tidak valid` });
  }
});
export type CorporateEntity = z.infer<typeof entitySchema>;

export const corporateGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  jurisdiction: z.string().min(2),
  consolidatedRevenue: z.number().nonnegative().optional(),
  entityCount: z.number().int().nonnegative().optional(),
  ultimateParentEntityId: z.string().min(1),
});
export type CorporateGroup = z.infer<typeof corporateGroupSchema>;

export const ownershipSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  ownedId: z.string().min(1),
  percentage: z.number().gt(0).lte(100),
  ownershipType: z.enum(['direct', 'indirect', 'beneficial']).optional(),
});
export type Ownership = z.infer<typeof ownershipSchema>;

export const shareholderSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  name: z.string().min(2),
  type: z.enum(['individual', 'corporate']),
  idNumber: z.string().min(1),
  sharePercentage: z.number().min(0).max(100),
  isUbo: z.boolean().optional(),
  taxResidency: z.string().min(2),
  dividendReceived: z.number().nonnegative().optional(),
  withheldTax: z.number().nonnegative().optional(),
});
export type Shareholder = z.infer<typeof shareholderSchema>;

export const intermediateShareholderSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  name: z.string().min(2),
  jurisdiction: z.string().min(2),
  sharePercentage: z.number().min(0).max(100),
  bepsScreeningStatus: z.enum(['Clean', 'Review Required', 'High Risk']),
  economicSubstanceVerified: z.boolean().optional(),
  effectiveTaxRateInJurisdiction: z.number().min(0).max(100).optional(),
});
export type IntermediateShareholder = z.infer<typeof intermediateShareholderSchema>;

// 2. Documents & Field Extraction
export const documentTypes = [
  'deed', 
  'shareholder', 
  'financial_statement', 
  'previous_tax_return', 
  'e_invoice',
  'tax_payment_slip'
] as const;
export type DocumentType = (typeof documentTypes)[number];

export type DataSource = 'ai' | 'manual';
export const fieldSchema = <T extends z.ZodTypeAny>(schema: T) => z.object({
  value: schema,
  source: z.enum(['ai', 'manual']),
  confidence: z.number().min(0).max(1).optional(),
  location: z.object({
    page: z.number().int().positive().optional(),
    boundingBox: z.array(z.number()).optional(),
  }).optional(),
});

export const documentSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  country: z.enum(countryCodes),
  type: z.enum(documentTypes),
  attachmentName: z.string().min(1),
  attachmentType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  attachmentSize: z.number().positive().max(10 * 1024 * 1024),
  number: fieldSchema(z.string().trim().min(1)),
  date: fieldSchema(z.string().date()),
  counterparty: fieldSchema(z.string().trim().min(2)),
  counterpartyTaxId: fieldSchema(z.string().trim().min(1)),
  taxableBase: fieldSchema(z.number().min(0)),
  taxAmount: fieldSchema(z.number().min(0)),
  totalAmount: fieldSchema(z.number().min(0)),
  ownershipPercentage: fieldSchema(z.number().min(0).max(100).nullable()),
  invoiceUuid: fieldSchema(z.string()),
  taxIdValidated: z.boolean(),
  hasSupportingEvidence: z.boolean(),
  deductible: z.boolean(),
  createdAt: z.string().datetime(),
  version: z.number().int().positive().optional(),
}).superRefine((document, ctx) => {
  const normalized = document.counterpartyTaxId.value.replace(/[ .]/g, '');
  if (!taxIdPatterns[document.country].test(normalized)) {
    ctx.addIssue({ code: 'custom', path: ['counterpartyTaxId', 'value'], message: 'Format identitas pajak tidak valid' });
  }
  const expected = document.taxableBase.value + document.taxAmount.value;
  if (Math.abs(expected - document.totalAmount.value) > 1) {
    ctx.addIssue({ code: 'custom', path: ['totalAmount', 'value'], message: 'Total harus sama dengan DPP + pajak' });
  }
});
export type TaxDocument = z.infer<typeof documentSchema>;

// 3. Fraud & Risk Findings
export const findingSeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type FindingSeverity = z.infer<typeof findingSeveritySchema>;

export const findingStatusSchema = z.enum(['Baru', 'Ditinjau', 'Dikonfirmasi', 'Ditolak']);
export type FindingStatus = z.infer<typeof findingStatusSchema>;

export const evidenceItemSchema = z.object({
  field: z.string(),
  expected: z.string(),
  actual: z.string(),
  sourceRef: z.string(),
  mathSnippet: z.string().optional(),
});
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

export const findingSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  ruleId: z.string().min(1),
  ruleName: z.string().min(2),
  category: z.enum(['fraud', 'compliance', 'transfer_pricing', 'beps', 'cross_validation']),
  severity: findingSeveritySchema,
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(5),
  evidence: z.array(evidenceItemSchema),
  recommendation: z.string().min(5),
  status: findingStatusSchema,
  reviewer: z.string().optional(),
  reviewerNotes: z.string().optional(),
  assignedTo: z.string().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type Finding = z.infer<typeof findingSchema>;

// 4. Fiscal Reconciliation & Tax Calculation
export const reconciliationLineSchema = z.object({
  id: z.string(),
  entityId: z.string(),
  description: z.string().min(2),
  commercialAmount: z.number(),
  positiveCorrection: z.number().min(0),
  negativeCorrection: z.number().min(0),
  ruleBasis: z.string().optional(),
  verified: z.boolean().optional(),
  findingId: z.string().optional(),
});
export type ReconciliationLine = z.infer<typeof reconciliationLineSchema>;

export const taxCalculationStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  description: z.string(),
  formula: z.string(),
  amount: z.number(),
});
export type TaxCalculationStep = z.infer<typeof taxCalculationStepSchema>;

export const taxCalculationSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  taxType: z.enum(['CIT', 'VAT', 'WHT']),
  period: z.string(),
  commercialProfit: z.number(),
  positiveAdjustments: z.number(),
  negativeAdjustments: z.number(),
  taxableIncome: z.number(),
  effectiveRate: z.number(),
  calculatedTax: z.number(),
  taxCredits: z.number().optional(),
  taxPayable: z.number(),
  steps: z.array(taxCalculationStepSchema),
  assumptions: z.array(z.string()).optional(),
});
export type TaxCalculation = z.infer<typeof taxCalculationSchema>;

// 5. Tax Return Drafts & Workflow (Maker-Checker)
export const taxReturnStatusSchema = z.enum(['Draft', 'Review', 'Approved', 'Ready']);
export type TaxReturnStatus = z.infer<typeof taxReturnStatusSchema>;

export const taxReturnDraftSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  country: z.enum(countryCodes),
  formType: z.string(),
  period: z.string(),
  formData: z.record(z.string(), z.unknown()),
  status: taxReturnStatusSchema,
  createdBy: z.string(),
  creatorRole: z.string(),
  approvedBy: z.string().optional(),
  approverRole: z.string().optional(),
  approvalNotes: z.string().optional(),
  exportedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional(),
});
export type TaxReturnDraft = z.infer<typeof taxReturnDraftSchema>;

// 6. Payments & Tax Calendar Deadlines
export const paymentStatusSchema = z.enum(['Belum dibayar', 'Dibayar', 'Terlambat', 'Parsial']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const paymentRecordSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  taxType: z.string(),
  period: z.string(),
  billingCode: z.string(),
  amount: z.number().positive(),
  dueDate: z.string(),
  status: paymentStatusSchema,
  paidAt: z.string().optional(),
  receiptNumber: z.string().optional(),
  overduePenaltyEstimate: z.number().nonnegative().optional(),
});
export type PaymentRecord = z.infer<typeof paymentRecordSchema>;

export const deadlineStatusSchema = z.enum(['Upcoming', 'Today', 'Overdue', 'Completed']);
export type DeadlineStatus = z.infer<typeof deadlineStatusSchema>;

export const taxDeadlineSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  country: z.enum(countryCodes),
  obligationType: z.string(),
  dueDate: z.string(),
  status: deadlineStatusSchema,
  assignee: z.string(),
  linkedReturnId: z.string().optional(),
  linkedPaymentId: z.string().optional(),
});
export type TaxDeadline = z.infer<typeof taxDeadlineSchema>;

// 7. Users, RBAC & Audit Log
export const userRoleSchema = z.enum([
  'CEO Grup',
  'Head of Tax',
  'Konsultan Pajak',
  'Auditor/Compliance',
  'Viewer'
]);
export type UserRole = z.infer<typeof userRoleSchema>;

export interface RolePermissions {
  canEditEntities: boolean;
  canUploadDocuments: boolean;
  canReviewFindings: boolean;
  canEditReconciliation: boolean;
  canDraftReturns: boolean;
  canApproveReturns: boolean;
  canGenerateBilling: boolean;
  canRecordPayment: boolean;
  canExportOfficialPacks: boolean;
}

export const rolePermissionMap: Record<UserRole, RolePermissions> = {
  'CEO Grup': {
    canEditEntities: true,
    canUploadDocuments: true,
    canReviewFindings: true,
    canEditReconciliation: false,
    canDraftReturns: false,
    canApproveReturns: true,
    canGenerateBilling: true,
    canRecordPayment: true,
    canExportOfficialPacks: true,
  },
  'Head of Tax': {
    canEditEntities: true,
    canUploadDocuments: true,
    canReviewFindings: true,
    canEditReconciliation: true,
    canDraftReturns: true,
    canApproveReturns: true,
    canGenerateBilling: true,
    canRecordPayment: true,
    canExportOfficialPacks: true,
  },
  'Konsultan Pajak': {
    canEditEntities: true,
    canUploadDocuments: true,
    canReviewFindings: true,
    canEditReconciliation: true,
    canDraftReturns: true,
    canApproveReturns: false,
    canGenerateBilling: true,
    canRecordPayment: false,
    canExportOfficialPacks: false,
  },
  'Auditor/Compliance': {
    canEditEntities: false,
    canUploadDocuments: false,
    canReviewFindings: true,
    canEditReconciliation: false,
    canDraftReturns: false,
    canApproveReturns: false,
    canGenerateBilling: false,
    canRecordPayment: false,
    canExportOfficialPacks: true,
  },
  'Viewer': {
    canEditEntities: false,
    canUploadDocuments: false,
    canReviewFindings: false,
    canEditReconciliation: false,
    canDraftReturns: false,
    canApproveReturns: false,
    canGenerateBilling: false,
    canRecordPayment: false,
    canExportOfficialPacks: false,
  },
};

export const auditLogEntrySchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().datetime(),
  actor: z.string(),
  role: userRoleSchema,
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  beforeValue: z.unknown().optional(),
  afterValue: z.unknown().optional(),
  notes: z.string().optional(),
});
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

// 8. Studies & Transfer Pricing
export const studySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2),
  category: z.enum(['P3B / Tax Treaty', 'BEPS 2.0 / Pillar Two', 'Transfer Pricing', 'PPN / VAT', 'Fraud Case Study']),
  summary: z.string().min(10),
  source: z.string(),
  tags: z.array(z.string()),
  applicableJurisdictions: z.array(z.string()),
  simulationType: z.enum(['treaty_relief', 'pillar_two_etr', 'tp_markup', 'none']).optional(),
  verified: z.boolean().optional(),
});
export type Study = z.infer<typeof studySchema>;

export const tpTransactionSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  relatedPartyName: z.string(),
  relatedPartyJurisdiction: z.string(),
  transactionType: z.enum(['Management Fee', 'Royalty', 'Intercompany Loan', 'Goods Sale']),
  amount: z.number().positive(),
  appliedMethod: z.enum(['CUP', 'TNMM', 'Cost Plus', 'Resale Price', 'Profit Split']),
  armLengthRange: z.object({
    min: z.number(),
    median: z.number(),
    max: z.number(),
  }),
  testedPartyMarkup: z.number(),
  isWithinRange: z.boolean(),
  tpDocStatus: z.enum(['Local File Ready', 'Master File Ready', 'Missing Documentation']),
});
export type TPTransaction = z.infer<typeof tpTransactionSchema>;

// 9. Notifications & Copilot
export const notificationSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  message: z.string(),
  type: z.enum(['finding', 'approval', 'deadline', 'system']),
  targetTab: z.string().optional(),
  targetId: z.string().optional(),
  read: z.boolean().optional(),
  timestamp: z.string().datetime(),
});
export type NotificationItem = z.infer<typeof notificationSchema>;

export const copilotMessageSchema = z.object({
  id: z.string().min(1),
  sender: z.enum(['user', 'assistant']),
  text: z.string(),
  citations: z.array(z.object({
    source: z.string(),
    article: z.string(),
    textSnippet: z.string(),
  })).optional(),
  confidence: z.number().min(0).max(1).optional(),
  grounded: z.boolean().optional(),
  timestamp: z.string().datetime().optional(),
});
export type CopilotMessage = z.infer<typeof copilotMessageSchema>;

// 10. Workspace
export const workspaceSchema = z.object({
  version: z.literal(1),
  entities: z.array(entitySchema),
  ownerships: z.array(ownershipSchema),
  shareholders: z.array(shareholderSchema).optional(),
  intermediateShareholders: z.array(intermediateShareholderSchema).optional(),
  documents: z.array(documentSchema),
  reconciliation: z.array(reconciliationLineSchema),
  findings: z.array(findingSchema).optional(),
  returns: z.array(taxReturnDraftSchema).optional(),
  payments: z.array(paymentRecordSchema).optional(),
  deadlines: z.array(taxDeadlineSchema).optional(),
  auditLogs: z.array(auditLogEntrySchema).optional(),
});
export type Workspace = z.infer<typeof workspaceSchema>;

export const emptyWorkspace: Workspace = {
  version: 1,
  entities: [],
  ownerships: [],
  shareholders: [],
  intermediateShareholders: [],
  documents: [],
  reconciliation: [],
  findings: [],
  returns: [],
  payments: [],
  deadlines: [],
  auditLogs: [],
};

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
