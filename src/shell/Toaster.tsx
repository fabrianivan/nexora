'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useUi } from '@/state/ui';
import { cn, useMounted } from '@/ui';

export function Toaster() {
  const { toasts, dismissToast } = useUi();
  const mounted = useMounted();
  if (!mounted) return null;
  return createPortal(
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[80] flex flex-col items-end gap-2 pointer-events-none" aria-live="polite">
      {toasts.map((t) => {
        const Icon = { success: CheckCircle2, info: Info, warning: AlertTriangle, danger: XCircle }[t.tone];
        const color = { success: 'text-success-500', info: 'text-brand-400', warning: 'text-warning-500', danger: 'text-danger-500' }[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto w-full sm:w-auto sm:max-w-sm flex items-start gap-2.5 rounded-xl bg-ink text-white shadow-lg pl-3.5 pr-2 py-2.5 animate-in"
          >
            <Icon className={cn('size-4 mt-0.5 shrink-0', color)} />
            <span className="text-[13px] leading-snug flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismissToast(t.id);
                }}
                className="text-[13px] font-medium text-brand-300 hover:text-white px-1.5 cursor-pointer"
              >
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Tutup" onClick={() => dismissToast(t.id)} className="size-6 rounded-md text-white/50 hover:text-white flex items-center justify-center cursor-pointer">
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
