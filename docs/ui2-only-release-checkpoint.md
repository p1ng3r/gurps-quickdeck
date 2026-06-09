# UI2-only release checkpoint

## 1. Executive summary

This v0.19.5 checkpoint confirms GURPS QuickDeck is ready to continue as a UI2-only module after UI1 retirement. The pass reviewed README, CHANGELOG, `module.json`, docs, scripts, styles, and templates for stale UI1 support wording, deleted UI1 template references, manifest path drift, `.quickdeck-*` carryovers, and CSS `url(...)` asset resolution.

No JavaScript behavior, Handlebars behavior, CSS layout/visual styling, `data-action` values, roll/action/roster/pending-damage behavior, or binary files were changed. The only repository changes in this pass are release-checkpoint documentation and changelog wording.

## 2. UI2-only status confirmation

- README currently describes QuickDeck as using the UI2 shell as the only supported interface.
- The active runtime no longer exposes a UI chooser or UI mode setting names such as `UI_MODE`, `DEFAULT_UI_MODE`, `VALID_UI_MODES`, `uiMode`, `setUiMode`, or `set-ui-mode`.
- The active template entrypoint remains `templates/quickdeck-overlay.hbs`, with `templates/quickdeck-host.hbs` providing the overlay host and reference templates remaining separate popup/local-override surfaces.
- `qd-ui2-*` and `qd40-*` references remain part of the current UI2 command-desk lineage, not alternate UI support.

## 3. README/CHANGELOG/module.json review

- `README.md` was reviewed and already presents UI2 as the only supported interface in the current “What’s New” summary.
- `CHANGELOG.md` was updated with this v0.19.5 checkpoint entry so current release notes explicitly record the UI2-only release-readiness validation.
- `module.json` still points to the expected active entrypoints:
  - ES module: `scripts/main.js`
  - Stylesheets: `styles/quickdeck.css`, `styles/quickdeck-command-desk.css`, `styles/quickdeck-ui2.css`, and `styles/quickdeck-ui2-v23-port.css`
- A manifest/module-local path check confirmed the manifest paths and JS template paths exist.

## 4. Remaining legacy references and why they are safe

Remaining `.quickdeck-*` references are intentionally retained because they are shared/core/runtime selectors and strings rather than live UI1 shell support:

- `templates/quickdeck-host.hbs` uses `quickdeck-overlay-host` for the Foundry overlay host.
- `templates/reference.hbs` and `templates/reference-index.hbs` use `quickdeck-reference-*` and `quickdeck-pdf-*` class names for the current reference/local-override popups.
- `scripts/main.js` uses `quickdeck-open-button` and overlay-host IDs for the Actor Directory launcher and overlay management.
- `scripts/quickdeck-app.js` retains shared runtime strings for reference apps, fallback controls, pending-damage/targeting/reticle flows, and compatibility behavior.
- `styles/quickdeck.css` retains shared runtime styles for launcher, restore/minimize, reference/local-override, targeting, and reticle surfaces.
- `styles/quickdeck-command-desk.css`, `styles/quickdeck-ui2.css`, and `styles/quickdeck-ui2-v23-port.css` retain current qd40/UI2 styling, shared token aliases, compatibility selectors, and reference popup skinning.

Historical changelog/report references to UI1, qd8/qd15/qd31, legacy shells, or deleted templates remain safe where they document prior releases and prior validation work rather than current support.

## 5. Deleted UI1 reference search

A deleted-UI1 search over active files found no non-historical runtime references to:

- `templates/quickdeck.hbs`
- `templates/quickdeck-actions-sidecar.hbs`
- `templates/quickdeck-roster-sidecar.hbs`
- `qd30-sidecar`
- `set-ui-mode`
- `UI_MODE`
- `DEFAULT_UI_MODE`
- `VALID_UI_MODES`
- `isUi1Mode`
- `isUi2Mode`
- `setUiMode`
- `uiMode`

