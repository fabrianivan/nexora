import type { Metadata } from 'next';
import { TeamPage } from '@/features/account/TeamPage';

export const metadata: Metadata = {
  title: 'Tim & peran',
};

export default function Page() {
  return <TeamPage />;
}
