import type { z } from 'zod';
import { getCountryAdapter } from '@/lib/adapters';
import { createEngine, getEngineStatus } from '@/lib/ai';
import { auditLogEntrySchema, type AuditLogEntry, type UserRole } from '@/lib/domain';
import { getRepository, type NexoraRepository } from '@/lib/repositories';
import { ApiError } from '@/lib/server/api';
import { getFeatureFlags } from '@/lib/server/features';
import { TAX_CONFIG, simulateTax } from '@/lib/tax';
import { demoWorkspace } from '@/data/sample/demoWorkspace';
import {
  type AdjustmentInput,
  auditQuerySchema,
  copilotRequestSchema,
  documentExtractRequestSchema,
  exportRequestSchema,
  findingPatchSchema,
  reconciliationRequestSchema,
  treatySimulationRequestSchema,
} from './schemas';

type Workspace = Awaited<ReturnType<NexoraRepository['loadWorkspace']>>;
type Entity = Workspace['entities'][number];
type ExtractRequest = z.infer<typeof documentExtractRequestSchema>;
type FindingPatchRequest = z.infer<typeof findingPatchSchema>;
type ReconciliationRequest = z.infer<typeof reconciliationRequestSchema>;
type ExportRequest = z.infer<typeof exportRequestSchema>;
type CopilotRequest = z.infer<typeof copilotRequestSchema>;
type TreatyRequest = z.infer<typeof treatySimulationRequestSchema>;
type AuditQuery = z.infer<typeof auditQuerySchema>;

function now(): string {
  return new Date().toISOString();
}

function getEntity(workspace: Workspace, entityId: string): Entity {
  const entity = workspace.entities.find((item) => item.id === entityId);
  if (!entity) throw new ApiError('E-VAL-404', `Entity ${entityId} tidak ditemukan.`, 404);
  return entity;
}

async function appendAudit(
  repository: NexoraRepository,
  entry: {
    actor: string;
    role: UserRole;
    action: string;
    targetType: string;
    targetId: string;
    beforeValue?: unknown;
    afterValue?: unknown;
    notes?: string;
    correlationId?: string;
  },
): Promise<void> {
  const timestamp = now();
  const log: AuditLogEntry = auditLogEntrySchema.parse({
    id: `AUD-${crypto.randomUUID()}`,
    timestamp,
    ...entry,
    status: 'recorded',
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
  });
  await repository.appendAuditLog(log);
}

function buildAdjustmentLines(entityId: string, adjustments: AdjustmentInput[]) {
  const timestamp = now();
  return adjustments.map((adjustment, index) => ({
    id: `ADJ-${index + 1}`,
    entityId,
    description: adjustment.description ?? adjustment.accountName ?? `Adjustment ${index + 1}`,
    commercialAmount: adjustment.commercialAmount ?? 0,
    positiveCorrection: adjustment.positiveCorrection ?? adjustment.positive ?? 0,
    negativeCorrection: adjustment.negativeCorrection ?? adjustment.negative ?? 0,
    findingId: adjustment.findingId,
    ruleBasis: adjustment.ruleBasis,
    status: adjustment.status ?? 'needs_verification',
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
  }));
}

function escapeXml(value: string | number): string {
  return String(value).replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  }[character] ?? character));
}

export async function loadDemoWorkspace(actor = 'Demo Consultant'): Promise<Workspace> {
  const repository = getRepository();
  await repository.saveWorkspace(demoWorkspace);
  await appendAudit(repository, {
    actor,
    role: 'Konsultan Pajak',
    action: 'demo.load',
    targetType: 'workspace',
    targetId: 'workspace',
    notes: 'Dataset demo fiktif dimuat melalui API.',
  });
  return repository.loadWorkspace();
}

export async function getWorkspaceSummary(): Promise<{
  workspace: Workspace;
  repositoryDriver: string;
}> {
  const repository = getRepository();
  return {
    workspace: await repository.loadWorkspace(),
    repositoryDriver: repository.driver,
  };
}

