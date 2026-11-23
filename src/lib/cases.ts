/**
 * A "case" is one risk finding seen together with its documents, the checks that
 * made it fire, the decision workflow and its money effect. Everything here is
 * deterministic and pure, so it can run on the client, on the server and in tests.
 */
import type { CountryCode } from '@/data/multiCountryTaxData';
import type { TaxDocument } from './domain';
import { RULES, type FindingReview, type RiskFinding, type WorkspaceDocument } from './compliance';
import { TAX_CONFIG } from './tax';
import { money } from './format';

export type CheckStatus = 'fail' | 'warn' | 'pass';

export type DocField =
  | 'number'
  | 'date'
  | 'counterparty'
  | 'counterpartyTaxId'
  | 'taxableBase'
  | 'taxAmount'
  | 'totalAmount'
  | 'ownershipPercentage'
  | 'invoiceUuid';

export interface CaseCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  documentId?: string;
  field?: DocField;
}

export const FIELD_LABEL: Record<DocField, string> = {
  number: 'Nomor',
  date: 'Tanggal',
  counterparty: 'Lawan transaksi',
  counterpartyTaxId: 'NPWP / Tax ID',
  taxableBase: 'DPP',
  taxAmount: 'Pajak',
  totalAmount: 'Total',
  ownershipPercentage: 'Kepemilikan',
  invoiceUuid: 'UUID e-invoice',
};

const DOC_CHECKS: Record<string, ('taxid' | 'math' | 'evidence' | 'deductible' | 'uuid' | 'confidence')[]> = {
  TBTS: ['taxid', 'math', 'evidence', 'confidence'],
  MISSING_TRADER: ['taxid', 'math', 'evidence'],
  MYINVOIS_UUID: ['uuid', 'evidence'],
  NON_DEDUCTIBLE: ['evidence', 'deductible'],
  SPLIT_INVOICING: ['taxid'],
  Z_SCORE: ['evidence', 'confidence'],
  XV_TAXID: ['taxid', 'confidence'],
  XV_NAME: ['taxid', 'confidence'],
  XV_OWNERSHIP: ['confidence'],
};

const FIELDS: DocField[] = ['number', 'date', 'counterparty', 'counterpartyTaxId', 'taxableBase', 'taxAmount', 'totalAmount', 'ownershipPercentage', 'invoiceUuid'];

export function hasAiFields(doc: TaxDocument): boolean {
  return FIELDS.some((field) => doc[field].source === 'ai');
}

export function lowestConfidence(doc: TaxDocument): { field: DocField; confidence: number } | null {
  let lowest: { field: DocField; confidence: number } | null = null;
  for (const field of FIELDS) {
    const c = doc[field].confidence;
    if (typeof c !== 'number' || doc[field].source === 'manual') continue;
    if (!lowest || c < lowest.confidence) lowest = { field, confidence: c };
  }
  return lowest;
}

export function expectedTax(doc: TaxDocument): number {
  return Math.round(doc.taxableBase.value * TAX_CONFIG[doc.country].indirectRate);
}

