# Runtime Drag/Drop and Forge Hardening Report

## 1. Executive summary

This pass audited QuickDeck's UI2 runtime paths for drag-move, Foundry drag/drop, render churn, search filtering, and module/asset path safety. The changes are intentionally narrow runtime hardening fixes: they do not redesign UI2, change roll/action/roster behavior, rename `data-action` controls, add dependencies, or touch binary assets.

Changed files:

- `scripts/main.js`
- `scripts/quickdeck-app.js`
- `styles/quickdeck-command-desk.css`
- `docs/runtime-dragdrop-forge-hardening-report.md`

No binary files were changed.

## 2. Foundry API / drag-drop audit findings

- QuickDeck's overlay drag uses standard browser Pointer Events and avoids Foundry private APIs.
- Roster drag/drop continues to use native drag/drop events on the roster drop zone and resolves Foundry documents through `fromUuid` only when available.
- Drop handling now reads only supported `text/plain` transfer data, rejects oversized text before parsing, and catches transfer read failures.
- Drag enter/over handling no longer triggers full QuickDeck renders, reducing the chance of render storms while a browser/Foundry drag operation is active.
- Module manifest paths in `module.json` were checked and exist.

## 3. Overlay drag-move hardening changes

- Added a render deferral guard so actor/item/combat hook refreshes do not re-render QuickDeck while the overlay is actively being dragged. Deferred renders retry after a short delay rather than competing with pointer movement.
- Tracked the active overlay pointer id and ignored unrelated pointer events during drag.
- Guarded pointer capture and release in `try`/`catch` to avoid stuck states if browser focus changes or capture is already lost.
- Kept rAF-based transform updates and ensured cleanup resets the active pointer id, transform, drag classes, and listener registrations.
- Made the overlay drag `pointerdown` listener explicitly non-passive because it intentionally calls `preventDefault`.

## 4. Drag/drop payload safety changes

- Added safe transfer text reading for roster drops.
- Rejected missing, unsupported, unreadable, or oversized drop payloads without throwing.
- Preserved actor-only behavior: non-Actor payloads are ignored and logged as warnings.
- Changed roster `dragenter`/`dragover` to prevent default only for supported drops and to set `dropEffect = "copy"` for accepted payloads.
- Changed roster drag-over state updates to a local DOM class/state toggle instead of full renders during drag-over churn.

## 5. Render/hook storm prevention changes

- Coalesced hook-driven QuickDeck renders with a small debounce instead of immediate `setTimeout(..., 0)` refreshes.
- Deferred hook refreshes while overlay dragging is active.
- Kept render calls for actual state-changing actions such as adding/removing actors, drawer toggles, rolls, settings, and PDF controls.
- Changed successful roster drop render to `render(false, { focus: false })` to avoid focus churn.

## 6. Search/filter safety changes

- Added rAF coalescing for repeated search/filter input in Available, Combat, Skills, Quick Skills, and Spells.
- Added stale-root checks so scheduled filter updates abort safely after a re-render or overlay unmount.
- Wrapped scheduled filter application in a guarded callback so malformed/missing row data cannot break the UI.
- Added row dataset checks before reading normalized search cache fields.
- Cleared pending scheduled filter rAFs during overlay activation and unmount.

## 7. Forge/module/path compatibility checks

- Removed an absolute local Windows Foundry Data path from a CSS comment and replaced it with module-relative guidance.
- Renamed a comment containing `C:` so path scans no longer report a false positive.
- Confirmed no `file://`, `/Data/`, `AppData`, Windows-drive absolute path, or hardcoded local Foundry Data path remains in `scripts/`, `templates/`, `styles/`, `module.json`, or existing docs.
- Confirmed CSS `url(...)` references resolve to existing module-relative files.
- Confirmed `module.json` script/style paths exist.
- No external runtime network calls or new dependencies were added.

## 8. Items intentionally left unchanged and why

- UI2 layout, art, and visual styling were left unchanged except comments in CSS; this task was runtime safety hardening, not UI redesign.
- Roll/action/roster behavior was left unchanged to preserve GURPS Game Aid behavior.
- Existing `data-action` names were left unchanged.
- Existing qd40/UI2 drag ghost and carousel hover unclip behavior was left unchanged.
- Existing Foundry `Application` lifecycle usage, including the launcher path that calls `render(true)` before `renderOverlay()`, was left unchanged because removing it would be a broader lifecycle refactor.
- Existing token drop and pending damage workflows were left intact; only drag/pointer safety and cleanup behavior around runtime interactions was hardened.

## 9. Validation results

Commands run:

- `git diff --check` — passed.
- `node --check scripts/dev/quickdeck-art-tuner.js` — passed.
- `node --check scripts/quickdeck-app.js` — passed.
- `node --check scripts/main.js` — passed.
- `git status --short` — showed only intended modified files before this report was added.
- `git diff --stat` — reviewed changed file statistics.

Additional searches/checks run:

- `rg -n "pointerdown|pointermove|pointerup|pointercancel" scripts templates styles module.json docs || true`
- `rg -n "dragstart|dragover|drop" scripts templates styles module.json docs || true`
- `rg -n "addEventListener|removeEventListener" scripts/quickdeck-app.js scripts/main.js || true`
- `rg -n "render\(" scripts/quickdeck-app.js scripts/main.js`
- `rg -n "setTimeout|requestAnimationFrame" scripts/quickdeck-app.js scripts/main.js || true`
- `rg -n "file://|/Data/|AppData|C:|[A-Za-z]:\\\\" scripts templates styles module.json docs --glob '!docs/runtime-dragdrop-forge-hardening-report.md' || true`
- `rg -n "url\(" styles templates scripts module.json || true`
- Python manifest/CSS URL existence check — all `module.json` paths and CSS local URL assets resolved.
- `git diff -U0 | rg "^[+-].*data-action" || true` — no `data-action` names changed; only listener options changed for the existing `drag-overlay` selector.
- `git diff --numstat` / `git diff --name-only` — confirmed text-only changes and no binary file changes.

## 10. Manual Foundry + Forge QA checklist

### Local Foundry

1. Foundry opens with no console errors.
2. QuickDeck opens.
3. Drag QuickDeck rapidly for 10 seconds; Foundry does not freeze.
4. Release drag outside the app window if possible; state restores.
5. Alt-tab or blur browser during drag; state restores.
6. Drag actor/item data over QuickDeck; no console spam or lockup.
7. Drop supported actor/item data if supported; invalid drops fail safely.
8. Open/close drawers repeatedly while using QuickDeck.
9. Search Combat/Skills/Spells rapidly.
10. Roll actions still work.
11. Actor selection and roster add/remove still work.
12. Pending damage popup/reticle still works.
13. Carousel hover zoom remains unclipped.
14. Drag ghost still appears and restores correctly.

### Forge

1. Upload/install module on Forge or test via Forge world.
2. QuickDeck opens with no console errors.
3. No missing image/template/CSS 404s.
4. Drag QuickDeck rapidly; no browser tab lockup.
5. Search and rolls remain responsive.
6. No hardcoded local path errors.
7. No asset path errors from CSS `url(...)` references.
