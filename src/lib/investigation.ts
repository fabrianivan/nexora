/**
 * Investigation agent: tools, offline plan and brief composition.
 *
 * The tools are deterministic look-ups over workspace data. A live model (Gemini)
 * may choose which tools to call and write the brief, but every brief line must
 * cite the tool steps it relies on, and the result is a suggestion for the maker,
 * never a decision.
 */
import type { CountryCode } from '@/data/multiCountryTaxData';
import { RULES, type RiskFinding, type WorkspaceDocument } from './compliance';
import { FIELD_LABEL, expectedTax, lowestConfidence, type DocField } from './cases';
import { zScores } from './fraud';
import { money } from './format';
import type { EngineBadge } from './ai/badge';

export type ToolName =
  | 'vendor_master'
  | 'vendor_history'
  | 'tax_math'
  | 'supporting_docs'
  | 'same_day_invoices'
  | 'shareholder_register'
  | 'extraction_confidence'
  | 'einvoice_uuid';

export type Signal = 'risk' | 'clear' | 'info';

export interface InvestigationStep {
  n: number;
  tool: ToolName;
  args: Record<string, string>;
  title: string;
  summary: string;
  signal: Signal;
}

export interface BriefLine {
  text: string;
  steps: number[];
}

export type Recommendation = 'confirm' | 'dismiss' | 'more_evidence';

export interface Investigation {
  findingId: string;
  at: string;
  engine: EngineBadge;
  steps: InvestigationStep[];
  brief: BriefLine[];
  recommendation: Recommendation;
  draftNote: string;
  openQuestions: string[];
}

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  confirm: 'Bukti mendukung konfirmasi',
  dismiss: 'Bukti mendukung penolakan (aman)',
  more_evidence: 'Butuh bukti tambahan',
};

export interface ToolContext {
  finding: RiskFinding;
  documents: WorkspaceDocument[];
}

interface ToolResult {
  title: string;
  summary: string;
  signal: Signal;
  data: Record<string, unknown>;
}

interface ToolSpec {
  description: string;
  params: Record<string, string>;
  required: string[];
  run: (args: Record<string, string>, ctx: ToolContext) => ToolResult;
}

const norm = (s: string) => s.trim().toLowerCase();

function findDoc(ctx: ToolContext, id: string) {
  return ctx.documents.find((d) => d.doc.id === id)?.doc;
}

function notFound(what: string): ToolResult {
  return { title: 'Data tidak ditemukan', summary: `${what} tidak ada di workspace.`, signal: 'info', data: { error: `${what} not found` } };
}

