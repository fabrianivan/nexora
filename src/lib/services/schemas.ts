import { z } from 'zod';
import { countryCodes, findingStatusSchema, userRoleSchema } from '@/lib/domain';

export const entityIdSchema = z.object({
  entityId: z.string().min(1),
});

export const documentExtractRequestSchema = z.object({
  documentId: z.string().min(1),
  text: z.string().max(200_000).optional(),
});

export const findingPatchSchema = z.object({
  status: findingStatusSchema.optional(),
  reviewer: z.string().min(1).max(120).optional(),
  reviewerNotes: z.string().max(4_000).optional(),
  actor: z.string().min(1).max(120).optional(),
  role: userRoleSchema.optional(),
}).refine((value) => value.status ?? value.reviewer ?? value.reviewerNotes, {
  message: 'Setidaknya satu field review harus diubah.',
});

export const adjustmentInputSchema = z.object({
  entityId: z.string().optional(),
  accountCode: z.string().optional(),
  accountName: z.string().optional(),
  description: z.string().min(2).max(240).optional(),
  positive: z.number().nonnegative().optional(),
  negative: z.number().nonnegative().optional(),
  positiveCorrection: z.number().nonnegative().optional(),
  negativeCorrection: z.number().nonnegative().optional(),
  commercialAmount: z.number().optional(),
  findingId: z.string().min(1).optional(),
  ruleBasis: z.string().min(2).max(500).optional(),
  status: z.enum(['verified', 'needs_verification']).optional(),
});

export const reconciliationRequestSchema = z.object({
  entityId: z.string().min(1),
  fiscalYear: z.number().int().min(2000).max(2100).optional(),
  commercialProfit: z.number(),
  adjustments: z.array(adjustmentInputSchema).max(200).default([]),
});

export const exportRequestSchema = reconciliationRequestSchema.extend({
  format: z.enum(['json', 'xml', 'pdf']).default('json'),
});

export const copilotRequestSchema = z.object({
  question: z.string().trim().min(3).max(4_000),
  country: z.enum(countryCodes),
  entityId: z.string().min(1).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const treatySimulationRequestSchema = z.object({
  country: z.enum(countryCodes),
  partnerCountry: z.enum(countryCodes),
  taxableIncome: z.number().nonnegative(),
  taxableSales: z.number().nonnegative(),
  crossBorderPayment: z.number().nonnegative(),
  treatyEligible: z.boolean(),
  consolidatedRevenueEur: z.number().nonnegative(),
  coveredTaxes: z.number().nonnegative(),
});

export const auditQuerySchema = z.object({
  actor: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  targetType: z.string().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export type AdjustmentInput = z.infer<typeof adjustmentInputSchema>;
