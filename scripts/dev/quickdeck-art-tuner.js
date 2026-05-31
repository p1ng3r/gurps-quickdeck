const STORAGE_KEY = "gurpsQuickDeck.artTuner.v1";
const LIVE_STYLE_ID = "qd-art-tuner-live-style";
const PANEL_STYLE_ID = "qd-art-tuner-panel-style";
const PANEL_ID = "qd-art-tuner-panel";
const HOVER_BOX_ID = "qd-art-tuner-hover-box";
const SELECTED_BOX_ID = "qd-art-tuner-selected-box";
const ROOT_SELECTOR = "#gurps-quickdeck-overlay";
const STRUCTURAL_CLASSES = new Set([
  "qd40-frame",
  "qd40-body",
  "qd31-shell",
  "qd31-left-panel-wrap",
  "qd31-center-wrap",
  "qd31-right-panel-wrap"
]);
const CATEGORY_OPTIONS = ["All", "Center Panel", "Left Panel", "Right Panel", "Overlay", "Settings"];
const PRESETS = [
  { label: "Move circle", selector: `${ROOT_SELECTOR} .qd31-center-move-tile`, category: "Center Panel" },
  { label: "Move tile", selector: `${ROOT_SELECTOR} .qd31-center-move-tile`, category: "Center Panel" },
  { label: "Move title", selector: `${ROOT_SELECTOR} .qd31-center-move-title`, category: "Center Panel" },
  { label: "Move value", selector: `${ROOT_SELECTOR} .qd31-center-move-value`, category: "Center Panel" },
  { label: "Dodge dial", selector: `${ROOT_SELECTOR} .qd31-defense-dial[data-defense="dodge"]`, category: "Center Panel" },
  { label: "Parry dial", selector: `${ROOT_SELECTOR} .qd31-defense-dial[data-defense="parry"]`, category: "Center Panel" },
  { label: "Block dial", selector: `${ROOT_SELECTOR} .qd31-defense-dial[data-defense="block"]`, category: "Center Panel" },
  { label: "Defense dials group", selector: `${ROOT_SELECTOR} .qd31-defense-grid`, category: "Center Panel" },
  { label: "Defense backing", selector: `${ROOT_SELECTOR} .qd31-defense-grid`, category: "Center Panel" },
  { label: "Defense grid", selector: `${ROOT_SELECTOR} .qd31-defense-grid`, category: "Center Panel" },
  { label: "Header art", selector: `${ROOT_SELECTOR} .qd31-header`, category: "Center Panel" },
  { label: "Footer rail", selector: `${ROOT_SELECTOR} .qd40-frame`, category: "Overlay", structural: true },
  { label: "Center cockpit", selector: `${ROOT_SELECTOR} .qd31-center-cockpit`, category: "Center Panel" },
  { label: "Actor card", selector: `${ROOT_SELECTOR} .qd31-actor-card`, category: "Center Panel" },
  { label: "Command row", selector: `${ROOT_SELECTOR} .qd31-command-icon-row`, category: "Center Panel" },
  { label: "Center favorites body", selector: `${ROOT_SELECTOR} .qd31-center-favorites`, category: "Center Panel" },
  { label: "Left drawer", selector: `${ROOT_SELECTOR} .qd31-left-drawer`, category: "Left Panel" },
  { label: "Right drawer", selector: `${ROOT_SELECTOR} .qd31-right-drawer`, category: "Right Panel" }
];
const state = {
  enabled: false,
  selectedKey: null,
  selectedLabel: null,
  targets: [],
  search: "",
  category: "All",
  showStructural: false,
  panelPosition: { x: 24, y: 84 },
  offsets: {},
  abortController: null,
  hoveredKey: null
};

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

function readStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    state.selectedKey = typeof parsed.selectedKey === "string" ? parsed.selectedKey : null;
    state.selectedLabel = typeof parsed.selectedLabel === "string" ? parsed.selectedLabel : null;
    state.offsets = parsed.offsets && typeof parsed.offsets === "object" ? parsed.offsets : {};
    state.panelPosition = parsed.panelPosition && Number.isFinite(parsed.panelPosition.x) && Number.isFinite(parsed.panelPosition.y)
      ? parsed.panelPosition
      : state.panelPosition;
  } catch (error) {
    console.warn("gurps-quickdeck | Art Tuner could not read local state.", error);
  }
}

function writeStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    selectedKey: state.selectedKey,
    selectedLabel: state.selectedLabel,
    offsets: state.offsets,
    panelPosition: state.panelPosition
  }));
}

