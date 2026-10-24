import { describe, expect, it } from 'vitest';
import { parseBlockMarkdown, parseInlineMarkdown } from '../src/lib/chatMarkdown';

describe('chatMarkdown parser', () => {
  it('handles bold, italic, code, and NPWP badges', () => {
    const input =
      'Identitas: **PT Nusantara** dengan *status aktif* dan kode `TAX-01` serta NPWP: 01.394.821.4-012.000.';
    const tokens = parseInlineMarkdown(input);

    expect(tokens.some((t) => t.type === 'bold' && t.value === 'PT Nusantara')).toBe(true);
    expect(tokens.some((t) => t.type === 'italic' && t.value === 'status aktif')).toBe(true);
    expect(tokens.some((t) => t.type === 'code' && t.value === 'TAX-01')).toBe(true);
    expect(tokens.some((t) => t.type === 'badge_npwp')).toBe(true);
  });

  it('recognizes headers, bullets, formulas, and dividers', () => {
    const doc = [
      '## Ringkasan Pajak',
      '---',
      '- Poin 1: **Dividen Bebas**',
      '- Poin 2: Kredit Pajak PPh 24',
      'Rumus: Laba Fiskal = Laba Komersial + Koreksi Positif − Koreksi Negatif',
      '1. Langkah verifikasi dokumen',
    ].join('\n');

    const blocks = parseBlockMarkdown(doc);

    expect(blocks[0]?.type).toBe('h2');
    expect(blocks[0]?.content).toBe('Ringkasan Pajak');
    expect(blocks[1]?.type).toBe('divider');
    expect(blocks[2]?.type).toBe('bullet');
    expect(blocks[3]?.type).toBe('bullet');
    expect(blocks[4]?.type).toBe('formula');
    expect(blocks[5]?.type).toBe('ordered');
    expect(blocks[5]?.order).toBe(1);
  });
});
