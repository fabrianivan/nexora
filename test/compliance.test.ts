import { describe, expect, it } from 'vitest';
import { documentSchema } from '../src/lib/domain';
import {
  SAMPLE_DOCUMENTS, createInitialComplianceState, runRiskEngine, proposeDecision, decide, canApprove,
  emptyReview, entityRiskScore, applyCorrectionToItems, isCorrectionReflected, normalizeComplianceState, type Actor,
} from '../src/lib/compliance';

const ENTITIES = [
  { id: 'ENT-ID-001', legalName: 'PT Nusantara Kreasi Digital Tbk', countryCode: 'ID' as const, taxId: '0013948214012000' },
  { id: 'ENT-SG-002', legalName: 'Nusantara FinTech Pte. Ltd.', countryCode: 'SG' as const, taxId: '202319482K' },
  { id: 'ENT-MY-003', legalName: 'Nusantara Digital Solutions Sdn. Bhd.', countryCode: 'MY' as const, taxId: 'C25849102090' },
  { id: 'ENT-US-004', legalName: 'Nusantara AI Technologies, Inc.', countryCode: 'US' as const, taxId: '88-4920193' },
];
const maker: Actor = { id: 'md_sg', name: 'Marcus Tan', role: 'Managing Director SG', isParentExecutive: false };
const cfo: Actor = { id: 'cfo_parent', name: 'Sri Mulyani Dewi', role: 'Group CFO', isParentExecutive: true };

describe('sample documents', () => {
  it('are schema-valid except for the intentionally wrong TBTS PPN', () => {
    for (const { doc } of SAMPLE_DOCUMENTS) {
      if (doc.type !== 'e_invoice') continue;
      const r = documentSchema.safeParse(doc);
      expect(r.success, `${doc.id}: ${r.success ? '' : JSON.stringify(r.error.issues)}`).toBe(true);
    }
  });
});

describe('risk engine', () => {
  const { findings, zScoreReady } = runRiskEngine(SAMPLE_DOCUMENTS, ENTITIES);
  const rules = findings.map((f) => f.rule);
  it('surfaces every rule family across the group', () => {
    expect(zScoreReady).toBe(true);
    expect(rules).toEqual(expect.arrayContaining(['TBTS', 'MISSING_TRADER', 'SPLIT_INVOICING', 'Z_SCORE', 'MYINVOIS_UUID', 'NON_DEDUCTIBLE', 'XV_TAXID', 'XV_NAME', 'XV_OWNERSHIP']));
  });
  it('has unique ids and is sorted by score', () => {
    expect(new Set(findings.map((f) => f.id)).size).toBe(findings.length);
    for (let i = 1; i < findings.length; i++) expect(findings[i - 1].score).toBeGreaterThanOrEqual(findings[i].score);
  });
  it('suggests a fiscal correction for the TBTS invoice', () => {
    const tbts = findings.find((f) => f.rule === 'TBTS')!;
    expect(tbts.correction).toMatchObject({ accountCode: '5100', amount: 120_000_000 });
    expect(tbts.taxImpact).toBeCloseTo(26_400_000);
  });
  it('groups split invoicing documents', () => {
    expect(findings.find((f) => f.rule === 'SPLIT_INVOICING')!.documentIds).toHaveLength(3);
  });
});

describe('maker-checker review', () => {
  it('blocks self-approval and non-parent checkers', () => {
    const proposed = proposeDecision(emptyReview(), cfo, 'confirm', 'Vendor fiktif');
    expect(canApprove(proposed, cfo).ok).toBe(false);
    const byMaker = proposeDecision(emptyReview(), cfo, 'confirm', 'Vendor fiktif');
    expect(canApprove(byMaker, maker).ok).toBe(false);
  });
  it('confirms after independent approval and keeps history', () => {
    const r = decide(proposeDecision(emptyReview(), maker, 'confirm', 'Bukti lemah'), cfo, true);
    expect(r.status).toBe('confirmed');
    expect(r.history.map((h) => h.action)).toEqual(['proposed', 'approved']);
  });
  it('returns to open when the checker rejects', () => {
    expect(decide(proposeDecision(emptyReview(), maker, 'dismiss', 'Sudah ada SKD'), cfo, false).status).toBe('open');
  });
  it('requires a meaningful note', () => expect(() => proposeDecision(emptyReview(), maker, 'confirm', 'ok')).toThrow());
});

describe('scores & reconciliation link', () => {
  it('raises the risk score as findings are resolved', () => {
    const { findings } = runRiskEngine(SAMPLE_DOCUMENTS, ENTITIES);
    const id = findings.filter((f) => f.entityId === 'ENT-ID-001');
    const before = entityRiskScore(id, {});
    const after = entityRiskScore(id, Object.fromEntries(id.map((f) => [f.id, { status: 'confirmed' as const, history: [] }])));
    expect(after).toBe(100);
    expect(before).toBeLessThan(after);
  });
  it('applies a correction once', () => {
    const items = [{ accountCode: '6300', commercialAmount: 340, positiveCorrection: 9, negativeCorrection: 0, fiscalAmount: 331, correctionReason: 'Denda' }];
    const c = { accountCode: '6300', accountName: 'Opex', amount: 14, basis: 'x' };
    expect(isCorrectionReflected(items, c, '[F1]')).toBe(false);
    const once = applyCorrectionToItems(items, c, '[F1]', 'Konsultan');
    expect(once.items[0]).toMatchObject({ positiveCorrection: 23, fiscalAmount: 317 });
    expect(applyCorrectionToItems(once.items, c, '[F1]', 'Konsultan').changed).toBe(false);
  });
  it('falls back to the sample state for invalid storage', () => {
    expect(normalizeComplianceState(null).documents.length).toBe(createInitialComplianceState().documents.length);
  });
});