export async function extractDocument(input: ExtractRequest) {
  const repository = getRepository();
  const workspace = await repository.loadWorkspace();
  const document = workspace.documents.find((item) => item.id === input.documentId);
  if (!document) throw new ApiError('E-VAL-404', `Dokumen ${input.documentId} tidak ditemukan.`, 404);

  const result = await createEngine().extract({ document, text: input.text });
  await appendAudit(repository, {
    actor: 'Demo Consultant',
    role: 'Konsultan Pajak',
    action: 'document.extract',
    targetType: 'document',
    targetId: document.id,
    notes: result.meta.fallback ? 'Live engine fallback ke demo.' : undefined,
  });
  return result;
}

export async function crossCheckDocuments(entityId: string) {
  const repository = getRepository();
  const workspace = await repository.loadWorkspace();
  const entity = getEntity(workspace, entityId);
  const documents = workspace.documents.filter((document) => document.entityId === entityId);
  return createEngine().crossCheck({ entity, documents });
}

export async function analyzeRisk(entityId: string) {
  const repository = getRepository();
  const workspace = await repository.loadWorkspace();
  const entity = getEntity(workspace, entityId);
  const documents = workspace.documents.filter((document) => document.entityId === entityId);
  const ownerships = workspace.ownerships.filter((link) => link.ownerId === entityId || link.ownedId === entityId);
  const result = await createEngine().analyzeRisk({ entity, documents, ownerships });

  const existing = new Map((workspace.findings ?? []).map((finding) => [finding.id, finding]));
  for (const finding of result.data.findings) existing.set(finding.id, finding);
  workspace.findings = Array.from(existing.values());
  await repository.saveWorkspace(workspace);
  await appendAudit(repository, {
    actor: 'Demo Consultant',
    role: 'Konsultan Pajak',
    action: 'risk.analyze',
    targetType: 'entity',
    targetId: entityId,
    notes: `Menghasilkan ${result.data.findings.length} temuan dengan mode ${result.meta.mode}.`,
  });
  return result;
}

export async function updateFinding(id: string, patch: FindingPatchRequest) {
  const repository = getRepository();
  const before = await repository.getFinding(id);
  if (!before) throw new ApiError('E-VAL-404', `Finding ${id} tidak ditemukan.`, 404);
  const actor = patch.actor ?? patch.reviewer ?? 'Demo Reviewer';
  const after = await repository.updateFinding(id, {
    status: patch.status,
    reviewer: patch.reviewer ?? actor,
    reviewerNotes: patch.reviewerNotes,
  });
  if (!after) throw new ApiError('E-VAL-404', `Finding ${id} tidak ditemukan.`, 404);

  await appendAudit(repository, {
    actor,
    role: patch.role ?? 'Konsultan Pajak',
    action: 'finding.review',
    targetType: 'finding',
    targetId: id,
    beforeValue: before,
    afterValue: after,
    notes: patch.reviewerNotes,
  });
  return after;
}

export async function computeReconciliation(input: ReconciliationRequest) {
  const repository = getRepository();
  const workspace = await repository.loadWorkspace();
  const entity = getEntity(workspace, input.entityId);
  const adapter = getCountryAdapter(entity.country);
  const lines = buildAdjustmentLines(entity.id, input.adjustments);
  const positiveCorrections = lines.reduce((sum, line) => sum + line.positiveCorrection, 0);
  const negativeCorrections = lines.reduce((sum, line) => sum + line.negativeCorrection, 0);
  const taxableIncome = Math.max(0, input.commercialProfit + positiveCorrections - negativeCorrections);
  const tax = adapter.calculateCorporateTax({
    taxableIncome,
    grossRevenue: Math.max(input.commercialProfit, 1),
  });

  return {
    entityId: entity.id,
    country: entity.country,
    fiscalYear: input.fiscalYear,
    lines,
    commercialProfit: input.commercialProfit,
    positiveCorrections,
    negativeCorrections,
    taxableIncome,
    taxDue: tax.taxDue,
    effectiveRate: tax.effectiveRate,
    breakdown: tax.breakdown,
    explanation: tax.explanation,
    assumptions: [
      'Perhitungan memakai tarif adapter negara dan data demo.',
      'Setiap baris perlu diverifikasi reviewer sebelum dipakai.',
      'Draf bukan untuk disampaikan ke otoritas pajak.',
    ],
  };
}

