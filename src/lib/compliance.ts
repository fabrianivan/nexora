/**
 * Nexora Compliance Workspace
 * ---------------------------------------------------------------------------
 * Connects the document → risk → review → reconciliation loop:
 *   1. Documents (sample e-invoices & registers per entity, or uploads)
 *   2. Risk engine: `detectFraud` + `crossValidateDocuments` (existing rules)
 *   3. Enriched findings (score, money at risk, suggested fiscal correction)
 *   4. Maker-checker review decisions with an immutable history trail
 *
 * Everything here is pure and deterministic so it can be unit-tested and run
 * in the browser without an API key.
 */
import type { CountryCode, TaxDocument } from './domain';
import { detectFraud, type Severity } from './fraud';
import { crossValidateDocuments } from './crossValidation';
import { TAX_CONFIG } from './tax';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type DocumentStatus = 'extracting' | 'extracted' | 'verified';
export type FindingCategory = 'fraud' | 'compliance' | 'cross_validation';
export type ReviewStatus = 'open' | 'proposed' | 'confirmed' | 'dismissed';
export type ReviewAction = 'confirm' | 'dismiss';

export interface LedgerLink {
  accountCode: string;
  accountName: string;
}

export interface WorkspaceDocument {
  doc: TaxDocument;
  status: DocumentStatus;
  uploadedBy: string;
  ledger?: LedgerLink;
}

export interface SuggestedCorrection extends LedgerLink {
  amount: number;
  basis: string;
}

export interface RiskFinding {
  id: string;
  entityId: string;
  country: CountryCode;
  severity: Severity;
  rule: string;
  ruleName: string;
  category: FindingCategory;
  explanation: string;
  evidence: string;
  remediation: string;
  date: string;
  documentIds: string[];
  amountAtRisk: number;
  taxImpact: number;
  score: number;
  correction?: SuggestedCorrection;
}

export interface ReviewEvent {
  at: string;
  by: string;
  role: string;
  action: 'proposed' | 'approved' | 'rejected' | 'reopened' | 'correction_applied';
  note?: string;
}

export interface FindingReview {
  status: ReviewStatus;
  proposal?: { action: ReviewAction; byId: string; by: string; role: string; note: string; at: string };
  decidedBy?: string;
  correctionApplied?: boolean;
  history: ReviewEvent[];
}

export interface ComplianceState {
  version: 1;
  documents: WorkspaceDocument[];
  reviews: Record<string, FindingReview>;
}

export interface Actor {
  id: string;
  name: string;
  role: string;
  isParentExecutive: boolean;
}

// ---------------------------------------------------------------------------
// Rule catalogue
// ---------------------------------------------------------------------------
export const RULES: Record<string, { name: string; category: FindingCategory; basis: string }> = {
  TBTS: { name: 'Faktur Pajak TBTS', category: 'fraud', basis: 'Pasal 39A UU KUP · Pasal 6 ayat (1) UU PPh' },
  MISSING_TRADER: { name: 'Missing Trader (GST)', category: 'fraud', basis: 'GST Act s.33A (IRAS)' },
  SPLIT_INVOICING: { name: 'Split invoicing', category: 'fraud', basis: 'Kebijakan otorisasi pembelian internal' },
  Z_SCORE: { name: 'Anomali nilai invoice (Z-Score)', category: 'fraud', basis: 'Analitik statistik histori vendor' },
  MYINVOIS_UUID: { name: 'UUID MyInvois tidak ada', category: 'compliance', basis: 'LHDN e-Invoice Guideline v4.x' },
  NON_DEDUCTIBLE: { name: 'Biaya tanpa bukti / non-deductible', category: 'compliance', basis: 'Pasal 6 & Pasal 9 ayat (1) UU PPh' },
  XV_TAXID: { name: 'Identitas pajak vendor tidak konsisten', category: 'cross_validation', basis: 'Validasi silang master data vendor' },
  XV_NAME: { name: 'Satu NPWP dipakai nama berbeda', category: 'cross_validation', basis: 'Validasi silang master data vendor' },
  XV_OWNERSHIP: { name: 'Register saham ≠ 100%', category: 'cross_validation', basis: 'UU PT No. 40/2007 · Perpres 13/2018 (BO)' },
};

