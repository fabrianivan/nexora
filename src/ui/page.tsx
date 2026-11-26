import React from 'react';
import { cn } from './cn';

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  next,
  children,
  className,
}: {
  title: React.ReactNode;
  /** The lede: one or two sentences on what this page is for, right now. */
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  /** The single most useful next move on this page (see `NextStep`). */
  next?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-8', className)}>
      {eyebrow && <div className="eyebrow mb-3 flex items-center gap-2">{eyebrow}</div>}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-3xl">
          {/* Steps down on a phone: a fixed 40px headline ate most of the
              first screen before any content. */}
          <h1 className="font-serif text-[30px] sm:text-[35px] lg:text-[40px] leading-[1.05] font-normal text-ink text-balance tracking-[-0.02em]">{title}</h1>
          {description && <p className="mt-3 text-[15px] leading-relaxed text-ink-2 text-pretty max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {next && <div className="mt-5">{next}</div>}
      {children && <div className="mt-6">{children}</div>}
    </header>
  );
}

/**
 * "What to do next" line under a page's lede. One sentence, one link, so every
 * screen answers the question the reviewer actually has.
 */
export function NextStep({
  label,
  detail,
  action,
  tone = 'neutral',
}: {
  label: React.ReactNode;
  detail?: React.ReactNode;
  action?: React.ReactNode;
  tone?: 'neutral' | 'attention' | 'done';
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-line py-2.5 text-[13px]">
      <span
        className={cn(
          'eyebrow !text-[10.5px]',
          tone === 'attention' ? '!text-danger-600' : tone === 'done' ? '!text-success-600' : '',
        )}
      >
        {tone === 'done' ? 'Selesai' : 'Berikutnya'}
      </span>
      <span className="text-ink min-w-0">
        <span className={cn(tone === 'attention' && 'mark')}>{label}</span>
        {detail && <span className="text-ink-3"> · {detail}</span>}
      </span>
      {action && <span className="ml-auto">{action}</span>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-14', className)}>
      {icon && <div className="mb-3 text-ink-4 [&_svg]:size-6">{icon}</div>}
      <p className="font-serif text-[19px] text-ink">{title}</p>
      {description && <p className="mt-1 text-[13px] text-ink-3 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Callout({
  tone = 'brand',
  icon,
  title,
  children,
  action,
  className,
}: {
  tone?: 'brand' | 'warning' | 'danger' | 'success' | 'neutral';
  icon?: React.ReactNode;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    brand: 'bg-brand-50/70 border-brand-500 [&_[data-icon]]:text-brand-600',
    warning: 'bg-warning-50/80 border-warning-500 [&_[data-icon]]:text-warning-600',
    danger: 'bg-danger-50/80 border-danger-500 [&_[data-icon]]:text-danger-600',
    success: 'bg-success-50/80 border-success-500 [&_[data-icon]]:text-success-600',
    neutral: 'bg-subtle border-line-strong [&_[data-icon]]:text-ink-3',
  }[tone];
  return (
    <div className={cn('flex items-start gap-3 rounded-r-md border-l-2 px-4 py-3 text-[13px] text-ink-2', tones, className)}>
      {icon && <span data-icon className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span>}
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium text-ink">{title}</p>}
        {children && <div className={cn(title ? 'mt-0.5' : '')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function DescriptionList({ items, className, columns = 2 }: { items: { label: React.ReactNode; value: React.ReactNode; mono?: boolean }[]; className?: string; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{it.label}</dt>
          <dd className={cn('mt-0.5 text-sm text-ink break-words', it.mono && 'font-mono')}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
