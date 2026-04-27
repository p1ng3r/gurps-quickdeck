# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - v0.3.0 draft

### Added
- Spells drawer/tab foundation with search + empty-state handling.
- Spell extraction from common actor paths (`system.spells`, `system.magic`, `system.traits.spells`) plus spell-like actor items.
- Clickable skill names in Skills and Quick Skills drawers that open QuickDeck Reference.
- Clickable spell names in Spells drawer that open QuickDeck Reference.
- New Application v1 QuickDeck Reference window (local metadata matching, no network calls).
- New Application v1 QuickDeck PDF Sources manager for local source metadata (display name, book key, file hint, page offset, notes) with QuickDeck-themed panel styling.
- Client-scoped PDF source metadata setting stored as safe JSON.
- Reference source matching utility that compares source hints against configured PDF source `bookKey`/`displayName` values (exact + partial).
- Reference popup now computes PDF page target when page hint is numeric (`pdfPage = displayed + pageOffset`).
- Reference popup now adds safe **Open PDF** and **Copy Path** actions when a matched source includes a file/path hint, appending `#page=<target>` when available.
- Open PDF flow now fails safely with non-fatal popup-block warning messaging and no iframe/PDF parsing behavior.
- PDF import roadmap placeholder setting for future user-provided local PDF indexing.
- PDF source rows now include a safe per-row file picker button that uses Foundry's FilePicker when available and falls back to manual path entry with non-fatal warnings if unavailable/failing.
- PDF path selection now validates `.pdf` extensions and stores only the selected hint/path string in existing metadata settings (no parsing/rendering).

### Changed
- Default drawer choices now include `spells`.
- QuickDeck Reference now shows matched-source details (matched source, displayed page, PDF target page, file/path hint) with safe no-match fallback messaging.
- README updated with spells/reference/PDF source manager/roadmap notes and copyright-safe policy.

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
