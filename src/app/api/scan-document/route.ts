import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MULTI_COUNTRY_DATA, formatCurrency } from '@/data/multiCountryTaxData';
import { countrySchema, documentTypeSchema } from '@/lib/domain';
import { getAIEngine } from '@/lib/adapters/aiEngine';
import { isRequestAuthorized } from '@/lib/server/session';
import { rateLimitByIp } from '@/lib/server/rateLimit';
import { logServerEvent } from '@/lib/server/logger';

const scanDocumentBodySchema = z.object({
  entityId: z.string().trim().min(1).default('ENT-ID-001'),
  fileName: z.string().trim().min(1).max(240),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024).default(245_000),
  mimeType: z
    .enum(['application/pdf', 'image/png', 'image/jpeg'])
    .default('application/pdf'),
  documentType: documentTypeSchema.default('e_invoice'),
  customVendor: z.string().trim().max(160).optional(),
  customDpp: z.number().nonnegative().max(1_000_000_000_000).optional(),
  customTax: z.number().nonnegative().max(1_000_000_000_000).optional(),
  country: countrySchema.default('ID'),
});

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  if (!isRequestAuthorized(req)) {
    return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 });
  }
  if (!rateLimitByIp(req, 'document-simulation', 20, 60_000)) {
    return NextResponse.json(
      { error: 'Batas pemindaian tercapai. Coba lagi sebentar.' },
      { status: 429 },
    );
  }

  try {
    const rawBody: unknown = await req.json();
    const parsed = scanDocumentBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Metadata dokumen, tipe file, ukuran (maks 10MB), atau yurisdiksi tidak valid.' },
        { status: 400 },
      );
    }

    const {
      entityId,
      fileName,
      fileSize,
      mimeType,
      documentType,
      customVendor,
      customDpp,
      customTax,
      country,
    } = parsed.data;

    const aiEngine = getAIEngine();
    const extraction = await aiEngine.extractDocument({
      entityId,
      fileName,
      fileSize,
      mimeType,
      country,
      documentType,
      customVendor,
      customDpp,
      customTaxAmount: customTax,
    });

    const cfg = MULTI_COUNTRY_DATA[country] || MULTI_COUNTRY_DATA.ID;
    const dpp = extraction.taxableBase;
    const reportedTax = extraction.taxAmount;
    const confidencePct = Math.round(extraction.overallConfidence * 100);
    const hasLowConfidenceField = extraction.fields.some((f) => f.confidence < 0.85);
    const isSuspicious =
      !extraction.taxIdValidated || hasLowConfidenceField || confidencePct < 85;

    logServerEvent('info', 'scan_document_completed', {
      route: '/api/scan-document',
      engine: extraction.engineMode,
      country,
      durationMs: Date.now() - startedAt,
      status: 200,
    });

    return NextResponse.json({
      id: extraction.documentId,
      title: `Ekstraksi ${extraction.providerLabel} (${cfg.name}) — ${fileName}`,
      docType: documentType,
      fileName,
      uploadDate: new Date().toISOString().slice(0, 10),
      simulation: extraction.engineMode === 'demo',
      engineMode: extraction.engineMode,
      engineLabel: extraction.providerLabel,
      fallbackUsed: extraction.fallbackUsed,
      vendorName: extraction.counterparty,
      npwp16: extraction.counterpartyTaxId,
      nitku: `${extraction.counterpartyTaxId}000000`,
      docNumber: extraction.number,
      docDate: extraction.date,
      dpp,
      taxType: cfg.indirectTaxName,
      taxRate: dpp > 0 ? `${((reportedTax / dpp) * 100).toFixed(2)}%` : '0.00%',
      taxAmount: reportedTax,
      totalAmount: extraction.totalAmount,
      taxIdValidated: extraction.taxIdValidated,
      deductible: extraction.deductible,
      hasSupportingEvidence: extraction.hasSupportingEvidence,
      status: isSuspicious ? 'PERLU_VERIFIKASI_MANUSIA' : 'TEREKSTRAKSI_TERSTRUKTUR',
      confidenceScore: confidencePct,
      structuredFields: extraction.fields,
      extractedFields: extraction.fields.map((field) => ({
        key: field.key,
        label: field.label,
        value: field.value,
        confidence: Math.round(field.confidence * 100),
        location: field.location,
        validation: field.validationStatus,
        note:
          field.validationNote ||
          `Confidence ${Math.round(field.confidence * 100)}% · Lokasi: ${field.location}`,
      })),
      aiAuditSummary: extraction.summary,
      regulationRef:
        country === 'ID'
          ? 'UU PPN Pasal 13 ayat (5) & ayat (9) / PER-03/PJ/2022 (perlu verifikasi)'
          : `Aturan e-Invoice ${cfg.authorityShort} (perlu verifikasi)`,
      recommendedAction: isSuspicious
        ? `Periksa field dengan confidence < 85% (${formatCurrency(reportedTax, country)}) dan lakukan konfirmasi manual sebelum masuk rekonsiliasi fiskal.`
        : 'Field terekstrak siap divalidasi silang terhadap Akta, Laporan Keuangan, dan SPT sebelumnya.',
    });
  } catch {
    return NextResponse.json(
      { error: 'Gagal memindai dokumen pajak multi-negara' },
      { status: 500 },
    );
  }
}
