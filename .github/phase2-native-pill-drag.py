from pathlib import Path

js_path = Path("scripts/quickdeck-app.js")
css_path = Path("styles/quickdeck.css")

js = js_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

old_fields = '''    this._floatingRestoreIcon = null;
    this._restorePillDragCleanup = null;
    this._restorePillDragRaf = null;
    this._restorePillPendingPosition = null;
    this._restorePillPreventClick = false;
'''
new_fields = '''    this._floatingRestoreIcon = null;
    this._restorePillDraggable = null;
    this._restorePillDragAdapter = null;
    this._restorePillDragElement = null;
    this._restorePillNativePointerDown = null;
    this._restorePillNativeDragCleanup = null;
    this._restorePillPreventClick = false;
'''
if js.count(old_fields) != 1:
    raise SystemExit(f"Expected one restore-pill field block, found {js.count(old_fields)}")
js = js.replace(old_fields, new_fields, 1)

start_marker = "  ensureFloatingRestoreIcon() {\n"
end_marker = "  getClampedRestorePillPosition(left, top, icon) {\n"
start = js.find(start_marker)
end = js.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit("Could not locate restore-pill method block")

new_methods = '''  ensureFloatingRestoreIcon() {
    const existing = document.getElementById(this.getFloatingRestoreIconId());
    if (existing) {
      this._floatingRestoreIcon = existing;
      this.applyRestorePillPosition(existing);
      this.setupFloatingRestoreDraggable(existing);
      return;
    }

    const icon = document.createElement("button");
    icon.type = "button";
    icon.id = this.getFloatingRestoreIconId();
    icon.className = "quickdeck-floating-restore";
    icon.title = "Click to restore · drag to move";
    icon.setAttribute("aria-label", "Click to restore · drag to move");
    icon.innerHTML = '<span class="quickdeck-floating-restore-mark">QD</span><span class="quickdeck-floating-restore-label">QuickDeck</span>';
    icon.addEventListener("click", this.onFloatingRestoreClick);
    document.body.appendChild(icon);
    this._floatingRestoreIcon = icon;
    this.applyRestorePillPosition(icon);
    this.setupFloatingRestoreDraggable(icon);
  }

  getFloatingRestoreIconId() {
    return `quickdeck-floating-restore-${this.appId}`;
  }

  onFloatingRestoreClick = (event) => {
    event.preventDefault();
    if (this.pendingTargetOpponentAttackIndex !== null) {
      ui.notifications?.info("QuickDeck: Choose a target or press Escape/right-click to cancel targeting first.");
      return;
    }
    if (this._restorePillPreventClick) {
      this._restorePillPreventClick = false;
      return;
    }
    this.isMinimized = false;
    this.persistMinimizedState();
    this.syncMinimizedPresentation();
    this.requestOverlayRender("all", { reason: "restore-pill" });
  };

  getFoundryDraggableClass() {
    const draggable = foundry?.applications?.ux?.Draggable ?? globalThis.Draggable ?? null;
    return draggable?.implementation ?? draggable;
  }

  setupFloatingRestoreDraggable(icon) {
    if (!icon) return false;
    if (this._restorePillDraggable && this._restorePillDragElement === icon) return true;

    this.teardownFloatingRestoreDraggable();
    const DraggableClass = this.getFoundryDraggableClass();
    if (typeof DraggableClass !== "function") {
      console.warn("gurps-quickdeck | Foundry Draggable is unavailable for the restore pill.");
      return false;
    }

    const initialRect = icon.getBoundingClientRect();
    const adapter = {
      appId: `${this.appId}-restore-pill`,
      element: icon,
      rendered: true,
      options: { popOut: true, resizable: false },
      position: {
        left: initialRect.left,
        top: initialRect.top,
        width: initialRect.width,
        height: initialRect.height,
        scale: 1
      },
      setPosition: (position = {}) => {
        const left = Number(position.left);
        const top = Number(position.top);
        const currentLeft = Number(adapter.position.left) || 0;
        const currentTop = Number(adapter.position.top) || 0;
        const clamped = this.getClampedRestorePillPosition(
          Number.isFinite(left) ? left : currentLeft,
          Number.isFinite(top) ? top : currentTop,
          icon
        );
        const rect = icon.getBoundingClientRect();
        const width = Number(position.width);
        const height = Number(position.height);
        const scale = Number(position.scale);

        icon.style.left = `${clamped.left}px`;
        icon.style.top = `${clamped.top}px`;
        icon.style.right = "auto";
        this.restorePillPosition = clamped;
        adapter.position = {
          ...adapter.position,
          ...clamped,
          width: Number.isFinite(width) ? width : rect.width,
          height: Number.isFinite(height) ? height : rect.height,
          scale: Number.isFinite(scale) ? scale : adapter.position.scale
        };
        return adapter.position;
      },
      bringToTop: () => adapter,
      bringToFront: () => adapter,
      _onResize: () => {}
    };

    try {
      const draggable = new DraggableClass(adapter, icon, icon, false);
      draggable.activateListeners();
      this._restorePillDraggable = draggable;
      this._restorePillDragAdapter = adapter;
      this._restorePillDragElement = icon;
    } catch (error) {
      console.warn("gurps-quickdeck | Could not attach Foundry native dragging to the restore pill.", error);
      return false;
    }

    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      const pointerId = event.pointerId;
      const startClientX = Number(event.clientX);
      const startClientY = Number(event.clientY);
      const startRect = icon.getBoundingClientRect();
      let didDrag = false;

      if (typeof this._restorePillNativeDragCleanup === "function") {
        this._restorePillNativeDragCleanup();
      }

      const onPointerMove = (moveEvent) => {
        if (moveEvent.pointerId !== pointerId || didDrag) return;
        const deltaX = Number(moveEvent.clientX) - startClientX;
        const deltaY = Number(moveEvent.clientY) - startClientY;
        if (Math.hypot(deltaX, deltaY) < 4) return;
        didDrag = true;
        this._restorePillPreventClick = true;
        icon.classList.add("is-dragging");
      };

      const cleanup = () => {
        window.removeEventListener("pointermove", onPointerMove, true);
        window.removeEventListener("pointerup", finishDrag, true);
        window.removeEventListener("pointercancel", finishDrag, true);
        this._restorePillNativeDragCleanup = null;
      };

      const finishDrag = (finishEvent) => {
        if (finishEvent?.pointerId !== undefined && finishEvent.pointerId !== pointerId) return;
        cleanup();
        icon.classList.remove("is-dragging");

        if (didDrag) {
          requestAnimationFrame(() => {
            if (!icon.isConnected) return;
            const finalRect = icon.getBoundingClientRect();
            const clamped = this.getClampedRestorePillPosition(finalRect.left, finalRect.top, icon);
            icon.style.left = `${clamped.left}px`;
            icon.style.top = `${clamped.top}px`;
            icon.style.right = "auto";
            this.restorePillPosition = clamped;
            if (this._restorePillDragAdapter) {
              this._restorePillDragAdapter.position = {
                ...this._restorePillDragAdapter.position,
                ...clamped,
                width: finalRect.width,
                height: finalRect.height
              };
            }
            this.persistRestorePillPosition(clamped);
          });
        }

        globalThis.setTimeout?.(() => {
          this._restorePillPreventClick = false;
        }, 0);
      };

      this._restorePillNativeDragCleanup = cleanup;
      window.addEventListener("pointermove", onPointerMove, true);
      window.addEventListener("pointerup", finishDrag, true);
      window.addEventListener("pointercancel", finishDrag, true);

      if (startRect.left !== Number(this._restorePillDragAdapter?.position?.left)
        || startRect.top !== Number(this._restorePillDragAdapter?.position?.top)) {
        this._restorePillDragAdapter.position = {
          ...this._restorePillDragAdapter.position,
          left: startRect.left,
          top: startRect.top,
          width: startRect.width,
          height: startRect.height
        };
      }
    };

    icon.addEventListener("pointerdown", onPointerDown, true);
    this._restorePillNativePointerDown = onPointerDown;
    return true;
  }

  teardownFloatingRestoreDraggable(icon = this._restorePillDragElement ?? this._floatingRestoreIcon) {
    if (typeof this._restorePillNativeDragCleanup === "function") {
      this._restorePillNativeDragCleanup();
    }
    this._restorePillNativeDragCleanup = null;

    if (icon && this._restorePillNativePointerDown) {
      icon.removeEventListener("pointerdown", this._restorePillNativePointerDown, true);
      icon.classList.remove("is-dragging");
    }

    this._restorePillNativePointerDown = null;
    this._restorePillDraggable = null;
    this._restorePillDragAdapter = null;
    this._restorePillDragElement = null;
    this._restorePillPreventClick = false;
  }

'''
js = js[:start] + new_methods + js[end:]

