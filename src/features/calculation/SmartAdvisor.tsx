'use client';

/**
 * SmartAdvisor — Sistem Komputasi Pintar Nexora
 *
 * Modular smart tax computation studio powered by `src/lib/smartCompute.ts`:
 *   1. Optimasi & Diagnostik — skor komputasi, perbandingan rezim pajak, pemindai baris,
 *      sinkronisasi kasus terkonfirmasi, & proyeksi angsuran tahun berikutnya
 *   2. Pemecah Target (Goal-Seek) — komputasi balik eksak (target ETR, Nihil, batas PPh)
 *   3. Sensitivitas & Skenario — matriks sensitivitas 2D + skenario pajak & arus kas
 *   4. Konsolidasi & Benchmark — konsolidasi grup multi-yurisdiksi (Pillar Two 15%) & benchmark industri
 *
 * Seluruh rekomendasi bersifat advisori — eksekusi dan persetujuan tetap di tangan pengguna.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Compass,
  Globe2,
  Info,
  Lightbulb,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wrench,
  Zap,
} from 'lucide-react';
import { MULTI_COUNTRY_DATA, type CountryCode } from '@/data/multiCountryTaxData';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { FACILITY, fiscalOf, STANDARD_RATE, type CreditLine } from '@/lib/cit';
import {
  applyCorrectionToItems,
  isCorrectionReflected,
  markCorrectionApplied,
} from '@/lib/compliance';
import { FX_NOTE } from '@/lib/fx';
import { money, moneyCompact, pct } from '@/lib/format';
import {
  analyzeTaxPosition,
  computeGroupTaxConsolidation,
  solveTaxGoal,
  type GoalMode,
  type LineAnomaly,
  type SmartScenario,
} from '@/lib/smartCompute';
import {
  Badge,
  BandLead,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  ComplianceRing,
  Meter,
  MetricBand,
  Segmented,
  Table,
  TD,
  TextField,
  TH,
  THead,
  TR,
  cn,
} from '@/ui';

type SubView = 'optimize' | 'goalseek' | 'sensitivity' | 'group';

const BENCH_TONE: Record<string, { badge: 'success' | 'warning' | 'danger'; bar: string }> = {
  SAFE: { badge: 'success', bar: 'bg-success-500' },
  WATCH: { badge: 'warning', bar: 'bg-warning-500' },
  SP2DK_RISK: { badge: 'danger', bar: 'bg-danger-500' },
};

const BENCH_LABEL: Record<string, string> = {
  SAFE: 'Aman',
  WATCH: 'Perhatian',
  SP2DK_RISK: 'Risiko SP2DK',
};

function BenchmarkBar({
  value,
  min,
  max,
  status,
  unit,
}: {
  value: number;
  min: number;
  max: number;
  status: string;
  unit: string;
}) {
  const scale = Math.max(max * 1.45, value * 1.15, 100);
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  const valPct = clamp((value / scale) * 100);
  const minPct = clamp((min / scale) * 100);
  const maxPct = Math.max(minPct, clamp((max / scale) * 100));
  const { bar } = BENCH_TONE[status] ?? BENCH_TONE.SAFE;
  const suffix = unit === '%' ? '%' : '';

  // The adjacent "Rentang ideal" column already prints min–max, so the bar
  // carries no tick labels of its own — they collided on narrow ranges.
  return (
    <div
      className="relative h-4 w-full min-w-[110px]"
      title={`Nilai ${value}${suffix} · rentang ideal ${min}–${max}${suffix}`}
    >
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-strong" />
      <span
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-success-100"
        style={{ left: `${minPct}%`, width: `${Math.max(2, maxPct - minPct)}%` }}
      />
      <span
        className={cn(
          'absolute top-1/2 h-3.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full',
          'shadow-[0_0_0_1.5px_var(--color-surface)]',
          bar,
        )}
        style={{ left: `${valPct}%` }}
      />
    </div>
  );
}

function ScenarioRow({
  s,
  country,
  expanded,
  onToggle,
}: {
  s: SmartScenario;
  country: CountryCode;
  expanded: boolean;
  onToggle: () => void;
}) {
  const delta = s.primaryMetric === 'cash' ? s.cashDelta : s.taxDueDelta;
  const favorable = delta < 0;
  const unfavorable = delta > 0;
  const tone = favorable ? 'text-success-700' : unfavorable ? 'text-danger-700' : 'text-ink-4';
  const Arrow = favorable ? TrendingDown : unfavorable ? TrendingUp : null;

  return (
    <div className="border border-line rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface hover:bg-subtle transition-colors text-left cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-ink">{s.label}</span>
            <Badge tone={s.primaryMetric === 'cash' ? 'brand' : 'neutral'}>
              {s.primaryMetric === 'cash' ? 'Dampak kas' : 'Dampak PPh terutang'}
            </Badge>
          </div>
          <div className="text-xs text-ink-3 mt-0.5">{s.description}</div>
        </div>
        <div className={cn('flex items-center gap-1.5 text-sm font-semibold num shrink-0', tone)}>
          {Arrow && <Arrow className="size-4" />}
          {delta === 0 ? 'Tidak berubah' : `${delta > 0 ? '+' : ''}${money(delta, country)}`}
        </div>
        <span className="ml-1 text-ink-4">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-line bg-subtle px-4 py-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-ink-3">PPh terutang saat ini</span>
              <span className="num font-medium text-ink">{money(s.baseTaxDue, country)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-3">PPh terutang skenario</span>
              <span className={cn('num font-semibold', s.taxDueDelta < 0 ? 'text-success-700' : s.taxDueDelta > 0 ? 'text-danger-700' : 'text-ink')}>
                {money(s.scenarioTaxDue, country)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-3">Kurang (lebih) bayar saat ini</span>
              <span className="num font-medium text-ink">{money(s.baseNetBalance, country)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-3">Kurang (lebih) bayar skenario</span>
              <span className={cn('num font-semibold', s.cashDelta < 0 ? 'text-success-700' : s.cashDelta > 0 ? 'text-danger-700' : 'text-ink')}>
                {money(s.scenarioNetBalance, country)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-3">Tarif efektif saat ini</span>
              <span className="num font-medium text-ink">{pct(s.baseEffective)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-3">Tarif efektif skenario</span>
              <span className="num font-semibold text-ink">{pct(s.scenarioEffective)}</span>
            </div>
          </div>
          {s.note && (
            <p className="text-xs text-ink-2 pt-2 border-t border-line flex items-start gap-1.5">
              <Info className="size-3.5 mt-0.5 text-brand-600 shrink-0" />
              <span>{s.note}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function SmartAdvisor({ onOpenRecon }: { onOpenRecon?: () => void }) {
  const ws = useWorkspace();
  const ui = useUi();

  const entity = ws.activeEntity;
  const country: CountryCode = entity.countryCode;
  const calc = ws.calculationFor(entity.id);
  const credits: CreditLine[] = useMemo(() => calc.credits ?? [], [calc.credits]);
  const cfg = MULTI_COUNTRY_DATA[country];
  const facility = FACILITY[country];

  const [subView, setSubView] = useState<SubView>('optimize');
  const [expandedScenario, setExpandedScenario] = useState<string | null>('clean_positive');

  // Master analysis for active entity
  const entityFindings = useMemo(
    () => ws.findings.filter((f) => f.entityId === entity.id),
    [ws.findings, entity.id],
  );

  const analysis = useMemo(
    () =>
      analyzeTaxPosition({
        items: calc.items,
        country,
        applyFacility: calc.apply31EFacility,
        credits,
        findings: entityFindings,
        reviewOf: ws.reviewOf,
        benchmarks: cfg.industryBenchmarks,
      }),
    [calc.items, country, calc.apply31EFacility, credits, entityFindings, ws.reviewOf, cfg.industryBenchmarks],
  );

  // Goal-Seek state (reset sensible defaults when entity changes)
  const [goalMode, setGoalMode] = useState<GoalMode>('target_etr');
  const [targetEtrPct, setTargetEtrPct] = useState<number>(() =>
    Math.max(5, Math.round(Math.max(0, analysis.cit.effectiveRate * 100 - 2) * 10) / 10),
  );
  const [maxTaxDue, setMaxTaxDue] = useState<number>(() => Math.round(analysis.cit.taxDue * 0.85));

  useEffect(() => {
    setTargetEtrPct(Math.max(5, Math.round(Math.max(0, analysis.cit.effectiveRate * 100 - 2) * 10) / 10));
    setMaxTaxDue(Math.round(analysis.cit.taxDue * 0.85));
    // Only reset defaults when switching active entity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity.id]);

  const goalSolution = useMemo(
    () =>
      solveTaxGoal(calc.items, country, calc.apply31EFacility, credits, {
        mode: goalMode,
        targetEtr: targetEtrPct / 100,
        maxTaxDue,
      }),
    [calc.items, country, calc.apply31EFacility, credits, goalMode, targetEtrPct, maxTaxDue],
  );

  // Multi-jurisdiction Group Tax Consolidation (for accessible entities)
  const groupConsolidation = useMemo(() => {
    const entries = ws.accessibleEntities.map((e) => {
      const c = ws.calculationFor(e.id);
      return {
        entityId: e.id,
        legalName: e.legalName,
        flag: e.flag,
        country: e.countryCode,
        items: c.items,
        applyFacility: c.apply31EFacility,
        credits: c.credits ?? [],
      };
    });
    return computeGroupTaxConsolidation(entries);
  }, [ws]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleBatchApplyCorrections = () => {
    const pending = analysis.pendingCorrections.findings;
    if (pending.length === 0) return;

    let nextItems = [...calc.items];
    const appliedFindings: { id: string; detail: string }[] = [];

    for (const f of pending) {
      if (!f.correction) continue;
      const marker = `[${f.id}]`;
      if (isCorrectionReflected(nextItems, f.correction, marker)) continue;
      const res = applyCorrectionToItems(nextItems, f.correction, marker, f.ruleName);
      if (res.changed) {
        nextItems = res.items;
        appliedFindings.push({
          id: f.id,
          detail: `Akun ${f.correction.accountCode} · +${money(f.correction.amount, country)}`,
        });
      }
    }

    if (appliedFindings.length === 0) {
      ui.toast('Seluruh koreksi kasus sudah tercermin di rekonsiliasi.');
      return;
    }

    // 1. Update reconciliation lines
    ws.setCalculation(entity.id, { ...calc, items: nextItems });
    // 2. Sync review state so CasesPage stays consistent
    ws.updateCompliance((s) => {
      const reviews = { ...s.reviews };
      for (const af of appliedFindings) {
        const cur = reviews[af.id];
        if (cur && cur.status === 'confirmed' && !cur.correctionApplied) {
          reviews[af.id] = markCorrectionApplied(cur, ws.actor, af.detail);
        }
      }
      return { ...s, reviews };
    });
    // 3. Log audit trail
    ws.logAudit(
      'BATCH_APPLY_CORRECTIONS',
      `Rekonsiliasi ${entity.legalName}`,
      `${appliedFindings.length} koreksi dari kasus terkonfirmasi diterapkan melalui Komputasi Pintar (${appliedFindings.map((a) => a.detail).join('; ')}).`,
    );
    ui.toast(`${appliedFindings.length} koreksi kasus berhasil disinkronkan ke rekonsiliasi.`, 'success');
  };

  const handleToggleFacility = (nextVal: boolean) => {
    ws.setCalculation(entity.id, { ...calc, apply31EFacility: nextVal });
    ws.logAudit(
      'TOGGLE_FACILITY',
      `Rekonsiliasi ${entity.legalName}`,
      `${facility?.label ?? 'Fasilitas tarif'} ${nextVal ? 'diaktifkan' : 'dinonaktifkan'} melalui Komputasi Pintar.`,
    );
    ui.toast(`${facility?.label ?? 'Fasilitas tarif'} ${nextVal ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
  };

  const handleQuickFixAnomaly = (a: LineAnomaly) => {
    if (a.kind === 'fiscal_drift') {
      const nextItems = calc.items.map((it) =>
        it.id === a.itemId ? { ...it, fiscalAmount: fiscalOf(it) } : it,
      );
      ws.setCalculation(entity.id, { ...calc, items: nextItems });
      ws.logAudit('FIX_FISCAL_DRIFT', `Rekonsiliasi ${entity.legalName}`, `Menyelaraskan nilai fiskal akun ${a.accountCode}.`);
      ui.toast(`Nilai fiskal akun ${a.accountCode} diselaraskan.`, 'success');
      return;
    }
    if (a.kind === 'missing_basis' && a.suggestedBasis) {
      const nextItems = calc.items.map((it) =>
        it.id === a.itemId ? { ...it, legalBasis: a.suggestedBasis! } : it,
      );
      ws.setCalculation(entity.id, { ...calc, items: nextItems });
      ws.logAudit('FILL_LEGAL_BASIS', `Rekonsiliasi ${entity.legalName}`, `Dasar hukum akun ${a.accountCode} dilengkapi: ${a.suggestedBasis}.`);
      ui.toast(`Dasar hukum akun ${a.accountCode} dilengkapi.`, 'success');
      return;
    }
    onOpenRecon?.();
  };

  const bestRegime = analysis.regimes.regimes.find((r) => r.id === analysis.regimes.bestEligibleId);
  const actionCount =
    analysis.pendingCorrections.count +
    (analysis.regimes.bestToggleSaving > 0 ? 1 : 0) +
    analysis.anomalies.filter((a) => a.severity !== 'info').length;

  return (
    <div className="space-y-6">
      {/* Top editorial metric strip */}
      <MetricBand
        label="Ringkasan sistem komputasi pintar"
        lead={
          <BandLead
            eyebrow="Skor komputasi & kesiapan"
            title={analysis.readinessBand.label}
            detail={`${entity.flag} ${entity.legalName} · ETR ${pct(analysis.cit.effectiveRate)} vs tarif normal ${pct(STANDARD_RATE[country], 0)}`}
            visual={
              <ComplianceRing
                value={analysis.readinessScore}
                tone={analysis.readinessBand.tone}
                label={`Skor komputasi ${analysis.readinessScore} dari 100`}
              />
            }
          />
        }
        metrics={[
          {
            label: 'Rezim paling hemat',
            value:
              analysis.regimes.bestOverallSaving > 0
                ? `Hemat ${moneyCompact(analysis.regimes.bestOverallSaving, country)}`
                : 'Sudah optimal',
            detail: bestRegime ? bestRegime.label : 'Tarif normal',
            tone: analysis.regimes.bestOverallSaving > 0 ? 'success' : 'brand',
          },
          {
            label: `Proyeksi angsuran (${analysis.instalment.frequency})`,
            value: money(analysis.instalment.perPeriodAmount, country),
            detail: analysis.instalment.label,
          },
          {
            label: 'Tindakan terdeteksi',
            value: `${actionCount} item`,
            detail:
              analysis.pendingCorrections.count > 0
                ? `${analysis.pendingCorrections.count} kasus tertunda · ${analysis.anomalies.length} catatan akun`
                : analysis.anomalies.length > 0
                  ? `${analysis.anomalies.length} catatan akun rekonsiliasi`
                  : 'Semua baris & kasus selaras',
            tone: actionCount > 0 ? 'warning' : 'success',
          },
        ]}
      />

      {/* Sub-navigation for the 4 smart computation tools */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<SubView>
          value={subView}
          onChange={setSubView}
          items={[
            { id: 'optimize', label: 'Optimasi & diagnostik', icon: <Sparkles />, count: actionCount || undefined },
            { id: 'goalseek', label: 'Pemecah target', icon: <Target /> },
            { id: 'sensitivity', label: 'Sensitivitas & skenario', icon: <SlidersHorizontal /> },
            { id: 'group', label: 'Konsolidasi & benchmark', icon: <Globe2 /> },
          ]}
        />
        <Button
          size="sm"
          variant="subtle"
          icon={<Sparkles />}
          onClick={() =>
            ui.askCopilot(
              `Ringkas hasil Komputasi Pintar untuk ${entity.legalName} (${country}): skor kesiapan ${analysis.readinessScore}/100, PPh terutang ${money(analysis.cit.taxDue, country)}, ETR ${pct(analysis.cit.effectiveRate)}, proyeksi angsuran ${money(analysis.instalment.perPeriodAmount, country)}/${analysis.instalment.frequency}. Apa 3 langkah prioritas sebelum lapor SPT?`,
            )
          }
        >
          Diskusikan dengan Copilot
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VIEW 1: OPTIMASI & DIAGNOSTIK                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {subView === 'optimize' && (
        <div className="space-y-6">
          {/* Threshold cliff warning if approaching Rp 4.8B or Rp 50B */}
          {analysis.regimes.thresholdWarning && (
            <Callout
              tone={analysis.regimes.thresholdWarning.severity}
              icon={<AlertTriangle />}
              title={analysis.regimes.thresholdWarning.title}
            >
              {analysis.regimes.thresholdWarning.detail}
            </Callout>
          )}

          {/* Actionable priority alerts */}
          {analysis.pendingCorrections.count > 0 && (
            <Callout
              tone="danger"
              icon={<Zap />}
              title={`${analysis.pendingCorrections.count} koreksi dari kasus terkonfirmasi belum masuk rekonsiliasi`}
              action={
                <Button size="sm" variant="primary" onClick={handleBatchApplyCorrections}>
                  Terapkan semua ({analysis.pendingCorrections.count})
                </Button>
              }
            >
              Total koreksi positif {money(analysis.pendingCorrections.totalCorrectionAmount, country)} menambah PPh
              terutang sebesar {money(analysis.pendingCorrections.additionalTaxDue, country)}, namun menghindarkan
              potensi sanksi pemeriksaan hingga{' '}
              <span className="font-semibold text-ink">
                {money(analysis.pendingCorrections.estimatedPenaltyAvoided, country)}
              </span>{' '}
              ({analysis.pendingCorrections.penaltyBasis}).
            </Callout>
          )}

          {/* Multi-regime tax optimizer */}
          <Card>
            <CardHeader
              icon={<Compass />}
              title="Komparasi rezim & tarif pajak optimal"
              description={`Perhitungan otomatis seluruh skema tarif sah di ${cfg.authorityShort} berdasarkan omzet ${money(analysis.grossRevenue, country)} dan PKP ${money(analysis.cit.taxableIncome, country)}.`}
            />
            <Table>
              <THead>
                <tr>
                  <TH>Skema / Rezim</TH>
                  <TH align="right">PPh terutang</TH>
                  <TH align="right">Tarif efektif</TH>
                  <TH align="right">Selisih vs aktif</TH>
                  <TH>Status</TH>
                  <TH align="right">Aksi</TH>
                </tr>
              </THead>
              <tbody>
                {analysis.regimes.regimes.map((r) => (
                  <TR key={r.id}>
                    <TD className="min-w-[240px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-ink">{r.label}</span>
                        {r.isCurrent && <Badge tone="dark">Aktif</Badge>}
                        {r.isRecommended && !r.isCurrent && <Badge tone="success">Paling hemat</Badge>}
                        {r.advisoryOnly && <Badge tone="brand">Simulasi</Badge>}
                      </div>
                      <div className="text-xs text-ink-3 mt-0.5">{r.basis}</div>
                      <div className="text-xs text-ink-2 mt-0.5">{r.eligibilityNote}</div>
                    </TD>
                    <TD align="right" className="font-medium text-ink">
                      {money(r.taxDue, country)}
                    </TD>
                    <TD align="right" className="text-ink-2">
                      {pct(r.effectiveRate)}
                    </TD>
                    <TD
                      align="right"
                      className={cn(
                        'font-medium',
                        r.savingVsCurrent > 0
                          ? 'text-success-700'
                          : r.savingVsCurrent < 0
                            ? 'text-danger-700'
                            : 'text-ink-4',
                      )}
                    >
                      {r.savingVsCurrent === 0
                        ? '—'
                        : r.savingVsCurrent > 0
                          ? `Hemat ${money(r.savingVsCurrent, country)}`
                          : `+${money(Math.abs(r.savingVsCurrent), country)}`}
                    </TD>
                    <TD>
                      <Badge tone={r.eligible ? 'success' : 'neutral'}>
                        {r.eligible ? 'Memenuhi syarat' : 'Tidak memenuhi'}
                      </Badge>
                    </TD>
                    <TD align="right" className="whitespace-nowrap">
                      {typeof r.toggleFacilityValue === 'boolean' && r.eligible && !r.isCurrent ? (
                        <Button
                          size="xs"
                          variant={r.savingVsCurrent > 0 ? 'primary' : 'secondary'}
                          onClick={() => handleToggleFacility(r.toggleFacilityValue!)}
                        >
                          {r.toggleFacilityValue ? 'Aktifkan' : 'Gunakan normal'}
                        </Button>
                      ) : r.advisoryOnly && r.eligible ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() =>
                            ui.askCopilot(
                              `Bandingkan ${r.label} (estimasi pajak ${money(r.taxDue, country)}) dengan posisi aktif ${entity.legalName} (${money(analysis.cit.taxDue, country)}). Apa syarat hukum, batas waktu, dan implikasi kredit pajaknya?`,
                            )
                          }
                        >
                          Uji syarat
                        </Button>
                      ) : (
                        <span className="text-xs text-ink-4">{r.isCurrent ? 'Diterapkan' : '—'}</span>
                      )}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>

          {/* Breakdown + Next-Year Instalment Projector */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Readiness breakdown */}
            <Card>
              <CardHeader
                icon={<ShieldCheck />}
                title="Rincian skor komputasi"
                description="5 faktor transparan yang menentukan kesiapan rekonsiliasi sebelum penyusunan SPT"
              />
              <CardBody className="space-y-4">
                {analysis.factors.map((f) => (
                  <div key={f.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="font-medium text-ink">{f.label}</span>
                      <span className="num text-xs text-ink-2">
                        {f.points} / {f.maxPoints}
                      </span>
                    </div>
                    <Meter
                      value={f.points}
                      max={f.maxPoints}
                      tone={f.status === 'ok' ? 'success' : f.status === 'warning' ? 'warning' : 'danger'}
                      label={f.label}
                    />
                    <p className="text-xs text-ink-3">{f.detail}</p>
                  </div>
                ))}
              </CardBody>
            </Card>

            {/* Next-year statutory instalment */}
            <Card>
              <CardHeader
                icon={<BarChart3 />}
                title={analysis.instalment.label}
                description={analysis.instalment.basis}
              />
              <CardBody className="space-y-4">
                <dl className="divide-y divide-line rounded-lg border border-line text-[13px]">
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <dt className="text-ink-2">Dasar perhitungan tahunan</dt>
                    <dd className="num font-medium text-ink">{money(analysis.instalment.annualBase, country)}</dd>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-subtle">
                    <dt className="font-medium text-ink">
                      Estimasi setor per {analysis.instalment.frequency === 'bulanan' ? 'bulan' : 'kuartal'}
                    </dt>
                    <dd className="num font-semibold text-ink">
                      {money(analysis.instalment.perPeriodAmount, country)}
                    </dd>
                  </div>
                  {analysis.instalment.statutoryFloorPerPeriod !== undefined && (
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                      <dt className="text-ink-2">Batas minimal 85% (statutory floor)</dt>
                      <dd className="num text-ink">{money(analysis.instalment.statutoryFloorPerPeriod, country)}</dd>
                    </div>
                  )}
                  {analysis.instalment.currentPerPeriod !== null && (
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                      <dt className="text-ink-2">Angsuran berjalan saat ini</dt>
                      <dd className="num text-ink-2">
                        {money(analysis.instalment.currentPerPeriod, country)}
                        {analysis.instalment.deltaPerPeriod !== null && analysis.instalment.deltaPerPeriod !== 0 && (
                          <span
                            className={cn(
                              'ml-2 text-xs font-medium',
                              analysis.instalment.deltaPerPeriod > 0 ? 'text-warning-700' : 'text-success-700',
                            )}
                          >
                            ({analysis.instalment.deltaPerPeriod > 0 ? '+' : ''}
                            {money(analysis.instalment.deltaPerPeriod, country)})
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
                <Callout tone="neutral" icon={<Info />}>
                  {analysis.instalment.note}
                </Callout>
                <div className="flex flex-wrap gap-2">
                  {onOpenRecon && (
                    <Button size="sm" variant="secondary" iconRight={<ArrowRight />} onClick={onOpenRecon}>
                      Edit kredit & rekonsiliasi
                    </Button>
                  )}
                  <Link href="/payments">
                    <Button size="sm" variant="ghost">
                      Lihat jadwal pembayaran
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Line-by-line smart anomaly scanner */}
          <Card>
            <CardHeader
              icon={<Wrench />}
              title="Pemindai cerdas baris rekonsiliasi"
              description="Memeriksa kelengkapan dasar hukum, potensi objek PPh Final, konsistensi nilai fiskal, dan akun biaya sensitif"
              actions={
                <Badge tone={analysis.anomalies.length === 0 ? 'success' : 'warning'}>
                  {analysis.anomalies.length === 0
                    ? 'Tidak ada anomali'
                    : `${analysis.anomalies.length} catatan ditemukan`}
                </Badge>
              }
            />
            <CardBody>
              {analysis.anomalies.length === 0 ? (
                <Callout tone="success" icon={<CheckCircle2 />}>
                  Seluruh {calc.items.length} baris rekonsiliasi lolos uji integritas rumus, kelengkapan dasar hukum,
                  dan klasifikasi akun.
                </Callout>
              ) : (
                <div className="divide-y divide-line border border-line rounded-lg">
                  {analysis.anomalies.map((a) => (
                    <div key={a.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            tone={a.severity === 'danger' ? 'danger' : a.severity === 'warning' ? 'warning' : 'brand'}
                          >
                            {a.accountCode}
                          </Badge>
                          <span className="text-[13px] font-medium text-ink">{a.title}</span>
                        </div>
                        <p className="text-xs text-ink-3 mt-1">{a.detail}</p>
                      </div>
                      <div className="shrink-0">
                        {a.kind === 'fiscal_drift' ? (
                          <Button size="xs" variant="primary" onClick={() => handleQuickFixAnomaly(a)}>
                            Selaraskan nilai
                          </Button>
                        ) : a.kind === 'missing_basis' && a.suggestedBasis ? (
                          <Button size="xs" variant="secondary" onClick={() => handleQuickFixAnomaly(a)}>
                            Isi dasar hukum
                          </Button>
                        ) : (
                          <Button size="xs" variant="ghost" onClick={() => handleQuickFixAnomaly(a)}>
                            Tinjau baris
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VIEW 2: GOAL-SEEK SOLVER (KOMPUTASI BALIK)                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {subView === 'goalseek' && (
        <div className="space-y-6">
          <Callout tone="brand" icon={<Target />} title="Pemecah target fiskal (Inverse Goal-Seek Engine)">
            Masukkan target tarif efektif, posisi SPT Nihil, atau batas pajak terutang — mesin menghitung mundur secara
            eksak melintasi lapisan tarif non-linear ({facility ? facility.label : 'tarif normal'}) dan memverifikasi
            hasilnya pada mesin PPh badan.
          </Callout>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-4 sm:gap-6">
            {/* Goal inputs */}
            <Card>
              <CardHeader title="Parameter target" description="Simulasi murni — tidak mengubah data rekonsiliasi" />
              <CardBody className="space-y-5">
                <div className="space-y-2">
                  <span className="block text-xs font-medium text-ink-2">Pilih sasaran komputasi</span>
                  <div className="grid grid-cols-1 gap-2">
                    {(
                      [
                        {
                          id: 'target_etr',
                          title: 'Target Tarif Efektif (ETR)',
                          desc: 'Hitung penyesuaian PKP agar ETR turun ke angka tertentu',
                        },
                        {
                          id: 'zero_payable',
                          title: 'Posisi SPT Nihil (Kurang Bayar = 0)',
                          desc: 'Bandingkan jalur kredit pajak vs penurunan PKP',
                        },
                        {
                          id: 'max_tax_due',
                          title: 'Batas Maksimal PPh Terutang',
                          desc: 'Cari PKP maksimal agar pajak berada di bawah anggaran',
                        },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setGoalMode(opt.id)}
                        className={cn(
                          'rounded-lg border px-3.5 py-2.5 text-left transition-colors cursor-pointer',
                          goalMode === opt.id
                            ? 'border-brand-600 bg-brand-50/60'
                            : 'border-line bg-surface hover:bg-subtle',
                        )}
                      >
                        <div className="text-[13px] font-medium text-ink">{opt.title}</div>
                        <div className="text-xs text-ink-3 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {goalMode === 'target_etr' && (
                  <div className="space-y-3 pt-1">
                    {(() => {
                      const etrMin = 1;
                      const etrMax = Math.max(25, Math.ceil(analysis.cit.effectiveRate * 100 + 4));
                      const fill = ((targetEtrPct - etrMin) / Math.max(1, etrMax - etrMin)) * 100;
                      return (
                        <label className="block">
                          <span className="flex items-center justify-between text-[13px] text-ink-2 mb-1.5">
                            Target tarif efektif (ETR)
                            <span className="font-semibold text-ink num">{pct(targetEtrPct / 100)}</span>
                          </span>
                          <input
                            type="range"
                            min={etrMin}
                            max={etrMax}
                            step={0.5}
                            value={targetEtrPct}
                            onChange={(e) => setTargetEtrPct(Number(e.target.value))}
                            className="slider"
                            style={{ '--v': `${fill}%` } as React.CSSProperties}
                          />
                        </label>
                      );
                    })()}
                    <p className="text-xs text-ink-3">
                      ETR saat ini: <span className="font-medium text-ink num">{pct(analysis.cit.effectiveRate)}</span>{' '}
                      (tarif normal {pct(STANDARD_RATE[country], 0)}).
                    </p>
                  </div>
                )}

                {goalMode === 'max_tax_due' && (
                  <TextField
                    label={`Batas PPh terutang (${cfg.currencyCode})`}
                    type="number"
                    min={0}
                    value={maxTaxDue}
                    onChange={(e) => setMaxTaxDue(Math.max(0, Number(e.target.value) || 0))}
                    hint={`PPh terutang saat ini: ${money(analysis.cit.taxDue, country)}`}
                  />
                )}

                {goalMode === 'zero_payable' && (
                  <div className="rounded-lg border border-line bg-subtle px-3.5 py-3 text-xs text-ink-2 space-y-1">
                    <div>
                      Kurang bayar saat ini:{' '}
                      <span className="font-semibold text-ink num">{money(analysis.cit.payable, country)}</span>
                    </div>
                    <div>
                      Kredit pajak tercatat:{' '}
                      <span className="font-medium text-ink num">{money(analysis.cit.credits, country)}</span>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Goal-Seek solution */}
            <Card>
              <CardHeader
                title="Solusi komputasi balik"
                description={goalSolution.summary}
                actions={
                  <Badge tone={goalSolution.alreadyMet ? 'success' : goalSolution.achievable ? 'brand' : 'warning'}>
                    {goalSolution.alreadyMet
                      ? 'Target tercapai'
                      : goalSolution.achievable
                        ? 'Solusi ditemukan'
                        : 'Perlu kajian lanjut'}
                  </Badge>
                }
              />
              <CardBody className="space-y-4">
                {goalMode === 'zero_payable' && !goalSolution.alreadyMet && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-3.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                        Jalur A · Kredit pajak (1:1)
                      </div>
                      <div className="mt-1 font-serif text-[22px] text-ink num">
                        +{money(goalSolution.requiredAdditionalCredits, country)}
                      </div>
                      <p className="mt-1 text-xs text-ink-3">
                        Tambahan bukti potong PPh 22/23 atau angsuran yang belum dicatat.
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-subtle p-3.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                        Jalur B · Penurunan PKP
                      </div>
                      <div className="mt-1 font-serif text-[22px] text-ink num">
                        −{money(goalSolution.requiredPkpReduction, country)}
                      </div>
                      <p className="mt-1 text-xs text-ink-3">
                        Penurunan PKP yang diperlukan agar PPh terutang menyamai kredit berjalan.
                      </p>
                    </div>
                  </div>
                )}

                <dl className="divide-y divide-line rounded-lg border border-line text-[13px]">
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <dt className="text-ink-2">Penurunan PKP yang dibutuhkan</dt>
                    <dd className="num font-semibold text-ink">
                      {goalSolution.requiredPkpReduction > 0
                        ? `−${money(goalSolution.requiredPkpReduction, country)}`
                        : 'Tidak perlu perubahan'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <dt className="text-ink-2">Dapat ditutup dari pembuktian koreksi (+)</dt>
                    <dd className="num text-success-700 font-medium">
                      {money(goalSolution.coverableByPositiveCorrections, country)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <dt className="text-ink-2">Sisa di luar koreksi (+) saat ini</dt>
                    <dd className="num text-ink-2">
                      {money(goalSolution.remainingReductionBeyondPositive, country)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-subtle">
                    <dt className="font-medium text-ink">Verifikasi PPh terutang hasil solusi</dt>
                    <dd className="num font-semibold text-ink">
                      {money(goalSolution.verifiedTaxDue, country)}{' '}
                      <span className="text-xs font-normal text-ink-3">
                        (ETR {pct(goalSolution.verifiedEffectiveRate)})
                      </span>
                    </dd>
                  </div>
                </dl>

                <Callout tone="neutral" icon={<Lightbulb />}>
                  {goalSolution.complianceNote}
                </Callout>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      ui.askCopilot(
                        `Bagaimana strategi tax planning legal untuk menurunkan PKP ${entity.legalName} sebesar ${money(goalSolution.requiredPkpReduction, country)} (dari koreksi positif ${money(analysis.cit.positive, country)}) agar mencapai target PPh terutang ${money(goalSolution.targetTaxDue, country)}?`,
                      )
                    }
                  >
                    Tanya strategi legal ke Copilot
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VIEW 3: SENSITIVITAS 2D & SKENARIO CERDAS                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {subView === 'sensitivity' && (
        <div className="space-y-6">
          {/* 2D Sensitivity Matrix */}
          <Card>
            <CardHeader
              icon={<SlidersHorizontal />}
              title="Matriks sensitivitas 2D (Pendapatan × Efisiensi fiskal)"
              description="Simulasi simultan dampak perubahan pendapatan terhadap PPh terutang, ETR, dan pergeseran ambang batas tarif"
            />
            <Table>
              <THead>
                <tr>
                  <TH>Skenario pendapatan</TH>
                  {analysis.sensitivity.columns.map((c) => (
                    <TH key={c.id} align="right">
                      <div>{c.label}</div>
                      <div className="text-[10px] font-normal normal-case tracking-normal text-ink-4">
                        {c.description}
                      </div>
                    </TH>
                  ))}
                </tr>
              </THead>
              <tbody>
                {analysis.sensitivity.rows.map((row) => (
                  <TR key={row.revenuePct} className={row.revenuePct === 0 ? 'bg-subtle/60' : undefined}>
                    <TD className="min-w-[170px]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink num">
                          {row.revenuePct > 0 ? `+${row.revenuePct}%` : `${row.revenuePct}%`}
                        </span>
                        {row.revenuePct === 0 && <Badge tone="dark">Basis</Badge>}
                      </div>
                      <div className="text-xs text-ink-3 num mt-0.5">
                        Omzet {moneyCompact(row.projectedRevenue, country)}
                      </div>
                    </TD>
                    {row.cells.map((cell) => {
                      const delta = cell.taxDue - analysis.cit.taxDue;
                      return (
                        <TD key={cell.columnId} align="right" className="min-w-[160px]">
                          <div className="font-medium text-ink num">{money(cell.taxDue, country)}</div>
                          <div className="text-xs num text-ink-3">
                            ETR {pct(cell.effectiveRate)}
                            {delta !== 0 && (
                              <span className={cn('ml-1.5', delta < 0 ? 'text-success-700' : 'text-danger-700')}>
                                ({delta > 0 ? '+' : ''}
                                {moneyCompact(delta, country)})
                              </span>
                            )}
                          </div>
                          {cell.cliffNote && (
                            <div className="mt-1">
                              <Badge tone="warning">{cell.cliffNote}</Badge>
                            </div>
                          )}
                        </TD>
                      );
                    })}
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>

          {/* Curated Smart Scenarios */}
          <Card>
            <CardHeader
              title="Skenario pajak & arus kas otomatis"
              description="Klik setiap skenario untuk melihat perbandingan PPh terutang, kurang/lebih bayar kas, dan tarif efektif"
            />
            <CardBody className="space-y-3">
              {analysis.scenarios.map((s) => (
                <ScenarioRow
                  key={s.id}
                  s={s}
                  country={country}
                  expanded={expandedScenario === s.id}
                  onToggle={() => setExpandedScenario(expandedScenario === s.id ? null : s.id)}
                />
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VIEW 4: KONSOLIDASI GRUP (PILLAR TWO) & BENCHMARK INDUSTRI         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {subView === 'group' && (
        <div className="space-y-6">
          {/* Group Tax Consolidation + OECD Pillar Two 15% */}
          <Card>
            <CardHeader
              icon={<Globe2 />}
              title="Konsolidasi komputasi grup & uji OECD Pillar Two (GloBE 15%)"
              description={`Agregasi posisi pajak ${groupConsolidation.rows.length} entitas dalam cakupan akses peran Anda (dikonversi ke IDR). ${FX_NOTE}.`}
              actions={
                <Badge tone={groupConsolidation.belowMinimumCount > 0 ? 'warning' : 'success'}>
                  {groupConsolidation.belowMinimumCount > 0
                    ? `${groupConsolidation.belowMinimumCount} entitas di bawah ETR 15%`
                    : 'Semua entitas ≥ ETR 15%'}
                </Badge>
              }
            />
            <Table>
              <THead>
                <tr>
                  <TH>Entitas</TH>
                  <TH align="right">Laba komersial (IDR)</TH>
                  <TH align="right">PPh terutang (IDR)</TH>
                  <TH align="right">ETR</TH>
                  <TH align="right">Indikasi Top-Up GloBE (15%)</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <tbody>
                {groupConsolidation.rows.map((r) => (
                  <TR key={r.entityId} className={r.entityId === entity.id ? 'bg-brand-50/30' : undefined}>
                    <TD className="min-w-[200px]">
                      <div className="font-medium text-ink flex items-center gap-2">
                        <span>
                          {r.flag} {r.legalName}
                        </span>
                        {r.entityId === entity.id && <Badge tone="brand">Aktif</Badge>}
                      </div>
                      <div className="text-xs text-ink-3 num mt-0.5">
                        Lokal: PPh {money(r.taxDue, r.country)}
                      </div>
                    </TD>
                    <TD align="right" className="text-ink">
                      {money(r.commercialProfitIdr, 'ID')}
                    </TD>
                    <TD align="right" className="font-medium text-ink">
                      {money(r.taxDueIdr, 'ID')}
                    </TD>
                    <TD align="right" className="font-medium num">
                      <span className={r.pillarTwoGap > 0.0005 ? 'text-warning-700' : 'text-ink'}>
                        {pct(r.effectiveRate)}
                      </span>
                    </TD>
                    <TD align="right" className={r.pillarTwoTopUpIdr > 0 ? 'text-warning-700 font-medium' : 'text-ink-4'}>
                      {r.pillarTwoTopUpIdr > 0 ? money(r.pillarTwoTopUpIdr, 'ID') : '—'}
                    </TD>
                    <TD>
                      <Badge tone={r.pillarTwoGap > 0.0005 ? 'warning' : 'success'}>
                        {r.pillarTwoGap > 0.0005 ? `Gap ${pct(r.pillarTwoGap)}` : 'Aman ≥ 15%'}
                      </Badge>
                    </TD>
                  </TR>
                ))}
                <tr className="bg-subtle border-t border-line font-medium">
                  <TD className="text-ink">Konsolidasi grup</TD>
                  <TD align="right" className="text-ink">
                    {money(groupConsolidation.totalProfitIdr, 'ID')}
                  </TD>
                  <TD align="right" className="text-ink">
                    {money(groupConsolidation.totalTaxDueIdr, 'ID')}
                  </TD>
                  <TD align="right" className="text-ink">
                    {pct(groupConsolidation.weightedEtr)}
                  </TD>
                  <TD align="right" className={groupConsolidation.totalPillarTwoTopUpIdr > 0 ? 'text-warning-700' : 'text-ink-4'}>
                    {groupConsolidation.totalPillarTwoTopUpIdr > 0
                      ? money(groupConsolidation.totalPillarTwoTopUpIdr, 'ID')
                      : '—'}
                  </TD>
                  <TD className="text-xs text-ink-3">Ambang MNE €750M (PMK 136/2024)</TD>
                </tr>
              </tbody>
            </Table>
          </Card>

          {/* Industry Benchmark Panel */}
          <Card>
            <CardHeader
              title="Benchmark industri & deteksi risiko SP2DK"
              description={`Perbandingan rasio keuangan dan kepatuhan ${entity.legalName} terhadap rentang ideal ${cfg.authorityShort}`}
            />
            <Table>
              <THead>
                <tr>
                  <TH>Metrik</TH>
                  <TH>Kode</TH>
                  <TH align="right">Nilai entitas</TH>
                  <TH>Rentang ideal</TH>
                  <TH>Posisi visual</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <tbody>
                {cfg.industryBenchmarks.map((b) => {
                  const { badge } = BENCH_TONE[b.status] ?? BENCH_TONE.SAFE;
                  return (
                    <TR key={b.code}>
                      <TD className="min-w-[220px]">
                        <div className="text-ink text-[13px] font-medium">{b.metric}</div>
                        <div className="text-xs text-ink-3 mt-0.5">{b.insight}</div>
                      </TD>
                      <TD>
                        <span className="font-mono text-xs text-ink-3 whitespace-nowrap">{b.code}</span>
                      </TD>
                      <TD align="right">
                        <span className="num font-semibold text-ink">
                          {b.companyValue}
                          {b.unit}
                        </span>
                      </TD>
                      <TD>
                        <span className="text-xs text-ink-2 num whitespace-nowrap">
                          {b.industryIdealMin}–{b.industryIdealMax}
                          {b.unit}
                        </span>
                      </TD>
                      <TD className="min-w-[150px]">
                        <BenchmarkBar
                          value={b.companyValue}
                          min={b.industryIdealMin}
                          max={b.industryIdealMax}
                          status={b.status}
                          unit={b.unit}
                        />
                      </TD>
                      <TD>
                        <Badge tone={badge}>{BENCH_LABEL[b.status]}</Badge>
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
            <CardBody className="pt-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  ui.askCopilot(
                    `Jelaskan hasil benchmark industri untuk ${entity.legalName}: metrik mana yang paling berisiko memicu SP2DK / audit dan langkah korektif apa yang disarankan sebelum lapor SPT?`,
                  )
                }
              >
                Tanya Copilot tentang benchmark ini
              </Button>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
