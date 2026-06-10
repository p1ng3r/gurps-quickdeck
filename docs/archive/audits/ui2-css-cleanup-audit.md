# UI2 CSS duplicate/superseded-rule audit

> Post-retirement note: UI2 is now the only supported QuickDeck interface. This older cleanup audit is retained as historical cascade evidence; rows that referenced the former interface now describe the same files as shared/current skin layers.

Date: 2026-06-05  
Branch observed: `work` from `git branch --show-current` (user requested `codex/v0.16.9-ui2-css-cleanup-audit`).  
Scope: report-only. No CSS, JS, HBS, or manifest files were edited.

## A. Summary

- `module.json` loads CSS in this order: `quickdeck.css`, `quickdeck-command-desk.css`, `quickdeck-ui2.css`, then the final active override layer `quickdeck-ui2-v23-port.css`.
- `styles/quickdeck-ui2-v23-port.css` is a patch-stack file with many intentional partial overrides. I found **307 repeated selector entries** when comma-separated selectors are counted individually.
- The clearest safe-remove candidates are earlier **same-selector, same-property custom-property overrides** that are fully replaced later in the file, especially the shell `--qd-ui2-body-h` state blocks at lines 422-437 and 518-534 superseded by lines 1050-1065.
- The strongest performance-risk candidates are legacy hover enlargement blocks for roster rows and action rows around lines 2557-2616 and 2938-3000; these directly violate the safety rule against animating/changing row height/width/min-height/min-width/transform.
- I found six class names in `quickdeck-ui2-v23-port.css` that were not present in the requested template/script usage set: `has-pending-damage`, `is-apply-damage`, `qd-ui2-pending-damage-card`, `qd-ui2-pending-damage-controls`, `qd-ui2-pending-damage-kicker`, and `qd-ui2-pending-damage-main`. These are **dead candidates only** because popup markup may be generated dynamically outside simple class-string checks or by future/legacy branches.

## B. Safe-remove candidates

> Safe here means “safe to consider in a future CSS-only patch after visual smoke testing,” not removed by this audit.

| File | Lines | Selector/rule | Properties in each occurrence | Reason | Risk | Recommended action |
|---|---:|---|---|---|---|---|
| `styles/quickdeck-ui2-v23-port.css` | 422-425, 518-521, 1050-1053 | `.qd-ui2-shell:not(.qd-ui2-left-open):not(.qd-ui2-right-open)` | 422-425: `--qd-ui2-body-h: min(580px, calc(100vh - 132px))`; 518-521: `--qd-ui2-body-h: min(510px, calc(100vh - 148px))`; 1050-1053: `--qd-ui2-body-h: min(660px, calc(100vh - 116px))` | Later same-selector block replaces the only property set by the two earlier blocks. The base state width/custom center sizing at lines 66-70 is separate and should stay. | SAFE | In a later CSS cleanup patch, remove the earlier `--qd-ui2-body-h` blocks at 422-425 and 518-521 only. |
| `styles/quickdeck-ui2-v23-port.css` | 427-432, 523-528, 1055-1060 | `.qd-ui2-shell.qd-ui2-left-open:not(.qd-ui2-right-open)` and `.qd-ui2-shell:not(.qd-ui2-left-open).qd-ui2-right-open` | 427-432: `--qd-ui2-body-h: min(610px, calc(100vh - 128px))`; 523-528: `--qd-ui2-body-h: min(560px, calc(100vh - 140px))`; 1055-1060: `--qd-ui2-body-h: min(690px, calc(100vh - 108px))` | Later same-selector block replaces the only property set by the two earlier blocks. The open-state width blocks at 72-82 are separate and should stay. | SAFE | In a later CSS cleanup patch, remove the earlier height-variable-only blocks at 427-432 and 523-528. |
| `styles/quickdeck-ui2-v23-port.css` | 434-437, 530-534, 1062-1065 | `.qd-ui2-shell.qd-ui2-left-open.qd-ui2-right-open` | 434-437: `--qd-ui2-body-h: min(640px, calc(100vh - 122px))`; 530-534: `--qd-ui2-body-h: min(610px, calc(100vh - 128px))`; 1062-1065: `--qd-ui2-body-h: min(700px, calc(100vh - 104px))` | Later same-selector block replaces the only property set by the two earlier blocks. The three-panel width/custom center block at 84-88 is separate and should stay. | SAFE | In a later CSS cleanup patch, remove only the earlier body-height variable blocks. |
| `styles/quickdeck-ui2-v23-port.css` | 459-464 vs 39-64 | `.qd-ui2-shell` tab custom properties | 39-64: includes `--qd-ui2-tab-w: 54px`, `--qd-ui2-tab-h: 158px` plus core shell layout; 459-464: `--qd-ui2-tab-w: 46px`, `--qd-ui2-tab-h: 138px` | Later block supersedes just two custom properties from the base shell. The base shell block contains required flex/layout/position/overflow structure and is **not** removable. | SAFE | In a later CSS cleanup patch, fold final `--qd-ui2-tab-w/h` values into the base shell block, then remove only the later tiny override. |

## C. Review-carefully candidates

| File | Lines | Selector/rule | Properties in each occurrence | Reason it appears duplicate/superseded/dead | Risk | Recommended action |
|---|---:|---|---|---|---|---|
| `styles/quickdeck-ui2-v23-port.css` | 397-410, 922-990, 5437-5520, 5937-5977 | `.qd-ui2-action-row`, `.qd-ui2-reference-button`, `.qd-ui2-action-meta`, `.qd-ui2-action-controls`, `.qd-ui2-action-button` | Early generic rows set gaps/padding/radius and truncation; mid rules set full visual treatment; late right-drawer scoped rules set compact row/button sizing and colors. | Many later rules are narrower (`.qd-ui2-right-drawer`, section-specific) and do not fully replace every generic structural property. | REVIEW | Do not remove early generic action-row/reference/action-meta blocks until each drawer/section has equivalent `gap`, `padding`, `border-radius`, `min-width`, `overflow`, `text-overflow`, and `white-space` coverage. |
| `styles/quickdeck-ui2-v23-port.css` | 453-457, 537-541, 617-622, 1067-1071, 1310-1314 | `.qd-ui2-center-cockpit` | Repeated partial overrides for `justify-content`, `padding-top`, `gap`, and `isolation`. | Later blocks supersede some values, but earlier base block at 103-116 carries required flex layout and overflow. The multiple partial patches likely encode visual tuning. | REVIEW | Consolidate only after a screenshot comparison of center-only, left-open, right-open, and both-open shell states. |
| `styles/quickdeck-ui2-v23-port.css` | 466-471 vs 155-168 | `.qd-ui2-edge-tab` | Base block defines absolute positioning, tab dimensions, writing mode, and typography; later block narrows font/letter spacing/padding. | Later block partially overrides but does not replace positioning/dimensions. | REVIEW | Fold typography values into base edge-tab block only if no later responsive block changes them. Never remove tab position/dimension properties. |
| `styles/quickdeck-ui2-v23-port.css` | 754-772, 510-512, 1749-1806, 5075-5126 | carousel card/track/portrait selectors | Earlier blocks set compact dimensions; later blocks add hover/focus zoom and later polish. | Repeated selectors appear intentional but include performance-sensitive transform/box-shadow hover behavior. | REVIEW | Keep dimensions unless replaced in all active shell states. Separately review hover zoom with product owner because it is not roster/action-row hover, but still uses transform and heavy shadow. |
| `styles/quickdeck-ui2-v23-port.css` | 5664-5686 and 5979-5986 | `.qd-ui2-right-drawer .qd-ui2-search-empty`, `.qd-ui2-empty-note` | First block defines complete empty-state well; later block only reduces `min-height` and `padding`. | Later block partially overrides but depends on the first block for display, border, colors, background, shadow, type. | REVIEW | Do not remove first block. Optionally fold final `min-height: 38px` and `padding: 8px` into first block later. |
| `styles/quickdeck-ui2-v23-port.css` | 5390-5393 and 6046-6050 | `.qd-ui2-right-drawer .qd-ui2-search-row input:focus-visible` | Earlier block adds outline/offset; later removes outline and box-shadow. | Later block supersedes outline but leaves `outline-offset` from earlier as inert while outline is `none`; this is harmless but confusing. | REVIEW | In a later patch, decide whether focus-visible should have no input outline. If yes, remove/fold earlier outline block and document the outer search-well focus rule at 6034-6044. |
| `styles/quickdeck-ui2-v23-port.css` | 2096-2164 and 2437-2438 | pending-damage classes: `.qd-ui2-pending-damage-card`, `.qd-ui2-pending-damage-main`, `.qd-ui2-pending-damage-kicker`, `.qd-ui2-pending-damage-controls`, `.has-pending-damage`, `.is-apply-damage` | CSS class selectors exist, but literal class names were not found in `templates/quickdeck-overlay.hbs`, `scripts/quickdeck-app.js`, `scripts/main.js`, or `scripts/dev/quickdeck-art-tuner.js`. | Dead-selector candidate by requested usage scan, but popup markup/classes can be composed dynamically or reserved for near-future use. | REVIEW | Treat as dead candidates only. Search runtime HTML generation before removal. |

## D. Do-not-remove list

| File | Lines | Selector/rule | Reason | Risk | Recommended action |
|---|---:|---|---|---|---|
| `module.json` | 26-30 | CSS load order | Confirms `quickdeck-ui2-v23-port.css` is final active override after shared base, command-desk tokens, and UI2 base. | DO NOT REMOVE | Keep all four CSS files loaded until a separate migration explicitly retires a layer. |
| `styles/quickdeck.css` | whole file | shared `.quickdeck-*` runtime/reference rules | Retained after legacy interface retirement for launcher, restore, and reference styling. | DO NOT REMOVE | Exclude shared runtime/reference selectors from UI2 cleanup safety-removal lists. |
| `styles/quickdeck-command-desk.css` | whole file | `qd40` and shared texture/token rules, including `--qd-panel-bg`, `--qd-card-bg`, `--qd-shell-bg` | Command-desk skin variables and qd40 shell/chrome remain shared dependencies. | DO NOT REMOVE | Do not remove shared variables or qd40 shell/chrome styles. |
| `styles/quickdeck-ui2.css` | whole file | UI2 base layer | Still loaded before v23 port. Some v23 blocks are overrides, not replacements. | DO NOT REMOVE | Keep until a full cascade ownership pass proves it obsolete. |
| `styles/quickdeck-ui2-v23-port.css` | 39-64 | base `.qd-ui2-shell` block | Carries required custom props, flex layout, position, dimensions, overflow, and transition. Later blocks only partially override it. | DO NOT REMOVE | Only fold final variable values into it; do not remove the base shell structure. |
| `styles/quickdeck-ui2-v23-port.css` | 66-88 | shell open/closed width state blocks | Define shell width and center width for drawer states. Later body-height blocks do not replace width logic. | DO NOT REMOVE | Keep. |
| `styles/quickdeck-ui2-v23-port.css` | 90-152 | panel/drawer sizing and open/closed drawer structure | Sets flex basis, widths, opacity, padding, borders, overflow and panel dimensions. | DO NOT REMOVE | Keep unless an identical later structural block fully replaces it. |
| `styles/quickdeck-ui2-v23-port.css` | 155-174 | edge tab positioning | Required absolute tab placement and vertical writing mode. | DO NOT REMOVE | Do not remove because later typography-only block does not replace it. |
| any CSS file | any qd31/qf40/qd40 shell or chrome block | qd31 and qd40 still matter per task context. | DO NOT REMOVE | Do not mark safe-remove in UI2-only cleanup. |
| any CSS file | shared variables `--qd-panel-bg`, `--qd-card-bg`, `--qd-shell-bg` | Explicit hard safety rule. | DO NOT REMOVE | Preserve. |

## E. Performance-risk candidates

| File | Lines | Selector/rule | Risk detail | Risk | Recommended action |
|---|---:|---|---|---|---|
| `styles/quickdeck-ui2-v23-port.css` | 63 | `.qd-ui2-shell { transition: width 240ms ease !important; }` | Width transition can trigger layout during drawer open/close. This is shell-level, not a repeated row, but still a layout transition. | REVIEW | Keep for now if drawer animation is intentional; do not expand to `all`; consider instant width or opacity-only in a future performance pass. |
| `styles/quickdeck-ui2-v23-port.css` | 2557 | roster rows: `transition: height 140ms ease, min-height 140ms ease, transform 140ms ease, box-shadow 140ms ease` | Explicitly animates height, min-height, transform, and shadow on repeated roster rows. | REVIEW | Replace in a later patch with cheap color/border/background transition only. |
| `styles/quickdeck-ui2-v23-port.css` | 2563-2570 | `.qd-ui2-active-roster-row:hover`, `.qd-ui2-inactive-roster-row:hover` | Hover changes `min-height`, `height`, and `transform`. Violates rule against row hover enlargement/movement. | REVIEW | Remove row enlargement/movement in a later patch; preserve cheap tint/border changes. |
| `styles/quickdeck-ui2-v23-port.css` | 2572-2579 | roster portrait hover descendants | Hover changes portrait `width` and `height`. | REVIEW | Remove portrait resizing in a later patch. |
| `styles/quickdeck-ui2-v23-port.css` | 2595-2599 | roster meta hover descendants | Hover changes `transform`. | REVIEW | Remove movement in a later patch; leave text color/weight if desired. |
| `styles/quickdeck-ui2-v23-port.css` | 2938-2947 | action rows in combat/skills/spells sections | Hover changes `min-height`, `height`, `padding`, `transform`, and adds large shadow on repeated action rows. | REVIEW | Remove enlargement/movement in a later patch; keep only color/border/background tint and modest shadow. |
| `styles/quickdeck-ui2-v23-port.css` | 2960-3000 | action-row hover descendants | Hover changes nested button/meta/damage font size, min-height and line-height, creating row reflow risk. | REVIEW | Remove nested hover resizing in the same patch as action-row enlargement. |
| `styles/quickdeck-ui2-v23-port.css` | 5515-5519 | `.qd-ui2-right-drawer .qd-ui2-action-row:hover` | Adds `transform: translateX(1px)` and filter to repeated right-drawer rows. | REVIEW | Replace transform/filter with border/background tint only. |
| `styles/quickdeck-ui2-v23-port.css` | 5460-5507 | section-specific action-row hover shadows | Adds multiple `0 0 10px` glows on repeated action rows. | REVIEW | Keep only if measured acceptable; otherwise reduce to subtle border/background changes. |
| `styles/quickdeck-ui2-v23-port.css` | 1749-1806 and 5075-5126 | carousel portrait/button hover/focus transforms | Uses `transform: scale(2)`, `scale(2.08)`, or `translateY(-1px)` plus heavy shadow. Not roster/action rows, but can be visually and compositing heavy. | REVIEW | Product/UX decision; do not remove under row-performance patch unless explicitly scoped. |
| `styles/quickdeck-ui2-v23-port.css` | 5310-5316 | right drawer tab hover | Uses `transform: translateY(-1px)`, filter, and glow. Task explicitly says do not animate drawer tab transform; while this is hover transform not transition transform, it should be reviewed. | REVIEW | Remove transform from tab hover in a later patch; keep color/border tint. |
| `styles/quickdeck-ui2-v23-port.css` | 5420-5426, 5560-5564, 6172-6192 | small command button hovers | Uses filter and box-shadow. These are buttons, not rows, but still repeated controls. | REVIEW | Keep if necessary; avoid adding transform or layout changes. |
| `styles/quickdeck-ui2-v23-port.css` | all scanned | `transition: all` | No `transition: all` was found in `quickdeck-ui2-v23-port.css`. | SAFE | No action. |

## F. Suggested patch order

1. **Patch 1: no-behavior cascade cleanup of shell body-height variables only.** Remove only superseded `--qd-ui2-body-h` blocks at 422-437 and 518-534, preserving width state blocks at 66-88 and final height blocks at 1050-1065.
2. **Patch 2: fold tiny scalar overrides.** Fold final shell tab variables at 459-464 into the base shell block at 39-64 and, if visual checks pass, fold final right-drawer empty-state `min-height`/`padding` into 5664-5686.
3. **Patch 3: focus/search cleanup.** Decide whether input focus outline should be removed in favor of the outer search-well focus glow; consolidate 5390-5393 and 6046-6050 accordingly.
4. **Patch 4: performance cleanup for roster rows only.** Remove roster row height/min-height/transform/portrait-resize hover behavior around 2557-2616. Keep cheap color, border-color, background tint, and modest box-shadow only.
5. **Patch 5: performance cleanup for action rows only.** Remove action-row height/min-height/padding/transform/nested font-size hover enlargement around 2938-3000 and 5515-5519. Keep section colors and cheap hover tint.
6. **Patch 6: dead-selector verification.** Before removing pending-damage selectors, search runtime DOM construction and any unlisted files; qd31/qd40/current shell rules are not part of this cleanup.

## G. Validation commands

Run after this report-only change:

```bash
git diff --check
node --check scripts/dev/quickdeck-art-tuner.js
node --check scripts/quickdeck-app.js
node --check scripts/main.js
git status --short
```

## Appendix: repeated selectors in `styles/quickdeck-ui2-v23-port.css`

Notes:
- Comma-separated selector lists are split, so both `#gurps-quickdeck-overlay.qd40-overlay ...` and `.qd40-overlay ...` entries appear separately.
- “Replacement” is based on property names only: **full** means a later occurrence includes every property name from an earlier occurrence; **partial** means only some properties overlap or additional structural properties remain only in earlier blocks.
- Exact same selector appearing in multiple blocks is often intentional cascade tuning; this appendix is an audit index, not a removal list.


### 1. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-shell`
- Lines 39-64: `--qd-ui2-left-w`, `--qd-ui2-right-w`, `--qd-ui2-center-compact`, `--qd-ui2-center-one`, `--qd-ui2-center-wide`, `--qd-ui2-center-w`, `--qd-ui2-tab-w`, `--qd-ui2-tab-h`, `--qd-ui2-body-h`, `position`, `display`, `align-items`, `gap`, `width`, `min-width`, `max-width`, `height`, `max-height`, `padding`, `overflow`, `background`, `border`, `box-shadow`, `transition`
- Lines 461-464: `--qd-ui2-tab-w`, `--qd-ui2-tab-h`
- Replacement assessment: 39-64: partially overridden by final occurrence (--qd-ui2-tab-h, --qd-ui2-tab-w).

### 2. `.qd40-overlay .qd-ui2-shell`
- Lines 39-64: `--qd-ui2-left-w`, `--qd-ui2-right-w`, `--qd-ui2-center-compact`, `--qd-ui2-center-one`, `--qd-ui2-center-wide`, `--qd-ui2-center-w`, `--qd-ui2-tab-w`, `--qd-ui2-tab-h`, `--qd-ui2-body-h`, `position`, `display`, `align-items`, `gap`, `width`, `min-width`, `max-width`, `height`, `max-height`, `padding`, `overflow`, `background`, `border`, `box-shadow`, `transition`
- Lines 461-464: `--qd-ui2-tab-w`, `--qd-ui2-tab-h`
- Replacement assessment: 39-64: partially overridden by final occurrence (--qd-ui2-tab-h, --qd-ui2-tab-w).

