'use client';

import React, { useState } from 'react';
import { 
  CreditCard, 
  Copy, 
  Check, 
  Calendar
} from 'lucide-react';
import { CountryCode, formatCurrency } from '@/data/multiCountryTaxData';

export interface PaymentLiability {
  id: string;
  taxType: string;
  kapKjs: string; // Kode Akun Pajak & Jenis Setoran
  period: string;
  amount: number;
  dueDate: string;
  status: 'Belum dibayar' | 'Dibayar' | 'Terlambat';
  billingCode?: string;
  ntpn?: string;
  paidAt?: string;
}

const DEFAULT_LIABILITIES: PaymentLiability[] = [
  {
    id: 'PAY-01',
    taxType: 'PPh Badan Tahunan (Pasal 29)',
    kapKjs: '411126-200 (PPh Badan Tahunan)',
    period: 'Tahun Pajak 2026',
    amount: 39545000,
    dueDate: '30 April 2027',
    status: 'Belum dibayar',
    billingCode: '0100139482142026',
  },
  {
    id: 'PAY-02',
    taxType: 'PPN Masa Dalam Negeri',
    kapKjs: '411211-100 (Setoran Masa PPN)',
    period: 'Masa Oktober 2026',
    amount: 32550000,
    dueDate: '30 November 2026',
    status: 'Belum dibayar',
    billingCode: '0200139482141026',
  },
  {
    id: 'PAY-03',
    taxType: 'PPh 21 TER Karyawan & Honorarium',
    kapKjs: '411121-100 (PPh 21 Bulanan)',
    period: 'Masa Oktober 2026',
    amount: 14800000,
    dueDate: '10 November 2026',
    status: 'Dibayar',
    billingCode: '0300139482141026',
    ntpn: '7A920F819203BC11',
    paidAt: '05 Nov 2026, 14:22 WIB',
  },
  {
    id: 'PAY-04',
    taxType: 'PPh 23 Jasa Manajemen Afiliasi',
    kapKjs: '411124-104 (Jasa Manajemen)',
    period: 'Masa September 2026',
    amount: 4500000,
    dueDate: '10 Oktober 2026',
    status: 'Terlambat',
    billingCode: '0400139482140926',
  },
];

interface PaymentTabProps {
  countryCode: CountryCode;
  entityName: string;
  taxId: string;
  initialLiabilities?: PaymentLiability[];
  onDataChange?: (liabilities: PaymentLiability[]) => void;
  onTriggerToast?: (msg: string) => void;
}

