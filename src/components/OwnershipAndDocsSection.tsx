'use client';

import React, { useState } from 'react';
import type {
  CorporateEntity,
  CountryCode,
  DocumentType,
  ExtractedField,
  Ownership,
  Shareholder,
  TaxDocument,
} from '@/lib/domain';
import { maskSensitiveId } from '@/lib/domain';
import { calculateEffectiveOwnership, type OwnershipIssue } from '@/lib/ownership';
import type { CrossValidationIssue } from '@/lib/crossValidation';
import { getCountryAdapter } from '@/lib/adapters/countryAdapter';
import { formatCurrency } from '@/data/multiCountryTaxData';

interface OwnershipSectionProps {
  entities: CorporateEntity[];
  ownerships: Ownership[];
  shareholders: Shareholder[];
  issues: OwnershipIssue[];
  maskIds: boolean;
  onFixIncompleteOwnership: () => void;
  onToggleCircularSimulation: () => void;
  hasCircularSimulated: boolean;
  onJumpToRisks: (ruleFilter?: string) => void;
}

export function OwnershipStructureSection({
  entities,
  ownerships,
  shareholders,
  issues,
  maskIds,
  onFixIncompleteOwnership,
  onToggleCircularSimulation,
  hasCircularSimulated,
  onJumpToRisks,
}: OwnershipSectionProps) {
  const effectiveMap = calculateEffectiveOwnership('ENT-ID-001', entities, ownerships);

  return (
    <section aria-labelledby="ownership-heading" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div>
          <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
            Tahap 2 · Struktur Kepemilikan & Pemilik Manfaat (UBO)
          </span>
          <h2 id="ownership-heading" className="mt-1 text-xl font-bold text-white">
            Grafik Hierarki Grup Multi-Negara & Deteksi Anomali Kepemilikan
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Mendeteksi kepemilikan melingkar (circular), total saham != 100%, pemilik manfaat (UBO)
            belum teridentifikasi, entitas yatim, dan perusahaan perantara di yurisdiksi berisiko.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onFixIncompleteOwnership}
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
          >
            Perbaiki Saham ENT-SG-002 ke 100%
          </button>
          <button
            type="button"
            onClick={onToggleCircularSimulation}
            className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/25"
          >
            {hasCircularSimulated
              ? 'Hapus Simulasi Kepemilikan Melingkar'
              : 'Uji Deteksi Kepemilikan Melingkar'}
          </button>
        </div>
      </div>

      {/* Hierarchy Graph Visual */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-7">
          <h3 className="text-sm font-bold text-slate-100">
            Visualisasi Rantai Kepemilikan & Persentase Efektif
          </h3>
          <p className="text-xs text-slate-400">
            Induk Grup: PT Nusantara Kreasi Digital Tbk (ID) → Entitas Anak & Pemegang Saham
          </p>

          <div className="mt-4 space-y-4">
            {/* Root Holding Node */}
            <div className="rounded-xl border border-indigo-500/50 bg-indigo-950/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                    HOLDING UTAMA · ID (Cakupan Penuh)
                  </span>
                  <h4 className="mt-1 text-base font-bold text-white">
                    PT Nusantara Kreasi Digital Tbk (ENT-ID-001)
                  </h4>
                  <p className="text-xs text-slate-300">
                    NPWP: {maskIds ? maskSensitiveId('0013948214012000') : '0013948214012000'} ·
                    Kepemilikan Induk: 100%
                  </p>
                </div>
                <span className="rounded-lg bg-emerald-500/20 px-3 py-1 font-mono text-xs font-bold text-emerald-300">
                  Efektif: 100%
                </span>
              </div>
            </div>

            {/* Child Entities */}
            <div className="ml-4 space-y-3 border-l-2 border-indigo-500/40 pl-4">
              {entities.map((entity) => {
                const inboundLinks = ownerships.filter((o) => o.ownedId === entity.id);
                const totalDirectPct = inboundLinks.reduce((s, o) => s + o.percentage, 0);
                const effectivePct = effectiveMap[entity.id] ?? (entity.id === 'ENT-ID-001' ? 100 : totalDirectPct);
                const entityShareholders = shareholders.filter((s) => s.entityId === entity.id);
                const adapter = getCountryAdapter(entity.country);

                return (
                  <div
                    key={entity.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              adapter.status === 'full'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {entity.country} ·{' '}
                            {adapter.status === 'full' ? 'Cakupan Penuh' : 'Preview'}
                          </span>
                          <span className="font-mono text-xs text-slate-400">{entity.id}</span>
                        </div>
                        <h4 className="mt-1 text-sm font-bold text-white">{entity.name}</h4>
                        <p className="text-xs text-slate-400">
                          Tax ID: {maskIds ? maskSensitiveId(entity.taxId) : entity.taxId}
                        </p>
                      </div>
                      <div className="text-right">
                        {inboundLinks.length > 0 && (
                          <span
                            className={`inline-block rounded-lg px-2.5 py-1 font-mono text-xs font-bold ${
                              Math.abs(totalDirectPct - 100) < 0.01
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            Total Saham Antar-Entitas: {totalDirectPct}%
                          </span>
                        )}
                        <p className="mt-1 font-mono text-[11px] text-indigo-300">
                          Kepemilikan Efektif Grup: {effectivePct.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {entityShareholders.length > 0 && (
                      <div className="mt-3 border-t border-slate-800/80 pt-3">
                        <p className="text-[11px] font-semibold text-slate-300">
                          Daftar Pemegang Saham & Pemilik Manfaat (UBO):
                        </p>
                        <div className="mt-2 space-y-1.5">
                          {entityShareholders.map((sh) => (
                            <div
                              key={sh.id}
                              className="flex flex-wrap items-center justify-between rounded-lg bg-slate-900/90 px-3 py-1.5 text-xs"
                            >
                              <div>
                                <span className="font-medium text-slate-200">{sh.name}</span>{' '}
                                <span className="text-[11px] text-slate-400">
                                  ({sh.type} · {sh.jurisdiction})
                                </span>
                                {sh.highRiskJurisdiction && (
                                  <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                                    Yurisdiksi Berisiko Tinggi
                                  </span>
                                )}
                                {!sh.beneficialOwnerConfirmed && (
                                  <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                    UBO Belum Teridentifikasi
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-bold text-indigo-300">
                                {sh.percentage}% (Efektif {sh.effectivePercentage}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detected Ownership Anomalies */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">
              Hasil Validasi Struktur Kepemilikan ({issues.length} Temuan)
            </h3>
            <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-300">
              Tertaut ke Risk Engine
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Setiap anomali struktur kepemilikan otomatis menghasilkan temuan risiko dengan skor dan
            rekomendasi tindakan.
          </p>

          <div className="mt-4 space-y-3">
            {issues.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-300">
                ✓ Seluruh struktur kepemilikan grup mencapai 100%, bebas kepemilikan melingkar, dan
                UBO teridentifikasi.
              </div>
            ) : (
              issues.map((issue, idx) => (
                <div
                  key={`${issue.type}-${idx}`}
                  className="rounded-xl border border-rose-500/30 bg-slate-950/80 p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-300 uppercase">
                      {issue.severity ?? 'high'} · {issue.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => onJumpToRisks('OWNERSHIP')}
                      className="text-[11px] font-semibold text-indigo-400 underline hover:text-indigo-300"
                    >
                      Lihat Temuan Risiko →
                    </button>
                  </div>
                  <p className="mt-2 font-medium text-slate-200">{issue.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

interface DocumentIntelligenceProps {
  activeCountry: CountryCode;
  activeEntity: CorporateEntity;
  documents: TaxDocument[];
  selectedDocId: string;
  onSelectDoc: (docId: string) => void;
  onUpdateExtractedField: (docId: string, fieldKey: string, newValue: string) => void;
  onSimulateUpload: (preset: {
    fileName: string;
    documentType: DocumentType;
    customVendor?: string;
    customDpp?: number;
    customTax?: number;
  }) => Promise<void>;
  isScanning: boolean;
  scanError: string | null;
  crossDiscrepancies: CrossValidationIssue[];
  maskIds: boolean;
}

export function DocumentIntelligenceSection({
  activeCountry,
  activeEntity,
  documents,
  selectedDocId,
  onSelectDoc,
  onUpdateExtractedField,
  onSimulateUpload,
  isScanning,
  scanError,
  crossDiscrepancies,
  maskIds,
}: DocumentIntelligenceProps) {
  const entityDocs = documents.filter((d) => d.entityId === activeEntity.id);
  const currentDoc =
    entityDocs.find((d) => d.id === selectedDocId) ?? entityDocs[0] ?? documents[0];

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [highlightedLocation, setHighlightedLocation] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState<string>('eFaktur-010.008-26.90128374.pdf');
  const [customDocType, setCustomDocType] = useState<DocumentType>('e_invoice');

  const adapter = getCountryAdapter(activeCountry);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setUploadError(
        `Tipe file "${file.type || file.name}" tidak didukung. Gunakan PDF, JPG, atau PNG.`,
      );
      return;
    }
    if (file.size === 0) {
      setUploadError('File rusak atau kosong (0 byte). Unggah dokumen yang valid.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Ukuran file melebihi batas maksimal 10 MB.');
      return;
    }

    await onSimulateUpload({
      fileName: file.name,
      documentType: customDocType,
    });
  };

  const fields: ExtractedField[] =
    currentDoc?.extractedFieldsList && currentDoc.extractedFieldsList.length > 0
      ? currentDoc.extractedFieldsList
      : currentDoc
        ? [
            {
              key: 'number',
              label: 'Nomor Dokumen / Seri Faktur',
              value: currentDoc.number.value,
              confidence: currentDoc.number.confidence ?? 0.96,
              location: currentDoc.number.location ?? 'Hal. 1, Header Nomor',
              source: currentDoc.number.source,
              manuallyCorrected: Boolean(currentDoc.number.manuallyCorrected),
              validationStatus: 'valid',
            },
            {
              key: 'counterparty',
              label: 'Nama Lawan Transaksi / Entitas',
              value: currentDoc.counterparty.value,
              confidence: currentDoc.counterparty.confidence ?? 0.94,
              location: currentDoc.counterparty.location ?? 'Hal. 1, Blok PKP Penjual',
              source: currentDoc.counterparty.source,
              manuallyCorrected: Boolean(currentDoc.counterparty.manuallyCorrected),
              validationStatus: 'valid',
            },
            {
              key: 'counterpartyTaxId',
              label: 'NPWP / Tax ID Lawan Transaksi',
              value: currentDoc.counterpartyTaxId.value,
              confidence: currentDoc.counterpartyTaxId.confidence ?? 0.72,
              location: currentDoc.counterpartyTaxId.location ?? 'Hal. 1, Blok Identitas Pajak',
              source: currentDoc.counterpartyTaxId.source,
              manuallyCorrected: Boolean(currentDoc.counterpartyTaxId.manuallyCorrected),
              validationStatus: currentDoc.taxIdValidated ? 'valid' : 'error',
              validationNote: currentDoc.taxIdValidated
                ? 'Tervalidasi format yurisdiksi'
                : 'Confidence rendah / tidak aktif di master vendor',
            },
            {
              key: 'taxableBase',
              label: 'Dasar Pengenaan Pajak (DPP)',
              value: String(currentDoc.taxableBase.value),
              confidence: currentDoc.taxableBase.confidence ?? 0.95,
              location: currentDoc.taxableBase.location ?? 'Hal. 1, Baris Subtotal DPP',
              source: currentDoc.taxableBase.source,
              manuallyCorrected: Boolean(currentDoc.taxableBase.manuallyCorrected),
              validationStatus: 'valid',
            },
            {
              key: 'taxAmount',
              label: 'Jumlah Pajak (PPN / GST / WHT)',
              value: String(currentDoc.taxAmount.value),
              confidence: currentDoc.taxAmount.confidence ?? 0.91,
              location: currentDoc.taxAmount.location ?? 'Hal. 1, Baris PPN',
              source: currentDoc.taxAmount.source,
              manuallyCorrected: Boolean(currentDoc.taxAmount.manuallyCorrected),
              validationStatus: 'valid',
            },
          ]
        : [];

  return (
    <section aria-labelledby="doc-intel-heading" className="space-y-6">
      {/* Upload & Preset Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
              Tahap 3 · Document Intelligence & Validasi Silang Antar-Dokumen
            </span>
            <h2 id="doc-intel-heading" className="mt-1 text-xl font-bold text-white">
              Ekstraksi Terstruktur Berdampingan (Side-by-Side) & Koreksi Human-in-the-Loop
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Mendukung: {adapter.documentTypes.map((d) => d.labelId).join(' · ')}. Field dengan
              confidence &lt; 85% disorot otomatis untuk direview manusia.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isScanning}
              onClick={() =>
                onSimulateUpload({
                  fileName: 'eFaktur-TBTS-CV-MegaSuplai-Fiktif.pdf',
                  documentType: 'e_invoice',
                  customVendor: 'CV Mega Suplai Abadi',
                  customDpp: 420_000_000,
                  customTax: 50_400_000,
                })
              }
              className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 disabled:opacity-50"
            >
              + Uji Scan e-Faktur Indikasi TBTS
            </button>
            <button
              type="button"
              disabled={isScanning}
              onClick={() =>
                onSimulateUpload({
                  fileName: 'eFaktur-Jamuan-GrandDining-NonDeductible.pdf',
                  documentType: 'e_invoice',
                  customVendor: 'PT Kuliner Nusantara Prima',
                  customDpp: 85_000_000,
                  customTax: 9_350_000,
                })
              }
              className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 disabled:opacity-50"
            >
              + Uji Scan Biaya Jamuan (Non-Deductible)
            </button>
          </div>
        </div>

        {/* Custom Upload Validator Form */}
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-800/80 pt-4">
          <div className="min-w-[200px] flex-1">
            <label
              htmlFor="doc-type-select"
              className="block text-[11px] font-medium text-slate-300"
            >
              Tipe Dokumen ({activeCountry})
            </label>
            <select
              id="doc-type-select"
              value={customDocType}
              onChange={(e) => setCustomDocType(e.target.value as DocumentType)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100"
            >
              {adapter.documentTypes.map((dt) => (
                <option key={dt.type} value={dt.type}>
                  {dt.labelId} ({dt.authoritySystem})
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[220px] flex-1">
            <label
              htmlFor="custom-filename-input"
              className="block text-[11px] font-medium text-slate-300"
            >
              Nama File Dokumen Simulasi
            </label>
            <input
              id="custom-filename-input"
              type="text"
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100"
            />
          </div>
          <div>
            <button
              type="button"
              disabled={isScanning}
              onClick={() =>
                onSimulateUpload({
                  fileName: customFileName,
                  documentType: customDocType,
                })
              }
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isScanning ? 'Memindai...' : 'Ekstrak Dokumen'}
            </button>
          </div>
          <div>
            <label className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
              Unggah File Lokal (PDF/PNG/JPG ≤10MB)
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {(uploadError || scanError) && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-2.5 text-xs text-rose-300"
          >
            ⚠️ Validasi Upload: {uploadError || scanError}
          </div>
        )}
      </div>

      {/* Document Selector Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {entityDocs.map((doc) => {
          const isSelected = currentDoc?.id === doc.id;
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => onSelectDoc(doc.id)}
              className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-600/20 text-white'
                  : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-indigo-300 uppercase">{doc.type}</span>
                {doc.extractionStatus === 'NEEDS_REVIEW' && (
                  <span className="h-2 w-2 rounded-full bg-amber-400" title="Perlu Review" />
                )}
              </div>
              <p className="mt-0.5 font-semibold">{doc.title ?? doc.attachmentName}</p>
            </button>
          );
        })}
      </div>

      {/* Side-by-Side Document Viewer (Left) & Extracted Fields (Right) */}
      {currentDoc && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Original Document Visual Preview */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-semibold text-indigo-400 uppercase">
                  Dokumen Asli (Pratinjau Sumber)
                </span>
                <h3 className="text-sm font-bold text-white">
                  {currentDoc.title ?? currentDoc.attachmentName}
                </h3>
              </div>
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                v{currentDoc.version ?? 1} · {Math.round(currentDoc.attachmentSize / 1024)} KB
              </span>
            </div>

            {/* Simulated Physical Tax Document Sheet */}
            <div className="mt-4 space-y-3 rounded-xl border border-slate-700/80 bg-slate-950 p-4 font-mono text-xs text-slate-200 shadow-inner">
              <div className="border-b border-slate-800 pb-2 text-center">
                <p className="font-bold text-indigo-300 uppercase">
                  {adapter.authority} — LEMBAR DOKUMEN SUMBER ({currentDoc.type.toUpperCase()})
                </p>
                <p className="text-[11px] text-slate-400">File: {currentDoc.attachmentName}</p>
              </div>

              <div
                className={`rounded-lg border p-2.5 transition ${
                  highlightedLocation?.includes('Header')
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-900/70'
                }`}
              >
                <p className="text-[10px] text-slate-400">[Hal. 1, Header Nomor & Tanggal]</p>
                <p>Nomor Dokumen : {currentDoc.number.value}</p>
                <p>Tanggal       : {currentDoc.date.value}</p>
              </div>

              <div
                className={`rounded-lg border p-2.5 transition ${
                  highlightedLocation?.includes('PKP') || highlightedLocation?.includes('Identitas')
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-900/70'
                }`}
              >
                <p className="text-[10px] text-slate-400">[Hal. 1, Blok Identitas Lawan Transaksi]</p>
                <p>Nama Lawan    : {currentDoc.counterparty.value}</p>
                <p>
                  NPWP / Tax ID :{' '}
                  {maskIds
                    ? maskSensitiveId(currentDoc.counterpartyTaxId.value)
                    : currentDoc.counterpartyTaxId.value}
                </p>
                <p>
                  Status Validasi: {currentDoc.taxIdValidated ? 'TERDAFTAR' : 'TIDAK TERKONFIRMASI'}
                </p>
              </div>

              <div
                className={`rounded-lg border p-2.5 transition ${
                  highlightedLocation?.includes('Baris') || highlightedLocation?.includes('Subtotal')
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-900/70'
                }`}
              >
                <p className="text-[10px] text-slate-400">[Hal. 1, Tabel Nilai Fiskal & Pajak]</p>
                <p>
                  DPP / Subtotal: {formatCurrency(currentDoc.taxableBase.value, currentDoc.country)}
                </p>
                <p>
                  Pajak (PPN)   : {formatCurrency(currentDoc.taxAmount.value, currentDoc.country)}
                </p>
                <p className="font-bold text-white">
                  Total Tagihan : {formatCurrency(currentDoc.totalAmount.value, currentDoc.country)}
                </p>
              </div>

              {currentDoc.rawTextPreview && (
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5 text-[11px] text-slate-300">
                  <p className="text-[10px] text-slate-400">[Cuplikan Teks OCR / XML]</p>
                  <p className="mt-1">{currentDoc.rawTextPreview}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Extracted Fields with Confidence Highlight & Inline Manual Correction */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-semibold text-emerald-400 uppercase">
                  Hasil Ekstraksi Terstruktur (Klik Koreksi Manual untuk Menyimpan)
                </span>
                <h3 className="text-sm font-bold text-white">
                  Daftar Field Terekstrak ({fields.length} Field)
                </h3>
              </div>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                Confidence &lt; 85% wajib direview
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {fields.map((field) => {
                const confPct = Math.round(field.confidence * 100);
                const isLowConfidence = confPct < 85 && !field.manuallyCorrected;
                const isEditing = editingKey === field.key;

                return (
                  <div
                    key={field.key}
                    onMouseEnter={() => setHighlightedLocation(field.location)}
                    onMouseLeave={() => setHighlightedLocation(null)}
                    className={`rounded-xl border p-3.5 transition ${
                      isLowConfidence
                        ? 'border-amber-500/60 bg-amber-950/25'
                        : field.manuallyCorrected
                          ? 'border-emerald-500/50 bg-emerald-950/20'
                          : 'border-slate-800 bg-slate-950/70'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{field.label}</span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                          {field.location}
                        </span>
                        {field.manuallyCorrected ? (
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            ✓ Dikoreksi Manual (Audit Logged)
                          </span>
                        ) : isLowConfidence ? (
                          <span className="rounded bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            ⚠️ Confidence Rendah ({confPct}%)
                          </span>
                        ) : (
                          <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                            Confidence {confPct}%
                          </span>
                        )}
                      </div>

                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingKey(field.key);
                            setEditValue(field.value);
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
                        >
                          Koreksi Manual
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          aria-label={`Edit ${field.label}`}
                          className="flex-1 rounded-lg border border-indigo-500 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateExtractedField(currentDoc.id, field.key, editValue);
                            setEditingKey(null);
                          }}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          Simpan & Catat Audit
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingKey(null)}
                          className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1.5 font-mono text-sm font-bold text-slate-100">
                        {field.key.toLowerCase().includes('taxid') && maskIds
                          ? maskSensitiveId(field.value)
                          : field.value}
                      </p>
                    )}

                    {field.validationNote && (
                      <p className="mt-1 text-[11px] text-amber-300/90">{field.validationNote}</p>
                    )}
                    {field.previousValue && (
                      <p className="mt-1 text-[11px] text-emerald-300/80">
                        Nilai sebelum koreksi:{' '}
                        <span className="line-through">{field.previousValue}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cross-Validation Discrepancy Matrix */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white">
              Validasi Silang Antar-Dokumen (Akta Pendirian vs Daftar Pemegang Saham vs Laporan
              Keuangan vs SPT Sebelumnya)
            </h3>
            <p className="text-xs text-slate-400">
              Membandingkan konsistensi porsi kepemilikan saham, NPWP/nama entitas, dan nilai
              subtotal lintas dokumen sumber.
            </p>
          </div>
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
            {crossDiscrepancies.length} Ketidaksesuaian Ditemukan
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {crossDiscrepancies.map((disc, index) => (
            <div
              key={`${disc.documentId}-${disc.field}-${index}`}
              className="rounded-xl border border-amber-500/40 bg-slate-950/80 p-4 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 uppercase">
                  {disc.severity ?? 'high'} · {disc.field}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectDoc(disc.documentId)}
                    className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] text-indigo-300 hover:bg-indigo-500/30"
                  >
                    Buka {disc.documentId}
                  </button>
                  {disc.relatedDocumentId && (
                    <button
                      type="button"
                      onClick={() => onSelectDoc(disc.relatedDocumentId!)}
                      className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] text-indigo-300 hover:bg-indigo-500/30"
                    >
                      Buka {disc.relatedDocumentId}
                    </button>
                  )}
                </div>
              </div>
              {disc.sourceLabel && (
                <p className="mt-1.5 font-semibold text-indigo-300">{disc.sourceLabel}</p>
              )}
              <p className="mt-1 text-slate-200">{disc.message}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
