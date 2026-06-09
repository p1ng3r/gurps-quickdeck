# GURPS QuickDeck v0.20.2 Runtime QA diagnostics report

## 1. Executive summary

This v0.20.2 pass reviewed the UI2-only runtime after the v0.20.0 drag/drop hardening and the v0.20.1 Foundry/Forge API audit. The review focused on lockup risk, listener cleanup, render churn, malformed drops, hosted path safety, and stale UI1 references.

Findings:

- No obvious lockup or render-storm regression was found in the inspected runtime paths.
- No binary files were changed.
- No `data-action` names were changed.
- No roll, action, roster, token-drop, pending-damage, or carousel behavior was changed.
- No new dependency was introduced.
- No broken manifest path or CSS `url(...)` asset reference was found.
- No hardcoded local install paths (`file://`, `/Data/`, `AppData`, or `C:\`) were found in the inspected project files.
- No stale references to deleted UI1 templates or UI1-only asset filenames were found in active runtime files. Some `qd31`-named sizing helpers/selectors remain as legacy compatibility labels around the current overlay sizing code, but this pass did not broaden into a rename/refactor because that would be cosmetic and outside the QA scope.

## 2. Drag/drop QA review

Roster drag/drop remains conservative and guarded:

- The roster drop zone is looked up after overlay listener activation starts; if the drop zone is absent, activation exits safely after scheduling reference focus handling.
- `dragenter` and `dragover` only call `preventDefault()` when `isSupportedRosterDrop(event)` accepts the transfer.
- Accepted drag-over events set `dropEffect = "copy"` without rendering.
- `drop` validates support before parsing, stops propagation only for accepted drops, resolves the actor inside a `try`/`catch`, ignores missing actors and duplicates safely, and renders only after a successful roster add.
- Malformed or unsupported drops are expected to fail closed: unsupported drags are ignored, parse/resolve errors are logged as warnings, and no roster mutation occurs.

Additional reviewed token/pointer drop modes:

- Token-drop targeting and pending-damage pick-target modes keep explicit cleanup function references and remove their capture listeners during cancellation.
- UI2 carousel token-drop mode stores listener tuples and removes them through its cleanup callback.
- These flows were not behaviorally changed in this pass.

## 3. Overlay drag-move QA review

Overlay drag-move cleanup appears complete and intentionally low-cost:

- Drag starts only from the overlay drag handle and ignores non-left-button or interactive-control targets.
- Pointer capture is attempted inside a guarded block so browser or Foundry focus changes do not strand the drag state.
- The active pointer id is recorded and unrelated pointer events are ignored.
- `pointermove` does not synchronously render. It only calculates a clamped position and schedules one `requestAnimationFrame` transform update.
- End paths include `pointerup`, `pointercancel`, `blur`, `lostpointercapture`, explicit `stopOverlayDrag()`, and overlay unmount.
- Cleanup cancels any pending drag animation frame, clears the active pointer id, commits the final `left`/`top`, removes transient transform/style/class state, attempts guarded pointer-capture release, and removes listeners or aborts the `AbortController` signal.
- Hook-triggered QuickDeck rerenders are deferred while `isOverlayDragging()` returns true, then retried after the drag retry delay.

No new overlay-drag code changes were made.

## 4. Close/reopen lifecycle QA review

Close/reopen lifecycle cleanup appears conservative:

- `openQuickDeck()` reuses the single app instance, clears a stale overlay root if it does not belong to the current app, renders the hidden Foundry host, renders the overlay, and syncs minimized presentation.
- Effective close-time cleanup cancels token drop, UI2 carousel token-drop mode, pending-damage context/popup/pick-target state, custom scrollbars, target-opponent mode, pending UI sizing animation frames, inline sizing, dev art tuner state, overlay mount, restore pill, actor-select timeout, derived actor data, and native focus lock before delegating to Foundry `Application.close()`.
- Overlay unmount clears scheduled search filter frames, tears down custom scrollbars, stops overlay dragging, removes the overlay resize listener, removes the overlay root, and nulls the root reference.
- Re-rendering the overlay first tears down old custom scrollbars before replacing overlay HTML, which keeps listeners bound to the current DOM only.

No close/reopen code changes were made.

## 5. Listener/render storm review

Listener pairing and render-frequency findings:

- Window resize listeners used by the custom scrollbar manager are paired in `setup()`/`teardown()`.
- Custom scrollbar host listeners are paired in `bindHost()`/`unbindHost()` and pointer-drag listeners are cleaned on pointer end/cancel.
- Overlay drag listeners are removed through `AbortController.abort()` when available, with explicit `removeEventListener()` fallback.
- Floating restore-pill listeners are paired on create/remove.
- Token-drop, carousel token-drop, and pending-damage pick-target listeners use stored cleanup functions/tuples.
- Event listeners attached to freshly rendered overlay elements are discarded with the overlay DOM and are not attached to long-lived globals except where cleanup hooks exist.
- High-frequency `pointermove`, `scroll`, mutation/resize, and search filter paths use passive listeners, `requestAnimationFrame`, debounce timers, stale-root checks, or direct DOM toggles rather than synchronous heavy renders.
- Hook-triggered QuickDeck renders are debounced and are deferred while overlay dragging is active.
- The reviewed `render(` calls are user action, lifecycle, or debounced hook renders. No high-frequency handler was found to synchronously call `render()` in a tight loop.

No listener or render-path code changes were made.

## 6. Forge/path/module check

Manifest and hosted-path checks:

- `module.json` declares one ES module path: `scripts/main.js`; it exists.
- `module.json` declares four stylesheet paths: `styles/quickdeck.css`, `styles/quickdeck-command-desk.css`, `styles/quickdeck-ui2.css`, and `styles/quickdeck-ui2-v23-port.css`; all exist.
- `LICENSE` and `README.md` manifest references exist.
- Runtime template constants reference `templates/quickdeck-host.hbs` and `templates/quickdeck-overlay.hbs`; both exist.
- CSS `url(...)` references in `styles/*.css` resolve to existing module-local assets or fonts.
- No hardcoded local install paths (`file://`, `/Data/`, `AppData`, `C:\`) were found in the inspected files.

No Forge/path code or manifest changes were made.

## 7. Stale UI1 reference check

UI1 reference findings:

- No active reference to the deleted `templates/quickdeck.hbs` file was found in `scripts/`, `templates/`, `styles/`, `module.json`, `README.md`, `CHANGELOG.md`, or the v0.20.0/v0.20.1 reports.
- No `isUi1Mode`, `set-ui-mode`, `ui-mode`, `VALID_UI_MODES`, `DEFAULT_UI_MODE`, or UI1 template-switching runtime was found in active runtime files.
- The active overlay template is `templates/quickdeck-overlay.hbs`, and the Foundry host template is `templates/quickdeck-host.hbs`.
- Residual `qd31`-named sizing helpers/selectors still exist in JavaScript/CSS as legacy labels. They were left unchanged because renaming them would be broad cosmetic churn and could risk behavior outside the conservative QA scope. They do not point to deleted UI1 template or asset files.

No stale UI1 template or asset references were changed.

## 8. Changes made, if any

Changed files in this pass:

- Added `docs/runtime-qa-diagnostics-report.md`.

No JavaScript, template, stylesheet, manifest, README, changelog, data, asset, or binary files were changed.

## 9. Validation results

Required validation commands run:

- `git diff --check` — passed.
- `node --check scripts/dev/quickdeck-art-tuner.js` — passed.
- `node --check scripts/quickdeck-app.js` — passed.
- `node --check scripts/main.js` — passed.
- `git status --short` — showed only the new diagnostics report before commit.
- `git diff --stat` — passed; no tracked-file diff was present before staging because the report was still untracked. `git status --short` identified the new report, and the staged stat was checked before commit.

Additional searches/checks run:

- `rg -n "pointerdown|pointermove|pointerup|pointercancel|dragstart|dragover|drop|addEventListener|removeEventListener|render\(" scripts/main.js scripts/quickdeck-app.js scripts/dev/quickdeck-art-tuner.js`
- `rg -n "file://|/Data/|AppData|C:\\" .`
- `rg -n "templates/quickdeck\.hbs|quickdeck\.hbs|isUi1Mode|isUi2Mode|set-ui-mode|ui-mode|VALID_UI_MODES|UI_MODE|DEFAULT_UI_MODE|qd31-shell|quickdeck-tray|quickdeck-cards|quickdeck-controls" scripts templates styles module.json README.md CHANGELOG.md docs/runtime-dragdrop-forge-hardening-report.md docs/foundry-forge-api-audit-report.md`
- `rg -n "\.quickdeck-" scripts templates styles README.md CHANGELOG.md docs/runtime-dragdrop-forge-hardening-report.md docs/foundry-forge-api-audit-report.md module.json`
- CSS `url(...)` resolver script over `styles/*.css` — all module-local references existed.
- Manifest path resolver script over `module.json` — all local declared paths existed.

## 10. Manual QA checklist and remaining user test items

Recommended Foundry/Forge smoke tests for a real client session:

1. Open QuickDeck from the Actor Directory launcher.
2. Close QuickDeck, reopen it, and verify only one overlay is visible.
3. Drag the overlay by its move handle; release normally.
4. Drag the overlay and interrupt with Escape/window blur or by moving focus away; verify drag state clears and the overlay remains usable.
5. While dragging, cause an actor or combat update if practical; verify the overlay does not visibly re-render mid-drag and refreshes after release.
6. Drag a valid actor to the roster; verify it is added once.
7. Drag the same actor again; verify the duplicate is ignored.
8. Drop unsupported or malformed data on the roster; verify no error dialog, lockup, or roster mutation occurs.
9. Use token drop, UI2 carousel token drop, and pending-damage pick-target mode; cancel with Escape/right-click where supported and verify listeners/modes clear.
10. Close QuickDeck while token drop, carousel token drop, or pending-damage popup/pick-target mode is active; verify no stuck cursor, overlay, popup, or targeting state remains.
11. On Forge or another hosted install, verify CSS imagery/fonts load and no console 404s reference module assets.
12. Confirm no visual layout regression, no `data-action` behavior regression, and no roll/action/roster behavior regression.
