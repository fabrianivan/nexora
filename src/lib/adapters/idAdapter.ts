import { CountryAdapter, TaxIdValidationResult } from './types';
import idRules from '@/config/taxRules.id.json';

export const idAdapter: CountryAdapter = {
  code: 'ID',
  name: 'Indonesia',
  authority: idRules.taxAuthority,
  currency: idRules.currency,
  currencySymbol: idRules.currencySymbol,
  taxIdLabel: 'NPWP (Nomor Pokok Wajib Pajak)',
  taxIdFormat: /^\d{15,16}$/,
  status: 'full',

  validateTaxId(taxId: string): TaxIdValidationResult {
    const cleaned = taxId.replace(/[ .\-]/g, '');
    if (!cleaned) {
      return { valid: false, formatted: taxId, reason: 'NPWP tidak boleh kosong' };
    }
    if (cleaned.length !== 15 && cleaned.length !== 16) {
      return { 
        valid: false, 
        formatted: taxId, 
        reason: `Panjang digit NPWP harus 15 (lama) atau 16 digit (NIK/NPWP baru PMK 112/2022). Terbaca ${cleaned.length} digit.` 
      };
    }
    if (!/^\d+$/.test(cleaned)) {
      return { valid: false, formatted: taxId, reason: 'NPWP hanya boleh berisi angka' };
    }
    // Format 15 digit standard: 00.000.000.0-000.000
    const formatted = cleaned.length === 15
      ? `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}.${cleaned.slice(8, 9)}-${cleaned.slice(9, 12)}.${cleaned.slice(12, 15)}`
      : cleaned;

    return { valid: true, formatted };
  },

  documentTypes: [
    { type: 'deed', label: 'Akta Pendirian & Perubahan', required: true, acceptedMimeTypes: ['application/pdf'] },
    { type: 'shareholder', label: 'Daftar Pemegang Saham & UBO', required: true, acceptedMimeTypes: ['application/pdf'] },
    { type: 'financial_statement', label: 'Laporan Keuangan Audited', required: true, acceptedMimeTypes: ['application/pdf'] },
    { type: 'previous_tax_return', label: 'SPT Tahunan 1771 Tahun Sebelumnya', required: true, acceptedMimeTypes: ['application/pdf'] },
    { type: 'e_invoice', label: 'Faktur Pajak Elektronik (e-Faktur PPN)', required: false, acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
  ],

  riskRules: [
    {
      id: 'ID_FRAUD_TBTS_01',
      name: 'Indikasi Faktur Pajak TBTS (Transaksi Tidak Sebenarnya)',
      category: 'fraud',
      severity: 'critical',
      description: 'Vendor teridentifikasi dalam daftar pengawasan DJP atau tidak memiliki kapasitas riil usaha.',
      regulationBasis: 'UU KUP Pasal 39A huruf a & SE-26/PJ/2015',
    },
    {
      id: 'ID_FRAUD_INV_SEQ_02',
      name: 'Nomor Seri Faktur Pajak (NSFP) Duplikat / Tidak Valid',
      category: 'fraud',
      severity: 'high',
      description: 'Nomor seri faktur terdaftar ganda pada vendor berbeda atau di luar jatah NSFP resmi DJP.',
      regulationBasis: 'PER-03/PJ/2022 tentang Pedoman Teknis Faktur Pajak',
    },
    {
      id: 'ID_COMP_NON_DEDUCT_03',
      name: 'Biaya Non-Deductible Dibebankan Komersial',
      category: 'compliance',
      severity: 'medium',
      description: 'Beban natura, sumbangan non-inpres, atau pengeluaran untuk kepentingan pribadi pemegang saham wajib dikoreksi fiskal positif.',
      regulationBasis: 'UU PPh Pasal 9 ayat (1) & PMK-66/2023',
    },
    {
      id: 'ID_TP_INTERCOMPANY_04',
      name: 'Transaksi Afiliasi Melebihi Prinsip Kewajaran (Arm’s Length)',
      category: 'transfer_pricing',
      severity: 'high',
      description: 'Imbalan jasa manajemen atau royalti antar entitas terafiliasi melebihi rentang wajar (interquartile range).',
      regulationBasis: 'PMK-172/2023 tentang Penerapan Prinsip Kewajaran dan Kelaziman Usaha',
    },
    {
      id: 'ID_BEPS_CIRCULAR_05',
      name: 'Struktur Kepemilikan Melingkar / Conduit di Yurisdiksi Berisiko',
      category: 'beps',
      severity: 'critical',
      description: 'Induk entitas dimiliki secara melingkar oleh entitas anak atau melalui perantara tanpa substansi ekonomi.',
      regulationBasis: 'OECD BEPS Action 6 & PMK-258/PMK.03/2008',
    },
  ],

  fiscalAdjustmentRules: [
    {
      id: 'ADJ_POS_NATURA',
      description: 'Koreksi Fiskal Positif: Beban natura & kenikmatan non-operasional',
      type: 'positive',
      regulationBasis: 'UU PPh Pasal 9 ayat (1) huruf e jo. PMK-66/2023',
      verified: true,
    },
    {
      id: 'ADJ_POS_DONATION',
      description: 'Koreksi Fiskal Positif: Sumbangan di luar ketentuan PP 93/2010',
      type: 'positive',
      regulationBasis: 'UU PPh Pasal 9 ayat (1) huruf g',
      verified: true,
    },
    {
      id: 'ADJ_POS_PENALTY',
      description: 'Koreksi Fiskal Positif: Sanksi administrasi / bunga pajak',
      type: 'positive',
      regulationBasis: 'UU PPh Pasal 9 ayat (1) huruf k',
      verified: true,
    },
    {
      id: 'ADJ_NEG_TAX_EXEMPT_DIV',
      description: 'Koreksi Fiskal Negatif: Penghasilan dividen dalam negeri bukan objek PPh Badan',
      type: 'negative',
      regulationBasis: 'UU No. 7/2021 (UU HPP) Pasal 4 ayat (3) huruf f',
      verified: true,
    },
    {
      id: 'ADJ_NEG_DEPRECIATION_DIFF',
      description: 'Koreksi Fiskal Negatif: Selisih penyusutan fiskal lebih besar dari komersial',
      type: 'negative',
      regulationBasis: 'UU PPh Pasal 11 jo. PMK-72/2023',
      verified: true,
    },
  ],

  deadlineRules: [
    {
      key: 'ID_PPN_MONTHLY',
      label: 'SPT Masa PPN 1111',
      obligationType: 'PPN Masa',
      deadlineRule: 'Akhir bulan berikutnya (contoh: Masa Okt jatuh tempo 30 Nov)',
      regulation: 'UU KUP Pasal 3 ayat (3) huruf a',
      defaultDueDay: 30,
    },
    {
      key: 'ID_CIT_ANNUAL',
      label: 'SPT Tahunan PPh Badan 1771',
      obligationType: 'PPh Badan Tahunan',
      deadlineRule: 'Akhir bulan ke-4 setelah tahun buku berakhir (30 April)',
      regulation: 'UU KUP Pasal 3 ayat (3) huruf c',
      defaultDueDay: 30,
    },
    {
      key: 'ID_WHT_MONTHLY',
      label: 'Penyetoran PPh 21 / 23 / 4(2) Unifikasi',
      obligationType: 'PPh Unifikasi',
      deadlineRule: 'Tanggal 10 (setor) dan tanggal 20 (lapor) bulan berikutnya',
      regulation: 'PMK-242/PMK.03/2014 & PER-24/PJ/2021',
      defaultDueDay: 15,
    },
  ],

  paymentCodeGenerators: [
    {
      taxType: 'PPh Badan Tahunan (411126-200)',
      generateCode(entityTaxId, period) {
        const cleanTaxId = entityTaxId.replace(/\D/g, '').slice(0, 9) || '123456789';
        const year = period.slice(0, 4) || '2024';
        return `01${cleanTaxId}${year}99`; // Simulated 15-digit DJP e-Billing Code
      },
      formatInstructions: 'Gunakan kode billing 15 digit ini pada Teller Bank Persepsi, ATM, atau Corporate Internet Banking.',
    },
    {
      taxType: 'PPN Masa Dalam Negeri (411211-100)',
      generateCode(entityTaxId, period) {
        const cleanTaxId = entityTaxId.replace(/\D/g, '').slice(0, 9) || '123456789';
        const mass = period.replace('-', '').slice(4, 6) || '12';
        return `02${cleanTaxId}${mass}88`;
      },
      formatInstructions: 'Bayarkan sebelum batas akhir pelaporan SPT Masa PPN.',
    },
  ],

  standardCITRate: 0.22,
  standardVATRate: 0.11,
};
