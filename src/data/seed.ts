/**
 * Canonical sample dataset (pure — safe to import on client and server).
 * The database is seeded from here, and the client falls back to it when the
 * database is unreachable.
 */
import { fiscalReconciliationData } from '@/data/indonesiaTaxData';
import { SAMPLE_ENTITIES } from '@/data/entities';
import type { AuditLogRecord, CalculationState, CalendarEvent, PaymentLiability, StudyItem, TaxReturnState } from '@/state/types';
import { DEFAULT_CREDITS } from '@/lib/cit';

export const SEED_COMPANIES = SAMPLE_ENTITIES;

export const SEED_CALCULATIONS: CalculationState = {
  fiscalYear: '2026',
  items: fiscalReconciliationData,
  apply31EFacility: true,
  credits: DEFAULT_CREDITS.ID,
};

export const SEED_TAX_RETURN: TaxReturnState = {
  returnStatus: 'Review',
  creator: { name: 'Bambang Soeprapto, BKP', role: 'Konsultan Pajak (Maker)' },
  approver: null,
  submittedAt: '2026-10-26T00:15:20.000Z',
  history: [
    { at: '2026-10-22T03:00:00.000Z', by: 'Bambang Soeprapto, BKP', role: 'Konsultan Pajak', action: 'Draf dibuat dari rekonsiliasi fiskal' },
    { at: '2026-10-26T00:15:20.000Z', by: 'Bambang Soeprapto, BKP', role: 'Konsultan Pajak', action: 'Diajukan ke checker' },
  ],
};

/** Bump when the sample dataset changes; the server reseeds older databases. */
export const SEED_VERSION = 6;

export const SEED_PAYMENTS: PaymentLiability[] = [
  { id: 'PAY-01', entityId: 'ENT-ID-001', taxType: 'PPh Badan Tahunan (Pasal 29)', kapKjs: '411126-200', period: 'Tahun Pajak 2026', amount: 25063500, dueDate: '2027-04-30', status: 'Belum dibayar', billingCode: '0192837491823741' },
  { id: 'PAY-02', entityId: 'ENT-ID-001', taxType: 'PPN Masa Oktober 2026', kapKjs: '411211-100', period: 'Masa 10-2026', amount: 32550000, dueDate: '2026-11-30', status: 'Belum dibayar', billingCode: '0281928374192847' },
  { id: 'PAY-03', entityId: 'ENT-ID-001', taxType: 'PPh Pasal 21 Masa Oktober 2026', kapKjs: '411121-100', period: 'Masa 10-2026', amount: 18450000, dueDate: '2026-11-10', status: 'Belum dibayar', billingCode: '0371928471928371' },
  { id: 'PAY-04', entityId: 'ENT-ID-001', taxType: 'PPh Pasal 25 Masa Oktober 2026', kapKjs: '411126-100', period: 'Masa 10-2026', amount: 10000000, dueDate: '2026-11-15', status: 'Belum dibayar' },
  { id: 'PAY-05', entityId: 'ENT-ID-001', taxType: 'PPN Masa September 2026', kapKjs: '411211-100', period: 'Masa 09-2026', amount: 31650000, dueDate: '2026-10-31', status: 'Dibayar', billingCode: '0281928374101928', ntpn: '8291048291048291', paidAt: '2026-10-27 14:22:10 WIB' },
  { id: 'PAY-06', entityId: 'ENT-ID-001', taxType: 'PPh Unifikasi Masa September 2026', kapKjs: '411124-100', period: 'Masa 09-2026', amount: 6850000, dueDate: '2026-10-15', status: 'Dibayar', billingCode: '0371928471900012', ntpn: '7391827491827391', paidAt: '2026-10-14 10:15:30 WIB' },
  { id: 'PAY-07', entityId: 'ENT-SG-002', taxType: 'GST F5 Q3 2026', kapKjs: 'IRAS GST', period: 'Jul–Sep 2026', amount: 18240, dueDate: '2026-10-20', status: 'Belum dibayar' },
  { id: 'PAY-08', entityId: 'ENT-SG-002', taxType: 'Estimated Chargeable Income (ECI) YA2027', kapKjs: 'IRAS CIT', period: 'YA 2027', amount: 40630, dueDate: '2026-12-31', status: 'Belum dibayar' },
  { id: 'PAY-09', entityId: 'ENT-MY-003', taxType: 'CP204 Instalment Nov 2026', kapKjs: 'LHDN CP204', period: 'YA 2026 #11', amount: 12500, dueDate: '2026-11-15', status: 'Belum dibayar' },
  { id: 'PAY-10', entityId: 'ENT-MY-003', taxType: 'SST-02 Service Tax Sep–Oct 2026', kapKjs: 'RMCD SST', period: 'Sep–Okt 2026', amount: 9840, dueDate: '2026-11-30', status: 'Belum dibayar' },
  { id: 'PAY-11', entityId: 'ENT-US-004', taxType: 'Form 1120-W Q4 Estimated Tax', kapKjs: 'IRS EFTPS', period: 'Q4 2026', amount: 22000, dueDate: '2026-12-15', status: 'Belum dibayar' },
  { id: 'PAY-12', entityId: 'ENT-US-004', taxType: 'Form 1120-W Q3 Estimated Tax', kapKjs: 'IRS EFTPS', period: 'Q3 2026', amount: 52500, dueDate: '2026-09-15', status: 'Dibayar', ntpn: 'EFT-260915-88412', paidAt: '2026-09-12 09:02:11 EDT' },
];

