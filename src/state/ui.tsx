'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export type ToastTone = 'success' | 'info' | 'warning' | 'danger';
export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface UiState {
  toasts: Toast[];
  toast: (message: string, tone?: ToastTone, action?: Toast['action']) => void;
  dismissToast: (id: number) => void;

  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;

  copilotOpen: boolean;
  setCopilotOpen: (v: boolean) => void;
  /** Opens the copilot and asks a question on the user's behalf. */
  askCopilot: (prompt: string) => void;
  pendingPrompt: string | null;
  consumePendingPrompt: () => string | null;

  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
}

const UiContext = createContext<UiState | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const seq = useRef(0);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (message: string, tone: ToastTone = 'success', action?: Toast['action']) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-2), { id, message, tone, action }]);
      window.setTimeout(() => dismissToast(id), action ? 6500 : 3800);
    },
    [dismissToast],
  );

  const askCopilot = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
    setCopilotOpen(true);
  }, []);

  const consumePendingPrompt = useCallback(() => {
    const p = pendingPrompt;
    setPendingPrompt(null);
    return p;
  }, [pendingPrompt]);

  const value = useMemo(
    () => ({
      toasts,
      toast,
      dismissToast,
      paletteOpen,
      setPaletteOpen,
      copilotOpen,
      setCopilotOpen,
      askCopilot,
      pendingPrompt,
      consumePendingPrompt,
      mobileNavOpen,
      setMobileNavOpen,
    }),
    [toasts, toast, dismissToast, paletteOpen, copilotOpen, askCopilot, pendingPrompt, consumePendingPrompt, mobileNavOpen],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiState {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
  return ctx;
}
