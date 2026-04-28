# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - v0.3.0 draft

### Changed
- Simplified QuickDeck Reference to use bundled `data/reference-summaries.json` as the primary source of reference content.
- Expanded bundled reference summary loading to include `data/martial-arts-combat.reference-summaries.json` alongside existing base and martial-arts-techniques files.
- Expanded bundled reference summary loading to include optional spell data from `data/magic.reference-summaries.json`, with safe no-crash handling for missing or malformed files.
- Kept rich reference popup sections for Author Summary, Skill Details, Description, Notes, Source Name, and Displayed Page.
- Added Spell Details rendering for bundled spell metadata fields (college, class, duration, cost, time to cast, prerequisites, item).
- Kept clickable skills/spells and the reference popup workflow in QuickDeck.
- Renamed manual Reference Index UX to **Local Overrides** to clarify this metadata is optional and user-owned.
- Removed QuickDeck window actions for PDF Sources and Text Sources.

### Removed
- Legacy PDF Sources manager UI and store modules.
- Legacy Text Sources manager UI and store modules.
- PDF text-search helper and source matcher modules tied to configured PDF/Text sources.
- PDF/Text source templates and related roadmap/help text that no longer applies to the bundled reference workflow.

## [0.2.0] - 2026-04-27

### Added
- Damage Roll button in Combat Burst.
- GURPS damage shorthand conversion:
  - `1d` -> `1d6`
  - `1d+2 cut` -> `1d6+2`
  - `2d-1 cr` -> `2d6-1`
- Manual damage card support for `sw` and `thr` damage.
- Forge-safe Drop Token click-to-place flow.
- Escape key cancel for token placement.
- QuickDeck minimize/restore UI controls.

### Changed
- Forge safety hardening in key interaction paths.
- Safer actor roster drop handling.
- Roll/chat error handling hardened.

### Fixed
- Drag/drop freeze caused by accidental actor.sheet access.
