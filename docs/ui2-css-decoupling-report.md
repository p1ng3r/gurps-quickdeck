# UI2 CSS Decoupling Report — v0.19.1b

## 1. Executive summary

This pass performed CSS-only decoupling for UI2 before UI1 deletion. No UI1 templates, UI2 templates, JavaScript, data actions, roll logic, roster logic, binary assets, or broad legacy CSS blocks were changed.

The main change is that UI2 now owns a scoped alias layer for the shared `--qd-*` visual tokens it previously consumed directly. Current command-desk values still feed those aliases while the legacy stylesheets remain loaded, but UI2 rules now reference `--qd-ui2-*` tokens with hard CSS fallbacks so the UI2 stylesheet can survive a later UI1 selector cleanup.

A small set of center-roll polish selectors in the UI2 v23 port were also given `qd-ui2-*` selector coverage alongside the currently emitted legacy `qd31-*` helper classes. The legacy selectors were intentionally left in place because the current template still emits them.

## 2. CSS dependencies decoupled

- Replaced direct UI2 use of shared text, title-font, UI-font, brass, muted-text, and panel-background variables in `styles/quickdeck-ui2.css` with UI2-owned aliases such as `--qd-ui2-text`, `--qd-ui2-font-title`, and `--qd-ui2-panel-bg`.
- Replaced the v23 right-drawer surface dependency on direct `--qd-panel-bg` / `--qd-card-bg` usage with `--qd-ui2-panel-bg` / `--qd-ui2-card-bg` and literal CSS fallbacks.
- Added `qd-ui2-roll-pill` selector coverage to the v23 center roll dice button polish so that the styling no longer requires the legacy-looking `qd31-primary-roll-chip` / `qd31-secondary-roll-chip` classes once markup is migrated in a later non-CSS pass.

## 3. UI2-owned aliases/fallbacks added

The following aliases were added under the UI2/qD40 overlay scope:

- `--qd-ui2-text`
- `--qd-ui2-text-strong`
- `--qd-ui2-text-muted`
- `--qd-ui2-brass-bright`
- `--qd-ui2-font-title`
- `--qd-ui2-font-ui`
- `--qd-ui2-shell-bg`
- `--qd-ui2-panel-bg`
- `--qd-ui2-card-bg`

Each alias maps to the current shared `--qd-*` token first, preserving the current visual output while `styles/quickdeck-command-desk.css` remains loaded, and includes a CSS-only fallback for later UI1 deletion work.

## 4. `.quickdeck-*` references still remaining

No `.quickdeck-*` selectors were added or removed in this CSS-only pass. Remaining `.quickdeck-*` selector counts from a text scan are:

| File | Remaining `.quickdeck-*` selector references | Notes |
| --- | ---: | --- |
| `styles/quickdeck-ui2.css` | 0 | UI2 base stylesheet has no `.quickdeck-*` class selectors. |
| `styles/quickdeck-ui2-v23-port.css` | 0 | The file still contains `#gurps-quickdeck-overlay` ID selectors, but no `.quickdeck-*` class selectors. |
| `styles/quickdeck-command-desk.css` | 48 | Left untouched; this mixed skin remains shared/ambiguous until UI1 deletion. |
| `styles/quickdeck.css` | 627 | Left untouched; includes legacy app shell plus shared reference/launcher styles identified by the dependency map. |

## 5. Items intentionally left for UI1 deletion pass

- UI1 template branches and all Handlebars markup were left unchanged.
- `qd31-*` template classes were left unchanged because this pass was CSS-only. UI2 v23 CSS now has `qd-ui2-roll-pill` fallback coverage for the center-roll polish, but the legacy `qd31-*` selectors remain until a markup migration pass.
- Legacy `.quickdeck-*` blocks in `styles/quickdeck.css` and `styles/quickdeck-command-desk.css` were not deleted. The dependency map flags these files as mixed and identifies reference, launcher, restore, and qd40/qd31 skin styles that need selector-level migration rather than broad removal.
- UI mode settings, UI1 defaults, app shell lifecycle, JS scrollbar candidates, data actions, and runtime logic remain unchanged for the later UI1 deletion/migration pass.
- Binary asset cleanup was intentionally not attempted.

## 6. Validation results

Validation completed after the CSS/doc changes:

- PASS: `git diff --check`
- PASS: `node --check scripts/dev/quickdeck-art-tuner.js`
- PASS: `node --check scripts/quickdeck-app.js`
- PASS: `node --check scripts/main.js`
- PASS: `git status --short`
- PASS: `git diff --stat`

No binary files were changed.
