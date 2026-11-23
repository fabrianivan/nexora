import type { Metadata } from 'next';
import { NotFoundView } from '@/features/errors/ErrorViews';

export const metadata: Metadata = { title: 'Halaman tidak ditemukan' };

export default function NotFound() {
  return <NotFoundView />;
}