const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 90, high: 70, medium: 45 };

// ---------------------------------------------------------------------------
// Sample documents (deterministic, realistic multi-entity dataset)
// ---------------------------------------------------------------------------
const CREATED = '2026-10-20T03:00:00.000Z';
const ai = <T,>(value: T, confidence = 0.97) => ({ value, source: 'ai' as const, confidence });

interface SampleInput {
  id: string;
  entityId: string;
  country: CountryCode;
  type?: TaxDocument['type'];
  number: string;
  date: string;
  vendor: string;
  vendorTaxId: string;
  base: number;
  tax?: number;
  uuid?: string;
  validated?: boolean;
  evidence?: boolean;
  deductible?: boolean;
  ownership?: number | null;
  confidence?: number;
  ledger?: LedgerLink;
  status?: DocumentStatus;
  uploadedBy?: string;
}

function sample(input: SampleInput): WorkspaceDocument {
  const rate = TAX_CONFIG[input.country].indirectRate;
  const type = input.type ?? 'e_invoice';
  const tax = input.tax ?? (type === 'e_invoice' ? Math.round(input.base * rate) : 0);
  const c = input.confidence ?? 0.97;
  const slug = input.number.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    status: input.status ?? 'verified',
    uploadedBy: input.uploadedBy ?? 'Document AI · auto-ingest',
    ledger: input.ledger,
    doc: {
      id: input.id,
      entityId: input.entityId,
      country: input.country,
      type,
      attachmentName: `${slug}.pdf`,
      attachmentType: 'application/pdf',
      attachmentSize: 180_000 + (input.base % 900_000),
      number: ai(input.number, c),
      date: ai(input.date, c),
      counterparty: ai(input.vendor, c),
      counterpartyTaxId: ai(input.vendorTaxId, c),
      taxableBase: ai(input.base, c),
      taxAmount: ai(tax, c),
      totalAmount: ai(input.base + tax, c),
      ownershipPercentage: ai(input.ownership ?? null, c),
      invoiceUuid: ai(input.uuid ?? `UUID-${input.id}`, c),
      taxIdValidated: input.validated ?? true,
      hasSupportingEvidence: input.evidence ?? true,
      deductible: input.deductible ?? true,
      createdAt: CREATED,
    },
  };
}

const COGS: LedgerLink = { accountCode: '5100', accountName: 'Beban Pokok Pendapatan' };
const MARKETING: LedgerLink = { accountCode: '6200', accountName: 'Beban Pemasaran, Jamuan & Representasi' };
const OPEX: LedgerLink = { accountCode: '6300', accountName: 'Beban Sewa Kantor, Utilitas & Operasional Umum' };