### 3. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-shell:not(.qd-ui2-left-open):not(.qd-ui2-right-open)`
- Lines 67-70: `--qd-ui2-center-w`, `width`
- Lines 423-425: `--qd-ui2-body-h`
- Lines 519-521: `--qd-ui2-body-h`
- Lines 1051-1053: `--qd-ui2-body-h`
- Replacement assessment: 67-70: not replaced by final occurrence; properties are complementary; 423-425: fully replaced by final occurrence by property names; 519-521: fully replaced by final occurrence by property names.

### 4. `.qd40-overlay .qd-ui2-shell:not(.qd-ui2-left-open):not(.qd-ui2-right-open)`
- Lines 67-70: `--qd-ui2-center-w`, `width`
- Lines 423-425: `--qd-ui2-body-h`
- Lines 519-521: `--qd-ui2-body-h`
- Lines 1051-1053: `--qd-ui2-body-h`
- Replacement assessment: 67-70: not replaced by final occurrence; properties are complementary; 423-425: fully replaced by final occurrence by property names; 519-521: fully replaced by final occurrence by property names.

### 5. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-shell.qd-ui2-left-open:not(.qd-ui2-right-open)`
- Lines 73-76: `--qd-ui2-center-w`, `width`
- Lines 430-432: `--qd-ui2-body-h`
- Lines 526-528: `--qd-ui2-body-h`
- Lines 1058-1060: `--qd-ui2-body-h`
- Replacement assessment: 73-76: not replaced by final occurrence; properties are complementary; 430-432: fully replaced by final occurrence by property names; 526-528: fully replaced by final occurrence by property names.

### 6. `.qd40-overlay .qd-ui2-shell.qd-ui2-left-open:not(.qd-ui2-right-open)`
- Lines 73-76: `--qd-ui2-center-w`, `width`
- Lines 430-432: `--qd-ui2-body-h`
- Lines 526-528: `--qd-ui2-body-h`
- Lines 1058-1060: `--qd-ui2-body-h`
- Replacement assessment: 73-76: not replaced by final occurrence; properties are complementary; 430-432: fully replaced by final occurrence by property names; 526-528: fully replaced by final occurrence by property names.

### 7. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-shell:not(.qd-ui2-left-open).qd-ui2-right-open`
- Lines 79-82: `--qd-ui2-center-w`, `width`
- Lines 430-432: `--qd-ui2-body-h`
- Lines 526-528: `--qd-ui2-body-h`
- Lines 1058-1060: `--qd-ui2-body-h`
- Replacement assessment: 79-82: not replaced by final occurrence; properties are complementary; 430-432: fully replaced by final occurrence by property names; 526-528: fully replaced by final occurrence by property names.

### 8. `.qd40-overlay .qd-ui2-shell:not(.qd-ui2-left-open).qd-ui2-right-open`
- Lines 79-82: `--qd-ui2-center-w`, `width`
- Lines 430-432: `--qd-ui2-body-h`
- Lines 526-528: `--qd-ui2-body-h`
- Lines 1058-1060: `--qd-ui2-body-h`
- Replacement assessment: 79-82: not replaced by final occurrence; properties are complementary; 430-432: fully replaced by final occurrence by property names; 526-528: fully replaced by final occurrence by property names.

### 9. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-shell.qd-ui2-left-open.qd-ui2-right-open`
- Lines 85-88: `--qd-ui2-center-w`, `width`
- Lines 435-437: `--qd-ui2-body-h`
- Lines 532-534: `--qd-ui2-body-h`
- Lines 1063-1065: `--qd-ui2-body-h`
- Replacement assessment: 85-88: not replaced by final occurrence; properties are complementary; 435-437: fully replaced by final occurrence by property names; 532-534: fully replaced by final occurrence by property names.

### 10. `.qd40-overlay .qd-ui2-shell.qd-ui2-left-open.qd-ui2-right-open`
- Lines 85-88: `--qd-ui2-center-w`, `width`
- Lines 435-437: `--qd-ui2-body-h`
- Lines 532-534: `--qd-ui2-body-h`
- Lines 1063-1065: `--qd-ui2-body-h`
- Replacement assessment: 85-88: not replaced by final occurrence; properties are complementary; 435-437: fully replaced by final occurrence by property names; 532-534: fully replaced by final occurrence by property names.

### 11. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-center-cockpit`
- Lines 94-101: `position`, `min-width`, `min-height`, `height`, `max-height`, `border-radius`
- Lines 104-116: `z-index`, `flex`, `width`, `max-width`, `display`, `flex-direction`, `justify-content`, `align-items`, `gap`, `padding`, `overflow`
- Lines 454-457: `justify-content`, `padding-top`
- Lines 538-541: `padding-top`, `gap`
- Lines 618-622: `isolation`, `padding-top`, `gap`
- Lines 1068-1071: `gap`, `padding-top`
- Lines 1311-1314: `gap`, `padding-top`
- Replacement assessment: 94-101: not replaced by final occurrence; properties are complementary; 104-116: partially overridden by final occurrence (gap); 454-457: partially overridden by final occurrence (padding-top); 538-541: fully replaced by final occurrence by property names; 618-622: partially overridden by final occurrence (gap, padding-top); 1068-1071: fully replaced by final occurrence by property names.

### 12. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-drawer`
- Lines 94-101: `position`, `min-width`, `min-height`, `height`, `max-height`, `border-radius`
- Lines 119-128: `flex`, `width`, `max-width`, `min-width`, `opacity`, `padding`, `border-width`, `overflow`
- Replacement assessment: 94-101: partially overridden by final occurrence (min-width).

### 13. `.qd40-overlay .qd-ui2-center-cockpit`
- Lines 94-101: `position`, `min-width`, `min-height`, `height`, `max-height`, `border-radius`
- Lines 104-116: `z-index`, `flex`, `width`, `max-width`, `display`, `flex-direction`, `justify-content`, `align-items`, `gap`, `padding`, `overflow`
- Lines 454-457: `justify-content`, `padding-top`
- Lines 538-541: `padding-top`, `gap`
- Lines 618-622: `isolation`, `padding-top`, `gap`
- Lines 1068-1071: `gap`, `padding-top`
- Lines 1311-1314: `gap`, `padding-top`
- Replacement assessment: 94-101: not replaced by final occurrence; properties are complementary; 104-116: partially overridden by final occurrence (gap); 454-457: partially overridden by final occurrence (padding-top); 538-541: fully replaced by final occurrence by property names; 618-622: partially overridden by final occurrence (gap, padding-top); 1068-1071: fully replaced by final occurrence by property names.

### 14. `.qd40-overlay .qd-ui2-drawer`
- Lines 94-101: `position`, `min-width`, `min-height`, `height`, `max-height`, `border-radius`
- Lines 119-128: `flex`, `width`, `max-width`, `min-width`, `opacity`, `padding`, `border-width`, `overflow`
- Replacement assessment: 94-101: partially overridden by final occurrence (min-width).

### 15. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-edge-tab`
- Lines 156-168: `position`, `z-index`, `top`, `width`, `min-width`, `height`, `padding`, `writing-mode`, `text-orientation`, `font-size`, `letter-spacing`
- Lines 467-471: `font-size`, `letter-spacing`, `padding`
- Replacement assessment: 156-168: partially overridden by final occurrence (font-size, letter-spacing, padding).

### 16. `.qd40-overlay .qd-ui2-edge-tab`
- Lines 156-168: `position`, `z-index`, `top`, `width`, `min-width`, `height`, `padding`, `writing-mode`, `text-orientation`, `font-size`, `letter-spacing`
- Lines 467-471: `font-size`, `letter-spacing`, `padding`
- Replacement assessment: 156-168: partially overridden by final occurrence (font-size, letter-spacing, padding).

### 17. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-actor-card`
- Lines 178-195: `width`, `max-width`, `min-height`, `max-height`, `margin`, `padding`, `border-radius`, `gap`, `grid-template-columns`, `grid-template-areas`, `align-items`, `overflow`
- Lines 545-547: `margin-bottom`
- Lines 655-658: `position`, `z-index`
- Lines 661-668: `max-width`, `min-height`, `padding`, `margin-bottom`, `grid-template-columns`, `gap`
- Lines 1410-1417: `grid-template-columns`, `grid-template-areas`, `align-items`
- Lines 1533-1542: `grid-template-columns`, `grid-template-areas`, `align-items`, `gap`
- Lines 4493-4503: `border-color`, `background`, `box-shadow`
- Lines 5244-5246: `user-select`
- Replacement assessment: 178-195: not replaced by final occurrence; properties are complementary; 545-547: not replaced by final occurrence; properties are complementary; 655-658: not replaced by final occurrence; properties are complementary; 661-668: not replaced by final occurrence; properties are complementary; 1410-1417: not replaced by final occurrence; properties are complementary; 1533-1542: not replaced by final occurrence; properties are complementary; 4493-4503: not replaced by final occurrence; properties are complementary.

### 18. `.qd40-overlay .qd-ui2-actor-card`
- Lines 178-195: `width`, `max-width`, `min-height`, `max-height`, `margin`, `padding`, `border-radius`, `gap`, `grid-template-columns`, `grid-template-areas`, `align-items`, `overflow`
- Lines 545-547: `margin-bottom`
- Lines 655-658: `position`, `z-index`
- Lines 661-668: `max-width`, `min-height`, `padding`, `margin-bottom`, `grid-template-columns`, `gap`
- Lines 1410-1417: `grid-template-columns`, `grid-template-areas`, `align-items`
- Lines 1533-1542: `grid-template-columns`, `grid-template-areas`, `align-items`, `gap`
- Lines 1640-1649: `grid-template-columns`, `grid-template-areas`, `align-items`, `gap`
- Lines 4493-4503: `border-color`, `background`, `box-shadow`
- Lines 5244-5246: `user-select`
- Replacement assessment: 178-195: not replaced by final occurrence; properties are complementary; 545-547: not replaced by final occurrence; properties are complementary; 655-658: not replaced by final occurrence; properties are complementary; 661-668: not replaced by final occurrence; properties are complementary; 1410-1417: not replaced by final occurrence; properties are complementary; 1533-1542: not replaced by final occurrence; properties are complementary; 1640-1649: not replaced by final occurrence; properties are complementary; 4493-4503: not replaced by final occurrence; properties are complementary.

### 19. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-shell.qd-ui2-left-open.qd-ui2-right-open .qd-ui2-actor-card`
- Lines 198-200: `grid-template-columns`
- Lines 683-686: `max-width`, `grid-template-columns`
- Lines 800-802: `max-width`
- Lines 1607-1614: `grid-template-columns`, `grid-template-areas`
- Lines 1707-1714: `grid-template-columns`, `grid-template-areas`
- Replacement assessment: 198-200: fully replaced by final occurrence by property names; 683-686: partially overridden by final occurrence (grid-template-columns); 800-802: not replaced by final occurrence; properties are complementary; 1607-1614: fully replaced by final occurrence by property names.

### 20. `.qd40-overlay .qd-ui2-shell.qd-ui2-left-open.qd-ui2-right-open .qd-ui2-actor-card`
- Lines 198-200: `grid-template-columns`
- Lines 683-686: `max-width`, `grid-template-columns`
- Lines 800-802: `max-width`
- Lines 1607-1614: `grid-template-columns`, `grid-template-areas`
- Lines 1707-1714: `grid-template-columns`, `grid-template-areas`
- Replacement assessment: 198-200: fully replaced by final occurrence by property names; 683-686: partially overridden by final occurrence (grid-template-columns); 800-802: not replaced by final occurrence; properties are complementary; 1607-1614: fully replaced by final occurrence by property names.

### 21. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-portrait-ring`
- Lines 203-208: `width`, `max-width`, `padding`, `margin`
- Lines 689-693: `width`, `max-width`, `padding`
- Lines 1420-1422: `grid-area`
- Lines 1570-1574: `grid-area`, `justify-self`, `align-self`
- Lines 1688-1692: `grid-area`, `justify-self`, `align-self`
- Lines 4506-4515: `border-color`, `background`, `box-shadow`
- Lines 4939-4946: `cursor`, `transition`
- Replacement assessment: 203-208: not replaced by final occurrence; properties are complementary; 689-693: not replaced by final occurrence; properties are complementary; 1420-1422: not replaced by final occurrence; properties are complementary; 1570-1574: not replaced by final occurrence; properties are complementary; 1688-1692: not replaced by final occurrence; properties are complementary; 4506-4515: not replaced by final occurrence; properties are complementary.

### 22. `.qd40-overlay .qd-ui2-portrait-ring`
- Lines 203-208: `width`, `max-width`, `padding`, `margin`
- Lines 689-693: `width`, `max-width`, `padding`
- Lines 1420-1422: `grid-area`
- Lines 1570-1574: `grid-area`, `justify-self`, `align-self`
- Lines 1688-1692: `grid-area`, `justify-self`, `align-self`
- Lines 4506-4515: `border-color`, `background`, `box-shadow`
- Lines 4939-4946: `cursor`, `transition`
- Replacement assessment: 203-208: not replaced by final occurrence; properties are complementary; 689-693: not replaced by final occurrence; properties are complementary; 1420-1422: not replaced by final occurrence; properties are complementary; 1570-1574: not replaced by final occurrence; properties are complementary; 1688-1692: not replaced by final occurrence; properties are complementary; 4506-4515: not replaced by final occurrence; properties are complementary.

### 23. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-shell.qd-ui2-left-open.qd-ui2-right-open .qd-ui2-portrait-ring`
- Lines 211-215: `width`, `max-width`, `padding`
- Lines 696-700: `width`, `max-width`, `padding`
- Replacement assessment: 211-215: fully replaced by final occurrence by property names.

### 24. `.qd40-overlay .qd-ui2-shell.qd-ui2-left-open.qd-ui2-right-open .qd-ui2-portrait-ring`
- Lines 211-215: `width`, `max-width`, `padding`
- Lines 696-700: `width`, `max-width`, `padding`
- Replacement assessment: 211-215: fully replaced by final occurrence by property names.

### 25. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-actor-title-block`
- Lines 218-218: `min-width`, `gap`
- Lines 1425-1433: `grid-area`, `display`, `grid-template-columns`, `align-items`, `gap`, `min-width`, `padding-top`
- Lines 1546-1552: `grid-area`, `display`, `min-width`, `padding`, `align-self`
- Lines 1652-1658: `grid-area`, `display`, `min-width`, `padding`, `align-self`
- Replacement assessment: 218-218: partially overridden by final occurrence (min-width); 1425-1433: partially overridden by final occurrence (display, grid-area, min-width); 1546-1552: fully replaced by final occurrence by property names.

### 26. `.qd40-overlay .qd-ui2-actor-title-block`
- Lines 218-218: `min-width`, `gap`
- Lines 1425-1433: `grid-area`, `display`, `grid-template-columns`, `align-items`, `gap`, `min-width`, `padding-top`
- Lines 1546-1552: `grid-area`, `display`, `min-width`, `padding`, `align-self`
- Lines 1652-1658: `grid-area`, `display`, `min-width`, `padding`, `align-self`
- Replacement assessment: 218-218: partially overridden by final occurrence (min-width); 1425-1433: partially overridden by final occurrence (display, grid-area, min-width); 1546-1552: fully replaced by final occurrence by property names.

### 27. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-actor-name`
- Lines 221-228: `max-width`, `overflow`, `font-size`, `line-height`, `text-overflow`, `white-space`
- Lines 703-705: `font-size`
- Lines 1436-1443: `margin`, `min-width`, `max-width`, `overflow`, `white-space`, `text-overflow`
- Lines 1555-1566: `display`, `width`, `max-width`, `margin`, `overflow`, `text-align`, `white-space`, `text-overflow`, `font-size`, `line-height`
- Lines 1661-1672: `display`, `width`, `max-width`, `margin`, `overflow`, `text-align`, `white-space`, `text-overflow`, `font-size`, `line-height`
- Lines 4526-4534: `color`, `font-weight`, `letter-spacing`, `text-shadow`
- Replacement assessment: 221-228: not replaced by final occurrence; properties are complementary; 703-705: not replaced by final occurrence; properties are complementary; 1436-1443: not replaced by final occurrence; properties are complementary; 1555-1566: not replaced by final occurrence; properties are complementary; 1661-1672: not replaced by final occurrence; properties are complementary.

### 28. `.qd40-overlay .qd-ui2-actor-name`
- Lines 221-228: `max-width`, `overflow`, `font-size`, `line-height`, `text-overflow`, `white-space`
- Lines 703-705: `font-size`
- Lines 1436-1443: `margin`, `min-width`, `max-width`, `overflow`, `white-space`, `text-overflow`
- Lines 1555-1566: `display`, `width`, `max-width`, `margin`, `overflow`, `text-align`, `white-space`, `text-overflow`, `font-size`, `line-height`
- Lines 1661-1672: `display`, `width`, `max-width`, `margin`, `overflow`, `text-align`, `white-space`, `text-overflow`, `font-size`, `line-height`
- Lines 4526-4534: `color`, `font-weight`, `letter-spacing`, `text-shadow`
- Replacement assessment: 221-228: not replaced by final occurrence; properties are complementary; 703-705: not replaced by final occurrence; properties are complementary; 1436-1443: not replaced by final occurrence; properties are complementary; 1555-1566: not replaced by final occurrence; properties are complementary; 1661-1672: not replaced by final occurrence; properties are complementary.

### 29. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-vital-stack`
- Lines 231-231: `min-width`, `gap`
- Lines 708-710: `gap`
- Lines 1487-1489: `grid-area`
- Lines 1592-1596: `grid-area`, `align-self`, `gap`
- Lines 1695-1698: `grid-area`, `align-self`
- Lines 4538-4540: `gap`
- Replacement assessment: 231-231: partially overridden by final occurrence (gap); 708-710: fully replaced by final occurrence by property names; 1487-1489: not replaced by final occurrence; properties are complementary; 1592-1596: partially overridden by final occurrence (gap); 1695-1698: not replaced by final occurrence; properties are complementary.

### 30. `.qd40-overlay .qd-ui2-vital-stack`
- Lines 231-231: `min-width`, `gap`
- Lines 708-710: `gap`
- Lines 1487-1489: `grid-area`
- Lines 1592-1596: `grid-area`, `align-self`, `gap`
- Lines 1695-1698: `grid-area`, `align-self`
- Lines 4538-4540: `gap`
- Replacement assessment: 231-231: partially overridden by final occurrence (gap); 708-710: fully replaced by final occurrence by property names; 1487-1489: not replaced by final occurrence; properties are complementary; 1592-1596: partially overridden by final occurrence (gap); 1695-1698: not replaced by final occurrence; properties are complementary.

### 31. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-vital-meter`
- Lines 234-238: `grid-template-columns`, `min-height`, `height`
- Lines 713-716: `height`, `min-height`
- Lines 4543-4554: `height`, `min-height`, `border-radius`, `border-color`, `background`, `box-shadow`, `overflow`
- Replacement assessment: 234-238: partially overridden by final occurrence (height, min-height); 713-716: fully replaced by final occurrence by property names.

### 32. `.qd40-overlay .qd-ui2-vital-meter`
- Lines 234-238: `grid-template-columns`, `min-height`, `height`
- Lines 713-716: `height`, `min-height`
- Lines 4543-4554: `height`, `min-height`, `border-radius`, `border-color`, `background`, `box-shadow`, `overflow`
- Replacement assessment: 234-238: partially overridden by final occurrence (height, min-height); 713-716: fully replaced by final occurrence by property names.

