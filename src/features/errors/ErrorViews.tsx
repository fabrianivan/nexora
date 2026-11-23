'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button, ButtonLink, cn } from '@/ui';
import { LockedScene, LostDocumentScene } from '@/ui/errorScenes';
import { Logo } from '@/shell/Sidebar';
import { isPublicRoute } from '@/shell/publicRoutes';

type Kind = '404' | '403';

const EYEBROW: Record<Kind, string> = {
  '404': 'Galat 404 · Halaman tidak ditemukan',
  '403': 'Galat 403 · Akses dibatasi',
};

/**
 * The illustrated error block. Used full-page by not-found / forbidden, and
 * inside a card where a single record is missing or outside the viewer's role.
 */
export function ErrorState({
  kind,
  title,
  description,
  actions,
  footnote,
  compact,
  as: Heading = 'h1',
}: {
  kind: Kind;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  footnote?: React.ReactNode;
  compact?: boolean;
  as?: 'h1' | 'h2';
}) {
  return (
    <section className={cn('mx-auto max-w-[620px] text-center', compact ? 'py-6 sm:py-8' : 'py-10 sm:py-14')}>
      <div className={cn('mx-auto pt-10', compact ? 'w-[220px] sm:w-[250px]' : 'w-[270px] sm:w-[340px]')}>
        {kind === '404' ? <LostDocumentScene /> : <LockedScene />}
      </div>
      <div className="eyebrow mt-5">{EYEBROW[kind]}</div>
      <Heading
        className={cn(
          'mt-3 font-serif leading-[1.08] tracking-[-0.02em] text-ink text-balance',
          compact ? 'text-[28px] sm:text-[32px]' : 'text-[34px] sm:text-[46px]',
        )}
      >
        {title}
      </Heading>
      {description && <p className="mx-auto mt-3 max-w-[520px] text-[15px] sm:text-[16px] leading-relaxed text-ink-3 text-pretty">{description}</p>}
      {actions && <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
      {footnote && <p className="mt-6 text-[12.5px] text-ink-4">{footnote}</p>}
      <p className="sr-only">Klik ilustrasinya untuk menyapa.</p>
    </section>
  );
}

function BackButton() {
  const router = useRouter();
  return (
    <Button variant="secondary" size="lg" icon={<ArrowLeft />} onClick={() => router.back()}>
      Kembali
    </Button>
  );
}

/** Minimal header for error pages shown outside the workspace shell. */
function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="border-b border-line">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="rounded-md" aria-label="Nexora, beranda">
            <Logo />
          </Link>
          <ButtonLink href="/" variant="ghost">Beranda</ButtonLink>
        </div>
      </header>
      <main id="utama" className="flex-1 grid place-items-center px-4">{children}</main>
    </div>
  );
}

export function NotFoundView() {
  const pathname = usePathname();
  const isPublic = isPublicRoute(pathname);
  const block = (
    <ErrorState
      kind="404"
      title="Dokumen ini tidak ada di arsip."
      description="Mungkin tautannya salah ketik, atau halamannya sudah dipindah. Kami sudah mencarinya di semua map, laci, dan lampiran, tapi hasilnya nihil."
      actions={
        <>
          <ButtonLink href={isPublic ? '/' : '/overview'} variant="primary" size="lg">
            {isPublic ? 'Ke beranda' : 'Ke Ringkasan'}
          </ButtonLink>
          <BackButton />
        </>
      }
      footnote={pathname ? <>Alamat yang dicari: <code className="font-mono text-ink-3">{pathname}</code></> : undefined}
    />
  );
  return isPublic ? <PublicFrame>{block}</PublicFrame> : block;
}

export function ForbiddenView() {
  return (
    <ErrorState
      kind="403"
      title="Pintu ini terkunci untuk peran Anda."
      description="Halaman ini hanya bisa dibuka oleh peran yang berwenang. Kalau Anda memerlukannya, minta pemilik ruang kerja menyesuaikan peran Anda."
      actions={
        <>
          <ButtonLink href="/overview" variant="primary" size="lg">Ke Ringkasan</ButtonLink>
          <BackButton />
        </>
      }
      footnote="Peran menentukan entitas dan modul yang bisa dibuka. Matriks hak akses ada di menu akun."
    />
  );
}
