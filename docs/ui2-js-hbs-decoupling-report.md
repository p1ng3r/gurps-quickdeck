# UI2 JS/HBS Decoupling Report — v0.19.1c

## 1. Executive summary

This pass audited the JavaScript and Handlebars entrypoints that UI2 currently needs before UI1 deletion. It is report-only: no JavaScript behavior, Handlebars logic, `data-action` attributes, roll/action/roster/pending-damage code, CSS, or binary assets were changed.

The main finding is that UI2 is already concentrated in the overlay path: `scripts/main.js` opens `QuickDeckApp`, calls the legacy Foundry `Application` render, then calls `renderOverlay()`, and `scripts/quickdeck-app.js` renders `templates/quickdeck-overlay.hbs` into `#gurps-quickdeck-overlay`. The UI2 branch is gated by `isUi2Mode` inside that overlay template and uses the `qd-ui2-*` and `qd40-*` shells.

UI1 is still present in three JavaScript/HBS areas that should be handled together in v0.19.2:

- the native Foundry application template path, `templates/quickdeck.hbs`, configured through `TEMPLATE_PATH`;
- the `{{else}}` UI1 branch inside `templates/quickdeck-overlay.hbs`;
- the `uiMode` setting/default/toggle plumbing that currently defaults to `ui1` and chooses between the overlay's UI1 and UI2 branches.

Do not delete shared core code when removing UI1. The roster state, actor-data derivation, GURPS roll routing, quick skills/favorites/pinned actions, drawer state, resource editing, token dropping, targeting, pending-damage capture/application, reference apps, PDF source mapping, minimize/restore overlay lifecycle, and `data-action` listeners are used by UI2 and must remain unless a later pass explicitly replaces a handler with a UI2-only equivalent.

## 2. UI2 JS entrypoints currently in use

| Item | Current role | Classification | Notes |
| --- | --- | --- | --- |
| `module.json` → `esmodules: ["scripts/main.js"]` | Foundry loads the module through `scripts/main.js`. | shared core, must remain | This is the module-level JS entrypoint for both current UI modes. |
| `scripts/main.js` `openQuickDeck()` | Creates/reuses `QuickDeckApp`, restores from minimized state, removes stale overlay roots, calls `render(true)`, then calls `renderOverlay()`. | UI2-needed, must be decoupled before deletion | UI2 still depends on `renderOverlay()`, but v0.19.2 should verify whether the `render(true)` native application shell call remains necessary once UI1 is gone. |
| `scripts/main.js` `renderQuickDeckIfOpen()` | Re-renders the app if it is open and not minimized. | shared core, must remain | Used by actor/combat update hooks and remains relevant to UI2's live data refresh path. |
| `scripts/main.js` setting registration | Registers roster, favorites, pinned actions, drawer, minimized/restore, token-drop, damage-pick, dev art tuner, UI mode, reference index, and PDF mapping settings. | shared core, must remain except `UI_MODE` | All settings except `UI_MODE` remain relevant to UI2 or shared reference/persistence behavior. |
| `scripts/quickdeck-app.js` `QuickDeckApp` class | Main controller for state, data preparation, overlay rendering, roll routing, action handlers, and shared utilities. | shared core, must remain | UI2 is not a separate class; deletion must be selective inside this class. |
| `scripts/quickdeck-app.js` `OVERLAY_TEMPLATE_PATH` + `renderOverlay()` | Renders `templates/quickdeck-overlay.hbs` with `getOverlayData()` and mounts/activates the overlay root. | UI2-needed, must remain | This is the confirmed UI2 runtime template path. |
| `scripts/quickdeck-app.js` `getOverlayData()` / `getData()` | Prepares roster, actor, action, roll, favorite, search, PDF, settings, and mode fields used by both overlay branches. | shared core, must remain | v0.19.2 may remove fields only used by deleted UI1 markup after another exact template-field check. |
| `scripts/quickdeck-app.js` `activateOverlayListeners()` / `activateListeners()` | Binds overlay listeners and broad `data-action` handlers. | shared core, must remain | Many handlers are shared by UI2; prune only handlers whose `data-action`s are no longer emitted after UI1 deletion. |
| `scripts/quickdeck-app.js` `QuickDeckCustomScrollbarManager` | Adds custom scrollbars for `qd31-*` candidates and explicit `[data-qd-custom-scroll-candidate="true"]` hosts. | ambiguous, needs user approval | UI2 currently uses `data-qd-native-scroll="true"` in the overlay drawer, while the manager has legacy-looking `qd31-*` selectors. Do not delete until CSS/HBS scrollbar ownership is decided. |
| `scripts/quickdeck-app.js` `focusQuickDeckCockpitFirst()` and `qd31` layout sizing helpers | Legacy-looking cockpit/window sizing and focus helpers. | UI2-needed, must be decoupled before deletion | The current overlay still has `qd40`/`qd31` branch logic and `applyQd31WindowClass()` checks `.qd31-shell`; decouple during UI2-only shell cleanup rather than blind deletion. |

