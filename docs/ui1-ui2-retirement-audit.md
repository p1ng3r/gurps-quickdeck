# UI1 / UI2 Retirement Audit for v0.19.0

Inventory pass only. No runtime JavaScript, template behavior, `data-action` hooks, roll logic, roster logic, or UI styles were changed in this pass.

## 1. Executive summary

- **UI1 can likely be retired cleanly, but not by deleting whole files blindly.** The repo now has a clear UI-mode boundary: `QuickDeckApp` still supports `ui1` and `ui2`, defaults to `ui1`, and renders both branches from the same overlay template. Retiring UI1 should primarily remove the UI-mode setting/branching, the legacy Foundry `Application` shell template, and legacy `.quickdeck-*` CSS blocks.
- **Likely risk level: medium.** UI1 itself appears separable, but UI2 still shares data preparation, action handlers, app open/minimize plumbing, reference apps, settings, and several visual variables/assets. The highest-risk deletion areas are mixed CSS files (`styles/quickdeck.css`, `styles/quickdeck-command-desk.css`) and mixed templates (`templates/quickdeck-overlay.hbs`).
- **Unclear boundaries remain.** The `qd31-*` namespace appears to predate UI2 but is still actively used inside the current overlay, art tuner, and command-desk CSS. Treat `qd31-*` as **shared/ambiguous**, not automatically UI1-only. Several assets and docs are development/proof artifacts with no direct runtime references; they should receive user approval before deletion.
- **No dead clutter was deleted in this pass.** Searches for `.bak`, `.tmp`, ZIPs, patch rejects, and similar temporary files found no safe temporary clutter.

## 2. UI1-only candidates

These items appear UI1-only or UI1-retirement candidates. Do not delete them until the actual v0.19.1 retirement pass.

| Item | Evidence and reference check | Safe to delete next pass? |
| --- | --- | --- |
| `templates/quickdeck.hbs` | This is the Foundry `Application` template configured as `TEMPLATE_PATH` in `scripts/quickdeck-app.js`. It renders a standalone `qd31-shell` with roster, center cockpit, and action drawers. The overlay path uses `templates/quickdeck-overlay.hbs`; UI2 is rendered there under `{{#if isUi2Mode}}`. Search performed: `rg -n "quickdeck.hbs|TEMPLATE_PATH|template:" scripts templates module.json`. | **Likely yes**, after `QuickDeckApp.defaultOptions.template`, native app-shell render calls, and hidden host behavior are removed or simplified for UI2-only overlay rendering. |
| UI mode setting and mode switch plumbing: `SETTING_KEYS.UI_MODE`, `VALID_UI_MODES`, `DEFAULT_UI_MODE = "ui1"`, `loadPersistedState()` UI mode load, `isUi1Mode`, `isUi2Mode`, `setUiMode()` | `scripts/main.js` and `scripts/quickdeck-app.js` both define `UI_MODE`; `scripts/quickdeck-app.js` allows `ui1` and `ui2`, defaults to `ui1`, persists the setting, and exposes `isUi1Mode`/`isUi2Mode` to templates. Search performed: `rg -n "UI_MODE|VALID_UI_MODES|DEFAULT_UI_MODE|isUi1Mode|isUi2Mode|setUiMode|uiMode" scripts templates`. | **Yes, with code edits**, replacing branch checks with UI2-only behavior and preserving any settings unrelated to UI choice. |
| UI1 branch inside `templates/quickdeck-overlay.hbs` | The overlay body renders the UI2 shell only when `isUi2Mode` is true, then falls through to a large `{{else}}` branch containing legacy `qd31-*` roster/cockpit/action markup. Search performed: `rg -n "isUi2Mode|qd-ui2-shell|{{else}}|qd31-shell|qd31-left-drawer|qd31-right-drawer" templates/quickdeck-overlay.hbs`. | **Yes**, delete the non-UI2 branch only after confirming all wanted qd31 center widgets are represented in the UI2 branch. |
| Legacy `.quickdeck-*` application CSS in `styles/quickdeck.css` | `styles/quickdeck.css` starts with `.gurps-quickdeck` window styling and many `.quickdeck-*` selectors for the original application shell, roster, panels, attack rows, references, restore pill, and later compatibility overrides. Counts found: 706 `quickdeck-` occurrences and 47 `qd31-` occurrences in this file. Search performed: `python` text-count scan plus `rg -n "\.quickdeck-|\.gurps-quickdeck|quickdeck-shell|quickdeck-sidebar|quickdeck-main" styles/quickdeck.css`. | **Partially.** The pure app-shell/legacy `.quickdeck-*` blocks are likely removable, but reference popup and restore/minimize selectors may still be shared. Split by selector before deleting. |
| Legacy `.quickdeck-*` overlays in `styles/quickdeck-command-desk.css` | This file is loaded for the current command-desk skin and contains many `qd40`, `qd31`, and `quickdeck-*` selectors. Its header says it layers over `styles/quickdeck.css` and the `qd40 / qd31 overlay template`. Counts found: 764 `quickdeck-`, 1527 `qd31-`, and 1293 `qd40-` occurrences. Search performed: `python` count scan and `rg -n "quickdeck-|qd31-|qd40-|--qd-panel-bg|--qd-card-bg|--qd-shell-bg" styles/quickdeck-command-desk.css`. | **Selector-level only.** Do not delete the whole file; it defines shared CSS variables and currently used UI2/dwarven assets. Remove only verified UI1/app-shell blocks. |
| Old README/CHANGELOG statements that UI1 is default or preserved | README says UI2 is experimental and UI1 remains default. CHANGELOG repeatedly documents preserving UI1 default behavior. Search performed: `rg -n "UI1|UI2|default behavior|experimental UI2|keeping UI1" README.md CHANGELOG.md docs`. | **Yes**, update in a documentation pass after UI2-only behavior lands. |
| UI1 launcher/native window shell behavior | `openQuickDeck()` still calls `render(true)` before `renderOverlay()`, and `QuickDeckApp` still has app-host show/hide methods around the overlay. Search performed: `rg -n "render\(true\)|renderOverlay|hideApplicationShellForOverlay|showApplicationShellIfNeeded|getApplicationHostElement" scripts/main.js scripts/quickdeck-app.js`. | **Likely yes**, but only after verifying Foundry still creates any required app lifecycle hooks for UI2-only overlay operation. |

