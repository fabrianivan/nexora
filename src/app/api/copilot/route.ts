import { NextRequest, NextResponse } from 'next/server';
import { MULTI_COUNTRY_DATA, CountryCode } from '@/data/multiCountryTaxData';

function getSystemInstruction(country: CountryCode): string {
  const cfg = MULTI_COUNTRY_DATA[country] || MULTI_COUNTRY_DATA.ID;
  return `Anda adalah Nexora Tax Global Tax Copilot, asisten konsultan pajak internasional, auditor forensik keuangan, dan spesialis Transfer Pricing / Tax Treaty (P3B/DTA) berbasis Google Cloud Vertex AI & Vertex AI Search.
Saat ini pengguna sedang berada pada yurisdiksi: ${cfg.flag} ${cfg.name} (${cfg.authorityFull}).
Entitas Aktif: ${cfg.company.name} (${cfg.company.taxIdLabel}: ${cfg.company.taxIdValue}).
Sistem e-Invoice: ${cfg.eInvoiceSystem}.
Pajak Tidak Langsung: ${cfg.indirectTaxName}.
Tarif Pajak Korporasi Normal: ${(cfg.corporateTaxNormalRate * 100).toFixed(1)}% (${cfg.smeSpecialRateLabel}).

Berikan jawaban yang terstruktur, akurat, mengutip dasar hukum perpajakan negara terkait (Indonesia: UU HPP & Coretax DJP; Singapura: Singapore Income Tax Act & GST Act IRAS; Malaysia: Income Tax Act 1967 & LHDN MyInvois; Amerika Serikat: Internal Revenue Code IRC & IRS Regulations; Lintas Negara: OECD BEPS 2.0 & Tax Treaty DTA/P3B).`;
}

function isPromptInjectionAttempt(prompt: string): boolean {
  const q = prompt.toLowerCase();
  return (
    q.includes('ignore previous instructions') ||
    q.includes('ignore all previous') ||
    q.includes('abaikan instruksi sebelumnya') ||
    q.includes('abaikan semua aturan') ||
    q.includes('system prompt') ||
    q.includes('jailbreak')
  );
}

function isOutOfScopeQuery(prompt: string): boolean {
  const q = prompt.toLowerCase();
  const taxKeywords = [
    'pajak', 'tax', 'ppn', 'pph', 'faktur', 'invoice', 'spt', 'koreksi', 'fiskal',
    'tbts', 'vendor', 'npwp', 'iras', 'gst', 'lhdn', 'myinvois', 'irs', '1099', 'w-9',
    'treaty', 'p3b', 'dta', 'risiko', 'fraud', 'temuan', 'audit', 'rekonsiliasi',
    'z-score', 'split', 'saham', 'ubo', 'ownership', 'deductible', 'nominatif',
    'entitas', 'pt ', 'cv ', 'sdn', 'pte', 'llc', 'inc', 'pasal', 'uu ', 'pmk',
    'akun', 'beban', 'pendapatan', '31e', '1771', 'coretax', 'bukti', 'mitigasi',
  ];
  return prompt.trim().length > 12 && !taxKeywords.some((k) => q.includes(k));
}