## 3. UI2 HBS/template entrypoints currently in use

| Template / branch | Current role | Classification | Notes |
| --- | --- | --- | --- |
| `templates/quickdeck-overlay.hbs` outer `qd40-frame` / `qd40-body` | Overlay chrome, info popover, minimize/close controls, and body wrapper. | UI2-needed, must remain | This is shared overlay chrome around the UI2 branch. |
| `templates/quickdeck-overlay.hbs` `{{#if isUi2Mode}}` branch | Main UI2 shell with left roster drawer, center cockpit, right action drawer, settings, carousel, token drop, favorites, searches, action rolls, references, and PDF/source settings. | UI2-needed, must remain | This is the primary UI2 HBS entrypoint. |
| `templates/quickdeck-overlay.hbs` `qd-ui2-*` markup | UI2-owned class namespace for shell, drawers, roster, actor card, carousel, vitals, favorites, and action drawer. | UI2-needed, must remain | CSS alias work from v0.19.1b supports this namespace. |
| `templates/quickdeck-overlay.hbs` `qd40-*` markup | Chromeless command-desk frame/chrome namespace around the overlay. | UI2-needed, must remain | The qd40 frame is part of current UI2 presentation, not a UI1 deletion candidate. |
| `templates/quickdeck-overlay.hbs` `set-ui-mode` checkbox in the UI2 settings panel | Allows switching back to UI1. | UI1-only, safe deletion candidate for v0.19.2 | Remove with `uiMode` setting plumbing when UI2 becomes the only supported interface. |
| `templates/reference.hbs` | Reference popup rendered by `scripts/reference-app.js`. | shared core, must remain | It uses legacy `.quickdeck-*` classes but is not UI1 shell markup. |
| `templates/reference-index.hbs` | Reference/PDF source manager rendered by `scripts/reference-index-app.js`. | shared core, must remain | It uses legacy `.quickdeck-*` classes but remains reachable from UI2 settings/reference actions. |

## 4. UI1 JS/HBS/template deletion candidates for v0.19.2

