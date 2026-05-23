## [Unreleased] - v0.9.3 dwarven-shell-css

### Changed
- Applied a CSS-only dwarven shell pass to QuickDeck using Batch 1 assets (frame rails/corners, header plate/knotwork accents, button skins, and collapse-tab art) while preserving existing three-pane behavior and collapse contracts.
- Strengthened left/right edge-tab outside positioning (`left: -32px` for left tab, `right: -32px` for right tab) within wrapper-scoped selectors so tabs remain on outer edges in both open and collapsed states.

## [Unreleased] - v0.9.0 settings-source-manager-local

### Changed
- Clarifies PDF Source Manager with an explicit source-priority panel: mapped user PDFs first, built-in summaries fallback, and no PDF parsing/extraction in Foundry.
- Improves mapping rows to show clearer key/name/path/offset/test-page diagnostics plus explicit mapping status text.
- Keeps existing save/edit/test/remove actions while improving settings copy and long-path readability with truncation-safe styling.

## [Unreleased] - v0.8.9.0 drawer-search-usability

### Changed
- Improves Actions drawer search usability for Combat, Skills, and Spells with per-section visible match status text.
- Adds per-section clear-search controls that only clear the corresponding search field.
- Adds per-section empty-state messaging for zero-match queries while preserving existing row actions and roll/reference behavior.

## [Unreleased] - v0.8.8.1 console-warning-cleanup

### Fixed
- Uses Foundry v13 namespaced Handlebars rendering in QuickDeck overlay rendering with compatibility fallback to legacy global renderTemplate.
- Removes missing command-desk .webp references by replacing them with CSS gradient/border fills to eliminate repeated 404 console noise without layout changes.

## [Unreleased] - v0.8.7.1 pinned-actions-polish

### Changed
- Adds center Quick Actions card polish: per-action remove control, type badge, truncated labels with full title tooltips, and an explicit empty-state prompt while preserving fallback Attack/Skill/Spell/More buttons.
- Updates drawer pin-button tooltips to reflect current pin state with “Pin to Quick Actions” / “Remove from Quick Actions”.
- Keeps Quick Actions pinned entries client-scoped, per-actor, and capped at five slots with no reorder/drag-sort UI changes.

## [Unreleased] - v0.8.6.9 reference-polish

### Changed
- Gates noisy reference matching/indexing debug logs behind DEBUG while leaving warnings visible.
- Replaces weak placeholder bundled skill summaries with short useful popup text.
- Adds non-fatal bundled reference integrity warnings for missing name/type/bookKey and invalid displayedPage values.

## [Unreleased] - v0.8.6.8 ref-data-load

### Fixed
- Restores bundled reference summaries as the primary popup content while keeping mapped PDFs as an optional secondary Open PDF Page action.

## [Unreleased] - v0.8.6.5 ref-pdf-button

### Added
- Adds an Open PDF Page button to reference popups when a fallback/manual entry can resolve to a mapped PDF and displayed page.

## [Unreleased] - v0.8.6.4 pdf-input-focus

### Fixed
- Fixes PDF Source Manager key/name/offset inputs losing focus while typing by avoiding full QuickDeck re-renders during input.

## [Unreleased] - v0.8.6.3 key-name-map

### Added
- Adds a larger GCS-compatible page-reference key/name helper map for PDF mapping autofill and missing-PDF messages.
- Adds attribution/notice for the GCS-derived key/name metadata.

## [Unreleased] - v0.8.6.2 pdf-offset

### Fixed
- Normalizes mapped PDF URLs and makes page-offset calculations visible when opening mapped PDFs.

## [Unreleased] - v0.8.6.1 pdf-ref-open

### Added
- Opens mapped user PDFs from attack, skill, and spell reference buttons using GCS-style page-reference keys.

### Changed
- Keeps built-in QuickDeck reference summaries as fallback when no mapped user PDF exists.

## [Unreleased] - v0.8.6.0 pdf-picker

### Added
- Adds a Settings-tab PDF Source Manager for user-selected GURPS page-reference PDFs.
- Stores client-side key/path/offset mappings for GCS-style references while keeping built-in summaries as fallback.

## [Unreleased] - v0.8.5.6 cards-damage

### Fixed
- Reapplies the damage-not-attack fix on top of the action-card UI baseline so center favorite cards, collapsible sections, and favorite highlighting remain intact.

## [Unreleased] - v0.8.5.4 action-cards

### Changed
- Upgrades center cockpit favorites into collapsible Combat, Skills, and Spells action-card sections with full compact controls.
- Highlights favorited rows/cards and shows variant/detail information so similarly named attacks remain distinguishable.
- Routes QuickDeck damage buttons through native GURPS damage handling or rollable actor damage formulas instead of only prompting for native chat damage controls.

## [Unreleased] - v0.8.5.3 pinned-favorites

### Changed
- Replaces center pinned placeholders with real selected Combat, Skills, and Spells favorite sections.
- Reduces Dodge/Parry/Block defense dials by about 25% while preserving roll-defense behavior.

## [Unreleased] - v0.8.5.2 center-vitals

### Changed
- Replaces center HP/FP/Move resource cards with compact roster-style editable HP/FP lines in the selected actor header.
- Moves Move into a right-justified two-row tile beside selected actor vitals.

## [Unreleased] - v0.8.5.1 info-popover

### Changed
- Replaces the always-visible QD version badge text with a compact ? info button.
- Adds an in-frame version/info popover for build label, module version, and UI mode.

## [Unreleased] - v0.8.5.0 in-frame-chrome

