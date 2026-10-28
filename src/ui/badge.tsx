import React from 'react';
import { cn } from './cn';

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'dark';

const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-ink-2 ring-line',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200/70',
  success: 'bg-success-50 text-success-700 ring-success-100',
  warning: 'bg-warning-50 text-warning-700 ring-warning-100',
  danger: 'bg-danger-50 text-danger-700 ring-danger-100',
  dark: 'bg-ink text-white ring-ink',
};

const DOTS: Record<Tone, string> = {
  neutral: 'bg-ink-4',
  brand: 'bg-brand-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  dark: 'bg-white',
};

export function Badge({
  tone = 'neutral',
  dot,
  className,
  children,
  title,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 h-[22px] px-2 rounded-md text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', DOTS[tone])} />}
      {children}
    </span>
  );
}

export function StatusDot({ tone = 'success', pulse }: { tone?: Tone; pulse?: boolean }) {
  return (
    <span className="relative inline-flex size-2">
      {pulse && <span className={cn('absolute inset-0 rounded-full animate-ping opacity-50', DOTS[tone])} />}
      <span className={cn('relative size-2 rounded-full', DOTS[tone])} />
    </span>
  );
}
