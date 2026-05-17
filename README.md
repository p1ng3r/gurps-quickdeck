# GURPS QuickDeck

A lightweight, drawer-based companion window for **Foundry VTT v13** with the **GURPS 4e Game Aid** system, including **Forge VTT-safe workflows**.

## What's New in v0.6.1 (Reference UI Foundation)

- Started from the clean v0.6.0 release baseline and abandoned the failed v0.6.1 visual experiment direction.
- Wired the existing transparent WEBP q75 layout assets under `assets/ui/layout/` into the v0.6.1 command-desk frame, including the main shell, top command bar, roster frame, selected-actor cockpit, right drawer, combat favorites, rows, tabs, search inputs, 3d6 buttons, Target, and ModifierBucket controls.
- Corrected the default proportions toward a wider three-zone command desk so the left roster, central actor cockpit, and right drawer read as distinct areas instead of a compact legacy drawer.
- Reframed the main QuickDeck window toward the approved mockup: left roster column, center selected-actor command cockpit, and right-side tab/drawer controls with the actual dark leather / bronze / parchment layout art as the primary visual layer instead of CSS-only placeholder gradients.
- Moved Combat Favorites directly under the selected actor cockpit while keeping the full attack list in the Combat drawer and preserving the existing per-actor favorite workflow.
- Clarified roll affordances as **3d6** controls for attacks, skills, quick skills, and spells, now backed by the `roll-button-3d6.webp` art while retaining readable fallback text and native GURPS passthrough handlers.
- Kept Reference Sources / Local Overrides visible as the current copyright-safe metadata surface; future Local PDF Sources should point to user-owned local PDFs without bundling, scraping, or distributing copyrighted text.
- Left native GURPS behavior unchanged: attacks, defenses, damage follow-ups, skills, spells, targeting, ModifierBucket access/status, windows/focus, token placement cleanup, minimize/restore, and reference popup scrolling remain delegated to the existing v0.6.0 hooks.

## What's New in v0.6.0 (Release Candidate)

- QuickDeck's selected-actor cockpit has been rebuilt with a clearer identity header, compact GM helper strip, redesigned HP/FP resource cards, prominent Dodge/Parry/Block controls, and dense attack rows for fast table use.
- Combat Favorites and Spell Favorites add per-actor/client pinned rows above the searchable combat and spell lists while preserving native GURPS attack and spell launch behavior.
- Quick Skills is now the pinned-only fast-access surface for curated skills; the full Skills drawer remains the place to browse, search, and pin skills.
- The local QuickDeck Reference popup now uses a parchment-style presentation with source/page metadata and an independently scrollable body for longer bundled or local override entries.
- The fantasy UI polish pass adds CSS-only leather, bronze, parchment, engraved-tab, shield-plate, pinned-slip, and restore-pill ornamentation without changing QuickDeck's runtime rules behavior.
- QuickDeck remains native-GURPS-first: it does not add custom damage, DR, wounding, shock, knockback, crippling, spell, skill, targeting, or ModifierBucket math rules. Attacks, defenses, damage follow-ups, skills, spells, and modifiers continue to route to native Foundry/GURPS behavior wherever available.

## What's New in v0.4.0 (Draft)

- Combat drawer weapon buttons now launch a guided **Attack** flow (MVP).
- Combat attack pills now include a **Target Opponent** workflow that temporarily minimizes QuickDeck, shows a tactical reticle, and uses native Foundry token targeting with Forge-safe cleanup.
- Combat attack pills now surface the current native GURPS **ModifierBucket** status in the modifier area and can open the native ModifierBucket UI without applying, clearing, or recalculating modifiers.
- Guided flow can apply common situational modifiers through the existing GURPS Modifier Bucket API where available.
- QuickDeck minimizes while waiting for in-game target selection and restores automatically after selection/timeout.
- Attack, skill, and spell actions prefer native GURPS sheet-style handling where available, with OTF/QuickDeck fallback paths for unsupported cases.
- Attack list readability improved with separate melee and ranged sections.
- Combat window layout refactored with tactical attack-card hierarchy and stable target/modifier/icon placeholder anchors for upcoming native GURPS UX improvements.
- Skills and spells now use native GURPS sheet-style passthrough handling where possible, matching the sheet click path before falling back to OTF.
- Repaired the Forge-safe **Drop Token** workflow so QuickDeck minimizes, click-to-place mode cleans up after place/cancel/error, and the restore pill remains usable.
- Added lightweight green placement reticle/cursor feedback while token placement mode is active.

## What's New in v0.3.0 (Draft)