export async function exportReconciliation(input: ExportRequest) {
  if (input.format === 'pdf' && !getFeatureFlags().pdfExport) {
    throw new ApiError('E-EXP-001', 'PDF export belum diaktifkan pada build ini.', 501);
  }
  if (input.format === 'pdf') {
    throw new ApiError('E-EXP-001', 'PDF export belum diimplementasikan. Gunakan JSON atau XML.', 501);
  }

  const result = await computeReconciliation(input);
  const repository = getRepository();
  const workspace = await repository.loadWorkspace();
  const entity = getEntity(workspace, input.entityId);
  const adapter = getCountryAdapter(entity.country);
  const generatedAt = now();
  const watermark = adapter.returnFormTemplate.watermark;
  const draft = {
    schemaVersion: adapter.returnFormTemplate.schemaVersion,
    generatedAt,
    formType: adapter.returnFormTemplate.formType,
    officialSubmission: false,
    watermark,
    entity,
    amounts: {
      commercialProfit: result.commercialProfit,
      positiveCorrections: result.positiveCorrections,
      negativeCorrections: result.negativeCorrections,
      taxableIncome: result.taxableIncome,
      taxDue: result.taxDue,
    },
    assumptions: result.assumptions,
  };

  if (input.format === 'json') return { format: 'json' as const, draft, watermark };

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<NexoraDraft schemaVersion="${escapeXml(draft.schemaVersion)}" officialSubmission="false">`,
    `<Watermark>${escapeXml(watermark)}</Watermark>`,
    `<Form>${escapeXml(draft.formType)}</Form>`,
    `<Entity country="${escapeXml(entity.country)}"><Name>${escapeXml(entity.name)}</Name><TaxId>${escapeXml(entity.taxId)}</TaxId></Entity>`,
    '<Amounts>',
    `<CommercialProfit>${draft.amounts.commercialProfit}</CommercialProfit>`,
    `<PositiveCorrections>${draft.amounts.positiveCorrections}</PositiveCorrections>`,
    `<NegativeCorrections>${draft.amounts.negativeCorrections}</NegativeCorrections>`,
    `<TaxableIncome>${draft.amounts.taxableIncome}</TaxableIncome>`,
    `<TaxDue>${draft.amounts.taxDue}</TaxDue>`,
    '</Amounts>',
    '</NexoraDraft>',
  ].join('');

  return { format: 'xml' as const, draft, watermark, xml };
}

export async function askCopilot(input: CopilotRequest) {
  const repository = getRepository();
  const workspace = await repository.loadWorkspace();
  const sources = workspace.sourceDocuments ?? [];
  return createEngine().askCopilot({
    question: input.question,
    country: input.country,
    sources,
    context: input.context,
  });
}

export async function runTreatySimulation(input: TreatyRequest) {
  const base = simulateTax(input);
  const domestic = TAX_CONFIG[input.country].domesticWht;
  const treaty = TAX_CONFIG[input.country].treatyWht;
  return {
    country: input.country,
    partnerCountry: input.partnerCountry,
    withholding: {
      beforeRate: domestic,
      afterRate: input.treatyEligible ? treaty : domestic,
      beforeAmount: input.crossBorderPayment * domestic,
      afterAmount: input.crossBorderPayment * (input.treatyEligible ? treaty : domestic),
    },
    corporateTax: base.corporateTax,
    indirectTax: base.indirectTax,
    pillarTwo: {
      applies: base.pillarTwoApplies,
      topUp: base.pillarTwoTopUp,
    },
    assumptions: [
      'Simulasi memakai tarif ringkas dan tidak memodelkan seluruh pengecualian P3B.',
      'Tarif, syarat dokumen, dan penerapan Pillar Two perlu diverifikasi dengan sumber resmi.',
      'Hasil bukan nasihat pajak atau perhitungan final.',
    ],
  };
}

export async function listAudit(filter: AuditQuery) {
  return getRepository().listAuditLogs(filter);
}

export function getHealth() {
  const engine = getEngineStatus();
  return {
    status: 'ok' as const,
    timestamp: now(),
    engine,
    repository: getRepository().driver,
    features: getFeatureFlags(),
    gcp: {
      gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
      documentAi: false,
      bigQuery: false,
      vertexAi: false,
      cloudRun: false,
    },
    notice: engine.reason,
  };
}
