import React from 'react';
import { cn } from './cn';

export function Avatar({ initials, className, size = 'md' }: { initials: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'size-6 text-[10px]', md: 'size-8 text-xs', lg: 'size-10 text-sm' }[size];
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0', s, className ?? 'bg-ink')}>
      {initials}
    </span>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex items-center h-5 px-1.5 rounded border border-line bg-subtle text-[11px] font-sans text-ink-3">{children}</kbd>;
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-line', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

/** Linear meter. The fill carries severity; the track is a lighter step of the same ramp. */
export function Meter({ value, max = 100, tone = 'brand', className, label }: { value: number; max?: number; tone?: 'brand' | 'success' | 'warning' | 'danger'; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = { brand: 'bg-brand-500', success: 'bg-success-500', warning: 'bg-warning-500', danger: 'bg-danger-500' }[tone];
  const track = { brand: 'bg-brand-100', success: 'bg-success-100', warning: 'bg-warning-100', danger: 'bg-danger-100' }[tone];
  return (
    <div className={cn('h-1.5 w-full rounded-full overflow-hidden', track, className)} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Flag({ code, className }: { code: string; className?: string }) {
  const flags: Record<string, string> = { ID: '🇮🇩', SG: '🇸🇬', MY: '🇲🇾', US: '🇺🇸' };
  return <span className={cn('leading-none', className)} aria-hidden>{flags[code] ?? '🏳️'}</span>;
}
