import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { countrySchema } from '@/lib/domain';
import { getAIEngine } from '@/lib/adapters/aiEngine';
import { isRequestAuthorized } from '@/lib/server/session';
import { rateLimitByIp } from '@/lib/server/rateLimit';
import { logServerEvent } from '@/lib/server/logger';

const copilotBodySchema = z.object({
  prompt: z.string().trim().min(2).max(2000),
  country: countrySchema.default('ID'),
  language: z.enum(['id', 'en']).default('id'),
  activeEntityName: z.string().trim().max(160).optional(),
  activeEntityTaxId: z.string().trim().max(80).optional(),
  activeFindingSummary: z.string().trim().max(600).optional(),
  activeReconciliationSummary: z.string().trim().max(600).optional(),
});

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  if (!isRequestAuthorized(req)) {
    return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 });
  }
  if (!rateLimitByIp(req, 'copilot', 25, 60_000)) {
    return NextResponse.json(
      { error: 'Batas permintaan tercapai. Coba lagi sebentar.' },
      { status: 429 },
    );
  }

  try {
    const rawBody: unknown = await req.json();
    const parsed = copilotBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Prompt atau yurisdiksi tidak valid.' },
        { status: 400 },
      );
    }

    const {
      prompt,
      country,
      language,
      activeEntityName,
      activeEntityTaxId,
      activeFindingSummary,
      activeReconciliationSummary,
    } = parsed.data;

    const aiEngine = getAIEngine();
    const result = await aiEngine.askCopilot({
      question: prompt,
      country,
      language,
      contextSummary: {
        entityName: activeEntityName,
        entityTaxId: activeEntityTaxId,
        activeFindingsSummary: activeFindingSummary,
        reconciliationSummary: activeReconciliationSummary,
      },
    });

    logServerEvent('info', 'copilot_answered', {
      route: '/api/copilot',
      engine: result.engineMode,
      country,
      durationMs: Date.now() - startedAt,
      status: 200,
      meta: { grounded: result.grounded, citationCount: result.citations.length },
    });

    return NextResponse.json({
      id: result.id,
      reply: result.answer,
      answer: result.answer,
      citations: result.citations,
      confidence: Math.round(result.confidence * 100),
      grounded: result.grounded,
      engine: aiEngine.providerLabel,
      engineMode: result.engineMode,
      fallbackUsed: result.fallbackUsed,
      verification: result.grounded ? 'rag-grounded' : 'insufficient-basis',
      disclaimer:
        'Alat bantu analisis kepatuhan pajak (Grounded RAG), bukan nasihat pajak resmi. Seluruh tarif, pasal, dan posisi fiskal: PERLU VERIFIKASI AHLI PAJAK.',
    });
  } catch {
    return NextResponse.json(
      { error: 'Gagal memproses permintaan AI Copilot Multi-Negara' },
      { status: 500 },
    );
  }
}