| Item | Classification | v0.19.2 action |
| --- | --- | --- |
| `templates/quickdeck.hbs` | UI1-only, safe deletion candidate for v0.19.2 | Delete after removing or replacing `TEMPLATE_PATH` / `defaultOptions.template` usage and confirming the overlay can open without the native UI1 application content. |
| `scripts/quickdeck-app.js` `TEMPLATE_PATH` constant and `defaultOptions.template: TEMPLATE_PATH` | UI1-only, safe deletion candidate for v0.19.2 | Remove or replace with a minimal inert lifecycle approach if Foundry `Application` still needs a template. |
| `scripts/main.js` `openQuickDeck()` native `quickDeckApp.render(true)` call | UI2-needed, must be decoupled before deletion | Audit in v0.19.2 by testing whether `renderOverlay()` plus application lifecycle state is enough. Do not remove blindly. |
| `templates/quickdeck-overlay.hbs` `{{else}}` branch beginning with `qd40-shell qd31-shell` | UI1-only, safe deletion candidate for v0.19.2 | Delete the branch after preserving any unique actions still desired in UI2. The current UI2 branch already contains roster, center, drawer, favorites, roll, target, token, settings, and reference controls. |
| `templates/quickdeck-overlay.hbs` UI1 `set-ui-mode` checkbox | UI1-only, safe deletion candidate for v0.19.2 | Delete with UI mode selection. |
| `templates/quickdeck-actions-sidecar.hbs` | UI1-only, safe deletion candidate for v0.19.2 | No render path reference was found in JS. Delete if product confirms qd30 sidecars are obsolete. |
| `templates/quickdeck-roster-sidecar.hbs` | UI1-only, safe deletion candidate for v0.19.2 | No render path reference was found in JS. Delete if product confirms qd30 sidecars are obsolete. |
| `scripts/quickdeck-app.js` handlers for `open-actions-sidecar`, `close-actions-sidecar`, `open-roster-sidecar`, `close-roster-sidecar` | ambiguous, needs user approval | Keep until sidecar templates and any historical sidecar calls are removed; then prune dead aliases. |
| `scripts/main.js` / `scripts/quickdeck-app.js` `SETTING_KEYS.UI_MODE`, `VALID_UI_MODES`, `DEFAULT_UI_MODE`, `isUi1Mode`, `isUi2Mode`, `setUiMode()` | UI1-only, safe deletion candidate for v0.19.2 | Replace with UI2-only constants/fields or remove mode fields from template data after deleting the branch. |
| `scripts/quickdeck-app.js` qd31 layout/window helpers | UI2-needed, must be decoupled before deletion | Some are tied to the current overlay shell and sizing. Reclassify after the UI1 branch is deleted and the UI2 shell no longer requires qd31 sizing variables. |

## 5. Shared core JS that must remain

The following JavaScript areas are shared core and must remain through UI1 deletion unless v0.19.2 explicitly replaces them with equivalent UI2-only behavior:

- module initialization, `ready`/`init` hooks, debug open helpers, actor/combat refresh hooks, and setting registration other than the UI mode setting;
- roster persistence and manipulation: add/remove/clear actors, active actor selection, combat roster state, available-actor filtering, center carousel selection, and actor relevance checks;
- actor data derivation: attack, skill, spell extraction/normalization, search text construction, display values, favorites, quick skills, and pinned actions;
- roll/action routing: primary/secondary attribute rolls, defenses, attacks, damage, skills, spells, GURPS `handleRoll`/OTF integration, target opponent, modifier bucket, repeat-last-attack, next actor, clear targets, and open chat/sheet actions;
- resource editing for HP/FP controls;
- token placement: single actor drop, UI2 carousel mass token drop, auto-minimize/restore settings, reticles, canvas coordinate conversion, and drag/drop payload parsing;
- pending damage: chat capture, pending payload view, popup, pick-target reticle, application, clearing, and context reset;
- reference handling: `openReferenceEntry()`, `openReferenceIndexManager()`, `ReferenceApp`, `ReferenceIndexApp`, PDF source mappings, PDF map draft, and mapped PDF opening;
- overlay lifecycle: `renderOverlay()`, `mountOverlay()`, `unmountOverlay()`, overlay drag, minimize/restore pill, info popover, and app-shell visibility management until the app-shell dependency is proven unnecessary;
- search/filter UI helpers and all `data-search-*`/count-status updates used by UI2.

## 6. `.quickdeck-*` references found in JS/HBS and classification

