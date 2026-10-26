# Nexora — Google Cloud AI Builder Cup Submission Guide
## Track 1: BFSI (Smart Risk, Fraud Prevention & Financial Experience)

- **Project Name**: Nexora — Multi-Country Corporate Tax Compliance & Fraud Prevention Workspace
- **Team**: Solo Principal Engineer + Product Strategist
- **Live Production URL**: [https://nexora-chi-cyan.vercel.app](https://nexora-chi-cyan.vercel.app)
- **Repository**: [https://github.com/fabrianivan/nexora](https://github.com/fabrianivan/nexora)
- **Target Branch**: `improve/concept-v3`

---

## 1. Problem Statement & Financial Impact

Multi-jurisdiction corporate groups (e.g. holding in Indonesia with subsidiaries in Singapore, Malaysia, and Delaware US) face severe regulatory fragmentation:
1. **Fictitious Invoices & Tax Evasion (Faktur TBTS & MTIC)**: Criminal syndicates use sham shell companies to issue fictitious tax invoices, causing billions in tax leakage and exposing honest buyers to joint liability under UU KUP Pasal 39A / Singapore Section 20A.
2. **Book-to-Tax (Fiscal) Reconciliation Complexity**: Commercial audited profits must be reconciled through non-deductible adjustments (natura PMK-66/2023, penalties, donations) and tax-exempt dividends (UU HPP Pasal 4(3)f) before filing annual returns (SPT 1771 / Form C-S).
3. **Pillar Two / GloBE Minimum Tax (15%)**: MNE groups with revenues > €750M risk heavy top-up taxes if subsidiaries operate in low-tax regimes without continuous effective tax rate (ETR) monitoring.
4. **Disjointed Workflows**: CFOs currently jump across disparate tools: spreadsheets for reconciliation, separate portals for e-Billing, and manual filing systems with no maker-checker control or immutable audit trail.

---

## 2. Nexora's Solution & Track 1 BFSI Alignment

Nexora provides a unified, enterprise-grade tax workspace that connects the entire compliance lifecycle into a **7-Stage Hero Flow**:

1. **Multi-tier Corporate Ownership Graph**:
   - Visualizes Ultimate Parent Entity (UPE), intermediate holding entities, natural person UBOs, and cross-border subsidiaries.
   - Detects circular ownership and enforces strict 100% equity checks.
2. **Smart Document & e-Invoice Scanner**:
   - Ingests PDF, JPG, and PNG documents (deeds, audited financials, e-Invoices).
   - Live Mode uses **Gemini 2.5 Flash / Gemini Vision** for multimodal extraction with confidence scores; Smart Demo Mode operates with instant deterministic extraction without requiring an API key.
3. **Explainable Fraud & Risk Detection Engine**:
   - Detects Faktur Pajak TBTS (Transaksi Tidak Sebenarnya), duplicate NSFP series, missing MyInvois UUIDs, and split invoices.
   - Statistically calibrated Z-score outlier detection (minimum 5 invoices) identifies anomalous high-value transactions with full regulatory citations.
4. **Interactive Fiscal Reconciliation & Tax Engine**:
   - Automated book-to-tax reconciliation across positive and negative adjustments.
   - PPh Badan calculation with **UU PPh Pasal 31E 50% facility** for SMEs with revenue under Rp 50 Miliar.
   - Withholding tax calculator (PPh 21 TER, PPh 23, PPh 4(2), PPh 26).
   - What-If sensitivity simulator for margin scaling and non-deductible remediation impact.
5. **SPT 1771 Induk & Lampiran with Maker-Checker Authorization**:
   - Official SPT 1771 Induk, Lampiran I (Net Income), Lampiran II (COGS & Expenses), and Lampiran III (Tax Credits).
   - Enforces **Maker-Checker separation**: Drafter (*Konsultan Pajak*) cannot approve their own return; approval is reserved for *Head of Tax* or *Group CEO*.
   - Generates real `.xml` formatted for DJP Coretax import, plus structured `.json` and printable PDF summaries.
6. **Payment & 15-Digit e-Billing Generation**:
   - Real 15-digit e-Billing code generation (`411126-200` PPh Badan, `411211-100` PPN).
   - Payment confirmation modal recording real NTPN (Nomor Transaksi Penerimaan Negara).
   - Statutory late payment penalty interest calculator.
7. **Statutory Tax Calendar & Immutable Audit Trail**:
   - Country-specific tax calendar with direct `.ics` file download (Google Calendar / Outlook compatible).
   - Immutable audit trail recording every user action with `.csv` export for compliance audits (ISO 27001 / OECD CbCR).

---

## 3. Google Cloud Architecture & Honest Service Mapping

| Google Cloud Service | Production / Live Mode Use | Demo Mode (Simulasi Lokal) |
|---|---|---|
| **Gemini 2.5 Flash API** | Multimodal document extraction (Gemini Vision) and conversational tax regulation advisory | Local deterministic parsing and verified legal citations; no external API key needed |
| **Cloud Run** | Serverless container deployment with Next.js standalone output and PORT mapping | Vercel production deployment and local Docker container |
| **Document AI** | Document parser architecture slot with clean adapter interface | Honestly labeled as local simulation for consistent live jury demos |
| **BigQuery** | Enterprise tax ledger and anomaly dataset sink | Local in-memory dataset with mathematical Z-score analysis |
| **Cloud SQL / MySQL** | Persistent workspace storage via `/api/workspace` | Automatic in-memory fallback (works with zero setup) |

> [!IMPORTANT]
> **Honest AI & Cloud Transparency**:
> Nexora never fabricates artificial live connections. When running in Smart Demo Mode without a configured `GEMINI_API_KEY`, the UI displays a transparent `Simulasi Lokal` badge with a detailed tooltip explaining that calculations and extractions are executed deterministically on the edge.

---

## 4. Submission Evaluation Checklist

- [x] **Zero Hollow Pages & Zero Dead Buttons**: All 4 primary navigation tabs (`Companies`, `Calculation`, `Tax Return`, `Payment`) and 5 sub-nav tabs (`Corporate`, `Individual Shareholder`, `Studies`, `Tax Calendar`, `Reports`) are fully interactive.
- [x] **End-to-End 7-Step Hero Flow**: Stepper guides the user smoothly from corporate structure to document scanning, risk detection, fiscal reconciliation, SPT drafting, billing, and audit logs.
- [x] **1-Click Real Sample Data**: Zero login and zero API key required to experience the full multi-tier group scenario.
- [x] **Pluggable Country Adapters**: Modular architecture decoupling `ID`, `SG`, `MY`, and `US` rules into versioned JSON configs.
- [x] **Explainable AI & Risk Findings**: Z-score outlier + rule + human explanation + verifiable evidence + remediating fiscal action.
- [x] **Maker-Checker Workflow**: Strict separation between drafter and approver prevents unauthorized self-filing.
- [x] **Code Quality & Testing**: 25 Vitest unit tests pass, `tsc --noEmit` is clean, ESLint passes with 0 errors and 0 warnings, and Playwright smoke tests pass.
- [x] **Enterprise Security**: Strict security headers (CSP, X-Frame-Options, X-Content-Type-Options) in `next.config.mjs`, and masking of sensitive tax IDs (NPWP/NIK).
