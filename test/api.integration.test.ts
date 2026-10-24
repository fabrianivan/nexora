import { describe, expect, it, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getHealth } from '../src/app/api/health/route';
import { GET as getStatus } from '../src/app/api/status/route';
import { POST as postScanDocument } from '../src/app/api/scan-document/route';
import { POST as postCopilot } from '../src/app/api/copilot/route';
import { GET as getWorkspace } from '../src/app/api/workspace/route';
import { resetRateLimitWindows } from '../src/lib/server/rateLimit';

describe('API route integration tests (DemoEngine & security validation)', () => {
  beforeEach(() => {
    resetRateLimitWindows();
  });

  it('GET /api/health returns 200 with structured service readiness', async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.services.bigQueryAnalytics).toBe('simulated-locally');
  });

  it('GET /api/status returns honest engine and local BigQuery simulation label', async () => {
    const res = await getStatus();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bigQueryAnalyticsLabel).toContain('simulasi BigQuery');
  });

  it('rejects unauthenticated requests without session cookie or demo header', async () => {
    const unauthWorkspaceReq = new NextRequest('http://localhost:3000/api/workspace');
    expect((await getWorkspace(unauthWorkspaceReq)).status).toBe(401);

    const unauthScanReq = new NextRequest('http://localhost:3000/api/scan-document', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'invoice.pdf' }),
    });
    expect((await postScanDocument(unauthScanReq)).status).toBe(401);

    const unauthCopilotReq = new NextRequest('http://localhost:3000/api/copilot', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Apa aturan PPN?' }),
    });
    expect((await postCopilot(unauthCopilotReq)).status).toBe(401);
  });

  it('POST /api/scan-document extracts structured fields with DemoEngine and validates payload', async () => {
    const validReq = new NextRequest('http://localhost:3000/api/scan-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nexora-demo': 'true',
      },
      body: JSON.stringify({
        fileName: 'eFaktur-TBTS-Sample.pdf',
        country: 'ID',
        documentType: 'e_invoice',
        customDpp: 100_000_000,
        customTax: 12_000_000,
      }),
    });
    const res = await postScanDocument(validReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.structuredFields.length).toBeGreaterThanOrEqual(4);
    expect(data.dpp).toBe(100_000_000);

    // Invalid file size (> 10MB)
    const oversizedReq = new NextRequest('http://localhost:3000/api/scan-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nexora-demo': 'true',
      },
      body: JSON.stringify({
        fileName: 'huge.pdf',
        fileSize: 25 * 1024 * 1024,
        country: 'ID',
      }),
    });
    expect((await postScanDocument(oversizedReq)).status).toBe(400);
  });

  it('POST /api/copilot returns grounded citations or refuses out-of-scope questions', async () => {
    const groundedReq = new NextRequest('http://localhost:3000/api/copilot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nexora-demo': 'true',
      },
      body: JSON.stringify({
        prompt: 'Jelaskan dasar aturan PPN TBTS dan biaya entertainment Pasal 9 UU PPh',
        country: 'ID',
      }),
    });
    const res = await postCopilot(groundedReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.grounded).toBe(true);
    expect(data.citations.length).toBeGreaterThan(0);

    const outOfScopeReq = new NextRequest('http://localhost:3000/api/copilot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nexora-demo': 'true',
      },
      body: JSON.stringify({
        prompt: 'Siapa pemenang piala dunia sepak bola tahun 2030?',
        country: 'ID',
      }),
    });
    const resOut = await postCopilot(outOfScopeReq);
    expect(resOut.status).toBe(200);
    const dataOut = await resOut.json();
    expect(dataOut.grounded).toBe(false);
    expect(dataOut.verification).toBe('insufficient-basis');
  });

  it('GET /api/workspace loads the sample workspace in demo mode', async () => {
    const req = new NextRequest('http://localhost:3000/api/workspace?reset=1', {
      headers: { 'x-nexora-demo': 'true' },
    });
    const res = await getWorkspace(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.workspace.entities.length).toBe(4);
  });
});
