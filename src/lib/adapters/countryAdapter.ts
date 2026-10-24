import { z } from 'zod';
import {
  CountryCode,
  DocumentType,
  FindingSeverity,
  validateCountryTaxId,
} from '../domain';

export interface CountryDocumentTypeSpec {
  type: DocumentType;
  code: string;
  labelId: string;
  labelEn: string;
  authoritySystem: string;
  requiredFields: string[];
}

export interface RiskRuleSpec {
  id: string;
  country: CountryCode | 'GLOBAL';
  nameId: string;
  nameEn: string;
  descriptionId: string;
  descriptionEn: string;
  inputs: string[];
  logicSummary: string;
  defaultSeverity: FindingSeverity;
  baseRuleScore: number;
  regulationRef: string;
  exampleCase: string;
}

export interface FiscalAdjustmentRuleSpec {
  id: string;
  type: 'POSITIVE' | 'NEGATIVE';
  nameId: string;
  nameEn: string;
  legalBasis: string;
  descriptionId: string;
  descriptionEn: string;
}

export interface PaymentCodeSpec {
  code: string;
  name: string;
  channel: string;
  description: string;
}

export interface ReturnFormTemplateSpec {
  formCode: string;
  formName: string;
  authorityPortal: string;
  watermark: string;
  sections: string[];
}

export interface CountryAdapter {
  code: CountryCode;
  name: string;
  nameEn: string;
  flag: string;
  authority: string;
  authorityFull: string;
  currency: 'IDR' | 'SGD' | 'MYR' | 'USD';
  currencySymbol: string;
  corporateTaxRate: number;
  indirectTaxRate: number;
  indirectTaxName: string;
  domesticWhtRate: number;
  treatyWhtRate: number;
  taxIdFormat: string;
  status: 'full' | 'preview';
  validateTaxId(raw: string): { valid: boolean; normalized: string; message?: string };
  documentTypes: CountryDocumentTypeSpec[];
  invoiceSchema: z.ZodTypeAny;
  riskRules: RiskRuleSpec[];
  fiscalAdjustmentRules: FiscalAdjustmentRuleSpec[];
  returnFormTemplate: ReturnFormTemplateSpec;
  paymentCodes: PaymentCodeSpec[];
}

const baseInvoiceSchema = z.object({
  number: z.string().min(1),
  date: z.string().date(),
  counterparty: z.string().min(2),
  counterpartyTaxId: z.string().min(5),
  taxableBase: z.number().min(0),
  taxAmount: z.number().min(0),
  totalAmount: z.number().min(0),
});

