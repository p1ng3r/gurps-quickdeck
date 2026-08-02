from pathlib import Path

path = Path("scripts/quickdeck-app.js")
text = path.read_text(encoding="utf-8")
original_action_count = text.count("data-action")

old_render_loop = '''    for (const [region, html] of rendered) this.replaceOverlayRegion(region, html);
    this.syncOverlayShellState(data);
'''
new_render_loop = '''    const restoreRegionState = [];
    for (const [region, html] of rendered) {
      const restore = this.replaceOverlayRegion(region, html);
      if (typeof restore === "function") restoreRegionState.push(restore);
    }
    this.syncOverlayShellState(data);
'''
if text.count(old_render_loop) != 1:
    raise SystemExit(f"Expected one regional replacement loop, found {text.count(old_render_loop)}")
text = text.replace(old_render_loop, new_render_loop, 1)

old_refresh = '''    this.refreshQuickDeckCustomScrollbars();
    this.bringReferenceAppToFrontSoon();
'''
new_refresh = '''    this.refreshQuickDeckCustomScrollbars();
    for (const restore of restoreRegionState) restore();
    requestAnimationFrame(() => {
      for (const restore of restoreRegionState) restore();
      this.refreshQuickDeckCustomScrollbars();
    });
    this.bringReferenceAppToFrontSoon();
'''
if text.count(old_refresh) != 1:
    raise SystemExit(f"Expected one regional scrollbar refresh block, found {text.count(old_refresh)}")
text = text.replace(old_refresh, new_refresh, 1)

start_marker = "  replaceOverlayRegion(region, html) {\n"
end_marker = "  syncOverlayShellState(data = this.getOverlayData()) {\n"
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit("Could not locate regional replacement method block")

