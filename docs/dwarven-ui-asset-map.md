# QD v0.9.1 — Dwarven UI Asset Map

## 1) Purpose
This document defines the **planning map** for a modular dwarven UI skin inspired by the target mockup. The mockup is **visual direction only**; implementation must be done with **reusable transparent `.webp` assets plus CSS composition**, not a one-piece screenshot background.

This branch is documentation-only and introduces no runtime UI behavior changes.

---

## 2) Planned Folder Structure
All dwarven UI assets will be organized under:

- `assets/ui/dwarven/frame/`
- `assets/ui/dwarven/panel/`
- `assets/ui/dwarven/header/`
- `assets/ui/dwarven/button/`
- `assets/ui/dwarven/collapse/`
- `assets/ui/dwarven/card/`
- `assets/ui/dwarven/ornament/`

---

## 3) Batch 1 Core Assets (First 14)
Exactly these 14 assets are the first production batch:

1. `assets/ui/dwarven/frame/top-rail.webp`
2. `assets/ui/dwarven/frame/bottom-rail.webp`
3. `assets/ui/dwarven/frame/left-rail.webp`
4. `assets/ui/dwarven/frame/right-rail.webp`
5. `assets/ui/dwarven/frame/corner-top-left.webp`
6. `assets/ui/dwarven/frame/corner-top-right.webp`
7. `assets/ui/dwarven/frame/corner-bottom-left.webp`
8. `assets/ui/dwarven/frame/corner-bottom-right.webp`
9. `assets/ui/dwarven/header/section-title-plate.webp`
10. `assets/ui/dwarven/header/knotwork-strip.webp`
11. `assets/ui/dwarven/button/button-square.webp`
12. `assets/ui/dwarven/button/button-wide.webp`
13. `assets/ui/dwarven/collapse/left-collapse-tab.webp`
14. `assets/ui/dwarven/collapse/right-collapse-tab.webp`

---

## 4) Batch 1 Asset Specs
Global defaults for all Batch 1 assets:
- **transparent:** yes
- **format:** webp
- **recommended quality:** 75
- **no baked text:** required (labels remain HTML text)

### 4.1 `assets/ui/dwarven/frame/top-rail.webp`
- purpose: top structural rail for outer frame, black iron/dark stone with bronze edge accents
- transparent: yes
- format: webp
- recommended quality: 75
- usage type: repeat-x
- likely CSS selector targets: `.qd40-frame`, `.qd40-overlay`, `.qd31-header`
- notes about avoiding baked text: do not include section labels, title words, or icon glyphs

### 4.2 `assets/ui/dwarven/frame/bottom-rail.webp`
- purpose: bottom structural rail and visual weight anchor
- transparent: yes
- format: webp
- recommended quality: 75
- usage type: repeat-x
- likely CSS selector targets: `.qd40-frame`, `.qd40-overlay`
- notes about avoiding baked text: no labels, no button names, no numeric callouts

### 4.3 `assets/ui/dwarven/frame/left-rail.webp`
- purpose: left vertical rail for shell perimeter
- transparent: yes
- format: webp
- recommended quality: 75
- usage type: repeat-y
- likely CSS selector targets: `.qd40-frame`, `.qd31-left-panel-wrap`
- notes about avoiding baked text: keep rail purely ornamental/structural

### 4.4 `assets/ui/dwarven/frame/right-rail.webp`
- purpose: right vertical rail for shell perimeter
- transparent: yes
- format: webp
- recommended quality: 75
- usage type: repeat-y
- likely CSS selector targets: `.qd40-frame`, `.qd31-right-panel-wrap`
- notes about avoiding baked text: keep rail purely ornamental/structural

### 4.5 `assets/ui/dwarven/frame/corner-top-left.webp`
- purpose: top-left corner cap joining top and left rails
- transparent: yes
- format: webp
- recommended quality: 75
- usage type: fixed
- likely CSS selector targets: `.qd40-frame`, `.qd40-overlay`
- notes about avoiding baked text: no corner initials, symbols with semantic meaning, or words

### 4.6 `assets/ui/dwarven/frame/corner-top-right.webp`
- purpose: top-right corner cap joining top and right rails
- transparent: yes
- format: webp
- recommended quality: 75
- usage type: fixed
- likely CSS selector targets: `.qd40-frame`, `.qd40-overlay`
- notes about avoiding baked text: no semantic labels or icon legends

### 4.7 `assets/ui/dwarven/frame/corner-bottom-left.webp`
- purpose: bottom-left corner cap joining bottom and left rails
- transparent: yes
- format: webp
- recommended quality: 75
- usage type: fixed
- likely CSS selector targets: `.qd40-frame`, `.qd40-overlay`
- notes about avoiding baked text: keep decorative only

### 4.8 `assets/ui/dwarven/frame/corner-bottom-right.webp`
- purpose: bottom-right corner cap joining bottom and right rails
- transparent: yes
- format: webp
- recommended quality: 75
- usage type: fixed
- likely CSS selector targets: `.qd40-frame`, `.qd40-overlay`
- notes about avoiding baked text: keep decorative only

