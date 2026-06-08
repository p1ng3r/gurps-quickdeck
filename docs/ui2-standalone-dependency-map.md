# UI2 Standalone Dependency Map Before UI1 Retirement

Inventory pass only for v0.19.1a. No runtime JavaScript, Handlebars behavior, CSS behavior, `data-action` contracts, binary assets, or UI1 files were changed in this pass.

Starting point: `docs/ui1-ui2-retirement-audit.md`.

## 1. Executive summary

- **UI2 is not standalone yet.** The active UI2 shell is gated by the existing `uiMode` setting and rendered from the shared overlay template only when `isUi2Mode` is true. The non-UI2 branch still lives in the same overlay file and the old Foundry `Application` template still exists.
- **Do not delete whole CSS files yet.** `module.json` currently loads all four stylesheets: `styles/quickdeck.css`, `styles/quickdeck-command-desk.css`, `styles/quickdeck-ui2.css`, and `styles/quickdeck-ui2-v23-port.css`. UI2-owned selectors are concentrated in the two `quickdeck-ui2*` files, but UI2 still depends on `qd40-*`, shared command-desk variables, reference popup styles, restore/minimize styles, and runtime dwarven assets.
- **UI1 deletion must be selector- and branch-level first.** The safe path is to collapse the overlay to the UI2 branch, remove UI mode setting/plumbing, then decouple CSS variables/selectors before deleting legacy files.
- **The riskiest names are old but shared.** `qd40-*` is the current chromeless overlay/frame namespace. Several `qd31-*` selectors are legacy/UI1-leaning, but are also targeted by command-desk CSS, custom scrollbar code, and the dev art tuner; treat them as ambiguous until the UI2 shell no longer needs those hooks.
- **No binary work is required in this pass.** Some fonts and source/proof assets appear unreferenced at runtime, but deletion/move commands should be held for user approval after CSS decoupling.

## 2. UI2 current entrypoints

### Manifest/runtime entrypoints

| Entrypoint | Current role | UI2 retirement note |
| --- | --- | --- |
| `module.json` | Loads `scripts/main.js` and all four CSS files. | Keep as the authoritative module entrypoint; later remove/migrate CSS entries only after retained selectors are decoupled. |
| `scripts/main.js` | Registers settings, injects the Actor Directory QuickDeck launcher, opens `QuickDeckApp`, calls `render(true)`, then calls `renderOverlay()`. | UI2 still relies on this launcher/open path. `render(true)`/hidden app-host behavior should be audited before removing the legacy `Application` template. |
| `scripts/quickdeck-app.js` | Main controller for data extraction, UI mode state, action handlers, overlay render, minimize/restore, drag/drop, token drop, references, favorites, pins, and damage flows. | Shared/core; do not delete. Remove UI1 branches surgically later. |

### Template entrypoints

| Template | Current role | UI2 retirement note |
| --- | --- | --- |
| `templates/quickdeck-overlay.hbs` | Active overlay template. It always renders `qd40-frame`/chrome and renders `qd-ui2-shell` inside `{{#if isUi2Mode}}`; otherwise it renders legacy `qd31-*` markup. | Keep the file, keep the UI2 branch, remove the UI1 `{{else}}` branch later. |
| `templates/quickdeck.hbs` | Legacy Foundry `Application` template referenced by `TEMPLATE_PATH`. | Likely delete later, only after `QuickDeckApp.defaultOptions.template` and `openQuickDeck()` no longer require the app shell lifecycle. |
| `templates/reference.hbs` and `templates/reference-index.hbs` | Reference popup/source-manager templates opened from UI2 action rows. | Shared/core. Keep. Their `quickdeck-reference-*` classes are not UI1 shell classes. |
| `templates/quickdeck-actions-sidecar.hbs` and `templates/quickdeck-roster-sidecar.hbs` | Legacy/sidecar templates with no direct runtime entry found in current manifest/script searches. | UI1-only or abandoned candidate; require approval before deletion. |

### Style entrypoints

