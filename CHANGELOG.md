# Changelog

All notable changes to this project will be documented in this file.

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