export const SAMPLE_DOCUMENTS: WorkspaceDocument[] = [
  // ── 🇮🇩 PT Nusantara Kreasi Digital Tbk ────────────────────────────────
  sample({ id: 'DOC-ID-001', entityId: 'ENT-ID-001', country: 'ID', number: '010.000-26.00004417', date: '2026-03-14', vendor: 'CV Mega Suplai Abadi', vendorTaxId: '0718293045123000', base: 120_000_000, tax: 12_000_000, validated: false, confidence: 0.91, ledger: COGS }),
  sample({ id: 'DOC-ID-002', entityId: 'ENT-ID-001', country: 'ID', number: '010.000-26.00005120', date: '2026-01-31', vendor: 'PT Awan Data Indonesia', vendorTaxId: '0213456789012000', base: 150_000_000, ledger: COGS }),
  sample({ id: 'DOC-ID-003', entityId: 'ENT-ID-001', country: 'ID', number: '010.000-26.00005388', date: '2026-02-28', vendor: 'PT Awan Data Indonesia', vendorTaxId: '0213456789012000', base: 152_500_000, ledger: COGS }),
  sample({ id: 'DOC-ID-004', entityId: 'ENT-ID-001', country: 'ID', number: '010.000-26.00005702', date: '2026-03-31', vendor: 'PT Awan Data Indonesia', vendorTaxId: '0213456789012000', base: 149_000_000, ledger: COGS }),
  sample({ id: 'DOC-ID-005', entityId: 'ENT-ID-001', country: 'ID', number: '010.000-26.00006015', date: '2026-04-30', vendor: 'PT Awan Data Indonesia', vendorTaxId: '0213456789012000', base: 151_000_000, ledger: COGS }),
  sample({ id: 'DOC-ID-006', entityId: 'ENT-ID-001', country: 'ID', number: '010.000-26.00007731', date: '2026-06-30', vendor: 'PT Awan Data Indonesia', vendorTaxId: '0213456789012000', base: 1_480_000_000, confidence: 0.94, ledger: COGS }),
  sample({ id: 'DOC-ID-007', entityId: 'ENT-ID-001', country: 'ID', number: '010.000-26.00008101', date: '2026-05-20', vendor: 'PT Sinar Logistik Nusantara', vendorTaxId: '0314567890123000', base: 45_000_000, ledger: OPEX }),
  sample({ id: 'DOC-ID-008', entityId: 'ENT-ID-001', country: 'ID', number: '010.000-26.00008102', date: '2026-05-20', vendor: 'PT Sinar Logistik Nusantara', vendorTaxId: '0314567890123000', base: 47_500_000, ledger: OPEX }),
  sample({ id: 'DOC-ID-009', entityId: 'ENT-ID-001', country: 'ID', number: '010.000-26.00008103', date: '2026-05-20', vendor: 'PT Sinar Logistik Nusantara', vendorTaxId: '0314567890999000', base: 49_000_000, confidence: 0.88, ledger: OPEX }),
  sample({ id: 'DOC-ID-010', entityId: 'ENT-ID-001', country: 'ID', number: '010.000-26.00009044', date: '2026-08-12', vendor: 'PT Restoran Kencana Prima', vendorTaxId: '0415678901234000', base: 18_333_333, evidence: false, deductible: false, ledger: MARKETING }),
  sample({ id: 'DOC-ID-011', entityId: 'ENT-ID-001', country: 'ID', number: '010.000-26.00009610', date: '2026-09-05', vendor: 'CV Prima Konsultindo', vendorTaxId: '0516789012345000', base: 12_500_000, evidence: false, confidence: 0.93, ledger: OPEX, status: 'extracted', uploadedBy: 'Bambang Soeprapto, BKP' }),
  // Shareholder register extracts (Daftar Pemegang Saham)
  sample({ id: 'DOC-ID-SH1', entityId: 'ENT-ID-001', country: 'ID', type: 'shareholder', number: 'DPS-2026/01', date: '2026-01-15', vendor: 'Merdeka Kapital Nusantara Tbk', vendorTaxId: '0198765432101000', base: 0, ownership: 45 }),
  sample({ id: 'DOC-ID-SH2', entityId: 'ENT-ID-001', country: 'ID', type: 'shareholder', number: 'DPS-2026/02', date: '2026-01-15', vendor: 'Archipelago Ventures Holding Pte. Ltd.', vendorTaxId: '0687654321098000', base: 0, ownership: 35 }),
  sample({ id: 'DOC-ID-SH3', entityId: 'ENT-ID-001', country: 'ID', type: 'shareholder', number: 'DPS-2026/03', date: '2026-01-15', vendor: 'BlueHorizon Pacific Partners LP', vendorTaxId: '0776543210987000', base: 0, ownership: 25, confidence: 0.84 }),

  // ── 🇸🇬 Nusantara FinTech Pte. Ltd. ─────────────────────────────────────
  sample({ id: 'DOC-SG-001', entityId: 'ENT-SG-002', country: 'SG', number: 'SG-INV-26-0412', date: '2026-04-12', vendor: 'Apex Trading Hub Pte. Ltd.', vendorTaxId: '53312345K', base: 84_000, validated: false, confidence: 0.9 }),
  sample({ id: 'DOC-SG-002', entityId: 'ENT-SG-002', country: 'SG', number: 'SG-INV-26-0519', date: '2026-05-19', vendor: 'CloudServe Asia Pte. Ltd.', vendorTaxId: '20151234A', base: 12_400 }),
  sample({ id: 'DOC-SG-003', entityId: 'ENT-SG-002', country: 'SG', number: 'SG-INV-26-0623', date: '2026-06-23', vendor: 'Raffles Legal LLP', vendorTaxId: '20099876C', base: 8_750 }),

  // ── 🇲🇾 Nusantara Digital Solutions Sdn. Bhd. ──────────────────────────
  sample({ id: 'DOC-MY-001', entityId: 'ENT-MY-003', country: 'MY', number: 'MY-EINV-26-1180', date: '2026-07-08', vendor: 'Kuala Data Centre Sdn. Bhd.', vendorTaxId: 'C2584910209', base: 46_000 }),
  sample({ id: 'DOC-MY-002', entityId: 'ENT-MY-003', country: 'MY', number: 'MY-EINV-26-1244', date: '2026-08-02', vendor: 'Seri Media Network Sdn. Bhd.', vendorTaxId: 'C1029384756', base: 18_500, uuid: '', confidence: 0.86 }),

  // ── 🇺🇸 Nusantara AI Technologies, Inc. ─────────────────────────────────
  sample({ id: 'DOC-US-001', entityId: 'ENT-US-004', country: 'US', number: 'US-INV-26-3301', date: '2026-05-02', vendor: 'Northwind Cloud LLC', vendorTaxId: '84-1234567', base: 38_000 }),
  sample({ id: 'DOC-US-002', entityId: 'ENT-US-004', country: 'US', number: 'US-INV-26-3377', date: '2026-07-14', vendor: 'Northwind Cloud Services LLC', vendorTaxId: '84-1234567', base: 41_500, confidence: 0.92 }),
];