### 33. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-vital-label`
- Lines 241-241: `padding-left`, `font-size`
- Lines 4571-4579: `color`, `font-size`, `font-weight`, `letter-spacing`, `text-shadow`
- Replacement assessment: 241-241: partially overridden by final occurrence (font-size).

### 34. `.qd40-overlay .qd-ui2-vital-label`
- Lines 241-241: `padding-left`, `font-size`
- Lines 4571-4579: `color`, `font-size`, `font-weight`, `letter-spacing`, `text-shadow`
- Replacement assessment: 241-241: partially overridden by final occurrence (font-size).

### 35. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-vital-readout`
- Lines 244-258: `justify-self`, `min-width`, `height`, `padding`, `display`, `place-items`, `color`, `background`, `border`, `border-radius`, `font-size`, `line-height`, `text-shadow`
- Lines 1814-1820: `position`, `z-index`, `display`, `align-items`, `gap`
- Lines 4582-4591: `min-width`, `height`, `border-radius`, `color`, `background`, `border-color`, `font-size`, `font-weight`
- Replacement assessment: 244-258: partially overridden by final occurrence (background, border-radius, color, font-size, height, min-width); 1814-1820: not replaced by final occurrence; properties are complementary.

### 36. `.qd40-overlay .qd-ui2-vital-readout`
- Lines 244-258: `justify-self`, `min-width`, `height`, `padding`, `display`, `place-items`, `color`, `background`, `border`, `border-radius`, `font-size`, `line-height`, `text-shadow`
- Lines 1814-1820: `position`, `z-index`, `display`, `align-items`, `gap`
- Lines 1917-1925: `background`, `border`, `border-radius`, `box-shadow`, `padding`, `color`, `text-shadow`
- Lines 4582-4591: `min-width`, `height`, `border-radius`, `color`, `background`, `border-color`, `font-size`, `font-weight`
- Replacement assessment: 244-258: partially overridden by final occurrence (background, border-radius, color, font-size, height, min-width); 1814-1820: not replaced by final occurrence; properties are complementary; 1917-1925: partially overridden by final occurrence (background, border-radius, color).

### 37. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-instrument-deck`
- Lines 262-262: `min-width`, `gap`
- Lines 1492-1494: `grid-area`
- Lines 1600-1604: `grid-area`, `align-self`, `gap`
- Lines 1701-1704: `grid-area`, `align-self`
- Lines 5233-5235: `gap`
- Replacement assessment: 262-262: partially overridden by final occurrence (gap); 1492-1494: not replaced by final occurrence; properties are complementary; 1600-1604: partially overridden by final occurrence (gap); 1701-1704: not replaced by final occurrence; properties are complementary.

### 38. `.qd40-overlay .qd-ui2-instrument-deck`
- Lines 262-262: `min-width`, `gap`
- Lines 1492-1494: `grid-area`
- Lines 1600-1604: `grid-area`, `align-self`, `gap`
- Lines 1701-1704: `grid-area`, `align-self`
- Lines 5233-5235: `gap`
- Replacement assessment: 262-262: partially overridden by final occurrence (gap); 1492-1494: not replaced by final occurrence; properties are complementary; 1600-1604: partially overridden by final occurrence (gap); 1701-1704: not replaced by final occurrence; properties are complementary.

### 39. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-roll-row`
- Lines 265-265: `min-width`, `gap`
- Lines 719-721: `gap`
- Lines 4668-4674: `display`, `grid-template-columns`, `gap`, `width`, `min-width`
- Lines 5238-5240: `margin-bottom`
- Replacement assessment: 265-265: not replaced by final occurrence; properties are complementary; 719-721: not replaced by final occurrence; properties are complementary; 4668-4674: not replaced by final occurrence; properties are complementary.

### 40. `.qd40-overlay .qd-ui2-roll-row`
- Lines 265-265: `min-width`, `gap`
- Lines 719-721: `gap`
- Lines 4668-4674: `display`, `grid-template-columns`, `gap`, `width`, `min-width`
- Lines 5238-5240: `margin-bottom`
- Replacement assessment: 265-265: not replaced by final occurrence; properties are complementary; 719-721: not replaced by final occurrence; properties are complementary; 4668-4674: not replaced by final occurrence; properties are complementary.

### 41. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-roll-pill`
- Lines 268-273: `grid-template-columns`, `min-height`, `height`, `padding`
- Lines 724-727: `min-height`, `height`
- Lines 4677-4697: `width`, `max-width`, `min-width`, `min-height`, `height`, `display`, `grid-template-columns`, `align-items`, `gap`, `padding`, `border-radius`, `border`, `background`, `box-shadow`, `overflow`
- Replacement assessment: 268-273: fully replaced by final occurrence by property names; 724-727: fully replaced by final occurrence by property names.

### 42. `.qd40-overlay .qd-ui2-roll-pill`
- Lines 268-273: `grid-template-columns`, `min-height`, `height`, `padding`
- Lines 724-727: `min-height`, `height`
- Lines 4677-4697: `width`, `max-width`, `min-width`, `min-height`, `height`, `display`, `grid-template-columns`, `align-items`, `gap`, `padding`, `border-radius`, `border`, `background`, `box-shadow`, `overflow`
- Replacement assessment: 268-273: fully replaced by final occurrence by property names; 724-727: fully replaced by final occurrence by property names.

### 43. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-roll-select`
- Lines 276-276: `height`, `padding`, `font-size`
- Lines 732-734: `height`
- Lines 4700-4716: `width`, `min-width`, `height`, `padding`, `color`, `background-color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`, `line-height`, `text-overflow`, `cursor`
- Replacement assessment: 276-276: fully replaced by final occurrence by property names; 732-734: fully replaced by final occurrence by property names.

### 44. `.qd40-overlay .qd-ui2-roll-select`
- Lines 276-276: `height`, `padding`, `font-size`
- Lines 732-734: `height`
- Lines 4700-4716: `width`, `min-width`, `height`, `padding`, `color`, `background-color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`, `line-height`, `text-overflow`, `cursor`
- Replacement assessment: 276-276: fully replaced by final occurrence by property names; 732-734: fully replaced by final occurrence by property names.

### 45. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-roll-value`
- Lines 279-279: `min-width`, `font-size`
- Lines 4737-4754: `width`, `min-width`, `height`, `display`, `place-items`, `color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`, `line-height`, `text-shadow`
- Replacement assessment: 279-279: fully replaced by final occurrence by property names.

### 46. `.qd40-overlay .qd-ui2-roll-value`
- Lines 279-279: `min-width`, `font-size`
- Lines 4737-4754: `width`, `min-width`, `height`, `display`, `place-items`, `color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`, `line-height`, `text-shadow`
- Replacement assessment: 279-279: fully replaced by final occurrence by property names.

### 47. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-roll-button`
- Lines 282-282: `width`, `height`
- Lines 732-734: `height`
- Lines 737-739: `width`
- Lines 4757-4781: `width`, `min-width`, `height`, `min-height`, `display`, `place-items`, `padding`, `color`, `background`, `border`, `border-radius`, `font-size`, `line-height`, `font-weight`, `box-shadow`, `transition`
- Replacement assessment: 282-282: fully replaced by final occurrence by property names; 732-734: fully replaced by final occurrence by property names; 737-739: fully replaced by final occurrence by property names.

### 48. `.qd40-overlay .qd-ui2-roll-button`
- Lines 282-282: `width`, `height`
- Lines 732-734: `height`
- Lines 737-739: `width`
- Lines 4757-4781: `width`, `min-width`, `height`, `min-height`, `display`, `place-items`, `padding`, `color`, `background`, `border`, `border-radius`, `font-size`, `line-height`, `font-weight`, `box-shadow`, `transition`
- Replacement assessment: 282-282: fully replaced by final occurrence by property names; 732-734: fully replaced by final occurrence by property names; 737-739: fully replaced by final occurrence by property names.

### 49. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-stat-grid`
- Lines 285-289: `grid-template-columns`, `justify-content`, `gap`
- Lines 742-745: `grid-template-columns`, `gap`
- Lines 4609-4611: `gap`
- Lines 4835-4838: `grid-template-columns`, `gap`
- Replacement assessment: 285-289: partially overridden by final occurrence (gap, grid-template-columns); 742-745: fully replaced by final occurrence by property names; 4609-4611: fully replaced by final occurrence by property names.

### 50. `.qd40-overlay .qd-ui2-stat-grid`
- Lines 285-289: `grid-template-columns`, `justify-content`, `gap`
- Lines 742-745: `grid-template-columns`, `gap`
- Lines 4609-4611: `gap`
- Lines 4835-4838: `grid-template-columns`, `gap`
- Replacement assessment: 285-289: partially overridden by final occurrence (gap, grid-template-columns); 742-745: fully replaced by final occurrence by property names; 4609-4611: fully replaced by final occurrence by property names.

### 51. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-stat-tile`
- Lines 292-298: `width`, `min-height`, `height`, `padding`, `border-radius`
- Lines 748-752: `width`, `height`, `min-height`
- Lines 4614-4627: `border-color`, `background`, `box-shadow`, `transition`
- Lines 4841-4847: `width`, `height`, `min-height`, `padding`, `overflow`
- Replacement assessment: 292-298: partially overridden by final occurrence (height, min-height, padding, width); 748-752: fully replaced by final occurrence by property names; 4614-4627: not replaced by final occurrence; properties are complementary.

### 52. `.qd40-overlay .qd-ui2-stat-tile`
- Lines 292-298: `width`, `min-height`, `height`, `padding`, `border-radius`
- Lines 748-752: `width`, `height`, `min-height`
- Lines 4614-4627: `border-color`, `background`, `box-shadow`, `transition`
- Lines 4841-4847: `width`, `height`, `min-height`, `padding`, `overflow`
- Replacement assessment: 292-298: partially overridden by final occurrence (height, min-height, padding, width); 748-752: fully replaced by final occurrence by property names; 4614-4627: not replaced by final occurrence; properties are complementary.

### 53. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-stat-tile span`
- Lines 301-301: `font-size`
- Lines 4630-4636: `color`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`
- Replacement assessment: 301-301: fully replaced by final occurrence by property names.

### 54. `.qd40-overlay .qd-ui2-stat-tile span`
- Lines 301-301: `font-size`
- Lines 4630-4636: `color`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`
- Replacement assessment: 301-301: fully replaced by final occurrence by property names.

### 55. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-stat-tile strong`
- Lines 304-304: `font-size`
- Lines 4639-4646: `color`, `font-size`, `font-weight`, `text-shadow`
- Replacement assessment: 304-304: fully replaced by final occurrence by property names.

### 56. `.qd40-overlay .qd-ui2-stat-tile strong`
- Lines 304-304: `font-size`
- Lines 4639-4646: `color`, `font-size`, `font-weight`, `text-shadow`
- Replacement assessment: 304-304: fully replaced by final occurrence by property names.

### 57. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-carousel-card`
- Lines 308-318: `width`, `max-width`, `min-height`, `height`, `grid-template-columns`, `gap`, `margin`, `padding`, `border-radius`
- Lines 511-513: `margin-top`
- Lines 557-559: `margin-top`
- Lines 655-658: `position`, `z-index`
- Lines 755-760: `max-width`, `height`, `min-height`, `margin-top`
- Lines 815-818: `margin-top`, `max-width`
- Lines 1293-1297: `height`, `min-height`, `margin-top`
- Lines 1331-1343: `width`, `max-width`, `min-width`, `height`, `min-height`, `display`, `grid-template-columns`, `align-items`, `gap`, `padding`, `margin-top`
- Replacement assessment: 308-318: partially overridden by final occurrence (gap, grid-template-columns, height, max-width, min-height, padding, width); 511-513: fully replaced by final occurrence by property names; 557-559: fully replaced by final occurrence by property names; 655-658: not replaced by final occurrence; properties are complementary; 755-760: fully replaced by final occurrence by property names; 815-818: fully replaced by final occurrence by property names; 1293-1297: fully replaced by final occurrence by property names.

### 58. `.qd40-overlay .qd-ui2-carousel-card`
- Lines 308-318: `width`, `max-width`, `min-height`, `height`, `grid-template-columns`, `gap`, `margin`, `padding`, `border-radius`
- Lines 511-513: `margin-top`
- Lines 557-559: `margin-top`
- Lines 655-658: `position`, `z-index`
- Lines 755-760: `max-width`, `height`, `min-height`, `margin-top`
- Lines 815-818: `margin-top`, `max-width`
- Lines 1293-1297: `height`, `min-height`, `margin-top`
- Lines 1331-1343: `width`, `max-width`, `min-width`, `height`, `min-height`, `display`, `grid-template-columns`, `align-items`, `gap`, `padding`, `margin-top`
- Replacement assessment: 308-318: partially overridden by final occurrence (gap, grid-template-columns, height, max-width, min-height, padding, width); 511-513: fully replaced by final occurrence by property names; 557-559: fully replaced by final occurrence by property names; 655-658: not replaced by final occurrence; properties are complementary; 755-760: fully replaced by final occurrence by property names; 815-818: fully replaced by final occurrence by property names; 1293-1297: fully replaced by final occurrence by property names.

### 59. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-carousel-arrow`
- Lines 321-321: `width`, `height`, `min-height`
- Lines 1396-1404: `width`, `height`, `min-width`, `padding`, `border-radius`, `font-size`, `line-height`
- Replacement assessment: 321-321: partially overridden by final occurrence (height, width).

### 60. `.qd40-overlay .qd-ui2-carousel-arrow`
- Lines 321-321: `width`, `height`, `min-height`
- Lines 1396-1404: `width`, `height`, `min-width`, `padding`, `border-radius`, `font-size`, `line-height`
- Replacement assessment: 321-321: partially overridden by final occurrence (height, width).

### 61. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-carousel-track`
- Lines 324-330: `height`, `gap`, `overflow-x`, `overflow-y`, `scrollbar-width`
- Lines 763-765: `height`
- Lines 1347-1359: `width`, `max-width`, `min-width`, `height`, `display`, `gap`, `overflow-x`, `overflow-y`, `scroll-snap-type`, `scroll-behavior`, `scrollbar-width`
- Replacement assessment: 324-330: fully replaced by final occurrence by property names; 763-765: fully replaced by final occurrence by property names.

### 62. `.qd40-overlay .qd-ui2-carousel-track`
- Lines 324-330: `height`, `gap`, `overflow-x`, `overflow-y`, `scrollbar-width`
- Lines 763-765: `height`
- Lines 1347-1359: `width`, `max-width`, `min-width`, `height`, `display`, `gap`, `overflow-x`, `overflow-y`, `scroll-snap-type`, `scroll-behavior`, `scrollbar-width`
- Replacement assessment: 324-330: fully replaced by final occurrence by property names; 763-765: fully replaced by final occurrence by property names.

### 63. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-carousel-track::-webkit-scrollbar`
- Lines 333-333: `display`
- Lines 1362-1364: `display`
- Replacement assessment: 333-333: fully replaced by final occurrence by property names.

### 64. `.qd40-overlay .qd-ui2-carousel-track::-webkit-scrollbar`
- Lines 333-333: `display`
- Lines 1362-1364: `display`
- Replacement assessment: 333-333: fully replaced by final occurrence by property names.

### 65. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-carousel-portrait-button`
- Lines 336-336: `width`, `height`, `min-width`
- Lines 768-772: `width`, `height`, `min-width`
- Lines 1368-1381: `width`, `height`, `min-width`, `flex`, `scroll-snap-align`, `opacity`, `transform`, `transition`
- Lines 5099-5112: `border-radius`, `border`, `background`, `box-shadow`, `transition`
- Replacement assessment: 336-336: not replaced by final occurrence; properties are complementary; 768-772: not replaced by final occurrence; properties are complementary; 1368-1381: partially overridden by final occurrence (transition).

### 66. `.qd40-overlay .qd-ui2-carousel-portrait-button`
- Lines 336-336: `width`, `height`, `min-width`
- Lines 768-772: `width`, `height`, `min-width`
- Lines 1368-1381: `width`, `height`, `min-width`, `flex`, `scroll-snap-align`, `opacity`, `transform`, `transition`
- Lines 5099-5112: `border-radius`, `border`, `background`, `box-shadow`, `transition`
- Replacement assessment: 336-336: not replaced by final occurrence; properties are complementary; 768-772: not replaced by final occurrence; properties are complementary; 1368-1381: partially overridden by final occurrence (transition).

### 67. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-active-roster-card`
- Lines 342-347: `min-width`, `gap`, `padding`, `overflow`
- Lines 492-494: `padding`
- Replacement assessment: 342-347: partially overridden by final occurrence (padding).

### 68. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-inactive-roster-card`
- Lines 342-347: `min-width`, `gap`, `padding`, `overflow`
- Lines 492-494: `padding`
- Replacement assessment: 342-347: partially overridden by final occurrence (padding).

### 69. `.qd40-overlay .qd-ui2-active-roster-card`
- Lines 342-347: `min-width`, `gap`, `padding`, `overflow`
- Lines 492-494: `padding`
- Replacement assessment: 342-347: partially overridden by final occurrence (padding).

### 70. `.qd40-overlay .qd-ui2-inactive-roster-card`
- Lines 342-347: `min-width`, `gap`, `padding`, `overflow`
- Lines 492-494: `padding`
- Replacement assessment: 342-347: partially overridden by final occurrence (padding).

### 71. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-active-roster-row`
- Lines 362-368: `grid-template-columns`, `gap`, `min-height`, `height`, `padding`
- Lines 2556-2559: `transition`, `transform-origin`
- Replacement assessment: 362-368: not replaced by final occurrence; properties are complementary.

### 72. `.qd40-overlay .qd-ui2-active-roster-row`
- Lines 362-368: `grid-template-columns`, `gap`, `min-height`, `height`, `padding`
- Lines 2556-2559: `transition`, `transform-origin`
- Replacement assessment: 362-368: not replaced by final occurrence; properties are complementary.

### 73. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-inactive-roster-row`
- Lines 371-377: `grid-template-columns`, `gap`, `min-height`, `height`, `padding`
- Lines 2556-2559: `transition`, `transform-origin`
- Replacement assessment: 371-377: not replaced by final occurrence; properties are complementary.

### 74. `.qd40-overlay .qd-ui2-inactive-roster-row`
- Lines 371-377: `grid-template-columns`, `gap`, `min-height`, `height`, `padding`
- Lines 2556-2559: `transition`, `transform-origin`
- Replacement assessment: 371-377: not replaced by final occurrence; properties are complementary.

### 75. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-active-roster-portrait`
- Lines 382-382: `width`, `height`
- Lines 6065-6072: `border-radius`, `border`, `box-shadow`
- Replacement assessment: 382-382: not replaced by final occurrence; properties are complementary.

### 76. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-inactive-roster-portrait`
- Lines 382-382: `width`, `height`
- Lines 6075-6082: `border-radius`, `border`, `box-shadow`
- Replacement assessment: 382-382: not replaced by final occurrence; properties are complementary.

### 77. `.qd40-overlay .qd-ui2-active-roster-portrait`
- Lines 382-382: `width`, `height`
- Lines 6065-6072: `border-radius`, `border`, `box-shadow`
- Replacement assessment: 382-382: not replaced by final occurrence; properties are complementary.

### 78. `.qd40-overlay .qd-ui2-inactive-roster-portrait`
- Lines 382-382: `width`, `height`
- Lines 6075-6082: `border-radius`, `border`, `box-shadow`
- Replacement assessment: 382-382: not replaced by final occurrence; properties are complementary.

