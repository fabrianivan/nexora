# Nexora — Navigation & Completeness Matrix

> **Version**: v5 (rebuild) · branch `rebuild/v5`
> **Status taxonomy**: **Live** — wired to real state/DB · **Simulasi** — deterministic simulation with sample data · **Live/Simulasi** — Gemini when `GEMINI_API_KEY` is set, deterministic fallback otherwise.

## Compliance cycle

| Step | Route | Purpose | Data & logic | Main actions | Status |
|---|---|---|---|---|---|
| — | `/overview` | Group position & priorities | All modules, `entityRiskScore` | Action centre, open entity, ask Copilot | Live |
| 1 | `/entities`, `/entities/[id]` | Group structure & entity master data | `data/entities.ts`, DB `companies` | Org chart, add entity/subsidiary, edit profile, upload & verify legal docs, shareholders/UBO, consolidation | Live |
| 2 | `/documents` | Transaction & register documents | `app_state.compliance.documents`, `/api/scan-document` | Upload, AI extract, correct fields, verify, delete | Live/Simulasi |
| 3 | `/risk` | Explainable findings | `lib/compliance.ts` (`fraud.ts`, `crossValidation.ts`) | Filter by rule/status/scope, evidence sheet, ask Copilot | Live |
| 4 | `/review` | Human-in-the-loop decisions | `proposeDecision`, `decide`, `applyCorrectionToItems` | Propose, approve/return (maker-checker), apply correction, reopen | Live |
| 5 | `/calculation` | Fiscal reconciliation & CIT | `lib/cit.ts`, `app_state.ledger` | Add/edit/delete lines, facility toggle, tax credits, VAT recap, WHT calculator, what-if | Live |
| 6 | `/tax-return` | Annual return & approval | `computeCit`, `lib/returns.ts` | Pre-checks, submit, approve/return, lock, issue billing, XML/JSON, print | Live |
| 7 | `/payments` | Liabilities & settlement | DB `payments`, `lib/schedule.ts` | Billing code, record NTPN, add liability, penalty estimate | Live/Simulasi |

## Governance & insight

| Route | Purpose | Status |
|---|---|---|
| `/shareholders` | Group UBO register, PEP/KYC, PII masking, dividend WHT simulator | Live |
| `/calendar` | Deadlines (list & month), complete/reopen, reminders, `.ics` export | Live |
| `/reports` | Data-driven executive report, append-only audit trail, audit-pack CSV, print | Live |
| `/studies` | Treaty, Pillar Two & TP simulators; knowledge library | Simulasi |

## Shell

| Element | Behaviour | Status |
|---|---|---|
| Sidebar | Cycle steps with live done/count status, entity switcher (RBAC-aware), DB status & reset | Live |
| ⌘K palette | Pages, entities, findings, documents, actions | Live |
| Notifications | Critical findings, approvals for the current checker, returns awaiting approval, deadlines ≤ 14 days | Live |
| Account menu | Persona switch (RBAC demo), access matrix | Live |
| Tax Copilot | Side panel, country presets, citations | Live/Simulasi |
