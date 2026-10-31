import type { Metadata } from 'next';
import { CalculationPage } from '@/features/calculation/CalculationPage';

export const metadata: Metadata = { title: 'Rekonsiliasi fiskal' };

export default function Page() {
  return <CalculationPage />;
}
