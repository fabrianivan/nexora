import { z } from 'zod';

export const countryCodes = ['ID', 'SG', 'MY', 'US'] as const;
export type CountryCode = (typeof countryCodes)[number];

const taxIdPatterns: Record<CountryCode, RegExp> = {
  ID: /^\d{15,16}$/,
  SG: /^(?:\d{8}[A-Z]|[STFG]\d{7}[A-Z])$/i,
  MY: /^[A-Z]{1,2}\d{8,12}$/i,
  US: /^\d{2}-?\d{7}$/,
};

export const entitySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  country: z.enum(countryCodes),
  taxId: z.string().trim().min(1),
  address: z.string().trim().min(5).max(500),
  fiscalYearEnd: z.string().regex(/^\d{2}-\d{2}$/, 'Gunakan format MM-DD'),
  createdAt: z.string().datetime(),
}).superRefine((entity, ctx) => {
  if (!taxIdPatterns[entity.country].test(entity.taxId.replace(/[ .]/g, ''))) {
    ctx.addIssue({ code: 'custom', path: ['taxId'], message: `Format identitas pajak ${entity.country} tidak valid` });
  }
});
export type CorporateEntity = z.infer<typeof entitySchema>;

export const ownershipSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  ownedId: z.string().min(1),
  percentage: z.number().gt(0).lte(100),
});
export type Ownership = z.infer<typeof ownershipSchema>;

export const documentTypes = ['deed', 'shareholder', 'financial_statement', 'previous_tax_return', 'e_invoice'] as const;
export type DataSource = 'ai' | 'manual';
const fieldSchema = <T extends z.ZodTypeAny>(schema: T) => z.object({
  value: schema,
  source: z.enum(['ai', 'manual']),
  confidence: z.number().min(0).max(1).optional(),
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

export const reconciliationLineSchema = z.object({
  id: z.string(), entityId: z.string(), description: z.string().min(2),
  commercialAmount: z.number(), positiveCorrection: z.number().min(0), negativeCorrection: z.number().min(0),
});
export type ReconciliationLine = z.infer<typeof reconciliationLineSchema>;

const corporateCompanySnapshotSchema = z.object({
  id: z.string().min(1).max(100),
  legalName: z.string().min(1).max(200),
  tradeName: z.string().max(200),
  parentCompanyId: z.string().nullable(),
  parentCompanyName: z.string().max(200),
  ownershipByParent: z.number().min(0).max(100),
  registrationNumber: z.string().max(200),
  taxId: z.string().max(100),
  countryCode: z.enum(countryCodes),
  entityType: z.enum(['Parent Holding Company', 'Subsidiary (Anak Perusahaan)', 'Regional Hub Subsidiary', 'Foreign Operating Subsidiary']),
  jurisdictionName: z.string().max(100),
  status: z.enum(['ACTIVE', 'PENDING']),
  aiComplianceScore: z.number().min(0).max(100),
  documents: z.array(z.record(z.string(), z.unknown())).max(200),
  structureNodes: z.array(z.record(z.string(), z.unknown())).max(500),
  intermediateShareholders: z.array(z.record(z.string(), z.unknown())).max(500),
  individualShareholders: z.array(z.record(z.string(), z.unknown())).max(500),
}).passthrough();

export const workspaceSchema = z.object({
  version: z.literal(1),
  entities: z.array(entitySchema),
  ownerships: z.array(ownershipSchema),
  documents: z.array(documentSchema),
  reconciliation: z.array(reconciliationLineSchema),
  // The current legacy corporate UI has a richer nested model. Keep it in a
  // separate, size-limited field until that UI is migrated to the normalized model.
  corporateCompanies: z.array(corporateCompanySnapshotSchema).max(100).optional(),
});
export type Workspace = z.infer<typeof workspaceSchema>;
export const emptyWorkspace: Workspace = { version: 1, entities: [], ownerships: [], documents: [], reconciliation: [], corporateCompanies: [] };

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
