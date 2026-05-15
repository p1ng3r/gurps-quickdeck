# QuickDeck Favorites and Scroll Reference Popup UI Spec

This document defines the next UI direction for QuickDeck after the stable combat cockpit, HP/FP pass-through controls, large defenses, native GURPS attack/defense windows, and generalized native-window focus guard work. It is intentionally a design and implementation guardrail: future passes should implement the features described here without adding mockup-only controls or unrelated utility buttons.

## 1. Design principles

- **QuickDeck handles speed and flow.** QuickDeck should stay focused on the moment-to-moment table workflow: pick the actor, see the important combat state, launch common actions, and get out of the way.
- **Native GURPS handles rules.** Attack rolls, defense rolls, spell rolls, damage resolution, modifiers, and other rules-heavy behavior should continue to route through native GURPS behavior whenever possible. QuickDeck should not become a separate GURPS rules engine.
- **The main window stays compact.** The primary QuickDeck window remains a tight combat cockpit with drawers/tabs for focused surfaces. It should not grow into a large character-sheet replacement.
- **Fancy scrolls are popups, not permanent panels.** Skill, spell, and reference detail views should open in separate scroll-styled popup windows instead of permanently occupying the main QuickDeck layout.
- **Heavy ornament belongs on frame, headers, popup scrolls, and major dividers.** The dark leather and bronze war-table look should frame the cockpit and important reference surfaces without crowding every row.
- **Controls stay readable and practical.** Decorative treatment must not reduce contrast, hit target size, label clarity, keyboard/mouse usability, or the speed of finding and triggering actions.

## 2. Tab model

QuickDeck keeps the main workflow organized into four focused tabs or drawers.

### Combat

Combat is the primary battle cockpit. It belongs to the selected actor's in-combat needs:

- Actor identity and compact status context.
- HP/FP pass-through controls and resource display.
- Large Dodge, Parry, and Block controls that preserve native GURPS defense behavior.
- Compact GM helper controls that already exist, such as chat focus, target cleanup, next actor, and repeat last attack.
- A pinned/favorite attack area for common weapons or attack modes.
- The full attack list below the pinned area, still searchable/filterable when useful.
- Native attack behavior, native windows, and native damage handoff prompts.

Combat should not become a full equipment manager, damage calculator, or character sheet.

### Skills

Skills is the full browse/search surface for extracted actor skills:

- The full extracted skill list.
- Search/filter controls for locating skills quickly.
- Roll/use controls that preserve native GURPS skill roll behavior.
- A star/pin affordance for selecting skills that should appear in Quick Skills.
- A scroll/info affordance where a bundled reference or local override exists.

Skills is for finding and managing access to skills, not for permanently displaying long reference prose inside the main window.

### Spells

Spells is the full browse/search surface for extracted actor spells:

- The full extracted spell list.
- Search/filter controls for locating spells quickly.
- Roll/cast controls that preserve native GURPS spell behavior.
- A pinned/favorite spell area for commonly used spells.
- A star/pin affordance on spell rows.
- A scroll/info affordance for spell reference details.

Spells should support fast casting and reference lookup without embedding a large magic reference panel in the main QuickDeck window.

### Quick Skills

Quick Skills is the curated fast-access surface for selected skills:

- Only pinned/selected skills should appear here.
- It should prioritize common rolls that a player or GM wants available without searching.
- It should preserve native GURPS skill roll behavior.
- It may include a compact search/filter if the selected list grows, but the primary goal is curation rather than browsing every skill.
- It should still expose scroll/info reference popups when reference data exists.

Quick Skills should not duplicate the entire Skills tab.

## 3. Combat favorites

Combat favorites are pinned attacks or weapons that the user expects to use often.

### Row control

- Each attack row should include a minimal star or pin icon.
- The icon toggles whether that attack appears in the Combat pinned area.
- The icon should have accessible title/label text and clear selected/unselected states.

### Pinned area

- Favorite attacks appear in a compact pinned area at the top of Combat.
- The pinned area should be visually distinct but lightweight, such as a short header and compact row/card treatment.
- If no attacks are pinned, the area should collapse or show a small empty-state hint instead of taking significant vertical space.
- Pinned attacks should remain easy to trigger with one click/tap.

### Full attack list

- The full attack list remains below the pinned area.
- Existing grouping, readability, native attack actions, and search/filter behavior should be preserved.
- Pinning an attack must not remove it from the full list unless a later explicit filter mode is designed.

### Native behavior and persistence

- Favorite attacks must preserve native attack behavior exactly: the same native GURPS sheet-style handling, OTF fallback path, pending attack context, native-window focus guard, and damage handoff principles should apply.
- QuickDeck must not add custom damage math for favorite attacks.
- Favorite state should be saved per actor/client so each user can curate their own combat cockpit without changing the actor for everyone.
- The saved identity should be resilient enough for common actor updates, using the same kind of stable extracted attack identity already used elsewhere when possible.

## 4. Spell favorites

Spell favorites are pinned spells that the user expects to cast or reference often.

### Row control

- Each spell row should include a minimal star or pin icon.
- The icon toggles whether that spell appears in the Spells pinned area.
- The row should also expose a scroll/info icon when reference data is available or when a safe missing-reference popup is desired.

### Pinned area

