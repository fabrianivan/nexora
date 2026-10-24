# Naskah Demo 3 Menit — Nexora v2.0 (Google Cloud AI Builder Cup)

Naskah ini dirancang agar dapat didemokan secara mulus dalam **180 detik (3 menit)** di depan juri, baik dalam **Smart Demo Mode** (tanpa koneksi eksternal) maupun **Live Gemini Mode**.

---

## Timeline Demo Detik demi Detik (Total: 3 Menit)

### [00:00 – 00:25] 1. Hook, Masalah & 1-Klik Dataset Sampel (Tahap 1: Dashboard)
- **Apa yang ditampilkan di layar:** Buka halaman utama Nexora. Tunjukkan badge status di header (`DATA DEMO / SIMULASI — Smart Demo Mode` atau `LIVE GEMINI API`) dan pemilih negara (`ID Full` vs `SG/MY/US Preview`).
- **Apa yang diklik:** Klik tombol hijau **"🚀 Coba dengan data contoh (1-Klik)"**.
- **Apa yang diucapkan:**
  > *"Tim pajak grup usaha multi-entitas sering menghadapi koreksi fiskal ratusan juta rupiah akibat faktur pajak indikasi TBTS, biaya non-deductible yang lolos, dan ketidaksesuaian akta kepemilikan. Nexora membaca dokumen pajak & korporasi, menandai risiko fraud lengkap dengan bukti, lalu menyiapkan draf rekonsiliasi fiskal yang siap direview manusia. Dengan satu klik tanpa login, kita memuat grup usaha 4 negara dengan fokus end-to-end pada Indonesia."*
- **Hasil di layar:** Toast konfirmasi muncul; KPI menampilkan 4 Entitas, 12+ Dokumen, daftar temuan Kritis/Tinggi, dan potensi koreksi fiskal positif.

---

### [00:25 – 00:55] 2. Struktur Kepemilikan & Deteksi Anomali UBO (Tahap 2: Struktur Kepemilikan)
- **Apa yang diklik:** Klik tab **"2. Struktur Kepemilikan"** di stepper navigasi atas. Lalu klik tombol **"Uji Deteksi Kepemilikan Melingkar"** atau **"Perbaiki Saham ENT-SG-002 ke 100%"**.
- **Apa yang diucapkan:**
  > *"Sebelum memeriksa faktur, Nexora memvalidasi struktur kepemilikan grup. Di sini terlihat rantai kepemilikan efektif dari induk PT Nusantara Kreasi Digital Tbk, serta anomali yang langsung tertaut ke Risk Engine: kepemilikan yang belum mencapai 100%, pemilik manfaat (UBO) yang belum terkonfirmasi, hingga deteksi kepemilikan melingkar secara real-time."*
- **Hasil di layar:** Grafik hierarki memperbarui persentase efektif secara instan dan mencatat perubahan ke Audit Log.

---

### [00:55 – 01:35] 3. Document Intelligence Side-by-Side & Validasi Silang (Tahap 3: Document Intelligence)
- **Apa yang diklik:**
  1. Klik tab **"3. Document Intelligence"**.
  2. Klik tombol **"+ Uji Scan e-Faktur Indikasi TBTS"** (atau pilih dokumen `DOC-2026-002`).
  3. Arahkan kursor ke field dengan label kuning **"⚠️ Confidence Rendah"**, klik **"Koreksi Manual"**, ubah nilainya, lalu klik **"Simpan & Catat Audit"**.
  4. Gulir sedikit ke bawah ke panel **"Validasi Silang Antar-Dokumen"**.
- **Apa yang diucapkan:**
  > *"Di Document Intelligence, dokumen sumber ditampilkan berdampingan dengan field hasil ekstraksi. Field dengan confidence di bawah 85% disorot otomatis untuk direview manusia. Ketika reviewer melakukan koreksi manual, statusnya berubah menjadi Terverifikasi dan tercatat ke Audit Trail. Di bawahnya, mesin validasi silang otomatis menemukan ketidaksesuaian antara Akta, Daftar Pemegang Saham, dan dokumen transaksi."*
- **Hasil di layar:** Field berubah menjadi hijau (`✓ Dikoreksi Manual (Audit Logged)`), dan panel validasi silang menampilkan daftar selisih antar-dokumen lengkap dengan tautan sumbernya.

---

### [01:35 – 02:15] 4. Explainable Fraud & Risk Engine Dual-Layer (Tahap 4: Fraud & Risk Engine)
- **Apa yang diklik:**
  1. Klik tab **"4. Fraud & Risk Engine"**.
  2. Tunjukkan kotak **Skor Risiko Gabungan** pada kartu temuan `TBTS` dan `NON_DEDUCTIBLE` (bar biru untuk *Rule-based* + bar kuning untuk *Statistik Z-Score/Benford*).
  3. Klik **"Konfirmasi Temuan"** pada satu kartu, dan klik **"Tandai False Positive"** pada satu kartu lainnya.
- **Apa yang diucapkan:**
  > *"Mengapa dokumen ini ditandai berisiko? Nexora memisahkan skor menjadi dua lapisan transparan: aturan deterministik pajak dan statistik populasi Z-Score, IQR, serta Hukum Benford yang dihitung lokal sebagai simulasi BigQuery. Setiap temuan memuat alasan bahasa manusia, bukti halaman/nilai, dan rekomendasi. Jika reviewer menandai False Positive, sistem mencatatnya ke audit log dan menurunkan bobot aturan serupa pada sesi ini."*
- **Hasil di layar:** Banner umpan balik reviewer muncul menjelaskan penurunan bobot 35% secara jujur (tanpa mengklaim pelatihan ulang model ML).

---

