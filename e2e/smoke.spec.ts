import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page, request }) => {
  await request.post('/api/db/reset');
  await page.goto('/overview');
  await page.evaluate(() => localStorage.clear());
});

test('every module renders from the sidebar', async ({ page }) => {
  await page.goto('/overview');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Selamat/);
  const pages: [string, RegExp][] = [
    ['Entitas & struktur', /Entitas & struktur grup/],
    ['Dokumen', /^Dokumen$/],
    ['Risiko & fraud', /Risiko & fraud/],
    ['Review temuan', /Review temuan/],
    ['Rekonsiliasi fiskal', /Rekonsiliasi fiskal/],
    ['SPT tahunan', /SPT Tahunan PPh Badan 1771/],
    ['Pembayaran', /Pembayaran/],
    ['Pemegang saham & UBO', /Pemegang saham/],
    ['Kalender pajak', /Kalender pajak/],
    ['Laporan & audit', /Laporan & audit/],
    ['Studi & simulator', /Studi & simulator/],
  ];
  for (const [link, heading] of pages) {
    await page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('link', { name: link }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
  }
});

test('maker-checker: a maker cannot approve their own proposal', async ({ page }) => {
  await page.goto('/review');
  await page.getByRole('option').filter({ hasText: '13.875.000' }).click();
  await page.getByLabel('Catatan maker').fill('Tidak ada kontrak & laporan jasa konsultan.');
  await page.getByRole('button', { name: 'Ajukan ke checker' }).click();
  await page.getByRole('tab', { name: /Menunggu checker/ }).click();
  await expect(page.getByText('Maker-checker: pengusul tidak boleh menyetujui usulannya sendiri.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Setujui' })).toHaveCount(0);

  // Switch to the CFO as independent checker, approve, then apply the correction.
  await page.getByRole('button', { name: /Masuk sebagai/ }).click();
  await page.getByRole('button', { name: 'Setujui' }).click();
  await page.getByRole('tab', { name: /Selesai/ }).click();
  await page.getByRole('option').filter({ hasText: 'Koreksi belum diterapkan' }).click();
  await page.getByRole('button', { name: 'Terapkan' }).click();

  await page.goto('/calculation');
  await expect(page.locator('tr', { hasText: '6300' })).toContainText('Rp 23.375.000');
});

test('uploading a document runs the risk engine', async ({ page }) => {
  await page.goto('/documents');
  await page.getByRole('button', { name: 'Unggah dokumen' }).click();
  await page.getByLabel('Nomor dokumen').fill('010.000-26.00099999');
  await page.getByLabel('Vendor / pemasok').fill('CV Bayangan Fiktif');
  await page.getByLabel('Identitas pajak pihak lawan').fill('0999888777666000');
  await page.getByLabel(/^DPP/).fill('50000000');
  await page.getByRole('button', { name: 'Simpan & analisis' }).click();
  await expect(page.getByText(/temuan risiko baru/)).toBeVisible();
  await page.goto('/risk');
  await expect(page.getByText('CV Bayangan Fiktif').first()).toBeVisible();
});

test('subsidiary staff cannot open other entities', async ({ page }) => {
  await page.goto('/overview');
  await page.getByRole('button', { name: 'Akun & peran' }).click();
  await page.getByRole('button', { name: /Marcus Tan/ }).click();
  await page.goto('/entities/ENT-US-004');
  await expect(page.getByText('Di luar cakupan akses Anda')).toBeVisible();
});

test('command palette navigates', async ({ page }) => {
  await page.goto('/overview');
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('kalender');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/calendar/);
});
