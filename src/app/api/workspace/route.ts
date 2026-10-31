import { NextRequest } from 'next/server';
import { workspaceSchema } from '@/lib/domain';
import { workspaceRepository } from '@/lib/mysql';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const workspace = await workspaceRepository.load();
    return Response.json({ 
      workspace,
      storageType: workspaceRepository.isLive() ? 'mysql' : 'memory_fallback' 
    });
  } catch (err: unknown) {
    return Response.json({ 
      error: 'Workspace tidak dapat dimuat.', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: 'Request body kosong.' }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 5 * 1024 * 1024) {
      await reader.cancel();
      return Response.json({ error: 'Workspace maksimal 5 MB.' }, { status: 413 });
    }
    chunks.push(value);
  }
  let body: unknown = null;
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    body = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch { 
    return Response.json({ error: 'Request body harus berupa JSON yang valid.' }, { status: 400 }); 
  }
  const parsed = workspaceSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Data workspace tidak valid.', issues: parsed.error.issues }, { status: 400 });
  try {
    await workspaceRepository.save(parsed.data);
    return Response.json({ 
      saved: true, 
      storageType: workspaceRepository.isLive() ? 'mysql' : 'memory_fallback' 
    });
  } catch (err: unknown) {
    return Response.json({ 
      error: 'Penyimpanan workspace gagal.', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
