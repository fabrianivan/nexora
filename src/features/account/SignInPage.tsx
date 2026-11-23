'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { validateSignIn } from '@/lib/account';
import { Button, Callout, Card, TextField } from '@/ui';
import { AuthSplitLayout, GoogleMark } from './AuthShared';

const RULES = [
  { title: 'Peran menentukan apa yang Anda lihat', body: 'Eksekutif grup melihat setiap entitas; staf anak usaha hanya melihat entitasnya sendiri.' },
  { title: 'Dua orang di setiap keputusan', body: 'Siapa pun yang menyusun SPT atau usulan kasus tidak bisa menyetujuinya sendiri.' },
  { title: 'Setiap perubahan dicatat', body: 'Jejak audit bersifat hanya-tambah dan dapat diekspor.' },
];

export function SignInPage() {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();
  const [email, setEmail] = useState('dewi.anggraini@nusantara-holding.com');
  const [password, setPassword] = useState('nexora-demo');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const completeSignIn = (targetEmail: string) => {
    const member = ws.account.members.find((m) => m.email.toLowerCase() === targetEmail.toLowerCase());
    if (!member) return;
    ws.updateAccount((prev) => ({
      ...prev,
      activeEmail: member.email,
      members: prev.members.map((m) => (m.id === member.id ? { ...m, lastActiveLabel: 'Sekarang' } : m)),
    }));
    ws.setActiveMemberId(member.id);
    ws.logAudit('SIGN_IN', member.email, `Masuk sebagai ${member.name}.`);
    if (member.roleId === 'view_only' || member.status === 'waiting') {
      router.push('/waiting');
    } else {
      ui.toast(`Masuk sebagai ${member.name}`, 'info');
      router.push('/overview');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateSignIn(ws.account, email, password);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setError('');
    completeSignIn(res.member.email);
  };

  return (
    <AuthSplitLayout
      eyebrow="Selamat datang kembali"
      headline="Lanjutkan pekerjaan grup Anda."
      rules={RULES}
    >
      <Card className="p-6 sm:p-8 shadow-sm">
        <h2 className="font-serif text-[26px] leading-tight text-ink">Masuk ke Nexora</h2>
        <p className="mt-1.5 text-[13.5px] text-ink-3">
          Gunakan akun yang Anda buat atau undangan ruang kerja.
        </p>

        <Button
          type="button"
          variant="secondary"
          className="w-full mt-5"
          icon={<GoogleMark />}
          onClick={() => completeSignIn('dewi.anggraini@nusantara-holding.com')}
        >
          Lanjutkan dengan Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-4">
          <span className="h-px flex-1 bg-line" />
          <span>atau</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <TextField
            label="Email kerja"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@perusahaan.com"
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[13px] font-medium text-ink">Kata sandi</span>
              <Link href="/reset-password" className="text-xs font-medium text-brand-700 hover:underline">
                Lupa kata sandi?
              </Link>
            </div>
            <div className="relative">
              <TextField
                label={<span className="sr-only">Kata sandi</span>}
                className="-mt-1.5"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                className="absolute right-3 top-2 text-xs text-ink-3 hover:text-ink cursor-pointer inline-flex items-center gap-1"
              >
                {showPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {showPass ? 'Tutup' : 'Lihat'}
              </button>
            </div>
          </div>

          {error && <Callout tone="danger">{error}</Callout>}

          <Button type="submit" variant="primary" className="w-full" size="lg">
            Masuk
          </Button>
        </form>

        <div className="mt-5 pt-4 border-t border-line">
          <div className="eyebrow !text-[10px] mb-2">Masuk cepat akun contoh</div>
          <div className="flex flex-wrap gap-1.5">
            {ws.account.members.slice(0, 4).concat(ws.account.members.filter((m) => m.status === 'waiting')).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setEmail(m.email);
                  setPassword('nexora-demo');
                  setError('');
                }}
                className="text-[11.5px] px-2.5 py-1 rounded-md border border-line bg-subtle text-ink-2 hover:border-line-strong hover:text-ink cursor-pointer"
              >
                {m.name.replace(/^(Ir\.|Dr\.)\s*/, '').split(/[ ,]/)[0]} · {m.status === 'waiting' ? 'Menunggu peran' : m.isOwner ? 'Owner' : m.roleId.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-[13px] text-ink-3">
          Baru di Nexora?{' '}
          <Link href="/sign-up" className="font-semibold text-brand-700 hover:underline">
            Buat akun
          </Link>
        </p>
      </Card>
    </AuthSplitLayout>
  );
}
