import type { Metadata, Viewport } from 'next';
// Self-hosted variable fonts (bundled at build time — no network needed in Docker/CI)
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'Nexora — Kepatuhan Pajak & Pencegahan Fraud Multi-Negara',
    template: '%s · Nexora',
  },
  description:
    'Nexora menghubungkan dokumen, deteksi fraud, review maker-checker, rekonsiliasi fiskal, SPT, dan pembayaran untuk grup usaha di Indonesia, Singapura, Malaysia, dan Amerika Serikat.',
};

export const viewport: Viewport = {
  themeColor: '#f6f7f9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
