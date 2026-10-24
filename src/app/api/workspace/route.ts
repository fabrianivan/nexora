import { NextRequest } from 'next/server';
import { workspaceSchema } from '@/lib/domain';
import { workspaceRepository } from '@/lib/mysql';
import { isRequestAuthorized } from '@/lib/server/session';
import { rateLimitByIp } from '@/lib/server/rateLimit';
import { logServerEvent } from '@/lib/server/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!isRequestAuthorized(request)) {
    return Response.json({ error: 'Autentikasi diperlukan.' }, { status: 401 });
  }
  if (!rateLimitByIp(request, 'workspace:get', 60, 60_000)) {
    return Response.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 });
  }
  try {
    const resetParam = request.nextUrl.searchParams.get('reset');
    const workspace =
      resetParam === '1' || resetParam === 'true'
        ? await workspaceRepository.resetToSample()
        : await workspaceRepository.load();

    logServerEvent('info', 'workspace_loaded', {
      route: '/api/workspace',
      status: 200,
      meta: { backend: workspaceRepository.backend, reset: Boolean(resetParam) },
    });

    return Response.json({
      workspace,
      backend: workspaceRepository.backend,
    });
  } catch {
    return Response.json(
      { error: 'Penyimpanan workspace tidak dapat diakses. Periksa konfigurasi database.' },
      { status: 503 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isRequestAuthorized(request)) {
    return Response.json({ error: 'Autentikasi diperlukan.' }, { status: 401 });
  }
  if (!rateLimitByIp(request, 'workspace:put', 30, 60_000)) {
    return Response.json({ error: 'Terlalu banyak permintaan penyimpanan.' }, { status: 429 });
  }

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
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    body = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return Response.json({ error: 'Request body harus berupa JSON yang valid.' }, { status: 400 });
  }
  const parsed = workspaceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Data workspace tidak valid.' }, { status: 400 });
  }
  try {
    await workspaceRepository.save(parsed.data);
    logServerEvent('info', 'workspace_saved', {
      route: '/api/workspace',
      status: 200,
      meta: { backend: workspaceRepository.backend },
    });
    return Response.json({ saved: true, backend: workspaceRepository.backend });
  } catch {
    return Response.json(
      { error: 'Penyimpanan workspace gagal. Perubahan belum tersimpan.' },
      { status: 503 },
    );
  }
}
