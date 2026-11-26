/**
 * Minimal server-side client for the Gemini API (generativelanguage.googleapis.com).
 * The key stays on the server; the model is configurable so the deployment can move
 * to the current Flash model without a code change.
 */
import { withTimeout } from './timeout';

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function geminiKey(): string | null {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

export function geminiTimeoutMs(): number {
  const parsed = Number(process.env.AI_ENGINE_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20_000;
}

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  [key: string]: unknown;
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface GenerateRequest {
  system: string;
  contents: GeminiContent[];
  tools?: FunctionDeclaration[];
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

export class GeminiError extends Error {}

/** One generateContent call. Returns the first candidate's content. */
export async function generate(req: GenerateRequest, fetchImpl: typeof fetch = fetch): Promise<GeminiContent> {
  const key = geminiKey();
  if (!key) throw new GeminiError('GEMINI_API_KEY tidak diatur.');
  const model = geminiModel();
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: req.contents,
    generationConfig: {
      temperature: req.temperature ?? 0.1,
      maxOutputTokens: req.maxOutputTokens ?? 1600,
      ...(req.json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (req.tools?.length) body.tools = [{ functionDeclarations: req.tools }];

  const res = await withTimeout(
    fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    }),
    geminiTimeoutMs(),
    'Gemini tidak merespons tepat waktu.',
  );
  if (!res.ok) throw new GeminiError(`Gemini HTTP ${res.status}`);
  const payload = (await res.json()) as { candidates?: { content?: GeminiContent }[] };
  const content = payload.candidates?.[0]?.content;
  if (!content?.parts?.length) throw new GeminiError('Gemini tidak mengembalikan konten.');
  return { role: 'model', parts: content.parts };
}

export function textOf(content: GeminiContent): string {
  return content.parts.map((p) => p.text ?? '').join('').trim();
}

export function stripCodeFence(value: string): string {
  return value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}
