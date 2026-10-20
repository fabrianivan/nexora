import { expect, test } from '@playwright/test';

test('manual mode supports creating an entity and opening document flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Mode Manual', { exact: true })).toBeVisible();
  await page.getByLabel('Nama legal').fill('PT Uji Kepatuhan');
  await page.getByLabel('NPWP / UEN / TIN / EIN').fill('1234567890123456');
  await page.getByLabel('Alamat').fill('Jalan Uji Nomor 1 Jakarta');
  await page.getByRole('button', { name: 'Simpan entitas' }).click();
  await expect(page.getByText('PT Uji Kepatuhan').first()).toBeVisible();
  await page.getByRole('button', { name: 'Dokumen' }).click();
  await expect(page.getByText('Smart Document & e-Invoice Scanner')).toBeVisible();
});
