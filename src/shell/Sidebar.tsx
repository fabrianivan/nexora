'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Database, RotateCcw } from 'lucide-react';
import { NAV } from './nav';
import { useCycleStatus } from './cycle';
import { EntitySwitcher } from './EntitySwitcher';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { StatusDot, cn, useMounted } from '@/ui';

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="size-7 rounded-lg bg-ink flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
          <path d="M6 18V6l12 12V6" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="18" cy="6" r="2" fill="var(--color-brand-400)" />
        </svg>
      </span>
      <span className={cn('text-[15px] font-semibold tracking-tight text-ink', compact && 'hidden sm:inline')}>Nexora</span>
    </span>
  );
}

function timeAgo(iso: string | null) {
  if (!iso) return 'belum tersinkron';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'baru saja';
  if (s < 3600) return `${Math.round(s / 60)} mnt lalu`;
  return `${Math.round(s / 3600)} jam lalu`;
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const status = useCycleStatus();
  const ws = useWorkspace();
  const ui = useUi();
  const mounted = useMounted();

  return (
    <div className="flex h-full flex-col">
      <div className="h-14 px-4 flex items-center shrink-0">
        <Link href="/overview" onClick={onNavigate} className="rounded-md">
          <Logo />
        </Link>
      </div>

      <div className="px-2.5 pb-2">
        <EntitySwitcher />
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-4 space-y-5" aria-label="Navigasi utama">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.label && <div className="px-2.5 pb-1.5 text-[11px] font-medium text-ink-4 uppercase tracking-wider">{group.label}</div>}
            <ul className="space-y-px">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const st = status[item.href];
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      title={st?.hint ?? item.description}
                      className={cn(
                        'group flex items-center gap-2.5 h-8 px-2.5 rounded-lg text-[13px] transition-colors',
                        active ? 'bg-muted text-ink font-medium' : 'text-ink-2 hover:bg-muted/70 hover:text-ink',
                      )}
                    >
                      {item.step ? (
                        <span
                          className={cn(
                            'size-[18px] rounded-full text-[10px] font-semibold flex items-center justify-center shrink-0 num',
                            st?.done ? 'bg-success-100 text-success-700' : active ? 'bg-ink text-white' : 'bg-surface ring-1 ring-line-strong text-ink-3',
                          )}
                        >
                          {st?.done ? <Check className="size-3" strokeWidth={3} /> : item.step}
                        </span>
                      ) : (
                        <Icon className={cn('size-4 shrink-0', active ? 'text-ink' : 'text-ink-3 group-hover:text-ink-2')} />
                      )}
                      <span className="flex-1 truncate">{item.label}</span>
                      {st?.count ? (
                        <span
                          className={cn(
                            'min-w-5 h-5 px-1.5 rounded-full text-[11px] font-medium inline-flex items-center justify-center num',
                            st.tone === 'danger' ? 'bg-danger-50 text-danger-700' : st.tone === 'warning' ? 'bg-warning-50 text-warning-700' : 'bg-muted text-ink-3',
                          )}
                        >
                          {st.count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-2.5 border-t border-line">
        <div className="rounded-lg px-2.5 py-2 flex items-center gap-2.5">
          <Database className="size-4 text-ink-3 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-ink-2">
              <StatusDot tone={ws.hydrated ? 'success' : 'warning'} />
              <span className="uppercase font-medium tracking-wide">{ws.dbEngine}</span>
              <span className="text-ink-4">·</span>
              <span className="text-ink-3 truncate">{mounted ? timeAgo(ws.lastSyncedAt) : '…'}</span>
            </div>
          </div>
          <button
            type="button"
            title="Muat ulang data contoh"
            aria-label="Muat ulang data contoh"
            onClick={async () => {
              const ok = await ws.resetSampleData();
              ui.toast(ok ? 'Data contoh dimuat ulang ke kondisi awal.' : 'Gagal mereset database.', ok ? 'success' : 'danger');
            }}
            className="size-7 inline-flex items-center justify-center rounded-md text-ink-3 hover:bg-muted hover:text-ink cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-[var(--sidebar-w)] bg-surface border-r border-line">
      <SidebarContent />
    </aside>
  );
}
