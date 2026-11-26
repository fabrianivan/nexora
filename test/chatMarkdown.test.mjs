import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInlineMarkdown, parseBlockMarkdown } from '../src/lib/chatMarkdown.ts';

test('parseInlineMarkdown - handles bold, italic, code, and NPWP badges', () => {
  const input = 'Identitas: **PT Nusantara** dengan *status aktif* dan kode `TAX-01` serta NPWP: 01.394.821.4-012.000.';
  const tokens = parseInlineMarkdown(input);

  assert.equal(tokens.some(t => t.type === 'bold' && t.value === 'PT Nusantara'), true);
  assert.equal(tokens.some(t => t.type === 'italic' && t.value === 'status aktif'), true);
  assert.equal(tokens.some(t => t.type === 'code' && t.value === 'TAX-01'), true);
  assert.equal(tokens.some(t => t.type === 'badge_npwp'), true);
});

test('parseBlockMarkdown - recognizes headers, bullets, formulas, and dividers', () => {
  const doc = [
    '## Ringkasan Pajak',
    '---',
    '- Poin 1: **Dividen Bebas**',
    '- Poin 2: Kredit Pajak PPh 24',
    'Rumus: Laba Fiskal = Laba Komersial + Koreksi Positif − Koreksi Negatif',
    '1. Langkah verifikasi dokumen',
  ].join('\n');

  const blocks = parseBlockMarkdown(doc);

  assert.equal(blocks[0].type, 'h2');
  assert.equal(blocks[0].content, 'Ringkasan Pajak');
  assert.equal(blocks[1].type, 'divider');
  assert.equal(blocks[2].type, 'bullet');
  assert.equal(blocks[3].type, 'bullet');
  assert.equal(blocks[4].type, 'formula');
  assert.equal(blocks[5].type, 'ordered');
  assert.equal(blocks[5].order, 1);
});