const TOOLS: Record<ToolName, ToolSpec> = {
  vendor_master: {
    description: 'Look up a vendor across all group documents by name or tax ID: names used, tax IDs used, validation status, entities and invoice count.',
    params: { name: 'Vendor name (optional if taxId given)', taxId: 'Vendor tax ID / NPWP (optional if name given)' },
    required: [],
    run(args, ctx) {
      const name = args.name ? norm(args.name) : '';
      const taxId = args.taxId?.trim() ?? '';
      if (!name && !taxId) return notFound('Vendor tanpa nama/NPWP');
      const docs = ctx.documents.map((d) => d.doc).filter((d) => d.type === 'e_invoice' && ((name && norm(d.counterparty.value) === name) || (taxId && d.counterpartyTaxId.value === taxId)));
      if (!docs.length) return notFound(`Vendor ${args.name ?? taxId}`);
      const names = [...new Set(docs.map((d) => d.counterparty.value))];
      const ids = [...new Set(docs.map((d) => d.counterpartyTaxId.value))];
      const unvalidated = docs.filter((d) => !d.taxIdValidated).length;
      const label = args.name ?? names[0];
      const issues: string[] = [];
      if (unvalidated) issues.push(`${unvalidated} dari ${docs.length} invoice memakai identitas yang belum tervalidasi`);
      if (names.length > 1) issues.push(`satu NPWP dipakai ${names.length} nama (${names.join(' · ')})`);
      if (ids.length > 1) issues.push(`${ids.length} NPWP berbeda (${ids.join(', ')})`);
      return {
        title: `Master vendor · ${label}`,
        summary: issues.length ? `${label}: ${issues.join('; ')}.` : `${label}: ${docs.length} invoice, identitas konsisten dan tervalidasi.`,
        signal: issues.length ? 'risk' : 'clear',
        data: { names, taxIds: ids, invoices: docs.length, unvalidated, entities: [...new Set(docs.map((d) => d.entityId))] },
      };
    },
  },
  vendor_history: {
    description: "List the vendor's invoices in the finding's entity with dates and totals, plus how the largest compares with the entity's invoice distribution (z-score).",
    params: { name: 'Vendor name' },
    required: ['name'],
    run(args, ctx) {
      const name = norm(args.name ?? '');
      const entityInvoices = ctx.documents.map((d) => d.doc).filter((d) => d.type === 'e_invoice' && d.entityId === ctx.finding.entityId);
      const docs = entityInvoices.filter((d) => norm(d.counterparty.value) === name).sort((a, b) => a.date.value.localeCompare(b.date.value));
      if (!docs.length) return notFound(`Histori vendor ${args.name}`);
      const c = docs[0].country;
      const totals = docs.map((d) => d.totalAmount.value);
      const avg = totals.reduce((s, v) => s + v, 0) / totals.length;
      const largest = docs.reduce((m, d) => (d.totalAmount.value > m.totalAmount.value ? d : m), docs[0]);
      const z = zScores(entityInvoices.map((d) => d.totalAmount.value));
      const zLargest = z ? z[entityInvoices.indexOf(largest)] : null;
      const first = docs.length === 1;
      const parts = first
        ? [`Hanya 1 invoice ${docs[0].counterparty.value} di entitas ini (${docs[0].date.value}, ${money(avg, c)})`]
        : [`${docs.length} invoice ${docs[0].counterparty.value} di entitas ini (${docs[0].date.value} s.d. ${docs[docs.length - 1].date.value})`, `rata-rata ${money(avg, c)}`];
      if (docs.length > 1) parts.push(`terbesar ${money(largest.totalAmount.value, c)} (${largest.number.value})`);
      if (zLargest !== null && Math.abs(zLargest) >= 2) parts.push(`Z-score ${zLargest.toFixed(2).replace('.', ',')} terhadap seluruh invoice entitas`);
      if (first) parts.push('belum ada histori lain dengan vendor ini');
      return {
        title: `Histori vendor · ${docs[0].counterparty.value}`,
        summary: `${parts.join('; ')}.`,
        signal: first || (zLargest !== null && Math.abs(zLargest) >= 2) ? 'risk' : 'info',
        data: { invoices: docs.map((d) => ({ id: d.id, number: d.number.value, date: d.date.value, total: d.totalAmount.value })), average: Math.round(avg), zLargest },
      };
    },
  },
  tax_math: {
    description: 'Recompute the indirect tax (PPN/GST/SST) on a document from its taxable base and the standard rate, and report any difference.',
    params: { documentId: 'Document id' },
    required: ['documentId'],
    run(args, ctx) {
      const doc = findDoc(ctx, args.documentId ?? '');
      if (!doc) return notFound(`Dokumen ${args.documentId}`);
      if (doc.type !== 'e_invoice') return { title: `Hitungan pajak · ${doc.number.value}`, summary: 'Bukan invoice; tidak ada pajak untuk dihitung.', signal: 'info', data: {} };
      const exp = expectedTax(doc);
      const diff = doc.taxAmount.value - exp;
      const ok = Math.abs(diff) <= 1;
      return {
        title: `Hitungan pajak · ${doc.number.value}`,
        summary: ok
          ? `${doc.number.value}: pajak ${money(doc.taxAmount.value, doc.country)} sesuai tarif standar atas DPP ${money(doc.taxableBase.value, doc.country)}.`
          : `${doc.number.value}: pajak ${money(doc.taxAmount.value, doc.country)}, seharusnya ${money(exp, doc.country)} pada tarif standar (selisih ${money(diff, doc.country)}).`,
        signal: ok ? 'clear' : 'risk',
        data: { base: doc.taxableBase.value, tax: doc.taxAmount.value, expected: exp, difference: diff },
      };
    },
  },
  supporting_docs: {
    description: 'Check whether a document has supporting evidence (contract, PO, delivery note, proof of payment), its deductibility flag and ledger account.',
    params: { documentId: 'Document id' },
    required: ['documentId'],
    run(args, ctx) {
      const wd = ctx.documents.find((d) => d.doc.id === args.documentId);
      if (!wd) return notFound(`Dokumen ${args.documentId}`);
      const doc = wd.doc;
      const issues: string[] = [];
      if (!doc.hasSupportingEvidence) issues.push('tidak ada kontrak, PO, surat jalan, atau bukti bayar terlampir');
      if (!doc.deductible) issues.push('ditandai tidak dapat dibiayakan');
      const account = wd.ledger ? `akun ${wd.ledger.accountCode} ${wd.ledger.accountName}` : 'belum dipetakan ke akun';
      return {
        title: `Bukti pendukung · ${doc.number.value}`,
        summary: issues.length ? `${doc.number.value} (${account}): ${issues.join('; ')}.` : `${doc.number.value} (${account}): bukti pendukung lengkap.`,
        signal: issues.length ? 'risk' : 'clear',
        data: { evidence: doc.hasSupportingEvidence, deductible: doc.deductible, account: wd.ledger?.accountCode ?? null, attachment: doc.attachmentName },
      };
    },
  },
  same_day_invoices: {
    description: 'List invoices from the same vendor on the same date in the finding entity, with their total and tax IDs.',
    params: { name: 'Vendor name', date: 'Invoice date YYYY-MM-DD' },
    required: ['name', 'date'],
    run(args, ctx) {
      const name = norm(args.name ?? '');
      const docs = ctx.documents.map((d) => d.doc).filter((d) => d.type === 'e_invoice' && d.entityId === ctx.finding.entityId && norm(d.counterparty.value) === name && d.date.value === args.date);
      if (!docs.length) return notFound(`Invoice ${args.name} pada ${args.date}`);
      const c = docs[0].country;
      const total = docs.reduce((s, d) => s + d.totalAmount.value, 0);
      const ids = [...new Set(docs.map((d) => d.counterpartyTaxId.value))];
      const each = docs.map((d) => money(d.totalAmount.value, c)).join(' + ');
      return {
        title: `Invoice tanggal sama · ${args.date}`,
        summary: `${docs.length} invoice ${docs[0].counterparty.value} pada ${args.date}: ${each} = ${money(total, c)}${ids.length > 1 ? `; memakai ${ids.length} NPWP berbeda` : ''}.`,
        signal: docs.length >= 3 || ids.length > 1 ? 'risk' : 'info',
        data: { count: docs.length, total, taxIds: ids, numbers: docs.map((d) => d.number.value) },
      };
    },
  },
  shareholder_register: {
    description: "Read the finding entity's shareholder register extracts and total the ownership percentages.",
    params: {},
    required: [],
    run(_args, ctx) {
      const docs = ctx.documents.map((d) => d.doc).filter((d) => d.type === 'shareholder' && d.entityId === ctx.finding.entityId);
      if (!docs.length) return notFound('Register pemegang saham');
      const total = docs.reduce((s, d) => s + (d.ownershipPercentage.value ?? 0), 0);
      const ok = Math.abs(total - 100) < 0.01;
      return {
        title: 'Register pemegang saham',
        summary: `${docs.map((d) => `${d.counterparty.value} ${d.ownershipPercentage.value}%`).join(', ')}; total ${total}%${ok ? '' : ` (selisih ${Math.round((total - 100) * 100) / 100} poin)`}.`,
        signal: ok ? 'clear' : 'risk',
        data: { holders: docs.map((d) => ({ name: d.counterparty.value, pct: d.ownershipPercentage.value, confidence: d.ownershipPercentage.confidence })), total },
      };
    },
  },
  extraction_confidence: {
    description: 'Report how confident the document extraction was per field, and the weakest field.',
    params: { documentId: 'Document id' },
    required: ['documentId'],
    run(args, ctx) {
      const doc = findDoc(ctx, args.documentId ?? '');
      if (!doc) return notFound(`Dokumen ${args.documentId}`);
      const low = lowestConfidence(doc);
      if (!low) return { title: `Ekstraksi · ${doc.number.value}`, summary: `${doc.number.value}: semua field diisi manual.`, signal: 'clear', data: {} };
      const weak = low.confidence < 0.9;
      return {
        title: `Ekstraksi · ${doc.number.value}`,
        summary: `${doc.number.value}: keyakinan terendah ${Math.round(low.confidence * 100)}% pada ${FIELD_LABEL[low.field as DocField]}${weak ? ', cocokkan dengan dokumen asli' : ''}.`,
        signal: weak ? 'risk' : 'clear',
        data: { lowestField: low.field, confidence: low.confidence },
      };
    },
  },
  einvoice_uuid: {
    description: 'Check whether a Malaysian document carries a MyInvois validated e-invoice UUID.',
    params: { documentId: 'Document id' },
    required: ['documentId'],
    run(args, ctx) {
      const doc = findDoc(ctx, args.documentId ?? '');
      if (!doc) return notFound(`Dokumen ${args.documentId}`);
      const has = Boolean(doc.invoiceUuid.value.trim());
      return {
        title: `UUID e-invoice · ${doc.number.value}`,
        summary: has ? `${doc.number.value}: UUID ${doc.invoiceUuid.value} tersedia.` : `${doc.number.value}: tidak ada UUID MyInvois; dokumen belum tervalidasi LHDN.`,
        signal: has ? 'clear' : 'risk',
        data: { uuid: doc.invoiceUuid.value || null },
      };
    },
  },
};