| Stylesheet | Current role | UI2 retirement note |
| --- | --- | --- |
| `styles/quickdeck-ui2.css` | Base UI2 shell, drawer, roster, carousel, right-drawer mapping, and UI2 card selectors. | UI2-owned; keep. |
| `styles/quickdeck-ui2-v23-port.css` | Large UI2 v23 visual port with `qd-ui2-*` and `qd40-*` overrides plus some shared/legacy references. | UI2-owned/mixed; keep, then clean remaining `.quickdeck-*` and `qd31-*` references by selector. |
| `styles/quickdeck-command-desk.css` | Current command-desk/dwarven skin, `qd40` frame rules, shared variables, runtime asset `url(...)` declarations, reference popup skinning, and many legacy selectors. | Shared/mixed; do not delete wholesale. |
| `styles/quickdeck.css` | Legacy base app/reference CSS, restore pill styles, reference popup/source-manager styles, and many UI1 shell selectors. | Mixed; delete only after reference/restore/shared styles are migrated. |

## 3. UI2-owned files to keep

### Files and selector families

- `styles/quickdeck-ui2.css` — keep all `qd-ui2-*` UI2 shell, drawer, roster, carousel, action-row, and settings selectors.
- `styles/quickdeck-ui2-v23-port.css` — keep UI2 v23 port selectors, especially `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-*`, `.qd40-overlay .qd-ui2-*`, and drag optimization selectors such as `.qd40-ui2-dragging-cheap`.
- `templates/quickdeck-overlay.hbs` UI2 branch — keep the `qd40-frame`, `qd40-chrome-row`, `qd40-body.qd-ui2-body`, and `qd-ui2-shell` branch.
- `scripts/quickdeck-app.js` UI2 overlay code — keep overlay rendering, UI2 carousel actions, UI2 drag handling, token drop, minimize/restore, and `qd40-*` overlay positioning.
- `scripts/dev/quickdeck-art-tuner.js` — keep for now because it is imported/installed by `QuickDeckApp` and exposed through the overlay info popover; however, it needs a future UI2 selector-target cleanup.

### UI2-owned runtime data contracts in templates

Keep the data/action contracts already used by the UI2 branch:

- Roster/actor actions: `open-actor`, `remove-actor`, `add-actor`, `available-search`, `clear-available-search`.
- Drawer actions: `toggle-roster-drawer`, `toggle-actions-drawer`, `set-active-drawer`, `combat-search`, `skills-search`, `spells-search`, and clear-search actions.
- Roll/action helpers: `roll-primary`, `roll-secondary`, `roll-attack`, `roll-damage`, `roll-skill`, `roll-spell`, `roll-defense`, `open-modifier-bucket`, `target-action`, and `pick-pending-damage-target`.
- UI2-specific controls: `ui2-carousel-scroll`, `drop-ui2-carousel-tokens`, UI2 carousel actor IDs, UI2 active/inactive roster rows, and UI2 right drawer tabs.
- Shared references/settings: `open-reference`, PDF source manager controls, dev art tuner controls, minimize/close/info-popover controls.

### UI2-owned/current assets to keep

Keep every asset currently referenced from `styles/quickdeck-command-desk.css`, because this pass found those as runtime CSS dependencies for the current command desk/UI2 skin:

