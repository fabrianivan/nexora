# Nexora — Phase 0 Audit Report

> **Auditor**: Antigravity Agent  
> **Date**: 2026-10-26  
> **Commit Baseline**: current `main` branch  
> **Scope**: Full repo — src/, docs/, test/, e2e/, config files, CI

---

## A. Architecture Map (Actual)

### File Structure

```
src/
├── app/
│   ├── page.tsx                    ← 6,501 lines, ENTIRE UI in one file
│   ├── layout.tsx                  ← Root layout (23 lines)
│   ├── globals.css                 ← Tailwind v4 + custom tokens (56 lines)
│   └── api/
│       ├── copilot/route.ts        ← AI chatbot endpoint (239 lines)
│       ├── scan-document/route.ts  ← Document scan simulation (113 lines)
│       ├── status/route.ts         ← Service status check (4 lines)
│       └── workspace/route.ts      ← MySQL CRUD for workspace (49 lines)
├── data/
│   ├── indonesiaTaxData.ts         ← ID sample data (492 lines)
│   └── multiCountryTaxData.ts      ← Multi-country config + sample data (848 lines)
├── lib/
│   ├── domain.ts                   ← Zod schemas (96 lines)
│   ├── fraud.ts                    ← Rule-based fraud detection (40 lines)
│   ├── tax.ts                      ← Tax calculation/simulation (21 lines)
│   ├── reconciliation.ts           ← Fiscal reconciliation (12 lines)
│   ├── returns.ts                  ← Tax return draft + XML serializer (10 lines)
│   ├── ownership.ts                ← Ownership graph validation (29 lines)
│   ├── crossValidation.ts          ← Cross-document validation (28 lines)
│   ├── chatMarkdown.ts             ← Chat message parser/renderer (219 lines)
│   ├── mysql.ts                    ← MySQL workspace repository (58 lines)
│   └── server/
│       └── rateLimit.ts            ← In-memory rate limiter (14 lines)
test/
├── domain.test.ts                  ← Unit tests (55 lines)
└── chatMarkdown.test.mjs           ← Chat parser tests (?)
e2e/
└── smoke.spec.ts                   ← Playwright smoke test (14 lines)
docs/                               ← Placeholder docs (sparse)
sql/
└── schema.mysql.sql                ← MySQL DDL (minimal)
public/
└── index-standalone.html           ← 34KB standalone HTML (legacy/unused?)
```

### Data Flow

```
User → page.tsx (SPA, client state only)
         ↓ fetch
     API Routes (server-side)
         ├── /api/copilot     → Gemini API (live) or hardcoded responses (demo)
         ├── /api/scan-document → Deterministic mock scanner (NO real Document AI)
         ├── /api/status      → Reads env vars
         └── /api/workspace   → MySQL via mysql2 (requires MYSQL_URL)
```

### Key Architecture Observations

1. **Monolithic page.tsx**: The ENTIRE application UI is a single 6,501-line React component. No routing (all "pages" are conditional renders based on `primaryNav` and `subNav` state). No code splitting. No separate components.

2. **Two completely separate data systems**:
   - `src/lib/domain.ts` defines Zod-validated schemas (`CorporateEntity`, `Ownership`, `TaxDocument`, `ReconciliationLine`, `Workspace`) used by API routes and the MySQL persistence layer.
   - `src/app/page.tsx` defines its OWN TypeScript interfaces (`CorporateEntity`, `SubsidiaryNode`, `CorporateDocument`, `IntermediateShareholder`, `IndividualShareholder`, `UserPersona`) that are completely separate from `domain.ts` and used only in the client-side hardcoded data.
   - **These two systems are NOT connected.** The page.tsx UI never calls the workspace API. The rich UI data is entirely client-side state initialized from `INITIAL_COMPANIES` constant.

3. **No App Router pages**: Despite using Next.js 15 App Router, there is only one route (`/`). There are no `/companies`, `/calculation`, `/tax-return`, `/payment`, or any other page routes.

---

## B. Feature Audit — Working vs Mock/Hardcoded

### Navigation Tabs

