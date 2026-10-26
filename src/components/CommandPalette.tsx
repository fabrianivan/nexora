'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Building2, 
  Calculator, 
  FileCheck2, 
  CreditCard, 
  BookOpen, 
  Calendar, 
  BarChart3, 
  X,
  ArrowRight
} from 'lucide-react';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (primaryNav: string, subNav?: string, corpTab?: string) => void;
  onSelectEntity?: (entityId: string) => void;
}

export function CommandPalette({ isOpen, onClose, onNavigate, onSelectEntity }: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  // Keyboard shortcut listener for Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickActions = [
    { label: 'Direktori Entitas Korporasi', category: 'Navigasi', icon: Building2, action: () => onNavigate('companies', 'corporate', 'directory') },
    { label: 'Formulir Legal & Akta Perusahaan', category: 'Navigasi', icon: Building2, action: () => onNavigate('companies', 'corporate', 'corporate_form') },
    { label: 'Bagan Hierarki & Struktur Kepemilikan', category: 'Navigasi', icon: Building2, action: () => onNavigate('companies', 'corporate', 'subsidiaries_tree') },
    { label: 'Rekonsiliasi Fiskal & PPh Badan', category: 'Perhitungan', icon: Calculator, action: () => onNavigate('calculation') },
    { label: 'Draf SPT Tahunan 1771 & Ekspor XML', category: 'Pelaporan', icon: FileCheck2, action: () => onNavigate('tax_return') },
    { label: 'Jadwal Setor Pajak & e-Billing', category: 'Treasury', icon: CreditCard, action: () => onNavigate('payment') },
    { label: 'Pemegang Saham Perorangan & UBO', category: 'Tata Kelola', icon: Building2, action: () => onNavigate('companies', 'individual') },
    { label: 'Perpustakaan Studi P3B & BEPS 2.0', category: 'Pengetahuan', icon: BookOpen, action: () => onNavigate('companies', 'studies') },
    { label: 'Kalender Tenggat Statutory Pajak', category: 'Kepatuhan', icon: Calendar, action: () => onNavigate('companies', 'calendar') },
    { label: 'Laporan Eksekutif & Jejak Audit', category: 'Assurance', icon: BarChart3, action: () => onNavigate('companies', 'reports') },
  ];

  const entities = [
    { id: 'ENT-ID-001', name: 'PT Nusantara Kreasi Digital Tbk', country: '🇮🇩 Indonesia (Induk UPE)', taxId: '0013948214012000' },
    { id: 'ENT-SG-002', name: 'Nusantara FinTech Pte. Ltd.', country: '🇸🇬 Singapore (Anak Usaha)', taxId: '202319482K' },
    { id: 'ENT-MY-003', name: 'Nusantara Digital Solutions Sdn. Bhd.', country: '🇲🇾 Malaysia (Anak Usaha)', taxId: 'C20231948201' },
    { id: 'ENT-US-004', name: 'Nusantara AI Technologies, Inc.', country: '🇺🇸 United States (Anak Usaha)', taxId: '88-1928371' },
  ];

  const filteredActions = quickActions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  const filteredEntities = entities.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase()) ||
    e.country.toLowerCase().includes(query.toLowerCase()) ||
    e.taxId.includes(query)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden text-xs">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik menu, entitas korporasi, dokumen, atau aksi (Cmd+K)..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
          />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Quick Nav Actions */}
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 px-2 block mb-1">
              Menu & Modul Navigasi
            </span>
            <div className="space-y-1">
              {filteredActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.action();
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-900 text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{item.label}</div>
                        <div className="text-[10px] text-slate-400">{item.category}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Corporate Entities */}
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 px-2 block mb-1">
              Entitas Korporasi Multinasional
            </span>
            <div className="space-y-1">
              {filteredEntities.map((ent) => (
                <button
                  key={ent.id}
                  onClick={() => {
                    onSelectEntity?.(ent.id);
                    onNavigate('companies', 'corporate', 'directory');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-900 text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-blue-100/70 flex items-center justify-center text-blue-700 font-bold">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{ent.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {ent.country} • Tax ID: {ent.taxId}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    Buka Entitas
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Tekan <strong>Esc</strong> untuk menutup</span>
          <span>Nexora Global Search</span>
        </div>
      </div>
    </div>
  );
}
