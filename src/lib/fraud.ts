import type {
  CountryCode,
  FindingEvidence,
  FindingReviewStatus,
  FindingSeverity,
  TaxDocument,
} from './domain';
import { TAX_CONFIG } from './tax';

export type Severity = FindingSeverity;

export interface Finding {
  id: string;
  entityId: string;
  documentId: string;
  country: CountryCode;
  severity: Severity;
  rule: string;
  ruleId: string;
  title: string;
  score: number;
  ruleScoreContribution: number;
  statScoreContribution: number;
  confidence: number;
  explanation: string;
  reason: string;
  evidence: string;
  evidenceItems: FindingEvidence[];
  remediation: string;
  recommendation: string;
  status: FindingReviewStatus;
  isFalsePositive: boolean;
  reviewer?: string;
  reviewNote?: string;
  linkedAdjustmentId?: string;
  computeLabel: string;
  date: string;
}

export interface StatisticalSummary {
  count: number;
  mean: number;
  stdDev: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
}

export function computePopulationStats(values: number[]): StatisticalSummary | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const quantile = (p: number) => {
    const pos = (sorted.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base + 1] !== undefined
      ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
      : sorted[base];
  };
  const q1 = quantile(0.25);
  const median = quantile(0.5);
  const q3 = quantile(0.75);
  return {
    count: values.length,
    mean,
    stdDev,
    median,
    q1,
    q3,
    iqr: q3 - q1,
  };
}

export function zScores(values: number[], minimum = 5): number[] | null {
  if (values.length < minimum) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const deviation = Math.sqrt(variance);
  return values.map((value) => (deviation === 0 ? 0 : (value - mean) / deviation));
}

const BENFORD_EXPECTED: Record<number, number> = {
  1: 0.301,
  2: 0.176,
  3: 0.125,
  4: 0.097,
  5: 0.079,
  6: 0.067,
  7: 0.058,
  8: 0.051,
  9: 0.046,
};

export function evaluateBenfordFirstDigit(values: number[]): {
  mad: number;
  suspiciousDigits: number[];
  firstDigitCounts: Record<number, number>;
} {
  const counts: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
  };
  const positiveValues = values.filter((v) => v > 0);
  for (const val of positiveValues) {
    const firstChar = String(Math.abs(val)).replace(/^0+\.?0*/, '')[0];
    const digit = Number(firstChar);
    if (digit >= 1 && digit <= 9) {
      counts[digit] += 1;
    }
  }
  const n = positiveValues.length || 1;
  let totalAbsDiff = 0;
  const suspiciousDigits: number[] = [];
  for (let d = 1; d <= 9; d++) {
    const actualFreq = counts[d] / n;
    const expectedFreq = BENFORD_EXPECTED[d];
    const diff = Math.abs(actualFreq - expectedFreq);
    totalAbsDiff += diff;
    if (d >= 7 && actualFreq > expectedFreq + 0.18 && counts[d] >= 2) {
      suspiciousDigits.push(d);
    }
  }
  return {
    mad: Number((totalAbsDiff / 9).toFixed(4)),
    suspiciousDigits,
    firstDigitCounts: counts,
  };
}

interface BuildFindingParams {
  doc: TaxDocument;
  rule: string;
  title: string;
  severity: Severity;
  ruleScore: number;
  statScore: number;
  confidence: number;
  explanation: string;
  evidence: string;
  evidenceItems: FindingEvidence[];
  remediation: string;
  suppressedRules?: string[];
  linkedAdjustmentId?: string;
}

