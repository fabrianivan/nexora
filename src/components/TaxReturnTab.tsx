'use client';

import React, { useState } from 'react';
import { 
  Download, 
  CheckCircle2, 
  ArrowRight,
  FileCode,
  AlertTriangle
} from 'lucide-react';
import { CountryCode, formatCurrency } from '@/data/multiCountryTaxData';
import { UserRole } from '@/lib/domain';

interface TaxReturnTabProps {
  countryCode: CountryCode;
  entityName: string;
  taxId: string;
  activeRole: UserRole;
  onProceedToPayment?: () => void;
  onTriggerToast?: (msg: string) => void;
}

export function TaxReturnTab({
  countryCode,
  entityName,
  taxId,
  activeRole,
  onProceedToPayment,
  onTriggerToast
}: TaxReturnTabProps) {
  // Workflow Status: Draft -> Review -> Approved -> Ready
  const [returnStatus, setReturnStatus] = useState<'Draft' | 'Review' | 'Approved' | 'Ready'>('Review');
  const [activeFormSection, setActiveFormSection] = useState<'induk' | 'lampiran_1' | 'lampiran_2' | 'lampiran_3'>('induk');
  const [creator] = useState<{ name: string; role: string }>({
    name: 'Bambang Soeprapto, BKP',
    role: 'Konsultan Pajak'
  });
  const [approver, setApprover] = useState<{ name: string; role: string } | null>(null);

  // Return Figures (Linked to reconciliation)
  const figures = {
    revenue: 4650000000,
    cogs: 1690000000, // Post-positive correction of CV Mega Suplai 120M
    expenses: 1985000000,
    commercialNetIncome: 975000000,
    positiveCorrections: 168350000,
    negativeCorrections: 0,
    taxableIncome: 1143350000,
    citDue: 184545000, // With Pasal 31E facility
    taxCredits: 145000000,
    taxPayable: 39545000, // Pasal 29
  };

  // Maker-Checker Logic
  const canSubmitForReview = activeRole === 'Konsultan Pajak' || activeRole === 'Head of Tax';
  const canApprove = (activeRole === 'Head of Tax' || activeRole === 'CEO Grup') && activeRole !== creator.role;

  const handleSubmitForReview = () => {
    setReturnStatus('Review');
    onTriggerToast?.('Draf SPT telah diajukan ke Head of Tax untuk review persetujuan.');
  };

  const handleApprove = () => {
    setReturnStatus('Approved');
    setApprover({ name: 'Sri Mulyani Dewi, S.E., Ak., CA', role: activeRole });
    onTriggerToast?.('Draf SPT 1771 telah disetujui (Maker-Checker Verified). Status: Siap Bayar.');
  };

  // Real XML/JSON Exporter
  const handleExportXML = () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!-- ========================================================================= -->
<!-- NEXORA TAX PLATFORM: DRAF SPT TAHUNAN PPH BADAN (FORM 1771)              -->
<!-- WATERMARK: DRAF - BUKAN UNTUK DISAMPAIKAN KE OTORITAS PAJAK             -->
<!-- GENERATED: ${new Date().toISOString()}                                   -->
<!-- ========================================================================= -->
<SPT1771 xmlns="urn:pajak:spt1771:v2026" status="${returnStatus}" watermark="DRAF_TIDAK_RESMI">
  <Header>
    <TahunPajak>2026</TahunPajak>
    <BentukBadan>PT</BentukBadan>
    <NPWP>${taxId.replace(/\D/g, '')}</NPWP>
    <NamaWajibPajak>${entityName}</NamaWajibPajak>
    <StatusWorkflow>${returnStatus}</StatusWorkflow>
    <DibuatOleh>${creator.name} (${creator.role})</DibuatOleh>
    <DisetujuiOleh>${approver ? `${approver.name} (${approver.role})` : 'Belum Disetujui'}</DisetujuiOleh>
  </Header>
  <Induk>
    <PenghasilanBruto>${figures.revenue}</PenghasilanBruto>
    <HargaPokokPenjualan>${figures.cogs}</HargaPokokPenjualan>
    <BiayaUsaha>${figures.expenses}</BiayaUsaha>
    <LabaKomersial>${figures.commercialNetIncome}</LabaKomersial>
    <KoreksiFiskalPositif>${figures.positiveCorrections}</KoreksiFiskalPositif>
    <KoreksiFiskalNegatif>${figures.negativeCorrections}</KoreksiFiskalNegatif>
    <PenghasilanNetoFiskal>${figures.taxableIncome}</PenghasilanNetoFiskal>
    <PPhTerutang>${figures.citDue}</PPhTerutang>
    <KreditPajak>${figures.taxCredits}</KreditPajak>
    <PPhKurangBayarPasal29>${figures.taxPayable}</PPhKurangBayarPasal29>
  </Induk>
  <LampiranI>
    <KoreksiFiskal Positif="${figures.positiveCorrections}" Negatif="${figures.negativeCorrections}">
      <Item Akun="5100" Alasan="Koreksi Faktur TBTS CV Mega Suplai" Nilai="120000000" Dasar="Pasal 6 UU KUP"/>
      <Item Akun="6100" Alasan="Beban Natura Melebihi Batas PMK 66/2023" Nilai="18500000" Dasar="PMK 66/2023"/>
      <Item Akun="6200" Alasan="Biaya Jamuan Tanpa Daftar Nominatif" Nilai="20350000" Dasar="Pasal 9 UU PPh"/>
      <Item Akun="6300" Alasan="Sanksi Administrasi & Denda Pajak" Nilai="9500000" Dasar="Pasal 9 UU PPh"/>
    </KoreksiFiskal>
  </LampiranI>
</SPT1771>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPT1771-2026-${taxId.slice(0, 9)}-DRAFT.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onTriggerToast?.('File SPT1771-2026-DRAFT.xml berhasil diunduh dengan watermark draft.');
  };

  const handleExportJSON = () => {
    const jsonPayload = {
      watermark: "DRAF - BUKAN UNTUK DISAMPAIKAN KE OTORITAS PAJAK",
      generatedAt: new Date().toISOString(),
      country: countryCode,
      taxAuthority: countryCode === 'ID' ? 'DJP' : 'IRAS',
      formType: countryCode === 'ID' ? 'SPT 1771' : 'Form C-S',
      taxYear: 2026,
      entity: {
        legalName: entityName,
        taxId: taxId,
      },
      workflow: {
        status: returnStatus,
        preparedBy: creator,
        approvedBy: approver,
      },
      calculation: figures,
    };

    const blob = new Blob([JSON.stringify(jsonPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TaxReturn-${countryCode}-2026-DRAFT.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onTriggerToast?.('File TaxReturn-DRAFT.json berhasil diunduh.');
  };

  return (
    <div className="space-y-6">
      {/* Header and Workflow Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                MODUL PELAPORAN SPT RESMI
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                returnStatus === 'Approved' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : returnStatus === 'Review'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                Workflow Status: {returnStatus}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">
              {entityName} — Draf SPT Tahunan 1771 (Tahun Pajak 2026)
            </h1>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportXML}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Unduh Draf Format XML DJP Coretax"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Ekspor XML</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-300"
              title="Unduh Payload JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor JSON</span>
            </button>
            <button
              onClick={() => onProceedToPayment && onProceedToPayment()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Lanjut ke Kode Bayar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Maker-Checker Workflow Banner */}
        <div className="mt-5 p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="font-bold">Pembuat Draf (Maker):</span>
              <span className="font-medium text-slate-900">{creator.name} ({creator.role})</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="font-bold">Pemeriksa (Checker):</span>
              <span className="font-medium text-slate-900">
                {approver ? `${approver.name} (${approver.role})` : 'Menunggu Sign-off Head of Tax / Group CEO'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {returnStatus === 'Draft' && canSubmitForReview && (
              <button
                onClick={handleSubmitForReview}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold cursor-pointer"
              >
                Ajukan ke Checker
              </button>
            )}

            {returnStatus === 'Review' && (
              <>
                {canApprove ? (
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Setujui Draf SPT (Approve)</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-700 font-medium bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Maker-Checker: Pembuat draf tidak boleh menyetujui SPT sendiri. Ubah peran ke Head of Tax.</span>
                  </div>
                )}
              </>
            )}

            {returnStatus === 'Approved' && (
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Draf SPT Telah Disetujui & Siap Terbit Kode Bayar</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Draft SPT Form Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveFormSection('induk')}
            className={`px-4 py-2 font-bold border-b-2 cursor-pointer ${
              activeFormSection === 'induk' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            Form 1771 Induk (Penghitungan PPh)
          </button>
          <button
            onClick={() => setActiveFormSection('lampiran_1')}
            className={`px-4 py-2 font-bold border-b-2 cursor-pointer ${
              activeFormSection === 'lampiran_1' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            Lampiran I (Penyesuaian Fiskal)
          </button>
          <button
            onClick={() => setActiveFormSection('lampiran_2')}
            className={`px-4 py-2 font-bold border-b-2 cursor-pointer ${
              activeFormSection === 'lampiran_2' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            Lampiran II (Perincian HPP & Beban)
          </button>
          <button
            onClick={() => setActiveFormSection('lampiran_3')}
            className={`px-4 py-2 font-bold border-b-2 cursor-pointer ${
              activeFormSection === 'lampiran_3' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            Lampiran III (Kredit Pajak Dalam Negeri)
          </button>
        </div>

        {/* Section: Induk */}
        {activeFormSection === 'induk' && (
          <div className="p-6 space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-medium flex items-center justify-between">
              <span>⚠️ WATERMARK DRAF: Seluruh angka diisi otomatis dari modul rekonsiliasi fiskal dan bukan merupakan bukti penyampaian final ke DJP.</span>
              <span className="font-mono font-bold">KODE FORM: 1771-ID-2026</span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 p-2.5 font-bold text-slate-700 text-[11px] uppercase border-b border-slate-200">
                BAGIAN A: PENGHASILAN KENA PAJAK
              </div>
              <div className="divide-y divide-slate-200 font-mono">
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-600">1. Penghasilan Neto Komersial Dalam Negeri</span>
                  <span className="font-bold text-slate-900">{formatCurrency(figures.commercialNetIncome, countryCode)}</span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-600">2. Penyesuaian Fiskal Positif (+)</span>
                  <span className="font-bold text-rose-600">+{formatCurrency(figures.positiveCorrections, countryCode)}</span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-600">3. Penyesuaian Fiskal Negatif (-)</span>
                  <span className="font-bold text-emerald-600">-{formatCurrency(figures.negativeCorrections, countryCode)}</span>
                </div>
                <div className="p-3 flex justify-between items-center bg-blue-50/50">
                  <span className="font-bold text-blue-900">4. Penghasilan Neto Fiskal (1 + 2 - 3)</span>
                  <span className="font-black text-blue-900 text-sm">{formatCurrency(figures.taxableIncome, countryCode)}</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 p-2.5 font-bold text-slate-700 text-[11px] uppercase border-b border-slate-200">
                BAGIAN B: PPH TERUTANG & KURANG BAYAR
              </div>
              <div className="divide-y divide-slate-200 font-mono">
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-600">5. PPh Terutang (Tarif UU HPP Pasal 17 jo. Pasal 31E)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(figures.citDue, countryCode)}</span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-600">6. Kredit Pajak Dalam Negeri (PPh 22, 23, 25)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(figures.taxCredits, countryCode)}</span>
                </div>
                <div className="p-3 flex justify-between items-center bg-emerald-50">
                  <span className="font-bold text-emerald-900">7. PPh yang Kurang Dibayar (PPh Pasal 29)</span>
                  <span className="font-black text-emerald-900 text-base">{formatCurrency(figures.taxPayable, countryCode)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section: Lampiran I */}
        {activeFormSection === 'lampiran_1' && (
          <div className="p-6 space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">
              Form 1771-I: Perincian Penyesuaian Fiskal Positif & Negatif
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="p-2.5">No</th>
                    <th className="p-2.5">Pos Penyesuaian Fiskal</th>
                    <th className="p-2.5">Dasar Aturan</th>
                    <th className="p-2.5 text-right">Nilai Koreksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5">1</td>
                    <td className="p-2.5 font-sans font-medium">Beban Pokok: Faktur Pajak TBTS CV Mega Suplai</td>
                    <td className="p-2.5 font-sans text-blue-700 font-semibold">Pasal 6 ayat (1) UU KUP</td>
                    <td className="p-2.5 text-right font-bold text-rose-600">Rp 120.000.000</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">2</td>
                    <td className="p-2.5 font-sans font-medium">Beban Natura melebihi batas PMK 66/2023</td>
                    <td className="p-2.5 font-sans text-blue-700 font-semibold">PMK No. 66 Tahun 2023</td>
                    <td className="p-2.5 text-right font-bold text-rose-600">Rp 18.500.000</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">3</td>
                    <td className="p-2.5 font-sans font-medium">Biaya Entertainment tanpa Daftar Nominatif</td>
                    <td className="p-2.5 font-sans text-blue-700 font-semibold">Pasal 9 ayat (1) UU PPh</td>
                    <td className="p-2.5 text-right font-bold text-rose-600">Rp 20.350.000</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">4</td>
                    <td className="p-2.5 font-sans font-medium">Sanksi Administrasi & Bunga Keterlambatan</td>
                    <td className="p-2.5 font-sans text-blue-700 font-semibold">Pasal 9 ayat (1) huruf k</td>
                    <td className="p-2.5 text-right font-bold text-rose-600">Rp 9.500.000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section: Lampiran II */}
        {activeFormSection === 'lampiran_2' && (
          <div className="p-6 space-y-3 font-sans">
            <h3 className="font-bold text-slate-800 text-sm">
              Form 1771-II: Perincian Harga Pokok Penjualan, Biaya Usaha & Pengeluaran Operasional
            </h3>
            <p className="text-slate-500">
              Total Beban Usaha Komersial: Rp 3.675.000.000 (Gaji, Cloud Compute, Legal & Marketing).
            </p>
          </div>
        )}

        {/* Section: Lampiran III */}
        {activeFormSection === 'lampiran_3' && (
          <div className="p-6 space-y-3 font-sans">
            <h3 className="font-bold text-slate-800 text-sm">
              Form 1771-III: Kredit Pajak Dalam Negeri (Bukti Potong PPh 23 & Angsuran PPh 25)
            </h3>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700 block">Total Kredit Pajak Terverifikasi:</span>
              <span className="text-xl font-mono font-bold text-blue-800 mt-1 block">
                {formatCurrency(figures.taxCredits, countryCode)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                PPh 23 Dipotong Klien: Rp 65.000.000 | Angsuran PPh 25: Rp 80.000.000
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
