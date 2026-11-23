/**
 * Smart Tax Computation Engine — pure, deterministic, multi-jurisdiction (ID / SG / MY / US).
 *
 * Powers Nexora's "Komputasi Pintar" capabilities:
 *   1. Multi-regime tax optimization & threshold cliff detection
 *   2. Reconciliation line anomaly scanner (missing legal basis, PPh Final, non-deductible, drift)
 *   3. Next-year statutory instalment projector (PPh 25 / ECI / CP204 / Form 1120-W)
 *   4. Inverse Tax Solver (Goal-Seek) over non-linear CIT slabs
 *   5. 2D Sensitivity Matrix & smart scenario engine (taxDue + cash-flow deltas)
 *   6. Multi-jurisdiction Group Consolidation & OECD Pillar Two (15% GloBE) check
 *   7. Computation readiness score & prioritized recommendations
 */
import type { CountryCode } from '@/data/multiCountryTaxData';
import type { FiscalReconciliationItem, IndustryBenchmark } from '@/data/indonesiaTaxData';
import { computeCit, FACILITY, fiscalOf, STANDARD_RATE, type CitResult, type CreditLine } from './cit';
import { isCorrectionReflected, type FindingReview, type RiskFinding } from './compliance';
import { toIdr } from './fx';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RegimeOption {
  id: string;
  label: string;
  basis: string;
  eligible: boolean;
  eligibilityNote: string;
  taxDue: number;
  effectiveRate: number;
  /** Payable minus overpaid (positive = balance due, negative = overpaid). */
  netBalance: number;
  /** Saving compared to current position (positive = saves tax). */
  savingVsCurrent: number;
  isCurrent: boolean;
  isRecommended: boolean;
  /** When true, can be activated directly via `apply31EFacility` toggle. */
  toggleFacilityValue?: boolean;
  /** True for informational / alternative statutory regimes that require formal election. */
  advisoryOnly?: boolean;
}

export interface ThresholdWarning {
  severity: 'warning' | 'danger';
  title: string;
  detail: string;
  headroom: number;
  threshold: number;
}

export interface RegimeComparison {
  regimes: RegimeOption[];
  currentRegimeId: string;
  bestEligibleId: string;
  bestToggleSaving: number;
  bestOverallSaving: number;
  thresholdWarning: ThresholdWarning | null;
}

export type AnomalySeverity = 'danger' | 'warning' | 'info';

export interface LineAnomaly {
  id: string;
  itemId: string;
  accountCode: string;
  accountName: string;
  kind: 'missing_basis' | 'unexcluded_final_income' | 'unreviewed_non_deductible' | 'over_correction' | 'fiscal_drift';
  severity: AnomalySeverity;
  title: string;
  detail: string;
  suggestedBasis?: string;
}

export interface InstalmentProjection {
  label: string;
  basis: string;
  frequency: 'bulanan' | 'kuartalan';
  periodsPerYear: number;
  annualBase: number;
  perPeriodAmount: number;
  /** Statutory floor per period when applicable (e.g., MY CP204 85% rule). */
  statutoryFloorPerPeriod?: number;
  /** Estimated current per-period instalment inferred from credits, if any. */
  currentPerPeriod: number | null;
  deltaPerPeriod: number | null;
  note: string;
}

export type GoalMode = 'target_etr' | 'zero_payable' | 'max_tax_due';

export interface TaxGoalInput {
  mode: GoalMode;
  /** Decimal ETR target, e.g. 0.15 for 15% (used when mode === 'target_etr'). */
  targetEtr?: number;
  /** Maximum tax due in entity currency (used when mode === 'max_tax_due'). */
  maxTaxDue?: number;
}

export interface TaxGoalSolution {
  mode: GoalMode;
  achievable: boolean;
  alreadyMet: boolean;
  summary: string;
  currentTaxDue: number;
  currentEffectiveRate: number;
  currentNetBalance: number;
  targetTaxDue: number;
  /** Required reduction in taxable income (PKP) to hit the target. */
  requiredPkpReduction: number;
  /** How much of the required reduction can be covered by removing positive corrections (with valid documentation). */
  coverableByPositiveCorrections: number;
  /** Remaining reduction beyond existing positive corrections (requires deductible expenses or eligible incentives). */
  remainingReductionBeyondPositive: number;
  /** Alternative path: exact additional tax credits needed (for zero_payable mode). */
  requiredAdditionalCredits: number;
  /** Verified CIT result after applying the solved PKP reduction. */
  verifiedTaxDue: number;
  verifiedEffectiveRate: number;
  verifiedNetBalance: number;
  complianceNote: string;
}

export interface SensitivityCell {
  revenuePct: number;
  columnId: string;
  taxDue: number;
  effectiveRate: number;
  netBalance: number;
  facilityApplied: boolean;
  /** True when revenue shock pushes an ID entity past Rp 4,8 M or Rp 50 M. */
  cliffNote?: string;
}

export interface SensitivityMatrix {
  revenueSteps: number[];
  columns: { id: string; label: string; description: string }[];
  rows: { revenuePct: number; projectedRevenue: number; cells: SensitivityCell[] }[];
}

export interface SmartScenario {
  id: string;
  label: string;
  description: string;
  category: 'deduction' | 'facility' | 'credit' | 'growth' | 'efficiency';
  baseTaxDue: number;
  scenarioTaxDue: number;
  taxDueDelta: number;
  baseNetBalance: number;
  scenarioNetBalance: number;
  /** Negative means less cash payable / bigger refund (favorable). */
  cashDelta: number;
  baseEffective: number;
  scenarioEffective: number;
  /** Which metric carries the primary impact of this scenario. */
  primaryMetric: 'taxDue' | 'cash';
  note?: string;
}

export interface GroupEntityInput {
  entityId: string;
  legalName: string;
  flag: string;
  country: CountryCode;
  items: FiscalReconciliationItem[];
  applyFacility: boolean;
  credits: CreditLine[];
}

export interface GroupEntityRow {
  entityId: string;
  legalName: string;
  flag: string;
  country: CountryCode;
  commercialProfit: number;
  taxableIncome: number;
  taxDue: number;
  netBalance: number;
  effectiveRate: number;
  commercialProfitIdr: number;
  taxDueIdr: number;
  netBalanceIdr: number;
  pillarTwoGap: number;
  pillarTwoTopUpIdr: number;
}

export interface GroupTaxConsolidation {
  rows: GroupEntityRow[];
  totalProfitIdr: number;
  totalTaxDueIdr: number;
  totalNetBalanceIdr: number;
  weightedEtr: number;
  totalPillarTwoTopUpIdr: number;
  belowMinimumCount: number;
}

export interface PendingCorrectionSummary {
  findings: RiskFinding[];
  count: number;
  totalCorrectionAmount: number;
  /** Additional CIT due once confirmed positive corrections are added to reconciliation. */
  additionalTaxDue: number;
  /** Indicative audit penalty avoided by self-correcting before audit/SP2DK. */
  estimatedPenaltyAvoided: number;
  penaltyBasis: string;
}

