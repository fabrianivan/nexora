export type Language = 'id' | 'en';

export interface GlossaryTerm {
  term: string;
  fullId: string;
  fullEn: string;
  definitionId: string;
  definitionEn: string;
}

export const TAX_GLOSSARY: GlossaryTerm[] = [
  {
    term: 'NPWP / NITKU',
    fullId: 'Nomor Pokok Wajib Pajak (16 Digit) / Nomor Identitas Tempat Kegiatan Usaha',
    fullEn: 'Indonesian Taxpayer Identification Number (16-Digit) / Sub-Entity Branch ID',
    definitionId: 'Identitas resmi wajib pajak di Indonesia pada sistem Coretax DJP.',
    definitionEn: 'Official taxpayer identification in Indonesia under the DGT Coretax system.',
  },
  {
    term: 'TBTS',
    fullId: 'Transaksi Tidak Berdasarkan Transaksi Sebenarnya',
    fullEn: 'Invoice Not Based on Actual Underlying Transaction (Fictitious Invoice)',
    definitionId: 'Indikasi faktur pajak yang diterbitkan tanpa penyerahan barang/jasa riil (SE-17/PJ/2018).',
    definitionEn: 'Tax invoice issued without genuine underlying delivery of goods or services.',
  },
  {
    term: 'Koreksi Fiskal Positif',
    fullId: 'Penyesuaian Fiskal yang Menambah Penghasilan Kena Pajak',
    fullEn: 'Positive Fiscal Adjustment (Increases Taxable Income)',
    definitionId: 'Koreksi atas biaya komersial yang tidak dapat dikurangkan secara fiskal (Pasal 9 ayat 1 UU PPh).',
    definitionEn: 'Adjustment disallowing non-deductible commercial expenses for tax purposes.',
  },
  {
    term: 'Koreksi Fiskal Negatif',
    fullId: 'Penyesuaian Fiskal yang Mengurangi Penghasilan Kena Pajak',
    fullEn: 'Negative Fiscal Adjustment (Decreases Taxable Income)',
    definitionId: 'Koreksi atas penghasilan yang telah dikenakan PPh Final atau bukan objek pajak (Pasal 4 ayat 2 & 3 UU PPh).',
    definitionEn: 'Adjustment removing income already subject to final tax or exempt from corporate tax.',
  },
  {
    term: 'UBO',
    fullId: 'Pemilik Manfaat Sebenarnya (Ultimate Beneficial Owner)',
    fullEn: 'Ultimate Beneficial Owner',
    definitionId: 'Orang perseorangan yang memiliki kendali atau manfaat akhir atas badan korporasi (Perpres 13/2018).',
    definitionEn: 'Natural person who ultimately owns or controls a corporate entity.',
  },
  {
    term: 'P3B / Tax Treaty',
    fullId: 'Persetujuan Penghindaran Pajak Berganda',
    fullEn: 'Double Taxation Avoidance Agreement (Tax Treaty)',
    definitionId: 'Perjanjian bilateral antarnegara untuk mengatur hak pemajakan dan penurunan tarif pemotongan (WHT).',
    definitionEn: 'Bilateral treaty allocating taxing rights and reducing cross-border withholding tax rates.',
  },
  {
    term: 'BEPS 2.0 Pillar Two',
    fullId: 'Pajak Minimum Global OECD GloBE (15% Effective Tax Rate)',
    fullEn: 'OECD Global Anti-Base Erosion Minimum Tax (15% ETR)',
    definitionId: 'Aturan pajak minimum global 15% untuk grup multinasional dengan omzet konsolidasi >= EUR 750 juta.',
    definitionEn: '15% global minimum tax for multinational enterprise groups with consolidated revenue >= EUR 750M.',
  },
];

