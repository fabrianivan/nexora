'use client';

import React from 'react';
import { Cpu, Sparkles } from 'lucide-react';
import type { EngineBadge } from '@/lib/ai/badge';
import { cn } from '@/ui';

/**
 * Which engine produced an AI output. Shown next to every AI result so a reviewer
 * can tell a live model from the local simulation or a fallback.
 */
export function EngineTag({ engine, className }: { engine: EngineBadge; className?: string }) {
  const live = engine.mode === 'live';
  const title = [engine.model, engine.notice].filter(Boolean).join(' · ');
  return (
    <span
      title={title || undefined}
      className={cn(
        'inline-flex items-center gap-1 h-5 px-1.5 rounded-md text-[11px] font-medium ring-1 ring-inset whitespace-nowrap',
        live ? 'bg-brand-50 text-brand-700 ring-brand-200/70' : engine.fallback ? 'bg-warning-50 text-warning-700 ring-warning-100' : 'bg-muted text-ink-3 ring-line',
        className,
      )}
    >
      {live ? <Sparkles className="size-3" aria-hidden /> : <Cpu className="size-3" aria-hidden />}
      {engine.label}
    </span>
  );
}
