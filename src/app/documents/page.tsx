import { Suspense } from 'react';
import type { Metadata } from 'next';
import { DocumentsPage } from '@/features/documents/DocumentsPage';

export const metadata: Metadata = { title: 'Dokumen' };

export default function Page() {
  return (
    <Suspense>
      <DocumentsPage />
    </Suspense>
  );
}
