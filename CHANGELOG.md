# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - v0.5.2 draft

### Changed
- Added a compact dark-fantasy UI polish pass using charcoal/leather panels, bronze accents, and parchment-highlighted text for the main QuickDeck combat cockpit.
- Tightened the roster, selected-actor header, HP/FP pass-through controls, defense buttons, helper controls, and attack cards while preserving existing GURPS-native attack, damage, defense, targeting, z-order, and HP/FP current-value behavior.

## [Unreleased] - v0.5.1 draft

### Added
- Selected-character HP/FP pass-through controls with larger bars, minus/plus buttons, and compact direct entry fields that update `system.HP.value` and `system.FP.value` without changing max HP/FP.
- Roster HP/FP value chips and mini bars for every loaded QuickDeck actor.
- Large selected-character Dodge/Parry/Block combat buttons that prefer native GURPS roll handling and warn safely when no native defense roll is available.

### Changed
- QuickDeck continues to leave attack, defense, and damage resolution to native GURPS, avoids custom damage math in the combat flow polish pass, limits HP/FP mutation to explicit GM pass-through current-value edits, and points damage follow-ups back to native GURPS chat controls.

## [Unreleased] - v0.5.0 draft

### Added
- Native combat flow polish: attack buttons keep using GURPS sheet-style `handleRoll`/OTF handling while QuickDeck records pending attack context for later handoff work.
- Guarded native-window and chat focus helpers bring GURPS dialogs/windows and the Foundry chat sidebar forward after native rolls without embedding chat or adding permanent listeners.
- Combat helper controls for **Bring Chat Front**, **Clear Targets**, **Next Actor**, and **Repeat Last Attack**.
- Pending attack context stores actor id, attack index/name, OTF, damage string, source path, raw attack reference, and lowercase `hitlocation` when attack metadata already exposes one.

### Changed
- QuickDeck continues to leave attack, defense, and damage resolution to native GURPS, avoids any direct HP/FP mutation or custom damage math in the combat flow polish pass, and points damage follow-ups back to native GURPS chat controls.

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
