import type { Metadata } from 'next';
import { StudiesPage } from '@/features/studies/StudiesPage';

export const metadata: Metadata = { title: 'Studi & simulator' };

export default function Page() {
  return <StudiesPage />;
}
