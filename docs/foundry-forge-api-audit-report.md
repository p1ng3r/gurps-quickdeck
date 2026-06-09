# v0.20.1 Foundry API and Forge Compatibility Audit

## 1. Executive summary

GURPS QuickDeck remains a UI2-only Foundry VTT v13 module. This follow-up audit reviewed the manifest, runtime entrypoints, Application lifecycle, hook usage, drag/drop handling, hosted-path assumptions, CSS asset references, README/CHANGELOG wording, and the previous runtime hardening report.

The audit found no broad rewrite requirement and no broken module-relative script, stylesheet, template, or CSS asset paths. The only runtime code change made was a close-time lifecycle cleanup tightening in `scripts/quickdeck-app.js`: QuickDeck now stops the UI2 carousel token drop mode, clears pending damage popup/pick-target state, cancels a scheduled UI2 sizing animation frame, and clears inline sizing before the Foundry `Application` close completes.

Package metadata was also aligned to the requested v0.20.1 audit release, and README/CHANGELOG wording was updated narrowly to keep the release state UI2-only and avoid local-host path phrasing. No binary files, `data-action` names, roll/action behavior, GURPS Game Aid behavior, roster behavior, UI layout, art, or runtime dependencies were changed.

Primary external references used for audit intent:

- Foundry VTT Introduction to Module Development: manifest identity, compatibility, module-relative script/style path expectations, relationships, manifest/download/readme fields.
- Foundry VTT v13 API documentation: v13 client API surface, Application/Hook/DragDrop awareness.
- Foundry VTT v13 hook events documentation: generic hook event context and render/update hook awareness.
- Forge documentation principles: hosted deployments must not depend on local filesystem paths and should use web/module-safe asset references.

## 2. Foundry package/manifest review

Reviewed `module.json` for Foundry package structure and v13 target compatibility.

Findings:

- `id` is `gurps-quickdeck`, which matches the expected module folder name.
- `title` remains `GURPS QuickDeck`.
- The manifest uses `esmodules` for `scripts/main.js`, consistent with Foundry's module-relative ES module loading pattern.
- All manifest-listed stylesheet paths exist.
- The compatibility block targets Foundry v13 with `minimum` and `verified` set to `13`; this is appropriate for a v13-first audit and does not claim v14 verification.
- The GURPS system relationship remains present with system id `gurps`.
- No deleted UI1 script/style/template path is listed in the manifest.
- No local absolute path is present in the manifest.

Changes made:

- Updated manifest `version` to `0.20.1`.
- Updated the release `download` URL tag segment to `v0.20.1`.

Items left unchanged:

- No `maximum` compatibility value was added. The module is v13-first and v14-aware where safe, but this audit did not verify Foundry v14 runtime behavior.
- No package relationship was added for Forge because Forge is a hosting environment, not a Foundry system or module dependency for QuickDeck.

## 3. Application lifecycle review

Reviewed `openQuickDeck()` in `scripts/main.js` and `QuickDeckApp` lifecycle methods in `scripts/quickdeck-app.js`.

Findings:

- The launcher reuses a single `QuickDeckApp` instance and removes stale overlay roots before rendering.
- `QuickDeckApp._render()` still delegates to Foundry's legacy `Application` render path, then mounts/renders the UI2 overlay. This is intentional for current v13 compatibility and was not refactored.
- Overlay rendering tears down custom scrollbars before replacing overlay HTML, then reactivates listeners against the new root.
- Overlay unmount stops overlay dragging, removes resize listeners, tears down custom scrollbars, clears scheduled search filters, and removes the overlay root.
- Restore-pill listeners are explicitly removed when the restore pill is removed.
- Custom scrollbar observers/listeners are torn down before replacement or close.
- No render loop was found in the open/render/overlay path. Hook-triggered renders are coalesced and skipped while minimized or actively dragging.

Issue found and fixed:

- The effective `close()` method did not call the existing inline UI2 sizing cleanup helper and did not explicitly cancel a pending UI2 resize animation frame. It also left UI2 carousel token drop and pending damage popup/pick-target cleanup to their individual flows rather than guaranteeing cleanup when the app closes.

Changes made:

- Added `_qd31ResizeRaf` initialization.
- Extended effective `close()` cleanup to stop UI2 carousel token-drop mode, clear pending damage context/popup/pick-target state, cancel pending UI2 sizing animation frames, and clear UI2 inline sizing before unmounting and calling `super.close()`.

Items intentionally left unchanged:

- The current legacy `Application` base class was retained to avoid breaking Foundry v13 behavior.
- Existing qd40 and qd-ui2 runtime code was retained.
- Existing direct calls to native GURPS sheet/application render paths were retained because changing them would alter GURPS Game Aid behavior.

## 4. Hook usage review

Reviewed `Hooks.once`, `Hooks.on`, and mode-specific `Hooks.off` usage.

Findings:

- Global module hooks are registered once during module evaluation or inside Foundry `init`/`ready` once handlers.
- `renderActorDirectory` only injects the launcher button when the relevant directory HTML is rendered and guards against duplicate button insertion.
- Actor and item update/delete hooks guard against missing QuickDeck instances and actor ids.
- Actor/item update hooks invalidate cached derived actor data and only schedule QuickDeck rendering for actors relevant to the current view.
- ModifierBucket and combat hooks are lightweight and route through a debounced render helper.
- Token-drop and target-opponent canvas lifecycle hooks register only while those modes are active and remove themselves during cleanup.
- Target-selection promise hooks remove their listeners on completion or timeout.

Items intentionally left unchanged:

- `renderChatMessage` remains registered at ready time so pending GURPS damage can be captured even when QuickDeck is not already open.
- Combat hook callbacks remain broad because combat turn/combatant changes can affect visible tactical state; their refresh path is guarded by QuickDeck open/minimized state.

