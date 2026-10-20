import { describe, expect, it } from 'vitest';
import { entitySchema, type CorporateEntity, type TaxDocument } from '../src/lib/domain';
import { detectFraud, zScores } from '../src/lib/fraud';
import { validateOwnership } from '../src/lib/ownership';
import { calculateReconciliation } from '../src/lib/reconciliation';
import { createReturnDraft, returnDraftToXml } from '../src/lib/returns';
import { simulateTax } from '../src/lib/tax';

const entity: CorporateEntity = { id: 'entity-1', name: 'Valid Company Inc.', country: 'US', taxId: '12-3456789', address: '100 Main Street, Delaware', fiscalYearEnd: '12-31', createdAt: '2026-01-01T00:00:00.000Z' };
const field = <T>(value: T) => ({ value, source: 'manual' as const });
const document = (overrides: Partial<TaxDocument> = {}): TaxDocument => ({ id: 'doc-1', entityId: 'entity-1', country: 'ID', type: 'e_invoice', attachmentName: 'invoice.pdf', attachmentType: 'application/pdf', attachmentSize: 1000, number: field('INV-1'), date: field('2026-01-01'), counterparty: field('Vendor'), counterpartyTaxId: field('1234567890123456'), taxableBase: field(100), taxAmount: field(11), totalAmount: field(111), ownershipPercentage: field(null), invoiceUuid: field('UUID'), taxIdValidated: true, hasSupportingEvidence: true, deductible: true, createdAt: '2026-01-01T00:00:00.000Z', ...overrides });

describe('tax calculation', () => {
  it('calculates deterministic Indonesian tax and treaty WHT', () => {
    const result = simulateTax({ country: 'ID', taxableIncome: 1000, taxableSales: 2000, crossBorderPayment: 500, treatyEligible: true, consolidatedRevenueEur: 1, coveredTaxes: 0 });
    expect(result).toMatchObject({ corporateTax: 220, indirectTax: 220, withholdingTax: 50, pillarTwoApplies: false, total: 490 });
  });
  it('calculates Pillar Two top-up only above threshold', () => expect(simulateTax({ country: 'SG', taxableIncome: 1000, taxableSales: 0, crossBorderPayment: 0, treatyEligible: false, consolidatedRevenueEur: 750_000_000, coveredTaxes: 100 }).pillarTwoTopUp).toBeCloseTo(50));
});

describe('reconciliation and return', () => {
  it('reconciles and serializes validated XML', () => {
    const totals = calculateReconciliation([{ id: '1', entityId: entity.id, description: 'Profit', commercialAmount: 1000, positiveCorrection: 100, negativeCorrection: 50 }], 'US');
    expect(totals).toEqual({ commercialProfit: 1000, positiveCorrections: 100, negativeCorrections: 50, taxableIncome: 1050, taxDue: 220.5 });
    expect(returnDraftToXml(createReturnDraft(entity, totals))).toContain('<TaxableIncome>1050</TaxableIncome>');
  });
});

describe('fraud rules and z-score', () => {
  it('requires minimum observations for z-score', () => expect(zScores([1, 2, 3, 4])).toBeNull());
  it('detects TBTS, missing trader, MyInvois UUID, and non-deductible evidence', () => {
    const docs = [document({ taxIdValidated: false }), document({ id: 'sg', country: 'SG', taxIdValidated: false }), document({ id: 'my', country: 'MY', invoiceUuid: field('') }), document({ id: 'nd', deductible: false })];
    expect(detectFraud(docs).findings.map((finding) => finding.rule)).toEqual(expect.arrayContaining(['TBTS', 'MISSING_TRADER', 'MYINVOIS_UUID', 'NON_DEDUCTIBLE']));
  });
  it('detects split invoicing and statistical outlier', () => {
    const docs = [10,10,10,10,1000].map((amount,index)=>document({ id:`d${index}`, number:field(`I${index}`), totalAmount:field(amount), taxableBase:field(Math.max(0,amount-11)), counterparty:field('Same Vendor'), date:field(index<3?'2026-01-01':`2026-01-0${index}`) }));
    const rules = detectFraud(docs).findings.map((finding)=>finding.rule);
    expect(rules).toContain('SPLIT_INVOICING'); expect(rules).toContain('Z_SCORE');
  });
});

describe('entity and ownership validation', () => {
  it('validates identifiers by country', () => expect(entitySchema.safeParse({ ...entity, country: 'ID', taxId: 'invalid' }).success).toBe(false));
  it('detects invalid totals and circular ownership', () => {
    const second = { ...entity, id: 'entity-2', name: 'Second Inc.' };
    const issues = validateOwnership([entity, second], [{ id: '1', ownerId: entity.id, ownedId: second.id, percentage: 90 }, { id: '2', ownerId: second.id, ownedId: entity.id, percentage: 100 }]);
    expect(issues.map((issue)=>issue.type)).toEqual(expect.arrayContaining(['total','circular']));
  });
});
