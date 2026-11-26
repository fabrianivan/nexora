'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ActionLink, NextStep } from '@/ui';
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
          <ActionLink href={info.next.href} iconRight={<ArrowRight />}>
            Langkah {info.next.step} · {info.next.label}
          </ActionLink>
        )
      }
    />
  );
}
