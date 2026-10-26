'use client';

import React, { useState } from 'react';
import { 
  Bell, 
  ShieldAlert, 
  Clock, 
  FileCheck2, 
  X,
  CheckCheck,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  type: 'fraud' | 'approval' | 'deadline';
  categoryLabel: string;
  targetNav: { primaryNav: string; subNav?: string; corpTab?: string };
  read: boolean;
}

export interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (primaryNav: string, subNav?: string, corpTab?: string) => void;
}

export function NotificationCenter({ isOpen, onClose, onNavigate }: NotificationCenterProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'fraud'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'NOTIF-01',
      title: 'Temuan Risiko Kritis: Faktur Pajak TBTS',
      message: 'CV Mega Suplai Abadi teridentifikasi dalam daftar pengawasan DJP (Pasal 39A UU KUP). Rekomendasi: Blokir pengkreditan PPN.',
      timeAgo: '15 menit lalu',
      type: 'fraud',
      categoryLabel: 'Risiko TBTS Pasal 39A',
      targetNav: { primaryNav: 'companies', subNav: 'studies' },
      read: false,
    },
    {
      id: 'NOTIF-02',
      title: 'Draf SPT 1771 Menunggu Persetujuan Checker',
      message: 'Konsultan Pajak telah menyelesaikan draf SPT 1771 Tahun 2026. Diperlukan sign-off Head of Tax / Group CEO.',
      timeAgo: '1 jam lalu',
      type: 'approval',
      categoryLabel: 'Sign-Off SPT 1771',
      targetNav: { primaryNav: 'tax_return' },
      read: false,
    },
    {
      id: 'NOTIF-03',
      title: 'Tenggat Waktu: Setor PPh Unifikasi & 21 TER',
      message: 'Batas waktu penyetoran PPh 21 TER masa Oktober 2026 jatuh tempo pada 10 November 2026.',
      timeAgo: '3 jam lalu',
      type: 'deadline',
      categoryLabel: 'Statutory Deadline',
      targetNav: { primaryNav: 'companies', subNav: 'calendar' },
      read: true,
    },
  ]);

  if (!isOpen) return null;

  const handleItemClick = (item: NotificationItem) => {
    setNotifications(
      notifications.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    onNavigate(item.targetNav.primaryNav, item.targetNav.subNav, item.targetNav.corpTab);
    onClose();
  };

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'unread') return !item.read;
    if (activeFilter === 'fraud') return item.type === 'fraud';
    return true;
  });

  return (
    <>
      {/* Outside Click Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px] transition-opacity" 
        onClick={onClose} 
      />

      {/* Popover Container: Perfectly Sized and Centered */}
      <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:top-full sm:mt-2.5 sm:left-1/2 sm:-translate-x-1/2 z-50 sm:w-[460px] md:w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden text-xs transform transition-all">
        
        {/* Subtle Top Arrow Pointer on Desktop */}
        <div className="hidden sm:block absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-50 border-t border-l border-slate-200/90 transform rotate-45 z-10" />

        {/* Header Bar */}
        <div className="relative p-4 bg-slate-50/90 border-b border-slate-200/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-100/80 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-xs tracking-tight">
                  Pusat Notifikasi Kepatuhan
                </h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-black leading-none">
                    {unreadCount} baru
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                Monitoring Pajak Multi-Negara &amp; Deteksi Fraud Real-Time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer flex items-center gap-1 px-1.5 py-1 rounded-md transition"
                title="Tandai semua notifikasi telah dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tandai dibaca</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/60 cursor-pointer transition"
              title="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-1.5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Semua ({notifications.length})
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
              activeFilter === 'unread'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Belum Dibaca ({unreadCount})
          </button>
          <button
            onClick={() => setActiveFilter('fraud')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
              activeFilter === 'fraud'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Risiko Fraud
          </button>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-slate-100 max-h-88 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="py-10 text-center px-4 space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800">Tidak ada notifikasi dalam kategori ini</p>
              <p className="text-[11px] text-slate-500">Semua kewajiban dan risiko kepatuhan dalam status terkendali.</p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-start gap-3 relative group ${
                  !item.read ? 'bg-rose-50/25' : 'bg-white'
                }`}
              >
                {/* Unread Accent Pill */}
                {!item.read && (
                  <span className="absolute left-1 top-4 bottom-4 w-1 bg-rose-600 rounded-full" />
                )}

                {/* Left Category Icon */}
                <div className="shrink-0 mt-0.5 pl-1.5">
                  {item.type === 'fraud' && (
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-2xs">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                  )}
                  {item.type === 'approval' && (
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-2xs">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                  )}
                  {item.type === 'deadline' && (
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
                      <Clock className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Main Card Body */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  {/* Category Pill & Relative Time */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                      item.type === 'fraud'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : item.type === 'approval'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {item.categoryLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold shrink-0 whitespace-nowrap">
                      {item.timeAgo}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className={`text-xs font-bold leading-snug ${
                    !item.read ? 'text-slate-950 font-black' : 'text-slate-800'
                  }`}>
                    {item.title}
                  </h4>

                  {/* Message Description */}
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {item.message}
                  </p>

                  {/* Footer Action Hint */}
                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    <span className="text-rose-600 font-bold group-hover:text-rose-700 flex items-center gap-1">
                      Buka rincian modul <ChevronRight className="w-3 h-3" />
                    </span>
                    <span className="text-slate-400 font-mono text-[9px] font-semibold">{item.id}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-3 bg-slate-50/90 border-t border-slate-200/90 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-600">Audit Trail SHA-256 Aktif</span>
          </div>
          <button
            onClick={() => {
              onNavigate('companies', 'reports');
              onClose();
            }}
            className="font-bold text-slate-700 hover:text-rose-600 transition cursor-pointer flex items-center gap-1"
          >
            Lihat Log Lengkap &rarr;
          </button>
        </div>
      </div>
    </>
  );
}