export interface ReadinessFactor {
  id: string;
  label: string;
  points: number;
  maxPoints: number;
  status: 'ok' | 'warning' | 'danger';
  detail: string;
}

export interface SmartAnalysis {
  cit: CitResult;
  grossRevenue: number;
  regimes: RegimeComparison;
  anomalies: LineAnomaly[];
  instalment: InstalmentProjection;
  pendingCorrections: PendingCorrectionSummary;
  scenarios: SmartScenario[];
  sensitivity: SensitivityMatrix;
  readinessScore: number;
  readinessBand: { label: string; tone: 'emerald' | 'amber' | 'rose' };
  factors: ReadinessFactor[];
  benchmarkRisks: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const isIncome = (i: FiscalReconciliationItem) => i.group === 'PENDAPATAN' || i.group === 'PENDAPATAN_LAIN';

export function grossRevenueOf(items: FiscalReconciliationItem[]): number {
  const operating = items.filter((i) => i.group === 'PENDAPATAN').reduce((s, i) => s + i.commercialAmount, 0);
  if (operating > 0) return operating;
  return items.filter(isIncome).reduce((s, i) => s + i.commercialAmount, 0);
}

const PENALTY_INFO: Record<CountryCode, { rate: number; basis: string }> = {
  ID: { rate: 0.48, basis: 'Estimasi sanksi bunga maksimal 24 bulan (Pasal 13 ayat (2) UU KUP)' },
  SG: { rate: 1.0, basis: 'Penalti 100% atas pajak kurang lapor akibat kelalaian (ITA s.95)' },
  MY: { rate: 0.45, basis: 'Penalti 45% atas pelaporan tidak tepat saat audit (ITA 1967 s.113(2))' },
  US: { rate: 0.2, basis: 'Accuracy-related penalty 20% atas substantial understatement (IRC §6662)' },
};

const FINAL_INCOME_RE = /bunga|deposito|giro|sewa tanah|sewa bangunan|dividen|final/i;
const NON_DEDUCTIBLE_RE = /jamuan|entertainment|representasi|natura|kenikmatan|sumbangan|denda|sanksi|motor car|s-plate|golf|hadiah|gift/i;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Multi-Regime Comparison & Cliff Detection
// ─────────────────────────────────────────────────────────────────────────────

export function compareTaxRegimes(
  items: FiscalReconciliationItem[],
  country: CountryCode,
  applyFacility: boolean,
  credits: CreditLine[],
): RegimeComparison {
  const current = computeCit(items, country, applyFacility, credits);
  const currentNet = current.payable - current.overpaid;
  const grossRev = grossRevenueOf(items);
  const regimes: RegimeOption[] = [];
  let thresholdWarning: ThresholdWarning | null = null;

  if (country === 'ID') {
    const normal = computeCit(items, 'ID', false, credits);
    const fac = computeCit(items, 'ID', true, credits);
    const eligible31E = grossRev > 0 && grossRev <= 50_000_000_000;
    const eligibleUmkm = grossRev > 0 && grossRev <= 4_800_000_000;
    const umkmTax = Math.round(grossRev * 0.005);
    const umkmEtr = current.commercialProfit > 0 ? umkmTax / current.commercialProfit : 0;

    regimes.push(
      {
        id: 'id_normal',
        label: 'Tarif Normal PPh Badan (22%)',
        basis: 'Pasal 17 ayat (1) huruf b UU PPh (UU HPP)',
        eligible: true,
        eligibilityNote: 'Berlaku untuk seluruh wajib pajak badan dalam negeri.',
        taxDue: normal.taxDue,
        effectiveRate: normal.effectiveRate,
        netBalance: normal.payable - normal.overpaid,
        savingVsCurrent: current.taxDue - normal.taxDue,
        isCurrent: !current.facilityApplied,
        isRecommended: false,
        toggleFacilityValue: false,
      },
      {
        id: 'id_31e',
        label: 'Fasilitas Pasal 31E (Diskon 50%)',
        basis: 'Pasal 31E UU PPh — tarif 11% atas proporsi peredaran bruto s.d. Rp 4,8 M',
        eligible: eligible31E,
        eligibilityNote: eligible31E
          ? `Memenuhi syarat (omzet ≤ Rp 50 M; porsi fasilitas ${Math.round(Math.min(1, 4_800_000_000 / grossRev) * 100)}%).`
          : 'Tidak memenuhi syarat karena peredaran bruto melebihi Rp 50 miliar.',
        taxDue: fac.taxDue,
        effectiveRate: fac.effectiveRate,
        netBalance: fac.payable - fac.overpaid,
        savingVsCurrent: current.taxDue - fac.taxDue,
        isCurrent: current.facilityApplied,
        isRecommended: false,
        toggleFacilityValue: true,
      },
      {
        id: 'id_umkm_final',
        label: 'PPh Final UMKM 0,5% (PP 55/2022)',
        basis: 'PP 55/2022 — 0,5% × peredaran bruto; maks. 3 tahun pajak untuk PT',
        eligible: eligibleUmkm,
        eligibilityNote: eligibleUmkm
          ? 'Indikatif untuk PT baru (maks. 3 tahun pajak). Pajak bersifat final; kredit PPh 22/23/25 tidak mengurangi PPh Final.'
          : 'Tidak memenuhi syarat karena peredaran bruto melebihi Rp 4,8 miliar.',
        taxDue: umkmTax,
        effectiveRate: umkmEtr,
        netBalance: umkmTax,
        savingVsCurrent: current.taxDue - umkmTax,
        isCurrent: false,
        isRecommended: false,
        advisoryOnly: true,
      },
    );

    if (grossRev > 4_300_000_000 && grossRev <= 4_800_000_000) {
      const headroom = 4_800_000_000 - grossRev;
      thresholdWarning = {
        severity: 'warning',
        title: 'Mendekati ambang Rp 4,8 miliar (Pasal 31E penuh & PP 55/2022)',
        detail: `Sisa ruang omzet hanya ${Math.round(headroom / 1_000_000)} juta sebelum melewati Rp 4,8 M. Di atas Rp 4,8 M, porsi tarif 11% mulai mengecil proporsional dan skema UMKM 0,5% tidak lagi berlaku.`,
        headroom,
        threshold: 4_800_000_000,
      };
    } else if (grossRev > 45_000_000_000 && grossRev <= 50_000_000_000) {
      const headroom = 50_000_000_000 - grossRev;
      thresholdWarning = {
        severity: 'danger',
        title: 'Mendekati cliff Rp 50 miliar (Batas Fasilitas Pasal 31E)',
        detail: `Jika peredaran bruto bertambah lebih dari ${Math.round(headroom / 1_000_000)} juta, Fasilitas Pasal 31E gugur seluruhnya dan seluruh PKP dikenai tarif penuh 22%.`,
        headroom,
        threshold: 50_000_000_000,
      };
    }
  } else if (country === 'SG') {
    const normal = computeCit(items, 'SG', false, credits);
    const pte = computeCit(items, 'SG', true, credits);
    const suteExempt =
      0.75 * Math.min(100_000, current.taxableIncome) +
      0.5 * Math.min(100_000, Math.max(0, current.taxableIncome - 100_000));
    const suteTax = Math.round(Math.max(0, current.taxableIncome - suteExempt) * 0.17);
    const suteBalance = suteTax - current.credits;

    regimes.push(
      {
        id: 'sg_normal',
        label: 'Corporate Tax 17% Flat',
        basis: 'Singapore ITA s.43',
        eligible: true,
        eligibilityNote: 'Tarif korporasi standar Singapura tanpa pembebasan.',
        taxDue: normal.taxDue,
        effectiveRate: normal.effectiveRate,
        netBalance: normal.payable - normal.overpaid,
        savingVsCurrent: current.taxDue - normal.taxDue,
        isCurrent: !current.facilityApplied,
        isRecommended: false,
        toggleFacilityValue: false,
      },
      {
        id: 'sg_pte',
        label: 'Partial Tax Exemption (PTE)',
        basis: 'ITA s.43(6) — 75% atas S$10k pertama + 50% atas S$190k berikutnya',
        eligible: true,
        eligibilityNote: 'Berlaku untuk seluruh perusahaan residen Singapura yang tidak memakai SUTE.',
        taxDue: pte.taxDue,
        effectiveRate: pte.effectiveRate,
        netBalance: pte.payable - pte.overpaid,
        savingVsCurrent: current.taxDue - pte.taxDue,
        isCurrent: current.facilityApplied,
        isRecommended: false,
        toggleFacilityValue: true,
      },
      {
        id: 'sg_sute',
        label: 'Start-Up Tax Exemption (SUTE)',
        basis: 'ITA s.43(6C) — 75% atas S$100k + 50% atas S$100k berikutnya',
        eligible: true,
        eligibilityNote: 'Khusus 3 tahun pajak pertama (YA) untuk perusahaan baru dengan ≤20 pemegang saham individu.',
        taxDue: suteTax,
        effectiveRate: current.commercialProfit > 0 ? suteTax / current.commercialProfit : 0,
        netBalance: suteBalance,
        savingVsCurrent: current.taxDue - suteTax,
        isCurrent: false,
        isRecommended: false,
        advisoryOnly: true,
      },
    );
  } else if (country === 'MY') {
    const normal = computeCit(items, 'MY', false, credits);
    const sme = computeCit(items, 'MY', true, credits);
    const smeEligible = grossRev <= 50_000_000;

    regimes.push(
      {
        id: 'my_normal',
        label: 'Tarif Korporasi Standar (24%)',
        basis: 'Malaysia ITA 1967 Sch.1',
        eligible: true,
        eligibilityNote: 'Berlaku untuk seluruh perusahaan residen Malaysia.',
        taxDue: normal.taxDue,
        effectiveRate: normal.effectiveRate,
        netBalance: normal.payable - normal.overpaid,
        savingVsCurrent: current.taxDue - normal.taxDue,
        isCurrent: !current.facilityApplied,
        isRecommended: false,
        toggleFacilityValue: false,
      },
      {
        id: 'my_sme',
        label: 'Tarif UKM / SME (15% / 17% / 24%)',
        basis: 'ITA 1967 Sch.1 — 15% s.d. RM150k, 17% s.d. RM600k, 24% sisanya',
        eligible: smeEligible,
        eligibilityNote: smeEligible
          ? 'Memenuhi syarat omzet ≤ RM50M (verifikasi juga modal disetor ≤ RM2,5M & batas kepemilikan induk).'
          : 'Tidak memenuhi syarat karena omzet melebihi RM50 juta.',
        taxDue: sme.taxDue,
        effectiveRate: sme.effectiveRate,
        netBalance: sme.payable - sme.overpaid,
        savingVsCurrent: current.taxDue - sme.taxDue,
        isCurrent: current.facilityApplied,
        isRecommended: false,
        toggleFacilityValue: true,
      },
    );
  } else {
    const normal = computeCit(items, 'US', false, credits);
    // Estimate indicative Federal R&D Tax Credit (IRC §41 Form 6765): direct tax credit vs deduction
    const rdLines = items.filter(
      (i) => !isIncome(i) && /r&d|research|engineer|payroll|cloud|tech|software|dev|gaji|beban pokok/i.test(i.accountName),
    );
    const qualifiedExpense = rdLines.reduce(
      (s, i) => s + (i.commercialAmount > 0 ? i.commercialAmount : i.negativeCorrection),
      0,
    );
    const hasExistingRdOffset = rdLines.some((i) => i.negativeCorrection > 0 && /r&d|6765|§41/i.test(`${i.accountName} ${i.legalBasis}`));
    const indicativeCredit = Math.min(
      Math.round(normal.taxDue * 0.25),
      Math.round(hasExistingRdOffset ? qualifiedExpense * 0.2 : qualifiedExpense * 0.06),
    );
    const rdNetTax = Math.max(0, normal.taxDue - indicativeCredit);

    regimes.push(
      {
        id: 'us_normal',
        label: 'Federal Corporate Tax (21%)',
        basis: 'IRC §11 — Form 1120',
        eligible: true,
        eligibilityNote: 'Tarif federal flat 21% atas taxable income korporasi AS.',
        taxDue: normal.taxDue,
        effectiveRate: normal.effectiveRate,
        netBalance: currentNet,
        savingVsCurrent: 0,
        isCurrent: true,
        isRecommended: false,
      },
      {
        id: 'us_rd_credit',
        label: 'Federal 21% + Estimasi Kredit R&D (Form 6765)',
        basis: 'IRC §41 — Research & Experimentation Credit (indikatif 6% QRE)',
        eligible: indicativeCredit > 0,
        eligibilityNote:
          indicativeCredit > 0
            ? 'Memerlukan dokumentasi proyek R&D dan Form 6765 untuk klaim kredit pajak federal.'
            : 'Tidak terdeteksi akun biaya R&D/teknologi yang memenuhi syarat.',
        taxDue: rdNetTax,
        effectiveRate: current.commercialProfit > 0 ? rdNetTax / current.commercialProfit : 0,
        netBalance: rdNetTax - normal.credits,
        savingVsCurrent: normal.taxDue - rdNetTax,
        isCurrent: false,
        isRecommended: false,
        advisoryOnly: true,
      },
    );
  }

  // Pick best eligible option (prefer actionable toggleable regime if tied)
  const eligibleRegimes = regimes.filter((r) => r.eligible);
  const bestOverall = [...eligibleRegimes].sort((a, b) => a.taxDue - b.taxDue)[0] ?? regimes[0];
  if (bestOverall) bestOverall.isRecommended = true;

  const currentRegime = regimes.find((r) => r.isCurrent) ?? regimes[0];
  const toggleOptions = eligibleRegimes.filter((r) => typeof r.toggleFacilityValue === 'boolean');
  const bestToggle = [...toggleOptions].sort((a, b) => a.taxDue - b.taxDue)[0];
  const bestToggleSaving = bestToggle ? Math.max(0, current.taxDue - bestToggle.taxDue) : 0;
  const bestOverallSaving = bestOverall ? Math.max(0, current.taxDue - bestOverall.taxDue) : 0;

  return {
    regimes,
    currentRegimeId: currentRegime.id,
    bestEligibleId: bestOverall.id,
    bestToggleSaving,
    bestOverallSaving,
    thresholdWarning,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Smart Reconciliation Line Anomaly Scanner
// ─────────────────────────────────────────────────────────────────────────────

export function scanReconciliationAnomalies(items: FiscalReconciliationItem[], country: CountryCode): LineAnomaly[] {
  const anomalies: LineAnomaly[] = [];

  for (const item of items) {
    const hasCorrection = item.positiveCorrection > 0 || item.negativeCorrection > 0;

    // 1. Over-correction on expense line (positiveCorrection > commercialAmount)
    if (!isIncome(item) && item.positiveCorrection > item.commercialAmount) {
      anomalies.push({
        id: `over-${item.id}`,
        itemId: item.id,
        accountCode: item.accountCode,
        accountName: item.accountName,
        kind: 'over_correction',
        severity: 'danger',
        title: 'Koreksi positif melebihi nilai komersial',
        detail: `Akun ${item.accountCode} memiliki koreksi positif lebih besar dari nilai komersialnya sehingga nilai fiskal menjadi negatif.`,
      });
    }

    // 2. Fiscal amount drift (stored fiscalAmount != computed fiscalOf(item))
    const expectedFiscal = fiscalOf(item);
    if (Math.abs(item.fiscalAmount - expectedFiscal) > 1) {
      anomalies.push({
        id: `drift-${item.id}`,
        itemId: item.id,
        accountCode: item.accountCode,
        accountName: item.accountName,
        kind: 'fiscal_drift',
        severity: 'warning',
        title: 'Selisih hitung nilai fiskal tersimpan',
        detail: `Nilai fiskal tercatat berbeda dari hasil rumus komersial ± koreksi pada akun ${item.accountCode}. Simpan ulang baris untuk menyelaraskan.`,
      });
    }

    // 3. Correction exists without legal basis
    if (hasCorrection && !item.legalBasis.trim()) {
      anomalies.push({
        id: `basis-${item.id}`,
        itemId: item.id,
        accountCode: item.accountCode,
        accountName: item.accountName,
        kind: 'missing_basis',
        severity: 'warning',
        title: 'Koreksi fiskal tanpa dasar hukum',
        detail: `Akun ${item.accountCode} (${item.accountName}) memiliki koreksi tetapi kolom dasar hukum masih kosong. Lengkapi pasal/regulasi agar tahan uji SP2DK atau pemeriksaan.`,
        suggestedBasis:
          country === 'ID'
            ? 'Pasal 9 ayat (1) UU PPh'
            : country === 'SG'
              ? 'Singapore ITA s.14 / s.15'
              : country === 'MY'
                ? 'Malaysia ITA 1967 s.33 / s.39'
                : 'IRC §162 / §274',
      });
    }

    // 4. Potential PPh Final income not negatively corrected (ID)
    if (
      country === 'ID' &&
      item.group === 'PENDAPATAN_LAIN' &&
      item.commercialAmount > 0 &&
      item.negativeCorrection === 0 &&
      FINAL_INCOME_RE.test(item.accountName)
    ) {
      anomalies.push({
        id: `final-${item.id}`,
        itemId: item.id,
        accountCode: item.accountCode,
        accountName: item.accountName,
        kind: 'unexcluded_final_income',
        severity: 'warning',
        title: 'Potensi penghasilan PPh Final belum dikoreksi negatif',
        detail: `Akun ${item.accountCode} (${item.accountName}) terindikasi objek PPh Final Pasal 4(2). Jika sudah dipotong final, lakukan koreksi negatif agar tidak kena pajak berganda.`,
        suggestedBasis: 'Pasal 4 ayat (2) UU PPh',
      });
    }

    // 5. Sensitive non-deductible expense with zero positive correction
    if (
      !isIncome(item) &&
      item.commercialAmount > 0 &&
      item.positiveCorrection === 0 &&
      NON_DEDUCTIBLE_RE.test(item.accountName)
    ) {
      anomalies.push({
        id: `nonded-${item.id}`,
        itemId: item.id,
        accountCode: item.accountCode,
        accountName: item.accountName,
        kind: 'unreviewed_non_deductible',
        severity: 'info',
        title: 'Akun biaya sensitif belum memiliki koreksi fiskal',
        detail: `Akun ${item.accountCode} (${item.accountName}) kerap diperiksa otoritas pajak. Pastikan bukti pendukung (daftar nominatif / batas natura) lengkap atau catat koreksi positif.`,
        suggestedBasis:
          country === 'ID'
            ? 'Pasal 9 ayat (1) UU PPh & PMK 66/2023'
            : country === 'SG'
              ? 'ITA s.15(1)'
              : country === 'MY'
                ? 'ITA 1967 s.39(1)(l)'
                : 'IRC §274',
      });
    }
  }

  return anomalies;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Next-Year Statutory Instalment Projector
// ─────────────────────────────────────────────────────────────────────────────

export function projectNextYearInstalment(
  cit: CitResult,
  credits: CreditLine[],
  country: CountryCode,
): InstalmentProjection {
  if (country === 'ID') {
    const isPph25 = (c: CreditLine) => c.id.toLowerCase().includes('pph25') || /pasal\s*25|pph\s*25/i.test(c.label);
    const withholdingCredits = credits.filter((c) => !isPph25(c)).reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const existingPph25Total = credits.filter(isPph25).reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const annualBase = Math.max(0, cit.taxDue - withholdingCredits);
    const perPeriodAmount = Math.round(annualBase / 12);
    // Sample PPh 25 covers Jan–Okt (10 months) if label indicates Jan–Okt, otherwise 12 months
    const pph25Line = credits.find(isPph25);
    const monthsCovered = pph25Line && /jan[–-]okt|10\s*bulan/i.test(pph25Line.label) ? 10 : 12;
    const currentPerPeriod = existingPph25Total > 0 ? Math.round(existingPph25Total / monthsCovered) : null;
    const deltaPerPeriod = currentPerPeriod !== null ? perPeriodAmount - currentPerPeriod : null;

    return {
      label: 'Proyeksi Angsuran PPh Pasal 25 (2027)',
      basis: 'Pasal 25 ayat (1) UU PPh: (PPh Terutang − Kredit PPh 22/23/24) ÷ 12',
      frequency: 'bulanan',
      periodsPerYear: 12,
      annualBase,
      perPeriodAmount,
      currentPerPeriod,
      deltaPerPeriod,
      note: 'Kredit PPh 22 & 23 tahun berjalan dikurangkan dari PPh terutang sebelum dibagi 12 bulan (angsuran PPh 25 tidak ikut dikurangkan).',
    };
  }

  if (country === 'SG') {
    const perPeriodAmount = Math.round(cit.taxDue / 12);
    return {
      label: 'Proyeksi Cicilan GIRO / ECI (YA 2028)',
      basis: 'IRAS ECI Instalment Plan (hingga 10–12 bulan via GIRO)',
      frequency: 'bulanan',
      periodsPerYear: 12,
      annualBase: cit.taxDue,
      perPeriodAmount,
      currentPerPeriod: null,
      deltaPerPeriod: null,
      note: 'Pelaporan ECI dalam 3 bulan setelah akhir tahun buku membuka opsi cicilan GIRO hingga 10 bulan.',
    };
  }

  if (country === 'MY') {
    const perPeriodAmount = Math.round(cit.taxDue / 12);
    const statutoryFloorPerPeriod = Math.round((cit.taxDue * 0.85) / 12);
    const cp204Total = credits.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const cp204Line = credits[0];
    const months = cp204Line && /9\s*bulan/i.test(cp204Line.label) ? 9 : 12;
    const currentPerPeriod = cp204Total > 0 ? Math.round(cp204Total / months) : null;

    return {
      label: 'Proyeksi Ansuran CP204 (YA 2027)',
      basis: 'ITA 1967 s.107C(3) — estimasi CP204 minimal 85% dari taksiran tahun sebelumnya',
      frequency: 'bulanan',
      periodsPerYear: 12,
      annualBase: cit.taxDue,
      perPeriodAmount,
      statutoryFloorPerPeriod,
      currentPerPeriod,
      deltaPerPeriod: currentPerPeriod !== null ? perPeriodAmount - currentPerPeriod : null,
      note: 'Jika estimasi revisi terlalu rendah (>30% di bawah pajak aktual), LHDN mengenakan penalti 10% atas selisihnya.',
    };
  }

  // US
  const perPeriodAmount = Math.round(cit.taxDue / 4);
  const qCredits = credits.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const currentPerPeriod = credits.length > 0 && qCredits > 0 ? Math.round(qCredits / Math.min(4, credits.length)) : null;

  return {
    label: 'Proyeksi Form 1120-W Estimated Tax (2027)',
    basis: 'IRC §6655 — 4 cicilan kuartalan (15 Apr, 15 Jun, 15 Sep, 15 Des)',
    frequency: 'kuartalan',
    periodsPerYear: 4,
    annualBase: cit.taxDue,
    perPeriodAmount,
    currentPerPeriod,
    deltaPerPeriod: currentPerPeriod !== null ? perPeriodAmount - currentPerPeriod : null,
    note: 'Korporasi AS wajib menyetor minimal 100% dari pajak tahun berjalan atau tahun sebelumnya (safe harbor) untuk menghindari penalty §6655.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Inverse Tax Solver (Goal-Seek)
// ─────────────────────────────────────────────────────────────────────────────

/** Helper: evaluate CIT when taxable income is reduced by `reduction` via a negative adjustment. */
function evalWithPkpReduction(
  items: FiscalReconciliationItem[],
  country: CountryCode,
  applyFacility: boolean,
  credits: CreditLine[],
  reduction: number,
): CitResult {
  if (reduction <= 0) return computeCit(items, country, applyFacility, credits);
  const synthetic: FiscalReconciliationItem = {
    id: '__GOAL_ADJ__',
    accountCode: '9999',
    accountName: 'Penyesuaian simulasi target',
    group: 'BEBAN_USAHA',
    commercialAmount: 0,
    positiveCorrection: 0,
    negativeCorrection: reduction,
    fiscalAmount: reduction,
    correctionReason: 'Simulasi goal-seek',
    legalBasis: '',
  };
  return computeCit([...items, synthetic], country, applyFacility, credits);
}

/** Binary search for the smallest PKP reduction in [0, taxableIncome] achieving `taxDue <= targetTaxDue`. */
function solvePkpReductionForTaxDue(
  items: FiscalReconciliationItem[],
  country: CountryCode,
  applyFacility: boolean,
  credits: CreditLine[],
  current: CitResult,
  targetTaxDue: number,
): { reduction: number; verified: CitResult } {
  if (current.taxDue <= targetTaxDue) {
    return { reduction: 0, verified: current };
  }
  const maxReduction = current.taxableIncome;
  if (targetTaxDue <= 0) {
    return {
      reduction: maxReduction,
      verified: evalWithPkpReduction(items, country, applyFacility, credits, maxReduction),
    };
  }

  let lo = 0;
  let hi = maxReduction;
  for (let i = 0; i < 42; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const res = evalWithPkpReduction(items, country, applyFacility, credits, mid);
    if (res.taxDue <= targetTaxDue) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
    if (lo >= hi) break;
  }

  const verified = evalWithPkpReduction(items, country, applyFacility, credits, hi);
  return { reduction: hi, verified };
}

export function solveTaxGoal(
  items: FiscalReconciliationItem[],
  country: CountryCode,
  applyFacility: boolean,
  credits: CreditLine[],
  goal: TaxGoalInput,
): TaxGoalSolution {
  const current = computeCit(items, country, applyFacility, credits);
  const currentNet = current.payable - current.overpaid;

  let targetTaxDue = current.taxDue;
  if (goal.mode === 'target_etr') {
    const targetEtr = Math.max(0, goal.targetEtr ?? current.effectiveRate);
    targetTaxDue = current.commercialProfit > 0 ? Math.floor(current.commercialProfit * targetEtr) : 0;
  } else if (goal.mode === 'zero_payable') {
    targetTaxDue = current.credits;
  } else {
    targetTaxDue = Math.max(0, Math.round(goal.maxTaxDue ?? current.taxDue));
  }

  const alreadyMet =
    goal.mode === 'zero_payable'
      ? current.payable === 0
      : current.taxDue <= targetTaxDue;

  const { reduction, verified } = alreadyMet
    ? { reduction: 0, verified: current }
    : solvePkpReductionForTaxDue(items, country, applyFacility, credits, current, targetTaxDue);

  const coverableByPositiveCorrections = Math.min(reduction, current.positive);
  const remainingReductionBeyondPositive = Math.max(0, reduction - current.positive);
  const requiredAdditionalCredits = goal.mode === 'zero_payable' ? current.payable : Math.max(0, current.taxDue - targetTaxDue);
  const achievable = alreadyMet || verified.taxDue <= targetTaxDue;

  let summary = '';
  if (alreadyMet) {
    summary =
      goal.mode === 'zero_payable'
        ? 'Posisi saat ini sudah Nihil atau Lebih Bayar — tidak ada kurang bayar yang perlu ditutup.'
        : 'Target sudah tercapai pada posisi rekonsiliasi saat ini.';
  } else if (goal.mode === 'zero_payable') {
    summary = 'Dua jalur eksak untuk mencapai posisi Nihil: tambah kredit pajak terverifikasi (1:1) atau turunkan PKP sesuai hasil komputasi balik.';
  } else if (goal.mode === 'target_etr') {
    summary =
      remainingReductionBeyondPositive === 0
        ? 'Target ETR dapat dicapai dengan melengkapi bukti dokumentasi agar sebagian koreksi positif menjadi biaya deductible.'
        : 'Target ETR memerlukan penurunan PKP melebihi total koreksi positif saat ini (butuh insentif fiskal sah atau koreksi negatif tambahan).';
  } else {
    summary = 'Penurunan PKP minimum yang dihitung secara eksak untuk menjaga pajak terutang di bawah batas target.';
  }

  return {
    mode: goal.mode,
    achievable,
    alreadyMet,
    summary,
    currentTaxDue: current.taxDue,
    currentEffectiveRate: current.effectiveRate,
    currentNetBalance: currentNet,
    targetTaxDue,
    requiredPkpReduction: reduction,
    coverableByPositiveCorrections,
    remainingReductionBeyondPositive,
    requiredAdditionalCredits,
    verifiedTaxDue: verified.taxDue,
    verifiedEffectiveRate: verified.effectiveRate,
    verifiedNetBalance: verified.payable - verified.overpaid,
    complianceNote:
      'Hasil pemecah target bersifat simulasi matematis untuk perencanaan pajak legal (tax planning). Setiap penurunan koreksi positif atau klaim kredit wajib didukung bukti potong, daftar nominatif, dan dokumentasi sah.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. 2D Sensitivity Matrix & Smart Scenarios
// ─────────────────────────────────────────────────────────────────────────────

export function computeSensitivityMatrix(
  items: FiscalReconciliationItem[],
  country: CountryCode,
  applyFacility: boolean,
  credits: CreditLine[],
): SensitivityMatrix {
  const revenueSteps = [-15, 0, 15, 30];
  const columns = [
    { id: 'current', label: 'Koreksi saat ini', description: 'Struktur koreksi fiskal aktif' },
    { id: 'clean_pos', label: 'Tanpa koreksi (+)', description: 'Seluruh biaya lolos uji dokumen' },
    { id: 'cost_opt', label: 'Efisiensi beban −10%', description: 'Beban operasional ditekan 10%' },
  ];

  const baseGross = grossRevenueOf(items);

  const rows = revenueSteps.map((revenuePct) => {
    const revFactor = 1 + revenuePct / 100;
    const projectedRevenue = Math.round(baseGross * revFactor);

    const cells: SensitivityCell[] = columns.map((col) => {
      const scenarioItems = items.map((i) => {
        if (isIncome(i)) {
          return { ...i, commercialAmount: Math.round(i.commercialAmount * revFactor) };
        }
        const expFactor = col.id === 'cost_opt' ? 0.9 : 1;
        return {
          ...i,
          commercialAmount: Math.round(i.commercialAmount * expFactor),
          positiveCorrection: col.id === 'clean_pos' ? 0 : i.positiveCorrection,
        };
      });

      const res = computeCit(scenarioItems, country, applyFacility, credits);
      let cliffNote: string | undefined;
      if (country === 'ID' && applyFacility) {
        if (baseGross <= 4_800_000_000 && projectedRevenue > 4_800_000_000 && projectedRevenue <= 50_000_000_000) {
          cliffNote = 'Lewat Rp 4,8 M (porsi 11% menyusut)';
        } else if (baseGross <= 50_000_000_000 && projectedRevenue > 50_000_000_000) {
          cliffNote = 'Lewat Rp 50 M (31E gugur)';
        }
      }

      return {
        revenuePct,
        columnId: col.id,
        taxDue: res.taxDue,
        effectiveRate: res.effectiveRate,
        netBalance: res.payable - res.overpaid,
        facilityApplied: res.facilityApplied,
        cliffNote,
      };
    });

    return { revenuePct, projectedRevenue, cells };
  });

  return { revenueSteps, columns, rows };
}

export function buildSmartScenarios(
  items: FiscalReconciliationItem[],
  country: CountryCode,
  applyFacility: boolean,
  credits: CreditLine[],
): SmartScenario[] {
  const base = computeCit(items, country, applyFacility, credits);
  const baseNet = base.payable - base.overpaid;
  const facility = FACILITY[country];
  const scenarios: SmartScenario[] = [];

  // 1. All positive corrections substantiated (deductible)
  const noPos = computeCit(
    items.map((i) => ({ ...i, positiveCorrection: 0 })),
    country,
    applyFacility,
    credits,
  );
  scenarios.push({
    id: 'clean_positive',
    label: 'Seluruh biaya lolos uji (tanpa koreksi positif)',
    description: 'Simulasi bila daftar nominatif, bukti potong, dan dokumen pendukung terpenuhi seluruhnya',
    category: 'deduction',
    baseTaxDue: base.taxDue,
    scenarioTaxDue: noPos.taxDue,
    taxDueDelta: noPos.taxDue - base.taxDue,
    baseNetBalance: baseNet,
    scenarioNetBalance: noPos.payable - noPos.overpaid,
    cashDelta: (noPos.payable - noPos.overpaid) - baseNet,
    baseEffective: base.effectiveRate,
    scenarioEffective: noPos.effectiveRate,
    primaryMetric: 'taxDue',
  });

  // 2. Facility toggle comparison (if jurisdiction has facility)
  if (facility) {
    const flipped = computeCit(items, country, !applyFacility, credits);
    scenarios.push({
      id: 'toggle_facility',
      label: applyFacility ? `Tanpa ${facility.label} (tarif normal)` : `Aktifkan ${facility.label}`,
      description: applyFacility
        ? 'Dampak kenaikan pajak apabila fasilitas tarif tidak diterapkan atau syarat omzet terlampaui'
        : 'Dampak penghematan pajak jika fasilitas tarif diaktifkan pada posisi saat ini',
      category: 'facility',
      baseTaxDue: base.taxDue,
      scenarioTaxDue: flipped.taxDue,
      taxDueDelta: flipped.taxDue - base.taxDue,
      baseNetBalance: baseNet,
      scenarioNetBalance: flipped.payable - flipped.overpaid,
      cashDelta: (flipped.payable - flipped.overpaid) - baseNet,
      baseEffective: base.effectiveRate,
      scenarioEffective: flipped.effectiveRate,
      primaryMetric: 'taxDue',
    });
  }

  // 3. Additional tax credit (+15% of existing credits or 10% of taxDue) -> affects CASH FLOW / PAYABLE
  const extraCreditAmount = Math.round(base.credits > 0 ? base.credits * 0.15 : base.taxDue * 0.1);
  const withCredit = computeCit(items, country, applyFacility, [
    ...credits,
    { id: '__SIM_CREDIT__', label: 'Tambahan kredit pajak', amount: extraCreditAmount },
  ]);
  scenarios.push({
    id: 'extra_credit',
    label: 'Optimalisasi kredit pajak (+15% kredit berjalan)',
    description: 'Simulasi dampak kas (kurang/lebih bayar) bila seluruh bukti potong PPh 22/23 atau angsuran tambahan berhasil dikreditkan',
    category: 'credit',
    baseTaxDue: base.taxDue,
    scenarioTaxDue: withCredit.taxDue,
    taxDueDelta: withCredit.taxDue - base.taxDue,
    baseNetBalance: baseNet,
    scenarioNetBalance: withCredit.payable - withCredit.overpaid,
    cashDelta: (withCredit.payable - withCredit.overpaid) - baseNet,
    baseEffective: base.effectiveRate,
    scenarioEffective: withCredit.effectiveRate,
    primaryMetric: 'cash',
    note: 'Kredit pajak tidak mengubah PPh terutang, melainkan langsung mengurangi kas kurang bayar (1:1).',
  });

  // 4. Revenue growth +20%
  const baseGross = grossRevenueOf(items);
  const growth = computeCit(
    items.map((i) => (isIncome(i) ? { ...i, commercialAmount: Math.round(i.commercialAmount * 1.2) } : i)),
    country,
    applyFacility,
    credits,
  );
  const crosses48 = country === 'ID' && baseGross <= 4_800_000_000 && baseGross * 1.2 > 4_800_000_000;
  const crosses50 = country === 'ID' && baseGross <= 50_000_000_000 && baseGross * 1.2 > 50_000_000_000;
  scenarios.push({
    id: 'revenue_growth_20',
    label: 'Pertumbuhan pendapatan +20% (beban tetap)',
    description: 'Proyeksi lonjakan pajak terutang dan pergeseran ambang tarif pada skenario ekspansi pendapatan',
    category: 'growth',
    baseTaxDue: base.taxDue,
    scenarioTaxDue: growth.taxDue,
    taxDueDelta: growth.taxDue - base.taxDue,
    baseNetBalance: baseNet,
    scenarioNetBalance: growth.payable - growth.overpaid,
    cashDelta: (growth.payable - growth.overpaid) - baseNet,
    baseEffective: base.effectiveRate,
    scenarioEffective: growth.effectiveRate,
    primaryMetric: 'taxDue',
    note: crosses50
      ? 'Peringatan: pertumbuhan +20% melewati Rp 50 M sehingga Fasilitas Pasal 31E gugur!'
      : crosses48
        ? 'Catatan: pertumbuhan +20% melewati Rp 4,8 M sehingga porsi fasilitas 11% menyusut proporsional.'
        : undefined,
  });

  // 5. Operating expense efficiency -10%
  const costCut = computeCit(
    items.map((i) => (i.group === 'BEBAN_USAHA' ? { ...i, commercialAmount: Math.round(i.commercialAmount * 0.9) } : i)),
    country,
    applyFacility,
    credits,
  );
  scenarios.push({
    id: 'opex_efficiency',
    label: 'Efisiensi beban usaha −10%',
    description: 'Dampak pajak jika biaya operasional berhasil ditekan 10% (laba komersial naik)',
    category: 'efficiency',
    baseTaxDue: base.taxDue,
    scenarioTaxDue: costCut.taxDue,
    taxDueDelta: costCut.taxDue - base.taxDue,
    baseNetBalance: baseNet,
    scenarioNetBalance: costCut.payable - costCut.overpaid,
    cashDelta: (costCut.payable - costCut.overpaid) - baseNet,
    baseEffective: base.effectiveRate,
    scenarioEffective: costCut.effectiveRate,
    primaryMetric: 'taxDue',
  });

  return scenarios;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Group Multi-Jurisdiction Tax Consolidation & Pillar Two (15% GloBE)
// ─────────────────────────────────────────────────────────────────────────────

const GLOBE_MIN_ETR = 0.15;

export function computeGroupTaxConsolidation(entries: GroupEntityInput[]): GroupTaxConsolidation {
  const rows: GroupEntityRow[] = entries.map((e) => {
    const cit = computeCit(e.items, e.country, e.applyFacility, e.credits);
    const netBalance = cit.payable - cit.overpaid;
    const commercialProfitIdr = Math.round(toIdr(cit.commercialProfit, e.country));
    const taxDueIdr = Math.round(toIdr(cit.taxDue, e.country));
    const netBalanceIdr = Math.round(toIdr(netBalance, e.country));
    const pillarTwoGap = cit.commercialProfit > 0 ? Math.max(0, GLOBE_MIN_ETR - cit.effectiveRate) : 0;
    const pillarTwoTopUpIdr = commercialProfitIdr > 0 ? Math.round(commercialProfitIdr * pillarTwoGap) : 0;

    return {
      entityId: e.entityId,
      legalName: e.legalName,
      flag: e.flag,
      country: e.country,
      commercialProfit: cit.commercialProfit,
      taxableIncome: cit.taxableIncome,
      taxDue: cit.taxDue,
      netBalance,
      effectiveRate: cit.effectiveRate,
      commercialProfitIdr,
      taxDueIdr,
      netBalanceIdr,
      pillarTwoGap,
      pillarTwoTopUpIdr,
    };
  });

  const totalProfitIdr = rows.reduce((s, r) => s + r.commercialProfitIdr, 0);
  const totalTaxDueIdr = rows.reduce((s, r) => s + r.taxDueIdr, 0);
  const totalNetBalanceIdr = rows.reduce((s, r) => s + r.netBalanceIdr, 0);
  const weightedEtr = totalProfitIdr > 0 ? totalTaxDueIdr / totalProfitIdr : 0;
  const totalPillarTwoTopUpIdr = rows.reduce((s, r) => s + r.pillarTwoTopUpIdr, 0);
  const belowMinimumCount = rows.filter((r) => r.pillarTwoGap > 0.0005).length;

  return {
    rows,
    totalProfitIdr,
    totalTaxDueIdr,
    totalNetBalanceIdr,
    weightedEtr,
    totalPillarTwoTopUpIdr,
    belowMinimumCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Master Analysis Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeTaxPosition({
  items,
  country,
  applyFacility,
  credits,
  findings,
  reviewOf,
  benchmarks,
}: {
  items: FiscalReconciliationItem[];
  country: CountryCode;
  applyFacility: boolean;
  credits: CreditLine[];
  findings: RiskFinding[];
  reviewOf: (findingId: string) => FindingReview;
  benchmarks: IndustryBenchmark[];
}): SmartAnalysis {
  const cit = computeCit(items, country, applyFacility, credits);
  const grossRevenue = grossRevenueOf(items);
  const regimes = compareTaxRegimes(items, country, applyFacility, credits);
  const anomalies = scanReconciliationAnomalies(items, country);
  const instalment = projectNextYearInstalment(cit, credits, country);
  const scenarios = buildSmartScenarios(items, country, applyFacility, credits);
  const sensitivity = computeSensitivityMatrix(items, country, applyFacility, credits);

  // Confirmed findings whose suggested correction is NOT yet reflected in reconciliation
  const pendingFindings = findings.filter((f) => {
    if (!f.correction) return false;
    const rev = reviewOf(f.id);
    if (rev.status !== 'confirmed') return false;
    const marker = `[${f.id}]`;
    return !rev.correctionApplied && !isCorrectionReflected(items, f.correction, marker);
  });

  const totalCorrectionAmount = pendingFindings.reduce((s, f) => s + (f.correction?.amount ?? 0), 0);
  // Compute exact incremental tax due using computeCit rather than flat rate multiplication
  const withPendingItems: FiscalReconciliationItem[] =
    totalCorrectionAmount > 0
      ? [
          ...items,
          {
            id: '__PENDING_CORR__',
            accountCode: '9998',
            accountName: 'Koreksi kasus terkonfirmasi tertunda',
            group: 'BEBAN_USAHA',
            commercialAmount: 0,
            positiveCorrection: totalCorrectionAmount,
            negativeCorrection: 0,
            fiscalAmount: -totalCorrectionAmount,
            correctionReason: 'Simulasi',
            legalBasis: '',
          },
        ]
      : items;
  const citWithPending = computeCit(withPendingItems, country, applyFacility, credits);
  const additionalTaxDue = Math.max(0, citWithPending.taxDue - cit.taxDue);
  const penaltyMeta = PENALTY_INFO[country];
  const estimatedPenaltyAvoided = Math.round(additionalTaxDue * penaltyMeta.rate);

  const pendingCorrections: PendingCorrectionSummary = {
    findings: pendingFindings,
    count: pendingFindings.length,
    totalCorrectionAmount,
    additionalTaxDue,
    estimatedPenaltyAvoided,
    penaltyBasis: penaltyMeta.basis,
  };

  // Readiness & Efficiency Score (0–100, transparent 5-factor model)
  const benchmarkRisks = benchmarks.filter((b) => b.status === 'SP2DK_RISK').length;
  const dangerAnomalies = anomalies.filter((a) => a.severity === 'danger').length;
  const warningAnomalies = anomalies.filter((a) => a.severity === 'warning').length;

  const fSync: ReadinessFactor = {
    id: 'sync',
    label: 'Sinkronisasi kasus terkonfirmasi',
    maxPoints: 25,
    points: pendingFindings.length === 0 ? 25 : Math.max(0, 25 - pendingFindings.length * 12),
    status: pendingFindings.length === 0 ? 'ok' : 'danger',
    detail:
      pendingFindings.length === 0
        ? 'Seluruh koreksi dari kasus terkonfirmasi sudah masuk rekonsiliasi.'
        : `${pendingFindings.length} koreksi kasus terkonfirmasi belum diterapkan ke rekonsiliasi.`,
  };

  const fFacility: ReadinessFactor = {
    id: 'facility',
    label: 'Pemanfaatan fasilitas tarif',
    maxPoints: 20,
    points: regimes.bestToggleSaving === 0 ? 20 : 6,
    status: regimes.bestToggleSaving === 0 ? 'ok' : 'warning',
    detail:
      regimes.bestToggleSaving === 0
        ? FACILITY[country]
          ? `${FACILITY[country]!.label} sudah terkonfigurasi optimal.`
          : 'Tarif korporasi standar diterapkan.'
        : `Fasilitas tarif yang memenuhi syarat belum diaktifkan — ada peluang penghematan pajak.`,
  };

  const fIntegrity: ReadinessFactor = {
    id: 'integrity',
    label: 'Integritas & dasar hukum baris',
    maxPoints: 20,
    points: Math.max(0, 20 - dangerAnomalies * 10 - warningAnomalies * 5),
    status: dangerAnomalies > 0 ? 'danger' : warningAnomalies > 0 ? 'warning' : 'ok',
    detail:
      dangerAnomalies + warningAnomalies === 0
        ? 'Semua koreksi memiliki dasar hukum dan perhitungan nilai fiskal konsisten.'
        : `${dangerAnomalies + warningAnomalies} baris rekonsiliasi memerlukan pemeriksaan dasar hukum atau konsistensi nilai.`,
  };

  const fCredits: ReadinessFactor = {
    id: 'credits',
    label: 'Kelengkapan kredit pajak',
    maxPoints: 15,
    points: cit.credits > 0 ? 15 : 5,
    status: cit.credits > 0 ? 'ok' : 'warning',
    detail:
      cit.credits > 0
        ? 'Kredit pajak tahun berjalan sudah diperhitungkan sebagai pengurang kurang bayar.'
        : 'Belum ada kredit pajak tercatat — verifikasi bukti potong dan angsuran tahun berjalan.',
  };

  const etrExcess = cit.effectiveRate > STANDARD_RATE[country] + 0.02;
  const fBench: ReadinessFactor = {
    id: 'benchmark',
    label: 'Keselarasan ETR & benchmark',
    maxPoints: 20,
    points: Math.max(0, 20 - benchmarkRisks * 8 - (etrExcess ? 6 : 0)),
    status: benchmarkRisks > 0 ? 'danger' : etrExcess ? 'warning' : 'ok',
    detail:
      benchmarkRisks > 0
        ? `${benchmarkRisks} metrik benchmark berada di zona risiko pemeriksaan / SP2DK.`
        : etrExcess
          ? 'Tarif efektif melampaui tarif normal — evaluasi koreksi positif & dokumentasi.'
          : 'Tarif efektif dan rasio industri berada pada zona wajar.',
  };

  const factors = [fSync, fFacility, fIntegrity, fCredits, fBench];
  const readinessScore = Math.max(0, Math.min(100, factors.reduce((s, f) => s + f.points, 0)));
  const readinessBand: SmartAnalysis['readinessBand'] =
    readinessScore >= 85
      ? { label: 'Optimal & siap SPT', tone: 'emerald' }
      : readinessScore >= 65
        ? { label: 'Perlu optimasi', tone: 'amber' }
        : { label: 'Perlu tindakan', tone: 'rose' };

  return {
    cit,
    grossRevenue,
    regimes,
    anomalies,
    instalment,
    pendingCorrections,
    scenarios,
    sensitivity,
    readinessScore,
    readinessBand,
    factors,
    benchmarkRisks,
  };
}