export const TOOL_NAMES = Object.keys(TOOLS) as ToolName[];

export function isToolName(name: string): name is ToolName {
  return (TOOL_NAMES as string[]).includes(name);
}

/** Function declarations in the Gemini API schema format. */
export function toolDeclarations() {
  return TOOL_NAMES.map((name) => {
    const spec = TOOLS[name];
    return {
      name,
      description: spec.description,
      parameters: {
        type: 'OBJECT',
        properties: Object.fromEntries(Object.entries(spec.params).map(([k, d]) => [k, { type: 'STRING', description: d }])),
        ...(spec.required.length ? { required: spec.required } : {}),
      },
    };
  });
}

export function runTool(name: ToolName, rawArgs: Record<string, unknown>, ctx: ToolContext, n: number): { step: InvestigationStep; data: Record<string, unknown> } {
  const args = Object.fromEntries(Object.entries(rawArgs ?? {}).filter(([, v]) => typeof v === 'string' || typeof v === 'number').map(([k, v]) => [k, String(v).slice(0, 200)]));
  const r = TOOLS[name].run(args, ctx);
  return { step: { n, tool: name, args, title: r.title, summary: r.summary, signal: r.signal }, data: { summary: r.summary, signal: r.signal, ...r.data } };
}

// ---------------------------------------------------------------------------
// Offline plan: a fixed, rule-specific sequence of tool calls
// ---------------------------------------------------------------------------
export function offlinePlan(ctx: ToolContext): { tool: ToolName; args: Record<string, string> }[] {
  const f = ctx.finding;
  const related = ctx.documents.filter((d) => f.documentIds.includes(d.doc.id)).map((d) => d.doc);
  const primary = related[0];
  if (!primary) return [];
  const id = primary.id;
  const vendor = primary.counterparty.value;
  switch (f.rule) {
    case 'TBTS':
      return [
        { tool: 'vendor_master', args: { name: vendor, taxId: primary.counterpartyTaxId.value } },
        { tool: 'vendor_history', args: { name: vendor } },
        { tool: 'tax_math', args: { documentId: id } },
        { tool: 'supporting_docs', args: { documentId: id } },
        { tool: 'extraction_confidence', args: { documentId: id } },
      ];
    case 'MISSING_TRADER':
      return [
        { tool: 'vendor_master', args: { name: vendor } },
        { tool: 'vendor_history', args: { name: vendor } },
        { tool: 'tax_math', args: { documentId: id } },
        { tool: 'supporting_docs', args: { documentId: id } },
      ];
    case 'SPLIT_INVOICING':
      return [
        { tool: 'same_day_invoices', args: { name: vendor, date: primary.date.value } },
        { tool: 'vendor_master', args: { name: vendor } },
        { tool: 'vendor_history', args: { name: vendor } },
      ];
    case 'Z_SCORE':
      return [
        { tool: 'vendor_history', args: { name: vendor } },
        { tool: 'supporting_docs', args: { documentId: id } },
        { tool: 'extraction_confidence', args: { documentId: id } },
      ];
    case 'MYINVOIS_UUID':
      return [
        { tool: 'einvoice_uuid', args: { documentId: id } },
        { tool: 'vendor_master', args: { name: vendor } },
        { tool: 'supporting_docs', args: { documentId: id } },
      ];
    case 'NON_DEDUCTIBLE':
      return [
        { tool: 'supporting_docs', args: { documentId: id } },
        { tool: 'vendor_history', args: { name: vendor } },
        { tool: 'tax_math', args: { documentId: id } },
      ];
    case 'XV_TAXID':
    case 'XV_NAME':
      return [
        { tool: 'vendor_master', args: f.rule === 'XV_NAME' ? { taxId: primary.counterpartyTaxId.value } : { name: vendor } },
        ...related.slice(0, 3).map((d) => ({ tool: 'extraction_confidence' as const, args: { documentId: d.id } })),
      ];
    case 'XV_OWNERSHIP':
      return [
        { tool: 'shareholder_register', args: {} },
        ...related.slice(0, 3).map((d) => ({ tool: 'extraction_confidence' as const, args: { documentId: d.id } })),
      ];
    default:
      return [{ tool: 'supporting_docs', args: { documentId: id } }];
  }
}

