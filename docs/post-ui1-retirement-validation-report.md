# Post-UI1 Retirement Validation Report for v0.19.3

## 1. Executive summary

This conservative post-delete validation pass confirms that UI2 is the only supported QuickDeck interface after the v0.19.2 deletion work. The pass did not redesign UI2, did not change `data-action` values, did not alter roll/action/roster behavior, and did not add or modify binary files.

The cleanup was limited to stale wording and one broken stylesheet asset path discovered by the required CSS `url(...)` scan:

- Updated user-facing and current maintenance text that still described UI1 as default or present.
- Updated stale CSS comments that compared UI2 behavior to UI1 or described UI1 CSS as still loaded.
- Fixed one CSS URL that incorrectly resolved under `styles/assets/...` instead of the existing module asset path.
- Added this validation report.

## 2. Leftover UI1 references found

Fresh searches were run after the cleanup against runtime files, current root docs, and current user-facing docs.

- Runtime JavaScript/templates/module metadata: no matches for `UI1`, `ui1`, `uiMode`, `UI_MODE`, `VALID_UI_MODES`, `DEFAULT_UI_MODE`, `isUi1Mode`, `isUi2Mode`, `setUiMode`, `set-ui-mode`, deleted template names, or qd30 sidecar names.
- Current user-facing/root docs after cleanup: no matches for `UI1`, `ui1`, `legacy ui`, `legacy QuickDeck`, or `quickdeck classic` outside the historical retirement/audit reports and this report.
- `.quickdeck-*` remains in runtime CSS/JS for shared QuickDeck infrastructure, not for the retired app shell. The remaining references are launcher/host/minimize/restore, targeting reticle, reference popup/index styling, and one native application minimize lookup.
- Historical reports under `docs/` still intentionally mention UI1 and deleted templates because they are the evidence trail for the retirement work.

## 3. Items removed or updated

- `README.md`: changed the stale v0.7.0 draft note that said UI1 was the default. It now states that UI2 is the only supported interface and lists the preserved UI2 surfaces.
- `CHANGELOG.md`: updated the top unreleased UI2 entries that still claimed UI1 default/preservation behavior. The entries now describe preserving existing QuickDeck behavior without implying UI1 remains supported.
- `ui2-css-cleanup-audit.md`: added a post-retirement note and replaced stale table language that treated UI1 as still present with shared/current skin terminology.
- `styles/quickdeck.css`: updated the header comment to describe the file as shared runtime styling after legacy interface retirement.
- `styles/quickdeck-ui2.css`: updated the design-token comment so it no longer says UI1 CSS is present.
- `styles/quickdeck-ui2-v23-port.css`: updated stale comments that compared editable HP/FP inputs to UI1.
- `styles/quickdeck-command-desk.css`: fixed `url("./assets/ui/dwarven/left-deadspace-bg.webp")` to `url("../assets/ui/dwarven/left-deadspace-bg.webp")` so the path resolves to the existing asset.

## 4. Items intentionally kept and why

- Historical audit/deletion reports were kept unchanged. They intentionally describe the old state and previous deletion decisions, and remain useful as proof/evidence for future cleanup passes.
- `.quickdeck-*` reference, restore, reticle, launcher, and host selectors were kept because previous reports classified them as shared/core runtime styling rather than UI1 shell styling.
- `qd31-*` CSS/JS references were kept because previous reports classified the namespace as ambiguous or UI2-adjacent in the current command-desk skin. This pass did not remove ambiguous selectors.
- qd40 and qd-ui2 code/CSS were kept because they are the current UI2 shell/frame implementation.
- Shared/core runtime logic was kept, including roster state, actor extraction, GURPS/GGA roll routing, pinned/quick-slot actions, drawer state, resource editing, targeting, pending damage, reference apps, minimize/restore, and overlay drag behavior.
- Development/proof artifacts and asset manifests were kept because they are not runtime UI1 references and were not proven safe to delete.

## 5. Deleted-file reference search results

Deleted template names from v0.19.2 were checked:

- `templates/quickdeck.hbs`
- `templates/quickdeck-actions-sidecar.hbs`
- `templates/quickdeck-roster-sidecar.hbs`

Additional deleted/retired mode names were checked:

- `qd30-sidecar`
- `set-ui-mode`
- `uiMode`
- `UI_MODE`
- `DEFAULT_UI_MODE`
- `VALID_UI_MODES`
- `isUi1Mode`
- `isUi2Mode`
- `setUiMode`

Result: no runtime references remain in `scripts`, `templates`, `styles`, `module.json`, `README.md`, `CHANGELOG.md`, or `ui2-css-cleanup-audit.md`. Mentions remain only in historical reports and this validation report.

No assets were deleted in v0.19.2, so there were no deleted asset filenames to remove. The asset validation focused on CSS URL existence and binary-change detection.

## 6. CSS url reference check

A Python scan over `styles/*.css` checked every local `url(...)` reference relative to its stylesheet location.

Result after cleanup: 36 local CSS URLs checked, with no missing local files.

One pre-cleanup missing path was found and fixed:

- `styles/quickdeck-command-desk.css` used `./assets/ui/dwarven/left-deadspace-bg.webp`, which resolves to `styles/assets/ui/dwarven/left-deadspace-bg.webp` and does not exist.
- It now uses `../assets/ui/dwarven/left-deadspace-bg.webp`, matching the existing asset used elsewhere in the same stylesheet.

## 7. Remaining ambiguous references, if any

- `qd31-*` references remain ambiguous/current-skin-adjacent and were intentionally left untouched.
- `.quickdeck-*` references remain in shared runtime/reference/restore/reticle styling and were intentionally left untouched.
- Historical reports still contain UI1 terms by design.

No ambiguous item was removed in this pass.

## 8. Validation results

Required validation commands:

- `git diff --check` — passed.
- `node --check scripts/dev/quickdeck-art-tuner.js` — passed.
- `node --check scripts/quickdeck-app.js` — passed.
- `node --check scripts/main.js` — passed.
- `git status --short` — completed; expected modified/new text files were present before commit.
- `git diff --stat` — completed; only text files were changed.

Additional required checks:

- Search for `.quickdeck-` — completed; remaining runtime matches are shared/reference/restore/reticle/launcher/host selectors or the native minimize lookup, not retired shell markup.
- Search for `UI1` — completed; current runtime/user-facing/root docs cleaned. Historical reports and this validation report still mention UI1 intentionally.
- Search for `ui1` — completed; no current runtime/user-facing/root doc matches after cleanup. Historical reports and this validation report still mention `ui1` intentionally.
- Search for deleted template names from v0.19.2 — completed; no runtime references found.
- Search for deleted asset names from v0.19.2 — not applicable because v0.19.2 deleted no assets; CSS URL existence was still checked.
- Search CSS `url(...)` references — completed; no missing local CSS URLs remain after the path fix.
- Confirm no binary files were added or modified — confirmed by `git diff --numstat`; all changed paths are text files with line counts.

## 9. Manual Foundry QA checklist

1. Foundry opens with no console errors.
2. QuickDeck opens.
3. UI2 shell displays correctly.
4. No missing template errors.
5. No missing image 404s.
6. Left drawer opens/closes.
7. Center cockpit and carousel display correctly.
8. Carousel hover zoom remains unclipped.
9. Right drawer/action deck displays correctly.
10. Actor selection and roster add/remove work.
11. Combat/Skills/Spells search and rolls work.
12. Pinned/quick-slot actions work.
13. Pending damage popup/reticle works.
14. Dragging QuickDeck remains smooth and restores from ghost mode.