export function createInitialComplianceState(): ComplianceState {
  const reviews: Record<string, FindingReview> = {};
  // One historical decision so the review trail isn't empty on first load.
  reviews['TBTS:DOC-ID-001'] = {
    status: 'confirmed',
    decidedBy: 'Sri Mulyani Dewi, S.E., Ak., CA',
    correctionApplied: true,
    proposal: { action: 'confirm', byId: 'consultant', by: 'Bambang Soeprapto, BKP', role: 'Konsultan Pajak (Maker)', note: 'Vendor tidak terdaftar PKP aktif & tanpa surat jalan.', at: '2026-10-24T02:10:00.000Z' },
    history: [
      { at: '2026-10-24T02:10:00.000Z', by: 'Bambang Soeprapto, BKP', role: 'Konsultan Pajak (Maker)', action: 'proposed', note: 'Konfirmasi: vendor tidak terdaftar PKP aktif & tanpa surat jalan.' },
      { at: '2026-10-25T07:30:00.000Z', by: 'Sri Mulyani Dewi, S.E., Ak., CA', role: 'Group CFO (Checker)', action: 'approved', note: 'Disetujui. Koreksi fiskal positif Rp 120 jt.' },
      { at: '2026-10-25T07:31:00.000Z', by: 'Sri Mulyani Dewi, S.E., Ak., CA', role: 'Group CFO (Checker)', action: 'correction_applied', note: 'Akun 5100 · +Rp 120.000.000' },
    ],
  };
  return { version: 1, documents: SAMPLE_DOCUMENTS, reviews };
}

