'use client';

/**
 * Lightweight SVG charts following the Nexora dataviz rules:
 * thin marks (≤24px bars, 4px rounded data-end), hairline recessive grid,
 * one axis, text in ink tokens (never series colour), hover/focus tooltips,
 * legend for ≥2 series, and an accessible table fallback via aria/sr-only.
 */
import React, { useMemo, useState } from 'react';
import { cn } from './cn';

export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'] as const; // categorical slots 1-4 (validated order)
export const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' } as const;

function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * exp;
}

/** Rounded-top column path: 4px radius at the data end, square at the baseline. */
function colPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

export interface ColumnSeries {
  name: string;
  color: string;
  values: number[];
}

export function ColumnChart({
  categories,
  series,
  format,
  height = 220,
  className,
  title,
}: {
  categories: string[];
  series: ColumnSeries[];
  format: (v: number) => string;
  height?: number;
  className?: string;
  title: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const pad = { top: 12, right: 8, bottom: 26, left: 52 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const band = innerW / categories.length;
  const gap = 2;
  const barW = Math.min(24, (band * 0.6 - gap * (series.length - 1)) / series.length);
  const groupW = barW * series.length + gap * (series.length - 1);
  const compact = (v: number) => format(v);

  return (
    <div className={cn('relative', className)}>
      {series.length > 1 && (
        <div className="flex flex-wrap items-center gap-4 mb-2 text-xs text-ink-2">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible" role="img" aria-label={title}>
        {ticks.map((t) => {
          const y = pad.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--color-line)" strokeWidth={1} />
              <text x={pad.left - 8} y={y} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--color-ink-3)" className="num">
                {compact(t)}
              </text>
            </g>
          );
        })}
        {categories.map((c, i) => {
          const gx = pad.left + band * i + (band - groupW) / 2;
          const active = hover === i;
          return (
            <g
              key={c}
              tabIndex={0}
              role="button"
              aria-label={`${c}: ${series.map((s) => `${s.name} ${format(s.values[i])}`).join(', ')}`}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="outline-none cursor-default"
            >
              <rect x={pad.left + band * i} y={pad.top} width={band} height={innerH} fill={active ? 'var(--color-muted)' : 'transparent'} rx={6} />
              {series.map((s, si) => {
                const h = (s.values[i] / max) * innerH;
                const x = gx + si * (barW + gap);
                return <path key={s.name} d={colPath(x, pad.top + innerH - h, barW, h)} fill={s.color} opacity={hover === null || active ? 1 : 0.55} />;
              })}
              <text x={pad.left + band * i + band / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--color-ink-3)">
                {c}
              </text>
            </g>
          );
        })}
        <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="var(--color-line-strong)" strokeWidth={1} />
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-surface border border-line shadow-lg px-3 py-2 text-xs min-w-32"
          style={{ left: `${((pad.left + band * hover + band / 2) / width) * 100}%`, top: 0 }}
        >
          <div className="text-ink-3 mb-1">{categories[hover]}</div>
          {series.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-ink-3">
                <span className="w-3 h-0.5 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
              <span className="font-semibold text-ink num">{format(s.values[hover])}</span>
            </div>
          ))}
        </div>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Kategori</th>
            {series.map((s) => (
              <th key={s.name}>{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((c, i) => (
            <tr key={c}>
              <td>{c}</td>
              {series.map((s) => (
                <td key={s.name}>{format(s.values[i])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Horizontal bar list — one series, value at the tip. */
export function BarList({
  items,
  format,
  color = 'var(--color-brand-500)',
  className,
}: {
  items: { label: React.ReactNode; value: number; key: string; meta?: React.ReactNode; color?: string; onClick?: () => void }[];
  format: (v: number) => string;
  color?: string;
  className?: string;
}) {
  const max = useMemo(() => Math.max(1, ...items.map((i) => i.value)), [items]);
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((it) => (
        <li key={it.key}>
          <button
            type="button"
            onClick={it.onClick}
            disabled={!it.onClick}
            className="w-full text-left group disabled:cursor-default cursor-pointer"
            title={`${typeof it.label === 'string' ? it.label : ''} ${format(it.value)}`}
          >
            <div className="flex items-center justify-between gap-3 text-[13px] mb-1.5">
              <span className="text-ink-2 truncate group-enabled:group-hover:text-ink">{it.label}</span>
              <span className="text-ink font-medium num shrink-0">{format(it.value)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: it.color ?? color }} />
            </div>
            {it.meta && <div className="mt-1 text-xs text-ink-3">{it.meta}</div>}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Stacked 100% bar for a small number of named parts (with legend). */
export function StackBar({
  parts,
  className,
}: {
  parts: { key: string; label: string; value: number; color: string }[];
  className?: string;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className={className}>
      <div className="flex h-2.5 w-full gap-[2px] rounded-full overflow-hidden bg-muted" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(', ')}>
        {parts.filter((p) => p.value > 0).map((p) => (
          <div key={p.key} title={`${p.label}: ${p.value}`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} className="h-full first:rounded-l-full last:rounded-r-full" />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {parts.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: p.color }} />
            {p.label} <span className="text-ink font-medium num">{p.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Tiny trend line, de-emphasised with the last point accented. */
export function Sparkline({ values, className, label }: { values: number[]; className?: string; label: string }) {
  const w = 100;
  const h = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 4) + 2, h - 3 - ((v - min) / span) * (h - 6)] as const);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('w-24 h-7', className)} role="img" aria-label={label}>
      <path d={d} fill="none" stroke="var(--color-ink-4)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={3} fill="var(--color-brand-500)" stroke="white" strokeWidth={1.5} />
    </svg>
  );
}
