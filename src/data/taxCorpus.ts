import type { SourceDocument } from '@/lib/domain';

/**
 * Rule library used to ground Copilot answers and case briefs.
 *
 * Every chunk is a short internal summary written for this workspace, not the
 * official text. `verified: false` is deliberate: answers that cite these chunks
 * say so, and a tax professional must check the current regulation before acting.
 */
const AT = '2026-11-17T00:00:00.000Z';

const src = (
  id: string,
  title: string,
  publisher: string,
  sourceType: SourceDocument['sourceType'],
  chunks: { id: string; article: string; text: string }[],
): SourceDocument => ({
  id,
  title,
  publisher,
  sourceType,
  accessedAt: AT,
  sourceVersion: 'ringkasan-2026-11',
  verified: false,
  status: 'Active',
  createdAt: AT,
  updatedAt: AT,
  version: 1,
  chunks,
});

export const TAX_CORPUS: SourceDocument[] = [
  src('LIB-ID-KUP', 'UU KUP — faktur pajak tidak berdasarkan transaksi sebenarnya', 'Ringkasan internal Nexora (Indonesia)', 'law', [
    {
      id: 'LIB-ID-KUP-39A',
      article: 'Pasal 39A UU KUP',
      text: 'Menerbitkan atau menggunakan faktur pajak yang tidak berdasarkan transaksi yang sebenarnya (TBTS) diancam sanksi pidana dan denda. Pembeli yang memakai faktur TBTS berisiko kehilangan hak kredit Pajak Masukan dan menghadapi pemeriksaan. Temuan sistem adalah indikator, bukan bukti: perlu konfirmasi status PKP vendor, NSFP, dan bukti fisik transaksi (kontrak, PO, surat jalan, bukti bayar).',
    },
  ]),
  src('LIB-ID-PPN', 'UU PPN — pengkreditan Pajak Masukan dan tarif', 'Ringkasan internal Nexora (Indonesia)', 'law', [
    {
      id: 'LIB-ID-PPN-9-8',
      article: 'Pasal 9 ayat (8) UU PPN',
      text: 'Pajak Masukan tidak dapat dikreditkan antara lain bila faktur pajaknya tidak memenuhi ketentuan atau tidak berasal dari PKP yang sah. Sebelum mengkreditkan, cocokkan NPWP dan status PKP lawan transaksi dengan data resmi (Coretax/e-Faktur).',
    },
    {
      id: 'LIB-ID-PPN-TARIF',
      article: 'UU HPP · PMK 131/2024',
      text: 'Tarif PPN 12% berlaku sejak 1 Januari 2025. Untuk barang/jasa bukan mewah, PPN dihitung 12% × DPP nilai lain 11/12 dari harga, sehingga beban efektif 11%. Selisih PPN terhadap 11% × DPP perlu dijelaskan: tarif khusus, fasilitas, pembulatan, atau kesalahan faktur.',
    },
  ]),
  src('LIB-ID-PPH', 'UU PPh — biaya yang boleh dan tidak boleh dikurangkan', 'Ringkasan internal Nexora (Indonesia)', 'law', [
    {
      id: 'LIB-ID-PPH-6-1',
      article: 'Pasal 6 ayat (1) UU PPh',
      text: 'Biaya untuk mendapatkan, menagih, dan memelihara penghasilan dapat dikurangkan dari penghasilan bruto, sepanjang didukung bukti yang memadai. Biaya tanpa bukti transaksi yang sah lazimnya dikoreksi fiskal positif.',
    },
    {
      id: 'LIB-ID-PPH-9-1',
      article: 'Pasal 9 ayat (1) UU PPh',
      text: 'Pengeluaran tertentu tidak dapat dikurangkan, antara lain sanksi administrasi dan pidana pajak, serta biaya yang tidak berkaitan dengan kegiatan usaha. Biaya jamuan/representasi hanya dapat dibiayakan bila dilengkapi daftar nominatif.',
    },
    {
      id: 'LIB-ID-PPH-NATURA',
      article: 'UU HPP · PMK 66/2023 (natura)',
      text: 'Sejak UU HPP, natura dan/atau kenikmatan pada prinsipnya dapat dibiayakan pemberi kerja sepanjang memenuhi Pasal 6 ayat (1); perlakuan per jenis diatur PMK 66/2023. Koreksi fiskal atas natura perlu diuji per jenis, bukan otomatis.',
    },
    {
      id: 'LIB-ID-PPH-31E',
      article: 'Pasal 31E UU PPh',
      text: 'Wajib Pajak badan dalam negeri dengan peredaran bruto sampai Rp50 miliar mendapat pengurangan tarif 50% dari tarif normal atas Penghasilan Kena Pajak dari bagian peredaran bruto sampai Rp4,8 miliar.',
    },
  ]),
  src('LIB-ID-PROSEDUR', 'Pembetulan SPT, PPh final UMKM, dan pemotongan', 'Ringkasan internal Nexora (Indonesia)', 'regulation', [
    {
      id: 'LIB-ID-KUP-8',
      article: 'Pasal 8 UU KUP (pembetulan)',
      text: 'Wajib Pajak dapat membetulkan SPT atas kemauan sendiri selama belum dilakukan pemeriksaan. Bila pembetulan menyebabkan kurang bayar, kekurangan pajak disetor beserta sanksi bunga per bulan sesuai tarif yang ditetapkan Menteri Keuangan. Membetulkan sebelum SP2DK atau pemeriksaan umumnya lebih ringan risikonya.',
    },
    {
      id: 'LIB-ID-PP55',
      article: 'PP 55/2022 (PPh final UMKM)',
      text: 'Wajib Pajak dengan peredaran bruto sampai Rp4,8 miliar setahun dapat memakai PPh final 0,5% dari peredaran bruto, dengan batas waktu (untuk PT: 3 tahun pajak). Bandingkan 0,5% × peredaran bruto dengan PPh badan setelah fasilitas Pasal 31E sebelum memilih.',
    },
    {
      id: 'LIB-ID-PPH21-TER',
      article: 'PMK 168/2023 (PPh 21 TER)',
      text: 'Pemotongan PPh 21 bulanan pegawai tetap memakai tarif efektif rata-rata (TER) untuk masa Januari s.d. November; masa Desember dihitung ulang dengan tarif Pasal 17. Penerima bukan pegawai dipotong dengan dasar dan tarif tersendiri.',
    },
    {
      id: 'LIB-ID-PPH23-42',
      article: 'Pasal 23 & Pasal 4 ayat (2) UU PPh',
      text: 'Imbalan jasa tertentu dipotong PPh 23 sebesar 2% dari jumlah bruto. Sewa tanah dan/atau bangunan dikenai PPh final Pasal 4 ayat (2) sebesar 10%, bukan PPh 23. Salah klasifikasi menimbulkan kurang potong dan sanksi.',
    },
    {
      id: 'LIB-ID-TP',
      article: 'PMK 172/2023 (transfer pricing)',
      text: 'Transaksi dengan pihak afiliasi harus memenuhi prinsip kewajaran dan kelaziman usaha. Dokumen induk dan dokumen lokal wajib disiapkan antara lain bila peredaran bruto tahun sebelumnya melebihi Rp50 miliar, atau transaksi afiliasi barang berwujud melebihi Rp20 miliar atau selain barang berwujud melebihi Rp5 miliar.',
    },
    {
      id: 'LIB-ID-DIVIDEN',
      article: 'Pasal 4 ayat (3), Pasal 17 & Pasal 26 UU PPh (dividen)',
      text: 'Setelah UU HPP, dividen dari dalam negeri yang diterima Wajib Pajak badan dalam negeri dikecualikan dari objek PPh; untuk orang pribadi dalam negeri dikecualikan bila diinvestasikan kembali sesuai ketentuan, selain itu dikenai PPh final 10%. Dividen kepada pemegang saham luar negeri dipotong PPh 26 sebesar 20%, atau tarif P3B bila Formulir DGT valid.',
    },
    {
      id: 'LIB-ID-DGT',
      article: 'PER-25/PJ/2018 (Formulir DGT)',
      text: 'Penerima penghasilan luar negeri yang ingin memakai tarif P3B harus menyerahkan Formulir DGT yang lengkap dan disahkan otoritas negara residennya sebelum batas waktu pelaporan. Tanpa Formulir DGT yang valid, PPh 26 dipotong 20%.',
    },
  ]),
  src('LIB-OTHER', 'Singapura, Malaysia, dan Amerika Serikat', 'Ringkasan internal Nexora (lintas negara)', 'guidance', [
    {
      id: 'LIB-SG-PTE',
      article: 'Singapore ITA s.43(6) (Partial Tax Exemption)',
      text: 'Partial Tax Exemption membebaskan 75% dari S$10.000 pertama dan 50% dari S$190.000 berikutnya penghasilan kena pajak normal; sisanya dikenai tarif 17%.',
    },
    {
      id: 'LIB-SG-S45',
      article: 'Singapore ITA s.45 (withholding tax)',
      text: 'Pembayar di Singapura wajib memotong withholding tax atas pembayaran tertentu ke non-residen, termasuk royalti (umumnya 10%, dapat lebih rendah berdasarkan tax treaty), dan menyetorkannya paling lambat tanggal 15 bulan kedua setelah pembayaran.',
    },
    {
      id: 'LIB-MY-SME',
      article: 'Malaysia ITA 1967 Sch.1 (tarif SME)',
      text: 'Perusahaan yang memenuhi syarat SME dikenai 15% atas RM150.000 pertama pendapatan bercukai, 17% atas RM450.000 berikutnya, dan 24% atas sisanya.',
    },
    {
      id: 'LIB-OECD-PPT',
      article: 'OECD MLI art. 7 (Principal Purpose Test)',
      text: 'Banyak P3B yang sudah dimodifikasi MLI memuat Principal Purpose Test: manfaat treaty dapat ditolak bila memperoleh manfaat itu menjadi salah satu tujuan utama suatu transaksi atau struktur. Siapkan bukti substansi usaha penerima (kantor, karyawan, pengambilan keputusan).',
    },
    {
      id: 'LIB-OECD-P2',
      article: 'OECD Pillar Two (GloBE)',
      text: 'Aturan GloBE menetapkan pajak minimum efektif 15% per yurisdiksi bagi grup multinasional dengan pendapatan konsolidasi sekurang-kurangnya EUR 750 juta. Penerapan bergantung pada aturan domestik tiap negara dan safe harbour yang berlaku.',
    },
    {
      id: 'LIB-US-274',
      article: 'IRC §274 (meals & entertainment)',
      text: 'Biaya hiburan (entertainment) umumnya tidak dapat dikurangkan sejak 2018. Biaya makan bisnis umumnya dibatasi 50% bila memenuhi syarat substansiasi. Selisihnya menjadi penyesuaian book-tax pada Schedule M-1/M-3 Form 1120.',
    },
    {
      id: 'LIB-US-3406',
      article: 'IRC §3406 · §1441 (withholding)',
      text: 'Pembayar wajib melakukan backup withholding 24% bila vendor AS tidak memberikan TIN yang benar (Form W-9). Pembayaran sumber AS tertentu ke pihak asing dipotong 30% kecuali tarif treaty diklaim dengan Form W-8BEN-E yang valid; dilaporkan pada Form 1042-S.',
    },
  ]),
  src('LIB-ID-NPWP', 'Identitas pajak vendor dan pemilik manfaat', 'Ringkasan internal Nexora (Indonesia)', 'regulation', [
    {
      id: 'LIB-ID-NPWP-16',
      article: 'PMK 112/2022 (NPWP 16 digit)',
      text: 'Sejak 2024 NPWP memakai format 16 digit. Satu NPWP yang muncul dengan beberapa nama, atau satu nama dengan beberapa NPWP, perlu dicek ke master vendor dan data resmi sebelum Pajak Masukan dikreditkan.',
    },
    {
      id: 'LIB-ID-BO',
      article: 'UU PT 40/2007 · Perpres 13/2018',
      text: 'Daftar pemegang saham harus sesuai akta dan data AHU. Perpres 13/2018 mewajibkan korporasi mengenali dan melaporkan pemilik manfaat (beneficial owner). Total kepemilikan yang tidak 100% menandakan register belum direkonsiliasi.',
    },
  ]),
  src('LIB-SG-GST', 'IRAS — GST input tax dan missing trader fraud', 'Ringkasan internal Nexora (Singapura)', 'guidance', [
    {
      id: 'LIB-SG-MTF',
      article: 'IRAS GST guidance (knowledge condition)',
      text: 'IRAS dapat menolak klaim GST input tax bila bisnis mengetahui atau seharusnya mengetahui bahwa transaksinya terkait missing trader fraud. Lakukan due diligence pemasok: cek registrasi GST di situs IRAS, kewajaran harga, dan riwayat transaksi, lalu dokumentasikan hasilnya.',
    },
  ]),
  src('LIB-MY-EINV', 'LHDN — e-Invoice (MyInvois)', 'Ringkasan internal Nexora (Malaysia)', 'guidance', [
    {
      id: 'LIB-MY-UUID',
      article: 'LHDN e-Invoice Guideline',
      text: 'E-invoice yang tervalidasi MyInvois memiliki nomor identitas unik (UUID). Biaya yang didukung dokumen tanpa e-invoice tervalidasi berisiko ditolak sebagai pengurang. Minta pemasok menerbitkan e-invoice tervalidasi atau terbitkan self-billed e-invoice bila berlaku.',
    },
  ]),
  src('LIB-INT', 'Kebijakan internal Nexora', 'Kebijakan internal grup', 'internal_demo', [
    {
      id: 'LIB-INT-SPLIT',
      article: 'Kebijakan otorisasi pembelian',
      text: 'Tiga invoice atau lebih dari vendor yang sama pada tanggal yang sama diperlakukan sebagai indikasi pemecahan transaksi untuk menghindari batas otorisasi. Gabungkan nilainya, cocokkan dengan PO/kontrak, dan periksa siapa yang menyetujui.',
    },
    {
      id: 'LIB-INT-ZSCORE',
      article: 'Analitik histori vendor',
      text: 'Nilai invoice dengan |Z-score| ≥ 2 terhadap histori entitas adalah sinyal statistik, bukan bukti. Bandingkan dengan kontrak, PO, dan pisah batas sebelum menyimpulkan. Dengan kurang dari 5 invoice, Z-score tidak dihitung.',
    },
    {
      id: 'LIB-INT-MAKERCHECKER',
      article: 'Kebijakan maker-checker',
      text: 'Setiap keputusan temuan diusulkan maker dengan alasan dan disetujui checker induk yang berbeda. AI dapat menyusun bukti dan draf catatan, tetapi tidak memutuskan.',
    },
  ]),
];

/** Rule → library chunks that ground it. */
export const RULE_SOURCES: Record<string, string[]> = {
  TBTS: ['LIB-ID-KUP-39A', 'LIB-ID-PPN-9-8', 'LIB-ID-PPN-TARIF'],
  MISSING_TRADER: ['LIB-SG-MTF'],
  SPLIT_INVOICING: ['LIB-INT-SPLIT'],
  Z_SCORE: ['LIB-INT-ZSCORE'],
  MYINVOIS_UUID: ['LIB-MY-UUID'],
  NON_DEDUCTIBLE: ['LIB-ID-PPH-6-1', 'LIB-ID-PPH-9-1'],
  XV_TAXID: ['LIB-ID-NPWP-16', 'LIB-ID-PPN-9-8'],
  XV_NAME: ['LIB-ID-NPWP-16'],
  XV_OWNERSHIP: ['LIB-ID-BO'],
};

export function corpusChunk(id: string) {
  for (const source of TAX_CORPUS) {
    const chunk = source.chunks.find((c) => c.id === id);
    if (chunk) return { source, chunk };
  }
  return undefined;
}
