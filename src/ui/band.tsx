import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from './cn';

/* ==========================================================================
   Metric band — the executive summary surface.
   One dark, full-width strip at the top of a module that states the few
   numbers that module is accountable for. Replaces the loose grid of white
   stat tiles so every page opens with the same gesture.
   ========================================================================== */

export type BandTone = 'danger' | 'warning' | 'success' | 'brand';

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
  /** For reference facts (an identifier, a currency) rather than figures: renders the value at text scale. */
  compact?: boolean;
  /** Renders the value in the mono face — for tax IDs and document numbers. */
  mono?: boolean;
};

const VALUE_TONE: Record<BandTone, string> = {
  // 2xl/semibold counts as large text, so these clear WCAG AA (3:1) on --color-ink.
  danger: 'text-danger-500',
  warning: 'text-warning-500',
  success: 'text-success-500',
  brand: 'text-brand-300',
};

const DOT_TONE: Record<BandTone, string> = {
  danger: 'bg-danger-500',
  warning: 'bg-warning-500',
  success: 'bg-success-500',
  brand: 'bg-brand-400',
};

/** Circular score gauge. Reads as a dial on the dark band. */
export function ComplianceRing({
  value,
  max = 100,
  tone,
  caption,
  label,
  size = 92,
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
  const radius = 42;
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
        <circle cx="48" cy="48" r={radius} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="6" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[25px] font-semibold leading-none tracking-tight num">{value}</span>
        <span className="mt-1 text-[10px] uppercase tracking-wider text-white/45">{caption ?? `/ ${max}`}</span>
      </span>
    </div>
  );
}

/**
 * The band's left panel: what this module is looking at right now.
 * Pair a dial or an icon with the headline figure the page is scoped to.
 */
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
  /** A `ComplianceRing`, a flag, or an icon tile. */
  visual?: React.ReactNode;
  /** Shows a status dot before the title. */
  tone?: BandTone;
}) {
  return (
    <div className="flex items-center gap-5 border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
      {visual}
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/45">{eyebrow}</p>
        <p className="mt-1.5 flex items-center gap-2 text-lg font-semibold">
          {tone && <span className={cn('size-2 shrink-0 rounded-full', DOT_TONE[tone])} />}
          <span className="min-w-0 truncate">{title}</span>
        </p>
        {detail && <p className="mt-1 text-[13px] leading-5 text-white/55">{detail}</p>}
      </div>
    </div>
  );
}

function BandCell({ metric }: { metric: BandMetric }) {
  const interactive = Boolean(metric.href || metric.onClick);
  const body = (
    <>
      <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">
        {metric.icon && <span className="[&_svg]:size-3.5 text-white/60">{metric.icon}</span>}
        <span className="min-w-0 truncate">{metric.label}</span>
      </span>
      <span
        className={cn(
          'mt-2 font-semibold tracking-tight',
          // Reference values stay on one line so every cell's label sits on the same baseline.
          metric.compact ? 'text-[15px] leading-6 truncate' : 'text-2xl',
          metric.mono ? 'font-mono' : 'num',
          metric.tone ? VALUE_TONE[metric.tone] : 'text-white',
        )}
      >
        {metric.value}
      </span>
      {metric.detail && (
        // Two lines are always reserved so a wrapping detail cannot push its
        // cell's label off the baseline the other cells share.
        <span className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-white/50">{metric.detail}</span>
      )}
      {interactive && (
        <ArrowUpRight className="absolute right-5 top-5 size-3.5 text-white/20 transition-colors group-hover:text-white/70" />
      )}
    </>
  );

  const shell = cn(
    'group relative flex min-w-0 flex-col justify-center p-5 sm:p-6',
    interactive && 'text-left transition-colors hover:bg-white/[0.045]',
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
}) {
  // The band stays a single horizontal strip once it has room, so the hairlines
  // are always exactly one axis — stacked below the breakpoint, columns above it.
  const cols =
    metrics.length >= 4
      ? 'md:grid-cols-4 md:divide-x md:divide-y-0'
      : metrics.length === 3
        ? 'sm:grid-cols-3 sm:divide-x sm:divide-y-0'
        : metrics.length === 2
          ? 'sm:grid-cols-2 sm:divide-x sm:divide-y-0'
          : '';
  return (
    <section
      aria-label={label}
      className={cn('relative overflow-hidden rounded-2xl border border-ink bg-ink text-white shadow-md', className)}
    >
      <div aria-hidden className="nx-grid pointer-events-none absolute inset-0 opacity-20" />
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-brand-500/25 blur-3xl" />
      <div className={cn('relative grid', lead ? 'lg:grid-cols-[minmax(300px,360px)_1fr]' : undefined)}>
        {lead}
        <div className={cn('grid divide-y divide-white/10', cols)}>
          {metrics.map((m, i) => (
            <BandCell key={i} metric={m} />
          ))}
        </div>
      </div>
      {footnote && (
        <div className="relative border-t border-white/10 px-5 py-2.5 text-[11px] text-white/40 sm:px-6">{footnote}</div>
      )}
    </section>
  );
}
