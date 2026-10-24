import { NextRequest, NextResponse } from 'next/server';
import { MULTI_COUNTRY_DATA, CountryCode, formatCurrency } from '@/data/multiCountryTaxData';
import { isSessionValid } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/rateLimit';

export async function POST(req: NextRequest) {
  if (!isSessionValid(req)) return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 });
  if (!rateLimit('document-simulation:session', 10)) return NextResponse.json({ error: 'Batas pemindaian tercapai. Coba lagi sebentar.' }, { status: 429 });
  try {
    const body = await req.json();
    const {
      fileName,
      customVendor,
      customDpp,
      customTax,
      country = 'ID',
    } = body as {
      fileName: string;
      customVendor?: string;
      customDpp?: number;
      customTax?: number;
      country?: CountryCode;
    };

    if (typeof fileName !== 'string' || fileName.trim().length === 0 || fileName.length > 200 || !['ID', 'SG', 'MY', 'US'].includes(country)) {
      return NextResponse.json({ error: 'Metadata dokumen atau yurisdiksi tidak valid.' }, { status: 400 });
    }

    const cfg = MULTI_COUNTRY_DATA[country] || MULTI_COUNTRY_DATA.ID;
    const dpp = Number(customDpp) || (country === 'ID' ? 28500000 : 25000);
    const expectedTax = Math.round(dpp * cfg.indirectTaxRate);
    const reportedTax =
      customTax !== undefined && customTax !== null ? Number(customTax) : expectedTax;
    const diff = Math.abs(reportedTax - expectedTax);
    const tolerance = country === 'ID' ? 1000 : 5;
    const isSuspicious =
      fileName.toLowerCase().includes('fiktif') ||
      fileName.toLowerCase().includes('fraud') ||
      fileName.toLowerCase().includes('tbts') ||
      diff > tolerance;

    const vendor = customVendor?.trim() || 'Global Tech Partner Entity';
    const docNum = `${country}-INV-2026-${Math.floor(10000 + Math.random() * 89999)}`;

    return NextResponse.json({
      id: `${country}-UPL-${Date.now().toString().slice(-4)}`,
      title: `Ekstraksi Document AI (${cfg.name}) — ${fileName}`,
      docType: 'e-Faktur PPN',
      fileName,
      uploadDate: `Simulasi (${cfg.authorityShort})`,
      simulation: true,
      vendorName: vendor,
      npwp16: isSuspicious ? `INVALID-${country}-TAXID` : cfg.company.taxIdValue,
      nitku: isSuspicious ? 'UNVERIFIED-ENDPOINT' : cfg.company.subIdValue,
      docNumber: docNum,
      docDate: 'Tanggal tidak diekstrak (simulasi)',
      dpp,
      taxType: `${cfg.indirectTaxName}`,
      taxRate: `${((reportedTax / dpp) * 100).toFixed(2)}%`,
      taxAmount: reportedTax,
      totalAmount: dpp + reportedTax,
      status: isSuspicious ? 'SIMULASI_BUTUH_TINJAUAN' : 'SIMULASI_TANPA_VERIFIKASI',
      confidenceScore: 0,
      extractedFields: [
        {
          label: `Sistem e-Invoice (${cfg.eInvoiceSystem})`,
          value: fileName,
          validation: 'valid',
          note: `Simulasi ekstraksi untuk ${cfg.name}; file belum diunggah dan tidak ada registry yang diakses.`,
        },
        {
          label: `${cfg.company.taxIdLabel} Vendor`,
          value: `${vendor} (${isSuspicious ? 'TIDAK TERDAFTAR' : 'TERVALIDASI'})`,
          validation: isSuspicious ? 'error' : 'valid',
          note: isSuspicious
            ? `PERINGATAN: Identitas pajak vendor gagal validasi di portal ${cfg.authorityShort}`
            : `Belum diverifikasi pada registri ${cfg.authorityShort}; nilai ini hanya data simulasi.`,
        },
        {
          label: 'Dasar Pengenaan Pajak (Taxable Base)',
          value: formatCurrency(dpp, country),
          validation: 'valid',
          note: 'Diekstrak otomatis dari subtotal dokumen',
        },
        {
          label: `Validasi Tarif ${cfg.indirectTaxName}`,
          value: formatCurrency(reportedTax, country),
          validation: diff > tolerance ? 'error' : 'valid',
          note:
            diff > tolerance
              ? `ANOMALI TARIF: Seharusnya ${(cfg.indirectTaxRate * 100).toFixed(2)}% adalah ${formatCurrency(
                  expectedTax,
                  country
                )} (Selisih ${formatCurrency(diff, country)})`
              : `Perhitungan aritmetika simulasi; tarif dan perlakuan pajak perlu verifikasi ahli.`,
        },
      ],
      aiAuditSummary: isSuspicious
        ? `PERINGATAN AUDIT AI (${cfg.authorityShort}): Dokumen ${fileName} memiliki selisih perhitungan pajak sebesar ${formatCurrency(
            diff,
            country
          )} dari tarif resmi ${cfg.indirectTaxName} (${formatCurrency(
            expectedTax,
            country
          )}). Berisiko memicu ${cfg.riskNoticeName}.`
        : `SIMULASI — bukan verifikasi kepatuhan (${cfg.authorityShort}): ${fileName} tidak diunggah atau diperiksa terhadap ${cfg.eInvoiceSystem}. Nilai contoh ${formatCurrency(
            reportedTax,
            country
          )} siap dimasukkan ke ${cfg.filingFormName}.`,
      regulationRef: 'Tidak ada sumber resmi yang diakses; hasil hanya simulasi.',
      recommendedAction: isSuspicious
        ? 'Tinjau dokumen dan lakukan validasi manual sebelum mengambil keputusan.'
        : 'Jangan menyetujui dokumen dari hasil simulasi ini; lakukan validasi manual.',
    });
  } catch {
    return NextResponse.json(
      { error: 'Gagal memindai dokumen pajak multi-negara' },
      { status: 500 }
    );
  }
}
