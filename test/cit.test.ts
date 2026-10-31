import { describe, expect, it } from 'vitest';
import { computeCit, DEFAULT_CREDITS, fiscalOf } from '../src/lib/cit';
import { MULTI_COUNTRY_DATA } from '../src/data/multiCountryTaxData';
import { fiscalReconciliationData } from '../src/data/indonesiaTaxData';
import { paymentStatus, eventStatus } from '../src/lib/schedule';
import { money, moneyCompact, daysUntil } from '../src/lib/format';

describe('corporate income tax', () => {
  it('applies Pasal 31E to the whole PKP when gross revenue ≤ Rp 4,8 M', () => {
    const r = computeCit(fiscalReconciliationData, 'ID', true, DEFAULT_CREDITS.ID);
    expect(r.commercialProfit).toBe(837_000_000);
    expect(r.taxableIncome).toBe(963_350_000);
    expect(r.taxDue).toBe(105_968_500);
    expect(r.credits).toBe(80_905_000);
    expect(r.payable).toBe(25_063_500);
  });

  it('uses the 22% normal rate without the facility', () => {
    expect(computeCit(fiscalReconciliationData, 'ID', false, []).taxDue).toBe(Math.round(963_350_000 * 0.22));
  });

  it('computes Singapore partial tax exemption', () => {
    const r = computeCit(MULTI_COUNTRY_DATA.SG.fiscalReconciliation, 'SG', true, []);
    expect(r.taxableIncome).toBe(256_500);
    expect(r.taxDue).toBe(Math.round((256_500 - 7_500 - 95_000) * 0.17));
  });

  it('computes Malaysian SME tiers and US flat rate', () => {
    const my = computeCit(MULTI_COUNTRY_DATA.MY.fiscalReconciliation, 'MY', true, []);
    expect(my.taxDue).toBe(Math.round(150_000 * 0.15 + 450_000 * 0.17 + (my.taxableIncome - 600_000) * 0.24));
    const us = computeCit(MULTI_COUNTRY_DATA.US.fiscalReconciliation, 'US', false, []);
    expect(us.taxDue).toBe(Math.round(us.taxableIncome * 0.21));
  });

  it('reports overpayment when credits exceed tax', () => {
    const r = computeCit(fiscalReconciliationData, 'ID', true, [{ id: 'x', label: 'x', amount: 200_000_000 }]);
    expect(r.payable).toBe(0);
    expect(r.overpaid).toBe(200_000_000 - r.taxDue);
  });

  it('derives fiscal amount by line type', () => {
    expect(fiscalOf({ group: 'BEBAN_USAHA', commercialAmount: 100, positiveCorrection: 30, negativeCorrection: 0 })).toBe(70);
    expect(fiscalOf({ group: 'PENDAPATAN_LAIN', commercialAmount: 42, positiveCorrection: 0, negativeCorrection: 42 })).toBe(0);
  });
});

describe('schedule & formatting', () => {
  const today = new Date(2026, 9, 28);
  it('derives overdue status from the due date', () => {
    const base = { id: 'p', entityId: 'e', taxType: 't', kapKjs: 'k', period: 'p', amount: 1 };
    expect(paymentStatus({ ...base, dueDate: '2026-10-20', status: 'Belum dibayar' }, today)).toBe('Terlambat');
    expect(paymentStatus({ ...base, dueDate: '2026-11-20', status: 'Belum dibayar' }, today)).toBe('Belum dibayar');
    expect(paymentStatus({ ...base, dueDate: '2026-10-20', status: 'Dibayar' }, today)).toBe('Dibayar');
    const ev = { id: 'e', entityId: 'e', title: 't', jurisdiction: 'j', taxType: 't', assignee: 'a', regulationBasis: 'r', description: 'd' };
    expect(eventStatus({ ...ev, dueDate: '2026-10-28', status: 'Upcoming' }, today)).toBe('Today');
    expect(eventStatus({ ...ev, dueDate: '2026-10-01', status: 'Upcoming' }, today)).toBe('Overdue');
    expect(daysUntil('2026-11-07', today)).toBe(10);
  });
  it('formats money per jurisdiction', () => {
    expect(money(120_000_000, 'ID')).toBe('Rp 120.000.000');
    expect(money(84_000, 'SG')).toBe('S$ 84,000');
    expect(moneyCompact(1_230_000_000, 'ID')).toBe('Rp 1,23 M');
    expect(moneyCompact(290_400_000, 'ID')).toBe('Rp 290,4 jt');
  });
});
