import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexora v2.0 — Platform Kepatuhan Pajak Korporasi & Deteksi Risiko Fiskal Berbasis Bukti',
  description:
    'Nexora membaca dokumen pajak & korporasi, menandai risiko fraud/kepatuhan lengkap dengan bukti, lalu menyiapkan draf rekonsiliasi fiskal yang siap direview manusia (Google Cloud AI Builder Cup — Track 1 BFSI).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen font-sans selection:bg-indigo-600 selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