- `assets/ui/dwarven/search-field-frame.webp`
- `assets/ui/dwarven/button/button-square.webp`
- `assets/ui/dwarven/button/button-wide.webp`
- `assets/ui/dwarven/collapse/left-collapse-tab.webp`
- `assets/ui/dwarven/collapse/right-collapse-tab.webp`
- `assets/ui/dwarven/top-tab-button.webp`
- `assets/ui/dwarven/defense-medallion.webp`
- `assets/ui/dwarven/clean-dark-stone-tile.webp`
- `assets/ui/dwarven/scrollbars/qd-scroll-chain-tile-40x64.webp`
- `assets/ui/dwarven/scrollbars/qd-scroll-channel-tile-40x64.webp`
- `assets/ui/dwarven/scrollbars/qd-scroll-chain-in-channel-tile-40x64.webp`
- `assets/ui/dwarven/scrollbars/qd-scroll-top-cap-40x24.webp`
- `assets/ui/dwarven/scrollbars/qd-scroll-bottom-cap-40x24.webp`
- `assets/ui/dwarven/scrollbars/qd-scroll-thumb-stone-40x112.webp`
- `assets/ui/dwarven/section-bars/qd-section-combat-strip.webp`
- `assets/ui/dwarven/section-bars/qd-section-skills-strip.webp`
- `assets/ui/dwarven/section-bars/qd-section-spells-strip.webp`
- `assets/ui/dwarven/active_roster_header_400x58_cover.webp`
- `assets/ui/dwarven/search_actors_header_383x34_cover.webp`
- `assets/Fonts/KhazadDum-0WXEr.ttf`
- `assets/ui/dwarven/left-deadspace-bg.webp`
- `assets/ui/dwarven/popups/reference-scroll-shell.webp`
- `assets/ui/dwarven/popups/reference-wax-close.webp`
- `assets/ui/dwarven/popups/reference-local-override-button.webp`
- `assets/ui/dwarven/center-cockpit/header-dwarven-faces-trimmed.webp`
- `assets/ui/dwarven/center-cockpit/move-plaque-square.webp`
- `assets/ui/dwarven/center-cockpit/move-medallion-round.webp`
- `assets/ui/dwarven/v011/center/header-arch-plate.webp`
- `assets/ui/dwarven/v011/center/move-medallion-ring.webp`
- `assets/ui/dwarven/v011/center/footer-rail.webp`
- `assets/ui/dwarven/v011/center/defense-row-backing.webp`

## 4. UI1-only files likely safe to delete later

Do not delete these in this pass. These are candidates for a later UI1-retirement pass after UI2 is made unconditional and shared styles are migrated.

| Candidate | Classification | Why it appears UI1-only or retirement-bound |
| --- | --- | --- |
| `templates/quickdeck.hbs` | UI1-only app shell | Referenced as `TEMPLATE_PATH` and renders `qd31-shell`; UI2 uses `templates/quickdeck-overlay.hbs`. |
| Legacy `{{else}}` branch in `templates/quickdeck-overlay.hbs` | UI1-only branch | The UI2 branch is guarded by `{{#if isUi2Mode}}`; the fallback branch contains `qd31-*` roster/cockpit/action markup and the UI2 experimental toggle. |
| `SETTING_KEYS.UI_MODE` in `scripts/main.js` and `scripts/quickdeck-app.js` | UI1/UI2 mode plumbing | Retiring UI1 should make UI2 unconditional and remove the user-facing mode setting/branch. |
| `VALID_UI_MODES`, `DEFAULT_UI_MODE = "ui1"`, `isUi1Mode`, `isUi2Mode`, `setUiMode()` | UI1/UI2 mode plumbing | These keep both interfaces alive. Replace with fixed UI2 behavior before deletion. |
| Legacy `.quickdeck-shell`, `.quickdeck-sidebar`, `.quickdeck-main`, `.quickdeck-selected-cockpit`, `.quickdeck-panel`, `.quickdeck-roster-*`, `.quickdeck-available-*`, `.quickdeck-attack-*`, `.quickdeck-skill-*`, `.quickdeck-spell-*` selectors in `styles/quickdeck.css` | UI1-only selector groups | These target the old application shell and old app cards/lists. They should be removed only after shared reference/restore selectors are moved elsewhere. |
| `templates/quickdeck-actions-sidecar.hbs` | Likely UI1-only/unused | No current manifest/script runtime entrypoint found in this pass. |
| `templates/quickdeck-roster-sidecar.hbs` | Likely UI1-only/unused | No current manifest/script runtime entrypoint found in this pass. |
| `dev/dwarven-asset-proof.html` | Development proof page | Useful for art validation but not a runtime module entrypoint. Ask before deleting. |
| README/CHANGELOG text saying UI1 remains default or UI2 is experimental | Documentation cleanup | Update after runtime behavior actually becomes UI2-only. |

## 5. Shared core files that should stay

These files/code paths may carry old names or mixed selectors but are not safe deletion targets just because UI1 is retiring.

