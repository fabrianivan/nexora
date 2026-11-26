import React from 'react';
import { parseBlockMarkdown, parseInlineMarkdown, type InlineToken } from '@/lib/chatMarkdown';

function Inlines({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((t, i) => {
        if (t.type === 'bold') return <strong key={i} className="font-semibold text-ink">{t.value}</strong>;
        if (t.type === 'italic') return <em key={i}>{t.value}</em>;
        if (t.type === 'code' || t.type === 'badge_npwp')
          return <code key={i} className="font-mono text-[12px] px-1 py-0.5 rounded bg-muted text-ink">{t.value}</code>;
        return <React.Fragment key={i}>{t.value}</React.Fragment>;
      })}
    </>
  );
}

/** Renders the copilot's limited markdown (headings, lists, rules, formulas, inline marks). */
export function Markdown({ text }: { text: string }) {
  const blocks = parseBlockMarkdown(text);
  return (
    <div className="space-y-2 text-[13px] leading-relaxed text-ink-2">
      {blocks.map((b, i) => {
        const inl = b.inlines?.length ? b.inlines : parseInlineMarkdown(b.content);
        switch (b.type) {
          case 'h2':
            return <h3 key={i} className="text-sm font-semibold text-ink pt-1"><Inlines tokens={inl} /></h3>;
          case 'h3':
          case 'h4':
            return <h4 key={i} className="text-[13px] font-semibold text-ink pt-1"><Inlines tokens={inl} /></h4>;
          case 'divider':
            return <hr key={i} className="border-line" />;
          case 'formula':
            return <div key={i} className="font-mono text-xs bg-subtle border border-line rounded-lg px-3 py-2 text-ink"><Inlines tokens={inl} /></div>;
          case 'bullet':
            return (
              <div key={i} className="flex gap-2 pl-1">
                <span className="mt-2 size-1 rounded-full bg-ink-4 shrink-0" />
                <div className="min-w-0"><Inlines tokens={inl} /></div>
              </div>
            );
          case 'ordered':
            return (
              <div key={i} className="flex gap-2 pl-1">
                <span className="text-ink-3 num shrink-0">{b.order}.</span>
                <div className="min-w-0"><Inlines tokens={inl} /></div>
              </div>
            );
          default:
            return <p key={i}><Inlines tokens={inl} /></p>;
        }
      })}
    </div>
  );
}
