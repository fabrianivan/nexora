import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page, request }) => {
  await request.post('/api/db/reset');
  await page.goto('/overview');
  await page.evaluate(() => localStorage.clear());
});

test('every module renders from the sidebar', async ({ page }) => {
  await page.goto('/overview');
  await expect(page.getByText(/Selamat (pagi|siang|sore|malam)/).first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const pages: [string, RegExp][] = [
    ['Entitas & struktur', /Entitas & struktur grup/],
    ['Dokumen', /^Dokumen$/],
    ['Kasus', /^Kasus$/],
    ['Rekonsiliasi fiskal', /Rekonsiliasi/],
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
  await page.goto('/cases');
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
  await page.goto('/cases');
  await expect(page.getByText('CV Bayangan Fiktif').first()).toBeVisible();
});

test('old risk and review links land on the merged Kasus screen', async ({ page }) => {
  await page.goto('/review?tab=done');
  await expect(page).toHaveURL(/\/cases\?tab=done/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Kasus$/);
  await page.goto('/risk');
  await expect(page).toHaveURL(/\/cases/);
});

test('a case shows field-level evidence and an offline investigation with cited steps', async ({ page }) => {
  await page.goto('/cases?tab=todo');
  await page.getByRole('option').filter({ hasText: 'PT Sinar Logistik' }).first().click();
  await expect(page.getByText('Invoice pada tanggal yang sama')).toBeVisible();
  await page.getByRole('tab', { name: /Investigasi AI/ }).click();
  await page.getByRole('button', { name: 'Jalankan investigasi' }).click();
  await expect(page.getByText(/Saran:/)).toBeVisible();
  await expect(page.getByText('Simulasi lokal · offline').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Langkah 1' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Pakai draf catatan' }).click();
  await expect(page.getByLabel('Catatan maker')).not.toHaveValue('');
});

test('copilot cites its sources and refuses off-topic questions', async ({ page }) => {
  await page.goto('/cases?tab=done');
  await page.getByRole('option').filter({ hasText: 'CV Mega Suplai' }).first().click();
  await page.getByRole('button', { name: 'Tanya Copilot' }).click();
  const panel = page.getByRole('dialog');
  await expect(panel.getByRole('list', { name: 'Sumber' }).first()).toBeVisible();
  await expect(panel.getByText(/Pasal 39A UU KUP/).first()).toBeVisible();
  await panel.getByLabel('Pertanyaan untuk copilot').fill('Berapa harga saham BBCA besok?');
  await panel.getByRole('button', { name: 'Kirim' }).click();
  await expect(panel.getByText(/di luar cakupan Nexora/)).toBeVisible();
});

test('choosing a file runs extraction immediately, without an extra click', async ({ page }) => {
  await page.goto('/documents');
  await page.getByRole('button', { name: 'Unggah dokumen' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Ekstrak AI' })).toHaveCount(0);
  // Manual input typed before the upload must survive the extraction.
  await dialog.getByLabel('Vendor / pemasok').fill('PT Sinar Abadi');
  await dialog.locator('input[type="file"]').setInputFiles({ name: 'faktur-oktober.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 demo') });
  await expect(dialog.getByText(/field terisi otomatis/)).toBeVisible();
  await expect(dialog.getByLabel('Nomor dokumen')).toHaveValue(/INV-2026-\d+/);
  await expect(dialog.getByLabel('Vendor / pemasok')).toHaveValue('PT Sinar Abadi');
  await expect(dialog.getByLabel(/^DPP/)).not.toHaveValue('');

  // Removing the file clears what the AI filled but keeps manual input.
  await dialog.getByRole('button', { name: 'Hapus' }).click();
  await expect(dialog.getByLabel('Nomor dokumen')).toHaveValue('');
  await expect(dialog.getByLabel('Vendor / pemasok')).toHaveValue('PT Sinar Abadi');

  await dialog.locator('input[type="file"]').setInputFiles({ name: 'faktur-oktober.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 demo') });
  await expect(dialog.getByText(/field terisi otomatis/)).toBeVisible();
  await page.getByRole('button', { name: 'Simpan & analisis' }).click();
  await expect(page.getByText(/Dokumen disimpan/)).toBeVisible();
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

test('editing share-register ownership in Dokumen resolves the 105% mismatch', async ({ page }) => {
  await page.goto('/documents');
  await page.getByText('BlueHorizon Pacific Partners LP').click();
  await page.getByRole('button', { name: 'Koreksi field' }).click();
  await page.getByLabel('Persentase saham (%)').fill('20');
  await page.getByRole('button', { name: 'Simpan koreksi' }).click();
  await page.goto('/cases');
  await expect(page.getByRole('option').filter({ hasText: 'Register saham ≠ 100%' })).toHaveCount(0);
});

test('case view shows score breakdown and copilot reports correction impact', async ({ page }) => {
  await page.goto('/cases?tab=done');
  await page.getByRole('option').filter({ hasText: 'CV Mega Suplai' }).first().click();
  await expect(page.getByText('Bobot aturan')).toBeVisible();
  await page.getByRole('button', { name: 'Tanya Copilot' }).click();
  const panel = page.getByRole('dialog');
  await panel.getByRole('button', { name: 'Berapa dampak koreksinya?' }).click();
  await expect(panel.getByText(/Rp 120\.000\.000/).first()).toBeVisible();
});

test('account journey: sign-up flow, waiting state, and team role assignment', async ({ page }) => {
  await page.goto('/sign-up');
  await page.getByLabel('Nama lengkap').fill('Siti Rahmawati');
  await page.getByLabel('Email kerja').fill('siti.rahmawati@nusantara-holding.com');
  await page.getByLabel('Kata sandi', { exact: true }).fill('AmanSekali2026!');
  await page.getByRole('button', { name: 'Buat akun' }).click();

  await expect(page.getByRole('heading', { name: 'Periksa email Anda' })).toBeVisible();
  await page.getByRole('button', { name: 'Isi otomatis' }).click();
  await page.getByRole('button', { name: 'Verifikasi email' }).click();

  await expect(page.getByRole('heading', { name: /Atur ruang kerja/ })).toBeVisible();
  await page.getByRole('button', { name: 'Buka ruang kerja' }).click();
  await expect(page).toHaveURL(/\/overview/);

  await page.goto('/settings/team');
  await expect(page.getByRole('heading', { level: 1, name: 'Tim & peran' })).toBeVisible();
  await page.getByRole('button', { name: 'Tetapkan peran' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Tetapkan peran' }).click();
  await expect(page.getByText('Menunggu peran').first()).toBeVisible();
});

test('ownership chain calculates effective UBOs and gates signatories until directors exist', async ({ page }) => {
  await page.goto('/entities/ENT-ID-001');
  await page.getByRole('tab', { name: 'Rantai kepemilikan' }).click();
  await expect(page.getByText('96.0%')).toBeVisible();
  await expect(page.getByText(/Dr\. Hendra Kusuma/).first()).toBeVisible();

  await page.getByRole('tab', { name: /Penanda tangan/ }).click();
  await expect(page.getByText(/Terblokir · 3 tanda tangan belum memiliki penanda tangan/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kirim untuk tanda tangan' })).toBeDisabled();
});

test('entity directory shows reusable profiles and multiple roles', async ({ page }) => {
  await page.goto('/shareholders');
  await page.getByRole('tab', { name: /Direktori entitas/ }).click();
  await page.getByText('Marcus Tan Wei Ming').first().click();
  await expect(page.getByRole('heading', { name: 'Peran di seluruh ruang kerja' })).toBeVisible();
});
