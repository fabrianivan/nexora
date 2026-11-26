import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/shell/Sidebar';
import { Badge, ButtonLink, ComplianceRing, cn } from '@/ui';

/**
 * Public welcome page (Figma: "Nexora — Account journey" · 01 Welcome).
 * Everything here is a fact the product already delivers; the figures come
 * from the README and the sample workspace, not from marketing.
 */

const CONTAINER = 'mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10';

const FIGURES = [
  { label: 'Negara', value: '4', detail: 'Indonesia secara penuh; Singapura, Malaysia, dan AS dalam pratinjau.' },
  { label: 'Ruang kerja', value: '1', detail: 'Induk dan anak usaha bersama, tiap orang dibatasi sesuai perannya.' },
  { label: 'Orang per keputusan', value: '2', detail: 'Maker dan checker. Tidak ada yang menyetujui pekerjaannya sendiri.' },
  { label: 'Perubahan tercatat', value: 'Semua', detail: 'Jejak audit append-only yang bisa diekspor ke CSV.' },
];

const FEATURES = [
  { n: '01', title: 'Dokumen', body: 'Unggah faktur dan register saham. Field diekstraksi beserta tingkat keyakinannya, lalu diperiksa mesin aturan.' },
  { n: '02', title: 'Risiko & kasus', body: 'Aturan yang bisa dijelaskan memunculkan kasus. Investigasi dengan bukti bersumber, lalu putuskan bersama peninjau kedua.' },
  { n: '03', title: 'Kepemilikan', body: 'Telusuri setiap rantai pemegang saham sampai ke orangnya, dengan kepemilikan efektif dihitung di tiap jalur.' },
  { n: '04', title: 'SPT & pembayaran', body: 'Rekonsiliasi koreksi fiskal, siapkan SPT tahunan, dan pantau setiap setoran serta tenggat per entitas.' },
];

const RULES = [
  { title: 'Pemilik menentukan peran', body: 'Anggota baru hanya bisa melihat sampai pemilik memberi salah satu dari lima peran.' },
  { title: 'Dibatasi per entitas', body: 'Eksekutif grup melihat semua entitas. Staf anak usaha hanya melihat entitasnya sendiri.' },
  { title: 'Maker dan checker', body: 'Penyusun SPT atau usulan keputusan kasus tidak bisa menyetujuinya sendiri.' },
  { title: 'Tersamar secara default', body: 'Nomor identitas tersembunyi sampai dibuka, dan setiap pembukaan dicatat.' },
];

const CASES: { tone: 'danger' | 'warning' | 'brand'; level: string; title: string; entity: string }[] = [
  { tone: 'danger', level: 'Tinggi', title: 'PPh 23 dipotong atas 4 faktur, belum disetor', entity: 'PT Nusantara Kreasi Digital Tbk' },
  { tone: 'warning', level: 'Sedang', title: 'Rantai kepemilikan berakhir di perusahaan', entity: 'Company SH 1 · 20% belum tertelusur' },
  { tone: 'brand', level: 'Tinjau', title: 'SPT tahunan siap untuk checker', entity: 'Nusantara FinTech Pte. Ltd.' },
];

