import type { AIEngine, EngineMode } from './contracts';
import { DemoEngine } from './demoEngine';
import { LiveEngine } from './liveEngine';
import { ResilientEngine } from './resilientEngine';

export * from './contracts';
export { DemoEngine } from './demoEngine';
export { LiveEngine } from './liveEngine';
export { ResilientEngine } from './resilientEngine';

const DEFAULT_TIMEOUT_MS = 12_000;

export function getConfiguredMode(): EngineMode {
  return process.env.ENGINE_MODE?.trim().toLowerCase() === 'live' ? 'live' : 'demo';
}

export function getEngineTimeoutMs(): number {
  const parsed = Number(process.env.AI_ENGINE_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export function createEngine(options?: {
  mode?: EngineMode;
  apiKey?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): AIEngine {
  const configuredMode = options?.mode ?? getConfiguredMode();
  const demo = new DemoEngine();
  if (configuredMode !== 'live') return demo;

  const apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return demo;

  const timeoutMs = options?.timeoutMs ?? getEngineTimeoutMs();
  return new ResilientEngine(
    new LiveEngine({ apiKey, timeoutMs, fetchImpl: options?.fetchImpl }),
    demo,
    timeoutMs,
  );
}

export function getEngineStatus() {
  const configuredMode = getConfiguredMode();
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  const activeMode: EngineMode = configuredMode === 'live' && hasApiKey ? 'live' : 'demo';
  return {
    configuredMode,
    activeMode,
    provider: activeMode === 'live' ? 'google-generative-language' : 'deterministic',
    model: activeMode === 'live' ? 'gemini-2.5-flash' : 'nexora-demo-v1',
    liveConfigured: configuredMode === 'live',
    hasApiKey,
    fallbackEnabled: configuredMode === 'live' && hasApiKey,
    timeoutMs: getEngineTimeoutMs(),
    reason: configuredMode === 'live' && !hasApiKey
      ? 'ENGINE_MODE=live tetapi GEMINI_API_KEY tidak tersedia; memakai DemoEngine.'
      : undefined,
  };
}