## 3. UI2-only confirmed

Keep these items for UI2.

- `templates/quickdeck-overlay.hbs` **UI2 branch**: the `qd40-frame`, `qd40-body`, `qd-ui2-shell`, `qd-ui2-left-drawer`, `qd-ui2-center-cockpit`, and `qd-ui2-right-drawer` markup is the current UI2 overlay structure. Search performed: `rg -n "qd40-frame|qd-ui2-shell|qd-ui2-left-drawer|qd-ui2-center-cockpit|qd-ui2-right-drawer" templates/quickdeck-overlay.hbs`.
- `styles/quickdeck-ui2.css`: contains focused `qd-ui2-*` rules for UI2 body, shell, drawer widths, active/inactive roster, center actor card, carousel, right drawer, and UI2 controls. Search performed: `rg -n "qd-ui2-|qd40-overlay" styles/quickdeck-ui2.css`.
- `styles/quickdeck-ui2-v23-port.css`: large UI2 v23/fit/drag stylesheet with thousands of `qd-ui2-*` and `qd40-*` selectors, including current drag-performance guard `.qd40-ui2-dragging-cheap`. Search performed: `rg -n "qd-ui2-|qd40-ui2-dragging-cheap|v0.18.1 UI2 drag" styles/quickdeck-ui2-v23-port.css`.
- UI2 overlay drag/carousel/drop/pending-damage helpers in `scripts/quickdeck-app.js`: UI2-specific class names include `.qd-ui2-shell`, `qd40-ui2-dragging-cheap`, `qd-ui2-mass-drop-reticle`, and `qd-ui2-pending-damage-*`. Search performed: `rg -n "qd-ui2-shell|qd40-ui2-dragging-cheap|qd-ui2-mass-drop-reticle|qd-ui2-pending-damage" scripts/quickdeck-app.js`.
- Current dwarven command-desk assets directly referenced by UI2 CSS in `styles/quickdeck-command-desk.css`, including `clean-dark-stone-tile.webp`, `top-tab-button.webp`, `left-collapse-tab.webp`, `right-collapse-tab.webp`, `button-wide.webp`, `button-square.webp`, `defense-medallion.webp`, `search-field-frame.webp`, `active_roster_header_400x58_cover.webp`, section bars, custom scrollbars, popup art, center-cockpit art, and v011 center art. Search performed: asset-name text reference scan across `scripts`, `styles`, `templates`, `dev`, `docs`, README, and CHANGELOG.
- `scripts/dev/quickdeck-art-tuner.js`: still active because `QuickDeckApp` imports and installs it, and the overlay info popover toggles the `devArtTunerEnabled` setting. It currently targets many `qd31-*` command-desk elements, so it should stay until UI2 art tuning no longer needs those targets.

