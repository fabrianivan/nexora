/**
 * Corporate income tax computation per jurisdiction, driven by the fiscal
 * reconciliation lines. Pure and deterministic (unit-tested).
 */
import type { CountryCode } from '@/data/multiCountryTaxData';
import type { FiscalReconciliationItem } from '@/data/indonesiaTaxData';

export interface CreditLine {
  id: string;
  label: string;
  amount: number;
}

export interface CitStep {
  label: string;
  formula: string;
  amount: number;
}

export interface CitResult {
  revenue: number;
  expenses: number;
  commercialProfit: number;
  positive: number;
  negative: number;
  taxableIncome: number;
  facilityApplied: boolean;
  steps: CitStep[];
  taxDue: number;
  effectiveRate: number;
  credits: number;
  payable: number;
  overpaid: number;
}

export const STANDARD_RATE: Record<CountryCode, number> = { ID: 0.22, SG: 0.17, MY: 0.24, US: 0.21 };

export const FACILITY: Record<CountryCode, { label: string; basis: string } | null> = {
  ID: { label: 'Fasilitas Pasal 31E', basis: 'Pengurangan tarif 50% atas PKP dari bagian peredaran bruto s.d. Rp 4,8 M (peredaran ≤ Rp 50 M)' },
  SG: { label: 'Partial Tax Exemption', basis: 'ITA s.43(6): 75% dari S$10.000 pertama dan 50% dari S$190.000 berikutnya dibebaskan' },
  MY: { label: 'Tarif UKM (SME)', basis: 'ITA 1967 Sch.1: 15% s.d. RM150.000, 17% s.d. RM600.000, 24% sisanya' },
  US: null,
};

export const RETURN_FORM: Record<CountryCode, { name: string; short: string; authority: string; deadline: string }> = {
  ID: { name: 'SPT Tahunan PPh Badan 1771', short: 'SPT 1771', authority: 'DJP Coretax', deadline: '2027-04-30' },
  SG: { name: 'Form C-S (Corporate Income Tax)', short: 'Form C-S', authority: 'IRAS myTax Portal', deadline: '2027-11-30' },
  MY: { name: 'Borang C (e-C) YA 2026', short: 'Borang C', authority: 'LHDN MyTax', deadline: '2027-07-31' },
  US: { name: 'Form 1120 U.S. Corporation Income Tax Return', short: 'Form 1120', authority: 'IRS MeF', deadline: '2027-04-15' },
};

export const DEFAULT_CREDITS: Record<CountryCode, CreditLine[]> = {
  ID: [
    { id: 'c-pph22', label: 'PPh Pasal 22 dipungut pihak lain', amount: 15_405_000 },
    { id: 'c-pph23', label: 'PPh Pasal 23 dipotong pelanggan', amount: 35_500_000 },
    { id: 'c-pph25', label: 'Angsuran PPh Pasal 25 Jan–Okt', amount: 30_000_000 },
  ],
  SG: [{ id: 'c-eci', label: 'Estimated tax paid (ECI instalments)', amount: 15_000 }],
  MY: [{ id: 'c-cp204', label: 'Ansuran CP204 (9 bulan)', amount: 112_500 }],
  US: [
    { id: 'c-q1', label: 'Estimated tax Q1 (Form 1120-W)', amount: 26_250 },
    { id: 'c-q2', label: 'Estimated tax Q2', amount: 26_250 },
    { id: 'c-q3', label: 'Estimated tax Q3', amount: 52_500 },
  ],
};

const isIncome = (i: FiscalReconciliationItem) => i.group === 'PENDAPATAN' || i.group === 'PENDAPATAN_LAIN';

/** Fiscal amount of a line given its corrections (income: +pos −neg; expense: −pos +neg). */
export function fiscalOf(i: Pick<FiscalReconciliationItem, 'group' | 'commercialAmount' | 'positiveCorrection' | 'negativeCorrection'>): number {
  return isIncome(i as FiscalReconciliationItem)
    ? i.commercialAmount + i.positiveCorrection - i.negativeCorrection
    : i.commercialAmount - i.positiveCorrection + i.negativeCorrection;
}