| Location | Reference type | Classification | Notes |
| --- | --- | --- | --- |
| `scripts/main.js` `MODULE_ID = "gurps-quickdeck"` | module id string | shared core, must remain | Not a CSS class. |
| `scripts/quickdeck-app.js` `MODULE_ID`, app id/classes, overlay id, restore icon id, CSS class names such as `gurps-quickdeck`, `gurps-quickdeck-app`, `quickdeck-restore-pill`, `quickdeck-token-drop-reticle`, and `quickdeck-target-reticle` | app/module ids and shared helper classes | shared core, must remain | Several are not UI1 shell selectors; they support app identity, overlay roots, restore/minimize, and reticles. |
| `templates/quickdeck.hbs` `quickdeck-dev-badge`, `quickdeck-actor-header`, `quickdeck-actor-identity` | UI1 app-shell classes | UI1-only, safe deletion candidate for v0.19.2 | Delete with `templates/quickdeck.hbs`. |
| `templates/reference.hbs` `.quickdeck-reference-*`, `.quickdeck-roll-button`, `.quickdeck-empty-state` | reference app classes | shared core, must remain | Used by reference popup, not UI1 QuickDeck shell. |
| `templates/reference-index.hbs` `.quickdeck-pdf-sources-*`, `.quickdeck-reference-index-*`, `.quickdeck-add-button`, `.quickdeck-remove-button`, `.quickdeck-roll-button` | reference index/PDF manager classes | shared core, must remain | Used by reference index manager reachable from UI2. |
| `module.json` `gurps-quickdeck` ids/URLs/style filenames | module metadata and stylesheet paths | shared core, must remain | Not UI1 template markup. |

## 7. `qd-ui2-*` / `qd40-*` references found in JS/HBS and classification

| Location | Reference type | Classification | Notes |
| --- | --- | --- | --- |
| `templates/quickdeck-overlay.hbs` `qd-ui2-*` | UI2 shell, edge tabs, drawers, roster rows, actor card, carousel, vitals, favorite quick slots, action drawer, settings, and controls | UI2-needed, must remain | Primary UI2 class namespace. |
| `templates/quickdeck-overlay.hbs` `qd40-*` | overlay frame, chrome row, corner badge, window controls, info popover, body, and shell wrapper | UI2-needed, must remain | Current chromeless command-desk frame used around UI2. |
| `scripts/quickdeck-app.js` `qd-ui2-*` references | UI2 carousel token-drop reticle/origin behavior and UI2 carousel/drop selectors | UI2-needed, must remain | These JS selectors are tied to UI2-specific interaction behavior. |
| `scripts/quickdeck-app.js` `qd40-*` references | overlay body/frame sizing and drag/chrome selectors | UI2-needed, must remain | Current overlay shell/chrome still depends on them. |
| `scripts/quickdeck-app.js` `qd31-*` references | legacy-looking window sizing, scroll hosts, primary/secondary roll chip DOM updates, and UI1 branch shell checks | UI2-needed, must be decoupled before deletion | Do not classify all `qd31-*` as UI1-only yet; the current overlay and CSS still use some qd31 conventions. |
| `templates/quickdeck.hbs`, `templates/quickdeck-actions-sidecar.hbs`, `templates/quickdeck-roster-sidecar.hbs` `qd31-*`/`qd30-*` | legacy app shell and old sidecars | UI1-only, safe deletion candidate for v0.19.2 | Delete only after JS template references/sidecar handler aliases are removed. |

## 8. Data-action handlers that must remain

UI2 emits and needs these action groups from `templates/quickdeck-overlay.hbs`; their JavaScript handlers must remain in v0.19.2 unless an equivalent UI2-only action replaces them without changing behavior.

