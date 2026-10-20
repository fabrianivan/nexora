export interface TaxDocumentSample {
  id: string;
  title: string;
  docType: 'e-Faktur PPN' | 'Bukti Potong PPh 23' | 'Invoice Vendor' | 'Struk Operasional';
  fileName: string;
  uploadDate: string;
  vendorName: string;
  npwp16: string;
  nitku: string;
  docNumber: string;
  docDate: string;
  dpp: number;
  taxType: string;
  taxRate: string;
  taxAmount: number;
  totalAmount: number;
  status: 'PATUH' | 'PERINGATAN' | 'RISIKO_FRAUD' | 'SIMULASI';
  confidenceScore: number;
  extractedFields: {
    label: string;
    value: string;
    validation: 'valid' | 'warning' | 'error';
    note: string;
  }[];
  aiAuditSummary: string;
  regulationRef: string;
  recommendedAction: string;
}

export interface AuditTransaction {
  id: string;
  date: string;
  vendor: string;
  npwp16: string;
  description: string;
  category: string;
  amount: number;
  taxType: 'PPN 11%' | 'PPh 23 (2%)' | 'PPh 21 TER' | 'PPh 4(2) Final' | 'Non-Objek Pajak';
  taxReported: number;
  taxExpected: number;
  riskScore: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  anomalyTag: string;
  bqZScore: number;
  aiExplanation: string;
  mitigationStep: string;
  status: 'Open' | 'Investigating' | 'Resolved';
}

export interface FiscalReconciliationItem {
  id: string;
  accountCode: string;
  accountName: string;
  group: 'PENDAPATAN' | 'HPP' | 'BEBAN_USAHA' | 'PENDAPATAN_LAIN';
  commercialAmount: number;
  positiveCorrection: number;
  negativeCorrection: number;
  fiscalAmount: number;
  correctionReason: string;
  legalBasis: string;
}

export interface IndustryBenchmark {
  metric: string;
  code: string;
  companyValue: number;
  industryIdealMin: number;
  industryIdealMax: number;
  unit: string;
  status: 'SAFE' | 'WATCH' | 'SP2DK_RISK' | 'SIMULASI';
  insight: string;
}

export const companyProfile = {
  name: 'PT Nusantara Kreasi Digital',
  npwp15: '01.394.821.4-012.000',
  npwp16: '0013948214012000',
  nitku: '0013948214012000000000',
  kluCode: '62019',
  kluName: 'Aktivitas Pemrograman Komputer & Solusi FinTech Lainnya',
  pkpStatus: 'Pengusaha Kena Pajak (PKP) Aktif',
  coretaxStatus: 'Terintegrasi Coretax DJP 2026 (NPWP 16 Digit & NITKU Tervalidasi)',
  taxPeriod: 'Oktober 2026 (Masa Pajak 10/2026)',
  taxHealthScore: 84,
  sp2dkExposureProb: 16,
  annualGrossRevenue: 4650000000, // Rp 4,65 Miliar
  ytdTaxPaid: 284500000,
  estimatedTaxSavingsIdentified: 42800000,
  potentialFraudPrevented: 68500000,
};

export const monthlyTaxMetrics = [
  { month: 'Mei 2026', omzet: 680000000, beban: 490000000, ppnKeluaran: 74800000, ppnMasukan: 48200000, pphTotal: 14200000, anomalyCount: 1 },
  { month: 'Jun 2026', omzet: 720000000, beban: 515000000, ppnKeluaran: 79200000, ppnMasukan: 52100000, pphTotal: 15800000, anomalyCount: 1 },
  { month: 'Jul 2026', omzet: 750000000, beban: 530000000, ppnKeluaran: 82500000, ppnMasukan: 54900000, pphTotal: 16400000, anomalyCount: 0 },
  { month: 'Agu 2026', omzet: 810000000, beban: 645000000, ppnKeluaran: 89100000, ppnMasukan: 78400000, pphTotal: 18900000, anomalyCount: 4 },
  { month: 'Sep 2026', omzet: 835000000, beban: 580000000, ppnKeluaran: 91850000, ppnMasukan: 59200000, pphTotal: 19200000, anomalyCount: 2 },
  { month: 'Okt 2026', omzet: 855000000, beban: 595000000, ppnKeluaran: 94050000, ppnMasukan: 61500000, pphTotal: 20100000, anomalyCount: 3 },
];

