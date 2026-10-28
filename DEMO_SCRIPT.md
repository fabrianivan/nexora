# Nexora — 3-Minute Jury Demo Script
## Google Cloud AI Builder Cup 2026 (Track 1: BFSI)

> **Presenter Persona**: Principal Engineer & FinTech Product Strategist  
> **Target Audience**: BFSI Judges & Evaluation Panel  
> **Duration**: Exactly 3 Minutes (180 Seconds)  
> **Live Demo URL**: [https://nexora-chi-cyan.vercel.app](https://nexora-chi-cyan.vercel.app)  
> **Prerequisites**: Zero login, zero API key required (Smart Demo Mode ready out-of-the-box).

---

## Second-by-Second Presentation Roadmap

| Timestamp | Screen / Action | Key points |
|---|---|---|
| **0:00 – 0:20** | **Ringkasan** — open the app (lands on `/overview`). Point at the action centre, entity scores and the 7-step cycle in the sidebar. | One place shows what the group owes, what is risky, and what to do next. No login, no API key. |
| **0:20 – 0:40** | **1 · Entitas & struktur** — org chart → open *PT Nusantara Kreasi Digital Tbk* → Struktur tab (share register ≠ 100% warning) → Konsolidasi grup. | Group structure drives scope, consolidation, Pillar Two threshold and access rights. |
| **0:40 – 1:00** | **2 · Dokumen** — *Unggah dokumen* → *Ekstrak AI* → save. Toast reports new findings. | Document AI fills fields with confidence; humans can override; every document is analysed immediately. |
| **1:00 – 1:25** | **3 · Risiko & fraud** — filter *Faktur Pajak TBTS* / *Missing Trader*; open a finding. | Explainable: evidence lines, legal basis, money at risk, suggested fiscal correction. *Tanya Copilot* for the legal context. |
| **1:25 – 1:50** | **4 · Review temuan** — confirm *Biaya tanpa bukti (CV Prima)* with a note → try to approve (blocked) → *Masuk sebagai Sri Mulyani* → *Setujui* → *Terapkan*. | Maker-checker is enforced, and the decision flows straight into the books. |
| **1:50 – 2:15** | **5 · Rekonsiliasi fiskal** — account 6300 now carries the new correction (linked badge); toggle Pasal 31E; show what-if. | Deterministic CIT per country (ID 31E, SG PTE, MY SME, US 21%). |
| **2:15 – 2:40** | **6 · SPT tahunan** — pre-submission checks → *Setujui* (as CFO) → *Terbitkan kode billing* → export XML. | Return is generated from the reconciliation; approval locks the numbers. |
| **2:40 – 3:00** | **7 · Pembayaran** → *Bayar* → enter NTPN. Close on **Laporan & audit → Jejak audit** showing every step. | From invoice to NTPN with a complete, exportable audit trail. |

---

## Backup FAQs for Q&A Session

### Q1: "Mengapa tidak semua fitur menggunakan LLM?"
> **Jawaban**: *"Dalam industri BFSI dan perpajakan korporasi, determinisme hukum adalah mutlak. Perhitungan tarif Pasal 31E, dividen Pasal 4(3)f, dan kode billing tidak boleh berhalusinasi. AI (Gemini 2.5 Flash) digunakan tepat pada kekuatannya: ekstraksi dokumen multimodal dari invoice/laporan keuangan dan penjelasan regulasi (RAG). Sedangkan perhitungan finansial dan deteksi anomali dieksekusi oleh mesin deterministik terverifikasi."*

### Q2: "Bagaimana Nexora menangani multi-negara di luar Indonesia?"
> **Jawaban**: *"Nexora memiliki Country Adapter Layer terisolasi (`src/lib/adapters/`). Saat ini Indonesia memiliki kedalaman penuh (P0), sementara Singapura (Form C-S & GST), Malaysia (MyInvois & Form C), dan US (Form 1120) tersedia dalam status preview dengan aturan perpajakan terversi (`src/config/taxRules.*.json`)."*

### Q3: "Apakah ada risiko kebocoran data rahasia perusahaan?"
> **Jawaban**: *"Tidak. Dalam Smart Demo Mode, data diproses secara lokal di browser/edge. Ketika Live Gemini Mode diaktifkan, hanya metadata teks yang relevan dikirim ke endpoint aman dengan enkripsi TLS dan masking identitas sensitif (NPWP/NIK). Attachment biner tidak disimpan permanen di cloud tanpa izin pengguna."*
