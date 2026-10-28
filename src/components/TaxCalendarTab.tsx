'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Download
} from 'lucide-react';
import { CountryCode } from '@/data/multiCountryTaxData';

export interface CalendarEvent {
  id: string;
  title: string;
  jurisdiction: string;
  entityName: string;
  taxType: string;
  dueDate: string;
  status: 'Upcoming' | 'Today' | 'Overdue' | 'Completed';
  assignee: string;
  regulationBasis: string;
  description: string;
}

interface TaxCalendarTabProps {
  countryCode: CountryCode;
  entityName: string;
  initialEvents?: CalendarEvent[];
  onDataChange?: (events: CalendarEvent[]) => void;
  onTriggerToast?: (msg: string) => void;
}

export function TaxCalendarTab({ countryCode, entityName, initialEvents, onDataChange, onTriggerToast }: TaxCalendarTabProps) {
  const [viewMode, setViewMode] = useState<'list' | 'month'>('list');
  const [filterTaxType, setFilterTaxType] = useState<string>('ALL');

  const [events, setEvents] = useState<CalendarEvent[]>(
    initialEvents && initialEvents.length > 0 ? initialEvents : [
      {
        id: 'EVT-01',
        title: 'Penyetoran PPh Masa Unifikasi & PPh 21 TER',
        jurisdiction: '🇮🇩 Indonesia (DJP)',
        entityName: 'PT Nusantara Kreasi Digital Tbk',
        taxType: 'PPh Unifikasi',
        dueDate: '2026-11-10',
        status: 'Upcoming',
        assignee: 'Bambang Soeprapto, BKP',
        regulationBasis: 'PMK-242/PMK.03/2014 & PER-24/PJ/2021',
        description: 'Setoran PPh 21 TER atas gaji karyawan masa Oktober 2026 melalui e-Billing DJP.',
      },
    {
      id: 'EVT-02',
      title: 'Pelaporan SPT Masa PPh Unifikasi & e-SKD PPh 26',
      jurisdiction: '🇮🇩 Indonesia (DJP)',
      entityName: 'PT Nusantara Kreasi Digital Tbk',
      taxType: 'PPh Unifikasi',
      dueDate: '2026-11-20',
      status: 'Upcoming',
      assignee: 'Bambang Soeprapto, BKP',
      regulationBasis: 'UU KUP Pasal 3 ayat (3)',
      description: 'Pelaporan bukti potong PPh 23, PPh 4(2), dan e-SKD PPh 26 via e-Bupot Unifikasi.',
    },
    {
      id: 'EVT-03',
      title: 'Penyetoran & Pelaporan SPT Masa PPN 1111',
      jurisdiction: '🇮🇩 Indonesia (DJP)',
      entityName: 'PT Nusantara Kreasi Digital Tbk',
      taxType: 'PPN Masa',
      dueDate: '2026-11-30',
      status: 'Upcoming',
      assignee: 'Sri Mulyani Dewi, S.E., CA',
      regulationBasis: 'UU KUP Pasal 3 ayat (3) huruf a',
      description: 'Pelaporan Faktur Pajak Keluaran & Masukan Masa Oktober 2026 di Web e-Faktur Coretax.',
    },
    {
      id: 'EVT-04',
      title: 'Section 45 Non-Resident Withholding Tax Filing',
      jurisdiction: '🇸🇬 Singapore (IRAS)',
      entityName: 'Nusantara FinTech Pte. Ltd.',
      taxType: 'Singapore WHT',
      dueDate: '2026-11-15',
      status: 'Upcoming',
      assignee: 'Lim Wei Ling, SCTP',
      regulationBasis: 'Singapore Income Tax Act Section 45',
      description: 'Monthly electronic filing for foreign technical services & intercompany fees.',
    },
    {
      id: 'EVT-05',
      title: 'Corporate Income Tax (Form C-S / Form C Filing)',
      jurisdiction: '🇸🇬 Singapore (IRAS)',
      entityName: 'Nusantara FinTech Pte. Ltd.',
      taxType: 'Singapore CIT',
      dueDate: '2026-11-30',
      status: 'Upcoming',
      assignee: 'Lim Wei Ling, SCTP',
      regulationBasis: 'IRAS Statutory e-Filing Deadline',
      description: 'Annual corporate tax return submission for Year of Assessment 2027.',
    },
    {
      id: 'EVT-06',
      title: 'Penyetoran PPh 23 Jasa Manajemen Masa September (TERLAMBAT)',
      jurisdiction: '🇮🇩 Indonesia (DJP)',
      entityName: 'PT Nusantara Kreasi Digital Tbk',
      taxType: 'PPh 23',
      dueDate: '2026-10-10',
      status: 'Overdue',
      assignee: 'Bambang Soeprapto, BKP',
      regulationBasis: 'Pasal 9 ayat (2a) UU KUP',
      description: 'Keterlambatan penyetoran PPh 23 dikenakan tarif bunga KMK 1.75% per bulan.',
    },
  ]);

  React.useEffect(() => {
    if (initialEvents && initialEvents.length > 0) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('2026-11-15');
  const [newAssignee, setNewAssignee] = useState('Bambang Soeprapto, BKP');
  const [newTaxType, setNewTaxType] = useState('PPh Unifikasi');

  const filtered = events.filter((e) => filterTaxType === 'ALL' || e.taxType === filterTaxType);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: CalendarEvent = {
      id: `EVT-${Date.now().toString().slice(-4)}`,
      title: newTitle,
      jurisdiction: countryCode === 'ID' ? '🇮🇩 Indonesia (DJP)' : '🇸🇬 Singapore (IRAS)',
      entityName: entityName,
      taxType: newTaxType,
      dueDate: newDate,
      status: 'Upcoming',
      assignee: newAssignee,
      regulationBasis: 'Tugas Kepatuhan Internal Grup',
      description: 'Tugas pengawasan tenggat kepatuhan perpajakan.',
    };

    const nextEvents = [...events, newEntry];
    setEvents(nextEvents);
    setShowTaskModal(false);
    setNewTitle('');
    onDataChange?.(nextEvents);
    onTriggerToast?.('Tugas tenggat kepatuhan baru berhasil ditambahkan ke kalender.');
  };

  // Real .ics Calendar File Exporter
  const handleExportICS = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Nexora Tax Compliance//Statutory Calendar//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    events.forEach((ev) => {
      const dateClean = ev.dueDate.replace(/-/g, '');
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${ev.id}@nexora.ai`,
        `DTSTAMP:${dateClean}T090000Z`,
        `DTSTART;VALUE=DATE:${dateClean}`,
        `SUMMARY:[Pajak] ${ev.title} (${ev.entityName})`,
        `DESCRIPTION:${ev.description} - Dasar: ${ev.regulationBasis}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nexora-Tax-Calendar-${countryCode}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onTriggerToast?.('Kalender pajak berhasil diekspor sebagai file .ics (kompatibel Google Calendar / Outlook).');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                STATUTORY TAX DEADLINE CALENDAR
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Otoritas DJP, IRAS, LHDN & IRS
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Kalender Kepatuhan & Tenggat Pajak Multinasional
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleExportICS}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Unduh file .ics kalender"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Kalender (.ics)</span>
            </button>
            <button
              onClick={() => setShowTaskModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Tugas Tenggat</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-2 border-t border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Filter Jenis Pajak:</span>
            <select
              value={filterTaxType}
              onChange={(e) => setFilterTaxType(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-300 font-semibold"
            >
              <option value="ALL">Semua Kewajiban</option>
              <option value="PPh Unifikasi">PPh Unifikasi (21/23/4(2)/26)</option>
              <option value="PPN Masa">PPN Masa (11%)</option>
              <option value="Singapore CIT">Singapore CIT (Form C-S)</option>
              <option value="Singapore WHT">Singapore Section 45 WHT</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Daftar Tenggat
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                viewMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Tampilan Kalender Bulan
            </button>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`p-5 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              item.status === 'Overdue' ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                  {item.jurisdiction}
                </span>
                <h3 className="font-semibold text-slate-900 text-sm">{item.title}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    item.status === 'Overdue'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : item.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <p className="text-slate-600 leading-relaxed">{item.description}</p>

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                <span>Entitas: <strong className="text-slate-700">{item.entityName}</strong></span>
                <span>PIC: <strong className="text-slate-700">{item.assignee}</strong></span>
                <span className="text-blue-700 font-semibold">{item.regulationBasis}</span>
              </div>
            </div>

            <div className="flex items-center md:flex-col items-end justify-between md:justify-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Batas Waktu</span>
                <span className="text-sm font-mono font-semibold text-slate-900">{item.dueDate}</span>
              </div>
              <button
                type="button"
                onClick={() => onTriggerToast?.(`Pengingat disetel untuk ${item.title}`)}
                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold cursor-pointer"
              >
                Set Pengingat
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 text-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              Buat Tugas Tenggat Pajak Baru
            </h3>
            <form onSubmit={handleAddTask} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Judul Tugas</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Setor PPN Masa November 2026"
                  className="w-full p-2 rounded border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jenis Kewajiban</label>
                <input
                  type="text"
                  value={newTaxType}
                  onChange={(e) => setNewTaxType(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Jatuh Tempo</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Penanggung Jawab (PIC)</label>
                <input
                  type="text"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold cursor-pointer"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