export const sampleTaxDocuments: TaxDocumentSample[] = [
  {
    id: 'DOC-2026-001',
    title: 'e-Faktur Masukan — Layanan Cloud & Server',
    docType: 'e-Faktur PPN',
    fileName: 'efaktur_cloud_infra_okt2026.pdf',
    uploadDate: '18 Okt 2026, 09:15 WIB',
    vendorName: 'PT Awan Data Nusantara',
    npwp16: '0028491029044000',
    nitku: '0028491029044000000001',
    docNumber: '010.008-26.49182731',
    docDate: '12 Oktober 2026',
    dpp: 45000000,
    taxType: 'PPN Masukan (Dapat Dikreditkan)',
    taxRate: '11%',
    taxAmount: 4950000,
    totalAmount: 49950000,
    status: 'PATUH',
    confidenceScore: 99.4,
    extractedFields: [
      { label: 'Kode & Nomor Seri Faktur Pajak (NSFP)', value: '010.008-26.49182731', validation: 'valid', note: 'Terdaftar di sistem e-Nofa / Coretax DJP' },
      { label: 'NPWP 16 Digit PKP Penjual', value: '0028491029044000', validation: 'valid', note: 'PKP Aktif & patuh SPT Masa PPN' },
      { label: 'Dasar Pengenaan Pajak (DPP)', value: 'Rp 45.000.000', validation: 'valid', note: 'Sesuai dengan nilai kontrak PO #PO-26-881' },
      { label: 'PPN 11% (UU HPP)', value: 'Rp 4.950.000', validation: 'valid', note: 'Perhitungan 11% x DPP akurat 100%' },
    ],
    aiAuditSummary: 'Dokumen e-Faktur Masukan telah tervalidasi penuh oleh Document AI & Coretax Validator. Pajak Masukan sebesar Rp 4.950.000 sah untuk dikreditkan pada SPT Masa PPN Oktober 2026.',
    regulationRef: 'Pasal 9 ayat (2) & Pasal 13 ayat (5) UU PPN s.t.d.t.d. UU No. 7 Tahun 2021 (UU HPP)',
    recommendedAction: 'Setujui dan masukkan otomatis ke daftar Pajak Masukan (Form 1111 B2).',
  },
  {
    id: 'DOC-2026-002',
    title: 'Faktur Pajak Mencurigakan — CV Mega Suplai Abadi',
    docType: 'e-Faktur PPN',
    fileName: 'faktur_cv_megasuplai_8821.pdf',
    uploadDate: '18 Okt 2026, 09:42 WIB',
    vendorName: 'CV Mega Suplai Abadi',
    npwp16: '0091827364019000',
    nitku: '0091827364019000000000',
    docNumber: '010.001-26.00019283',
    docDate: '02 Agustus 2026',
    dpp: 120000000,
    taxType: 'PPN Masukan (Indikasi TBTS)',
    taxRate: '11% (Tidak Sesuai)',
    taxAmount: 14450000,
    totalAmount: 134450000,
    status: 'RISIKO_FRAUD',
    confidenceScore: 98.7,
    extractedFields: [
      { label: 'Kode & Nomor Seri Faktur Pajak (NSFP)', value: '010.001-26.00019283', validation: 'error', note: 'ANOMALI: Jatah NSFP milik wajib pajak lain / tidak ditemukan di database DJP' },
      { label: 'Status PKP Penjual', value: 'CV Mega Suplai Abadi (NPWP: 0091827364019000)', validation: 'error', note: 'PERINGATAN KRITIS: PKP masuk daftar indikasi penerbit faktur TBTS (Fiktif)' },
      { label: 'Tanggal Faktur vs Pengiriman Barang', value: '02 Agustus 2026 (Backdated)', validation: 'warning', note: 'Dokumen baru dibuat di Oktober 2026 tanpa Surat Jalan / BAST' },
      { label: 'Kalkulasi PPN (Rp 14.450.000)', value: '12,04% dari DPP Rp 120.000.000', validation: 'error', note: 'Selisih Rp 1.250.000 dari tarif resmi PPN 11% (seharusnya Rp 13.200.000)' },
    ],
    aiAuditSummary: 'BAHAYA FRAUD PAJAK: Document AI dan Vertex AI Anomaly Engine mendeteksi ketidakcocokan seri NSFP, selisih aritmatika PPN Rp 1.250.000, serta indikasi kuat Faktur Pajak Tidak Berdasarkan Transaksi Sebenarnya (TBTS). Mengkreditkan faktur ini berisiko memicu sanksi pidana/administrasi Pasal 13 ayat (3) UU KUP (kenaikan 100%).',
    regulationRef: 'Pasal 13 ayat (5) UU PPN & SE-17/PJ/2018 tentang Penanganan Indikasi Penerbit Faktur Pajak TBTS',
    recommendedAction: 'TOLAK pengkreditan Faktur Pajak ini, tahan pembayaran ke vendor, dan minta klarifikasi BAST/bukti arus barang.',
  },
  {
    id: 'DOC-2026-003',
    title: 'Bukti Potong Unifikasi PPh Pasal 23 — Jasa Konsultan IT',
    docType: 'Bukti Potong PPh 23',
    fileName: 'ebupot_pph23_konsultan_okt26.pdf',
    uploadDate: '18 Okt 2026, 10:05 WIB',
    vendorName: 'PT Solusi Siber Mandiri',
    npwp16: '0045192837021000',
    nitku: '0045192837021000000000',
    docNumber: '2000004918-1026',
    docDate: '15 Oktober 2026',
    dpp: 35000000,
    taxType: 'PPh Pasal 23 (Jasa Teknik & Manajemen)',
    taxRate: '2%',
    taxAmount: 700000,
    totalAmount: 34300000,
    status: 'PATUH',
    confidenceScore: 99.1,
    extractedFields: [
      { label: 'Nomor Bukti Potong e-Bupot Unifikasi', value: '2000004918-1026', validation: 'valid', note: 'Format e-Bupot Unifikasi DJP sesuai standar' },
      { label: 'Kode Objek Pajak', value: '24-104-02 (Jasa Konsultan)', validation: 'valid', note: 'Sesuai daftar positif PMK 141/PMK.03/2015' },
      { label: 'DPP Penghasilan Bruto (Tidak Termasuk PPN)', value: 'Rp 35.000.000', validation: 'valid', note: 'Sudah memisahkan unsur PPN dari dasar pemotongan' },
      { label: 'Tarif & PPh 23 Dipotong (2%)', value: 'Rp 700.000', validation: 'valid', note: 'Wajib pajak memiliki NPWP valid (tidak kena kenaikan tarif 100%)' },
    ],
    aiAuditSummary: 'Pemotongan PPh Pasal 23 sebesar 2% (Rp 700.000) atas Jasa Konsultan IT telah sesuai dengan PMK 141/PMK.03/2015. Tidak ada selisih pemotongan.',
    regulationRef: 'Pasal 23 ayat (1) huruf c angka 2 UU PPh & PMK 141/PMK.03/2015',
    recommendedAction: 'Bukukan kredit pajak / kewajiban setor PPh 23 paling lambat tanggal 15 bulan berikutnya.',
  },
  {
    id: 'DOC-2026-004',
    title: 'Invoice Entertainment & Jamuan Klien — Tanpa Daftar Nominatif',
    docType: 'Invoice Vendor',
    fileName: 'inv_grand_dining_jakarta_902.jpg',
    uploadDate: '18 Okt 2026, 10:30 WIB',
    vendorName: 'PT Kuliner Nusantara Prima (Grand Dining)',
    npwp16: '0071829301077000',
    nitku: '0071829301077000000000',
    docNumber: 'INV/GD/2026/10/0902',
    docDate: '16 Oktober 2026',
    dpp: 18500000,
    taxType: 'Pajak Restoran (PB1 10%) & Koreksi Fiskal PPh',
    taxRate: 'Non-Deductible jika tanpa Daftar Nominatif',
    taxAmount: 1850000,
    totalAmount: 20350000,
    status: 'PERINGATAN',
    confidenceScore: 96.8,
    extractedFields: [
      { label: 'Kategori Pengeluaran', value: 'Biaya Jamuan / Entertainment (Rp 20.350.000)', validation: 'warning', note: 'Beban rawan koreksi saat pemeriksaan pajak (audit DJP)' },
      { label: 'Lampiran Daftar Nominatif (SE-27/PJ.22/1986)', value: 'TIDAK DITEMUKAN', validation: 'error', note: 'Wajib mencantumkan nama, jabatan, nama perusahaan relasi & jenis usaha' },
      { label: 'Klaim PPN Masukan', value: 'Rp 0 (Objek Pajak Daerah PB1)', validation: 'valid', note: 'Pajak Restoran bukan objek PPN sehingga tidak dikreditkan' },
      { label: 'Dampak Rekonsiliasi Fiskal', value: 'Koreksi Fiskal Positif Rp 20.350.000', validation: 'warning', note: 'Menambah Penghasilan Kena Pajak jika Daftar Nominatif tidak dilengkapi' },
    ],
    aiAuditSummary: 'Biaya jamuan/entertainment sebesar Rp 20.350.000 berisiko tinggi terkena Koreksi Fiskal Positif saat rekonsiliasi SPT Tahunan karena belum dilengkapi Daftar Nominatif sesuai SE-27/PJ.22/1986 & PMK 66 Tahun 2023.',
    regulationRef: 'Pasal 6 ayat (1) huruf a UU PPh & SE-27/PJ.22/1986 (Syarat Biaya Entertainment Deductible)',
    recommendedAction: 'Lengkapi Formulir Daftar Nominatif Biaya Entertainment atau masukkan ke akun Koreksi Fiskal Positif otomatis.',
  },
];

