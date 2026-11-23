'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Eye, EyeOff } from 'lucide-react';
import type { CountryCode } from '@/data/multiCountryTaxData';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import {
  initialsForName,
  passwordStrength,
  validateSignUp,
  type TeamMember,
} from '@/lib/account';
import { Button, Callout, Card, Checkbox, SelectField, TextField, cn } from '@/ui';
import { AuthSplitLayout, GoogleMark, type AuthStepItem } from './AuthShared';

type Step = 'create' | 'verify' | 'workspace';

const COUNTRIES: { code: CountryCode; flag: string; label: string }[] = [
  { code: 'ID', flag: '🇮🇩', label: 'Indonesia' },
  { code: 'SG', flag: '🇸🇬', label: 'Singapura' },
  { code: 'MY', flag: '🇲🇾', label: 'Malaysia' },
  { code: 'US', flag: '🇺🇸', label: 'Amerika Serikat' },
];

const DEMO_CODE = '482917';

export function SignUpPage() {
  const ws = useWorkspace();
  const ui = useUi();
  const router = useRouter();

  const [step, setStep] = useState<Step>('create');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [error, setError] = useState<{ field: string; message: string; existingAccount?: boolean } | null>(null);

  // Step 2 — 6-digit OTP
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendSec, setResendSec] = useState(42);
  const [expectedCode, setExpectedCode] = useState(DEMO_CODE);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3 — Workspace setup
  const [groupName, setGroupName] = useState(ws.account.workspaceConfig.groupName || 'PT Nusantara Kreasi Digital Tbk');
  const [parentCountry, setParentCountry] = useState<CountryCode>('ID');
  const [filingCountries, setFilingCountries] = useState<CountryCode[]>(['ID', 'SG', 'MY', 'US']);
  const [startWithSample, setStartWithSample] = useState(true);

  useEffect(() => {
    if (step !== 'verify' || resendSec <= 0) return;
    const t = window.setTimeout(() => setResendSec((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [step, resendSec]);

  const strength = passwordStrength(password);

  const stepItems: AuthStepItem[] = [
    {
      number: 1,
      title: 'Buat akun Anda',
      description: 'Nama, email kerja, dan kata sandi.',
      state: step === 'create' ? 'current' : 'done',
    },
    {
      number: 2,
      title: 'Verifikasi email Anda',
      description: 'Masukkan kode 6 digit yang kami kirim.',
      state: step === 'create' ? 'upcoming' : step === 'verify' ? 'current' : 'done',
    },
    {
      number: 3,
      title: 'Atur ruang kerja',
      description: 'Beri nama grup dan pilih negara pelaporan.',
      state: step === 'workspace' ? 'current' : 'upcoming',
    },
  ];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateSignUp(ws.account, { name, email, password, acceptedTerms });
    if (!res.ok) {
      setError({ field: res.field, message: res.message, existingAccount: res.existingAccount });
      return;
    }
    setError(null);
    setDigits(['', '', '', '', '', '']);
    setOtpError('');
    setResendSec(42);
    setStep('verify');
    window.setTimeout(() => otpRefs.current[0]?.focus(), 40);
  };

  const handleGoogleSignUp = () => {
    // Per Figma 03 note: Google already verified the email, so step 2 is skipped.
    if (!name.trim()) setName('Dewi Anggraini');
    if (!email.trim()) setEmail('dewi.baru@nusantara-holding.com');
    setError(null);
    setStep('workspace');
    ui.toast('Email terverifikasi lewat Google. Lanjutkan pengaturan ruang kerja.', 'info');
  };

  const handleOtpChange = (idx: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) {
      setDigits((prev) => prev.map((d, i) => (i === idx ? '' : d)));
      return;
    }
    if (cleaned.length > 1) {
      const next = Array.from({ length: 6 }, (_, i) => cleaned[i] ?? '');
      setDigits(next);
      otpRefs.current[Math.min(5, cleaned.length - 1)]?.focus();
      setOtpError('');
      return;
    }
    setDigits((prev) => prev.map((d, i) => (i === idx ? cleaned : d)));
    setOtpError('');
    if (idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) {
      setOtpError('Masukkan 6 digit kode verifikasi.');
      return;
    }
    if (code === '000000') {
      // Edge state from Figma 12: expired code auto-issues a replacement
      const replacement = '619304';
      setExpectedCode(replacement);
      setDigits(['', '', '', '', '', '']);
      setResendSec(45);
      setOtpError(`Kode ini kedaluwarsa. Kode baru (${replacement}) telah dikirim ke ${email.trim()}.`);
      return;
    }
    if (code !== expectedCode) {
      setOtpError(`Kode tidak sesuai. Gunakan kode pratinjau ${expectedCode}.`);
      return;
    }
    setOtpError('');
    setStep('workspace');
  };

  const toggleCountry = (code: CountryCode) => {
    setFilingCountries((prev) => {
      if (prev.includes(code)) {
        return prev.length > 1 ? prev.filter((c) => c !== code) : prev;
      }
      return [...prev, code];
    });
  };

  const handleFinishWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = (email || 'dewi.baru@nusantara-holding.com').trim().toLowerCase();
    const cleanName = (name || 'Pemilik Ruang Kerja').trim();
    const invited = ws.account.invites.find((i) => i.email.toLowerCase() === cleanEmail && !i.expired);

    const newMember: TeamMember = {
      id: `MEM-${Date.now().toString(36).toUpperCase()}`,
      name: cleanName,
      email: cleanEmail,
      roleId: invited ? invited.roleId : 'group_cfo',
      isOwner: !invited,
      personaId: invited ? undefined : 'cfo_parent',
      avatarInitials: initialsForName(cleanName),
      avatarBg: 'bg-brand-700',
      status: invited?.roleId === 'view_only' ? 'waiting' : 'active',
      lastActiveLabel: 'Sekarang',
    };

    ws.updateAccount((prev) => ({
      ...prev,
      activeEmail: cleanEmail,
      members: prev.members.some((m) => m.email.toLowerCase() === cleanEmail)
        ? prev.members
        : [...prev.members, newMember],
      invites: prev.invites.filter((i) => i.email.toLowerCase() !== cleanEmail),
      workspaceConfig: {
        groupName: groupName.trim() || prev.workspaceConfig.groupName,
        parentCountry,
        filingCountries,
        startWithSample,
      },
    }));

    ws.logAudit(
      'CREATE_WORKSPACE_ACCOUNT',
      groupName.trim() || 'Ruang kerja Nexora',
      `${cleanName} (${cleanEmail}) menyelesaikan penyiapan ruang kerja (${filingCountries.join(', ')}).`,
    );

    if (invited && invited.roleId === 'view_only') {
      router.push('/waiting');
    } else {
      ws.setPersonaId('cfo_parent');
      ui.toast(`Ruang kerja ${groupName.trim() || 'Nexora'} siap digunakan.`);
      router.push('/overview');
    }
  };

  return (
    <AuthSplitLayout
      eyebrow="Buat ruang kerja Anda"
      headline="Tiga langkah, lalu seluruh grup berada di satu tempat."
      steps={stepItems}
    >
      {step === 'create' && (
        <Card className="p-6 sm:p-8 shadow-sm">
          <h2 className="font-serif text-[26px] leading-tight text-ink">Buat akun Anda</h2>
          <p className="mt-1.5 text-[13.5px] text-ink-3">
            Akun pertama menjadi pemilik ruang kerja grup Anda.
          </p>

          <Button
            type="button"
            variant="secondary"
            className="w-full mt-5"
            icon={<GoogleMark />}
            onClick={handleGoogleSignUp}
          >
            Lanjutkan dengan Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-ink-4">
            <span className="h-px flex-1 bg-line" />
            <span>atau</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4" noValidate>
            <TextField
              label="Nama lengkap"
              placeholder="Dewi Anggraini"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={error?.field === 'name' ? error.message : undefined}
              autoFocus
            />

            <div>
              <TextField
                label="Email kerja"
                type="email"
                placeholder="dewi.anggraini@nusantara-holding.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error?.field === 'email' ? error.message : undefined}
              />
              {error?.existingAccount && (
                <p className="mt-1.5 text-xs text-brand-700">
                  Sudah punya akun?{' '}
                  <Link href="/sign-in" className="underline font-medium">
                    Masuk sebagai gantinya
                  </Link>
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-medium text-ink">Kata sandi</span>
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink cursor-pointer"
                >
                  {showPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  {showPass ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
              <TextField
                label={<span className="sr-only">Kata sandi</span>}
                className="-mt-1.5"
                type={showPass ? 'text' : 'password'}
                placeholder="Minimal 8 karakter dengan angka atau simbol"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={error?.field === 'password' ? error.message : undefined}
              />
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((lvl) => (
                    <span
                      key={lvl}
                      className={cn(
                        'h-1 rounded-full transition-colors',
                        strength.score >= lvl
                          ? strength.score >= 3
                            ? 'bg-success-500'
                            : strength.score === 2
                              ? 'bg-warning-500'
                              : 'bg-danger-500'
                          : 'bg-line',
                      )}
                    />
                  ))}
                </div>
                <span className="text-[11.5px] font-medium text-ink-3">{strength.label}</span>
              </div>
            </div>

            <div>
              <Checkbox
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                label={
                  <span className="text-[13px] text-ink-2">
                    Saya menyetujui Ketentuan Layanan dan Kebijakan Privasi Nexora.
                  </span>
                }
              />
              {error?.field === 'terms' && <p className="mt-1 text-xs text-danger-600">{error.message}</p>}
            </div>

            <Button type="submit" variant="primary" className="w-full" size="lg">
              Buat akun
            </Button>
          </form>

          <p className="mt-5 text-center text-[13px] text-ink-3">
            Sudah punya akun?{' '}
            <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">
              Masuk
            </Link>
          </p>
        </Card>
      )}

      {step === 'verify' && (
        <Card className="p-6 sm:p-8 shadow-sm">
          <h2 className="font-serif text-[26px] leading-tight text-ink">Periksa email Anda</h2>
          <p className="mt-1.5 text-[13.5px] text-ink-3">
            Kami mengirim kode 6 digit ke <strong className="text-ink font-medium">{email}</strong>.
          </p>

          <form onSubmit={handleVerifySubmit} className="mt-6 space-y-5">
            <div className="grid grid-cols-6 gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  aria-label={`Digit ${i + 1}`}
                  value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={cn(
                    'h-12 text-center font-mono text-[20px] rounded-md border bg-surface text-ink focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/15',
                    otpError ? 'border-danger-500' : 'border-line-strong',
                  )}
                />
              ))}
            </div>

            {otpError && <p className="text-xs text-danger-600">{otpError}</p>}

            <div className="rounded-md border border-line bg-subtle px-3.5 py-2.5 text-xs text-ink-3 flex items-center justify-between gap-2">
              <span>
                Kode demo: <code className="font-mono font-semibold text-ink">{expectedCode}</code>
              </span>
              <button
                type="button"
                className="text-brand-700 font-medium hover:underline cursor-pointer"
                onClick={() => {
                  setDigits(expectedCode.split(''));
                  setOtpError('');
                }}
              >
                Isi otomatis
              </button>
            </div>

            <div className="text-center text-xs text-ink-3">
              {resendSec > 0 ? (
                <span>Kirim ulang kode dalam 0:{String(resendSec).padStart(2, '0')}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setResendSec(42);
                    ui.toast(`Kode verifikasi baru (${expectedCode}) dikirim ke ${email}.`, 'info');
                  }}
                  className="font-medium text-brand-700 hover:underline cursor-pointer"
                >
                  Kirim ulang kode
                </button>
              )}
            </div>

            <Button type="submit" variant="primary" className="w-full" size="lg">
              Verifikasi email
            </Button>
          </form>

          <p className="mt-5 text-center text-[13px] text-ink-3">
            Alamat salah?{' '}
            <button
              type="button"
              onClick={() => setStep('create')}
              className="font-semibold text-brand-700 hover:underline cursor-pointer"
            >
              Ubah email
            </button>
          </p>
        </Card>
      )}

      {step === 'workspace' && (
        <Card className="p-6 sm:p-8 shadow-sm">
          <h2 className="font-serif text-[26px] leading-tight text-ink">Atur ruang kerja grup Anda</h2>
          <p className="mt-1.5 text-[13.5px] text-ink-3">
            Semua pengaturan ini dapat diubah lagi di menu pengaturan.
          </p>

          <div className="mt-5 rounded-lg border border-line bg-subtle px-4 py-3 flex items-start gap-3">
            <span className="size-8 rounded-full bg-ink text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {initialsForName(name || 'Pemilik')}
            </span>
            <div className="text-xs leading-relaxed text-ink-2">
              <div className="font-semibold text-ink">Anda menjadi pemilik ruang kerja ini</div>
              <div>Akses seluruh grup sebagai Group CFO. Anda menentukan peran anggota lain.</div>
            </div>
          </div>

          <form onSubmit={handleFinishWorkspace} className="mt-5 space-y-4">
            <TextField
              label="Nama grup"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="PT Nusantara Kreasi Digital Tbk"
            />

            <SelectField
              label="Perusahaan induk berada di"
              value={parentCountry}
              onChange={(e) => setParentCountry(e.target.value as CountryCode)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.label}
                </option>
              ))}
            </SelectField>

            <div>
              <div className="text-[13px] font-medium text-ink mb-2">Negara tempat grup melapor</div>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map((c) => {
                  const selected = filingCountries.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => toggleCountry(c.code)}
                      className={cn(
                        'inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-[13px] transition cursor-pointer',
                        selected
                          ? 'border-brand-600 bg-brand-50 text-brand-800 font-medium'
                          : 'border-line-strong bg-surface text-ink-2 hover:bg-subtle',
                      )}
                    >
                      {selected && <Check className="size-3.5 text-brand-700" />}
                      <span>{c.flag}</span>
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[13px] font-medium text-ink mb-2">Mulai dengan</div>
              <div className="space-y-2">
                {[
                  {
                    value: true,
                    title: 'Data contoh',
                    detail: 'Empat entitas Nusantara lengkap dengan dokumen, kasus, dan SPT siap dijelajahi.',
                  },
                  {
                    value: false,
                    title: 'Ruang kerja kosong',
                    detail: 'Tambahkan entitas grup Anda sendiri dari awal.',
                  },
                ].map((opt) => {
                  const active = startWithSample === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setStartWithSample(opt.value)}
                      className={cn(
                        'w-full text-left rounded-lg border px-4 py-3 transition cursor-pointer flex items-start gap-3',
                        active ? 'border-brand-600 bg-brand-50/40' : 'border-line bg-surface hover:border-line-strong',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 size-4 rounded-full border flex items-center justify-center shrink-0',
                          active ? 'border-brand-600' : 'border-line-strong',
                        )}
                      >
                        {active && <span className="size-2 rounded-full bg-brand-600" />}
                      </span>
                      <span>
                        <span className="block text-[13.5px] font-medium text-ink">{opt.title}</span>
                        <span className="block text-xs text-ink-3 mt-0.5">{opt.detail}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full" size="lg">
              Buka ruang kerja
            </Button>
          </form>

          {!startWithSample && (
            <Callout tone="neutral" className="mt-4">
              Dalam mode demo, data contoh tetap tersedia lewat tombol muat ulang di bilah samping kapan saja.
            </Callout>
          )}
        </Card>
      )}
    </AuthSplitLayout>
  );
}
