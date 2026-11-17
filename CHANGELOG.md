# Changelog

All notable changes to Nexora will be documented in this file.

## [2.3.0] - 2026-11-17
### Changed — editorial redesign ("Editorial")
- New visual language across the shell and every page: warm paper canvas, ink text, Newsreader serif for headlines and key figures (Inter stays for UI text, JetBrains Mono for IDs), one Prussian-blue accent, muted status colours, hairline rules instead of boxed cards and shadows, and a yellow highlighter mark for "look here".
- **Ringkasan** is now a front page: a data-driven headline (e.g. "1 kasus kritis perlu diputuskan sebelum SPT grup bisa disetujui") with its next move as the primary button, a key-figures strip, the six-step cycle as one ribbon with the current step highlighted, a ranked "Perlu keputusan Anda" list, deadlines, entities and the VAT chart with its latest figures.
- Every cycle page shows a **Berikutnya** line under its lede: what is still open on this step, or that it is done, plus a link to the next step.
- `MetricBand` renders as an editorial key-figures strip (heavy ink rule, hairline columns, serif figures that step down in size for long Rupiah amounts); the dark slab is gone everywhere.
- Lighter density: sidebar as a numbered table of contents, quieter badges and tabs, scope toggles moved into filter rows, fewer repeated row buttons (Pembayaran, Kalender, Studi), the documents table merged from 7 to 6 columns, serif section and dialog titles.
- Chart series colours replaced with a palette validated for colour-vision deficiency on the paper surface.
- Remaining "temuan" labels on entity screens now say "kasus".

### Added
- `@fontsource-variable/newsreader` (self-hosted serif). Run `npm install` after pulling.
- UI primitives: `Section`, `NextStep`, `CycleNext`, `CycleRibbon`, `useNextStep()`.

## [2.2.0] - 2026-11-17
### Changed — one Kasus screen
- **Kasus** (`/cases`) replaces *Risiko & fraud* and *Review temuan*. Each finding is one case: the checks that fired, the flagged document fields with per-field extraction confidence, the rule basis, an AI investigation, the maker-checker decision, and its money effect. `/risk` and `/review` redirect (keeping `?f=` and `?tab=`); every in-app link points at `/cases`. The cycle is now six steps.
- **Rupiah trail**: a case's correction is run through the same CIT engine as the return. For the sample TBTS case that is +Rp 13,2 jt PPh with Pasal 31E, not the Rp 26,4 jt a flat 22% estimate suggests.
- Working pages (Dokumen, Kasus, Pembayaran, Laporan, Pemegang saham, entity profile, PPN recap) use a new light `MetricBand` variant; the dark band stays on Ringkasan and the reconciliation.
- One score direction: aggregate scores are always *Skor kepatuhan* (100 = no open risk). A finding's own number is labelled *Prioritas*.
- Compact Rupiah amounts spell out *miliar* / *triliun* (`Rp 1,23 miliar`), so they cannot be read as millions.

### Added — AI that shows its work
- **Investigation agent** (`/api/investigate`, `lib/investigation.ts`, `lib/ai/investigator.ts`): Gemini function calling over eight deterministic tools. Every brief line must cite the tool steps it relies on; uncited lines are dropped. Offline, a rule-specific plan runs the same tools. Results are stored per finding, drafted maker notes are labelled, and each run is audit-logged with its engine.
- **Grounded Copilot** (`lib/ai/copilot.ts`): answers only from case data, workspace findings and a rule library (`data/taxCorpus.ts`, internal summaries marked unverified), with numbered citations. Off-topic and prompt-injection questions are refused before any model call. The panel can be scoped to a case; confidence is a word with its basis.
- **Engine badges** on every AI output: `Gemini · live` (with model id), `Simulasi lokal · offline`, or `fallback`.
- **Document extraction** reads the file with Gemini when a key is set (per-field confidence; instructions hidden in a document are surfaced and ignored). Without a key the simulation says so. Extraction no longer marks a vendor as validated.
- `GEMINI_MODEL` configures the model id (default `gemini-2.5-flash`); the key is read on the server only and the Copilot no longer accepts one from the client.
- 16 unit tests (cases, Rupiah trail, offline and mocked-live investigation, Copilot grounding and refusals) and 3 end-to-end tests.

### Fixed
- Removed claims the product cannot back: the ISO 27001 badge and persona labels, "enterprise-grade", "real" Coretax XML and e-Billing, "statistically calibrated", and fixed 99.x% confidence figures. Legal-document uploads now wait for a person to mark them checked instead of being auto-verified with an invented confidence.
- The sample CFO persona is now *Dewi Anggraini* (fictional).
- `/risk` was marked done when no *critical* finding was open even if others were; the Kasus step is done only when every case is decided.

