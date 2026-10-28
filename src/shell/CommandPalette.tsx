'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, CornerDownLeft, FileText, RotateCcw, Search, ShieldAlert, Sparkles } from 'lucide-react';
import { ALL_NAV } from './nav';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { Kbd, cn } from '@/ui';

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  keywords?: string;
  run: () => void;
}

export function CommandPalette() {
  const ui = useUi();
  const ws = useWorkspace();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const open = ui.paletteOpen;
  const close = () => ui.setPaletteOpen(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ui.setPaletteOpen(!ui.paletteOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ui]);

  useEffect(() => {
    if (open) {
      setQ('');
      setIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href);
    const list: Command[] = ALL_NAV.map((n) => ({
      id: `nav-${n.href}`,
      group: 'Halaman',
      label: n.label,
      hint: n.description,
      icon: <n.icon />,
      keywords: n.description,
      run: go(n.href),
    }));
    ws.entities.forEach((e) =>
      list.push({
        id: `ent-${e.id}`,
        group: 'Entitas',
        label: `${e.flag} ${e.legalName}`,
        hint: e.taxId,
        icon: <Building2 />,
        keywords: `${e.tradeName} ${e.jurisdictionName} ${e.taxId}`,
        run: () => {
          if (ws.selectEntity(e.id)) router.push(`/entities/${e.id}`);
          else ui.toast('Entitas di luar cakupan akses peran Anda.', 'warning');
        },
      }),
    );
    ws.findings
      .filter((f) => ws.canAccess(f.entityId))
      .forEach((f) =>
        list.push({
          id: `f-${f.id}`,
          group: 'Temuan risiko',
          label: f.ruleName,
          hint: f.evidence.split('\n')[0],
          icon: <ShieldAlert />,
          keywords: `${f.rule} ${f.explanation} ${f.evidence}`,
          run: go(`/risk?f=${encodeURIComponent(f.id)}`),
        }),
      );
    ws.compliance.documents
      .filter((d) => ws.canAccess(d.doc.entityId))
      .forEach((d) =>
        list.push({
          id: `d-${d.doc.id}`,
          group: 'Dokumen',
          label: `${d.doc.counterparty.value}`,
          hint: d.doc.number.value,
          icon: <FileText />,
          keywords: `${d.doc.number.value} ${d.doc.counterpartyTaxId.value}`,
          run: go(`/documents?d=${encodeURIComponent(d.doc.id)}`),
        }),
      );
    list.push(
      { id: 'act-copilot', group: 'Aksi', label: 'Tanya AI Tax Copilot', icon: <Sparkles />, run: () => ui.setCopilotOpen(true) },
      {
        id: 'act-reset',
        group: 'Aksi',
        label: 'Muat ulang data contoh',
        hint: 'Reset database ke dataset demo',
        icon: <RotateCcw />,
        run: async () => {
          const ok = await ws.resetSampleData();
          ui.toast(ok ? 'Data contoh dimuat ulang.' : 'Gagal mereset database.', ok ? 'success' : 'danger');
        },
      },
    );
    return list;
  }, [ws, router, ui]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return commands.filter((c) => c.group === 'Halaman' || c.group === 'Aksi' || c.group === 'Entitas');
    return commands
      .filter((c) => `${c.label} ${c.hint ?? ''} ${c.keywords ?? ''}`.toLowerCase().includes(term))
      .slice(0, 40);
  }, [commands, q]);

  useEffect(() => setIndex(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  if (!open || typeof document === 'undefined') return null;

  const runAt = (i: number) => {
    const cmd = results[i];
    if (!cmd) return;
    close();
    cmd.run();
  };

  let lastGroup = '';
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[12vh]">
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label="Pencarian & perintah" className="relative w-full max-w-xl bg-surface rounded-2xl shadow-xl border border-line overflow-hidden animate-pop">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-line">
          <Search className="size-4 text-ink-3" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndex((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                runAt(index);
              } else if (e.key === 'Escape') {
                close();
              }
            }}
            placeholder="Cari halaman, entitas, temuan, dokumen…"
            className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-4 outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="nx-palette-list"
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul id="nx-palette-list" ref={listRef} role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink-3">Tidak ada hasil untuk “{q}”.</li>}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <React.Fragment key={c.id}>
                {header && <li className="px-3 pt-2.5 pb-1 text-[11px] font-medium text-ink-4 uppercase tracking-wider">{header}</li>}
                <li
                  role="option"
                  aria-selected={i === index}
                  data-index={i}
                  onMouseMove={() => setIndex(i)}
                  onClick={() => runAt(i)}
                  className={cn('flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer [&_svg]:size-4', i === index ? 'bg-muted' : '')}
                >
                  <span className="text-ink-3 shrink-0">{c.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-ink truncate">{c.label}</span>
                    {c.hint && <span className="block text-xs text-ink-3 truncate">{c.hint}</span>}
                  </span>
                  {i === index ? <CornerDownLeft className="text-ink-4 shrink-0" /> : <ArrowRight className="text-transparent shrink-0" />}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
        <div className="flex items-center gap-4 px-4 h-10 border-t border-line bg-subtle text-xs text-ink-3">
          <span className="inline-flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> pilih</span>
          <span className="inline-flex items-center gap-1.5"><Kbd>↵</Kbd> buka</span>
          <span className="ml-auto inline-flex items-center gap-1.5"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
