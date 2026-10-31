# Nexora - Phase 0 Audit Report

> **Status**: audit selesai, Fase 0
> **Tanggal audit**: 2026-10-27
> **Repo**: `/Users/fabrianivan/nexora`
> **Branch aktif**: `improve/concept-v3`
> **Commit baseline**: `a104200 fix(server): resolve connection refused error by supporting both port 3000 and 3001 and add icon`
> **Cakupan**: seluruh `src/`, `docs/`, `test/`, `e2e/`, `public/`, konfigurasi build, Docker, CI, env example, dan dokumen submission
> **Perubahan kode**: tidak ada. Fase ini hanya memperbarui `docs/AUDIT.md`.

Dokumen ini menggantikan `docs/AUDIT.md` sebelumnya yang sudah tidak sesuai dengan kondisi repo saat ini. Audit lama menyebut maker-checker, audit trail, database route, dan beberapa komponen belum ada; sebagian sudah ada, tetapi banyak klaim baru juga belum terverifikasi atau masih mock.

---

## Ringkasan Eksekutif

Nexora adalah prototipe UI yang kaya dan sudah memiliki beberapa modul domain yang diuji, tetapi alur demo utama belum tersambung secara end-to-end. Repository saat ini lebih tepat disebut **simulasi workspace pajak dengan data statis dan persistensi lokal**, bukan platform yang sudah menjalankan Document AI, BigQuery, Vertex AI Search, atau pengiriman resmi.

Temuan paling penting:

1. Halaman utama adalah satu client component `src/app/page.tsx` berukuran 6.495 baris. Tidak ada route halaman terpisah dan tidak ada deep link.
2. Alur 7 langkah pada stepper tidak menuju layar temuan, review, atau audit yang sesungguhnya. Langkah 3 membuka `StudiesTab`, langkah 4 membuka profil korporasi.
3. Data temuan risiko (`auditTransactions`) dan dokumen sampel (`sampleTaxDocuments`) tidak dirender di UI. `fraud.ts` dan `crossValidation.ts` hanya dipakai oleh unit test.
4. Tidak ada upload file. Tombol upload dan "Verify All Documents (Document AI)" hanya menjalankan timer 750 ms lalu menandai semua dokumen verified.
5. Header selalu menampilkan `Google Cloud Document AI + BigQuery Connected`, walaupun kedua layanan tidak pernah dipanggil.
6. Data seed SPT memakai nama field yang berbeda dari yang dibaca `TaxReturnTab`, sehingga setelah hydration atau reset berpotensi menampilkan `Rp NaN` dan mengekspor nilai `undefined`.
7. Production URL `https://nexora-chi-cyan.vercel.app` merespons 200, tetapi `/api/db/status` mengembalikan 404 dan `/api/status` melaporkan semua integrasi false. Deployment kemungkinan besar bukan build dari branch ini.
8. Unit test 25 lulus, typecheck dan build lulus, tetapi 5 test Playwright gagal karena selector sudah usang.
9. Tidak ditemukan secret yang ter-commit, tetapi `.dockerignore` belum mengecualikan semua file env dan credential JSON.
10. Belum ada dataset evaluasi, ground truth, `npm run eval`, RAG corpus, atau pengukuran precision/recall.

---

## A. Peta Arsitektur Aktual

### A.1 Bentuk aplikasi

| Elemen | Kondisi aktual | Bukti |
|---|---|---|
| Framework | Next.js App Router, React 19, TypeScript, Tailwind v4 | `package.json`, `src/app/layout.tsx` |
| Route halaman | Hanya `/`; semua tampilan adalah state di satu client component | `src/app/page.tsx:1328-6495` |
| Route API | 8 path API dengan variasi method; tidak ada route dokumen, findings, reconciliation, simulator, audit, atau health sesuai target | `src/app/api/**/route.ts` |
| Rendering | Hampir seluruh workspace adalah `'use client'`; data sensitif ikut masuk ke bundle klien | `src/app/page.tsx:1` |
| Persistensi | SQLite/MySQL/memory melalui `database.ts`; ada repository workspace kedua yang tidak dipakai UI | `src/lib/database.ts`, `src/lib/mysql.ts` |
| Deployment | Dockerfile standalone tersedia; production Vercel ada tetapi stale | `Dockerfile`, verifikasi curl |
| Internasionalisasi | Tidak ada; string Indonesia dan Inggris bercampur | `src/app/page.tsx`, `src/app/layout.tsx:16` |
| Akses | Tidak ada login, session, atau otorisasi server | seluruh route API |

### A.2 Peta tampilan di `/`

| Tab primer | Sub-tab / view | Komponen aktual | Sifat |
|---|---|---|---|
| Companies | Corporate -> Company List | state `companies` + `INITIAL_COMPANIES` + seed DB | CRUD lokal + sync DB |
| Companies | Corporate -> Corporate Profile | form di `page.tsx` | update per keystroke |
| Companies | Corporate -> Company Structure | visual tree dan tabel di `page.tsx` | data statis + state |
| Companies | Corporate -> Shareholders | tabel di `page.tsx` | CRUD lokal |
| Companies | Individual Shareholder | `IndividualShareholdersTab` | data statis terpisah |
| Companies | Studies | `StudiesTab` | katalog statis + simulator |
| Companies | Tax Calendar | `TaxCalendarTab` | CRUD lokal + `.ics` |
| Companies | Reports | `ReportsTab` | laporan statis + CSV/print |
| Calculation | Rekonsiliasi fiskal, PPN, WHT, what-if | `CalculationTab` | interaktif, sebagian statis |
| Tax Return | SPT 1771 dan lampiran | `TaxReturnTab` | draft UI + XML/JSON lokal |
| Payment | Daftar tagihan dan e-Billing | `PaymentTab` | simulasi lokal |
| Floating | Copilot | `page.tsx` + `/api/copilot` | Gemini live kondisional atau fallback statis |
| Global | Command palette | `CommandPalette` | tombol buka; shortcut Cmd+K tidak membuka |
| Global | Notification center | `NotificationCenter` | data statis, tidak terhubung findings |
| Global | Reset DB / Sinkron DB | `DataPersistenceControl` | reset dan sinkronisasi terbatas |

Tidak ada route `/dashboard`, `/documents`, `/documents/[id]`, `/findings`, `/findings/[id]`, `/reconciliation`, `/copilot`, `/simulator`, `/audit`, `/reports`, atau `/about`.

### A.3 Peta API aktual

