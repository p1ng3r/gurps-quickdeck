const MODULE_ID = "gurps-quickdeck";
const STORAGE_KEY = `${MODULE_ID}.artTuner.state`;
const STRUCTURAL_WRAPPER_CLASSES = [
  "qd40-frame",
  "qd40-body",
  "qd31-shell",
  "qd31-left-panel-wrap",
  "qd31-center-wrap",
  "qd31-right-panel-wrap"
];

const DEFAULT_STATE = {
  isOpen: false,
  selectedSelector: "",
  targetCategory: "all",
  targetSearch: "",
  showStructuralWrappers: false,
  panelLeft: 120,
  panelTop: 120
};

let state = { ...DEFAULT_STATE };
let panel = null;
let selectedElement = null;
let hostApi = {};
let styleElement = null;

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function titleCase(value) {
  return String(value ?? "")
    .replace(/^qd\d+-/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (parsed && typeof parsed === "object") {
      state = {
        ...DEFAULT_STATE,
        ...parsed,
        targetSearch: typeof parsed.targetSearch === "string" ? parsed.targetSearch : DEFAULT_STATE.targetSearch,
        showStructuralWrappers: Boolean(parsed.showStructuralWrappers)
      };
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | Failed to load art tuner state.`, error);
    state = { ...DEFAULT_STATE };
  }
  return state;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      targetSearch: state.targetSearch || "",
      showStructuralWrappers: Boolean(state.showStructuralWrappers)
    }));
  } catch (error) {
    console.warn(`${MODULE_ID} | Failed to save art tuner state.`, error);
  }
}

function isStructuralWrapper(element) {
  if (!element?.classList) return false;
  return STRUCTURAL_WRAPPER_CLASSES.some((className) => element.classList.contains(className));
}

function getOverlayRoot() {
  return document.getElementById("gurps-quickdeck-overlay")
    || hostApi.getQuickDeckApp?.()?._overlayRoot
    || document.querySelector(".qd40-overlay, .gurps-quickdeck");
}

function cssEscape(value) {
  if (globalThis.CSS?.escape) return globalThis.CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function getPreferredClass(element) {
  const classes = Array.from(element.classList || [])
    .filter((className) => !className.startsWith("is-") && !className.startsWith("has-"));
  return classes.find((className) => /^qd\d+-/.test(className)) || classes[0] || "";
}

function getSelector(element) {
  if (!element) return "";
  if (element.id) return `#${cssEscape(element.id)}`;
  const preferredClass = getPreferredClass(element);
  if (preferredClass) return `.${cssEscape(preferredClass)}`;
  const action = element.dataset?.action;
  if (action) return `[data-action="${String(action).replace(/"/g, "\\\"")}"]`;
  return element.tagName ? element.tagName.toLowerCase() : "";
}

function getCategory(element) {
  const selectorText = `${Array.from(element.classList || []).join(" ")} ${element.dataset?.action || ""}`.toLowerCase();
  if (isStructuralWrapper(element)) return "structural";
  if (/roster|actor|available/.test(selectorText)) return "roster";
  if (/defense|dodge|parry|block|attack|damage|combat/.test(selectorText)) return "combat";
  if (/move|center|resource|hp|fp/.test(selectorText)) return "center";
  if (/drawer|settings|pdf|reference|skill|spell/.test(selectorText)) return "drawers";
  if (/window|close|minimize|header|chrome|info/.test(selectorText)) return "chrome";
  return "other";
}

function getGeneratedLabel(element) {
  const action = element.dataset?.action;
  const defense = element.dataset?.defense;
  const preferredClass = getPreferredClass(element);
  const text = String(element.textContent || "").replace(/\s+/g, " ").trim();

  if (defense) return `${titleCase(defense)} dial`;
  if (preferredClass === "qd31-defense-grid") return "Defense dials group";
  if (preferredClass === "qd31-center-move-tile") return "Move tile";
  if (preferredClass === "qd31-center-move-title") return "Move title";
  if (preferredClass === "qd31-center-move-value") return "Move value";
  if (preferredClass === "qd31-move-card") return "Move circle";
  if (action === "open-actor" || action === "open-sheet") return "Open Sheet button";
  if (action) return titleCase(action);
  if (preferredClass) return titleCase(preferredClass);
  if (text) return text.slice(0, 48);
  return element.tagName ? titleCase(element.tagName.toLowerCase()) : "Target";
}

function getTargetMetadata(element, index) {
  const classList = Array.from(element.classList || []);
  const label = getGeneratedLabel(element);
  const selector = getSelector(element);
  const category = getCategory(element);
  const dataAction = element.dataset?.action || "";
  const textContent = String(element.textContent || "").replace(/\s+/g, " ").trim();
  const searchText = normalizeText([
    label,
    selector,
    category,
    classList.join(" "),
    dataAction,
    textContent
  ].join(" "));
  return {
    id: `${selector || element.tagName || "target"}-${index}`,
    element,
    label,
    selector,
    category,
    classList,
    dataAction,
    textContent,
    searchText,
    isStructural: isStructuralWrapper(element)
  };
}

function scanTargets() {
  const root = getOverlayRoot();
  if (!root) return [];
  const elements = [root, ...root.querySelectorAll("*")]
    .filter((element) => !panel?.contains(element))
    .filter((element) => element instanceof HTMLElement)
    .filter((element) => element.classList.length || element.dataset?.action);

  const seen = new Set();
  return elements.map((element, index) => getTargetMetadata(element, index)).filter((target) => {
    const key = `${target.selector}|${target.label}|${target.dataAction}|${target.textContent}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getFilteredTargets() {
  const query = normalizeText(state.targetSearch);
  return scanTargets()
    .filter((target) => state.targetCategory === "all" || target.category === state.targetCategory)
    .filter((target) => state.showStructuralWrappers || !target.isStructural)
    .filter((target) => !query || target.searchText.includes(query));
}

function ensureStyles() {
  if (styleElement) return;
  styleElement = document.createElement("style");
  styleElement.id = "quickdeck-art-tuner-style";
  styleElement.textContent = `
.quickdeck-art-tuner{position:fixed;z-index:100000;left:120px;top:120px;width:360px;max-height:calc(100vh - 32px);display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid #b98a43;border-radius:10px;background:rgba(18,13,10,.96);color:#f6e8c8;box-shadow:0 12px 32px rgba(0,0,0,.55);font:13px/1.35 sans-serif}.quickdeck-art-tuner button,.quickdeck-art-tuner input,.quickdeck-art-tuner select{font:inherit}.quickdeck-art-tuner header{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:move}.quickdeck-art-tuner h3{margin:0;font-size:15px}.quickdeck-art-tuner .qat-row{display:flex;gap:6px;align-items:center}.quickdeck-art-tuner .qat-row>*{min-width:0}.quickdeck-art-tuner input[type="search"],.quickdeck-art-tuner select{width:100%;background:#100b08;color:#f6e8c8;border:1px solid #795b31;border-radius:6px;padding:5px 7px}.quickdeck-art-tuner label{display:flex;align-items:center;gap:6px}.quickdeck-art-tuner .qat-targets{display:flex;flex-direction:column;gap:4px;overflow:auto;min-height:120px;max-height:340px;padding-right:2px}.quickdeck-art-tuner .qat-target{display:block;width:100%;text-align:left;border:1px solid rgba(185,138,67,.55);border-radius:6px;background:rgba(80,51,24,.75);color:#f6e8c8;padding:6px}.quickdeck-art-tuner .qat-target:hover,.quickdeck-art-tuner .qat-target.is-selected{background:rgba(132,87,38,.9);border-color:#e0b866}.quickdeck-art-tuner .qat-target small{display:block;color:#cfb78b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.quickdeck-art-tuner .qat-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.quickdeck-art-tuner .qat-status{min-height:18px;color:#cfb78b}.quickdeck-art-tuner-highlight{outline:2px solid #68d8ff !important;outline-offset:2px !important}`;
  document.head.appendChild(styleElement);
}

function clearSelectionHighlight() {
  selectedElement?.classList?.remove("quickdeck-art-tuner-highlight");
}

function selectTarget(target) {
  clearSelectionHighlight();
  selectedElement = target?.element || null;
  state.selectedSelector = target?.selector || "";
  selectedElement?.classList?.add("quickdeck-art-tuner-highlight");
  saveState();
  renderPanel();
}

function copyCss() {
  if (!selectedElement) return updateStatus("Select a target first.");
  const selector = getSelector(selectedElement);
  const css = `${selector} {\n  /* QuickDeck Art Tuner placement */\n}`;
  void navigator.clipboard?.writeText(css);
  updateStatus(`Copied CSS for ${selector}`);
}

function resetSelection() {
  clearSelectionHighlight();
  selectedElement = null;
  state.selectedSelector = "";
  saveState();
  renderPanel();
}

function updateStatus(message) {
  const status = panel?.querySelector("[data-qat-status]");
  if (status) status.textContent = message;
}

function openTuner() {
  state.isOpen = true;
  saveState();
  renderPanel();
}

function closeTuner() {
  state.isOpen = false;
  saveState();
  clearSelectionHighlight();
  panel?.remove();
  panel = null;
}

function installDrag() {
  const header = panel?.querySelector("[data-qat-drag]");
  if (!header) return;
  header.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = state.panelLeft;
    const startTop = state.panelTop;
    const onMove = (moveEvent) => {
      state.panelLeft = Math.max(0, startLeft + moveEvent.clientX - startX);
      state.panelTop = Math.max(0, startTop + moveEvent.clientY - startY);
      panel.style.left = `${state.panelLeft}px`;
      panel.style.top = `${state.panelTop}px`;
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      saveState();
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp, { once: true });
  });
}

function renderPanel() {
  if (!state.isOpen) return;
  ensureStyles();
  if (!panel) {
    panel = document.createElement("section");
    panel.className = "quickdeck-art-tuner";
    document.body.appendChild(panel);
  }
  panel.style.left = `${state.panelLeft}px`;
  panel.style.top = `${state.panelTop}px`;
  const targets = getFilteredTargets();
  const categories = ["all", "center", "combat", "drawers", "roster", "chrome", "other", "structural"];
  panel.innerHTML = `
    <header data-qat-drag><h3>QuickDeck Art Tuner</h3><button type="button" data-qat-action="close" title="Close">×</button></header>
    <div class="qat-row">
      <select data-qat-category aria-label="Target category">${categories.map((category) => `<option value="${category}" ${state.targetCategory === category ? "selected" : ""}>${titleCase(category)}</option>`).join("")}</select>
    </div>
    <div class="qat-row">
      <input type="search" data-qat-search placeholder="Search targets..." value="${String(state.targetSearch || "").replace(/"/g, "&quot;")}" aria-label="Search targets">
    </div>
    <label><input type="checkbox" data-qat-structural ${state.showStructuralWrappers ? "checked" : ""}> Show structural wrappers</label>
    <div class="qat-actions">
      <button type="button" data-qat-preset="move">Move circle</button>
      <button type="button" data-qat-preset="dodge">Dodge dial</button>
      <button type="button" data-qat-preset="defense">Defense group</button>
      <button type="button" data-qat-action="copy">Copy CSS</button>
      <button type="button" data-qat-action="reset">Reset</button>
      <button type="button" data-qat-action="refresh">Refresh</button>
    </div>
    <strong>Target browser</strong>
    <div class="qat-targets">${targets.map((target, index) => `
      <button type="button" class="qat-target ${target.selector === state.selectedSelector ? "is-selected" : ""}" data-qat-index="${index}">
        ${target.label}<small>${target.selector} · ${target.category}${target.dataAction ? ` · ${target.dataAction}` : ""}</small>
      </button>`).join("") || "<small>No targets match the current filters.</small>"}</div>
    <div class="qat-status" data-qat-status>${targets.length} target${targets.length === 1 ? "" : "s"}</div>`;

  installDrag();
  panel.querySelector("[data-qat-action='close']")?.addEventListener("click", closeTuner);
  panel.querySelector("[data-qat-action='copy']")?.addEventListener("click", copyCss);
  panel.querySelector("[data-qat-action='reset']")?.addEventListener("click", resetSelection);
  panel.querySelector("[data-qat-action='refresh']")?.addEventListener("click", renderPanel);
  panel.querySelector("[data-qat-category]")?.addEventListener("change", (event) => {
    state.targetCategory = event.currentTarget.value || "all";
    saveState();
    renderPanel();
  });
  panel.querySelector("[data-qat-search]")?.addEventListener("input", (event) => {
    state.targetSearch = event.currentTarget.value || "";
    saveState();
    renderPanel();
    panel?.querySelector("[data-qat-search]")?.focus();
  });
  panel.querySelector("[data-qat-structural]")?.addEventListener("change", (event) => {
    state.showStructuralWrappers = Boolean(event.currentTarget.checked);
    saveState();
    renderPanel();
  });
  panel.querySelectorAll("[data-qat-index]").forEach((button) => {
    button.addEventListener("click", () => selectTarget(targets[Number(button.dataset.qatIndex)]));
  });
  panel.querySelectorAll("[data-qat-preset]").forEach((button) => {
    button.addEventListener("click", () => selectPreset(button.dataset.qatPreset));
  });
}

function selectPreset(preset) {
  const root = getOverlayRoot();
  const selectors = {
    move: ".qd31-move-card, .qd31-center-move-tile",
    dodge: "[data-defense='dodge'], .qd31-defense-dial",
    parry: "[data-defense='parry']",
    block: "[data-defense='block']",
    defense: ".qd31-defense-grid"
  };
  const element = root?.querySelector(selectors[preset] || "");
  if (!element) return updateStatus(`Preset target not found: ${preset}`);
  selectTarget(getTargetMetadata(element, 0));
}

function initializeQuickDeckArtTuner(api = {}) {
  hostApi = { ...hostApi, ...api };
  loadState();
  const publicApi = {
    open: openTuner,
    close: closeTuner,
    refresh: renderPanel,
    scanTargets,
    getFilteredTargets,
    loadState,
    saveState,
    isStructuralWrapper,
    selectPreset,
    get state() { return state; }
  };
  game.gurpsQuickDeckArtTuner = publicApi;
  if (state.isOpen) openTuner();
  return publicApi;
}

export {
  initializeQuickDeckArtTuner,
  isStructuralWrapper,
  loadState,
  saveState
};
