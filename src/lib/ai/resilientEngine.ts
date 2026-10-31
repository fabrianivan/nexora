import {
  AIEngine,
  CopilotInput,
  CopilotOutput,
  CrossCheckInput,
  CrossCheckOutput,
  EngineError,
  EngineResult,
  ExtractInput,
  ExtractOutput,
  RiskInput,
  RiskOutput,
} from './contracts';
import { withTimeout } from './timeout';

export class ResilientEngine implements AIEngine {
  readonly mode = 'live' as const;

  constructor(
    private readonly primary: AIEngine,
    private readonly fallback: AIEngine,
    private readonly timeoutMs = 15_000,
  ) {}

  private async run<T>(
    operation: string,
    primary: () => Promise<EngineResult<T>>,
    fallback: () => Promise<EngineResult<T>>,
  ): Promise<EngineResult<T>> {
    try {
      return await withTimeout(primary(), this.timeoutMs, `Live engine timeout saat ${operation}.`);
    } catch (error) {
      const fallbackResult = await fallback();
      const code = error instanceof EngineError ? error.code : 'E-AI-003';
      return {
        data: fallbackResult.data,
        meta: {
          ...fallbackResult.meta,
          fallback: true,
          notice: `Live engine gagal (${code}) pada ${operation}. Mode Demo digunakan agar proses tetap berjalan.`,
        },
      };
    }
  }

  extract(input: ExtractInput): Promise<EngineResult<ExtractOutput>> {
    return this.run('extract', () => this.primary.extract(input), () => this.fallback.extract(input));
  }

  crossCheck(input: CrossCheckInput): Promise<EngineResult<CrossCheckOutput>> {
    return this.run('crossCheck', () => this.primary.crossCheck(input), () => this.fallback.crossCheck(input));
  }

  analyzeRisk(input: RiskInput): Promise<EngineResult<RiskOutput>> {
    return this.run('analyzeRisk', () => this.primary.analyzeRisk(input), () => this.fallback.analyzeRisk(input));
  }

  askCopilot(input: CopilotInput): Promise<EngineResult<CopilotOutput>> {
    return this.run('askCopilot', () => this.primary.askCopilot(input), () => this.fallback.askCopilot(input));
  }
}
