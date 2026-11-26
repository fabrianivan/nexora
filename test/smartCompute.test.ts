import { describe, expect, it } from 'vitest';
import { fiscalReconciliationData, type FiscalReconciliationItem } from '../src/data/indonesiaTaxData';
import { MULTI_COUNTRY_DATA } from '../src/data/multiCountryTaxData';
import { computeCit, DEFAULT_CREDITS } from '../src/lib/cit';
import { createInitialComplianceState, reviewOf, runRiskEngine } from '../src/lib/compliance';
import { SAMPLE_ENTITIES } from '../src/data/entities';
import {
  analyzeTaxPosition,
  buildSmartScenarios,
  compareTaxRegimes,
  computeGroupTaxConsolidation,
  computeSensitivityMatrix,
  projectNextYearInstalment,
  scanReconciliationAnomalies,
  solveTaxGoal,
} from '../src/lib/smartCompute';

describe('smart tax computation engine', () => {
  describe('compareTaxRegimes', () => {
    it('compares ID normal, 31E, and UMKM 0.5% and warns about Rp 4.8B cliff', () => {
      const cmp = compareTaxRegimes(fiscalReconciliationData, 'ID', true, DEFAULT_CREDITS.ID);
      expect(cmp.regimes.map((r) => r.id)).toEqual(['id_normal', 'id_31e', 'id_umkm_final']);
      const normal = cmp.regimes.find((r) => r.id === 'id_normal')!;
      const f31e = cmp.regimes.find((r) => r.id === 'id_31e')!;
      const umkm = cmp.regimes.find((r) => r.id === 'id_umkm_final')!;
      expect(f31e.isCurrent).toBe(true);
      expect(f31e.taxDue).toBe(105_968_500);
      expect(normal.taxDue).toBe(Math.round(963_350_000 * 0.22));
      expect(umkm.eligible).toBe(true);
      expect(umkm.taxDue).toBe(Math.round(4_650_000_000 * 0.005));
      expect(cmp.bestEligibleId).toBe('id_umkm_final');
      expect(cmp.bestToggleSaving).toBe(0);
      expect(cmp.thresholdWarning).not.toBeNull();
      expect(cmp.thresholdWarning?.threshold).toBe(4_800_000_000);
      expect(cmp.thresholdWarning?.headroom).toBe(150_000_000);
    });

    it('detects toggle saving when ID 31E is eligible but disabled', () => {
      const cmp = compareTaxRegimes(fiscalReconciliationData, 'ID', false, DEFAULT_CREDITS.ID);
      expect(cmp.bestToggleSaving).toBe(Math.round(963_350_000 * 0.22) - 105_968_500);
    });

    it('marks ID 31E and UMKM ineligible when gross revenue exceeds Rp 50B', () => {
      const big = fiscalReconciliationData.map((i) =>
        i.group === 'PENDAPATAN' ? { ...i, commercialAmount: 60_000_000_000 } : i,
      );
      const cmp = compareTaxRegimes(big, 'ID', true, []);
      expect(cmp.regimes.find((r) => r.id === 'id_31e')?.eligible).toBe(false);
      expect(cmp.regimes.find((r) => r.id === 'id_umkm_final')?.eligible).toBe(false);
    });

    it('compares SG, MY, and US regimes cleanly', () => {
      const sg = compareTaxRegimes(MULTI_COUNTRY_DATA.SG.fiscalReconciliation, 'SG', true, DEFAULT_CREDITS.SG);
      expect(sg.regimes.map((r) => r.id)).toEqual(['sg_normal', 'sg_pte', 'sg_sute']);
      expect(sg.regimes.find((r) => r.id === 'sg_sute')!.taxDue).toBeLessThan(
        sg.regimes.find((r) => r.id === 'sg_pte')!.taxDue,
      );

      const my = compareTaxRegimes(MULTI_COUNTRY_DATA.MY.fiscalReconciliation, 'MY', false, DEFAULT_CREDITS.MY);
      expect(my.bestToggleSaving).toBeGreaterThan(0);

      const us = compareTaxRegimes(MULTI_COUNTRY_DATA.US.fiscalReconciliation, 'US', false, DEFAULT_CREDITS.US);
      expect(us.regimes.find((r) => r.id === 'us_rd_credit')?.eligible).toBe(true);
    });
  });

  describe('scanReconciliationAnomalies', () => {
    it('passes clean sample ID lines without anomalies', () => {
      const anomalies = scanReconciliationAnomalies(fiscalReconciliationData, 'ID');
      expect(anomalies).toEqual([]);
    });

    it('detects missing legal basis, unexcluded final income, over-correction, and fiscal drift', () => {
      const broken: FiscalReconciliationItem[] = [
        {
          id: 'A1',
          accountCode: '6200',
          accountName: 'Beban Jamuan & Entertainment',
          group: 'BEBAN_USAHA',
          commercialAmount: 50_000_000,
          positiveCorrection: 0,
          negativeCorrection: 0,
          fiscalAmount: 50_000_000,
          correctionReason: '',
          legalBasis: '',
        },
        {
          id: 'A2',
          accountCode: '6300',
          accountName: 'Beban Lain',
          group: 'BEBAN_USAHA',
          commercialAmount: 10_000_000,
          positiveCorrection: 15_000_000,
          negativeCorrection: 0,
          fiscalAmount: 10_000_000, // drifted from -5_000_000 AND over-corrected AND missing basis
          correctionReason: 'Koreksi',
          legalBasis: '',
        },
        {
          id: 'A3',
          accountCode: '7100',
          accountName: 'Pendapatan Bunga Deposito Bank',
          group: 'PENDAPATAN_LAIN',
          commercialAmount: 20_000_000,
          positiveCorrection: 0,
          negativeCorrection: 0,
          fiscalAmount: 20_000_000,
          correctionReason: '',
          legalBasis: '',
        },
      ];
      const kinds = scanReconciliationAnomalies(broken, 'ID').map((a) => a.kind);
      expect(kinds).toContain('unreviewed_non_deductible');
      expect(kinds).toContain('over_correction');
      expect(kinds).toContain('fiscal_drift');
      expect(kinds).toContain('missing_basis');
      expect(kinds).toContain('unexcluded_final_income');
    });
  });

  describe('projectNextYearInstalment', () => {
    it('excludes PPh 25 credits when projecting next year ID PPh 25 monthly instalment', () => {
      const cit = computeCit(fiscalReconciliationData, 'ID', true, DEFAULT_CREDITS.ID);
      const proj = projectNextYearInstalment(cit, DEFAULT_CREDITS.ID, 'ID');
      // PPh Terutang 105.968.500 - (PPh 22 15.405.000 + PPh 23 35.500.000) = 55.063.500 / 12
      expect(proj.annualBase).toBe(105_968_500 - 15_405_000 - 35_500_000);
      expect(proj.perPeriodAmount).toBe(Math.round(55_063_500 / 12));
      expect(proj.currentPerPeriod).toBe(3_000_000); // 30M over Jan–Okt (10 months)
      expect(proj.frequency).toBe('bulanan');
    });

    it('computes MY CP204 statutory 85% floor and US quarterly 1120-W', () => {
      const myCit = computeCit(MULTI_COUNTRY_DATA.MY.fiscalReconciliation, 'MY', true, DEFAULT_CREDITS.MY);
      const myProj = projectNextYearInstalment(myCit, DEFAULT_CREDITS.MY, 'MY');
      expect(myProj.statutoryFloorPerPeriod).toBe(Math.round((myCit.taxDue * 0.85) / 12));

      const usCit = computeCit(MULTI_COUNTRY_DATA.US.fiscalReconciliation, 'US', false, DEFAULT_CREDITS.US);
      const usProj = projectNextYearInstalment(usCit, DEFAULT_CREDITS.US, 'US');
      expect(usProj.frequency).toBe('kuartalan');
      expect(usProj.perPeriodAmount).toBe(Math.round(usCit.taxDue / 4));
    });
  });

  describe('solveTaxGoal (inverse Goal-Seek solver)', () => {
    it('solves target ETR exactly on ID 31E and verifies via computeCit', () => {
      const sol = solveTaxGoal(fiscalReconciliationData, 'ID', true, DEFAULT_CREDITS.ID, {
        mode: 'target_etr',
        targetEtr: 0.1,
      });
      expect(sol.achievable).toBe(true);
      expect(sol.alreadyMet).toBe(false);
      expect(sol.requiredPkpReduction).toBeGreaterThan(0);
      expect(sol.verifiedEffectiveRate).toBeLessThanOrEqual(0.1 + 1e-6);
      expect(sol.verifiedTaxDue).toBeLessThanOrEqual(sol.targetTaxDue);
    });

    it('solves zero_payable mode with both exact credit path and PKP reduction path', () => {
      const sol = solveTaxGoal(fiscalReconciliationData, 'ID', true, DEFAULT_CREDITS.ID, {
        mode: 'zero_payable',
      });
      expect(sol.alreadyMet).toBe(false);
      expect(sol.requiredAdditionalCredits).toBe(25_063_500);
      expect(sol.verifiedNetBalance).toBeLessThanOrEqual(0);
      // With 11% effective marginal rate under full 31E, 25_063_500 / 0.11 ≈ 227_850_000
      expect(Math.abs(sol.requiredPkpReduction - Math.round(25_063_500 / 0.11))).toBeLessThan(100);
    });

    it('handles non-linear MY SME slabs in max_tax_due mode', () => {
      const myCit = computeCit(MULTI_COUNTRY_DATA.MY.fiscalReconciliation, 'MY', true, DEFAULT_CREDITS.MY);
      const cap = Math.round(myCit.taxDue * 0.6);
      const sol = solveTaxGoal(MULTI_COUNTRY_DATA.MY.fiscalReconciliation, 'MY', true, DEFAULT_CREDITS.MY, {
        mode: 'max_tax_due',
        maxTaxDue: cap,
      });
      expect(sol.achievable).toBe(true);
      expect(sol.verifiedTaxDue).toBeLessThanOrEqual(cap);
    });
  });

  describe('sensitivity matrix & smart scenarios', () => {
    it('builds 4x3 sensitivity matrix and flags ID Rp 4.8B cliff on +15% growth', () => {
      const matrix = computeSensitivityMatrix(fiscalReconciliationData, 'ID', true, DEFAULT_CREDITS.ID);
      expect(matrix.rows).toHaveLength(4);
      expect(matrix.columns).toHaveLength(3);
      const plus15 = matrix.rows.find((r) => r.revenuePct === 15)!;
      expect(plus15.cells[0].cliffNote).toContain('Rp 4,8 M');
      // Base row (0%) column 0 matches computeCit exactly
      const baseRow = matrix.rows.find((r) => r.revenuePct === 0)!;
      const baseCit = computeCit(fiscalReconciliationData, 'ID', true, DEFAULT_CREDITS.ID);
      expect(baseRow.cells[0].taxDue).toBe(baseCit.taxDue);
    });

    it('reports credit scenario impact on cashDelta (not zero taxDueDelta)', () => {
      const scenarios = buildSmartScenarios(fiscalReconciliationData, 'ID', true, DEFAULT_CREDITS.ID);
      const creditScenario = scenarios.find((s) => s.id === 'extra_credit')!;
      expect(creditScenario.primaryMetric).toBe('cash');
      expect(creditScenario.taxDueDelta).toBe(0);
      expect(creditScenario.cashDelta).toBeLessThan(0);
    });
  });

  describe('group consolidation & master analyzer', () => {
    it('consolidates all 4 jurisdictions into IDR and flags Pillar Two < 15% entities', () => {
      const entries = SAMPLE_ENTITIES.map((e) => ({
        entityId: e.id,
        legalName: e.legalName,
        flag: e.flag,
        country: e.countryCode,
        items: e.countryCode === 'ID' ? fiscalReconciliationData : MULTI_COUNTRY_DATA[e.countryCode].fiscalReconciliation,
        applyFacility: true,
        credits: DEFAULT_CREDITS[e.countryCode],
      }));
      const group = computeGroupTaxConsolidation(entries);
      expect(group.rows).toHaveLength(4);
      expect(group.totalTaxDueIdr).toBeGreaterThan(0);
      // ID (31E ~12.6% ETR) and SG (PTE ~10% ETR) are below 15% GloBE minimum
      expect(group.belowMinimumCount).toBeGreaterThanOrEqual(2);
      expect(group.totalPillarTwoTopUpIdr).toBeGreaterThan(0);
    });

    it('computes bounded readiness score and penalty-avoided summary in analyzeTaxPosition', () => {
      const state = createInitialComplianceState();
      const { findings } = runRiskEngine(
        state.documents,
        SAMPLE_ENTITIES.map((e) => ({ id: e.id, legalName: e.legalName, countryCode: e.countryCode, taxId: e.taxId })),
      );
      const res = analyzeTaxPosition({
        items: fiscalReconciliationData,
        country: 'ID',
        applyFacility: true,
        credits: DEFAULT_CREDITS.ID,
        findings: findings.filter((f) => f.entityId === 'ENT-ID-001'),
        reviewOf: (id) => reviewOf(state, id),
        benchmarks: MULTI_COUNTRY_DATA.ID.industryBenchmarks,
      });
      expect(res.readinessScore).toBeGreaterThanOrEqual(0);
      expect(res.readinessScore).toBeLessThanOrEqual(100);
      expect(res.factors).toHaveLength(5);
      expect(res.benchmarkRisks).toBe(1); // CRM-VAT SP2DK_RISK
    });
  });
});