### 79. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-action-row`
- Lines 398-398: `gap`, `padding`, `border-radius`
- Lines 939-951: `min-height`, `gap`, `padding`, `margin-bottom`, `background`, `border`, `border-radius`, `box-shadow`
- Replacement assessment: 398-398: fully replaced by final occurrence by property names.

### 80. `.qd40-overlay .qd-ui2-action-row`
- Lines 398-398: `gap`, `padding`, `border-radius`
- Lines 939-951: `min-height`, `gap`, `padding`, `margin-bottom`, `background`, `border`, `border-radius`, `box-shadow`
- Replacement assessment: 398-398: fully replaced by final occurrence by property names.

### 81. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-reference-button`
- Lines 401-407: `min-width`, `overflow`, `font-size`, `text-overflow`, `white-space`
- Lines 967-976: `min-height`, `padding`, `color`, `font-size`, `font-weight`, `text-align`, `background`, `border-color`
- Replacement assessment: 401-407: partially overridden by final occurrence (font-size).

### 82. `.qd40-overlay .qd-ui2-reference-button`
- Lines 401-407: `min-width`, `overflow`, `font-size`, `text-overflow`, `white-space`
- Lines 967-976: `min-height`, `padding`, `color`, `font-size`, `font-weight`, `text-align`, `background`, `border-color`
- Replacement assessment: 401-407: partially overridden by final occurrence (font-size).

### 83. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-action-meta`
- Lines 410-410: `min-width`, `font-size`, `overflow`
- Lines 985-990: `gap`, `color`, `font-size`, `line-height`
- Replacement assessment: 410-410: partially overridden by final occurrence (font-size).

### 84. `.qd40-overlay .qd-ui2-action-meta`
- Lines 410-410: `min-width`, `font-size`, `overflow`
- Lines 985-990: `gap`, `color`, `font-size`, `line-height`
- Replacement assessment: 410-410: partially overridden by final occurrence (font-size).

### 85. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-action-meta span`
- Lines 413-417: `overflow`, `text-overflow`, `white-space`
- Lines 993-999: `max-width`, `padding`, `background`, `border`, `border-radius`
- Replacement assessment: 413-417: not replaced by final occurrence; properties are complementary.

### 86. `.qd40-overlay .qd-ui2-action-meta span`
- Lines 413-417: `overflow`, `text-overflow`, `white-space`
- Lines 993-999: `max-width`, `padding`, `background`, `border`, `border-radius`
- Replacement assessment: 413-417: not replaced by final occurrence; properties are complementary.

### 87. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-shell:not(.qd-ui2-left-open):not(.qd-ui2-right-open) .qd-ui2-actor-card`
- Lines 441-443: `max-width`
- Lines 551-553: `max-width`
- Lines 671-673: `max-width`
- Lines 785-788: `max-width`, `min-height`
- Replacement assessment: 441-443: fully replaced by final occurrence by property names; 551-553: fully replaced by final occurrence by property names; 671-673: fully replaced by final occurrence by property names.

### 88. `.qd40-overlay .qd-ui2-shell:not(.qd-ui2-left-open):not(.qd-ui2-right-open) .qd-ui2-actor-card`
- Lines 441-443: `max-width`
- Lines 551-553: `max-width`
- Lines 671-673: `max-width`
- Lines 785-788: `max-width`, `min-height`
- Replacement assessment: 441-443: fully replaced by final occurrence by property names; 551-553: fully replaced by final occurrence by property names; 671-673: fully replaced by final occurrence by property names.

### 89. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-shell.qd-ui2-left-open:not(.qd-ui2-right-open) .qd-ui2-actor-card`
- Lines 448-450: `max-width`
- Lines 678-680: `max-width`
- Lines 794-796: `max-width`
- Replacement assessment: 448-450: fully replaced by final occurrence by property names; 678-680: fully replaced by final occurrence by property names.

### 90. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-shell:not(.qd-ui2-left-open).qd-ui2-right-open .qd-ui2-actor-card`
- Lines 448-450: `max-width`
- Lines 678-680: `max-width`
- Lines 794-796: `max-width`
- Replacement assessment: 448-450: fully replaced by final occurrence by property names; 678-680: fully replaced by final occurrence by property names.

### 91. `.qd40-overlay .qd-ui2-shell.qd-ui2-left-open:not(.qd-ui2-right-open) .qd-ui2-actor-card`
- Lines 448-450: `max-width`
- Lines 678-680: `max-width`
- Lines 794-796: `max-width`
- Replacement assessment: 448-450: fully replaced by final occurrence by property names; 678-680: fully replaced by final occurrence by property names.

### 92. `.qd40-overlay .qd-ui2-shell:not(.qd-ui2-left-open).qd-ui2-right-open .qd-ui2-actor-card`
- Lines 448-450: `max-width`
- Lines 678-680: `max-width`
- Lines 794-796: `max-width`
- Replacement assessment: 448-450: fully replaced by final occurrence by property names; 678-680: fully replaced by final occurrence by property names.

### 93. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-active-roster-card h3`
- Lines 477-481: `font-size`, `line-height`, `letter-spacing`
- Lines 2531-2535: `font-size`, `line-height`, `margin`
- Replacement assessment: 477-481: partially overridden by final occurrence (font-size, line-height).

### 94. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-inactive-roster-header h3`
- Lines 477-481: `font-size`, `line-height`, `letter-spacing`
- Lines 2531-2535: `font-size`, `line-height`, `margin`
- Replacement assessment: 477-481: partially overridden by final occurrence (font-size, line-height).

### 95. `.qd40-overlay .qd-ui2-active-roster-card h3`
- Lines 477-481: `font-size`, `line-height`, `letter-spacing`
- Lines 2531-2535: `font-size`, `line-height`, `margin`
- Replacement assessment: 477-481: partially overridden by final occurrence (font-size, line-height).

### 96. `.qd40-overlay .qd-ui2-inactive-roster-header h3`
- Lines 477-481: `font-size`, `line-height`, `letter-spacing`
- Lines 2531-2535: `font-size`, `line-height`, `margin`
- Replacement assessment: 477-481: partially overridden by final occurrence (font-size, line-height).

### 97. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-drawer-tabs`
- Lines 498-501: `gap`, `margin-bottom`
- Lines 830-843: `display`, `grid-template-columns`, `gap`, `padding`, `margin`, `background`, `border`, `border-radius`, `box-shadow`
- Replacement assessment: 498-501: partially overridden by final occurrence (gap).

### 98. `.qd40-overlay .qd-ui2-drawer-tabs`
- Lines 498-501: `gap`, `margin-bottom`
- Lines 830-843: `display`, `grid-template-columns`, `gap`, `padding`, `margin`, `background`, `border`, `border-radius`, `box-shadow`
- Replacement assessment: 498-501: partially overridden by final occurrence (gap).

### 99. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-drawer-tab`
- Lines 504-508: `min-height`, `padding`, `font-size`
- Lines 846-859: `min-height`, `padding`, `color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`, `box-shadow`
- Replacement assessment: 504-508: fully replaced by final occurrence by property names.

### 100. `.qd40-overlay .qd-ui2-drawer-tab`
- Lines 504-508: `min-height`, `padding`, `font-size`
- Lines 846-859: `min-height`, `padding`, `color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`, `box-shadow`
- Replacement assessment: 504-508: fully replaced by final occurrence by property names.

### 101. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-center-cockpit::before`
- Lines 625-644: `content`, `position`, `z-index`, `top`, `left`, `width`, `height`, `transform`, `pointer-events`, `border`, `border-radius`, `background`, `box-shadow`
- Lines 1074-1076: `height`
- Lines 1304-1307: `display`, `content`
- Replacement assessment: 625-644: partially overridden by final occurrence (content); 1074-1076: not replaced by final occurrence; properties are complementary.

### 102. `.qd40-overlay .qd-ui2-center-cockpit::before`
- Lines 625-644: `content`, `position`, `z-index`, `top`, `left`, `width`, `height`, `transform`, `pointer-events`, `border`, `border-radius`, `background`, `box-shadow`
- Lines 1074-1076: `height`
- Lines 1304-1307: `display`, `content`
- Replacement assessment: 625-644: partially overridden by final occurrence (content); 1074-1076: not replaced by final occurrence; properties are complementary.

### 103. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer`
- Lines 824-826: `gap`
- Lines 5258-5267: `border-color`, `background`, `box-shadow`
- Lines 5733-5758: `background`, `background-size`, `background-position`, `background-repeat`
- Lines 5773-5790: `background-image`, `background-size`, `background-position`, `background-repeat`
- Lines 5817-5823: `background-image`, `background-size`, `background-position`, `background-repeat`, `background-color`
- Lines 5905-5908: `gap`, `padding`
- Replacement assessment: 824-826: fully replaced by final occurrence by property names; 5258-5267: not replaced by final occurrence; properties are complementary; 5733-5758: not replaced by final occurrence; properties are complementary; 5773-5790: not replaced by final occurrence; properties are complementary; 5817-5823: not replaced by final occurrence; properties are complementary.

### 104. `.qd40-overlay .qd-ui2-right-drawer`
- Lines 824-826: `gap`
- Lines 5258-5267: `border-color`, `background`, `box-shadow`
- Lines 5733-5758: `background`, `background-size`, `background-position`, `background-repeat`
- Lines 5773-5790: `background-image`, `background-size`, `background-position`, `background-repeat`
- Lines 5817-5823: `background-image`, `background-size`, `background-position`, `background-repeat`, `background-color`
- Lines 5905-5908: `gap`, `padding`
- Replacement assessment: 824-826: fully replaced by final occurrence by property names; 5258-5267: not replaced by final occurrence; properties are complementary; 5733-5758: not replaced by final occurrence; properties are complementary; 5773-5790: not replaced by final occurrence; properties are complementary; 5817-5823: not replaced by final occurrence; properties are complementary.

### 105. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slots-card`
- Lines 1080-1100: `position`, `z-index`, `width`, `max-height`, `min-height`, `display`, `grid-template-rows`, `gap`, `padding`, `color`, `background`, `border`, `border-radius`, `box-shadow`, `overflow`
- Lines 1318-1325: `margin-top`, `border-color`, `box-shadow`
- Replacement assessment: 1080-1100: partially overridden by final occurrence (box-shadow).

### 106. `.qd40-overlay .qd-ui2-quick-slots-card`
- Lines 1080-1100: `position`, `z-index`, `width`, `max-height`, `min-height`, `display`, `grid-template-rows`, `gap`, `padding`, `color`, `background`, `border`, `border-radius`, `box-shadow`, `overflow`
- Lines 1318-1325: `margin-top`, `border-color`, `box-shadow`
- Replacement assessment: 1080-1100: partially overridden by final occurrence (box-shadow).

### 107. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slots-sections`
- Lines 1137-1143: `min-height`, `overflow`, `display`, `gap`, `padding-right`
- Lines 3605-3608: `gap`, `padding-right`
- Replacement assessment: 1137-1143: partially overridden by final occurrence (gap, padding-right).

### 108. `.qd40-overlay .qd-ui2-quick-slots-sections`
- Lines 1137-1143: `min-height`, `overflow`, `display`, `gap`, `padding-right`
- Lines 3605-3608: `gap`, `padding-right`
- Replacement assessment: 1137-1143: partially overridden by final occurrence (gap, padding-right).

### 109. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-section`
- Lines 1146-1149: `display`, `gap`
- Lines 3611-3613: `gap`
- Replacement assessment: 1146-1149: partially overridden by final occurrence (gap).

### 110. `.qd40-overlay .qd-ui2-quick-slot-section`
- Lines 1146-1149: `display`, `gap`
- Lines 3611-3613: `gap`
- Replacement assessment: 1146-1149: partially overridden by final occurrence (gap).

### 111. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-toggle`
- Lines 1152-1168: `width`, `min-height`, `display`, `justify-content`, `align-items`, `padding`, `color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`
- Lines 3616-3626: `min-height`, `padding`, `border-color`, `border-radius`, `background`, `box-shadow`
- Replacement assessment: 1152-1168: partially overridden by final occurrence (background, border-radius, min-height, padding).

### 112. `.qd40-overlay .qd-ui2-quick-slot-toggle`
- Lines 1152-1168: `width`, `min-height`, `display`, `justify-content`, `align-items`, `padding`, `color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`
- Lines 3616-3626: `min-height`, `padding`, `border-color`, `border-radius`, `background`, `box-shadow`
- Replacement assessment: 1152-1168: partially overridden by final occurrence (background, border-radius, min-height, padding).

### 113. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-toggle small`
- Lines 1171-1180: `display`, `place-items`, `min-width`, `height`, `color`, `background`, `border-radius`, `font-size`
- Lines 3644-3654: `min-width`, `height`, `display`, `place-items`, `border-radius`, `color`, `background`, `font-size`, `font-weight`
- Replacement assessment: 1171-1180: fully replaced by final occurrence by property names.

### 114. `.qd40-overlay .qd-ui2-quick-slot-toggle small`
- Lines 1171-1180: `display`, `place-items`, `min-width`, `height`, `color`, `background`, `border-radius`, `font-size`
- Lines 3644-3654: `min-width`, `height`, `display`, `place-items`, `border-radius`, `color`, `background`, `font-size`, `font-weight`
- Replacement assessment: 1171-1180: fully replaced by final occurrence by property names.

### 115. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-list`
- Lines 1183-1186: `display`, `gap`
- Lines 3657-3659: `gap`
- Replacement assessment: 1183-1186: partially overridden by final occurrence (gap).

### 116. `.qd40-overlay .qd-ui2-quick-slot-list`
- Lines 1183-1186: `display`, `gap`
- Lines 3657-3659: `gap`
- Replacement assessment: 1183-1186: partially overridden by final occurrence (gap).

### 117. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-card`
- Lines 1189-1200: `display`, `grid-template-columns`, `gap`, `align-items`, `min-height`, `padding`, `background`, `border`, `border-radius`
- Lines 3662-3677: `min-height`, `padding`, `border-color`, `border-radius`, `background`, `box-shadow`, `transition`
- Replacement assessment: 1189-1200: partially overridden by final occurrence (background, border-radius, min-height, padding).

### 118. `.qd40-overlay .qd-ui2-quick-slot-card`
- Lines 1189-1200: `display`, `grid-template-columns`, `gap`, `align-items`, `min-height`, `padding`, `background`, `border`, `border-radius`
- Lines 3662-3677: `min-height`, `padding`, `border-color`, `border-radius`, `background`, `box-shadow`, `transition`
- Replacement assessment: 1189-1200: partially overridden by final occurrence (background, border-radius, min-height, padding).

### 119. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-main strong`
- Lines 1210-1217: `overflow`, `color`, `font-size`, `line-height`, `text-overflow`, `white-space`
- Lines 3690-3695: `color`, `font-size`, `line-height`, `font-weight`
- Replacement assessment: 1210-1217: partially overridden by final occurrence (color, font-size, line-height).

### 120. `.qd40-overlay .qd-ui2-quick-slot-main strong`
- Lines 1210-1217: `overflow`, `color`, `font-size`, `line-height`, `text-overflow`, `white-space`
- Lines 3690-3695: `color`, `font-size`, `line-height`, `font-weight`
- Replacement assessment: 1210-1217: partially overridden by final occurrence (color, font-size, line-height).

### 121. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-detail`
- Lines 1222-1229: `overflow`, `color`, `font-size`, `line-height`, `text-overflow`, `white-space`
- Lines 3700-3704: `color`, `font-size`, `line-height`
- Replacement assessment: 1222-1229: partially overridden by final occurrence (color, font-size, line-height).

### 122. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-variant`
- Lines 1222-1229: `overflow`, `color`, `font-size`, `line-height`, `text-overflow`, `white-space`
- Lines 3700-3704: `color`, `font-size`, `line-height`
- Replacement assessment: 1222-1229: partially overridden by final occurrence (color, font-size, line-height).

### 123. `.qd40-overlay .qd-ui2-quick-slot-detail`
- Lines 1222-1229: `overflow`, `color`, `font-size`, `line-height`, `text-overflow`, `white-space`
- Lines 3700-3704: `color`, `font-size`, `line-height`
- Replacement assessment: 1222-1229: partially overridden by final occurrence (color, font-size, line-height).

### 124. `.qd40-overlay .qd-ui2-quick-slot-variant`
- Lines 1222-1229: `overflow`, `color`, `font-size`, `line-height`, `text-overflow`, `white-space`
- Lines 3700-3704: `color`, `font-size`, `line-height`
- Replacement assessment: 1222-1229: partially overridden by final occurrence (color, font-size, line-height).

### 125. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-button`
- Lines 1248-1257: `min-height`, `padding`, `color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`
- Lines 3721-3724: `min-height`, `border-radius`
- Replacement assessment: 1248-1257: partially overridden by final occurrence (border-radius, min-height).

### 126. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-icon`
- Lines 1248-1257: `min-height`, `padding`, `color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`
- Lines 1260-1264: `width`, `min-width`, `padding`
- Lines 3721-3724: `min-height`, `border-radius`
- Replacement assessment: 1248-1257: partially overridden by final occurrence (border-radius, min-height); 1260-1264: not replaced by final occurrence; properties are complementary.

### 127. `.qd40-overlay .qd-ui2-quick-slot-button`
- Lines 1248-1257: `min-height`, `padding`, `color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`
- Lines 3721-3724: `min-height`, `border-radius`
- Replacement assessment: 1248-1257: partially overridden by final occurrence (border-radius, min-height).

### 128. `.qd40-overlay .qd-ui2-quick-slot-icon`
- Lines 1248-1257: `min-height`, `padding`, `color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`
- Lines 1260-1264: `width`, `min-width`, `padding`
- Lines 3721-3724: `min-height`, `border-radius`
- Replacement assessment: 1248-1257: partially overridden by final occurrence (border-radius, min-height); 1260-1264: not replaced by final occurrence; properties are complementary.

### 129. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-button.is-primary`
- Lines 1267-1271: `color`, `background`, `border-color`
- Lines 3727-3732: `color`, `box-shadow`
- Replacement assessment: 1267-1271: partially overridden by final occurrence (color).

### 130. `.qd40-overlay .qd-ui2-quick-slot-button.is-primary`
- Lines 1267-1271: `color`, `background`, `border-color`
- Lines 3727-3732: `color`, `box-shadow`
- Replacement assessment: 1267-1271: partially overridden by final occurrence (color).

### 131. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-empty`
- Lines 1281-1289: `padding`, `color`, `background`, `border`, `border-radius`, `font-size`, `text-align`
- Lines 3707-3716: `padding`, `color`, `border`, `border-radius`, `background`, `font-size`, `text-align`
- Replacement assessment: 1281-1289: fully replaced by final occurrence by property names.

### 132. `.qd40-overlay .qd-ui2-quick-slot-empty`
- Lines 1281-1289: `padding`, `color`, `background`, `border`, `border-radius`, `font-size`, `text-align`
- Lines 3707-3716: `padding`, `color`, `border`, `border-radius`, `background`, `font-size`, `text-align`
- Replacement assessment: 1281-1289: fully replaced by final occurrence by property names.

### 133. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-carousel-portrait-button.is-active`
- Lines 1385-1392: `opacity`, `transform`, `border-color`, `box-shadow`
- Lines 5126-5132: `border-color`, `box-shadow`
- Replacement assessment: 1385-1392: partially overridden by final occurrence (border-color, box-shadow).

