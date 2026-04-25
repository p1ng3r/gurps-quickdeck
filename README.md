# GURPS QuickDeck

A Foundry VTT module that adds a lightweight, drawer-based character viewer for GURPS worlds.

## Features

- Adds a **QuickDeck** button to the **Actor Directory** header.
- Opens one resizable QuickDeck window.
- Uses a **selected roster** model:
  - **Available Actors** list includes renderable actors (searchable).
  - **QuickDeck Roster** contains actors you explicitly add.
  - Add flow still supports the existing **Available Actors** add button.
  - Supports drag-and-drop from Foundry's **Actor Directory** directly onto the roster drop zone.
  - Single-clicking a roster actor selects/activates it in QuickDeck.
  - Double-clicking a roster actor opens the full Foundry actor sheet.
  - Each roster actor has a remove button that removes it from QuickDeck only (not Foundry).
  - Includes **Clear Roster** utility button.
- Right-side vertical drawer tabs:
  - **Combat Burst**
  - **Skills**
- Only one right drawer can be open at a time; clicking an active drawer tab closes it.
- Combat Burst drawer emphasizes portrait, HP, FP, dodge/parry/block summary, and attacks.
- Combat Burst includes quick roll buttons for Dodge, Parry, Block, and each listed attack.
- Drawer headers include an **Open Sheet** button for the selected actor.
- Roster and Available Actors include count badges and actor type labels (if present).
- Drawer panels are scroll-safe; long attacks and skills lists scroll within the drawer.
- Skills drawer safely extracts from common GURPS paths and renders normalized skills.
- Uses defensive data access and defensive drop parsing so missing/invalid data does not crash the app.

## Compatibility

- **Foundry VTT**: minimum v12, verified for v13.
- **System dependency**: `gurps`.

## Development

This repository intentionally keeps QuickDeck focused and does **not** embed the full GURPS actor sheet inside QuickDeck.
