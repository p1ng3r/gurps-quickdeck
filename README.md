# GURPS QuickDeck

A lightweight, drawer-based companion window for **Foundry VTT v13** with the **GURPS 4e Game Aid** system, including **Forge VTT-safe workflows**.

## What's New in v0.3.0 (Draft)

- Added a new **Spells** drawer/tab with defensive spell extraction across common GURPS/GCS actor data paths and spell-like actor items.
- Added clickable **Skill** names (Skills + Quick Skills drawers) that open a lightweight **QuickDeck Reference** window.
- Added clickable **Spell** names in the Spells drawer that open the same reference window.
- Added a small Application v1 **QuickDeck Reference** pop-out with source/page hints, match-origin labeling (**Manual Index**, **Actor Data Hint**, **No Match**), PDF source matching metadata, safe **Open PDF / Copy Path** actions for matched file hints, and a first-pass **Search PDF Text** button for local snippet lookup.
- Added an Application v1 **QuickDeck PDF Sources** manager for local source metadata (display name, book key, file hint, page offset, notes) with filename-based auto-fill helpers and live page-offset preview tools.
- Added an Application v1 **QuickDeck Text Sources** manager for local pasted-text sources (id, display name, book key, raw text, created-at), including Add/Edit/Delete flows and a dedicated copyright warning.
- Added an Application v1 **QuickDeck Reference Index** manager for manual reference entries (name, type, source/book key, displayed page, notes) stored client-side as JSON metadata only.
- Added **Build Index from Text Source** workflow with a review table (checkbox, name, type, book key, confidence) and selected-row upsert into Reference Index by `name + type`.
- Enhanced the **QuickDeck Reference Index** manager with DOM-only search/filtering and metadata-only JSON export/import tools (merge or replace) with safe validation and warning-first error handling.
- Added a quick action in the **QuickDeck Reference** popup to **Add to Reference Index** (or **Edit Reference Index Entry** when an exact manual match already exists), opening the manager with a prefilled row and duplicate-safe exact name+type focus behavior.
- Reference popup source matching now supports both **PDF** and **Text** source metadata; text-indexed skills display their source name (for example, **Dungeon Fantasy Adventurers Skills**).
- Polished the **QuickDeck Reference** popup guidance with inline help for **Add to Reference Index**, match-origin status messaging, and a friendly no-match checklist for linking source/page metadata.
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
  - Reference popup includes **Search PDF Text** for one matched local/world PDF source at a time, searching for the current reference name and returning only a short snippet with the matched page.
  - When a source matches and the page hint is numeric, the popup shows displayed page + computed PDF target page (`displayed + offset`).
  - If a matched source has a file/path hint, the popup provides **Open PDF** (new-tab attempt with `noopener,noreferrer`) and **Copy Path** fallback actions.
  - The same popup now provides **Add to Reference Index** / **Edit Reference Index Entry** to jump directly into the Reference Index manager with prefilled metadata from the current reference.
  - **Add to Reference Index** now includes inline help that explains it creates a bookmark linking this skill/spell to a PDF source and displayed page for future opens.
  - If no PDF source match is found, the popup now shows a simple checklist: add a PDF source, add/edit a Reference Index entry, and verify the book key matches.
  - Match-origin messaging now explicitly confirms whether the popup is using your manual bookmark or actor-provided source/page hint data.
  - If browser popup opening is blocked, QuickDeck warns and keeps the app stable with manual-copy fallback messaging.
  - If Foundry/browser PDF.js is unavailable, QuickDeck shows: **“PDF text search unavailable in this environment.”**
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
  - Client-scoped JSON metadata store for PDF source definitions (path string only) including filename cleanup for display name/book key suggestions and non-destructive auto-fill when using FilePicker.
  - Client-scoped JSON metadata store for manual Reference Index entries (no PDF parsing, extraction, or embedded rulebook text).
  - Client-scoped JSON metadata store for text sources containing user-pasted text (local-only).
  - Reference Index manager can filter rows by name/type/book key/displayed page/notes without re-rendering on each keystroke.
  - Reference Index manager can export current metadata JSON directly to clipboard.
  - Reference Index manager supports merge/replace JSON import with safe validation and invalid-JSON warnings (no crash).


## Text Sources Index Builder (v0.3.0 Draft)

- Open **Text Sources** from the QuickDeck window actions.
- Add/edit/delete named text sources with **Display name**, **Book key**, and a large **Pasted text** textarea.
- Use **Add "Dungeon Fantasy Adventurers Skills"** to create a prefilled starter source quickly.
- Click **Build Index from Text Source** to parse likely skill entries using a 2-line pattern: `Skill Name` followed by `DX/Average`, `IQ/Hard`, etc.
- Parser supports dagger symbols (`†` / `‡`) in skill lines, ignores obvious prose/header lines, and produces a confidence value for review.
- Review rows before save; selected rows upsert into Reference Index by `name + type` only.
- QuickDeck does **not** auto-store long rule text in Reference Index and does **not** bundle GURPS text in this repository.

## PDF Sources Page Offset Tips

- Use offset when the PDF page number differs from the printed book page.
- Picking a PDF file now auto-fills missing **Display name** and **Book key** values from a cleaned filename suggestion.
- Auto-fill is non-destructive: existing user-entered values are preserved.
- Use the sample displayed/book page helper to preview the computed PDF page (`book page + offset`).

## PDF Text Search MVP Limits (v0.3.0 Draft)

- Searches only the first matched PDF source for the current reference popup.
- Uses exact reference name matching first (no fuzzy full-text index yet).
- Stops after first good match or safe page scan limit.
- Shows short snippets only (about 1–3 sentences, max ~300 chars).
- Does not persist full extracted PDF text and does not upload/network-send PDF content.

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
