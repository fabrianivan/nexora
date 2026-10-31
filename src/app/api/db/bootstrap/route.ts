import { NextResponse } from 'next/server';
import { dbGetAllUnifiedData } from '@/lib/database';
import { ensureDatabaseSeeded } from '@/lib/seedDatabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureDatabaseSeeded();
    const data = await dbGetAllUnifiedData();
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to load database state',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
