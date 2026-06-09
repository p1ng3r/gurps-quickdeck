# UI2-only hardening report

## 1. Executive summary

This conservative v0.19.4 pass validated the repository after UI1 retirement with UI2 as the only supported QuickDeck interface. The pass focused on stale UI1-era references, deleted template/asset names, old UI mode wording, `.quickdeck-*` selectors, CSS `url(...)` references, and JS/HBS file-path references.

No roll, action, roster, `data-action`, qd40, or qd-ui2 behavior was changed. No binary files were added, moved, or modified.

## 2. Leftover references found

Searches found no runtime references to the deleted UI1 sidecar templates:

- `templates/quickdeck-actions-sidecar.hbs`
- `templates/quickdeck-roster-sidecar.hbs`

Searches also found no active UI mode setting registration in `scripts/main.js` or `scripts/quickdeck-app.js`. The only remaining mode strings in templates/scripts are attack/weapon mode labels, targeting mode notifications, and other non-UI-mode gameplay text.

Remaining non-historical references reviewed during this pass:

- `.quickdeck-*` selectors remain in shared runtime styles for the overlay host, Foundry launcher/minimize restore controls, reference/local-override windows, and reticles. These are shared/core selectors, not deleted UI1 shell markup.
- `quickdeck-pdf-*` class names remain in the local-reference override template/CSS for compatibility with existing styling. They are naming carryover only; the UI text presents the feature as Local Overrides.
- Historical changelog/report docs still contain UI1, qd8/qd15/qd31, `legacy`, and old shell terms where they describe prior releases or prior validation work.
- Foundry core icon paths such as `icons/svg/mystery-man.svg` and `/icons/svg/target.svg` are not module-local files and were intentionally excluded from missing module asset cleanup.

## 3. Items fixed or removed

- Updated the shared runtime stylesheet header comment to state that UI2 is the only supported interface after UI1 retirement.
- Updated the overlay help/dev popover label from a generic UI mode row to an explicit UI2 command desk interface row.
- Updated the current changelog wording from "UI mode" to "interface status" so current release notes no longer imply a switchable UI mode.
- Updated a stale CSS section comment from "PDF source manager" to "local reference overrides" without changing selectors or behavior.

No code paths, `data-action` attributes, qd40/qd-ui2 runtime selectors, or roll/action/roster handlers were removed.

## 4. Items intentionally kept

- `.quickdeck-*` shared selectors are kept because they style shared launcher, restore, reference, local-override, and reticle surfaces rather than retired UI1 app-shell markup.
- `quickdeck-pdf-*` class names are kept because renaming them would be a broader template/CSS migration with no proven runtime bug; the visible user-facing text already describes Local Overrides.
- qd31/qd40/qd-ui2 classes and metrics code are kept because they are part of the current UI2/qd40 overlay lineage and were explicitly out of scope to remove.
- Historical docs and changelog entries are kept where they accurately describe previous releases, previous audits, or earlier cleanup work.
- Foundry core icon references are kept because they resolve through Foundry, not this module's file tree.
- Ambiguous PDF page-reference mapping methods are kept because they are shared reference/runtime logic and were not proven dead during this conservative pass.

## 5. CSS url / missing file check

A Python check scanned every `url(...)` reference in `styles/*.css`, resolved each module-relative path against the stylesheet location, and found all module CSS asset references present.

The scan covered `.webp` art, scrollbar art, popup art, section bar art, center cockpit art, and font assets referenced from:

- `styles/quickdeck-command-desk.css`
- `styles/quickdeck-ui2.css`
- `styles/quickdeck-ui2-v23-port.css`
- `styles/quickdeck.css`

No missing module-local CSS `url(...)` files were found.

## 6. Validation results

Validation commands for this pass:

- `git diff --check` — passed.
- `node --check scripts/dev/quickdeck-art-tuner.js` — passed.
- `node --check scripts/quickdeck-app.js` — passed.
- `node --check scripts/main.js` — passed.
- `git status --short` — reviewed changed text files only.
- `git diff --stat` — reviewed expected small text-only diff.

Additional hardening checks performed:

- `rg -n "UI1|ui1|legacy|ui mode|UI mode|quickdeck-actions-sidecar|quickdeck-roster-sidecar|quickdeck-shell|quickdeck-content|quickdeck-stage" README.md CHANGELOG.md docs scripts templates styles module.json --glob '!docs/ui1-*' --glob '!docs/post-ui1-*' --glob '!docs/ui2-*'`
- `rg -n "\.quickdeck-" scripts templates styles README.md CHANGELOG.md docs --glob '!docs/ui1-*' --glob '!docs/post-ui1-*' --glob '!docs/ui2-*'`
- Python CSS `url(...)` resolver for `styles/*.css`
- Python JS/HBS path-string resolver for module-local `.hbs`, `.css`, `.js`, `.webp`, `.png`, `.jpg`, `.svg`, and `.json` strings

## 7. Manual Foundry QA checklist

Use this checklist in Foundry VTT v13 with the GURPS 4e Game Aid system enabled:

1. Open QuickDeck from the Actor Directory launcher.
2. Confirm the overlay opens directly into the UI2 command desk with no UI chooser or UI1 shell.
3. Open the help/dev popover and confirm it reports the UI2 command desk interface.
4. Add actors to the roster by clicking from Available Actors and by dragging from the Actor Directory.
5. Select roster actors and confirm actor portrait/name/type, HP/FP, Move, Dodge, Parry, and Block still render.
6. Open/collapse the left roster drawer and right action drawer; confirm edge tabs, hover unclip behavior, and drawer scroll behavior remain intact.
7. Use Combat, Skills, Quick Skills, and Spells search/pin controls and confirm existing actions still route through native GURPS behavior where available.
8. Test Target Opponent and Drop Token flows, including cancel/restore cleanup.
9. Open QuickDeck Reference and Local Overrides; confirm reference popup styling and local metadata editing still work.
10. Minimize and restore QuickDeck; confirm the restore pill remains available and draggable.