### 134. `.qd40-overlay .qd-ui2-carousel-portrait-button.is-active`
- Lines 1385-1392: `opacity`, `transform`, `border-color`, `box-shadow`
- Lines 5126-5132: `border-color`, `box-shadow`
- Replacement assessment: 1385-1392: partially overridden by final occurrence (border-color, box-shadow).

### 135. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-card-carousel`
- Lines 1446-1458: `width`, `min-width`, `max-width`, `height`, `min-height`, `display`, `grid-template-columns`, `gap`, `padding`, `margin`, `align-self`
- Lines 1578-1588: `grid-area`, `justify-self`, `align-self`, `width`, `min-width`, `max-width`, `height`, `min-height`, `margin`
- Lines 1675-1685: `grid-area`, `justify-self`, `align-self`, `width`, `min-width`, `max-width`, `height`, `min-height`, `margin`
- Lines 5045-5054: `border-color`, `border-radius`, `background`, `box-shadow`, `overflow`
- Replacement assessment: 1446-1458: not replaced by final occurrence; properties are complementary; 1578-1588: not replaced by final occurrence; properties are complementary; 1675-1685: not replaced by final occurrence; properties are complementary.

### 136. `.qd40-overlay .qd-ui2-card-carousel`
- Lines 1446-1458: `width`, `min-width`, `max-width`, `height`, `min-height`, `display`, `grid-template-columns`, `gap`, `padding`, `margin`, `align-self`
- Lines 1578-1588: `grid-area`, `justify-self`, `align-self`, `width`, `min-width`, `max-width`, `height`, `min-height`, `margin`
- Lines 1675-1685: `grid-area`, `justify-self`, `align-self`, `width`, `min-width`, `max-width`, `height`, `min-height`, `margin`
- Lines 1764-1766: `overflow`
- Lines 5045-5054: `border-color`, `border-radius`, `background`, `box-shadow`, `overflow`
- Replacement assessment: 1446-1458: not replaced by final occurrence; properties are complementary; 1578-1588: not replaced by final occurrence; properties are complementary; 1675-1685: not replaced by final occurrence; properties are complementary; 1764-1766: fully replaced by final occurrence by property names.

### 137. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-card-carousel .qd-ui2-carousel-track`
- Lines 1461-1467: `width`, `max-width`, `min-width`, `height`, `gap`
- Lines 1764-1766: `overflow`
- Lines 5057-5062: `gap`, `padding`, `align-items`, `overflow`
- Replacement assessment: 1461-1467: partially overridden by final occurrence (gap); 1764-1766: fully replaced by final occurrence by property names.

### 138. `.qd40-overlay .qd-ui2-card-carousel .qd-ui2-carousel-track`
- Lines 1461-1467: `width`, `max-width`, `min-width`, `height`, `gap`
- Lines 1748-1752: `overflow`, `scroll-snap-type`, `scroll-behavior`
- Lines 1764-1766: `overflow`
- Lines 5057-5062: `gap`, `padding`, `align-items`, `overflow`
- Replacement assessment: 1461-1467: partially overridden by final occurrence (gap); 1748-1752: partially overridden by final occurrence (overflow); 1764-1766: fully replaced by final occurrence by property names.

### 139. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-card-carousel .qd-ui2-carousel-portrait-button`
- Lines 1470-1475: `width`, `height`, `min-width`, `flex-basis`
- Lines 1755-1758: `flex`, `scroll-snap-align`
- Lines 1770-1780: `position`, `z-index`, `transform-origin`, `transition`
- Replacement assessment: 1470-1475: not replaced by final occurrence; properties are complementary; 1755-1758: not replaced by final occurrence; properties are complementary.

### 140. `.qd40-overlay .qd-ui2-card-carousel .qd-ui2-carousel-portrait-button`
- Lines 1470-1475: `width`, `height`, `min-width`, `flex-basis`
- Lines 1755-1758: `flex`, `scroll-snap-align`
- Lines 1770-1780: `position`, `z-index`, `transform-origin`, `transition`
- Replacement assessment: 1470-1475: not replaced by final occurrence; properties are complementary; 1755-1758: not replaced by final occurrence; properties are complementary.

### 141. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-card-carousel .qd-ui2-carousel-arrow`
- Lines 1478-1483: `width`, `min-width`, `height`, `font-size`
- Lines 5065-5079: `border-radius`, `color`, `border`, `background`, `box-shadow`, `transition`
- Replacement assessment: 1478-1483: not replaced by final occurrence; properties are complementary.

### 142. `.qd40-overlay .qd-ui2-card-carousel .qd-ui2-carousel-arrow`
- Lines 1478-1483: `width`, `min-width`, `height`, `font-size`
- Lines 5065-5079: `border-radius`, `color`, `border`, `background`, `box-shadow`, `transition`
- Replacement assessment: 1478-1483: not replaced by final occurrence; properties are complementary.

### 143. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-shell.qd-ui2-left-open.qd-ui2-right-open .qd-ui2-card-carousel`
- Lines 1504-1509: `justify-self`, `width`, `min-width`, `max-width`
- Lines 1624-1628: `width`, `min-width`, `max-width`
- Lines 1724-1728: `width`, `min-width`, `max-width`
- Replacement assessment: 1504-1509: partially overridden by final occurrence (max-width, min-width, width); 1624-1628: fully replaced by final occurrence by property names.

### 144. `.qd40-overlay .qd-ui2-shell.qd-ui2-left-open.qd-ui2-right-open .qd-ui2-card-carousel`
- Lines 1504-1509: `justify-self`, `width`, `min-width`, `max-width`
- Lines 1624-1628: `width`, `min-width`, `max-width`
- Lines 1724-1728: `width`, `min-width`, `max-width`
- Lines 1739-1741: `translate`
- Replacement assessment: 1504-1509: not replaced by final occurrence; properties are complementary; 1624-1628: not replaced by final occurrence; properties are complementary; 1724-1728: not replaced by final occurrence; properties are complementary.

### 145. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-shell.qd-ui2-left-open.qd-ui2-right-open .qd-ui2-actor-name`
- Lines 1617-1621: `width`, `max-width`, `font-size`
- Lines 1717-1721: `width`, `max-width`, `font-size`
- Replacement assessment: 1617-1621: fully replaced by final occurrence by property names.

### 146. `.qd40-overlay .qd-ui2-shell.qd-ui2-left-open.qd-ui2-right-open .qd-ui2-actor-name`
- Lines 1617-1621: `width`, `max-width`, `font-size`
- Lines 1717-1721: `width`, `max-width`, `font-size`
- Replacement assessment: 1617-1621: fully replaced by final occurrence by property names.

### 147. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-vital-input`
- Lines 1823-1836: `width`, `min-width`, `height`, `padding`, `color`, `text-align`, `font`, `font-weight`, `background`, `border`, `border-radius`, `box-shadow`
- Lines 1928-1942: `width`, `min-width`, `height`, `padding`, `color`, `text-align`, `font`, `font-weight`, `background`, `border`, `border-radius`, `box-shadow`, `text-shadow`
- Lines 4594-4599: `color`, `font-size`, `font-weight`, `text-align`
- Lines 5185-5190: `background`, `border`, `box-shadow`, `appearance`
- Lines 5249-5251: `user-select`
- Replacement assessment: 1823-1836: not replaced by final occurrence; properties are complementary; 1928-1942: not replaced by final occurrence; properties are complementary; 4594-4599: not replaced by final occurrence; properties are complementary; 5185-5190: not replaced by final occurrence; properties are complementary.

### 148. `.qd40-overlay .qd-ui2-vital-input`
- Lines 1823-1836: `width`, `min-width`, `height`, `padding`, `color`, `text-align`, `font`, `font-weight`, `background`, `border`, `border-radius`, `box-shadow`
- Lines 1876-1889: `width`, `min-width`, `height`, `padding`, `color`, `text-align`, `font`, `font-weight`, `background`, `border`, `border-radius`, `box-shadow`
- Lines 1928-1942: `width`, `min-width`, `height`, `padding`, `color`, `text-align`, `font`, `font-weight`, `background`, `border`, `border-radius`, `box-shadow`, `text-shadow`
- Lines 4594-4599: `color`, `font-size`, `font-weight`, `text-align`
- Lines 5185-5190: `background`, `border`, `box-shadow`, `appearance`
- Lines 5249-5251: `user-select`
- Replacement assessment: 1823-1836: not replaced by final occurrence; properties are complementary; 1876-1889: not replaced by final occurrence; properties are complementary; 1928-1942: not replaced by final occurrence; properties are complementary; 4594-4599: not replaced by final occurrence; properties are complementary; 5185-5190: not replaced by final occurrence; properties are complementary.

### 149. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-vital-input:hover`
- Lines 1839-1841: `border-color`
- Lines 1892-1896: `background`, `border`, `box-shadow`
- Lines 1947-1953: `background`, `border`, `box-shadow`, `outline`, `color`
- Replacement assessment: 1839-1841: not replaced by final occurrence; properties are complementary; 1892-1896: fully replaced by final occurrence by property names.

### 150. `.qd40-overlay .qd-ui2-vital-input:hover`
- Lines 1839-1841: `border-color`
- Lines 1892-1896: `background`, `border`, `box-shadow`
- Lines 1947-1953: `background`, `border`, `box-shadow`, `outline`, `color`
- Replacement assessment: 1839-1841: not replaced by final occurrence; properties are complementary; 1892-1896: fully replaced by final occurrence by property names.

### 151. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-vital-input:focus`
- Lines 1844-1852: `outline`, `color`, `border-color`, `box-shadow`
- Lines 1899-1906: `outline`, `outline-offset`, `color`, `background`, `border`, `box-shadow`
- Lines 1947-1953: `background`, `border`, `box-shadow`, `outline`, `color`
- Replacement assessment: 1844-1852: partially overridden by final occurrence (box-shadow, color, outline); 1899-1906: partially overridden by final occurrence (background, border, box-shadow, color, outline).

### 152. `.qd40-overlay .qd-ui2-vital-input:focus`
- Lines 1844-1852: `outline`, `color`, `border-color`, `box-shadow`
- Lines 1899-1906: `outline`, `outline-offset`, `color`, `background`, `border`, `box-shadow`
- Lines 1947-1953: `background`, `border`, `box-shadow`, `outline`, `color`
- Replacement assessment: 1844-1852: partially overridden by final occurrence (box-shadow, color, outline); 1899-1906: partially overridden by final occurrence (background, border, box-shadow, color, outline).

### 153. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-vital-max`
- Lines 1855-1858: `color`, `font-weight`
- Lines 1910-1912: `margin-left`
- Lines 1956-1962: `color`, `background`, `border`, `box-shadow`, `text-shadow`
- Lines 4602-4605: `color`, `font-size`
- Replacement assessment: 1855-1858: partially overridden by final occurrence (color); 1910-1912: not replaced by final occurrence; properties are complementary; 1956-1962: partially overridden by final occurrence (color).

### 154. `.qd40-overlay .qd-ui2-vital-max`
- Lines 1855-1858: `color`, `font-weight`
- Lines 1910-1912: `margin-left`
- Lines 1956-1962: `color`, `background`, `border`, `box-shadow`, `text-shadow`
- Lines 4602-4605: `color`, `font-size`
- Replacement assessment: 1855-1858: partially overridden by final occurrence (color); 1910-1912: not replaced by final occurrence; properties are complementary; 1956-1962: partially overridden by final occurrence (color).

### 155. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-vital-input::-webkit-outer-spin-button`
- Lines 1864-1867: `margin`, `-webkit-appearance`
- Lines 5195-5198: `-webkit-appearance`, `margin`
- Replacement assessment: 1864-1867: fully replaced by final occurrence by property names.

### 156. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-vital-input::-webkit-inner-spin-button`
- Lines 1864-1867: `margin`, `-webkit-appearance`
- Lines 5195-5198: `-webkit-appearance`, `margin`
- Replacement assessment: 1864-1867: fully replaced by final occurrence by property names.

### 157. `.qd40-overlay .qd-ui2-vital-input::-webkit-outer-spin-button`
- Lines 1864-1867: `margin`, `-webkit-appearance`
- Lines 5195-5198: `-webkit-appearance`, `margin`
- Replacement assessment: 1864-1867: fully replaced by final occurrence by property names.

### 158. `.qd40-overlay .qd-ui2-vital-input::-webkit-inner-spin-button`
- Lines 1864-1867: `margin`, `-webkit-appearance`
- Lines 5195-5198: `-webkit-appearance`, `margin`
- Replacement assessment: 1864-1867: fully replaced by final occurrence by property names.

### 159. `.qd40-overlay .qd-ui2-portrait-stack`
- Lines 1965-1970: `grid-area`, `display`, `justify-items`, `gap`
- Lines 4932-4936: `gap`, `align-items`, `justify-content`
- Replacement assessment: 1965-1970: partially overridden by final occurrence (gap).

### 160. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-drop-token-button`
- Lines 1978-1994: `min-height`, `width`, `padding`, `color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`, `box-shadow`
- Lines 4967-4993: `width`, `min-height`, `height`, `padding`, `display`, `place-items`, `border-radius`, `border`, `color`, `background`, `box-shadow`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `white-space`, `transition`
- Replacement assessment: 1978-1994: partially overridden by final occurrence (background, border, border-radius, box-shadow, color, font-size, font-weight, letter-spacing, min-height, padding, width).

### 161. `.qd40-overlay .qd-ui2-drop-token-button`
- Lines 1978-1994: `min-height`, `width`, `padding`, `color`, `background`, `border`, `border-radius`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`, `box-shadow`
- Lines 4967-4993: `width`, `min-height`, `height`, `padding`, `display`, `place-items`, `border-radius`, `border`, `color`, `background`, `box-shadow`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `white-space`, `transition`
- Replacement assessment: 1978-1994: partially overridden by final occurrence (background, border, border-radius, box-shadow, color, font-size, font-weight, letter-spacing, min-height, padding, width).

### 162. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-drop-token-button:hover`
- Lines 1997-2001: `color`, `border-color`, `filter`
- Lines 4996-5004: `transform`, `filter`, `border-color`, `box-shadow`
- Replacement assessment: 1997-2001: partially overridden by final occurrence (border-color, filter).

### 163. `.qd40-overlay .qd-ui2-drop-token-button:hover`
- Lines 1997-2001: `color`, `border-color`, `filter`
- Lines 4996-5004: `transform`, `filter`, `border-color`, `box-shadow`
- Replacement assessment: 1997-2001: partially overridden by final occurrence (border-color, filter).

### 164. `.qd40-overlay .qd-ui2-carousel-portrait-button.is-current-turn`
- Lines 2007-2012: `border-color`, `box-shadow`
- Lines 5135-5141: `border-color`, `box-shadow`
- Replacement assessment: 2007-2012: fully replaced by final occurrence by property names.

### 165. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-carousel-turn-marker`
- Lines 2015-2027: `position`, `right`, `top`, `z-index`, `color`, `font-size`, `line-height`, `text-shadow`, `pointer-events`
- Lines 5149-5154: `color`, `text-shadow`
- Replacement assessment: 2015-2027: partially overridden by final occurrence (color, text-shadow).

### 166. `.qd40-overlay .qd-ui2-carousel-turn-marker`
- Lines 2015-2027: `position`, `right`, `top`, `z-index`, `color`, `font-size`, `line-height`, `text-shadow`, `pointer-events`
- Lines 5149-5154: `color`, `text-shadow`
- Replacement assessment: 2015-2027: partially overridden by final occurrence (color, text-shadow).

### 167. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-mass-drop-token-button`
- Lines 2031-2034: `font-size`, `letter-spacing`
- Lines 5026-5031: `color`, `background`, `border-color`
- Replacement assessment: 2031-2034: not replaced by final occurrence; properties are complementary.

### 168. `.qd40-overlay .qd-ui2-mass-drop-token-button`
- Lines 2031-2034: `font-size`, `letter-spacing`
- Lines 5026-5031: `color`, `background`, `border-color`
- Replacement assessment: 2031-2034: not replaced by final occurrence; properties are complementary.

### 169. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-mass-drop-token-button:hover`
- Lines 2037-2039: `border-color`
- Lines 5034-5040: `border-color`, `box-shadow`
- Replacement assessment: 2037-2039: fully replaced by final occurrence by property names.

### 170. `.qd40-overlay .qd-ui2-mass-drop-token-button:hover`
- Lines 2037-2039: `border-color`
- Lines 5034-5040: `border-color`, `box-shadow`
- Replacement assessment: 2037-2039: fully replaced by final occurrence by property names.

### 171. `.qd-ui2-mass-drop-reticle-ring::before`
- Lines 2069-2077: `content`, `position`, `left`, `top`, `background`, `box-shadow`, `translate`
- Lines 2079-2079: `width`, `height`
- Replacement assessment: 2069-2077: not replaced by final occurrence; properties are complementary.

### 172. `.qd-ui2-mass-drop-reticle-ring::after`
- Lines 2069-2077: `content`, `position`, `left`, `top`, `background`, `box-shadow`, `translate`
- Lines 2080-2080: `width`, `height`
- Replacement assessment: 2069-2077: not replaced by final occurrence; properties are complementary.

### 173. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-pending-damage-card`
- Lines 2097-2111: `display`, `grid-template-columns`, `align-items`, `gap`, `margin`, `padding`, `border`, `border-radius`, `background`, `box-shadow`
- Lines 2438-2440: `display`
- Replacement assessment: 2097-2111: partially overridden by final occurrence (display).

### 174. `.qd40-overlay .qd-ui2-pending-damage-card`
- Lines 2097-2111: `display`, `grid-template-columns`, `align-items`, `gap`, `margin`, `padding`, `border`, `border-radius`, `background`, `box-shadow`
- Lines 2438-2440: `display`
- Replacement assessment: 2097-2111: partially overridden by final occurrence (display).

### 175. `.qd-ui2-pending-damage-popup`
- Lines 2171-2190: `position`, `right`, `bottom`, `z-index`, `width`, `display`, `gap`, `padding`, `color`, `border`, `border-radius`, `background`, `box-shadow`
- Lines 2292-2311: `position`, `right`, `bottom`, `z-index`, `width`, `display`, `gap`, `padding`, `color`, `border`, `border-radius`, `background`, `box-shadow`
- Replacement assessment: 2171-2190: fully replaced by final occurrence by property names.

### 176. `.qd-ui2-pending-damage-popup-main`
- Lines 2192-2196: `min-width`, `display`, `gap`
- Lines 2313-2317: `min-width`, `display`, `gap`
- Replacement assessment: 2192-2196: fully replaced by final occurrence by property names.

### 177. `.qd-ui2-pending-damage-popup-kicker`
- Lines 2198-2204: `color`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`
- Lines 2319-2325: `color`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`
- Replacement assessment: 2198-2204: fully replaced by final occurrence by property names.

### 178. `.qd-ui2-pending-damage-popup strong`
- Lines 2206-2212: `overflow`, `color`, `font-size`, `text-overflow`, `white-space`
- Lines 2327-2333: `overflow`, `color`, `font-size`, `text-overflow`, `white-space`
- Replacement assessment: 2206-2212: fully replaced by final occurrence by property names.

