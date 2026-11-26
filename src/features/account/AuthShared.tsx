'use client';

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Logo } from '@/shell/Sidebar';
import { cn } from '@/ui';

export function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-4 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.69 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

export interface AuthStepItem {
  number: number;
  title: string;
  description: string;
  state: 'done' | 'current' | 'upcoming';
}

export function AuthSplitLayout({
  eyebrow,
  headline,
  steps,
  rules,
  children,
}: {
  eyebrow: string;
  headline: string;
  steps?: AuthStepItem[];
  rules?: { title: string; body: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
      {/* Left editorial panel */}
      <aside className="border-b lg:border-b-0 lg:border-r border-line bg-canvas px-6 sm:px-10 py-8 lg:py-12 flex flex-col justify-between gap-10">
        <div>
          <Link href="/" className="inline-block rounded-md" aria-label="Nexora, beranda">
            <Logo />
          </Link>

          <div className="mt-12 lg:mt-20">
            <div className="eyebrow">{eyebrow}</div>
            <h1 className="mt-3 font-serif text-[32px] sm:text-[38px] leading-[1.08] tracking-[-0.02em] text-ink text-balance">
              {headline}
            </h1>
          </div>

          {steps && (
            <ol className="mt-8 border-t border-line divide-y divide-line">
              {steps.map((s) => (
                <li key={s.number} className="flex items-start gap-3.5 py-4">
                  <span
                    className={cn(
                      'mt-0.5 size-6 rounded-full inline-flex items-center justify-center text-xs font-semibold shrink-0',
                      s.state === 'done'
                        ? 'bg-success-600 text-white'
                        : s.state === 'current'
                          ? 'bg-ink text-white'
                          : 'border border-line-strong text-ink-4 bg-surface',
                    )}
                  >
                    {s.state === 'done' ? <Check className="size-3.5" strokeWidth={2.5} /> : s.number}
                  </span>
                  <div className="min-w-0">
                    <div className={cn('text-[14px] font-medium', s.state === 'upcoming' ? 'text-ink-3' : 'text-ink')}>
                      {s.title}
                    </div>
                    <div className="text-[12.5px] text-ink-3 mt-0.5">
                      {s.state === 'done' ? <span className="text-success-700 font-medium">Selesai</span> : s.description}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {rules && (
            <ul className="mt-8 border-t border-line divide-y divide-line">
              {rules.map((r) => (
                <li key={r.title} className="py-4">
                  <div className="text-[14px] font-medium text-ink">{r.title}</div>
                  <div className="text-[13px] text-ink-3 mt-0.5">{r.body}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex items-center gap-4 text-[12px] text-ink-4">
          <span>© 2026 Nexora</span>
          <span>·</span>
          <Link href="/#tata-kelola" className="hover:text-ink">Keamanan</Link>
          <span>·</span>
          <Link href="/#produk" className="hover:text-ink">Produk</Link>
        </footer>
      </aside>

      {/* Right form stage */}
      <main id="utama" className="flex-1 bg-surface/65 px-4 sm:px-8 py-10 lg:py-16 grid place-items-center">
        <div className="w-full max-w-[460px]">{children}</div>
      </main>
    </div>
  );
}
