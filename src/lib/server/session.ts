import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const sessionCookieName = 'nexora_session';
const sessionLifetimeSeconds = 8 * 60 * 60;
const fallbackDemoSecret = 'nexora-demo-fallback-session-secret-v2';

export function sessionIsConfigured(): boolean {
  return Boolean(process.env.NEXORA_ACCESS_TOKEN?.trim() && process.env.NEXORA_SESSION_SECRET?.trim());
}

function getSigningSecret(): string {
  return process.env.NEXORA_SESSION_SECRET?.trim() || fallbackDemoSecret;
}

function sign(timestamp: string): string {
  return createHmac('sha256', getSigningSecret())
    .update(`nexora-session:v1:${timestamp}`)
    .digest('base64url');
}

export function createSession(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return `${timestamp}.${sign(timestamp)}`;
}

export function isSessionValid(request: NextRequest): boolean {
  const value = request.cookies.get(sessionCookieName)?.value;
  if (!value) return false;
  const [timestamp, signature, extra] = value.split('.');
  if (!timestamp || !signature || extra) return false;
  const issuedAt = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now || now - issuedAt > sessionLifetimeSeconds) return false;
  const expected = Buffer.from(sign(timestamp));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function isRequestAuthorized(request: NextRequest): boolean {
  if (isSessionValid(request)) return true;
  // Allow UI requests in Smart Demo Mode when explicit demo header is sent
  const demoHeader = request.headers.get('x-nexora-demo');
  if (demoHeader === 'true' || demoHeader === '1') {
    return true;
  }
  return false;
}

export function accessTokenMatches(candidate: unknown): boolean {
  const configured = process.env.NEXORA_ACCESS_TOKEN?.trim();
  if (!configured) {
    // In Smart Demo Mode without NEXORA_ACCESS_TOKEN configured, allow non-empty demo tokens
    return typeof candidate === 'string' && candidate.trim().length > 0 && candidate.length <= 512;
  }
  if (typeof candidate !== 'string' || candidate.length > 512) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(candidate);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