## 4. Shared / do not delete

These items are shared or still needed by UI2 even when they contain old names, comments, or mixed selector namespaces.

- `scripts/quickdeck-app.js`: shared app controller for actor roster extraction, GURPS/GGA roll/action passthrough, pinned actions, quick skills, combat/spell favorites, reference lookup, pending damage, token drop, minimize/restore, overlay rendering, UI2 drag, and settings. UI1 removal should be surgical.
- `scripts/main.js`: shared module initialization, settings registration, actor directory launcher, render refresh hooks, pending damage chat capture, and debug open helpers.
- `templates/quickdeck-overlay.hbs`: shared file today; keep the UI2 branch and remove only the UI1 branch in the retirement pass.
- `styles/quickdeck-command-desk.css`: shared/current skin file. It defines `--qd-shell-bg`, `--qd-panel-bg`, and `--qd-card-bg`, and provides many currently used qd40/qd-ui2/dwarven-image rules.
- `styles/quickdeck.css`: mixed. Some legacy UI1 app-shell CSS can likely go, but reference popup styles, restore/minimize styles, and compatibility/base variables must be checked before selector-level removal.
- Reference modules and templates: `scripts/reference-app.js`, `scripts/reference-index-app.js`, `scripts/reference-index-store.js`, `scripts/reference-summaries-store.js`, `scripts/reference-lookup-name.js`, `scripts/page-ref-key-names.js`, `scripts/pdf-page-ref-utils.js`, `templates/reference.hbs`, `templates/reference-index.hbs`, and `data/*.json` reference packs. These are independent of the UI1/UI2 visual shell and still reachable from UI2 action rows.
- Roster/action sidecar templates: `templates/quickdeck-roster-sidecar.hbs` and `templates/quickdeck-actions-sidecar.hbs` are not referenced by direct string search from runtime code, but their names and markup suggest historical/possible dev use. Treat as ambiguous until confirmed by the user or Foundry template loading behavior.
- Shared module metadata: `module.json` still loads all CSS files; do not remove a stylesheet entry until its retained selectors are migrated or deleted intentionally.
- Dwarven assets with runtime CSS references in `styles/quickdeck-command-desk.css` are shared/current and must not be removed in this audit pass.

## 5. Dead clutter safe to delete now

No safe temporary clutter was found or deleted.

Checks performed:

- `find . \( -name '.git' -o -name 'node_modules' \) -prune -o \( -name '*.bak' -o -name '*.tmp' -o -name '*.zip' -o -name '*~' -o -name '*.orig' -o -name '*.rej' \) -print`
- `rg --files | rg '(^|/)(patch|tmp|temp|proof|backup|bak)|\.bak$|\.tmp$|\.zip$|\.orig$|\.rej$'`

The second check surfaced `dev/dwarven-asset-proof.html` because of `proof` in the filename, but this is a real proof/dev artifact rather than a temporary backup file, so it was not deleted.

## 6. Ambiguous / needs user approval

- `qd31-*` selectors/classes overall. Although `qd31` appears older than UI2 and is heavily used in the non-UI2 branch, it is also present in the current overlay template, command-desk CSS, and art tuner. Do not classify all `qd31-*` as UI1-only.
- `templates/quickdeck-roster-sidecar.hbs` and `templates/quickdeck-actions-sidecar.hbs`. Direct string search did not find runtime references, but they may be historical partials or planned sidecars. Ask before deleting.
- `dev/dwarven-asset-proof.html`. It is a proof page, not runtime code. It references many dwarven assets and may still be useful for visual QA. Ask before deleting.
- `design/` source/reference art files. These are not in `module.json` runtime paths and appear to be source/reference material, but they may be important for future UI2 art work. Ask before deleting.
- `docs/asset-list.json`, `docs/asset-manifest.md`, `docs/dwarven-ui-asset-map.md`, `docs/buttons-tabs-sliced-transparent-*`, and `docs/v0.7-art-command-desk-roadmap.md`. These are documentation/provenance files, not runtime code; ask before pruning old roadmap/proof docs.
- Unreferenced font files in `assets/Fonts/`. Only `KhazadDum-0WXEr.ttf` was directly referenced by text search. The other font files have no direct text references, but they may be intentionally bundled alternatives or future UI2 typography assets. Ask before deleting.
- Dwarven assets with no direct text reference, such as `assets/ui/dwarven/batch-1-manifest.json` and `assets/ui/dwarven/README-batch-1.txt`, plus frame/header source variants referenced only by docs/proof files. Ask before deleting.
- `ui2-css-cleanup-audit.md` at repo root and `codex-prompts/`. These are process artifacts rather than runtime module files, but may be intentionally retained project history. Ask before deleting.