- Favorite spells appear in a compact pinned area at the top of Spells.
- The pinned area should support the same native cast/roll path as the full spell row.
- Pinned spells should include only the controls needed for fast use and optional reference lookup.

### Full spell list

- The full spell list remains searchable below the pinned area.
- Pinning a spell should not hide it from the full list unless a later explicit filter mode is designed.
- Search should continue to target the full list, while the pinned area remains a stable quick-access region.

### Native behavior and persistence

- Favorite spells must preserve native spell behavior and should not add custom spell rules, cost calculations, or casting engines.
- Favorite state should be saved per actor/client so each user can curate their own spell surface.
- Reference lookup should use the existing QuickDeck reference data and matching model where possible.

## 5. Quick Skills definition

Quick Skills is the curated pinned-skill tab.

- It should show only skills the user has pinned or selected from the Skills tab.
- It is for fast common rolls, especially repeated table actions such as perception checks, stealth, weapon support skills, movement skills, social rolls, or campaign-specific frequent rolls.
- It should not be treated as another complete skill browser.
- It should preserve native GURPS skill roll behavior.
- It should still allow the scroll/info popup when a bundled reference, local override, or safe reference placeholder exists.
- Its persistence should remain per actor/client, matching the existing Quick Skills behavior.

## 6. Scroll reference popup

Skill, spell, and reference details should open in a separate popup window styled as a readable parchment scroll.

### Window behavior

- The main QuickDeck window must not expand permanently for scrolls.
- Opening a reference should create or focus a separate popup window.
- The popup should stay above QuickDeck using the native-window focus guard or equivalent safe focus behavior.
- The popup should not steal focus in a way that breaks typing in active search fields after it closes.
- The popup should be safe in Forge VTT and should not rely on actor.sheet access hacks.

### Visual direction

- Use a parchment or scroll surface for the popup body.
- Keep the dark leather + bronze war-table treatment for QuickDeck framing, headers, major dividers, and popup edges.
- Keep the reference content readable: high contrast text, practical spacing, clear section headings, and moderate decoration.
- Avoid making the popup so ornate that short reference text becomes harder to scan.

### Content model

The popup should show the best available reference data, including:

- Title.
- Type or category, such as skill, spell, technique, combat reference, or local override.
- Page/reference information when available.
- Summary/details.
- Related notes if available.
- Existing skill details, spell details, source name, displayed page, description, and notes fields where present in current reference data.

### Data source guidance

- Use existing QuickDeck reference popup/data paths where possible.
- Prefer bundled repo reference summaries first, then user-owned local override metadata, consistent with current behavior.
- Missing reference data should fail softly with a small, useful message rather than a broken popup.
- Do not add network lookups or PDF parsing as part of this popup styling pass.

## 7. Icons and controls

Rows should keep controls minimal and meaningful.

- **Roll/use button:** Present where the row can trigger a native GURPS roll, cast, attack, or use action.
- **Star/pin favorite toggle:** Present where the row can be pinned to a faster surface, such as Combat favorites, Spell favorites, or Quick Skills.
- **Scroll/info icon:** Present where the row can open a reference popup or useful missing-reference placeholder.
- **Minimal icon count:** Avoid stacking unrelated controls on each row. If a control is not part of the designed workflow, do not add it.
- **Readable labels:** Icons should have tooltips or accessible labels so the UI remains understandable without relying on decoration alone.

## 8. Mockup guidance

Use mock concepts 1 and 4 as inspiration, not as a literal control inventory.

- Keep the dark leather + bronze war-table frame.
- Keep search bars where they are already useful, especially for full Skills, full Spells, and full attack lists if needed.
- Use scrolls as popup references, not as permanent main-window panels.
- Keep the main cockpit dense, readable, and action-oriented.
- Do not copy fake mockup buttons that are not real features.
- Avoid adding extra utility buttons unless they are separately designed, named, and accepted as actual product behavior.

## 9. Implementation roadmap

Future implementation should be split into small, reviewable passes.

- **v0.5.5 Combat favorites MVP:** Add per actor/client attack pinning, a compact Combat pinned area, and row star/pin toggles while preserving native attack behavior.
- **v0.5.6 Spell favorites MVP:** Add per actor/client spell pinning, a compact Spells pinned area, and row star/pin toggles while preserving native spell behavior.
- **v0.5.7 Scroll reference popup styling:** Restyle the existing reference popup path as a parchment/scroll window, keep it separate from the main QuickDeck layout, and use safe focus behavior.
- **v0.5.8 Quick Skills pinned-skill refinement:** Tighten Quick Skills as the curated pinned-skill surface and ensure reference popup affordances are available where appropriate.
- **v0.5.9 Light/heavy ornament pass:** Apply the spec's ornament hierarchy to frames, headers, popup scrolls, major dividers, and row controls without reducing readability.

## 10. Non-goals

The following are explicitly out of scope for this design direction unless a later spec supersedes this document:

- No giant full-frame image UI.
- No heavy art asset dependency yet.
- No custom damage math.
- No new GURPS rules engine.
- No `actor.sheet` hacks.
- No random mockup-only buttons.
- No permanent main-window reference encyclopedia panel.
- No network reference lookup or PDF parsing work in the favorites/scroll-popup passes.
