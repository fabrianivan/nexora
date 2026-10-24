import { NextRequest, NextResponse } from 'next/server';
import { MULTI_COUNTRY_DATA, CountryCode } from '@/data/multiCountryTaxData';
import { isSessionValid } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/rateLimit';

function getSystemInstruction(country: CountryCode): string {
  const cfg = MULTI_COUNTRY_DATA[country] || MULTI_COUNTRY_DATA.ID;
  return `Anda adalah asisten umum untuk pertanyaan pajak ${cfg.name}. Informasi konteks ini hanya label yurisdiksi, bukan sumber hukum atau data resmi.

Berikan jawaban umum. Jangan mengarang tarif, pasal, tenggat, atau sitasi. Kutip sumber hanya jika sumber tersebut benar-benar tersedia dalam konteks; jika tidak, nyatakan keterbatasan dan tulis: PERLU VERIFIKASI AHLI PAJAK.`;
}

function generateMultiCountryFallback(_prompt: string, country: CountryCode) {
  const cfg = MULTI_COUNTRY_DATA[country] || MULTI_COUNTRY_DATA.ID;
  return {
    engine: 'Simulasi lokal Nexora (tanpa sumber eksternal)',
    confidence: null,
    citations: [],
    verification: 'simulation',
    reply: `Saya belum dapat memverifikasi jawaban pajak ${cfg.name} dari sumber resmi. Hubungkan model AI dan tinjau setiap klaim dengan penasihat pajak. PERLU VERIFIKASI AHLI PAJAK.`,
  };
}

export async function POST(req: NextRequest) {
  if (!isSessionValid(req)) return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 });
  if (!rateLimit('copilot:session', 20)) return NextResponse.json({ error: 'Batas permintaan tercapai. Coba lagi sebentar.' }, { status: 429 });
  try {
    const body = await req.json();
    const { prompt, country = 'ID' } = body as {
      prompt: string;
      country?: CountryCode;
    };
    if (typeof prompt !== 'string' || prompt.trim().length === 0 || prompt.length > 4000 || !(country in MULTI_COUNTRY_DATA)) {
      return NextResponse.json({ error: 'Prompt atau yurisdiksi tidak valid.' }, { status: 400 });
    }
    const effectiveKey = process.env.GEMINI_API_KEY?.trim();

    if (effectiveKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${effectiveKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: getSystemInstruction(country) }],
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature: 0.25,
                maxOutputTokens: 1200,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const text =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            generateMultiCountryFallback(prompt, country).reply;
          return NextResponse.json({
            reply: `⚠️ Keluaran AI belum diverifikasi oleh sumber resmi. PERLU VERIFIKASI AHLI PAJAK.\n\n${text}`,
            citations: [],
            engine: 'Gemini API (sumber hukum tidak diambil atau diverifikasi)',
            confidence: null,
            verification: 'unverified-ai-output',
            disclaimer: 'Jawaban AI belum diverifikasi. Tarif, aturan, dan tenggat pajak: PERLU VERIFIKASI AHLI PAJAK.',
          });
        }
      } catch {
        // Fallback to multi-country smart simulation
      }
    }

    const simulation = generateMultiCountryFallback(prompt, country);
    return NextResponse.json({
      ...simulation,
      engine: 'Simulasi lokal Nexora (tanpa sumber eksternal)',
      confidence: null,
      citations: [],
      verification: 'simulation',
      disclaimer: 'Ini simulasi dengan data contoh, bukan nasihat atau verifikasi pajak. Tarif, aturan, dan tenggat: PERLU VERIFIKASI AHLI PAJAK.',
      reply: `⚠️ SIMULASI — bukan nasihat pajak dan tidak memeriksa sumber resmi. PERLU VERIFIKASI AHLI PAJAK.\n\n${simulation.reply}`,
    });
  } catch {
    return NextResponse.json(
      { error: 'Gagal memproses permintaan AI Copilot Multi-Negara' },
      { status: 500 }
    );
  }
}
