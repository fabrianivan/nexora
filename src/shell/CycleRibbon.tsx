'use client';

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/ui';
import { CYCLE } from './nav';
import { useCycleStatus } from './cycle';

/**
 * The compliance cycle as one horizontal line: what is done, where the team is now,
 * and what comes next. The first unfinished step carries the highlighter.
 */
export function CycleRibbon() {
  const status = useCycleStatus();
  const currentIdx = CYCLE.findIndex((c) => !status[c.href]?.done);
  return (
    <ol className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-px bg-line border-y border-line" aria-label="Siklus kepatuhan">
      {CYCLE.map((step, i) => {
        const st = status[step.href];
        const done = Boolean(st?.done);
        const current = i === currentIdx;
        return (
          <li key={step.href} className={cn('bg-canvas', current && 'bg-mark-soft/70')}>
            <Link
              href={step.href}
              aria-current={current ? 'step' : undefined}
              className={cn('group block h-full px-4 py-4 border-t-2 transition-colors hover:bg-surface/70', done ? 'border-success-500' : current ? 'border-ink' : 'border-transparent')}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn('figure text-[30px] leading-none', done ? 'text-success-600' : current ? 'text-ink' : 'text-ink-4')}>{String(step.step).padStart(2, '0')}</span>
                {done ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success-700"><Check className="size-3" strokeWidth={2.5} /> Beres</span>
                ) : current ? (
                  <span className="eyebrow !text-[10px] !text-ink">Sekarang</span>
                ) : null}
              </div>
              <div className="mt-2 text-[14px] font-medium text-ink group-hover:underline underline-offset-2">{step.label}</div>
              <div className={cn('mt-0.5 text-xs leading-snug', done ? 'text-ink-3' : st?.tone === 'danger' ? 'text-danger-600' : 'text-ink-2')}>{st?.hint}</div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