- QuickDeck Reference now uses bundled repo data from `data/reference-summaries.json` as the primary reference source.
- Bundled reference loader also reads optional martial-arts packs from `data/martial-arts-techniques.reference-summaries.json` and `data/martial-arts-combat.reference-summaries.json`.
- Bundled reference loader now also checks `data/basic-set-skills.reference-summaries.json` in the same pass (missing files warn and are skipped).
- Bundled reference loader also reads optional magic spell data from `data/magic.reference-summaries.json`.
- Reference popup keeps rich display sections for **Author Summary**, **Skill Details**, **Spell Details**, **Description**, **Notes**, **Source Name**, and **Displayed Page**.
- Skills and spells remain clickable and still open the QuickDeck Reference popup.
- Manual **Reference Index** is now positioned as optional **Local Overrides** for personal source/page bookmarks.
- Removed legacy PDF/Text source manager workflows and related parsing/search UI from QuickDeck.
- Copyright-safe and Forge-safe behavior remains unchanged (local metadata only; no actor sheet calls; no network dependency except module-local JSON fetch).
- Extracted actor combat/skills/spells payloads are memoized by actor/version stamp and invalidated on actor/item updates for better large-roster responsiveness.

## What's New in v0.2.0

- Forge safety hardening across drag/drop and token placement flows.
- Fixed drag/drop freeze caused by accidental `actor.sheet` access.
- Safer actor roster drop handling.
- Added **Damage Roll** button in **Combat Burst**.
- Added GURPS damage shorthand conversion in combat actions:
  - `1d` → `1d6`
  - `1d+2 cut` → `1d6+2`
  - `2d-1 cr` → `2d6-1`
- Added manual damage card support for `sw` / `thr` damage entries.
- Added Forge-safe **Drop Token** click-to-place flow.
- Added **Escape** key cancel for token placement.
- Added QuickDeck **minimize/restore** controls.
- Hardened roll/chat error handling.

## Features

- QuickDeck launcher button in the Actor Directory.
- Roster workflow:
  - Add actors from **Available Actors**.
  - Drag actors from Actor Directory into roster.
  - Click to select actor, double-click to open sheet.
  - Remove per actor or clear roster.
- Client-side persistence:
  - Roster actor IDs persist per client/user.
  - Quick Skills selections persist per actor ID per client/user.
  - Combat Favorite attack keys persist per actor ID per client/user.
  - Spell Favorite keys persist per actor ID per client/user.
  - Minimized/expanded QuickDeck window state persists per client/user.
  - Minimized `QD QuickDeck` restore pill position persists per client/user.
  - Missing/deleted actors are cleaned up defensively.
- Drawer tools:
  - **Combat**: selected-actor cockpit, large Dodge/Parry/Block buttons, selected-character HP/FP pass-through controls, roster HP/FP bars, Combat Favorites under the cockpit, the full attack list, native-token **Target Opponent** controls, native ModifierBucket access/status, native chat/target/actor helper buttons, 3d6 attack buttons, and native damage handoff prompts.
  - **Skills**: extracted nested GURPS skills + quick-pin checkboxes; roll buttons route through native GURPS sheet-style skill handling where possible.
  - **Quick Skills**: pinned skills with independent search and native sheet-style roll actions.
  - **Spells**: pinned favorite spells plus the full searchable spell list; cast buttons route through native GURPS sheet-style spell handling where possible.
- Reference helpers:
  - Click a **Skill** or **Spell** name to open a small local **QuickDeck Reference** window.
  - Matching order is bundled repo summary data first, with optional Local Override metadata applied for personal source/page replacements.
  - Module authors can ship local reference summaries in `data/reference-summaries.json` and optional expansion packs in `data/martial-arts-techniques.reference-summaries.json`, `data/martial-arts-combat.reference-summaries.json`, and `data/magic.reference-summaries.json`; popup matching is exact `name + type` first, then exact `name`, and the popup displays **Author Summary**, optional notes, and optional source/page metadata.
  - Bundled `reference-summaries.json` entries now support richer fields (`sourceName`, `attribute`, `difficulty`, `defaults`, `description`, `specialtyRequired`) and the popup renders them in dedicated **Skill Details**, **Description**, and **Notes** sections with safe fallback when fields are missing.
  - Bundled spell entries support spell-specific metadata (`spellClass`, `college`, `duration`, `cost`, `timeToCast`, `prerequisites`, `item`) and render in a dedicated **Spell Details** section when present.
  - The same popup provides **Add Local Override** / **Edit Local Override** to jump directly into the Local Overrides manager with prefilled metadata from the current reference.
- Search UX:
  - Available actors, combat attacks, skills, quick skills, and spells support continuous typing without focus loss.
  - Search filtering uses prebuilt lowercase row text to avoid repeated string rebuilding during typing.
