'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Search, Sparkles } from 'lucide-react';
import { Sidebar, SidebarContent, Logo } from './Sidebar';
import { Notifications } from './Notifications';
import { AccountMenu } from './AccountMenu';
import { CommandPalette } from './CommandPalette';
import { Copilot } from './Copilot';
import { Toaster } from './Toaster';
import { navFor } from './nav';
import { useUi } from '@/state/ui';
import { Button, IconButton, Kbd, Sheet, Skeleton, useMounted } from '@/ui';

function Topbar() {
  const ui = useUi();
  const pathname = usePathname();
  const { item, group } = navFor(pathname);

  return (
    <header data-shell className="sticky top-0 z-20 h-14 bg-canvas/85 backdrop-blur-md border-b border-line">
      <div className="h-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 flex items-center gap-2 sm:gap-3">
        <IconButton label="Buka navigasi" className="lg:hidden -ml-1" onClick={() => ui.setMobileNavOpen(true)}>
          <Menu />
        </IconButton>
        <span className="lg:hidden">
          <Logo compact />
        </span>
        <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-2 text-[13px] min-w-0">
          {group?.label && (
            <>
              <span className="text-ink-3 truncate">{group.label}</span>
              <span className="text-ink-4">/</span>
            </>
          )}
          <span className="text-ink font-medium truncate">{item?.label ?? 'Nexora'}</span>
        </nav>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
          <button
            type="button"
            onClick={() => ui.setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 h-9 w-64 px-3 rounded-lg border border-line bg-surface text-[13px] text-ink-4 hover:border-line-strong shadow-xs cursor-pointer"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Cari apa saja…</span>
            <Kbd>⌘K</Kbd>
          </button>
          <IconButton label="Cari (⌘K)" className="md:hidden" onClick={() => ui.setPaletteOpen(true)}>
            <Search />
          </IconButton>
          <span className="hidden sm:block">
            <Button variant="secondary" size="sm" icon={<Sparkles className="text-brand-600" />} onClick={() => ui.setCopilotOpen(true)} className="h-9">
              Copilot
            </Button>
          </span>
          <IconButton label="Tax Copilot" className="sm:hidden" onClick={() => ui.setCopilotOpen(true)}>
            <Sparkles />
          </IconButton>
          <Notifications />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-80" />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const ui = useUi();
  // Pages depend on the viewer's clock/time zone and on client-hydrated data,
  // so they render after mount; the shell itself is server-rendered.
  const mounted = useMounted();
  return (
    <div className="min-h-screen lg:pl-[var(--sidebar-w)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] focus:bg-surface focus:px-3 focus:py-2 focus:rounded-lg focus:shadow-lg">
        Lewati ke konten
      </a>
      <Sidebar />
      <Topbar />
      <main id="main" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {mounted ? children : <PageSkeleton />}
      </main>
      <Sheet open={ui.mobileNavOpen} onClose={() => ui.setMobileNavOpen(false)} side="left" width="max-w-[288px]">
        <SidebarContent onNavigate={() => ui.setMobileNavOpen(false)} />
      </Sheet>
      <CommandPalette />
      <Copilot />
      <Toaster />
    </div>
  );
}