## 5. Drag/drop API and browser-event review

Reviewed direct browser event usage for overlay drag, restore-pill drag, roster drop, token placement, carousel token placement, and pending damage target picking.

Findings:

- v0.20.0 drag/drop hardening remains intact.
- Overlay drag uses pointer events, guarded pointer capture/release, transform-only drag updates, blur/cancel cleanup, and explicit cleanup registration.
- Roster drag/drop accepts supported Foundry-style actor payloads, safely rejects unsupported/malformed payloads, and fails invalid data without uncaught exceptions.
- Roster drag-over state is local DOM state rather than render churn.
- Token placement and target-pick modes register canvas/window listeners only while active and clean them up on completion, cancellation, scene changes, or close.
- Pending damage popup drag cleans up blur handlers and pending animation frames when removed.
- No new drag/drop behavior was introduced.

Items intentionally left unchanged:

- Existing direct browser drag/drop usage was retained because the UI2 overlay is custom DOM outside a standard actor sheet drop zone.
- Existing Foundry/canvas fallback coordinate code was retained to preserve v13/GURPS behavior; it remains guarded and is documented here as intentional.

## 6. Forge compatibility/path review

Reviewed runtime code, templates, stylesheets, manifest metadata, README/CHANGELOG, and the previous runtime hardening report for hosted-path assumptions.

Findings:

- No runtime dependency on a local filesystem path was found.
- No runtime network calls or new dependencies were added.
- Manifest script/style/readme/license paths are module-relative where applicable.
- CSS asset references resolve to files inside the module.
- Template constants point to existing module-relative template files.
- README local-development wording was adjusted to avoid embedding a local user-data path shape.
- Previous runtime hardening report wording was adjusted to avoid a false-positive forbidden-path search line while keeping the audit conclusion.

Items intentionally left unchanged:

- The pending damage target reticle uses Foundry core's hosted target icon path. This is not a local filesystem path and was left unchanged.
- User-configured PDF source paths are still collected through Foundry's FilePicker and stored as client settings. This is user data, not a module runtime hardcoded path, and changing that workflow would be feature work outside this audit.

## 7. Changes made

Changed files:

- `module.json`
  - Set package version to `0.20.1`.
  - Updated release download URL tag segment to `v0.20.1`.
- `scripts/quickdeck-app.js`
  - Initialized `_qd31ResizeRaf`.
  - Extended effective `close()` cleanup for UI2 carousel token drop, pending damage context/popup/pick-target state, pending UI2 sizing animation frames, and inline sizing.
- `README.md`
  - Updated the top release-audit wording to v0.20.1 and reinforced UI2-only state.
  - Replaced local-development install wording with a generic Foundry user-data modules folder description.
- `CHANGELOG.md`
  - Added a v0.20.1 audit entry.
- `docs/runtime-dragdrop-forge-hardening-report.md`
  - Reworded hosted-path validation notes to avoid false-positive local-path token matches in documentation.
- `docs/foundry-forge-api-audit-report.md`
  - Added this required audit report.

## 8. Items intentionally left unchanged

- UI2 visual layout and art styling.
- qd40 and qd-ui2 code paths.
- Existing `data-action` names.
- GURPS Game Aid roll, action, damage, ModifierBucket, sheet-open, roster, and reference behavior.
- Existing drag/drop runtime behavior, except close-time cleanup guarantees.
- Existing legacy `Application` base class usage for Foundry v13 compatibility.
- Existing module `manifest` URL branch path, because release-channel policy was not part of this audit.
- Foundry v14 verified compatibility claim, because v14 runtime QA was not performed.

## 9. Validation results

Commands run and results:

- `git diff --check` — passed.
- `node --check scripts/dev/quickdeck-art-tuner.js` — passed.
- `node --check scripts/quickdeck-app.js` — passed.
- `node --check scripts/main.js` — passed.
- `git status --short` — reviewed; showed only intended changed text files before commit.
- `git diff --stat` — reviewed changed-file statistics.

Additional searches/checks run and results:

- Local-file URL scheme search — no matches.
- Foundry user-data path marker search — no matches after README/report wording cleanup.
- Windows profile-folder marker search — no matches.
- Windows drive-root marker search — no matches.
- Stale deleted UI1 template-name search — no matches.
- Shared `.quickdeck-` selector search — matches remain only in retained reference/host styling and header-minimize code, not deleted UI1 template paths.
- `Hooks.on` search — reviewed global and mode-scoped hooks.
- `Hooks.once` search — reviewed init/ready registration.
- `addEventListener` search — reviewed overlay, restore-pill, custom-scrollbar, canvas mode, popup, and roster listeners.
- `removeEventListener` search — reviewed cleanup symmetry.
- `render(` search — reviewed render calls for state changes, native GURPS windows, and debounced hook refreshes.
- CSS URL reference scan — 36 local CSS URL references found; all module-relative files exist.
- Manifest path scan — all manifest-listed ES module and stylesheet paths exist.
- Binary-file check — no binary files changed.
- `data-action` diff check — no `data-action` names changed.

## 10. Manual Foundry/Forge QA checklist

Manual QA still required in actual Foundry/Forge environments:

1. Foundry v13 opens with no console errors.
2. QuickDeck opens.
3. Close and reopen QuickDeck repeatedly; no duplicate listeners or hook spam.
4. Actor/item updates do not cause render storms.
5. Drag QuickDeck rapidly; no lockup.
6. Drop invalid data; no uncaught exception.
7. Search and rolls still work.
8. Roster add/remove still works.
9. Pending damage popup still works.
10. Forge-hosted world opens QuickDeck with no missing path errors.