/** Accepts anything loaded from storage and returns a usable state. */
export function normalizeComplianceState(raw: unknown): ComplianceState {
  if (!raw || typeof raw !== 'object') return createInitialComplianceState();
  const r = raw as Partial<ComplianceState>;
  if (r.version !== 1 || !Array.isArray(r.documents)) return createInitialComplianceState();
  return {
    version: 1,
    documents: r.documents.filter((d): d is WorkspaceDocument => Boolean(d && d.doc && d.doc.id)),
    reviews: r.reviews && typeof r.reviews === 'object' ? r.reviews : {},
  };
}

// ---------------------------------------------------------------------------
// Risk engine
// ---------------------------------------------------------------------------
function sumBy<T>(items: T[], f: (t: T) => number) {
  return items.reduce((s, t) => s + f(t), 0);
}

export function runRiskEngine(
  documents: WorkspaceDocument[],
  entities: { id: string; legalName: string; countryCode: CountryCode; taxId: string }[],
): { findings: RiskFinding[]; zScoreReady: boolean } {
  const docs = documents.map((d) => d.doc);
  const byId = new Map(documents.map((d) => [d.doc.id, d]));
  const { findings: raw, zScoreReady } = detectFraud(docs);

  const findings: RiskFinding[] = raw.map((f) => {
    const docIds = f.rule === 'SPLIT_INVOICING'
      ? docs.filter((d) => f.evidence.split(', ').includes(d.number.value)).map((d) => d.id)
      : [f.id.split(':')[1]];
    const related = docIds.map((id) => byId.get(id)).filter((x): x is WorkspaceDocument => Boolean(x));
    const amountAtRisk = sumBy(related, (d) => d.doc.totalAmount.value);
    const meta = RULES[f.rule] ?? { name: f.rule, category: 'fraud' as const, basis: '' };
    const primary = related[0];
    let correction: SuggestedCorrection | undefined;
    if ((f.rule === 'TBTS' || f.rule === 'NON_DEDUCTIBLE') && primary?.ledger && primary.doc.country === 'ID') {
      const amount = f.rule === 'NON_DEDUCTIBLE' ? primary.doc.totalAmount.value : primary.doc.taxableBase.value;
      correction = { ...primary.ledger, amount, basis: meta.basis };
    }
    const taxImpact = correction ? correction.amount * TAX_CONFIG[f.country].corporateRate : 0;
    // Human-readable evidence: one line per document, plus the rule's own detail.
    const docLines = related.map((d) => `${d.doc.number.value} · ${d.doc.counterparty.value} · ${d.doc.counterpartyTaxId.value} · total ${d.doc.totalAmount.value.toLocaleString('id-ID')}`);
    const detail = f.rule === 'TBTS' || f.rule === 'Z_SCORE' ? f.explanation.startsWith('Nilai') ? f.explanation : f.evidence : '';
    const evidence = [...docLines, detail && !docLines.includes(detail) ? detail : ''].filter(Boolean).join('\n');
    return {
      id: f.id,
      entityId: f.entityId,
      country: f.country,
      severity: f.severity,
      rule: f.rule,
      ruleName: meta.name,
      category: meta.category,
      explanation: f.explanation,
      evidence: evidence || f.evidence,
      remediation: f.remediation,
      date: f.date,
      documentIds: docIds,
      amountAtRisk,
      taxImpact,
      score: Math.min(99, SEVERITY_WEIGHT[f.severity] + Math.min(9, Math.round(Math.log10(Math.max(1, amountAtRisk))))),
      correction,
    };
  });

  // Cross-validation per entity (vendor master data & shareholder register)
  for (const entity of entities) {
    const entityDocs = docs.filter((d) => d.entityId === entity.id);
    if (!entityDocs.length) continue;
    const issues = crossValidateDocuments(
      { id: entity.id, name: entity.legalName, country: entity.countryCode, taxId: entity.taxId, address: '-----', fiscalYearEnd: '12-31', createdAt: CREATED },
      entityDocs,
    );
    const grouped = new Map<string, { rule: string; message: string; ids: string[] }>();
    for (const issue of issues) {
      const rule = issue.field === 'counterpartyTaxId' ? 'XV_TAXID' : issue.field === 'counterparty' ? 'XV_NAME' : 'XV_OWNERSHIP';
      const key = `${rule}|${issue.message}`;
      const g = grouped.get(key) ?? { rule, message: issue.message, ids: [] };
      g.ids.push(issue.documentId);
      grouped.set(key, g);
    }
    for (const g of grouped.values()) {
      const related = g.ids.map((id) => byId.get(id)!).filter(Boolean);
      const severity: Severity = g.rule === 'XV_OWNERSHIP' ? 'high' : 'medium';
      const meta = RULES[g.rule];
      const amountAtRisk = sumBy(related, (d) => d.doc.totalAmount.value);
      findings.push({
        id: `${g.rule}:${entity.id}:${g.ids.slice().sort().join('+')}`,
        entityId: entity.id,
        country: entity.countryCode,
        severity,
        rule: g.rule,
        ruleName: meta.name,
        category: 'cross_validation',
        explanation: g.message,
        evidence: related.map((d) => `${d.doc.number.value} · ${d.doc.counterparty.value} · ${d.doc.counterpartyTaxId.value}${d.doc.ownershipPercentage.value != null ? ` · ${d.doc.ownershipPercentage.value}%` : ''}`).join('\n'),
        remediation: g.rule === 'XV_OWNERSHIP'
          ? 'Rekonsiliasi Daftar Pemegang Saham dengan akta terakhir & AHU Online, lalu perbarui register UBO.'
          : 'Konfirmasi identitas vendor ke master data & e-Faktur/registrasi resmi sebelum klaim kredit pajak.',
        date: related[0]?.doc.date.value ?? '',
        documentIds: g.ids,
        amountAtRisk,
        taxImpact: 0,
        score: SEVERITY_WEIGHT[severity] - 5,
      });
    }
  }

  findings.sort((a, b) => b.score - a.score || b.amountAtRisk - a.amountAtRisk);
  return { findings, zScoreReady };
}

