import type { Finding, FindingEvidence } from '@/lib/domain';
import { crossValidateDocuments } from '@/lib/crossValidation';
import { detectFraud } from '@/lib/fraud';
import { validateOwnership } from '@/lib/ownership';
import {
  AIEngine,
  CopilotInput,
  CopilotOutput,
  CrossCheckInput,
  CrossCheckOutput,
  EngineResult,
  ExtractInput,
  ExtractOutput,
  RiskInput,
  RiskOutput,
  copilotInputSchema,
  copilotOutputSchema,
  crossCheckInputSchema,
  crossCheckOutputSchema,
  extractInputSchema,
  extractOutputSchema,
  riskInputSchema,
  riskOutputSchema,
} from './contracts';
import { retrieveChunks } from './retrieval';

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+prompt/i,
  /abaikan\s+(semua\s+)?instruksi/i,
  /reveal\s+(the\s+)?(key|secret|token)/i,
];

export class DemoEngine implements AIEngine {
  readonly mode = 'demo' as const;

  private result<T>(data: T, startedAt: number, notice?: string): EngineResult<T> {
    return {
      data,
      meta: {
        mode: 'demo',
        provider: 'deterministic',
        model: 'nexora-demo-v1',
        fallback: false,
        notice,
        durationMs: Date.now() - startedAt,
      },
    };
  }

  async extract(input: ExtractInput): Promise<EngineResult<ExtractOutput>> {
    const startedAt = Date.now();
    const { document, text } = extractInputSchema.parse(input);
    const rawFields = [
      { key: 'invoiceNumber', label: 'Invoice number', value: document.number.value, confidence: document.number.confidence },
      { key: 'invoiceDate', label: 'Invoice date', value: document.date.value, confidence: document.date.confidence },
      { key: 'counterparty', label: 'Counterparty', value: document.counterparty.value, confidence: document.counterparty.confidence },
      { key: 'counterpartyTaxId', label: 'Counterparty tax ID', value: document.counterpartyTaxId.value, confidence: document.counterpartyTaxId.confidence },
      { key: 'taxableBase', label: 'Taxable base', value: String(document.taxableBase.value), confidence: document.taxableBase.confidence },
      { key: 'taxAmount', label: 'Tax amount', value: String(document.taxAmount.value), confidence: document.taxAmount.confidence },
      { key: 'totalAmount', label: 'Total amount', value: String(document.totalAmount.value), confidence: document.totalAmount.confidence },
    ];

    const fields = rawFields.map((field, index) => {
      const confidence = field.confidence ?? 0.9;
      return {
        id: `${document.id}:field:${index + 1}`,
        documentId: document.id,
        key: field.key,
        label: field.label,
        value: field.value,
        confidence,
        status: confidence < 0.8 ? 'needs_review' as const : 'extracted' as const,
        sourceRef: `${document.attachmentName}${text ? ' (provided text)' : ' (structured metadata)'}`,
      };
    });

    const warnings = [
      'Demo extraction memakai metadata dokumen terstruktur; tidak ada OCR atau Document AI.',
      ...(text ? ['Teks yang diberikan tidak dikirim ke layanan eksternal.'] : []),
    ];

    return this.result(extractOutputSchema.parse({
      documentId: document.id,
      fields,
      warnings,
    }), startedAt, warnings[0]);
  }

  async crossCheck(input: CrossCheckInput): Promise<EngineResult<CrossCheckOutput>> {
    const startedAt = Date.now();
    const { entity, documents } = crossCheckInputSchema.parse(input);
    const issues = crossValidateDocuments(entity, documents).map((issue) => ({
      documentId: issue.documentId,
      field: issue.field,
      message: issue.message,
    }));
    return this.result(crossCheckOutputSchema.parse({
      issues,
      checkedDocuments: documents.length,
    }), startedAt);
  }

