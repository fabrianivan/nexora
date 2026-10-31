import React from 'react';
import { cn } from './cn';

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && <div className="mb-1.5 text-[13px] text-ink-3 flex items-center gap-2">{eyebrow}</div>}
          <h1 className="text-2xl font-semibold text-ink text-balance">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
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
      {icon && <div className="mb-3 size-10 rounded-xl bg-muted text-ink-3 flex items-center justify-center [&_svg]:size-5">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
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
    brand: 'bg-brand-50 border-brand-200/70 text-brand-900 [&_[data-icon]]:text-brand-600',
    warning: 'bg-warning-50 border-warning-100 text-warning-700 [&_[data-icon]]:text-warning-600',
    danger: 'bg-danger-50 border-danger-100 text-danger-700 [&_[data-icon]]:text-danger-600',
    success: 'bg-success-50 border-success-100 text-success-700 [&_[data-icon]]:text-success-600',
    neutral: 'bg-subtle border-line text-ink-2 [&_[data-icon]]:text-ink-3',
  }[tone];
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px]', tones, className)}>
      {icon && <span data-icon className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span>}
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title ? 'mt-0.5' : '', 'opacity-90')}>{children}</div>}
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
          <dt className="text-xs text-ink-3">{it.label}</dt>
          <dd className={cn('mt-0.5 text-sm text-ink break-words', it.mono && 'font-mono')}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
