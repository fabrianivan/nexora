import React from 'react';
import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  helper?: React.ReactNode;
  tone?: 'brand' | 'success' | 'warning' | 'neutral';
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  helper,
  tone = 'neutral',
  className = '',
}: StatCardProps) {
  const toneMap: Record<'brand' | 'success' | 'warning' | 'neutral', { iconBg: string; iconColor: string }> = {
    brand: { iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    success: { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    warning: { iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
    neutral: { iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
  };

  const { iconBg, iconColor } = toneMap[tone];

  return (
    <Card padding="sm" className={`flex items-center gap-4 ${className}`}>
      {icon && (
        <div className={`w-11 h-11 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
          {value}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block truncate">
          {label}
        </span>
        {helper && <div className="text-xs text-slate-400 mt-0.5">{helper}</div>}
      </div>
    </Card>
  );
}