### 179. `.qd-ui2-pending-damage-popup small`
- Lines 2214-2220: `overflow`, `color`, `font-size`, `text-overflow`, `white-space`
- Lines 2335-2341: `overflow`, `color`, `font-size`, `text-overflow`, `white-space`
- Replacement assessment: 2214-2220: fully replaced by final occurrence by property names.

### 180. `.qd-ui2-pending-damage-popup-controls`
- Lines 2222-2227: `display`, `align-items`, `gap`, `flex-wrap`
- Lines 2366-2371: `display`, `align-items`, `gap`, `flex-wrap`
- Replacement assessment: 2222-2227: fully replaced by final occurrence by property names.

### 181. `.qd-ui2-pending-damage-popup button`
- Lines 2229-2241: `min-height`, `padding`, `color`, `border`, `border-radius`, `background`, `font-size`, `font-weight`, `letter-spacing`, `cursor`
- Lines 2373-2385: `min-height`, `padding`, `color`, `border`, `border-radius`, `background`, `font-size`, `font-weight`, `letter-spacing`, `cursor`
- Replacement assessment: 2229-2241: fully replaced by final occurrence by property names.

### 182. `.qd-ui2-pending-damage-popup button:hover`
- Lines 2243-2246: `border-color`, `box-shadow`
- Lines 2387-2390: `border-color`, `box-shadow`
- Replacement assessment: 2243-2246: fully replaced by final occurrence by property names.

### 183. `.qd-ui2-pending-damage-target-reticle`
- Lines 2248-2266: `position`, `left`, `top`, `z-index`, `width`, `height`, `translate`, `pointer-events`, `display`, `place-items`, `color`, `font-family`, `font-weight`, `text-transform`, `text-shadow`
- Lines 2392-2410: `position`, `left`, `top`, `z-index`, `width`, `height`, `translate`, `pointer-events`, `display`, `place-items`, `color`, `font-family`, `font-weight`, `text-transform`, `text-shadow`
- Replacement assessment: 2248-2266: fully replaced by final occurrence by property names.

### 184. `.qd-ui2-pending-damage-target-reticle img`
- Lines 2268-2276: `width`, `height`, `object-fit`, `filter`, `opacity`
- Lines 2412-2420: `width`, `height`, `object-fit`, `filter`, `opacity`
- Replacement assessment: 2268-2276: fully replaced by final occurrence by property names.

### 185. `.qd-ui2-pending-damage-target-reticle span`
- Lines 2278-2288: `position`, `top`, `padding`, `border`, `border-radius`, `background`, `font-size`, `letter-spacing`, `white-space`
- Lines 2422-2432: `position`, `top`, `padding`, `border`, `border-radius`, `background`, `font-size`, `letter-spacing`, `white-space`
- Replacement assessment: 2278-2288: fully replaced by final occurrence by property names.

### 186. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-inactive-roster-add`
- Lines 2543-2551: `min-width`, `width`, `height`, `padding`, `font-size`, `font-weight`, `line-height`
- Lines 6120-6144: `width`, `min-width`, `max-width`, `height`, `min-height`, `max-height`, `padding`, `display`, `place-items`, `border-radius`, `font-size`, `font-weight`, `line-height`, `text-align`, `cursor`, `transform`, `animation`, `transition`
- Lines 6148-6157: `color`, `border`, `background`, `box-shadow`
- Replacement assessment: 2543-2551: not replaced by final occurrence; properties are complementary; 6120-6144: not replaced by final occurrence; properties are complementary.

### 187. `.qd40-overlay .qd-ui2-inactive-roster-add`
- Lines 2543-2551: `min-width`, `width`, `height`, `padding`, `font-size`, `font-weight`, `line-height`
- Lines 6120-6144: `width`, `min-width`, `max-width`, `height`, `min-height`, `max-height`, `padding`, `display`, `place-items`, `border-radius`, `font-size`, `font-weight`, `line-height`, `text-align`, `cursor`, `transform`, `animation`, `transition`
- Lines 6148-6157: `color`, `border`, `background`, `box-shadow`
- Replacement assessment: 2543-2551: not replaced by final occurrence; properties are complementary; 6120-6144: not replaced by final occurrence; properties are complementary.

### 188. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-active-roster-row:hover`
- Lines 2564-2569: `min-height`, `height`, `transform`, `z-index`
- Lines 2582-2585: `grid-template-columns`, `gap`
- Replacement assessment: 2564-2569: not replaced by final occurrence; properties are complementary.

### 189. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-inactive-roster-row:hover`
- Lines 2564-2569: `min-height`, `height`, `transform`, `z-index`
- Lines 2588-2591: `grid-template-columns`, `gap`
- Replacement assessment: 2564-2569: not replaced by final occurrence; properties are complementary.

### 190. `.qd40-overlay .qd-ui2-active-roster-row:hover`
- Lines 2564-2569: `min-height`, `height`, `transform`, `z-index`
- Lines 2582-2585: `grid-template-columns`, `gap`
- Replacement assessment: 2564-2569: not replaced by final occurrence; properties are complementary.

### 191. `.qd40-overlay .qd-ui2-inactive-roster-row:hover`
- Lines 2564-2569: `min-height`, `height`, `transform`, `z-index`
- Lines 2588-2591: `grid-template-columns`, `gap`
- Replacement assessment: 2564-2569: not replaced by final occurrence; properties are complementary.

### 192. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-drawer-tabs`
- Lines 2633-2636: `gap`, `margin-bottom`
- Lines 3038-3040: `margin-bottom`
- Lines 3121-3123: `margin-bottom`
- Lines 5271-5282: `min-height`, `padding`, `gap`, `border`, `border-radius`, `background`, `box-shadow`
- Lines 5764-5767: `background`
- Lines 5794-5801: `background-image`, `background-size`, `background-position`, `background-repeat`
- Lines 5829-5836: `background-image`, `background-size`, `background-position`, `background-repeat`
- Lines 5911-5915: `min-height`, `padding`, `gap`
- Replacement assessment: 2633-2636: partially overridden by final occurrence (gap); 3038-3040: not replaced by final occurrence; properties are complementary; 3121-3123: not replaced by final occurrence; properties are complementary; 5271-5282: partially overridden by final occurrence (gap, min-height, padding); 5764-5767: not replaced by final occurrence; properties are complementary; 5794-5801: not replaced by final occurrence; properties are complementary; 5829-5836: not replaced by final occurrence; properties are complementary.

### 193. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-drawer-tabs`
- Lines 2633-2636: `gap`, `margin-bottom`
- Lines 3038-3040: `margin-bottom`
- Lines 3121-3123: `margin-bottom`
- Lines 5271-5282: `min-height`, `padding`, `gap`, `border`, `border-radius`, `background`, `box-shadow`
- Lines 5764-5767: `background`
- Lines 5794-5801: `background-image`, `background-size`, `background-position`, `background-repeat`
- Lines 5829-5836: `background-image`, `background-size`, `background-position`, `background-repeat`
- Lines 5911-5915: `min-height`, `padding`, `gap`
- Replacement assessment: 2633-2636: partially overridden by final occurrence (gap); 3038-3040: not replaced by final occurrence; properties are complementary; 3121-3123: not replaced by final occurrence; properties are complementary; 5271-5282: partially overridden by final occurrence (gap, min-height, padding); 5764-5767: not replaced by final occurrence; properties are complementary; 5794-5801: not replaced by final occurrence; properties are complementary; 5829-5836: not replaced by final occurrence; properties are complementary.

### 194. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-drawer-tab`
- Lines 2639-2643: `min-height`, `padding`, `font-size`
- Lines 2745-2747: `cursor`
- Lines 5286-5307: `min-height`, `padding`, `border-radius`, `border`, `color`, `background`, `box-shadow`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`, `transition`
- Lines 5918-5922: `min-height`, `padding`, `font-size`
- Replacement assessment: 2639-2643: fully replaced by final occurrence by property names; 2745-2747: not replaced by final occurrence; properties are complementary; 5286-5307: partially overridden by final occurrence (font-size, min-height, padding).

### 195. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-drawer-tab`
- Lines 2639-2643: `min-height`, `padding`, `font-size`
- Lines 2745-2747: `cursor`
- Lines 5286-5307: `min-height`, `padding`, `border-radius`, `border`, `color`, `background`, `box-shadow`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`, `transition`
- Lines 5918-5922: `min-height`, `padding`, `font-size`
- Replacement assessment: 2639-2643: fully replaced by final occurrence by property names; 2745-2747: not replaced by final occurrence; properties are complementary; 5286-5307: partially overridden by final occurrence (font-size, min-height, padding).

### 196. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-search-row`
- Lines 2665-2669: `grid-template-columns`, `gap`, `margin-bottom`
- Lines 3053-3056: `margin-top`, `margin-bottom`
- Lines 5348-5362: `min-height`, `margin`, `padding`, `display`, `grid-template-columns`, `gap`, `border`, `border-radius`, `background`, `box-shadow`
- Lines 5764-5767: `background`
- Lines 5804-5811: `background-image`, `background-size`, `background-position`, `background-repeat`
- Lines 5829-5836: `background-image`, `background-size`, `background-position`, `background-repeat`
- Lines 5933-5935: `margin-bottom`
- Lines 6011-6016: `min-height`, `padding`, `grid-template-columns`, `border-radius`
- Replacement assessment: 2665-2669: partially overridden by final occurrence (grid-template-columns); 3053-3056: not replaced by final occurrence; properties are complementary; 5348-5362: partially overridden by final occurrence (border-radius, grid-template-columns, min-height, padding); 5764-5767: not replaced by final occurrence; properties are complementary; 5804-5811: not replaced by final occurrence; properties are complementary; 5829-5836: not replaced by final occurrence; properties are complementary; 5933-5935: not replaced by final occurrence; properties are complementary.

### 197. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-search-row`
- Lines 2665-2669: `grid-template-columns`, `gap`, `margin-bottom`
- Lines 3053-3056: `margin-top`, `margin-bottom`
- Lines 5348-5362: `min-height`, `margin`, `padding`, `display`, `grid-template-columns`, `gap`, `border`, `border-radius`, `background`, `box-shadow`
- Lines 5764-5767: `background`
- Lines 5804-5811: `background-image`, `background-size`, `background-position`, `background-repeat`
- Lines 5829-5836: `background-image`, `background-size`, `background-position`, `background-repeat`
- Lines 5933-5935: `margin-bottom`
- Lines 6011-6016: `min-height`, `padding`, `grid-template-columns`, `border-radius`
- Replacement assessment: 2665-2669: partially overridden by final occurrence (grid-template-columns); 3053-3056: not replaced by final occurrence; properties are complementary; 5348-5362: partially overridden by final occurrence (border-radius, grid-template-columns, min-height, padding); 5764-5767: not replaced by final occurrence; properties are complementary; 5804-5811: not replaced by final occurrence; properties are complementary; 5829-5836: not replaced by final occurrence; properties are complementary; 5933-5935: not replaced by final occurrence; properties are complementary.

### 198. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-search-row input`
- Lines 2672-2677: `min-height`, `height`, `padding`, `font-size`
- Lines 3151-3154: `height`, `min-height`
- Lines 5365-5377: `height`, `min-height`, `padding`, `color`, `background`, `background-color`, `border`, `border-radius`, `font-size`, `font-weight`
- Lines 6020-6032: `height`, `min-height`, `padding`, `color`, `background`, `background-image`, `background-color`, `border`, `border-radius`, `box-shadow`, `outline`
- Replacement assessment: 2672-2677: partially overridden by final occurrence (height, min-height, padding); 3151-3154: fully replaced by final occurrence by property names; 5365-5377: partially overridden by final occurrence (background, background-color, border, border-radius, color, height, min-height, padding).

### 199. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-search-row input`
- Lines 2672-2677: `min-height`, `height`, `padding`, `font-size`
- Lines 3151-3154: `height`, `min-height`
- Lines 5365-5377: `height`, `min-height`, `padding`, `color`, `background`, `background-color`, `border`, `border-radius`, `font-size`, `font-weight`
- Lines 6020-6032: `height`, `min-height`, `padding`, `color`, `background`, `background-image`, `background-color`, `border`, `border-radius`, `box-shadow`, `outline`
- Replacement assessment: 2672-2677: partially overridden by final occurrence (height, min-height, padding); 3151-3154: fully replaced by final occurrence by property names; 5365-5377: partially overridden by final occurrence (background, background-color, border, border-radius, color, height, min-height, padding).

### 200. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-search-clear`
- Lines 2680-2693: `width`, `min-width`, `height`, `min-height`, `padding`, `display`, `place-items`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `text-transform`
- Lines 5397-5418: `width`, `min-width`, `height`, `min-height`, `display`, `place-items`, `padding`, `border-radius`, `color`, `border`, `background`, `font-size`, `font-weight`, `line-height`, `transition`
- Lines 6054-6059: `width`, `min-width`, `height`, `min-height`
- Replacement assessment: 2680-2693: partially overridden by final occurrence (height, min-height, min-width, width); 5397-5418: partially overridden by final occurrence (height, min-height, min-width, width).

### 201. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-search-clear`
- Lines 2680-2693: `width`, `min-width`, `height`, `min-height`, `padding`, `display`, `place-items`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `text-transform`
- Lines 5397-5418: `width`, `min-width`, `height`, `min-height`, `display`, `place-items`, `padding`, `border-radius`, `color`, `border`, `background`, `font-size`, `font-weight`, `line-height`, `transition`
- Lines 6054-6059: `width`, `min-width`, `height`, `min-height`
- Replacement assessment: 2680-2693: partially overridden by final occurrence (height, min-height, min-width, width); 5397-5418: partially overridden by final occurrence (height, min-height, min-width, width).

### 202. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row`
- Lines 2696-2701: `min-height`, `gap`, `padding`, `margin-bottom`
- Lines 2837-2842: `position`, `min-height`, `padding`, `overflow`
- Lines 3158-3161: `margin-top`, `margin-bottom`
- Lines 5439-5447: `border-radius`, `transition`
- Lines 5840-5842: `background-blend-mode`
- Lines 5938-5940: `margin-bottom`
- Lines 5948-5950: `min-width`
- Replacement assessment: 2696-2701: not replaced by final occurrence; properties are complementary; 2837-2842: not replaced by final occurrence; properties are complementary; 3158-3161: not replaced by final occurrence; properties are complementary; 5439-5447: not replaced by final occurrence; properties are complementary; 5840-5842: not replaced by final occurrence; properties are complementary; 5938-5940: not replaced by final occurrence; properties are complementary.

### 203. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row`
- Lines 2696-2701: `min-height`, `gap`, `padding`, `margin-bottom`
- Lines 2837-2842: `position`, `min-height`, `padding`, `overflow`
- Lines 3158-3161: `margin-top`, `margin-bottom`
- Lines 5439-5447: `border-radius`, `transition`
- Lines 5840-5842: `background-blend-mode`
- Lines 5938-5940: `margin-bottom`
- Lines 5948-5950: `min-width`
- Replacement assessment: 2696-2701: not replaced by final occurrence; properties are complementary; 2837-2842: not replaced by final occurrence; properties are complementary; 3158-3161: not replaced by final occurrence; properties are complementary; 5439-5447: not replaced by final occurrence; properties are complementary; 5840-5842: not replaced by final occurrence; properties are complementary; 5938-5940: not replaced by final occurrence; properties are complementary.

### 204. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row.is-favorite`
- Lines 2704-2710: `border-color`, `box-shadow`
- Lines 5511-5513: `filter`
- Replacement assessment: 2704-2710: not replaced by final occurrence; properties are complementary.

### 205. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row.is-favorite`
- Lines 2704-2710: `border-color`, `box-shadow`
- Lines 5511-5513: `filter`
- Replacement assessment: 2704-2710: not replaced by final occurrence; properties are complementary.

### 206. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-reference-button`
- Lines 2713-2717: `min-height`, `padding`, `font-size`
- Lines 2857-2870: `width`, `min-height`, `padding`, `display`, `color`, `font-size`, `line-height`, `font-weight`, `text-align`, `text-overflow`, `white-space`, `overflow`
- Lines 5523-5528: `color`, `text-shadow`
- Lines 5953-5958: `max-width`, `overflow`, `text-overflow`, `white-space`
- Replacement assessment: 2713-2717: not replaced by final occurrence; properties are complementary; 2857-2870: partially overridden by final occurrence (overflow, text-overflow, white-space); 5523-5528: not replaced by final occurrence; properties are complementary.

### 207. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-reference-button`
- Lines 2713-2717: `min-height`, `padding`, `font-size`
- Lines 2857-2870: `width`, `min-height`, `padding`, `display`, `color`, `font-size`, `line-height`, `font-weight`, `text-align`, `text-overflow`, `white-space`, `overflow`
- Lines 5523-5528: `color`, `text-shadow`
- Lines 5953-5958: `max-width`, `overflow`, `text-overflow`, `white-space`
- Replacement assessment: 2713-2717: not replaced by final occurrence; properties are complementary; 2857-2870: partially overridden by final occurrence (overflow, text-overflow, white-space); 5523-5528: not replaced by final occurrence; properties are complementary.

### 208. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-meta`
- Lines 2720-2723: `font-size`, `gap`
- Lines 2882-2886: `font-size`, `line-height`, `gap`
- Lines 5533-5536: `color`, `font-weight`
- Replacement assessment: 2720-2723: not replaced by final occurrence; properties are complementary; 2882-2886: not replaced by final occurrence; properties are complementary.

### 209. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-meta`
- Lines 2720-2723: `font-size`, `gap`
- Lines 2882-2886: `font-size`, `line-height`, `gap`
- Lines 5533-5536: `color`, `font-weight`
- Replacement assessment: 2720-2723: not replaced by final occurrence; properties are complementary; 2882-2886: not replaced by final occurrence; properties are complementary.

### 210. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-button`
- Lines 2726-2731: `width`, `height`, `min-width`, `min-height`
- Lines 2907-2913: `width`, `height`, `min-width`, `min-height`, `padding`
- Lines 5541-5556: `border-radius`, `border`, `color`, `background`, `box-shadow`, `transition`
- Lines 5968-5977: `width`, `min-width`, `height`, `min-height`, `padding`, `display`, `place-items`, `font-size`
- Replacement assessment: 2726-2731: fully replaced by final occurrence by property names; 2907-2913: fully replaced by final occurrence by property names; 5541-5556: not replaced by final occurrence; properties are complementary.

### 211. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-button`
- Lines 2726-2731: `width`, `height`, `min-width`, `min-height`
- Lines 2907-2913: `width`, `height`, `min-width`, `min-height`, `padding`
- Lines 5541-5556: `border-radius`, `border`, `color`, `background`, `box-shadow`, `transition`
- Lines 5968-5977: `width`, `min-width`, `height`, `min-height`, `padding`, `display`, `place-items`, `font-size`
- Replacement assessment: 2726-2731: fully replaced by final occurrence by property names; 2907-2913: fully replaced by final occurrence by property names; 5541-5556: not replaced by final occurrence; properties are complementary.

### 212. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-combat-section .qd-ui2-search-row`
- Lines 2740-2742: `margin-top`
- Lines 3143-3147: `margin-top`, `margin-bottom`, `padding-top`
- Replacement assessment: 2740-2742: fully replaced by final occurrence by property names.

### 213. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-skills-section .qd-ui2-search-row`
- Lines 2740-2742: `margin-top`
- Lines 3143-3147: `margin-top`, `margin-bottom`, `padding-top`
- Replacement assessment: 2740-2742: fully replaced by final occurrence by property names.

