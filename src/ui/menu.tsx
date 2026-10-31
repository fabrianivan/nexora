'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from './cn';

/** Anchored popover that closes on outside click / Escape. */
export function Popover({
  open,
  onClose,
  children,
  className,
  align = 'right',
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const anchor = ref.current?.parentElement;
      if (anchor && !anchor.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        'absolute top-full mt-2 z-50 bg-surface border border-line rounded-xl shadow-lg animate-pop origin-top',
        align === 'right' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  hint,
  onClick,
  active,
  disabled,
  danger,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  hint?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        danger ? 'text-danger-700 hover:bg-danger-50' : 'text-ink-2 hover:bg-muted hover:text-ink',
        active && 'bg-muted text-ink',
      )}
    >
      {icon && <span className={cn(danger ? 'text-danger-600' : 'text-ink-3')}>{icon}</span>}
      <span className="flex-1 min-w-0">{children}</span>
      {hint && <span className="text-xs text-ink-4 shrink-0">{hint}</span>}
    </button>
  );
}
