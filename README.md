# GURPS QuickDeck

A Foundry VTT module that adds a lightweight, tabbed character viewer for GURPS worlds.

## MVP Features

- Adds a **QuickDeck** button to the **Actor Directory** header.
- Opens one resizable QuickDeck window.
- Lists available actors that can reasonably open a sheet (characters/NPCs/enemies, system-dependent).
- Clicking an actor adds/activates a tab for that actor.
- Double-clicking an actor opens the full Foundry actor sheet.
- Tabs show actor name and portrait.
- Clicking a tab switches the active actor view.
- Right-side **Combat Burst** panel can be collapsed/expanded with a launcher button.
- Expanded panel emphasizes portrait, HP, FP, dodge, defense summary, and attacks.
- Uses defensive data access so missing GURPS paths do not crash the app.

## Compatibility

- **Foundry VTT**: minimum v12, verified for v13.
- **System dependency**: `gurps`.

## Development

This repository contains a first MVP and intentionally does **not** embed the full GURPS actor sheet.
