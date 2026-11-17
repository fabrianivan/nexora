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
    <nav data-no-print aria-label="Langkah siklus" className="mt-16 pt-5 border-t-2 border-ink grid grid-cols-1 sm:grid-cols-2 gap-6">
      {prev ? (
        <Link href={prev.href} className="group">
          <span className="eyebrow inline-flex items-center gap-1.5"><ArrowLeft className="size-3" /> Langkah {prev.step}</span>
          <span className="block mt-1 font-serif text-[22px] text-ink group-hover:underline underline-offset-4 decoration-1">{prev.label}</span>
        </Link>
      ) : <span />}
      {next && (
        <Link href={next.href} className="group sm:text-right">
          <span className="eyebrow inline-flex items-center gap-1.5">Langkah {next.step} <ArrowRight className="size-3" /></span>
          <span className="block mt-1 font-serif text-[22px] text-ink group-hover:underline underline-offset-4 decoration-1">{next.label}</span>
          <span className="block text-xs text-ink-3 mt-0.5">{status[next.href]?.hint}</span>
        </Link>
      )}
    </nav>
  );
}
