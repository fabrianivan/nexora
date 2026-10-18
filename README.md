# Nexora 🛡️

**Global Corporate Tax Compliance, Document Intelligence & Financial Fraud Prevention Platform**  
*Dibangun oleh **Team Nexora** untuk Google Cloud AI Builder Cup — Track 1: BFSI (Risiko Cerdas, Pencegahan Penipuan & Pengalaman Keuangan)*

---

## Fitur Utama

1. **Multi-Country Corporate Management & Ownership Structure**:
   - Manajemen entitas korporasi lintas negara (🇮🇩 Indonesia DJP Coretax, 🇸🇬 Singapura IRAS InvoiceNow, 🇲🇾 Malaysia LHDN MyInvois, 🇺🇸 Amerika Serikat IRS MeF), struktur kepemilikan (*Company Structure*), dan *Intermediate Shareholders*.
2. **Smart Document & e-Invoice Scanner (Google Cloud Document AI + Gemini Vision)**:
   - Ekstraksi dan validasi silang dokumen legal & pajak (Deed of Establishment, Shareholder Docs, Financial Statement, Previous Tax Return, e-Faktur / InvoiceNow / MyInvois).
3. **Fraud & Anomaly Detector (BigQuery + Vertex AI Risk Engine)**:
   - Deteksi *Faktur Pajak Indikasi TBTS (Fiktif)*, *Missing Trader Fraud (IRAS)*, *Unvalidated MyInvois UUID*, *Split-Invoicing Fraud*, dan biaya *Non-Deductible* lengkap dengan *BigQuery Z-Score* dan auto-remediasi.
4. **Nexora AI Copilot & Multi-Country Tax Simulator (Gemini 2.5 Flash + Vertex AI Search RAG)**:
   - Konsultan pajak AI interaktif bersitasi regulasi multi-negara dan perjanjian penghindaran pajak berganda (*Tax Treaty* DTA/P3B & OECD BEPS 2.0).
5. **One-Click Fiscal Reconciliation & Tax Return XML/JSON Generator**:
   - Kertas kerja rekonsiliasi fiskal otomatis (koreksi fiskal positif & negatif) beserta ekspor draf SPT / Form C-S / Form C / Form 1120 dan kode pembayaran pajak (*e-Billing / GIRO / FPX / EFTPS*).

---

## Cara Menjalankan Secara Lokal

```bash
cd /Users/fabrianivan/nexora
npm install
npm run dev
```

Buka `http://localhost:3000` di browser Anda.

### Konfigurasi Opsional Google Gemini API Key
Aplikasi ini dilengkapi **Hybrid AI Engine**:
- **Smart Demo Mode (Default)**: Berjalan 100% langsung tanpa memerlukan API Key eksternal.
- **Live Gemini API Mode**: Tambahkan `GEMINI_API_KEY=your_key` pada file `.env` atau `.env.local`. Server akan otomatis menggunakan API key tersebut untuk memproses live prompt Vertex AI / Gemini 2.5 Flash.

---

## Deployment ke Google Cloud Run

```bash
gcloud run deploy nexora \
  --source . \
  --region asia-southeast2 \
  --allow-unauthenticated
```
