import { expect, test } from '@playwright/test';

test('hero flow: 1-click sample dataset load through document intelligence, risk review, and draft SPT export', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('status').first()).toContainText('DATA DEMO / SIMULASI');

  // 1. Click "Coba dengan data contoh (1-Klik)" without login
  await page.getByRole('button', { name: /Coba dengan data contoh/i }).click();

  // 2. Navigate to Document Intelligence
  await page.getByRole('button', { name: /3\. Document Intelligence/i }).click();
  await expect(
    page.getByRole('heading', { name: /Ekstraksi Terstruktur Berdampingan/i }),
  ).toBeVisible();

  // 3. Navigate to Fraud & Risk Engine
  await page.getByRole('button', { name: /4\. Fraud & Risk Engine/i }).click();
  await expect(page.getByText(/Dihitung lokal \(simulasi BigQuery\)/i).first()).toBeVisible();

  // 4. Navigate to Fiscal Reconciliation & Draft SPT Export
  await page.getByRole('button', { name: 'Calculation', exact: true }).first().click();
  await expect(
    page.getByRole('heading', { name: /Kertas Kerja Rekonsiliasi Fiskal/i }),
  ).toBeVisible();
  await expect(page.getByText(/DRAF - BUKAN UNTUK DISAMPAIKAN KE OTORITAS/i).first()).toBeVisible();

  // Open Draft SPT PDF Preview Modal
  await page.getByRole('button', { name: /Pratinjau & Cetak PDF Draf SPT/i }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'DRAF - BUKAN UNTUK DISAMPAIKAN KE OTORITAS',
  );
});

test('workspace API rejects unauthenticated requests', async ({ request }) => {
  const response = await request.get('/api/workspace');
  expect(response.status()).toBe(401);
  expect((await request.post('/api/copilot', { data: { prompt: 'test' } })).status()).toBe(401);
  expect(
    (await request.post('/api/scan-document', { data: { fileName: 'test.pdf' } })).status(),
  ).toBe(401);
});

test('mobile navigation remains available at narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('button', { name: 'Payment' })
    .click();
  await expect(page.getByRole('heading', { name: /Tax Payment & Settlement/i })).toBeVisible();
});

test('security response headers are set including CSP', async ({ request }) => {
  const response = await request.get('/');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['content-security-policy']).toContain("default-src 'self'");
});
