const OVERLAY_SELECTOR = "#gurps-quickdeck-overlay";
const LIVE_STYLE_ID = "qd-art-tuner-live-style";
const PANEL_ID = "qd-art-tuner-panel";
const HOVER_BOX_ID = "qd-art-tuner-hover-box";
const SELECTED_BOX_ID = "qd-art-tuner-selected-box";
const STORAGE_KEY = "gurpsQuickDeck.artTuner.v1";

const PRESETS = [
  { label: "Header art", selector: `${OVERLAY_SELECTOR} .qd31-center-art-header`, pseudo: "::before", baseWidth: "106%", baseHeight: "142%" },
  { label: "Defense backing", selector: `${OVERLAY_SELECTOR} .qd31-defense-grid`, pseudo: "::before", baseWidth: "106%", baseHeight: "138%" },
  { label: "Footer rail", selector: `${OVERLAY_SELECTOR} .qd31-center-footer`, pseudo: "::before", baseWidth: "108%", baseHeight: "225%" },
  { label: "Move medallion", selector: `${OVERLAY_SELECTOR} .qd31-center-move-medallion` },
  { label: "Move title", selector: `${OVERLAY_SELECTOR} .qd31-center-move-title` },
  { label: "Move value", selector: `${OVERLAY_SELECTOR} .qd31-center-move-value` },
  { label: "Defense dials", selector: `${OVERLAY_SELECTOR} .qd31-defense-dial` },
  { label: "Defense grid", selector: `${OVERLAY_SELECTOR} .qd31-defense-grid` },
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
      position: "fixed", top: "70px", right: "18px", zIndex: "100000", width: "310px",
      maxHeight: "calc(100vh - 100px)", overflow: "auto", padding: "10px", color: "#f7e4b3",
      background: "rgba(20, 13, 8, 0.94)", border: "1px solid #d4a84b", borderRadius: "8px",
      boxShadow: "0 6px 24px rgba(0,0,0,0.55)", font: "12px/1.35 sans-serif", pointerEvents: "auto"
    });
    document.body.appendChild(state.panel);
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
    position: "fixed", display: "none", zIndex: "99999", pointerEvents: interactive ? "auto" : "none",
    border: `2px dashed ${borderColor}`, background: bgColor, boxSizing: "border-box", borderRadius: "3px",
    cursor: interactive ? "move" : "default", touchAction: interactive ? "none" : "auto", userSelect: "none"
  });
  if (interactive) {
    box.title = "Drag to move; Alt+drag resize";
    if (!box.querySelector(".qd-art-tuner-selected-handle")) {
      const handle = document.createElement("div");
      handle.className = "qd-art-tuner-selected-handle";
      handle.textContent = "Drag to move · Alt+drag resize";
      Object.assign(handle.style, {
        position: "absolute", left: "0", top: "-22px", maxWidth: "240px", padding: "2px 6px",
        color: "#1b1208", background: borderColor, borderRadius: "4px", font: "11px/1.3 sans-serif",
        whiteSpace: "nowrap", pointerEvents: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.35)"
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
  state.panel.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px;">QuickDeck Art/Layout Tuner</div>
    <div><strong>Selected:</strong> ${escapeHtml(selectedLabel)}</div>
    <div style="word-break:break-all;color:#dac48e;margin:4px 0;"><strong>Selector:</strong> ${escapeHtml(selector)}</div>
    <div style="margin-bottom:8px;"><strong>Adjust:</strong> ${escapeHtml(values)}</div>
    <div class="qd-art-tuner-actions" style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;">
      ${buttonHtml("copy", "Copy CSS")}${buttonHtml("reset-selected", "Reset selected")}${buttonHtml("reset-all", "Reset all")}
      ${buttonHtml("off", "Off")}${buttonHtml("parent", "Parent")}${buttonHtml("same-class", "All same class")}${buttonHtml("status", "Status")}
    </div>
    <div style="font-weight:700;margin:8px 0 4px;">Reliable nudges</div>
    <div class="qd-art-tuner-nudges" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-bottom:8px;">
      ${nudgeButtonHtml("X -1", -1, 0, 0, 0)}${nudgeButtonHtml("X +1", 1, 0, 0, 0)}${nudgeButtonHtml("Y -1", 0, -1, 0, 0)}${nudgeButtonHtml("Y +1", 0, 1, 0, 0)}
      ${nudgeButtonHtml("W -1", 0, 0, -1, 0)}${nudgeButtonHtml("W +1", 0, 0, 1, 0)}${nudgeButtonHtml("H -1", 0, 0, 0, -1)}${nudgeButtonHtml("H +1", 0, 0, 0, 1)}
      ${nudgeButtonHtml("X -10", -10, 0, 0, 0)}${nudgeButtonHtml("X +10", 10, 0, 0, 0)}${nudgeButtonHtml("Y -10", 0, -10, 0, 0)}${nudgeButtonHtml("Y +10", 0, 10, 0, 0)}
    </div>
    <div style="font-weight:700;margin:8px 0 4px;">Presets</div>
    <div class="qd-art-tuner-presets" style="display:flex;flex-wrap:wrap;gap:5px;">
      ${PRESETS.map((preset) => buttonHtml("preset", preset.label, preset.label)).join("")}
    </div>
    <div style="margin-top:8px;color:#b9a879;">Right-click selects/drags. Alt+right-drag resizes. Ctrl+right-click selects parent. Arrow keys nudge.</div>
  `;
  state.panel.querySelector(".qd-art-tuner-actions")?.addEventListener("click", onPanelAction);
  state.panel.querySelector(".qd-art-tuner-nudges")?.addEventListener("click", onNudgeAction);
  state.panel.querySelector(".qd-art-tuner-presets")?.addEventListener("click", onPresetAction);
}

function buttonHtml(action, label, value = "") {
  return `<button type="button" data-action="${action}" data-value="${escapeAttr(value)}" style="cursor:pointer;border:1px solid #8c6a2e;background:#2f2215;color:#f7e4b3;border-radius:4px;padding:3px 6px;font:inherit;">${escapeHtml(label)}</button>`;
}

function nudgeButtonHtml(label, dx, dy, dw, dh) {
  return `<button type="button" data-action="nudge" data-dx="${dx}" data-dy="${dy}" data-dw="${dw}" data-dh="${dh}" style="cursor:pointer;border:1px solid #8c6a2e;background:#352718;color:#f7e4b3;border-radius:4px;padding:3px 4px;font:inherit;">${escapeHtml(label)}</button>`;
}

function onPanelAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  event.preventDefault();
  const action = button.dataset.action;
  if (action === "copy") void copyCss();
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

function onPresetAction(event) {
  const button = event.target.closest("button[data-action='preset']");
  if (!button) return;
  event.preventDefault();
  selectPreset(button.dataset.value);
}

function onSelectedBoxPointerDown(event) {
  if (!state.active || event.button !== 0 || !state.selected) return;
  event.preventDefault();
  event.stopPropagation();
  beginDrag(event, event.altKey ? "resize" : "move", "selected-box");
  event.currentTarget?.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event) {
  if (!state.drag) return;
  event.preventDefault();
  event.stopPropagation();
  updateDrag(event);
}

function onPointerUp(event) {
  if (!state.drag) return;
  event.preventDefault();
  event.stopPropagation();
  state.drag = null;
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
  if (target !== document.documentElement && target !== document.body) {
    if (event.ctrlKey || !isWithinCurrentSelection(target)) selectElement(target);
  }
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


function isWithinCurrentSelection(element) {
  if (!state.selected || !(element instanceof Element)) return false;
  try {
    if (element.matches(state.selected.selector)) return true;
    return Boolean(element.closest(state.selected.selector));
  } catch (_error) {
    return false;
  }
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
    liveStyleExists: Boolean(liveStyle),
    liveCssTextLength: liveStyle?.textContent?.length || 0,
    entryCount: state.entries.size,
    overlayExists: Boolean(document.querySelector(OVERLAY_SELECTOR))
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
  state.selected = { ...preset, key: makeKey(preset.selector, preset.pseudo), fromPreset: true };
  ensureSelectedEntry();
  renderPanel();
  scheduleBoxUpdate();
  return true;
}

function selectElement(element) {
  const selector = buildSelector(element);
  const qdClass = getDominantQuickDeckClass(element);
  state.selected = { label: labelForElement(element), selector, key: makeKey(selector), classSelector: qdClass ? `${OVERLAY_SELECTOR} .${cssEscape(qdClass)}` : null };
  ensureSelectedEntry();
  renderPanel();
  scheduleBoxUpdate();
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
    entry = { label: state.selected.label || state.selected.selector, selector: state.selected.selector, pseudo: state.selected.pseudo || "", baseWidth: state.selected.baseWidth || "", baseHeight: state.selected.baseHeight || "", x: 0, y: 0, w: 0, h: 0 };
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
    // Use independent translate so tuner nudges do not overwrite existing transform centering on art layers.
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
  try {
    await navigator.clipboard.writeText(css);
    console.info("QuickDeck Art Tuner CSS copied to clipboard.\n", css);
    return css;
  } catch (error) {
    console.warn("QuickDeck Art Tuner clipboard copy failed; CSS is printed below.", error, css);
    showCssFallback(css);
    return css;
  }
}

function showCssFallback(css) {
  const popup = document.createElement("div");
  Object.assign(popup.style, { position: "fixed", inset: "10%", zIndex: "100001", background: "#150f0a", border: "1px solid #d4a84b", padding: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.7)" });
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
  } catch (error) {
    console.warn("QuickDeck Art Tuner: failed to load saved state.", error);
  }
}

function saveState() {
  const entries = Array.from(state.entries.values()).map(normalizeEntry);
  window.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ entries }));
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

function scheduleBoxUpdate() {
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
  return target === overlay ? overlay : target.closest("[class]") || target;
}

function buildSelector(element) {
  const overlay = document.querySelector(OVERLAY_SELECTOR);
  const qdClass = getDominantQuickDeckClass(element);
  if (qdClass) {
    const selector = `${OVERLAY_SELECTOR} .${cssEscape(qdClass)}`;
    if (document.querySelectorAll(selector).length === 1) return selector;
    return selectorForNth(element, selector);
  }
  if (element.id && element.id !== "gurps-quickdeck-overlay") return `${OVERLAY_SELECTOR} #${cssEscape(element.id)}`;
  const path = [];
  let current = element;
  while (current && current !== overlay) {
    const tag = current.tagName.toLowerCase();
    path.unshift(`${tag}:nth-of-type(${nthOfType(current)})`);
    current = current.parentElement;
  }
  return `${OVERLAY_SELECTOR} > ${path.join(" > ")}`;
}

function selectorForNth(element, baseSelector) {
  const matches = Array.from(document.querySelectorAll(baseSelector));
  const index = matches.indexOf(element);
  if (index < 0) return baseSelector;
  const parent = element.parentElement;
  const parentSelector = parent ? buildSelector(parent) : OVERLAY_SELECTOR;
  return `${parentSelector} > ${element.tagName.toLowerCase()}:nth-of-type(${nthOfType(element)})`;
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
  return Array.from(element.classList || []).find((className) => /^qd(?:31|40)-/.test(className)) || null;
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