### Changed
- Moves QuickDeck badge and window controls into an in-frame chrome row so they remain visible near screen edges.
- Keeps the qd40 body shrink-wrapped and tabs outside body edges without reintroducing dead side space.

## [Unreleased] - v0.8.4.9 badge-frame

### Changed
- Moves QuickDeck title/version into a small overlay badge so header text no longer controls layout width.
- Restores a compact painted qd40 frame around the shrink-wrapped body without reintroducing dead side space.

## [Unreleased] - v0.8.4.7 true-edge-tabs

### Changed
- Forces the qd40 frame and shell to shrink-wrap only visible panels, with tabs protruding outside panel edges instead of occupying internal frame space.
- Anchors closed drawer tabs directly to the center cockpit edge and open drawer tabs directly to drawer edges.

## [Unreleased] - v0.8.4.6 panel-tabs

### Changed
- Anchors closed drawer tabs to the center cockpit edges and open drawer tabs to drawer edges so tabs no longer float at the outer shell edge.
- Removes remaining empty shell space between the center cockpit and the Actions tab.

## [Unreleased] - v0.8.4.5 hard-compact

### Changed
- Removes open-state tab rail gutters by moving collapse controls inside open drawers.
- Adds dedicated qd40 compact selectors for the selected actor header, portrait, and resource cards so center cockpit compacting visibly applies.
- Preserves compact action-row cleanup from v0.8.4.4.

## [Unreleased] - v0.8.4.3 compact-pills

### Changed
- Slims the qd40 center cockpit and tightens defense/resource spacing.
- Converts center utility controls to compact square icon buttons and removes Sheet/Modifier Bucket from the center row.
- Moves Target and Modifier Bucket tools onto attack and spell action rows.
- Simplifies skill row controls with compact pin/info buttons instead of text Pin/Unpin/Ref buttons.

## [Unreleased] - v0.8.4.2 open-fix

### Fixed
- Forces QuickDeck launcher and debug open calls to restore the chromeless overlay from minimized/stale states.
- Consolidates qd40 render flow so the overlay opens reliably without depending on Foundry popout sizing.
- Tightens qd40 drawer/cockpit spacing to reduce left/right buffer while keeping drawer tabs visible.

## [Unreleased] - v0.8.4.1 overlay-controls

### Changed
- Adds a chromeless QuickDeck header bar with drag, minimize, and close controls.
- Keeps left/right drawer tabs visible in both open and closed states so drawers can be reopened or collapsed without losing the handles.

## [Unreleased] - v0.8.4.0 chromeless

### Changed
- Replaces the visible normal Foundry Application popout with a chromeless qd40 QuickDeck overlay to eliminate the oversized black window.
- Keeps qd31/qd40 drawer-cockpit behavior while avoiding Foundry window-content sizing constraints.

# Changelog

## [Unreleased] - v0.8.3.6 force-fit

### Changed
- Replaces shell measurement-based sizing with deterministic qd31 state-based window fitting.
- Converts drawer pull tabs into real layout slots so closed drawers no longer rely on absolute overflow.
- Forces qd31 app/window-content/shell width to the calculated visible UI width to eliminate giant empty space.

## [Unreleased] - v0.8.3.5 fit-tools

### Changed
- Fits the outer Foundry window to the measured qd31 cockpit/drawer shell instead of leaving oversized empty space.
- Repairs Actions drawer visibility to mirror Roster drawer behavior.
- Fixes Chat icon targeting, adds Target actions for Combat/Spells, and adds a modifier bucket editor control.

## [Unreleased] - v0.8.3.4 qd31-polish

### Changed
- Polishes the qd31 drawer-cockpit layout so the Actions drawer mirrors the Roster drawer and the app width matches visible drawer state.
- Converts center command controls into a compact icon row and reduces actor portrait size.
- Restores action/skill/spell row detail/reference hooks and adds double-click sheet opening from actor portrait/name.

All notable changes to this project will be documented in this file.

## [Unreleased] - v0.8.3.3 qd31-complete

### Changed
- Completes the qd31 drawer-cockpit template by replacing placeholders with real HP/FP/Move controls, pinned slots, roster cards, and action drawer rows.
- Keeps drawer architecture while preserving QuickDeck action hooks.

## [Unreleased] - v0.8.3.1 canvas-fit

### Changed
- Polishes the qd30 blank-slate center cockpit and sidecars toward the approved canvas mock.
- Adds compact HP/FP icon, bar, and small square control styling.
- Restores action sidecar search bars and fixes sidecar focus so drawer tabs do not fall behind the center window.

## [Unreleased] - v0.8.2.0 sidecar

### Changed
- Replaces the single-grid layout with a center-primary cockpit and optional docked roster/action sidecars.
- Collapsing side panels no longer reserves empty grid space around the center cockpit.

## [Unreleased] - v0.8.2.1 sidecar-tabs

### Changed
- Reduces the center cockpit to a compact base width and adds visible in-app pull tabs for roster and action sidecars.
- Keeps collapsed sidecars from reserving layout space.

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

## [Unreleased] - v0.8.2.2 real-sidecars

### Changed
- Replaces the failed in-window sidecar fallback with real separate Application sidecar windows for roster and actions.
- Keeps the center cockpit as its own resizable primary window and reduces width without reducing height.

## [Unreleased] - v0.8.3.2 drawer-cockpit

### Changed
- Replaces detached popup sidecars with left/right slide-out drawers attached to the center cockpit.
- Reduces the center cockpit width to 520px without reducing height.
- Splits roster drawer into Active Roster and Actors to Add sections using Character/NPC actor sources.
- Prepares assets/ui/command-desk/ for future lightweight transparent .webp UI assets with pointer-events:none decorative layering.
