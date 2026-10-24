'use client';

import React from 'react';
import type {
  AuditLogEntry,
  CorporateEntity,
  FindingV2,
  ReconciliationLine,
} from '@/lib/domain';
import type { ReconciliationSummary } from '@/lib/reconciliation';
import type { ReturnDraft } from '@/lib/returns';
import { formatCurrency } from '@/data/multiCountryTaxData';

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function auditLogsToCsv(logs: AuditLogEntry[]): string {
  const headers = [
    'ID',
    'Timestamp',
    'Actor',
    'Action',
    'ObjectType',
    'ObjectId',
    'BeforeValue',
    'AfterValue',
    'Note',
  ];
  const escapeCsv = (val: string | null | undefined) => {
    const str = val ?? '';
    return `"${str.replace(/"/g, '""')}"`;
  };
  const rows = logs.map((entry) =>
    [
      entry.id,
      entry.timestamp,
      entry.actor,
      entry.action,
      entry.objectType,
      entry.objectId,
      entry.beforeValue ?? '',
      entry.afterValue ?? '',
      entry.note ?? '',
    ]
      .map(escapeCsv)
      .join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

interface DraftReturnModalProps {
  open: boolean;
  onClose: () => void;
  draft: ReturnDraft;
  entity: CorporateEntity;
  adjustments: ReconciliationLine[];
}

export function DraftReturnSummaryModal({
  open,
  onClose,
  draft,
  entity,
  adjustments,
}: DraftReturnModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-return-modal-title"
    >
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-amber-500/40 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        {/* Watermark Banner */}
        <div className="mb-4 rounded-xl border-2 border-dashed border-amber-400/70 bg-amber-500/10 px-4 py-3 text-center">
          <p className="text-sm font-bold tracking-widest text-amber-300 uppercase">
            {draft.watermark}
          </p>
          <p className="mt-1 text-xs text-amber-200/90">{draft.disclaimer}</p>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="inline-block rounded-full bg-indigo-500/20 px-3 py-0.5 text-xs font-semibold text-indigo-300">
              {draft.entity.country} · {draft.form}
            </span>
            <h2 id="draft-return-modal-title" className="mt-1 text-xl font-bold text-white">
              Ringkasan Draf {draft.form} — {entity.name}
            </h2>
            <p className="text-xs text-slate-400">
              Tax ID: {entity.taxId} · Akhir Tahun Buku: {entity.fiscalYearEnd} · Dibuat:{' '}
              {new Date(draft.generatedAt).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Cetak / Simpan PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* Reconciliation Summary */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
            <p className="text-xs text-slate-400">Laba Komersial Sebelum Pajak</p>
            <p className="mt-1 text-base font-bold text-slate-100">
              {formatCurrency(draft.amounts.commercialProfit, entity.country)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
            <p className="text-xs text-slate-400">Koreksi Fiskal Neto (Positif - Negatif)</p>
            <p className="mt-1 text-base font-bold text-amber-300">
              +{formatCurrency(draft.amounts.positiveCorrections, entity.country)} / -
              {formatCurrency(draft.amounts.negativeCorrections, entity.country)}
            </p>
          </div>
          <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/30 p-3.5">
            <p className="text-xs text-indigo-300">Penghasilan Kena Pajak & PPh Terutang</p>
            <p className="mt-1 text-base font-bold text-white">
              PKP: {formatCurrency(draft.amounts.taxableIncome, entity.country)}
            </p>
            <p className="text-xs font-semibold text-emerald-300">
              Pajak Terutang: {formatCurrency(draft.amounts.taxDue, entity.country)}
            </p>
          </div>
        </div>

        {/* Detailed Adjustments */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-200">
            Rincian Kertas Kerja Koreksi Fiskal ({adjustments.length} Baris)
          </h3>
          <div className="mt-2 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-3 py-2">Akun / Deskripsi</th>
                  <th className="px-3 py-2">Kategori</th>
                  <th className="px-3 py-2">Jumlah</th>
                  <th className="px-3 py-2">Dasar Aturan</th>
                  <th className="px-3 py-2">Status Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                {adjustments.map((adj) => (
                  <tr key={adj.id}>
                    <td className="px-3 py-2 font-medium text-slate-200">
                      {adj.accountCode ? `[${adj.accountCode}] ` : ''}
                      {adj.description}
                    </td>
                    <td className="px-3 py-2">{adj.category ?? 'OPEX'}</td>
                    <td className="px-3 py-2 font-mono">
                      {adj.positiveCorrection > 0
                        ? `+${formatCurrency(adj.positiveCorrection, entity.country)}`
                        : adj.negativeCorrection > 0
                          ? `-${formatCurrency(adj.negativeCorrection, entity.country)}`
                          : formatCurrency(adj.commercialAmount, entity.country)}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{adj.ruleBasis ?? 'Perlu verifikasi'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          adj.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {adj.verificationStatus === 'VERIFIED'
                          ? 'Terverifikasi'
                          : 'Perlu Verifikasi'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Codes Reference */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-200">
            Referensi Kode Pembayaran Pajak ({draft.paymentInformation})
          </h3>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(draft.paymentCodes ?? []).map((pc) => (
              <div
                key={pc.code}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-300">{pc.code}</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                    {pc.channel}
                  </span>
                </div>
                <p className="mt-1 font-medium text-slate-200">{pc.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ExecutiveReportModalProps {
  open: boolean;
  onClose: () => void;
  entity: CorporateEntity;
  findings: FindingV2[];
  reconciliationTotals: ReconciliationSummary;
  auditLogs: AuditLogEntry[];
}

export function ExecutiveSummaryReportModal({
  open,
  onClose,
  entity,
  findings,
  reconciliationTotals,
  auditLogs,
}: ExecutiveReportModalProps) {
  if (!open) return null;

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const confirmedCount = findings.filter((f) => f.status === 'Dikonfirmasi').length;
  const etrPct =
    reconciliationTotals.commercialProfit > 0
      ? ((reconciliationTotals.taxDue / reconciliationTotals.commercialProfit) * 100).toFixed(1)
      : '0.0';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exec-report-modal-title"
    >
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-indigo-500/40 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-300">
              Executive Tax & Risk Governance Report
            </span>
            <h2 id="exec-report-modal-title" className="mt-1 text-xl font-bold text-white">
              Laporan Ringkasan Eksekutif — {entity.name}
            </h2>
            <p className="text-xs text-slate-400">
              Entitas Fokus: {entity.name} ({entity.country} · {entity.taxId}) · Akhir Tahun Buku:{' '}
              {entity.fiscalYearEnd}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Cetak / Ekspor PDF Eksekutif
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              Tutup
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <p className="text-xs text-slate-400">Total Temuan Risiko</p>
            <p className="mt-1 text-lg font-bold text-white">{findings.length} Temuan</p>
            <p className="text-[11px] text-rose-400">
              {criticalCount} Kritis · {highCount} Tinggi
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <p className="text-xs text-slate-400">Terkonfirmasi Reviewer</p>
            <p className="mt-1 text-lg font-bold text-emerald-300">
              {confirmedCount} / {findings.length}
            </p>
            <p className="text-[11px] text-slate-400">Human-in-the-Loop</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <p className="text-xs text-slate-400">Koreksi Fiskal Positif</p>
            <p className="mt-1 text-base font-bold text-amber-300">
              {formatCurrency(reconciliationTotals.positiveCorrections, entity.country)}
            </p>
            <p className="text-[11px] text-slate-400">Potensi Eksposur Dasar Pajak</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <p className="text-xs text-slate-400">Estimasi PPh Badan Terutang</p>
            <p className="mt-1 text-base font-bold text-indigo-300">
              {formatCurrency(reconciliationTotals.taxDue, entity.country)}
            </p>
            <p className="text-[11px] text-slate-400">ETR Efektif: {etrPct}%</p>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-200">
            Daftar Temuan Risiko Prioritas & Bukti Audit
          </h3>
          <div className="mt-2 space-y-2">
            {findings.slice(0, 6).map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-white">
                    [{f.ruleId}] {f.title}
                  </span>
                  <span className="font-mono text-amber-300">
                    Skor {f.score}/100 (Rule: {f.ruleScoreContribution} + Stat:{' '}
                    {f.statScoreContribution}) · Status: {f.status}
                  </span>
                </div>
                <p className="mt-1 text-slate-300">{f.reason}</p>
                <p className="mt-1 text-[11px] text-indigo-300">
                  Rekomendasi: {f.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-200">
            Jejak Audit Terakhir ({auditLogs.length} Aktivitas Tercatat)
          </h3>
          <div className="mt-2 space-y-1.5 text-xs text-slate-300">
            {auditLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/50 px-3 py-2"
              >
                <span>
                  <strong className="text-white">{log.actor}</strong> · {log.action} pada{' '}
                  <span className="text-indigo-300">
                    [{log.objectType}] {log.objectId}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {new Date(log.timestamp).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">
          Catatan Kepatuhan: Laporan ini dihasilkan oleh Nexora sebagai kertas kerja internal
          komite audit/pajak. Seluruh angka rekonsiliasi dan posisi pasal wajib direview oleh
          konsultan pajak bersertifikat sebelum pelaporan resmi.
        </div>
      </div>
    </div>
  );
}