export const auditTransactions: AuditTransaction[] = [
  {
    id: 'TRX-2610-089',
    date: '2026-10-16',
    vendor: 'CV Mega Suplai Abadi',
    npwp16: '0091827364019000',
    description: 'Pengadaan Lisensi & Modul Perangkat Keras Server',
    category: 'Beban Infrastruktur IT',
    amount: 120000000,
    taxType: 'PPN 11%',
    taxReported: 14450000,
    taxExpected: 13200000,
    riskScore: 96,
    riskLevel: 'CRITICAL',
    anomalyTag: 'Indikasi Faktur TBTS & Selisih Tarif PPN',
    bqZScore: 4.82,
    aiExplanation: 'BigQuery Anomaly Engine mendeteksi Z-Score 4.82: Nomor Seri Faktur Pajak tidak cocok dengan alokasi e-Nofa vendor, tarif PPN yang ditagihkan 12,04% (bukan 11%), dan profil vendor terindikasi jaringan penerbit faktur fiktif (TBTS).',
    mitigationStep: 'Batalkan pengkreditan Pajak Masukan pada SPT Masa PPN dan lakukan pemblokiran pembayaran vendor sementara.',
    status: 'Open',
  },
  {
    id: 'TRX-2610-074',
    date: '2026-10-14',
    vendor: 'PT Kreasi Media Mandiri',
    npwp16: '0038192011024000',
    description: 'Jasa Agensi Digital Marketing Kampanye Q4 (3 Invoice Beruntun)',
    category: 'Beban Pemasaran & Iklan',
    amount: 49500000,
    taxType: 'PPh 23 (2%)',
    taxReported: 0,
    taxExpected: 990000,
    riskScore: 88,
    riskLevel: 'HIGH',
    anomalyTag: 'Split Invoicing & Kurang Potong PPh 23',
    bqZScore: 3.45,
    aiExplanation: 'Terdeteksi pemecahan 1 pekerjaan menjadi 3 invoice @ Rp 16.500.000 di tanggal yang sama untuk menghindari otorisasi manajer keuangan, serta belum dilakukan pemotongan PPh Pasal 23 sebesar 2% (Rp 990.000) atas Jasa Periklanan.',
    mitigationStep: 'Terbitkan Bukti Potong e-Bupot PPh Pasal 23 sebesar Rp 990.000 sebelum penutupan masa pajak Oktober 2026.',
    status: 'Investigating',
  },
  {
    id: 'TRX-2610-062',
    date: '2026-10-12',
    vendor: 'Grand Dining & Lounge Jakarta',
    npwp16: '0071829301077000',
    description: 'Biaya Jamuan Eksekutif & Relasi Klien Enterprise',
    category: 'Beban Representasi & Jamuan',
    amount: 20350000,
    taxType: 'Non-Objek Pajak',
    taxReported: 0,
    taxExpected: 0,
    riskScore: 76,
    riskLevel: 'HIGH',
    anomalyTag: 'Biaya Entertainment Tanpa Daftar Nominatif',
    bqZScore: 2.91,
    aiExplanation: 'Pengeluaran jamuan Rp 20.350.000 dibukukan sebagai biaya pengurang penghasilan bruto (deductible expense) namun tidak memiliki lampiran Daftar Nominatif. Rawan memicu koreksi fiskal positif dan denda saat pemeriksaan.',
    mitigationStep: 'Tandai otomatis sebagai Koreksi Fiskal Positif pada Modul Rekonsiliasi SPT atau unggah Daftar Nominatif.',
    status: 'Open',
  },
  {
    id: 'TRX-2610-051',
    date: '2026-10-10',
    vendor: 'Budi Santoso (Tenaga Ahli Lepas / Freelance UI/UX)',
    npwp16: '3174051809920003',
    description: 'Honorarium Desain Sistem Antarmuka Proyek FinTech',
    category: 'Beban Tenaga Ahli Bukan Pegawai',
    amount: 32000000,
    taxType: 'PPh 21 TER',
    taxReported: 400000,
    taxExpected: 800000,
    riskScore: 65,
    riskLevel: 'MEDIUM',
    anomalyTag: 'Salah Hitung DPP PPh 21 Bukan Pegawai',
    bqZScore: 2.15,
    aiExplanation: 'Sesuai PMK 168 Tahun 2023, PPh 21 untuk Bukan Pegawai dihitung menggunakan Tarif Pasal 17 x (50% x Penghasilan Bruto) = 5% x Rp 16.000.000 = Rp 800.000. Saat ini baru dipotong Rp 400.000 (kurang potong Rp 400.000).',
    mitigationStep: 'Sesuaikan bukti potong PPh 21 masa Oktober 2026 menjadi Rp 800.000 sesuai formula PMK 168/2023.',
    status: 'Open',
  },
  {
    id: 'TRX-2610-044',
    date: '2026-10-08',
    vendor: 'PT Graha Properti Sentosa',
    npwp16: '0019283746011000',
    description: 'Pembayaran Sewa Ruang Kantor Co-Working Q4 2026',
    category: 'Beban Sewa Gedung & Kantor',
    amount: 60000000,
    taxType: 'PPh 4(2) Final',
    taxReported: 1200000,
    taxExpected: 6000000,
    riskScore: 82,
    riskLevel: 'HIGH',
    anomalyTag: 'Salah Klasifikasi PPh 23 vs PPh 4(2) Sewa Tanah/Bangunan',
    bqZScore: 3.12,
    aiExplanation: 'Transaksi sewa ruang kantor dipotong menggunakan tarif PPh 23 sebesar 2% (Rp 1.200.000), padahal sewa tanah dan/atau bangunan merupakan objek PPh Pasal 4 ayat (2) Final dengan tarif 10% (Rp 6.000.000).',
    mitigationStep: 'Koreksi kode akun pajak dari 411124 (PPh 23) menjadi 411128-403 (PPh Final Sewa Tanah/Bangunan 10%).',
    status: 'Investigating',
  },
  {
    id: 'TRX-2610-030',
    date: '2026-10-05',
    vendor: 'PT Awan Data Nusantara',
    npwp16: '0028491029044000',
    description: 'Langganan Cloud Compute, BigQuery & Vertex AI Enterprise',
    category: 'Beban Infrastruktur IT',
    amount: 45000000,
    taxType: 'PPN 11%',
    taxReported: 4950000,
    taxExpected: 4950000,
    riskScore: 8,
    riskLevel: 'LOW',
    anomalyTag: 'Transaksi Normal Terverifikasi',
    bqZScore: 0.24,
    aiExplanation: 'Seluruh parameter NPWP 16 Digit, NITKU, NSFP, dan perhitungan PPN 11% cocok dengan data e-Faktur DJP.',
    mitigationStep: 'Tidak diperlukan tindakan koreksi.',
    status: 'Resolved',
  },
  {
    id: 'TRX-2610-019',
    date: '2026-10-03',
    vendor: 'PT Solusi Siber Mandiri',
    npwp16: '0045192837021000',
    description: 'Jasa Penetration Testing & Audit Keamanan Aplikasi',
    category: 'Beban Jasa Profesional',
    amount: 35000000,
    taxType: 'PPh 23 (2%)',
    taxReported: 700000,
    taxExpected: 700000,
    riskScore: 12,
    riskLevel: 'LOW',
    anomalyTag: 'Transaksi Normal Terverifikasi',
    bqZScore: 0.41,
    aiExplanation: 'Pemotongan PPh 23 sebesar 2% dan kredit PPN Masukan telah sesuai regulasi.',
    mitigationStep: 'Tidak diperlukan tindakan koreksi.',
    status: 'Resolved',
  },
];

