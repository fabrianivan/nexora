import { NextResponse } from 'next/server';
import { getAIEngine } from '@/lib/adapters/aiEngine';
import { isMysqlConfigured } from '@/lib/mysql';
import { logServerEvent } from '@/lib/server/logger';

export async function GET() {
  const aiEngine = getAIEngine();
  const payload = {
    status: 'ok' as const,
    service: 'nexora-corporate-tax-compliance',
    version: '2.0.0',
    engineMode: aiEngine.mode,
    engineLabel: aiEngine.providerLabel,
    storageBackend: isMysqlConfigured() ? ('mysql' as const) : ('in-memory' as const),
    services: {
      geminiApi: aiEngine.mode === 'live' ? 'configured' : 'demo-fallback',
      documentAi: 'simulated-locally',
      bigQueryAnalytics: 'simulated-locally',
      vertexAiRag: 'local-rag-corpus',
    },
    timestamp: new Date().toISOString(),
  };

  logServerEvent('info', 'health_check', {
    route: '/api/health',
    engine: aiEngine.mode,
    status: 200,
  });

  return NextResponse.json(payload);
}