| Tab | Route | Status | Details |
|-----|-------|--------|---------|
| Companies (Corporate) | `/` + `primaryNav=companies, subNav=corporate` | **Partially working** | Entity directory, corporate form, documents, structure, shareholders all render with HARDCODED data. CRUD operations mutate client state. No persistence. |
| Companies (Individual Shareholder) | `/` + `subNav=individual` | **Working (hardcoded)** | Table of individual shareholders per entity. Add/Delete/Edit via modal. Client state only. |
| Companies (Studies) | `/` + `subNav=studies` | **Minimal** | Shows flagged transactions + treaty info. NOT a "studies library" as required. Actually displays the fraud/anomaly data. |
| Companies (Tax Calendar) | `/` + `subNav=calendar` | **Static display** | Hardcoded 4 cards with deadline dates. No interactivity (no filter, no status toggle, no reminder). |
| Companies (Reports) | `/` + `subNav=reports` | **Minimal** | Shows industry benchmarks comparison. NOT a report builder. No executive summary, no export, no PDF. |
| Calculation | `/` + `primaryNav=calculation` | **Partially working** | Tax incentive simulator with slider. Fiscal reconciliation table from sample data. No PPh badan calc, no PPN module, no pemotongan, no what-if with real inputs. |
| Tax Return | `/` + `primaryNav=tax_return` | **Minimal** | Shows sample documents as cards. Export button just triggers a toast (no actual file generation from this view). No workflow, no draft, no status. |
| Payment | `/` + `primaryNav=payment` | **Minimal** | 3 summary cards (YTD paid, fraud blocked, generate billing). Generate button triggers toast only. No payment list, no status tracking, no reconciliation. |

### Features

| Feature | Status | Reality |
|---------|--------|---------|
| Entity directory & KPI | ✅ Hardcoded data | Works with 4 pre-loaded entities. Filter by role & search. RBAC restricts subsidiary users. No persistence. |
| Corporate form | ✅ Working (local) | Editable 2-column form. Changes saved to React state only. |
| Document upload | ⚠️ Simulated | "Upload" sends to `/api/scan-document` which returns deterministic mock data. No actual file processing. No Document AI. |
| Ownership structure chart | ✅ Displayed | Renders structure nodes as styled cards. Not a real graph/tree visualization. |
| Intermediate shareholders | ✅ Working (local) | Full CRUD via table + modal. BEPS risk auto-detected for Cayman/BVI. |
| Individual shareholders | ✅ Working (local) | Full CRUD table. Dividend tax regime displayed. |
| Fraud detection (rules) | ✅ In `src/lib/fraud.ts` | 6 rules implemented (TBTS, Missing Trader, MyInvois UUID, Non-Deductible, Split Invoicing, Z-Score). BUT: the rules in `fraud.ts` are NOT used by the page.tsx UI. The UI displays hardcoded `auditTransactions` from `multiCountryTaxData.ts`. |
| Fraud detection (UI) | ⚠️ Hardcoded display | Studies tab shows pre-built flagged transactions. "Auto-Remediate" just marks them green in state. |
| Copilot / AI Chat | ✅ Working (both modes) | Floating chatbot calls `/api/copilot`. In demo mode: keyword-matched hardcoded responses. In live mode: actual Gemini API call. Responses include citations. |
| Fiscal reconciliation | ⚠️ Display only | Table renders from `fiscalReconciliation` sample data per country. Not editable in the UI (the `calculateReconciliation()` function exists in lib but is not used by the page). |
| Tax calculation | ⚠️ Simplified | Slider adjusts a multiplier. Shows 3 scenario cards. `simulateTax()` function exists in lib but is not used by the page UI (page does its own inline math). |
| Tax return draft | ⚠️ Minimal | Shows sample doc cards. Export button is a toast. `createReturnDraft()` and `returnDraftToXml()` exist in lib but are NOT connected to the UI. |
| Payment | ⚠️ Minimal | 3 summary cards. No payment list, no status, no reconciliation. |
| Tax calendar | ⚠️ Static | 4 hardcoded cards. No interactivity. |
| Reports | ⚠️ Minimal | Industry benchmark comparison only. No executive summary, no report builder. |
| Audit trail | ❌ Not implemented | No audit log anywhere. |
| Maker-checker / approval | ❌ Not implemented | No approval workflow. |
| RBAC enforcement | ⚠️ UI only | Persona switcher restricts entity selection in the UI. No server-side enforcement. |
| Import data (CSV/Excel) | ❌ Not implemented | |
| Command palette / global search | ❌ Not implemented | |
| Notifications | ❌ Not implemented | Only toast messages. |
| i18n / bilingual | ❌ Not implemented | Mix of Indonesian and English text hardcoded. |
| Dark mode | ❌ Not implemented | |
| Onboarding / tour | ❌ Not implemented | |
| Transfer pricing | ⚠️ Display only | Consolidation modal shows TP flow cards. No TP transaction CRUD. |
| Pillar Two / BEPS screening | ⚠️ In `tax.ts` only | `pillarTwoTopUp` calculated in `simulateTax()` but not surfaced meaningfully in UI. |

