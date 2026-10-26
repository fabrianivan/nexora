'use client';

import React, { useState } from 'react';
import { 
  Bell, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  FileCheck2, 
  X, 
  ArrowRight 
} from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  type: 'fraud' | 'approval' | 'deadline';
  targetNav: { primaryNav: string; subNav?: string; corpTab?: string };
  read: boolean;
}

export interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (primaryNav: any, subNav?: any, corpTab?: any) => void;
}

export function NotificationCenter({ isOpen, onClose, onNavigate }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'NOTIF-01',
      title: 'Temuan Risiko Kritis: Faktur Pajak TBTS',
      message: 'CV Mega Suplai Abadi teridentifikasi dalam daftar pengawasan DJP (Pasal 39A UU KUP). Rekomendasi: Blokir pengkreditan PPN.',
      timeAgo: '15 menit lalu',
      type: 'fraud',
      targetNav: { primaryNav: 'companies', subNav: 'studies' },
      read: false,
    },
    {
      id: 'NOTIF-02',
      title: 'Draf SPT 1771 Menunggu Persetujuan Checker',
      message: 'Konsultan Pajak telah menyelesaikan draf SPT 1771 Tahun 2026. Diperlukan sign-off Head of Tax / Group CEO.',
      timeAgo: '1 jam lalu',
      type: 'approval',
      targetNav: { primaryNav: 'tax_return' },
      read: false,
    },
    {
      id: 'NOTIF-03',
      title: 'Tenggat Waktu: Setor PPh Unifikasi & 21 TER',
      message: 'Batas waktu penyetoran PPh 21 TER masa Oktober 2026 jatuh tempo pada 10 November 2026.',
      timeAgo: '3 jam lalu',
      type: 'deadline',
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

  return (
    <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-xs">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" />
          <h3 className="font-extrabold text-slate-900">Pusat Notifikasi Kepatuhan</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer"
            >
              Tandai dibaca
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
        {notifications.map((item) => (
          <div
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
              !item.read ? 'bg-blue-50/30' : ''
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {item.type === 'fraud' && (
                <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              )}
              {item.type === 'approval' && (
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              )}
              {item.type === 'deadline' && (
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Clock className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className={`font-bold text-slate-900 ${!item.read ? 'text-blue-900' : ''}`}>
                  {item.title}
                </span>
                <span className="text-[10px] text-slate-400">{item.timeAgo}</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">{item.message}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
        <span className="text-[11px] text-slate-500 font-medium">
          Semua notifikasi tertaut ke audit log sistem.
        </span>
      </div>
    </div>
  );
}
