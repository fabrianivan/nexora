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

/** Stat tile: label · value · optional delta & hint. */
export function Stat({
  label,
  value,
  hint,
  delta,
  icon,
  tone,
  className,
  onClick,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: { value: string; good: boolean } | null;
  icon?: React.ReactNode;
  tone?: 'danger' | 'warning' | 'success' | 'brand';
  className?: string;
  onClick?: () => void;
}) {
  const accent = tone
    ? { danger: 'text-danger-600', warning: 'text-warning-600', success: 'text-success-600', brand: 'text-brand-600' }[tone]
    : 'text-ink-3';
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'text-left bg-surface border border-line rounded-xl shadow-xs px-5 py-4 min-w-0',
        onClick && 'cursor-pointer hover:border-line-strong hover:shadow-sm transition',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-ink-3 truncate">{label}</span>
        {icon && <span className={cn('[&_svg]:size-4 shrink-0', accent)}>{icon}</span>}
      </div>
      <div className="mt-2 text-[26px] leading-8 font-semibold text-ink tracking-tight truncate">{value}</div>
      {(delta || hint) && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          {delta && (
            <span className={cn('font-medium num', delta.good ? 'text-success-700' : 'text-danger-700')}>{delta.value}</span>
          )}
          {hint && <span className="text-ink-3 truncate">{hint}</span>}
        </div>
      )}
    </Comp>
  );
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