### 4.9 `assets/ui/dwarven/header/section-title-plate.webp`
- purpose: ornamental title plate backing for section headings (fantasy serif text remains live DOM text)
- transparent: yes
- format: webp
- recommended quality: 75
- usage type: stretch
- likely CSS selector targets: `.qd31-header`, `.qd31-drawer-header`, `.qd31-center-fav-header`
- notes about avoiding baked text: do not bake words like "Favorites", "Drawer", or "QuickDeck"

### 4.10 `assets/ui/dwarven/header/knotwork-strip.webp`
- purpose: dwarven knotwork trim strip for header separators
- transparent: yes
- format: webp
- recommended quality: 75
- usage type: repeat-x
- likely CSS selector targets: `.qd31-header`, `.qd31-drawer-header`, `.qd31-center-fav-header`
- notes about avoiding baked text: trim only; no letters, numbers, or symbols used as labels

### 4.11 `assets/ui/dwarven/button/button-square.webp`
- purpose: square button shell (minimize/close/iconic controls), with strong readable silhouette
- transparent: yes
- format: webp
- recommended quality: 75
- usage type: nine-slice-like
- likely CSS selector targets: `.qd31-square-button`, `.qd31-icon-button`, `.qd31-center-fav-unpin`
- notes about avoiding baked text: no "X", "_", or control words baked into texture; glyphs stay in HTML/CSS

### 4.12 `assets/ui/dwarven/button/button-wide.webp`
- purpose: wide action button shell for attack/damage and similar action rows
- transparent: yes
- format: webp
- recommended quality: 75
- usage type: stretch
- likely CSS selector targets: `.qd31-center-fav-action-main`, `.qd31-center-fav-action-damage`
- notes about avoiding baked text: do not bake "Attack", "Damage", "Ref", etc.

### 4.13 `assets/ui/dwarven/collapse/left-collapse-tab.webp`
- purpose: outside-edge left collapse tab artwork
- transparent: yes
- format: webp
- recommended quality: 75
- usage type: fixed
- likely CSS selector targets: `.qd31-left-edge-tab`
- notes about avoiding baked text: no arrows/words locked into asset that prevent CSS/state swapping

### 4.14 `assets/ui/dwarven/collapse/right-collapse-tab.webp`
- purpose: outside-edge right collapse tab artwork
- transparent: yes
- format: webp
- recommended quality: 75
- usage type: fixed
- likely CSS selector targets: `.qd31-right-edge-tab`
- notes about avoiding baked text: no baked state labels; keep art neutral and state-driven by CSS/classes

---

## 5) Direct Replacement Map (Assets → Current QuickDeck Selectors)
This is the intended first-pass mapping between Batch 1 assets and current selectors.

- `.qd40-frame` → frame rails + corner caps (top/bottom/left/right + 4 corners)
- `.qd40-body` → frame context/background layering anchor (no direct text-bearing art)
- `.qd40-overlay` → corner/rail overlay composition layer (pointer-safe decorative placement)
- `.qd31-left-panel-wrap` → left rail integration zone
- `.qd31-center-wrap` → shared shell continuity for top/bottom rails
- `.qd31-right-panel-wrap` → right rail integration zone
- `.qd31-left-drawer` → inherits shell context and later panel textures
- `.qd31-center-cockpit` → centered shell region bounded by frame assets
- `.qd31-right-drawer` → inherits shell context and later panel textures
- `.qd31-header` → `section-title-plate.webp` + `knotwork-strip.webp`
- `.qd31-drawer-header` → `section-title-plate.webp` + `knotwork-strip.webp`
- `.qd31-center-fav-header` → `section-title-plate.webp` + `knotwork-strip.webp`
- `.qd31-square-button` → `button-square.webp`
- `.qd31-icon-button` → `button-square.webp`
- `.qd31-center-fav-action-main` → `button-wide.webp`
- `.qd31-center-fav-action-damage` → `button-wide.webp`
- `.qd31-center-fav-unpin` → `button-square.webp` (or square variant treatment)
- `.qd31-left-edge-tab` → `left-collapse-tab.webp`
- `.qd31-right-edge-tab` → `right-collapse-tab.webp`

---

## 6) Protected Behavior (Must Not Regress)
Future visual implementation must preserve all existing behavior:

- three-pane layout
- left/right collapse behavior
- outside edge collapse tabs
- center cockpit width
- pinned Attack/Damage/Ref/Unpin behavior
- drawer search behavior
- PDF Source Manager behavior
- GURPS/GGA roll paths
- reference popup behavior
- Application v1 style
- Forge safety

No visual pass may alter functional wiring or event handling for these systems.

---

## 7) Warnings / Risks
- Do not use one giant full-window background image.
- Do not bake labels/text into assets.
- Do not block clicks with decorative layers.
- Decorative pseudo-elements must use `pointer-events: none`.
- Avoid huge file sizes.
- Do not reintroduce missing asset 404s.
- CSS must include fallback gradients if assets fail to load.
- Test collapsed and expanded panels after every visual pass.

---

## 8) Next Branch Sequence
Planned incremental sequence:

1. `v0.9.1 — dwarven UI asset map`
2. `v0.9.2 — dwarven core asset batch 1`
3. `v0.9.3 — apply dwarven shell CSS`
4. `v0.9.4 — action/button/card polish`

This ordering keeps planning, asset production, CSS application, and polish separated for safer review.
