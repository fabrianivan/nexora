import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ReviewPage } from '@/features/review/ReviewPage';

export const metadata: Metadata = { title: 'Review temuan' };

export default function Page() {
  return (
    <Suspense>
      <ReviewPage />
    </Suspense>
  );
}
