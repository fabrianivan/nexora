import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/database';
import { ensureDatabaseSeeded } from '@/lib/seedDatabase';
import { dbGetAllUnifiedData } from '@/lib/database';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await initDatabase(true);
    await ensureDatabaseSeeded();
    const data = await dbGetAllUnifiedData();
    return NextResponse.json({
      success: true,
      message: 'Database successfully reset to official compliant state.',
      data,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: 'Database reset failed',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
