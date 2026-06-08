# UI1 Retirement Deletion Report — v0.19.2

## 1. Executive summary

UI1 is retired in this pass. QuickDeck now renders the UI2 overlay unconditionally through the existing overlay controller, while retaining the minimal Foundry `Application` host lifecycle needed by the current open/render/minimize/restore plumbing.

Deleted and simplified areas were limited to items proven UI1-only by the v0.19.0–v0.19.1c reports plus fresh reference searches:

- removed the UI mode setting/default/toggle plumbing;
- removed the legacy UI1 `{{else}}` branch from `templates/quickdeck-overlay.hbs`;
- deleted the legacy UI1 app-shell template and unused qd30 sidecar templates;
- replaced the deleted app-shell template with a minimal inert host template for Foundry lifecycle compatibility;
- reduced `styles/quickdeck.css` to shared runtime styles and removed its legacy UI1 shell/card/list CSS blocks.

No binary files were added, moved, modified, or deleted.

## 2. Files deleted

| Deleted file | Evidence | Result |
| --- | --- | --- |
| `templates/quickdeck.hbs` | The prior reports identified it as the legacy Foundry `Application` template. Fresh runtime search after deletion found no `scripts`, `templates`, or `module.json` references to `quickdeck.hbs`; `QuickDeckApp.defaultOptions.template` now points to `templates/quickdeck-host.hbs`. | Deleted. |
| `templates/quickdeck-actions-sidecar.hbs` | The prior reports found no render path for this qd30 sidecar. Fresh runtime search after deletion found no `scripts`, `templates`, or `module.json` references to `quickdeck-actions-sidecar`. | Deleted. |
| `templates/quickdeck-roster-sidecar.hbs` | The prior reports found no render path for this qd30 sidecar. Fresh runtime search after deletion found no `scripts`, `templates`, or `module.json` references to `quickdeck-roster-sidecar`. | Deleted. |

## 3. CSS selectors/blocks deleted

`styles/quickdeck.css` was reduced from the mixed UI1/shared stylesheet to shared runtime styles only. The pass deleted the UI1-only selector groups identified in the reports, including:

- legacy app shell/window content blocks: `.quickdeck-shell`, `.quickdeck-content`, `.quickdeck-stage`, `.quickdeck-sidebar`, `.quickdeck-main`, `.quickdeck-selected-cockpit`, `.quickdeck-panel`, `.quickdeck-panel-content`, and `.quickdeck-panel-scroll-root`;
- legacy roster/search blocks: `.quickdeck-roster-*`, `.quickdeck-available-*`, old actor-card/header/list rows, and old app drawer tabs;
- legacy action/list blocks: `.quickdeck-attack-*`, `.quickdeck-skill-*`, `.quickdeck-spell-*`, `.quickdeck-favorite-*`, old defense/resource/cockpit blocks, and old app-card controls;
- old qd31 compatibility blocks in `styles/quickdeck.css`, including `.qd31-shell`, `.qd31-panel-wrap`, `.qd31-left-drawer`, `.qd31-right-drawer`, `.qd31-center-cockpit`, `.qd31-action-row`, `.qd31-defense-grid`, and `.qd31-pinned-grid`.

The remaining `.quickdeck-*` selectors in `styles/quickdeck.css` are shared runtime/reference selectors, not UI1 shell selectors: restore pill, reference/reference-index/PDF source styling, reticles, roll fallback, and the inert overlay host.

## 4. Templates/render paths deleted

- `templates/quickdeck-overlay.hbs` now renders the `qd40`/`qd-ui2` shell unconditionally; the former `{{#if isUi2Mode}} ... {{else}} ... {{/if}}` UI1 branch gate was removed.
- The UI2 settings panel no longer exposes the UI mode checkbox or any copy describing UI2 as experimental.
- `scripts/quickdeck-app.js` no longer defines `TEMPLATE_PATH` for `templates/quickdeck.hbs`; it now uses `HOST_TEMPLATE_PATH` for `templates/quickdeck-host.hbs` so the Foundry `Application` lifecycle remains available without rendering UI1.
- `scripts/main.js` and `scripts/quickdeck-app.js` no longer register, load, persist, expose, or handle `uiMode`, `UI_MODE`, `VALID_UI_MODES`, `DEFAULT_UI_MODE`, `isUi1Mode`, `isUi2Mode`, `setUiMode()`, or `data-action="set-ui-mode"`.
- Sidecar handler aliases for `open-*-sidecar` / `close-*-sidecar` were removed from the active listener selectors after their qd30 templates were deleted.

## 5. Assets deleted

No assets were deleted.

No binary files were added, moved, modified, or deleted. The previous reports did not prove any binary asset UI1-only, so all binary assets were preserved.

## 6. Shared/core items intentionally preserved

The following were intentionally preserved because the reports classified them as UI2-needed, shared/core, or ambiguous:

- `scripts/quickdeck-app.js` actor/roster data extraction, GURPS/GGA roll routing, action/favorite/quick-skill/pinned-action state, resource editing, token drop, targeting, pending damage, reference/PDF mapping, minimize/restore, overlay drag, and render lifecycle logic.
- `scripts/main.js` launcher hooks, non-UI-mode settings, and QuickDeck refresh hooks.
- UI2 namespaces and behavior: all `qd-ui2-*` template classes, current `data-action` names emitted by UI2, qd40 overlay/frame behavior, carousel hover unclip styling, right action-row hover expansion styling, cheap/ghost drag behavior, pending damage UI, token/drop reticles, and UI2 token aliases.
- Reference apps and templates: `scripts/reference-app.js`, `scripts/reference-index-app.js`, reference stores/utilities, `templates/reference.hbs`, and `templates/reference-index.hbs`.
- `styles/quickdeck-command-desk.css`, `styles/quickdeck-ui2.css`, and `styles/quickdeck-ui2-v23-port.css` because they still own current qd40/UI2 styling, dwarven asset URLs, token aliases, and compatibility overrides.
- Remaining `qd31-*` code/CSS outside the deleted UI1 templates where the reports marked the namespace ambiguous or UI2-adjacent. The UI2 overlay still emits `qd31-primary-roll-chip`, `qd31-primary-roll-value`, `qd31-secondary-roll-chip`, and `qd31-secondary-roll-value` as compatibility aliases used by current JS/CSS roll-pill updates.

## 7. Ambiguous items intentionally kept

- `styles/quickdeck-command-desk.css` qd31 blocks were not bulk-deleted in this pass. After the UI1 branch deletion, many are likely dead, but the reports explicitly warned against broad deletion because this file also owns shared variables, qd40 overlay styling, current asset URLs, reference popup skinning, and UI2-adjacent overrides.
- `scripts/quickdeck-app.js` qd31 layout/custom-scrollbar/focus helpers were kept. Some no-op against UI2 now, but they are coupled to overlay sizing and roll-chip compatibility aliases and should be decoupled in a dedicated pass.
- Legacy-looking but harmless action handlers for pinned actions, resource adjustments, and open-sheet aliases were kept because the product requirements explicitly preserve pinned/quick-slot behavior, resource editing, and GURPS action behavior; only the proven unused sidecar aliases and UI mode handler were removed.
- Development/proof/docs artifacts (`dev/dwarven-asset-proof.html`, asset manifests, historical audit reports, README assets) were kept because they are not runtime UI1 paths and were not proven safe for deletion.
- All binary assets were kept because none were proven UI1-only.

## 8. Reference-search evidence summary

Fresh searches were run before and after deletion. The post-deletion runtime searches showed:

- no runtime references in `scripts`, `templates`, or `module.json` for `quickdeck.hbs`, `quickdeck-actions-sidecar`, `quickdeck-roster-sidecar`, `qd30-sidecar`, `UI_MODE`, `VALID_UI_MODES`, `DEFAULT_UI_MODE`, `isUi1Mode`, `isUi2Mode`, `setUiMode`, `set-ui-mode`, or `uiMode`;
- deleted template filenames/basenames remain only in historical reports and this deletion report;
- `.quickdeck-*` references remain only in shared runtime/reference styling, reference templates, reticle/restore/fallback runtime strings, and the launcher button class;
- `qd31-*` remains in the UI2 roll-pill aliases plus ambiguous command-desk/layout/dev-tool code intentionally preserved for safety;
- CSS `url(...)` scan found no new missing references from this pass. One pre-existing relative URL issue remains in `styles/quickdeck-command-desk.css` for `./assets/ui/dwarven/left-deadspace-bg.webp`; this pass did not add or alter that URL.

## 9. Validation results

Commands run:

- `git diff --check` — passed.
- `node --check scripts/dev/quickdeck-art-tuner.js` — passed.
- `node --check scripts/quickdeck-app.js` — passed.
- `node --check scripts/main.js` — passed.
- `git status --short` — completed; expected modified/deleted/new files were present before commit.
- `git diff --stat` — completed after staging with no unstaged diff output; `git diff --cached --stat` showed the expected UI1 deletion/simplification footprint.

Additional searches/checks run:

- `rg -n "quickdeck-actions-sidecar|quickdeck-roster-sidecar|quickdeck\.hbs|set-ui-mode|UI_MODE|DEFAULT_UI_MODE|VALID_UI_MODES|isUi1Mode|isUi2Mode|setUiMode|uiMode|qd30-sidecar" scripts templates module.json styles README.md CHANGELOG.md docs --glob '!docs/ui1-retirement-deletion-report.md'`
- `rg -n "\.quickdeck-" styles scripts templates`
- Python `data-action` extraction over `templates/*.hbs`
- Python CSS `url(...)` existence scan over `styles/*.css`

## 10. Manual QA checklist

1. Foundry opens with no console errors.
2. QuickDeck opens.
3. UI2 shell displays correctly.
4. Left drawer opens/closes.
5. Center cockpit and carousel display correctly.
6. Carousel hover zoom remains unclipped.
7. Right drawer/action deck displays correctly.
8. Right action-row hover expansion still works.
9. Actor selection and roster add/remove work.
10. Combat/Skills/Spells search and rolls work.
11. Pinned/quick-slot actions work.
12. Pending damage popup/reticle works.
13. Dragging QuickDeck remains smooth and restores from ghost/cheap mode.
14. No missing image 404s.
