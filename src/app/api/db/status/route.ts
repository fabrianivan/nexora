import { NextResponse } from 'next/server';
import { getDatabaseStatus } from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getDatabaseStatus();
    return NextResponse.json(status);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: 'Database status check failed',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
