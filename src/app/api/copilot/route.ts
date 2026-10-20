import { NextRequest } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/server/rateLimit';

const schema = z.object({ prompt: z.string().trim().min(2).max(4000), country: z.enum(['ID', 'SG', 'MY', 'US']), entityName: z.string().trim().min(2).max(160), calculationContext: z.string().max(2000).optional() });
const sources = {
  ID: [{ title: 'Direktorat Jenderal Pajak', url: 'https://www.pajak.go.id/' }],
  SG: [{ title: 'IRAS Corporate Income Tax', url: 'https://www.iras.gov.sg/taxes/corporate-income-tax' }],
  MY: [{ title: 'LHDN Malaysia', url: 'https://www.hasil.gov.my/' }],
  US: [{ title: 'IRS Businesses', url: 'https://www.irs.gov/businesses' }],
} as const;

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY?.trim()) return Response.json({ error: 'Copilot membutuhkan GEMINI_API_KEY' }, { status: 503 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
  if (!rateLimit(`copilot:${ip}`)) return Response.json({ error: 'Batas permintaan tercapai. Coba lagi dalam satu menit.' }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Input Copilot tidak valid.' }, { status: 400 });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `Anda adalah Copilot pajak Nexora untuk yurisdiksi ${parsed.data.country}. Konteks entitas: ${parsed.data.entityName}. Angka sudah dihitung aplikasi: ${parsed.data.calculationContext ?? 'tidak tersedia'}. Jangan menghitung ulang atau mengarang data. Jelaskan secara ringkas, bedakan asumsi dari fakta, dan sarankan verifikasi ke sumber resmi.` }] },
        contents: [{ role: 'user', parts: [{ text: parsed.data.prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 1000 },
      }),
    });
    if (!response.ok || !response.body) return Response.json({ error: 'Layanan Gemini tidak tersedia. Gunakan Simulator untuk perhitungan manual.' }, { status: 502 });
    return new Response(response.body, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Nexora-Citations': encodeURIComponent(JSON.stringify(sources[parsed.data.country])) } });
  } catch { return Response.json({ error: 'Gemini timeout atau tidak dapat dihubungi. Gunakan Simulator.' }, { status: 504 }); }
  finally { clearTimeout(timeout); }
}