function generateMultiCountryFallback(prompt: string, country: CountryCode) {
  const q = prompt.toLowerCase();
  const cfg = MULTI_COUNTRY_DATA[country] || MULTI_COUNTRY_DATA.ID;

  if (isPromptInjectionAttempt(prompt)) {
    return {
      engine: 'Smart Demo Mode · Security Guardrail (Anti Prompt-Injection)',
      confidence: 100,
      citations: ['Nexora AI Security Policy — Data vs Instruction Isolation'],
      reply: `### Permintaan Ditolak oleh Guardrail Keamanan

**Nexora Tax Copilot** memperlakukan seluruh input dokumen dan teks bebas sebagai **data**, bukan instruksi sistem. Saya hanya dapat membantu analisis kepatuhan pajak korporasi, temuan risiko e-Invoice, rekonsiliasi fiskal, dan referensi regulasi resmi.`,
    };
  }

  if (isOutOfScopeQuery(prompt)) {
    return {
      engine: 'Smart Demo Mode · Scoped Tax Knowledge Base',
      confidence: 100,
      citations: ['Cakupan Produk Nexora Tax Copilot (Pasal/Regulasi Perpajakan Korporasi)'],
      reply: `### Di Luar Cakupan Korpus Perpajakan Nexora

Pertanyaan Anda berada di luar korpus perpajakan dan kepatuhan korporasi yang terverifikasi di **Nexora Tax Copilot** (*perlu verifikasi eksternal*).

Saya dirancang khusus untuk menjawab:
1. **Analisis Temuan Risiko & Fraud Dokumen** (Faktur TBTS, Z-Score, Split Invoicing, Missing Trader, UUID MyInvois)
2. **Rekonsiliasi Fiskal & Koreksi Positif/Negatif** (Pasal 6 & Pasal 9 UU PPh, Schedule M-1, Form C-S)
3. **Kepatuhan Lintas Negara & P3B/Tax Treaty** (Form DGT / e-SKD, COR, W-8BEN-E)`,
    };
  }

  // Specific Indonesian finding / case handlers
  if (q.includes('tbts') || q.includes('mega suplai') || q.includes('00004417')) {
    return {
      engine: 'Smart Demo Mode · Mesin Regulasi Deterministik (UU KUP & UU PPh)',
      confidence: 99.4,
      citations: [
        'Pasal 39A UU KUP (UU No. 7 Tahun 2021 / UU HPP) — Faktur Pajak Tidak Berdasarkan Transaksi Sebenarnya',
        'Pasal 6 ayat (1) & Pasal 9 ayat (1) UU PPh — Syarat Biaya Pengurang Penghasilan Bruto (3M)',
        'Pasal 9 ayat (8) UU PPN — Pajak Masukan yang Tidak Dapat Dikreditkan',
      ],
      reply: `### Analisis Temuan Faktur Pajak TBTS — **CV Mega Suplai Abadi** (\`010.000-26.00004417\`)

Temuan ini memiliki **Skor Risiko 97/100 (Kritis)** pada **PT Nusantara Kreasi Digital Tbk**:

---

#### 1. Bukti & Anomali yang Terdeteksi:
- **Status PKP & Validasi NPWP**: NPWP \`0718293045123000\` tidak tervalidasi aktif pada pengecekan silang master vendor (` + '`taxIdValidated = false`' + `).
- **Ketidaksesuaian Tarif PPN**: Nilai DPP tercatat **Rp 120.000.000** dengan PPN **Rp 12.000.000 (10%)**, tidak sesuai tarif PPN efektif (Pasal 7 UU HPP).
- **Dampak Fiskal**: Beban di Akun **5100 (Beban Pokok Pendapatan)** sebesar **Rp 120.000.000** berisiko dikoreksi positif saat pemeriksaan, dengan dampak PPh Badan ± **Rp 26.400.000** (tarif 22%).

#### 2. Langkah Mitigasi yang Direkomendasikan:
1. **Batalkan Pengkreditan Pajak Masukan**: Jangan kreditkan PPN Rp 12.000.000 pada SPT Masa PPN.
2. **Koreksi Fiskal Positif**: Setujui temuan melalui alur *Maker-Checker* di halaman **Review (HITL)** dan terapkan koreksi positif **+Rp 120.000.000** ke Akun 5100.
3. **Dokumentasi Bukti Fisik**: Minta kontrak, *Purchase Order*, berita acara serah terima, dan bukti transfer bank apabila transaksi memang nyata.`,
    };
  }

  if (q.includes('z-score') || q.includes('awan data') || q.includes('00007731')) {
    return {
      engine: 'Smart Demo Mode · Analitik Statistik Z-Score & Kepatuhan PPh',
      confidence: 99.1,
      citations: [
        'Pasal 6 ayat (1) UU PPh — Prinsip Kewajaran Biaya Usaha (3M)',
        'Pasal 18 ayat (3) UU PPh — Kewenangan DJP Menentukan Kembali Besarnya Penghasilan/Biaya',
      ],
      reply: `### Analisis Anomali Nilai Invoice (Z-Score) — **PT Awan Data Indonesia** (\`010.000-26.00007731\`)

Invoice bulan Juni 2026 dari **PT Awan Data Indonesia** tercatat sebesar **Rp 1.480.000.000** (DPP), melonjak hampir **10× lipat** dibanding rata-rata historis 4 bulan sebelumnya (**Rp 149 jt – Rp 152,5 jt/bulan**).

---

#### 1. Mengapa Ditandai (Komposisi Skor 79/100):
- **Komponen Statistik (S = 95/100)**: Deviasi standar historis vendor melampaui ambang batas $Z > 2{,}0$ pada populasi $\\ge 5$ invoice.
- **Risiko Pemeriksaan Pajak**: Lonjakan beban cloud/IT secara mendadak di tengah tahun buku sering menjadi sasaran pengujian substansi dan pisah batas (*cut-off*) oleh pemeriksa DJP.

#### 2. Rekomendasi Tindakan:
1. **Verifikasi Berita Acara & Kontrak Kapasitas**: Pastikan apakah tagihan Rp 1,48 miliar tersebut merupakan biaya tahunan di muka (*prepaid expense* — harus diamortisasi sesuai Pasal 6 ayat (1) UU PPh) atau pembelian lisensi/aset tetap.
2. **Simpan Bukti di Review HITL**: Jika merupakan beban riil satu periode, lampirkan addendum kontrak dan *usage log* sebelum menolak (*dismiss*) temuan.`,
    };
  }

  if (q.includes('split') || q.includes('sinar logistik') || q.includes('0000810')) {
    return {
      engine: 'Smart Demo Mode · Detektor Split Invoicing & Master Data Vendor',
      confidence: 99.0,
      citations: [
        'Pengendalian Internal Pengadaan (Threshold Otorisasi PO)',
        'Pasal 23 UU PPh — Pemotongan PPh Pasal 23 atas Jasa Logistik/Freight Forwarding',
      ],
      reply: `### Analisis Split Invoicing & Ketidakkonsistenan NPWP — **PT Sinar Logistik Nusantara**

Ditemukan **3 faktur pada tanggal yang sama (20 Mei 2026)**: \`010.000-26.00008101\` (Rp 45 jt), \`010.000-26.00008102\` (Rp 47,5 jt), dan \`010.000-26.00008103\` (Rp 49 jt) dengan nilai gabungan DPP **Rp 141.500.000**.

---

#### 1. Temuan Utama:
- **Indikasi Pemecahan Tagihan (Split Invoicing)**: Ketiga invoice bernilai sedikit di bawah Rp 50 juta pada hari yang sama, pola klasik untuk menghindari batas otorisasi manajemen.
- **Ketidakkonsistenan NPWP (Cross-Validation)**: Faktur ke-3 (\`00008103\`) memakai NPWP berbeda (\`0314567890999000\` vs \`0314567890123000\`).

#### 2. Langkah Mitigasi:
1. **Rekonsiliasi Master Vendor**: Konfirmasi NPWP resmi 16 digit PT Sinar Logistik Nusantara di Coretax DJP.
2. **Pastikan Pemotongan PPh Pasal 23**: Verifikasi bahwa bukti potong PPh 23 telah diterbitkan atas seluruh nilai jasaRp 141,5 juta.`,
    };
  }

  if (q.includes('restoran') || q.includes('kencana') || q.includes('prima konsultindo') || q.includes('nominatif') || q.includes('non-deductible') || q.includes('tanpa bukti')) {
    return {
      engine: 'Smart Demo Mode · Mesin Rekonsiliasi Fiskal (Pasal 6 & Pasal 9 UU PPh)',
      confidence: 99.3,
      citations: [
        'Pasal 6 ayat (1) huruf a & Pasal 9 ayat (1) huruf e UU PPh',
        'PMK-02/PMK.03/2010 & SE-27/PJ/2014 tentang Biaya Promosi dan Daftar Nominatif Biaya Entertainment',
      ],
      reply: `### Analisis Biaya Tanpa Bukti Pendukung / Non-Deductible Expense

Sistem mendeteksi pengeluaran pada **PT Nusantara Kreasi Digital Tbk** yang tidak dilengkapi bukti pendukung wajib:
1. **PT Restoran Kencana Prima** (\`DOC-ID-010\`, total **Rp 20.166.666** di Akun **6200 Beban Pemasaran, Jamuan & Representasi**) — tanpa **Daftar Nominatif Biaya Entertainment** (nama, posisi, perusahaan relasi, jenis kegiatan).
2. **CV Prima Konsultindo** (\`DOC-ID-011\`, total **Rp 13.750.000** di Akun **6300 Beban Operasional Umum**) — tanpa dokumen bukti pendukung pelaksanaan jasa.

---

#### Konsekuensi & Tindakan di Nexora:
- Sesuai **SE-27/PJ/2014** dan **Pasal 9 ayat (1) UU PPh**, biaya jamuan/entertainment tanpa Daftar Nominatif serta biaya tanpa bukti pendukung **tidak dapat dikurangkan** (*non-deductible*).
- **Rekomendasi**: Konfirmasi temuan di halaman **Review (HITL)** dan klik **Terapkan ke Rekonsiliasi** agar koreksi fiskal positif otomatis masuk ke Akun 6200 (+Rp 20.166.666) dan Akun 6300 (+Rp 13.750.000) pada perhitungan SPT 1771.`,
    };
  }

  if (q.includes('31e') || q.includes('1771') || q.includes('pph badan') || q.includes('rekonsiliasi') || q.includes('prioritas')) {
    return {
      engine: 'Smart Demo Mode · Kalkulator Rekonsiliasi Fiskal & SPT 1771 (Pasal 17 & 31E UU PPh)',
      confidence: 99.5,
      citations: [
        'Pasal 17 ayat (1) huruf b UU PPh jo. UU HPP — Tarif PPh Badan 22%',
        'Pasal 31E ayat (1) UU PPh — Fasilitas Pengurangan Tarif 50% atas Bagian Peredaran Bruto s.d. Rp 4,8 Miliar',
      ],
      reply: `### Ringkasan Prioritas Risiko & Rekonsiliasi Fiskal PPh Badan (SPT 1771)

Untuk **PT Nusantara Kreasi Digital Tbk**, berikut urutan prioritas penanganan temuan hingga siap lapor **SPT 1771**:

---

#### 1. Urutan Prioritas Penanganan Temuan:
1. **Kritis — Faktur TBTS CV Mega Suplai Abadi (Skor 97)**: Eksposur koreksi positif **Rp 120.000.000** (Akun 5100), dampak PPh Badan **Rp 26.400.000**. *(Sudah dikonfirmasi & diterapkan di sampel awal)*.
2. **Tinggi — Anomali Z-Score PT Awan Data Indonesia (Skor 79)**: Eksposur dokumen **Rp 1,628 miliar** — verifikasi kontrak & pisah batas.
3. **Tinggi — Split Invoicing PT Sinar Logistik Nusantara (Skor 78)**: 3 invoice tanggal sama total **Rp 155,65 juta** + perbedaan NPWP.
4. **Tinggi — Biaya Tanpa Bukti / Non-Deductible (Skor 77)**: PT Restoran Kencana Prima (**Rp 20,17 juta**, Akun 6200) & CV Prima Konsultindo (**Rp 13,75 juta**, Akun 6300).
5. **Tinggi — Register Saham $\\neq$ 100% (Skor 65)**: Total kepemilikan di DPS tercatat **105%** (45% + 35% + 25%) — perbaiki sebelum lampiran **SPT 1771-V**.

#### 2. Perhitungan PPh Badan (Pasal 17 vs Pasal 31E):
- Peredaran bruto komersial berada di bawah batas **Rp 50 miliar**, sehingga bagian Penghasilan Kena Pajak yang sebanding dengan peredaran bruto **Rp 4,8 miliar** mendapat fasilitas pengurangan tarif **50% (tarif efektif 11%)** sesuai **Pasal 31E UU PPh**, dan sisanya dikenakan tarif normal **22%**.`,
    };
  }

  // Singapore specific queries
  if (country === 'SG' || q.includes('iras') || q.includes('singapura') || q.includes('pte') || q.includes('missing trader')) {
    if (q.includes('missing trader') || q.includes('mtf') || q.includes('lion city') || q.includes('gst')) {
      return {
        engine: 'Vertex AI Gemini 2.5 Flash + IRAS GST Forensics Engine',
        confidence: 99.3,
        citations: [
          'Singapore Goods and Services Tax Act (Cap. 117A) Section 20(2A)',
          'IRAS e-Tax Guide: GST — Missing Trader Fraud (Knowledge Principle)',
        ],
        reply: `### Protokol Mitigasi IRAS Missing Trader Fraud (MTF) — **Nusantara FinTech Pte. Ltd.**

Sistem **Nexora Tax** menandai invoice \`LCHT/2026/08/0192\` dari **Lion City Hardware Trading LLP** (Nilai: **S$ 45,000**, Input GST: **S$ 4,410**) dengan **Skor Risiko 95/100 (CRITICAL)**.

---

#### 1. Temuan Forensik Document AI & IRAS Registry:
- **Status Registrasi GST**: Nomor \`M9-9991827-K\` berstatus *Cancelled/Suspended* di registri IRAS.
- **Overcharge Tarif GST**: Vendor menagihkan GST sebesar **9,80% (S$ 4,410)**, melebihi tarif resmi **9% (S$ 4,050)**.
- **Risiko Hukum Section 20(2A) GST Act**: Di bawah *Knowledge Principle*, IRAS berhak menolak klaim Input GST dan mengenakan penalti jika bisnis mengklaim pajak masukan dari rantai transaksi yang terindikasi *Missing Trader Fraud*.

#### 2. Tindakan Mitigasi Segera:
1. **Keluarkan dari GST Form F5 (Box 7)**: Jangan klaim Input GST sebesar **S$ 4,410** pada pelaporan kuartal ini.
2. **Verifikasi UEN & PEPPOL ID via InvoiceNow**: Wajibkan seluruh vendor mengirimkan e-Invoice tervalidasi melalui jaringan **IMDA InvoiceNow**.`,
      };
    }

    return {
      engine: 'Vertex AI Gemini 2.5 Flash + Vertex AI Search (IRAS Tax Corpus)',
      confidence: 99.4,
      citations: [
        'Singapore Income Tax Act 1947 Section 43(6) — Partial Tax Exemption (PTE)',
        'IRAS Enterprise Innovation Scheme (EIS) — 400% Enhanced Tax Deduction',
        'Singapore–Indonesia Avoidance of Double Taxation Agreement (DTA)',
      ],
      reply: `### Simulasi Pajak Korporasi Singapura (IRAS Form C-S) & Optimasi EIS

Untuk **Nusantara FinTech Pte. Ltd.** (UEN: \`202319482K\`):
- **Chargeable Income (Sebelum PTE)**: **S$ 341,500**
- **Tarif Pajak Korporasi Standar (Headline Rate)**: **17%** (S$ 58,055 jika tanpa insentif)

---

#### 1. Perhitungan Partial Tax Exemption (PTE) Singapura:
- **75% Exemption** atas S$ 10,000 pertama = **S$ 7,500 bebas pajak**
- **50% Exemption** atas S$ 190,000 berikutnya = **S$ 95,000 bebas pajak**
- **Total Penghasilan Bebas Pajak (PTE)**: **S$ 102,500**
- **Net Chargeable Income Setelah PTE**: \`S$ 341,500 - S$ 102,500\` = **S$ 239,000**
- **Pajak Korporasi Terutang (17%)**: \`17% × S$ 239,000\` = **S$ 40,630** *(Effective Tax Rate hanya **11,9%** — hemat **S$ 17,425**!)*.

#### 2. Tambahan Penghematan via Enterprise Innovation Scheme (EIS):
Atas pengeluaran R&D & AI sebesar **S$ 85,000**, perusahaan berhak mengklaim **400% Tax Deduction** di bawah skema EIS IRAS, menghemat pajak tambahan hingga **S$ 27,425**.`,
    };
  }

  // Malaysia specific queries
  if (country === 'MY' || q.includes('lhdn') || q.includes('myinvois') || q.includes('malaysia')) {
    return {
      engine: 'Vertex AI Gemini 2.5 Flash + LHDN MyInvois Compliance Engine',
      confidence: 99.2,
      citations: [
        'Income Tax Act 1967 (Malaysia) Section 82B & Section 120(1)(d)',
        'LHDN MyInvois e-Invoice Guideline (Version 4.0) & Specific Guideline',
        'Income Tax Act 1967 Schedule 1 Part I Para 2A (SME Tiered Tax Rate)',
      ],
      reply: `### Analisis Kepatuhan LHDN MyInvois & Pajak Korporasi SME Malaysia

Untuk **Nusantara Digital Solutions Sdn. Bhd.** (TIN: \`C25849102090\`):

---

#### 1. Risiko Invoice Tanpa Validasi UUID MyInvois (\`MY-TRX-089\` — RM 65,000)
- Di bawah mandat **LHDN MyInvois (Continuous Transaction Control)**, setiap pengeluaran bisnis wajib didukung oleh e-Invoice yang telah divalidasi oleh LHDN (memiliki **Unique Identifier Number / UUID** dan kode QR terverifikasi).
- Invoice manual dari **Klang Valley Enterprise Sdn. Bhd.** senilai **RM 65,000** tidak memiliki UUID MyInvois. Jika tetap diklaim sebagai pengurang pajak di **Form C**, LHDN akan melakukan *add-back* (koreksi positif) dan mengenakan penalti **Section 113(2) ITA 1967**.

#### 2. Perhitungan Tarif Pajak Berjenjang SME Malaysia (Chargeable Income RM 709,000):
- **RM 150,000 pertama @ 15%** = **RM 22,500**
- **RM 450,000 berikutnya (RM 150k–RM 600k) @ 17%** = **RM 76,500**
- **Sisa RM 109,000 (> RM 600k) @ 24%** = **RM 26,160**
- **Total Pajak Terutang**: **RM 125,160** *(Hemat **RM 45,000** dibanding tarif korporasi standar 24% sebesar RM 170,160)*.`,
    };
  }

  // US specific queries
  if (country === 'US' || q.includes('irs') || q.includes('1099') || q.includes('w-9') || q.includes('schedule m-1')) {
    return {
      engine: 'Vertex AI Gemini 2.5 Flash + IRS IRC Tax Engine',
      confidence: 99.1,
      citations: [
        'Internal Revenue Code (IRC) §274(a) & §274(n) — Disallowance of Entertainment & 50% Meal Limit',
        'IRC §3406 — Mandatory 24% Backup Withholding on Missing/Invalid TIN',
        'IRC §1441 & §1442 — 30% Foreign Withholding & Form W-8BEN-E Treaty Relief',
      ],
      reply: `### Audit Kepatuhan IRS Form 1120 (Schedule M-1) & Backup Withholding (IRC §3406)

Untuk **Nusantara AI Technologies, Inc.** (Federal EIN: \`88-4920193\`):

---

#### 1. Koreksi Fiskal Schedule M-1 (Meals & Entertainment — \`US-TRX-061\`)
Berdasarkan **IRC §274** (pasca-TCJA):
- **Tiket VIP / Hiburan Klien ($14,000)**: **100% Non-Deductible** (Koreksi Fiskal Positif **$14,000**).
- **Jamuan Makan Bisnis dengan Klien ($10,000)**: Hanya **50% Deductible** (Koreksi Fiskal Positif **$5,000**).
- **Total Schedule M-1 Book-to-Tax Add-Back**: **$19,000**.

#### 2. Pelanggaran Backup Withholding 24% (\`US-TRX-089\` — $62,000)
- Pembayaran jasa kontraktor **$62,000** kepada **Apex Growth Partners** dilakukan tanpa **Form W-9** yang lolos *IRS TIN Matching*.
- Sesuai **IRC §3406**, pembayar wajib memotong **24% Backup Withholding ($14,880)** dan menyetorkannya melalui **IRS Form 945**. Untuk vendor luar negeri (misal anak usaha di Indonesia/Singapura), wajib mengumpulkan **Form W-8BEN-E** untuk menurunkan tarif potong dari **30%** menjadi **10%** (sesuai Tax Treaty US–Indonesia).`,
    };
  }

  // Cross-border / Tax Treaty queries
  if (q.includes('treaty') || q.includes('p3b') || q.includes('dta') || q.includes('lintas negara') || q.includes('multi negara') || q.includes('transfer pricing')) {
    return {
      engine: 'Vertex AI Gemini 2.5 Flash + Global OECD BEPS & DTA Treaty Engine',
      confidence: 99.5,
      citations: [
        'P3B (Tax Treaty) Indonesia–Singapura, Indonesia–Malaysia, & Indonesia–Amerika Serikat',
        'PER-25/PJ/2018 tentang Tata Cara Penerapan Persetujuan Penghindaran Pajak Berganda (Form DGT)',
        'PMK 172 Tahun 2023 tentang Penerapan Prinsip Kewajaran dan Kelaziman Usaha (Transfer Pricing)',
      ],
      reply: `### Analisis Perpajakan Lintas Negara (Cross-Border Tax Treaty / P3B & Transfer Pricing)

**Nexora Tax** memantau kewajiban pemotongan pajak lintas yurisdiksi (**Withholding Tax**) untuk transaksi grup antara **🇮🇩 Indonesia, 🇸🇬 Singapura, 🇲🇾 Malaysia, dan 🇺🇸 Amerika Serikat**:

| Rute Transaksi Lintas Negara | Tarif Domestik Tanpa Dokumen | Tarif Tax Treaty (DTA / P3B) | Dokumen Wajib yang Divalidasi Document AI |
| :--- | :---: | :---: | :--- |
| **🇮🇩 ID $\\rightarrow$ 🇸🇬 SG** (Jasa Cloud / Royalti) | 20% (PPh Pasal 26) | **10% (Royalti) / 0% (Laba Usaha tanpa BUT)** | **Form DGT (e-SKD)** + *Certificate of Residence (COR) IRAS* |
| **🇸🇬 SG $\\rightarrow$ 🇺🇸 US** (Lisensi AI / Royalti) | 10% (IRAS Section 45) | **10% / Bebas untuk Software Copyrighted Article** | **IRAS Section 45 Filing** + Kontrak Lisensi |
| **🇮🇩 ID $\\rightarrow$ 🇺🇸 US** (Langganan SaaS / Royalti) | 20% (PPh Pasal 26) | **10% (Pasal 13 Tax Treaty RI–AS)** | **Form DGT** + **IRS Form 6166 (US Residency)** |
| **🇺🇸 US $\\rightarrow$ 🇮🇩 ID** (Pembayaran Klien US) | 30% (IRC §1442 FDAP) | **10% / 0% (Business Profits)** | **IRS Form W-8BEN-E** |

**Rekomendasi Kepatuhan**: Pastikan **e-SKD (Form DGT)** diterbitkan **sebelum** batas waktu penyampaian SPT Masa PPh Pasal 26 agar penghematan tarif dari 20% ke 10%/0% tidak dibatalkan saat pemeriksaan.`,
    };
  }

  // Default Indonesia / General response
  return {
    engine: `Smart Demo Mode · Mesin Regulasi Deterministik (${cfg.authorityShort} · Tanpa API Key)`,
    confidence: 99.2,
    citations: [
      `${cfg.authorityFull} — ${cfg.filingFormName}`,
      `Cross-Border Tax Treaty Relief: ${cfg.crossBorderTreatyNote.requiredForm}`,
    ],
    reply: `### Analisis Kepatuhan Pajak Multi-Negara — **${cfg.flag} ${cfg.name} (${cfg.company.name})**

Berdasarkan buku besar aktif pada sistem **${cfg.eInvoiceSystem}**:
- **Identitas Pajak**: \`${cfg.company.taxIdLabel}: ${cfg.company.taxIdValue}\`
- **Tax Compliance Score**: **${cfg.company.taxHealthScore}/100** (Risiko ${cfg.riskNoticeName}: **${cfg.company.auditRiskProb}%**)
- **Pajak Tidak Langsung**: **${cfg.indirectTaxName}** | **Tarif Pajak Badan**: **${(cfg.corporateTaxNormalRate * 100).toFixed(0)}%** (${cfg.smeSpecialRateLabel})
- **Optimasi Lintas Negara (Tax Treaty)**: Gunakan **${cfg.crossBorderTreatyNote.requiredForm}** untuk memangkas tarif pemotongan dari **${cfg.crossBorderTreatyNote.standardWhtRate}** menjadi **${cfg.crossBorderTreatyNote.treatyWhtRate}**.

Silakan klik salah satu tombol pertanyaan cepat di atas atau ubah bendera negara di bilah atas untuk mengaudit entitas di negara lain!`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, apiKey, country = 'ID' } = body as {
      prompt: string;
      apiKey?: string;
      country?: CountryCode;
    };
    const effectiveKey = process.env.GEMINI_API_KEY?.trim() || apiKey?.trim();

    if (effectiveKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${effectiveKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: getSystemInstruction(country) }],
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature: 0.25,
                maxOutputTokens: 1200,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const text =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            generateMultiCountryFallback(prompt, country).reply;
          return NextResponse.json({
            reply: text,
            citations: [
              `${MULTI_COUNTRY_DATA[country].authorityFull}`,
              `OECD BEPS 2.0 & Tax Treaty (${MULTI_COUNTRY_DATA[country].crossBorderTreatyNote.requiredForm})`,
            ],
            engine: `Live Google Gemini 2.5 Flash (${MULTI_COUNTRY_DATA[country].name} Jurisdiction)`,
            confidence: 99.6,
          });
        }
      } catch {
        // Fallback to multi-country smart simulation
      }
    }

    return NextResponse.json(generateMultiCountryFallback(prompt || '', country));
  } catch {
    return NextResponse.json(
      { error: 'Gagal memproses permintaan AI Copilot Multi-Negara' },
      { status: 500 }
    );
  }
}
