# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - v0.4.0 draft

### Added
- Guided Attack MVP flow in Combat drawer: clicking **Attack** opens a setup dialog, applies optional modifiers to the GURPS Modifier Bucket, minimizes QuickDeck for target selection, restores afterward, executes attack via GURPS OTF when possible, and tracks outcome for follow-up damage rolling.
- Combat attack list layout now separates melee and ranged attacks into distinct sections for readability.

### Changed
- Combat attack buttons now use **Attack** labeling and guided flow instead of direct quick roll.
- Version metadata updated for v0.4.0 draft.

### Changed
- Simplified QuickDeck Reference to use bundled `data/reference-summaries.json` as the primary source of reference content.
- Expanded bundled reference summary loading to include `data/martial-arts-combat.reference-summaries.json`, `data/basic-set-skills.reference-summaries.json`, and `data/magic.reference-summaries.json`, all with safe warning-only fallback when a file is missing/unavailable or malformed.
- Kept rich reference popup sections for Author Summary, Skill Details, Description, Notes, Source Name, and Displayed Page.
- Added Spell Details rendering for bundled spell metadata fields (college, class, duration, cost, time to cast, prerequisites, item).
- Kept clickable skills/spells and the reference popup workflow in QuickDeck.
- Renamed manual Reference Index UX to **Local Overrides** to clarify this metadata is optional and user-owned.
- Removed QuickDeck window actions for PDF Sources and Text Sources.
- Reworked QuickDeck minimize behavior so minimizing hides the full app window and shows a single floating top-screen `QD QuickDeck` restore pill.
- QuickDeck now persists minimized/restored state per client and restores the same presentation on reopen/reload.
- Closing QuickDeck while minimized now reliably removes the floating restore pill and prevents duplicate restore icons across repeated minimize/restore cycles.
- Updated floating restore pill controls: left-click restores QuickDeck, right-click drag moves the pill, context menu is suppressed on the pill, and final clamped `{ top, left }` position now persists per client.
- Polished restore pill drag responsiveness with pointer-capture-aware right-click dragging and requestAnimationFrame position updates.
- Restore pill position persistence now writes on drag release or window blur instead of every temporary movement.
- Clicking **Drop Token to Canvas** now auto-minimizes QuickDeck while keeping token placement armed until placement succeeds or is cancelled.
- Added memoized derived actor payloads (attacks/skills/spells/resources) with invalidation hooks on actor/item changes to reduce repeated nested scans on re-render.
- Updated drawer filtering to reuse prebuilt search text values instead of rebuilding per-entry haystacks during every filter pass.
- Hardened close cleanup to clear pending actor-select timers and purge derived cache state.
- Improved bundled/manual reference matching to resolve parenthetical variants in both directions (e.g., `Shatter` <-> `Shatter (VH)`, `Counterattack (Two-Handed Sword)` <-> `Counterattack`) while preserving exact-name+type match priority and graceful missing-entry fallback.

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
