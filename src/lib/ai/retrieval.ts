import type { SourceChunk, SourceDocument } from '@/lib/domain';

const STOPWORDS = new Set([
  'a', 'an', 'and', 'apa', 'apakah', 'atau', 'bagaimana', 'dan', 'dari', 'dengan',
  'di', 'for', 'how', 'ini', 'is', 'itu', 'of', 'on', 'or', 'the', 'to', 'untuk',
  'what', 'yang',
]);

export interface RetrievedChunk {
  source: SourceDocument;
  chunk: SourceChunk;
  score: number;
}

function normalizeToken(token: string): string {
  // Strip common Indonesian enclitics/possessives so inflections like
  // "koreksinya" or "aturannya" match "koreksi" and "aturan".
  if (token.length > 5 && /(?:nya|kah|lah)$/.test(token)) {
    return token.slice(0, -3);
  }
  if (token.length > 4 && /(?:ku|mu)$/.test(token)) {
    return token.slice(0, -2);
  }
  return token;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map(normalizeToken)
      .filter((token) => token.length > 1 && !STOPWORDS.has(token)),
  );
}

export function retrieveChunks(
  sources: SourceDocument[],
  question: string,
  limit = 3,
): RetrievedChunk[] {
  const queryTokens = tokenize(question);
  if (queryTokens.size === 0) return [];

  const matches: RetrievedChunk[] = [];
  for (const source of sources) {
    for (const chunk of source.chunks) {
      const chunkTokens = tokenize(`${source.title} ${source.publisher} ${chunk.article} ${chunk.text}`);
      let overlap = 0;
      for (const token of queryTokens) {
        if (chunkTokens.has(token)) overlap += 1;
      }
      if (overlap === 0) continue;
      matches.push({
        source,
        chunk,
        score: overlap / Math.sqrt(queryTokens.size * Math.max(1, chunkTokens.size)),
      });
    }
  }

  return matches
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
