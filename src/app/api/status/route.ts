import { NextResponse } from 'next/server';
import { getAIEngine } from '@/lib/adapters/aiEngine';
import { isMysqlConfigured } from '@/lib/mysql';

export async function GET() {
  const aiEngine = getAIEngine();
  return NextResponse.json({
    mode: aiEngine.mode === 'live' ? 'live-gemini' : 'demo-simulation',
    engineMode: aiEngine.mode,
    engineLabel: aiEngine.providerLabel,
    gemini: aiEngine.mode === 'live',
    documentAi: false,
    documentScanner: aiEngine.mode === 'live' ? 'gemini-assisted-extraction' : 'simulation-only',
    bigQuery: false,
    bigQueryAnalyticsLabel: 'Dihitung lokal (simulasi BigQuery)',
    mysqlConfigured: isMysqlConfigured(),
    storageBackend: isMysqlConfigured() ? 'mysql' : 'in-memory',
  });
}