// ---------------------------------------------------------------------------
// Review workflow (maker-checker)
// ---------------------------------------------------------------------------
export const emptyReview = (): FindingReview => ({ status: 'open', history: [] });

export function reviewOf(state: ComplianceState, findingId: string): FindingReview {
  return state.reviews[findingId] ?? emptyReview();
}

export function proposeDecision(review: FindingReview, actor: Actor, action: ReviewAction, note: string, at = new Date().toISOString()): FindingReview {
  if (review.status === 'confirmed' || review.status === 'dismissed') throw new Error('Temuan sudah diputuskan.');
  const trimmed = note.trim();
  if (trimmed.length < 5) throw new Error('Catatan minimal 5 karakter.');
  return {
    ...review,
    status: 'proposed',
    proposal: { action, byId: actor.id, by: actor.name, role: actor.role, note: trimmed, at },
    history: [...review.history, { at, by: actor.name, role: `${actor.role} (Maker)`, action: 'proposed', note: `${action === 'confirm' ? 'Konfirmasi' : 'Tolak'}: ${trimmed}` }],
  };
}

export function canApprove(review: FindingReview, actor: Actor): { ok: boolean; reason?: string } {
  if (review.status !== 'proposed' || !review.proposal) return { ok: false, reason: 'Belum ada usulan keputusan.' };
  if (review.proposal.byId === actor.id) return { ok: false, reason: 'Maker-checker: pengusul tidak boleh menyetujui usulannya sendiri.' };
  if (!actor.isParentExecutive) return { ok: false, reason: 'Hanya Group CEO/CFO induk yang dapat menjadi checker.' };
  return { ok: true };
}

