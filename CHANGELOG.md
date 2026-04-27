# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - v0.3.0 draft

### Added
- Spells drawer/tab foundation with search + empty-state handling.
- Spell extraction from common actor paths (`system.spells`, `system.magic`, `system.traits.spells`) plus spell-like actor items.
- Clickable skill names in Skills and Quick Skills drawers that open QuickDeck Reference.
- Clickable spell names in Spells drawer that open QuickDeck Reference.
- New Application v1 QuickDeck Reference window (local placeholder content, no network calls).
- PDF import roadmap placeholder setting for future user-provided local PDF indexing.

### Changed
- Default drawer choices now include `spells`.
- README updated with spells/reference/PDF roadmap notes and copyright-safe policy.

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
