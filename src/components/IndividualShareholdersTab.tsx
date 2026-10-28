'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  CheckCircle2
} from 'lucide-react';
import { formatCurrency } from '@/data/multiCountryTaxData';

interface IndividualShareholderData {
  id: string;
  fullName: string;
  type: 'UBO (Beneficial Owner)' | 'Individual Shareholder' | 'Angel Investor';
  roleTitle: string;
  nationality: string;
  taxResidency: string;
  maskedId: string;
  maskedTaxId: string;
  directSharePercent: number;
  effectiveSharePercent: number;
  dividendReceived: number;
  withholdingTaxDue: number;
  taxRegime: string;
  status: 'Active' | 'Pending Verification';
}

export function IndividualShareholdersTab() {
  const [search, setSearch] = useState('');
  const [shareholders, setShareholders] = useState<IndividualShareholderData[]>([
    {
      id: 'IND-01',
      fullName: 'Ir. Aditya Pratama, M.Sc.',
      type: 'UBO (Beneficial Owner)',
      roleTitle: 'Co-Founder & Group Chief Executive Officer (CEO)',
      nationality: '🇮🇩 Indonesia',
      taxResidency: '🇮🇩 Indonesia (SPDN — KPP Pratama Jakarta Selatan)',
      maskedId: 'NIK: 317405********02',
      maskedTaxId: 'NPWP: 001394******000',
      directSharePercent: 20,
      effectiveSharePercent: 32.5,
      dividendReceived: 250000000,
      withholdingTaxDue: 0,
      taxRegime: '0% Bebas PPh Dividen (Diinvestasikan di NKRI min. 3 Tahun — UU HPP Pasal 4 ayat 3 f & PMK 18/2021)',
      status: 'Active',
    },
    {
      id: 'IND-02',
      fullName: 'Hendrik Wijaya, B.Eng.',
      type: 'UBO (Beneficial Owner)',
      roleTitle: 'Co-Founder & Chief Operating Officer (COO)',
      nationality: '🇮🇩 Indonesia',
      taxResidency: '🇮🇩 Indonesia (SPDN — KPP Pratama Jakarta Pusat)',
      maskedId: 'NIK: 317102********08',
      maskedTaxId: 'NPWP: 002849******000',
      directSharePercent: 15,
      effectiveSharePercent: 24.5,
      dividendReceived: 187500000,
      withholdingTaxDue: 0,
      taxRegime: '0% Bebas PPh Dividen (Diinvestasikan di NKRI — Reinvestment Compliance Verified)',
      status: 'Active',
    },
    {
      id: 'IND-03',
      fullName: 'Marcus Tan Wei Ming',
      type: 'Angel Investor',
      roleTitle: 'Non-Resident Individual Angel Investor (WPLN)',
      nationality: '🇸🇬 Singapore',
      taxResidency: '🇸🇬 Singapore (SPLN — IRAS Tax Resident)',
      maskedId: 'Passport: K819*****Z',
      maskedTaxId: 'SG-NRIC: S841****D',
      directSharePercent: 5,
      effectiveSharePercent: 8.0,
      dividendReceived: 62500000,
      withholdingTaxDue: 9375000,
      taxRegime: '15% PPh Pasal 26 (Tarif P3B Indonesia–Singapura Pasal 10 dengan e-SKD DGT-1 Aktif; Normal 20%)',
      status: 'Active',
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNationality, setNewNationality] = useState('🇮🇩 Indonesia');
  const [newShare, setNewShare] = useState('5');
  const [newRole, setNewRole] = useState('Komisaris Independen');
  const [newDividend, setNewDividend] = useState('50000000');

  const filtered = shareholders.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.taxResidency.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const div = parseFloat(newDividend) || 0;
    const isWpln = !newNationality.includes('Indonesia');
    const wht = isWpln ? div * 0.15 : 0;

    const newEntry: IndividualShareholderData = {
      id: `IND-${Date.now().toString().slice(-4)}`,
      fullName: newName,
      type: 'Individual Shareholder',
      roleTitle: newRole,
      nationality: newNationality,
      taxResidency: isWpln ? `${newNationality} (SPLN)` : '🇮🇩 Indonesia (SPDN)',
      maskedId: 'NIK/Passport: ************',
      maskedTaxId: 'Tax ID: ************',
      directSharePercent: parseFloat(newShare) || 0,
      effectiveSharePercent: parseFloat(newShare) || 0,
      dividendReceived: div,
      withholdingTaxDue: wht,
      taxRegime: isWpln ? '15% PPh 26 (Tarif P3B Tax Treaty)' : '0% Bebas PPh Dividen (UU HPP 4(3)f)',
      status: 'Active',
    };

    setShareholders([...shareholders, newEntry]);
    setShowAddModal(false);
    setNewName('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                PEMEGANG SAHAM PERORANGAN & BENEFICIAL OWNERSHIP (UBO)
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Perpres 13/2018 & PMK 18/2021
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Direktori Pemegang Saham Perorangan & Pajak Dividen
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pemegang Saham</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-5 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pemegang saham perorangan, UBO, atau domisili fiskal..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
          />
        </div>
      </div>

      {/* Shareholder Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((sh) => (
          <div key={sh.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-xs space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-semibold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {sh.type}
                </span>
                <h3 className="font-semibold text-slate-900 text-sm mt-1">{sh.fullName}</h3>
                <p className="text-[11px] text-slate-500">{sh.roleTitle}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                {sh.status}
              </span>
            </div>

            <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Kewarganegaraan:</span>
                <span className="font-semibold text-slate-800">{sh.nationality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ID Identitas:</span>
                <span className="font-semibold text-slate-700">{sh.maskedId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NPWP / Tax ID:</span>
                <span className="font-semibold text-slate-700">{sh.maskedTaxId}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-600 font-sans font-semibold">Saham Langsung:</span>
                <span className="font-semibold text-blue-700">{sh.directSharePercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-sans font-semibold">Hak Suara Efektif:</span>
                <span className="font-semibold text-blue-900">{sh.effectiveSharePercent}%</span>
              </div>
            </div>

            {/* Dividend & Tax Section */}
            <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
              <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                Pajak Dividen Tahun Berjalan
              </span>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Dividen Diterima:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(sh.dividendReceived, 'ID')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">PPh Dipotong:</span>
                <span className="font-mono font-semibold text-rose-600">
                  {formatCurrency(sh.withholdingTaxDue, 'ID')}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-100 flex items-start gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{sh.taxRegime}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 text-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              Tambah Pemegang Saham Perorangan
            </h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Budi Santoso, S.Kom."
                  className="w-full p-2 rounded border border-slate-300"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Peran / Jabatan</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kewarganegaraan</label>
                  <select
                    value={newNationality}
                    onChange={(e) => setNewNationality(e.target.value)}
                    className="w-full p-2 rounded border border-slate-300"
                  >
                    <option value="🇮🇩 Indonesia">🇮🇩 Indonesia</option>
                    <option value="🇸🇬 Singapore">🇸🇬 Singapore</option>
                    <option value="🇲🇾 Malaysia">🇲🇾 Malaysia</option>
                    <option value="🇺🇸 United States">🇺🇸 United States</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Porsi Saham (%)</label>
                  <input
                    type="number"
                    value={newShare}
                    onChange={(e) => setNewShare(e.target.value)}
                    className="w-full p-2 rounded border border-slate-300 font-mono"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Estimasi Dividen Tahunan (IDR)</label>
                <input
                  type="number"
                  value={newDividend}
                  onChange={(e) => setNewDividend(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 font-mono"
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
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold cursor-pointer"
                >
                  Simpan Pemegang Saham
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