export function PaymentTab({
  countryCode,
  entityName,
  taxId,
  initialLiabilities,
  onDataChange,
  onTriggerToast
}: PaymentTabProps) {
  const [liabilities, setLiabilities] = useState<PaymentLiability[]>(
    initialLiabilities && initialLiabilities.length > 0 ? initialLiabilities : DEFAULT_LIABILITIES
  );

  React.useEffect(() => {
    if (initialLiabilities && initialLiabilities.length > 0) {
      setLiabilities(initialLiabilities);
    }
  }, [initialLiabilities]);

  const [activeBillingSlip, setActiveBillingSlip] = useState<PaymentLiability | null>(liabilities[0]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState<boolean>(false);
  const [targetPayLiability, setTargetPayLiability] = useState<PaymentLiability | null>(null);
  const [inputNtpn, setInputNtpn] = useState<string>('8B104F921029DA77');

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    onTriggerToast?.(`Kode billing ${code} disalin ke clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleOpenPayModal = (item: PaymentLiability) => {
    setTargetPayLiability(item);
    setShowPayModal(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPayLiability) return;

    const nextLiabilities: PaymentLiability[] = liabilities.map((l) =>
      l.id === targetPayLiability.id
        ? {
            ...l,
            status: 'Dibayar',
            ntpn: inputNtpn,
            paidAt: new Date().toLocaleString('id-ID'),
          }
        : l
    );
    setLiabilities(nextLiabilities);
    setShowPayModal(false);
    onDataChange?.(nextLiabilities);
    onTriggerToast?.(`Pembayaran ${targetPayLiability.taxType} berhasil dicatat dengan NTPN: ${inputNtpn}`);
  };

  // Generate New Billing ID
  const handleGenerateNewBilling = (liabilityId: string) => {
    const randomCode = '0' + Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
    const nextLiabilities: PaymentLiability[] = liabilities.map((l) =>
      l.id === liabilityId
        ? { ...l, billingCode: randomCode }
        : l
    );
    setLiabilities(nextLiabilities);
    onDataChange?.(nextLiabilities);
    onTriggerToast?.(`Kode Billing baru diterbitkan dari DJP Coretax: ${randomCode}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                MULTI-SUBSIDIARY TAX TREASURY & E-BILLING
              </span>
              <span className="text-xs text-slate-500 font-medium">
                DJP Coretax e-Billing & Bank Persepsi
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">
              {entityName} — Jadwal & Eksekusi Pembayaran Pajak
            </h1>
          </div>
        </div>

        {/* Treasury Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-slate-500 font-semibold block">Total Kewajiban Menunggu Bayar</span>
            <span className="text-xl font-mono font-black text-slate-900 mt-1 block">
              {formatCurrency(
                liabilities.filter((l) => l.status !== 'Dibayar').reduce((acc, curr) => acc + curr.amount, 0),
                countryCode
              )}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              PPh Pasal 29 & PPN Masa Okt 2026
            </span>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <span className="text-emerald-700 font-bold block">Pajak Telah Disetor (YTD 2026)</span>
            <span className="text-xl font-mono font-black text-emerald-800 mt-1 block">
              {formatCurrency(284500000, countryCode)}
            </span>
            <span className="text-[11px] text-emerald-600 mt-1 block">
              NTPN Tervalidasi Kas Negara
            </span>
          </div>

          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
            <span className="text-rose-700 font-bold block">Estimasi Sanksi Keterlambatan</span>
            <span className="text-xl font-mono font-black text-rose-800 mt-1 block">
              {formatCurrency(157500, countryCode)}
            </span>
            <span className="text-[11px] text-rose-600 mt-1 block">
              Tarif Bunga KMK 1.75% / bulan (PPh 23 Sep)
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Split List and Billing Slip Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Liabilities Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900">
              Daftar Tagihan & Kewajiban Setor Pajak
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              NPWP: {taxId}
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {liabilities.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setActiveBillingSlip(item)}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-all cursor-pointer ${
                  activeBillingSlip?.id === item.id ? 'bg-blue-50/40 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">{item.taxType}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'Dibayar'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'Terlambat'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    KAP/KJS: {item.kapKjs} • Periode: {item.period}
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jatuh Tempo: <strong className="text-slate-800">{item.dueDate}</strong></span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2">
                  <span className="text-base font-mono font-black text-slate-900">
                    {formatCurrency(item.amount, countryCode)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {item.status !== 'Dibayar' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPayModal(item);
                        }}
                        className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs text-[11px]"
                      >
                        Catat Bayar
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        NTPN: {item.ntpn?.slice(0, 10)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Official Billing Slip Viewer */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-xs flex flex-col justify-between">
          {activeBillingSlip ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-1.5 text-blue-700 font-extrabold">
                  <CreditCard className="w-4 h-4" />
                  <span>SURAT SETORAN ELEKTRONIK (e-Billing)</span>
                </div>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono">DJP Coretax</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Kode Billing DJP (15 Digit):</span>
                <div className="flex items-center justify-between bg-slate-900 text-emerald-400 p-3 rounded-lg font-mono font-black text-lg mt-1 tracking-wider shadow-inner">
                  <span>{activeBillingSlip.billingCode || '0100139482142026'}</span>
                  <button
                    onClick={() => handleCopy(activeBillingSlip.billingCode || '0100139482142026')}
                    className="p-1 hover:text-white cursor-pointer"
                    title="Salin Kode Billing"
                  >
                    {copiedCode === (activeBillingSlip.billingCode || '0100139482142026') ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Masa berlaku kode billing: 7 hari sejak diterbitkan.
                </span>
              </div>

              <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama WP:</span>
                  <span className="font-bold text-slate-800 text-right truncate max-w-[150px]">{entityName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NPWP:</span>
                  <span className="font-bold text-slate-800">{taxId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jenis Pajak:</span>
                  <span className="font-bold text-slate-800">{activeBillingSlip.taxType}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-slate-900 font-bold">
                  <span>Jumlah Setor:</span>
                  <span className="text-blue-700 font-black">{formatCurrency(activeBillingSlip.amount, countryCode)}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">Kanal Pembayaran:</span>
                <p>• Teller Bank Persepsi / Kantor Pos</p>
                <p>• ATM Mandiri, BCA, BNI, BRI (Menu Bayar Pajak DJP)</p>
                <p>• Corporate Internet Banking (e-Tax MPN G3)</p>
              </div>

              <button
                onClick={() => handleGenerateNewBilling(activeBillingSlip.id)}
                className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer border border-slate-300 text-center text-xs"
              >
                Terbitkan Ulang Kode Billing
              </button>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              Pilih salah satu kewajiban pajak di samping untuk menampilkan Surat Setoran Elektronik.
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPayModal && targetPayLiability && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <h3 className="text-base font-extrabold text-slate-900 mb-2">
              Konfirmasi & Catat Bukti Setor Pajak
            </h3>
            <p className="text-slate-500 mb-4">
              Masukkan Nomor Transaksi Penerimaan Negara (NTPN) dari struk/BPN bank persepsi.
            </p>

            <form onSubmit={handleConfirmPayment} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Jenis Pajak</label>
                <input
                  type="text"
                  value={targetPayLiability.taxType}
                  disabled
                  className="w-full p-2 rounded bg-slate-100 border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jumlah Disetor</label>
                <input
                  type="text"
                  value={formatCurrency(targetPayLiability.amount, countryCode)}
                  disabled
                  className="w-full p-2 rounded bg-slate-100 border border-slate-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor Transaksi Penerimaan Negara (NTPN)</label>
                <input
                  type="text"
                  value={inputNtpn}
                  onChange={(e) => setInputNtpn(e.target.value.toUpperCase())}
                  placeholder="Contoh: 7A920F819203BC11"
                  className="w-full p-2 rounded border border-slate-300 font-mono uppercase font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                >
                  Simpan Bukti Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