### 214. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-spells-section .qd-ui2-search-row`
- Lines 2740-2742: `margin-top`
- Lines 3143-3147: `margin-top`, `margin-bottom`, `padding-top`
- Replacement assessment: 2740-2742: fully replaced by final occurrence by property names.

### 215. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-combat-section .qd-ui2-search-row`
- Lines 2740-2742: `margin-top`
- Lines 3143-3147: `margin-top`, `margin-bottom`, `padding-top`
- Replacement assessment: 2740-2742: fully replaced by final occurrence by property names.

### 216. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-skills-section .qd-ui2-search-row`
- Lines 2740-2742: `margin-top`
- Lines 3143-3147: `margin-top`, `margin-bottom`, `padding-top`
- Replacement assessment: 2740-2742: fully replaced by final occurrence by property names.

### 217. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-spells-section .qd-ui2-search-row`
- Lines 2740-2742: `margin-top`
- Lines 3143-3147: `margin-top`, `margin-bottom`, `padding-top`
- Replacement assessment: 2740-2742: fully replaced by final occurrence by property names.

### 218. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-combat-section .qd-ui2-action-row`
- Lines 2752-2763: `display`, `grid-template-columns`, `grid-template-areas`, `align-items`, `gap`, `min-height`, `padding`
- Lines 2921-2931: `margin-bottom`, `transition`
- Lines 3064-3066: `margin-bottom`
- Lines 5451-5458: `border-color`, `background`, `box-shadow`
- Lines 5849-5856: `background-image`, `background-size`, `background-position`, `background-repeat`
- Replacement assessment: 2752-2763: not replaced by final occurrence; properties are complementary; 2921-2931: not replaced by final occurrence; properties are complementary; 3064-3066: not replaced by final occurrence; properties are complementary; 5451-5458: not replaced by final occurrence; properties are complementary.

### 219. `.qd40-overlay .qd-ui2-combat-section .qd-ui2-action-row`
- Lines 2752-2763: `display`, `grid-template-columns`, `grid-template-areas`, `align-items`, `gap`, `min-height`, `padding`
- Lines 2921-2931: `margin-bottom`, `transition`
- Lines 3064-3066: `margin-bottom`
- Lines 5451-5458: `border-color`, `background`, `box-shadow`
- Lines 5849-5856: `background-image`, `background-size`, `background-position`, `background-repeat`
- Replacement assessment: 2752-2763: not replaced by final occurrence; properties are complementary; 2921-2931: not replaced by final occurrence; properties are complementary; 3064-3066: not replaced by final occurrence; properties are complementary; 5451-5458: not replaced by final occurrence; properties are complementary.

### 220. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-combat-section .qd-ui2-action-main`
- Lines 2766-2768: `display`
- Lines 2896-2898: `padding-right`
- Replacement assessment: 2766-2768: not replaced by final occurrence; properties are complementary.

### 221. `.qd40-overlay .qd-ui2-combat-section .qd-ui2-action-main`
- Lines 2766-2768: `display`
- Lines 2896-2898: `padding-right`
- Replacement assessment: 2766-2768: not replaced by final occurrence; properties are complementary.

### 222. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-combat-section .qd-ui2-reference-button`
- Lines 2771-2780: `grid-area`, `width`, `min-height`, `justify-self`, `text-align`, `font-size`, `line-height`, `padding`
- Lines 2901-2903: `font-size`
- Replacement assessment: 2771-2780: partially overridden by final occurrence (font-size).

### 223. `.qd40-overlay .qd-ui2-combat-section .qd-ui2-reference-button`
- Lines 2771-2780: `grid-area`, `width`, `min-height`, `justify-self`, `text-align`, `font-size`, `line-height`, `padding`
- Lines 2901-2903: `font-size`
- Replacement assessment: 2771-2780: partially overridden by final occurrence (font-size).

### 224. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-controls`
- Lines 2846-2853: `transform`, `align-self`, `justify-self`, `flex-wrap`, `white-space`, `z-index`
- Lines 5948-5950: `min-width`
- Lines 5962-5965: `flex-wrap`, `gap`
- Replacement assessment: 2846-2853: partially overridden by final occurrence (flex-wrap); 5948-5950: not replaced by final occurrence; properties are complementary.

### 225. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-controls`
- Lines 2846-2853: `transform`, `align-self`, `justify-self`, `flex-wrap`, `white-space`, `z-index`
- Lines 5948-5950: `min-width`
- Lines 5962-5965: `flex-wrap`, `gap`
- Replacement assessment: 2846-2853: partially overridden by final occurrence (flex-wrap); 5948-5950: not replaced by final occurrence; properties are complementary.

### 226. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-main`
- Lines 2874-2878: `min-width`, `padding-right`, `gap`
- Lines 5948-5950: `min-width`
- Replacement assessment: 2874-2878: partially overridden by final occurrence (min-width).

### 227. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-main`
- Lines 2874-2878: `min-width`, `padding-right`, `gap`
- Lines 5948-5950: `min-width`
- Replacement assessment: 2874-2878: partially overridden by final occurrence (min-width).

### 228. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-meta span`
- Lines 2889-2892: `font-size`, `line-height`
- Lines 5533-5536: `color`, `font-weight`
- Replacement assessment: 2889-2892: not replaced by final occurrence; properties are complementary.

### 229. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-meta span`
- Lines 2889-2892: `font-size`, `line-height`
- Lines 5533-5536: `color`, `font-weight`
- Replacement assessment: 2889-2892: not replaced by final occurrence; properties are complementary.

### 230. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-skills-section .qd-ui2-action-row`
- Lines 2921-2931: `margin-bottom`, `transition`
- Lines 3064-3066: `margin-bottom`
- Lines 3215-3227: `position`, `display`, `grid-template-columns`, `grid-template-areas`, `align-items`, `min-height`, `padding`, `margin-bottom`, `overflow`
- Lines 5471-5478: `border-color`, `background`, `box-shadow`
- Lines 5860-5867: `background-image`, `background-size`, `background-position`, `background-repeat`
- Replacement assessment: 2921-2931: not replaced by final occurrence; properties are complementary; 3064-3066: not replaced by final occurrence; properties are complementary; 3215-3227: not replaced by final occurrence; properties are complementary; 5471-5478: not replaced by final occurrence; properties are complementary.

### 231. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-spells-section .qd-ui2-action-row`
- Lines 2921-2931: `margin-bottom`, `transition`
- Lines 3064-3066: `margin-bottom`
- Lines 3215-3227: `position`, `display`, `grid-template-columns`, `grid-template-areas`, `align-items`, `min-height`, `padding`, `margin-bottom`, `overflow`
- Lines 5491-5498: `border-color`, `background`, `box-shadow`
- Lines 5871-5878: `background-image`, `background-size`, `background-position`, `background-repeat`
- Replacement assessment: 2921-2931: not replaced by final occurrence; properties are complementary; 3064-3066: not replaced by final occurrence; properties are complementary; 3215-3227: not replaced by final occurrence; properties are complementary; 5491-5498: not replaced by final occurrence; properties are complementary.

### 232. `.qd40-overlay .qd-ui2-skills-section .qd-ui2-action-row`
- Lines 2921-2931: `margin-bottom`, `transition`
- Lines 3064-3066: `margin-bottom`
- Lines 3215-3227: `position`, `display`, `grid-template-columns`, `grid-template-areas`, `align-items`, `min-height`, `padding`, `margin-bottom`, `overflow`
- Lines 5471-5478: `border-color`, `background`, `box-shadow`
- Lines 5860-5867: `background-image`, `background-size`, `background-position`, `background-repeat`
- Replacement assessment: 2921-2931: not replaced by final occurrence; properties are complementary; 3064-3066: not replaced by final occurrence; properties are complementary; 3215-3227: not replaced by final occurrence; properties are complementary; 5471-5478: not replaced by final occurrence; properties are complementary.

### 233. `.qd40-overlay .qd-ui2-spells-section .qd-ui2-action-row`
- Lines 2921-2931: `margin-bottom`, `transition`
- Lines 3064-3066: `margin-bottom`
- Lines 3215-3227: `position`, `display`, `grid-template-columns`, `grid-template-areas`, `align-items`, `min-height`, `padding`, `margin-bottom`, `overflow`
- Lines 5491-5498: `border-color`, `background`, `box-shadow`
- Lines 5871-5878: `background-image`, `background-size`, `background-position`, `background-repeat`
- Replacement assessment: 2921-2931: not replaced by final occurrence; properties are complementary; 3064-3066: not replaced by final occurrence; properties are complementary; 3215-3227: not replaced by final occurrence; properties are complementary; 5491-5498: not replaced by final occurrence; properties are complementary.

### 234. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-combat-section .qd-ui2-action-row:hover`
- Lines 2939-2950: `min-height`, `height`, `padding`, `z-index`, `transform`, `border-color`, `box-shadow`
- Lines 2958-2960: `overflow`
- Lines 3074-3080: `height`, `min-height`, `padding`, `transform`, `overflow`
- Lines 5461-5467: `border-color`, `box-shadow`
- Lines 5882-5886: `background-image`
- Replacement assessment: 2939-2950: not replaced by final occurrence; properties are complementary; 2958-2960: not replaced by final occurrence; properties are complementary; 3074-3080: not replaced by final occurrence; properties are complementary; 5461-5467: not replaced by final occurrence; properties are complementary.

### 235. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-skills-section .qd-ui2-action-row:hover`
- Lines 2939-2950: `min-height`, `height`, `padding`, `z-index`, `transform`, `border-color`, `box-shadow`
- Lines 2958-2960: `overflow`
- Lines 3074-3080: `height`, `min-height`, `padding`, `transform`, `overflow`
- Lines 3305-3310: `transform`, `min-height`, `height`, `padding`
- Lines 5481-5487: `border-color`, `box-shadow`
- Lines 5889-5893: `background-image`
- Replacement assessment: 2939-2950: not replaced by final occurrence; properties are complementary; 2958-2960: not replaced by final occurrence; properties are complementary; 3074-3080: not replaced by final occurrence; properties are complementary; 3305-3310: not replaced by final occurrence; properties are complementary; 5481-5487: not replaced by final occurrence; properties are complementary.

### 236. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-spells-section .qd-ui2-action-row:hover`
- Lines 2939-2950: `min-height`, `height`, `padding`, `z-index`, `transform`, `border-color`, `box-shadow`
- Lines 2958-2960: `overflow`
- Lines 3074-3080: `height`, `min-height`, `padding`, `transform`, `overflow`
- Lines 3305-3310: `transform`, `min-height`, `height`, `padding`
- Lines 5501-5507: `border-color`, `box-shadow`
- Lines 5896-5900: `background-image`
- Replacement assessment: 2939-2950: not replaced by final occurrence; properties are complementary; 2958-2960: not replaced by final occurrence; properties are complementary; 3074-3080: not replaced by final occurrence; properties are complementary; 3305-3310: not replaced by final occurrence; properties are complementary; 5501-5507: not replaced by final occurrence; properties are complementary.

### 237. `.qd40-overlay .qd-ui2-combat-section .qd-ui2-action-row:hover`
- Lines 2939-2950: `min-height`, `height`, `padding`, `z-index`, `transform`, `border-color`, `box-shadow`
- Lines 2958-2960: `overflow`
- Lines 3074-3080: `height`, `min-height`, `padding`, `transform`, `overflow`
- Lines 5461-5467: `border-color`, `box-shadow`
- Lines 5882-5886: `background-image`
- Replacement assessment: 2939-2950: not replaced by final occurrence; properties are complementary; 2958-2960: not replaced by final occurrence; properties are complementary; 3074-3080: not replaced by final occurrence; properties are complementary; 5461-5467: not replaced by final occurrence; properties are complementary.

### 238. `.qd40-overlay .qd-ui2-skills-section .qd-ui2-action-row:hover`
- Lines 2939-2950: `min-height`, `height`, `padding`, `z-index`, `transform`, `border-color`, `box-shadow`
- Lines 2958-2960: `overflow`
- Lines 3074-3080: `height`, `min-height`, `padding`, `transform`, `overflow`
- Lines 3305-3310: `transform`, `min-height`, `height`, `padding`
- Lines 5481-5487: `border-color`, `box-shadow`
- Lines 5889-5893: `background-image`
- Replacement assessment: 2939-2950: not replaced by final occurrence; properties are complementary; 2958-2960: not replaced by final occurrence; properties are complementary; 3074-3080: not replaced by final occurrence; properties are complementary; 3305-3310: not replaced by final occurrence; properties are complementary; 5481-5487: not replaced by final occurrence; properties are complementary.

### 239. `.qd40-overlay .qd-ui2-spells-section .qd-ui2-action-row:hover`
- Lines 2939-2950: `min-height`, `height`, `padding`, `z-index`, `transform`, `border-color`, `box-shadow`
- Lines 2958-2960: `overflow`
- Lines 3074-3080: `height`, `min-height`, `padding`, `transform`, `overflow`
- Lines 3305-3310: `transform`, `min-height`, `height`, `padding`
- Lines 5501-5507: `border-color`, `box-shadow`
- Lines 5896-5900: `background-image`
- Replacement assessment: 2939-2950: not replaced by final occurrence; properties are complementary; 2958-2960: not replaced by final occurrence; properties are complementary; 3074-3080: not replaced by final occurrence; properties are complementary; 3305-3310: not replaced by final occurrence; properties are complementary; 5501-5507: not replaced by final occurrence; properties are complementary.

### 240. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-combat-section .qd-ui2-action-row:hover .qd-ui2-reference-button`
- Lines 2968-2972: `min-height`, `font-size`, `line-height`
- Lines 3090-3092: `font-size`
- Lines 3181-3183: `font-size`
- Replacement assessment: 2968-2972: partially overridden by final occurrence (font-size); 3090-3092: fully replaced by final occurrence by property names.

### 241. `.qd40-overlay .qd-ui2-combat-section .qd-ui2-action-row:hover .qd-ui2-reference-button`
- Lines 2968-2972: `min-height`, `font-size`, `line-height`
- Lines 3090-3092: `font-size`
- Lines 3181-3183: `font-size`
- Replacement assessment: 2968-2972: partially overridden by final occurrence (font-size); 3090-3092: fully replaced by final occurrence by property names.

### 242. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-skills-section .qd-ui2-action-row:hover .qd-ui2-action-controls`
- Lines 3002-3005: `transform`, `gap`
- Lines 3315-3317: `transform`
- Replacement assessment: 3002-3005: partially overridden by final occurrence (transform).

### 243. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-spells-section .qd-ui2-action-row:hover .qd-ui2-action-controls`
- Lines 3002-3005: `transform`, `gap`
- Lines 3315-3317: `transform`
- Lines 3336-3338: `transform`
- Replacement assessment: 3002-3005: partially overridden by final occurrence (transform); 3315-3317: fully replaced by final occurrence by property names.

### 244. `.qd40-overlay .qd-ui2-skills-section .qd-ui2-action-row:hover .qd-ui2-action-controls`
- Lines 3002-3005: `transform`, `gap`
- Lines 3315-3317: `transform`
- Replacement assessment: 3002-3005: partially overridden by final occurrence (transform).

### 245. `.qd40-overlay .qd-ui2-spells-section .qd-ui2-action-row:hover .qd-ui2-action-controls`
- Lines 3002-3005: `transform`, `gap`
- Lines 3315-3317: `transform`
- Lines 3336-3338: `transform`
- Replacement assessment: 3002-3005: partially overridden by final occurrence (transform); 3315-3317: fully replaced by final occurrence by property names.

### 246. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-drawer-scroll`
- Lines 3043-3045: `padding-top`
- Lines 3126-3128: `padding-top`
- Lines 5341-5344: `padding`, `border-radius`
- Lines 5925-5930: `min-height`, `overflow-y`, `overflow-x`, `padding-right`
- Replacement assessment: 3043-3045: not replaced by final occurrence; properties are complementary; 3126-3128: not replaced by final occurrence; properties are complementary; 5341-5344: not replaced by final occurrence; properties are complementary.

### 247. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-drawer-scroll`
- Lines 3043-3045: `padding-top`
- Lines 3126-3128: `padding-top`
- Lines 5341-5344: `padding`, `border-radius`
- Lines 5925-5930: `min-height`, `overflow-y`, `overflow-x`, `padding-right`
- Replacement assessment: 3043-3045: not replaced by final occurrence; properties are complementary; 3126-3128: not replaced by final occurrence; properties are complementary; 5341-5344: not replaced by final occurrence; properties are complementary.

### 248. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-drawer-section`
- Lines 3048-3050: `padding-top`
- Lines 3131-3135: `margin-top`, `padding-top`, `gap`
- Replacement assessment: 3048-3050: fully replaced by final occurrence by property names.

### 249. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-drawer-section`
- Lines 3048-3050: `padding-top`
- Lines 3131-3135: `margin-top`, `padding-top`, `gap`
- Replacement assessment: 3048-3050: fully replaced by final occurrence by property names.

### 250. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row:hover .qd-ui2-reference-button`
- Lines 3084-3087: `min-height`, `font-size`
- Lines 3175-3178: `min-height`, `font-size`
- Replacement assessment: 3084-3087: fully replaced by final occurrence by property names.

### 251. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row:hover .qd-ui2-reference-button`
- Lines 3084-3087: `min-height`, `font-size`
- Lines 3175-3178: `min-height`, `font-size`
- Replacement assessment: 3084-3087: fully replaced by final occurrence by property names.

### 252. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row:hover .qd-ui2-action-meta`
- Lines 3097-3100: `font-size`, `line-height`
- Lines 3188-3191: `font-size`, `line-height`
- Replacement assessment: 3097-3100: fully replaced by final occurrence by property names.

### 253. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row:hover .qd-ui2-action-meta span`
- Lines 3097-3100: `font-size`, `line-height`
- Lines 3188-3191: `font-size`, `line-height`
- Replacement assessment: 3097-3100: fully replaced by final occurrence by property names.

### 254. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row:hover .qd-ui2-action-meta`
- Lines 3097-3100: `font-size`, `line-height`
- Lines 3188-3191: `font-size`, `line-height`
- Replacement assessment: 3097-3100: fully replaced by final occurrence by property names.

### 255. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row:hover .qd-ui2-action-meta span`
- Lines 3097-3100: `font-size`, `line-height`
- Lines 3188-3191: `font-size`, `line-height`
- Replacement assessment: 3097-3100: fully replaced by final occurrence by property names.

### 256. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row:hover .qd-ui2-action-controls`
- Lines 3103-3106: `transform`, `gap`
- Lines 3194-3197: `transform`, `gap`
- Replacement assessment: 3103-3106: fully replaced by final occurrence by property names.

### 257. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row:hover .qd-ui2-action-controls`
- Lines 3103-3106: `transform`, `gap`
- Lines 3194-3197: `transform`, `gap`
- Replacement assessment: 3103-3106: fully replaced by final occurrence by property names.

### 258. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row:hover .qd-ui2-action-button`
- Lines 3109-3114: `width`, `height`, `min-width`, `min-height`
- Lines 3200-3205: `width`, `height`, `min-width`, `min-height`
- Replacement assessment: 3109-3114: fully replaced by final occurrence by property names.

### 259. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row:hover .qd-ui2-action-button`
- Lines 3109-3114: `width`, `height`, `min-width`, `min-height`
- Lines 3200-3205: `width`, `height`, `min-width`, `min-height`
- Replacement assessment: 3109-3114: fully replaced by final occurrence by property names.

