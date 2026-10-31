import type { Metadata } from 'next';
import { EntityDetailPage } from '@/features/entities/EntityDetailPage';

export const metadata: Metadata = { title: 'Profil entitas' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EntityDetailPage id={id} />;
}