| Route | Method | Fungsi aktual | Status |
|---|---|---|---|
| `/api/status` | GET | Mengembalikan mode env dan boolean integrasi | Live, tetapi tidak dipakai UI |
| `/api/copilot` | POST | Memanggil Gemini API jika key ada; fallback jawaban statis bila tidak | Live kondisional + mock fallback |
| `/api/scan-document` | POST | Menerima JSON nama file, menghasilkan respons sintetis | Mock, tidak dipanggil UI |
| `/api/db/status` | GET | Status engine dan hitungan tabel | Live lokal |
| `/api/db/bootstrap` | GET | Seed jika kosong, lalu mengembalikan seluruh data dashboard | Live lokal |
| `/api/db/sync` | POST | Menulis company, return, payment, calendar, audit log, studies, dan delete | Live lokal, tanpa auth/Zod |
| `/api/db/reset` | POST | Drop/recreate tabel aktif lalu seed ulang | Live lokal, destruktif |
| `/api/workspace` | GET, PUT | Repository workspace Zod terpisah | Live teknis, tidak dipakai UI |

Tidak ada endpoint berikut: `POST /api/demo/load`, `POST /api/documents/extract`, `POST /api/documents/crosscheck`, `POST /api/risk/analyze`, `PATCH /api/findings/:id`, `POST /api/reconciliation/compute`, `POST /api/reconciliation/export`, `POST /api/copilot/ask`, `POST /api/simulator/treaty`, `GET /api/audit`, `GET /api/health`.

### A.4 Modul domain

| Modul | Isi | Dipakai UI/API? | Catatan |
|---|---|---|---|
| `src/lib/domain.ts` | Zod schema entity, ownership, document, finding, return, payment, audit | Tidak oleh UI; hanya workspace API dan type import | Model berbeda dari model `page.tsx` |
| `src/lib/fraud.ts` | Aturan TBTS, missing trader, MyInvois, non-deductible, split invoicing, Z-score | Hanya test | Tidak ada finding UI |
| `src/lib/crossValidation.ts` | Validasi silang nama, tax ID, ownership | Tidak dipakai | Dead code runtime |
| `src/lib/ownership.ts` | Total 100%, circular ownership, relasi yatim | Hanya test | Tidak dipakai UI |
| `src/lib/reconciliation.ts` | Total laba komersial dan koreksi | Hanya test | UI menghitung sendiri |
| `src/lib/tax.ts` | Simulasi CIT, VAT, WHT, Pillar Two sederhana | Hanya test | UI memakai tarif sendiri |
| `src/lib/returns.ts` | Draft return dan XML escaping | Hanya test | UI membuat XML sendiri tanpa escaping |
| `src/lib/adapters/*` | CountryAdapter ID, SG, MY, US | Hanya test | UI memakai data dan tarif sendiri |
| `src/lib/server/rateLimit.ts` | Rate limit memory | Tidak dipakai | Dead code |
| `src/lib/chatMarkdown.ts` | Parser markdown chat | Dipakai UI | Test `.mjs` tidak masuk include Vitest |

### A.5 Alur data aktual

```text
Browser
  -> page.tsx mulai dengan INITIAL_COMPANIES
  -> GET /api/db/bootstrap
       -> ensureDatabaseSeeded()
       -> SQLite/MySQL/memory
       -> seluruh data dikirim ke browser
  -> page.tsx hydrate state
  -> perubahan form/shareholder/calculation/return/payment
       -> state lokal berubah
       -> POST /api/db/sync (fire and forget, response tidak diperiksa)
  -> /api/copilot
       -> Gemini API bila GEMINI_API_KEY ada
       -> fallback statis bila tidak ada atau gagal
  -> /api/scan-document tidak dipanggil UI
  -> /api/workspace tidak dipanggil UI
```

Implikasi: UI tidak memiliki satu sumber kebenaran. `page.tsx`, `seedDatabase.ts`, `domain.ts`, `multiCountryTaxData.ts`, dan default di tiap komponen memiliki model dan angka yang berbeda.

### A.6 Persistensi

`database.ts` memilih engine sebagai berikut:

1. MySQL jika `MYSQL_URL` diisi.
2. `node:sqlite` jika runtime Node menyediakan modul itu.
3. Memory map jika keduanya tidak tersedia.

Tabel aplikasi dibuat dinamis dengan nama `nexora_companies`, `nexora_calculations`, `nexora_tax_returns`, `nexora_payments`, `nexora_calendar_events`, `nexora_audit_logs`, `nexora_studies`, dan `nexora_app_state`. Semuanya menyimpan JSON blob. Tidak ada foreign key, transaksi multi-tabel, tenant, atau versioning.

`sql/schema.mysql.sql` hanya membuat `nexora_workspaces`, bukan tabel yang dipakai UI. `mysql.ts` memiliki repository workspace kedua. Artinya dokumentasi database dan kode runtime tidak sinkron.

Pada Node 20, `node:sqlite` tidak tersedia sehingga CI memakai memory. Pada Docker Node 22, SQLite aktif tetapi file dapat berada di `sql/` atau `/tmp`, yang tidak durable pada Vercel/Cloud Run multi-instance. Ini bukan pengganti database produksi.

---

## B. Tabel Fitur: Berfungsi Nyata vs Mock/Hardcoded

Taksonomi:

- **Live**: benar-benar memanggil layanan eksternal dan terhubung ke UI.
- **Simulasi**: dihitung lokal dan deterministik, bukan integrasi eksternal.
- **Mock/Hardcoded**: respons atau angka statis, atau klaim layanan tanpa panggilan nyata.
- **Sebagian**: ada interaksi nyata, tetapi jalur utama belum lengkap atau tidak konsisten.
- **Belum**: tidak ada implementasi yang dapat dipakai.

