import { NextRequest, NextResponse } from 'next/server';
import { accessTokenMatches, createSession, isSessionValid, sessionCookieName, sessionIsConfigured } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/rateLimit';

export async function GET(request: NextRequest) {
  if (!sessionIsConfigured()) return NextResponse.json({ configured: false, authenticated: false }, { status: 503 });
  return NextResponse.json({ configured: true, authenticated: isSessionValid(request) });
}

export async function POST(request: NextRequest) {
  if (!sessionIsConfigured()) return NextResponse.json({ error: 'Akses belum dikonfigurasi. Atur NEXORA_ACCESS_TOKEN dan NEXORA_SESSION_SECRET.' }, { status: 503 });
  if (!rateLimit('session-login', 10, 60_000)) return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi dalam satu menit.' }, { status: 429 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request harus berupa JSON.' }, { status: 400 }); }
  const token = typeof body === 'object' && body !== null ? (body as { token?: unknown }).token : undefined;
  if (!accessTokenMatches(token)) return NextResponse.json({ error: 'Token akses tidak valid.' }, { status: 401 });

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(sessionCookieName, createSession(), {
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(sessionCookieName, '', { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