---

## C. Google Cloud Services — Actually Called vs Mentioned

| Service | Actually Called | Evidence |
|---------|---------------|----------|
| **Gemini 2.5 Flash API** | ✅ Yes (when `GEMINI_API_KEY` set) | `/api/copilot/route.ts` line 188-209: Direct `fetch` to `generativelanguage.googleapis.com`. |
| **Document AI** | ❌ No | `DOCUMENT_AI_PROCESSOR_ID` exists in `.env.example` but no code calls Document AI APIs. The scan-document route returns deterministic mock data. |
| **BigQuery** | ❌ No | `BIGQUERY_DATASET` exists in `.env.example` but no code references BigQuery APIs. Z-scores are computed locally in `fraud.ts`. The UI labels results as "BigQuery Z-Score" which is misleading. |
| **Vertex AI** | ❌ No | `VERTEX_AI_LOCATION` in `.env.example` but no Vertex AI SDK calls exist. |
| **Vertex AI Search** | ❌ No | No RAG implementation. Copilot responses are keyword-matched or raw Gemini. |
| **Cloud Run** | ✅ Configured | Dockerfile exists and is correctly structured for standalone Next.js. |
| **MySQL** | ✅ Yes (when `MYSQL_URL` set) | `/api/workspace/route.ts` and `lib/mysql.ts` implement real MySQL persistence. |

### Honesty Issues

The UI header shows "Google Cloud Document AI + BigQuery Connected" (line 2083) which is **always displayed** regardless of actual service status. This is misleading because:
- Document AI is never called
- BigQuery is never called
- The status API route checks env vars but the result is not used to control this badge

The copilot fallback responses claim "Vertex AI Gemini 2.5 Flash + Vertex AI Search" as their engine (line 48, copilot route) when they are actually hardcoded keyword-matched responses.

---

## D. Bugs, Dead Code, Duplication, Security, UX Issues

### Bugs

1. **Two `CorporateEntity` types**: `src/lib/domain.ts` exports a `CorporateEntity` type (Zod-validated), and `page.tsx` line 238-273 defines a completely different `CorporateEntity` interface. They're incompatible. The `lib/domain.ts` type has `name` while page.tsx has `legalName`, `tradeName`, etc.

2. **E2E test broken**: The smoke test (e2e/smoke.spec.ts) expects UI elements that don't exist in the current page.tsx:
   - `page.getByText('Mode Manual')` — current UI shows "Demo Mode" / "Live Gemini"
   - `page.getByLabel('Nama legal')` — no such labeled input exists
   - `page.getByRole('button', { name: 'Simpan entitas' })` — no such button
   - `page.getByRole('button', { name: 'Dokumen' })` — no such button
   
   The E2E test was written for a previous version of the UI and is now completely stale.

3. **`mysql.ts` uses `import 'server-only'`**: This will fail if any client component imports from this module. Currently safe but fragile.

4. **Rate limiter is per-instance**: `rateLimit.ts` uses an in-memory Map. In a multi-instance deployment (Cloud Run with multiple replicas), rate limits are not shared.

### Dead Code

1. **`src/lib/domain.ts`** schemas: `entitySchema`, `documentSchema`, `reconciliationLineSchema`, `workspaceSchema` are well-structured but effectively dead — the page.tsx UI uses its own hardcoded data structures and never interacts with these schemas or the workspace API.

