const OVERLAY_SELECTOR = "#gurps-quickdeck-overlay";
const LIVE_STYLE_ID = "qd-art-tuner-live-style";
const PANEL_ID = "qd-art-tuner-panel";
const HOVER_BOX_ID = "qd-art-tuner-hover-box";
const SELECTED_BOX_ID = "qd-art-tuner-selected-box";
const STORAGE_KEY = "gurpsQuickDeck.artTuner.v1";
const TARGET_CATEGORIES = ["Center Panel", "Left Panel", "Right Panel", "Overlay / Shell", "Settings", "All"];
const STRUCTURAL_WRAPPER_CLASSES = [
  "qd40-frame",
  "qd40-body",
  "qd31-shell",
  "qd31-left-panel-wrap",
  "qd31-center-wrap",
  "qd31-right-panel-wrap"
];
const PRESETS = [
  { label: "Move circle", selector: `${OVERLAY_SELECTOR} .qd31-center-move-medallion` },
  { label: "Move tile", selector: `${OVERLAY_SELECTOR} .qd31-center-move-tile` },
  { label: "Move title", selector: `${OVERLAY_SELECTOR} .qd31-center-move-title` },
  { label: "Move value", selector: `${OVERLAY_SELECTOR} .qd31-center-move-value` },
  { label: "Dodge dial", selector: `${OVERLAY_SELECTOR} .qd31-defense-grid > button.qd31-defense-dial:nth-of-type(1)` },
  { label: "Parry dial", selector: `${OVERLAY_SELECTOR} .qd31-defense-grid > button.qd31-defense-dial:nth-of-type(2)` },
  { label: "Block dial", selector: `${OVERLAY_SELECTOR} .qd31-defense-grid > button.qd31-defense-dial:nth-of-type(3)` },
  { label: "Defense dials group", selector: `${OVERLAY_SELECTOR} .qd31-defense-dial` },
  { label: "Defense dials", selector: `${OVERLAY_SELECTOR} .qd31-defense-dial` },
  { label: "Defense backing", selector: `${OVERLAY_SELECTOR} .qd31-defense-grid`, pseudo: "::before", baseWidth: "106%", baseHeight: "138%" },
  { label: "Defense grid", selector: `${OVERLAY_SELECTOR} .qd31-defense-grid` },
  { label: "Header art", selector: `${OVERLAY_SELECTOR} .qd31-center-art-header`, pseudo: "::before", baseWidth: "106%", baseHeight: "142%" },
  { label: "Footer rail", selector: `${OVERLAY_SELECTOR} .qd31-center-footer`, pseudo: "::before", baseWidth: "108%", baseHeight: "225%" },
  { label: "Center cockpit", selector: `${OVERLAY_SELECTOR} .qd31-center-cockpit` },
  { label: "Actor card", selector: `${OVERLAY_SELECTOR} .qd31-actor-card` },
  { label: "Command row", selector: `${OVERLAY_SELECTOR} .qd31-command-icon-row` },
  { label: "Center favorites body", selector: `${OVERLAY_SELECTOR} .qd31-center-scroll-body` },
  { label: "Left drawer", selector: `${OVERLAY_SELECTOR} .qd31-left-drawer` },
  { label: "Right drawer", selector: `${OVERLAY_SELECTOR} .qd31-right-drawer` }
];

const state = {
  installed: false,
  active: false,
  panel: null,
  hoverBox: null,
  selectedBox: null,
  selected: null,
  hoverElement: null,
  drag: null,
  entries: new Map(),
  panelPosition: null,
  panelDrag: null,
  targetCategory: "Center Panel",
  targetSearch: "",
  showStructuralWrappers: false,
  browserTargets: [],
  raf: null,
  listeners: []
};

function installQuickDeckArtTunerGlobals() {
  if (state.installed) return;
  state.installed = true;
  loadState();
  applyLiveCss();
  window.qdArtTunerOn = turnOn;
  window.qdArtTunerOff = turnOff;
  window.qdArtTunerReset = resetAll;
  window.qdArtTunerCopyCss = copyCss;
  window.qdArtTunerSelectPreset = selectPreset;
  window.qdArtTunerStatus = status;
}

function turnOn() {
  if (state.active) {
    renderPanel();
    scheduleBoxUpdate();
    return;
  }
  state.active = true;
  ensureChrome();
  addListener(document, "mousemove", onMouseMove, true);
  addListener(document, "mousedown", onMouseDown, true);
  addListener(document, "mouseup", onMouseUp, true);
  addListener(document, "keydown", onKeyDown, true);
  addListener(document, "contextmenu", onContextMenu, true);
  addListener(state.selectedBox, "pointerdown", onSelectedBoxPointerDown, true);
  addListener(window, "pointermove", onPointerMove, true);
  addListener(window, "pointerup", onPointerUp, true);
  addListener(window, "pointercancel", onPointerUp, true);
  addListener(window, "resize", scheduleBoxUpdate);
  renderPanel();
  scheduleBoxUpdate();
}

