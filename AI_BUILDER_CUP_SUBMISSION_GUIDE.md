# Panduan Lengkap Pengisian Slide — **AI Builder Cup (Nexora — Multi-Country Edition)**

Dokumen ini disusun mengikuti urutan slide pada **Submission Template | AI Builder Cup** dan telah dilengkapi dengan kapabilitas **Perpajakan Multi-Negara (Indonesia, Singapura, Malaysia, Amerika Serikat)** serta **Cross-Border Tax Treaty (DTA/P3B & OECD Transfer Pricing)**.

---

## Slide 1: Team Details
- **Team Name**: Nexora
- **Team Leader Name**: Fabrian Ivan *(atau sesuaikan jika berbeda)*
- **Problem Statement**: **1. BFSI: Risiko Cerdas, Pencegahan Penipuan & Pengalaman Keuangan** (*Smart Risk, Fraud Prevention & Financial Experience*)
- **Proposed Solution**: **Nexora** — *Global Multi-Jurisdiction Tax Compliance, Document Intelligence & Financial Fraud Prevention Platform*

---

## Slide 2: Brief About the Idea

### 1. Opportunities (Peluang & Urgensi Masalah Global & APAC)
- Otoritas pajak di seluruh dunia sedang mewajibkan sistem *Continuous Transaction Control (CTC)* dan *e-Invoicing* real-time: **Coretax DJP (Indonesia)**, **IMDA InvoiceNow (Singapura)**, **LHDN MyInvois (Malaysia)**, serta **IRS TIN Matching & Economic Nexus (AS)**.
- Bisnis UMKM maupun perusahaan lintas negara (*cross-border*) menghadapi risiko penalti berat hingga **100%–200%** akibat:
  1. Terselipnya faktur pajak fiktif/tidak valid (**Faktur TBTS di Indonesia**, **Missing Trader Fraud di Singapura**, **Unvalidated MyInvois UUID di Malaysia**, atau **TIN Mismatch di AS**).
  2. Kesalahan tarif pemotongan pajak lintas negara (*Withholding Tax* 20%–30% karena tidak memvalidasi dokumen **Tax Treaty / P3B / Form DGT / Certificate of Residence / W-8BEN-E**).

### 2. How Different Is It From Any of the Other Existing Ideas?
- Software akuntansi tradisional hanya mencatat jurnal di satu negara secara pasif dan tidak memvalidasi keabsahan faktur atau dokumen *Tax Treaty* secara forensik.
- **Nexora** adalah platform **Multi-Negara Pertama** yang memadukan *Multimodal Document AI*, *BigQuery Statistical Fraud Detection*, dan *Multi-Jurisdiction Legal RAG Copilot* untuk mencegah denda sebelum pelaporan pajak dilakukan.

### 3. How Will It Be Able to Solve the Problem?
- Mengekstrak dan memvalidasi dokumen pajak lintas negara (e-Faktur, PEPPOL XML, MyInvois JSON, Form W-9/W-8BEN-E) dengan **Google Cloud Document AI**.
- Mendeteksi anomali transaksi, *split-invoicing*, dan skema *carousel/missing trader fraud* menggunakan **BigQuery ML & Vertex AI**.
- Memberikan konsultasi hukum pajak multi-yurisdiksi dan simulasi penghematan **Tax Treaty (DTA/P3B)** menggunakan **Gemini 2.5 Flash di Vertex AI + Vertex AI Search**.

### 4. USP of the Proposed Solution
1. **Multi-Jurisdiction Tax Engine (ID, SG, MY, US)**: Satu klik untuk berpindah rezim pajak lengkap dengan mata uang (`IDR`, `SGD`, `MYR`, `USD`), aturan tarif, dan format pelaporan lokal.
2. **Cross-Border Tax Treaty (DTA/P3B) Optimizer**: Memangkas beban *Withholding Tax* lintas negara dari 20%–30% menjadi 0%–10% secara legal dengan memvalidasi *Form DGT*, *IRAS COR*, dan *IRS Form W-8BEN-E*.
3. **Pre-Filing Fraud & Audit Shield**: Membandingkan rasio keuangan perusahaan langsung terhadap benchmark otoritas pajak (CRM DJP, IRAS SSIC, LHDN MSIC, IRS DIF Score).
