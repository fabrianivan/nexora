import type { Metadata } from 'next';
import { EntitiesPage } from '@/features/entities/EntitiesPage';

export const metadata: Metadata = { title: 'Entitas & struktur' };

export default function Page() {
  return <EntitiesPage />;
}