| File/code area | Keep because |
| --- | --- |
| `scripts/quickdeck-app.js` | Owns actor/roster extraction, active/available actor lists, GURPS/GGA roll passthrough, defense helpers, damage rolls, pending damage target picker, quick skills, combat/spell favorites, pinned actions, token-drop carousel, minimize/restore, overlay drag/open/close, render data, and reference actions. |
| `scripts/main.js` | Registers settings and launcher hooks; opens the shared `QuickDeckApp`; refreshes open QuickDeck views on actor/combat/modifier-bucket changes. |
| Reference modules: `scripts/reference-app.js`, `scripts/reference-index-app.js`, `scripts/reference-index-store.js`, `scripts/reference-summaries-store.js`, `scripts/reference-lookup-name.js`, `scripts/page-ref-key-names.js`, `scripts/pdf-page-ref-utils.js` | Shared reference/PDF-source functionality reachable from UI2 action rows. |
| `templates/reference.hbs` and `templates/reference-index.hbs` | Shared reference popup/source manager templates. Their `.quickdeck-reference-*` and `.quickdeck-pdf-*` selectors are not UI1 shell selectors. |
| `styles/quickdeck-command-desk.css` | Current command-desk/dwarven skin; owns `qd40-*` frame, shared variables, runtime image URLs, scrollbar art, UI2-adjacent overrides, and reference popup skinning. |
| `styles/quickdeck.css` shared portions | Keep/migrate reference popup/source-manager styles, restore pill/minimized state styles, compatibility/base variables, and launcher button styling before considering file removal. |
| `scripts/dev/quickdeck-art-tuner.js` | Shared developer tooling today; old selector targets should be updated only after UI2 selectors are final. |
| `assets/ui/dwarven/popups/*` | Shared reference popup art, not UI1 shell art. |
| `assets/ui/dwarven/scrollbars/*` | Shared custom scrollbar art used by command-desk CSS. |

## 6. CSS dependencies still blocking UI1 deletion

### Search counts from this pass

| File | `quickdeck-` | `qd-ui2-` | `qd40-` | `qd31-` | `--qd-panel-bg` | `--qd-card-bg` | `--qd-shell-bg` | `url(` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `styles/quickdeck.css` | 706 | 0 | 14 | 47 | 0 | 0 | 0 | 0 |
| `styles/quickdeck-command-desk.css` | 764 | 0 | 1293 | 1527 | 6 | 10 | 7 | 36 |
| `styles/quickdeck-ui2.css` | 18 | 241 | 36 | 0 | 1 | 0 | 0 | 0 |
| `styles/quickdeck-ui2-v23-port.css` | 704 | 2383 | 1467 | 16 | 3 | 10 | 1 | 0 |
| `templates/quickdeck-overlay.hbs` | 2 | 222 | 19 | 298 | 0 | 0 | 0 | 0 |
| `templates/quickdeck.hbs` | 3 | 0 | 0 | 103 | 0 | 0 | 0 | 0 |

### `.quickdeck-*` reference classification

| Selector family | Classification | Retirement action |
| --- | --- | --- |
| `.quickdeck-shell`, `.quickdeck-content`, `.quickdeck-stage`, `.quickdeck-sidebar`, `.quickdeck-main`, `.quickdeck-selected-cockpit`, `.quickdeck-panel`, `.quickdeck-panel-content`, `.quickdeck-panel-scroll-root` | UI1-only | Remove after UI2 no longer loads `templates/quickdeck.hbs` or the overlay UI1 branch. |
| `.quickdeck-roster-*`, `.quickdeck-available-*`, `.quickdeck-actor-*` legacy app rows/buttons | UI1-only | Remove after confirming UI2 roster selectors (`qd-ui2-active-roster-*`, `qd-ui2-inactive-roster-*`) fully cover current behavior. |
| `.quickdeck-attack-*`, `.quickdeck-skill-*`, `.quickdeck-spell-*`, old action-card/list selectors | UI1-only | Remove after confirming UI2 right drawer and favorite sections retain all needed roll/favorite/reference actions. |
| `.quickdeck-reference-*`, `.quickdeck-pdf-*`, `.gurps-quickdeck-reference`, `.gurps-quickdeck-reference-index` | Shared/core | Keep or move to a dedicated reference stylesheet before deleting `styles/quickdeck.css`. |
| `.quickdeck-restore-*`, minimized/restore-pill selectors, `.gurps-quickdeck-minimized` | Shared/core | Keep or migrate; UI2 still has minimize/restore behavior. |
| `.quickdeck-open-button` | Shared/core | Keep launcher styling while the Actor Directory launcher exists. |
| `.gurps-quickdeck` app window selectors | Ambiguous/blocking | Some are legacy application shell rules, but the overlay lifecycle still calls `render(true)` and hides the app host. Remove only after app-host behavior is simplified. |
| `.quickdeck-*` references in `styles/quickdeck-ui2-v23-port.css` | Still used by UI2 and needs decoupling/ambiguous | The file is UI2-owned but contains many old selector names, mostly as compatibility/reference/host overrides. Audit and migrate selector-by-selector before deleting UI1 CSS. |

