import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from './rateLimit';

export type ApiErrorCode =
  | 'E-VAL-001'
  | 'E-VAL-404'
  | 'E-AI-001'
  | 'E-AI-002'
  | 'E-AI-003'
  | 'E-EXP-001'
  | 'E-RATE-001'
  | 'E-SYS-001';

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getCorrelationId(request: Request): string {
  return request.headers.get('x-correlation-id')?.trim() || crypto.randomUUID();
}

export async function parseJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError('E-VAL-001', 'Body request harus berupa JSON yang valid.', 400);
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError('E-VAL-001', 'Input request tidak valid.', 422, parsed.error.issues);
  }
  return parsed.data;
}

export function ok<T>(data: T, request: Request, meta?: Record<string, unknown>): NextResponse {
  return NextResponse.json({
    data,
    meta: meta ?? {},
    correlationId: getCorrelationId(request),
  });
}

export function errorResponse(request: Request, error: unknown): NextResponse {
  const correlationId = getCorrelationId(request);
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          correlationId,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  console.error(JSON.stringify({
    level: 'error',
    event: 'api_error',
    correlationId,
    message: error instanceof Error ? error.message : 'unknown error',
  }));

  return NextResponse.json(
    {
      error: {
        code: 'E-SYS-001',
        message: 'Terjadi kesalahan internal. Coba lagi atau hubungi administrator.',
        correlationId,
      },
    },
    { status: 500 },
  );
}

export function enforceRateLimit(request: Request, bucket: string, limit = 20, windowMs = 60_000): void {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const key = `${bucket}:${forwarded || 'local'}`;
  if (!rateLimit(key, limit, windowMs)) {
    throw new ApiError('E-RATE-001', 'Terlalu banyak permintaan. Coba lagi beberapa saat lagi.', 429);
  }
}