function buildFinding(params: BuildFindingParams): Finding {
  const isSuppressed = params.suppressedRules?.includes(params.rule) ?? false;
  const penalty = isSuppressed ? 25 : 0;
  const adjustedRuleScore = Math.max(5, params.ruleScore - penalty);
  const totalScore = Math.max(
    10,
    Math.min(99, Math.round(adjustedRuleScore + params.statScore))
  );

  return {
    id: `${params.rule}:${params.doc.id}`,
    entityId: params.doc.entityId,
    documentId: params.doc.id,
    country: params.doc.country,
    severity: params.severity,
    rule: params.rule,
    ruleId: params.rule,
    title: params.title,
    score: totalScore,
    ruleScoreContribution: Math.round(adjustedRuleScore),
    statScoreContribution: Math.round(params.statScore),
    confidence: params.confidence,
    explanation: params.explanation,
    reason: params.explanation,
    evidence: params.evidence,
    evidenceItems: params.evidenceItems,
    remediation: params.remediation,
    recommendation: params.remediation,
    status: 'Baru',
    isFalsePositive: isSuppressed,
    linkedAdjustmentId: params.linkedAdjustmentId,
    computeLabel: 'Dihitung lokal (simulasi BigQuery)',
    date: params.doc.date.value,
  };
}

