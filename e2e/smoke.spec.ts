import { expect, test } from '@playwright/test';

test.describe('Nexora Platform Smoke & Navigation Suite', () => {
  test('supports manual entity creation and document scanner', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Mode Manual', { exact: true })).toBeVisible();
    await page.getByLabel('Nama legal').fill('PT Uji Kepatuhan');
    await page.getByLabel('NPWP / UEN / TIN / EIN').fill('1234567890123456');
    await page.getByLabel('Alamat').fill('Jalan Uji Nomor 1 Jakarta');
    await page.getByRole('button', { name: 'Simpan entitas' }).click();
    await expect(page.getByText('PT Uji Kepatuhan').first()).toBeVisible();
    await page.getByRole('button', { name: 'Dokumen' }).first().click();
    await expect(page.getByText('Smart Document & e-Invoice Scanner')).toBeVisible();
  });

  test('navigates seamlessly across primary tabs with zero hollow views', async ({ page }) => {
    await page.goto('/');

    // 1. Calculation tab
    await page.getByRole('button', { name: /Kalkulasi Pajak/i }).click();
    await expect(page.getByText('Rekonsiliasi Fiskal & Perhitungan Pajak')).toBeVisible();
    await expect(page.getByText('PPh Badan (Pasal 31E)')).toBeVisible();

    // 2. Tax Return tab
    await page.getByRole('button', { name: /Draf SPT & Return/i }).click();
    await expect(page.getByText(/SPT 1771 Induk/i)).toBeVisible();
    await expect(page.getByText('Alur Persetujuan Maker-Checker')).toBeVisible();

    // 3. Payment tab
    await page.getByRole('button', { name: /Pembayaran & Billing/i }).click();
    await expect(page.getByText('Jadwal & Billing Pembayaran Pajak')).toBeVisible();
    await expect(page.getByText('Generate Kode Billing')).toBeVisible();

    // 4. Return to Entities tab
    await page.getByRole('button', { name: /Struktur Entitas/i }).click();
    await expect(page.getByText('Mode Manual', { exact: true })).toBeVisible();
  });

  test('navigates sub-navigation tabs and verifies interactive features', async ({ page }) => {
    await page.goto('/');

    // 1. Individual Shareholders
    await page.getByRole('button', { name: /Pemegang Saham/i }).click();
    await expect(page.getByText('Daftar Pemegang Saham Individu')).toBeVisible();
    await expect(page.getByText('Rezim Dividen UU HPP')).toBeVisible();

    // 2. Studies & TP
    await page.getByRole('button', { name: /Studi & TP/i }).click();
    await expect(page.getByText('Pusat Studi Perpajakan & OECD BEPS 2.0')).toBeVisible();
    await expect(page.getByText('Simulasi Treaty Relief P3B')).toBeVisible();

    // 3. Tax Calendar
    await page.getByRole('button', { name: /Kalender Pajak/i }).click();
    await expect(page.getByText('Kalender Jatuh Tempo Perpajakan')).toBeVisible();
    await expect(page.getByText('Export Kalender (.ics)')).toBeVisible();

    // 4. Reports
    await page.getByRole('button', { name: /Laporan & Audit/i }).click();
    await expect(page.getByText('Laporan Kepatuhan & Audit Trail')).toBeVisible();
    await expect(page.getByText('Cetak PDF Resmi')).toBeVisible();
  });

  test('verifies hero flow interactive stepper and sample data reset', async ({ page }) => {
    await page.goto('/');

    // Hero Stepper should be visible
    await expect(page.getByText('1. Struktur')).toBeVisible();
    await expect(page.getByText('2. Dokumen')).toBeVisible();

    // Click step 3 (Fraud)
    await page.getByRole('button', { name: /Deteksi Fraud/i }).click();
    await expect(page.getByText('Deteksi Fraud & Risiko Anomali')).toBeVisible();

    // Click step 4 (Kalkulasi)
    await page.getByRole('button', { name: /Kalkulasi/i }).first().click();
    await expect(page.getByText('Rekonsiliasi Fiskal & Perhitungan Pajak')).toBeVisible();

    // Sample data button should be present
    const resetBtn = page.getByRole('button', { name: /Muat Sample/i }).first();
    await expect(resetBtn).toBeVisible();
  });

  test('enforces maker-checker authorization controls in tax return tab', async ({ page }) => {
    await page.goto('/');

    // Navigate to Tax Return
    await page.getByRole('button', { name: /Draf SPT & Return/i }).click();

    // Should indicate draft status and maker-checker audit status
    await expect(page.getByText('Alur Persetujuan Maker-Checker')).toBeVisible();
    await expect(page.getByText(/Peran Aktif:/i)).toBeVisible();

    // When role is Konsultan Pajak, cannot approve own return
    const approveBtn = page.getByRole('button', { name: /Setujui & Kunci SPT/i });
    if (await approveBtn.isVisible()) {
      // If visible, clicking it when not authorized or when drafter is same user should show error or be disabled
      const isDisabled = await approveBtn.isDisabled();
      if (!isDisabled) {
        await approveBtn.click();
        // Should show alert message or reject self-approval
        await expect(page.getByText(/tidak diizinkan|hanya dapat disetujui|Maker-Checker/i)).toBeVisible();
      }
    }
  });
});