const OPEN_QUESTIONS: Record<string, string[]> = {
  TBTS: ['Apakah vendor berstatus PKP aktif di Coretax pada tanggal faktur?', 'Apakah ada surat jalan atau bukti penerimaan barang?', 'Apakah pembayaran ditransfer ke rekening atas nama vendor?'],
  MISSING_TRADER: ['Apakah nomor GST pemasok aktif di daftar IRAS?', 'Apakah harga jauh di bawah harga pasar?'],
  SPLIT_INVOICING: ['Siapa yang menyetujui ketiga invoice dan berapa batas otorisasinya?', 'Apakah ada satu PO/kontrak yang mencakup semuanya?'],
  Z_SCORE: ['Apakah ada kontrak atau addendum yang menjelaskan lonjakan nilai?', 'Apakah barang/jasa sudah diterima pada periode yang sama (pisah batas)?'],
  MYINVOIS_UUID: ['Apakah pemasok sudah wajib e-invoice pada tanggal transaksi?', 'Bisakah pemasok menerbitkan ulang e-invoice tervalidasi?'],
  NON_DEDUCTIBLE: ['Apakah ada daftar nominatif atau bukti pengeluaran?', 'Apakah biaya ini terkait langsung dengan kegiatan usaha?'],
  XV_TAXID: ['NPWP mana yang terdaftar di master vendor dan Coretax?'],
  XV_NAME: ['Apakah kedua nama adalah entitas yang sama (perubahan nama/afiliasi)?'],
  XV_OWNERSHIP: ['Apakah akta perubahan terakhir sudah tercermin di AHU Online?', 'Apakah ada pengalihan saham yang belum dicatat?'],
};

