# Command Desk Asset Manifest

All shipped assets in this pack were exported as WebP at quality 75.

## Important distinction

This pack includes two asset types:

1. `*-source-crop.webp`
   - Direct crops from the reference screenshot.
   - Useful for style reference, sampling, and quick prototypes.
   - Some may contain baked-in UI state, text, or icons.

2. `*-clean.webp`
   - Reusable generated assets based on the screenshot's visual language.
   - Preferred for actual Foundry UI wiring.
   - No baked character names, spell names, or actor portraits.

## Recommended assets for first implementation

Use these first:

```text
assets/ui/command-desk/panels/qd-clean-leather-panel.webp
assets/ui/command-desk/panels/qd-clean-roster-panel.webp
assets/ui/command-desk/panels/qd-clean-center-panel.webp
assets/ui/command-desk/parchment/qd-clean-parchment-panel.webp
assets/ui/command-desk/parchment/qd-clean-parchment-row.webp
assets/ui/command-desk/buttons/qd-button-brass-idle.webp
assets/ui/command-desk/buttons/qd-button-brass-hover.webp
assets/ui/command-desk/buttons/qd-button-brass-active.webp
assets/ui/command-desk/tabs/qd-tab-idle.webp
assets/ui/command-desk/tabs/qd-tab-active.webp
assets/ui/command-desk/defense/qd-defense-dodge-clean.webp
assets/ui/command-desk/defense/qd-defense-parry-clean.webp
assets/ui/command-desk/defense/qd-defense-block-clean.webp
assets/ui/command-desk/footer/qd-gurps-nameplate-clean.webp
```

## Later polish candidates

Use the direct source crops later for detailed frame matching:

```text
assets/ui/command-desk/frames/
assets/ui/command-desk/dividers/
assets/ui/command-desk/footer/qd-footer-bar.webp
```
