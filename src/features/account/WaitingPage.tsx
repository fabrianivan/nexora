'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Mail, MinusCircle } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { Logo } from '@/shell/Sidebar';
import { Badge, Button, ButtonLink, Card } from '@/ui';

export function WaitingPage() {
  const ws = useWorkspace();
  const router = useRouter();
  const owner = ws.account.members.find((m) => m.isOwner) ?? ws.account.members[0];
  const waitingMember = ws.isViewOnly
    ? ws.activeMember
    : ws.account.members.find((m) => m.status === 'waiting') ?? ws.activeMember;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <header className="border-b border-line bg-surface/70">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="rounded-md" aria-label="Nexora, beranda">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Badge tone="neutral" dot>{ws.account.workspaceConfig.groupName}</Badge>
            <Link href="/sign-in" className="text-[13px] font-medium text-ink-2 hover:text-ink">
              Ganti akun
            </Link>
          </div>
        </div>
      </header>

      <main id="utama" className="flex-1 mx-auto w-full max-w-[680px] px-4 py-14 sm:py-20">
        <div className="eyebrow">{ws.account.workspaceConfig.groupName} · Ruang kerja</div>
        <h1 className="mt-3 font-serif text-[36px] sm:text-[46px] leading-[1.06] tracking-[-0.02em] text-ink text-balance">
          Akun Anda siap. Peran Anda belum ditetapkan.
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-3">
          Anda bergabung dengan akses baca-saja sementara. Pemilik ruang kerja menentukan entitas dan tugas yang dapat Anda buka, dan pemberitahuan telah dikirimkan kepada mereka.
        </p>

        <Card className="mt-7 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="size-10 rounded-full bg-ink text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {owner.avatarInitials}
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-ink truncate">{owner.name}</div>
              <div className="text-xs text-ink-3 truncate">Pemilik ruang kerja · {owner.email}</div>
            </div>
          </div>
          <Badge tone="success" dot>Diberitahu baru saja</Badge>
        </Card>

        <div className="mt-8">
          <div className="eyebrow !text-[10.5px] mb-3">Sambil menunggu</div>
          <ul className="border-y border-line divide-y divide-line">
            <li className="flex items-center gap-3 py-3.5 text-[14px] text-ink">
              <CheckCircle2 className="size-4 text-success-600 shrink-0" />
              <span>Anda sudah dapat membuka halaman Ringkasan grup.</span>
            </li>
            <li className="flex items-center gap-3 py-3.5 text-[14px] text-ink-2">
              <MinusCircle className="size-4 text-ink-4 shrink-0" />
              <span>Entitas, dokumen, kasus, dan SPT tetap tertutup hingga peran ditetapkan.</span>
            </li>
            <li className="flex items-center gap-3 py-3.5 text-[14px] text-ink-2">
              <Mail className="size-4 text-brand-600 shrink-0" />
              <span>Email pemberitahuan dikirim segera setelah pemilik menetapkan peran Anda.</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              ws.setActiveMemberId(waitingMember.id);
              router.push('/overview');
            }}
          >
            Buka Ringkasan
          </Button>
          <ButtonLink href="/sign-in" variant="secondary" size="lg">
            Keluar
          </ButtonLink>
        </div>

        <p className="mt-4 text-xs text-ink-4">
          Masuk sebagai <span className="font-mono text-ink-3">{waitingMember.email}</span>
        </p>
      </main>
    </div>
  );
}
