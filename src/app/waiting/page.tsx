import type { Metadata } from 'next';
import { WaitingPage } from '@/features/account/WaitingPage';

export const metadata: Metadata = {
  title: 'Menunggu penetapan peran',
};

export default function Page() {
  return <WaitingPage />;
}