old_remove = '''  removeFloatingRestoreIcon() {
    this.stopRestorePillDrag();
    const icon = this._floatingRestoreIcon ?? document.getElementById(this.getFloatingRestoreIconId());
    if (!icon) return;
    icon.removeEventListener("contextmenu", this.onFloatingRestoreContextMenu);
    icon.removeEventListener("pointerdown", this.onFloatingRestorePointerDown);
    icon.removeEventListener("click", this.onFloatingRestoreClick);
    icon.remove();
    this._floatingRestoreIcon = null;
  }
'''
new_remove = '''  removeFloatingRestoreIcon() {
    const icon = this._floatingRestoreIcon ?? document.getElementById(this.getFloatingRestoreIconId());
    this.teardownFloatingRestoreDraggable(icon);
    if (!icon) return;
    icon.removeEventListener("click", this.onFloatingRestoreClick);
    icon.remove();
    this._floatingRestoreIcon = null;
  }
'''
if js.count(old_remove) != 1:
    raise SystemExit(f"Expected one restore-pill removal block, found {js.count(old_remove)}")
js = js.replace(old_remove, new_remove, 1)

old_css = '''  cursor: pointer;
  contain: layout style paint;
  will-change: transform;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
'''
new_css = '''  cursor: grab;
  contain: layout style paint;
'''
if css.count(old_css) != 1:
    raise SystemExit(f"Expected one restore-pill GPU CSS block, found {css.count(old_css)}")
css = css.replace(old_css, new_css, 1)
css = css.replace('''.quickdeck-floating-restore.is-dragging {
  cursor: move;
''', '''.quickdeck-floating-restore.is-dragging {
  cursor: grabbing;
''', 1)

if "onFloatingRestorePointerDown" in js or "stopRestorePillDrag" in js:
    raise SystemExit("Legacy restore-pill drag methods remain")
if "new DraggableClass(adapter, icon, icon, false)" not in js:
    raise SystemExit("Native Foundry Draggable was not installed")

js_path.write_text(js, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")