export const GLOBAL_RISK_RULES: RiskRuleSpec[] = [
  {
    id: 'SPLIT_INVOICING',
    country: 'GLOBAL',
    nameId: 'Split Invoicing (Pemecahan Tagihan)',
    nameEn: 'Split Invoicing (Threshold Evasion)',
    descriptionId:
      'Beberapa invoice dari vendor yang sama pada tanggal berdekatan tepat di bawah ambang persetujuan otorisasi.',
    descriptionEn:
      'Multiple invoices from the same vendor on the same or adjacent dates just below approval thresholds.',
    inputs: ['entityId', 'counterparty', 'date', 'totalAmount'],
    logicSummary: '>= 3 invoice pada vendor & periode berdekatan dengan nominal seragam/di bawah ambang',
    defaultSeverity: 'high',
    baseRuleScore: 58,
    regulationRef: 'ISO 37001 Anti-Bribery & Internal Control Procurement Policy',
    exampleCase: '3 invoice @ Rp 16.500.000 pada tanggal yang sama dari PT Kreasi Media Mandiri.',
  },
  {
    id: 'REPEATED_ROUND_AMOUNTS',
    country: 'GLOBAL',
    nameId: 'Nominal Bulat Berulang (Round-Sum Invoicing)',
    nameEn: 'Repeated Round-Number Invoicing',
    descriptionId:
      'Transaksi bernominal bulat sempurna berulang yang mengindikasikan estimasi tanpa rincian kuantitas/unit riil.',
    descriptionEn:
      'Repeated exact round-number invoices indicating lump-sum billing without unit breakdown.',
    inputs: ['taxableBase', 'totalAmount'],
    logicSummary: 'DPP habis dibagi 10.000.000 (ID) atau 10.000 (SG/MY/US) tanpa komponen desimal/rincian',
    defaultSeverity: 'medium',
    baseRuleScore: 40,
    regulationRef: 'ISA 240 / Standar Audit Forensik Journal Entry Testing',
    exampleCase: 'Tagihan jasa konsultasi tepat Rp 120.000.000 tanpa rincian jam kerja.',
  },
  {
    id: 'Z_SCORE',
    country: 'GLOBAL',
    nameId: 'Outlier Statistik Nilai Transaksi (Z-Score & IQR)',
    nameEn: 'Statistical Transaction Outlier (Z-Score & IQR)',
    descriptionId:
      'Nilai invoice menyimpang signifikan (|Z| >= 2.0 atau di luar 1.5x IQR) terhadap distribusi historis entitas.',
    descriptionEn:
      'Invoice value deviates significantly (|Z| >= 2.0 or outside 1.5x IQR) from entity historical distribution.',
    inputs: ['totalAmount[]'],
    logicSummary: '|(x - mean) / std| >= 2.0 pada populasi >= 5 invoice',
    defaultSeverity: 'high',
    baseRuleScore: 52,
    regulationRef: 'Standar Analitik Risiko Keuangan & Deteksi Anomali Kuantitatif',
    exampleCase: 'Invoice Rp 134,45 juta saat rata-rata invoice entitas Rp 38,2 juta (Z = 2.18).',
  },
  {
    id: 'BENFORD_VIOLATION',
    country: 'GLOBAL',
    nameId: 'Anomali Distribusi Digit Pertama (Hukum Benford)',
    nameEn: "First-Digit Distribution Anomaly (Benford's Law)",
    descriptionId:
      'Distribusi digit pertama nilai transaksi menyimpang dari ekspektasi logaritmik Benford (indikasi angka rekayasa).',
    descriptionEn:
      "First-digit frequency deviates from Benford's logarithmic expectation.",
    inputs: ['totalAmount[]'],
    logicSummary: 'Deviasi absolut rata-rata (MAD) digit pertama > ambang atau konsentrasi digit tinggi (7, 8, 9)',
    defaultSeverity: 'medium',
    baseRuleScore: 42,
    regulationRef: "Nigrini Forensics / Benford's Law Digital Analysis",
    exampleCase: 'Dominasi angka kepala 8 dan 9 pada kumpulan tagihan manual.',
  },
  {
    id: 'WEEKEND_HOLIDAY_TX',
    country: 'GLOBAL',
    nameId: 'Penerbitan Dokumen di Akhir Pekan / Hari Libur',
    nameEn: 'Weekend or Public Holiday Document Issuance',
    descriptionId:
      'Faktur atau bukti transaksi diterbitkan pada hari Sabtu/Minggu di luar jam operasional normal korporasi.',
    descriptionEn: 'Invoice dated on Saturday or Sunday outside normal B2B billing cycles.',
    inputs: ['date'],
    logicSummary: 'Hari dalam minggu = Sabtu (6) atau Minggu (0)',
    defaultSeverity: 'medium',
    baseRuleScore: 38,
    regulationRef: 'ISA 240 Non-Standard Timing Control',
    exampleCase: 'Faktur tertanggal Minggu, 2 Agustus 2026.',
  },
  {
    id: 'NEW_VENDOR_SPIKE',
    country: 'GLOBAL',
    nameId: 'Vendor Baru dengan Lonjakan Nilai Transaksi Tinggi',
    nameEn: 'New Vendor High-Value Spike',
    descriptionId:
      'Vendor baru pertama kali bertransaksi langsung menagihkan nilai di atas kuartil atas histori pembayaran.',
    descriptionEn: 'First-time vendor immediately billing above upper quartile threshold.',
    inputs: ['isNewVendor', 'totalAmount'],
    logicSummary: 'isNewVendor === true && totalAmount > median * 1.5',
    defaultSeverity: 'high',
    baseRuleScore: 55,
    regulationRef: 'Know Your Vendor (KYV) & Third-Party Risk Management',
    exampleCase: 'Vendor baru CV Mega Suplai Abadi langsung menagih Rp 134,45 juta.',
  },
  {
    id: 'BANK_ACCOUNT_MISMATCH',
    country: 'GLOBAL',
    nameId: 'Ketidakcocokan Rekening Bank Vendor (Bank Mismatch)',
    nameEn: 'Vendor Bank Account Mismatch',
    descriptionId:
      'Nomor rekening tujuan pembayaran pada invoice berbeda dari rekening terdaftar pada master data vendor.',
    descriptionEn: 'Bank account on invoice differs from verified master vendor bank record.',
    inputs: ['counterpartyBankAccount', 'expectedBankAccount'],
    logicSummary: 'counterpartyBankAccount !== expectedBankAccount',
    defaultSeverity: 'critical',
    baseRuleScore: 68,
    regulationRef: 'Payment Fraud Prevention / Business Email Compromise (BEC) Control',
    exampleCase: 'Invoice meminta transfer ke rekening baru yang belum diverifikasi treasury.',
  },
  {
    id: 'HIGH_RISK_JURISDICTION',
    country: 'GLOBAL',
    nameId: 'Pembayaran / Entitas Perantara di Yurisdiksi Berisiko',
    nameEn: 'High-Risk / Conduit Jurisdiction Exposure',
    descriptionId:
      'Aliran dana atau kepemilikan melibatkan entitas perantara (conduit) di yurisdiksi pajak rendah tanpa substansi ekonomi memadai.',
    descriptionEn: 'Payment or shareholding via low-tax conduit jurisdiction without substantial activity.',
    inputs: ['counterpartyJurisdiction'],
    logicSummary: 'Yurisdiksi termasuk daftar pengawasan conduit / treaty shopping (BEPS Action 6)',
    defaultSeverity: 'high',
    baseRuleScore: 56,
    regulationRef: 'OECD BEPS Action 6 (Principal Purpose Test) & PMK 172/2023',
    exampleCase: 'Entitas perantara tanpa karyawan tetap mengklaim penurunan tarif WHT.',
  },
  {
    id: 'TRANSFER_PRICING_RISK',
    country: 'GLOBAL',
    nameId: 'Transaksi Pihak Berelasi Tanpa Dokumentasi Transfer Pricing (TP Doc)',
    nameEn: 'Undocumented Related-Party Transfer Pricing Transaction',
    descriptionId:
      'Transaksi royalti, bunga, atau jasa manajemen antar-entitas grup tanpa dukungan Local File / Master File.',
    descriptionEn: 'Intercompany royalty, interest, or management fee lacking verified TP documentation.',
    inputs: ['isRelatedParty', 'hasTransferPricingDoc', 'totalAmount'],
    logicSummary: 'isRelatedParty === true && !hasTransferPricingDoc',
    defaultSeverity: 'high',
    baseRuleScore: 60,
    regulationRef: 'OECD Transfer Pricing Guidelines & PMK No. 172 Tahun 2023 / Pasal 18 ayat (3) UU PPh',
    exampleCase: 'Tagihan manajemen/royalti antar-entitas afiliasi tanpa analisis kewajaran dan kelaziman usaha (PKKU).',
  },
];

