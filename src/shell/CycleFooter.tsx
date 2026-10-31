'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { CYCLE } from './nav';
import { useCycleStatus } from './cycle';

/** Previous / next step links at the bottom of each compliance-cycle page. */
export function CycleFooter({ current }: { current: string }) {
  const status = useCycleStatus();
  const idx = CYCLE.findIndex((c) => c.href === current);
  if (idx < 0) return null;
  const prev = CYCLE[idx - 1];
  const next = CYCLE[idx + 1];
  return (
    <div data-no-print className="mt-10 pt-6 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-3">
      {prev ? (
        <Link href={prev.href} className="group rounded-xl border border-line bg-surface px-4 py-3 hover:border-line-strong transition">
          <span className="flex items-center gap-1.5 text-xs text-ink-3"><ArrowLeft className="size-3.5" /> Langkah {prev.step}</span>
          <span className="block mt-0.5 text-sm font-medium text-ink">{prev.label}</span>
        </Link>
      ) : <span />}
      {next && (
        <Link href={next.href} className="group rounded-xl border border-line bg-surface px-4 py-3 hover:border-line-strong transition sm:text-right">
          <span className="flex items-center sm:justify-end gap-1.5 text-xs text-ink-3">Langkah {next.step} <ArrowRight className="size-3.5" /></span>
          <span className="block mt-0.5 text-sm font-medium text-ink">{next.label}</span>
          <span className="block text-xs text-ink-3 mt-0.5">{status[next.href]?.hint}</span>
        </Link>
      )}
    </div>
  );
}
