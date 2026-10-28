'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  SlidersHorizontal, 
  Globe2
} from 'lucide-react';

export interface StudyItem {
  id: string;
  title: string;
  category: 'P3B / Tax Treaty' | 'BEPS 2.0 / Pillar Two' | 'Transfer Pricing' | 'PPN / VAT' | 'Fraud Case Study';
  summary: string;
  source: string;
  tags: string[];
  applicableJurisdictions: string[];
  simulationType: 'treaty_relief' | 'pillar_two_etr' | 'tp_markup' | 'none';
}

const DEFAULT_STUDIES_LIST: StudyItem[] = [
  {
    id: 'STUDY-01',
    title: 'P3B Indonesia–Singapura: Ketentuan Pemotongan Dividen, Royalti & Bunga (Pasal 10, 11, 12)',
    category: 'P3B / Tax Treaty',
    summary: 'Perjanjian Penghindaran Pajak Berganda (P3B) terbaru Indonesia-Singapura membatasi tarif pemotongan dividen menjadi 10% (kepemilikan langsung min. 25%) atau 15% (lainnya), serta tarif royalti maksimal 10%. Membutuhkan validasi e-SKD aktif di DJP Coretax.',
    source: 'P3B RI–Singapura (Berlaku Efektif 2022) & PER-25/PJ/2018',
    tags: ['P3B', 'Tax Treaty', 'e-SKD', 'Withholding Tax', 'Pasal 26'],
    applicableJurisdictions: ['🇮🇩 Indonesia', '🇸🇬 Singapore'],
    simulationType: 'treaty_relief',
  },
  {
    id: 'STUDY-02',
    title: 'OECD Pillar Two: Ambang Batas GloBE €750M & Ketentuan Top-up Tax 15%',
    category: 'BEPS 2.0 / Pillar Two',
    summary: 'Grup korporasi multinasional dengan omzet konsolidasi melebihi €750 Juta wajib menerapkan minimum effective tax rate (ETR) 15%. Jika anak usaha di yurisdiksi hub dikenai ETR di bawah 15%, Ultimate Parent Entity (UPE) wajib menyetor Top-Up Tax (IIR).',
    source: 'OECD/G20 Inclusive Framework on BEPS — Pillar Two Model Rules & PMK Implementasi',
    tags: ['Pillar Two', 'GloBE', 'Top-up Tax', 'CbCR', 'ETR'],
    applicableJurisdictions: ['🇮🇩 Indonesia', '🇸🇬 Singapore', '🇲🇾 Malaysia', '🇺🇸 United States'],
    simulationType: 'pillar_two_etr',
  },
  {
    id: 'STUDY-03',
    title: 'Studi Kasus Pembongkaran Sindikat Penerbit Faktur Pajak TBTS (Pasal 39A UU KUP)',
    category: 'Fraud Case Study',
    summary: 'Analisis forensik penipuan PPN melalui modus shell company (perusahaan cangkang) tanpa karyawan riil yang menerbitkan Faktur Pajak Masukan fiktif. Deteksi algoritma Nexora mengidentifikasi anomali lewat perbandingan Z-score histori transaksi dan ketiadaan arus kas riil.',
    source: 'Yurisprudensi Pengadilan Pajak & DJP Surat Edaran SE-26/PJ/2015',
    tags: ['Faktur TBTS', 'Pasal 39A', 'PPN Masukan', 'Z-Score Anomaly', 'Fraud Prevention'],
    applicableJurisdictions: ['🇮🇩 Indonesia'],
    simulationType: 'none',
  },
  {
    id: 'STUDY-04',
    title: 'Transfer Pricing Jasa Manajemen Antar-Grup: Metode TNMM vs Cost Plus (PMK 172/2023)',
    category: 'Transfer Pricing',
    summary: 'Panduan penyusunan Local File & Master File TP Doc atas alokasi biaya manajemen regional. Uji kewajaran mensyaratkan rentang interkuartil (interquartile range) markup 5% - 8% dari penyedia jasa independen sejenis.',
    source: 'PMK No. 172 Tahun 2023 tentang Penerapan Prinsip Kewajaran dan Kelaziman Usaha',
    tags: ['Transfer Pricing', 'TNMM', 'Arm’s Length', 'Interquartile Range', 'PMK 172/2023'],
    applicableJurisdictions: ['🇮🇩 Indonesia', '🇸🇬 Singapore', '🇲🇾 Malaysia'],
    simulationType: 'tp_markup',
  },
];