export function detectFraud(
  documents: TaxDocument[],
  options: { suppressedRules?: string[] } = {}
): {
  findings: Finding[];
  zScoreReady: boolean;
  statsByEntity: Record<string, StatisticalSummary>;
} {
  const findings: Finding[] = [];
  const suppressedRules = options.suppressedRules ?? [];
  const invoices = documents.filter((doc) => doc.type === 'e_invoice');

  // Pre-calculate statistics per entity for statistical score layer
  const byEntity = new Map<string, TaxDocument[]>();
  invoices.forEach((doc) =>
    byEntity.set(doc.entityId, [...(byEntity.get(doc.entityId) ?? []), doc])
  );

  const statsByEntity: Record<string, StatisticalSummary> = {};
  const zScoreMap = new Map<string, number>();
  let zScoreReady = false;

  byEntity.forEach((entityInvoices, entityId) => {
    const totals = entityInvoices.map((doc) => doc.totalAmount.value);
    const popStats = computePopulationStats(totals);
    if (popStats) {
      statsByEntity[entityId] = popStats;
    }
    const scores = zScores(totals);
    if (!scores) return;
    zScoreReady = true;
    scores.forEach((score, index) => {
      const inv = entityInvoices[index];
      zScoreMap.set(inv.id, score);
    });
  });

  // Track invoice numbers for duplicate NSFP check
  const numberFreq = new Map<string, TaxDocument[]>();
  invoices.forEach((doc) => {
    const key = `${doc.country}|${doc.number.value.trim().toUpperCase()}`;
    numberFreq.set(key, [...(numberFreq.get(key) ?? []), doc]);
  });

  for (const doc of invoices) {
    const expectedTax = doc.taxableBase.value * TAX_CONFIG[doc.country].indirectRate;
    const docZ = Math.abs(zScoreMap.get(doc.id) ?? 0);
    const statBoost = Math.min(28, Math.round(docZ * 8));
    const popStats = statsByEntity[doc.entityId];

    // 1. Indonesia: Indikasi Faktur TBTS
    if (
      doc.country === 'ID' &&
      (!doc.taxIdValidated || Math.abs(doc.taxAmount.value - expectedTax) > 1)
    ) {
      findings.push(
        buildFinding({
          doc,
          rule: 'TBTS',
          title: 'Indikasi Faktur Pajak Tidak Berdasarkan Transaksi Sebenarnya (TBTS)',
          severity: 'critical',
          ruleScore: 68,
          statScore: Math.max(18, statBoost),
          confidence: 0.94,
          explanation:
            'Indikator risiko TBTS: identitas vendor belum tervalidasi atau nominal PPN berbeda dari asumsi tarif standar Nexora (11%). Ini perlu verifikasi, bukan kesimpulan fraud final.',
          evidence: `${doc.number.value}: pajak ${doc.taxAmount.value.toLocaleString('id-ID')}, asumsi tarif standar ${expectedTax.toLocaleString('id-ID')}`,
          evidenceItems: [
            {
              field: 'number & taxAmount',
              location: `${doc.attachmentName} • Hal. 1 Blok PPN`,
              value: `NSFP ${doc.number.value} | PPN Dilaporkan: ${doc.taxAmount.value.toLocaleString('id-ID')}`,
              expectedOrStatistic: `PPN 11% seharusnya ${expectedTax.toLocaleString('id-ID')} | Status Validasi NPWP: ${doc.taxIdValidated ? 'Valid' : 'Belum Tervalidasi'}`,
            },
          ],
          remediation:
            'Verifikasi NSFP di Coretax DJP, ketentuan tarif/pengecualian yang berlaku, status PKP vendor, dan bukti arus barang (BAST/Surat Jalan) sebelum mengkreditkan PPN Masukan.',
          suppressedRules,
          linkedAdjustmentId: 'REC-02',
        })
      );
    }

    // 2. Indonesia: Duplicate / Out-of-range NSFP
    const numKey = `${doc.country}|${doc.number.value.trim().toUpperCase()}`;
    if (
      doc.country === 'ID' &&
      ((numberFreq.get(numKey)?.length ?? 0) > 1 ||
        doc.nsfpWithinAllocatedRange === false)
    ) {
      findings.push(
        buildFinding({
          doc,
          rule: 'DUPLICATE_NSFP',
          title: 'Nomor Seri Faktur Pajak (NSFP) Duplikat atau di Luar Jatah e-Nofa',
          severity: 'critical',
          ruleScore: 65,
          statScore: Math.max(14, statBoost),
          confidence: 0.92,
          explanation: `Nomor Seri Faktur Pajak (${doc.number.value}) terdeteksi duplikat atau berada di luar rentang jatah seri resmi vendor.`,
          evidence: `NSFP: ${doc.number.value} pada file ${doc.attachmentName}`,
          evidenceItems: [
            {
              field: 'number',
              location: `${doc.attachmentName} • Hal. 1 Header NSFP`,
              value: doc.number.value,
              expectedOrStatistic: 'Unik per masa pajak dan berada dalam rentang alokasi e-Nofa/Coretax PKP penjual',
            },
          ],
          remediation:
            'Minta Faktur Pajak Pengganti dengan NSFP valid dari vendor dan tahan pengkreditan Pajak Masukan.',
          suppressedRules,
        })
      );
    }

    // 3. Indonesia: PPN Masukan Tidak Dapat Dikreditkan
    if (doc.country === 'ID' && doc.creditableVat === false) {
      findings.push(
        buildFinding({
          doc,
          rule: 'VAT_NON_CREDITABLE',
          title: 'PPN Masukan Tidak Memenuhi Syarat Pengkreditan (Pasal 9 ayat (8) UU PPN)',
          severity: 'high',
          ruleScore: 54,
          statScore: Math.max(10, statBoost),
          confidence: 0.9,
          explanation:
            'Faktur Pajak Masukan ditandai tidak dapat dikreditkan karena cacat formal/material atau berkaitan dengan pengeluaran di luar kegiatan usaha 3M.',
          evidence: `${doc.number.value} (${doc.counterparty.value})`,
          evidenceItems: [
            {
              field: 'creditableVat',
              location: `${doc.attachmentName} • Hal. 1 Klasifikasi PPN`,
              value: `PPN ${doc.taxAmount.value.toLocaleString('id-ID')} (Non-Creditable)`,
              expectedOrStatistic: 'Memenuhi syarat formal & material Pasal 9 ayat (2) & (8) UU PPN',
            },
          ],
          remediation:
            'Keluarkan dari Lampiran B2 (Pajak Masukan Dapat Dikreditkan) dan pindahkan ke Lampiran B3 SPT Masa PPN 1111.',
          suppressedRules,
        })
      );
    }

    // 4. Singapore: Missing Trader Fraud (MTF)
    if (doc.country === 'SG' && !doc.taxIdValidated) {
      findings.push(
        buildFinding({
          doc,
          rule: 'MISSING_TRADER',
          title: 'Indikasi Missing Trader Fraud (MTF) & Registrasi GST Tidak Valid',
          severity: 'critical',
          ruleScore: 67,
          statScore: Math.max(16, statBoost),
          confidence: 0.93,
          explanation:
            'Registrasi GST pemasok tidak tervalidasi sehingga klaim Input GST berisiko ditolak berdasarkan Section 20(2A) Singapore GST Act.',
          evidence: `${doc.counterparty.value} (${doc.counterpartyTaxId.value})`,
          evidenceItems: [
            {
              field: 'counterpartyTaxId',
              location: `${doc.attachmentName} • Hal. 1 Blok Supplier UEN/GST`,
              value: `${doc.counterparty.value} (${doc.counterpartyTaxId.value})`,
              expectedOrStatistic: 'Terdaftar aktif pada IRAS GST Register & jaringan IMDA InvoiceNow',
            },
          ],
          remediation:
            'Tahan klaim Input GST pada Form F5 dan lakukan due diligence pemasok.',
          suppressedRules,
        })
      );
    }

    // 5. Malaysia: Missing MyInvois UUID
    if (doc.country === 'MY' && !doc.invoiceUuid.value.trim()) {
      findings.push(
        buildFinding({
          doc,
          rule: 'MYINVOIS_UUID',
          title: 'Dokumen Tidak Memiliki UUID Validasi LHDN MyInvois',
          severity: 'high',
          ruleScore: 62,
          statScore: Math.max(14, statBoost),
          confidence: 0.95,
          explanation:
            'Dokumen tidak memiliki UUID MyInvois dari portal LHDN Continuous Transaction Control (CTC).',
          evidence: doc.number.value,
          evidenceItems: [
            {
              field: 'invoiceUuid',
              location: `${doc.attachmentName} • Blok QR/UUID MyInvois`,
              value: 'KOSONG (Unvalidated PDF)',
              expectedOrStatistic: 'UUID 26 karakter tervalidasi LHDN MyInvois (Section 82B ITA 1967)',
            },
          ],
          remediation:
            'Minta e-Invoice tervalidasi LHDN sebelum mengklaim biaya sebagai pengurang pajak Form C.',
          suppressedRules,
        })
      );
    }

    // 6. US: Unverified TIN / Backup Withholding Risk
    if (doc.country === 'US' && !doc.taxIdValidated) {
      findings.push(
        buildFinding({
          doc,
          rule: 'US_TIN_BACKUP_WHT',
          title: 'EIN Tidak Terverifikasi / Risiko Backup Withholding 24% (IRC §3406)',
          severity: 'high',
          ruleScore: 60,
          statScore: Math.max(15, statBoost),
          confidence: 0.91,
          explanation:
            'Identitas EIN vendor AS belum tervalidasi melalui Form W-9, memicu risiko kewajiban pemotongan pajak cadangan (backup withholding) 24%.',
          evidence: `${doc.counterparty.value} (${doc.counterpartyTaxId.value})`,
          evidenceItems: [
            {
              field: 'counterpartyTaxId',
              location: `${doc.attachmentName} • Blok Form W-9 TIN`,
              value: doc.counterpartyTaxId.value,
              expectedOrStatistic: 'TIN Matched via IRS e-Services & signed Form W-9',
            },
          ],
          remediation:
            'Minta Form W-9 yang ditandatangani atau potong 24% Backup Withholding pada IRS Form 945.',
          suppressedRules,
        })
      );
    }

    // 7. Non-Deductible / Missing Supporting Evidence (Daftar Nominatif)
    if (!doc.deductible || !doc.hasSupportingEvidence) {
      findings.push(
        buildFinding({
          doc,
          rule: 'NON_DEDUCTIBLE',
          title: 'Biaya Non-Deductible atau Tanpa Bukti Pendukung (Daftar Nominatif)',
          severity: 'medium',
          ruleScore: 48,
          statScore: Math.max(12, statBoost),
          confidence: 0.91,
          explanation:
            'Biaya ditandai non-deductible atau tidak memiliki bukti pendukung wajib (seperti Daftar Nominatif biaya jamuan/entertainment).',
          evidence: doc.attachmentName,
          evidenceItems: [
            {
              field: 'deductible & hasSupportingEvidence',
              location: `${doc.attachmentName} • Lampiran Bukti Pendukung`,
              value: `Deductible: ${doc.deductible ? 'Ya' : 'Tidak'} | Bukti Lengkap: ${doc.hasSupportingEvidence ? 'Ya' : 'Tidak'}`,
              expectedOrStatistic: 'Wajib dilampiri Daftar Nominatif (SE-27/PJ.22/1986) atau dikoreksi fiskal positif',
            },
          ],
          remediation:
            'Lengkapi bukti pendukung (Daftar Nominatif) atau masukkan otomatis ke Koreksi Fiskal Positif.',
          suppressedRules,
          linkedAdjustmentId: 'REC-04',
        })
      );
    }

    // 8. Weekend / Holiday Transaction Issuance
    const parsedDate = new Date(`${doc.date.value}T00:00:00Z`);
    const dayOfWeek = parsedDate.getUTCDay();
    if (
      (dayOfWeek === 0 || dayOfWeek === 6) &&
      (!doc.hasSupportingEvidence || !doc.taxIdValidated)
    ) {
      findings.push(
        buildFinding({
          doc,
          rule: 'WEEKEND_HOLIDAY_TX',
          title: 'Penerbitan Faktur di Akhir Pekan (Sabtu/Minggu) Tanpa Bukti Pengiriman',
          severity: 'medium',
          ruleScore: 38,
          statScore: Math.max(12, statBoost),
          confidence: 0.86,
          explanation: `Dokumen ${doc.number.value} diterbitkan pada akhir pekan (${doc.date.value}) dan disertai anomali kelengkapan bukti.`,
          evidence: `${doc.number.value} tertanggal ${doc.date.value}`,
          evidenceItems: [
            {
              field: 'date',
              location: `${doc.attachmentName} • Hal. 1 Tanggal Faktur`,
              value: `${doc.date.value} (${dayOfWeek === 0 ? 'Minggu' : 'Sabtu'})`,
              expectedOrStatistic: 'Hari kerja operasional normal (Senin–Jumat)',
            },
          ],
          remediation:
            'Konfirmasi log aktivitas sistem dan berita acara serah terima pada tanggal tersebut.',
          suppressedRules,
        })
      );
    }

    // 9. Bank Account Mismatch
    if (
      doc.counterpartyBankAccount &&
      doc.expectedBankAccount &&
      doc.counterpartyBankAccount !== doc.expectedBankAccount
    ) {
      findings.push(
        buildFinding({
          doc,
          rule: 'BANK_ACCOUNT_MISMATCH',
          title: 'Mismatch Rekening Bank Vendor (Indikasi Pengalihan Pembayaran)',
          severity: 'critical',
          ruleScore: 68,
          statScore: 20,
          confidence: 0.96,
          explanation: `Rekening bank pada dokumen (${doc.counterpartyBankAccount}) tidak cocok dengan rekening terdaftar vendor di master data (${doc.expectedBankAccount}).`,
          evidence: `Invoice: ${doc.counterpartyBankAccount} vs Master: ${doc.expectedBankAccount}`,
          evidenceItems: [
            {
              field: 'counterpartyBankAccount',
              location: `${doc.attachmentName} • Instruksi Pembayaran Bank`,
              value: doc.counterpartyBankAccount,
              expectedOrStatistic: `Master Vendor Bank: ${doc.expectedBankAccount}`,
            },
          ],
          remediation:
            'Tahan instruksi pembayaran dan lakukan verifikasi telepon independen (call-back verification) ke pejabat resmi vendor.',
          suppressedRules,
        })
      );
    }

    // 10. Related Party / Transfer Pricing Without TP Doc
    if (doc.isRelatedParty && doc.hasTransferPricingDoc === false) {
      findings.push(
        buildFinding({
          doc,
          rule: 'TRANSFER_PRICING_RISK',
          title: 'Transaksi Afiliasi / Pihak Berelasi Tanpa Dokumentasi Transfer Pricing',
          severity: 'high',
          ruleScore: 60,
          statScore: Math.max(15, statBoost),
          confidence: 0.9,
          explanation: `Transaksi pihak berelasi dengan ${doc.counterparty.value} senilai ${doc.totalAmount.value.toLocaleString('id-ID')} belum memiliki referensi Local File / Master File TP Doc.`,
          evidence: `${doc.number.value} (${doc.counterparty.value})`,
          evidenceItems: [
            {
              field: 'isRelatedParty & hasTransferPricingDoc',
              location: `${doc.attachmentName} • Matriks Hubungan Istimewa`,
              value: 'Pihak Berelasi (Afiliasi) • TP Doc: Belum Tersedia',
              expectedOrStatistic: 'Wajib analisis PKKU / Arm’s Length Principle (PMK 172/2023 & Pasal 18(3) UU PPh)',
            },
          ],
          remediation:
            'Siapkan kertas kerja benchmarking (CUP/TNMM) dan lampirkan Ikhtisar Dokumen Induk & Lokal pada SPT 1771.',
          suppressedRules,
        })
      );
    }

    // 11. New Vendor Spike
    if (
      doc.isNewVendor &&
      popStats &&
      doc.totalAmount.value > popStats.median * 1.5
    ) {
      findings.push(
        buildFinding({
          doc,
          rule: 'NEW_VENDOR_SPIKE',
          title: 'Vendor Baru dengan Lonjakan Nilai di Atas Ambang Kuartil',
          severity: 'high',
          ruleScore: 54,
          statScore: Math.max(16, statBoost),
          confidence: 0.87,
          explanation: `Vendor baru (${doc.counterparty.value}) langsung menagihkan ${doc.totalAmount.value.toLocaleString('id-ID')}, melampaui 1,5x median histori entitas (${Math.round(popStats.median).toLocaleString('id-ID')}).`,
          evidence: `${doc.counterparty.value}: ${doc.totalAmount.value.toLocaleString('id-ID')}`,
          evidenceItems: [
            {
              field: 'totalAmount',
              location: `${doc.attachmentName} • Total Tagihan`,
              value: doc.totalAmount.value.toLocaleString('id-ID'),
              expectedOrStatistic: `Median Populasi: ${Math.round(popStats.median).toLocaleString('id-ID')} | Q3: ${Math.round(popStats.q3).toLocaleString('id-ID')}`,
            },
          ],
          remediation:
            'Lakukan verifikasi KYC/KYV vendor baru dan pastikan persetujuan berlapis sebelum pencairan.',
          suppressedRules,
        })
      );
    }
  }

  // 12. Split Invoicing Check (Grouped by entity + counterparty + date)
  const groups = new Map<string, TaxDocument[]>();
  invoices.forEach((doc) => {
    const key = `${doc.entityId}|${doc.counterparty.value.toLowerCase()}|${doc.date.value}`;
    groups.set(key, [...(groups.get(key) ?? []), doc]);
  });
  groups.forEach((docs) => {
    if (docs.length >= 3) {
      const combinedTotal = docs.reduce((s, d) => s + d.totalAmount.value, 0);
      findings.push(
        buildFinding({
          doc: docs[0],
          rule: 'SPLIT_INVOICING',
          title: 'Indikasi Split Invoicing (Pemecahan Tagihan di Tanggal Sama)',
          severity: 'high',
          ruleScore: 58,
          statScore: 22,
          confidence: 0.92,
          explanation: `${docs.length} invoice vendor yang sama (${docs[0].counterparty.value}) dibuat pada tanggal yang sama (${docs[0].date.value}) dengan total gabungan ${combinedTotal.toLocaleString('id-ID')}.`,
          evidence: docs.map((doc) => doc.number.value).join(', '),
          evidenceItems: docs.map((d) => ({
            field: 'number & totalAmount',
            location: `${d.attachmentName} • Tanggal ${d.date.value}`,
            value: `${d.number.value}: ${d.totalAmount.value.toLocaleString('id-ID')}`,
            expectedOrStatistic: `Bagian dari ${docs.length} tagihan beruntun pada hari yang sama`,
          })),
          remediation:
            'Gabungkan review seluruh pecahan invoice, verifikasi otorisasi kontrak, dan pastikan pemotongan PPh Pasal 23 dihitung atas total nilai jasa.',
          suppressedRules,
        })
      );
    }
  });

  // 13. Statistical Z-Score Outlier & Benford's Law per Entity
  byEntity.forEach((entityInvoices, entityId) => {
    const totals = entityInvoices.map((doc) => doc.totalAmount.value);
    const scores = zScores(totals);
    const popStats = statsByEntity[entityId];
    if (!scores || !popStats) return;

    scores.forEach((score, index) => {
      if (Math.abs(score) >= 2) {
        const outlierDoc = entityInvoices[index];
        findings.push(
          buildFinding({
            doc: outlierDoc,
            rule: 'Z_SCORE',
            title: `Outlier Statistik Nilai Transaksi (Z-Score ${score.toFixed(2)}σ)`,
            severity: 'high',
            ruleScore: 45,
            statScore: Math.min(35, Math.round(Math.abs(score) * 12)),
            confidence: 0.89,
            explanation: `Nilai invoice menyimpang dengan Z-Score ${score.toFixed(2)} (Mean: ${Math.round(popStats.mean).toLocaleString('id-ID')}, StdDev: ${Math.round(popStats.stdDev).toLocaleString('id-ID')}).`,
            evidence: outlierDoc.number.value,
            evidenceItems: [
              {
                field: 'totalAmount',
                location: `${outlierDoc.attachmentName} • Hal. 1 Total Tagihan`,
                value: outlierDoc.totalAmount.value.toLocaleString('id-ID'),
                expectedOrStatistic: `Z-Score = ${score.toFixed(2)}σ | Mean = ${Math.round(popStats.mean).toLocaleString('id-ID')} | StdDev = ${Math.round(popStats.stdDev).toLocaleString('id-ID')} | IQR = ${Math.round(popStats.iqr).toLocaleString('id-ID')}`,
              },
            ],
            remediation:
              'Bandingkan nilai tagihan terhadap kontrak payung, Purchase Order (PO), dan histori kewajaran harga vendor.',
            suppressedRules,
          })
        );
      }
    });

    // Check Benford first-digit concentration if >= 6 invoices and high digits cluster
    if (entityInvoices.length >= 6) {
      const benford = evaluateBenfordFirstDigit(totals);
      if (benford.suspiciousDigits.length > 0) {
        const sampleDoc = entityInvoices[0];
        findings.push(
          buildFinding({
            doc: sampleDoc,
            rule: 'BENFORD_VIOLATION',
            title: "Anomali Distribusi Digit Pertama (Benford's Law Deviation)",
            severity: 'medium',
            ruleScore: 35,
            statScore: 25,
            confidence: 0.82,
            explanation: `Distribusi digit pertama invoice entitas menunjukkan konsentrasi tinggi pada digit [${benford.suspiciousDigits.join(', ')}] dengan Mean Absolute Deviation (MAD) ${benford.mad}.`,
            evidence: `MAD=${benford.mad}, Digit Mencurigakan: ${benford.suspiciousDigits.join(', ')}`,
            evidenceItems: [
              {
                field: 'firstDigitDistribution',
                location: `Populasi ${entityInvoices.length} Invoice Entitas ${entityId}`,
                value: `MAD = ${benford.mad} (Digit [${benford.suspiciousDigits.join(', ')}] berlebih)`,
                expectedOrStatistic: 'Ekspektasi Benford: Digit 1 (30,1%), Digit 8 (5,1%), Digit 9 (4,6%)',
              },
            ],
            remediation:
              'Periksa apakah nominal tagihan ditentukan secara artifisial tepat di bawah batas otorisasi internal.',
            suppressedRules,
          })
        );
      }
    }
  });

  return { findings, zScoreReady, statsByEntity };
}