  async analyzeRisk(input: RiskInput): Promise<EngineResult<RiskOutput>> {
    const startedAt = Date.now();
    const { entity, documents, ownerships = [] } = riskInputSchema.parse(input);
    const fraud = detectFraud(documents);
    const findings: Finding[] = fraud.findings.map((item) => {
      const category = item.rule === 'NON_DEDUCTIBLE' ? 'compliance' as const : 'fraud' as const;
      const severity = item.severity;
      const score = severity === 'critical' ? 90 : severity === 'high' ? 75 : 50;
      const evidence: FindingEvidence[] = [{
        field: 'invoice',
        expected: 'Invoice konsisten dengan data vendor dan aturan pajak',
        actual: item.evidence,
        sourceRef: item.id,
        confidence: 0.8,
      }];
      return {
        id: `DEMO-${item.rule}-${item.id}`,
        entityId: entity.id,
        ruleId: `DEMO_${item.rule}`,
        ruleName: item.rule,
        category,
        severity,
        score,
        confidence: 0.8,
        reason: item.explanation,
        evidence,
        recommendation: item.remediation,
        status: 'Baru' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      };
    });

    for (const issue of validateOwnership([entity], ownerships)) {
      const circular = issue.type === 'circular';
      findings.push({
        id: `DEMO-OWNERSHIP-${circular ? 'CIRCULAR' : 'TOTAL'}-${entity.id}`,
        entityId: entity.id,
        ruleId: circular ? 'DEMO_OWN_CIRCULAR' : 'DEMO_OWN_TOTAL',
        ruleName: circular ? 'Kepemilikan melingkar' : 'Total kepemilikan tidak 100%',
        category: 'compliance',
        severity: 'high',
        score: 70,
        confidence: 0.75,
        reason: issue.message,
        evidence: [{
          field: 'ownership',
          expected: circular ? 'Tidak ada siklus kepemilikan' : 'Total 100%',
          actual: issue.message,
          sourceRef: entity.id,
        }],
        recommendation: 'Tinjau struktur kepemilikan dan dokumen sumber sebelum mengambil tindakan.',
        status: 'Baru',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      });
    }

    const deduped = Array.from(new Map(findings.map((finding) => [finding.id, finding])).values());
    return this.result(riskOutputSchema.parse({
      findings: deduped,
      rulesEvaluated: 7,
      zScoreReady: fraud.zScoreReady,
    }), startedAt);
  }

  async askCopilot(input: CopilotInput): Promise<EngineResult<CopilotOutput>> {
    const startedAt = Date.now();
    const parsed = copilotInputSchema.parse(input);
    const injection = INJECTION_PATTERNS.find((pattern) => pattern.test(parsed.question));
    if (injection) {
      return this.result(copilotOutputSchema.parse({
        answer: 'Permintaan ditolak karena berisi pola instruksi yang mencoba mengubah aturan sistem. Isi dokumen dan pertanyaan diperlakukan sebagai data, bukan instruksi.',
        citations: [],
        grounded: false,
        refused: true,
        confidence: 0.15,
      }), startedAt, 'Pola prompt injection terdeteksi dan ditolak.');
    }

    const matches = retrieveChunks(parsed.sources, parsed.question);
    if (matches.length === 0) {
      return this.result(copilotOutputSchema.parse({
        answer: 'Tidak ditemukan dasar yang cukup pada korpus demo untuk menjawab pertanyaan ini. Silakan konsultasikan dengan ahli pajak dan verifikasi teks resmi.',
        citations: [],
        grounded: false,
        refused: true,
        confidence: 0.15,
      }), startedAt, 'Tidak ada sumber relevan pada korpus demo.');
    }

    const citations = matches.map((match, index) => ({
      id: `CIT-${index + 1}`,
      sourceDocumentId: match.source.id,
      sourceTitle: match.source.title,
      publisher: match.source.publisher,
      article: match.chunk.article,
      textSnippet: match.chunk.text.slice(0, 400),
      url: match.source.url,
      accessedAt: match.source.accessedAt,
      version: match.source.version,
    }));

    const answer = [
      'Berdasarkan korpus demo yang tersedia:',
      ...matches.map((match) => `- ${match.source.title}, ${match.chunk.article}: ${match.chunk.text}`),
      'Korpus ini adalah materi demo internal, bukan nasihat pajak. Verifikasi dengan teks resmi terbaru dan ahli sebelum mengambil keputusan.',
    ].join('\n');

    const unverified = matches.some((match) => !match.source.verified);
    return this.result(copilotOutputSchema.parse({
      answer,
      citations,
      grounded: true,
      refused: false,
      confidence: Math.min(0.9, 0.55 + matches.length * 0.1),
    }), startedAt, unverified ? 'Sebagian sumber demo belum diverifikasi secara eksternal.' : undefined);
  }
}
