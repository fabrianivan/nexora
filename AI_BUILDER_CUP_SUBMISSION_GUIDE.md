# Panduan Submisi Google Cloud AI Builder Cup — Track 1: Financial Services (BFSI)

## 1. Ringkasan Eksekutif & Keselarasan Track 1 BFSI

- **Nama Proyek:** Nexora v2.0 — Platform Kepatuhan Pajak Korporasi & Deteksi Risiko Fiskal Berbasis Bukti
- **Track:** Track 1 — Financial Services (BFSI): *Intelligent Risk, Fraud Prevention, and Financial Experiences*
- **Value Proposition Satu Kalimat:**
  > *"Nexora membaca dokumen pajak & korporasi, menandai risiko fraud/kepatuhan lengkap dengan bukti, lalu menyiapkan draf rekonsiliasi fiskal yang siap direview manusia."*

### Mengapa Masalah Ini Krusial di BFSI & Perpajakan Korporasi?
Institusi keuangan, perusahaan pembiayaan, dan grup korporasi multi-entitas memproses ribuan dokumen transaksi dan perpajakan setiap bulan. Kegagalan mendeteksi satu Faktur Pajak Tidak Berdasarkan Transaksi Sebenarnya (TBTS), transaksi pihak berelasi tanpa dokumentasi *Transfer Pricing*, atau ketidakwajaran struktur kepemilikan (*Ultimate Beneficial Owner* / UBO) dapat memicu:
- Koreksi fiskal positif dan sanksi bunga/denda administrasi perpajakan.
- Risiko pencucian uang / *conduit company* di yurisdiksi berisiko tinggi.
- Keterlambatan penutupan buku (*tax provisioning*) karena rekonsiliasi fiskal dilakukan manual di spreadsheet tanpa tautan ke bukti dokumen sumber.

---

## 2. Target Pengguna (Persona) & Jobs-to-be-Done

| Persona | Tantangan Utama | Solusi di Nexora |
| :--- | :--- | :--- |
| **Head of Tax / Tax Manager** (Grup Usaha Multi-Entitas) | Harus menyusun kertas kerja rekonsiliasi fiskal dari puluhan dokumen yang tersebar dan memastikan tidak ada faktur TBTS yang dikreditkan. | Tampilan berdampingan (*side-by-side*) dokumen vs field ekstraksi, deteksi risiko otomatis, dan tabel Rekonsiliasi Fiskal yang langsung tertaut ke temuan risiko. |
| **Tax Consultant / Reviewer** | Membutuhkan dasar hukum yang jelas (Pasal UU PPh/PPN, PMK, SE DJP, P3B) dan simulasi skenario (*What-If*) sebelum memberikan opini review. | Grounded RAG Copilot dengan sitasi wajib (menolak menjawab bila tidak cukup dasar) serta Simulator *What-If* & P3B/BEPS 2.0. |
| **Internal Audit & Compliance Officer** | Membutuhkan transparansi mengapa suatu transaksi ditandai berisiko dan jejak perubahan (*audit trail*) siapa yang menyetujui atau menolak temuan. | Skor risiko *dual-layer* (Rule + Statistik Z-Score/IQR/Benford) beserta bukti spesifik dan halaman Audit Trail yang dapat diekspor ke CSV/PDF. |

---

## 3. Tabel Transparansi Layanan Google Cloud (`Live` vs `Simulasi` vs `Rencana`)

Sesuai prinsip rekayasa yang jujur dan dapat diaudit, berikut adalah status aktual setiap komponen Google Cloud di dalam kode repositori Nexora:

| Layanan Google Cloud | Status Implementasi | Lokasi di Kode | Penjelasan Teknis Jujur |
| :--- | :---: | :--- | :--- |
| **Google Gemini API (`gemini-2.5-flash`)** | **LIVE (dengan Fallback Deterministik)** | `src/lib/adapters/aiEngine.ts` (`LiveEngine` & `DemoEngine`), `src/app/api/copilot/route.ts`, `src/app/api/scan-document/route.ts` | Dipanggil langsung dari server route saat `GEMINI_API_KEY` dikonfigurasi, dilengkapi timeout 7 detik, retry dengan *exponential backoff*, sanitasi anti *prompt-injection*, dan fallback otomatis ke `DemoEngine` bila API key tidak disetel atau jaringan gagal. |
| **Google Cloud Run** | **LIVE / SIAP DEPLOY** | `Dockerfile`, `next.config.mjs` (`output: 'standalone'`), `src/app/api/health/route.ts` | Konfigurasi container multi-stage `node:22-alpine` non-root di port `8080` lengkap dengan endpoint `/api/health` dan *structured JSON logging*. |
| **BigQuery Statistical Fraud Analytics** | **SIMULASI LOKAL DI SERVER** | `src/lib/fraud.ts` (`computePopulationStats`, `zScores`, `evaluateBenfordFirstDigit`) | Perhitungan statistik populasi (Mean, StdDev, Median, Q1, Q3, IQR, Z-Score, dan deviasi digit pertama Hukum Benford) dihitung secara matematis di server Node.js dan diberi label eksplisit di UI: **`"Dihitung lokal (simulasi BigQuery)"`**. |
| **Google Cloud Document AI** | **SIMULASI LOKAL / GEMINI-ASSISTED** | `src/lib/adapters/aiEngine.ts` (`extractDocument`) | Ekstraksi field dokumen, skor confidence per field, dan koordinat lokasi halaman disimulasikan secara deterministik di `DemoEngine` atau diekstrak melalui `LiveEngine` (Gemini). Belum memanggil endpoint `@google-cloud/documentai` secara langsung. |
| **Vertex AI Search / Grounded RAG** | **KORPUS LOKAL TERKURASI + GEMINI** | `src/lib/rag.ts` (`REGULATORY_KNOWLEDGE_BASE`, `retrieveRegulatoryContext`) | Retrieval dilakukan terhadap basis pengetahuan regulasi pajak terkurasi di `src/lib/rag.ts` (UU PPN, UU PPh, UU KUP, PMK 66/2023, PMK 172/2023, P3B ID-SG, OECD Pillar Two). Jawaban dibatasi ketat hanya pada dokumen yang terambil (*strict grounding*). |
| **Cloud SQL (MySQL)** | **OPSIONAL (Repository Pattern)** | `src/lib/mysql.ts` (`InMemoryWorkspaceRepository` & `MysqlWorkspaceRepository`) | Menggunakan pola *repository*. Jika `MYSQL_URL` disetel, data disimpan ke tabel MySQL `nexora_workspaces`. Jika tidak disetel (mode demo), otomatis menggunakan repositori in-memory. |

---

## 4. Keunggulan Utama untuk Penilaian Juri

1. **Kedalaman Satu Alur Utama (End-to-End Hero Flow):**
   Seluruh tahapan saling terhubung secara fungsional: mengedit field NPWP/DPP di *Document Intelligence* atau menandai *False Positive* di *Fraud Engine* secara instan memperbarui skor risiko, angka *Rekonsiliasi Fiskal*, dan mencatat baris baru di *Audit Log*.
2. **Explainable Dual-Layer Fraud Engine:**
   Tidak menggunakan "kotak hitam". Setiap temuan memisahkan kontribusi **(a) Skor Aturan Deterministik** dan **(b) Skor Statistik Populasi (Z-Score/Benford)** lengkap dengan nilai bukti, lokasi di dokumen, dan rekomendasi tindakan.
3. **Grounded RAG Tanpa Halusinasi:**
   Saat pengguna menanyakan topik di luar basis pengetahuan pajak (mis. prediksi harga saham), Copilot secara eksplisit menolak mengarang jawaban atau pasal.
4. **Zero-Friction Demo Experience:**
   Juri dapat mencoba seluruh alur dalam 1 klik melalui tombol **"Coba dengan data contoh (1-Klik)"** tanpa perlu login atau menyiapkan API key terlebih dahulu.