export const IDAdapter: CountryAdapter = {
  code: 'ID',
  name: 'Indonesia',
  nameEn: 'Indonesia',
  flag: '🇮🇩',
  authority: 'DJP (Coretax)',
  authorityFull: 'Direktorat Jenderal Pajak — Kementerian Keuangan RI',
  currency: 'IDR',
  currencySymbol: 'Rp',
  corporateTaxRate: 0.22,
  indirectTaxRate: 0.11,
  indirectTaxName: 'PPN 11%',
  domesticWhtRate: 0.2,
  treatyWhtRate: 0.1,
  taxIdFormat: 'NPWP 15/16 Digit (mis. 0013948214012000) & NITKU 22 Digit',
  status: 'full',
  validateTaxId: (raw: string) => validateCountryTaxId('ID', raw),
  documentTypes: [
    {
      type: 'deed',
      code: 'AKTA_AHU',
      labelId: 'Akta Pendirian & SK Kemenkumham RI',
      labelEn: 'Deed of Establishment & MoLHR Decree',
      authoritySystem: 'SABH Ditjen AHU Kemenkumham',
      requiredFields: ['skAhuNumber', 'notaryName', 'authorizedCapital', 'paidUpCapital', 'shareholders'],
    },
    {
      type: 'shareholder',
      code: 'DAFTAR_BO',
      labelId: 'Daftar Pemegang Saham & Pemilik Manfaat (BO)',
      labelEn: 'Shareholder Register & Beneficial Ownership (BO)',
      authoritySystem: 'Portal BO Kemenkumham & Coretax DJP',
      requiredFields: ['shareholderName', 'shareholderTaxId', 'ownershipPercentage', 'beneficialOwnerName'],
    },
    {
      type: 'financial_statement',
      code: 'LAPKEU_AUDIT',
      labelId: 'Laporan Keuangan Komersial & Neraca Saldo',
      labelEn: 'Commercial Financial Statement & Trial Balance',
      authoritySystem: 'SAK / PSAK Indonesia',
      requiredFields: ['grossRevenue', 'commercialProfit', 'operatingExpenses', 'fiscalYear'],
    },
    {
      type: 'previous_tax_return',
      code: 'SPT_1771_LALU',
      labelId: 'SPT Tahunan PPh Badan 1771 Periode Sebelumnya',
      labelEn: 'Prior Year Corporate Tax Return (SPT 1771)',
      authoritySystem: 'Coretax DJP / e-Form 1771',
      requiredFields: ['bpeNumber', 'priorTaxableIncome', 'priorShareholderList', 'tpDocStatus'],
    },
    {
      type: 'e_invoice',
      code: 'E_FAKTUR_PPN',
      labelId: 'e-Faktur Pajak Pertambahan Nilai (PPN)',
      labelEn: 'VAT e-Faktur (Coretax DJP)',
      authoritySystem: 'Coretax e-Faktur DJP',
      requiredFields: ['nsfpNumber', 'vendorNpwp16', 'dpp', 'ppnAmount', 'invoiceDate'],
    },
    {
      type: 'withholding_slip',
      code: 'E_BUPOT_UNIFIKASI',
      labelId: 'Bukti Pemotongan e-Bupot Unifikasi (PPh 23 / 4(2) / 26)',
      labelEn: 'Unified Withholding Tax Slip (e-Bupot)',
      authoritySystem: 'e-Bupot Unifikasi Coretax DJP',
      requiredFields: ['bupotNumber', 'taxObjectCode', 'grossAmount', 'whtAmount'],
    },
  ],
  invoiceSchema: baseInvoiceSchema,
  riskRules: [
    {
      id: 'TBTS',
      country: 'ID',
      nameId: 'Indikasi Faktur Pajak Tidak Berdasarkan Transaksi Sebenarnya (TBTS)',
      nameEn: 'Suspected Fictitious Tax Invoice (TBTS Indicator)',
      descriptionId:
        'NPWP/NIK PKP penjual belum tervalidasi aktif, perhitungan PPN menyimpang dari tarif 11%, atau tidak didukung bukti penyerahan barang/jasa.',
      descriptionEn:
        'Vendor NPWP unvalidated, VAT calculation deviates from statutory 11%, or lacks proof of delivery.',
      inputs: ['taxIdValidated', 'taxableBase', 'taxAmount', 'hasSupportingEvidence'],
      logicSummary: '!taxIdValidated || |taxAmount - 0.11 * taxableBase| > 1',
      defaultSeverity: 'critical',
      baseRuleScore: 68,
      regulationRef: 'Pasal 13 ayat (5) UU PPN & SE-17/PJ/2018 (perlu verifikasi ahli pajak)',
      exampleCase: 'Faktur CV Mega Suplai Abadi menagih PPN Rp 14,45 juta atas DPP Rp 120 juta tanpa BAST.',
    },
    {
      id: 'NPWP_INVALID',
      country: 'ID',
      nameId: 'NPWP 16 Digit / NIK Lawan Transaksi Tidak Valid atau Tidak Aktif',
      nameEn: 'Invalid or Inactive Counterparty 16-Digit NPWP / NIK',
      descriptionId:
        'Format NPWP 15/16 digit tidak sesuai standar Coretax DJP atau status PKP lawan transaksi belum terkonfirmasi.',
      descriptionEn: 'Counterparty NPWP fails 15/16-digit format or active PKP status check.',
      inputs: ['counterpartyTaxId', 'taxIdValidated'],
      logicSummary: '!validateTaxId(counterpartyTaxId) || !taxIdValidated',
      defaultSeverity: 'high',
      baseRuleScore: 55,
      regulationRef: 'PMK No. 112/PMK.03/2022 tentang NPWP 16 Digit & NITKU',
      exampleCase: 'Lawan transaksi belum melakukan pemadanan NIK-NPWP 16 digit.',
    },
    {
      id: 'DUPLICATE_NSFP',
      country: 'ID',
      nameId: 'Nomor Seri Faktur Pajak (NSFP) Duplikat atau di Luar Rentang Jatah',
      nameEn: 'Duplicate or Out-of-Range Tax Invoice Serial Number (NSFP)',
      descriptionId:
        'Nomor dokumen/NSFP digunakan lebih dari satu kali atau berada di luar alokasi seri resmi e-Nofa/Coretax.',
      descriptionEn: 'NSFP serial number is duplicated across documents or outside allocated range.',
      inputs: ['number', 'nsfpWithinAllocatedRange'],
      logicSummary: 'count(number) > 1 || nsfpWithinAllocatedRange === false',
      defaultSeverity: 'critical',
      baseRuleScore: 66,
      regulationRef: 'PER-03/PJ/2022 tentang Faktur Pajak',
      exampleCase: 'NSFP 010.001-26.00019283 tercatat di luar jatah alokasi vendor.',
    },
    {
      id: 'VAT_NON_CREDITABLE',
      country: 'ID',
      nameId: 'PPN Masukan Tidak Dapat Dikreditkan',
      nameEn: 'Non-Creditable Input VAT',
      descriptionId:
        'Faktur pajak masukan tidak memenuhi syarat formal/material pengkreditan atau berkaitan dengan pengeluaran non-deductible.',
      descriptionEn: 'Input VAT fails formal/material requirements or relates to non-business expenditure.',
      inputs: ['creditableVat', 'hasSupportingEvidence'],
      logicSummary: 'creditableVat === false',
      defaultSeverity: 'high',
      baseRuleScore: 54,
      regulationRef: 'Pasal 9 ayat (8) UU PPN s.t.d.t.d. UU No. 7 Tahun 2021 (UU HPP)',
      exampleCase: 'Pengkreditan pajak atas jamuan tanpa hubungan langsung 3M.',
    },
    {
      id: 'NON_DEDUCTIBLE',
      country: 'ID',
      nameId: 'Biaya Non-Deductible (Tanpa Daftar Nominatif / Natura / Sanksi)',
      nameEn: 'Non-Deductible Expense Requiring Positive Fiscal Correction',
      descriptionId:
        'Biaya jamuan (entertainment) tanpa Daftar Nominatif, fasilitas natura melebihi batas, atau denda pajak yang wajib dikoreksi fiskal positif.',
      descriptionEn:
        'Entertainment expense lacking nominative list, excess benefits-in-kind, or tax penalties requiring positive book-to-tax adjustment.',
      inputs: ['deductible', 'hasSupportingEvidence'],
      logicSummary: '!deductible || !hasSupportingEvidence',
      defaultSeverity: 'medium',
      baseRuleScore: 48,
      regulationRef: 'Pasal 9 ayat (1) UU PPh, SE-27/PJ.22/1986 & PMK No. 66 Tahun 2023',
      exampleCase: 'Biaya jamuan Grand Dining Rp 20.350.000 tanpa lampiran Daftar Nominatif.',
    },
    ...GLOBAL_RISK_RULES,
  ],
  fiscalAdjustmentRules: [
    {
      id: 'ID-POS-ENTERTAINMENT',
      type: 'POSITIVE',
      nameId: 'Koreksi Positif Biaya Entertainment Tanpa Daftar Nominatif',
      nameEn: 'Positive Adjustment: Entertainment Without Nominative List',
      legalBasis: 'Pasal 9 ayat (1) UU PPh & SE-27/PJ.22/1986 (perlu verifikasi)',
      descriptionId: 'Biaya jamuan/representasi yang tidak dilengkapi daftar nominatif tidak dapat dikurangkan dari penghasilan bruto.',
      descriptionEn: 'Entertainment expenses without a nominative list are disallowed for tax deduction.',
    },
    {
      id: 'ID-POS-TBTS',
      type: 'POSITIVE',
      nameId: 'Koreksi Positif Beban Tanpa Bukti Transaksi Sah (Indikasi TBTS)',
      nameEn: 'Positive Adjustment: Unsubstantiated / Suspected TBTS Expense',
      legalBasis: 'Pasal 6 ayat (1) UU PPh & Pasal 28 UU KUP (perlu verifikasi)',
      descriptionId: 'Pengeluaran yang tidak didukung bukti arus barang/jasa yang sah wajib dikoreksi positif.',
      descriptionEn: 'Expenses lacking valid proof of delivery/transaction must be added back.',
    },
    {
      id: 'ID-POS-NATURA',
      type: 'POSITIVE',
      nameId: 'Koreksi Positif Fasilitas Natura/Kenikmatan Melebihi Batas',
      nameEn: 'Positive Adjustment: Excess Benefits-in-Kind (Natura)',
      legalBasis: 'PMK No. 66 Tahun 2023 (perlu verifikasi)',
      descriptionId: 'Pemberian natura/kenikmatan tertentu di atas batasan kriteria PMK 66/2023.',
      descriptionEn: 'Benefits-in-kind exceeding statutory thresholds under PMK 66/2023.',
    },
    {
      id: 'ID-POS-PENALTY',
      type: 'POSITIVE',
      nameId: 'Koreksi Positif Sanksi Administrasi & Denda Pajak',
      nameEn: 'Positive Adjustment: Tax Penalties & Administrative Fines',
      legalBasis: 'Pasal 9 ayat (1) huruf k UU PPh',
      descriptionId: 'Sanksi administrasi berupa bunga, denda, dan kenaikan pajak tidak boleh dibebankan secara fiskal.',
      descriptionEn: 'Administrative tax fines and interest are strictly non-deductible.',
    },
    {
      id: 'ID-NEG-FINAL-INCOME',
      type: 'NEGATIVE',
      nameId: 'Koreksi Negatif Penghasilan yang Telah Dikenakan PPh Final',
      nameEn: 'Negative Adjustment: Income Subject to Final Withholding Tax',
      legalBasis: 'Pasal 4 ayat (2) UU PPh & PP 131/2000',
      descriptionId: 'Pendapatan bunga deposito/jasa giro yang telah dipotong PPh Final dikeluarkan dari laba kena pajak badan.',
      descriptionEn: 'Interest income already taxed under Final WHT is excluded from corporate taxable income.',
    },
  ],
  returnFormTemplate: {
    formCode: 'SPT 1771',
    formName: 'SPT Tahunan PPh Wajib Pajak Badan (Formulir 1771 — Draf Simulasi)',
    authorityPortal: 'Coretax DJP (https://coretaxdjp.pajak.go.id)',
    watermark: 'DRAF - BUKAN UNTUK DISAMPAIKAN KE OTORITAS',
    sections: [
      'Induk 1771 — Perhitungan Penghasilan Neto Fiskal & PPh Terutang',
      'Lampiran 1771-I — Rekonsiliasi Laba Rugi Komersial ke Fiskal',
      'Lampiran 1771-III — Kredit Pajak Dalam Negeri (PPh Pasal 22/23)',
      'Lampiran 1771-V — Daftar Pemegang Saham / Pemilik Modal & Dividen',
      'Lampiran Khusus 3A — Pernyataan Transaksi Hubungan Istimewa (PMK 172/2023)',
    ],
  },
  paymentCodes: [
    {
      code: '411126-200',
      name: 'PPh Pasal 29 Badan Tahunan',
      channel: 'e-Billing DJP (Simulasi Referensi)',
      description: 'Pelunasan kekurangan pembayaran PPh Badan Tahunan sebelum SPT disampaikan.',
    },
    {
      code: '411211-100',
      name: 'PPN Dalam Negeri — Setoran Masa',
      channel: 'e-Billing DJP (Simulasi Referensi)',
      description: 'Penyetoran PPN Kurang Bayar pada SPT Masa PPN 1111.',
    },
    {
      code: '411124-104',
      name: 'PPh Pasal 23 atas Jasa Teknik, Manajemen & Konsultan',
      channel: 'e-Billing DJP (Simulasi Referensi)',
      description: 'Penyetoran pemotongan PPh Pasal 23 e-Bupot Unifikasi.',
    },
  ],
};

