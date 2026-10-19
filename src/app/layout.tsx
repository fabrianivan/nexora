import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Nexora — Global Corporate Tax Compliance, Document Intelligence & Fraud Prevention',
  description:
    'Solusi berbasis Google Cloud Vertex AI, Document AI, dan BigQuery untuk Otomatisasi Kepatuhan Pajak Multi-Negara, Deteksi Faktur Fiktif, dan Pencegahan Risiko Keuangan oleh Team Nexora (Track 1: BFSI - AI Builder Cup).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
