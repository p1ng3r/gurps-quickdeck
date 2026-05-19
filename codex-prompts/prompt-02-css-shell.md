# Codex Prompt 02 — CSS-only Command Desk shell pass

Repo:
https://github.com/p1ng3r/gurps-quickdeck

Branch:
`codex/v0.7.0-art-filled-command-desk-ui-local`

Goal:
Use the v0.7 Command Desk WebP asset pack to move the existing QuickDeck UI toward the locked screenshot target.

Hard constraints:
- CSS-only unless absolutely necessary.
- Prefer editing only `styles/quickdeck-command-desk.css`.
- No behavior changes.
- No actor.sheet access.
- No fake GURPS logic.
- Preserve all existing `data-action` hooks.
- Preserve minimize/restore pill behavior.
- Decorative layers must use `pointer-events: none`.
- Do not use one giant background screenshot.

Visual goals:
- Dark leather/brass outer shell.
- Header feels like “GURPS QUICKDECK COMMAND DESK.”
- Left roster uses dark leather panel.
- Center cockpit uses dark leather/brass cards.
- Right drawer uses parchment panel.
- Tabs use brass active/idle state.
- Dodge/Parry/Block become large circular medallions.
- Bottom footer gets GURPS command desk feel.

Implementation:
1. Inspect current DOM/classes in templates and rendered QuickDeck markup.
2. Map existing classes to the CSS skin.
3. Add selectors conservatively.
4. Do not rename template classes unless unavoidable.
5. Keep all buttons clickable and readable.
6. Add responsive min/max sizing only after the default layout matches.

Manual test:
- Open QuickDeck.
- Add/select actors.
- Use HP/FP controls.
- Roll Dodge/Parry/Block.
- Switch all tabs.
- Confirm drawer scroll.
- Minimize and restore.
- Confirm no art blocks clicks.
- Confirm no console errors.
