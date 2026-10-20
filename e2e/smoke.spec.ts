import { expect, test } from '@playwright/test';

async function authenticate(page: import('@playwright/test').Page) {
  const response = await page.request.post('/api/session', { data: { token: 'test-access-token' } });
  expect(response.ok()).toBeTruthy();
}

test('demo labels are visible and primary navigation switches workspace', async ({ page }) => {
  await authenticate(page);
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('DATA DEMO / SIMULASI');
  await page.getByRole('button', { name: 'Calculation', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: /Kertas Kerja Rekonsiliasi Fiskal/ })).toBeVisible();
});

test('workspace API rejects unauthenticated requests', async ({ request }) => {
  const response = await request.get('/api/workspace');
  expect(response.status()).toBe(401);
  expect((await request.post('/api/copilot', { data: { prompt: 'test' } })).status()).toBe(401);
  expect((await request.post('/api/scan-document', { data: { fileName: 'test.pdf' } })).status()).toBe(401);
});

test('mobile navigation remains available at narrow viewport', async ({ page }) => {
  await authenticate(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('button', { name: 'Payment' }).click();
  await expect(page.getByRole('heading', { name: /Tax Payment & Settlement/ })).toBeVisible();
});

test('security response headers are set', async ({ request }) => {
  const response = await request.get('/');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
});