### `qd-ui2-*`, `qd40-*`, and `qd31-*` classification

| Namespace | Classification | Notes |
| --- | --- | --- |
| `qd-ui2-*` | UI2-owned | Keep. This is the preferred UI2 namespace for the standalone interface. |
| `qd40-*` | Shared/current UI2 frame | Keep. This is the current chromeless command-desk overlay/frame namespace and appears in template, scripts, and CSS. |
| `qd31-*` in `templates/quickdeck.hbs` and the `templates/quickdeck-overlay.hbs` fallback branch | UI1-only | Delete when collapsing to UI2-only. |
| `qd31-*` in `styles/quickdeck-command-desk.css`, `styles/quickdeck.css`, `scripts/quickdeck-app.js`, and `scripts/dev/quickdeck-art-tuner.js` | Ambiguous/blocking | Do not bulk-delete. Some are legacy selectors; some are custom scrollbar/art-tuner targets. Decouple after the UI2 template no longer emits `qd31-*`. |

### Shared variables requiring decoupling

- `--qd-shell-bg` is defined/used in `styles/quickdeck-command-desk.css` and referenced by `styles/quickdeck-ui2-v23-port.css`; keep until UI2 has its own equivalent variable or a dedicated shared variable layer.
- `--qd-panel-bg` is defined/used in `styles/quickdeck-command-desk.css`, referenced once in `styles/quickdeck-ui2.css`, and referenced in `styles/quickdeck-ui2-v23-port.css`; keep or migrate to a UI2-owned variable before deleting command-desk legacy blocks.
- `--qd-card-bg` is defined/used in `styles/quickdeck-command-desk.css` and heavily referenced in `styles/quickdeck-ui2-v23-port.css`; keep or migrate before deleting command-desk variable definitions.

### CSS `url(...)` references requiring asset retention

All 36 CSS `url(...)` references found in this pass are in `styles/quickdeck-command-desk.css`. They include button, collapse tab, scroll bar, section strip, active roster header, search header, reference popup, center cockpit, v011 center, and font assets. Do not move or delete those binary files until the CSS references are updated or removed in a later pass.

One likely typo/ambiguous dependency remains: `styles/quickdeck-command-desk.css` references `url("./assets/ui/dwarven/left-deadspace-bg.webp")`, while the other references use `../assets/...`. Do not change behavior in this pass; verify in the CSS-only decoupling pass.

## 7. JS/HBS dependencies still blocking UI1 deletion

