/**
 * Copilot answer pipeline (pure parts): guardrails, retrieval over case data +
 * workspace + rule library, and the offline answer composer. The route adds the
 * optional live Gemini call on top and must keep the same citation contract.
 */
import type { CountryCode } from '@/data/multiCountryTaxData';
import type { SourceDocument } from '@/lib/domain';
import type { CaseContext } from '@/lib/cases';
import { RULE_SOURCES, TAX_CORPUS } from '@/data/taxCorpus';
import { money } from '@/lib/format';
import { retrieveChunks } from './retrieval';
import type { ConfidenceLabel, EngineBadge } from './badge';

export interface FindingSummary {
  id: string;
  ruleName: string;
  severity: 'critical' | 'high' | 'medium';
  entityName: string;
  country: CountryCode;
  amountAtRisk: number;
  status: string;
}

export interface CopilotRequest {
  question: string;
  country: CountryCode;
  entityName?: string;
  case?: CaseContext;
  /** Open findings in the user's scope, for prioritisation questions. */
  findings?: FindingSummary[];
}

export type CitationKind = 'case' | 'workspace' | 'rule';

export interface CopilotCitation {
  id: string;
  label: string;
  kind: CitationKind;
  snippet: string;
  /** Rule-library summaries are not the official text. */
  verified: boolean;
}

export interface CopilotResponse {
  reply: string;
  citations: CopilotCitation[];
  engine: EngineBadge;
  grounded: boolean;
  refused: boolean;
  confidence: ConfidenceLabel | null;
  confidenceBasis: string;
}

export interface PoolChunk {
  id: string;
  label: string;
  kind: CitationKind;
  text: string;
  verified: boolean;
}

// ---------------------------------------------------------------------------
// Guardrails
// ---------------------------------------------------------------------------
const INJECTION = [
  'ignore previous instructions', 'ignore all previous', 'disregard the above', 'abaikan instruksi', 'abaikan semua aturan',
  'system prompt', 'jailbreak', 'developer mode', 'reveal your instructions', 'tampilkan prompt',
];

const OFF_TOPIC = [
  'harga saham', 'share price', 'stock price', 'saham apa yang', 'beli saham', 'crypto', 'bitcoin', 'cuaca', 'weather',
  'resep', 'recipe', 'sepak bola', 'football', 'film', 'movie', 'lagu', 'song', 'pacar', 'horoskop', 'zodiak',
];

const TAX_TERMS = [
  'pajak', 'tax', 'ppn', 'pph', 'faktur', 'invoice', 'spt', 'koreksi', 'fiskal', 'tbts', 'vendor', 'npwp', 'iras', 'gst', 'lhdn',
  'myinvois', 'irs', 'w-9', 'w-8', '1042', 'treaty', 'p3b', 'dta', 'risiko', 'fraud', 'temuan', 'audit', 'rekonsiliasi', 'z-score',
  'split', 'ubo', 'pemegang saham', 'register saham', 'ownership', 'deductible', 'nominatif', 'natura', 'entitas', 'pasal', 'pmk',
  'akun', 'beban', 'pendapatan', '31e', '1771', 'coretax', 'bukti', 'mitigasi', 'dividen', 'royalti', 'withholding', 'wht', 'sst',
  'kasus', 'prioritas', 'kepatuhan', 'sp2dk', 'pembetulan', 'ter', 'umkm', 'form c', 'schedule m', 'checker', 'maker', 'seksyen',
  '109', '109b', 'cp37', 'faedah', 'perkhidmatan', 'pillar', 'globe', 'qdmtt', 'iir', 'pemotongan', 'potong', 'pengkreditan',
  'kredit', 'masukan', 'keluaran', 'restitusi', 'billing', 'ntpn', 'sanksi', 'denda', 'bunga', 'setor', 'lapor', '1120',
];

export type GuardResult = { refused: true; reason: 'injection' | 'off_topic'; reply: string } | null;

