# GURPS QuickDeck

A lightweight, drawer-based companion window for **Foundry VTT v13** with the **GURPS 4e Game Aid** system, including **Forge VTT-safe workflows**.

## What's New in v0.3.0 (Draft)

- Added a new **Spells** drawer/tab with defensive spell extraction across common GURPS/GCS actor data paths and spell-like actor items.
- Added clickable **Skill** names (Skills + Quick Skills drawers) that open a lightweight **QuickDeck Reference** window.
- Added clickable **Spell** names in the Spells drawer that open the same reference window.
- Added a small Application v1 **QuickDeck Reference** pop-out with source/page hints, match-origin labeling (**Manual Index**, **Actor Data Hint**, **No Match**), PDF source matching metadata, and safe **Open PDF / Copy Path** actions for matched file hints.
- Added an Application v1 **QuickDeck PDF Sources** manager for local source metadata (display name, book key, file hint, page offset, notes) with QuickDeck-matching dark brass/steel styling and per-row PDF file picker button.
- Added an Application v1 **QuickDeck Reference Index** manager for manual reference entries (name, type, source/book key, displayed page, notes) stored client-side as JSON metadata only.
- Enhanced the **QuickDeck Reference Index** manager with DOM-only search/filtering and metadata-only JSON export/import tools (merge or replace) with safe validation and warning-first error handling.
- Added a quick action in the **QuickDeck Reference** popup to **Add to Reference Index** (or **Edit Reference Index Entry** when an exact manual match already exists), opening the manager with a prefilled row and duplicate-safe exact name+type focus behavior.
- Added a **PDF import roadmap placeholder setting** and documentation for future user-provided local PDF indexing.
- Copyright-safe approach: this module does **not** bundle GURPS rulebook text.

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
  - Missing/deleted actors are cleaned up defensively.
- Drawer tools:
  - **Combat Burst**: defenses, HP/FP edit, attacks, roll buttons, and damage actions.
  - **Skills**: extracted nested GURPS skills + quick-pin checkboxes.
  - **Quick Skills**: pinned skills with independent search and roll actions.
  - **Spells**: spell extraction + searchable spell list.
- Reference helpers:
  - Click a **Skill** or **Spell** name to open a small local **QuickDeck Reference** window.
  - Matching order is manual index exact name + type, then manual index exact name only, then actor source/page hints.
  - Reference entries attempt local metadata matching against configured PDF sources (`bookKey`, `displayName`, and source hint text).
  - When a source matches and the page hint is numeric, the popup shows displayed page + computed PDF target page (`displayed + offset`).
  - If a matched source has a file/path hint, the popup provides **Open PDF** (new-tab attempt with `noopener,noreferrer`) and **Copy Path** fallback actions.
  - The same popup now provides **Add to Reference Index** / **Edit Reference Index Entry** to jump directly into the Reference Index manager with prefilled metadata from the current reference.
  - If browser popup opening is blocked, QuickDeck warns and keeps the app stable with manual-copy fallback messaging.
  - If no metadata match is found, the popup shows a safe no-match fallback.
- Search UX:
  - Available actors, combat attacks, skills, quick skills, and spells support continuous typing without focus loss.
- Combat UX:
  - Initiative badge shown when combat data exists.
  - Current-turn actor pulse/glow preserved.
  - If no active combat, roster pills simply omit initiative badge.
- Fallback rolling:
  - If a native GURPS method is not available, visible 3d6 fallback chat roll is used.
- Lightweight client settings/state:
  - Optional default drawer on open (`none`, `combat`, `skills`, `quick-skills`, `spells`).
  - PDF import roadmap placeholder toggle (no importer in this release).
  - Client-scoped JSON metadata store for PDF source definitions (path string only; no file parsing/rendering in this release).
  - Client-scoped JSON metadata store for manual Reference Index entries (no PDF parsing, extraction, or embedded rulebook text).
  - Reference Index manager can filter rows by name/type/book key/displayed page/notes without re-rendering on each keystroke.
  - Reference Index manager can export current metadata JSON directly to clipboard.
  - Reference Index manager supports merge/replace JSON import with safe validation and invalid-JSON warnings (no crash).

## PDF Import Roadmap (User-Provided Content Only)

- Planned future feature: users can import/index their own legally owned PDFs locally.
- QuickDeck should index local/client reference data only.
- QuickDeck must not distribute copyrighted GURPS book text.
- This draft release intentionally ships **foundation only**, not full PDF parsing/import.

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
6. Close/reopen QuickDeck or refresh Foundry—roster and Quick Skills should restore for your client.

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