## [2.1.0] - 2026-11-06
### Changed — one visual system across every module
- **Metric band**: every module now opens with the same dark executive summary strip instead of a loose grid of white stat tiles. The band pairs a lead panel — a `ComplianceRing` dial plus the headline status — with two to four metric cells that can navigate or filter. Applied to Ringkasan, Risiko & fraud, Dokumen, Rekonsiliasi fiskal (reconciliation and VAT), Pembayaran, Laporan & audit, Pemegang saham & UBO, and the entity profile.
- New design-system components `MetricBand`, `BandLead` and `ComplianceRing` (`src/ui/band.tsx`) hold the pattern in one place; each band's cells reserve two detail lines so every label sits on a shared baseline.
- `StackBar` gained an `onDark` variant so the severity breakdown can sit inside the band on Risiko & fraud.
- Each band's dial reports the progress that module is accountable for: compliance score (Ringkasan, Risiko, Laporan, entity profile), verification progress (Dokumen), settlement by value (Pembayaran), and KYC completeness (Pemegang saham).
- The `Stat` tile was removed. `MetricBand` supersedes it and nothing imported it any more.

### Added
- `groupRiskScore()` (`src/lib/compliance.ts`) scores a set of entities as the average of their per-entity scores. `entityRiskScore()` deducts a penalty per open finding from 100, so pooling a whole group's findings into it stacks the penalties and collapses the score. Ringkasan and Risiko & fraud now share this helper and report the same number, covered by unit tests.

### Fixed
- Documentation referenced branches that no longer exist (`improve/concept-v3`, `rebuild/v5`) and an out-of-date test count. README, the AI Builder Cup submission guide, and the completeness matrix now point at `main` and state the real suite: 51 Vitest unit tests and 6 Playwright end-to-end tests.

## [2.0.1] - 2026-10-29
### Changed
- **Unggah dokumen**: Document AI now reads the file as soon as it is chosen or dropped, so there is no separate "Ekstrak AI" button. The drop zone shows reading → done / risk / error states with a retry. Fields filled by AI carry an `AI` tag and per-field provenance, and values the user typed are never overwritten. Removing the file clears only what AI filled. Changing the entity re-reads the file for that jurisdiction.
- The simulated scanner takes the counterparty from the file name (`faktur-pt-sinar-abadi.pdf` → "PT Sinar Abadi"; `…-pte-ltd`, `…-sdn-bhd`, `…-inc` also work).

### Fixed
- Changes made just before a full page load are no longer lost. Writes flushed on `pagehide` are handed to the next page through `sessionStorage` and override the bootstrap read until the server has them. Queued writes are dropped on "reset sample data".
- Development: writes to the local SQLite database (`sql/`) no longer trigger a recompile and page reload.

## [2.0.0] - 2026-10-28
### Changed — rebuilt from scratch
- New UI codebase: App Router route per module (`src/app/*`), feature folders (`src/features/*`), shell (`src/shell/*`), in-house design system (`src/ui/*`) and a single `WorkspaceProvider` for state & persistence. The 6,500-line `page.tsx` and the old tab components were removed.
- New visual design "Ledger": clean light fintech, Inter + JetBrains Mono, cobalt accent, hairline borders, tabular numbers, accessible SVG charts.

### Added — complete compliance cycle
- **Ringkasan** group dashboard with action centre, entity scores and cycle status.
- **Dokumen**: document inbox with upload, Document AI extraction, per-field confidence, manual override & verification.
- **Risiko & fraud**: rule engine (`lib/compliance.ts`) wired into the UI for the first time — TBTS, MTF, split invoicing, Z-Score, MyInvois UUID, non-deductible, vendor & share-register cross-validation — with evidence, money at risk and suggested corrections.
- **Review temuan**: maker-checker decisions with history; confirmed findings apply fiscal corrections to the reconciliation.
- Per-entity reconciliation & CIT for ID/SG/MY/US (`lib/cit.ts`), tax credits, VAT recap with blocked input VAT, multi-country withholding calculator.
- Annual return per entity generated from the reconciliation, pre-submission checks, approval locks figures and issues the PPh 29 / balance-due billing code.
- Payments across jurisdictions with derived overdue status & indicative penalties; calendar month view & .ics with reminders; UBO register with PII masking & dividend simulator; TP markup simulator; data-driven executive report & audit-pack CSV.
- Command palette search over findings & documents; live notifications.
- Seed dataset versioning (`SEED_VERSION`) and `app_state` persistence for the compliance workspace and ledgers.

### Fixed
- Statuses no longer go stale (overdue derived from dates).
- Writes survive navigation (keepalive + flush on page hide).

## [1.1.0] - 2026-10-28
### Changed
- Full UI redesign: new "Iris" design system (brand palette, Plus Jakarta Sans + JetBrains Mono, softer elevation, 14px radii).
- App shell rebuilt: dark sidebar with grouped navigation and entity switcher replaces the three stacked top bars; slim breadcrumb top bar with wide ⌘K search.
- Compliance-cycle stepper redesigned and now follows the active module automatically.
- Database sync/reset controls moved into a compact sidebar status card; Copilot launcher is now a compact pill.
- Company directory KPI cards and table restyled; money columns no longer wrap; lighter type weights app-wide.
- Mobile: navigation drawer reuses the sidebar; fixed horizontal overflow on Calculation.

### Fixed
- Studies tab crashed (`applicableJurisdictions` undefined) on records hydrated from the database.
- Tax Return showed "Rp NaN" when the persisted return used the seed's field names.

## [1.0.0] - 2026-10-18
### Added
- Initial release for AI Builder Cup BFSI track.
- Multi-jurisdiction tax engine (ID, SG, MY, US).
