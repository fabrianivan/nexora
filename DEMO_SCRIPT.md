# Nexora — 3-Minute Jury Demo Script
## Google Cloud AI Builder Cup 2026 (Track 1: BFSI)

> **Presenter Persona**: Principal Engineer & FinTech Product Strategist  
> **Target Audience**: BFSI Judges & Evaluation Panel  
> **Duration**: Exactly 3 Minutes (180 Seconds)  
> **Live Demo URL**: [https://nexora-chi-cyan.vercel.app](https://nexora-chi-cyan.vercel.app)  
> **Prerequisites**: Zero login, zero API key required (Smart Demo Mode ready out-of-the-box).

---

## Second-by-Second Presentation Roadmap

| Timestamp | Screen / Action | Spoken Script / Key Points | Value Delivered |
|---|---|---|---|
| **0:00 - 0:25** | **Landing & Transparency Badge**<br/>• Open [https://nexora-chi-cyan.vercel.app](https://nexora-chi-cyan.vercel.app)<br/>• Hover on `Simulasi Lokal` badge<br/>• Click `Muat Sample Kasus Nyata` | *"Halo Dewan Juri Google Cloud AI Builder Cup! Saya mempersembahkan **Nexora**, platform kepatuhan pajak korporasi multi-negara dan pencegahan fraud untuk industri BFSI. Nexora memprioritaskan transparansi: tanpa API key, sistem berjalan dalam Smart Demo Mode lokal tanpa data palsu. Dengan satu klik, kita muat skenario grup konglomerasi nyata: PT Nusantara Kreasi Digital Tbk di Indonesia, dengan anak usaha di Singapura dan Malaysia."* | Honest AI disclosure; Instant zero-friction evaluation. |
| **0:25 - 0:50** | **Step 1 & 2: Ownership & Document Intelligence**<br/>• Click Stepper `1. Struktur`<br/>• Toggle between Diagram Hierarki & Entitas<br/>• Click Stepper `2. Dokumen`<br/>• Show uploaded e-Invoices & audited financials | *"Di Step 1, Nexora memetakan hierarki kepemilikan multi-tier, UBO perorangan, dan mendeteksi risiko circular ownership secara real-time. Di Step 2, scanner dokumen multimodal memproses faktur pajak elektronik, laporan keuangan audited, dan akta pendirian, memvalidasi format NPWP 16 digit dan kepatuhan PMK 112/2022."* | Graph intelligence & multimodal document processing. |
| **0:50 - 1:15** | **Step 3: Explainable Fraud & Anomaly Detection**<br/>• Click Stepper `3. Deteksi Fraud`<br/>• Click finding `ID_FRAUD_TBTS_01`<br/>• Show Z-Score chart & legal basis | *"Di Step 3, mesin deteksi fraud kami menemukan anomali faktur pajak fiktif (TBTS) dan indikasi split invoicing. Perhatikan: Nexora tidak memberikan skor hitam 'black-box'. Kami menyajikan skor Z-Score statistik, dasar regulasi UU KUP Pasal 39A, bukti transaksi, dan aksi koreksi fiskal yang langsung terhubung ke penghitungan pajak."* | Explainable AI & BFSI fraud prevention (Track 1 core). |
| **1:15 - 1:45** | **Step 4: Fiscal Reconciliation & PPh Badan**<br/>• Click Stepper `4. Kalkulasi`<br/>• View Laba Komersial vs Koreksi Positif/Negatif<br/>• Toggle `UU PPh Pasal 31E`<br/>• Test `What-If Simulator` | *"Masuk ke Step 4: Rekonsiliasi Fiskal. Temuan fraud tadi otomatis dikoreksi fiskal positif (beban natura PMK-66/2023). Nexora menghitung PPh Badan secara deterministik dengan fasilitas diskon 50% Pasal 31E untuk omzet di bawah Rp 50 Miliar. Kita juga bisa menjalankan What-If simulator untuk menguji dampak remediasi sebelum draf SPT dibuat."* | Deterministic tax engine & What-If sensitivity. |
| **1:45 - 2:15** | **Step 5: SPT 1771 & Maker-Checker Governance**<br/>• Click Stepper `5. Draf SPT`<br/>• Show SPT 1771 Induk & Lampiran I-III<br/>• Switch role to `Head of Tax` & click `Setujui & Kunci SPT`<br/>• Click `Ekspor XML (Coretax)` | *"Step 5 adalah Draf SPT 1771. Nexora menerapkan tata kelola ISO 27001 Maker-Checker yang ketat: staf Konsultan Pajak hanya bisa membuat draf; tombol persetujuan hanya aktif ketika diverifikasi oleh Head of Tax atau Group CEO. Setelah disetujui, kita bisa langsung mengekspor file XML resmi yang 100% siap diimpor ke sistem Coretax DJP."* | Regulatory compliance, Coretax XML & Maker-Checker. |
| **2:15 - 2:35** | **Step 6: Payment & 15-Digit e-Billing**<br/>• Click Stepper `6. Pembayaran`<br/>• Click `Generate Kode Billing`<br/>• Click `Konfirmasi Bayar` & input NTPN | *"Setelah SPT dikunci, Step 6 secara otomatis membuat jadwal kewajiban setor dan menghasilkan kode billing 15-digit resmi DJP (Akun 411126-200). Masukkan nomor NTPN bank untuk merekonsiliasi pembayaran dan mencegah sanksi bunga keterlambatan."* | Treasury integration & e-Billing lifecycle. |
| **2:35 - 3:00** | **Step 7: Tax Calendar, Audit Trail & Closing**<br/>• Click Stepper `7. Kalender & Audit`<br/>• Click `Export Kalender (.ics)`<br/>• Click `Laporan` tab -> `Unduh Paket Audit (CSV)` | *"Terakhir di Step 7: Kalender kepatuhan statutory dapat diunduh sebagai file `.ics` untuk langsung sinkron ke Google Calendar. Seluruh riwayat aksi terekam dalam immutable audit trail yang dapat diekspor sebagai CSV untuk kebutuhan audit eksternal. Inilah Nexora — kepatuhan pajak korporasi cerdas, aman, dan siap produksi. Terima kasih!"* | Operational calendar, audit readiness & strong closing. |

---

## Backup FAQs for Q&A Session

### Q1: "Mengapa tidak semua fitur menggunakan LLM?"
> **Jawaban**: *"Dalam industri BFSI dan perpajakan korporasi, determinisme hukum adalah mutlak. Perhitungan tarif Pasal 31E, dividen Pasal 4(3)f, dan kode billing tidak boleh berhalusinasi. AI (Gemini 2.5 Flash) digunakan tepat pada kekuatannya: ekstraksi dokumen multimodal dari invoice/laporan keuangan dan penjelasan regulasi (RAG). Sedangkan perhitungan finansial dan deteksi anomali dieksekusi oleh mesin deterministik terverifikasi."*

### Q2: "Bagaimana Nexora menangani multi-negara di luar Indonesia?"
> **Jawaban**: *"Nexora memiliki Country Adapter Layer terisolasi (`src/lib/adapters/`). Saat ini Indonesia memiliki kedalaman penuh (P0), sementara Singapura (Form C-S & GST), Malaysia (MyInvois & Form C), dan US (Form 1120) tersedia dalam status preview dengan aturan perpajakan terversi (`src/config/taxRules.*.json`)."*

### Q3: "Apakah ada risiko kebocoran data rahasia perusahaan?"
> **Jawaban**: *"Tidak. Dalam Smart Demo Mode, data diproses secara lokal di browser/edge. Ketika Live Gemini Mode diaktifkan, hanya metadata teks yang relevan dikirim ke endpoint aman dengan enkripsi TLS dan masking identitas sensitif (NPWP/NIK). Attachment biner tidak disimpan permanen di cloud tanpa izin pengguna."*
