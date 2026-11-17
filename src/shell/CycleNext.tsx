'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { NextStep } from '@/ui';
import { useWorkspace } from '@/state/workspace';
import { useNextStep } from './cycle';

/** The "Berikutnya" line under a cycle page's lede. */
export function CycleNext({ current }: { current: string }) {
  const ws = useWorkspace();
  const info = useNextStep(current);
  const entity = ws.activeEntity;
  return (
    <NextStep
      tone={info.pending ? 'attention' : 'done'}
      label={info.label}
      detail={`${entity.flag} ${entity.legalName}`}
      action={
        info.next && (
          <Link href={info.next.href} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:text-brand-900">
            Langkah {info.next.step} · {info.next.label} <ArrowRight className="size-3.5" />
          </Link>
        )
      }
    />
  );
}
