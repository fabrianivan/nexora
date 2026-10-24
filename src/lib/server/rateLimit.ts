import type { NextRequest } from 'next/server';

const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function getClientIp(request?: NextRequest): string {
  if (!request) return 'local';
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'local';
  }
  return request.headers.get('x-real-ip')?.trim() || 'local';
}

export function rateLimitByIp(
  request: NextRequest | undefined,
  scope: string,
  limit = 20,
  windowMs = 60_000,
): boolean {
  const ip = getClientIp(request);
  return rateLimit(`${scope}:${ip}`, limit, windowMs);
}

export function resetRateLimitWindows(): void {
  windows.clear();
}
