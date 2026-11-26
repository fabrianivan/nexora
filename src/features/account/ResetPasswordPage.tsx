'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { useUi } from '@/state/ui';
import { Logo } from '@/shell/Sidebar';
import { Button, Card, TextField } from '@/ui';

export function ResetPasswordPage() {
  const ui = useUi();
  const router = useRouter();
  const [stage, setStage] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('dewi.anggraini@nusantara-holding.com');
  const [code, setCode] = useState('');
  const [nextPass, setNextPass] = useState('');
  const [err, setErr] = useState('');

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErr('Masukkan alamat email kerja yang valid.');
      return;
    }
    setErr('');
    setStage('code');
    ui.toast('Kode reset 6 digit (demo: 741920) dikirim ke email Anda.', 'info');
  };

  const confirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setErr('Masukkan kode 6 digit dari email Anda.');
      return;
    }
    if (nextPass.length < 8) {
      setErr('Kata sandi baru minimal 8 karakter.');
      return;
    }
    setErr('');
    setStage('done');
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <header className="border-b border-line">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="rounded-md" aria-label="Nexora, beranda">
            <Logo />
          </Link>
          <Link href="/sign-in" className="text-[13.5px] font-medium text-ink-2 hover:text-ink">
            Masuk
          </Link>
        </div>
      </header>

      <main id="utama" className="flex-1 grid place-items-center px-4 py-12">
        <Card className="w-full max-w-[440px] p-6 sm:p-8 shadow-sm">
          {stage === 'email' && (
            <>
              <h1 className="font-serif text-[26px] leading-tight text-ink">Atur ulang kata sandi</h1>
              <p className="mt-1.5 text-[13.5px] text-ink-3">
                Kami akan mengirimkan kode 6 digit ke email kerja Anda untuk verifikasi.
              </p>
              <form onSubmit={sendCode} className="mt-5 space-y-4">
                <TextField
                  label="Email kerja"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={err || undefined}
                />
                <Button type="submit" variant="primary" className="w-full" size="lg">
                  Kirim kode reset
                </Button>
              </form>
            </>
          )}

          {stage === 'code' && (
            <>
              <h1 className="font-serif text-[26px] leading-tight text-ink">Masukkan kode & sandi baru</h1>
              <p className="mt-1.5 text-[13.5px] text-ink-3">
                Kode dikirim ke <strong className="text-ink">{email}</strong> (demo: <code className="font-mono">741920</code>).
              </p>
              <form onSubmit={confirmReset} className="mt-5 space-y-4">
                <TextField
                  label="Kode verifikasi 6 digit"
                  mono
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="741920"
                />
                <TextField
                  label="Kata sandi baru"
                  type="password"
                  value={nextPass}
                  onChange={(e) => setNextPass(e.target.value)}
                  error={err || undefined}
                />
                <Button type="submit" variant="primary" className="w-full" size="lg">
                  Simpan kata sandi baru
                </Button>
              </form>
            </>
          )}

          {stage === 'done' && (
            <div className="text-center space-y-4 py-2">
              <CheckCircle2 className="size-10 text-success-600 mx-auto" />
              <h1 className="font-serif text-[26px] leading-tight text-ink">Kata sandi diperbarui</h1>
              <p className="text-[13.5px] text-ink-3">
                Sesi di perangkat lain telah dikeluarkan demi keamanan akun Anda.
              </p>
              <Button variant="primary" className="w-full" size="lg" onClick={() => router.push('/sign-in')}>
                Kembali ke halaman masuk
              </Button>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-line">
            <div className="eyebrow !text-[10px] mb-2.5">Yang terjadi selanjutnya</div>
            <ol className="space-y-2 text-[13px] text-ink-3">
              <li className="flex items-center gap-2.5">
                <span className="size-5 rounded-full bg-subtle border border-line text-[11px] font-semibold text-ink-2 inline-flex items-center justify-center">1</span>
                <span>Masukkan kode dari email Anda.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="size-5 rounded-full bg-subtle border border-line text-[11px] font-semibold text-ink-2 inline-flex items-center justify-center">2</span>
                <span>Pilih kata sandi baru yang kuat.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="size-5 rounded-full bg-subtle border border-line text-[11px] font-semibold text-ink-2 inline-flex items-center justify-center">3</span>
                <span>Perangkat lain otomatis keluar.</span>
              </li>
            </ol>
          </div>

          <p className="mt-5 text-center text-[13px] text-ink-3">
            Sudah ingat?{' '}
            <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">
              Kembali masuk
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