| Fitur | Status aktual | Bukti | Catatan |
|---|---|---|---|
| Landing page pemasaran | Belum | `/` langsung membuka workspace | Tidak ada halaman problem/solution/CTA |
| Onboarding "Coba dengan data contoh" | Sebagian | Bootstrap otomatis; tombol aktual `Reset DB` | Tidak ada tombol berlabel `Muat Sample Kasus Nyata` |
| Dashboard ringkasan grup | Mock | Counter entitas aktif/pending di `page.tsx:2740-2782` | Tidak ada jumlah temuan per severity atau estimasi koreksi |
| Badge Demo/Live | Mock / menyesatkan | Badge keras `Google Cloud Document AI + BigQuery Connected`, `page.tsx:2531-2535` | `/api/status` tidak dipakai untuk badge |
| Stepper hero flow | Sebagian | `HeroStepper.tsx`; mapping `page.tsx:1425-1449` | Langkah 3 -> Studies, langkah 4 -> profil korporasi |
| Direktori entitas | Sebagian | `companies`, filter, search, CRUD | Data seed dan data UI berbeda |
| Form profil korporasi | Sebagian | update per field | Tombol Save hanya toast; tidak ada validasi |
| Visual ownership tree | Simulasi | data `structureNodes`, `individualShareholders` | Persentase efektif diambil dari data, bukan dihitung |
| Deteksi circular ownership | Belum di UI | `ownership.ts` hanya test | Tidak ada panggilan dari UI |
| Validasi total saham 100% | Belum di UI | input 1-100 tanpa cek jumlah | `ownership.ts` tidak dipakai |
| CRUD intermediate shareholder | Sebagian | state + sync DB | Tidak ada validasi format tax ID |
| CRUD individual shareholder | Sebagian | `page.tsx` dan tab terpisah | Dua sumber data berbeda |
| Upload dokumen | Mock | `handleRunDocAiVerification`, `page.tsx:1646-1668` | Tidak ada `<input type="file">` |
| Ekstraksi dokumen | Mock | `/api/scan-document` | Tidak menerima file; tidak dipanggil UI |
| Document AI | Belum | tidak ada dependency atau panggilan API | Hanya env, label, dan timer |
| Tampilan dokumen berdampingan | Belum | hanya modal metadata | Tidak ada viewer PDF/gambar |
| Koreksi field manual | Belum | tidak ada field editor | Tidak ada audit log |
| Validasi silang dokumen | Belum di UI | `crossValidation.ts` hanya test | Tidak ada daftar mismatch |
| Fraud engine aturan | Simulasi / dead code | `fraud.ts` lulus test | Tidak terhubung ke UI/API |
| Statistik Z-score | Simulasi / dead code | `fraud.ts:8-14` | Threshold 5 invoice; bukan BigQuery |
| Benford | Belum | tidak ada implementasi | Disebut di dokumen tetapi tidak ada kode |
| Split invoicing | Simulasi / dead code | aturan di `fraud.ts:28` | Tidak tampil di UI |
| Daftar findings | Belum | `auditTransactions` tidak dirender | `page.tsx` tidak mengimpor field ini |
| Detail finding dan evidence | Belum | tidak ada komponen `FindingCard`/`EvidenceList` | Tidak ada skor, confidence, status review |
| Review status dan bulk action | Belum | tidak ada model status di UI | Tidak ada `PATCH /api/findings` |
| Rekonsiliasi fiskal | Sebagian | `CalculationTab` interaktif | Data awal statis; kredit pajak hardcoded |
| Tautan finding ke koreksi | Mock | tombol "Bukti Fraud" navigasi ke Studies | Tidak membuka finding |
| What-if | Sebagian | slider dan multiplier, `CalculationTab.tsx:631-654` | Bukan model skenario penuh |
| WHT calculator | Sebagian | `CalculationTab.tsx:160-184` | PPh 21 memakai tarif flat, bukan TER sesungguhnya |
| Perhitungan PPh Badan | Sebagian | 22% dan 31E untuk ID | Ada risiko pembagian nol; tarif negara lain flat |
| Draf SPT | Sebagian | `TaxReturnTab` | Angka statis dan tidak mengikuti rekonsiliasi |
| Maker-checker | Sebagian | `TaxReturnTab.tsx:83-109` | Hanya state klien; dapat diubah lewat persona/devtools |
| XML export | Sebagian | `TaxReturnTab.tsx:112-161` | XML dibuat sendiri, tidak divalidasi, tidak di-escape |
| JSON export | Sebagian | `TaxReturnTab.tsx:163-193` | File dibuat di browser; form type tidak konsisten |
| PDF summary | Sebagian | `window.print()` di Reports | Bukan generator PDF |
| Payment dan e-Billing | Mock | `PaymentTab.tsx:136-145` | Kode random 16 digit, bukan kode resmi |
| Rekonsiliasi NTPN | Mock | input bebas, `PaymentTab.tsx:115-132` | Tidak ada validasi bank atau otoritas |
| Kalender pajak | Sebagian | CRUD lokal + ICS | Tampilan bulan tidak berbeda dari daftar |
| Reminder kalender | Mock | hanya toast | Tidak ada scheduler |
| Audit trail | Mock | seed log saja | Tidak ada penulisan log dari aksi UI |
| Immutable / SHA-256 | Mock | label di `NotificationCenter.tsx:265-280` | Tidak ada hash chain atau append-only |
| CSV audit | Sebagian | `ReportsTab.tsx:103-126` | Escape CSV belum aman untuk formula injection |
| Executive report | Mock | angka statis `ReportsTab.tsx:202-260` | Tidak membaca state aktual |
| Copilot live | Live kondisional | `POST /api/copilot`, `route.ts:176-231` | Memanggil Gemini API langsung, bukan Vertex AI |
| Copilot fallback | Mock | `route.ts:16-174` | Jawaban keyword statis, confidence 99% |
| RAG / korpus bersitasi | Belum | tidak ada SourceDocument atau retrieval | Sitasi hanya string |
| Simulator P3B | Simulasi | `StudiesTab.tsx:107-134` | Hanya ID-SG yang khusus; lainnya 15% generik |
| Simulator Pillar Two | Simulasi | `StudiesTab.tsx:137-144` | Tidak memodelkan substance carve-out, safe harbor, atau aturan penuh |
| RBAC | Mock | `USER_PERSONAS`; guard hanya di klik UI | Tidak ada otorisasi server |
| Command palette | Sebagian | tombol buka; Cmd+K hanya menutup | Daftar entitas statis |
| Notification center | Mock | notifikasi statis | Tidak terhubung findings atau approval |
| i18n ID/EN | Belum | string hardcoded | `lang="id"` tetapi banyak teks Inggris |
| Empty/loading/error state | Sebagian | beberapa empty state dan fake progress | Banyak error ditelan diam-diam |
| Aksesibilitas | Sebagian | beberapa `aria-label`, reduced motion | Tidak ada dialog semantics/focus trap/aria-live |
| API health | Belum | tidak ada `/api/health` | `/api/status` bukan health lengkap |
| Audit API | Belum | tidak ada `GET /api/audit` | Audit hanya dari seed DB |
| Evaluasi dan ground truth | Belum | tidak ada `src/data/sample` atau `npm run eval` | Tidak ada precision/recall terukur |

---

## C. Layanan Google Cloud: Dipanggil vs Hanya Disebut

| Layanan | Dipanggil aktual? | Bukti | Status jujur |
|---|---|---|---|
| Gemini API (`gemini-2.5-flash`) | Ya, kondisional | `fetch` ke `generativelanguage.googleapis.com` di `src/app/api/copilot/route.ts:188-209` | **Live** hanya jika `GEMINI_API_KEY` valid; fallback statis bila gagal |
| Vertex AI | Tidak | tidak ada SDK/import; hanya label dan env | **Belum** |
| Vertex AI Search / RAG | Tidak | tidak ada retrieval, index, atau corpus | **Belum** |
| Document AI | Tidak | tidak ada panggilan API; hanya `DOCUMENT_AI_PROCESSOR_ID` dan label | **Belum** |
| BigQuery | Tidak | tidak ada client, query, atau sink; hanya label dan `BIGQUERY_DATASET` | **Belum** |
| Cloud Run | Belum terverifikasi | Dockerfile ada; tidak ada bukti image/deploy/health check | **Belum terverifikasi** |
| Cloud SQL / MySQL | Kondisional | `mysql2` dipakai bila `MYSQL_URL` diisi | **Live teknis** untuk persistence, bukan untuk layanan pajak |
| Cloud Storage | Tidak | tidak ada upload atau bucket | **Belum** |
| Secret Manager | Tidak | tidak ada client; env langsung | **Belum** |
| Google Calendar API | Tidak | hanya file `.ics` lokal | **Simulasi** |
| DJP Coretax | Tidak | hanya label dan format internal | **Belum** |
| IRAS, LHDN, IRS | Tidak | hanya teks dan tarif statis | **Belum** |
| Vercel | Ya untuk deployment | URL merespons 200 | **Live deploy**, tetapi kemungkinan build lama |

