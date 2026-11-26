import type { Metadata } from 'next';
import { WelcomePage } from '@/features/welcome/WelcomePage';

export const metadata: Metadata = {
  title: { absolute: 'Nexora — Kepatuhan pajak untuk grup lintas negara' },
  description:
    'Dokumen, pemeriksaan risiko, rantai kepemilikan, SPT, dan pembayaran setiap entitas di Indonesia, Singapura, Malaysia, dan Amerika Serikat dalam satu ruang kerja.',
};

export default function Home() {
  return <WelcomePage />;
}
