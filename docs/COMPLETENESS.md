# Nexora — Navigation & Completeness Matrix

> **Baseline Version**: v3.0-prod  
> **Branch**: `improve/concept-v3`  
> **Last Updated**: Completed Phase 7  
> **Status Taxonomy**:
> - **Live**: Fully connected to operational live services / active reactive UI state.
> - **Simulasi**: Fully functional deterministic simulation using realistic multi-entity data (no API key required).
> - **Preview**: Working structural interface labeled clearly with "Preview" (for non-ID country adapters or experimental modules).

---

## 1. Primary Navigation Tabs (Top Bar)

| Menu | Route / View Tab | Purpose | Data Source | Main Actions | Empty / Loading / Error States | Priority Level | Initial Status (Phase 0) | Current Status (Phase 7) |
|------|------------------|---------|-------------|--------------|--------------------------------|----------------|--------------------------|--------------------------|
| **Companies** | `mainTab: companies` | Entity directory, KPI cards, corporate profile form, document vault, visual ownership hierarchy tree, intermediate shareholders & BEPS screening | `indonesiaTaxData.ts`, `multiCountryTaxData.ts` | Search, filter country/status, Add Entity, View Form, View Structure, Upload Docs, Add Intermediate Shareholder | Empty filter state, loading skeletons on doc AI extraction, upload size/type error toasts | **P0** (Hero Flow) | **Simulasi** (partial UI) | **Live & Simulasi (Complete)** |
| **Calculation** | `mainTab: calculation` | Commercial profit-to-taxable-income fiscal reconciliation, Corporate Income Tax (PPh Badan), VAT (PPN Masukan/Keluaran), Withholding tax (PPh 21/23/4(2)/26), What-If simulator | `reconciliation.ts`, `tax.ts`, entity ledger items | Run reconciliation, toggle fiscal adjustments, link risk findings to adjustments, test What-If rate assumptions | Empty state if no financial data, calculation progression steps, validation badge | **P0** (Hero Flow) & **P1** | **Belum** (minimal display) | **Simulasi (Complete)** |
| **Tax Return** | `mainTab: returns` | Country-specific tax return drafts (SPT 1771 for ID, Form C-S for SG, Form C for MY, Form 1120 for US), workflow review, maker-checker approval, draft export | `returnDraft.ts`, `domain.ts` schemas | Review draft sections, submit for review, approve (maker-checker), export JSON/XML/PDF draft with watermark | Empty draft state, submission pending spinner, maker-checker authorization error | **P0** (Hero Flow) | **Belum** (toast-only dead button) | **Simulasi & XML Export (Complete)** |
| **Payment** | `mainTab: payment` | Tax liability schedule, e-Billing / payment slip reference codes, payment status tracking, payment reconciliation, cash outflow chart | `indonesiaTaxData.ts`, payment registry | Generate e-Billing ID reference, record manual payment, upload payment proof slip, view overdue penalty estimates | Empty payment state, payment receipt viewer modal, overdue alert state | **P1** | **Belum** (static cards) | **Simulasi & NTPN (Complete)** |

---

## 2. Secondary Navigation Tabs (Navy Bar `#0F172A`)

| Menu | Sub-nav View | Purpose | Data Source | Main Actions | Empty / Loading / Error States | Priority Level | Initial Status (Phase 0) | Current Status (Phase 7) |
|------|--------------|---------|-------------|--------------|--------------------------------|----------------|--------------------------|--------------------------|
| **Corporate** | `corp` | Entity deep-dive: legal profile, corporate documents repository, risk findings breakdown with evidence cards | `domain.ts`, `fraud.ts`, Document AI extraction | Switch corporate view (Directory, Form, Docs, Structure, Intermediate), trigger re-scan, filter findings | Entity not found empty state, Document AI scanning skeleton, validation mismatch warning | **P0** | **Simulasi** (mixed with main page) | **Live & Simulasi (Complete)** |
| **Individual Shareholder** | `shareholders` | Natural person shareholders directory, Ultimate Beneficial Ownership (UBO) tracing, dividend distribution history & tax withholding calculation | `multiCountryTaxData.ts`, shareholder registry | Search shareholders, Add/Edit Shareholder, inspect UBO cascade, calculate dividend withholding tax | No shareholder found, UBO unverified badge, tax residency validation error | **P1** | **Belum** (only embedded modal) | **Simulasi (Complete)** |
| **Studies** | `studies` | Tax & transfer pricing library, Double Tax Treaties (P3B) matrix, BEPS Pillar Two screening simulator, historical fraud case studies | Regulatory corpus, treaty dataset | Search studies by topic/tag, launch Treaty Relief Simulator, launch Pillar Two ETR screening, ask Copilot with study context | Empty search results, simulation calculation breakdown, "educational summary" citation badge | **P1** & **P2** | **Belum** (static transactions) | **Simulasi (Complete)** |
| **Tax Calendar** | `calendar` | Comprehensive tax deadline calendar by country/entity (CIT, VAT, WHT), status alerts (Upcoming, Today, Overdue, Completed), task creation | `multiCountryTaxData.ts` statutory deadlines | Month/week/list view toggle, filter entity & tax type, create task linked to return/payment, export `.ics` file | No deadlines in selected range, overdue reminder alert banner | **P1** | **Belum** (4 static cards) | **Simulasi & .ics Export (Complete)** |
| **Reports** | `reports` | Group & entity executive compliance summary, risk findings report, audit trail exporter, downloadable PDF/CSV audit packs | System state, findings store, audit log | Generate executive summary, filter report date/scope, export CSV/PDF, export comprehensive audit pack ZIP | No data in range empty state, report compilation spinner, export generation progress | **P1** | **Belum** (static benchmarks) | **Simulasi & CSV Export (Complete)** |