export function recommendationFor(steps: InvestigationStep[]): Recommendation {
  const risks = steps.filter((s) => s.signal === 'risk').length;
  if (risks >= 2) return 'confirm';
  if (risks === 1) return 'more_evidence';
  return steps.some((s) => s.signal === 'clear') ? 'dismiss' : 'more_evidence';
}

/** Deterministic brief: one line per risk signal, then one line for what came back clean. */
export function composeBrief(finding: RiskFinding, steps: InvestigationStep[]): BriefLine[] {
  const lines: BriefLine[] = steps.filter((s) => s.signal === 'risk').map((s) => ({ text: s.summary, steps: [s.n] }));
  const clear = steps.filter((s) => s.signal === 'clear');
  if (clear.length) lines.push({ text: `Tidak ada masalah pada: ${clear.map((s) => s.title.split(' · ')[0].toLowerCase()).join(', ')}.`, steps: clear.map((s) => s.n) });
  const info = steps.filter((s) => s.signal === 'info');
  if (!lines.length && info.length) lines.push(...info.map((s) => ({ text: s.summary, steps: [s.n] })));
  if (!lines.length) lines.push({ text: `Tidak ada data tambahan untuk ${finding.ruleName}.`, steps: [] });
  return lines.slice(0, 6);
}

export function draftNote(finding: RiskFinding, steps: InvestigationStep[], recommendation: Recommendation): string {
  const risks = steps.filter((s) => s.signal === 'risk').map((s) => s.summary.replace(/\.$/, ''));
  const basis = RULES[finding.rule]?.basis;
  const head = recommendation === 'confirm' ? 'Konfirmasi' : recommendation === 'dismiss' ? 'Tolak (aman)' : 'Tahan, minta bukti tambahan';
  const body = risks.length ? risks.join('; ') : 'pemeriksaan tidak menemukan sinyal risiko tambahan';
  return `${head}: ${body}.${basis ? ` Dasar: ${basis}.` : ''}`.slice(0, 600);
}

