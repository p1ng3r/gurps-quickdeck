# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - v0.8.2.0 sidecar

### Changed
- Replaces the single-grid layout with a center-primary cockpit and optional docked roster/action sidecars.
- Collapsing side panels no longer reserves empty grid space around the center cockpit.

## [Unreleased] - v0.8.1.9 left-fit

### Changed
- Repairs qd18 layout positioning so the roster starts near the left edge, the icon spine is attached to the left pane, and the center/right panes remain visible.

## [Unreleased] - v0.8.1.8 functional-pane

### Changed
- Rebuilds the three-pane layout around functional roles: roster left, selected actor center, complete action browser right.
- Keeps the center actor cockpit as the primary visible pane with five pinned action slots.

## [Unreleased] - v0.8.1.6 true-clean-pane

### Changed
- Replaces the broken qd8/qd15 wrapped layout with a true clean-room three-pane QuickDeck shell.
- Keeps the center cockpit fixed and visible while side panes collapse.
- Preserves existing QuickDeck data actions and GURPS behavior.

## [Unreleased] - v0.8.1.4 layout-repair

### Changed
- Repaired the qd8 three-column shell layout so left/center/right panels align to fixed canvas targets with matching window width and panel collapse widths.
- Scoped qd8 overrides for legacy `quickdeck-shell`, `quickdeck-content`, and `quickdeck-stage` sizing to prevent center cockpit clipping and detached panel spacing.
- Attached the left icon spine to the roster panel, restyled qd8 rail/action buttons to remove plain browser defaults, and removed the temporary Quick Actions strip.
- Corrected right drawer presentation so the open drawer reads as a real right panel with stable scroll behavior.

## [Unreleased] - v0.8.1.3 foundry-three-panel-ui

### Added
- Adds production three-panel command desk shell.
- Adds left and right collapse rails.
- Keeps center cockpit fixed width.
- Preserves existing QuickDeck behavior.

## [Unreleased] - v0.6.0 release candidate

### Added
- Wired the v0.7 Command Desk art skin foundation after the existing QuickDeck stylesheet while keeping runtime behavior unchanged.
- Added per-actor/client Combat Favorites with compact pinned attack rows, full-list star toggles, and native GURPS attack passthrough preserved for favorite launches.
- Added per-actor/client Spell Favorites with compact pinned spell rows, full-list star toggles, stable spell keys, and native GURPS spell passthrough preserved for favorite launches.
- Added selected-character HP/FP pass-through controls, roster HP/FP chips, large Dodge/Parry/Block buttons, and compact combat helper controls for common table flow.
- Added a UI design spec for Combat Favorites, Spell Favorites, Quick Skills curation, and scroll-styled reference popups.

### Changed
- Rebuilt the selected-actor cockpit with a clearer identity header, compact GM helper strip, redesigned HP/FP resource cards, prominent defenses, and the existing dense attack list.
- Generalized the guarded native-window focus helper so GURPS dialogs, attack/defense windows, actor sheets, chat, and other native Foundry windows can stay above QuickDeck after guarded actions.
- Refined Quick Skills into a pinned-only fast-access drawer with compact rows, native skill-roll passthrough, visible level/relative/points/reference metadata, and an in-row unpin control.
- Restyled the reference popup as a parchment-style local reference window with a dark leather header, ink-toned sections, source/page metadata, and CSS-only scroll-edge shading.
- Applied the v0.6.0 fantasy UI polish pass: dark leather framing, bronze trim, parchment ledger rows, engraved drawer tabs, shield-like defense plates, pinned-slip favorites, and a bronze/leather restore pill.
- Preserved QuickDeck's native-GURPS-first behavior: attacks, defenses, damage, skills, spells, targeting, ModifierBucket behavior, and rule resolution remain delegated to Foundry/GURPS instead of custom QuickDeck damage or math rules.

### Fixed
- Kept the parchment-style reference popup body independently scrollable after the visual restyle.
- Stabilized decorative CSS layers so ornament pseudo-elements remain non-interactive and do not block drawer tabs, attack cards, or reference popup controls.

### Documentation
- Consolidated the accumulated v0.5.x draft notes into this v0.6.0 release-candidate entry.
- Updated release-facing wording to describe Combat Favorites, Spell Favorites, Quick Skills, reference popup scrolling, the selected-actor cockpit rebuild, and the CSS ornament pass as one coherent v0.6.0 prep pass.

## [Unreleased] - v0.4.0 draft

### Added
- Target Opponent workflow for combat attack pills: QuickDeck temporarily minimizes, displays a lightweight tactical reticle, left-click targets a canvas token through native Foundry targeting, and right-click/Escape cancel safely.
- Forge-safe cleanup for Target Opponent mode so temporary listeners and reticles are removed on target, cancel, scene switch, close, or error.
- Forge-safe placement reticle/cursor feedback for temporary token placement mode.
- Guided Attack MVP flow in Combat drawer: clicking **Attack** opens a setup dialog, applies optional modifiers to the GURPS Modifier Bucket, minimizes QuickDeck for target selection, restores afterward, executes attack via GURPS OTF when possible, and tracks outcome for follow-up damage rolling.
- Combat attack list layout now separates melee and ranged attacks into distinct sections for readability.
- Combat window layout refactor adds tactical attack-card hierarchy plus stable target, modifier bucket, and combat modifier icon placeholder anchors for upcoming v0.4.0 UX improvements.
- Skills and spells now use native GURPS sheet-style passthrough handling where possible.
- Combat attack pills now surface native GURPS ModifierBucket status in the modifier area, including the current total such as `+0`, `+2`, or `-3`, and the modifier area can now open the native GURPS ModifierBucket UI while preserving a safe neutral fallback when unavailable.
- Fixed a false warning when opening the native GURPS ModifierBucket from QuickDeck.
- QuickDeck's modifier box now live-refreshes from native GURPS ModifierBucket updates.

### Changed
- Combat attack buttons now use **Attack** labeling and guided flow instead of direct quick roll.
- Skill and spell clicks now build native sheet-like datasets and call `GURPS.handleRoll` before falling back to OTF.
- Version metadata updated for v0.4.0 draft.
- Repaired Forge-safe token placement workflow so Drop Token minimizes QuickDeck, places or cancels once, removes temporary listeners/reticle immediately, and keeps the restore pill functional.

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
