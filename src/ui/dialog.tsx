'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './cn';

function useOverlay(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('[data-autofocus], input, select, textarea, button:not([data-close])');
      (el ?? panelRef.current)?.focus();
    }, 20);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);
  return panelRef;
}

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const ref = useOverlay(open, onClose);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
        <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] animate-in" onClick={onClose} />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className={cn(
            'relative w-full bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl border border-line flex flex-col max-h-[92vh] animate-pop outline-none',
            width,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-ink">{title}</h2>
              {description && <p className="text-[13px] text-ink-3 mt-0.5">{description}</p>}
            </div>
            <button data-close type="button" onClick={onClose} aria-label="Tutup" className="-mr-2 -mt-1 size-8 inline-flex items-center justify-center rounded-lg text-ink-3 hover:bg-muted hover:text-ink cursor-pointer">
              <X className="size-4" />
            </button>
          </div>
          <div className="px-6 py-5 overflow-y-auto">{children}</div>
          {footer && <div className="px-6 py-3.5 border-t border-line bg-subtle rounded-b-2xl flex flex-wrap items-center justify-end gap-2">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-xl',
  side = 'right',
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  side?: 'right' | 'left';
}) {
  const ref = useOverlay(open, onClose);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex">
        <div className="absolute inset-0 bg-ink/25 backdrop-blur-[1px] animate-in" onClick={onClose} />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className={cn(
            'relative h-full w-full bg-surface shadow-xl flex flex-col animate-sheet outline-none',
            width,
            side === 'right' ? 'ml-auto border-l border-line' : 'mr-auto border-r border-line',
          )}
        >
          {title && (
            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                {description && <div className="text-[13px] text-ink-3 mt-0.5">{description}</div>}
              </div>
              <button data-close type="button" onClick={onClose} aria-label="Tutup" className="-mr-2 -mt-1 size-8 inline-flex items-center justify-center rounded-lg text-ink-3 hover:bg-muted hover:text-ink cursor-pointer">
                <X className="size-4" />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto">{children}</div>
          {footer && <div className="px-6 py-3.5 border-t border-line bg-subtle flex flex-wrap items-center justify-end gap-2">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Lanjutkan',
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 px-3.5 rounded-lg text-sm font-medium text-ink-2 hover:bg-muted cursor-pointer">
            Batal
          </button>
          <button
            type="button"
            data-autofocus
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              'h-9 px-3.5 rounded-lg text-sm font-medium text-white cursor-pointer',
              danger ? 'bg-danger-600 hover:bg-danger-700' : 'bg-brand-600 hover:bg-brand-700',
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {description && <p className="text-sm text-ink-2">{description}</p>}
    </Dialog>
  );
}
