# Changelog

All notable changes to Nexora will be documented in this file.

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
