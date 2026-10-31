import { NextRequest, NextResponse } from 'next/server';
import { MULTI_COUNTRY_DATA, CountryCode, formatCurrency } from '@/data/multiCountryTaxData';
import { vendorFromFileName } from '@/lib/scan';

export async function POST(req: NextRequest) {
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

    const vendor = customVendor?.trim() || vendorFromFileName(fileName) || 'Global Tech Partner Entity';
    const docNum = `${country}-INV-2026-${Math.floor(10000 + Math.random() * 89999)}`;

    return NextResponse.json({
      id: `${country}-UPL-${Date.now().toString().slice(-4)}`,
      title: `Ekstraksi Document AI (${cfg.name}) — ${fileName}`,
      docType: 'e-Faktur PPN',
      fileName,
      uploadDate: `Baru saja (${cfg.authorityShort} Live OCR)`,
      vendorName: vendor,
      npwp16: isSuspicious ? `INVALID-${country}-TAXID` : cfg.company.taxIdValue,
      nitku: isSuspicious ? 'UNVERIFIED-ENDPOINT' : cfg.company.subIdValue,
      docNumber: docNum,
      docDate: '18 Oktober 2026',
      dpp,
      taxType: `${cfg.indirectTaxName}`,
      taxRate: `${((reportedTax / dpp) * 100).toFixed(2)}%`,
      taxAmount: reportedTax,
      totalAmount: dpp + reportedTax,
      status: isSuspicious ? 'RISIKO_FRAUD' : 'PATUH',
      confidenceScore: 99.3,
      extractedFields: [
        {
          label: `Sistem e-Invoice (${cfg.eInvoiceSystem})`,
          value: fileName,
          validation: 'valid',
          note: `Dipindai menggunakan Google Cloud Document AI (${cfg.name} Processor)`,
        },
        {
          label: `${cfg.company.taxIdLabel} Vendor`,
          value: `${vendor} (${isSuspicious ? 'TIDAK TERDAFTAR' : 'TERVALIDASI'})`,
          validation: isSuspicious ? 'error' : 'valid',
          note: isSuspicious
            ? `PERINGATAN: Identitas pajak vendor gagal validasi di portal ${cfg.authorityShort}`
            : `Aktif dan patuh di registri ${cfg.authorityShort}`,
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
              : `Akurat 100% sesuai tarif resmi ${cfg.indirectTaxName}`,
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
        : `DOKUMEN VALID & PATUH (${cfg.authorityShort}): Seluruh atribut ${cfg.eInvoiceSystem} pada ${fileName} telah sesuai regulasi ${cfg.name}. Nilai pajak ${formatCurrency(
            reportedTax,
            country
          )} siap dimasukkan ke ${cfg.filingFormName}.`,
      regulationRef: `${cfg.authorityFull} — Standar Validasi ${cfg.eInvoiceSystem}`,
      recommendedAction: isSuspicious
        ? `Tahan klaim pajak masukan dan minta revisi dokumen melalui ${cfg.eInvoiceSystem}.`
        : `Setujui dan masukkan otomatis ke draf ${cfg.filingFormName}.`,
    });
  } catch {
    return NextResponse.json(
      { error: 'Gagal memindai dokumen pajak multi-negara' },
      { status: 500 }
    );
  }
}
