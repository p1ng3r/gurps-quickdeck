from pathlib import Path

JS_PATH = Path("scripts/quickdeck-app.js")
CSS_PATH = Path("styles/quickdeck.css")

js = JS_PATH.read_text(encoding="utf-8")
start_marker = "  onFloatingRestorePointerDown = (event) => {"
end_marker = "  stopRestorePillDrag() {"
start = js.find(start_marker)
end = js.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit("Could not locate restore-pill drag handler markers")
if js.find(start_marker, start + 1) >= 0:
    raise SystemExit("Restore-pill drag handler marker is not unique")

new_handler = '''  onFloatingRestorePointerDown = (event) => {
    if (event.button !== 2) return;

    const icon = this._floatingRestoreIcon ?? document.getElementById(this.getFloatingRestoreIconId());
    if (!icon) return;

    event.preventDefault();
    event.stopPropagation();
    this._restorePillPreventClick = true;
    this.stopRestorePillDrag();

    const startRect = icon.getBoundingClientRect();
    const startLeft = Number.parseFloat(icon.style.left) || startRect.left || icon.offsetLeft || 0;
    const startTop = Number.parseFloat(icon.style.top) || startRect.top || icon.offsetTop || 0;
    const startClientX = Number(event.clientX);
    const startClientY = Number(event.clientY);
    const pointerId = event.pointerId;
    const dragThreshold = 10;
    const maxLeft = Math.max(0, window.innerWidth - (startRect.width || icon.offsetWidth || 0));
    const maxTop = Math.max(0, window.innerHeight - (startRect.height || icon.offsetHeight || 0));
    let didDrag = false;
    let latestPosition = {
      left: startLeft,
      top: startTop,
      deltaX: 0,
      deltaY: 0
    };

    const applyPendingTransform = () => {
      this._restorePillDragRaf = null;
      const pending = this._restorePillPendingPosition;
      this._restorePillPendingPosition = null;
      if (!pending) return;
      icon.style.transform = `translate3d(${pending.deltaX}px, ${pending.deltaY}px, 0)`;
    };

    const queueTransform = (nextLeft, nextTop) => {
      const clampedLeft = Math.min(Math.max(0, Number(nextLeft) || 0), maxLeft);
      const clampedTop = Math.min(Math.max(0, Number(nextTop) || 0), maxTop);
      latestPosition = {
        left: clampedLeft,
        top: clampedTop,
        deltaX: clampedLeft - startLeft,
        deltaY: clampedTop - startTop
      };
      this._restorePillPendingPosition = latestPosition;
      if (this._restorePillDragRaf) return;
      this._restorePillDragRaf = requestAnimationFrame(applyPendingTransform);
    };

    const flushPendingTransform = () => {
      if (this._restorePillDragRaf) cancelAnimationFrame(this._restorePillDragRaf);
      this._restorePillDragRaf = null;
      applyPendingTransform();
    };

    const commitPosition = () => {
      flushPendingTransform();
      if (!didDrag) {
        icon.style.removeProperty("transform");
        return;
      }
      icon.style.left = `${latestPosition.left}px`;
      icon.style.top = `${latestPosition.top}px`;
      icon.style.right = "auto";
      icon.style.removeProperty("transform");
      this.restorePillPosition = {
        left: latestPosition.left,
        top: latestPosition.top
      };
      this.persistRestorePillPosition(this.restorePillPosition);
    };

    const onPointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const deltaX = Number(moveEvent.clientX) - startClientX;
      const deltaY = Number(moveEvent.clientY) - startClientY;
      if (!didDrag && Math.hypot(deltaX, deltaY) >= dragThreshold) didDrag = true;
      if (!didDrag) return;
      moveEvent.preventDefault();
      queueTransform(startLeft + deltaX, startTop + deltaY);
    };

    const finishDrag = (finishEvent = null) => {
      if (finishEvent?.pointerId !== undefined && finishEvent.pointerId !== pointerId) return;
      commitPosition();
      this._restorePillPreventClick = false;
      this.stopRestorePillDrag();
    };

    const onWindowBlur = () => finishDrag();
    const abortController = typeof AbortController === "function" ? new AbortController() : null;
    const listenerOptions = abortController ? { signal: abortController.signal } : undefined;
    window.addEventListener("pointermove", onPointerMove, listenerOptions);
    window.addEventListener("pointerup", finishDrag, listenerOptions);
    window.addEventListener("pointercancel", finishDrag, listenerOptions);
    window.addEventListener("blur", onWindowBlur, listenerOptions);

    this._restorePillDragCleanup = () => {
      if (abortController) {
        abortController.abort();
      } else {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", finishDrag);
        window.removeEventListener("pointercancel", finishDrag);
        window.removeEventListener("blur", onWindowBlur);
      }
      try {
        if (icon.hasPointerCapture?.(pointerId)) icon.releasePointerCapture(pointerId);
      } catch (_error) {}
    };

    icon.classList.add("is-dragging");
    icon.style.userSelect = "none";
    icon.style.touchAction = "none";
    document.body.style.userSelect = "none";
    try { icon.setPointerCapture?.(pointerId); } catch (_error) {}
  };

'''
js = js[:start] + new_handler + js[end:]

stop_start = js.find(end_marker)
stop_end_marker = "  getClampedRestorePillPosition(left, top, icon) {"
stop_end = js.find(stop_end_marker, stop_start)
if stop_start < 0 or stop_end < 0:
    raise SystemExit("Could not locate restore-pill cleanup markers")

new_stop = '''  stopRestorePillDrag() {
    if (this._restorePillDragRaf) cancelAnimationFrame(this._restorePillDragRaf);
    this._restorePillDragRaf = null;
    this._restorePillPendingPosition = null;
    if (typeof this._restorePillDragCleanup === "function") {
      this._restorePillDragCleanup();
    }
    this._restorePillDragCleanup = null;
    const icon = this._floatingRestoreIcon ?? document.getElementById(this.getFloatingRestoreIconId());
    icon?.classList?.remove("is-dragging");
    icon?.style?.removeProperty("transform");
    icon?.style?.removeProperty("user-select");
    icon?.style?.removeProperty("touch-action");
    document.body.style.removeProperty("user-select");
  }

'''
js = js[:stop_start] + new_stop + js[stop_end:]
JS_PATH.write_text(js, encoding="utf-8")

css = CSS_PATH.read_text(encoding="utf-8")
block_start_marker = ".quickdeck-floating-restore {"
hover_marker = ".quickdeck-floating-restore:hover {"
block_start = css.find(block_start_marker)
hover_start = css.find(hover_marker, block_start)
if block_start < 0 or hover_start < 0:
    raise SystemExit("Could not locate restore-pill CSS block")
block = css[block_start:hover_start]
if "contain: layout style paint;" not in block:
    block = block.replace(
        "  cursor: pointer;\n}",
        "  cursor: pointer;\n  contain: layout style paint;\n  will-change: transform;\n  transform: translate3d(0, 0, 0);\n  backface-visibility: hidden;\n}\n\n.quickdeck-floating-restore.is-dragging {\n  cursor: move;\n  transition: none !important;\n}",
    )
    if "contain: layout style paint;" not in block:
        raise SystemExit("Could not add compositor CSS to restore pill")
css = css[:block_start] + block + css[hover_start:]
CSS_PATH.write_text(css, encoding="utf-8")
