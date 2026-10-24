'use client';

import React, { useState } from 'react';
import type {
  CorporateEntity,
  CountryCode,
  FindingReviewStatus,
  FindingSeverity,
  FindingV2,
  ReconciliationLine,
} from '@/lib/domain';
import type { StatisticalSummary } from '@/lib/fraud';
import {
  type ReconciliationSummary,
  type WhatIfReconciliationOptions,
  simulateWhatIfReconciliation,
} from '@/lib/reconciliation';
import { createReturnDraft, returnDraftToXml } from '@/lib/returns';
import { getCountryAdapter, GLOBAL_RISK_RULES } from '@/lib/adapters/countryAdapter';
import { formatCurrency } from '@/data/multiCountryTaxData';
import { downloadTextFile } from './ExportAndPrintHelper';

interface RiskEngineProps {
  activeCountry: CountryCode;
  findings: FindingV2[];
  populationStats?: StatisticalSummary;
  suppressedRules: string[];
  initialRuleFilter?: string;
  onUpdateFindingStatus: (
    findingId: string,
    status: FindingReviewStatus,
    reviewer: string,
    note: string,
  ) => void;
  onMarkFalsePositive: (finding: FindingV2) => void;
  onBulkUpdateStatus: (findingIds: string[], status: FindingReviewStatus) => void;
  onJumpToReconciliation: () => void;
}