### C.1 Bukti klaim yang menyesatkan

`page.tsx:2531-2535` selalu menampilkan:

```text
Google Cloud Document AI + BigQuery Connected
```

Badge ini tidak membaca `/api/status`, tidak membaca hasil `/api/db/status`, dan tidak berubah ketika `documentAi` atau `bigQuery` false. Ini adalah klaim integrasi yang tidak benar.

`/api/copilot` mengembalikan label seperti `Vertex AI Gemini 2.5 Flash + Vertex AI Search` untuk jawaban fallback statis. Label itu tidak menunjukkan bahwa jawaban berasal dari keyword matching dan confidence hardcoded.

---

## D. Bug, Dead Code, Duplikasi, Keamanan, UX, dan Aksesibilitas

### D.1 Bug fungsional

| ID | Tingkat | Bug | Bukti | Dampak |
|---|---|---|---|---|
| B-01 | Kritis | Field seed SPT tidak cocok dengan field yang dibaca UI | `seedDatabase.ts:504-524` memakai `netFiscalIncome`, `citLiability`, `totalTaxCredits`, `pph29Payable`; `TaxReturnTab.tsx:70-81` membaca `taxableIncome`, `citDue`, `taxCredits`, `taxPayable` | Setelah bootstrap/reset, angka bisa menjadi `Rp NaN`; XML berisi `undefined` |
| B-02 | Kritis | Tidak ada UI findings | `auditTransactions` tidak dirender; stepper langkah 3 membuka `StudiesTab` | Hero flow tidak dapat menunjukkan skor, alasan, bukti, atau review |
| B-03 | Kritis | Deployment produksi tidak sinkron dengan branch | `/api/db/status` 404; `/api/status` mengembalikan semua integrasi false | Juri dapat melihat versi lama atau fitur yang tidak ada |
| B-04 | Tinggi | XML export tidak melakukan escaping | `TaxReturnTab.tsx:113-149` menyisipkan `entityName`, `creator.name`, dan `approver.name` langsung | XML invalid atau injeksi struktur |
| B-05 | Tinggi | XML selalu SPT 1771 untuk semua negara | `TaxReturnTab.tsx:119`, `:216`; `countryCode` tidak mengubah root XML | SG/MY/US mengekspor format yang salah |
| B-06 | Tinggi | Data rekonsiliasi tidak mengalir ke SPT | `CalculationTab` dan `TaxReturnTab` memakai state terpisah | Perubahan koreksi tidak mengubah draf return |
| B-07 | Tinggi | Kode billing bukan 15 digit dan bukan resmi | `PaymentTab.tsx:136-145` menghasilkan string 16 digit dan menyebutnya terbitan DJP | Klaim pembayaran/e-Billing tidak dapat dipertahankan |
| B-08 | Tinggi | NTPN tidak divalidasi | `PaymentTab.tsx:115-132` menerima teks bebas | Status pembayaran dapat salah |
| B-09 | Tinggi | Tidak ada penulisan audit log dari aksi UI | `dbAddAuditLog` hanya dipanggil seed dan route generik | Audit trail tidak mencerminkan aksi pengguna |
| B-10 | Tinggi | Reset DB dapat memusnahkan data tanpa auth/konfirmasi | `db/reset/route.ts:8-16`; `DataPersistenceControl.tsx:103-113` | Siapa pun dapat melakukan drop/reseed |
| B-11 | Tinggi | Reset tidak memperbarui semua state UI dengan aman | `handleResetSampleData` hanya mengisi field yang ada; data lain tetap | UI dapat menampilkan campuran data lama dan baru |
| B-12 | Tinggi | Seed data dan `INITIAL_COMPANIES` berbeda | `page.tsx:305+` vs `seedDatabase.ts:15+` | Nama pemegang saham, persentase, dan angka berbeda antar tab |
| B-13 | Sedang | Country selector tidak di-sync ke DB | `page.tsx:3192-3209` hanya `setCompanies` | Refresh mengembalikan negara lama |
| B-14 | Sedang | Tombol Save profil hanya toast | `page.tsx:4250-4260` | Pengguna mengira tersimpan, padahal perubahan terjadi per keystroke atau tidak lengkap |
| B-15 | Sedang | `activeBillingSlip` tidak ikut diperbarui saat kode baru dibuat | `PaymentTab.tsx:97`, `:136-145` | Kode yang terlihat bisa tetap kode lama |
| B-16 | Sedang | Formula 31E dapat menghasilkan `NaN`/nilai negatif | `CalculationTab.tsx:98-105` membagi `4.800.000.000 / rev`; `rev` dapat 0 | Perhitungan pajak tidak aman untuk input kosong |
| B-17 | Sedang | `fiscalAmount` baris tidak sama dengan formula total | `CalculationTab.tsx:81-92`, `:144` | Tampilan baris dan total dapat berbeda |
| B-18 | Sedang | Kalender memberi label SG untuk MY/US | `TaxCalendarTab.tsx:130` memakai `countryCode === 'ID' ? ID : SG` | Tugas entitas MY/US salah yurisdiksi |
| B-19 | Sedang | Tampilan bulan kalender tidak berbeda dari daftar | `TaxCalendarTab.tsx:32`, `:240-257`, `:261-313` | Kontrol tampilan menyesatkan |
| B-20 | Sedang | Statistik Reports tidak mengikuti state | `ReportsTab.tsx:202-260` statis | Laporan eksekutif tidak dapat dipercaya |
| B-21 | Sedang | Semua persona non-CEO/CFO dipetakan ke Konsultan Pajak | `page.tsx:4348` | Viewer/Auditor tidak memiliki perilaku role yang benar |
| B-22 | Sedang | `api/copilot` menandai fallback sebagai Live | `route.ts:211-224`; fallback juga dilabeli engine Vertex | Mode tidak transparan |
| B-23 | Sedang | `api/copilot` tidak punya timeout/retry | `route.ts:188-209` hanya `fetch` | Request dapat menggantung |
| B-24 | Sedang | `api/status` tidak dipakai untuk badge | `page.tsx:2531-2535` vs `api/status/route.ts` | Status integrasi tidak jujur |
| B-25 | Sedang | `getDatabaseStatus` MySQL dapat mengembalikan connected true meski semua tabel gagal | `database.ts:333-357` menangkap error per tabel dan tetap `connected: true` | UI dapat menampilkan DB terhubung padahal tidak |
| B-26 | Sedang | `DataPersistenceControl` default connected true | `DataPersistenceControl.tsx:22-37` | Status koneksi awal menyesatkan |
| B-27 | Sedang | `getAllUnifiedData` hanya mengambil tax return `ENT-ID-001` | `database.ts:781` | Entitas lain menampilkan return yang salah |
| B-28 | Rendah | Command palette tidak bisa dibuka dengan Cmd+K | `CommandPalette.tsx:27-40` hanya menutup saat sudah terbuka | Shortcut yang dijanjikan tidak berfungsi |
| B-29 | Rendah | Test chatMarkdown tidak dijalankan | `vitest.config.mts:3` hanya `test/**/*.test.ts`; file `test/chatMarkdown.test.mjs` | Test file terlihat ada tetapi tidak masuk suite |
| B-30 | Rendah | E2E memakai selector lama | `e2e/smoke.spec.ts` | 5 dari 5 test gagal |

