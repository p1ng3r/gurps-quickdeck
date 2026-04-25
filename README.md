# GURPS QuickDeck

A Foundry VTT module that adds a lightweight, drawer-based character viewer for GURPS worlds.

## MVP Features

- Adds a **QuickDeck** button to the **Actor Directory** header.
- Opens one resizable QuickDeck window.
- Lists available actors that can reasonably open a sheet (characters/NPCs/enemies, system-dependent).
- Single-clicking an actor selects/activates it in QuickDeck.
- Double-clicking an actor opens the full Foundry actor sheet.
- Keeps internal actor tab state without showing a visible top tab bar.
- Right-side vertical drawer tabs:
  - **Combat Burst**
  - **Skills**
- Only one right drawer can be open at a time; clicking an active drawer tab closes it.
- Combat Burst drawer emphasizes portrait, HP, FP, dodge/parry/block summary, and attacks.
- Combat Burst includes quick roll buttons for Dodge, Parry, Block, and each listed attack.
- Drawer panels are scroll-safe; long attacks and skills lists scroll within the drawer.
- Skills drawer safely extracts from common GURPS paths and renders normalized skills.
- Uses defensive data access so missing GURPS paths do not crash the app.

## Compatibility

- **Foundry VTT**: minimum v12, verified for v13.
- **System dependency**: `gurps`.

## Development

This repository contains a focused MVP and intentionally does **not** embed the full GURPS actor sheet inside QuickDeck.
