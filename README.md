# GURPS QuickDeck

A lightweight, drawer-based companion window for **Foundry VTT v13** with the **GURPS 4e Game Aid** system, including **Forge VTT-safe workflows**.

## What's New in v0.3.0 (Draft)

- Added a new **Spells** drawer/tab with defensive spell extraction across common GURPS/GCS actor data paths and spell-like actor items.
- Added clickable **Skill** names (Skills + Quick Skills drawers) that open a lightweight **QuickDeck Reference** window.
- Added clickable **Spell** names in the Spells drawer that open the same reference window.
- Added a small Application v1 **QuickDeck Reference** pop-out with type/name/source/page-hint placeholders.
- Added an Application v1 **QuickDeck PDF Sources** manager for local source metadata (display name, book key, file hint, page offset, notes).
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
  - Reference entries currently show placeholders/fallbacks until local reference indexing is implemented.
  - When configured, a local source summary area displays saved PDF source metadata.
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
  - Client-scoped JSON metadata store for PDF source definitions.

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