### D.2 Dead code dan duplikasi

| Item | Kondisi | Bukti |
|---|---|---|
| `src/app/page.tsx` | 6.495 baris, satu client component | seluruh UI dan state utama |
| `src/lib/fraud.ts` | Tidak dipanggil runtime | hanya `test/domain.test.ts` |
| `src/lib/crossValidation.ts` | Tidak dipanggil runtime | tidak ada importer |
| `src/lib/ownership.ts` | Tidak dipanggil runtime | hanya test |
| `src/lib/reconciliation.ts` | Tidak dipanggil runtime | UI punya kalkulasi sendiri |
| `src/lib/tax.ts` | Tidak dipanggil runtime | UI punya tarif sendiri |
| `src/lib/returns.ts` | Tidak dipanggil runtime | UI punya XML sendiri |
| `src/lib/adapters/*` | Tidak dipakai UI | hanya test dan config |
| `src/lib/server/rateLimit.ts` | Tidak dipakai | tidak ada pemanggil |
| `/api/scan-document` | Tidak dipanggil UI | endpoint sintetis |
| `/api/workspace` | Tidak dipanggil UI | repository terpisah |
| `mysql.ts` | Repository workspace kedua | tidak menyimpan data UI |
| `database.ts` | Repository JSON tabel pertama | dipakai UI |
| `public/index-standalone.html` | Prototipe lama 533 baris | tidak ditautkan dari app |
| `sql/schema.mysql.sql` | Hanya tabel workspace | tidak sesuai tabel runtime |
| Data source | `INITIAL_COMPANIES`, `SEED_COMPANIES`, `MULTI_COUNTRY_DATA`, component defaults | minimal empat sumber berbeda |
| Tarif pajak | `tax.ts`, `taxRules.*.json`, adapter, `multiCountryTaxData.ts`, komponen | tidak satu sumber |
| CountryCode | `domain.ts` dan `multiCountryTaxData.ts` | duplikasi tipe |

Contoh duplikasi yang material:

- `TaxReturnTab` memakai angka default Rp 168.350.000 koreksi positif, Rp 184.545.000 PPh, dan Rp 145.000.000 kredit.
- `seedDatabase.ts` memakai koreksi positif Rp 120.000.000, PPh Rp 120.450.000, dan kredit Rp 80.905.000.
- `ReportsTab` memakai angka default Rp 168.350.000 dan Rp 184.545.000 tanpa membaca state return.
- `CalculationTab` memakai kredit pajak hardcoded Rp 145.000.000 untuk semua negara.

### D.3 Keamanan dan privasi

| ID | Tingkat | Temuan | Bukti | Mitigasi yang diperlukan |
|---|---|---|---|---|
| S-01 | Kritis | Tidak ada autentikasi/otorisasi pada API baca/tulis/reset | semua route `db/*`, `workspace` | Auth, session, tenant, role server, CSRF/origin |
| S-02 | Kritis | Data PII-shaped dikirim ke semua browser | `page.tsx` berisi NIK, NPWP, email, alamat, nomor paspor/SSN-shaped; `/api/db/bootstrap` mengembalikan data | Ganti dengan fixture anonim, masking server-side, kurangi data |
| S-03 | Tinggi | `/api/db/sync` menerima payload bebas tanpa Zod/limit | `db/sync/route.ts:19-55` | Schema per operasi, allow-list, ukuran, transaksi |
| S-04 | Tinggi | `/api/db/reset` destruktif tanpa proteksi | `db/reset/route.ts:8-16` | Nonaktifkan di production atau admin-only + konfirmasi |
| S-05 | Tinggi | `/api/copilot` menerima API key dari body klien | `copilot/route.ts:179-184` | Hapus jalur kunci klien; gunakan secret server-only |
| S-06 | Tinggi | Tidak ada rate limit/timeout/retry pada route AI | `rateLimit.ts` tidak dipakai | Terapkan limit per IP, timeout, backoff, fallback transparan |
| S-07 | Tinggi | Tidak ada perlindungan prompt injection | `copilot/route.ts` menerima prompt langsung; tidak ada pemisahan data/instruksi | Sanitasi, instruksi sistem terpisah, tolak instruksi tersembunyi |
| S-08 | Tinggi | Tidak ada CSP/HSTS | `next.config.mjs:11-24` | Tambahkan CSP, HSTS, frame-ancestors |
| S-09 | Sedang | `X-XSS-Protection` sudah usang dan bukan mitigasi | `next.config.mjs:19` | Hapus atau ganti dengan CSP |
| S-10 | Sedang | XML/CSV/ICS berisiko injeksi | `TaxReturnTab.tsx:113-149`, `ReportsTab.tsx:106-116`, `TaxCalendarTab.tsx:158-170` | Escape standar per format, formula neutralization |
| S-11 | Sedang | Error API membocorkan detail internal | route `db/*` mengembalikan `err.message` | Pesan berkode, correlation id, log server |
| S-12 | Sedang | `.dockerignore` tidak mengecualikan semua env/credential | `.dockerignore`; `Dockerfile:13` `COPY . .` | Exclude `.env*`, service account, DB, test |
| S-13 | Sedang | `.gitignore` belum mencakup semua varian `.env` dan credential JSON | `.gitignore` | Perluas pola |
| S-14 | Sedang | Rate limit memory per instance tidak cocok Cloud Run multi-replica | `rateLimit.ts` | Gunakan Redis/Cloud Armor atau batas platform |
| S-15 | Rendah | `api/db/status` mengekspos storage path | `database.ts:325-330` | Mask path, health minimal |

Hasil pemeriksaan secret:

