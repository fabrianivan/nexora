import type { Metadata, Viewport } from 'next';
// Self-hosted variable fonts (bundled at build time — no network fetch needed for Docker/CI builds)
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexora — Global Corporate Tax Compliance, Document Intelligence & Fraud Prevention',
  description:
    'Solusi berbasis Google Cloud Vertex AI, Document AI, dan BigQuery untuk Otomatisasi Kepatuhan Pajak Multi-Negara, Deteksi Faktur Fiktif, dan Pencegahan Risiko Keuangan oleh Team Nexora (Track 1: BFSI - AI Builder Cup).',
};

export const viewport: Viewport = {
  themeColor: '#10142a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen font-sans selection:bg-blue-600 selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
