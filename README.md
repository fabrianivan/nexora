# Nexora 🛡️

<div align="center">

[![Preview](https://img.shields.io/badge/Status-Demo%20Preview-F59E0B?style=for-the-badge&logo=vercel&logoColor=white)](https://nexora-chi-cyan.vercel.app)
[![Google Cloud AI Builder Cup](https://img.shields.io/badge/Google%20Cloud-AI%20Builder%20Cup%202026-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)](https://cloud.google.com)
[![Track 1: BFSI](https://img.shields.io/badge/Track%201-BFSI%20Smart%20Risk%20%26%20Fraud-059669?style=for-the-badge&logo=google&logoColor=white)](https://cloud.google.com)
[![CI Build Status](https://img.shields.io/github/actions/workflow/status/fabrianivan/nexora/ci.yml?branch=main&label=Build%20%26%20CI&style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/fabrianivan/nexora/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](./LICENSE)

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-15.1_App_Router-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Gemini](https://img.shields.io/badge/Google_AI-Gemini_2.5_Flash-4285F4?style=flat-square&logo=googlegemini&logoColor=white)](https://ai.google.dev)
[![Tests Passing](https://img.shields.io/badge/Vitest-Passing-success?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev)
[![Code Style: ESLint](https://img.shields.io/badge/Code_Style-ESLint_9-4B32C3?style=flat-square&logo=eslint&logoColor=white)](https://eslint.org)

<br/>

[![Indonesia](https://img.shields.io/badge/%F0%9F%87%AE%F0%9F%87%A9_Indonesia-DJP_Coretax-E11D48?style=flat-square)](#)
[![Singapore](https://img.shields.io/badge/%F0%9F%87%B8%F0%9F%87%AC_Singapore-IRAS_InvoiceNow-2563EB?style=flat-square)](#)
[![Malaysia](https://img.shields.io/badge/%F0%9F%87%B2%F0%9F%87%BE_Malaysia-LHDN_MyInvois-D97706?style=flat-square)](#)
[![United States](https://img.shields.io/badge/%F0%9F%87%BA%F0%9F%87%B8_United_States-IRS_MeF-059669?style=flat-square)](#)
[![OECD Pillar Two](https://img.shields.io/badge/OECD-Pillar_Two_%26_BEPS-7C3AED?style=flat-square)](#)
[![ISO 27001](https://img.shields.io/badge/ISO%2FIEC_27001-Access_Governance-0F172A?style=flat-square)](#)

</div>

---

Nexora is currently a demo interface for a multi-country corporate tax workspace. It is not a production tax, KYC, fraud, filing, or payments service.

Production: <https://nexora-chi-cyan.vercel.app>

## Current behavior

- The current UI loads synthetic company examples and marks them as demo data. UBO identity fields are redacted.
- Corporate workspace state can be saved to MySQL through the authenticated workspace API. Configure `MYSQL_URL` and the access/session secrets to enable it.
- The document scanner is a simulation. It does not upload or inspect a file, check a government registry, or verify compliance.
- Copilot output is unverified, has no retrieved citations, and must not be used as tax advice. Tax and legal claims: **PERLU VERIFIKASI AHLI PAJAK.**
- The persona switcher changes the demo view only. It is not per-user or per-entity authorization.
- Billing, tax submission, external registry lookups, and payments are not connected.

The application displays a persistent warning that demo scores and sample company data are not production verification.

## Operating Modes

**Development preview** is available without auth configuration, but workspace persistence and AI endpoints remain unavailable. It uses synthetic data only.

In production, configure `NEXORA_ACCESS_TOKEN` and `NEXORA_SESSION_SECRET`. The browser exchanges the access token for an eight-hour, HttpOnly, SameSite session cookie. Workspace, scanner, and Copilot APIs reject requests without a valid session. The access token is shared; configure an identity provider and per-user/tenant authorization before multi-user production use.

When `GEMINI_API_KEY` is configured, Copilot can call Gemini. Its response is still unverified and no search or citation retrieval is connected. Scanner output remains simulated.

## Architecture

```mermaid
flowchart LR
  U[User] --> UI[Next.js 15 App Router]
  UI --> API[Workspace API]
  API --> R[MySQL repository]
  R --> DB[(MySQL JSON workspace)]
  UI --> D[Deterministic domain engines]
  D --> O[Ownership validation]
  D --> F[Fraud and Z-score rules]
  D --> T[Tax and reconciliation]
  D --> E[JSON XML PDF exports]
  UI -->|Live only| API[Validated and rate-limited route handlers]
  API --> G[Gemini API]
```

Business logic lives under `src/lib` and does not rely on AI. API keys remain in server route handlers.

## Run Locally

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set `MYSQL_URL`, `NEXORA_ACCESS_TOKEN`, and `NEXORA_SESSION_SECRET` in `.env.local` to enable authenticated persistence. The server creates the `nexora_workspaces` table on first use. In development without auth configuration, the app opens in demo preview and does not save changes. Open <http://localhost:3000>.

```bash
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Project Structure

```text
src/app/                 UI and server route handlers
src/lib/domain.ts        Zod schemas and domain types
src/lib/mysql.ts         Server-only MySQL workspace repository
src/app/api/workspace/   Validated workspace load/save API
src/lib/ownership.ts     Graph validation
src/lib/fraud.ts         Local fraud rules and Z-score
src/lib/tax.ts           Deterministic tax simulator
src/lib/reconciliation.ts Fiscal calculations
src/lib/returns.ts       Return schema and serializers
test/                    Vitest unit tests
e2e/                     Playwright smoke test
```

## Security and Data

- Workspace, scan simulation, and Copilot endpoints require a signed server session; the access token is shared by all operators.
- Workspace payloads are schema-validated and capped at 5 MB. AI/simulation routes have a basic per-process rate limit.
- The scanner does not accept or inspect file bytes. Do not enter real personal or tax data into the demo.
- There is no user directory, per-user role assignment, tenant isolation, audit log, or row-level ownership. Do not expose real customer data until these controls are implemented.

## Cloud Run

The standalone Docker image binds to `0.0.0.0` and reads `PORT` (default `8080`).

```bash
docker build -t nexora .
docker run --rm -p 8080:8080 -e PORT=8080 nexora
```

Or deploy with `gcloud run deploy nexora --source . --region asia-southeast2 --allow-unauthenticated` and provide `MYSQL_URL`, `NEXORA_ACCESS_TOKEN`, and `NEXORA_SESSION_SECRET` through Secret Manager/environment configuration. The MySQL instance must be reachable from Cloud Run.

## Known Limitations

- Workspace persistence requires MySQL and stores one shared JSON payload; multi-tenant storage is not implemented.
- The demo contains tax rates, compliance scores, ownership, and transaction examples that have not been legally or operationally verified.
- Copilot has no retrieval-backed citations. All tax and legal content: **PERLU VERIFIKASI AHLI PAJAK.**
- No official billing, return submission, registry, KYC/PEP screening, or payment integration exists.