- Tidak ada `.env` yang ter-commit.
- Hanya `.env.example` yang dilacak.
- Tidak ditemukan pola `AIza...`, private key, atau `sk-...`.
- Tidak ditemukan `GEMINI_API_KEY` atau `MYSQL_URL` di `.next/static`.
- Tidak ditemukan key di HTML production yang diambil.

### D.4 UX

| Masalah | Bukti | Dampak |
|---|---|---|
| Tidak ada landing problem/solution | `/` langsung workspace | Juri tidak mendapat konteks 20 detik pertama |
| Label demo tidak ada | `Muat Sample Kasus Nyata` dan `Simulasi Lokal` tidak ditemukan di `src/` | Skrip demo tidak cocok dengan UI |
| Klaim sukses palsu | toast Save, upload, billing, Search | Kepercayaan pengguna rusak jika dicoba |
| Error ditelan | `syncToDatabase` hanya `console.warn` | Data hilang tanpa notifikasi |
| Tidak ada konfirmasi reset/delete | `handleDeleteCompany`, `Reset DB` | Risiko kehilangan data demo |
| Status integrasi menyesatkan | badge header, engine fallback | Risiko kredibilitas saat Q&A |
| Bahasa campur | UI Indonesia/Inggris | Tidak konsisten untuk juri internasional |
| Tabel lebar di mobile | banyak `overflow-x-auto` dan `min-w` | Pengalaman mobile buruk |
| Empty/loading state tidak konsisten | fake progress, beberapa empty state saja | Terlihat belum selesai |
| Angka lintas tab tidak konsisten | seed vs default vs Reports | Sulit dipercaya saat demo |

### D.5 Aksesibilitas

| Masalah | Bukti | Dampak |
|---|---|---|
| Modal bukan dialog semantik | modal di `page.tsx`, `CalculationTab`, `PaymentTab`, `TaxCalendarTab`, `IndividualShareholdersTab` | Screen reader dan keyboard tidak mendapat konteks |
| Tidak ada focus trap/restore | semua modal | Fokus dapat keluar ke background |
| Toast/loading tidak diumumkan | tidak ada `aria-live` | Perubahan status tidak terbaca |
| Baris clickable bukan button/link | Payment rows, notification rows | Tidak dapat dioperasikan keyboard dengan benar |
| Tombol ikon tanpa label konsisten | banyak tombol `title` saja | Nama aksesibel tidak konsisten |
| Command palette tanpa arrow/Enter | `CommandPalette.tsx` | Navigasi keyboard tidak lengkap |
| Tidak ada skip link | layout | Pengguna keyboard harus melewati header panjang |
| Severity tidak memakai ikon + teks + warna | tidak ada severity badge | Tidak ada isu kontras terukur, tetapi pola tidak siap |
| Bahasa halaman | `layout.tsx:16` `lang="id"` dengan teks Inggris | Pelafalan screen reader tidak konsisten |
| Reduced motion | `globals.css:48-55` | Sudah ada, positif |
| Lighthouse | tidak dijalankan | Belum terverifikasi |

---

## E. Risiko Demo

| Risiko | Kemungkinan | Dampak | Bukti | Mitigasi |
|---|---|---|---|---|
| Production URL menampilkan build lama | Tinggi | Tinggi | `/api/db/status` 404; `/api/status` false; label production berbeda | Deploy ulang branch, verifikasi build hash dan route health |
| `Rp NaN` dan XML `undefined` setelah load/reset | Tinggi | Tinggi | mismatch `seedDatabase.ts:504-524` vs `TaxReturnTab.tsx:70-81` | Satukan tipe `TaxReturnFigures`, migrasi seed, test integrasi |
| Tombol demo yang disebut tidak ada | Tinggi | Tinggi | `Muat Sample Kasus Nyata` dan `Simulasi Lokal` tidak ada di `src/` | Ubah skrip demo atau tambahkan kontrol yang benar |
| Tidak ada layar findings/review | Tinggi | Tinggi | `auditTransactions` tidak dirender; step 3 ke Studies | Bangun layar findings + review sebelum demo |
| Document AI hanya timer | Tinggi | Tinggi | `page.tsx:1646-1668` | Ganti label menjadi simulasi atau implementasi adapter nyata |
| Badge cloud selalu connected | Tinggi | Tinggi | `page.tsx:2531-2535` | Ikat ke `/api/status` dan tampilkan Demo/Live jujur |
| Kalkulasi tidak mengalir ke SPT/payment | Tinggi | Tinggi | state terpisah di `CalculationTab`, `TaxReturnTab`, `PaymentTab` | Satu state/service dan test alur |
| E2E gagal | Tinggi | Sedang untuk demo, Tinggi untuk CI | 5/5 gagal setelah Chromium dipasang | Tulis ulang E2E dengan test id stabil |
| XML/billing diklaim resmi | Sedang | Tinggi | XML tidak divalidasi; billing 16 digit random | Labeli draf dan simulasi; validasi skema publik |
| Copilot menjawab statis tetapi tampil live | Sedang | Tinggi | fallback `route.ts:16-174`, label engine di `:211-224` | Tampilkan mode, hilangkan confidence palsu, tambah RAG |
| SQLite hilang saat restart/scale | Sedang | Sedang | `database.ts:40-59` | Gunakan MySQL/Cloud SQL atau reset demo eksplisit |
| API publik diubah juri/observer | Sedang | Sedang | tidak ada auth di `db/sync`, `db/reset` | Read-only mode demo, token admin, disable reset |
| Mobile/tablet rusak | Sedang | Sedang | banyak tabel lebar | Uji viewport, buat card/list responsive |
| Data 2026 menjadi stale setelah tahun berganti | Rendah saat ini, Tinggi setelah 2026 | Sedang | tanggal hardcoded | Parameter tahun dan zona waktu |
| Build Docker gagal | Belum terverifikasi | Sedang | Dockerfile belum dijalankan | `docker build` di CI dan health check |
| MySQL tidak tersedia | Sedang | Sedang | fallback SQLite/memory | Tampilkan mode storage di UI, siapkan DB demo |

---

## F. Hutang Teknis dan Estimasi Usaha

Estimasi S/M/L adalah perkiraan kasar, bukan komitmen jadwal.

### F.1 Ukuran S: beberapa jam sampai 1 hari