export const industryBenchmarks: IndustryBenchmark[] = [
  {
    metric: 'Gross Profit Margin (GPM)',
    code: 'CRM-GPM',
    companyValue: 58.4,
    industryIdealMin: 52.0,
    industryIdealMax: 68.0,
    unit: '%',
    status: 'SAFE',
    insight: 'Margin laba kotor berada di rentang aman KLU 62019 (52%–68%). Tidak memicu indikator risiko CRM DJP.',
  },
  {
    metric: 'Net Profit Margin (NPM) Fiskal',
    code: 'CRM-NPM',
    companyValue: 19.8,
    industryIdealMin: 15.0,
    industryIdealMax: 28.0,
    unit: '%',
    status: 'SAFE',
    insight: 'Setelah koreksi fiskal otomatis, NPM berada pada level sehat 19,8% (di atas batas bawah benchmark DJP 15%).',
  },
  {
    metric: 'Rasio PPN Masukan terhadap PPN Keluaran',
    code: 'CRM-VAT',
    companyValue: 76.2,
    industryIdealMin: 40.0,
    industryIdealMax: 72.0,
    unit: '%',
    status: 'SP2DK_RISK',
    insight: 'Lonjakan PPN Masukan bulan Agustus–Oktober (76,2%) melampaui ambang wajar industri jasa IT (72%) akibat adanya 1 faktur indikasi TBTS.',
  },
  {
    metric: 'Rasio Biaya Gaji vs. Ekualisasi Objek PPh 21',
    code: 'CRM-EQ21',
    companyValue: 98.7,
    industryIdealMin: 98.0,
    industryIdealMax: 100.0,
    unit: '%',
    status: 'WATCH',
    insight: 'Selisih 1,3% antara akun biaya gaji/honor di buku besar dengan SPT Masa PPh 21 berasal dari kurang potong honorarium tenaga ahli.',
  },
];

