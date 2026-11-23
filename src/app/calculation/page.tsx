import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CalculationPage } from '@/features/calculation/CalculationPage';

export const metadata: Metadata = { title: 'Rekonsiliasi & komputasi pintar' };

export default function Page() {
  return (
    <Suspense>
      <CalculationPage />
    </Suspense>
  );
}