export function computeCit(items: FiscalReconciliationItem[], country: CountryCode, applyFacility: boolean, credits: CreditLine[]): CitResult {
  const revenue = items.filter(isIncome).reduce((s, i) => s + i.commercialAmount, 0);
  const grossRevenue = items.filter((i) => i.group === 'PENDAPATAN').reduce((s, i) => s + i.commercialAmount, 0) || revenue;
  const expenses = items.filter((i) => !isIncome(i)).reduce((s, i) => s + i.commercialAmount, 0);
  const commercialProfit = revenue - expenses;
  const positive = items.reduce((s, i) => s + i.positiveCorrection, 0);
  const negative = items.reduce((s, i) => s + i.negativeCorrection, 0);
  const taxableIncome = Math.max(0, commercialProfit + positive - negative);
  const steps: CitStep[] = [];
  let taxDue = 0;
  let facilityApplied = false;
  const r = STANDARD_RATE[country];

  if (country === 'ID') {
    if (applyFacility && grossRevenue > 0 && grossRevenue <= 50_000_000_000) {
      facilityApplied = true;
      const share = Math.min(1, 4_800_000_000 / grossRevenue);
      const facilityPart = Math.round(taxableIncome * share);
      const normalPart = taxableIncome - facilityPart;
      steps.push({ label: 'PKP yang mendapat fasilitas', formula: `min(1; 4,8 M ÷ peredaran bruto) × PKP`, amount: facilityPart });
      steps.push({ label: 'PPh atas bagian fasilitas', formula: '50% × 22% × PKP fasilitas', amount: facilityPart * 0.11 });
      if (normalPart > 0) steps.push({ label: 'PPh atas bagian normal', formula: '22% × sisa PKP', amount: normalPart * r });
      taxDue = facilityPart * 0.11 + normalPart * r;
    } else {
      steps.push({ label: 'PPh badan tarif normal', formula: '22% × PKP', amount: taxableIncome * r });
      taxDue = taxableIncome * r;
    }
  } else if (country === 'SG') {
    let chargeable = taxableIncome;
    if (applyFacility) {
      facilityApplied = true;
      const exempt = 0.75 * Math.min(10_000, taxableIncome) + 0.5 * Math.min(190_000, Math.max(0, taxableIncome - 10_000));
      chargeable = taxableIncome - exempt;
      steps.push({ label: 'Partial tax exemption', formula: '75% × S$10k + 50% × S$190k berikutnya', amount: -exempt });
    }
    steps.push({ label: 'Corporate tax', formula: '17% × chargeable income', amount: chargeable * r });
    taxDue = chargeable * r;
  } else if (country === 'MY') {
    if (applyFacility) {
      facilityApplied = true;
      const t1 = Math.min(150_000, taxableIncome);
      const t2 = Math.min(450_000, Math.max(0, taxableIncome - 150_000));
      const t3 = Math.max(0, taxableIncome - 600_000);
      steps.push({ label: 'Lapisan 1', formula: '15% × RM150.000 pertama', amount: t1 * 0.15 });
      steps.push({ label: 'Lapisan 2', formula: '17% × RM450.000 berikutnya', amount: t2 * 0.17 });
      if (t3 > 0) steps.push({ label: 'Lapisan 3', formula: '24% × sisa', amount: t3 * r });
      taxDue = t1 * 0.15 + t2 * 0.17 + t3 * r;
    } else {
      steps.push({ label: 'Cukai pendapatan', formula: '24% × pendapatan bercukai', amount: taxableIncome * r });
      taxDue = taxableIncome * r;
    }
  } else {
    steps.push({ label: 'Federal income tax', formula: '21% × taxable income (IRC §11)', amount: taxableIncome * r });
    taxDue = taxableIncome * r;
  }

  taxDue = Math.round(taxDue);
  const creditTotal = credits.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const balance = taxDue - creditTotal;
  return {
    revenue,
    expenses,
    commercialProfit,
    positive,
    negative,
    taxableIncome,
    facilityApplied,
    steps,
    taxDue,
    effectiveRate: commercialProfit > 0 ? taxDue / commercialProfit : 0,
    credits: creditTotal,
    payable: Math.max(0, balance),
    overpaid: Math.max(0, -balance),
  };
}
