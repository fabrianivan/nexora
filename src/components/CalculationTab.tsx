'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  SlidersHorizontal, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ArrowRight, 
  FileText,
  Layers
} from 'lucide-react';
import { FiscalReconciliationItem, fiscalReconciliationData as initialFiscalData } from '@/data/indonesiaTaxData';
import { formatCurrency, CountryCode } from '@/data/multiCountryTaxData';

interface CalculationTabProps {
  countryCode: CountryCode;
  entityName: string;
  initialItems?: FiscalReconciliationItem[];
  initialApply31EFacility?: boolean;
  onDataChange?: (data: { items: FiscalReconciliationItem[]; apply31EFacility: boolean }) => void;
  onNavigateToFinding?: (findingId: string) => void;
  onProceedToReturn?: () => void;
}

export function CalculationTab({
  countryCode,
  entityName,
  initialItems,
  initialApply31EFacility = true,
  onDataChange,
  onNavigateToFinding,
  onProceedToReturn
}: CalculationTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'cit_recon' | 'vat_recon' | 'wht_calc' | 'what_if'>('cit_recon');
  
  // Fiscal Reconciliation State (Database Synced)
  const [items, setItems] = useState<FiscalReconciliationItem[]>(initialItems && initialItems.length > 0 ? initialItems : initialFiscalData);
  const [apply31EFacility, setApply31EFacility] = useState<boolean>(initialApply31EFacility);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Sync when initial props change from DB bootstrap
  React.useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems]);

  React.useEffect(() => {
    if (typeof initialApply31EFacility === 'boolean') {
      setApply31EFacility(initialApply31EFacility);
    }
  }, [initialApply31EFacility]);

  // New Adjustment Row Form
  const [newAccountCode, setNewAccountCode] = useState('6900');
  const [newAccountName, setNewAccountName] = useState('Beban Entertainment Tambahan');
  const [newCommercialAmount, setNewCommercialAmount] = useState('50000000');
  const [newPositiveCorrection, setNewPositiveCorrection] = useState('50000000');
  const [newNegativeCorrection, setNewNegativeCorrection] = useState('0');
  const [newReason, setNewReason] = useState('Tanpa Daftar Nominatif PMK 02/2010');
  const [newLegalBasis, setNewLegalBasis] = useState('Pasal 9 ayat (1) UU PPh');

  // What-If Simulator State
  const [whatIfMultiplier, setWhatIfMultiplier] = useState<number>(100);
  const [excludeNonDeductibles, setExcludeNonDeductibles] = useState<boolean>(false);

  // WHT Interactive Calculator State
  const [whtType, setWhtType] = useState<'pph23_jasa' | 'pph4_2_sewa' | 'pph21_bukan_pegawai' | 'pph26_luar_negeri'>('pph23_jasa');
  const [whtGrossAmount, setWhtGrossAmount] = useState<number>(25000000);
  const [whtHasNpwp, setWhtHasNpwp] = useState<boolean>(true);

  // Reconciliation Totals
  const { totalCommercialRevenue, commercialProfit, totalPositiveCorrection, totalNegativeCorrection, taxableIncome, citDue, taxCredits, citUnderpayment } = useMemo(() => {
    let rev = 0;
    let exp = 0;
    let pos = 0;
    let neg = 0;

    items.forEach((item) => {
      if (item.group === 'PENDAPATAN' || item.group === 'PENDAPATAN_LAIN') {
        rev += item.commercialAmount;
      } else {
        exp += item.commercialAmount;
      }
      pos += item.positiveCorrection;
      neg += item.negativeCorrection;
    });

    const netProfit = rev - exp;
    const netFiscal = netProfit + pos - neg;

    // Indonesian CIT Calculation (UU HPP 22% & Pasal 31E)
    // Pasal 31E: Gross revenue <= 50B gets 50% discount on taxable income proportional to 4.8B
    let tax = 0;
    if (countryCode === 'ID') {
      if (apply31EFacility && rev <= 50000000000) {
        // Proportion eligible for 50% reduction (max 4.8M / Gross Rev * Net Fiscal)
        const portionEligible = Math.min(netFiscal, (4800000000 / rev) * netFiscal);
        const portionStandard = Math.max(0, netFiscal - portionEligible);
        tax = (portionEligible * 0.11) + (portionStandard * 0.22);
      } else {
        tax = netFiscal * 0.22;
      }
    } else if (countryCode === 'SG') {
      tax = netFiscal * 0.17;
    } else if (countryCode === 'MY') {
      tax = netFiscal * 0.24;
    } else {
      tax = netFiscal * 0.21;
    }

    const credits = 145000000; // Simulated PPh 22/23/25 prepaid taxes
    const underpayment = Math.max(0, tax - credits);

    return {
      totalCommercialRevenue: rev,
      totalCommercialExpense: exp,
      commercialProfit: netProfit,
      totalPositiveCorrection: pos,
      totalNegativeCorrection: neg,
      taxableIncome: netFiscal,
      citDue: tax,
      taxCredits: credits,
      citUnderpayment: underpayment,
    };
  }, [items, apply31EFacility, countryCode]);

  // Handle Add Item
  const handleAddAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const comm = parseFloat(newCommercialAmount) || 0;
    const pos = parseFloat(newPositiveCorrection) || 0;
    const neg = parseFloat(newNegativeCorrection) || 0;
    const newItem: FiscalReconciliationItem = {
      id: `REC-${Date.now().toString().slice(-4)}`,
      accountCode: newAccountCode,
      accountName: newAccountName,
      group: 'BEBAN_USAHA',
      commercialAmount: comm,
      positiveCorrection: pos,
      negativeCorrection: neg,
      fiscalAmount: comm - pos + neg,
      correctionReason: newReason,
      legalBasis: newLegalBasis,
    };
    const nextItems = [...items, newItem];
    setItems(nextItems);
    setShowAddModal(false);
    onDataChange?.({ items: nextItems, apply31EFacility });
  };

  const handleDeleteItem = (id: string) => {
    const nextItems = items.filter((i) => i.id !== id);
    setItems(nextItems);
    onDataChange?.({ items: nextItems, apply31EFacility });
  };

  // WHT Calculator Math
  const calculatedWht = useMemo(() => {
    let rate = 0;
    let basis = whtGrossAmount;
    let rule = '';

    if (whtType === 'pph23_jasa') {
      rate = whtHasNpwp ? 0.02 : 0.04;
      rule = 'UU PPh Pasal 23 (Tarif 2% ber-NPWP / 4% Non-NPWP)';
    } else if (whtType === 'pph4_2_sewa') {
      rate = 0.10;
      rule = 'PP No. 34 Tahun 2017 (Tarif Final 10% Sewa Tanah/Bangunan)';
    } else if (whtType === 'pph21_bukan_pegawai') {
      // PMK 168/2023: DPP = 50% x Bruto, Tarif Pasal 17
      basis = whtGrossAmount * 0.5;
      rate = 0.05;
      rule = 'PMK 168/2023: DPP 50% x Penghasilan Bruto, Tarif PPh 21 Pasal 17';
    } else {
      rate = 0.20;
      rule = 'UU PPh Pasal 26 (Tarif 20% Non-P3B untuk WPLN)';
    }

    const taxAmount = basis * rate;
    return { basis, rate, taxAmount, rule };
  }, [whtType, whtGrossAmount, whtHasNpwp]);

  return (
    <div className="space-y-6">
      {/* Header and Sub-Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                MODUL PERHITUNGAN & REKONSILIASI FISKAL
              </span>
              <span className="text-xs text-slate-500 font-medium">
                UU HPP & PP 55/2022
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">
              {entityName} — Kalkulasi Pajak Terpadu
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onProceedToReturn && onProceedToReturn()}
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
            >
              <span>Lanjut ke Draf SPT</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 mt-6 pt-1">
          <button
            onClick={() => setActiveSubTab('cit_recon')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'cit_recon'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Rekonsiliasi Fiskal & PPh Badan</span>
          </button>
          <button
            onClick={() => setActiveSubTab('vat_recon')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'vat_recon'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Rekapitulasi PPN Masukan/Keluaran</span>
          </button>
          <button
            onClick={() => setActiveSubTab('wht_calc')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'wht_calc'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Kalkulator Pemotongan PPh 21/23/4(2)/26</span>
          </button>
          <button
            onClick={() => setActiveSubTab('what_if')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'what_if'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Simulator What-If Skenario</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: REKONSILIASI FISKAL & PPH BADAN */}
      {activeSubTab === 'cit_recon' && (
        <div className="space-y-6">
          {/* Executive KPI summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
              <span className="text-slate-500 font-semibold block">Laba Komersial Bersih</span>
              <span className="text-xl font-mono font-extrabold text-slate-900 mt-1 block">
                {formatCurrency(commercialProfit, countryCode)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Omzet: {formatCurrency(totalCommercialRevenue, countryCode)}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 shadow-sm">
              <span className="text-rose-700 font-bold block flex items-center gap-1">
                Koreksi Fiskal Positif (+)
              </span>
              <span className="text-xl font-mono font-extrabold text-rose-700 mt-1 block">
                +{formatCurrency(totalPositiveCorrection, countryCode)}
              </span>
              <span className="text-[11px] text-rose-600 mt-1 block">
                Natura, Non-Nominatif & TBTS
              </span>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-sm">
              <span className="text-emerald-700 font-bold block">
                Penghasilan Neto Fiskal (PKP)
              </span>
              <span className="text-xl font-mono font-extrabold text-emerald-800 mt-1 block">
                {formatCurrency(taxableIncome, countryCode)}
              </span>
              <span className="text-[11px] text-emerald-600 mt-1 block">
                Dasar Pengenaan PPh Badan
              </span>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 shadow-sm">
              <span className="text-blue-700 font-bold block">
                PPh Kurang Bayar (Pasal 29)
              </span>
              <span className="text-xl font-mono font-extrabold text-blue-800 mt-1 block">
                {formatCurrency(citUnderpayment, countryCode)}
              </span>
              <span className="text-[11px] text-blue-600 mt-1 block">
                Setelah Kredit Pajak {formatCurrency(taxCredits, countryCode)}
              </span>
            </div>
          </div>

          {/* Reconciliation Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Tabel Rekonsiliasi Laba Komersial ke Fiskal (SPT 1771-I)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Setiap penyesuaian memiliki dasar regulasi eksplisit dan tertaut langsung ke temuan audit Document AI.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={apply31EFacility}
                    onChange={(e) => {
                      const nextVal = e.target.checked;
                      setApply31EFacility(nextVal);
                      onDataChange?.({ items, apply31EFacility: nextVal });
                    }}
                    className="rounded text-blue-600 accent-blue-600"
                  />
                  <span>Terapkan Fasilitas Pasal 31E (Diskon 50%)</span>
                </label>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Koreksi</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Akun & Deskripsi</th>
                    <th className="p-3.5">Grup</th>
                    <th className="p-3.5 text-right">Komersial</th>
                    <th className="p-3.5 text-right text-rose-600">Koreksi (+)</th>
                    <th className="p-3.5 text-right text-emerald-600">Koreksi (-)</th>
                    <th className="p-3.5 text-right">Fiskal</th>
                    <th className="p-3.5">Dasar Hukum & Catatan</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{row.accountName}</div>
                        <div className="text-[11px] font-mono text-slate-500">Kode: {row.accountCode}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {row.group}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-700">
                        {formatCurrency(row.commercialAmount, countryCode)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-rose-600">
                        {row.positiveCorrection > 0 ? `+${formatCurrency(row.positiveCorrection, countryCode)}` : '-'}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                        {row.negativeCorrection > 0 ? `-${formatCurrency(row.negativeCorrection, countryCode)}` : '-'}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(row.fiscalAmount, countryCode)}
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <div className="text-[11px] font-medium text-slate-800">{row.correctionReason}</div>
                        <div className="text-[10px] text-blue-700 font-semibold mt-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-blue-600 inline" />
                          <span>{row.legalBasis}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        {row.positiveCorrection > 0 && (
                          <button
                            type="button"
                            onClick={() => onNavigateToFinding && onNavigateToFinding('ID_FRAUD_TBTS_01')}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer mb-1 block"
                            title="Lihat Temuan Fraud Terkait"
                          >
                            Bukti Fraud
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(row.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          title="Hapus baris koreksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={2} className="p-3.5 text-right uppercase text-[11px]">Total Laba Neto Fiskal:</td>
                    <td className="p-3.5 text-right font-mono">{formatCurrency(commercialProfit, countryCode)}</td>
                    <td className="p-3.5 text-right font-mono text-rose-600">+{formatCurrency(totalPositiveCorrection, countryCode)}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-600">-{formatCurrency(totalNegativeCorrection, countryCode)}</td>
                    <td className="p-3.5 text-right font-mono text-base font-extrabold text-blue-700">
                      {formatCurrency(taxableIncome, countryCode)}
                    </td>
                    <td colSpan={2} className="p-3.5 text-[11px] text-slate-500">
                      Tarif Efektif: {apply31EFacility ? '11.0% (Fasilitas 31E)' : '22.0% (Normal)'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REKAPITULASI PPN */}
      {activeSubTab === 'vat_recon' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Rekapitulasi Pajak Pertambahan Nilai (PPN 11%) — Masa Pajak Oktober 2026
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Validasi silang Faktur Pajak Keluaran vs Masukan terintegrasi Coretax DJP & e-Faktur Web.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-slate-500 font-semibold block">Total PPN Keluaran (Diserahkan)</span>
              <span className="text-xl font-mono font-extrabold text-slate-900 mt-1 block">
                Rp 94.050.000
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">DPP: Rp 855.000.000</span>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <span className="text-emerald-700 font-semibold block">PPN Masukan Dapat Dikreditkan</span>
              <span className="text-xl font-mono font-extrabold text-emerald-700 mt-1 block">
                Rp 61.500.000
              </span>
              <span className="text-[11px] text-emerald-600 mt-1 block">Diverifikasi sah Document AI</span>
            </div>

            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60">
              <span className="text-rose-700 font-semibold block">Faktur TBTS Diblokir (Tidak Dikreditkan)</span>
              <span className="text-xl font-mono font-extrabold text-rose-700 mt-1 block">
                Rp 13.200.000
              </span>
              <span className="text-[11px] text-rose-600 mt-1 block">CV Mega Suplai (NPWP Non-Aktif)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-900 block">
                PPN Kurang Bayar Masa Oktober 2026 (Form 1111 Induk)
              </span>
              <span className="text-sm text-blue-700 font-medium">
                PPh Keluaran (Rp 94.050.000) - PPN Masukan Sah (Rp 61.500.000) =
              </span>
            </div>
            <span className="text-2xl font-mono font-black text-blue-900">
              Rp 32.550.000
            </span>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: WHT CALCULATOR */}
      {activeSubTab === 'wht_calc' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Kalkulator Pemotongan & Pemungutan Pajak (PPh 21 / 23 / 4(2) / 26)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Simulasi perhitungan pemotongan real-time berdasarkan tarif regulasi terversi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Jenis Pajak Pemotongan</label>
                <select
                  value={whtType}
                  onChange={(e) => setWhtType(e.target.value as 'pph23_jasa' | 'pph4_2_sewa' | 'pph21_bukan_pegawai' | 'pph26_luar_negeri')}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-semibold"
                >
                  <option value="pph23_jasa">PPh 23 — Jasa Manajemen / Konsultan / Teknik (2%)</option>
                  <option value="pph4_2_sewa">PPh 4(2) Final — Sewa Tanah & Bangunan (10%)</option>
                  <option value="pph21_bukan_pegawai">PPh 21 — Tenaga Ahli Bukan Pegawai (PMK 168/2023)</option>
                  <option value="pph26_luar_negeri">PPh 26 — Pembayaran Royalti/Jasa Luar Negeri Non-Treaty (20%)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nilai Bruto Transaksi (IDR)</label>
                <input
                  type="number"
                  value={whtGrossAmount}
                  onChange={(e) => setWhtGrossAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasNpwp"
                  checked={whtHasNpwp}
                  onChange={(e) => setWhtHasNpwp(e.target.checked)}
                  className="rounded text-blue-600 accent-blue-600"
                />
                <label htmlFor="hasNpwp" className="font-semibold text-slate-700 cursor-pointer">
                  Lawan Transaksi Memiliki NPWP 16 Digit Sah (+100% tarif jika tanpa NPWP)
                </label>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500">Hasil Perhitungan Bukti Potong</span>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Dasar Pengenaan Pajak (DPP):</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(calculatedWht.basis, countryCode)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tarif Efektif:</span>
                    <span className="font-mono font-bold text-slate-900">{(calculatedWht.rate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <span className="font-bold text-slate-800">Pajak yang Dipotong:</span>
                    <span className="font-mono font-black text-blue-700 text-lg">{formatCurrency(calculatedWht.taxAmount, countryCode)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600">
                <span className="font-bold text-slate-800 block">Dasar Regulasi:</span>
                <span>{calculatedWht.rule}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: WHAT-IF SIMULATOR */}
      {activeSubTab === 'what_if' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Simulator Skenario Pajak (What-If Optimization)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Uji dampak perubahan pendapatan bruto atau kepatuhan nominatif terhadap beban PPh Badan.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={excludeNonDeductibles}
                  onChange={(e) => setExcludeNonDeductibles(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Eliminasi Non-Deductible (Remediasi)</span>
              </label>
              <div className="flex items-center gap-2">
                <span>Skala Laba: {whatIfMultiplier}%</span>
                <input
                  type="range"
                  min={50}
                  max={200}
                  step={10}
                  value={whatIfMultiplier}
                  onChange={(e) => setWhatIfMultiplier(Number(e.target.value))}
                  className="w-28 accent-blue-600"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-600 block">Skenario Baseline Saat Ini</span>
              <div className="mt-3 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Laba Bersih:</span>
                  <span>{formatCurrency(commercialProfit, countryCode)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Koreksi Positif:</span>
                  <span>+{formatCurrency(totalPositiveCorrection, countryCode)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900">
                  <span>PPh Terutang:</span>
                  <span>{formatCurrency(citDue, countryCode)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
              <span className="font-bold text-blue-900 block">
                Hasil Simulasi ({whatIfMultiplier}%) {excludeNonDeductibles ? '• Remediasi Aktif' : ''}
              </span>
              <div className="mt-3 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Simulasi Laba Bersih:</span>
                  <span>{formatCurrency(commercialProfit * (whatIfMultiplier / 100), countryCode)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Simulasi Koreksi:</span>
                  <span>+{formatCurrency(excludeNonDeductibles ? 0 : totalPositiveCorrection * (whatIfMultiplier / 100), countryCode)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-blue-200 pt-1 text-blue-900">
                  <span>Estimasi PPh Terutang:</span>
                  <span>
                    {formatCurrency(
                      excludeNonDeductibles 
                        ? Math.round(commercialProfit * (whatIfMultiplier / 100) * 0.22)
                        : Math.round(citDue * (whatIfMultiplier / 100)),
                      countryCode
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Adjustment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">
              Tambah Baris Koreksi Fiskal Baru
            </h3>
            <form onSubmit={handleAddAdjustment} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kode Akun</label>
                <input
                  type="text"
                  value={newAccountCode}
                  onChange={(e) => setNewAccountCode(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 font-mono"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Akun Beban / Pendapatan</label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Komersial (IDR)</label>
                  <input
                    type="number"
                    value={newCommercialAmount}
                    onChange={(e) => setNewCommercialAmount(e.target.value)}
                    className="w-full p-2 rounded border border-slate-300 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-rose-700 block mb-1">Koreksi Pos (+)</label>
                  <input
                    type="number"
                    value={newPositiveCorrection}
                    onChange={(e) => setNewPositiveCorrection(e.target.value)}
                    className="w-full p-2 rounded border border-slate-300 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-emerald-700 block mb-1">Koreksi Neg (-)</label>
                  <input
                    type="number"
                    value={newNegativeCorrection}
                    onChange={(e) => setNewNegativeCorrection(e.target.value)}
                    className="w-full p-2 rounded border border-slate-300 font-mono"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Alasan Koreksi</label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Dasar Regulasi</label>
                <input
                  type="text"
                  value={newLegalBasis}
                  onChange={(e) => setNewLegalBasis(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold cursor-pointer"
                >
                  Simpan Koreksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