function turnOff() {
  state.active = false;
  state.drag = null;
  state.panelDrag = null;
  for (const [target, type, handler, options] of state.listeners) target.removeEventListener(type, handler, options);
  state.listeners = [];
  removeNode(state.panel);
  removeNode(state.hoverBox);
  removeNode(state.selectedBox);
  state.panel = null;
  state.hoverBox = null;
  state.selectedBox = null;
  state.hoverElement = null;
}

function resetAll() {
  turnOff();
  state.selected = null;
  state.entries.clear();
  state.targetSearch = "";
  state.showStructuralWrappers = false;
  window.localStorage?.removeItem(STORAGE_KEY);
  removeNode(document.getElementById(LIVE_STYLE_ID));
}

function addListener(target, type, handler, options = false) {
  target.addEventListener(type, handler, options);
  state.listeners.push([target, type, handler, options]);
}

function ensureChrome() {
  if (!state.panel) {
    state.panel = document.createElement("div");
    state.panel.id = PANEL_ID;
    Object.assign(state.panel.style, {
      position: "fixed",
      zIndex: "100000",
      width: "340px",
      maxHeight: "calc(100vh - 32px)",
      overflow: "auto",
      padding: "0 10px 10px",
      color: "#f7e4b3",
      background: "rgba(20, 13, 8, 0.94)",
      border: "1px solid #d4a84b",
      borderRadius: "8px",
      boxShadow: "0 6px 24px rgba(0,0,0,0.55)",
      font: "12px/1.35 sans-serif",
      pointerEvents: "auto"
    });
    document.body.appendChild(state.panel);
    positionPanel();
  }
  state.hoverBox = state.hoverBox || makeBox(HOVER_BOX_ID, "#70d6ff", "rgba(112,214,255,0.10)", false);
  state.selectedBox = state.selectedBox || makeBox(SELECTED_BOX_ID, "#ffd166", "rgba(255,209,102,0.14)", true);
}

function makeBox(id, borderColor, bgColor, interactive) {
  let box = document.getElementById(id);
  if (!box) {
    box = document.createElement("div");
    box.id = id;
    document.body.appendChild(box);
  }
  Object.assign(box.style, {
    position: "fixed",
    display: "none",
    zIndex: "99999",
    pointerEvents: interactive ? "auto" : "none",
    border: `2px dashed ${borderColor}`,
    background: bgColor,
    boxSizing: "border-box",
    borderRadius: "3px",
    cursor: interactive ? "move" : "default",
    touchAction: interactive ? "none" : "auto",
    userSelect: "none"
  });
  if (interactive) {
    box.title = "Drag to move; Alt+drag resize";
    if (!box.querySelector(".qd-art-tuner-selected-handle")) {
      const handle = document.createElement("div");
      handle.className = "qd-art-tuner-selected-handle";
      handle.textContent = "Drag to move · Alt+drag resize";
      Object.assign(handle.style, {
        position: "absolute",
        left: "0",
        top: "-22px",
        maxWidth: "240px",
        padding: "2px 6px",
        color: "#1b1208",
        background: borderColor,
        borderRadius: "4px",
        font: "11px/1.3 sans-serif",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)"
      });
      box.appendChild(handle);
    }
  }
  return box;
}

