import type { Metadata } from 'next';
import { PaymentsPage } from '@/features/payments/PaymentsPage';

export const metadata: Metadata = { title: 'Pembayaran' };

export default function Page() {
  return <PaymentsPage />;
}
