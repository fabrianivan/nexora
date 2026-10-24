import { CopilotCitation, CountryCode } from './domain';

export interface RegulatoryPassage {
  id: string;
  jurisdiction: CountryCode | 'OECD';
  regulation: string;
  article: string;
  keywords: string[];
  summaryId: string;
  summaryEn: string;
  needsVerification: boolean;
}

export const REGULATORY_KNOWLEDGE_BASE: RegulatoryPassage[] = [
  {
    id: 'ID-UU-PPN-TBTS',
    jurisdiction: 'ID',
    regulation: 'UU PPN No. 8/1983 s.t.d.t.d. UU No. 7/2021 (UU HPP) & SE-17/PJ/2018',
    article: 'Pasal 9 ayat (2), Pasal 9 ayat (8), Pasal 13 ayat (5) UU PPN & SE-17/PJ/2018',
    keywords: [
      'tbts',
      'faktur',
      'fiktif',
      'ppn',
      'masukan',
      'nsfp',
      'sp2dk',
      'kredit',
      '11%',
      'mega suplai',
      'tidak berdasarkan transaksi sebenarnya',
    ],
    summaryId:
      'Pajak Masukan hanya dapat dikreditkan apabila Faktur Pajak memenuhi syarat formal (identitas NPWP 16 digit/NITKU, kode dan nomor seri NSFP resmi e-Nofa/Coretax) serta syarat material (berdasarkan transaksi penyerahan barang/jasa yang sebenarnya). Faktur yang terindikasi TBTS tidak dapat dikreditkan dan perlu klarifikasi bukti arus uang, arus barang (BAST/Surat Jalan), atau pembetulan SPT Masa PPN.',
    summaryEn:
      'Input VAT is creditable only if the tax invoice satisfies both formal requirements (valid 16-digit NPWP/NITKU, allocated NSFP serial number) and material requirements (actual underlying delivery of goods/services). Suspected TBTS invoices must not be credited without proof of goods/payment flow.',
    needsVerification: true,
  },
  {
    id: 'ID-ENTERTAINMENT-NATURA',
    jurisdiction: 'ID',
    regulation: 'UU PPh s.t.d.t.d. UU HPP, SE-27/PJ.22/1986 & PMK No. 66 Tahun 2023',
    article: 'Pasal 6 ayat (1) huruf a, Pasal 9 ayat (1) UU PPh, SE-27/PJ.22/1986, PMK 66/2023',
    keywords: [
      'entertainment',
      'jamuan',
      'nominatif',
      'daftar nominatif',
      'natura',
      'kenikmatan',
      'koreksi fiskal',
      'koreksi positif',
      'deductible',
      'non-deductible',
      'pmk 66',
      'se-27',
      'grand dining',
    ],
    summaryId:
      'Biaya entertainment/jamuan relasi usaha hanya dapat dikurangkan dari penghasilan bruto (deductible) apabila berhubungan langsung dengan kegiatan 3M (Mendapatkan, Menagih, dan Memelihara penghasilan) dan wajib dilampiri Daftar Nominatif sesuai SE-27/PJ.22/1986. Tanpa daftar nominatif, biaya jamuan harus dikoreksi fiskal positif. Berdasarkan PMK 66/2023, penggantian/imbalan dalam bentuk natura atau kenikmatan yang melampaui batasan tertentu menjadi objek PPh bagi penerima dan memerlukan penyesuaian fiskal.',
    summaryEn:
      'Business entertainment expenses are tax-deductible only if directly related to business income (3M principle) and supported by a signed Nominative List under SE-27/PJ.22/1986; otherwise a positive fiscal adjustment is required. Under PMK 66/2023, benefits-in-kind exceeding statutory limits are subject to specific tax treatment.',
    needsVerification: true,
  },
  {
    id: 'ID-PPH-BADAN-31E',
    jurisdiction: 'ID',
    regulation: 'UU PPh s.t.d.t.d. UU No. 7 Tahun 2021 (UU HPP) & PP No. 55 Tahun 2022',
    article: 'Pasal 17 ayat (1) huruf b, Pasal 31E UU PPh & PP 55/2022',
    keywords: [
      'pph badan',
      '31e',
      'pasal 31e',
      '22%',
      'umkm',
      'pp 55',
      '0,5%',
      '0.5%',
      'tarif badan',
      'spt 1771',
      'laba fiskal',
      'penghasilan kena pajak',
      'rekonsiliasi',
    ],
    summaryId:
      'Tarif umum PPh Badan di Indonesia adalah 22% (Pasal 17 ayat (1) huruf b UU PPh). Wajib Pajak Badan dalam negeri dengan peredaran bruto sampai dengan Rp 50 miliar mendapat fasilitas pengurangan tarif sebesar 50% dari tarif normal (efektif 11%) atas bagian Penghasilan Kena Pajak dari peredaran bruto sampai dengan Rp 4,8 miliar sesuai Pasal 31E UU PPh. Skema PPh Final 0,5% (PP 55/2022) memiliki batas waktu pemanfaatan bagi PT (3 tahun pajak) dan syarat peredaran bruto <= Rp 4,8 miliar.',
    summaryEn:
      'The statutory Indonesian corporate income tax rate is 22%. Resident corporate taxpayers with gross revenue up to IDR 50B qualify for a 50% rate reduction (11% effective rate) on the portion of taxable income corresponding to gross revenue up to IDR 4.8B under Article 31E.',
    needsVerification: true,
  },
  {
    id: 'ID-WHT-PPH21-PPH23-PPH42',
    jurisdiction: 'ID',
    regulation: 'UU PPh, PMK No. 141/PMK.03/2015, PMK No. 168 Tahun 2023 & PP No. 34 Tahun 2017',
    article: 'Pasal 21, Pasal 23 ayat (1) huruf c, Pasal 4 ayat (2) huruf d UU PPh',
    keywords: [
      'pph 23',
      'pph 21',
      'pph 4(2)',
      'sewa',
      'jasa',
      'konsultan',
      'bukan pegawai',
      'ter',
      'pmk 168',
      'pmk 141',
      'bupot',
      'bukti potong',
      'ekualisasi',
    ],
    summaryId:
      'Jasa teknik, manajemen, konsultan, dan periklanan merupakan objek pemotongan PPh Pasal 23 sebesar 2% dari jumlah bruto tidak termasuk PPN (PMK 141/PMK.03/2015). Sebaliknya, sewa tanah dan/atau bangunan wajib dipotong PPh Pasal 4 ayat (2) bersifat Final sebesar 10% (PP 34/2017). Untuk imbalan kepada Bukan Pegawai (tenaga ahli/freelance), PMK 168 Tahun 2023 mengatur dasar pengenaan sebesar 50% dari penghasilan bruto dikalikan tarif Pasal 17.',
    summaryEn:
      'Technical, management, consulting, and advertising services are subject to 2% Article 23 WHT on gross amount excluding VAT. Land/building rental is subject to 10% Final WHT under Article 4(2). Non-employee professional fees use 50% x gross income x Article 17 rate under PMK 168/2023.',
    needsVerification: true,
  },
  {
    id: 'ID-TP-P3B-TREATY',
    jurisdiction: 'ID',
    regulation: 'Pasal 18 & Pasal 26 UU PPh, PMK No. 172 Tahun 2023, PER-25/PJ/2018 & P3B Indonesia–Singapura',
    article: 'Pasal 18 ayat (3), Pasal 26 UU PPh, PMK 172/2023 & Pasal 10/11/12 P3B RI–SG',
    keywords: [
      'transfer pricing',
      'p3b',
      'treaty',
      'dta',
      'royalti',
      'afiliasi',
      'hubungan istimewa',
      'pph 26',
      'skd',
      'form dgt',
      'cor',
      'pmk 172',
      'ubo',
      'beneficial owner',
      'kepemilikan',
    ],
    summaryId:
      'Pembayaran royalti, bunga, atau dividen ke Wajib Pajak Luar Negeri dikenakan tarif domestik PPh Pasal 26 sebesar 20%. Penurunan tarif sesuai Perjanjian Penghindaran Pajak Berganda (P3B/Tax Treaty, mis. 10% untuk royalti RI–Singapura, perlu verifikasi pasal berlaku) hanya dapat diterapkan apabila lawan transaksi merupakan Beneficial Owner (bukan perusahaan perantara/conduit), memiliki Certificate of Residence (COR) / e-SKD (Form DGT) yang valid, serta memenuhi Prinsip Kewajaran dan Kelaziman Usaha (PKKU) dalam Dokumen Penentuan Harga Transfer (PMK 172/2023).',
    summaryEn:
      'Cross-border royalty/interest/dividend payments from Indonesia face a 20% domestic Article 26 WHT rate. Reduced DTA treaty rates (e.g., 10% under the ID-SG DTA, subject to verification) require valid e-SKD/Form DGT, Beneficial Ownership substance, and arm’s-length TP documentation under PMK 172/2023.',
    needsVerification: true,
  },
  {
    id: 'OECD-BEPS-PILLAR-TWO',
    jurisdiction: 'OECD',
    regulation: 'OECD/G20 Inclusive Framework on BEPS — Pillar Two Global Anti-Base Erosion (GloBE) Rules & Action 6',
    article: 'GloBE Model Rules (15% Minimum Effective Tax Rate) & BEPS Action 6 Principal Purpose Test (PPT)',
    keywords: [
      'beps',
      'pillar two',
      'pillar 2',
      'globe',
      '15%',
      '750',
      'top-up',
      'top up',
      'oecd',
      'conduit',
      'treaty shopping',
      'cbcr',
    ],
    summaryId:
      'Aturan OECD Pillar Two (GloBE) menerapkan tarif pajak efektif minimum global sebesar 15% bagi grup perusahaan multinasional dengan pendapatan konsolidasi >= EUR 750 juta. Jika tarif pajak efektif (Effective Tax Rate / ETR = Covered Taxes / GloBE Income) di suatu yurisdiksi berada di bawah 15%, muncul kewajiban Top-Up Tax sebesar (15% - ETR) x Excess Profit. Selain itu, BEPS Action 6 (Principal Purpose Test) menolak manfaat Tax Treaty apabila struktur pemegang saham perantara dibentuk semata-mata untuk memperoleh tarif pajak rendah tanpa substansi ekonomi.',
    summaryEn:
      'OECD Pillar Two applies a 15% global minimum effective tax rate to MNE groups with consolidated revenue >= EUR 750M, imposing a top-up tax when jurisdictional ETR falls below 15%. BEPS Action 6 denies treaty benefits to conduit arrangements lacking economic substance.',
    needsVerification: true,
  },
  {
    id: 'SG-IRAS-GST-CIT',
    jurisdiction: 'SG',
    regulation: 'Singapore Income Tax Act 1947 & Goods and Services Tax Act (Cap. 117A)',
    article: 'Section 14, Section 15(1)(k), Section 45 ITA & Section 20(2A) GST Act',
    keywords: [
      'singapura',
      'singapore',
      'iras',
      'gst',
      'invoicenow',
      'peppol',
      'missing trader',
      'mtf',
      'form c-s',
      'pte',
      's-plate',
      'section 45',
      'uen',
    ],
    summaryId:
      '[Preview Adapter SG] Di Singapura, tarif pajak korporasi standar adalah 17% (dengan skema Partial Tax Exemption pada penghasilan kena pajak awal) dan tarif GST adalah 9%. Berdasarkan Section 20(2A) GST Act, klaim Input GST dapat ditolak apabila wajib pajak mengetahui atau seharusnya mengetahui transaksi terkait dengan skema Missing Trader Fraud (MTF). Pengeluaran mobil penumpang pribadi (S-Plate) tidak dapat dikurangkan menurut Section 15(1)(k) ITA.',
    summaryEn:
      '[SG Preview Adapter] Singapore statutory corporate tax is 17% and GST is 9%. Under Section 20(2A) of the GST Act, input GST claims connected to Missing Trader Fraud are disallowed. Private S-plate motor car expenses are non-deductible under Section 15(1)(k) ITA.',
    needsVerification: true,
  },
  {
    id: 'MY-LHDN-MYINVOIS-ITA',
    jurisdiction: 'MY',
    regulation: 'Malaysia Income Tax Act 1967 (ITA) & LHDN e-Invoice Guideline',
    article: 'Section 33(1), Section 39(1)(l) & Section 82B ITA 1967',
    keywords: [
      'malaysia',
      'lhdn',
      'myinvois',
      'uuid',
      'sst',
      'form c',
      'section 39',
      'section 82b',
      'keraian',
      'tin',
    ],
    summaryId:
      '[Preview Adapter MY] Di Malaysia, tarif pajak korporasi umum adalah 24% dan SST jasa adalah 8%. Di bawah mandat LHDN MyInvois (Section 82B ITA 1967), pengeluaran bisnis memerlukan bukti e-Invoice tervalidasi dengan UUID LHDN agar memenuhi syarat pengurang pajak (Section 33(1)). Biaya jamuan (entertainment) umum dikenakan pembatasan koreksi positif 50% sesuai Section 39(1)(l) ITA 1967.',
    summaryEn:
      '[MY Preview Adapter] Malaysia corporate tax is 24% and Service Tax is 8%. Under LHDN MyInvois rules, expenses require validated UUID e-invoices to support Section 33(1) deductions, and general client entertainment faces a 50% disallowance under Section 39(1)(l).',
    needsVerification: true,
  },
  {
    id: 'US-IRS-1120-W9',
    jurisdiction: 'US',
    regulation: 'U.S. Internal Revenue Code (IRC)',
    article: 'IRC §11, §162, §274(a)/(n), §1442 & §3406',
    keywords: [
      'amerika',
      'united states',
      'irs',
      '1120',
      'w-9',
      'w9',
      '1099',
      'backup withholding',
      '3406',
      '274',
      'schedule m-1',
      'ein',
      'w-8ben',
    ],
    summaryId:
      '[Preview Adapter US] Di Amerika Serikat, tarif federal C-Corporation adalah 21% (Form 1120). Berdasarkan IRC §3406, pembayaran kepada vendor/kontraktor AS tanpa TIN/Form W-9 yang tervalidasi wajib dikenakan Backup Withholding sebesar 24%. Berdasarkan IRC §274 (Schedule M-1), biaya entertainment 100% non-deductible dan jamuan makan bisnis dibatasi 50%.',
    summaryEn:
      '[US Preview Adapter] US federal corporate tax is 21% (Form 1120). IRC §3406 mandates 24% backup withholding on payments to unverified US contractors lacking a valid Form W-9. IRC §274 disallows 100% of entertainment and 50% of qualifying business meals on Schedule M-1.',
    needsVerification: true,
  },
];