export const SGAdapter: CountryAdapter = {
  code: 'SG',
  name: 'Singapura',
  nameEn: 'Singapore',
  flag: '🇸🇬',
  authority: 'IRAS (InvoiceNow)',
  authorityFull: 'Inland Revenue Authority of Singapore (IRAS)',
  currency: 'SGD',
  currencySymbol: 'S$',
  corporateTaxRate: 0.17,
  indirectTaxRate: 0.09,
  indirectTaxName: 'GST 9%',
  domesticWhtRate: 0.15,
  treatyWhtRate: 0.1,
  taxIdFormat: 'ACRA UEN (mis. 202319482K / T22LL0918F)',
  status: 'preview',
  validateTaxId: (raw: string) => validateCountryTaxId('SG', raw),
  documentTypes: [
    {
      type: 'e_invoice',
      code: 'INVOICENOW_PEPPOL',
      labelId: 'InvoiceNow PEPPOL e-Invoice (GST)',
      labelEn: 'InvoiceNow PEPPOL e-Invoice (GST)',
      authoritySystem: 'IMDA InvoiceNow / IRAS GST',
      requiredFields: ['peppolId', 'supplierUen', 'taxableSupply', 'gstAmount'],
    },
    {
      type: 'financial_statement',
      code: 'SFRS_FS',
      labelId: 'Laporan Keuangan SFRS(I)',
      labelEn: 'SFRS(I) Financial Statements',
      authoritySystem: 'ACRA & IRAS',
      requiredFields: ['revenue', 'chargeableIncome'],
    },
  ],
  invoiceSchema: baseInvoiceSchema,
  riskRules: [
    {
      id: 'MISSING_TRADER',
      country: 'SG',
      nameId: 'Indikasi Missing Trader Fraud (MTF) / Registrasi GST Tidak Valid',
      nameEn: 'Missing Trader Fraud (MTF) / Unverified GST Registration',
      descriptionId:
        'Pemasok menagihkan GST 9% namun registrasi GST pemasok belum terverifikasi atau tidak konsisten di jaringan InvoiceNow.',
      descriptionEn:
        'Supplier charges GST while GST registration is unverified or inconsistent on InvoiceNow.',
      inputs: ['taxIdValidated', 'invoiceUuid'],
      logicSummary: '!taxIdValidated || invoiceUuid === "UNREGISTERED-PEPPOL"',
      defaultSeverity: 'critical',
      baseRuleScore: 67,
      regulationRef: 'Singapore GST Act Section 20(2A) — Knowledge Principle (perlu verifikasi)',
      exampleCase: 'Faktur Lion City Hardware Trading LLP dengan nomor registrasi GST tidak aktif.',
    },
    ...GLOBAL_RISK_RULES,
  ],
  fiscalAdjustmentRules: [
    {
      id: 'SG-POS-SPLATE',
      type: 'POSITIVE',
      nameId: 'Add-back Biaya Kendaraan Pribadi (S-Plate Motor Car)',
      nameEn: 'Add-back: Private Passenger Car (S-Plate) Expense',
      legalBasis: 'Section 15(1)(k) Singapore Income Tax Act (perlu verifikasi)',
      descriptionId: 'Biaya sewa dan operasional mobil penumpang S-plate tidak dapat dikurangkan.',
      descriptionEn: 'Private S-plate motor car expenses are non-deductible.',
    },
  ],
  returnFormTemplate: {
    formCode: 'Form C-S / Form C',
    formName: 'IRAS Corporate Income Tax Return (Form C-S / Form C — Preview Draft)',
    authorityPortal: 'IRAS myTax Portal (Preview)',
    watermark: 'DRAF - BUKAN UNTUK DISAMPAIKAN KE OTORITAS',
    sections: ['Part A — Company Declaration', 'Part B — Tax Computation & Adjustments'],
  },
  paymentCodes: [
    {
      code: 'GIRO-CIT',
      name: 'Corporate Income Tax GIRO / PayNow Reference',
      channel: 'GIRO / PayNow Corporate (Simulasi Referensi)',
      description: 'Referensi pembayaran pajak korporasi IRAS (hanya informasi).',
    },
  ],
};

