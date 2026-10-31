# Nexora — Architectural & Product Decision Log (ADR)

> **Document**: `/docs/DECISIONS.md`  
> **Purpose**: Record all significant architectural, design, tax domain, and implementation trade-offs.

---

## ADR 001: Graceful Memory Workspace Fallback for Zero-Config Demos

- **Context**: The existing `/api/workspace` route returned HTTP 503 if `MYSQL_URL` was not configured. This broke local dev environments and online demos without dedicated databases.
- **Decision**: Introduce a `MemoryWorkspaceRepository` implementation that automatically takes over if `MYSQL_URL` is omitted. The repository interface remains identical. In the UI, state is stored in memory and synchronized across tabs.
- **Consequences**: Demos never fail due to database timeouts or missing credentials. If MySQL is provided, it persists to Cloud SQL seamlessly.

---

## ADR 002: Transparent Dual-Engine AI Architecture (Live vs Demo)

- **Context**: Jurors and users must know whether an inference is powered by live Google Cloud Document AI & Gemini models or running in deterministic simulation. Previous UI versions displayed a hardcoded "Connected" status even when offline.
- **Decision**: 
  - Standardize `AIEngine` contract with strict Zod parsing.
  - Implement `LiveEngine` (`@google/genai` + Document AI REST client).
  - Implement `DemoEngine` with realistic deterministic responses based on actual Indonesian tax cases.
  - In the header, display an honest status badge: **"Live Gemini"** (green) if `GEMINI_API_KEY` is present and functional, or **"Demo Mode (Simulasi)"** (amber/blue) with a descriptive tooltip explaining that all calculations run locally with full determinism.
- **Consequences**: Eliminates misleading claims, builds trust with technical judges, and ensures zero risk of failed demo if internet or API keys fail.

- **Implementation status per 2026-10-27**: **Belum diterapkan sepenuhnya**. Belum ada kontrak `AIEngine`, `LiveEngine`, `DemoEngine`, atau Document AI client. UI masih menampilkan badge cloud hardcoded dan fallback Copilot masih memberi label Vertex AI. Lihat `docs/AUDIT.md` B-22, B-24, dan tabel fitur.

---

## ADR 003: Country Adapter Separation with Explicit Preview Labeling

- **Context**: The competition submission focuses on BFSI Track 1. Indonesian corporate tax law (UU HPP / KUP) has the richest fraud detection and reconciliation rules, while Singapore, Malaysia, and US rules are complementary.
- **Decision**: 
  - Establish `CountryAdapter` interface.
  - Deliver **Indonesia (ID)** with complete end-to-end depth: PPh Badan 22%, PPN 11%, PPh 21/23/4(2)/26 withholding, e-Faktur TBTS fraud detection, and SPT 1771 Induk draft.
  - Implement **Singapore (SG)**, **Malaysia (MY)**, and **United States (US)** as structured adapters marked explicitly with `[Preview]` badges across the UI.
- **Consequences**: Provides broad multi-country architectural elegance without overpromising depth where rules are incomplete.

- **Implementation status per 2026-10-27**: **Sebagian**. Adapter ada dan diuji, tetapi UI belum memakai adapter sebagai sumber perhitungan dan belum menampilkan badge Preview per negara. Lihat `docs/AUDIT.md` bagian B dan C.

---

## ADR 004: Decoupling Regulatory Rates from Component Code

- **Context**: Tax rates, VAT percentages, interest rates, and filing deadlines were previously scattered as magic numbers across 6500 lines of `page.tsx`.
- **Decision**: Migrate all rates and statutory deadlines into versioned JSON configuration files (`src/config/taxRules.{id,sg,my,us}.json`). Each rule entry includes the official regulation citation, effective date, and a `verified: true/false` flag.
- **Consequences**: Modifying a tax rate requires no code refactoring. Non-verified or estimated rates can be highlighted in the UI with a "perlu verifikasi" warning.

- **Implementation status per 2026-10-27**: **Sebagian**. File konfigurasi ada, tetapi tarif masih diduplikasi di beberapa modul dan UI; beberapa `verified: true` belum memiliki URL sumber atau tanggal akses. Lihat `docs/AUDIT.md` D.2 dan J.