/** Records hydrated from the DB may predate newer fields — fill safe defaults. */
function normalizeStudies(items: Partial<StudyItem>[]): StudyItem[] {
  return items
    .filter((s): s is Partial<StudyItem> & { id: string; title: string } => Boolean(s && s.id && s.title))
    .map((s) => ({
      category: 'P3B / Tax Treaty',
      summary: '',
      source: '',
      simulationType: 'none',
      ...s,
      tags: Array.isArray(s.tags) ? s.tags : [],
      applicableJurisdictions: Array.isArray(s.applicableJurisdictions) ? s.applicableJurisdictions : [],
    })) as StudyItem[];
}

interface StudiesTabProps {
  initialStudies?: StudyItem[];
  onAskCopilot?: (question: string) => void;
}

export function StudiesTab({ initialStudies, onAskCopilot }: StudiesTabProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Interactive Simulator States
  const [activeSimulator, setActiveSimulator] = useState<'treaty' | 'pillar_two' | null>(null);

  // Treaty Simulator
  const [sourceJurisdiction, setSourceJurisdiction] = useState<'ID' | 'SG' | 'MY' | 'US'>('ID');
  const [residenceJurisdiction, setResidenceJurisdiction] = useState<'ID' | 'SG' | 'MY' | 'US'>('SG');
  const [incomeType, setIncomeType] = useState<'dividend' | 'interest' | 'royalty'>('dividend');
  const [grossIncomeAmount, setGrossIncomeAmount] = useState<number>(100000000); // 100M IDR

  // Pillar Two Simulator
  const [groupConsolidatedRevenue, setGroupConsolidatedRevenue] = useState<number>(850000000); // €850M
  const [jurisdictionEtr, setJurisdictionEtr] = useState<number>(11.5); // 11.5% in SG/low-tax hub
  const [coveredEarnings, setCoveredEarnings] = useState<number>(50000000); // €50M

  const [studiesList, setStudiesList] = useState<StudyItem[]>(
    initialStudies && initialStudies.length > 0 ? normalizeStudies(initialStudies) : DEFAULT_STUDIES_LIST
  );

  React.useEffect(() => {
    if (initialStudies && initialStudies.length > 0) {
      setStudiesList(normalizeStudies(initialStudies));
    }
  }, [initialStudies]);

  const filtered = studiesList.filter((s) => {
    const matchCat = selectedCategory === 'ALL' || s.category === selectedCategory;
    const matchQuery =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.summary.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchQuery;
  });

  // Calculate Treaty Rates
  const treatyCalculation = () => {
    const statutoryRate = 0.20; // 20% normal PPh 26
    let treatyRate = 0.15;
    let ruleRef = '';

    if (sourceJurisdiction === 'ID' && residenceJurisdiction === 'SG') {
      if (incomeType === 'dividend') {
        treatyRate = 0.10; // 10% for substantial holding
        ruleRef = 'P3B RI–SG Pasal 10: Tarif 10% (kepemilikan >= 25%) atau 15%';
      } else if (incomeType === 'royalty') {
        treatyRate = 0.10;
        ruleRef = 'P3B RI–SG Pasal 12: Tarif 10% atas royalti software/paten';
      } else {
        treatyRate = 0.10;
        ruleRef = 'P3B RI–SG Pasal 11: Tarif 10% atas bunga pinjaman antar-grup';
      }
    } else {
      treatyRate = 0.15;
      ruleRef = 'Ketentuan P3B Bilateral Standar (Memerlukan e-SKD aktif)';
    }

    const statutoryTax = grossIncomeAmount * statutoryRate;
    const treatyTax = grossIncomeAmount * treatyRate;
    const taxSaving = statutoryTax - treatyTax;

    return { statutoryRate, treatyRate, statutoryTax, treatyTax, taxSaving, ruleRef };
  };

  // Calculate Pillar Two
  const pillarTwoCalculation = () => {
    const isAboveThreshold = groupConsolidatedRevenue >= 750000000;
    const minimumEtr = 15.0; // 15% GloBE minimum
    const topUpRate = Math.max(0, minimumEtr - jurisdictionEtr);
    const topUpTax = isAboveThreshold ? (coveredEarnings * (topUpRate / 100)) : 0;

    return { isAboveThreshold, minimumEtr, topUpRate, topUpTax };
  };

  const treatyRes = treatyCalculation();
  const pillarRes = pillarTwoCalculation();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                KNOWLEDGE BASE & CASE STUDIES LIBRARY
              </span>
              <span className="text-xs text-slate-500 font-medium">
                P3B, OECD BEPS 2.0 & Yurisprudensi Pajak
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Perpustakaan Studi Kasus & Simulator Pajak Internasional
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveSimulator(activeSimulator === 'treaty' ? null : 'treaty')}
              className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer border transition-all ${
                activeSimulator === 'treaty'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Simulator Tax Treaty (P3B)</span>
            </button>
            <button
              onClick={() => setActiveSimulator(activeSimulator === 'pillar_two' ? null : 'pillar_two')}
              className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer border transition-all ${
                activeSimulator === 'pillar_two'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>Simulator BEPS 2.0 (Pillar Two)</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-2 border-t border-slate-200">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
            {['ALL', 'P3B / Tax Treaty', 'BEPS 2.0 / Pillar Two', 'Transfer Pricing', 'Fraud Case Study'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari studi kasus atau regulasi..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50"
            />
          </div>
        </div>
      </div>

      {/* INTERACTIVE SIMULATOR 1: TREATY RELIEF */}
      {activeSimulator === 'treaty' && (
        <div className="bg-white rounded-xl border border-blue-300 shadow-md p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Simulator Manfaat Pajak P3B (Tax Treaty Relief Calculator)
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Grounded Model
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Negara Sumber Penghasilan</label>
              <select
                value={sourceJurisdiction}
                onChange={(e) => setSourceJurisdiction(e.target.value as 'ID' | 'SG' | 'MY' | 'US')}
                className="w-full p-2 rounded border border-slate-300 font-semibold"
              >
                <option value="ID">🇮🇩 Indonesia (DJP)</option>
                <option value="SG">🇸🇬 Singapore (IRAS)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Negara Domisili Penerima (SPLN)</label>
              <select
                value={residenceJurisdiction}
                onChange={(e) => setResidenceJurisdiction(e.target.value as 'ID' | 'SG' | 'MY' | 'US')}
                className="w-full p-2 rounded border border-slate-300 font-semibold"
              >
                <option value="SG">🇸🇬 Singapore (IRAS Tax Resident)</option>
                <option value="MY">🇲🇾 Malaysia (LHDN Tax Resident)</option>
                <option value="US">🇺🇸 United States (IRS Tax Resident)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Jenis Penghasilan</label>
              <select
                value={incomeType}
                onChange={(e) => setIncomeType(e.target.value as 'dividend' | 'interest' | 'royalty')}
                className="w-full p-2 rounded border border-slate-300 font-semibold"
              >
                <option value="dividend">Dividen Saham (Pasal 10 P3B)</option>
                <option value="royalty">Royalti Paten/Software (Pasal 12 P3B)</option>
                <option value="interest">Bunga Pinjaman Afiliasi (Pasal 11 P3B)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nilai Bruto Pembayaran (IDR)</label>
              <input
                type="number"
                value={grossIncomeAmount}
                onChange={(e) => setGrossIncomeAmount(Number(e.target.value))}
                className="w-full p-2 rounded border border-slate-300 font-mono font-semibold"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 font-mono">
            <div>
              <span className="text-[11px] text-slate-500 font-sans block">Tarif Normal Tanpa P3B (PPh 26):</span>
              <span className="text-base font-semibold text-rose-600">
                {(treatyRes.statutoryRate * 100).toFixed(0)}% = Rp {treatyRes.statutoryTax.toLocaleString('id-ID')}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 font-sans block">Tarif Preferensi P3B (dengan e-SKD):</span>
              <span className="text-base font-semibold text-blue-700">
                {(treatyRes.treatyRate * 100).toFixed(0)}% = Rp {treatyRes.treatyTax.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="border-l border-slate-300 pl-4">
              <span className="text-[11px] text-emerald-700 font-sans font-semibold block">Penghematan Pajak Legal:</span>
              <span className="text-xl font-bold text-emerald-700">
                Rp {treatyRes.taxSaving.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Dasar Aturan: {treatyRes.ruleRef}. Memerlukan tanda terima Surat Keterangan Domisili elektronik (e-SKD) yang masih berlaku di sistem Coretax DJP.
          </p>
        </div>
      )}

      {/* INTERACTIVE SIMULATOR 2: PILLAR TWO */}
      {activeSimulator === 'pillar_two' && (
        <div className="bg-white rounded-xl border border-blue-300 shadow-md p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Penyaringan Awal OECD Pillar Two / GloBE ETR & Top-up Tax
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Preview Model (P2)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Omzet Konsolidasian Grup (EUR):
              </label>
              <input
                type="number"
                value={groupConsolidatedRevenue}
                onChange={(e) => setGroupConsolidatedRevenue(Number(e.target.value))}
                className="w-full p-2 rounded border border-slate-300 font-mono font-semibold"
              />
              <span className="text-[10px] text-slate-500 block mt-1">Ambang batas GloBE: €750.000.000</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Effective Tax Rate (ETR) Yurisdiksi Anak (%):
              </label>
              <input
                type="number"
                step="0.1"
                value={jurisdictionEtr}
                onChange={(e) => setJurisdictionEtr(Number(e.target.value))}
                className="w-full p-2 rounded border border-slate-300 font-mono font-semibold"
              />
              <span className="text-[10px] text-slate-500 block mt-1">Standar Tarif Minimum GloBE: 15.0%</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Laba Bersih Yurisdiksi Terkait (EUR):
              </label>
              <input
                type="number"
                value={coveredEarnings}
                onChange={(e) => setCoveredEarnings(Number(e.target.value))}
                className="w-full p-2 rounded border border-slate-300 font-mono font-semibold"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 font-mono">
            <div>
              <span className="text-[11px] text-slate-500 font-sans block">Status Ambang Batas:</span>
              <span className={`text-sm font-semibold ${pillarRes.isAboveThreshold ? 'text-rose-700' : 'text-emerald-700'}`}>
                {pillarRes.isAboveThreshold ? 'Wajib Kepatuhan Pillar Two (€ >= 750M)' : 'Di Bawah Ambang (€ < 750M)'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 font-sans block">Selisih Tarif Top-Up (15% - ETR):</span>
              <span className="text-base font-semibold text-blue-700">
                {pillarRes.topUpRate.toFixed(1)}%
              </span>
            </div>

            <div className="border-l border-slate-300 pl-4">
              <span className="text-[11px] text-rose-700 font-sans font-semibold block">Estimasi Top-Up Tax (IIR):</span>
              <span className="text-xl font-bold text-rose-700">
                € {pillarRes.topUpTax.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Studies Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {item.category}
              </span>
              <div className="flex items-center gap-1">
                {item.applicableJurisdictions.map((j) => (
                  <span key={j} className="text-[11px]">{j}</span>
                ))}
              </div>
            </div>

            <h3 className="font-semibold text-slate-900 text-sm">{item.title}</h3>
            <p className="text-slate-600 leading-relaxed">{item.summary}</p>

            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              {item.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                {item.source}
              </span>

              <button
                type="button"
                onClick={() => onAskCopilot?.(`Jelaskan lebih lanjut mengenai studi: ${item.title}`)}
                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Tanya Copilot</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