function getRoot() {
  return document.querySelector(ROOT_SELECTOR);
}

function getTargetKey(target) {
  return target?.selector || null;
}

function getOffset(key) {
  return state.offsets[key] || { x: 0, y: 0 };
}

function hasOffset(offset) {
  return Boolean(offset && (Number(offset.x) || Number(offset.y)));
}

function getTargetElement(target) {
  if (!target?.selector) return null;
  try {
    return document.querySelector(target.selector);
  } catch (_error) {
    return null;
  }
}

function getSelectedTarget() {
  const presetMatch = PRESETS.find((preset) => preset.label === state.selectedLabel && preset.selector === state.selectedKey);
  if (presetMatch) return state.targets.find((target) => target.label === presetMatch.label && getTargetKey(target) === presetMatch.selector) || describeTarget(document.querySelector(presetMatch.selector), presetMatch);
  return state.targets.find((target) => getTargetKey(target) === state.selectedKey) || null;
}

function getSelectedElement() {
  return getTargetElement(getSelectedTarget());
}

function classifyElement(element) {
  if (!element) return "Overlay";
  if (element.closest(".qd31-left-panel-wrap, .qd31-left-drawer")) return "Left Panel";
  if (element.closest(".qd31-right-panel-wrap, .qd31-right-drawer")) {
    if (element.closest(".qd31-drawer-tabs") || element.closest("[data-drawer='settings']") || element.textContent?.toLowerCase().includes("settings")) return "Settings";
    return "Right Panel";
  }
  if (element.closest(".qd31-center-wrap, .qd31-center-cockpit")) return "Center Panel";
  if (element.classList?.contains("qd40-overlay") || element.className?.includes?.("qd40")) return "Overlay";
  return "Overlay";
}

function isStructural(element, preset) {
  if (preset?.structural) return true;
  return [...(element?.classList || [])].some((className) => STRUCTURAL_CLASSES.has(className));
}

function selectorForElement(element) {
  if (!element || element.id === PANEL_ID) return null;
  if (element.id === "gurps-quickdeck-overlay") return ROOT_SELECTOR;
  const root = getRoot();
  if (!root?.contains(element)) return null;

  const dataDefense = element.getAttribute("data-defense");
  if (dataDefense) return `${ROOT_SELECTOR} [data-defense="${cssEscape(dataDefense)}"]`;

  const dataAction = element.getAttribute("data-action");
  const usefulClasses = [...element.classList].filter((className) => /^(qd31|qd40|quickdeck)-/.test(className));
  if (usefulClasses.length) return `${ROOT_SELECTOR} .${usefulClasses.map(cssEscape).join(".")}`;
  if (dataAction) return `${ROOT_SELECTOR} [data-action="${cssEscape(dataAction)}"]`;
  return null;
}

function labelForElement(element) {
  const classLabel = [...(element?.classList || [])].find((className) => /^(qd31|qd40|quickdeck)-/.test(className));
  if (classLabel) return classLabel.replace(/^qd\d+-/, "").replace(/^quickdeck-/, "").replace(/-/g, " ");
  const action = element?.getAttribute?.("data-action");
  if (action) return action.replace(/-/g, " ");
  return element?.tagName?.toLowerCase() || "target";
}

function describeTarget(element, preset = null) {
  const selector = preset?.selector || selectorForElement(element);
  if (!selector) return null;
  const classList = [...(element?.classList || [])].join(" ");
  const dataAction = element?.getAttribute?.("data-action") || "";
  const text = (element?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 140);
  return {
    label: preset?.label || labelForElement(element),
    selector,
    category: preset?.category || classifyElement(element),
    classList,
    dataAction,
    text,
    structural: isStructural(element, preset)
  };
}

