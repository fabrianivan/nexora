import type { Metadata } from 'next';
import { ShareholdersPage } from '@/features/shareholders/ShareholdersPage';

export const metadata: Metadata = { title: 'Pemegang saham & UBO' };

export default function Page() {
  return <ShareholdersPage />;
}