function renderPanel() {
  ensureChrome();
  const entry = getSelectedEntry();
  const selectedLabel = state.selected?.label || "None";
  const selector = state.selected ? getTargetSelector(state.selected) : "—";
  const values = entry ? `x ${entry.x}px · y ${entry.y}px · w ${entry.w}px · h ${entry.h}px` : "x 0px · y 0px · w 0px · h 0px";
  const browserTargets = scanTargets();
  const visibleTargets = getVisibleTargets(browserTargets);
  state.browserTargets = browserTargets;
  state.panel.innerHTML = `
    <div class="qd-art-tuner-header" style="position:sticky;top:0;z-index:1;margin:0 -10px 8px;padding:8px 10px;background:rgba(47,34,21,0.98);border-bottom:1px solid #8c6a2e;border-radius:8px 8px 0 0;cursor:move;user-select:none;display:flex;justify-content:space-between;gap:8px;align-items:center;"><strong>QuickDeck Art/Layout Tuner</strong><span style="color:#b9a879;font-size:11px;">drag header</span></div>
    <div><strong>Selected:</strong> ${escapeHtml(selectedLabel)}</div>
    <div style="word-break:break-all;color:#dac48e;margin:4px 0;"><strong>Selector:</strong> ${escapeHtml(selector)}</div>
    <div style="margin-bottom:8px;"><strong>Adjust:</strong> ${escapeHtml(values)}</div>
    <div class="qd-art-tuner-actions" style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;">
      ${buttonHtml("copy", "Copy CSS")}${buttonHtml("copy-selected", "Copy selected")}${buttonHtml("reset-selected", "Reset selected")}${buttonHtml("reset-all", "Reset all")}
      ${buttonHtml("off", "Off")}${buttonHtml("parent", "Parent")}${buttonHtml("same-class", "All same class")}${buttonHtml("status", "Status")}
    </div>
    <div style="font-weight:700;margin:8px 0 4px;">Move</div>
    <div class="qd-art-tuner-nudges" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-bottom:8px;">
      ${nudgeButtonHtml("X -10", -10, 0, 0, 0)}${nudgeButtonHtml("X -1", -1, 0, 0, 0)}${nudgeButtonHtml("X +1", 1, 0, 0, 0)}${nudgeButtonHtml("X +10", 10, 0, 0, 0)}
      ${nudgeButtonHtml("Y -10", 0, -10, 0, 0)}${nudgeButtonHtml("Y -1", 0, -1, 0, 0)}${nudgeButtonHtml("Y +1", 0, 1, 0, 0)}${nudgeButtonHtml("Y +10", 0, 10, 0, 0)}
    </div>
    <div style="font-weight:700;margin:8px 0 4px;">Resize</div>
    <div class="qd-art-tuner-nudges" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-bottom:8px;">
      ${nudgeButtonHtml("W -10", 0, 0, -10, 0)}${nudgeButtonHtml("W -1", 0, 0, -1, 0)}${nudgeButtonHtml("W +1", 0, 0, 1, 0)}${nudgeButtonHtml("W +10", 0, 0, 10, 0)}
      ${nudgeButtonHtml("H -10", 0, 0, 0, -10)}${nudgeButtonHtml("H -1", 0, 0, 0, -1)}${nudgeButtonHtml("H +1", 0, 0, 0, 1)}${nudgeButtonHtml("H +10", 0, 0, 0, 10)}
    </div>
    <div style="font-weight:700;margin:8px 0 4px;">Target browser</div>
    <label style="display:block;margin-bottom:5px;">Category
      <select data-action="target-category" style="width:100%;background:#24180d;color:#f7e4b3;border:1px solid #8c6a2e;border-radius:4px;padding:3px;">
        ${TARGET_CATEGORIES.map((category) => `<option value="${escapeAttr(category)}" ${category === state.targetCategory ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}
      </select>
    </label>
    <input type="search" data-action="target-search" value="${escapeAttr(state.targetSearch)}" placeholder="Search targets..." aria-label="Search targets" style="box-sizing:border-box;width:100%;margin-bottom:5px;background:#24180d;color:#f7e4b3;border:1px solid #8c6a2e;border-radius:4px;padding:3px;">
    <label style="display:flex;align-items:center;gap:6px;margin-bottom:5px;color:#dac48e;"><input type="checkbox" data-action="show-structural-wrappers" ${state.showStructuralWrappers ? "checked" : ""}> Show structural wrappers</label>
    <div class="qd-art-tuner-targets" style="display:flex;flex-direction:column;gap:4px;max-height:170px;overflow:auto;margin-bottom:8px;">
      ${visibleTargets.length ? visibleTargets.map((target) => targetButtonHtml(target)).join("") : `<small style="color:#b9a879;">No matching QuickDeck elements found in this category.</small>`}
    </div>
    <div style="font-weight:700;margin:8px 0 4px;">Presets</div>
    <div class="qd-art-tuner-presets" style="display:flex;flex-wrap:wrap;gap:5px;">
      ${PRESETS.map((preset) => buttonHtml("preset", preset.label, preset.label)).join("")}
    </div>
    <div style="margin-top:8px;color:#b9a879;">Right-click selects a specific element. Left-drag selected outline moves; Alt+drag resizes. Ctrl+right-click selects parent.</div>
  `;
  state.panel.querySelector(".qd-art-tuner-header")?.addEventListener("pointerdown", onPanelHeaderPointerDown);
  state.panel.querySelector(".qd-art-tuner-actions")?.addEventListener("click", onPanelAction);
  for (const group of state.panel.querySelectorAll(".qd-art-tuner-nudges")) group.addEventListener("click", onNudgeAction);
  state.panel.querySelector("[data-action='target-category']")?.addEventListener("change", onTargetCategoryChange);
  state.panel.querySelector("[data-action='target-search']")?.addEventListener("input", onTargetSearchInput);
  state.panel.querySelector("[data-action='show-structural-wrappers']")?.addEventListener("change", onShowStructuralWrappersChange);
  state.panel.querySelector(".qd-art-tuner-targets")?.addEventListener("click", onTargetBrowserAction);
  state.panel.querySelector(".qd-art-tuner-presets")?.addEventListener("click", onPresetAction);
}

function getVisibleTargets(targets) {
  const query = normalizeSearchText(state.targetSearch);
  return targets
    .filter((target) => state.targetCategory === "All" || target.category === state.targetCategory)
    .filter((target) => state.showStructuralWrappers || !isStructuralWrapper(target))
    .filter((target) => !query || target.searchText.includes(query));
}

function buttonHtml(action, label, value = "") {
  return `<button type="button" data-action="${escapeAttr(action)}" ${value ? `data-value="${escapeAttr(value)}"` : ""} style="cursor:pointer;border:1px solid #8c6a2e;background:#352718;color:#f7e4b3;border-radius:4px;padding:3px 6px;font:inherit;">${escapeHtml(label)}</button>`;
}

function nudgeButtonHtml(label, dx, dy, dw, dh) {
  return `<button type="button" data-action="nudge" data-dx="${dx}" data-dy="${dy}" data-dw="${dw}" data-dh="${dh}" style="cursor:pointer;border:1px solid #8c6a2e;background:#352718;color:#f7e4b3;border-radius:4px;padding:3px 4px;font:inherit;">${escapeHtml(label)}</button>`;
}

function targetButtonHtml(target) {
  return `<button type="button" data-action="select-target" data-index="${target.index}" title="${escapeAttr(target.selector)}" style="cursor:pointer;text-align:left;border:1px solid #5f4824;background:#24180d;color:#f7e4b3;border-radius:4px;padding:3px 5px;font:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(target.label)}</button>`;
}

function onPanelAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  event.preventDefault();
  const action = button.dataset.action;
  if (action === "copy") void copyCss();
  if (action === "copy-selected") void copySelectedInfo();
  if (action === "reset-selected") resetSelected();
  if (action === "reset-all") resetAll();
  if (action === "off") turnOff();
  if (action === "parent") selectParent();
  if (action === "same-class") selectSameClass();
  if (action === "status") status();
}

function onNudgeAction(event) {
  const button = event.target.closest("button[data-action='nudge']");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  adjustSelected({
    dx: numberFromDataset(button.dataset.dx),
    dy: numberFromDataset(button.dataset.dy),
    dw: numberFromDataset(button.dataset.dw),
    dh: numberFromDataset(button.dataset.dh)
  });
}

function onTargetCategoryChange(event) {
  state.targetCategory = TARGET_CATEGORIES.includes(event.currentTarget.value) ? event.currentTarget.value : "All";
  saveState();
  renderPanel();
}

function onTargetSearchInput(event) {
  state.targetSearch = String(event.currentTarget.value || "");
  saveState();
  renderPanel();
  state.panel?.querySelector("[data-action='target-search']")?.focus();
}

function onShowStructuralWrappersChange(event) {
  state.showStructuralWrappers = Boolean(event.currentTarget.checked);
  saveState();
  renderPanel();
}

function onTargetBrowserAction(event) {
  const button = event.target.closest("button[data-action='select-target']");
  if (!button) return;
  event.preventDefault();
  const target = state.browserTargets[Number(button.dataset.index)];
  if (target?.element?.isConnected) selectElement(target.element);
}

function onPresetAction(event) {
  const button = event.target.closest("button[data-action='preset']");
  if (!button) return;
  event.preventDefault();
  selectPreset(button.dataset.value);
}

