# Codex Prompt 01 — Add v0.7 Command Desk asset foundation

Repo:
https://github.com/p1ng3r/gurps-quickdeck

Branch:
Create or use `codex/v0.7.0-art-filled-command-desk-ui-local`.

Context:
We are starting GURPS QuickDeck v0.7.0 as an art-filled Command Desk UI pass based on the locked screenshot target. The goal is dark leather, brass/bronze rails, parchment drawer, circular Dodge/Parry/Block buttons, and a bottom GURPS footer feel.

Critical rule:
This pass is asset/file-structure foundation only. Do not change runtime logic.

Tasks:
1. Add the new art folder structure:
   - `assets/ui/command-desk/buttons/`
   - `assets/ui/command-desk/defense/`
   - `assets/ui/command-desk/dividers/`
   - `assets/ui/command-desk/footer/`
   - `assets/ui/command-desk/frames/`
   - `assets/ui/command-desk/icons/`
   - `assets/ui/command-desk/panels/`
   - `assets/ui/command-desk/parchment/`
   - `assets/ui/command-desk/reference/`
   - `assets/ui/command-desk/tabs/`
2. Add the provided `.webp` assets at quality 75.
3. Add `styles/quickdeck-command-desk.css`.
4. Wire the new stylesheet in `module.json` after the existing stylesheet.
5. Add documentation:
   - `docs/v0.7-art-command-desk-roadmap.md`
   - `docs/asset-manifest.md`
6. Do not remove, rename, or alter any existing `data-action` attributes.
7. Do not touch attack, defense, spell, skill, actor, source, or minimize behavior.
8. Do not use large noisy full-panel art as the whole UI.

Acceptance checks:
- Module loads with no missing CSS file error.
- No JavaScript behavior changed.
- Existing QuickDeck still opens.
- Console has no missing asset path errors for assets referenced by the new CSS.
