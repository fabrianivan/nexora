import { z } from 'zod';
import {
  citationSchema,
  corporateGroupSchema,
  countryCodes,
  documentSchema,
  entitySchema,
  extractedFieldSchema,
  findingSchema,
  ownershipSchema,
  shareholderSchema,
  sourceDocumentSchema,
} from '@/lib/domain';

export const engineModeSchema = z.enum(['demo', 'live']);
export type EngineMode = z.infer<typeof engineModeSchema>;

export const engineMetaSchema = z.object({
  mode: engineModeSchema,
  provider: z.string().min(1),
  model: z.string().min(1).optional(),
  fallback: z.boolean(),
  notice: z.string().min(1).optional(),
  durationMs: z.number().int().nonnegative(),
});
export type EngineMeta = z.infer<typeof engineMetaSchema>;

export interface EngineResult<T> {
  data: T;
  meta: EngineMeta;
}

export class EngineError extends Error {
  constructor(
    public readonly code: 'E-AI-001' | 'E-AI-002' | 'E-AI-003',
    message: string,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

export const extractInputSchema = z.object({
  document: documentSchema,
  text: z.string().max(200_000).optional(),
});
export type ExtractInput = z.infer<typeof extractInputSchema>;

export const extractOutputSchema = z.object({
  documentId: z.string().min(1),
  fields: z.array(extractedFieldSchema),
  warnings: z.array(z.string()),
});
export type ExtractOutput = z.infer<typeof extractOutputSchema>;

export const crossCheckIssueSchema = z.object({
  documentId: z.string().min(1),
  field: z.string().min(1),
  message: z.string().min(5),
  expected: z.string().optional(),
  actual: z.string().optional(),
});
export type CrossCheckIssue = z.infer<typeof crossCheckIssueSchema>;

export const crossCheckInputSchema = z.object({
  entity: entitySchema,
  documents: z.array(documentSchema),
});
export type CrossCheckInput = z.infer<typeof crossCheckInputSchema>;

export const crossCheckOutputSchema = z.object({
  issues: z.array(crossCheckIssueSchema),
  checkedDocuments: z.number().int().nonnegative(),
});
export type CrossCheckOutput = z.infer<typeof crossCheckOutputSchema>;

export const riskInputSchema = z.object({
  entity: entitySchema,
  group: corporateGroupSchema.optional(),
  documents: z.array(documentSchema),
  ownerships: z.array(ownershipSchema).optional(),
  shareholders: z.array(shareholderSchema).optional(),
});
export type RiskInput = z.infer<typeof riskInputSchema>;

export const riskOutputSchema = z.object({
  findings: z.array(findingSchema),
  rulesEvaluated: z.number().int().nonnegative(),
  zScoreReady: z.boolean(),
});
export type RiskOutput = z.infer<typeof riskOutputSchema>;

export const copilotInputSchema = z.object({
  question: z.string().trim().min(3).max(4_000),
  country: z.enum(countryCodes),
  sources: z.array(sourceDocumentSchema).default([]),
  context: z.record(z.string(), z.unknown()).optional(),
});
export type CopilotInput = z.infer<typeof copilotInputSchema>;

export const copilotOutputSchema = z.object({
  answer: z.string().min(1),
  citations: z.array(citationSchema),
  grounded: z.boolean(),
  refused: z.boolean(),
  confidence: z.number().min(0).max(1),
});
export type CopilotOutput = z.infer<typeof copilotOutputSchema>;

/**
 * Contract sengaja identik untuk DemoEngine dan LiveEngine.
 * Semua output wajib lolos schema sebelum dikirim ke service/API.
 */
export interface AIEngine {
  readonly mode: EngineMode;
  extract(input: ExtractInput): Promise<EngineResult<ExtractOutput>>;
  crossCheck(input: CrossCheckInput): Promise<EngineResult<CrossCheckOutput>>;
  analyzeRisk(input: RiskInput): Promise<EngineResult<RiskOutput>>;
  askCopilot(input: CopilotInput): Promise<EngineResult<CopilotOutput>>;
}
