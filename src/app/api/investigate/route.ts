import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { RiskFinding, WorkspaceDocument } from '@/lib/compliance';
import { investigate } from '@/lib/ai/investigator';
import { rateLimit } from '@/lib/server/rateLimit';

export const runtime = 'nodejs';

const findingSchema = z
  .object({
    id: z.string().min(1).max(300),
    entityId: z.string().min(1).max(100),
    country: z.enum(['ID', 'SG', 'MY', 'US']),
    rule: z.string().min(1).max(50),
    ruleName: z.string().max(200),
    severity: z.enum(['critical', 'high', 'medium']),
    explanation: z.string().max(2000),
    documentIds: z.array(z.string().max(100)).max(50),
  })
  .passthrough();

const bodySchema = z.object({
  finding: findingSchema,
  entityName: z.string().max(200).default(''),
  documents: z
    .array(z.object({ doc: z.object({ id: z.string().min(1) }).passthrough() }).passthrough())
    .max(1000),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`investigate:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan investigasi. Coba lagi sebentar.' }, { status: 429 });
  }
  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Body bukan JSON yang valid.' }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ error: 'Data kasus tidak lengkap.' }, { status: 400 });

  const finding = parsed.data.finding as unknown as RiskFinding;
  const documents = parsed.data.documents as unknown as WorkspaceDocument[];
  const investigation = await investigate({ finding, documents }, parsed.data.entityName || finding.entityId);
  return NextResponse.json(investigation);
}