export function decide(review: FindingReview, actor: Actor, approve: boolean, note = '', at = new Date().toISOString()): FindingReview {
  const check = canApprove(review, actor);
  if (!check.ok) throw new Error(check.reason);
  const proposal = review.proposal!;
  const role = `${actor.role} (Checker)`;
  if (!approve) {
    return {
      ...review,
      status: 'open',
      proposal: undefined,
      history: [...review.history, { at, by: actor.name, role, action: 'rejected', note: note.trim() || 'Usulan dikembalikan ke maker.' }],
    };
  }
  return {
    ...review,
    status: proposal.action === 'confirm' ? 'confirmed' : 'dismissed',
    decidedBy: actor.name,
    history: [...review.history, { at, by: actor.name, role, action: 'approved', note: note.trim() || undefined }],
  };
}

export function markCorrectionApplied(review: FindingReview, actor: Actor, detail: string, at = new Date().toISOString()): FindingReview {
  if (review.status !== 'confirmed') throw new Error('Koreksi hanya untuk temuan yang dikonfirmasi.');
  return { ...review, correctionApplied: true, history: [...review.history, { at, by: actor.name, role: actor.role, action: 'correction_applied', note: detail }] };
}

export function reopen(review: FindingReview, actor: Actor, at = new Date().toISOString()): FindingReview {
  if (!actor.isParentExecutive) throw new Error('Hanya Group CEO/CFO yang dapat membuka kembali temuan.');
  return { status: 'open', history: [...review.history, { at, by: actor.name, role: actor.role, action: 'reopened' }] };
}

// ---------------------------------------------------------------------------
// Scores & aggregates
// ---------------------------------------------------------------------------
export function isUnresolved(status: ReviewStatus) {
  return status === 'open' || status === 'proposed';
}

/** 100 = no open risk. Each unresolved finding subtracts by severity. */
export function entityRiskScore(findings: RiskFinding[], reviews: Record<string, FindingReview>): number {
  const penalty = findings.reduce((sum, f) => {
    const status = reviews[f.id]?.status ?? 'open';
    if (!isUnresolved(status)) return sum;
    return sum + (f.severity === 'critical' ? 22 : f.severity === 'high' ? 12 : 6);
  }, 0);
  return Math.max(0, 100 - penalty);
}

export function riskBand(score: number): { label: string; tone: 'emerald' | 'amber' | 'rose' } {
  if (score >= 80) return { label: 'Rendah', tone: 'emerald' };
  if (score >= 55) return { label: 'Sedang', tone: 'amber' };
  return { label: 'Tinggi', tone: 'rose' };
}

type ReconItem = { accountCode: string; commercialAmount: number; positiveCorrection: number; negativeCorrection: number; fiscalAmount: number; correctionReason: string };

/** True when the reconciliation already carries this correction (by marker or by amount). */
export function isCorrectionReflected(items: ReconItem[], correction: SuggestedCorrection, marker: string): boolean {
  const item = items.find((i) => i.accountCode === correction.accountCode);
  if (!item) return false;
  return item.correctionReason.includes(marker) || item.positiveCorrection >= correction.amount;
}

/** Apply a confirmed finding's correction to fiscal reconciliation lines (idempotent via marker). */
export function applyCorrectionToItems<T extends ReconItem>(items: T[], correction: SuggestedCorrection, marker: string, label: string): { items: T[]; changed: boolean } {
  let changed = false;
  const next = items.map((item) => {
    if (item.accountCode !== correction.accountCode || item.correctionReason.includes(marker)) return item;
    changed = true;
    const positiveCorrection = item.positiveCorrection + correction.amount;
    const isRevenue = item.accountCode.startsWith('4') || item.accountCode.startsWith('7');
    const fiscalAmount = isRevenue
      ? item.commercialAmount + positiveCorrection - item.negativeCorrection
      : item.commercialAmount - positiveCorrection + item.negativeCorrection;
    return { ...item, positiveCorrection, fiscalAmount, correctionReason: `${item.correctionReason} + ${label} ${marker}` };
  });
  return { items: next, changed };
}
