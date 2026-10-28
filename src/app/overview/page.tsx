import type { Metadata } from 'next';
import { OverviewPage } from '@/features/overview/OverviewPage';

export const metadata: Metadata = { title: 'Ringkasan' };

export default function Page() {
  return <OverviewPage />;
}