### [02:15 – 02:45] 5. Rekonsiliasi Fiskal, What-If & Ekspor Draf SPT (Tahap 5: Rekonsiliasi & Draf SPT)
- **Apa yang diklik:**
  1. Klik tab **"5. Rekonsiliasi & Draf SPT"**.
  2. Klik badge **"⚠️ Perlu Verifikasi"** pada baris koreksi hingga berubah menjadi **"✓ Terverifikasi"**.
  3. Geser slider **Simulator Mode What-If** atau aktifkan fasilitas Pasal 31E.
  4. Klik **"Pratinjau & Cetak PDF Draf SPT"** (atau **"Unduh Draf XML"**).
- **Apa yang diucapkan:**
  > *"Temuan risiko tadi langsung terhubung ke Kertas Kerja Rekonsiliasi Fiskal—menjembatani Laba Komersial ke Penghasilan Kena Pajak. Tim pajak dapat menjalankan simulasi What-If, lalu mengekspor Draf SPT 1771 dalam format JSON, XML tervalidasi, atau ringkasan PDF lengkap dengan watermark DRAF dan referensi kode e-Billing."*
- **Hasil di layar:** Modal pratinjau Draf SPT terbuka dengan watermark kuning mencolok `"DRAF - BUKAN UNTUK DISAMPAIKAN KE OTORITAS"` dan tabel rincian koreksi fiskal.

---

### [02:45 – 03:00] 6. Grounded RAG Copilot & Audit Trail (Tahap 6 & 7)
- **Apa yang diklik:**
  1. Tutup modal, klik tab **"6. Copilot RAG & Simulator"**, lalu klik chip pertanyaan cepat (termasuk chip **Uji Penolakan Anti-Halusinasi**).
  2. Klik tab **"7. Audit Trail & Laporan"** dan klik **"Buka Laporan Ringkasan Eksekutif (PDF)"**.
- **Apa yang diucapkan:**
  > *"Untuk mempercepat riset aturan, Copilot kami hanya menjawab berdasarkan basis regulasi RAG lengkap dengan sitasi pasal, dan menolak mengarang jawaban jika ditanya di luar konteks pajak. Seluruh tindakan manusia dari awal hingga akhir terekam di Audit Trail yang siap diekspor ke CSV dan PDF untuk komite audit."*
- **Hasil di layar:** Copilot menampilkan sitasi `UU PPN` / `SE-27/PJ.22/1986` serta menolak pertanyaan saham/kripto, dan halaman Audit Trail menampilkan seluruh riwayat aksi sesi.

---

## Rencana Cadangan (Fallback Plan Bila Koneksi / API Bermasalah)

1. **Jika koneksi internet atau Gemini API melambat/gagal saat live demo:**
   - Tidak perlu menghentikan demo atau mengubah konfigurasi. `LiveEngine` memiliki batas waktu keras (*hard timeout*) **7 detik** dan otomatis beralih ke `DemoEngine` yang 100% deterministik di server lokal.
2. **Jika ingin mereset state di tengah demo:**
   - Kembali ke tab **1. Ringkasan & Onboarding** dan klik **"🚀 Coba dengan data contoh (1-Klik)"** untuk mengembalikan seluruh data ke kondisi awal dalam waktu `< 50 ms`.

---

## Jawaban Singkat untuk Pertanyaan Juri (Q&A Cheat Sheet)

1. **Akurasi Ekstraksi:** *"Bagaimana jika OCR salah membaca angka faktur atau NPWP?"*
   - **Jawaban:** Nexora menampilkan *confidence score* per field dan menyorot setiap field `< 85%`. Selain itu, kami menjalankan pemeriksaan matematis (`DPP + PPN == Total`) dan validasi silang lintas dokumen. Reviewer manusia dapat mengoreksi nilai secara inline dan setiap koreksi tercatat di Audit Log.
2. **Penanganan False Positive:** *"Bagaimana jika aturan terlalu sensitif untuk industri tertentu?"*
   - **Jawaban:** Setiap temuan memiliki tombol **Tandai False Positive**. Tindakan ini tercatat di Audit Log beserta alasan reviewer, dan menurunkan skor aturan serupa sebesar 35% pada sesi kerja untuk mengurangi *alert fatigue* secara transparan.
3. **Privasi Data Pajak:** *"Bagaimana perlindungan data NPWP, NITKU, dan nilai transaksi?"*
   - **Jawaban:** Pertama, tidak ada API key di sisi klien; semua pemrosesan berjalan di server route. Kedua, tersedia fitur **Masking ID Sensitif (`ON/OFF`)** di UI. Ketiga, teks dokumen disanitasi dengan filter anti *prompt-injection* sebelum dikirim ke model AI.
4. **Skalabilitas Multi-Negara:** *"Seberapa sulit menambahkan negara baru seperti Vietnam atau Thailand?"*
   - **Jawaban:** Sangat modular berkat pola `CountryAdapter` (`src/lib/adapters/countryAdapter.ts`). Menambah yurisdiksi baru cukup dengan mendaftarkan satu objek adapter berisi regex Tax ID, tipe dokumen, tarif pajak, dan katalog aturan tanpa mengubah komponen UI atau mesin inti.
5. **Diferensiasi vs Software Akuntansi/ERP Biasa:** *"Apa bedanya Nexora dengan software akuntansi atau e-Filing biasa?"*
   - **Jawaban:** ERP dan aplikasi e-Filing hanya merekam angka yang sudah bersih. Nexora berada di lapisan **Pre-Filing Tax Risk & Audit Intelligence**: membaca dokumen mentah, memvalidasi silang akta vs laporan keuangan, mendeteksi faktur berisiko TBTS dengan gabungan aturan + statistik populasi, dan menyiapkan kertas kerja rekonsiliasi fiskal yang dapat dipertanggungjawabkan ke auditor.