export const SEED_CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'EVT-01', entityId: 'ENT-ID-001', title: 'Setor PPh 21 TER & PPh Unifikasi Oktober', jurisdiction: '🇮🇩 Indonesia (DJP)', taxType: 'PPh 21 / Unifikasi', dueDate: '2026-11-10', status: 'Upcoming', assignee: 'Bambang Soeprapto, BKP', regulationBasis: 'PMK-81/2024 Coretax', description: 'Setoran PPh 21 TER atas gaji karyawan dan PPh Unifikasi masa Oktober 2026 via e-Billing.' },
  { id: 'EVT-02', entityId: 'ENT-ID-001', title: 'Setor PPh Pasal 25 Oktober', jurisdiction: '🇮🇩 Indonesia (DJP)', taxType: 'PPh 25', dueDate: '2026-11-15', status: 'Upcoming', assignee: 'Bambang Soeprapto, BKP', regulationBasis: 'Pasal 25 UU PPh', description: 'Angsuran PPh Pasal 25 bulanan PT Nusantara Kreasi Digital Tbk.' },
  { id: 'EVT-03', entityId: 'ENT-ID-001', title: 'Lapor SPT Masa PPh Unifikasi Oktober', jurisdiction: '🇮🇩 Indonesia (DJP)', taxType: 'SPT Masa Unifikasi', dueDate: '2026-11-20', status: 'Upcoming', assignee: 'Bambang Soeprapto, BKP', regulationBasis: 'PER-24/PJ/2021', description: 'Pelaporan e-Bupot Unifikasi atas PPh 23, 26, dan 4(2).' },
  { id: 'EVT-04', entityId: 'ENT-ID-001', title: 'Setor & Lapor SPT Masa PPN Oktober', jurisdiction: '🇮🇩 Indonesia (DJP)', taxType: 'PPN 11%', dueDate: '2026-11-30', status: 'Upcoming', assignee: 'Sri Mulyani Dewi, S.E., Ak., CA', regulationBasis: 'UU HPP Klaster PPN', description: 'Penyetoran PPN kurang bayar dan pelaporan SPT Masa PPN via Coretax.' },
  { id: 'EVT-05', entityId: 'ENT-ID-001', title: 'SPT Tahunan PPh Badan 1771 TP 2026', jurisdiction: '🇮🇩 Indonesia (DJP)', taxType: 'PPh Badan', dueDate: '2027-04-30', status: 'Upcoming', assignee: 'Sri Mulyani Dewi, S.E., Ak., CA', regulationBasis: 'Pasal 3 UU KUP', description: 'Pelaporan SPT 1771 beserta lampiran & TP Doc ikhtisar.' },
  { id: 'EVT-06', entityId: 'ENT-ID-001', title: 'Lapor SPT Masa PPN September', jurisdiction: '🇮🇩 Indonesia (DJP)', taxType: 'PPN 11%', dueDate: '2026-10-31', status: 'Completed', assignee: 'Sri Mulyani Dewi, S.E., Ak., CA', regulationBasis: 'UU HPP Klaster PPN', description: 'Sudah dilaporkan — BPE diterima.' },
  { id: 'EVT-07', entityId: 'ENT-SG-002', title: 'GST F5 Q3 2026 (Jul–Sep)', jurisdiction: '🇸🇬 Singapore (IRAS)', taxType: 'GST 9%', dueDate: '2026-10-20', status: 'Upcoming', assignee: 'Marcus Tan, CFA', regulationBasis: 'GST Act s.41', description: 'Pengajuan GST F5 kuartalan — terlambat, risiko late-filing penalty S$ 200/bulan.' },
  { id: 'EVT-08', entityId: 'ENT-SG-002', title: 'Estimated Chargeable Income YA2027', jurisdiction: '🇸🇬 Singapore (IRAS)', taxType: 'CIT 17%', dueDate: '2026-12-31', status: 'Upcoming', assignee: 'Marcus Tan, CFA', regulationBasis: 'ITA s.63', description: 'ECI wajib diajukan dalam 3 bulan setelah akhir tahun buku.' },
  { id: 'EVT-09', entityId: 'ENT-MY-003', title: 'CP204 Instalment November', jurisdiction: '🇲🇾 Malaysia (LHDN)', taxType: 'CIT 24%', dueDate: '2026-11-15', status: 'Upcoming', assignee: 'Ahmad Razak, CA (M)', regulationBasis: 'ITA 1967 s.107C', description: 'Angsuran bulanan estimasi pajak korporasi.' },
  { id: 'EVT-10', entityId: 'ENT-MY-003', title: 'SST-02 Return Sep–Okt', jurisdiction: '🇲🇾 Malaysia (RMCD)', taxType: 'Service Tax 8%', dueDate: '2026-11-30', status: 'Upcoming', assignee: 'Ahmad Razak, CA (M)', regulationBasis: 'Service Tax Act 2018', description: 'Pelaporan & pembayaran Service Tax dua bulanan.' },
  { id: 'EVT-11', entityId: 'ENT-US-004', title: 'Form 1120-W Q4 Estimated Tax', jurisdiction: '🇺🇸 United States (IRS)', taxType: 'Federal CIT 21%', dueDate: '2026-12-15', status: 'Upcoming', assignee: 'Sarah Jenkins, CPA', regulationBasis: 'IRC §6655', description: 'Pembayaran estimasi pajak federal kuartal ke-4 via EFTPS.' },
  { id: 'EVT-12', entityId: 'ENT-US-004', title: 'Form 5472 & 1120 Extension Deadline', jurisdiction: '🇺🇸 United States (IRS)', taxType: 'Information Return', dueDate: '2026-10-15', status: 'Completed', assignee: 'Sarah Jenkins, CPA', regulationBasis: 'IRC §6038A', description: 'Pelaporan transaksi dengan pihak terkait asing (25% foreign-owned).' },
];

