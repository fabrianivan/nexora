import { geminiKey, geminiModel } from '@/lib/ai/gemini';

/** Which engines are live. Never returns secrets. */
export async function GET() {
  const live = Boolean(geminiKey());
  return Response.json({
    mode: live ? 'live' : 'offline',
    gemini: live,
    model: live ? geminiModel() : null,
    label: live ? 'Gemini · live' : 'Simulasi lokal · offline',
    mysqlConfigured: Boolean(process.env.MYSQL_URL?.trim()),
  });
}