- Combat UX:
  - Initiative badge shown when combat data exists.
  - Current-turn actor pulse/glow preserved.
  - If no active combat, roster pills simply omit initiative badge.
- Fallback rolling:
  - If a native GURPS method is not available, visible 3d6 fallback chat roll is used.
- Lightweight client settings/state:
  - Optional default drawer on open (`none`, `combat`, `skills`, `quick-skills`, `spells`).
  - Client-scoped JSON metadata store for manual Local Override entries (no PDF parsing/extraction).
  - Local Overrides manager can filter rows by name/type/book key/displayed page/notes without re-rendering on each keystroke.
  - Local Overrides manager can export current metadata JSON directly to clipboard.
  - Local Overrides manager supports merge/replace JSON import with safe validation and invalid-JSON warnings (no crash).


## Design Specs

- [QuickDeck Favorites and Scroll Reference Popup UI Spec](docs/ui-favorites-scroll-reference-spec.md): planned direction for Combat favorites, Spell favorites, Quick Skills curation, and scroll-styled reference popups.
- v0.6.1 intentionally uses CSS gradients, borders, and placeholder CSS variables instead of a binary asset pack; future asset cuts should be small leather grain, bronze corner, and parchment panel textures wired through the existing CSS variables.
- Future collapse work should add roster and right-drawer edge tabs without replacing the current Application v1 handlers or permanent-listener cleanup guarantees.

## Installation / Local Development

1. Clone this repository into your Foundry modules folder:
   - `<FoundryData>/Data/modules/gurps-quickdeck`
2. Start Foundry and enable **GURPS QuickDeck** in your world.
3. Confirm your world is using the GURPS system.
4. Open Actor Directory and click **QuickDeck**.

## Usage

1. Open QuickDeck from the Actor Directory header button.
2. Add actors to the roster (button or drag/drop).
3. Select a roster actor.
4. Open drawers:
   - **Combat Burst** for defenses/attacks, Combat Favorites, and native-GURPS-first attack rolls.
   - **Skills** to browse the full skill list and check skills you want pinned.
   - **Quick Skills** to use pinned skills quickly.
   - **Spells** to browse spells, pin Spell Favorites, and cast through native GURPS handling where possible.
5. Review HP/FP in Combat Burst; use the compact HP/FP minus/plus or direct value fields for GM bookkeeping pass-through to `system.HP.value` and `system.FP.value` without changing max HP/FP.
6. Click **Minimize** to collapse QuickDeck into a compact top-screen **QD QuickDeck** restore pill.
7. **Left-click** the floating restore pill to reopen QuickDeck.
8. **Right-click and drag** the floating restore pill to move it; release to save position.
9. Close/reopen QuickDeck or refresh Foundry—roster, Quick Skills, Combat Favorites, Spell Favorites, minimized state, and restore pill position restore per client.

## Branch Workflow

- Work on feature branches named `codex/*`.
- Merge `codex/*` into `dev` for integration/testing.
- Promote from `dev` to `main` for stable release.

## Known Limitations

- Persistence is intentionally client-scoped (not shared world-wide).
- Quick Skills are keyed by actor and extracted skill identity; major system data migrations may require re-pinning.
- This MVP avoids a large configuration UI; only a simple default-drawer setting is provided.

## Compatibility Target

- **Foundry VTT:** v13 target.
- **Platform:** Forge VTT supported.
- **System:** GURPS 4e Game Aid.

## Forge-Safe Guardrails

- QuickDeck only opens `actor.sheet` through the explicit `openActorSheet(actorId)` path.
- Token placement uses click-to-place canvas coordinates (no browser drag/drop to canvas).
- Token placement displays a temporary Forge-safe placement reticle/cursor and removes it during placement cleanup.
- Combat attack pill targeting uses Foundry token `setTarget` behavior only, avoids GURPS combat-rule mutations, and removes all temporary listeners/reticles on target, cancel, scene switch, close, or error.
- QuickDeck records pending attack context for flow state only and does not calculate GURPS damage, DR, wounding, shock, knockback, or crippling; HP/FP buttons are direct GM pass-through edits to current actor sheet values only.
- Combat attack pill modifier controls read the native GURPS `ModifierBucket` status and open the native GURPS ModifierBucket UI; QuickDeck does not apply, clear, or manually calculate bucket modifiers.
- Escape/cancel, close, minimize, and scene-switch paths always remove temporary pointer/window/canvas listeners.
- Roll and token placement failures are warning-first and never intentionally crash the app.
- Reference summaries load from module-local JSON files only; missing packs warn and continue.
