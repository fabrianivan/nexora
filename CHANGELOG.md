# Changelog

All notable changes to Nexora will be documented in this file.

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
