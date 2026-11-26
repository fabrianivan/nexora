import React from 'react';

export interface InlineToken {
  type: 'text' | 'bold' | 'italic' | 'code' | 'badge_npwp';
  value: string;
}

export interface BlockToken {
  type: 'h2' | 'h3' | 'h4' | 'bullet' | 'ordered' | 'divider' | 'formula' | 'paragraph';
  content: string;
  order?: number;
  inlines: InlineToken[];
}

export function parseInlineMarkdown(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*|NPWP:\s*[0-9.\-\s]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: text.slice(lastIndex, match.index),
      });
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('**') && matchedStr.endsWith('**') && matchedStr.length >= 4) {
      tokens.push({
        type: 'bold',
        value: matchedStr.slice(2, -2),
      });
    } else if (matchedStr.startsWith('`') && matchedStr.endsWith('`') && matchedStr.length >= 2) {
      tokens.push({
        type: 'code',
        value: matchedStr.slice(1, -1),
      });
    } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*') && matchedStr.length >= 2) {
      tokens.push({
        type: 'italic',
        value: matchedStr.slice(1, -1),
      });
    } else if (matchedStr.startsWith('NPWP:')) {
      tokens.push({
        type: 'badge_npwp',
        value: matchedStr,
      });
    } else {
      tokens.push({
        type: 'text',
        value: matchedStr,
      });
    }

    lastIndex = match.index + matchedStr.length;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      value: text.slice(lastIndex),
    });
  }

  return tokens;
}

export function parseBlockMarkdown(text: string): BlockToken[] {
  const lines = text.split('\n');
  const blocks: BlockToken[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed === '---') {
      blocks.push({
        type: 'divider',
        content: '',
        inlines: [],
      });
      continue;
    }

    if (
      trimmed.includes('Laba Fiskal =') ||
      trimmed.includes('PPh 24 =') ||
      trimmed.startsWith('Rumus:')
    ) {
      blocks.push({
        type: 'formula',
        content: trimmed,
        inlines: parseInlineMarkdown(trimmed),
      });
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      const content = trimmed.slice(5).trim();
      blocks.push({
        type: 'h4',
        content,
        inlines: parseInlineMarkdown(content),
      });
      continue;
    }

    if (trimmed.startsWith('### ')) {
      const content = trimmed.slice(4).trim();
      blocks.push({
        type: 'h3',
        content,
        inlines: parseInlineMarkdown(content),
      });
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const content = trimmed.slice(3).trim();
      blocks.push({
        type: 'h2',
        content,
        inlines: parseInlineMarkdown(content),
      });
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2).trim();
      blocks.push({
        type: 'bullet',
        content,
        inlines: parseInlineMarkdown(content),
      });
      continue;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const content = numMatch[2].trim();
      blocks.push({
        type: 'ordered',
        order: parseInt(numMatch[1], 10),
        content,
        inlines: parseInlineMarkdown(content),
      });
      continue;
    }

    blocks.push({
      type: 'paragraph',
      content: rawLine,
      inlines: parseInlineMarkdown(rawLine),
    });
  }

  return blocks;
}

export function renderInlines(inlines: InlineToken[], isUser = false): React.ReactNode[] {
  return inlines.map((token, i) => {
    switch (token.type) {
      case 'bold':
        return React.createElement(
          'strong',
          {
            key: i,
            className: isUser ? 'font-bold text-white' : 'font-semibold text-slate-900',
          },
          token.value
        );
      case 'italic':
        return React.createElement(
          'em',
          {
            key: i,
            className: 'italic',
          },
          token.value
        );
      case 'code':
        return React.createElement(
          'code',
          {
            key: i,
            className: `font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded font-semibold ${
              isUser
                ? 'bg-blue-700/60 text-white'
                : 'bg-slate-100 text-blue-700 border border-slate-200'
            }`,
          },
          token.value
        );
      case 'badge_npwp':
        return React.createElement(
          'span',
          {
            key: i,
            className: `inline-flex items-center font-mono tabular-nums text-[11px] px-2 py-0.5 rounded-md font-semibold border ${
              isUser
                ? 'bg-blue-800 text-white border-blue-400/40'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`,
          },
          token.value
        );
      case 'text':
      default:
        return React.createElement('span', { key: i }, token.value);
    }
  });
}
