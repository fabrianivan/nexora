'use client';

import React, { useState } from 'react';
import type {
  AuditLogEntry,
  CopilotMessage,
  CorporateEntity,
  CountryCode,
} from '@/lib/domain';
import { simulateTax } from '@/lib/tax';
import { formatCurrency } from '@/data/multiCountryTaxData';
import { auditLogsToCsv, downloadTextFile } from './ExportAndPrintHelper';

interface CopilotSectionProps {
  activeCountry: CountryCode;
  activeEntity: CorporateEntity;
  activeFindingsSummary: string;
  activeReconciliationSummary: string;
  messages: CopilotMessage[];
  onAskQuestion: (question: string) => Promise<void>;
  isAsking: boolean;
}

export function CopilotAndSimulatorSection({
  activeCountry,
  activeEntity,
  activeFindingsSummary,
  activeReconciliationSummary,
  messages,
  onAskQuestion,
  isAsking,
}: CopilotSectionProps) {
  const [questionInput, setQuestionInput] = useState<string>('');

  // Tax Treaty & BEPS 2.0 Simulator State
  const [crossBorderPayment, setCrossBorderPayment] = useState<number>(
    activeCountry === 'ID' ? 5_000_000_000 : 500_000,
  );
  const [treatyEligible, setTreatyEligible] = useState<boolean>(true);
  const [consolidatedRevenueEur, setConsolidatedRevenueEur] = useState<number>(820_000_000);
  const simTaxableIncome = activeCountry === 'ID' ? 20_000_000_000 : 2_000_000;
  const [simCoveredTaxes, setSimCoveredTaxes] = useState<number>(
    activeCountry === 'ID' ? 2_400_000_000 : 220_000,
  );

  const withoutTreatySim = simulateTax({
    country: activeCountry,
    taxableIncome: simTaxableIncome,
    taxableSales: 0,
    crossBorderPayment,
    treatyEligible: false,
    consolidatedRevenueEur,
    coveredTaxes: simCoveredTaxes,
  });

  const withTreatySim = simulateTax({
    country: activeCountry,
    taxableIncome: simTaxableIncome,
    taxableSales: 0,
    crossBorderPayment,
    treatyEligible,
    consolidatedRevenueEur,
    coveredTaxes: simCoveredTaxes,
  });

  const quickPrompts = [
    'Apa dasar aturan koreksi fiskal positif atas faktur pajak indikasi TBTS dan biaya jamuan tanpa daftar nominatif?',
    'Bagaimana ketentuan tarif PPh Pasal 26 vs P3B Indonesia-Singapura atas royalti dan syarat DGT Form / CoR?',
    'Bagaimana cara kerja Top-Up Tax 15% OECD Pillar Two GloBE jika ETR entitas anak di bawah 15%?',
    'Berapa prediksi harga saham BBCA dan kurs Bitcoin besok pagi? (Uji Penolakan Anti-Halusinasi)',
  ];

  return (
    <section aria-labelledby="copilot-heading" className="space-y-6">
      {/* Permanent Grounded RAG & Non-Advice Disclaimer Banner */}
      <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/90 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
              Tahap 6 · Grounded AI Tax Copilot (RAG) & Simulator P3B / BEPS 2.0
            </span>
            <h2 id="copilot-heading" className="mt-1 text-xl font-bold text-white">
              Asisten Regulasi Pajak Berbasis Sitasi Terverifikasi & Anti-Halusinasi
            </h2>
          </div>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
            Alat Bantu Analisis · Bukan Nasihat Pajak Resmi
          </span>
        </div>

        {/* Active Workspace Context Pill */}
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-300">
          <p className="font-semibold text-indigo-300">
            Konteks Aktif yang Dikirim ke Copilot (Sanitized Anti-Prompt-Injection):
          </p>
          <p className="mt-1">
            <strong>Entitas:</strong> {activeEntity.name} ({activeEntity.country} ·{' '}
            {activeEntity.taxId}) · <strong>Temuan Risiko:</strong> {activeFindingsSummary} ·{' '}
            <strong>Rekonsiliasi:</strong> {activeReconciliationSummary}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Grounded RAG Copilot Chat */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-7">
          <div>
            <h3 className="text-sm font-bold text-white">
              Tanya Jawab Regulasi dengan Sitasi Wajib (Grounded Retrieval)
            </h3>
            <p className="text-xs text-slate-400">
              Jika tidak ditemukan dasar regulasi yang cukup di basis pengetahuan, Copilot wajib
              menolak mengarang pasal/angka.
            </p>

            {/* Quick Prompt Chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isAsking}
                  onClick={() => onAskQuestion(prompt)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-left text-[11px] text-slate-200 hover:border-indigo-500 hover:bg-indigo-950/30 disabled:opacity-50"
                >
                  💬 {prompt}
                </button>
              ))}
            </div>

            {/* Chat Message Thread */}
            <div className="mt-4 max-h-[460px] space-y-4 overflow-y-auto pr-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <span className="font-semibold text-indigo-300">Pertanyaan: {msg.question}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                          msg.grounded
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {msg.grounded
                          ? `GROUNDED RAG · Conf ${Math.round(msg.confidence * 100)}%`
                          : 'TIDAK CUKUP DASAR (REFUSED)'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 whitespace-pre-line leading-relaxed text-slate-200">
                    {msg.answer}
                  </div>

                  {msg.citations.length > 0 && (
                    <div className="mt-3 border-t border-slate-800/80 pt-2.5">
                      <p className="text-[11px] font-semibold text-slate-400">
                        Sitasi Regulasi Terkait ({msg.citations.length}):
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {msg.citations.map((cit) => (
                          <div
                            key={cit.id}
                            className="rounded-lg border border-indigo-500/30 bg-indigo-950/30 px-2.5 py-1.5 text-[11px]"
                          >
                            <span className="font-bold text-indigo-300">
                              [{cit.jurisdiction}] {cit.regulation} — {cit.article}
                            </span>
                            {cit.needsVerification && (
                              <span className="ml-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-300">
                                Perlu Verifikasi
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!questionInput.trim() || isAsking) return;
              const q = questionInput.trim();
              setQuestionInput('');
              await onAskQuestion(q);
            }}
            className="mt-4 flex gap-2 border-t border-slate-800 pt-4"
          >
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Tanyakan dasar pasal koreksi fiskal, P3B, atau Pillar Two..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white"
            />
            <button
              type="submit"
              disabled={isAsking}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isAsking ? 'Mencari Sitasi...' : 'Tanya Copilot'}
            </button>
          </form>
        </div>

        {/* Right: Tax Treaty (P3B) & BEPS 2.0 Pillar Two Simulator */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Simulator Tax Treaty (P3B) & OECD BEPS 2.0 Pillar Two
            </h3>
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              Tarif Perlu Verifikasi
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Menampilkan asumsi eksplisit, rumus perhitungan, dan perbandingan beban pajak sebelum vs
            sesudah P3B serta pajak minimum global 15%.
          </p>

          <div className="mt-4 space-y-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-300">
                Pembayaran Lintas Negara (Royalti/Jasa/Bunga ke Entitas Afiliasi)
              </label>
              <input
                type="number"
                value={crossBorderPayment}
                onChange={(e) => setCrossBorderPayment(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-300">
                  Omzet Konsolidasi Grup (EUR)
                </label>
                <input
                  type="number"
                  value={consolidatedRevenueEur}
                  onChange={(e) => setConsolidatedRevenueEur(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300">
                  Pajak Tercakup (Covered Taxes)
                </label>
                <input
                  type="number"
                  value={simCoveredTaxes}
                  onChange={(e) => setSimCoveredTaxes(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 text-slate-200">
              <input
                type="checkbox"
                checked={treatyEligible}
                onChange={(e) => setTreatyEligible(e.target.checked)}
              />
              Memenuhi syarat P3B (DGT Form / Certificate of Residence & Beneficial Owner valid)
            </label>

            {/* Formula & Assumptions Box */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-300">
              <p className="font-bold text-indigo-300">Rumus & Asumsi Eksplisit:</p>
              <p className="mt-1">
                • WHT Tanpa P3B = Pembayaran × Tarif Domestik (20% PPh 26 ID)
              </p>
              <p>• WHT Dengan P3B = Pembayaran × Tarif Treaty Asumsi (10% — perlu verifikasi)</p>
              <p>
                • Pillar Two Top-Up = max(0, 15% - ETR) × GloBE Income (jika Omzet ≥ EUR 750 Juta)
              </p>
            </div>

            {/* Before vs After Comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3">
                <span className="text-[11px] text-rose-300">Sebelum P3B (Tarif Domestik 20%)</span>
                <p className="mt-1 font-mono text-sm font-bold text-white">
                  WHT: {formatCurrency(withoutTreatySim.withholdingTax, activeCountry)}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
                <span className="text-[11px] text-emerald-300">
                  Sesudah P3B ({treatyEligible ? 'Tarif Treaty 10%' : 'Tidak Memenuhi Syarat'})
                </span>
                <p className="mt-1 font-mono text-sm font-bold text-emerald-300">
                  WHT: {formatCurrency(withTreatySim.withholdingTax, activeCountry)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/25 p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-300">
                  Status OECD Pillar Two (Ambang EUR 750M):
                </span>
                <span className="font-mono font-bold text-white">
                  {withTreatySim.pillarTwoApplies ? 'AKTIF (≥ EUR 750M)' : 'DI BAWAH AMBANG'}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-amber-300">
                Estimasi Top-Up Tax 15%:{' '}
                {formatCurrency(Math.round(withTreatySim.pillarTwoTopUp), activeCountry)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface AuditSectionProps {
  auditLogs: AuditLogEntry[];
  onOpenExecutiveReport: () => void;
}

export function AuditTrailAndReportSection({
  auditLogs,
  onOpenExecutiveReport,
}: AuditSectionProps) {
  const [actorFilter, setActorFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [objectFilter, setObjectFilter] = useState<string>('ALL');

  const actors = Array.from(new Set(auditLogs.map((l) => l.actor)));
  const actions = Array.from(new Set(auditLogs.map((l) => l.action)));
  const objectTypes = Array.from(new Set(auditLogs.map((l) => l.objectType)));

  const filteredLogs = auditLogs
    .filter((l) => (actorFilter === 'ALL' ? true : l.actor === actorFilter))
    .filter((l) => (actionFilter === 'ALL' ? true : l.action === actionFilter))
    .filter((l) => (objectFilter === 'ALL' ? true : l.objectType === objectFilter));

  const handleExportCsv = () => {
    const csv = auditLogsToCsv(filteredLogs);
    downloadTextFile('Nexora-Audit-Trail.csv', csv, 'text/csv;charset=utf-8;');
  };

  return (
    <section aria-labelledby="audit-trail-heading" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div>
          <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
            Tahap 7 · Audit Trail & Laporan Ringkasan Eksekutif
          </span>
          <h2 id="audit-trail-heading" className="mt-1 text-xl font-bold text-white">
            Jejak Audit Kepatuhan (Immutable Session Trail) & Ekspor Komite Audit
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Mencatat setiap unggahan dokumen, koreksi manual field ekstraksi, perubahan status
            temuan risiko, penandaan false positive, dan ekspor draf SPT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
          >
            Ekspor Audit Log (CSV)
          </button>
          <button
            type="button"
            onClick={onOpenExecutiveReport}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Buka Laporan Ringkasan Eksekutif (PDF)
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs">
        <select
          aria-label="Filter Aktor Audit"
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200"
        >
          <option value="ALL">Semua Aktor ({actors.length})</option>
          {actors.map((actor) => (
            <option key={actor} value={actor}>
              {actor}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter Aksi Audit"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200"
        >
          <option value="ALL">Semua Jenis Aksi</option>
          {actions.map((act) => (
            <option key={act} value={act}>
              {act}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter Objek Audit"
          value={objectFilter}
          onChange={(e) => setObjectFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200"
        >
          <option value="ALL">Semua Tipe Objek</option>
          {objectTypes.map((obj) => (
            <option key={obj} value={obj}>
              {obj}
            </option>
          ))}
        </select>

        <span className="ml-auto text-slate-400">
          Menampilkan <strong>{filteredLogs.length}</strong> dari {auditLogs.length} entri audit
        </span>
      </div>

      {/* Audit Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400">
            <tr>
              <th className="px-4 py-3">Waktu (UTC/WIB)</th>
              <th className="px-4 py-3">Aktor</th>
              <th className="px-4 py-3">Aksi</th>
              <th className="px-4 py-3">Objek</th>
              <th className="px-4 py-3">Nilai Sebelum → Sesudah</th>
              <th className="px-4 py-3">Catatan Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                  {new Date(log.timestamp).toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-3 font-semibold text-white">{log.actor}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] text-slate-400">[{log.objectType}]</span>{' '}
                  <span className="font-mono font-medium text-slate-200">{log.objectId}</span>
                </td>
                <td className="px-4 py-3 font-mono text-[11px]">
                  {log.beforeValue ? (
                    <span className="text-rose-300 line-through">{log.beforeValue}</span>
                  ) : (
                    <span className="text-slate-500">null</span>
                  )}{' '}
                  → <span className="font-semibold text-emerald-300">{log.afterValue ?? '—'}</span>
                </td>
                <td className="px-4 py-3 text-slate-300">{log.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