new_methods = '''  collectOverlayRegionElements(regionNodes, selector) {
    if (!selector) return [];
    const elements = [];
    const seen = new Set();
    const add = (element) => {
      if (!element || seen.has(element)) return;
      seen.add(element);
      elements.push(element);
    };

    for (const node of regionNodes ?? []) {
      if (node?.nodeType !== Node.ELEMENT_NODE) continue;
      if (node.matches?.(selector)) add(node);
      for (const descendant of node.querySelectorAll?.(selector) ?? []) add(descendant);
    }
    return elements;
  }

  isElementWithinOverlayRegion(element, regionNodes) {
    if (!element) return false;
    return (regionNodes ?? []).some((node) =>
      node?.nodeType === Node.ELEMENT_NODE && (node === element || node.contains?.(element))
    );
  }

  captureOverlayRegionScrollState(regionNodes) {
    const selector = [
      '[data-qd-native-scroll="true"]',
      '[data-qd-custom-scroll-candidate="true"]',
      '.qd-ui2-drawer-scroll',
      '.qd31-drawer-body',
      '.qd31-center-scroll-body',
      '.qd31-roster-list',
      '.qd31-available-list',
      '.qd31-pdf-map-list'
    ].join(', ');
    return this.collectOverlayRegionElements(regionNodes, selector).map((element, index) => ({
      index,
      scrollTop: Number(element.scrollTop) || 0,
      scrollLeft: Number(element.scrollLeft) || 0
    }));
  }

  restoreOverlayRegionScrollState(regionNodes, state = []) {
    if (!state.length) return;
    const selector = [
      '[data-qd-native-scroll="true"]',
      '[data-qd-custom-scroll-candidate="true"]',
      '.qd-ui2-drawer-scroll',
      '.qd31-drawer-body',
      '.qd31-center-scroll-body',
      '.qd31-roster-list',
      '.qd31-available-list',
      '.qd31-pdf-map-list'
    ].join(', ');
    const elements = this.collectOverlayRegionElements(regionNodes, selector);
    for (const saved of state) {
      const element = elements[saved.index];
      if (!element) continue;
      const maxTop = Math.max(0, (Number(element.scrollHeight) || 0) - (Number(element.clientHeight) || 0));
      const maxLeft = Math.max(0, (Number(element.scrollWidth) || 0) - (Number(element.clientWidth) || 0));
      element.scrollTop = Math.min(Math.max(0, saved.scrollTop), maxTop || saved.scrollTop);
      element.scrollLeft = Math.min(Math.max(0, saved.scrollLeft), maxLeft || saved.scrollLeft);
    }
  }

  getPreferredOverlaySearchAction(region) {
    if (region !== "right") return null;
    return {
      combat: "combat-search",
      skills: "skills-search",
      spells: "spells-search"
    }[this.activeDrawer] ?? null;
  }

  captureOverlayRegionFocusState(region, regionNodes) {
    const activeElement = document.activeElement;
    if (!this.isElementWithinOverlayRegion(activeElement, regionNodes)) return null;

    let target = activeElement;
    const preferredSearchAction = this.getPreferredOverlaySearchAction(region);
    if (preferredSearchAction) {
      const searchInput = this.collectOverlayRegionElements(
        regionNodes,
        `[data-action="${preferredSearchAction}"]`
      )[0];
      if (searchInput && String(searchInput.value ?? "").length > 0) target = searchInput;
    }

    const dataset = {};
    for (const key of [
      "action", "actorId", "attackIndex", "attackKey", "skillIndex", "skillKey",
      "spellIndex", "spellKey", "drawer", "refType", "refName", "pdfKey"
    ]) {
      const value = target?.dataset?.[key];
      if (value !== undefined && value !== "") dataset[key] = value;
    }

    return {
      id: target?.id ?? "",
      action: target?.dataset?.action ?? "",
      dataset,
      selectionStart: Number.isInteger(target?.selectionStart) ? target.selectionStart : null,
      selectionEnd: Number.isInteger(target?.selectionEnd) ? target.selectionEnd : null,
      selectionDirection: target?.selectionDirection ?? "none"
    };
  }

  restoreOverlayRegionFocusState(regionNodes, state) {
    if (!state) return;
    let candidates = [];

    if (state.id) {
      const byId = document.getElementById(state.id);
      if (this.isElementWithinOverlayRegion(byId, regionNodes)) candidates.push(byId);
    }
    if (!candidates.length && state.action) {
      candidates = this.collectOverlayRegionElements(regionNodes, `[data-action="${state.action}"]`);
    }

    const target = candidates.find((candidate) =>
      Object.entries(state.dataset ?? {}).every(([key, value]) => candidate?.dataset?.[key] === value)
    ) ?? candidates[0];
    if (!target) return;

    try {
      target.focus?.({ preventScroll: true });
    } catch (_error) {
      target.focus?.();
    }
    if (typeof target.setSelectionRange === "function" && state.selectionStart !== null) {
      try {
        target.setSelectionRange(state.selectionStart, state.selectionEnd ?? state.selectionStart, state.selectionDirection);
      } catch (_error) {
        // Selection restoration is best-effort for supported input types.
      }
    }
  }

  activateInsertedOverlayRegion(region, regionNodes) {
    const elementNodes = (regionNodes ?? []).filter((node) => node?.nodeType === Node.ELEMENT_NODE);
    if (!elementNodes.length) return;
    this.activateListeners($(elementNodes));

    if (region === "chrome") {
      const handles = this.collectOverlayRegionElements(elementNodes, '[data-action="drag-overlay"]');
      for (const handle of handles) {
        handle.addEventListener("pointerdown", (event) => this.startOverlayDrag(event), { passive: false });
      }
    }
  }

  replaceOverlayRegion(region, html) {
    const markers = this.getOverlayRegionMarkers(region);
    if (!markers) return null;
    const oldNodes = [];
    for (let node = markers.start.nextSibling; node && node !== markers.end; node = node.nextSibling) oldNodes.push(node);

    const scrollState = this.captureOverlayRegionScrollState(oldNodes);
    const focusState = this.captureOverlayRegionFocusState(region, oldNodes);
    for (const node of oldNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        this._quickDeckCustomScrollbarManager?.releaseWithin?.(node, { restoreHosts: false });
      }
    }

    const staging = document.createElement("div");
    staging.innerHTML = html;
    const newNodes = Array.from(staging.childNodes);
    const fragment = document.createDocumentFragment();
    for (const node of newNodes) fragment.appendChild(node);
    for (const node of oldNodes) node.remove();
    markers.end.parentNode?.insertBefore(fragment, markers.end);
    this.activateInsertedOverlayRegion(region, newNodes);

    const restore = () => {
      this.restoreOverlayRegionFocusState(newNodes, focusState);
      this.restoreOverlayRegionScrollState(newNodes, scrollState);
    };
    restore();
    return restore;
  }

'''

text = text[:start] + new_methods + text[end:]

if "this.activateListeners($(staging));" in text:
    raise SystemExit("Detached staging listener activation remains")
if "captureOverlayRegionScrollState" not in text or "restoreOverlayRegionFocusState" not in text:
    raise SystemExit("Regional state helpers were not installed")
if text.count("data-action") != original_action_count:
    raise SystemExit("data-action occurrence count changed unexpectedly")

path.write_text(text, encoding="utf-8")