| Group | `data-action` values to keep |
| --- | --- |
| Overlay/window | `drag-overlay`, `toggle-info-popover`, `minimize-overlay`, `close-overlay`, `toggle-roster-drawer`, `toggle-actions-drawer`, `toggle-drawer` |
| Roster/search | `open-actor`, `open-active-actor-sheet`, `add-actor`, `remove-actor`, `clear-roster`, `available-search`, `center-roster-select`, `center-roster-prev`, `center-roster-next`, `toggle-center-roster-minimized`, `ui2-carousel-scroll` |
| Token/canvas | `drop-token`, `drop-ui2-carousel-tokens`, `set-token-drop-auto-minimize`, `set-token-drop-auto-restore` |
| Resources/utility | `set-resource`, `open-chat`, `clear-targets`, `next-actor`, `repeat-last-attack`, `open-modifier-bucket`, `target-opponent`, `target-action` |
| Rolls | `primary-roll-select`, `roll-primary-attribute`, `secondary-roll-select`, `roll-secondary-attribute`, `roll-defense`, `roll-attack`, `roll-damage`, `roll-skill`, `roll-spell` |
| Favorites/pins/search | `toggle-center-favorite-section`, `toggle-favorite-attack`, `toggle-quick-skill`, `toggle-favorite-spell`, `combat-search`, `skills-search`, `spells-search`, `clear-combat-search`, `clear-skills-search`, `clear-spells-search` |
| Pending damage | `apply-pending-damage`, `clear-pending-damage`, `set-damage-pick-auto-minimize` |
| References/PDF/settings | `open-reference`, `open-reference-index`, `pdf-map-key`, `pdf-map-name`, `pdf-map-path`, `pdf-map-offset`, `choose-pdf-source`, `save-pdf-source`, `clear-pdf-source-draft`, `edit-pdf-source`, `test-pdf-source`, `remove-pdf-source`, `toggle-dev-art-tuner-enabled`, `open-dev-art-tuner`, `close-dev-art-tuner`, `copy-dev-art-tuner-css`, `reset-dev-art-tuner`, `status-dev-art-tuner` |

Deletion candidates after UI1 removal: `set-ui-mode`, `open-actions-drawer`, `close-actions-drawer`, `open-actions-sidecar`, `close-actions-sidecar`, `open-roster-drawer`, `close-roster-drawer`, `open-roster-sidecar`, `close-roster-sidecar`, `toggle-pin-attack`, `toggle-pin-skill`, `toggle-pin-spell`, `remove-pinned-action`, `unpin-quick-skill`, `open-sheet`, and `adjust-resource` are legacy/UI1-looking or sidecar/app-template-only in the current HBS scan. Before removing handlers, re-run the exact template action scan after deleting the UI1 HBS branch.

## 9. Remaining blockers before UI1 deletion

1. Confirm the UI2-only lifecycle can open, refresh, minimize, restore, and close without rendering `templates/quickdeck.hbs` through the native Foundry application shell.
2. Decide whether `QuickDeckApp` should remain a hidden/minimal `Application` host or be reduced to an overlay-only controller.
3. Remove `uiMode` persistence and settings UI only when no supported path needs to switch back to UI1.
4. Delete the UI1 branch in `templates/quickdeck-overlay.hbs` only after confirming no unique UI1 control remains absent from the UI2 branch.
5. Re-run a post-deletion `data-action` scan and remove only handlers that are no longer emitted by any remaining template or runtime popup.
6. Reclassify `qd31-*` JS references after the UI1 branch is gone; some may become dead, while primary/secondary roll chip updates may need passive `qd-ui2-roll-pill` markup aliases before deleting qd31 chip selectors.
7. Keep `templates/reference.hbs` and `templates/reference-index.hbs` even though they use `.quickdeck-*`; they are shared reference tools, not UI1 shell templates.
8. No binary assets were verified as JS/HBS deletion candidates in this pass.

## 10. Exact recommended v0.19.2 UI1 deletion plan