function ProductPreview() {
  return (
    <figure className="relative">
      <figcaption className="sr-only">Contoh halaman Ringkasan Nexora dengan data contoh.</figcaption>
      <div aria-hidden className="rounded-xl border border-line bg-surface shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-subtle border-b border-line">
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="ml-1 text-[12px] font-medium text-ink-3">Ringkasan · TB 2026</span>
        </div>
        <div className="p-5 sm:p-7 space-y-6">
          <div className="flex items-center gap-5">
            <ComplianceRing value={86} tone="amber" size={84} label="Skor kepatuhan grup 86 dari 100" />
            <div className="min-w-0">
              <div className="eyebrow">Kepatuhan grup</div>
              <div className="font-serif text-[20px] sm:text-[23px] leading-tight text-ink truncate">PT Nusantara Kreasi Digital Tbk</div>
              <div className="mt-1 text-[13px] text-ink-3">4 entitas · 3 kasus terbuka · 2 SPT jatuh tempo bulan ini</div>
            </div>
          </div>
          <div className="border-t-2 border-ink grid grid-cols-3">
            {[
              { label: 'Kasus terbuka', value: '3', cls: 'text-ink' },
              { label: 'Tenggat 30 hari', value: '2', cls: 'text-warning-600' },
              { label: 'UBO tertelusur', value: '96%', cls: 'text-ink' },
            ].map((f, i) => (
              <div key={f.label} className={cn('pt-3 pb-1', i > 0 && 'border-l border-line pl-4')}>
                <div className="eyebrow !text-[10px]">{f.label}</div>
                <div className={cn('figure text-[30px] leading-tight', f.cls)}>{f.value}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="eyebrow pb-2">Perlu perhatian</div>
            <ul className="divide-y divide-line border-t border-line">
              {CASES.map((c) => (
                <li key={c.title} className="flex items-center gap-3 py-3">
                  <Badge tone={c.tone} className="w-[54px] justify-center shrink-0">{c.level}</Badge>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium text-ink truncate">{c.title}</span>
                    <span className="block text-[12px] text-ink-3 truncate">{c.entity}</span>
                  </span>
                  <span className="text-[13px] font-semibold text-brand-700">Buka</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </figure>
  );
}

export function WelcomePage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a href="#utama" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] focus:bg-surface focus:px-3 focus:py-2 focus:rounded-lg focus:shadow-lg">
        Lewati ke konten
      </a>

      <header className="border-b border-line">
        <div className={cn(CONTAINER, 'h-16 flex items-center justify-between gap-4')}>
          <Link href="/" className="rounded-md" aria-label="Nexora, beranda">
            <Logo />
          </Link>
          <nav aria-label="Bagian halaman" className="hidden md:flex items-center gap-8 text-[14px] font-medium text-ink-2">
            <a href="#produk" className="hover:text-ink">Produk</a>
            <a href="#negara" className="hover:text-ink">Negara</a>
            <a href="#tata-kelola" className="hover:text-ink">Tata kelola</a>
          </nav>
          <div className="flex items-center gap-1.5">
            <ButtonLink href="/sign-in" variant="ghost">Masuk</ButtonLink>
            <ButtonLink href="/sign-up" variant="primary">Buat akun</ButtonLink>
          </div>
        </div>
      </header>

      <main id="utama">
        {/* Hero */}
        <section className={cn(CONTAINER, 'pt-14 pb-16 lg:pt-20 lg:pb-20 grid gap-12 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:items-center')}>
          <div>
            <div className="eyebrow">Kepatuhan pajak korporat · ID SG MY US</div>
            <h1 className="mt-5 font-serif text-[42px] sm:text-[56px] lg:text-[64px] leading-[1.04] tracking-[-0.025em] text-ink text-balance">
              Kepatuhan pajak untuk grup yang bekerja <em className="italic text-brand-600">lintas negara</em>.
            </h1>
            <p className="mt-6 max-w-xl text-[17px] sm:text-[18px] leading-[1.6] text-ink-3 text-pretty">
              Nexora menyatukan dokumen, pemeriksaan risiko, rantai kepemilikan, SPT, dan pembayaran setiap entitas di Indonesia,
              Singapura, Malaysia, dan Amerika Serikat dalam satu ruang kerja, dengan peninjau kedua di setiap keputusan.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/sign-up" variant="primary" size="lg">Buat akun</ButtonLink>
              <ButtonLink href="/sign-in" variant="secondary" size="lg">Masuk</ButtonLink>
            </div>
            <p className="mt-4 text-[13px] text-ink-4">Akun pertama menjadi pemilik ruang kerja grup Anda.</p>
          </div>
          <ProductPreview />
        </section>

        {/* Key figures */}
        <section id="negara" aria-label="Sekilas" className={cn(CONTAINER, 'pb-20')}>
          <dl className="border-t-2 border-ink grid grid-cols-2 lg:grid-cols-4">
            {FIGURES.map((f, i) => (
              <div
                key={f.label}
                className={cn(
                  'pt-5 pb-2 pr-4',
                  i % 2 === 1 && 'border-l border-line pl-5',
                  i >= 2 && 'border-t border-line lg:border-t-0 mt-0',
                  i > 0 && 'lg:border-l lg:border-line lg:pl-6',
                  i === 2 && 'pl-0',
                )}
              >
                <dt className="eyebrow">{f.label}</dt>
                <dd className="figure mt-1 text-[40px] sm:text-[46px] leading-tight text-ink">{f.value}</dd>
                <dd className="mt-1.5 text-[14px] leading-[1.5] text-ink-3">{f.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* What it does */}
        <section id="produk" className="bg-surface border-y border-line">
          <div className={cn(CONTAINER, 'py-20')}>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <div className="eyebrow">Apa yang dikerjakan</div>
                <h2 className="mt-3 font-serif text-[34px] sm:text-[44px] leading-[1.1] tracking-[-0.02em] text-ink text-balance">
                  Dari faktur pertama sampai SPT yang ditandatangani.
                </h2>
              </div>
              <p className="max-w-sm text-[16px] leading-[1.6] text-ink-3">
                Setiap langkah menyerahkan hasilnya ke langkah berikutnya, jadi tidak ada yang diketik ulang dan setiap angka bisa ditelusuri ke dokumennya.
              </p>
            </div>
            <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <li key={f.n} className="border-t border-line-strong pt-5">
                  <div className="text-[12px] font-semibold tracking-[0.06em] text-brand-600">{f.n}</div>
                  <h3 className="mt-2 font-serif text-[24px] text-ink">{f.title}</h3>
                  <p className="mt-2 text-[15px] leading-[1.55] text-ink-3">{f.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Governance */}
        <section id="tata-kelola" className={cn(CONTAINER, 'py-20 grid gap-12 grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]')}>
          <div>
            <div className="eyebrow">Akses & kendali</div>
            <h2 className="mt-3 font-serif text-[34px] sm:text-[44px] leading-[1.1] tracking-[-0.02em] text-ink text-balance">
              Dibangun untuk segregasi tugas.
            </h2>
            <p className="mt-5 max-w-md text-[16px] leading-[1.6] text-ink-3">
              Setiap orang masuk dengan akunnya sendiri. Orang yang membuat ruang kerja menjadi pemiliknya dan menentukan apa yang bisa dilihat dan dikerjakan orang lain.
            </p>
          </div>
          <ol className="border-y border-line divide-y divide-line">
            {RULES.map((r, i) => (
              <li key={r.title} className="flex gap-5 py-5">
                <span className="figure text-[22px] leading-none text-brand-600 pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="block text-[16px] font-semibold text-ink">{r.title}</span>
                  <span className="mt-1 block text-[15px] leading-[1.55] text-ink-3">{r.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* Closing call to action */}
        <section className={cn(CONTAINER, 'pb-20')}>
          <div className="rounded-xl border border-brand-100 bg-brand-50 px-6 py-8 sm:px-11 sm:py-11 flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="font-serif text-[30px] sm:text-[38px] leading-tight text-ink">Mulai dengan ruang kerja grup Anda.</h2>
              <p className="mt-2 text-[16px] text-ink-3">Data contoh untuk empat entitas siap dijelajahi kalau Anda ingin melihat-lihat dulu.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/sign-in" variant="secondary" size="lg">Masuk</ButtonLink>
              <ButtonLink href="/sign-up" variant="primary" size="lg" iconRight={<ArrowRight />}>Buat akun</ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className={cn(CONTAINER, 'py-7 flex flex-wrap items-center justify-between gap-4')}>
          <div className="flex items-center gap-4">
            <span className="font-serif text-[22px] text-ink">Nexora<span className="text-brand-600">.</span></span>
            <span className="text-[13px] text-ink-4">© 2026 Nexora</span>
          </div>
          <nav aria-label="Tautan kaki" className="flex items-center gap-6 text-[13px] font-medium text-ink-3">
            <a href="#tata-kelola" className="hover:text-ink">Keamanan</a>
            <Link href="/overview" className="hover:text-ink">Ruang kerja contoh</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