export const SEED_AUDIT_LOGS: AuditLogRecord[] = [
  { id: 'LOG-1092', timestamp: '2026-10-26 07:15:20 WIB', actor: 'Sri Mulyani Dewi, S.E., Ak., CA', role: 'Group CFO', action: 'SUBMIT_TAX_RETURN_REVIEW', target: 'Draf SPT 1771 Tahun 2026', details: 'Draf SPT Tahunan dikirim ke checker setelah verifikasi koreksi fiskal CV Mega Suplai (Rp 120.000.000).' },
  { id: 'LOG-1090', timestamp: '2026-10-25 07:31:00 WIB', actor: 'Sri Mulyani Dewi, S.E., Ak., CA', role: 'Group CFO', action: 'APPROVE_FINDING', target: 'TBTS · CV Mega Suplai Abadi', details: 'Checker menyetujui konfirmasi temuan TBTS; koreksi fiskal akun 5100 diterapkan.' },
  { id: 'LOG-1088', timestamp: '2026-10-24 09:10:12 WIB', actor: 'Bambang Soeprapto, BKP', role: 'Konsultan Pajak', action: 'PROPOSE_FINDING', target: 'TBTS · CV Mega Suplai Abadi', details: 'Maker mengusulkan konfirmasi: vendor tidak terdaftar PKP aktif & tanpa surat jalan.' },
  { id: 'LOG-1085', timestamp: '2026-10-24 08:20:45 WIB', actor: 'Nexora Risk Engine', role: 'Automated Agent', action: 'RISK_SCAN', target: '24 dokumen · 4 entitas', details: 'Pemindaian aturan TBTS, Missing Trader, split invoicing, Z-Score, dan validasi silang master data.' },
  { id: 'LOG-1080', timestamp: '2026-10-20 10:00:00 WIB', actor: 'Document AI', role: 'Automated Agent', action: 'INGEST_DOCUMENTS', target: 'Inbox dokumen grup', details: '23 dokumen diekstraksi otomatis (rata-rata confidence 95%).' },
];

