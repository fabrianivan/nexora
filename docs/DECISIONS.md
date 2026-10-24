# Catatan Keputusan Desain & Arsitektur (DECISIONS.md)

Dokumen ini mencatat keputusan arsitektur dan produk yang diambil selama pengembangan `improve/concept-v2` agar setiap trade-off transparan dan mendukung **Hero Flow** demo 3 menit.

---

## ADR-001: Satu Klik "Coba dengan Data Contoh" Tanpa Hambatan Login pada Mode Demo
- **Konteks**: Pada versi sebelumnya, ketika `NEXORA_ACCESS_TOKEN` tidak dikonfigurasi di produksi atau pengguna belum login, aplikasi menampilkan layar blokir atau mengembalikan HTTP 401/503 pada route `/api/copilot` dan `/api/scan-document`. Ini berisiko fatal menggagalkan demo di depan juri.
- **Keputusan**:
  - Jika `NEXORA_ACCESS_TOKEN` dan `NEXORA_SESSION_SECRET` dikonfigurasi di environment, autentikasi token tetap didukung penuh.
  - Namun untuk alur **Smart Demo Mode** (default saat tidak ada token kustom atau saat tombol *"Coba dengan data contoh"* diklik), sesi demo diizinkan mengakses operasi pada dataset sampel dengan rate-limiting per-IP, sehingga juri dapat langsung mencoba seluruh Hero Flow 8 langkah dengan satu klik tanpa login dan tanpa API key.

## ADR-002: Penyimpanan Hibrida melalui `WorkspaceRepository` (MySQL + In-Memory Fallback)
- **Konteks**: Kode lama mewajibkan `MYSQL_URL` dan mengembalikan HTTP 503 jika MySQL tidak tersedia.
- **Keputusan**: Mempertahankan `MysqlWorkspaceRepository` di `src/lib/mysql.ts` untuk deployment dengan database MySQL/Cloud SQL, sekaligus menambahkan `InMemoryWorkspaceRepository` sebagai fallback otomatis ketika `MYSQL_URL` kosong. Status penyimpanan ditampilkan secara jujur di header (`MySQL Connected` vs `In-Memory Demo Store`).

## ADR-003: Fokus Kedalaman Indonesia (`Full`) & Country Adapter `Preview` untuk SG, MY, US
- **Konteks**: Mencoba membuat seluruh detail perpajakan 4 negara setara membuat UI dangkal dan sulit didemokan dalam 3 menit.
- **Keputusan**:
  - Mengimplementasikan kontrak `CountryAdapter` yang seragam untuk keempat negara (`ID`, `SG`, `MY`, `US`).
  - **Indonesia (`IDAdapter`)** berstatus `full` dengan skenario end-to-end paling lengkap (Akta, Pemegang Saham, Laporan Keuangan, SPT 1771, e-Faktur, e-Bupot PPh 23, TBTS, NSFP, Entertainment tanpa daftar nominatif, Natura PMK 66/2023, P3B ID-SG).
  - **Singapura (`SGAdapter`), Malaysia (`MYAdapter`), dan AS (`USAdapter`)** tetap dapat dipilih dan diuji aturan intinya (Missing Trader Fraud SG, MyInvois UUID MY, Backup Withholding 24% US), namun diberi badge **`Preview`** yang jujur di UI.

## ADR-004: Pemisahan Dua Lapisan Skor Risiko (Rule-Based vs Statistik) & Umpan Balik False Positive Jujur
- **Konteks**: Juri BFSI menilai tinggi *explainability* dan membenci klaim AI kotak hitam (*black-box*).
- **Keputusan**:
  - Setiap `Finding` menampilkan dua komponen skor secara eksplisit: **Skor Aturan Deterministik (0–70)** dan **Skor Statistik/Anomali (0–30)** (Z-Score, IQR outlier, distribusi digit pertama Benford's Law) yang dihitung nyata di server dan diberi label `Dihitung lokal (simulasi BigQuery)`.
  - Tombol **"Tandai False Positive"** tidak diklaim sebagai *"melatih ulang model ML secara real-time"*, melainkan secara transparan mencatat keputusan reviewer ke Audit Log dan menerapkan faktor penyesuaian bobot aturan (*rule suppression feedback* `-25 poin`) pada evaluasi data sampel berikutnya.

## ADR-005: Copilot Berbasis Retrieval Lokal (Grounded RAG) & Penolakan Jujur
- **Konteks**: LLM umum rawan mengarang nomor pasal atau tarif pajak jika tidak dibatasi pada sumber referensi.
- **Keputusan**:
  - Membangun basis pengetahuan regulasi pajak terkurasi (`src/lib/rag.ts`) yang memuat pasal-pasal kunci UU PPN, UU PPh, UU KUP, PMK 66/2023, PMK 168/2023, SE-27/PJ.22/1986, SE-17/PJ/2018, P3B Indonesia–Singapura, OECD Pillar Two, serta aturan inti IRAS, LHDN, dan IRS.
  - Setiap pertanyaan pengguna terlebih dahulu dicocokkan dengan retrieval lokal. Jika skor kecocokan di bawah ambang batas (tidak ada dasar yang cukup di repositori sumber), Copilot **menolak mengarang jawaban** dan merespons: *"Tidak ditemukan dasar yang cukup pada sumber regulasi yang tersedia di Nexora. Disarankan berkonsultasi dengan konsultan/ahli pajak bersertifikat."*
  - Baik `DemoEngine` maupun `LiveEngine` selalu menyertakan sitasi eksplisit dari dokumen yang di-retrieve.