export function runOffline(ctx: ToolContext, engine: EngineBadge, at = new Date().toISOString()): Investigation {
  const steps = offlinePlan(ctx).map((p, i) => runTool(p.tool, p.args, ctx, i + 1).step);
  const recommendation = recommendationFor(steps);
  return {
    findingId: ctx.finding.id,
    at,
    engine,
    steps,
    brief: composeBrief(ctx.finding, steps),
    recommendation,
    draftNote: draftNote(ctx.finding, steps, recommendation),
    openQuestions: OPEN_QUESTIONS[ctx.finding.rule] ?? [],
  };
}

/**
 * Keep only brief lines that cite steps that actually ran. A line without a
 * valid citation is dropped: the model may summarise evidence, not invent it.
 */
export function validateBrief(raw: unknown, steps: InvestigationStep[]): BriefLine[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(steps.map((s) => s.n));
  const out: BriefLine[] = [];
  for (const item of raw.slice(0, 8)) {
    if (!item || typeof item !== 'object') continue;
    const text = typeof (item as { text?: unknown }).text === 'string' ? (item as { text: string }).text.replace(/[*_#`]/g, '').trim().slice(0, 400) : '';
    const cited = Array.isArray((item as { steps?: unknown }).steps) ? (item as { steps: unknown[] }).steps.map(Number).filter((n) => valid.has(n)) : [];
    if (text && cited.length) out.push({ text, steps: [...new Set(cited)] });
  }
  return out.slice(0, 6);
}

export function isRecommendation(v: unknown): v is Recommendation {
  return v === 'confirm' || v === 'dismiss' || v === 'more_evidence';
}

export function openQuestionsFor(rule: string) {
  return OPEN_QUESTIONS[rule] ?? [];
}

/** Compact case description for the model's first turn. */
export function caseBriefing(ctx: ToolContext, entityName: string): string {
  const f = ctx.finding;
  const docs = ctx.documents.filter((d) => f.documentIds.includes(d.doc.id)).map((d) => d.doc);
  const c: CountryCode = f.country;
  return [
    `Finding: ${f.ruleName} (${f.rule}), severity ${f.severity}, entity ${entityName} (${c}).`,
    `Rule basis: ${RULES[f.rule]?.basis ?? '-'}.`,
    `Why flagged: ${f.explanation}`,
    'Documents in the finding:',
    ...docs.map((d) => `- id=${d.id} type=${d.type} number=${d.number.value} date=${d.date.value} vendor="${d.counterparty.value}" taxId=${d.counterpartyTaxId.value} base=${d.taxableBase.value} tax=${d.taxAmount.value} total=${d.totalAmount.value}${d.ownershipPercentage.value != null ? ` ownership=${d.ownershipPercentage.value}%` : ''}`),
  ].join('\n');
}
