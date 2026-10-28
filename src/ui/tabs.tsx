'use client';

import React from 'react';
import { cn } from './cn';

export interface TabItem<T extends string> {
  id: T;
  label: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
}

/** Underline tabs — for switching sections of a page. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('flex items-center gap-1 border-b border-line overflow-x-auto scrollbar-none', className)}>
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              'relative inline-flex items-center gap-2 h-10 px-3 text-sm whitespace-nowrap transition-colors cursor-pointer [&_svg]:size-4',
              active ? 'text-ink font-medium' : 'text-ink-3 hover:text-ink',
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className={cn('min-w-5 h-5 px-1.5 rounded-full text-[11px] font-medium inline-flex items-center justify-center num', active ? 'bg-ink text-white' : 'bg-muted text-ink-3')}>
                {t.count}
              </span>
            )}
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink" />}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented control — for filters / view modes. */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  className,
  size = 'md',
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" className={cn('inline-flex items-center p-0.5 rounded-lg bg-muted border border-line', className)}>
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(t.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md whitespace-nowrap transition cursor-pointer [&_svg]:size-3.5',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              active ? 'bg-surface text-ink font-medium shadow-sm ring-1 ring-line' : 'text-ink-3 hover:text-ink',
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && <span className="text-ink-4 num">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
