'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, BookMarked, Database, FolderSearch, RotateCcw, ShieldOff, Sparkles, X } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { MULTI_COUNTRY_DATA } from '@/data/multiCountryTaxData';
import { isUnresolved } from '@/lib/compliance';
import { buildCaseContext } from '@/lib/cases';
import type { CopilotCitation, CopilotResponse, FindingSummary } from '@/lib/ai/copilot';
import { Sheet, Spinner, cn } from '@/ui';
import { Markdown } from './Markdown';
import { EngineTag } from './EngineTag';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  scope?: string;
  answer?: Omit<CopilotResponse, 'reply'>;
}

const WELCOME: Message = {
  role: 'assistant',
  text: 'Saya menjawab dari data workspace dan pustaka aturan Nexora, dengan sumber di setiap jawaban. Jika sumbernya tidak ada, saya katakan. Buka sebuah kasus untuk bertanya tentang bukti dan dampaknya.',
};

export const CASE_QUESTIONS = ['Kenapa temuan ini ditandai?', 'Apa dasar aturannya?', 'Berapa dampak koreksinya?', 'Langkah apa berikutnya?'];

const KIND_ICON = { case: FolderSearch, workspace: Database, rule: BookMarked } as const;

function Citations({ items }: { items: CopilotCitation[] }) {
  if (!items.length) return null;
  return (
    <ol className="mt-2.5 space-y-1" aria-label="Sumber">
      {items.map((c, i) => {
        const Icon = KIND_ICON[c.kind];
        return (
          <li key={c.id} title={c.snippet} className="flex items-start gap-1.5 text-[11px] leading-snug text-ink-3">
            <span className="num text-ink-4 w-3 shrink-0">{i + 1}</span>
            <Icon className="size-3 mt-px shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="text-ink-2">{c.label}</span>
              {!c.verified && <span className="text-ink-4"> · ringkasan, belum diverifikasi</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function Copilot() {
  const ws = useWorkspace();
  const ui = useUi();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const cfg = MULTI_COUNTRY_DATA[ws.country];
  const entity = ws.activeEntity;
  const scopedCase = caseId ? ws.findings.find((f) => f.id === caseId && ws.canAccess(f.entityId)) : undefined;

  async function ask(question: string, forCase: string | null = caseId) {
    const q = question.trim();
    if (!q || loading) return;
    const finding = forCase ? ws.findings.find((f) => f.id === forCase && ws.canAccess(f.entityId)) : undefined;
    const caseEntity = finding ? ws.entityById(finding.entityId) : undefined;
    const scope = finding ? `Kasus · ${finding.ruleName}` : `${entity.flag} ${entity.legalName}`;
    setMessages((m) => [...m, { role: 'user', text: q, scope }]);
    setInput('');
    setLoading(true);
    try {
      const findings: FindingSummary[] = ws.findings
        .filter((f) => ws.canAccess(f.entityId) && isUnresolved(ws.reviewOf(f.id).status))
        .map((f) => ({
          id: f.id,
          ruleName: f.ruleName,
          severity: f.severity,
          entityName: ws.entityById(f.entityId)?.legalName ?? f.entityId,
          country: f.country,
          amountAtRisk: f.amountAtRisk,
          status: ws.reviewOf(f.id).status === 'proposed' ? 'menunggu checker' : 'terbuka',
        }));
      const brief = finding ? ws.compliance.investigations?.[finding.id]?.brief.map((b) => b.text) : undefined;
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          country: finding?.country ?? ws.country,
          entityName: caseEntity?.legalName ?? entity.legalName,
          case: finding ? buildCaseContext(finding, ws.compliance.documents, caseEntity?.legalName ?? finding.entityId, ws.reviewOf(finding.id), brief) : undefined,
          findings,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as CopilotResponse;
      const { reply, ...answer } = data;
      setMessages((m) => [...m, { role: 'assistant', text: reply, answer }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Copilot tidak dapat dihubungi. Coba lagi sebentar.' }]);
    } finally {
      setLoading(false);
    }
  }

  // Pick up questions sent from other screens; a case id scopes the conversation.
  useEffect(() => {
    if (ui.copilotOpen && ui.pendingPrompt) {
      const p = ui.consumePendingPrompt();
      if (!p) return;
      const next = p.caseId ?? null;
      setCaseId(next);
      void ask(p.prompt, next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.copilotOpen, ui.pendingPrompt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, loading]);

  const presets = scopedCase ? CASE_QUESTIONS.map((p) => ({ id: p, title: p, prompt: p })) : cfg.copilotPresets;

  return (
    <Sheet
      open={ui.copilotOpen}
      onClose={() => ui.setCopilotOpen(false)}
      width="max-w-[460px]"
      title={
        <span className="inline-flex items-center gap-2">
          <span className="size-6 rounded-md bg-brand-700 text-white flex items-center justify-center">
            <Sparkles className="size-3.5" />
          </span>
          Tax Copilot
        </span>
      }
      description={
        scopedCase ? (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <FolderSearch className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">Kasus: {scopedCase.ruleName} · {ws.entityById(scopedCase.entityId)?.legalName}</span>
            <button type="button" onClick={() => setCaseId(null)} aria-label="Keluar dari konteks kasus" className="rounded p-0.5 hover:bg-muted cursor-pointer">
              <X className="size-3" />
            </button>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">Konteks: {entity.flag} {entity.legalName}</span>
        )
      }
      footer={
        <form
          className="w-full"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <div className="flex items-end gap-2 rounded-md border border-line-strong bg-surface p-1.5 pl-3 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-500/15">
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
              placeholder={scopedCase ? 'Tanya soal kasus ini…' : `Tanya soal ${cfg.indirectTaxName}, PPh, P3B…`}
              aria-label="Pertanyaan untuk copilot"
              className="flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-ink-4 outline-none py-1.5 max-h-32"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Kirim"
              className="size-8 rounded-md bg-brand-700 text-white flex items-center justify-center disabled:bg-line-strong cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-ink-4">
            <span>Informasi, bukan nasihat hukum. AI tidak memutuskan temuan.</span>
            <button type="button" onClick={() => { setMessages([WELCOME]); setCaseId(null); }} className="inline-flex items-center gap-1 hover:text-ink cursor-pointer">
              <RotateCcw className="size-3" /> Percakapan baru
            </button>
          </div>
        </form>
      }
    >
      <div className="px-5 py-4 space-y-4">
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex flex-col items-end gap-1">
              <div className="max-w-[85%] rounded-lg rounded-br-sm bg-muted text-ink px-3.5 py-2 text-[13.5px] leading-relaxed whitespace-pre-wrap">{m.text}</div>
              {m.scope && <div className="text-[11px] text-ink-4">{m.scope}</div>}
            </div>
          ) : m.answer?.refused ? (
            <div key={i} className="flex gap-2.5">
              <span className="mt-0.5 size-6 rounded-md bg-muted text-ink-3 flex items-center justify-center shrink-0">
                <ShieldOff className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1 rounded-xl border border-line bg-subtle px-3 py-2.5">
                <div className="text-[11px] font-medium text-ink-3 mb-1">Ditolak · {m.answer.engine.label}</div>
                <p className="text-[13px] text-ink-2 leading-relaxed">{m.text}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-2.5">
              <span className="mt-0.5 size-6 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Sparkles className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <Markdown text={m.text} />
                {m.answer && <Citations items={m.answer.citations} />}
                {m.answer && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-4">
                    <EngineTag engine={m.answer.engine} />
                    {m.answer.confidence && (
                      <span title={m.answer.confidenceBasis} className={cn(m.answer.confidence === 'Rendah' && 'text-warning-700')}>
                        Keyakinan {m.answer.confidence.toLowerCase()} · {m.answer.confidenceBasis}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
        {loading && (
          <div className="flex items-center gap-2 text-[13px] text-ink-3">
            <Spinner className="size-3.5" /> Mencari di data kasus & pustaka aturan…
          </div>
        )}
        {(messages.length === 1 || (scopedCase && !loading && messages[messages.length - 1]?.role === 'assistant' && messages.length <= 3)) && !loading && (
          <div className="pt-2">
            <div className="text-xs text-ink-3 mb-2">{scopedCase ? 'Tanya tentang kasus ini' : 'Coba tanyakan'}</div>
            <div className="space-y-1.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void ask(p.prompt)}
                  className="w-full text-left rounded-lg border border-line px-3 py-2 text-[13px] text-ink-2 hover:border-line-strong hover:bg-subtle cursor-pointer"
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
