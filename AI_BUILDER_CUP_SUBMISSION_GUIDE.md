# Nexora — Google Cloud AI Builder Cup Submission Guide
## Track 1: BFSI (Smart Risk, Fraud Prevention & Financial Experience)

- **Project Name**: Nexora — Multi-Country Corporate Tax Compliance & Fraud Prevention Workspace
- **Team**: Solo Principal Engineer + Product Strategist
- **Live Production URL**: [https://nexora-chi-cyan.vercel.app](https://nexora-chi-cyan.vercel.app)
- **Repository**: [https://github.com/fabrianivan/nexora](https://github.com/fabrianivan/nexora)
- **Target Branch**: `main`

---

## 1. Problem Statement & Financial Impact

Multi-jurisdiction corporate groups (e.g. holding in Indonesia with subsidiaries in Singapore, Malaysia, and Delaware US) face severe regulatory fragmentation:
1. **Fictitious Invoices & Tax Evasion (Faktur TBTS & MTIC)**: Criminal syndicates use sham shell companies to issue fictitious tax invoices, causing billions in tax leakage and exposing buyers to lost input-tax credits and examinations (UU KUP Pasal 39A; IRAS's missing-trader knowledge condition).
2. **Book-to-Tax (Fiscal) Reconciliation Complexity**: Commercial audited profits must be reconciled through non-deductible adjustments (natura PMK-66/2023, penalties, donations) and tax-exempt dividends (UU HPP Pasal 4(3)f) before filing annual returns (SPT 1771 / Form C-S).
3. **Pillar Two / GloBE Minimum Tax (15%)**: MNE groups with revenues > €750M risk heavy top-up taxes if subsidiaries operate in low-tax regimes without continuous effective tax rate (ETR) monitoring.
4. **Disjointed Workflows**: CFOs currently jump across disparate tools: spreadsheets for reconciliation, separate portals for e-Billing, and manual filing systems with no maker-checker control or immutable audit trail.

---

## 2. Nexora's Solution & Track 1 BFSI Alignment

Nexora is one tax workspace that connects the compliance lifecycle into a **6-step cycle** (Entitas → Dokumen → Kasus → Rekonsiliasi → SPT → Pembayaran):

1. **Multi-tier Corporate Ownership Graph**:
   - Visualizes Ultimate Parent Entity (UPE), intermediate holding entities, natural person UBOs, and cross-border subsidiaries.
   - Detects circular ownership and enforces strict 100% equity checks.
2. **Smart Document & e-Invoice Scanner**:
   - Ingests PDF, JPG, and PNG documents (deeds, audited financials, e-Invoices).
   - With `GEMINI_API_KEY`, Gemini reads the file and returns fields with per-field confidence; text addressed to an AI inside a document is surfaced and ignored. Without a key, values come from the file name and the UI labels them as a simulation.
3. **Kasus: explainable findings with an AI investigation agent**:
   - A deterministic rule engine flags TBTS indicators (unvalidated vendor identity or PPN that does not match the standard rate), missing-trader risk, missing MyInvois UUIDs, split invoices, Z-score outliers (|z| ≥ 2, minimum 5 invoices), costs without evidence, and vendor / share-register inconsistencies.
   - Each finding opens as a case: the checks that fired, the flagged document fields with extraction confidence, and the rule basis from an internal rule library (marked unverified).
   - **Investigation agent**: Gemini function calling over 8 deterministic tools (vendor master, vendor history, tax math, supporting documents, same-day invoices, share register, extraction confidence, e-invoice UUID). Every brief line must cite the tool steps it relies on; uncited lines are dropped. Offline, a rule-specific plan runs the same tools. The output is a suggestion and a draft maker note — a person decides.
   - **Rupiah trail**: what a correction does to PPh due, computed by the same CIT engine as the return (for the sample TBTS case, Rp 13,2 jt with Pasal 31E rather than the Rp 26,4 jt a flat 22% estimate suggests).
   - **Grounded Copilot**: can be scoped to a case; answers only from case data, workspace findings and the rule library, with numbered citations; refuses off-topic and prompt-injection questions before any model call.
4. **Interactive Fiscal Reconciliation & Tax Engine**:
   - Automated book-to-tax reconciliation across positive and negative adjustments.
   - PPh Badan calculation with **UU PPh Pasal 31E 50% facility** for SMEs with revenue under Rp 50 Miliar.
   - Withholding tax calculator (PPh 21 TER, PPh 23, PPh 4(2), PPh 26).
   - What-If sensitivity simulator for margin scaling and non-deductible remediation impact.
5. **SPT 1771 Induk & Lampiran with Maker-Checker Authorization**:
   - Official SPT 1771 Induk, Lampiran I (Net Income), Lampiran II (COGS & Expenses), and Lampiran III (Tax Credits).
   - Enforces **Maker-Checker separation**: Drafter (*Konsultan Pajak*) cannot approve their own return; approval is reserved for *Head of Tax* or *Group CEO*.
   - Exports XML modelled on the SPT 1771 structure (not validated against the Coretax import schema), structured `.json`, and a printable summary.
6. **Payment & 15-Digit e-Billing Generation**:
   - 15-digit billing-code format with the right KAP-KJS (`411126-200` PPh Badan, `411211-100` PPN), generated locally for the demo, not issued by DJP.
   - Payment confirmation records the NTPN (Nomor Transaksi Penerimaan Negara) the user enters.
   - Statutory late payment penalty interest calculator.
7. **Statutory Tax Calendar & Immutable Audit Trail**:
   - Country-specific tax calendar with direct `.ics` file download (Google Calendar / Outlook compatible).
   - Append-only audit trail recording every user action, including AI investigations and the engine that ran them, with `.csv` export.

---

## 3. Google Cloud Architecture & Honest Service Mapping

| Service | What it does in Nexora | Without it |
|---|---|---|
| **Gemini API** (`GEMINI_MODEL`, default `gemini-2.5-flash`) | Grounded Copilot answers, the case investigation agent (function calling), and document extraction (vision) | The local deterministic engine answers from the same sources; every output is labelled `Simulasi lokal · offline` |
| **Cloud Run** | Next.js standalone container; `GEMINI_API_KEY` as a server-side secret | Vercel or local Docker |
| **Cloud SQL / MySQL** | Persistent workspace via `MYSQL_URL` | SQLite / in-memory fallback, zero setup |
| **Document AI, BigQuery** | Not used. Environment variables are reserved for a future adapter | — |

> [!IMPORTANT]
> **Honest AI**: every AI output shows which engine produced it (`Gemini · live` with the model id, `Simulasi lokal · offline`, or `fallback` when a live call failed). Confidence is a word with its basis, not a percentage. AI never decides a case: a maker proposes and an independent checker approves.

---

## 4. Submission Evaluation Checklist

- [x] **Zero Hollow Pages & Zero Dead Buttons**: every route is interactive — the overview, the six cycle steps (`/entities`, `/documents`, `/cases`, `/calculation`, `/tax-return`, `/payments`) and the governance modules (`/shareholders`, `/calendar`, `/reports`, `/studies`); `/risk` and `/review` redirect to `/cases`.
- [x] **End-to-end 6-step cycle**: from corporate structure to documents, cases, fiscal reconciliation, SPT drafting, billing and audit logs.
- [x] **1-Click Real Sample Data**: Zero login and zero API key required to experience the full multi-tier group scenario.
- [x] **Pluggable Country Adapters**: Modular architecture decoupling `ID`, `SG`, `MY`, and `US` rules into versioned JSON configs.
- [x] **Explainable AI & Risk Findings**: rule + failing checks + flagged fields + cited AI investigation + Rupiah trail + remediation.
- [x] **Maker-Checker Workflow**: Strict separation between drafter and approver prevents unauthorized self-filing.
- [x] **Code Quality & Testing**: 71 Vitest unit tests (including the investigation loop with a mocked Gemini and Copilot grounding/refusals) and 11 Playwright end-to-end tests pass, `tsc --noEmit` is clean, and ESLint passes with 0 errors and 0 warnings.
- [x] **Security**: Strict security headers (CSP, X-Frame-Options, X-Content-Type-Options) in `next.config.mjs`, and masking of sensitive tax IDs (NPWP/NIK).
