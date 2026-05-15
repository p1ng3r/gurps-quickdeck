# GURPS QuickDeck

A lightweight, drawer-based companion window for **Foundry VTT v13** with the **GURPS 4e Game Aid** system, including **Forge VTT-safe workflows**.

## What's New in v0.5.5 (Draft)

- Combat Favorite attacks can now be pinned per actor/client with compact quick-launch rows above the full attack list.
- Favorite launches use the same native GURPS attack path as full attack rows; QuickDeck does not add attack or damage math.
- Full attack rows remain searchable and keep star controls for pinning/unpinning common attacks.

## What's New in v0.5.2 (Draft)

- First compact dark-fantasy layout polish pass for the QuickDeck combat cockpit.
- The loaded actor roster is denser while preserving portraits, active/current-turn highlighting, and HP/FP mini bars.
- Selected-actor HP/FP controls keep the existing minus/plus and direct-entry behavior but use smaller resource controls and cleaner bars.
- Dodge / Parry / Block remain large click targets with a cleaner bronze/leather fantasy treatment.
- Combat helper buttons and attack rows are styled as compact GM controls without embedding Foundry/GURPS chat DOM or changing native GURPS attack, damage, defense, targeting, or HP/FP flows.

## What's New in v0.5.0 (Draft)

- Combat buttons remain native-GURPS-first: QuickDeck records attack context, routes attacks and large Dodge/Parry/Block buttons through GURPS sheet-style/native roll handling when available, and leaves attack, defense, and damage rules to GURPS.
- Native GURPS roll/damage-related windows are brought forward with guarded `bringToTop?.()` calls after QuickDeck triggers native handling.
- After attack, skill, spell, or fallback rolls, QuickDeck opens/focuses the native Foundry chat sidebar instead of embedding or cloning chat.
- Added lightweight combat flow helpers: **Bring Chat Front**, **Clear Targets**, **Next Actor**, and **Repeat Last Attack**.
- Pending attack context now stores actor id, attack index/name, OTF, damage string, source path, raw attack reference, and lowercase `hitlocation` when known for future native damage pass-through work; QuickDeck damage controls now point the GM back to native GURPS chat controls instead of rolling custom damage.

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
  - Minimized/expanded QuickDeck window state persists per client/user.
  - Minimized `QD QuickDeck` restore pill position persists per client/user.
  - Missing/deleted actors are cleaned up defensively.
- Drawer tools:
  - **Combat Burst**: large Dodge/Parry/Block buttons, selected-character HP/FP pass-through controls, roster HP/FP bars, pinned favorite attacks, the full attack list, native-token **Target Opponent** controls, native chat/target/actor helper buttons, roll buttons, and native damage handoff prompts.
  - **Skills**: extracted nested GURPS skills + quick-pin checkboxes; roll buttons route through native GURPS sheet-style skill handling where possible.
  - **Quick Skills**: pinned skills with independent search and native sheet-style roll actions.
  - **Spells**: spell extraction + searchable spell list; cast buttons route through native GURPS sheet-style spell handling where possible.
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
   - **Combat Burst** for defenses/attacks and quick rolls.
   - **Skills** to browse and check skills you want pinned.
   - **Quick Skills** to use pinned skills quickly.
5. Review HP/FP in Combat Burst; use the compact HP/FP minus/plus or direct value fields for GM bookkeeping pass-through to `system.HP.value` and `system.FP.value` without changing max HP/FP.
6. Click **Minimize** to collapse QuickDeck into a compact top-screen **QD QuickDeck** restore pill.
7. **Left-click** the floating restore pill to reopen QuickDeck.
8. **Right-click and drag** the floating restore pill to move it; release to save position.
9. Close/reopen QuickDeck or refresh Foundry—roster, Quick Skills, minimized state, and restore pill position restore per client.

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
