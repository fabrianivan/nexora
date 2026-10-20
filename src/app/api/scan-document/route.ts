import { NextRequest } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/server/rateLimit';

const metadataSchema = z.object({ country: z.enum(['ID', 'SG', 'MY', 'US']), entityId: z.string().min(1), documentType: z.enum(['deed', 'shareholder', 'financial_statement', 'previous_tax_return', 'e_invoice']) });
const extractionSchema = z.object({
  number: z.string().nullable().optional(), date: z.string().nullable().optional(),
  counterparty: z.string().nullable().optional(), counterpartyTaxId: z.string().nullable().optional(),
  taxableBase: z.number().nullable().optional(), taxAmount: z.number().nullable().optional(),
  totalAmount: z.number().nullable().optional(), ownershipPercentage: z.number().min(0).max(100).nullable().optional(),
  invoiceUuid: z.string().nullable().optional(), taxIdValidated: z.boolean().optional(),
  hasSupportingEvidence: z.boolean().optional(), deductible: z.boolean().optional(),
  confidenceByField: z.record(z.string(), z.number().min(0).max(1)).optional(),
});
const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export async function GET() { return Response.json({ live: Boolean(process.env.GEMINI_API_KEY), provider: process.env.GEMINI_API_KEY ? 'Gemini Vision' : null }); }

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY?.trim()) return Response.json({ error: 'Ekstraksi Live membutuhkan GEMINI_API_KEY. Lanjutkan dengan Mode Manual.' }, { status: 503 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
  if (!rateLimit(`scan:${ip}`, 5)) return Response.json({ error: 'Batas ekstraksi tercapai. Coba lagi dalam satu menit.' }, { status: 429 });
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const metadata = metadataSchema.safeParse({ country: form?.get('country'), entityId: form?.get('entityId'), documentType: form?.get('documentType') });
  if (!(file instanceof File) || !metadata.success || !allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024) return Response.json({ error: 'File/metadata tidak valid. Gunakan PDF/JPG/PNG maksimal 10 MB.' }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const prompt = `Extract this ${metadata.data.documentType} for ${metadata.data.country}. Return JSON only with keys number,date(YYYY-MM-DD),counterparty,counterpartyTaxId,taxableBase,taxAmount,totalAmount,ownershipPercentage,invoiceUuid,taxIdValidated,hasSupportingEvidence,deductible,confidenceByField. Use null/empty for absent values. Never infer unseen values.`;
    const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: file.type, data: bytes.toString('base64') } }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }) });
    if (!result.ok) return Response.json({ error: 'Ekstraksi AI gagal. Isi field secara manual.' }, { status: 502 });
    const json = await result.json(); const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') return Response.json({ error: 'AI tidak mengembalikan data terstruktur. Isi manual.' }, { status: 502 });
    let candidate: unknown;
    try { candidate = JSON.parse(text); } catch { return Response.json({ error: 'Respons AI bukan JSON yang valid. Isi manual.' }, { status: 502 }); }
    const extraction = extractionSchema.safeParse(candidate);
    if (!extraction.success) return Response.json({ error: 'Struktur hasil AI tidak valid. Isi manual.' }, { status: 502 });
    return Response.json({ data: extraction.data, provider: 'Gemini Vision' });
  } catch { return Response.json({ error: 'Ekstraksi timeout atau gagal. Isi field secara manual.' }, { status: 504 }); }
  finally { clearTimeout(timeout); }
}