The only current non-historical match for UI1 wording is the `styles/quickdeck.css` header comment stating the stylesheet is shared runtime styling after UI1 retirement. One older `CHANGELOG.md` entry still mentions legacy `quickdeck-shell`, `quickdeck-content`, and `quickdeck-stage` sizing as historical release history; it does not state that UI1 is currently supported.

## 6. CSS url / missing asset check

A Python resolver scanned every `url(...)` reference in `styles/*.css`, ignored data/HTTP URLs and Foundry absolute paths, resolved module-relative paths from each stylesheet location, and confirmed all referenced module-local files exist.

The scan covered 36 module-local CSS URL references, including dwarven UI art, scrollbar art, section bars, popup art, center cockpit art, deadspace backgrounds, and the `KhazadDum-0WXEr.ttf` font.

Result: no missing module-local CSS `url(...)` assets were found.

## 7. Validation results

Required validation commands:

- `git diff --check` — passed.
- `node --check scripts/dev/quickdeck-art-tuner.js` — passed.
- `node --check scripts/quickdeck-app.js` — passed.
- `node --check scripts/main.js` — passed.
- `git status --short` — reviewed; only text documentation/changelog changes were present before commit.
- `git diff --stat` — reviewed; diff was limited to the checkpoint report and changelog update.

Additional checkpoint checks performed:

- `rg -n "UI1|ui1|UI 1|ui 1|uiMode|UI_MODE|DEFAULT_UI_MODE|VALID_UI_MODES|isUi1Mode|isUi2Mode|setUiMode|set-ui-mode|quickdeck\.hbs|quickdeck-actions-sidecar|quickdeck-roster-sidecar|quickdeck-shell|quickdeck-content|quickdeck-stage" README.md CHANGELOG.md module.json docs scripts styles templates --glob '!docs/ui1-*' --glob '!docs/post-ui1-*' --glob '!docs/ui2-css-decoupling-report.md' --glob '!docs/ui2-js-hbs-decoupling-report.md' --glob '!docs/ui2-standalone-dependency-map.md' --glob '!docs/ui2-only-hardening-report.md'`
- Python manifest/module-local path existence check for `module.json` `esmodules`/`styles` and JS `modules/gurps-quickdeck/...` template references.
- Python `.quickdeck-*` occurrence summary across `scripts`, `templates`, and `styles`.
- Python CSS `url(...)` resolver over `styles/*.css`.

## 8. Manual Foundry QA checklist

Use Foundry VTT v13 with the GURPS 4e Game Aid system enabled:

1. Launch a world with GURPS QuickDeck enabled and confirm no startup console errors.
2. Open QuickDeck from the Actor Directory launcher.
3. Confirm QuickDeck opens directly into the UI2 command desk with no UI chooser and no UI1 shell.
4. Confirm the help/info popover reports the UI2 command desk interface/status.
5. Add actors from Available Actors and by dragging from the Actor Directory.
6. Select roster actors and confirm portrait, name/type, HP/FP, Move, Dodge, Parry, and Block render correctly.
7. Open and collapse the left roster drawer and right action drawer.
8. Verify carousel selection/hover behavior and right-drawer row hover behavior remain intact.
9. Use Combat, Skills, Quick Skills, and Spells search/pin controls.
10. Roll attacks, damage follow-ups, skills, spells, Dodge, Parry, and Block through normal native GURPS/GGA routing.
11. Exercise targeting, Drop Token, pending damage, minimize/restore, and reference/local-override popups.
12. Watch the browser console/network panel for missing template, stylesheet, image, font, or CSS asset errors.

## 9. Recommended next development branch

Recommended next branch: `codex/v0.20.0-ui2-release-followups`.

Suggested scope for the next branch is small UI2-only follow-up work discovered during real Foundry QA, such as documentation corrections, verified console-warning fixes, or narrowly scoped UI2 runtime defects. Avoid reintroducing UI mode branching or broad legacy cleanup unless a dedicated audit proves the target is safe.