1. Start with a fresh branch and re-run the JS/HBS scans from this report.
2. Change the QuickDeck open path so UI2 is the only supported mode. Remove `UI_MODE`, `VALID_UI_MODES`, `DEFAULT_UI_MODE`, `isUi1Mode`, `setUiMode()`, and the settings checkbox only after the overlay renders UI2 unconditionally.
3. Make `templates/quickdeck-overlay.hbs` render the current UI2 branch unconditionally inside the existing `qd40-frame` / `qd40-body` chrome.
4. Delete the `{{else}}` UI1 branch from `templates/quickdeck-overlay.hbs`.
5. Remove `templates/quickdeck.hbs` and its `TEMPLATE_PATH` linkage after confirming the application lifecycle no longer needs that template. If Foundry still requires a template, replace it with a minimal inert template in the same pass and document why.
6. Remove qd30 sidecar templates and sidecar handler aliases only if product approval confirms they are obsolete and no JS render path exists.
7. Re-run template action extraction. Remove handlers only when their `data-action` values are no longer emitted by `templates/quickdeck-overlay.hbs`, runtime pending-damage popup HTML, `templates/reference.hbs`, or `templates/reference-index.hbs`.
8. Re-run class scans. Remove or rename only qd31 references proven dead after UI1 HBS deletion; keep qd40 and qd-ui2 references.
9. Do not touch binary assets during the UI1 JS/HBS deletion unless a separate verified asset cleanup is approved.
10. Validate with syntax checks, `git diff --check`, action scans, class scans, binary diff checks, and a Foundry smoke test covering open, roster, rolls, token drop, pending damage, references, minimize/restore, and settings.

## Manual binary command section

No binary assets were identified as JS/HBS deletion or move candidates in this pass. No `git rm` or `git mv` binary commands are recommended from this audit.

## Validation notes for this pass

Planned validation commands for this report-only change:

- `git diff --check`
- `node --check scripts/dev/quickdeck-art-tuner.js`
- `node --check scripts/quickdeck-app.js`
- `node --check scripts/main.js`
- `git status --short`
- `git diff --stat`

Additional confirmations for this pass:

- no binary files were added, moved, modified, or deleted;
- no `data-action` attributes were changed or removed;
- no roll/action/roster/pending-damage behavior was changed;
- the only changed file is this documentation report.

## Commands used for the audit

- `git status --short`
- `find .. -name AGENTS.md -print`
- `rg -n "quickdeck-|qd-ui2-|qd40-|data-action|template|render|ui2|UI2|UI1|quickdeck" scripts/main.js scripts/quickdeck-app.js templates module.json docs/ui1-ui2-retirement-audit.md docs/ui2-standalone-dependency-map.md docs/ui2-css-decoupling-report.md`
- `sed -n '1,260p' scripts/main.js`
- `sed -n '1,260p' scripts/quickdeck-app.js`
- `rg --files templates module.json docs | sort`
- `rg -n "uiMode|UI_MODE|quickdeck-overlay|quickdeck\.hbs|quickdeck-overlay|quickdeck-actions-sidecar|quickdeck-roster-sidecar|template|defaultOptions|get template|renderOverlay|activateListeners|data-action|querySelector|quickdeck-|qd-ui2-|qd40-|qd31-" scripts/main.js scripts/quickdeck-app.js templates module.json`
- `nl -ba templates/quickdeck-overlay.hbs | sed -n '1,180p'`
- `nl -ba templates/quickdeck-overlay.hbs | sed -n '180,380p'`
- `nl -ba templates/quickdeck-overlay.hbs | sed -n '380,620p'`
- `nl -ba templates/quickdeck-overlay.hbs | sed -n '620,990p'`
- `python3` count scan for `quickdeck-`, `qd-ui2-`, `qd40-`, `qd31-`, `qd30-`, and `data-action` in JS/HBS/module metadata.
- `python3` unique `data-action` extraction from templates and `scripts/quickdeck-app.js` handlers.
- `rg -n "quickdeck-actions-sidecar|quickdeck-roster-sidecar|reference-index|reference\.hbs|renderTemplate\(|renderQuickDeckTemplate\(" scripts templates module.json`
