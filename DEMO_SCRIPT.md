# Nexora — 3-Minute Jury Demo Script
## Google Cloud AI Builder Cup 2026 (Track 1: BFSI)

> **Presenter Persona**: Principal Engineer & FinTech Product Strategist  
> **Target Audience**: BFSI Judges & Evaluation Panel  
> **Duration**: Exactly 3 Minutes (180 Seconds)  
> **Live Demo URL**: [https://nexora-chi-cyan.vercel.app](https://nexora-chi-cyan.vercel.app)  
> **Prerequisites**: Zero login. Works without an API key (every AI surface is labelled *Simulasi lokal · offline*); set `GEMINI_API_KEY` on the server to show *Gemini · live*.

---

## Second-by-Second Presentation Roadmap

| Timestamp | Screen / Action | Key points |
|---|---|---|
| **0:00 – 0:20** | **Ringkasan** — open the app (lands on `/overview`). Point at the action centre, entity scores and the 6-step cycle in the sidebar. | One place shows what the group owes, what is risky, and what to do next. No login, no API key. |
| **0:20 – 0:35** | **1 · Entitas & struktur** — org chart → open *PT Nusantara Kreasi Digital Tbk* → Struktur tab (share register ≠ 100% warning). | Group structure drives scope, consolidation, Pillar Two threshold and access rights. |
| **0:35 – 0:50** | **2 · Dokumen** — *Unggah dokumen* → drop `faktur-pt-sinar-abadi.pdf` → point at the engine badge (*Gemini · live* or *Simulasi lokal*) → save. Toast offers *Buka kasus*. | Extraction fills fields with per-field confidence and says which engine read them; it never marks a vendor as validated. |
| **0:50 – 1:30** | **3 · Kasus** — open *Faktur Pajak TBTS* (tab *Selesai*): failing checks, flagged fields (NPWP, PPN), rule basis. Show the **Jejak Rupiah**: +Rp 120 jt PKP → +Rp 13,2 jt PPh with Pasal 31E, not the Rp 26,4 jt flat estimate. Open *Investigasi AI* → *Jalankan investigasi*: tool steps, brief lines citing step numbers, a suggestion (not a decision). *Tanya Copilot* → numbered sources; ask for a share price → refused. | AI investigates and drafts; every claim is cited; people decide. |
| **1:30 – 1:55** | **3 · Kasus (maker-checker)** — tab *Perlu keputusan* → *Biaya tanpa bukti (CV Prima, Rp 13.875.000)* → *Pakai draf catatan* (after running the investigation) or write a note → *Ajukan ke checker* → approval blocked → *Masuk sebagai Dewi Anggraini* → *Setujui* → tab *Selesai* → *Terapkan*. | Maker-checker is enforced, and the decision flows straight into the books. |
| **1:55 – 2:15** | **4 · Rekonsiliasi fiskal** — account 6300 now carries the new correction (linked badge); toggle Pasal 31E; show what-if. | Deterministic CIT per country (ID 31E, SG PTE, MY SME, US 21%). |
| **2:15 – 2:40** | **5 · SPT tahunan** — pre-submission checks → *Setujui* (as CFO) → *Terbitkan kode billing* → export XML. | Return is generated from the reconciliation; approval locks the numbers. |
| **2:40 – 3:00** | **6 · Pembayaran** → *Bayar* → enter NTPN. Close on **Laporan & audit → Jejak audit**, which also records each AI investigation and the engine that ran it. | From invoice to NTPN with a complete, exportable audit trail. |

---

## Backup FAQs for Q&A Session

### Q1: "Mengapa tidak semua fitur menggunakan LLM?"
> **Jawaban**: *"Perhitungan pajak, skor, aturan fraud, dan maker-checker harus deterministik: tarif Pasal 31E atau kode billing tidak boleh berhalusinasi. Gemini dipakai di tempat ia kuat: membaca dokumen, memilih alat pemeriksaan saat investigasi kasus (function calling), dan menjelaskan dengan sumber. Setiap kalimat ringkasan wajib menyebut langkah alat yang mendukungnya, dan keputusan tetap di tangan maker dan checker."*

### Q2: "Bagaimana Nexora menangani multi-negara di luar Indonesia?"
> **Jawaban**: *"Nexora memiliki Country Adapter Layer terisolasi (`src/lib/adapters/`). Saat ini Indonesia memiliki kedalaman penuh (P0), sementara Singapura (Form C-S & GST), Malaysia (MyInvois & Form C), dan US (Form 1120) tersedia dalam status preview dengan aturan perpajakan terversi (`src/config/taxRules.*.json`)."*

### Q3: "Apakah ada risiko kebocoran data rahasia perusahaan?"
> **Jawaban**: *"Tanpa API key, tidak ada data yang keluar dari server Nexora. Dengan mode live, server mengirim berkas yang diunggah (≤ 3 MB) dan data kasus terkait, termasuk NPWP vendor, ke Gemini API; API key tidak pernah sampai ke browser. Untuk data produksi, pakai akun Gemini API/Vertex AI yang ketentuan penggunaan datanya sudah disetujui tim keamanan perusahaan."*