2. **`src/lib/crossValidation.ts`**: `crossValidateDocuments()` is never called from any code.

3. **`src/lib/ownership.ts`**: `validateOwnership()` is tested but never called from the UI.

4. **`src/lib/reconciliation.ts`**: `calculateReconciliation()` is tested but never called from the UI.

5. **`src/lib/returns.ts`**: `createReturnDraft()`, `returnDraftToXml()` are tested but never called from the UI.

6. **`src/lib/tax.ts`**: `simulateTax()` is tested but never called from the UI — page.tsx does inline math.

7. **`public/index-standalone.html`**: 34KB standalone HTML file. Purpose unclear — possibly a legacy prototype. Should be evaluated for removal.

8. **`sql/schema.mysql.sql`**: 276 bytes, probably just the CREATE TABLE statement from mysql.ts.

### Duplication

1. **Country type**: `CountryCode` is defined in both `src/lib/domain.ts` and `src/data/multiCountryTaxData.ts` — they happen to have the same values but are separate types.

2. **Tax rates**: Hardcoded in `src/lib/tax.ts` (TAX_CONFIG), also hardcoded in `src/data/multiCountryTaxData.ts` (per-country configs), and also hardcoded inline in `page.tsx` (e.g., `cfg.corporateTaxNormalRate * 0.58`). Three separate sources of truth.

3. **Entity data**: Corporate entity information defined in `INITIAL_COMPANIES` in page.tsx (~1200 lines of hardcoded data) but also would need to be defined separately for the domain.ts schema if the systems were connected.

### Security Issues

1. **No CSP headers**: `next.config.mjs` has no security headers configuration.
2. **No CORS configuration**: API routes have no explicit CORS policy.
3. **Gemini API key passed client→server**: The copilot route accepts `apiKey` from the request body (line 181). This means a client could send any API key. The key could be intercepted.
4. **No input sanitization on copilot prompts**: User prompts are sent directly to Gemini without sanitization (anti-prompt-injection concern).
5. **`server-only` not imported in API routes**: Only `mysql.ts` uses the `server-only` import.
6. **No file validation on scan-document**: The route accepts `fileName` from client JSON — no actual file upload, but the parameter is unsanitized.

### UX Issues

1. **No empty states**: When no entity is selected or data is unavailable, there are no meaningful empty states.
2. **No loading skeletons**: Only the Document AI verification has a simulated loading state.
3. **No error states**: API errors are caught silently.
4. **Horizontal scroll on mobile**: The 6500-line monolithic component has no responsive breakpoints for many table-heavy sections.
5. **No keyboard navigation**: No focus management, no skip links.
6. **Toast only notification**: No persistent notification center.
7. **Mix of languages**: UI text alternates between Indonesian and English inconsistently.
8. **"BigQuery Z-Score" label misleading**: LocalZ-score computation is labeled as BigQuery throughout the UI.

---

## E. Demo Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **No one-click data load**: App starts empty (README says "no demo companies") but INITIAL_COMPANIES is hardcoded. Contradicts current behavior — page always has data. | Confusion during demo | Need explicit "Load sample data" button with clear Demo badge |
| **Broken E2E tests**: Smoke test will fail | CI red | Must rewrite E2E tests |
| **Services badge lies**: "Document AI + BigQuery Connected" always shows | Juri credibility loss if questioned | Replace with honest status indicator |
| **Copilot claims Vertex AI Search engine**: Hardcoded response labels claim services not used | Same | Fix engine labels |
| **Export doesn't export**: Tax Return export button just shows toast | Dead button during demo | Connect to actual export functions |
| **Payment page is hollow**: Only 3 cards | Incomplete impression | Build out |
| **No audit trail**: Critical for compliance demo | Missing feature | Implement |
| **No maker-checker**: Required for hero flow | Missing feature | Implement |
| **`npm run build` status**: Belum terverifikasi — monolithic 345KB page.tsx may cause build issues or slow builds | Build failure during demo | Must verify |
| **MySQL required for workspace API**: Without MYSQL_URL, workspace API returns 503 | App works but no persistence | Add in-memory fallback |

---

## F. Figma Delta

