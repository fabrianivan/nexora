/**
 * Honest engine labels for every AI output (PRODUCT.md principle 3).
 * Shared by server routes and client components, so it must not read env vars.
 */
export type EngineMode = 'live' | 'offline';

export interface EngineBadge {
  mode: EngineMode;
  /** Short label shown in the UI, e.g. "Gemini · live" or "Simulasi lokal · offline". */
  label: string;
  /** Model id when a live model answered. */
  model?: string;
  /** True when a live call failed and the offline engine answered instead. */
  fallback?: boolean;
  /** One sentence for a tooltip: why this engine answered. */
  notice?: string;
}

export const liveBadge = (model: string, notice?: string): EngineBadge => ({ mode: 'live', label: 'Gemini · live', model, notice });

export const offlineBadge = (notice?: string, fallback = false): EngineBadge => ({
  mode: 'offline',
  label: fallback ? 'Simulasi lokal · fallback' : 'Simulasi lokal · offline',
  fallback,
  notice: notice ?? 'GEMINI_API_KEY tidak diatur; mesin deterministik lokal menjawab dari data workspace dan pustaka aturan.',
});

/** Confidence is shown as a word with its basis, never as a fake-precise percentage. */
export type ConfidenceLabel = 'Tinggi' | 'Sedang' | 'Rendah';

export function confidenceLabel(value: number): ConfidenceLabel {
  if (value >= 0.75) return 'Tinggi';
  if (value >= 0.45) return 'Sedang';
  return 'Rendah';
}