## 7. Proposed deletion plan for v0.19.1

Recommended order for the actual UI1 retirement pass:

1. **Flip to UI2-only behavior first.** Replace `DEFAULT_UI_MODE = "ui1"` and the `VALID_UI_MODES`/`UI_MODE` setting path with fixed UI2 behavior, or migrate the setting so existing clients no longer open UI1.
2. **Remove UI mode UI/data branches.** Delete `isUi1Mode`, `isUi2Mode`, and `setUiMode()` only after replacing template checks with unconditional UI2 rendering. Remove `uiMode`, `isUi1Mode`, and `isUi2Mode` from `getData()` once templates no longer consume them.
3. **Collapse `templates/quickdeck-overlay.hbs` to UI2.** Keep `qd40-frame` and the `qd-ui2-shell` branch. Remove the legacy `{{else}}` branch containing the old roster/cockpit/action drawer markup.
4. **Remove the old app-shell template.** Delete `templates/quickdeck.hbs` after `QuickDeckApp.defaultOptions.template` and `openQuickDeck()` no longer require rendering the hidden Foundry Application window.
5. **Simplify overlay opening.** Remove or reduce `render(true)`/hidden host shell code if UI2 overlay can render directly and Foundry lifecycle remains stable.
6. **Prune CSS by selector group, not by file at first.**
   - Remove `.quickdeck-shell`, `.quickdeck-sidebar`, `.quickdeck-main`, `.quickdeck-selected-cockpit`, `.quickdeck-panel`, old `.quickdeck-roster-*`, `.quickdeck-available-*`, `.quickdeck-attack-*`, `.quickdeck-skill-*`, and legacy app-window-only blocks from `styles/quickdeck.css`.
   - Keep or migrate reference popup styles, restore pill styles, and any shared variables still used by UI2.
   - In `styles/quickdeck-command-desk.css`, remove only verified UI1/app-branch selectors. Keep qd40/qd-ui2 rules, `--qd-shell-bg`, `--qd-panel-bg`, `--qd-card-bg`, and all runtime-referenced dwarven assets.
7. **Update metadata/docs.** Remove `styles/quickdeck.css` from `module.json` only if all retained shared styles have been migrated. Update README and CHANGELOG text that says UI1 is default or UI2 is experimental.
8. **Then run a deletion approval pass for ambiguous dev/source assets.** Present the user with a list covering `dev/dwarven-asset-proof.html`, `design/`, unreferenced fonts, sidecar templates, old audit/prompt docs, and docs/proof manifests.

## Search/reference commands used for this audit

- `rg -n "quickdeck-|qd-ui2-|qd40-|--qd-panel-bg|--qd-card-bg|--qd-shell-bg|ui2|UI2|UI1|data-action|quickdeck-overlay|quickdeck.hbs|renderTemplate|template" module.json scripts styles templates assets dev docs README.md CHANGELOG.md`
- `rg -n "uiMode|quickdeck\.hbs|quickdeck-overlay|quickdeck-roster|quickdeck-actions|qd-ui2|qd40|quickdeck-shell|quickdeck-stage|quickdeck-app|Application|renderOverlay|template|activateListeners" scripts/main.js scripts/quickdeck-app.js templates/*.hbs styles/*.css module.json`
- `rg -n -- "--qd-panel-bg|--qd-card-bg|--qd-shell-bg" styles templates scripts docs README.md CHANGELOG.md`
- `python` text-count scan for `quickdeck-`, `qd31-`, `qd40-`, and `qd-ui2-` occurrences across the repo.
- `python` asset-reference scan comparing every file under `assets/` against text references in `module.json`, `scripts`, `styles`, `templates`, `dev`, `docs`, README, and CHANGELOG.
- Temporary clutter checks listed in section 5.