function docChecks(rule: string, doc: TaxDocument): CaseCheck[] {
  const kinds = DOC_CHECKS[rule] ?? [];
  const out: CaseCheck[] = [];
  const c = doc.country;
  const tag = doc.number.value;
  for (const kind of kinds) {
    if (kind === 'taxid') {
      out.push(
        doc.taxIdValidated
          ? { id: `taxid:${doc.id}`, label: 'Identitas pajak vendor', status: 'pass', detail: `${doc.counterpartyTaxId.value} tervalidasi`, documentId: doc.id, field: 'counterpartyTaxId' }
          : { id: `taxid:${doc.id}`, label: 'Identitas pajak vendor', status: 'fail', detail: `${doc.counterpartyTaxId.value} belum tervalidasi ke data resmi`, documentId: doc.id, field: 'counterpartyTaxId' },
      );
    }
    if (kind === 'math' && doc.type === 'e_invoice') {
      const exp = expectedTax(doc);
      const diff = doc.taxAmount.value - exp;
      const rate = Math.round(TAX_CONFIG[c].indirectRate * 1000) / 10;
      out.push({
        id: `math:${doc.id}`,
        label: 'Hitungan pajak',
        status: Math.abs(diff) <= 1 ? 'pass' : 'fail',
        detail: Math.abs(diff) <= 1
          ? `${money(doc.taxAmount.value, c)} = ${rate}% × DPP`
          : `${money(doc.taxAmount.value, c)} ≠ ${rate}% × DPP (${money(exp, c)}), selisih ${money(diff, c)}`,
        documentId: doc.id,
        field: 'taxAmount',
      });
    }
    if (kind === 'evidence') {
      out.push({
        id: `evidence:${doc.id}`,
        label: 'Bukti pendukung',
        status: doc.hasSupportingEvidence ? 'pass' : 'fail',
        detail: doc.hasSupportingEvidence ? `${tag}: kontrak/PO/bukti bayar tersedia` : `${tag}: tidak ada kontrak, PO, atau bukti bayar terlampir`,
        documentId: doc.id,
      });
    }
    if (kind === 'deductible') {
      out.push({
        id: `deductible:${doc.id}`,
        label: 'Dapat dibiayakan',
        status: doc.deductible ? 'pass' : 'warn',
        detail: doc.deductible ? 'Ditandai dapat dibiayakan' : 'Ditandai tidak dapat dibiayakan (mis. jamuan tanpa daftar nominatif)',
        documentId: doc.id,
      });
    }
    if (kind === 'uuid') {
      const has = Boolean(doc.invoiceUuid.value.trim());
      out.push({ id: `uuid:${doc.id}`, label: 'UUID MyInvois', status: has ? 'pass' : 'fail', detail: has ? doc.invoiceUuid.value : `${tag}: UUID kosong`, documentId: doc.id, field: 'invoiceUuid' });
    }
    if (kind === 'confidence') {
      const low = lowestConfidence(doc);
      if (low) {
        out.push({
          id: `confidence:${doc.id}`,
          label: 'Keyakinan ekstraksi',
          status: low.confidence < 0.9 ? 'warn' : 'pass',
          detail: `${tag}: terendah pada ${FIELD_LABEL[low.field]} (${Math.round(low.confidence * 100)}%)`,
          documentId: doc.id,
          field: low.field,
        });
      }
    }
  }
  return out;
}

/** The checks that explain a finding, failing ones first. */
export function caseChecks(finding: RiskFinding, documents: WorkspaceDocument[]): CaseCheck[] {
  const related = documents.filter((d) => finding.documentIds.includes(d.doc.id)).map((d) => d.doc);
  const checks: CaseCheck[] = [];

  if (finding.rule === 'SPLIT_INVOICING' && related.length) {
    const total = related.reduce((s, d) => s + d.totalAmount.value, 0);
    checks.push({ id: 'split', label: 'Invoice pada tanggal yang sama', status: 'fail', detail: `${related.length} invoice ${related[0].counterparty.value} pada ${related[0].date.value}, total ${money(total, finding.country)}` });
    const ids = new Set(related.map((d) => d.counterpartyTaxId.value));
    if (ids.size > 1) checks.push({ id: 'split-taxid', label: 'NPWP dalam satu kelompok', status: 'fail', detail: `${ids.size} NPWP berbeda: ${[...ids].join(', ')}` });
  }
  if (finding.rule === 'Z_SCORE') {
    const m = /Z-Score (-?\d+(?:\.\d+)?)/.exec(finding.explanation);
    checks.push({ id: 'zscore', label: 'Penyimpangan nilai', status: 'fail', detail: m ? `Z-score ${m[1].replace('.', ',')} terhadap histori invoice entitas (ambang |2|)` : finding.explanation });
  }
  if (finding.rule === 'XV_OWNERSHIP') {
    const total = related.reduce((s, d) => s + (d.ownershipPercentage.value ?? 0), 0);
    checks.push({ id: 'ownership', label: 'Total kepemilikan', status: Math.abs(total - 100) < 0.01 ? 'pass' : 'fail', detail: `${related.map((d) => `${d.ownershipPercentage.value}%`).join(' + ')} = ${total}%`, field: 'ownershipPercentage' });
  }
  if (finding.rule === 'XV_NAME' || finding.rule === 'XV_TAXID') {
    const names = new Set(related.map((d) => d.counterparty.value));
    const ids = new Set(related.map((d) => d.counterpartyTaxId.value));
    checks.push({
      id: 'xv',
      label: finding.rule === 'XV_NAME' ? 'Nama untuk satu NPWP' : 'NPWP untuk satu nama',
      status: 'fail',
      detail: finding.rule === 'XV_NAME' ? `${[...ids][0]} dipakai oleh: ${[...names].join(' · ')}` : `${[...names][0]} memakai: ${[...ids].join(' · ')}`,
      field: finding.rule === 'XV_NAME' ? 'counterparty' : 'counterpartyTaxId',
    });
  }

  for (const doc of related) checks.push(...docChecks(finding.rule, doc));
  const order: Record<CheckStatus, number> = { fail: 0, warn: 1, pass: 2 };
  return checks.sort((a, b) => order[a.status] - order[b.status]);
}

