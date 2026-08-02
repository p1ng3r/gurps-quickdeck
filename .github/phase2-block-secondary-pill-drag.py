from pathlib import Path

path = Path("scripts/quickdeck-app.js")
text = path.read_text(encoding="utf-8")

old_existing = '''      this._floatingRestoreIcon = existing;
      this.applyRestorePillPosition(existing);
      this.setupFloatingRestoreDraggable(existing);
      return;
'''
new_existing = '''      this._floatingRestoreIcon = existing;
      this.applyRestorePillPosition(existing);
      this.installFloatingRestoreMouseGuards(existing);
      this.setupFloatingRestoreDraggable(existing);
      return;
'''
if text.count(old_existing) != 1:
    raise SystemExit(f"Expected one existing-pill setup block, found {text.count(old_existing)}")
text = text.replace(old_existing, new_existing, 1)

old_new = '''    document.body.appendChild(icon);
    this._floatingRestoreIcon = icon;
    this.applyRestorePillPosition(icon);
    this.setupFloatingRestoreDraggable(icon);
  }
'''
new_new = '''    document.body.appendChild(icon);
    this._floatingRestoreIcon = icon;
    this.applyRestorePillPosition(icon);
    this.installFloatingRestoreMouseGuards(icon);
    this.setupFloatingRestoreDraggable(icon);
  }
'''
if text.count(old_new) != 1:
    raise SystemExit(f"Expected one new-pill setup block, found {text.count(old_new)}")
text = text.replace(old_new, new_new, 1)

marker = '''  getFoundryDraggableClass() {
'''
methods = '''  onFloatingRestoreNonPrimaryMouse = (event) => {
    if (Number(event?.button) === 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  };

  onFloatingRestoreContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  };

  installFloatingRestoreMouseGuards(icon) {
    if (!icon) return;
    icon.addEventListener("pointerdown", this.onFloatingRestoreNonPrimaryMouse, true);
    icon.addEventListener("mousedown", this.onFloatingRestoreNonPrimaryMouse, true);
    icon.addEventListener("auxclick", this.onFloatingRestoreNonPrimaryMouse, true);
    icon.addEventListener("contextmenu", this.onFloatingRestoreContextMenu, true);
  }

  uninstallFloatingRestoreMouseGuards(icon) {
    if (!icon) return;
    icon.removeEventListener("pointerdown", this.onFloatingRestoreNonPrimaryMouse, true);
    icon.removeEventListener("mousedown", this.onFloatingRestoreNonPrimaryMouse, true);
    icon.removeEventListener("auxclick", this.onFloatingRestoreNonPrimaryMouse, true);
    icon.removeEventListener("contextmenu", this.onFloatingRestoreContextMenu, true);
  }

'''
if text.count(marker) != 1:
    raise SystemExit(f"Expected one Foundry draggable marker, found {text.count(marker)}")
text = text.replace(marker, methods + marker, 1)

old_remove = '''  removeFloatingRestoreIcon() {
    const icon = this._floatingRestoreIcon ?? document.getElementById(this.getFloatingRestoreIconId());
    this.teardownFloatingRestoreDraggable(icon);
    if (!icon) return;
'''
new_remove = '''  removeFloatingRestoreIcon() {
    const icon = this._floatingRestoreIcon ?? document.getElementById(this.getFloatingRestoreIconId());
    this.uninstallFloatingRestoreMouseGuards(icon);
    this.teardownFloatingRestoreDraggable(icon);
    if (!icon) return;
'''
if text.count(old_remove) != 1:
    raise SystemExit(f"Expected one pill removal block, found {text.count(old_remove)}")
text = text.replace(old_remove, new_remove, 1)

required = [
    'icon.addEventListener("mousedown", this.onFloatingRestoreNonPrimaryMouse, true);',
    'icon.addEventListener("contextmenu", this.onFloatingRestoreContextMenu, true);',
    'this.uninstallFloatingRestoreMouseGuards(icon);'
]
for needle in required:
    if needle not in text:
        raise SystemExit(f"Missing expected secondary-button guard: {needle}")

path.write_text(text, encoding="utf-8")