| Item | Alasan |
|---|---|
| Perbaiki mapping field seed SPT dan tambahkan tipe bersama | Mencegah `NaN` dan XML invalid |
| Ganti badge cloud dengan status `/api/status` | Menghilangkan klaim palsu |
| Tambahkan label Demo/Simulasi yang eksplisit | Kejujuran demo |
| Hapus atau perbaiki label `Muat Sample` pada skrip demo | Menyelaraskan narasi dan UI |
| Escape XML, CSV, dan ICS | Mencegah injeksi format |
| Perbaiki panjang kode billing atau ubah menjadi simulasi eksplisit | Menghindari klaim 15 digit yang salah |
| Masukkan `chatMarkdown.test.mjs` atau hapus | Test suite bersih |
| Perbaiki selector E2E | Memberi sinyal regresi |
| Tambahkan CSP dasar dan HSTS | Baseline keamanan |
| Perluas `.dockerignore` dan `.gitignore` | Mengurangi risiko secret |
| Hapus `X-XSS-Protection` | Header usang |
| Tambahkan konfirmasi reset dan disable di production | Mencegah data demo hilang |

### F.2 Ukuran M: 2 sampai 5 hari

| Item | Alasan |
|---|---|
| Satukan model `CorporateEntity` dan schema Zod | Menghilangkan dua sistem data |
| Satukan seed `INITIAL_COMPANIES`, `SEED_COMPANIES`, dan default komponen | Konsistensi lintas tab |
| Hubungkan `CalculationTab` -> `TaxReturnTab` -> `PaymentTab` | Hero flow nyata |
| Tambahkan findings UI, evidence, status review, audit log | Inti diferensiasi |
| Tambahkan API findings dan audit | Server-side workflow |
| Tambahkan Zod dan auth pada `db/sync`, `db/reset`, `workspace` | Keamanan dasar |
| Tambahkan unit/integration test API dan database | Menutup gap test |
| Perluas CI: lint, typecheck, test, build, E2E | Kualitas branch |
| Samakan Node CI/Docker/README | Perilaku SQLite konsisten |
| Tambahkan masking PII di UI dan log | Privasi |
| Tambahkan i18n dictionary | Konsistensi bahasa |
| Buat dataset sampel terpadu dan ground truth | Dasar evaluasi |
| Tambahkan `npm run eval` untuk aturan dan ekstraksi | Klaim terukur |

### F.3 Ukuran L: lebih dari 1 minggu

| Item | Alasan |
|---|---|
| Pecah `page.tsx` menjadi route dan komponen | Maintainability dan testability |
| Implementasi upload file, storage, dan Document AI adapter nyata | Dokumen intelligence sesungguhnya |
| Implementasi RAG corpus dengan chunk, citation, dan eval groundedness | Mencegah halusinasi regulasi |
| Implementasi BigQuery/Vertex AI bila akan diklaim live | Klaim cloud yang dapat diaudit |
| Ganti dua sistem persistence dengan satu repository durable | Data konsisten dan scalable |
| Bangun workflow review, maker-checker server-side, dan audit append-only | Kepatuhan BFSI |
| Bangun E2E hero flow penuh dengan fixture dan auth | Keyakinan demo |
| Audit aksesibilitas dan Lighthouse penuh | Kualitas produk |

---

## G. Pemetaan Klaim README ke Status Nyata

| Klaim README | Status | Bukti / koreksi |
|---|---|---|
| Production live di `nexora-chi-cyan.vercel.app` | Sebagian | URL 200, tetapi `/api/db/status` 404 dan `/api/status` false; branch parity belum terverifikasi |
| Next.js 15.1, React 19.0, TypeScript 5.7, Tailwind 4 | Sebagian | Build memakai Next 15.5.28 dan React 19.3.1; versi patch berbeda, bukan masalah utama |
| 25 test Vitest lulus | Terverifikasi | `npm run test`: 2 file, 25 test lulus |
| ESLint 9 | Terverifikasi | `npm run lint` lulus |
| Indonesia full, SG/MY/US preview | Sebagian | Adapter punya `status: preview`, tetapi UI tidak menampilkan badge preview per negara |
| ISO/IEC 27001 maker-checker audit | Tidak akurat | Tidak ada sertifikasi ISO; maker-checker hanya UI |
| Platform enterprise-grade | Tidak terverifikasi | Tidak ada bukti production, auth, atau audit eksternal |
| 7-stage hero flow | Sebagian | Stepper ada, tetapi tujuan langkah tidak sesuai dan tidak ada findings/review |
| Zero dead buttons dan zero hollow views | Tidak akurat | Save, Search, upload, reminder, auto-remediate, dan beberapa tombol hanya toast atau statis |
| Tanpa login | Terverifikasi | Tidak ada login; ini juga berarti tidak ada otorisasi |
| 1-click `Muat Sample Kasus Nyata` | Tidak akurat | String tidak ditemukan di `src/`; kontrol aktual `Reset DB` |
| Ownership graph dan effective ownership | Sebagian | Tree visual ada; persentase efektif tidak dihitung dan tidak ada deteksi siklus |
| Deteksi circular ownership dan 100% | Tidak akurat | `ownership.ts` hanya test; UI tidak memanggilnya |
| Upload PDF/JPEG/PNG hingga 10 MB | Tidak akurat | Tidak ada input file; schema 10 MB tidak dipakai |
| Live Gemini Vision extraction | Tidak akurat | Tidak ada panggilan Gemini Vision; upload hanya timer |
| Smart Demo deterministic extraction | Sebagian | Route scan-document sintetis, tetapi tidak dipanggil UI |
| Z-score minimum 5 invoice | Sebagian | Ada di `fraud.ts`, tetapi tidak dipakai UI |
| Local fraud rules dan legal basis | Tidak akurat | Aturan ada di test; UI hanya data statis dan tidak menampilkan finding |
| Fiscal reconciliation otomatis | Sebagian | Tabel interaktif, data awal statis, kredit hardcoded |
| PPh 31E untuk omzet di bawah Rp 50 miliar | Sebagian | Ada logika; input nol dapat menghasilkan masalah |
| WHT 21 TER, 23, 4(2), 26 | Sebagian | Kalkulator ada, tetapi PPh 21 memakai tarif flat bukan TER penuh |
| What-if sensitivity | Sebagian | Slider multiplier sederhana, bukan model penuh |
| SPT 1771 Induk dan lampiran | Sebagian | UI draft ada; angka tidak tersambung ke rekonsiliasi |
| Maker-checker tidak boleh self-approve | Sebagian | Hanya state klien; tidak ada enforcement server |
| XML siap impor Coretax | Tidak akurat | XML internal, tidak divalidasi, tidak di-escape, selalu 1771 |
| JSON dan PDF | Sebagian | JSON download berfungsi; PDF hanya print browser |
| Kode billing 15 digit | Tidak akurat | Generator menghasilkan 16 digit dan random |
| NTPN dan validasi bank | Tidak akurat | Input bebas, tidak ada validasi |
| Kalender .ics | Terverifikasi | File .ics dibuat lokal; bukan Google Calendar API |
| Immutable audit trail dan CSV | Sebagian | CSV berfungsi; audit tidak immutable dan UI tidak menulis log |
| Country adapter layer | Sebagian | Kode adapter ada dan diuji; UI tidak memakainya |
| Gemini live hanya server-side | Terverifikasi | `fetch` dilakukan di route server; key tidak di bundle |
| Demo mode tanpa API key | Terverifikasi | Fallback statis berjalan tanpa key |
| Document AI architecture slot | Sebagian | Hanya env/label; tidak ada adapter atau panggilan |
| BigQuery sink | Tidak akurat | Tidak ada panggilan BigQuery |
| MySQL/Cloud SQL | Sebagian | `mysql2` ada; default SQLite/memory; migration tidak lengkap |
| Tidak pernah memalsukan koneksi cloud | Tidak akurat | Badge header dan label fallback justru memalsukan koneksi |
| Node 18+ dan MySQL optional | Sebagian | Node 18 tidak punya `node:sqlite`; fallback actual adalah SQLite atau memory |
| Lint, typecheck, test, build | Terverifikasi | Semua lulus saat audit |
| Playwright smoke lulus | Tidak akurat | 5 dari 5 gagal |
| RBAC 5 role dan ISO 27001 governance | Tidak akurat | Hanya persona UI; tidak ada enforcement server |
| MIT License | Terverifikasi | `LICENSE` ada; bukan bagian audit hukum |