export interface RetrievalResult {
  grounded: boolean;
  confidence: number;
  passages: RegulatoryPassage[];
  citations: CopilotCitation[];
}

export function retrieveRegulatoryContext(
  query: string,
  activeCountry: CountryCode = 'ID'
): RetrievalResult {
  const normalized = query.toLowerCase();
  const tokens = normalized
    .replace(/[^a-z0-9\s()%.-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2);

  const scored = REGULATORY_KNOWLEDGE_BASE.map((passage) => {
    let matchCount = 0;
    for (const kw of passage.keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        matchCount += kw.includes(' ') ? 2.5 : 1.5;
      } else if (tokens.some((t) => kw.toLowerCase() === t)) {
        matchCount += 1.2;
      }
    }
    if (matchCount > 0 && (passage.jurisdiction === activeCountry || passage.jurisdiction === 'OECD')) {
      matchCount += 0.5;
    }
    return { passage, score: matchCount };
  })
    .filter((item) => item.score >= 1.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) {
    return {
      grounded: false,
      confidence: 0,
      passages: [],
      citations: [],
    };
  }

  const topScore = scored[0].score;
  const confidence = Math.min(0.96, Math.max(0.65, Number((0.6 + topScore * 0.07).toFixed(2))));

  const citations: CopilotCitation[] = scored.map(({ passage }) => ({
    id: passage.id,
    regulation: passage.regulation,
    article: passage.article,
    jurisdiction: passage.jurisdiction,
    summary: passage.summaryId,
    needsVerification: passage.needsVerification,
  }));

  return {
    grounded: true,
    confidence,
    passages: scored.map((s) => s.passage),
    citations,
  };
}
