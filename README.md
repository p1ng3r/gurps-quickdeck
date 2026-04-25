# GURPS QuickDeck

A Foundry VTT module that adds a lightweight, tabbed character viewer for GURPS worlds.

## MVP Features

- Adds a **QuickDeck** button to the **Actor Directory** header.
- Opens one resizable QuickDeck window.
- Lists available character actors.
- Clicking a character adds/activates a tab for that actor.
- Tabs show actor name and portrait.
- Clicking a tab switches the active actor view.
- Uses defensive data access so missing GURPS paths do not crash the app.

## Compatibility

- **Foundry VTT**: minimum v12, verified for v13.
- **System dependency**: `gurps`.

## Development

This repository contains a first MVP and intentionally does **not** embed the full GURPS actor sheet.