---

## H. Pemetaan Klaim Submission Guide

| Klaim | Status | Koreksi |
|---|---|---|
| Problem statement dan dampak finansial | Asumsi | Tidak ada sumber yang dilampirkan; angka dampak harus ditandai asumsi |
| Fictitious invoice/TBTS dan MTIC | Sebagian | Ada data statis dan aturan test; tidak ada UI findings |
| Pillar Two 15% | Sebagian | Simulator sederhana; tidak memodelkan aturan GloBE penuh |
| 7-stage hero flow | Sebagian | Stepper ada; alur tidak end-to-end |
| Gemini Vision extraction | Tidak akurat | Tidak ada upload atau Vision call |
| Explainable fraud engine | Tidak akurat | Evidence dan review tidak tampil |
| Automated reconciliation | Sebagian | Tabel ada; angka dan kredit statis |
| SPT 1771 resmi | Tidak akurat | Draft internal, bukan format resmi tervalidasi |
| Maker-checker | Sebagian | Client-side saja |
| XML Coretax | Tidak akurat | Tidak ada validasi skema publik |
| 15-digit e-Billing | Tidak akurat | 16 digit random |
| Immutable audit trail | Tidak akurat | Seed log read-only; tidak ada hash chain |
| Cloud Run production | Belum terverifikasi | Dockerfile ada; tidak ada bukti deploy/health |
| BigQuery live sink | Tidak akurat | Tidak ada panggilan |
| Document AI adapter | Sebagian | Hanya slot env |
| Cloud SQL/MySQL | Sebagian | Didukung lewat `MYSQL_URL`, bukan default |
| Zero dead buttons dan zero hollow views | Tidak akurat | Banyak tombol mock/statis |
| 1-click sample data | Sebagian | Auto-load/reset, label tidak sesuai |
| Pluggable adapters | Sebagian | Ada di code/test, tidak dipakai UI |
| Maker-checker strict | Sebagian | Tidak ada auth server |
| 25 unit tests, tsc, ESLint, build | Terverifikasi | Playwright tidak lulus |
| CSP, X-Frame, X-Content headers | Tidak akurat | CSP tidak ada; X-Frame dan X-Content ada |
| Masking NPWP/NIK | Sebagian | Sebagian tab memasking, tabel utama menampilkan nilai mentah |

---

## I. Hasil Verifikasi Fase 0

Perintah dijalankan pada 2026-10-27 dari root repo.

| Perintah | Hasil |
|---|---|
| `npm run lint` | Lulus, tidak ada error/warning yang dicetak |
| `npm run typecheck` | Lulus, `tsc --noEmit` tanpa error |
| `npm run test` | Lulus, 2 test file, 25 test, 140 ms |
| `npm run build` | Lulus, Next.js 15.5.28, 11 route, route `/` 81.5 kB, First Load JS 184 kB |
| `npm run test:e2e` | Gagal, 5/5 test gagal karena selector/teks lama |
| `npm audit --omit=dev` | 2 vulnerability: 1 high (postcss transitive di Next), 1 moderate (Next); fix yang tersedia adalah Next 16 major |
| Secret scan repo | Tidak ditemukan secret yang ter-commit |
| Secret scan `.next/static` | Tidak ditemukan nama env/key sensitif |
| Production URL | HTTP 200, tetapi `/api/db/status` 404 dan `/api/status` false |

Catatan E2E: browser Chromium sudah dipasang untuk audit. Kegagalan bukan karena browser hilang, melainkan karena selector seperti `Mode Manual`, `Kalkulasi Pajak`, `Draf SPT & Return`, dan `Pemegang Saham` tidak ada di UI saat ini.

### Status yang belum terverifikasi

- Lighthouse/axe dan audit kontras WCAG.
- `docker build` dan deploy Cloud Run.
- Koneksi MySQL/Cloud SQL nyata.
- Panggilan Gemini dengan API key valid.
- Perilaku di Safari, Firefox, dan perangkat mobile fisik.
- Kesesuaian tarif dan sitasi dengan sumber resmi terbaru.
- Branch parity production Vercel.

---

## J. Checklist Fase 0

- [x] `docs/AUDIT.md` ada dan diperbarui.
- [x] Peta arsitektur aktual, route, komponen, modul, dan alur data.
- [x] Tabel fitur nyata vs simulasi vs mock vs belum.
- [x] Tabel layanan Google Cloud yang dipanggil vs disebut.
- [x] Daftar bug, dead code, duplikasi, keamanan, UX, dan aksesibilitas.
- [x] Risiko demo dengan kemungkinan dan mitigasi.
- [x] Hutang teknis dengan estimasi S/M/L.
- [x] Klaim README dipetakan ke status nyata.
- [x] Klaim submission guide dipetakan ke status nyata.
- [x] Tidak ada perubahan kode aplikasi pada fase ini.

---

## K. Rekomendasi untuk Fase 1

1. Tulis ulang `docs/PRODUCT.md` agar hanya menjanjikan alur yang dapat dibuktikan, dengan Indonesia sebagai alur penuh dan SG/MY/US sebagai preview.
2. Tetapkan satu definisi hero flow yang benar-benar bisa didemokan: upload atau dataset contoh -> ekstraksi -> validasi -> finding -> review -> rekonsiliasi -> draf -> audit.
3. Jadikan kejujuran status sebagai syarat produk: Demo, Simulasi, Preview, Live, dan Belum harus tampil konsisten di UI dan dokumen.
4. Prioritaskan perbaikan data kontrak dan seed SPT sebelum menambah fitur, karena saat ini alur utama dapat menampilkan angka tidak valid.
5. Siapkan dataset sampel dan ground truth sebelum mengklaim akurasi, precision, recall, atau tingkat deteksi.
