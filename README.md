# GURPS QuickDeck

A lightweight, drawer-based companion window for **Foundry VTT v13** with the **GURPS 4e Game Aid** system, including **Forge VTT-safe workflows**.

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
  - Minimized/expanded QuickDeck window state persists per client/user.
  - Minimized `QD QuickDeck` restore pill position persists per client/user.
  - Missing/deleted actors are cleaned up defensively.
- Drawer tools:
  - **Combat Burst**: defenses, HP/FP edit, attacks, roll buttons, and damage actions.
  - **Skills**: extracted nested GURPS skills + quick-pin checkboxes.
  - **Quick Skills**: pinned skills with independent search and roll actions.
  - **Spells**: spell extraction + searchable spell list.
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
5. Edit HP/FP directly in Combat Burst.
6. Click **Minimize** to collapse QuickDeck into a compact top-screen **QD QuickDeck** restore pill.
7. **Left-click** the floating restore pill to reopen QuickDeck.
8. **Right-click and drag** the floating restore pill to move it; movement tracks pointer smoothly and saves on release (or window blur), with browser context menu suppressed.
9. Click **Drop Token to Canvas** to arm placement and auto-minimize QuickDeck; the click-to-place action stays armed while minimized until placement succeeds or you press **Escape**.
10. Close/reopen QuickDeck or refresh Foundry—roster, Quick Skills, minimized state, and restore pill position restore per client.

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
- Clicking **Drop Token to Canvas** auto-minimizes QuickDeck without cancelling the armed placement state.
- Escape/cancel, close, minimize, and scene-switch paths always remove temporary pointer/window/canvas listeners.
- Roll and token placement failures are warning-first and never intentionally crash the app.
- Reference summaries load from module-local JSON files only; missing packs warn and continue.