export const MYAdapter: CountryAdapter = {
  code: 'MY',
  name: 'Malaysia',
  nameEn: 'Malaysia',
  flag: '🇲🇾',
  authority: 'LHDN (MyInvois)',
  authorityFull: 'Lembaga Hasil Dalam Negeri Malaysia (LHDN)',
  currency: 'MYR',
  currencySymbol: 'RM',
  corporateTaxRate: 0.24,
  indirectTaxRate: 0.08,
  indirectTaxName: 'SST 8%',
  domesticWhtRate: 0.1,
  treatyWhtRate: 0.08,
  taxIdFormat: 'LHDN TIN (mis. C25849102090)',
  status: 'preview',
  validateTaxId: (raw: string) => validateCountryTaxId('MY', raw),
  documentTypes: [
    {
      type: 'e_invoice',
      code: 'MYINVOIS_CTC',
      labelId: 'e-Invoice LHDN MyInvois (UBL 2.1)',
      labelEn: 'LHDN MyInvois Validated e-Invoice',
      authoritySystem: 'LHDN MyInvois Portal',
      requiredFields: ['myInvoisUuid', 'supplierTin', 'dpp', 'sstAmount'],
    },
  ],
  invoiceSchema: baseInvoiceSchema,
  riskRules: [
    {
      id: 'MYINVOIS_UUID',
      country: 'MY',
      nameId: 'UUID MyInvois Tidak Tervalidasi / Tidak Ditemukan',
      nameEn: 'Missing or Unvalidated LHDN MyInvois UUID',
      descriptionId:
        'Invoice vendor tidak memiliki Unique Identifier Number (UUID) dari portal Continuous Transaction Control (CTC) LHDN MyInvois.',
      descriptionEn: 'Vendor invoice lacks a validated LHDN MyInvois UUID.',
      inputs: ['invoiceUuid'],
      logicSummary: '!invoiceUuid || invoiceUuid.trim() === ""',
      defaultSeverity: 'high',
      baseRuleScore: 62,
      regulationRef: 'Income Tax Act 1967 Section 33(1) & Section 82B MyInvois Guideline (perlu verifikasi)',
      exampleCase: 'Invoice PDF manual Klang Valley Enterprise tanpa UUID MyInvois.',
    },
    ...GLOBAL_RISK_RULES,
  ],
  fiscalAdjustmentRules: [
    {
      id: 'MY-POS-ENTERTAINMENT',
      type: 'POSITIVE',
      nameId: 'Koreksi Positif 50% Biaya Jamuan Klien (Section 39(1)(l))',
      nameEn: '50% Entertainment Disallowance (Section 39(1)(l) ITA)',
      legalBasis: 'Section 39(1)(l) Income Tax Act 1967 Malaysia (perlu verifikasi)',
      descriptionId: ' pembatasan 50% atas biaya entertainment klien umum.',
      descriptionEn: 'Statutory 50% restriction on non-exempt client entertainment.',
    },
  ],
  returnFormTemplate: {
    formCode: 'Form C',
    formName: 'LHDN Borang C / Return Form of a Company (Preview Draft)',
    authorityPortal: 'LHDN MyTax Portal (Preview)',
    watermark: 'DRAF - BUKAN UNTUK DISAMPAIKAN KE OTORITAS',
    sections: ['Bahagian A — Maklumat Syarikat', 'Bahagian B — Pendapatan Berkanun & Cukai Kena Dibayar'],
  },
  paymentCodes: [
    {
      code: 'FPX-BYR-HASIL',
      name: 'FPX ByrHASiL Corporate Tax Reference (CP204 / Form C)',
      channel: 'FPX ByrHASiL LHDN (Simulasi Referensi)',
      description: 'Kode referensi informasi pembayaran pajak LHDN Malaysia.',
    },
  ],
};

