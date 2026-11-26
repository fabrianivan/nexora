import type { EngineBadge } from './ai/badge';

/**
 * Helpers for the document scanner. When Gemini is not configured the scanner cannot
 * read the file, so the simulation reads what it can from the file name, so an upload like `faktur-pt-sinar-abadi-okt.pdf`
 * fills the counterparty with "PT Sinar Abadi" instead of a generic placeholder.
 */

/** Legal forms written before the name (Indonesia). */
const PREFIX_FORMS: Record<string, string> = { pt: 'PT', cv: 'CV', ud: 'UD' };
/** Legal forms written after the name (SG / MY / US). Longest first. */
const SUFFIX_FORMS: [string[], string][] = [
  [['pte', 'ltd'], 'Pte. Ltd.'],
  [['sdn', 'bhd'], 'Sdn. Bhd.'],
  [['inc'], 'Inc.'],
  [['llc'], 'LLC'],
  [['corp'], 'Corp.'],
  [['ltd'], 'Ltd.'],
];
/** Words that describe the document rather than the company. */
const NOISE =
  /^(\d+|faktur|fakturpajak|efaktur|e|pajak|invoice|inv|tagihan|kwitansi|receipt|bill|scan|copy|draft|final|rev\d*|v\d+|q[1-4]|fy\d*|20\d\d|tbk|jan|feb|mar|apr|mei|may|jun|jul|agu|agt|aug|sep|okt|oct|nov|des|dec|januari|februari|maret|april|juni|juli|agustus|september|oktober|november|desember|fiktif|fraud|tbts)$/i;

const titleCase = (w: string) => (w.length <= 3 && /^[a-z]+$/i.test(w) && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

/** Best-effort counterparty name from a file name, or null when none can be read. */
export function vendorFromFileName(fileName: string): string | null {
  const words = fileName
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .split(/[\s_\-.,()]+/)
    .filter(Boolean);
  const lower = words.map((w) => w.toLowerCase());

  const pre = lower.findIndex((w) => w in PREFIX_FORMS);
  if (pre >= 0) {
    const name: string[] = [];
    for (let i = pre + 1; i < words.length && name.length < 5; i++) {
      if (NOISE.test(words[i]) || lower[i] in PREFIX_FORMS) break;
      name.push(titleCase(words[i]));
    }
    const tbk = lower.slice(pre + 1, pre + 2 + name.length).includes('tbk') ? ' Tbk' : '';
    if (name.length) return `${PREFIX_FORMS[lower[pre]]} ${name.join(' ')}${tbk}`;
  }

  for (const [form, label] of SUFFIX_FORMS) {
    const at = lower.findIndex((_, i) => form.every((f, j) => lower[i + j] === f));
    if (at <= 0) continue;
    const name: string[] = [];
    for (let i = at - 1; i >= 0 && name.length < 5; i--) {
      if (NOISE.test(words[i])) break;
      name.unshift(titleCase(words[i]));
    }
    if (name.length) return `${name.join(' ')} ${label}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Scanner response contract (shared by /api/scan-document and the upload dialog)
// ---------------------------------------------------------------------------
export interface ScanField<T> {
  value: T;
  confidence?: number;
}

export interface ScanResult {
  engine: EngineBadge;
  fields: {
    number?: ScanField<string>;
    date?: ScanField<string>;
    vendor?: ScanField<string>;
    vendorTaxId?: ScanField<string>;
    base?: ScanField<number>;
    tax?: ScanField<number>;
    uuid?: ScanField<string>;
  };
  /** True when a deterministic check on the extracted values needs attention. */
  risk: boolean;
  riskReasons: string[];
  /** Text in the document that reads like instructions to an AI. Ignored, but surfaced. */
  hiddenInstructions: string[];
}
