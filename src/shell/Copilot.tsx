'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, BookMarked, RotateCcw, Sparkles } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { MULTI_COUNTRY_DATA } from '@/data/multiCountryTaxData';
import { Sheet, Spinner, cn } from '@/ui';
import { Markdown } from './Markdown';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  citations?: string[];
  engine?: string;
  context?: string;
}

const WELCOME: Message = {
  role: 'assistant',
  text: 'Halo! Saya **Nexora Tax Copilot**. Saya bisa menjelaskan temuan risiko, menghitung dampak koreksi fiskal, dan merujuk dasar hukum (UU HPP, IRAS, LHDN, IRC, OECD BEPS) untuk entitas aktif Anda.',
};

export function Copilot() {
  const ws = useWorkspace();
  const ui = useUi();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const cfg = MULTI_COUNTRY_DATA[ws.country];
  const entity = ws.activeEntity;

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    const context = `${entity.flag} ${entity.legalName}`;
    setMessages((m) => [...m, { role: 'user', text: q, context }]);
    setInput('');
    setLoading(true);
    try {
      const entityFindings = ws.findings.filter((f) => f.entityId === entity.id);
      const openCount = entityFindings.filter((f) => {
        const st = ws.reviewOf(f.id).status;
        return st === 'open' || st === 'proposed';
      }).length;
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `[Entitas aktif: ${entity.legalName} | ${entity.entityType} | ${entity.jurisdictionName} | Induk: ${entity.parentCompanyName} | Temuan terbuka: ${openCount}/${entityFindings.length}] ${q}`,
          country: ws.country,
        }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', text: data.reply || 'Analisis selesai.', citations: data.citations, engine: data.engine }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Copilot tidak dapat dihubungi. Coba lagi sebentar.' }]);
    } finally {
      setLoading(false);
    }
  }

  // Pick up questions sent from other screens (e.g. "Tanya Copilot" on a finding).
  useEffect(() => {
    if (ui.copilotOpen && ui.pendingPrompt) {
      const p = ui.consumePendingPrompt();
      if (p) void ask(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.copilotOpen, ui.pendingPrompt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <Sheet
      open={ui.copilotOpen}
      onClose={() => ui.setCopilotOpen(false)}
      width="max-w-[460px]"
      title={
        <span className="inline-flex items-center gap-2">
          <span className="size-6 rounded-md bg-brand-600 text-white flex items-center justify-center">
            <Sparkles className="size-3.5" />
          </span>
          Tax Copilot
        </span>
      }
      description={
        <span className="inline-flex items-center gap-1.5">
          Konteks: {entity.flag} {entity.legalName}
        </span>
      }
      footer={
        <form
          className="w-full"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-surface p-1.5 pl-3 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void ask(input);
                }
              }}
              rows={1}
              placeholder={`Tanya soal ${cfg.indirectTaxName}, PPh, P3B…`}
              aria-label="Pertanyaan untuk copilot"
              className="flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-ink-4 outline-none py-1.5 max-h-32"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Kirim"
              className="size-8 rounded-lg bg-ink text-white flex items-center justify-center disabled:bg-line-strong cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-ink-4">
            <span>Jawaban bersifat informasi, bukan nasihat hukum.</span>
            <button type="button" onClick={() => setMessages([WELCOME])} className="inline-flex items-center gap-1 hover:text-ink cursor-pointer">
              <RotateCcw className="size-3" /> Percakapan baru
            </button>
          </div>
        </form>
      }
    >
      <div className="px-5 py-4 space-y-4">
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink text-white px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap">{m.text}</div>
            </div>
          ) : (
            <div key={i} className="flex gap-2.5">
              <span className="mt-0.5 size-6 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Sparkles className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <Markdown text={m.text} />
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.citations.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 rounded-md bg-subtle border border-line px-2 py-0.5 text-[11px] text-ink-3">
                        <BookMarked className="size-3" />
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                {m.engine && <div className="mt-1.5 text-[11px] text-ink-4">{m.engine}</div>}
              </div>
            </div>
          ),
        )}
        {loading && (
          <div className="flex items-center gap-2 text-[13px] text-ink-3">
            <Spinner className="size-3.5" /> Menganalisis regulasi & data entitas…
          </div>
        )}
        {messages.length === 1 && !loading && (
          <div className="pt-2">
            <div className="text-xs text-ink-3 mb-2">Coba tanyakan</div>
            <div className="space-y-1.5">
              {cfg.copilotPresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void ask(p.prompt)}
                  className={cn('w-full text-left rounded-lg border border-line px-3 py-2 text-[13px] text-ink-2 hover:border-line-strong hover:bg-subtle cursor-pointer')}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </Sheet>
  );
}