/** Fields to highlight on a document because a failing/warning check points at them. */
export function flaggedFields(checks: CaseCheck[], documentId: string): Set<DocField> {
  return new Set(checks.filter((c) => c.status !== 'pass' && c.field && (!c.documentId || c.documentId === documentId)).map((c) => c.field!));
}

// ---------------------------------------------------------------------------
// Case context: the compact, serialisable view sent to the AI routes
// ---------------------------------------------------------------------------
export interface CaseDocument {
  id: string;
  type: TaxDocument['type'];
  number: string;
  date: string;
  counterparty: string;
  taxId: string;
  taxIdValidated: boolean;
  base: number;
  tax: number;
  total: number;
  ownership: number | null;
  uuid: string;
  evidence: boolean;
  deductible: boolean;
  account?: string;
}

export interface CaseContext {
  findingId: string;
  rule: string;
  ruleName: string;
  basis: string;
  entityName: string;
  country: CountryCode;
  severity: string;
  status: string;
  explanation: string;
  remediation: string;
  amountAtRisk: number;
  correction?: { accountCode: string; accountName: string; amount: number };
  documents: CaseDocument[];
  checks: { label: string; status: CheckStatus; detail: string }[];
  /** Brief lines from a stored investigation, when one exists. */
  brief?: string[];
}

export function toCaseDocument(d: WorkspaceDocument): CaseDocument {
  const doc = d.doc;
  return {
    id: doc.id,
    type: doc.type,
    number: doc.number.value,
    date: doc.date.value,
    counterparty: doc.counterparty.value,
    taxId: doc.counterpartyTaxId.value,
    taxIdValidated: doc.taxIdValidated,
    base: doc.taxableBase.value,
    tax: doc.taxAmount.value,
    total: doc.totalAmount.value,
    ownership: doc.ownershipPercentage.value,
    uuid: doc.invoiceUuid.value,
    evidence: doc.hasSupportingEvidence,
    deductible: doc.deductible,
    account: d.ledger ? `${d.ledger.accountCode} ${d.ledger.accountName}` : undefined,
  };
}

export function buildCaseContext(
  finding: RiskFinding,
  documents: WorkspaceDocument[],
  entityName: string,
  review: FindingReview,
  brief?: string[],
): CaseContext {
  const related = documents.filter((d) => finding.documentIds.includes(d.doc.id));
  return {
    findingId: finding.id,
    rule: finding.rule,
    ruleName: finding.ruleName,
    basis: RULES[finding.rule]?.basis ?? '',
    entityName,
    country: finding.country,
    severity: finding.severity,
    status: review.status,
    explanation: finding.explanation,
    remediation: finding.remediation,
    amountAtRisk: finding.amountAtRisk,
    correction: finding.correction ? { accountCode: finding.correction.accountCode, accountName: finding.correction.accountName, amount: finding.correction.amount } : undefined,
    documents: related.map(toCaseDocument),
    checks: caseChecks(finding, documents).map(({ label, status, detail }) => ({ label, status, detail })),
    brief,
  };
}