| Dependency | Current state | Why it blocks deletion |
| --- | --- | --- |
| UI mode setting registration | `scripts/main.js` registers `SETTING_KEYS.UI_MODE`; `scripts/quickdeck-app.js` also defines the key and loads it from settings. | UI2 is not unconditional until this setting path is removed or migrated. |
| `DEFAULT_UI_MODE = "ui1"` | Current controller default is UI1. | Existing clients can still open UI1. Flip/migrate before deleting UI1 template/CSS. |
| `VALID_UI_MODES = new Set(["ui1", "ui2"])` | Both modes remain valid. | Remove after UI2 is fixed as the only supported mode. |
| `isUi2Mode`/`isUi1Mode` getters and `uiMode` render data | `getData()` exposes `uiMode`, `isUi1Mode`, and `isUi2Mode` to templates. | Templates still branch on these values. |
| `setUiMode()` and `data-action="set-ui-mode"` | The UI1 settings branch includes the toggle labeled “Enable UI2 Experimental Shell.” | Must be removed when UI mode is no longer user-selectable. |
| `templates/quickdeck-overlay.hbs` branch | UI2 shell is inside `{{#if isUi2Mode}}`; UI1 fallback branch follows. | Collapse to UI2-only before deleting selectors/assets. |
| `templates/quickdeck.hbs` via `TEMPLATE_PATH` | The legacy app template remains configured in `QuickDeckApp`. | Delete only after app host/native `Application` lifecycle is no longer needed. |
| `openQuickDeck()` calls `render(true)` before `renderOverlay()` | Overlay open still creates/uses the Foundry app lifecycle. | Simplify only after testing UI2 overlay opens reliably without the hidden app host. |
| Custom scrollbar candidates include `qd31-*` selectors | `QuickDeckCustomScrollbarManager` targets `qd31-*` scroll bodies as well as later UI2/right-drawer surfaces. | Remove legacy candidates only after the UI2 template and CSS no longer need them. |
| Art tuner targets include `qd31-*` selectors | Dev tuner is active/imported and still targets old command-desk elements. | Update or retire tuner targets after UI2 selector map is finalized. |
| Reference templates use `.quickdeck-reference-*` | These are old-name selectors but shared functionality. | Do not delete with UI1 shell CSS. Move to a reference stylesheet if needed. |

## 8. Binary asset changes needed later, commands only

```bash
git rm assets/Fonts/KhazadDum3D-Eanmg.ttf
git rm assets/Fonts/KhazadDum3DExpanded-WygD9.ttf
git rm assets/Fonts/KhazadDum3DExpandedItalic-eZA7O.ttf
git rm assets/Fonts/KhazadDum3DItalic-ax3KJ.ttf
git rm assets/Fonts/KhazadDumExpanded-ow8eq.ttf
git rm assets/Fonts/KhazadDumExpandedItalic-gxVd3.ttf
git rm assets/Fonts/KhazadDumItalic-4B0xY.ttf
git rm assets/Fonts/MountainKingRegular-woBYn.ttf
git rm assets/ui/dwarven/top-rail.webp
git rm assets/ui/dwarven/bottom-rail.webp
git rm assets/ui/dwarven/left-rail.webp
git rm assets/ui/dwarven/right-rail.webp
git rm assets/ui/dwarven/section-title-plate.webp
git rm assets/ui/dwarven/header/section-title-plate.webp
git rm assets/ui/dwarven/header/knotwork-strip.webp
git rm assets/ui/dwarven/frame/top-rail.webp
git rm assets/ui/dwarven/frame/bottom-rail.webp
git rm assets/ui/dwarven/frame/left-rail.webp
git rm assets/ui/dwarven/frame/right-rail.webp
git rm assets/ui/dwarven/frame/corner-top-left.webp
git rm assets/ui/dwarven/frame/corner-top-right.webp
git rm assets/ui/dwarven/frame/corner-bottom-left.webp
git rm assets/ui/dwarven/frame/corner-bottom-right.webp
```

## 9. Ambiguous items requiring user approval

- **All commands in section 8 require user approval.** They are text-reference candidates only; many are source/proof/future-art assets and may still be intentionally retained.
- **`qd31-*` as a namespace** requires approval/extra verification before removal outside the clearly UI1-only template branches. It appears in command-desk CSS, app scroll code, and dev tuner code.
- **`styles/quickdeck-command-desk.css`** should remain until UI2 has a dedicated shared variable/asset stylesheet. It contains both current UI2-adjacent styling and old selector groups.
- **`styles/quickdeck.css`** should not be removed until `.quickdeck-reference-*`, `.quickdeck-pdf-*`, restore pill, launcher, and app-host lifecycle selectors are migrated or proven unused.
- **`templates/quickdeck-actions-sidecar.hbs` and `templates/quickdeck-roster-sidecar.hbs`** appear unused, but should receive explicit approval before deletion.
- **`dev/dwarven-asset-proof.html`, `docs/asset-list.json`, `docs/asset-manifest.md`, `docs/buttons-tabs-sliced-transparent-*`, `docs/dwarven-ui-asset-map.md`, and `assets/ui/*/README*`** are non-runtime/process or proof artifacts. Ask before deleting because they may be valuable project history or future UI2 art references.
- **README/CHANGELOG cleanup** should wait until behavior changes land. They currently document UI2 as experimental/UI1 as default in places.