function uniqueByBrowserKey(targets) {
  const seen = new Set();
  return targets.filter((target) => {
    if (!target?.selector) return false;
    const key = `${target.label}::${target.selector}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectTargets() {
  const root = getRoot();
  const presetTargets = PRESETS.map((preset) => describeTarget(document.querySelector(preset.selector), preset)).filter(Boolean);
  if (!root) return uniqueByBrowserKey(presetTargets);

  const candidates = [...root.querySelectorAll("[class*='qd31-'], [class*='qd40-'], [class*='quickdeck-'], [data-action]")]
    .filter((element) => !element.closest(`#${PANEL_ID}`))
    .map((element) => describeTarget(element))
    .filter(Boolean);
  return uniqueByBrowserKey([...presetTargets, describeTarget(root), ...candidates].filter(Boolean));
}

function targetMatches(target) {
  if (!state.showStructural && target.structural) return false;
  if (state.category !== "All" && target.category !== state.category) return false;
  const query = state.search.trim().toLowerCase();
  if (!query) return true;
  return [target.label, target.selector, target.category, target.classList, target.text, target.dataAction]
    .some((value) => String(value || "").toLowerCase().includes(query));
}

function refreshTargets() {
  state.targets = collectTargets();
  if (state.selectedKey && !state.targets.some((target) => getTargetKey(target) === state.selectedKey)) {
    state.selectedKey = null;
    state.selectedLabel = null;
  }
}

function generateCss() {
  const rules = Object.entries(state.offsets)
    .filter(([, offset]) => hasOffset(offset))
    .map(([selector, offset]) => `${selector} { transform: translate(${Number(offset.x) || 0}px, ${Number(offset.y) || 0}px) !important; }`);
  if (!rules.length) return "";
  return [`/* GURPS QuickDeck Art Tuner export: movement-only transforms. */`, ...rules].join("\n");
}

function applyLiveCss() {
  const css = generateCss();
  let style = document.getElementById(LIVE_STYLE_ID);
  if (!css) {
    style?.remove();
    updateSelectionBox();
    updateStatus();
    return;
  }
  if (!style) {
    style = document.createElement("style");
    style.id = LIVE_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;
  updateSelectionBox();
  updateStatus();
}

function ensurePanelStyle() {
  if (document.getElementById(PANEL_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PANEL_STYLE_ID;
  style.textContent = `
#${PANEL_ID} { position: fixed; z-index: 100000; width: 360px; max-height: min(760px, calc(100vh - 24px)); overflow: hidden; color: #f7e6bd; background: rgba(22, 17, 12, 0.96); border: 1px solid #b8893c; border-radius: 10px; box-shadow: 0 18px 44px rgba(0,0,0,0.55); font: 12px/1.35 Arial, sans-serif; pointer-events: auto; }
#${PANEL_ID} * { box-sizing: border-box; }
#${PANEL_ID} button, #${PANEL_ID} input, #${PANEL_ID} select { font: inherit; }
#${PANEL_ID} button { color: #f7e6bd; background: rgba(93, 60, 25, 0.85); border: 1px solid rgba(221, 174, 90, 0.55); border-radius: 6px; padding: 4px 6px; cursor: pointer; }
#${PANEL_ID} button:hover, #${PANEL_ID} button.is-selected { background: rgba(145, 95, 37, 0.92); border-color: #f1c26d; }
#${PANEL_ID} input, #${PANEL_ID} select { width: 100%; color: #f7e6bd; background: rgba(0,0,0,0.35); border: 1px solid rgba(221, 174, 90, 0.45); border-radius: 6px; padding: 5px 7px; }
#${PANEL_ID} .qd-art-tuner-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 10px; background: rgba(0,0,0,0.32); border-bottom: 1px solid rgba(221,174,90,0.35); cursor: move; user-select: none; }
#${PANEL_ID} .qd-art-tuner-title strong { letter-spacing: 0.04em; text-transform: uppercase; }
#${PANEL_ID} .qd-art-tuner-body { display: grid; gap: 8px; padding: 10px; max-height: calc(min(760px, 100vh - 24px) - 42px); overflow: auto; }
#${PANEL_ID} .qd-art-tuner-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
#${PANEL_ID} .qd-art-tuner-check { display: flex; align-items: center; gap: 6px; }
#${PANEL_ID} .qd-art-tuner-check input { width: auto; }
#${PANEL_ID} .qd-art-tuner-presets, #${PANEL_ID} .qd-art-tuner-moves, #${PANEL_ID} .qd-art-tuner-actions { display: flex; flex-wrap: wrap; gap: 5px; }
#${PANEL_ID} .qd-art-tuner-targets { display: grid; gap: 4px; max-height: 180px; overflow: auto; border: 1px solid rgba(221,174,90,0.25); border-radius: 7px; padding: 5px; background: rgba(0,0,0,0.2); }
#${PANEL_ID} .qd-art-tuner-target { text-align: left; display: grid; gap: 1px; }
#${PANEL_ID} .qd-art-tuner-target small { opacity: 0.72; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#${PANEL_ID} .qd-art-tuner-status { white-space: pre-wrap; overflow-wrap: anywhere; padding: 7px; border-radius: 7px; background: rgba(0,0,0,0.28); color: #d8c39d; }
#${HOVER_BOX_ID}, #${SELECTED_BOX_ID} { position: fixed; z-index: 99999; pointer-events: none; border: 2px solid rgba(89, 199, 255, 0.9); border-radius: 4px; box-shadow: 0 0 0 1px rgba(0,0,0,0.6), 0 0 18px rgba(89,199,255,0.28); }
#${SELECTED_BOX_ID} { border-color: rgba(255, 202, 86, 0.95); box-shadow: 0 0 0 1px rgba(0,0,0,0.7), 0 0 20px rgba(255,202,86,0.32); }
`;
  document.head.appendChild(style);
}

function ensureBox(id) {
  let box = document.getElementById(id);
  if (!box) {
    box = document.createElement("div");
    box.id = id;
    document.body.appendChild(box);
  }
  return box;
}

function positionBox(box, element) {
  if (!box || !element) {
    box?.remove();
    return;
  }
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    box.remove();
    return;
  }
  box.style.left = `${rect.left}px`;
  box.style.top = `${rect.top}px`;
  box.style.width = `${rect.width}px`;
  box.style.height = `${rect.height}px`;
}

function updateHoverBox(target) {
  if (!state.enabled || !target) {
    document.getElementById(HOVER_BOX_ID)?.remove();
    return;
  }
  positionBox(ensureBox(HOVER_BOX_ID), getTargetElement(target));
}

function updateSelectionBox() {
  if (!state.enabled) {
    document.getElementById(SELECTED_BOX_ID)?.remove();
    return;
  }
  const element = getSelectedElement();
  if (!element) {
    document.getElementById(SELECTED_BOX_ID)?.remove();
    return;
  }
  positionBox(ensureBox(SELECTED_BOX_ID), element);
}

function renderPanel() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  refreshTargets();
  const selectedTarget = getSelectedTarget();
  const selectedOffset = getOffset(state.selectedKey);
  const filteredTargets = state.targets.filter(targetMatches);
  panel.style.left = `${state.panelPosition.x}px`;
  panel.style.top = `${state.panelPosition.y}px`;
  panel.innerHTML = `
    <div class="qd-art-tuner-title" data-role="drag"><strong>QuickDeck Art Tuner</strong><button type="button" data-action="off">Off</button></div>
    <div class="qd-art-tuner-body">
      <input type="search" data-role="search" placeholder="Search targets" value="${escapeHtml(state.search)}" />
      <div class="qd-art-tuner-row">
        <select data-role="category">${CATEGORY_OPTIONS.map((category) => `<option value="${category}" ${category === state.category ? "selected" : ""}>${category}</option>`).join("")}</select>
        <label class="qd-art-tuner-check"><input type="checkbox" data-role="structural" ${state.showStructural ? "checked" : ""} /> Show structural wrappers</label>
      </div>
      <div class="qd-art-tuner-presets">${PRESETS.map((preset) => `<button type="button" data-preset="${escapeHtml(preset.label)}" class="${selectedTarget?.label === preset.label ? "is-selected" : ""}">${escapeHtml(preset.label)}</button>`).join("")}</div>
      <div class="qd-art-tuner-targets">${filteredTargets.map((target) => `<button type="button" class="qd-art-tuner-target ${target.selector === state.selectedKey ? "is-selected" : ""}" data-target="${escapeHtml(target.selector)}"><span>${escapeHtml(target.label)} <small>(${escapeHtml(target.category)})</small></span><small>${escapeHtml(target.selector)}</small></button>`).join("") || "<small>No matching targets.</small>"}</div>
      <div class="qd-art-tuner-moves">
        ${[-10, -1, 1, 10].map((delta) => `<button type="button" data-move-axis="x" data-move-delta="${delta}">X ${delta > 0 ? "+" : ""}${delta}</button>`).join("")}
        ${[-10, -1, 1, 10].map((delta) => `<button type="button" data-move-axis="y" data-move-delta="${delta}">Y ${delta > 0 ? "+" : ""}${delta}</button>`).join("")}
      </div>
      <div class="qd-art-tuner-actions">
        <button type="button" data-action="copy-selected">Copy selected target info</button>
        <button type="button" data-action="copy-css">Copy CSS export</button>
        <button type="button" data-action="reset-selected">Reset selected</button>
        <button type="button" data-action="reset-all">Reset all</button>
        <button type="button" data-action="off">Off/Close</button>
      </div>
      <div class="qd-art-tuner-status" data-role="status">${escapeHtml(statusText(selectedTarget, selectedOffset))}</div>
    </div>`;
  updateSelectionBox();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function statusObject() {
  const selectedTarget = getSelectedTarget();
  return {
    enabled: state.enabled,
    storageKey: STORAGE_KEY,
    selectedTarget,
    selectedLabel: state.selectedLabel,
    selectedOffset: state.selectedKey ? getOffset(state.selectedKey) : null,
    offsets: state.offsets,
    targetCount: state.targets.length,
    liveStylePresent: Boolean(document.getElementById(LIVE_STYLE_ID))
  };
}

function statusText(selectedTarget = getSelectedTarget(), selectedOffset = state.selectedKey ? getOffset(state.selectedKey) : null) {
  return [
    `State: ${state.enabled ? "on" : "off"}`,
    `Selected: ${selectedTarget ? selectedTarget.label : "none"}`,
    `Selector: ${selectedTarget?.selector || "none"}`,
    `Offset: x ${selectedOffset?.x || 0}, y ${selectedOffset?.y || 0}`,
    `Storage: ${STORAGE_KEY}`
  ].join("\n");
}

function updateStatus() {
  const status = document.querySelector(`#${PANEL_ID} [data-role="status"]`);
  if (status) status.textContent = statusText();
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return text;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  return text;
}

function copySelectedTargetInfo() {
  const target = getSelectedTarget();
  if (!target) {
    console.warn("gurps-quickdeck | Art Tuner has no selected target to copy.");
    return null;
  }
  const payload = JSON.stringify({ ...target, offset: getOffset(target.selector) }, null, 2);
  void copyText(payload);
  return payload;
}

function selectTarget(selector) {
  if (!selector) return null;
  refreshTargets();
  const target = state.targets.find((candidate) => candidate.selector === selector);
  if (!target) return null;
  state.selectedKey = target.selector;
  state.selectedLabel = target.label;
  writeStorage();
  renderPanel();
  updateSelectionBox();
  return target;
}

function moveSelected(axis, delta) {
  if (!state.selectedKey) return;
  const current = getOffset(state.selectedKey);
  state.offsets[state.selectedKey] = {
    x: (Number(current.x) || 0) + (axis === "x" ? delta : 0),
    y: (Number(current.y) || 0) + (axis === "y" ? delta : 0)
  };
  writeStorage();
  applyLiveCss();
  renderPanel();
}

function resetSelected() {
  if (!state.selectedKey) return;
  delete state.offsets[state.selectedKey];
  writeStorage();
  applyLiveCss();
  renderPanel();
}

function resetAllOffsets() {
  state.offsets = {};
  writeStorage();
  applyLiveCss();
  renderPanel();
}

function handlePanelClick(event) {
  const presetButton = event.target.closest("[data-preset]");
  if (presetButton) {
    qdArtTunerSelectPreset(presetButton.dataset.preset);
    return;
  }
  const targetButton = event.target.closest("[data-target]");
  if (targetButton) {
    selectTarget(targetButton.dataset.target);
    return;
  }
  const moveButton = event.target.closest("[data-move-axis]");
  if (moveButton) {
    moveSelected(moveButton.dataset.moveAxis, Number(moveButton.dataset.moveDelta) || 0);
    return;
  }
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  if (action === "off") qdArtTunerOff();
  if (action === "copy-selected") copySelectedTargetInfo();
  if (action === "copy-css") qdArtTunerCopyCss();
  if (action === "reset-selected") resetSelected();
  if (action === "reset-all") resetAllOffsets();
}

function handlePanelInput(event) {
  if (event.target.matches("[data-role='search']")) {
    state.search = event.target.value || "";
    renderPanel();
  }
  if (event.target.matches("[data-role='category']")) {
    state.category = event.target.value || "All";
    renderPanel();
  }
  if (event.target.matches("[data-role='structural']")) {
    state.showStructural = event.target.checked;
    renderPanel();
  }
}

function handleTargetHover(event) {
  const button = event.target.closest?.("[data-target]");
  if (!button) return;
  const target = state.targets.find((candidate) => candidate.selector === button.dataset.target);
  state.hoveredKey = target?.selector || null;
  updateHoverBox(target);
}

function startDrag(event) {
  const handle = event.target.closest?.("[data-role='drag']");
  if (!handle || event.target.closest("button")) return;
  const panel = document.getElementById(PANEL_ID);
  const startX = event.clientX;
  const startY = event.clientY;
  const startLeft = state.panelPosition.x;
  const startTop = state.panelPosition.y;
  const pointerId = event.pointerId;
  handle.setPointerCapture?.(pointerId);
  const move = (moveEvent) => {
    state.panelPosition = {
      x: Math.max(0, Math.min(window.innerWidth - 80, startLeft + moveEvent.clientX - startX)),
      y: Math.max(0, Math.min(window.innerHeight - 40, startTop + moveEvent.clientY - startY))
    };
    panel.style.left = `${state.panelPosition.x}px`;
    panel.style.top = `${state.panelPosition.y}px`;
  };
  const cleanup = () => {
    handle.releasePointerCapture?.(pointerId);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    state.abortController?.signal?.removeEventListener("abort", cleanup);
  };
  const up = () => {
    cleanup();
    writeStorage();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up, { once: true });
  state.abortController?.signal?.addEventListener("abort", cleanup, { once: true });
}

function bindPanel(panel) {
  const signal = state.abortController.signal;
  panel.addEventListener("click", handlePanelClick, { signal });
  panel.addEventListener("input", handlePanelInput, { signal });
  panel.addEventListener("change", handlePanelInput, { signal });
  panel.addEventListener("pointerover", handleTargetHover, { signal });
  panel.addEventListener("pointerleave", () => updateHoverBox(null), { signal });
  panel.addEventListener("pointerdown", startDrag, { signal });
  window.addEventListener("resize", updateSelectionBox, { signal });
  window.addEventListener("scroll", updateSelectionBox, { signal, capture: true });
}

function qdArtTunerOn() {
  if (state.enabled && document.getElementById(PANEL_ID)) return qdArtTunerStatus();
  readStorage();
  state.enabled = true;
  state.abortController?.abort();
  state.abortController = new AbortController();
  ensurePanelStyle();
  applyLiveCss();
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-label", "QuickDeck Art Tuner");
    document.body.appendChild(panel);
  }
  bindPanel(panel);
  renderPanel();
  console.info("gurps-quickdeck | Art Tuner is on. Use qdArtTunerOff() to close it.");
  return qdArtTunerStatus();
}

function qdArtTunerOff() {
  state.enabled = false;
  state.abortController?.abort();
  state.abortController = null;
  document.getElementById(PANEL_ID)?.remove();
  document.getElementById(HOVER_BOX_ID)?.remove();
  document.getElementById(SELECTED_BOX_ID)?.remove();
  console.info("gurps-quickdeck | Art Tuner is off.");
  return qdArtTunerStatus();
}

function qdArtTunerReset() {
  qdArtTunerOff();
  localStorage.removeItem(STORAGE_KEY);
  state.selectedKey = null;
  state.selectedLabel = null;
  state.offsets = {};
  state.search = "";
  state.category = "All";
  state.showStructural = false;
  document.getElementById(LIVE_STYLE_ID)?.remove();
  document.getElementById(PANEL_STYLE_ID)?.remove();
  console.info("gurps-quickdeck | Art Tuner reset complete.");
  return qdArtTunerStatus();
}

function qdArtTunerCopyCss() {
  readStorage();
  const css = generateCss();
  void copyText(css);
  console.info("gurps-quickdeck | Art Tuner CSS export copied.", css);
  return css;
}

function qdArtTunerSelectPreset(label) {
  readStorage();
  refreshTargets();
  const preset = PRESETS.find((candidate) => candidate.label.toLowerCase() === String(label || "").toLowerCase());
  if (!preset) {
    console.warn(`gurps-quickdeck | Art Tuner preset not found: ${label}`);
    return null;
  }
  const target = selectTarget(preset.selector) || describeTarget(document.querySelector(preset.selector), preset);
  if (target) {
    state.selectedKey = target.selector;
    state.selectedLabel = preset.label;
    writeStorage();
  }
  if (state.enabled) renderPanel();
  updateSelectionBox();
  return target;
}

function qdArtTunerStatus() {
  readStorage();
  refreshTargets();
  const status = statusObject();
  console.info("gurps-quickdeck | Art Tuner status", status);
  return status;
}

Object.assign(window, {
  qdArtTunerOn,
  qdArtTunerOff,
  qdArtTunerReset,
  qdArtTunerCopyCss,
  qdArtTunerSelectPreset,
  qdArtTunerStatus
});

console.info("gurps-quickdeck | Art Tuner console API loaded (off by default).");
