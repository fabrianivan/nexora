import type { Metadata } from 'next';
import { TaxReturnPage } from '@/features/tax-return/TaxReturnPage';

export const metadata: Metadata = { title: 'SPT tahunan' };

export default function Page() {
  return <TaxReturnPage />;
}
