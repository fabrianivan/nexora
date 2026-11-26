import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CasesPage } from '@/features/cases/CasesPage';

export const metadata: Metadata = { title: 'Kasus' };

export default function Page() {
  return (
    <Suspense>
      <CasesPage />
    </Suspense>
  );
}