### 260. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row:hover`
- Lines 3165-3171: `transform`, `height`, `min-height`, `padding`, `overflow`
- Lines 5516-5519: `transform`, `filter`
- Replacement assessment: 3165-3171: partially overridden by final occurrence (transform).

### 261. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-action-row:hover`
- Lines 3165-3171: `transform`, `height`, `min-height`, `padding`, `overflow`
- Lines 5516-5519: `transform`, `filter`
- Replacement assessment: 3165-3171: partially overridden by final occurrence (transform).

### 262. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-spells-section .qd-ui2-action-controls`
- Lines 3277-3287: `grid-area`, `justify-self`, `align-self`, `display`, `flex-wrap`, `gap`, `white-space`, `z-index`, `transform`
- Lines 3331-3333: `transform`
- Replacement assessment: 3277-3287: partially overridden by final occurrence (transform).

### 263. `.qd40-overlay .qd-ui2-spells-section .qd-ui2-action-controls`
- Lines 3277-3287: `grid-area`, `justify-self`, `align-self`, `display`, `flex-wrap`, `gap`, `white-space`, `z-index`, `transform`
- Lines 3331-3333: `transform`
- Replacement assessment: 3277-3287: partially overridden by final occurrence (transform).

### 264. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-card`
- Lines 3528-3539: `padding`, `gap`, `border-color`, `background`, `box-shadow`
- Lines 4362-4365: `gap`, `padding`
- Replacement assessment: 3528-3539: partially overridden by final occurrence (gap, padding).

### 265. `.qd40-overlay .qd-ui2-suggestions-card`
- Lines 3528-3539: `padding`, `gap`, `border-color`, `background`, `box-shadow`
- Lines 4362-4365: `gap`, `padding`
- Replacement assessment: 3528-3539: partially overridden by final occurrence (gap, padding).

### 266. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-header`
- Lines 3542-3553: `min-height`, `align-items`, `padding`, `border`, `border-radius`, `background`, `box-shadow`
- Lines 4368-4371: `min-height`, `padding`
- Replacement assessment: 3542-3553: partially overridden by final occurrence (min-height, padding).

### 267. `.qd40-overlay .qd-ui2-suggestions-header`
- Lines 3542-3553: `min-height`, `align-items`, `padding`, `border`, `border-radius`, `background`, `box-shadow`
- Lines 4368-4371: `min-height`, `padding`
- Replacement assessment: 3542-3553: partially overridden by final occurrence (min-height, padding).

### 268. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-header h2`
- Lines 3556-3565: `color`, `font-size`, `line-height`, `letter-spacing`, `text-transform`, `text-shadow`
- Lines 4374-4376: `font-size`
- Replacement assessment: 3556-3565: partially overridden by final occurrence (font-size).

### 269. `.qd40-overlay .qd-ui2-suggestions-header h2`
- Lines 3556-3565: `color`, `font-size`, `line-height`, `letter-spacing`, `text-transform`, `text-shadow`
- Lines 4374-4376: `font-size`
- Replacement assessment: 3556-3565: partially overridden by final occurrence (font-size).

### 270. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-header p`
- Lines 3568-3573: `margin-top`, `color`, `font-size`, `letter-spacing`
- Lines 4379-4382: `margin-top`, `font-size`
- Replacement assessment: 3568-3573: partially overridden by final occurrence (font-size, margin-top).

### 271. `.qd40-overlay .qd-ui2-suggestions-header p`
- Lines 3568-3573: `margin-top`, `color`, `font-size`, `letter-spacing`
- Lines 4379-4382: `margin-top`, `font-size`
- Replacement assessment: 3568-3573: partially overridden by final occurrence (font-size, margin-top).

### 272. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-counts`
- Lines 3576-3583: `display`, `align-items`, `justify-content`, `gap`, `min-width`, `color`
- Lines 3963-3965: `gap`
- Replacement assessment: 3576-3583: partially overridden by final occurrence (gap).

### 273. `.qd40-overlay .qd-ui2-suggestions-counts`
- Lines 3576-3583: `display`, `align-items`, `justify-content`, `gap`, `min-width`, `color`
- Lines 3963-3965: `gap`
- Replacement assessment: 3576-3583: partially overridden by final occurrence (gap).

### 274. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-counts b`
- Lines 3586-3602: `min-width`, `height`, `padding`, `display`, `place-items`, `border`, `border-radius`, `background`, `box-shadow`, `font-size`, `font-weight`, `line-height`
- Lines 3968-3977: `min-width`, `height`, `padding`, `display`, `align-items`, `justify-content`, `gap`, `white-space`
- Lines 4385-4388: `height`, `padding`
- Replacement assessment: 3586-3602: partially overridden by final occurrence (height, padding); 3968-3977: partially overridden by final occurrence (height, padding).

### 275. `.qd40-overlay .qd-ui2-suggestions-counts b`
- Lines 3586-3602: `min-width`, `height`, `padding`, `display`, `place-items`, `border`, `border-radius`, `background`, `box-shadow`, `font-size`, `font-weight`, `line-height`
- Lines 3968-3977: `min-width`, `height`, `padding`, `display`, `align-items`, `justify-content`, `gap`, `white-space`
- Lines 4385-4388: `height`, `padding`
- Replacement assessment: 3586-3602: partially overridden by final occurrence (height, padding); 3968-3977: partially overridden by final occurrence (height, padding).

### 276. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-card`
- Lines 3740-3751: `display`, `grid-template-columns`, `grid-template-areas`, `align-items`, `gap`, `min-height`, `padding`, `margin-bottom`
- Lines 3883-3886: `gap`, `margin-bottom`
- Lines 4308-4315: `transition`
- Lines 4412-4416: `padding-top`, `padding-bottom`, `margin-bottom`
- Replacement assessment: 3740-3751: partially overridden by final occurrence (margin-bottom); 3883-3886: partially overridden by final occurrence (margin-bottom); 4308-4315: not replaced by final occurrence; properties are complementary.

### 277. `.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-card`
- Lines 3740-3751: `display`, `grid-template-columns`, `grid-template-areas`, `align-items`, `gap`, `min-height`, `padding`, `margin-bottom`
- Lines 3883-3886: `gap`, `margin-bottom`
- Lines 4308-4315: `transition`
- Lines 4412-4416: `padding-top`, `padding-bottom`, `margin-bottom`
- Replacement assessment: 3740-3751: partially overridden by final occurrence (margin-bottom); 3883-3886: partially overridden by final occurrence (margin-bottom); 4308-4315: not replaced by final occurrence; properties are complementary.

### 278. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-main strong`
- Lines 3760-3773: `grid-area`, `display`, `width`, `min-width`, `color`, `font-size`, `line-height`, `font-weight`, `text-align`, `text-overflow`, `white-space`, `overflow`
- Lines 3926-3929: `font-size`, `line-height`
- Lines 4426-4429: `font-size`, `line-height`
- Replacement assessment: 3760-3773: partially overridden by final occurrence (font-size, line-height); 3926-3929: fully replaced by final occurrence by property names.

### 279. `.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-main strong`
- Lines 3760-3773: `grid-area`, `display`, `width`, `min-width`, `color`, `font-size`, `line-height`, `font-weight`, `text-align`, `text-overflow`, `white-space`, `overflow`
- Lines 3926-3929: `font-size`, `line-height`
- Lines 4426-4429: `font-size`, `line-height`
- Replacement assessment: 3760-3773: partially overridden by final occurrence (font-size, line-height); 3926-3929: fully replaced by final occurrence by property names.

### 280. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-detail`
- Lines 3776-3785: `grid-area`, `min-width`, `color`, `font-size`, `line-height`, `text-overflow`, `white-space`, `overflow`
- Lines 3932-3935: `font-size`, `line-height`
- Lines 3992-3997: `color`, `font-size`, `line-height`, `font-weight`
- Lines 4420-4423: `font-size`, `line-height`
- Replacement assessment: 3776-3785: partially overridden by final occurrence (font-size, line-height); 3932-3935: fully replaced by final occurrence by property names; 3992-3997: partially overridden by final occurrence (font-size, line-height).

### 281. `.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-detail`
- Lines 3776-3785: `grid-area`, `min-width`, `color`, `font-size`, `line-height`, `text-overflow`, `white-space`, `overflow`
- Lines 3932-3935: `font-size`, `line-height`
- Lines 3992-3997: `color`, `font-size`, `line-height`, `font-weight`
- Lines 4420-4423: `font-size`, `line-height`
- Replacement assessment: 3776-3785: partially overridden by final occurrence (font-size, line-height); 3932-3935: fully replaced by final occurrence by property names; 3992-3997: partially overridden by final occurrence (font-size, line-height).

### 282. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-variant`
- Lines 3788-3798: `grid-area`, `min-width`, `margin-top`, `color`, `font-size`, `line-height`, `text-overflow`, `white-space`, `overflow`
- Lines 3939-3942: `margin-top`, `font-size`
- Lines 4000-4006: `color`, `font-size`, `line-height`, `font-weight`, `margin-top`
- Replacement assessment: 3788-3798: partially overridden by final occurrence (color, font-size, line-height, margin-top); 3939-3942: fully replaced by final occurrence by property names.

### 283. `.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-variant`
- Lines 3788-3798: `grid-area`, `min-width`, `margin-top`, `color`, `font-size`, `line-height`, `text-overflow`, `white-space`, `overflow`
- Lines 3939-3942: `margin-top`, `font-size`
- Lines 4000-4006: `color`, `font-size`, `line-height`, `font-weight`, `margin-top`
- Replacement assessment: 3788-3798: partially overridden by final occurrence (color, font-size, line-height, margin-top); 3939-3942: fully replaced by final occurrence by property names.

### 284. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-button`
- Lines 3816-3822: `height`, `min-height`, `padding`, `font-size`, `line-height`
- Lines 4029-4036: `transition`
- Replacement assessment: 3816-3822: not replaced by final occurrence; properties are complementary.

### 285. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-icon`
- Lines 3816-3822: `height`, `min-height`, `padding`, `font-size`, `line-height`
- Lines 3825-3832: `width`, `min-width`, `padding`, `display`, `place-items`, `font-size`
- Lines 3946-3952: `width`, `min-width`, `height`, `min-height`, `border-radius`
- Lines 4029-4036: `transition`
- Replacement assessment: 3816-3822: not replaced by final occurrence; properties are complementary; 3825-3832: not replaced by final occurrence; properties are complementary; 3946-3952: not replaced by final occurrence; properties are complementary.

### 286. `.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-button`
- Lines 3816-3822: `height`, `min-height`, `padding`, `font-size`, `line-height`
- Lines 4029-4036: `transition`
- Replacement assessment: 3816-3822: not replaced by final occurrence; properties are complementary.

### 287. `.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-icon`
- Lines 3816-3822: `height`, `min-height`, `padding`, `font-size`, `line-height`
- Lines 3825-3832: `width`, `min-width`, `padding`, `display`, `place-items`, `font-size`
- Lines 3946-3952: `width`, `min-width`, `height`, `min-height`, `border-radius`
- Lines 4029-4036: `transition`
- Replacement assessment: 3816-3822: not replaced by final occurrence; properties are complementary; 3825-3832: not replaced by final occurrence; properties are complementary; 3946-3952: not replaced by final occurrence; properties are complementary.

### 288. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-combat .qd-ui2-quick-slot-card`
- Lines 3836-3838: `grid-template-columns`
- Lines 3890-3893: `min-height`, `padding`
- Lines 4010-4012: `min-height`
- Lines 4154-4159: `border-color`, `box-shadow`
- Lines 4433-4435: `min-height`
- Replacement assessment: 3836-3838: not replaced by final occurrence; properties are complementary; 3890-3893: partially overridden by final occurrence (min-height); 4010-4012: fully replaced by final occurrence by property names; 4154-4159: not replaced by final occurrence; properties are complementary.

### 289. `.qd40-overlay .qd-ui2-quick-slot-combat .qd-ui2-quick-slot-card`
- Lines 3836-3838: `grid-template-columns`
- Lines 3890-3893: `min-height`, `padding`
- Lines 4010-4012: `min-height`
- Lines 4154-4159: `border-color`, `box-shadow`
- Lines 4433-4435: `min-height`
- Replacement assessment: 3836-3838: not replaced by final occurrence; properties are complementary; 3890-3893: partially overridden by final occurrence (min-height); 4010-4012: fully replaced by final occurrence by property names; 4154-4159: not replaced by final occurrence; properties are complementary.

### 290. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-skills .qd-ui2-quick-slot-card`
- Lines 3847-3849: `min-height`
- Lines 3902-3905: `min-height`, `padding`
- Lines 4015-4017: `min-height`
- Lines 4170-4175: `border-color`, `box-shadow`
- Lines 4438-4440: `min-height`
- Replacement assessment: 3847-3849: fully replaced by final occurrence by property names; 3902-3905: partially overridden by final occurrence (min-height); 4015-4017: fully replaced by final occurrence by property names; 4170-4175: not replaced by final occurrence; properties are complementary.

### 291. `.qd40-overlay .qd-ui2-quick-slot-skills .qd-ui2-quick-slot-card`
- Lines 3847-3849: `min-height`
- Lines 3902-3905: `min-height`, `padding`
- Lines 4015-4017: `min-height`
- Lines 4170-4175: `border-color`, `box-shadow`
- Lines 4438-4440: `min-height`
- Replacement assessment: 3847-3849: fully replaced by final occurrence by property names; 3902-3905: partially overridden by final occurrence (min-height); 4015-4017: fully replaced by final occurrence by property names; 4170-4175: not replaced by final occurrence; properties are complementary.

### 292. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-quick-slot-spells .qd-ui2-quick-slot-card`
- Lines 3853-3855: `min-height`
- Lines 3914-3917: `min-height`, `padding`
- Lines 4020-4022: `min-height`
- Lines 4186-4191: `border-color`, `box-shadow`
- Lines 4443-4445: `min-height`
- Replacement assessment: 3853-3855: fully replaced by final occurrence by property names; 3914-3917: partially overridden by final occurrence (min-height); 4020-4022: fully replaced by final occurrence by property names; 4186-4191: not replaced by final occurrence; properties are complementary.

### 293. `.qd40-overlay .qd-ui2-quick-slot-spells .qd-ui2-quick-slot-card`
- Lines 3853-3855: `min-height`
- Lines 3914-3917: `min-height`, `padding`
- Lines 4020-4022: `min-height`
- Lines 4186-4191: `border-color`, `box-shadow`
- Lines 4443-4445: `min-height`
- Replacement assessment: 3853-3855: fully replaced by final occurrence by property names; 3914-3917: partially overridden by final occurrence (min-height); 4020-4022: fully replaced by final occurrence by property names; 4186-4191: not replaced by final occurrence; properties are complementary.

### 294. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-list`
- Lines 3878-3880: `gap`
- Lines 4407-4409: `gap`
- Replacement assessment: 3878-3880: fully replaced by final occurrence by property names.

### 295. `.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-list`
- Lines 3878-3880: `gap`
- Lines 4407-4409: `gap`
- Replacement assessment: 3878-3880: fully replaced by final occurrence by property names.

### 296. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-card:hover`
- Lines 3956-3958: `transform`
- Lines 4318-4320: `filter`
- Replacement assessment: 3956-3958: not replaced by final occurrence; properties are complementary.

### 297. `.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-card:hover`
- Lines 3956-3958: `transform`
- Lines 4318-4320: `filter`
- Replacement assessment: 3956-3958: not replaced by final occurrence; properties are complementary.

### 298. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-toggle`
- Lines 4083-4088: `position`, `min-height`, `padding`, `overflow`
- Lines 4401-4404: `min-height`, `padding`
- Replacement assessment: 4083-4088: partially overridden by final occurrence (min-height, padding).

### 299. `.qd40-overlay .qd-ui2-suggestions-card .qd-ui2-quick-slot-toggle`
- Lines 4083-4088: `position`, `min-height`, `padding`, `overflow`
- Lines 4401-4404: `min-height`, `padding`
- Replacement assessment: 4083-4088: partially overridden by final occurrence (min-height, padding).

### 300. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-search-row input:focus-visible`
- Lines 5390-5393: `outline`, `outline-offset`
- Lines 6047-6050: `outline`, `box-shadow`
- Replacement assessment: 5390-5393: partially overridden by final occurrence (outline).

### 301. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-search-row input:focus-visible`
- Lines 5390-5393: `outline`, `outline-offset`
- Lines 6047-6050: `outline`, `box-shadow`
- Replacement assessment: 5390-5393: partially overridden by final occurrence (outline).

### 302. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-search-empty`
- Lines 5667-5686: `min-height`, `display`, `place-items`, `margin`, `padding`, `border`, `border-radius`, `color`, `background`, `box-shadow`, `font-size`, `line-height`, `font-weight`, `letter-spacing`, `text-align`
- Lines 5983-5986: `min-height`, `padding`
- Replacement assessment: 5667-5686: partially overridden by final occurrence (min-height, padding).

### 303. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-right-drawer .qd-ui2-empty-note`
- Lines 5667-5686: `min-height`, `display`, `place-items`, `margin`, `padding`, `border`, `border-radius`, `color`, `background`, `box-shadow`, `font-size`, `line-height`, `font-weight`, `letter-spacing`, `text-align`
- Lines 5983-5986: `min-height`, `padding`
- Replacement assessment: 5667-5686: partially overridden by final occurrence (min-height, padding).

### 304. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-search-empty`
- Lines 5667-5686: `min-height`, `display`, `place-items`, `margin`, `padding`, `border`, `border-radius`, `color`, `background`, `box-shadow`, `font-size`, `line-height`, `font-weight`, `letter-spacing`, `text-align`
- Lines 5983-5986: `min-height`, `padding`
- Replacement assessment: 5667-5686: partially overridden by final occurrence (min-height, padding).

### 305. `.qd40-overlay .qd-ui2-right-drawer .qd-ui2-empty-note`
- Lines 5667-5686: `min-height`, `display`, `place-items`, `margin`, `padding`, `border`, `border-radius`, `color`, `background`, `box-shadow`, `font-size`, `line-height`, `font-weight`, `letter-spacing`, `text-align`
- Lines 5983-5986: `min-height`, `padding`
- Replacement assessment: 5667-5686: partially overridden by final occurrence (min-height, padding).

### 306. `#gurps-quickdeck-overlay.qd40-overlay .qd-ui2-active-roster-remove`
- Lines 6120-6144: `width`, `min-width`, `max-width`, `height`, `min-height`, `max-height`, `padding`, `display`, `place-items`, `border-radius`, `font-size`, `font-weight`, `line-height`, `text-align`, `cursor`, `transform`, `animation`, `transition`
- Lines 6161-6170: `color`, `border`, `background`, `box-shadow`
- Replacement assessment: 6120-6144: not replaced by final occurrence; properties are complementary.

### 307. `.qd40-overlay .qd-ui2-active-roster-remove`
- Lines 6120-6144: `width`, `min-width`, `max-width`, `height`, `min-height`, `max-height`, `padding`, `display`, `place-items`, `border-radius`, `font-size`, `font-weight`, `line-height`, `text-align`, `cursor`, `transform`, `animation`, `transition`
- Lines 6161-6170: `color`, `border`, `background`, `box-shadow`
- Replacement assessment: 6120-6144: not replaced by final occurrence; properties are complementary.