---

## ADR 005: Enforcement of Separation of Duties (Maker-Checker)

- **Context**: Enterprise compliance requires that the user who drafts a tax return or inputs fiscal adjustments cannot approve their own submission.
- **Decision**:
  - Implement 5 persona roles (`CEO Grup`, `Head of Tax`, `Konsultan Pajak`, `Auditor/Compliance`, `Viewer`).
  - Restrict tax return sign-off and approval actions to roles with `canApproveReturns: true` (e.g. `Head of Tax` or `CEO Grup`).
  - Restrict authoring to `Konsultan Pajak` or `Head of Tax`.
  - Prevent approval if `draft.createdBy === activeUser.id`.
- **Consequences**: Satisfies enterprise BFSI compliance and audit standards.

- **Implementation status per 2026-10-27**: **Sebagian dan belum memenuhi klaim**. Enforcement masih client-side, tidak ada auth/otorisasi server, dan semua persona non-CEO/CFO dipetakan ke Konsultan Pajak. Lihat `docs/AUDIT.md` B-21 dan D.3.

---

## ADR 006: Modularization of Monolithic `page.tsx`

- **Context**: The existing `page.tsx` was over 6500 lines (345KB), combining all views, state, forms, modals, and tables in one giant component. This made testability, code splitting, and bug hunting extremely slow.
- **Decision**: Refactor and extract modular tab components under `src/components/` (e.g., `CompaniesTab`, `CalculationTab`, `TaxReturnTab`, `PaymentTab`, `ShareholdersTab`, `StudiesTab`, `CalendarTab`, `ReportsTab`, `CommandPalette`, `NotificationCenter`).
- **Consequences**: Fast builds, clean test coverage, maintainable codebase, and easy feature addition.

- **Implementation status per 2026-10-27**: **Sebagian**. Beberapa tab sudah diekstrak, tetapi `src/app/page.tsx` masih 6.495 baris dan memegang sebagian besar state, data, modal, dan handler.

---

## ADR 007: Product Scope and Honest Claim Policy for Concept v2

- **Context**: Audit Fase 0 menemukan bahwa narasi produk lebih maju daripada implementasi. Contohnya, halaman selalu menampilkan "Document AI + BigQuery Connected", stepper tidak menuju layar findings, dan beberapa angka SPT tidak konsisten. Submission tidak boleh dibangun di atas klaim yang tidak dapat dibuktikan saat demo.
- **Decision**:
  - Indonesia menjadi satu-satunya jalur **Full**; Singapura, Malaysia, dan Amerika Serikat berstatus **Preview** dan wajib diberi label di UI.
  - Hero flow dioptimalkan untuk kedalaman satu alur: data contoh -> ekstraksi -> validasi silang -> finding -> review manusia -> rekonsiliasi -> draf/ekspor -> audit.
  - Setiap Finding wajib memiliki rule ID, severity, skor, confidence, alasan, evidence, rekomendasi, status review, reviewer, catatan, dan timestamp.
  - Skor risiko adalah heuristik yang dapat dikonfigurasi, bukan probabilitas fraud terkalibrasi. Klaim akurasi hanya boleh muncul setelah `docs/EVAL.md` berisi hasil pengukuran nyata.
  - Demo memakai engine deterministik dan data fiktif. Live AI bersifat opsional, harus fallback secara transparan, dan tidak boleh mengubah kontrak input/output.
  - Isi dokumen diperlakukan sebagai data, bukan instruksi. Instruksi tersembunyi harus ditolak dan dicatat.
  - Semua klaim integrasi memakai label **Live**, **Simulasi**, **Preview**, **Rencana**, atau **Belum**.
  - Tidak ada klaim pengiriman resmi ke DJP, IRAS, LHDN, atau IRS.
- **Consequences**: Cakupan lebih sempit tetapi dapat didemokan dan diaudit. Fitur di luar hero flow ditunda atau diberi label Preview. Tim harus menolak permintaan fitur yang menambah luas tanpa memperkuat alur utama.
- **Related**: `docs/AUDIT.md`, `docs/PRODUCT.md` Bagian 4, 5, 7, 9, dan 13.