export const fiscalReconciliationData: FiscalReconciliationItem[] = [
  {
    id: 'REC-01',
    accountCode: '4100',
    accountName: 'Pendapatan Usaha Jasa Teknologi & Langganan SaaS',
    group: 'PENDAPATAN',
    commercialAmount: 4650000000,
    positiveCorrection: 0,
    negativeCorrection: 0,
    fiscalAmount: 4650000000,
    correctionReason: 'Objek PPh Badan Normal / Final sesuai skema yang dipilih',
    legalBasis: 'Pasal 4 ayat (1) UU PPh',
  },
  {
    id: 'REC-02',
    accountCode: '5100',
    accountName: 'Beban Pokok Pendapatan (Cloud Server, API & Lisensi Langsung)',
    group: 'HPP',
    commercialAmount: 1810000000,
    positiveCorrection: 120000000,
    negativeCorrection: 0,
    fiscalAmount: 1690000000,
    correctionReason: 'Koreksi Positif atas transaksi CV Mega Suplai Abadi (indikasi TBTS / tanpa bukti pengiriman sah)',
    legalBasis: 'Pasal 6 ayat (1) & Pasal 28 UU KUP',
  },
  {
    id: 'REC-03',
    accountCode: '6100',
    accountName: 'Beban Gaji, Tunjangan & Honorarium Tim',
    group: 'BEBAN_USAHA',
    commercialAmount: 1320000000,
    positiveCorrection: 18500000,
    negativeCorrection: 0,
    fiscalAmount: 1301500000,
    correctionReason: 'Koreksi Positif atas fasilitas natura/kenikmatan melebihi batasan PMK 66 Tahun 2023',
    legalBasis: 'PMK No. 66 Tahun 2023 tentang Pajak Natura',
  },
  {
    id: 'REC-04',
    accountCode: '6200',
    accountName: 'Beban Pemasaran, Jamuan & Representasi Klien',
    group: 'BEBAN_USAHA',
    commercialAmount: 385000000,
    positiveCorrection: 20350000,
    negativeCorrection: 0,
    fiscalAmount: 364650000,
    correctionReason: 'Koreksi Positif biaya entertainment tanpa lampiran Daftar Nominatif',
    legalBasis: 'Pasal 9 ayat (1) UU PPh & SE-27/PJ.22/1986',
  },
  {
    id: 'REC-05',
    accountCode: '6300',
    accountName: 'Beban Sewa Kantor, Utilitas & Operasional Umum',
    group: 'BEBAN_USAHA',
    commercialAmount: 340000000,
    positiveCorrection: 9500000,
    negativeCorrection: 0,
    fiscalAmount: 330500000,
    correctionReason: 'Koreksi Positif atas sanksi administrasi/denda pajak yang tidak boleh dibiayakan',
    legalBasis: 'Pasal 9 ayat (1) huruf k UU PPh',
  },
  {
    id: 'REC-06',
    accountCode: '7100',
    accountName: 'Pendapatan Bunga Deposito & Jasa Giro Bank',
    group: 'PENDAPATAN_LAIN',
    commercialAmount: 42000000,
    positiveCorrection: 0,
    negativeCorrection: 42000000,
    fiscalAmount: 0,
    correctionReason: 'Koreksi Fiskal Negatif: Penghasilan telah dikenakan PPh Final Pasal 4 ayat (2) sebesar 20%',
    legalBasis: 'Pasal 4 ayat (2) huruf a UU PPh & PP 131/2000',
  },
];

