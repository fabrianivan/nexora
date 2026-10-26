'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Clock 
} from 'lucide-react';
import { CountryCode } from '@/data/multiCountryTaxData';

interface AuditLogRecord {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  details: string;
}

interface ReportsTabProps {
  countryCode: CountryCode;
  entityName: string;
  onTriggerToast?: (msg: string) => void;
}

export function ReportsTab({ countryCode, entityName, onTriggerToast }: ReportsTabProps) {
  const [activeReportTab, setActiveReportTab] = useState<'executive_summary' | 'audit_trail' | 'benchmarks'>('executive_summary');
  const [auditFilterActor, setAuditFilterActor] = useState<string>('ALL');
  const [auditSearch, setAuditSearch] = useState<string>('');

  const auditLogs: AuditLogRecord[] = [
    {
      id: 'LOG-1092',
      timestamp: '2026-10-26 07:15:20 WIB',
      actor: 'Sri Mulyani Dewi, S.E., CA',
      role: 'Group CFO',
      action: 'APPROVE_TAX_RETURN',
      target: 'Draf SPT 1771 Tahun 2026',
      details: 'Persetujuan draf final SPT Tahunan setelah verifikasi koreksi fiskal positif CV Mega Suplai (Rp 120.000.000).',
    },
    {
      id: 'LOG-1088',
      timestamp: '2026-10-26 06:45:10 WIB',
      actor: 'Bambang Soeprapto, BKP',
      role: 'Konsultan Pajak',
      action: 'RECONCILIATION_UPDATE',
      target: 'Tabel Rekonsiliasi Fiskal (SPT 1771-I)',
      details: 'Penyesuaian koreksi fiskal positif atas Biaya Entertainment tanpa Daftar Nominatif Rp 20.350.000.',
    },
    {
      id: 'LOG-1074',
      timestamp: '2026-10-25 16:30:00 WIB',
      actor: 'Ir. Aditya Pratama, M.Sc.',
      role: 'Group CEO',
      action: 'GENERATE_BILLING_CODE',
      target: 'PPh Pasal 29 Tahunan',
      details: 'Penerbitan Kode Billing 0100139482142026 sebesar Rp 39.545.000.',
    },
    {
      id: 'LOG-1061',
      timestamp: '2026-10-25 14:10:44 WIB',
      actor: 'Nexora AI Document Engine',
      role: 'Sistem Otomasi AI',
      action: 'DOCUMENT_EXTRACTION',
      target: 'e-Faktur PPN Masukan (DOC-2026-001)',
      details: 'Ekstraksi 12 field OCR berhasil dengan confidence score 99.4%. NPWP 16 digit tervalidasi.',
    },
    {
      id: 'LOG-1050',
      timestamp: '2026-10-25 11:20:18 WIB',
      actor: 'Nexora Risk & Fraud Model',
      role: 'Sistem Otomasi AI',
      action: 'FRAUD_FLAG_RAISED',
      target: 'CV Mega Suplai Abadi (TRX-2610-089)',
      details: 'Deteksi Faktur Pajak TBTS: NPWP non-aktif dalam daftar pengawasan DJP. Skor risiko 96/100.',
    },
  ];

  const filteredLogs = auditLogs.filter((log) => {
    const matchActor = auditFilterActor === 'ALL' || log.role.includes(auditFilterActor);
    const matchQuery =
      log.actor.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.target.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase());
    return matchActor && matchQuery;
  });

  // Real CSV Audit Trail Exporter
  const handleExportAuditCSV = () => {
    const headers = ['ID Log', 'Timestamp', 'Aktor', 'Peran', 'Aksi', 'Objek Sasaran', 'Rincian'];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.actor}"`,
      `"${l.role}"`,
      `"${l.action}"`,
      `"${l.target}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nexora-AuditTrail-${entityName.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onTriggerToast?.('Log jejak audit (Audit Trail) berhasil diekspor sebagai CSV.');
  };

  // Real Print / PDF View
  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                EXECUTIVE COMPLIANCE REPORTING & AUDIT TRAIL
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ISO 27001 & OECD CbCR Audit Assurance
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">
              Laporan Eksekutif Kepatuhan & Log Audit Trail ({countryCode})
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handlePrintSummary}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer border border-slate-300 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={handleExportAuditCSV}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Unduh Paket Audit (CSV)</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 mt-6 pt-1">
          <button
            onClick={() => setActiveReportTab('executive_summary')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeReportTab === 'executive_summary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Ringkasan Eksekutif Grup & Entitas</span>
          </button>
          <button
            onClick={() => setActiveReportTab('audit_trail')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeReportTab === 'audit_trail'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Jejak Audit Tidak Dapat Diubah (Immutable Audit Trail)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: EXECUTIVE SUMMARY */}
      {activeReportTab === 'executive_summary' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
              <span className="text-slate-500 font-semibold block">Indeks Kesehatan Pajak Grup</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">84 / 100</span>
              <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                Tingkat Risiko Rendah (Low SP2DK Exposure)
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
              <span className="text-slate-500 font-semibold block">Potensi Denda Dihindari AI</span>
              <span className="text-2xl font-mono font-black text-blue-700 mt-1 block">
                Rp 68.500.000
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Pemblokiran Faktur TBTS & Salah Kode KAP
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
              <span className="text-slate-500 font-semibold block">Koreksi Fiskal Positif Disetujui</span>
              <span className="text-2xl font-mono font-black text-rose-700 mt-1 block">
                Rp 168.350.000
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                4 Pos Koreksi (Natura, Jamuan, TBTS, Sanksi)
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
              <span className="text-slate-500 font-semibold block">Status Workflow SPT 1771</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">APPROVED</span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Disetujui Checker • Kode Billing Siap Setor
              </span>
            </div>
          </div>

          {/* Detailed Executive Briefing Document Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-xs space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900">
                Laporan Kepatuhan Pajak Komprehensif — {entityName} (Tahun Buku 2026)
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                ID Dokumen: NEX-REP-2026-1026
              </span>
            </div>

            <div className="space-y-3 leading-relaxed text-slate-700">
              <p>
                <strong>1. Ringkasan Operasional & Kepatuhan:</strong> Selama Tahun Pajak 2026 berjalan, entitas mencatatkan peredaran bruto sebesar <strong>Rp 4.650.000.000</strong>. Berdasarkan omzet di bawah Rp 50 Miliar, entitas berhak memanfaatkan fasilitas pengurangan tarif 50% sesuai Pasal 31E UU PPh atas laba kena pajak hingga proporsi Rp 4,8 Miliar.
              </p>
              <p>
                <strong>2. Temuan Audit Dokumen & Mitigasi Fraud:</strong> Sistem Document AI dan Anomaly Detection berhasil mendeteksi dan memblokir 1 faktur pajak TBTS senilai Rp 120.000.000 dari CV Mega Suplai Abadi, mencegah sanksi pidana/administrasi Pasal 39A UU KUP. Pengeluaran entertainment sebesar Rp 20.350.000 tanpa Daftar Nominatif telah disesuaikan menjadi koreksi fiskal positif demi mengeliminasi risiko SP2DK dari KPP Pratama.
              </p>
              <p>
                <strong>3. Rekonsiliasi Fiskal & Beban Pajak Terutang:</strong> Laba neto komersial sebelum pajak sebesar <strong>Rp 975.000.000</strong> disesuaikan secara fiskal positif sebesar <strong>Rp 168.350.000</strong>, menghasilkan Penghasilan Kena Pajak (PKP) sebesar <strong>Rp 1.143.350.000</strong>. PPh Badan terutang adalah <strong>Rp 184.545.000</strong>, dan setelah memperhitungkan kredit pajak PPh 23 serta angsuran PPh 25 sebesar Rp 145.000.000, PPh Kurang Bayar (Pasal 29) final adalah <strong>Rp 39.545.000</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: IMMUTABLE AUDIT TRAIL */}
      {activeReportTab === 'audit_trail' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-extrabold text-slate-900">
                Log Jejak Audit Forensik Tidak Dapat Diubah (Immutable Audit Trail)
              </h2>
              <p className="text-[11px] text-slate-500">
                Merekam setiap ekstraksi AI, perubahan nilai manual, pergantian status temuan, dan persetujuan maker-checker.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditFilterActor}
                onChange={(e) => setAuditFilterActor(e.target.value)}
                className="p-1.5 rounded-lg border border-slate-300 font-semibold"
              >
                <option value="ALL">Semua Aktor</option>
                <option value="CEO">Group CEO</option>
                <option value="CFO">Group CFO</option>
                <option value="Konsultan">Konsultan Pajak</option>
                <option value="AI">Sistem AI</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Cari aksi / rincian..."
                  className="pl-8 pr-3 py-1 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono">
              <thead className="bg-slate-100 text-[10px] text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">ID Log</th>
                  <th className="p-3">Waktu (WIB)</th>
                  <th className="p-3">Aktor & Peran</th>
                  <th className="p-3">Aksi</th>
                  <th className="p-3">Objek Sasaran</th>
                  <th className="p-3 font-sans">Rincian Perubahan & Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="p-3 font-mono font-bold text-slate-900">{log.id}</td>
                    <td className="p-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{log.actor}</div>
                      <div className="text-[10px] text-blue-700 font-semibold">{log.role}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{log.target}</td>
                    <td className="p-3 text-slate-600 text-[11px] max-w-sm leading-relaxed">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