> Note: Cannot directly access the Figma file via URL. Analysis based on the prompt's description of Figma screens and references in code comments like "FIGMA 1", "FIGMA 2", etc.

| Figma Element | Current State | Gap |
|---------------|---------------|-----|
| **Tab bar**: Companies / Calculation / Tax Return / Payment | ✅ Implemented | Matches described layout |
| **Sub-nav bar (navy #0F172A)**: Corporate / Individual Shareholder / Studies / Tax Calendar / Reports | ✅ Implemented | Matches |
| **Logo Nexora** | ✅ Implemented | "NX" gradient logo |
| **User/role switcher** | ✅ Implemented | Dropdown with 5 personas |
| **Demo/Live badge** | ⚠️ Partial | No prominent badge. Status is in the dark nav bar but hardcoded as "Document AI + BigQuery Connected" |
| **Notification center** | ❌ Missing | Only toasts |
| **Global search** | ❌ Missing | No command palette |
| **Document AI & BigQuery status indicator** | ⚠️ Misleading | Always shows connected |
| **Screen 1-5 (Corporate)**: Directory, Form, Docs, Structure, Shareholders | ✅ Implemented | All 5 views exist as `corpViewTab` options |
| **Asymmetric 2-column form** | ✅ Implemented | Corporate form has asymmetric layout |
| **Upload Document segmented buttons** | ✅ Implemented | View/Upload toggle per document category |
| **Ownership hierarchy chart** | ⚠️ Partial | Rendered as styled cards, not a proper tree/graph visualization |
| **Intermediate Shareholder table + BEPS** | ✅ Implemented | Table with modal CRUD |
| **Company Structure modal** | ✅ Implemented | Modal with Company/Individual tabs |
| **Bottom bar Cancel/Save** | ⚠️ Partial | Some views have save buttons, no unsaved changes confirmation dialog |

---

## G. Dead Buttons, Empty Menus, Placeholders

| Element | Location | Issue |
|---------|----------|-------|
| "Export Official Tax Return (.JSON / .XML)" button | Tax Return tab | Shows toast only; no actual file generated from this view |
| "Generate Billing ID" button | Payment tab | Shows toast only; no billing code generated |
| "Auto-Remediate" button | Studies > flagged transactions | Changes UI state (green badge) but no actual remediation logic |
| Reports tab content | Reports sub-nav | Shows industry benchmarks only; not a report builder |
| Tax Calendar content | Calendar sub-nav | Static 4 cards; no interactive calendar |
| Studies tab content | Studies sub-nav | Shows fraud transactions + treaty info; NOT a study/knowledge library |
| "View Form" button | Company directory | Navigates to corporate form (works) |
| "Structure" button | Company directory | Opens structure view (works) |
| Consolidated modal "Buka Entitas" | Consolidation popup | Works (selects entity) |

---

## H. Summary of Key Findings

### Strengths
1. **Rich domain logic exists**: Well-structured Zod schemas, fraud rules, tax calc, reconciliation, return export — all tested.
2. **Multi-country data**: Comprehensive sample data for ID, SG, MY, US with realistic tax details.
3. **RBAC concept**: 5 personas with access control concept implemented.
4. **Copilot works**: Both demo (keyword-matched) and live (Gemini API) modes function.
5. **Clean infrastructure**: Dockerfile, CI, Tailwind v4, Next.js 15, TypeScript strict.

### Critical Gaps
1. **UI disconnected from domain logic**: page.tsx uses its own data structures; lib/ functions are effectively unused.
2. **No persistence in UI flow**: All entity/document/shareholder changes are lost on refresh.
3. **Half the navigation is hollow**: Calculation, Tax Return, Payment tabs are minimal displays.
4. **No hero flow**: Cannot demonstrate end-to-end compliance cycle.
5. **Misleading service claims**: UI claims Document AI + BigQuery connected when they aren't.
6. **No audit trail, no maker-checker, no notifications, no i18n**.
7. **Monolithic single-file UI**: 6500 lines in one file makes development and maintenance difficult.

### Risk Assessment for Competition
- **Current state**: Demo would fail to show a connected compliance cycle. Judges would find hollow pages and misleading service badges.
- **After proposed improvements**: With hero flow connected and all menus functional, the rich data and AI capabilities can shine.
