import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RiskPage } from '@/features/risk/RiskPage';

export const metadata: Metadata = { title: 'Risiko & fraud' };

export default function Page() {
  return (
    <Suspense>
      <RiskPage />
    </Suspense>
  );
}
