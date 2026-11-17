'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from './cn';

/* ==========================================================================
   Figures strip — the few numbers a module is accountable for, set like the
   key-figures line of an annual report: a heavy ink rule on top, hairline
   columns, serif figures, small-caps labels. No boxes, no dark slabs.
   ========================================================================== */

export type BandTone = 'danger' | 'warning' | 'success' | 'brand';
/** Kept for compatibility; both variants now render the same editorial strip. */
export type BandVariant = 'dark' | 'light';

export type BandMetric = {
  label: React.ReactNode;
  value: React.ReactNode;
  /** One line of context under the value. */
  detail?: React.ReactNode;
  icon?: React.ReactNode;
  /** Navigating cells render as links; `onClick` cells render as buttons. */
  href?: string;
  onClick?: () => void;
  /** Tints the value. Use only when the number itself carries the severity. */
  tone?: BandTone;
  /** For reference facts (an identifier, a currency) rather than figures. */
  compact?: boolean;
  /** Renders the value in the mono face — for tax IDs and document numbers. */
  mono?: boolean;
};

const VALUE_TONE: Record<BandTone, string> = {
  danger: 'text-danger-600',
  warning: 'text-warning-600',
  success: 'text-success-600',
  brand: 'text-brand-600',
};

const DOT_TONE: Record<BandTone, string> = {
  danger: 'bg-danger-500',
  warning: 'bg-warning-500',
  success: 'bg-success-500',
  brand: 'bg-brand-500',
};

/** Thin circular gauge with a serif figure. */
export function ComplianceRing({
  value,
  max = 100,
  tone,
  caption,
  label,
  size = 84,
}: {
  value: number;
  max?: number;
  tone: 'emerald' | 'amber' | 'rose';
  /** Small text under the number — defaults to `/ max`. */
  caption?: React.ReactNode;
  /** Accessible description of what the dial measures. */
  label?: string;
  size?: number;
}) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const offset = circumference - (pct / 100) * circumference;
  const stroke = {
    emerald: 'var(--color-success-500)',
    amber: 'var(--color-warning-500)',
    rose: 'var(--color-danger-500)',
  }[tone];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 96 96" className="size-full -rotate-90" role="img" aria-label={label ?? `${value} dari ${max}`}>
        <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--color-line)" strokeWidth="3" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="figure text-[28px] leading-none text-ink">{value}</span>
        <span className="mt-1 text-[10px] uppercase tracking-wider text-ink-4">{caption ?? `/ ${max}`}</span>
      </span>
    </div>
  );
}

/** The strip's left panel: what this module is looking at right now. */
export function BandLead({
  eyebrow,
  title,
  detail,
  visual,
  tone,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  detail?: React.ReactNode;
  /** A `ComplianceRing`, a flag, or an icon. */
  visual?: React.ReactNode;
  /** Shows a status dot before the title. */
  tone?: BandTone;
}) {
  return (
    <div className="flex items-center gap-5 border-b border-line py-5 pr-6 lg:border-b-0 lg:border-r">
      {visual}
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <p className="mt-1 flex items-center gap-2 font-serif text-[22px] leading-7 text-ink">
          {tone && <span className={cn('size-2 shrink-0 rounded-full', DOT_TONE[tone])} />}
          <span className="min-w-0 truncate">{title}</span>
        </p>
        {detail && <p className="mt-1 text-[13px] leading-5 text-ink-3">{detail}</p>}
      </div>
    </div>
  );
}

function BandCell({ metric }: { metric: BandMetric }) {
  const interactive = Boolean(metric.href || metric.onClick);
  // Full Rupiah amounts are long; step the figure down so it never wraps.
  const text = typeof metric.value === 'string' || typeof metric.value === 'number' ? String(metric.value) : '';
  const size = text.length > 15 ? 'text-[22px]' : text.length > 11 ? 'text-[27px]' : 'text-[34px]';
  const body = (
    <>
      <span className="eyebrow flex items-center gap-1.5 pr-5">
        <span className="min-w-0 truncate">{metric.label}</span>
      </span>
      <span
        className={cn(
          'mt-1.5',
          metric.compact ? 'text-[15px] leading-6 font-medium truncate' : cn('figure leading-[1.15] whitespace-nowrap', size),
          metric.mono && 'font-mono',
          metric.tone ? VALUE_TONE[metric.tone] : 'text-ink',
        )}
      >
        {metric.value}
      </span>
      {metric.detail && <span className="mt-1 line-clamp-2 text-xs leading-5 text-ink-3">{metric.detail}</span>}
      {interactive && (
        <ArrowUpRight className="absolute right-4 top-5 size-3.5 text-ink-4 transition-colors group-hover:text-ink" />
      )}
    </>
  );

  const shell = cn(
    'group relative flex min-w-0 flex-col justify-start py-5 pr-5 sm:pl-5 sm:first:pl-0',
    interactive && 'text-left transition-colors hover:bg-subtle',
  );

  if (metric.href) {
    return (
      <Link href={metric.href} className={shell}>
        {body}
      </Link>
    );
  }
  if (metric.onClick) {
    return (
      <button type="button" onClick={metric.onClick} className={shell}>
        {body}
      </button>
    );
  }
  return <div className={shell}>{body}</div>;
}

export function MetricBand({
  label,
  lead,
  metrics,
  footnote,
  className,
}: {
  /** Accessible name for the region, e.g. "Posisi kepatuhan grup". */
  label: string;
  lead?: React.ReactNode;
  metrics: BandMetric[];
  /** Hairline strip under the metrics for provenance or an FX note. */
  footnote?: React.ReactNode;
  className?: string;
  /** Accepted for compatibility; ignored. */
  variant?: BandVariant;
}) {
  const cols =
    metrics.length >= 4
      ? 'divide-y md:divide-y-0 md:grid-cols-4 md:divide-x'
      : metrics.length === 3
        ? 'divide-y sm:divide-y-0 sm:grid-cols-3 sm:divide-x'
        : metrics.length === 2
          ? 'divide-y sm:divide-y-0 sm:grid-cols-2 sm:divide-x'
          : '';
  return (
    <section aria-label={label} className={cn('border-t-2 border-ink border-b border-b-line', className)}>
      <div className={cn('grid', lead ? 'lg:grid-cols-[minmax(280px,340px)_1fr]' : undefined)}>
        {lead}
        <div className={cn('grid divide-line', cols, lead ? 'lg:[&>*:first-child]:pl-5' : undefined)}>
          {metrics.map((m, i) => (
            <BandCell key={i} metric={m} />
          ))}
        </div>
      </div>
      {footnote && <div className="border-t border-line py-2.5 text-[11px] text-ink-3">{footnote}</div>}
    </section>
  );
}