export function FraudAndRiskEngineSection({
  activeCountry,
  findings,
  populationStats,
  suppressedRules,
  initialRuleFilter = 'ALL',
  onUpdateFindingStatus,
  onMarkFalsePositive,
  onBulkUpdateStatus,
  onJumpToReconciliation,
}: RiskEngineProps) {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [ruleFilter, setRuleFilter] = useState<string>(initialRuleFilter);
  const [sortBy, setSortBy] = useState<'score_desc' | 'confidence_desc'>('score_desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewerName, setReviewerName] = useState<string>('Rina Kusuma (Head of Tax)');
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [showCatalog, setShowCatalog] = useState<boolean>(false);

  const adapter = getCountryAdapter(activeCountry);
  const allCatalogRules = [...adapter.riskRules, ...GLOBAL_RISK_RULES];

  const filteredFindings = findings
    .filter((f) => (severityFilter === 'ALL' ? true : f.severity === severityFilter))
    .filter((f) => (statusFilter === 'ALL' ? true : f.status === statusFilter))
    .filter((f) =>
      ruleFilter === 'ALL'
        ? true
        : f.ruleId.includes(ruleFilter) || f.category.includes(ruleFilter),
    )
    .sort((a, b) =>
      sortBy === 'score_desc' ? b.score - a.score : b.confidence - a.confidence,
    );

  const severityBadge = (sev: FindingSeverity) => {
    switch (sev) {
      case 'critical':
        return {
          icon: '🔴',
          label: 'KRITIS',
          cls: 'border-rose-500/50 bg-rose-500/20 text-rose-200',
        };
      case 'high':
        return {
          icon: '🟠',
          label: 'TINGGI',
          cls: 'border-amber-500/50 bg-amber-500/20 text-amber-200',
        };
      case 'medium':
        return {
          icon: '🟡',
          label: 'SEDANG',
          cls: 'border-yellow-500/50 bg-yellow-500/20 text-yellow-200',
        };
      case 'low':
        return {
          icon: '🔵',
          label: 'RENDAH',
          cls: 'border-sky-500/50 bg-sky-500/20 text-sky-200',
        };
    }
  };

  return (
    <section aria-labelledby="fraud-engine-heading" className="space-y-6">
      {/* Header & Honest Local BigQuery Simulation Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
                Tahap 4 · Explainable Fraud & Risk Engine (Dual-Layer Scoring)
              </span>
              <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                Dihitung lokal (simulasi BigQuery)
              </span>
            </div>
            <h2 id="fraud-engine-heading" className="mt-1 text-xl font-bold text-white">
              Deteksi Anomali Pajak: Kontribusi Aturan Deterministik + Statistik Populasi
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Setiap temuan memisahkan skor menjadi (a) Rule-Based Deterministik dan (b) Statistik
              Populasi (Z-Score, IQR, Hukum Benford) lengkap dengan bukti dan alur review manusia.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCatalog((v) => !v)}
              className="rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25"
            >
              {showCatalog
                ? 'Sembunyikan Katalog Aturan'
                : `Lihat Katalog Aturan (${allCatalogRules.length} Rules)`}
            </button>
            <button
              type="button"
              onClick={onJumpToReconciliation}
              className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              Lanjut ke Rekonsiliasi Fiskal →
            </button>
          </div>
        </div>

        {/* Population Statistics Bar */}
        {populationStats && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 sm:grid-cols-5">
            <div className="rounded-xl bg-slate-950/70 p-2.5 text-xs">
              <span className="text-slate-400">Populasi e-Invoice</span>
              <p className="font-mono font-bold text-white">
                n = {populationStats.count} Dokumen
              </p>
            </div>
            <div className="rounded-xl bg-slate-950/70 p-2.5 text-xs">
              <span className="text-slate-400">Rata-rata (Mean)</span>
              <p className="font-mono font-bold text-indigo-300">
                {formatCurrency(Math.round(populationStats.mean), activeCountry)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-950/70 p-2.5 text-xs">
              <span className="text-slate-400">Simpangan Baku (StdDev)</span>
              <p className="font-mono font-bold text-amber-300">
                {formatCurrency(Math.round(populationStats.stdDev), activeCountry)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-950/70 p-2.5 text-xs">
              <span className="text-slate-400">Rentang Interkuartil (IQR)</span>
              <p className="font-mono font-bold text-emerald-300">
                {formatCurrency(Math.round(populationStats.iqr), activeCountry)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-950/70 p-2.5 text-xs">
              <span className="text-slate-400">Median Populasi</span>
              <p className="font-mono font-bold text-slate-200">
                {formatCurrency(Math.round(populationStats.median), activeCountry)}
              </p>
            </div>
          </div>
        )}

        {/* Active False Positive Suppression Notice */}
        {suppressedRules.length > 0 && (
          <div className="mt-3 rounded-xl border border-indigo-500/40 bg-indigo-950/30 px-4 py-2.5 text-xs text-indigo-200">
            ℹ️ Umpan Balik Reviewer Aktif: Aturan{' '}
            <span className="font-mono font-bold">{suppressedRules.join(', ')}</span> telah ditandai
            sebagai False Positive. Skor aturan serupa diturunkan 35% pada dataset sampel sesi ini
            (penyesuaian bobot deterministik di memori, bukan pelatihan ulang model ML).
          </div>
        )}
      </div>

      {/* Collapsible Rule Catalog */}
      {showCatalog && (
        <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/90 p-5">
          <h3 className="text-sm font-bold text-white">
            Katalog Aturan Deteksi Fraud & Kepatuhan ({adapter.name} + Lintas Negara)
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {allCatalogRules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-300">{rule.id}</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    {rule.country} · Default: {rule.defaultSeverity}
                  </span>
                </div>
                <p className="mt-1 font-bold text-white">{rule.nameId}</p>
                <p className="mt-0.5 text-slate-300">{rule.descriptionId}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  <strong>Logika:</strong> {rule.logicSummary}
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-300/90">
                  <strong>Contoh Kasus:</strong> {rule.exampleCase}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter, Sort & Bulk Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter Severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-200"
          >
            <option value="ALL">Semua Severity ({findings.length})</option>
            <option value="critical">🔴 KRITIS</option>
            <option value="high">🟠 TINGGI</option>
            <option value="medium">🟡 SEDANG</option>
            <option value="low">🔵 RENDAH</option>
          </select>

          <select
            aria-label="Filter Status Review"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-200"
          >
            <option value="ALL">Semua Status Review</option>
            <option value="Baru">Baru (Menunggu Review)</option>
            <option value="Ditinjau">Sedang Ditinjau</option>
            <option value="Dikonfirmasi">Dikonfirmasi (Masuk Koreksi)</option>
            <option value="Ditolak">Ditolak / False Positive</option>
          </select>

          <select
            aria-label="Urutkan Temuan"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'score_desc' | 'confidence_desc')}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-200"
          >
            <option value="score_desc">Urutkan: Skor Risiko Tertinggi</option>
            <option value="confidence_desc">Urutkan: Confidence Tertinggi</option>
          </select>

          {ruleFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setRuleFilter('ALL')}
              className="rounded-lg bg-indigo-500/20 px-2.5 py-1 text-indigo-300"
            >
              Reset Filter Aturan: {ruleFilter} ✕
            </button>
          )}
        </div>

        {/* Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400">Reviewer:</span>
          <input
            type="text"
            aria-label="Nama Reviewer"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-200"
          />
          {selectedIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => {
                  onBulkUpdateStatus(selectedIds, 'Dikonfirmasi');
                  setSelectedIds([]);
                }}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500"
              >
                Konfirmasi ({selectedIds.length}) Terpilih
              </button>
              <button
                type="button"
                onClick={() => {
                  onBulkUpdateStatus(selectedIds, 'Ditinjau');
                  setSelectedIds([]);
                }}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-500"
              >
                Tandai Ditinjau ({selectedIds.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {filteredFindings.map((finding) => {
          const badge = severityBadge(finding.severity);
          const isChecked = selectedIds.includes(finding.id);

          return (
            <article
              key={finding.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-slate-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Pilih temuan ${finding.title}`}
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds((prev) => [...prev, finding.id]);
                      } else {
                        setSelectedIds((prev) => prev.filter((id) => id !== finding.id));
                      }
                    }}
                    className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.cls}`}
                      >
                        <span aria-hidden="true">{badge.icon}</span> {badge.label}
                      </span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-indigo-300">
                        {finding.ruleId}
                      </span>
                      <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-300">
                        Status: <strong>{finding.status}</strong>
                      </span>
                      {finding.isFalsePositive && (
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                          Ditandai False Positive
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 text-base font-bold text-white">{finding.title}</h3>
                  </div>
                </div>

                {/* Dual-Layer Score Breakdown Box */}
                <div className="min-w-[240px] rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-right">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs text-slate-400">Skor Risiko Gabungan</span>
                    <span className="font-mono text-lg font-extrabold text-white">
                      {finding.score}
                      <span className="text-xs font-normal text-slate-400">/100</span>
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="bg-indigo-500"
                      style={{ width: `${Math.min(100, finding.ruleScoreContribution)}%` }}
                      title={`Kontribusi Rule: ${finding.ruleScoreContribution}`}
                    />
                    <div
                      className="bg-amber-400"
                      style={{ width: `${Math.min(100, finding.statScoreContribution)}%` }}
                      title={`Kontribusi Statistik: ${finding.statScoreContribution}`}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between font-mono text-[10px]">
                    <span className="text-indigo-300">
                      Rule-based: +{finding.ruleScoreContribution}
                    </span>
                    <span className="text-amber-300">
                      Statistik (Z/Benford): +{finding.statScoreContribution}
                    </span>
                    <span className="text-emerald-300">
                      Conf: {Math.round(finding.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-200">{finding.reason}</p>

              {/* Verifiable Evidence Items */}
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {finding.evidence.map((ev, idx) => (
                  <div
                    key={`${finding.id}-ev-${idx}`}
                    className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-indigo-300">{ev.field}</span>
                      <span className="font-mono">{ev.location}</span>
                    </div>
                    <p className="mt-1 font-mono font-bold text-slate-100">{ev.value}</p>
                    {ev.expectedOrStatistic && (
                      <p className="mt-0.5 font-mono text-[11px] text-amber-300">
                        {ev.expectedOrStatistic}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-xl border border-indigo-500/25 bg-indigo-950/20 px-3.5 py-2 text-xs text-indigo-200">
                <strong>Rekomendasi Tindakan:</strong> {finding.recommendation}
              </div>

              {/* Human-in-the-Loop Action Controls */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3 text-xs">
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tambahkan catatan review audit..."
                    value={noteById[finding.id] ?? finding.reviewNote ?? ''}
                    onChange={(e) =>
                      setNoteById((prev) => ({ ...prev, [finding.id]: e.target.value }))
                    }
                    className="min-w-[200px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateFindingStatus(
                        finding.id,
                        'Ditinjau',
                        reviewerName,
                        noteById[finding.id] ?? 'Sedang diverifikasi bukti pendukung.',
                      )
                    }
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    Tandai Ditinjau
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateFindingStatus(
                        finding.id,
                        'Dikonfirmasi',
                        reviewerName,
                        noteById[finding.id] ?? 'Dikonfirmasi untuk masuk koreksi fiskal positif.',
                      )
                    }
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500"
                  >
                    Konfirmasi Temuan
                  </button>
                  <button
                    type="button"
                    onClick={() => onMarkFalsePositive(finding)}
                    className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 font-semibold text-amber-300 hover:bg-amber-500/25"
                  >
                    Tandai False Positive
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

interface ReconciliationSectionProps {
  activeEntity: CorporateEntity;
  adjustments: ReconciliationLine[];
  baselineTotals: ReconciliationSummary;
  onToggleVerification: (adjustmentId: string) => void;
  onAddAdjustment: (adj: {
    description: string;
    positiveCorrection: number;
    negativeCorrection: number;
    ruleBasis: string;
  }) => void;
  onOpenDraftModal: () => void;
  onJumpToFinding: (findingId: string) => void;
}

export function FiscalReconciliationSection({
  activeEntity,
  adjustments,
  baselineTotals,
  onToggleVerification,
  onAddAdjustment,
  onOpenDraftModal,
  onJumpToFinding,
}: ReconciliationSectionProps) {
  const [whatIfScenario, setWhatIfScenario] = useState<WhatIfReconciliationOptions>({
    revenueMultiplierPct: 100,
    includeUnverifiedAdjustments: true,
    additionalPositiveAdjustment: 0,
    additionalNegativeAdjustment: 0,
    applyArticle31ERelief: false,
  });

  const [newDesc, setNewDesc] = useState<string>('');
  const [newAmount, setNewAmount] = useState<number>(25_000_000);
  const [newType, setNewType] = useState<'POSITIVE' | 'NEGATIVE'>('POSITIVE');

  const whatIfResult = simulateWhatIfReconciliation(
    adjustments,
    activeEntity.country,
    whatIfScenario,
  );
  const adapter = getCountryAdapter(activeEntity.country);
  const draftReturn = createReturnDraft(activeEntity, {
    commercialProfit: whatIfResult.commercialProfit,
    positiveCorrections: whatIfResult.positiveCorrections,
    negativeCorrections: whatIfResult.negativeCorrections,
    taxableIncome: whatIfResult.taxableIncome,
    taxDue: whatIfResult.taxDue,
  });

  const handleDownloadJson = () => {
    downloadTextFile(
      `Nexora-Draft-${activeEntity.country}-${activeEntity.id}.json`,
      JSON.stringify(draftReturn, null, 2),
      'application/json',
    );
  };

  const handleDownloadXml = () => {
    const xml = returnDraftToXml(draftReturn);
    downloadTextFile(
      `Nexora-Draft-${activeEntity.country}-${activeEntity.id}.xml`,
      xml,
      'application/xml',
    );
  };

  return (
    <section aria-labelledby="reconciliation-heading" className="space-y-6">
      {/* Header & Export Toolbar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
              Tahap 5 · Rekonsiliasi Fiskal, Simulator What-If & Generator Draf SPT
            </span>
            <h2 id="reconciliation-heading" className="mt-1 text-xl font-bold text-white">
              Kertas Kerja Rekonsiliasi Fiskal — {activeEntity.name} ({adapter.returnFormTemplate.formName})
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Menjembatani Laba Komersial Sebelum Pajak ke Penghasilan Kena Pajak dengan tautan
              langsung ke temuan risiko dan dasar aturan (perlu verifikasi).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadJson}
              className="rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25"
            >
              Unduh Draf JSON
            </button>
            <button
              type="button"
              onClick={handleDownloadXml}
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
            >
              Unduh Draf XML (Tervalidasi)
            </button>
            <button
              type="button"
              onClick={onOpenDraftModal}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Pratinjau & Cetak PDF Draf SPT
            </button>
          </div>
        </div>

        {/* Mandatory Draft Watermark Notice */}
        <div className="mt-4 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/10 px-4 py-2 text-center text-xs font-bold tracking-wider text-amber-300">
          {draftReturn.watermark} — Skema internal Nexora; bukan pengganti e-Filing / Coretax resmi.
        </div>
      </div>

      {/* Summary Bridge KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">1. Laba Komersial</p>
          <p className="mt-1 font-mono text-base font-bold text-white">
            {formatCurrency(baselineTotals.commercialProfit, activeEntity.country)}
          </p>
          <p className="text-[11px] text-slate-400">Laporan Laba Rugi Audited</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">2. Koreksi Fiskal Positif (+)</p>
          <p className="mt-1 font-mono text-base font-bold text-amber-300">
            +{formatCurrency(baselineTotals.positiveCorrections, activeEntity.country)}
          </p>
          <p className="text-[11px] text-slate-400">Menambah PKP (Pasal 9 UU PPh)</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">3. Koreksi Fiskal Negatif (-)</p>
          <p className="mt-1 font-mono text-base font-bold text-sky-300">
            -{formatCurrency(baselineTotals.negativeCorrections, activeEntity.country)}
          </p>
          <p className="text-[11px] text-slate-400">Mengurangi PKP (PPh Final/Bukan Objek)</p>
        </div>
        <div className="rounded-2xl border border-indigo-500/40 bg-indigo-950/30 p-4">
          <p className="text-xs text-indigo-300">4. Penghasilan Kena Pajak (PKP)</p>
          <p className="mt-1 font-mono text-base font-bold text-white">
            {formatCurrency(baselineTotals.taxableIncome, activeEntity.country)}
          </p>
          <p className="text-[11px] text-indigo-300">Dasar Pengenaan PPh Badan</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/25 p-4">
          <p className="text-xs text-emerald-300">5. PPh Badan Terutang</p>
          <p className="mt-1 font-mono text-base font-bold text-emerald-300">
            {formatCurrency(baselineTotals.taxDue, activeEntity.country)}
          </p>
          <p className="text-[11px] text-slate-300">
            Tarif {(adapter.corporateTaxRate * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Reconciliation Working Paper Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <h3 className="text-sm font-bold text-white">
          Tabel Baris Rekonsiliasi Fiskal & Status Verifikasi Reviewer
        </h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Akun & Uraian Rekonsiliasi</th>
                <th className="px-3 py-2.5">Komersial</th>
                <th className="px-3 py-2.5">Koreksi Positif (+)</th>
                <th className="px-3 py-2.5">Koreksi Negatif (-)</th>
                <th className="px-3 py-2.5">Dasar Aturan (Perlu Verifikasi)</th>
                <th className="px-3 py-2.5">Tautan Risiko</th>
                <th className="px-3 py-2.5">Status Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60">
              {adjustments.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2.5 font-medium text-white">
                    {item.accountCode && (
                      <span className="mr-1.5 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-indigo-300">
                        {item.accountCode}
                      </span>
                    )}
                    {item.description}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-200">
                    {item.commercialAmount > 0
                      ? formatCurrency(item.commercialAmount, activeEntity.country)
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-amber-300">
                    {item.positiveCorrection > 0
                      ? `+${formatCurrency(item.positiveCorrection, activeEntity.country)}`
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-sky-300">
                    {item.negativeCorrection > 0
                      ? `-${formatCurrency(item.negativeCorrection, activeEntity.country)}`
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-300">
                    {item.ruleBasis ?? 'Perlu verifikasi ahli pajak'}
                  </td>
                  <td className="px-3 py-2.5">
                    {item.linkedFindingId ? (
                      <button
                        type="button"
                        onClick={() => onJumpToFinding(item.linkedFindingId!)}
                        className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-300 hover:bg-rose-500/30"
                      >
                        🔗 {item.linkedFindingId}
                      </button>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onToggleVerification(item.id)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        item.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                      }`}
                    >
                      {item.verificationStatus === 'VERIFIED'
                        ? '✓ Terverifikasi'
                        : '⚠️ Perlu Verifikasi'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Manual Fiscal Adjustment Row */}
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-800 pt-4 text-xs">
          <div className="min-w-[220px] flex-1">
            <label className="block text-[11px] text-slate-400">
              Tambah Penyesuaian Fiskal Manual
            </label>
            <input
              type="text"
              placeholder="Contoh: Cadangan Piutang Tak Tertagih Non-Bank..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400">Jenis Koreksi</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as 'POSITIVE' | 'NEGATIVE')}
              className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
            >
              <option value="POSITIVE">Koreksi Positif (+)</option>
              <option value="NEGATIVE">Koreksi Negatif (-)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400">Nilai Koreksi</label>
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(Number(e.target.value))}
              className="mt-1 w-36 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-white"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!newDesc.trim()) return;
              onAddAdjustment({
                description: newDesc.trim(),
                positiveCorrection: newType === 'POSITIVE' ? newAmount : 0,
                negativeCorrection: newType === 'NEGATIVE' ? newAmount : 0,
                ruleBasis:
                  'Pasal 9 ayat (1) UU PPh — Penyesuaian Manual Reviewer (perlu verifikasi)',
              });
              setNewDesc('');
            }}
            className="rounded-lg bg-indigo-600 px-3.5 py-1.5 font-semibold text-white hover:bg-indigo-500"
          >
            + Tambah Baris Koreksi
          </button>
        </div>
      </div>

      {/* What-If Fiscal Simulation & Payment Settlement Reference */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-7">
          <h3 className="text-sm font-bold text-white">
            Simulator Mode What-If (Sensitivitas Laba Komersial & Koreksi Fiskal)
          </h3>
          <p className="text-xs text-slate-400">
            Ubah asumsi di bawah untuk melihat dampak langsung terhadap Penghasilan Kena Pajak dan
            PPh Badan Terutang.
          </p>

          <div className="mt-4 space-y-4 text-xs">
            <div>
              <div className="flex justify-between">
                <label htmlFor="profit-multiplier" className="font-medium text-slate-200">
                  Skala Laba Komersial Sebelum Pajak: {whatIfScenario.revenueMultiplierPct ?? 100}%
                </label>
                <span className="font-mono text-indigo-300">
                  {formatCurrency(whatIfResult.commercialProfit, activeEntity.country)}
                </span>
              </div>
              <input
                id="profit-multiplier"
                type="range"
                min={70}
                max={150}
                step={5}
                value={whatIfScenario.revenueMultiplierPct ?? 100}
                onChange={(e) =>
                  setWhatIfScenario((prev: WhatIfReconciliationOptions) => ({
                    ...prev,
                    revenueMultiplierPct: Number(e.target.value),
                  }))
                }
                className="mt-1.5 w-full accent-indigo-500"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-slate-200">
                <input
                  type="checkbox"
                  checked={Boolean(whatIfScenario.includeUnverifiedAdjustments)}
                  onChange={(e) =>
                    setWhatIfScenario((prev: WhatIfReconciliationOptions) => ({
                      ...prev,
                      includeUnverifiedAdjustments: e.target.checked,
                    }))
                  }
                />
                Sertakan baris berstatus &ldquo;Perlu Verifikasi&rdquo;
              </label>

              {activeEntity.country === 'ID' && (
                <label className="flex items-center gap-2 text-slate-200">
                  <input
                    type="checkbox"
                    checked={Boolean(whatIfScenario.applyArticle31ERelief)}
                    onChange={(e) =>
                      setWhatIfScenario((prev: WhatIfReconciliationOptions) => ({
                        ...prev,
                        applyArticle31ERelief: e.target.checked,
                      }))
                    }
                  />
                  Simulasikan Fasilitas Pengurangan Tarif Pasal 31E UU PPh (perlu verifikasi)
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
              <div>
                <span className="text-slate-400">PPh Terutang (Baseline):</span>
                <p className="mt-0.5 font-mono text-sm font-bold text-slate-200">
                  {formatCurrency(baselineTotals.taxDue, activeEntity.country)}
                </p>
              </div>
              <div>
                <span className="text-slate-400">PPh Terutang (Skenario What-If):</span>
                <p className="mt-0.5 font-mono text-sm font-bold text-emerald-300">
                  {formatCurrency(whatIfResult.taxDue, activeEntity.country)}{' '}
                  <span className="text-xs text-amber-300">
                    ({whatIfResult.taxDue - baselineTotals.taxDue >= 0 ? '+' : ''}
                    {formatCurrency(
                      whatIfResult.taxDue - baselineTotals.taxDue,
                      activeEntity.country,
                    )}
                    )
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Payment & Settlement Reference */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-5">
          <h3 className="text-sm font-bold text-white">
            Tax Payment & Settlement Reference ({adapter.authority})
          </h3>
          <p className="text-xs text-slate-400">
            Referensi kode pembayaran untuk penyetoran pajak terutang (tidak melakukan pendebitan
            atau pengiriman otomatis).
          </p>
          <div className="mt-3 space-y-2.5">
            {adapter.paymentCodes.map((pc) => (
              <div
                key={pc.code}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-300">{pc.code}</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    {pc.channel}
                  </span>
                </div>
                <p className="mt-1 font-semibold text-white">{pc.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{pc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