## 10. Proposed next pass: CSS-only UI2 decoupling

1. **Create a selector inventory from emitted UI2 markup.** Use the current `templates/quickdeck-overlay.hbs` UI2 branch as the source of truth for `qd-ui2-*` and `qd40-*` selectors.
2. **Move shared variables first.** Define UI2-owned or neutral equivalents for `--qd-shell-bg`, `--qd-panel-bg`, and `--qd-card-bg` in a retained UI2/shared stylesheet before deleting legacy command-desk blocks.
3. **Decouple reference styles.** Move `.quickdeck-reference-*`, `.quickdeck-pdf-*`, and `gurps-quickdeck-reference*` rules from legacy CSS into a dedicated retained reference section/file.
4. **Decouple restore/launcher styles.** Move `.quickdeck-open-button`, minimized/restore-pill, and any required `.gurps-quickdeck` host rules into a retained shared section/file.
5. **Replace UI2-file legacy selectors.** In `styles/quickdeck-ui2-v23-port.css`, audit `.quickdeck-*` and `qd31-*` references; convert current UI2 selectors to `qd-ui2-*`/`qd40-*` equivalents where appropriate.
6. **Retain all CSS `url(...)` assets during decoupling.** Only propose `git rm` after the corresponding CSS references are removed and the user approves asset cleanup.
7. **Do not change runtime behavior in the CSS pass.** Keep selector specificity and visual output stable; no JS/HBS/data-action changes.

## Commands used for this dependency map

- `git status --short`
- `find .. -name AGENTS.md -print`
- `sed -n '1,240p' docs/ui1-ui2-retirement-audit.md`
- `find scripts styles templates docs dev assets -maxdepth 3 -type f | sort`
- `rg -n "ui2|quickdeck|qd-ui2|qd40|--qd-panel-bg|--qd-card-bg|--qd-shell-bg|url\(" docs module.json scripts styles templates dev README* CHANGELOG* assets -S`
- `rg -n "UI_MODE|VALID_UI_MODES|DEFAULT_UI_MODE|isUi1Mode|isUi2Mode|setUiMode|uiMode|quickdeck\.hbs|quickdeck-overlay|quickdeck-ui2|quickdeck-ui2-v23|quickdeck.css|quickdeck-command-desk|renderOverlay|render\(true\)|TEMPLATE_PATH|OVERLAY_TEMPLATE_PATH|data-action|qd-ui2|qd40|qd31|quickdeck-|--qd-panel-bg|--qd-card-bg|--qd-shell-bg|url\(" module.json scripts styles templates dev docs README.md CHANGELOG.md -S`
- `sed -n '1,80p' module.json`
- `rg -n "QuickDeck|quickdeck|renderOverlay|render\(true\)|UI_MODE|openQuickDeck|registerSettings|DEFAULT_UI_MODE|VALID_UI_MODES" scripts/main.js scripts/quickdeck-app.js`
- `sed -n '1,220p' scripts/quickdeck-app.js`
- `rg -n "isUi2Mode|qd-ui2-shell|{{else}}|qd31-shell|data-action=\"set-ui-mode|ui-mode" templates/quickdeck-overlay.hbs templates/quickdeck.hbs`
- `nl -ba templates/quickdeck-overlay.hbs | sed -n '1,180p'`
- `nl -ba templates/quickdeck-overlay.hbs | sed -n '880,920p'`
- `rg -n "uiMode|isUi1Mode|isUi2Mode|setUiMode|DEFAULT_UI_MODE|VALID_UI_MODES|loadPersistedState|getData\(" scripts/quickdeck-app.js`
- `python` count scan for `quickdeck-`, `qd-ui2-`, `qd40-`, `qd31-`, shared variables, and `url(` across styles/templates/scripts.
- `find assets -type f | sort`
- `python` asset-reference scan comparing every file under `assets/` against text references in `module.json`, `scripts`, `styles`, `templates`, `dev`, `docs`, README, and CHANGELOG.