export const SEED_STUDIES: StudyItem[] = [
  { id: 'STUDY-01', title: 'P3B Indonesia–Singapura: Dividen, Bunga & Royalti (Pasal 10–12)', category: 'P3B / Tax Treaty', summary: 'P3B RI–Singapura membatasi pemotongan dividen 10% (kepemilikan ≥25%) atau 15%, bunga 10%, dan royalti 10%. Syarat: DGT/e-SKD aktif dan Certificate of Residence IRAS.', source: 'P3B RI–Singapura (efektif 2022) · PER-25/PJ/2018', tags: ['P3B', 'e-SKD', 'PPh 26'], applicableJurisdictions: ['🇮🇩 Indonesia', '🇸🇬 Singapore'], simulationType: 'treaty_relief' },
  { id: 'STUDY-02', title: 'OECD Pillar Two: Ambang €750 Juta & Top-up Tax 15%', category: 'BEPS 2.0 / Pillar Two', summary: 'Grup MNE dengan omzet konsolidasi ≥ €750 juta wajib menjamin ETR minimum 15% per yurisdiksi. Selisih di bawah 15% dipungut sebagai top-up tax (IIR/QDMTT).', source: 'OECD GloBE Model Rules · PMK 136/2024', tags: ['GloBE', 'Top-up', 'ETR'], applicableJurisdictions: ['🇮🇩 Indonesia', '🇸🇬 Singapore', '🇲🇾 Malaysia', '🇺🇸 United States'], simulationType: 'pillar_two_etr' },
  { id: 'STUDY-03', title: 'Sindikat Faktur TBTS: Pola Shell Company (Pasal 39A UU KUP)', category: 'Fraud Case Study', summary: 'Modus perusahaan cangkang tanpa karyawan riil menerbitkan faktur masukan fiktif. Sinyal: vendor non-PKP, PPN tidak sesuai tarif, tanpa bukti pengiriman, dan lonjakan nilai di luar pola.', source: 'Yurisprudensi Pengadilan Pajak · SE-26/PJ/2015', tags: ['TBTS', 'Shell company', 'Z-Score'], applicableJurisdictions: ['🇮🇩 Indonesia'], simulationType: 'none' },
  { id: 'STUDY-04', title: 'TP Jasa Manajemen Intra-Grup: TNMM vs Cost Plus (PMK 172/2023)', category: 'Transfer Pricing', summary: 'Penyusunan Local File & Master File untuk alokasi biaya manajemen regional. Rentang interkuartil markup jasa rutin 5%–8% dari pembanding independen.', source: 'PMK 172/2023 · OECD TPG Chapter VII', tags: ['TNMM', "Arm's length", 'IQR'], applicableJurisdictions: ['🇮🇩 Indonesia', '🇸🇬 Singapore', '🇲🇾 Malaysia'], simulationType: 'tp_markup' },
  { id: 'STUDY-05', title: 'Missing Trader Fraud pada GST Singapura', category: 'Fraud Case Study', summary: 'IRAS dapat menolak klaim input GST bila bisnis "mengetahui atau seharusnya mengetahui" rantai transaksinya terlibat MTF. Lakukan due diligence UEN & status GST pemasok sebelum klaim.', source: 'GST Act s.33A · IRAS e-Tax Guide MTF', tags: ['MTF', 'GST', 'Knowledge principle'], applicableJurisdictions: ['🇸🇬 Singapore'], simulationType: 'none' },
  { id: 'STUDY-06', title: 'Biaya Jamuan & Natura: Syarat Deductible (PMK 66/2023)', category: 'PPN / VAT', summary: 'Biaya entertainment hanya dapat dibiayakan dengan Daftar Nominatif. Natura/kenikmatan di atas batas PMK 66/2023 dikoreksi positif dan menjadi objek PPh 21 penerima.', source: 'PMK 66/2023 · SE-27/PJ.22/1986', tags: ['Entertainment', 'Natura', 'Nominatif'], applicableJurisdictions: ['🇮🇩 Indonesia'], simulationType: 'none' },
];