export const copilotPresets = [
  {
    id: 'q1',
    title: 'Bandingkan PPh Final 0,5% vs Pasal 31E',
    prompt: 'Dengan omzet PT kami Rp 4,65 Miliar dan laba fiskal Rp 963,35 Juta, lebih hemat pakai PPh Final UMKM 0,5% (PP 55/2022) atau tarif PPh Badan Fasilitas Pasal 31E (diskon 50% dari 22%)?',
  },
  {
    id: 'q2',
    title: 'Cara Mitigasi Risiko SP2DK Faktur TBTS',
    prompt: 'Bagaimana langkah hukum dan prosedur pembetulan SPT Masa PPN jika sistem mendeteksi ada 1 Faktur Pajak Masukan dari CV Mega Suplai Abadi yang terindikasi TBTS sebelum terbit SP2DK?',
  },
  {
    id: 'q3',
    title: 'Aturan Biaya Entertainment & Natura (PMK 66/2023)',
    prompt: 'Apa syarat agar biaya jamuan klien Rp 20,35 juta dan fasilitas karyawan tidak terkena koreksi fiskal positif menurut PMK 66 Tahun 2023 dan SE-27/PJ.22/1986?',
  },
  {
    id: 'q4',
    title: 'Ekualisasi PPh 21 TER (PMK 168/2023) & PPh 23',
    prompt: 'Tolong audit selisih pemotongan PPh 21 Bukan Pegawai dan salah klasifikasi PPh 23 vs PPh 4(2) sewa kantor pada transaksi bulan Oktober 2026 kami.',
  },
];
