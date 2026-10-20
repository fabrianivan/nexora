# Nexora AI Builder Cup Submission Guide

## Problem and Solution

Multi-country groups manage ownership records, invoices, fraud checks, and tax reconciliations across disconnected authority systems. Missing identifiers, inconsistent shareholder percentages, invalid invoices, and manual book-to-tax adjustments create financial and audit risk.

Nexora provides one privacy-conscious workspace where a user can enter or import real entity data, attach documents, run deterministic local fraud checks, simulate taxes, reconcile fiscal profit, and export a draft return. AI is an optional accelerator, never the source of fabricated business data or tax calculations.

## Google Cloud Usage

| Service | Implemented use | Behavior without configuration |
|---|---|---|
| Gemini 2.5 Flash API | Server-side explanation of deterministic results and multimodal extraction of explicitly uploaded PDF/JPG/PNG files | Copilot disabled; scanner switches to the same manual form |
| Cloud Run | Container deployment using Next.js standalone output and `PORT` | Application can also run on Vercel/local Node |
| Document AI | Environment slots are documented for a future/custom processor adapter; not called by this repository | No Document AI claim is shown |
| BigQuery | Optional future analytics sink; local rules and Z-score are authoritative in this build | All fraud checks continue locally |
| Vertex AI Search | Not connected | Official source links are shown; no RAG claim |

Secrets are server-only. AI routes validate inputs, cap file size/type, apply request timeouts, and use simple rate limiting.

## Three-Minute Demo: Manual Mode

1. **0:00-0:30** Show the Manual Mode badge and empty workspace. Create one entity with its real-format NPWP/UEN/TIN/EIN.
2. **0:30-1:00** Add a subsidiary and ownership relationship. Deliberately use 90% to show the total ownership warning, then correct it.
3. **1:00-1:35** Open Documents, attach a small PDF/image, enter an e-Invoice manually, and leave a MyInvois UUID or validation flag missing to generate evidence-based findings.
4. **1:35-2:00** Open Risk, explain the local rule finding, the remediation, the minimum-five-invoice Z-score state, and export CSV.
5. **2:00-2:30** Enter tax simulator inputs, toggle treaty eligibility, and show CIT/indirect/WHT/Pillar Two calculations and disclaimer.
6. **2:30-3:00** Add reconciliation lines and export JSON/XML plus the printable PDF summary. Emphasize that payment codes are informational only.

## Three-Minute Demo: Live Mode

1. **0:00-0:30** Show Live Mode enabled by a server-side `GEMINI_API_KEY`; create/select an entity.
2. **0:30-1:15** Upload a permitted attachment and select **Extract with Gemini Vision**. Edit the extracted fields and show AI source/confidence badges. If extraction fails, demonstrate the honest Manual Mode fallback.
3. **1:15-1:50** Save the document and show local fraud findings. Explain that the LLM did not calculate the rule or risk score.
4. **1:50-2:30** Run the deterministic tax simulator, then ask Copilot to explain those supplied numbers. Open an official regulation source chip.
5. **2:30-3:00** Complete reconciliation and export the draft return.

## Submission Checklist

- [x] Four jurisdictions supported in schemas and deterministic rate configuration.
- [x] Complete no-key Manual Mode flow.
- [x] No Smart Demo Mode, seed data, fake parser, or AI fallback answer.
- [x] Corporate CRUD, ownership validation, and repository abstraction.
- [x] Secure file constraints and editable AI/manual document schema.
- [x] Six local fraud/statistical rules with evidence and remediation.
- [x] Tax simulator, reconciliation, and JSON/XML/PDF draft export.
- [x] Vitest unit coverage and Playwright smoke test.
- [x] Responsive UI, dark mode, labels, focus states, and empty/error/loading states.
- [x] Vercel and Cloud Run deployment paths documented.
- [ ] Replace browser repository with authenticated Firestore for a post-competition multi-user release.
- [ ] Add a real Document AI processor adapter only after processor credentials are provisioned.
- [ ] Add authenticated audit logs and tenant isolation before handling production taxpayer data.
