'use client';

import React from 'react';
import { cn } from './cn';

/**
 * On a narrow screen these tables are far wider than the viewport, so the
 * container scrolls sideways. A scroll region has to be reachable by keyboard
 * (WCAG 2.1.1) and has to show that there is more to the right — but only when
 * it actually overflows, otherwise every table on a desktop page becomes a
 * pointless tab stop.
 */
function useOverflowX<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [overflowing, setOverflowing] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);
  return { ref, overflowing };
}

export function Table({
  className,
  flush,
  label,
  children,
}: {
  className?: string;
  flush?: boolean;
  /** Names the scroll region for screen readers, e.g. "Kewajiban pembayaran". */
  label?: string;
  children: React.ReactNode;
}) {
  const { ref, overflowing } = useOverflowX<HTMLDivElement>();
  return (
    <div
      ref={ref}
      {...(overflowing
        ? { tabIndex: 0, role: 'region', 'aria-label': `${label ?? 'Tabel'} — dapat digeser mendatar` }
        : {})}
      className={cn(
        'overflow-x-auto',
        overflowing && 'nx-scroll-x focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2',
        flush && '[&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0',
        className,
      )}
    >
      <table className="w-full text-left border-collapse text-[13px]">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-line-strong">{children}</thead>;
}

export function TH({ className, children, align = 'left' }: { className?: string; children?: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      scope="col"
      className={cn(
        'h-10 px-4 first:pl-5 last:pr-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3 whitespace-nowrap align-bottom pb-2',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TR({
  className,
  children,
  onClick,
  selected,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-line last:border-0 transition-colors',
        onClick && 'cursor-pointer hover:bg-subtle',
        selected && 'bg-mark-soft/70',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TD({
  className,
  children,
  align = 'left',
  colSpan,
}: {
  className?: string;
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'px-4 first:pl-5 last:pr-5 py-3.5 align-middle text-ink-2',
        align === 'right' && 'text-right num whitespace-nowrap',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}