function onPanelHeaderPointerDown(event) {
  if (!state.active || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = state.panel.getBoundingClientRect();
  state.panelDrag = { startX: event.clientX, startY: event.clientY, startLeft: rect.left, startTop: rect.top };
}

function updatePanelDrag(event) {
  const drag = state.panelDrag;
  if (!drag) return;
  state.panelPosition = clampPanelPosition(drag.startLeft + event.clientX - drag.startX, drag.startTop + event.clientY - drag.startY);
  positionPanel();
}

function onSelectedBoxPointerDown(event) {
  if (!state.active || event.button !== 0 || !state.selected) return;
  event.preventDefault();
  event.stopPropagation();
  beginDrag(event, event.altKey ? "resize" : "move", "selected-box");
  event.currentTarget?.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event) {
  if (state.panelDrag) {
    event.preventDefault();
    event.stopPropagation();
    updatePanelDrag(event);
    return;
  }
  if (!state.drag) return;
  event.preventDefault();
  event.stopPropagation();
  updateDrag(event);
}

function onPointerUp(event) {
  if (!state.drag && !state.panelDrag) return;
  event.preventDefault();
  event.stopPropagation();
  state.drag = null;
  state.panelDrag = null;
  saveState();
}

function onMouseMove(event) {
  if (!state.active) return;
  if (state.drag) {
    event.preventDefault();
    event.stopPropagation();
    updateDrag(event);
    return;
  }
  const element = getOverlayElement(event.target);
  state.hoverElement = element;
  scheduleBoxUpdate();
}

function onMouseDown(event) {
  if (!state.active || event.button !== 2) return;
  if (event.target.closest?.(`#${PANEL_ID}`)) return;
  const overlay = document.querySelector(OVERLAY_SELECTOR);
  if (!overlay?.contains(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  const clicked = getOverlayElement(event.target);
  const target = event.ctrlKey ? clicked?.parentElement : clicked;
  if (!target || target === overlay.parentElement) return;
  if (target !== document.documentElement && target !== document.body) selectElement(target);
  beginDrag(event, event.altKey ? "resize" : "move", "right-click");
}

function onMouseUp(event) {
  if (!state.drag) return;
  event.preventDefault();
  event.stopPropagation();
  state.drag = null;
  saveState();
}

function onContextMenu(event) {
  if (!state.active) return;
  if (event.target.closest?.(`#${PANEL_ID}`)) return;
  if (!document.querySelector(OVERLAY_SELECTOR)?.contains(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
}

function onKeyDown(event) {
  if (!state.active || !state.selected) return;
  if (event.key === "Escape") {
    event.preventDefault();
    state.selected = null;
    renderPanel();
    scheduleBoxUpdate();
    return;
  }
  const step = event.shiftKey ? 10 : 1;
  const deltas = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
  const delta = deltas[event.key];
  if (!delta) return;
  event.preventDefault();
  adjustSelected({ dx: delta[0], dy: delta[1] });
}

function beginDrag(event, mode, source) {
  const entry = getSelectedEntry() || ensureSelectedEntry();
  if (!entry) return;
  state.drag = { startX: event.clientX, startY: event.clientY, mode, source, start: { ...entry } };
}

function adjustSelected({ dx = 0, dy = 0, dw = 0, dh = 0 }) {
  const entry = ensureSelectedEntry();
  if (!entry) return false;
  entry.x += dx;
  entry.y += dy;
  entry.w += dw;
  entry.h += dh;
  commitEntryChange();
  return true;
}

function updateDrag(event) {
  const entry = ensureSelectedEntry();
  const dx = Math.round(event.clientX - state.drag.startX);
  const dy = Math.round(event.clientY - state.drag.startY);
  if (state.drag.mode === "resize") {
    entry.w = state.drag.start.w + dx;
    entry.h = state.drag.start.h + dy;
  } else {
    entry.x = state.drag.start.x + dx;
    entry.y = state.drag.start.y + dy;
  }
  commitEntryChange();
}

function commitEntryChange() {
  saveState();
  applyLiveCss();
  renderPanel();
  scheduleBoxUpdate();
}

function status() {
  const entry = getSelectedEntry();
  const liveStyle = document.getElementById(LIVE_STYLE_ID);
  const details = {
    active: state.active,
    selectedLabel: state.selected?.label || null,
    selectedSelector: state.selected?.selector || null,
    selectedPseudo: state.selected?.pseudo || "",
    selectedEntry: entry ? { x: entry.x, y: entry.y, w: entry.w, h: entry.h } : null,
    targetSearch: state.targetSearch,
    showStructuralWrappers: state.showStructuralWrappers,
    liveStyleExists: Boolean(liveStyle),
    liveCssTextLength: liveStyle?.textContent?.length || 0,
    entryCount: state.entries.size,
    overlayExists: Boolean(document.querySelector(OVERLAY_SELECTOR)),
    selectedMatchCount: state.selected?.selector ? safeQuerySelectorAll(state.selected.selector).length : 0
  };
  console.log("QuickDeck Art Tuner status", details);
  return details;
}

function numberFromDataset(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function selectPreset(label) {
  const preset = PRESETS.find((item) => item.label === label);
  if (!preset) {
    console.warn(`QuickDeck Art Tuner: unknown preset "${label}".`);
    return false;
  }
  state.selected = { ...preset, key: makeKey(preset.selector, preset.pseudo), fromPreset: true, classSelector: getClassSelectorFromSelector(preset.selector) };
  ensureSelectedEntry();
  renderPanel();
  scheduleBoxUpdate();
  status();
  return true;
}

function selectElement(element) {
  const selector = buildSelector(element);
  const qdClass = getDominantQuickDeckClass(element);
  state.selected = { label: labelForElement(element), selector, key: makeKey(selector), classSelector: qdClass ? `${OVERLAY_SELECTOR} .${cssEscape(qdClass)}` : null };
  ensureSelectedEntry();
  renderPanel();
  scheduleBoxUpdate();
  status();
}

function selectParent() {
  const element = getFirstSelectedElement();
  const overlay = document.querySelector(OVERLAY_SELECTOR);
  const parent = element?.parentElement;
  if (parent && parent !== overlay?.parentElement && parent !== document.body) selectElement(parent);
}

function selectSameClass() {
  if (!state.selected?.classSelector) return;
  const label = `${state.selected.label || "Selection"} (all same class)`;
  state.selected = { ...state.selected, label, selector: state.selected.classSelector, key: makeKey(state.selected.classSelector) };
  ensureSelectedEntry();
  renderPanel();
  scheduleBoxUpdate();
}

function resetSelected() {
  if (!state.selected) return;
  state.entries.delete(state.selected.key);
  saveState();
  applyLiveCss();
  renderPanel();
  scheduleBoxUpdate();
}

function getSelectedEntry() {
  return state.selected ? state.entries.get(state.selected.key) : null;
}

function ensureSelectedEntry() {
  if (!state.selected) return null;
  let entry = state.entries.get(state.selected.key);
  if (!entry) {
    entry = {
      label: state.selected.label || state.selected.selector,
      selector: state.selected.selector,
      pseudo: state.selected.pseudo || "",
      baseWidth: state.selected.baseWidth || "",
      baseHeight: state.selected.baseHeight || "",
      x: 0,
      y: 0,
      w: 0,
      h: 0
    };
    state.entries.set(state.selected.key, entry);
  }
  return entry;
}

function getTargetSelector(target) {
  return `${target.selector}${target.pseudo || ""}`;
}

function makeKey(selector, pseudo = "") {
  return `${selector}${pseudo || ""}`;
}

function applyLiveCss() {
  const css = buildCss({ exportOnly: false });
  let style = document.getElementById(LIVE_STYLE_ID);
  if (!css.trim()) {
    removeNode(style);
    return;
  }
  if (!style) {
    style = document.createElement("style");
    style.id = LIVE_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;
}

function buildCss({ exportOnly }) {
  const blocks = [];
  if (exportOnly) blocks.push("/* QD art tuner export */");
  for (const entry of state.entries.values()) {
    if (![entry.x, entry.y, entry.w, entry.h].some((value) => Number(value) !== 0)) continue;
    const selector = `${scopeSelector(entry.selector)}${entry.pseudo || ""}`;
    const lines = [];
    if (entry.x || entry.y) lines.push(`  translate: ${entry.x}px ${entry.y}px !important;`);
    if (entry.w) lines.push(`  width: ${formatSize(entry.baseWidth, entry.w)} !important;`);
    if (entry.h) lines.push(`  height: ${formatSize(entry.baseHeight, entry.h)} !important;`);
    if (!lines.length) continue;
    blocks.push(`${selector} {\n${lines.join("\n")}\n}`);
  }
  return `${blocks.join("\n\n")}\n`;
}

function formatSize(base, delta) {
  if (base) return `calc(${base} + ${delta}px)`;
  return `calc(100% + ${delta}px)`;
}

function scopeSelector(selector) {
  const trimmed = selector.trim();
  if (trimmed.startsWith(OVERLAY_SELECTOR)) return trimmed;
  return `${OVERLAY_SELECTOR} ${trimmed}`;
}

async function copyCss() {
  const css = buildCss({ exportOnly: true });
  return copyText(css, "QuickDeck Art Tuner CSS copied to clipboard.");
}

async function copySelectedInfo() {
  const entry = getSelectedEntry();
  const selector = state.selected ? getTargetSelector(state.selected) : "";
  const text = [
    "QD art tuner selected target",
    `label: ${state.selected?.label || "None"}`,
    `selector: ${selector || "None"}`,
    `x: ${entry?.x || 0}`,
    `y: ${entry?.y || 0}`,
    `w: ${entry?.w || 0}`,
    `h: ${entry?.h || 0}`
  ].join("\n");
  return copyText(text, "QuickDeck Art Tuner selected target copied to clipboard.");
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    console.info(successMessage, "\n", text);
    return text;
  } catch (error) {
    console.warn("QuickDeck Art Tuner clipboard copy failed; text is printed below.", error, text);
    showCssFallback(text);
    return text;
  }
}

function showCssFallback(css) {
  const popup = document.createElement("div");
  Object.assign(popup.style, {
    position: "fixed",
    inset: "10%",
    zIndex: "100001",
    background: "#150f0a",
    border: "1px solid #d4a84b",
    padding: "12px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.7)"
  });
  const textarea = document.createElement("textarea");
  textarea.value = css;
  Object.assign(textarea.style, { width: "100%", height: "calc(100% - 34px)", boxSizing: "border-box", background: "#24180d", color: "#f7e4b3" });
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Close";
  close.addEventListener("click", () => popup.remove());
  popup.append(textarea, close);
  document.body.appendChild(popup);
  textarea.focus();
  textarea.select();
}

function loadState() {
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.entries = new Map((parsed.entries || []).map((entry) => [makeKey(entry.selector, entry.pseudo), normalizeEntry(entry)]));
    if (Number.isFinite(parsed.panelLeft) && Number.isFinite(parsed.panelTop)) state.panelPosition = { left: parsed.panelLeft, top: parsed.panelTop };
    if (TARGET_CATEGORIES.includes(parsed.targetCategory)) state.targetCategory = parsed.targetCategory;
    state.targetSearch = typeof parsed.targetSearch === "string" ? parsed.targetSearch : "";
    state.showStructuralWrappers = Boolean(parsed.showStructuralWrappers);
  } catch (error) {
    console.warn("QuickDeck Art Tuner: failed to load saved state.", error);
  }
}

function saveState() {
  const entries = Array.from(state.entries.values()).map(normalizeEntry);
  window.localStorage?.setItem(STORAGE_KEY, JSON.stringify({
    entries,
    panelLeft: state.panelPosition?.left ?? null,
    panelTop: state.panelPosition?.top ?? null,
    targetCategory: state.targetCategory,
    targetSearch: state.targetSearch || "",
    showStructuralWrappers: Boolean(state.showStructuralWrappers)
  }));
}

function normalizeEntry(entry) {
  return {
    label: entry.label || entry.selector,
    selector: scopeSelector(entry.selector),
    pseudo: entry.pseudo || "",
    baseWidth: entry.baseWidth || "",
    baseHeight: entry.baseHeight || "",
    x: Number(entry.x) || 0,
    y: Number(entry.y) || 0,
    w: Number(entry.w) || 0,
    h: Number(entry.h) || 0
  };
}

function positionPanel() {
  if (!state.panel) return;
  if (!state.panelPosition) state.panelPosition = clampPanelPosition((window.innerWidth || 380) - 360, 70);
  state.panelPosition = clampPanelPosition(state.panelPosition.left, state.panelPosition.top);
  state.panel.style.left = `${state.panelPosition.left}px`;
  state.panel.style.top = `${state.panelPosition.top}px`;
  state.panel.style.right = "auto";
}

function clampPanelPosition(left, top) {
  const width = state.panel?.offsetWidth || 340;
  const height = state.panel?.offsetHeight || 520;
  const maxLeft = Math.max(0, (window.innerWidth || width) - Math.min(width, window.innerWidth || width));
  const maxTop = Math.max(0, (window.innerHeight || height) - Math.min(height, window.innerHeight || height));
  return {
    left: Math.min(Math.max(0, Math.round(Number(left) || 0)), maxLeft),
    top: Math.min(Math.max(0, Math.round(Number(top) || 0)), maxTop)
  };
}

function scanTargets() {
  const overlay = document.querySelector(OVERLAY_SELECTOR);
  if (!overlay) return [];
  const candidates = new Set();
  for (const element of overlay.querySelectorAll("[class], [data-action], button, input, select, textarea, a, label")) {
    if (isScannableTarget(element)) candidates.add(element);
  }
  return Array.from(candidates).map((element, index) => {
    const category = getTargetCategory(element);
    const selector = buildSelector(element);
    const label = getTargetBrowserLabel(element);
    const classList = getClassList(element);
    const dataAction = element.dataset?.action || "";
    const textContent = getElementText(element);
    return {
      index,
      element,
      category,
      selector,
      label,
      classList,
      dataAction,
      textContent,
      searchText: normalizeSearchText([label, selector, category, classList.join(" "), textContent, dataAction].join(" "))
    };
  });
}

function isScannableTarget(element) {
  if (!(element instanceof Element)) return false;
  if (getQuickDeckClasses(element).length) return true;
  if (element.dataset?.action) return true;
  return /^(button|input|select|textarea|a|label)$/i.test(element.tagName);
}

function isStructuralWrapper(elementOrTarget) {
  const element = elementOrTarget?.element || elementOrTarget;
  if (!element?.classList) return false;
  return STRUCTURAL_WRAPPER_CLASSES.some((className) => element.classList.contains(className));
}

function getTargetCategory(element) {
  if (element.closest(".qd31-settings-panel, [data-action^='pdf-map'], [data-action*='pdf'], [data-action*='dev-art-tuner']")) return "Settings";
  if (element.closest(".qd31-center-wrap, .qd31-center-cockpit")) return "Center Panel";
  if (element.closest(".qd31-left-panel-wrap, .qd31-left-drawer")) return "Left Panel";
  if (element.closest(".qd31-right-panel-wrap, .qd31-right-drawer")) return "Right Panel";
  return "Overlay / Shell";
}

function getTargetBrowserLabel(element) {
  const qdClass = getDominantQuickDeckClass(element);
  const action = element.dataset?.action ? `data-action=${element.dataset.action}` : "";
  const text = getElementText(element);
  const primary = getFriendlyTargetLabel(element, qdClass, action) || qdClass || action || element.tagName.toLowerCase();
  return `${primary}${text ? ` — ${text.slice(0, 48)}` : ""}`;
}

function getFriendlyTargetLabel(element, qdClass, action) {
  if (qdClass === "qd31-center-move-medallion") return "Move circle";
  if (qdClass === "qd31-center-move-tile") return "Move tile";
  if (qdClass === "qd31-center-move-title") return "Move title";
  if (qdClass === "qd31-center-move-value") return "Move value";
  if (qdClass === "qd31-defense-grid") return "Defense dials group";
  if (element?.classList?.contains("qd31-defense-dial")) {
    const defense = String(element.dataset?.defense || element.textContent || "").toLowerCase();
    if (defense.includes("dodge")) return "Dodge dial";
    if (defense.includes("parry")) return "Parry dial";
    if (defense.includes("block")) return "Block dial";
    return "Defense dial";
  }
  if (action === "open-sheet" || action === "open-actor") return "Open Sheet button";
  return "";
}

function getElementText(element) {
  return String(element.textContent || element.getAttribute("aria-label") || element.title || "").replace(/\s+/g, " ").trim();
}

function getClassList(element) {
  return Array.from(element.classList || []);
}

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().trim();
}

function scheduleBoxUpdate() {
  positionPanel();
  if (state.raf) return;
  state.raf = requestAnimationFrame(() => {
    state.raf = null;
    updateBox(state.hoverBox, state.hoverElement);
    updateBox(state.selectedBox, getFirstSelectedElement());
  });
}

function updateBox(box, element) {
  if (!box) return;
  if (!state.active || !element?.isConnected) {
    box.style.display = "none";
    return;
  }
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    box.style.display = "none";
    return;
  }
  Object.assign(box.style, { display: "block", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
}

function getFirstSelectedElement() {
  if (!state.selected) return null;
  return document.querySelector(state.selected.selector);
}

function getOverlayElement(target) {
  const overlay = document.querySelector(OVERLAY_SELECTOR);
  if (!(target instanceof Element) || !overlay?.contains(target)) return null;
  return target;
}

function buildSelector(element) {
  const overlay = document.querySelector(OVERLAY_SELECTOR);
  if (!(element instanceof Element) || !overlay?.contains(element)) return OVERLAY_SELECTOR;
  if (element === overlay) return OVERLAY_SELECTOR;
  if (element.id) {
    const idSelector = `${OVERLAY_SELECTOR} #${cssEscape(element.id)}`;
    if (selectorMatchesOnlyElement(idSelector, element)) return idSelector;
  }
  for (const className of getQuickDeckClasses(element)) {
    const classSelector = `${OVERLAY_SELECTOR} .${cssEscape(className)}`;
    if (selectorMatchesOnlyElement(classSelector, element)) return classSelector;
  }
  const parent = element.parentElement;
  if (parent && parent !== document.body && parent !== document.documentElement) {
    const parentSelector = parent === overlay ? OVERLAY_SELECTOR : buildSelector(parent);
    const directSelector = `${parentSelector} > ${tagSelector(element)}:nth-of-type(${nthOfType(element)})`;
    if (selectorMatchesOnlyElement(directSelector, element)) return directSelector;
  }
  const pathSelector = buildPathSelector(element, overlay);
  if (selectorMatchesOnlyElement(pathSelector, element)) return pathSelector;
  const matches = safeQuerySelectorAll(pathSelector);
  if (!matches.length) console.warn("QuickDeck Art Tuner: generated selector matched no elements.", pathSelector, element);
  if (matches.length > 1) console.warn("QuickDeck Art Tuner: generated selector is not unique.", pathSelector, matches);
  return pathSelector;
}

function buildPathSelector(element, overlay) {
  const segments = [];
  let current = element;
  while (current && current !== overlay) {
    segments.unshift(`${tagSelector(current)}:nth-of-type(${nthOfType(current)})`);
    const selector = `${OVERLAY_SELECTOR} > ${segments.join(" > ")}`;
    if (selectorMatchesOnlyElement(selector, element)) return selector;
    current = current.parentElement;
  }
  return `${OVERLAY_SELECTOR} > ${segments.join(" > ")}`;
}

function selectorMatchesOnlyElement(selector, element) {
  const matches = safeQuerySelectorAll(selector);
  return matches.length === 1 && matches[0] === element;
}

function safeQuerySelectorAll(selector) {
  try {
    return Array.from(document.querySelectorAll(selector));
  } catch (error) {
    console.warn("QuickDeck Art Tuner: invalid selector.", selector, error);
    return [];
  }
}

function tagSelector(element) {
  const tag = element.tagName.toLowerCase();
  const qdClasses = getQuickDeckClasses(element);
  if (qdClasses.length) return `${tag}${qdClasses.map((className) => `.${cssEscape(className)}`).join("")}`;
  return tag;
}

function nthOfType(element) {
  let count = 0;
  for (const sibling of element.parentElement?.children || []) {
    if (sibling.tagName === element.tagName) count += 1;
    if (sibling === element) return count;
  }
  return 1;
}

function getDominantQuickDeckClass(element) {
  return getQuickDeckClasses(element)[0] || null;
}

function getQuickDeckClasses(element) {
  return Array.from(element.classList || []).filter((className) => /^qd(?:31|40)-/.test(className));
}

function getClassSelectorFromSelector(selector) {
  const match = String(selector).match(/\.(qd(?:31|40)-[a-zA-Z0-9_-]+)/);
  return match ? `${OVERLAY_SELECTOR} .${cssEscape(match[1])}` : null;
}

function labelForElement(element) {
  const qdClass = getDominantQuickDeckClass(element);
  return qdClass || element.id || element.tagName.toLowerCase();
}

function removeNode(node) {
  node?.parentNode?.removeChild(node);
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

export { installQuickDeckArtTunerGlobals };
