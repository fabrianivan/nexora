'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Database, RotateCcw } from 'lucide-react';
import { NAV, CYCLE } from './nav';
import { useCycleStatus } from './cycle';
import { EntitySwitcher } from './EntitySwitcher';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { Meter, StatusDot, cn, useMounted } from '@/ui';

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      <span className={cn('font-serif text-[24px] leading-none tracking-[-0.02em] text-ink', compact && 'text-[21px]')}>
        Nexora<span className="text-brand-600">.</span>
      </span>
      {!compact && <span className="eyebrow !text-[9.5px] !tracking-[0.14em] translate-y-[-2px]">Tax</span>}
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
      <div className="h-16 px-5 flex items-center shrink-0">
        <Link href="/overview" onClick={onNavigate} className="rounded-md">
          <Logo />
        </Link>
      </div>

      <div className="px-3 pb-3">
        <EntitySwitcher />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6" aria-label="Navigasi utama">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.label && <div className="eyebrow px-2 pb-2 !text-[10.5px] text-ink-4">{group.label}</div>}
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
                        'group relative flex items-center gap-2.5 h-8 px-2 rounded-md text-[13.5px] transition-colors',
                        active ? 'bg-surface text-ink font-medium shadow-[inset_2px_0_0_var(--color-ink)]' : 'text-ink-2 hover:text-ink hover:bg-muted/60',
                      )}
                    >
                      {item.step ? (
                        <span
                          className={cn(
                            'w-5 shrink-0 text-center font-serif text-[14px] leading-none num',
                            st?.done ? 'text-success-600' : active ? 'text-ink' : 'text-ink-4',
                          )}
                        >
                          {st?.done ? <Check className="size-3.5 inline" strokeWidth={2.5} aria-label="Selesai" /> : item.step}
                        </span>
                      ) : (
                        <Icon className={cn('size-4 w-5 shrink-0', active ? 'text-ink' : 'text-ink-4 group-hover:text-ink-3')} />
                      )}
                      <span className="flex-1 truncate">{item.label}</span>
                      {st?.count ? (
                        <span
                          className={cn(
                            'text-[12px] font-medium num',
                            st.tone === 'danger' ? 'text-danger-600' : st.tone === 'warning' ? 'text-warning-700' : 'text-ink-4',
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

      <div className="px-3 pb-2">
        {(() => {
          const doneCount = CYCLE.filter((c) => status[c.href]?.done).length;
          const current = CYCLE.find((c) => !status[c.href]?.done) ?? CYCLE[CYCLE.length - 1];
          const pct = Math.round((doneCount / CYCLE.length) * 100);
          return (
            <Link
              href={current.href}
              onClick={onNavigate}
              className="block rounded-md border border-line bg-surface/80 px-3 py-2.5 hover:border-line-strong transition-colors"
            >
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                <span>Siklus TB 2026</span>
                <span className="num">{doneCount}/{CYCLE.length}</span>
              </div>
              <div className="mt-1 text-[12px] font-medium text-ink truncate">
                {doneCount === CYCLE.length ? 'Semua langkah selesai' : `Langkah ${current.step} dari ${CYCLE.length} · ${current.label}`}
              </div>
              <Meter value={pct} tone={doneCount === CYCLE.length ? 'success' : 'brand'} className="mt-2" label="Progres siklus kepatuhan" />
            </Link>
          );
        })()}
      </div>

      <div className="px-3 py-3 border-t border-line">
        <div className="px-2 flex items-center gap-2.5">
          <Database className="size-3.5 text-ink-4 shrink-0" />
          <div className="min-w-0 flex-1 flex items-center gap-1.5 text-[11px] text-ink-3">
            <StatusDot tone={ws.hydrated ? 'success' : 'warning'} />
            <span className="uppercase font-semibold tracking-wider">{ws.dbEngine}</span>
            <span className="text-ink-4">·</span>
            <span className="truncate">{mounted ? timeAgo(ws.lastSyncedAt) : '…'}</span>
          </div>
          <button
            type="button"
            title="Muat ulang data contoh"
            aria-label="Muat ulang data contoh"
            onClick={async () => {
              const ok = await ws.resetSampleData();
              ui.toast(ok ? 'Data contoh dimuat ulang ke kondisi awal.' : 'Gagal mereset database.', ok ? 'success' : 'danger');
            }}
            className="size-7 inline-flex items-center justify-center rounded-md text-ink-4 hover:bg-muted hover:text-ink cursor-pointer"
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
    <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-[var(--sidebar-w)] bg-canvas border-r border-line">
      <SidebarContent />
    </aside>
  );
}