export function guard(question: string, hasCase: boolean): GuardResult {
  const q = question.toLowerCase();
  if (INJECTION.some((k) => q.includes(k))) {
    return {
      refused: true,
      reason: 'injection',
      reply: 'Saya tidak bisa mengikuti permintaan itu. Isi dokumen dan teks bebas saya perlakukan sebagai data, bukan instruksi. Saya bisa membantu menjelaskan temuan, bukti, dasar aturan, dan dampak koreksi.',
    };
  }
  const offTopic = OFF_TOPIC.some((k) => q.includes(k));
  const taxy = TAX_TERMS.some((k) => q.includes(k));
  if (offTopic || (!hasCase && !taxy && q.trim().length > 12)) {
    return {
      refused: true,
      reason: 'off_topic',
      reply: 'Itu di luar cakupan Nexora. Saya hanya menjawab soal kepatuhan pajak grup: temuan dan bukti, dasar aturan, rekonsiliasi fiskal, dan pelaporan.',
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Retrieval pool
// ---------------------------------------------------------------------------
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 } as const;
const SEVERITY_LABEL = { critical: 'kritis', high: 'tinggi', medium: 'sedang' } as const;

export function caseChunks(c: CaseContext): PoolChunk[] {
  const out: PoolChunk[] = [
    { id: 'CASE-WHY', label: `Kasus · ${c.ruleName}`, kind: 'case', verified: true, text: `${c.ruleName} pada ${c.entityName}, tingkat ${SEVERITY_LABEL[c.severity as keyof typeof SEVERITY_LABEL] ?? c.severity}. ${c.explanation}` },
  ];
  const failing = c.checks.filter((k) => k.status !== 'pass');
  if (failing.length) out.push({ id: 'CASE-CHECKS', label: 'Kasus · pemeriksaan gagal', kind: 'case', verified: true, text: failing.map((k) => `${k.label}: ${k.detail}`).join('. ') });
  const passing = c.checks.filter((k) => k.status === 'pass');
  if (passing.length) out.push({ id: 'CASE-PASS', label: 'Kasus · pemeriksaan lolos', kind: 'case', verified: true, text: passing.map((k) => `${k.label}: ${k.detail}`).join('. ') });
  for (const d of c.documents.slice(0, 6)) {
    out.push({
      id: `CASE-DOC-${d.id}`,
      label: `Dokumen · ${d.number}`,
      kind: 'case',
      verified: true,
      text: `${d.number} tanggal ${d.date} dari ${d.counterparty} (${d.taxId}${d.taxIdValidated ? ', tervalidasi' : ', belum tervalidasi'}). DPP ${money(d.base, c.country)}, pajak ${money(d.tax, c.country)}, total ${money(d.total, c.country)}.${d.account ? ` Akun ${d.account}.` : ''}${d.evidence ? '' : ' Tanpa bukti pendukung.'}`,
    });
  }
  if (c.correction) {
    out.push({ id: 'CASE-CORR', label: 'Kasus · usulan koreksi', kind: 'case', verified: true, text: `Jika dikonfirmasi: koreksi fiskal positif ${money(c.correction.amount, c.country)} pada akun ${c.correction.accountCode} ${c.correction.accountName}.` });
  }
  out.push({ id: 'CASE-NEXT', label: 'Kasus · rekomendasi tindakan', kind: 'case', verified: true, text: c.remediation });
  if (c.brief?.length) out.push({ id: 'CASE-BRIEF', label: 'Kasus · ringkasan investigasi', kind: 'case', verified: true, text: c.brief.join(' ') });
  return out;
}

export function workspaceChunks(findings: FindingSummary[]): PoolChunk[] {
  return findings
    .slice()
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.amountAtRisk - a.amountAtRisk)
    .slice(0, 8)
    .map((f) => ({
      id: `WS-${f.id}`,
      label: `Kasus · ${f.ruleName}`,
      kind: 'workspace' as const,
      verified: true,
      text: `${f.ruleName} (${SEVERITY_LABEL[f.severity]}) pada ${f.entityName}, nilai dokumen ${f.amountAtRisk ? money(f.amountAtRisk, f.country) : '—'}, status ${f.status}.`,
    }));
}

function ruleChunk(id: string): PoolChunk | null {
  for (const s of TAX_CORPUS) {
    const ch = s.chunks.find((x) => x.id === id);
    if (ch) return { id: ch.id, label: ch.article, kind: 'rule', verified: s.verified, text: ch.text };
  }
  return null;
}

const PRIORITY_RE = /prioritas|prioritize|urutan|terbesar|ringkas risiko|mulai dari/;

const GENERIC = new Set([
  'pajak', 'tax', 'jelaskan', 'bagaimana', 'aturan', 'apa', 'apakah', 'yang', 'dan', 'untuk', 'kami', 'kita', 'atas', 'dari', 'dengan',
  'pada', 'ini', 'itu', 'the', 'and', 'for', 'what', 'how', 'tolong', 'saya', 'bisa', 'jika', 'risiko', 'perusahaan', 'entitas',
  'hitung', 'dalam', 'atau', 'agar', 'tidak', 'menurut', 'sebesar', 'serta', 'termasuk', 'dokumen', 'syarat', 'prosedur', 'langkah',
]);

function firstSentence(text: string): string {
  const m = /^(.+?[.!?])(\s|$)/.exec(text);
  return m ? m[1] : text;
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((w) => (w.length > 5 && /(?:nya|kah|lah)$/.test(w) ? w.slice(0, -3) : w))
    .filter((w) => w.length > 2);
}

/** Pick the chunks an answer may use, most relevant first. */
export function selectChunks(req: CopilotRequest, limit = 6): PoolChunk[] {
  const q = req.question.toLowerCase();
  const picked: PoolChunk[] = [];
  const add = (c: PoolChunk | null) => {
    if (c && !picked.some((p) => p.id === c.id)) picked.push(c);
  };

  if (req.case) {
    const cc = caseChunks(req.case);
    // Always ground in the case itself, its failing checks, any proposed correction,
    // investigation brief, and next step, then rank remaining document chunks by question.
    add(cc[0]);
    const caseSource: SourceDocument = { id: 'CASE', title: req.case.ruleName, publisher: 'workspace', sourceType: 'internal_demo', accessedAt: '2026-01-01T00:00:00.000Z', sourceVersion: '1', verified: true, chunks: cc.map((c) => ({ id: c.id, article: c.label, text: c.text })) };
    for (const hit of retrieveChunks([caseSource], req.question, 3)) add(cc.find((c) => c.id === hit.chunk.id) ?? null);
    add(cc.find((c) => c.id === 'CASE-CHECKS') ?? null);
    add(cc.find((c) => c.id === 'CASE-CORR') ?? null);
    add(cc.find((c) => c.id === 'CASE-BRIEF') ?? null);
    add(cc.find((c) => c.id === 'CASE-NEXT') ?? null);
    for (const id of RULE_SOURCES[req.case.rule] ?? []) add(ruleChunk(id));
  }
  const priority = Boolean(req.findings?.length) && PRIORITY_RE.test(q);
  if (priority) workspaceChunks(req.findings!).slice(0, 5).forEach(add);

  // A library chunk counts only if it shares a distinctive word with the question;
  // "pajak" alone matches everything and would fake grounding.
  const distinctive = words(req.question).filter((w) => !GENERIC.has(w));
  const ranked = retrieveChunks(TAX_CORPUS, req.question, 6).filter((hit) => {
    const text = new Set(words(`${hit.source.title} ${hit.chunk.article} ${hit.chunk.text}`));
    return distinctive.some((w) => text.has(w));
  });
  for (const hit of ranked.slice(0, 4)) add(ruleChunk(hit.chunk.id));
  const cap = req.case ? Math.max(limit + 2, 8) : limit;
  return picked.slice(0, priority ? cap + 3 : cap);
}

// ---------------------------------------------------------------------------
// Offline composer
// ---------------------------------------------------------------------------
type Intent = 'why' | 'basis' | 'next' | 'impact' | 'priority' | 'general';

export function intentOf(question: string): Intent {
  const q = question.toLowerCase();
  if (PRIORITY_RE.test(q)) return 'priority';
  if (/kenapa|mengapa|why|ditandai|alasan/.test(q)) return 'why';
  if (/dasar|hukum|pasal|regulasi|aturan|basis/.test(q)) return 'basis';
  if (/dampak|rupiah|berapa|impact|koreksi|pph terutang/.test(q)) return 'impact';
  if (/langkah|mitigasi|apa yang harus|next|tindak|bukti apa|lakukan/.test(q)) return 'next';
  return 'general';
}

export function composeOffline(req: CopilotRequest, chunks: PoolChunk[]): { reply: string; used: PoolChunk[]; grounded: boolean } {
  const used: PoolChunk[] = [];
  const cite = (c: PoolChunk | undefined) => {
    if (!c) return '';
    if (!used.includes(c)) used.push(c);
    return ` [${used.indexOf(c) + 1}]`;
  };
  const by = (id: string) => chunks.find((c) => c.id === id);
  const rules = chunks.filter((c) => c.kind === 'rule');
  const intent = intentOf(req.question);
  const lines: string[] = [];

  if (intent === 'priority' && chunks.some((c) => c.kind === 'workspace')) {
    const ws = chunks.filter((c) => c.kind === 'workspace');
    lines.push('Urutan penanganan yang saya sarankan, dari tingkat tertinggi lalu nilai terbesar:');
    ws.forEach((c, i) => lines.push(`${i + 1}. ${c.text}${cite(c)}`));
    lines.push('', 'Mulai dari kasus kritis: kumpulkan bukti, lalu ajukan keputusan ke checker di halaman Kasus.');
    return { reply: lines.join('\n'), used, grounded: true };
  }

  if (req.case) {
    const why = by('CASE-WHY');
    const checks = by('CASE-CHECKS');
    const corr = by('CASE-CORR');
    const next = by('CASE-NEXT');
    const brief = by('CASE-BRIEF');
    if (intent === 'why' || intent === 'general') {
      lines.push(`${why?.text ?? ''}${cite(why)}`);
      if (checks) lines.push('', `Yang membuat aturan ini menyala: ${checks.text}.${cite(checks)}`);
      if (brief && intent === 'general') lines.push('', `Hasil investigasi: ${brief.text}${cite(brief)}`);
    }
    if (intent === 'basis' || intent === 'general' || intent === 'why') {
      if (rules.length) {
        lines.push('', 'Dasar aturan (ringkasan internal, cek teks resmi):');
        rules.slice(0, intent === 'basis' ? 3 : 2).forEach((r) => lines.push(`- **${r.label}**: ${intent === 'basis' ? r.text : firstSentence(r.text)}${cite(r)}`));
      }
    }
    if (intent === 'impact') {
      lines.push(corr ? `${corr.text}${cite(corr)}` : `Temuan ini tidak membawa usulan koreksi fiskal otomatis; dampaknya pada kredit pajak atau pengakuan biaya perlu dinilai manual.${cite(why)}`);
      lines.push('', 'Dampak nyata pada PPh terutang tergantung fasilitas dan kredit entitas; lihat jejak Rupiah di panel kasus.');
    }
    if (intent === 'next' || intent === 'general') {
      lines.push('', `Langkah berikutnya: ${next?.text ?? ''}${cite(next)}`);
    }
    return { reply: lines.join('\n').trim(), used, grounded: used.length > 0 };
  }

  if (rules.length) {
    lines.push('Dari pustaka aturan Nexora (ringkasan internal, cek teks resmi sebelum bertindak):');
    rules.slice(0, 3).forEach((r) => lines.push(`- **${r.label}**: ${r.text}${cite(r)}`));
    if (/\d{2,}/.test(req.question)) lines.push('', 'Untuk angka entitas Anda, hitungan resmi ada di halaman Rekonsiliasi; saya tidak mengulang hitungan di sini tanpa data rekonsiliasi.');
    return { reply: lines.join('\n'), used, grounded: true };
  }

  return {
    reply: 'Pustaka aturan Nexora belum punya sumber untuk pertanyaan ini, jadi saya tidak akan menebak. Buka kasus terkait dan tanya dari sana, atau minta tim pajak menambahkan sumbernya ke pustaka.',
    used,
    grounded: false,
  };
}

export function toCitations(used: PoolChunk[]): CopilotCitation[] {
  return used.map((c) => ({ id: c.id, label: c.label, kind: c.kind, snippet: c.text.length > 220 ? `${c.text.slice(0, 217)}…` : c.text, verified: c.verified }));
}

export function confidenceFor(grounded: boolean, used: PoolChunk[]): { confidence: ConfidenceLabel; basis: string } {
  if (!grounded || !used.length) return { confidence: 'Rendah', basis: 'Tidak ada sumber yang mendukung jawaban.' };
  const dataOnly = used.every((c) => c.kind !== 'rule');
  if (dataOnly) return { confidence: 'Tinggi', basis: 'Semua klaim dari data workspace.' };
  const hasData = used.some((c) => c.kind !== 'rule');
  return hasData
    ? { confidence: 'Sedang', basis: 'Data workspace + ringkasan aturan yang belum diverifikasi ke teks resmi.' }
    : { confidence: 'Sedang', basis: 'Hanya ringkasan aturan internal, belum diverifikasi ke teks resmi.' };
}