export const USAdapter: CountryAdapter = {
  code: 'US',
  name: 'Amerika Serikat',
  nameEn: 'United States',
  flag: '🇺🇸',
  authority: 'IRS (MeF)',
  authorityFull: 'Internal Revenue Service (IRS)',
  currency: 'USD',
  currencySymbol: '$',
  corporateTaxRate: 0.21,
  indirectTaxRate: 0.0825,
  indirectTaxName: 'Sales Tax 8.25%',
  domesticWhtRate: 0.3,
  treatyWhtRate: 0.1,
  taxIdFormat: 'Federal EIN XX-XXXXXXX (mis. 88-4920193)',
  status: 'preview',
  validateTaxId: (raw: string) => validateCountryTaxId('US', raw),
  documentTypes: [
    {
      type: 'e_invoice',
      code: 'IRS_1099_W9',
      labelId: 'Contractor Invoice & Form W-9 / 1099-NEC',
      labelEn: 'Contractor Invoice & Form W-9 / 1099-NEC',
      authoritySystem: 'IRS Modernized e-File (MeF)',
      requiredFields: ['vendorEin', 'w9Status', 'grossPayment'],
    },
  ],
  invoiceSchema: baseInvoiceSchema,
  riskRules: [
    {
      id: 'US_TIN_BACKUP_WHT',
      country: 'US',
      nameId: 'TIN Tidak Tervalidasi / Risiko Backup Withholding 24% (IRC §3406)',
      nameEn: 'Unverified EIN / Missing W-9 (IRC §3406 Backup Withholding Risk)',
      descriptionId:
        'Pembayaran kepada vendor/kontraktor AS tanpa Form W-9 dan pencocokan EIN yang valid berisiko memicu kewajiban potong 24%.',
      descriptionEn: 'Payment to US vendor without validated Form W-9 triggers 24% backup withholding exposure.',
      inputs: ['taxIdValidated'],
      logicSummary: '!taxIdValidated',
      defaultSeverity: 'high',
      baseRuleScore: 60,
      regulationRef: 'Internal Revenue Code (IRC) §3406 & §6721 (perlu verifikasi)',
      exampleCase: 'Pembayaran $62,000 ke Apex Growth Partners tanpa Form W-9.',
    },
    ...GLOBAL_RISK_RULES,
  ],
  fiscalAdjustmentRules: [
    {
      id: 'US-POS-M1-MEALS',
      type: 'POSITIVE',
      nameId: 'Schedule M-1 Add-back: 100% Entertainment & 50% Business Meals',
      nameEn: 'Schedule M-1 Add-back: IRC §274 Entertainment & Meals Limit',
      legalBasis: 'IRC §274(a) & §274(n) (perlu verifikasi)',
      descriptionId: 'Koreksi buku ke pajak atas biaya hiburan (100%) dan jamuan bisnis (50%).',
      descriptionEn: 'Schedule M-1 book-to-tax adjustment for disallowed entertainment and 50% meals.',
    },
  ],
  returnFormTemplate: {
    formCode: 'Form 1120',
    formName: 'U.S. Corporation Income Tax Return (Form 1120 — Preview Draft)',
    authorityPortal: 'IRS Modernized e-File (Preview)',
    watermark: 'DRAF - BUKAN UNTUK DISAMPAIKAN KE OTORITAS',
    sections: [
      'Form 1120 Page 1 — Income, Deductions, and Tax Computation',
      'Schedule M-1 — Reconciliation of Income (Loss) per Books With Income per Return',
    ],
  },
  paymentCodes: [
    {
      code: 'EFTPS-1120',
      name: 'EFTPS Federal Corporate Income Tax Deposit Reference',
      channel: 'EFTPS (Electronic Federal Tax Payment System — Simulasi Referensi)',
      description: 'Referensi informasi pembayaran federal C-Corp (Nexora tidak memproses transaksi).',
    },
  ],
};

export const COUNTRY_ADAPTERS: Record<CountryCode, CountryAdapter> = {
  ID: IDAdapter,
  SG: SGAdapter,
  MY: MYAdapter,
  US: USAdapter,
};

export function getCountryAdapter(code: CountryCode): CountryAdapter {
  return COUNTRY_ADAPTERS[code] ?? IDAdapter;
}