export const TRANSLATIONS = {
  id: {
    appTitle: 'Nexora',
    appSubtitle: 'Platform Kepatuhan Pajak Korporasi & Deteksi Risiko Fiskal Berbasis Bukti',
    valueProposition:
      'Nexora membaca dokumen pajak & korporasi, menandai risiko fraud/kepatuhan lengkap dengan bukti, lalu menyiapkan draf rekonsiliasi fiskal yang siap direview manusia.',
    demoBadge: 'DATA DEMO / SIMULASI — Smart Demo Mode',
    liveBadge: 'LIVE GEMINI API — Grounded Mode',
    engineTooltipDemo:
      'Berjalan 100% deterministik tanpa API key. Seluruh ekstraksi dokumen, skor risiko (rule + statistik Z-score/Benford), dan rekonsiliasi fiskal dihitung secara lokal di server.',
    engineTooltipLive:
      'Menggunakan Gemini 2.5 Flash di server dengan timeout 7 detik, retry otomatis, dan fallback deterministik ke DemoEngine bila koneksi gagal.',
    loadSampleBtn: 'Coba dengan data contoh (1-Klik)',
    resetSampleBtn: 'Muat Ulang Dataset Sampel',
    maskSensitiveLabel: 'Samarkan ID Sensitif',
    fullScopeBadge: 'Cakupan Penuh (End-to-End)',
    previewScopeBadge: 'Preview (Adapter Terbatas)',
    localBigQueryBadge: 'Dihitung lokal (simulasi BigQuery)',
    draftWatermark: 'DRAF - BUKAN UNTUK DISAMPAIKAN KE OTORITAS',
    needsVerification: 'Perlu Verifikasi',
    verified: 'Terverifikasi',
    steps: {
      dashboard: '1. Ringkasan & Onboarding',
      ownership: '2. Struktur Kepemilikan',
      documents: '3. Document Intelligence',
      risks: '4. Fraud & Risk Engine',
      reconciliation: '5. Rekonsiliasi & Draf SPT',
      copilot: '6. Copilot RAG & Simulator',
      audit: '7. Audit Trail & Laporan',
    },
    severity: {
      CRITICAL: 'KRITIS',
      HIGH: 'TINGGI',
      MEDIUM: 'SEDANG',
      LOW: 'RENDAH',
    },
    reviewStatus: {
      NEW: 'Baru',
      IN_REVIEW: 'Ditinjau',
      CONFIRMED: 'Dikonfirmasi',
      REJECTED: 'Ditolak (False Positive)',
    },
    disclaimerBanner:
      'Alat bantu analisis kepatuhan pajak korporasi (Human-in-the-Loop). Bukan nasihat pajak resmi dan tidak melakukan pengiriman otomatis ke DJP/IRAS/LHDN/IRS. Seluruh tarif, pasal, dan posisi fiskal perlu verifikasi ahli pajak.',
  },
  en: {
    appTitle: 'Nexora',
    appSubtitle: 'Evidence-Based Corporate Tax Compliance & Fiscal Risk Intelligence Platform',
    valueProposition:
      'Nexora reads corporate & tax documents, flags fraud and compliance risks with verifiable evidence, and prepares draft fiscal reconciliations ready for human review.',
    demoBadge: 'DEMO / SIMULATION DATA — Smart Demo Mode',
    liveBadge: 'LIVE GEMINI API — Grounded Mode',
    engineTooltipDemo:
      'Runs 100% deterministically without an API key. Document extraction, dual-layer risk scoring (rules + Z-score/Benford statistics), and fiscal reconciliation are computed locally on the server.',
    engineTooltipLive:
      'Uses server-side Gemini 2.5 Flash with 7s timeout, automatic retry backoff, and seamless fallback to DemoEngine if unavailable.',
    loadSampleBtn: 'Try with sample dataset (1-Click)',
    resetSampleBtn: 'Reload Sample Dataset',
    maskSensitiveLabel: 'Mask Sensitive IDs',
    fullScopeBadge: 'Full End-to-End Scope',
    previewScopeBadge: 'Preview (Country Adapter)',
    localBigQueryBadge: 'Computed locally (BigQuery simulation)',
    draftWatermark: 'DRAFT - NOT FOR OFFICIAL SUBMISSION TO TAX AUTHORITY',
    needsVerification: 'Needs Verification',
    verified: 'Verified',
    steps: {
      dashboard: '1. Overview & Onboarding',
      ownership: '2. Ownership Structure',
      documents: '3. Document Intelligence',
      risks: '4. Fraud & Risk Engine',
      reconciliation: '5. Fiscal Reconciliation & Return',
      copilot: '6. RAG Copilot & Simulator',
      audit: '7. Audit Trail & Report',
    },
    severity: {
      CRITICAL: 'CRITICAL',
      HIGH: 'HIGH',
      MEDIUM: 'MEDIUM',
      LOW: 'LOW',
    },
    reviewStatus: {
      NEW: 'New',
      IN_REVIEW: 'In Review',
      CONFIRMED: 'Confirmed',
      REJECTED: 'Rejected (False Positive)',
    },
    disclaimerBanner:
      'Corporate tax compliance decision-support tool (Human-in-the-Loop). Not official tax advice and does not submit filings to DGT/IRAS/LHDN/IRS. All tax rates, articles, and fiscal positions require qualified tax advisor verification.',
  },
} as const;

export function t(lang: Language) {
  return TRANSLATIONS[lang];
}