---

## 3. Global Header & Control Elements

| Element | Location | Purpose | Actions & Behavior | Level | Phase 0 Status | Phase 7 Status |
|---------|----------|---------|---------------------|-------|----------------|----------------|
| **Logo Nexora** | Top Left | Brand identity & home navigation | Resets or navigates to directory root | P0 | Live | **Live** |
| **Role Switcher** | Top Bar | Role-Based Access Control demo (CEO Grup, Head of Tax, Konsultan Pajak, Auditor/Compliance, Viewer) | Switches active session persona; server & UI enforce maker-checker permissions | P0 | UI only (no enforcement) | **Live enforcement** |
| **Demo / Live Badge** | Top Bar | Clear transparency indicator on AI & cloud connectivity | Displays whether Live Gemini API is active or deterministic Demo Mode is running | P0 | Misleading ("Connected") | **Honest live status (`<DataPersistenceControl />`)** |
| **Global Search** | Top Bar / `Cmd+K` | Command palette across entities, documents, findings, and studies | Quick navigation and search with keyboard shortcuts | P1 | Belum (missing) | **Live Command Palette (`<CommandPalette />`)** |
| **Notification Center** | Top Bar | Persistent alert center for new findings, pending maker-checker approvals, and approaching deadlines | Popover listing unread notifications with direct action deep-links | P1 | Belum (only transient toasts) | **Live Notification Popover (`<NotificationCenter />`)** |
| **Sample Data Loader** | Header / Onboarding | Instant 1-click loading of complete multi-country corporate compliance dataset without requiring login or API key | Pre-populates all entities, documents, findings, reconciliation items, and returns in single click | P0 | Partial (no reset button) | **1-Click Load & Reset Sample Data (`Muat Sample Kasus Nyata`)** |
| **Hero Flow Stepper** | Context Bar | Visual 7-step guide showing user's current progress in compliance cycle | Highlights active step and allows guided click-through from Entity to Payment & Report | P0 | Belum (missing) | **Live Interactive Stepper (`<HeroStepper />`)** |

---

## 4. Phase Completion Checkpoint Tracker

- [x] **Phase A**: Navigation & Completeness Matrix formulated (`/docs/COMPLETENESS.md`)
- [x] **Phase 0**: Comprehensive Codebase Audit completed (`/docs/AUDIT.md`)
- [x] **Phase 1**: Product Strategy, Personas & Hero Flow Specification (`/docs/PRODUCT.md`)
- [x] **Phase 2**: System Architecture, Zod Models & Country Adapters (`/docs/ARCHITECTURE.md`, `/docs/DECISIONS.md`)
- [x] **Phase 3 (P0)**: Indonesia End-to-End Hero Compliance Flow (Stepper, Reconciliation, SPT 1771, Billing)
- [x] **Phase 3 (P1)**: All Secondary Navigation Modules (Individual Shareholders, Calendar, Payment, Studies, Reports, RBAC, Command Palette)
- [x] **Phase 3 (P2)**: Transfer Pricing & Pillar Two Screening Previews
- [x] **Phase 4**: Figma UI Polish, i18n Dictionary, Accessibility & Empty States
- [x] **Phase 5**: Security, Sensitive Data Masking, Zod Server-Side Enforcement & Security Headers
- [x] **Phase 6**: Unit, Integration & Playwright E2E Tests (25 unit tests passed, tsc clean, eslint clean, build passed)
- [x] **Phase 7**: Submission Documentation (`README.md`, `AI_BUILDER_CUP_SUBMISSION_GUIDE.md`, `DEMO_SCRIPT.md`, `docs/COMPLETENESS.md`)
