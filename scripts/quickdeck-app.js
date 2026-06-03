import { QuickDeckReferenceApp } from "./reference-app.js";
import { openReferenceIndexManager } from "./reference-index-app.js";
import { PAGE_REF_KEY_NAMES, getPageRefKeyNameFromMap } from "./page-ref-key-names.js";
import { normalizePdfMapKey, parsePageReferences, getMappedPdfFinalPage, buildPdfPageUrl } from "./pdf-page-ref-utils.js";
import { installQuickDeckArtTunerGlobals } from "./dev/quickdeck-art-tuner.js";

const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/quickdeck.hbs";
const OVERLAY_TEMPLATE_PATH = "modules/gurps-quickdeck/templates/quickdeck-overlay.hbs";
const DEBUG = false;
const MODULE_ID = "gurps-quickdeck";
const SETTING_KEYS = {
  ROSTER: "rosterActorIds",
  QUICK_SKILLS: "quickSkillSelectionsByActor",
  COMBAT_FAVORITES: "combatFavoriteAttackKeysByActor",
  SPELL_FAVORITES: "spellFavoriteKeysByActor",
  PINNED_ACTIONS: "pinnedActionsByActor",
  DEFAULT_DRAWER: "defaultDrawer",
  MINIMIZED: "isMinimized",
  RESTORE_PILL_POSITION: "restorePillPosition",
  DEV_ART_TUNER_ENABLED: "devArtTunerEnabled",
  UI_MODE: "uiMode",
  PDF_PAGE_REF_MAPPINGS: "pdfPageRefMappings"
};
const VALID_DRAWERS = new Set(["combat", "skills", "spells", "settings"]);
const VALID_UI_MODES = new Set(["ui1", "ui2"]);
const DEFAULT_UI_MODE = "ui1";
const NATIVE_WINDOW_FOCUS_DELAYS_MS = [0, 100, 250, 500, 900];
const NATIVE_WINDOW_FOCUS_GUARD_MS = 1500;
const SECONDARY_NATIVE_WINDOW_FOCUS_MAX_MS = 30000;
const NATIVE_GURPS_WINDOW_PATTERN = /gurps|damage|roll|modifier|bucket|attack|defense|melee|ranged|hit[-\s]?location|otf/i;
const PRIMARY_ROLL_OPTIONS = [
  { key: "st", label: "ST", otf: "ST", valueType: "ST" },
  { key: "dx", label: "DX", otf: "DX", valueType: "DX" },
  { key: "iq", label: "IQ", otf: "IQ", valueType: "IQ" },
  { key: "ht", label: "HT", otf: "HT", valueType: "HT" }
];
const DEFAULT_PRIMARY_ROLL_KEY = PRIMARY_ROLL_OPTIONS[0].key;
const SECONDARY_ROLL_OPTIONS = [
  { key: "will", label: "Will", otf: "Will", valueType: "will" },
  { key: "fright-check", label: "Fright Check", otf: "Fright Check", valueType: "fright-check" },
  { key: "perception", label: "Perception", otf: "Per", valueType: "perception" },
  { key: "vision", label: "Vision", otf: "Vision", valueType: "vision" },
  { key: "hearing", label: "Hearing", otf: "Hearing", valueType: "hearing" },
  { key: "taste-smell", label: "Taste/Smell", otf: "Taste/Smell", valueType: "taste-smell" },
  { key: "touch", label: "Touch", otf: "Touch", valueType: "touch" }
];
const DEFAULT_SECONDARY_ROLL_KEY = SECONDARY_ROLL_OPTIONS[0].key;

installQuickDeckArtTunerGlobals();

const renderQuickDeckTemplate = async (path, data) => {
  const foundryRenderTemplate = foundry?.applications?.handlebars?.renderTemplate;
  const renderer = foundryRenderTemplate ?? renderTemplate;
  return renderer(path, data);
};



class QuickDeckCustomScrollbarManager {
  static MIN_SCROLL_RANGE = 16;
  static MIN_HOST_HEIGHT = 64;
  static MIN_TRACK_HEIGHT = 40;
  static MIN_THUMB_HEIGHT = 56;

  constructor(root) {
    this.root = root;
    this.entries = new Map();
    this.resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver((records) => {
      for (const record of records) this.refreshHost(record.target);
    }) : null;
    this.mutationObserver = typeof MutationObserver === "function" ? new MutationObserver(() => this.refreshAll()) : null;
    this.refreshRaf = null;
    this.handleWindowResize = () => this.refreshAll();
    this.pendingHostRefresh = new Set();
    this.candidateSelectors = [
      ".qd31-center-scroll-body",
      ".qd31-right-drawer .qd31-drawer-body",
      ".qd31-left-drawer .qd31-drawer-body",
      ".qd31-roster-list",
      ".qd31-available-list",
      ".qd31-pdf-map-list"
    ];
  }

  setup() {
    if (!this.root) return;
    this.scanCandidates();
    this.refreshAll();
    this.mutationObserver?.observe(this.root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden", "open"] });
    window.addEventListener("resize", this.handleWindowResize);
  }

  teardown() {
    if (this.refreshRaf) cancelAnimationFrame(this.refreshRaf);
    this.refreshRaf = null;
    this.pendingHostRefresh.clear();
    window.removeEventListener("resize", this.handleWindowResize);
    this.mutationObserver?.disconnect();
    this.resizeObserver?.disconnect();
    for (const [host, entry] of this.entries.entries()) this.unbindHost(host, entry);
    this.entries.clear();
  }
  refreshAll() { this.scheduleRefresh(); }

  scheduleHostRefresh(host) {
    if (host) this.pendingHostRefresh.add(host);
    if (this.refreshRaf) return;
    this.refreshRaf = requestAnimationFrame(() => {
      this.refreshRaf = null;
      this.scanCandidates();
      const hosts = this.pendingHostRefresh.size ? Array.from(this.pendingHostRefresh) : Array.from(this.entries.keys());
      this.pendingHostRefresh.clear();
      for (const targetHost of hosts) this.refreshHost(targetHost);
    });
  }
  scheduleRefresh() {
    this.scheduleHostRefresh(null);
  }
  scanCandidates() {
    const found = new Set();
    for (const selector of this.candidateSelectors) {
      for (const host of this.root.querySelectorAll(selector)) {
        found.add(host);
        if (!this.entries.has(host)) this.bindHost(host);
      }
    }
    for (const host of this.root.querySelectorAll('[data-qd-custom-scroll-candidate="true"]')) {
      found.add(host);
      if (!this.entries.has(host)) this.bindHost(host);
    }
    for (const host of Array.from(this.entries.keys())) {
      if (!this.root.contains(host) || !found.has(host)) this.unbindHost(host, this.entries.get(host));
    }
  }
  bindHost(host) {
    if (host.parentElement?.classList?.contains("qd-custom-scroll-wrapper")) return;
    const originalParent = host.parentElement;
    if (!originalParent) return;
    const nextSibling = host.nextSibling;
    const wrapper = document.createElement("div");
    wrapper.className = "qd-custom-scroll-wrapper";
    originalParent.insertBefore(wrapper, nextSibling);
    wrapper.appendChild(host);

    const rail = document.createElement("div");
    rail.className = "qd-custom-scrollbar";
    const track = document.createElement("div");
    track.className = "qd-custom-scrollbar-track";
    const thumb = document.createElement("div");
    thumb.className = "qd-custom-scrollbar-thumb";
    track.appendChild(thumb);
    rail.appendChild(track);
    wrapper.appendChild(rail);
    host.classList.add("qd-custom-scroll-host", "qd-custom-scrollbar-hidden-native");
    const onScroll = () => this.refreshHost(host);
    const onTrackPointerDown = (event) => this.onTrackPointerDown(host, event);
    const onThumbPointerDown = (event) => this.onThumbPointerDown(host, event);
    host.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("pointerdown", onTrackPointerDown);
    thumb.addEventListener("pointerdown", onThumbPointerDown);
    const entry = {
      rail,
      track,
      thumb,
      wrapper,
      originalParent,
      nextSibling,
      onScroll,
      onTrackPointerDown,
      onThumbPointerDown,
      cleanupDrag: null
    };
    this.entries.set(host, entry);
    this.resizeObserver?.observe(host);
  }
  unbindHost(host, entry) {
    if (!entry) return;
    entry.cleanupDrag?.();
    host.removeEventListener("scroll", entry.onScroll);
    entry.track.removeEventListener("pointerdown", entry.onTrackPointerDown);
    entry.thumb.removeEventListener("pointerdown", entry.onThumbPointerDown);
    host.classList.remove("qd-custom-scroll-host", "qd-custom-scrollbar-hidden-native");
    entry.rail.remove();
    if (entry.wrapper?.contains?.(host)) {
      const parent = entry.wrapper.parentElement ?? entry.originalParent;
      if (parent) parent.insertBefore(host, entry.wrapper);
    }
    entry.wrapper?.remove?.();
    this.entries.delete(host);
  }
  isVisible(host) {
    if (!host || host.hidden) return false;
    const style = window.getComputedStyle(host);
    if (!style || style.display === "none" || style.visibility === "hidden") return false;
    if (host.offsetParent === null && style.position !== "fixed") return false;
    const rect = host.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    if (host.clientHeight <= 0) return false;
    return true;
  }

  isUsableScrollHost(host, entry) {
    if (!entry || !this.isVisible(host)) return false;
    const thresholds = this.getHostThresholds(host);
    const clientHeight = Number(host.clientHeight) || 0;
    if (clientHeight < thresholds.minHostHeight) return false;
    const trackHeight = Number(entry.track.clientHeight) || 0;
    if (trackHeight < thresholds.minTrackHeight) return false;
    const scrollRange = Math.max(0, (Number(host.scrollHeight) || 0) - clientHeight);
    if (scrollRange < thresholds.minScrollRange) return false;
    return true;
  }

  getHostThresholds(host) {
    if (host?.classList?.contains("qd31-center-scroll-body")) {
      return {
        minHostHeight: 96,
        minTrackHeight: 64,
        minScrollRange: 32
      };
    }
    return {
      minHostHeight: QuickDeckCustomScrollbarManager.MIN_HOST_HEIGHT,
      minTrackHeight: QuickDeckCustomScrollbarManager.MIN_TRACK_HEIGHT,
      minScrollRange: QuickDeckCustomScrollbarManager.MIN_SCROLL_RANGE
    };
  }

  refreshHost(host) {
    const entry = this.entries.get(host);
    if (!entry) return;

    // Mirror host visibility onto the wrapper so CSS can avoid relational selectors.
    const isHiddenHost = Boolean(host.hidden);
    entry.wrapper?.classList?.toggle("qd-custom-scroll-wrapper-hidden-host", isHiddenHost);
    entry.wrapper?.classList?.toggle("qd-custom-scroll-wrapper-visible-host", !isHiddenHost);

    const isUsable = this.isUsableScrollHost(host, entry);
    entry.rail.classList.toggle("is-active", isUsable);
    if (!isUsable) {
      entry.thumb.style.removeProperty("height");
      entry.thumb.style.removeProperty("transform");
      return;
    }

    const trackHeight = Math.max(0, entry.track.clientHeight);
    const maxScroll = Math.max(0, host.scrollHeight - host.clientHeight);
    // Runestone thumb travel:
    // The visible thumb art is a fixed-size rune stone, so the custom thumb
    // should travel using that fixed height instead of a browser-style ratio
    // height. This keeps the runestone moving linearly from the top of the
    // chain track to the bottom.
    const thumbHeight = Math.min(trackHeight, QuickDeckCustomScrollbarManager.MIN_THUMB_HEIGHT);
    const maxTop = Math.max(0, trackHeight - thumbHeight);
    const top = maxScroll > 0 ? (host.scrollTop / maxScroll) * maxTop : 0;
    entry.thumb.style.height = `${thumbHeight}px`;
    entry.thumb.style.transform = `translateY(${Math.max(0, Math.min(maxTop, top))}px)`;
  }
  onTrackPointerDown(host,event){
    const entry=this.entries.get(host); if(!entry) return; if(event.target===entry.thumb) return;
    event.preventDefault();
    const thumbRect = entry.thumb.getBoundingClientRect();
    const clickY = Number(event.clientY);
    const pageStep = Math.max(1, host.clientHeight * 0.85);
    const maxScroll = Math.max(0, host.scrollHeight - host.clientHeight);
    let nextScrollTop = host.scrollTop;
    if (clickY > thumbRect.bottom) nextScrollTop += pageStep;
    else if (clickY < thumbRect.top) nextScrollTop -= pageStep;
    host.scrollTop = Math.max(0, Math.min(maxScroll, nextScrollTop));
    this.refreshHost(host);
  }
  onThumbPointerDown(host,event){
    const entry=this.entries.get(host); if(!entry) return;
    event.preventDefault(); event.stopPropagation();
    const startY=event.clientY; const startTop=host.scrollTop;
    const trackRect=entry.track.getBoundingClientRect();
    const thumbRect=entry.thumb.getBoundingClientRect();
    const dragScale=Math.max(1, trackRect.height-thumbRect.height);
    const maxScroll=Math.max(0, host.scrollHeight-host.clientHeight);
    const onMove=(moveEvent)=>{
      moveEvent.preventDefault();
      const delta=Number(moveEvent.clientY)-startY;
      const liveMaxScroll=Math.max(0, host.scrollHeight-host.clientHeight);
      const liveTrackRect=entry.track.getBoundingClientRect();
      const liveThumbRect=entry.thumb.getBoundingClientRect();
      const maxThumbTravel=Math.max(1, liveTrackRect.height-liveThumbRect.height);
      const scrollRatio=liveMaxScroll/maxThumbTravel;
      host.scrollTop=Math.max(0, Math.min(liveMaxScroll, startTop + (delta*scrollRatio)));
      this.refreshHost(host);
    };
    const onUp=()=>cleanup();
    const cleanup=()=>{ window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp); entry.cleanupDrag=null; entry.thumb.classList.remove("is-dragging"); entry.thumb.style.removeProperty("user-select"); entry.thumb.style.removeProperty("touch-action"); document.body.style.removeProperty("user-select"); if (entry.thumb.hasPointerCapture?.(event.pointerId)) entry.thumb.releasePointerCapture(event.pointerId);};
    entry.cleanupDrag=cleanup;
    entry.thumb.classList.add("is-dragging");
    entry.thumb.style.userSelect = "none";
    entry.thumb.style.touchAction = "none";
    document.body.style.userSelect = "none";
    entry.thumb.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    window.addEventListener("pointercancel", onUp, { once: true });
  }
}


const focusQuickDeckCockpitFirst = (root) => {
  const run = () => {
    const overlay = root ?? document.querySelector("#gurps-quickdeck-overlay");
    if (!overlay) return false;

    const body = overlay.querySelector(".qd40-body");
    const center = overlay.querySelector(".qd31-center-wrap");
    if (!body || !center) return false;

    const maxScrollLeft = Math.max(0, Number(body.scrollWidth) - Number(body.clientWidth));
    if (maxScrollLeft <= 0) return false;

    const bodyRect = body.getBoundingClientRect();
    const centerRect = center.getBoundingClientRect();
    const currentScrollLeft = Number(body.scrollLeft) || 0;
    const bodyClientWidth = Number(body.clientWidth) || Math.round(bodyRect.width) || 0;
    const centerWidth = Math.round(centerRect.width) || Number(center.offsetWidth) || 0;
    const lanePadding = 8;

    let desiredLeft;
    if (centerWidth >= bodyClientWidth - (lanePadding * 2)) {
      // Tiny viewport: the cockpit cannot fully fit, so align its left edge.
      desiredLeft = currentScrollLeft + (centerRect.left - bodyRect.left) - lanePadding;
    } else {
      // Wider viewport: center the cockpit in the visible horizontal lane.
      desiredLeft = currentScrollLeft
        + (centerRect.left - bodyRect.left)
        - Math.max(0, (bodyClientWidth - centerWidth) / 2);
    }

    const clampedLeft = Math.max(0, Math.min(maxScrollLeft, Math.round(desiredLeft)));
    body.scrollLeft = clampedLeft;
    overlay.classList.add("qd31-cockpit-first-scroll-applied");
    return true;
  };

  requestAnimationFrame(() => {
    run();
    requestAnimationFrame(run);
  });

  for (const delay of [50, 150, 300, 600]) {
    setTimeout(run, delay);
  }
};


export class QuickDeckApp extends Application {
  constructor(options = {}) {
    super(options);
    this.rosterActorIds = [];
    this.activeActorId = null;
    this.activeDrawer = null;
    this.availableSearch = "";
    this.combatSearch = "";
    this.skillsSearch = "";
    this.quickSkillsSearch = "";
    this.spellsSearch = "";
    this.quickSkillSelectionsByActor = {};
    this.combatFavoriteAttackKeysByActor = {};
    this.spellFavoriteKeysByActor = {};
    this.pinnedActionsByActor = {};
    this._actorSelectTimeout = null;
    this.centerRosterStartIndex = 0;
    this.isCenterRosterMinimized = false;
    this.isDragOverRoster = false;
    this.pendingTokenDropActorId = null;
    this._pendingTokenDropCleanup = null;
    this._tokenDropSceneId = null;
    this._tokenDropReticleElement = null;
    this._tokenDropCursorTarget = null;
    this._tokenDropPreviousCursor = null;
    this.pendingTargetOpponentAttackIndex = null;
    this._pendingTargetOpponentCleanup = null;
    this._targetOpponentSceneId = null;
    this._targetOpponentReticleElement = null;
    this._targetOpponentCursorTarget = null;
    this._targetOpponentPreviousCursor = null;
    this.isMinimized = false;
    this._floatingRestoreIcon = null;
    this._restorePillDragCleanup = null;
    this._restorePillPreventClick = false;
    this.restorePillPosition = null;
    this._pendingAttackGuidance = null;
    this.pendingAttackContext = null;
    this._nativeWindowFocusUntil = 0;
    this._lastNativeWindowIds = new Set();
    this._nativeWindowFocusLock = null;
    this.primaryRollKey = DEFAULT_PRIMARY_ROLL_KEY;
    this.secondaryRollKey = DEFAULT_SECONDARY_ROLL_KEY;
    this._stateLoadedFromSettings = false;
    this.uiMode = DEFAULT_UI_MODE;
    this.isRosterDrawerOpen = false;
    this.isActionsDrawerOpen = false;
    this._derivedActorDataCache = new Map();
    this.referenceApp = null;
    this._overlayRoot = null;
    this._overlayDragCleanup = null;
    this._overlayPosition = null;
    this._overlayWindowResizeHandler = () => this.scheduleQd31WindowResize();
    this.isInfoPopoverOpen = false;
    this.centerFavoriteSections = {
      combat: true,
      skills: true,
      spells: true
    };
    this.pdfMapDraft = {
      key: "",
      name: "",
      path: "",
      offset: 0
    };
    this.loadPersistedState();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "gurps-quickdeck-app",
      classes: ["gurps-quickdeck"],
      popOut: true,
      minimizable: true,
      resizable: true,
      width: 620,
      height: 820,
      minWidth: 520,
      title: "GURPS QuickDeck",
      template: TEMPLATE_PATH
    });
  }


  openRosterDrawer() { this.isRosterDrawerOpen = true; this.render(false); }
  closeRosterDrawer() { this.isRosterDrawerOpen = false; this.render(false); }
  toggleRosterDrawer() { this.isRosterDrawerOpen ? this.closeRosterDrawer() : this.openRosterDrawer(); }
  openActionsDrawer(drawer = null) { if (drawer && VALID_DRAWERS.has(drawer)) this.activeDrawer = drawer; this.isActionsDrawerOpen = true; this.render(false); }
  closeActionsDrawer() { this.isActionsDrawerOpen = false; this.render(false); }
  toggleActionsDrawer(drawer = null) { this.isActionsDrawerOpen ? this.closeActionsDrawer() : this.openActionsDrawer(drawer); }

  getApplicationHostElement() {
    const root = this.element?.[0] ?? this.element;
    return root?.closest?.(".app") ?? root?.parentElement?.closest?.(".app") ?? null;
  }

  applyQd31WindowClass() {
    const root = this.element?.[0] ?? this.element;
    const appElement = this.getApplicationHostElement();
    if (!appElement?.classList) return;
    const hasQd31 = Boolean(root?.querySelector?.(".qd31-shell"));
    appElement.classList.toggle("qd31-window-active", hasQd31);
  }
  getQd31LayoutMetrics() {
    const centerWidth = 460;
    const drawerDefaultWidth = 400;
    const drawerMinWidth = 320;
    const closedTabWidth = 0;
    const gap = 4;
    const shellPadding = 8;
    const chromeAllowance = 16;
    const edgeTabGutter = 40;
    const viewportPadding = 24;
    const viewportWidth = Math.max(360, Number(window.innerWidth) || 1440);
    const viewportHeight = Math.max(360, Number(window.innerHeight) || 900);
    const maxFrameWidth = Math.max(360, viewportWidth - viewportPadding);
    const maxFrameHeight = Math.max(360, viewportHeight - 12);
    const leftOpen = Boolean(this.isRosterDrawerOpen);
    const rightOpen = Boolean(this.isActionsDrawerOpen);

    let leftDrawerWidth = leftOpen ? drawerDefaultWidth : 0;
    let rightDrawerWidth = rightOpen ? drawerDefaultWidth : 0;

    const openGapWidth = (leftOpen ? gap : 0) + (rightOpen ? gap : 0);
    const baseShellWidth = shellPadding + centerWidth + openGapWidth + leftDrawerWidth + rightDrawerWidth;
    const maxShellWidthWithoutViewportScroll = Math.max(centerWidth + shellPadding, maxFrameWidth - chromeAllowance - (edgeTabGutter * 2));

    if (baseShellWidth > maxShellWidthWithoutViewportScroll) {
      const overflow = baseShellWidth - maxShellWidthWithoutViewportScroll;
      const totalReducible =
        (leftOpen ? (drawerDefaultWidth - drawerMinWidth) : 0) +
        (rightOpen ? (drawerDefaultWidth - drawerMinWidth) : 0);
      const reduction = Math.min(overflow, totalReducible);

      if (reduction > 0) {
        if (leftOpen && rightOpen) {
          const leftShare = Math.ceil(reduction / 2);
          const rightShare = Math.floor(reduction / 2);
          leftDrawerWidth = Math.max(drawerMinWidth, leftDrawerWidth - leftShare);
          rightDrawerWidth = Math.max(drawerMinWidth, rightDrawerWidth - rightShare);
        } else if (leftOpen) {
          leftDrawerWidth = Math.max(drawerMinWidth, leftDrawerWidth - reduction);
        } else if (rightOpen) {
          rightDrawerWidth = Math.max(drawerMinWidth, rightDrawerWidth - reduction);
        }
      }
    }

    const shellWidth = shellPadding + centerWidth + (leftOpen ? gap + leftDrawerWidth : 0) + (rightOpen ? gap + rightDrawerWidth : 0);
    const naturalFrameWidth = shellWidth + chromeAllowance + (edgeTabGutter * 2);
    const targetWindowWidth = naturalFrameWidth;
    const frameWidth = Math.min(naturalFrameWidth, maxFrameWidth);
    const needsHorizontalScroll = naturalFrameWidth > maxFrameWidth;

    return {
      centerWidth,
      leftDrawerWidth,
      rightDrawerWidth,
      closedTabWidth,
      gap,
      shellPadding,
      chromeAllowance,
      edgeTabGutter,
      viewportPadding,
      viewportWidth,
      viewportHeight,
      maxFrameWidth,
      maxFrameHeight,
      targetWindowWidth,
      naturalFrameWidth,
      frameWidth,
      shellWidth,
      needsHorizontalScroll
    };
  }
  getQd31TargetWindowWidth() {
    return this.getQd31LayoutMetrics().targetWindowWidth;
  }
  applyQd31LayoutSizing(metrics = this.getQd31LayoutMetrics()) {
    const applicationRoot = this.element?.[0] ?? this.element;
    const roots = [this._overlayRoot, applicationRoot].filter(Boolean);

    for (const root of roots) {
      root.style?.setProperty?.("--qd31-center-width", `${metrics.centerWidth}px`);
      root.style?.setProperty?.("--qd31-left-drawer-width", `${metrics.leftDrawerWidth}px`);
      root.style?.setProperty?.("--qd31-right-drawer-width", `${metrics.rightDrawerWidth}px`);
      root.style?.setProperty?.("--qd31-shell-width", `${metrics.shellWidth}px`);
      root.style?.setProperty?.("--qd31-frame-width", `${metrics.frameWidth}px`);
      root.style?.setProperty?.("--qd31-natural-frame-width", `${metrics.naturalFrameWidth}px`);
      root.style?.setProperty?.("--qd31-max-frame-width", `${metrics.maxFrameWidth}px`);
      root.style?.setProperty?.("--qd31-max-frame-height", `${metrics.maxFrameHeight}px`);
      root.style?.setProperty?.("--qd31-edge-tab-gutter", `${metrics.edgeTabGutter}px`);
      root.classList?.toggle?.("qd31-horizontal-scroll-needed", Boolean(metrics.needsHorizontalScroll));

      const shell = root.querySelector?.(".qd31-shell");
      if (shell?.style) {
        shell.style.setProperty("--qd31-center-width", `${metrics.centerWidth}px`);
        shell.style.setProperty("--qd31-left-drawer-width", `${metrics.leftDrawerWidth}px`);
        shell.style.setProperty("--qd31-right-drawer-width", `${metrics.rightDrawerWidth}px`);
        shell.style.setProperty("--qd31-shell-width", `${metrics.shellWidth}px`);
        shell.style.setProperty("--qd31-frame-width", `${metrics.frameWidth}px`);
        shell.style.setProperty("--qd31-natural-frame-width", `${metrics.naturalFrameWidth}px`);
        shell.style.setProperty("--qd31-max-frame-width", `${metrics.maxFrameWidth}px`);
        shell.style.setProperty("--qd31-edge-tab-gutter", `${metrics.edgeTabGutter}px`);
      }
    }
  }

  scheduleQd31WindowResize() {
    if (this._qd31ResizeRaf) return;
    this._qd31ResizeRaf = requestAnimationFrame(() => {
      this._qd31ResizeRaf = null;
      const metrics = this.getQd31LayoutMetrics();
      this.applyQd31LayoutSizing(metrics);
      this.setOverlayPosition();
      focusQuickDeckCockpitFirst(this._overlayRoot);

      if (this.rendered && this.position) {
        const height = Math.max(Number(this.position.height) || 0, Number(this._lastPosition?.height) || 0);
        this.setPosition({
          left: this.position.left,
          top: this.position.top,
          height: height || this.position.height
        });
      }
    });
  }

  close(options) {
    this.clearQd31InlineSizing();
    return super.close(options);
  }

  clearQd31InlineSizing() {
    const applicationRoot = this.element?.[0] ?? this.element;
    const appElement = this.getApplicationHostElement();
    const roots = [this._overlayRoot, applicationRoot].filter(Boolean);

    appElement?.classList?.remove("qd31-window-active");
    if (appElement?.style) appElement.style.width = appElement.style.minWidth = appElement.style.maxWidth = "";

    for (const root of roots) {
      root.classList?.remove?.("qd31-horizontal-scroll-needed");
      if (root?.style) {
        root.style.removeProperty("--qd31-center-width");
        root.style.removeProperty("--qd31-left-drawer-width");
        root.style.removeProperty("--qd31-right-drawer-width");
        root.style.removeProperty("--qd31-shell-width");
        root.style.removeProperty("--qd31-frame-width");
        root.style.removeProperty("--qd31-natural-frame-width");
        root.style.removeProperty("--qd31-max-frame-width");
        root.style.removeProperty("--qd31-max-frame-height");
        root.style.removeProperty("--qd31-edge-tab-gutter");
      }

      const shell = root.querySelector?.(".qd31-shell");
      if (shell?.style) {
        shell.style.width = "";
        shell.style.minWidth = "";
        shell.style.maxWidth = "";
        shell.style.removeProperty("--qd31-center-width");
        shell.style.removeProperty("--qd31-left-drawer-width");
        shell.style.removeProperty("--qd31-right-drawer-width");
        shell.style.removeProperty("--qd31-shell-width");
        shell.style.removeProperty("--qd31-frame-width");
        shell.style.removeProperty("--qd31-natural-frame-width");
        shell.style.removeProperty("--qd31-max-frame-width");
        shell.style.removeProperty("--qd31-edge-tab-gutter");
      }
    }
  }

  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    const minimizeButton = {
      label: "−",
      title: "Minimize QuickDeck",
      class: "quickdeck-header-minimize",
      icon: "",
      onclick: (event) => {
        event?.preventDefault?.();
        this.toggleMinimizedState();
      }
    };
    const existingMinimizeIndex = buttons.findIndex((button) =>
      button.class === "minimize" || button.class === "quickdeck-header-minimize"
    );

    if (existingMinimizeIndex >= 0) {
      buttons.splice(existingMinimizeIndex, 1);
    }

    const closeIndex = buttons.findIndex((button) => button.class === "close");
    if (closeIndex >= 0) {
      buttons.splice(closeIndex, 0, minimizeButton);
    } else {
      buttons.push(minimizeButton);
    }

    return buttons;
  }

  getCombatActors() {
    return game.actors
      .filter((actor) => {
        if (!actor) return false;
        if (!actor.id || !actor.name) return false;
        if (actor.documentName && actor.documentName !== "Actor") return false;

        if (actor.visible) return true;

        if (typeof actor.testUserPermission === "function" && game?.user) {
          return actor.testUserPermission(game.user, "OBSERVER");
        }

        return false;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  ensureActorTab(actorId) {
    if (!actorId || !game.actors.has(actorId)) return;
    if (!this.rosterActorIds.includes(actorId)) {
      this.rosterActorIds.push(actorId);
      this.persistRosterState();
    }
    if (this.activeActorId && this.activeActorId !== actorId) {
      this.cancelTokenDrop({ render: false });
      this.cancelTargetOpponentMode({ render: false, restore: false });
    }
    this.activeActorId = actorId;
    this.keepActiveActorInCenterRosterWindow();
  }

  clearRoster() {
    this.rosterActorIds = [];
    this.activeActorId = null;
    this.centerRosterStartIndex = 0;
    this.persistRosterState();
  }

  removeActorFromRoster(actorId) {
    if (!actorId) return;

    const previousLength = this.rosterActorIds.length;
    this.rosterActorIds = this.rosterActorIds.filter((id) => id !== actorId);
    if (this.rosterActorIds.length === previousLength) return;

    if (this.activeActorId === actorId) {
      this.activeActorId = this.rosterActorIds[0] ?? null;
    }
    this.clampCenterRosterWindow();

    this.persistRosterState();
  }

  onActorDeleted(actorId) {
    this.removeActorFromRoster(actorId);
    this.render();
  }

  getActiveActor() {
    return this.activeActorId ? game.actors.get(this.activeActorId) : null;
  }

  getSelectedPrimaryRollOption() {
    return PRIMARY_ROLL_OPTIONS.find((option) => option.key === this.primaryRollKey) ?? PRIMARY_ROLL_OPTIONS[0];
  }

  getPrimaryAttributeValue(actor, option) {
    if (!actor || !option?.valueType) return null;

    const attribute = option.valueType;
    return this.getFirstDefinedValue(actor, [
      `system.attributes.${attribute}.value`,
      `system.attributes.${attribute}.import`,
      `data.data.attributes.${attribute}.value`,
      `data.data.attributes.${attribute}.import`
    ]);
  }

  getPrimaryRollView(actor = this.getActiveActor()) {
    const selectedKey = this.getSelectedPrimaryRollOption().key;
    const options = PRIMARY_ROLL_OPTIONS.map((option) => {
      const value = this.getPrimaryAttributeValue(actor, option);
      const displayValue = this.toDisplayValue(value);
      return {
        ...option,
        displayValue,
        displayLabel: `${option.label} ${displayValue}`,
        selected: option.key === selectedKey
      };
    });
    const selected = options.find((option) => option.selected) ?? options[0];
    return {
      selectedKey: selected?.key ?? DEFAULT_PRIMARY_ROLL_KEY,
      selectedValue: selected?.displayValue ?? "—",
      options
    };
  }

  getSelectedSecondaryRollOption() {
    return SECONDARY_ROLL_OPTIONS.find((option) => option.key === this.secondaryRollKey) ?? SECONDARY_ROLL_OPTIONS[0];
  }

  getSecondaryAttributeValue(actor, option) {
    if (!actor || !option) return null;

    const willValue = () => this.getFirstDefinedValue(actor, [
      "system.attributes.WILL.value",
      "system.attributes.WILL.import",
      "system.WILL.value",
      "system.attributes.will.value",
      "system.attributes.will.import",
      "system.will.value",
      "data.data.attributes.WILL.value",
      "data.data.attributes.WILL.import",
      "data.data.WILL.value",
      "data.data.attributes.will.value",
      "data.data.attributes.will.import"
    ]);
    const perceptionValue = () => this.getFirstDefinedValue(actor, [
      "system.attributes.PER.value",
      "system.attributes.PER.import",
      "system.currentper",
      "system.currentperception",
      "system.Per.value",
      "system.PER.value",
      "system.per.value",
      "system.attributes.Per.value",
      "system.attributes.Per.import",
      "system.attributes.per.value",
      "system.attributes.per.import",
      "system.perception.value",
      "data.data.attributes.PER.value",
      "data.data.attributes.PER.import",
      "data.data.currentper",
      "data.data.currentperception",
      "data.data.Per.value",
      "data.data.PER.value",
      "data.data.per.value",
      "data.data.attributes.Per.value",
      "data.data.attributes.Per.import",
      "data.data.attributes.per.value",
      "data.data.attributes.per.import"
    ]);

    if (option.valueType === "will") return willValue();
    if (option.valueType === "perception") return perceptionValue();

    if (option.valueType === "fright-check") {
      return this.getFirstDefinedValue(actor, [
        "system.frightcheck",
        "data.data.frightcheck"
      ]) ?? willValue();
    }

    if (option.valueType === "vision") {
      return this.getFirstDefinedValue(actor, [
        "system.vision",
        "data.data.vision"
      ]) ?? perceptionValue();
    }

    if (option.valueType === "hearing") {
      return this.getFirstDefinedValue(actor, [
        "system.hearing",
        "data.data.hearing"
      ]) ?? perceptionValue();
    }

    if (option.valueType === "taste-smell") {
      return this.getFirstDefinedValue(actor, [
        "system.tastesmell",
        "data.data.tastesmell"
      ]) ?? perceptionValue();
    }

    if (option.valueType === "touch") {
      return this.getFirstDefinedValue(actor, [
        "system.touch",
        "data.data.touch"
      ]) ?? perceptionValue();
    }

    return null;
  }

  getSecondaryRollView(actor = this.getActiveActor(), derivedData = null) {
    const selectedKey = this.getSelectedSecondaryRollOption().key;
    const options = SECONDARY_ROLL_OPTIONS.map((option) => {
      const value = this.getSecondaryAttributeValue(actor, option);
      return {
        ...option,
        displayValue: this.toDisplayValue(value),
        displayLabel: `${option.label} ${this.toDisplayValue(value)}`,
        selected: option.key === selectedKey
      };
    });
    const selected = options.find((option) => option.selected) ?? options[0];
    return {
      selectedKey: selected?.key ?? DEFAULT_SECONDARY_ROLL_KEY,
      selectedValue: selected?.displayValue ?? "—",
      options
    };
  }


  clampCenterRosterWindow(total = this.rosterActorIds.length) {
    const maxStartIndex = Math.max(0, total - 5);
    const currentStartIndex = Number.isFinite(this.centerRosterStartIndex)
      ? Math.trunc(this.centerRosterStartIndex)
      : 0;
    this.centerRosterStartIndex = Math.min(Math.max(0, currentStartIndex), maxStartIndex);
    return this.centerRosterStartIndex;
  }

  keepActiveActorInCenterRosterWindow(rosterActorIds = this.rosterActorIds) {
    const total = rosterActorIds.length;
    this.clampCenterRosterWindow(total);
    if (!this.activeActorId || total <= 5) {
      this.centerRosterStartIndex = 0;
      return;
    }

    const activeIndex = rosterActorIds.indexOf(this.activeActorId);
    if (activeIndex < 0) return;
    if (activeIndex < this.centerRosterStartIndex) {
      this.centerRosterStartIndex = activeIndex;
    } else if (activeIndex >= this.centerRosterStartIndex + 5) {
      this.centerRosterStartIndex = activeIndex - 4;
    }
    this.clampCenterRosterWindow(total);
  }

  getCenterRosterView(rosterActors) {
    const actors = Array.isArray(rosterActors) ? rosterActors : [];
    this.keepActiveActorInCenterRosterWindow(actors.map((actor) => actor.id));
    const total = actors.length;
    const startIndex = this.clampCenterRosterWindow(total);
    const hasPaging = total > 5;
    return {
      actors: actors.slice(startIndex, startIndex + 5),
      total,
      startIndex,
      canPagePrev: hasPaging && startIndex > 0,
      canPageNext: hasPaging && startIndex + 5 < total,
      hasPaging,
      isMinimized: this.isCenterRosterMinimized,
      isEmpty: total === 0
    };
  }

  selectCenterRosterActor(actorId) {
    if (!actorId || !game.actors.has(actorId)) return false;
    if (this.activeActorId && this.activeActorId !== actorId) {
      this.cancelTokenDrop({ render: false });
      this.cancelTargetOpponentMode({ render: false, restore: false });
    }
    this.activeActorId = actorId;
    this.keepActiveActorInCenterRosterWindow();
    return true;
  }

  pageCenterRoster(direction) {
    const total = this.rosterActorIds.length;
    if (total <= 5) {
      this.centerRosterStartIndex = 0;
      return;
    }
    const delta = direction === "prev" ? -5 : 5;
    this.centerRosterStartIndex += delta;
    this.clampCenterRosterWindow(total);
  }

  invalidateDerivedActorData(actorId = null) {
    if (!actorId) {
      this._derivedActorDataCache.clear();
      return;
    }
    this._derivedActorDataCache.delete(String(actorId));
  }

  getFirstDefinedValue(source, paths = []) {
    for (const path of paths) {
      const value = foundry.utils.getProperty(source, path);
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return null;
  }

  getCollectionEntries(collection) {
    if (Array.isArray(collection)) return collection.filter(Boolean);
    if (collection && typeof collection === "object") {
      return Object.values(collection).filter(Boolean);
    }
    return [];
  }

  collectNestedMatches(root, matcher) {
    if (typeof matcher !== "function") return [];

    const results = [];
    const visited = new WeakSet();
    const stack = [root];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || typeof current !== "object") continue;
      if (visited.has(current)) continue;
      visited.add(current);

      if (matcher(current)) {
        results.push(current);
      }

      if (Array.isArray(current)) {
        for (const value of current) stack.push(value);
      } else {
        for (const value of Object.values(current)) stack.push(value);
      }
    }

    return results;
  }

  collectNestedMatchesWithPaths(root, matcher, basePath) {
    if (!root || typeof root !== "object" || typeof matcher !== "function" || !basePath) return [];

    const results = [];
    const visited = new WeakSet();
    const stack = Object.entries(root).map(([key, value]) => ({
      value,
      path: `${basePath}.${key}`,
      key: String(key)
    }));

    while (stack.length > 0) {
      const current = stack.pop();
      const value = current?.value;
      if (!value || typeof value !== "object") continue;
      if (visited.has(value)) continue;
      visited.add(value);

      if (matcher(value)) {
        results.push({ value, path: current.path, key: current.key });
      }

      const childEntries = Array.isArray(value)
        ? value.map((child, index) => [String(index), child])
        : Object.entries(value);
      for (const [childKey, childValue] of childEntries) {
        if (!childValue || typeof childValue !== "object") continue;
        stack.push({
          value: childValue,
          path: `${current.path}.${childKey}`,
          key: String(childKey)
        });
      }
    }

    return results;
  }

  objectHasAnyPath(source, paths = []) {
    if (!source || typeof source !== "object") return false;
    return paths.some((path) => foundry.utils.getProperty(source, path) !== undefined);
  }

  isAttackLike(value) {
    return this.objectHasAnyPath(value, [
      "name",
      "mode",
      "damage",
      "dmg",
      "level",
      "skill",
      "parry",
      "block",
      "reach",
      "range",
      "acc",
      "rof",
      "rcl"
    ]);
  }

  isSkillLike(value) {
    if (!value || typeof value !== "object") return false;

    const hasName = this.objectHasAnyPath(value, ["name"]);
    if (!hasName) return false;

    const hasRealSkillField = this.objectHasAnyPath(value, [
      "difficulty",
      "defaults",
      "default",
      "points",
      "calc.points",
      "calc.level",
      "calc.rsl",
      "level",
      "rsl",
      "defaulted_from",
      "reference"
    ]);

    const tags = foundry.utils.getProperty(value, "tags");
    const normalizedTags = Array.isArray(tags)
      ? tags.map((tag) => String(tag).toLowerCase())
      : typeof tags === "string"
        ? [tags.toLowerCase()]
        : [];
    const hasSkillTag = normalizedTags.some((tag) =>
      ["skill", "combat", "weapon"].some((needle) => tag.includes(needle))
    );

    const children = foundry.utils.getProperty(value, "children");
    const hasChildren = Array.isArray(children)
      ? children.length > 0
      : Boolean(children && typeof children === "object" && Object.keys(children).length > 0);

    if (!hasRealSkillField && !(hasSkillTag && !hasChildren)) return false;
    return true;
  }

  normalizeAttack(attack, type, sourceMeta = {}) {
    if (!attack || typeof attack !== "object") return null;

    const name =
      this.getFirstDefinedValue(attack, [
        "name",
        "originalName",
        "mode",
        "attack",
        "usage"
      ]) ?? "Unnamed Attack";

    const parry = this.getFirstDefinedValue(attack, [
      "parry",
      "calc.parry",
      "defense.parry",
      "defence.parry"
    ]);
    const block = this.getFirstDefinedValue(attack, [
      "block",
      "calc.block",
      "defense.block",
      "defence.block"
    ]);

    return {
      name,
      type,
      level: this.getFirstDefinedValue(attack, [
        "level",
        "skill",
        "relativeLevel",
        "import",
        "roll"
      ]),
      damage: this.getFirstDefinedValue(attack, [
        "damage",
        "dmg",
        "calc.damage",
        "calc.dmg",
        "damage.formula",
        "dmg.formula",
        "notes"
      ]),
      reachOrRange:
        this.getFirstDefinedValue(
          attack,
          type === "Melee"
            ? ["reach", "meleeReach", "range", "distance"]
            : ["range", "accRange", "distance", "reach"]
        ) ?? null,
      parry,
      block,
      parryOrBlock:
        parry ??
        block ??
        this.getFirstDefinedValue(attack, ["defense", "defence"]),
      sourcePath: sourceMeta.sourcePath ?? null,
      sourceKey: sourceMeta.sourceKey ?? null,
      sourceCollection: sourceMeta.sourceCollection ?? null,
      raw: attack
    };
  }


  getSheetAttackDisplayName(attack) {
    const raw = attack?.raw && typeof attack.raw === "object" ? attack.raw : {};
    const name = String(this.getFirstDefinedValue(raw, ["name"]) ?? attack?.name ?? "").trim();
    const mode = String(this.getFirstDefinedValue(raw, ["mode", "usage"]) ?? "").trim();
    return mode ? `${name} (${mode})` : name;
  }

  escapeGurpsOtfName(name) {
    return String(name ?? "").trim().replace(/"/g, '\\"');
  }

  getSheetAttackOtf(attack) {
    const attackType = String(attack?.type ?? "").toLowerCase();
    const prefix = attackType === "ranged" ? "R" : "M";
    const displayName = this.escapeGurpsOtfName(this.getSheetAttackDisplayName(attack));
    return `${prefix}:"${displayName}"`;
  }

  getSheetAttackDataset(attack) {
    return {
      name: this.getSheetAttackDisplayName(attack),
      key: attack?.sourcePath,
      otf: this.getSheetAttackOtf(attack)
    };
  }

  getSheetSkillOtf(skill) {
    return `Sk:"${this.escapeGurpsOtfName(skill?.name)}"`;
  }

  getSheetSkillDataset(skill) {
    return {
      name: skill?.name,
      key: skill?.sourcePath,
      otf: this.getSheetSkillOtf(skill)
    };
  }

  getSheetSpellOtf(spell) {
    return `Sp:"${this.escapeGurpsOtfName(spell?.name)}"`;
  }

  getSheetSpellDataset(spell) {
    return {
      name: spell?.name,
      key: spell?.sourcePath,
      otf: this.getSheetSpellOtf(spell)
    };
  }

  buildGurpsHandleRollEvent(dataset) {
    return {
      preventDefault: () => {},
      stopPropagation: () => {},
      currentTarget: { dataset }
    };
  }

  normalizeSkill(skill, sourceMeta = {}) {
    if (!skill || typeof skill !== "object") return null;

    const name =
      this.getFirstDefinedValue(skill, ["name", "label", "skill", "title"]) ??
      "Unnamed Skill";

    return {
      name,
      level: this.getFirstDefinedValue(skill, ["calc.level", "level", "value", "import", "rsl"]),
      relativeLevel: this.getFirstDefinedValue(skill, [
        "calc.rsl",
        "relativeLevel",
        "relative",
        "rsl",
        "relative_level"
      ]),
      points: this.getFirstDefinedValue(skill, ["points", "calc.points", "pts", "spent", "cp"]),
      reference: this.getFirstDefinedValue(skill, ["reference", "ref", "pageRef", "pageref", "book"]),
      pageHint: this.getFirstDefinedValue(skill, [
        "pageRef",
        "pageref",
        "page",
        "refPage",
        "referencePage"
      ]),
      sourcePath: sourceMeta.sourcePath ?? null,
      sourceKey: sourceMeta.sourceKey ?? null,
      sourceCollection: sourceMeta.sourceCollection ?? null,
      raw: skill
    };
  }

  isSpellLike(value) {
    if (!value || typeof value !== "object") return false;
    const hasName = this.objectHasAnyPath(value, ["name", "spell", "label", "title"]);
    if (!hasName) return false;

    return this.objectHasAnyPath(value, [
      "class",
      "college",
      "cost",
      "maintain",
      "casting",
      "castingtime",
      "duration",
      "resist",
      "difficulty",
      "level",
      "import",
      "spellClass",
      "reference",
      "pageRef",
      "itemtype",
      "type"
    ]);
  }

  normalizeSpell(spell, sourceMeta = {}) {
    if (!spell || typeof spell !== "object") return null;
    const name =
      this.getFirstDefinedValue(spell, ["name", "spell", "label", "title"]) ?? "Unnamed Spell";

    return {
      name,
      level: this.getFirstDefinedValue(spell, ["level", "calc.level", "import", "value"]),
      class: this.getFirstDefinedValue(spell, ["class", "spellClass", "category", "college"]),
      college: this.getFirstDefinedValue(spell, ["college"]),
      cost: this.getFirstDefinedValue(spell, ["cost", "casting.cost", "castCost"]),
      maintain: this.getFirstDefinedValue(spell, ["maintain", "maintenance", "maint"]),
      duration: this.getFirstDefinedValue(spell, ["duration"]),
      reference: this.getFirstDefinedValue(spell, ["reference", "ref", "book"]),
      pageHint: this.getFirstDefinedValue(spell, [
        "pageRef",
        "pageref",
        "page",
        "refPage",
        "referencePage"
      ]),
      sourcePath: sourceMeta.sourcePath ?? null,
      sourceKey: sourceMeta.sourceKey ?? null,
      sourceCollection: sourceMeta.sourceCollection ?? null,
      raw: spell
    };
  }

  extractAttacks(actor) {
    if (!actor) return [];

    const attackSources = [
      { path: "system.melee", type: "Melee", collection: "melee" },
      { path: "system.ranged", type: "Ranged", collection: "ranged" },
      { path: "data.data.melee", type: "Melee", collection: "melee" },
      { path: "data.data.ranged", type: "Ranged", collection: "ranged" }
    ];

    const attacks = [];

    for (const source of attackSources) {
      const collection = foundry.utils.getProperty(actor, source.path);
      if (!collection || typeof collection !== "object") continue;

      for (const [entryKey, entryValue] of Object.entries(collection)) {
        if (!entryValue || typeof entryValue !== "object") continue;
        const sourcePath = `${source.path}.${entryKey}`;
        const sourceMeta = {
          sourcePath,
          sourceKey: String(entryKey),
          sourceCollection: source.collection
        };

        if (this.isAttackLike(entryValue)) {
          const normalized = this.normalizeAttack(entryValue, source.type, sourceMeta);
          if (normalized) attacks.push(normalized);
          continue;
        }

        const entries = this.collectNestedMatches(entryValue, (entry) => this.isAttackLike(entry));
        for (const entry of entries) {
          const normalized = this.normalizeAttack(entry, source.type, sourceMeta);
          if (normalized) attacks.push(normalized);
        }
      }
    }

    return attacks;
  }

  extractSkills(actor) {
    if (!actor) return [];

    const skillSources = [
      { path: "system.skills", collection: "skills" },
      { path: "data.data.skills", collection: "skills" },
      { path: "system.traits.skills", collection: "traits.skills" }
    ];

    const skills = [];

    for (const source of skillSources) {
      const collection = foundry.utils.getProperty(actor, source.path);
      const entries = this.collectNestedMatchesWithPaths(
        collection,
        (entry) => this.isSkillLike(entry),
        source.path
      );

      for (const entry of entries) {
        const normalized = this.normalizeSkill(entry.value, {
          sourcePath: entry.path,
          sourceKey: entry.key,
          sourceCollection: source.collection
        });
        if (normalized) {
          const sourcePath = String(entry.path ?? source.path ?? "");
          const sourcePathSegments = sourcePath ? sourcePath.split(".").filter(Boolean) : [];
          const baseSegments = String(source.path ?? "").split(".").filter(Boolean).length;
          const depth = Math.max(0, sourcePathSegments.length - baseSegments);

          if (DEBUG) {
            console.debug("QuickDeck Skill Indexed", {
              name: normalized.name,
              specialization: this.getFirstDefinedValue(normalized.raw, ["specialization", "specialty", "speciality"]) ?? null,
              reference: normalized.reference ?? null,
              difficulty: this.getFirstDefinedValue(normalized.raw, ["difficulty", "diff", "calc.diff"]) ?? null,
              level: normalized.level ?? null,
              sourcePath,
              depth
            });
          }

          skills.push(normalized);
        }
      }
    }

    return skills;
  }

  extractSpells(actor) {
    if (!actor) return [];

    const spells = [];
    const spellSources = [
      { path: "system.spells", collection: "spells" },
      { path: "data.data.spells", collection: "spells" },
      { path: "system.magic", collection: "magic" },
      { path: "data.data.magic", collection: "magic" },
      { path: "system.traits.spells", collection: "traits.spells" },
      { path: "data.data.traits.spells", collection: "traits.spells" }
    ];

    for (const source of spellSources) {
      const collection = foundry.utils.getProperty(actor, source.path);
      const entries = this.collectNestedMatchesWithPaths(
        collection,
        (entry) => this.isSpellLike(entry),
        source.path
      );
      for (const entry of entries) {
        const normalized = this.normalizeSpell(entry.value, {
          sourcePath: entry.path,
          sourceKey: entry.key,
          sourceCollection: source.collection
        });
        if (normalized) spells.push(normalized);
      }
    }

    const actorItems = Array.from(actor.items ?? []);
    for (const item of actorItems) {
      const itemType = String(item?.type ?? "").toLowerCase();
      const itemName = String(item?.name ?? "").toLowerCase();
      const looksLikeSpell =
        itemType.includes("spell") ||
        itemName.includes("spell") ||
        itemName.includes("ritual") ||
        itemName.includes("magic");
      if (!looksLikeSpell) continue;
      const normalized = this.normalizeSpell(item?.system ?? item, {
        sourcePath: item?.id ? `items.${item.id}` : null,
        sourceKey: item?.id ?? null,
        sourceCollection: "items"
      });
      if (!normalized) continue;
      if (!normalized.name || normalized.name === "Unnamed Spell") {
        normalized.name = item?.name ?? normalized.name;
      }
      spells.push(normalized);
    }

    const dedupe = new Set();
    return spells.filter((spell) => {
      const key = `${String(spell.name ?? "").toLowerCase()}::${String(spell.level ?? "—")}`;
      if (dedupe.has(key)) return false;
      dedupe.add(key);
      return true;
    });
  }

  getActorDataVersionStamp(actor) {
    if (!actor) return "missing";
    const modifiedTime =
      actor?._stats?.modifiedTime ??
      actor?._stats?.modified ??
      actor?._source?._stats?.modifiedTime ??
      "";
    const itemSize = Number(actor?.items?.size ?? actor?.items?.length ?? 0);
    return `${actor.id ?? "unknown"}::${String(modifiedTime)}::${itemSize}`;
  }

  filterEntriesBySearchText(entries, searchTerm) {
    const search = this.normalizeSearchText(searchTerm);
    if (!search) return entries;
    return entries.filter((entry) => this.normalizeSearchText(entry?.searchText).includes(search));
  }

  getDerivedActorData(actor, options = {}) {
    const includeAttacks = options.includeAttacks !== false;
    const includeSkills = options.includeSkills !== false;
    const includeSpells = options.includeSpells !== false;
    const cacheScope = `${includeAttacks ? "1" : "0"}${includeSkills ? "1" : "0"}${includeSpells ? "1" : "0"}`;

    if (!actor?.id) {
      return {
        attacks: [],
        indexedAttacks: [],
        skills: [],
        indexedSkills: [],
        spells: [],
        indexedSpells: [],
        dodge: null,
        bestParry: null,
        bestBlock: null,
        currentHp: null,
        currentFp: null,
        maxHp: null,
        maxFp: null,
        move: null
      };
    }

    const actorId = String(actor.id);
    const stamp = this.getActorDataVersionStamp(actor);
    const actorCache = this._derivedActorDataCache.get(actorId);
    const cached = actorCache?.get(cacheScope);
    if (cached?.stamp === stamp) return cached.value;

    const attacks = includeAttacks ? this.extractAttacks(actor) : [];
    const skills = includeSkills ? this.extractSkills(actor) : [];
    const spells = includeSpells ? this.extractSpells(actor) : [];
    const indexedAttacks = attacks.map((attack, index) => ({
      ...attack,
      index,
      attackKey: this.getAttackFavoriteKey(attack),
      searchText: this.buildSearchText([
        attack.name,
        attack.type,
        attack.damage,
        attack.level,
        attack.reachOrRange,
        attack.parry,
        attack.block
      ])
    }));
    const indexedSkills = skills.map((skill, index) => ({
      ...skill,
      index,
      searchText: this.buildSearchText([skill.name, skill.level, skill.relativeLevel, skill.points])
    }));
    const indexedSpells = spells.map((spell, index) => ({
      ...spell,
      index,
      searchText: this.buildSearchText([
        spell.name,
        spell.level,
        spell.class,
        spell.college,
        spell.cost,
        spell.duration,
        spell.reference,
        spell.pageHint
      ])
    }));

    const value = {
      attacks,
      indexedAttacks,
      skills,
      indexedSkills,
      spells,
      indexedSpells,
      dodge: includeAttacks ? foundry.utils.getProperty(actor, "system.currentdodge") ?? null : null,
      bestParry: includeAttacks ? this.getBestAttackDefense(attacks, "parry") : null,
      bestBlock: includeAttacks ? this.getBestAttackDefense(attacks, "block") : null,
      currentHp: this.getResourceValue(actor, "HP"),
      currentFp: this.getResourceValue(actor, "FP"),
      maxHp: this.getResourceMax(actor, "HP"),
      maxFp: this.getResourceMax(actor, "FP"),
      move: foundry.utils.getProperty(actor, "system.basicmove.value") ?? null
    };

    const nextActorCache = actorCache ?? new Map();
    nextActorCache.set(cacheScope, { stamp, value });
    this._derivedActorDataCache.set(actorId, nextActorCache);
    return value;
  }


  getAttackFavoriteKey(attack) {
    if (!attack || typeof attack !== "object") return null;
    const raw = attack.raw && typeof attack.raw === "object" ? attack.raw : {};
    const sourceParts = [
      attack.sourceCollection,
      attack.sourcePath,
      attack.sourceKey,
      this.getFirstDefinedValue(raw, ["uuid", "id", "_id", "itemid", "itemId", "key"])
    ].filter((part) => part !== undefined && part !== null && part !== "");
    const identityParts = [
      attack.name,
      attack.type,
      this.getFirstDefinedValue(raw, ["mode", "usage"]),
      attack.level,
      attack.damage
    ].filter((part) => part !== undefined && part !== null && part !== "");
    const base = [...sourceParts, ...identityParts];
    return base.map((part) => String(part).trim().toLowerCase()).join("::") || null;
  }

  getFavoriteAttackSelection(actorId) {
    if (!actorId) return new Set();
    const selected = this.combatFavoriteAttackKeysByActor[actorId];
    if (selected instanceof Set) return selected;

    const normalized = new Set(Array.isArray(selected) ? selected.map((entry) => String(entry)) : []);
    this.combatFavoriteAttackKeysByActor[actorId] = normalized;
    return normalized;
  }

  setFavoriteAttackSelected(actorId, attackKey, isSelected) {
    if (!actorId || !attackKey) return;
    const selection = this.getFavoriteAttackSelection(actorId);
    if (isSelected) selection.add(String(attackKey));
    else selection.delete(String(attackKey));
    this.persistFavoriteAttacksState();
  }

  serializeFavoriteAttacksState() {
    return Object.fromEntries(
      Object.entries(this.combatFavoriteAttackKeysByActor).map(([actorId, attackSet]) => [
        actorId,
        Array.from(attackSet instanceof Set ? attackSet : new Set())
      ])
    );
  }

  getSpellFavoriteKey(spell) {
    if (!spell || typeof spell !== "object") return null;
    const raw = spell.raw && typeof spell.raw === "object" ? spell.raw : {};
    const sourceParts = [
      spell.sourceCollection,
      spell.sourcePath,
      spell.sourceKey,
      this.getFirstDefinedValue(raw, ["uuid", "id", "_id", "itemid", "itemId", "key"])
    ].filter((part) => part !== undefined && part !== null && part !== "");
    const identityParts = [
      spell.name,
      spell.class,
      spell.college,
      spell.level,
      spell.cost,
      spell.duration,
      spell.reference,
      spell.pageHint
    ].filter((part) => part !== undefined && part !== null && part !== "");
    const base = [...sourceParts, ...identityParts];
    return base.map((part) => String(part).trim().toLowerCase()).join("::") || null;
  }

  getFavoriteSpellSelection(actorId) {
    if (!actorId) return new Set();
    const selected = this.spellFavoriteKeysByActor[actorId];
    if (selected instanceof Set) return selected;

    const normalized = new Set(Array.isArray(selected) ? selected.map((entry) => String(entry)) : []);
    this.spellFavoriteKeysByActor[actorId] = normalized;
    return normalized;
  }

  setFavoriteSpellSelected(actorId, spellKey, isSelected) {
    if (!actorId || !spellKey) return;
    const selection = this.getFavoriteSpellSelection(actorId);
    if (isSelected) selection.add(String(spellKey));
    else selection.delete(String(spellKey));
    this.persistFavoriteSpellsState();
  }

  serializeFavoriteSpellsState() {
    return Object.fromEntries(
      Object.entries(this.spellFavoriteKeysByActor).map(([actorId, spellSet]) => [
        actorId,
        Array.from(spellSet instanceof Set ? spellSet : new Set())
      ])
    );
  }

  getPinnedActions(actorId) {
    if (!actorId) return [];
    const pinned = this.pinnedActionsByActor[actorId];
    if (!Array.isArray(pinned)) {
      this.pinnedActionsByActor[actorId] = [];
      return this.pinnedActionsByActor[actorId];
    }
    return pinned;
  }

  isPinnedAction(actorId, type, key) {
    if (!actorId || !type || !key) return false;
    return this.getPinnedActions(actorId).some((entry) => entry?.type === type && entry?.key === key);
  }

  togglePinnedAction(actorId, type, key) {
    if (!actorId || !type || !key) return;
    const current = this.getPinnedActions(actorId).filter((entry) => entry?.type && entry?.key);
    const existingIndex = current.findIndex((entry) => entry.type === type && entry.key === key);
    if (existingIndex >= 0) current.splice(existingIndex, 1);
    else current.unshift({ type, key });
    this.pinnedActionsByActor[actorId] = current.slice(0, 5);
    this.persistPinnedActionsState();
  }

  removePinnedAction(actorId, type, key) {
    if (!actorId || !type || !key) return;
    const current = this.getPinnedActions(actorId).filter((entry) => entry?.type && entry?.key);
    this.pinnedActionsByActor[actorId] = current.filter((entry) => !(entry.type === type && entry.key === key)).slice(0, 5);
    this.persistPinnedActionsState();
  }

  serializePinnedActionsState() {
    return Object.fromEntries(
      Object.entries(this.pinnedActionsByActor).map(([actorId, pinned]) => [
        actorId,
        Array.isArray(pinned) ? pinned.filter((entry) => entry?.type && entry?.key).slice(0, 5) : []
      ])
    );
  }


  getQuickSkillKey(skill) {
    if (!skill || typeof skill !== "object") return null;
    const raw = skill.raw;

    const rawKey = this.getFirstDefinedValue(raw, [
      "uuid",
      "id",
      "_id",
      "itemid",
      "itemId",
      "key"
    ]);
    if (rawKey !== null) return String(rawKey);

    const name = String(skill.name ?? "Unnamed Skill");
    const level = String(skill.level ?? "—");
    return `${name}::${level}`;
  }

  getQuickSkillSelection(actorId) {
    if (!actorId) return new Set();
    const selected = this.quickSkillSelectionsByActor[actorId];
    if (selected instanceof Set) return selected;

    const normalized = new Set(Array.isArray(selected) ? selected.map((entry) => String(entry)) : []);
    this.quickSkillSelectionsByActor[actorId] = normalized;
    return normalized;
  }

  setQuickSkillSelected(actorId, skillKey, isSelected) {
    if (!actorId || !skillKey) return;
    const selection = this.getQuickSkillSelection(actorId);
    if (isSelected) selection.add(skillKey);
    else selection.delete(skillKey);
    this.persistQuickSkillsState();
  }

  parseJsonSetting(rawValue, fallbackValue) {
    if (typeof rawValue !== "string") return fallbackValue;
    try {
      const parsed = JSON.parse(rawValue);
      return parsed ?? fallbackValue;
    } catch (_error) {
      return fallbackValue;
    }
  }

  loadPersistedState() {
    if (!game?.settings) return;

    const savedRoster = this.parseJsonSetting(
      game.settings.get(MODULE_ID, SETTING_KEYS.ROSTER),
      []
    );
    this.rosterActorIds = Array.isArray(savedRoster)
      ? savedRoster.map((id) => String(id))
      : [];

    const savedQuickSkills = this.parseJsonSetting(
      game.settings.get(MODULE_ID, SETTING_KEYS.QUICK_SKILLS),
      {}
    );
    if (savedQuickSkills && typeof savedQuickSkills === "object") {
      this.quickSkillSelectionsByActor = Object.fromEntries(
        Object.entries(savedQuickSkills).map(([actorId, skillKeys]) => [
          String(actorId),
          new Set(Array.isArray(skillKeys) ? skillKeys.map((entry) => String(entry)) : [])
        ])
      );
    } else {
      this.quickSkillSelectionsByActor = {};
    }
    const savedFavoriteAttacks = this.parseJsonSetting(
      game.settings.get(MODULE_ID, SETTING_KEYS.COMBAT_FAVORITES),
      {}
    );
    if (savedFavoriteAttacks && typeof savedFavoriteAttacks === "object") {
      this.combatFavoriteAttackKeysByActor = Object.fromEntries(
        Object.entries(savedFavoriteAttacks).map(([actorId, attackKeys]) => [
          String(actorId),
          new Set(Array.isArray(attackKeys) ? attackKeys.map((entry) => String(entry)) : [])
        ])
      );
    } else {
      this.combatFavoriteAttackKeysByActor = {};
    }

    const savedFavoriteSpells = this.parseJsonSetting(
      game.settings.get(MODULE_ID, SETTING_KEYS.SPELL_FAVORITES),
      {}
    );
    if (savedFavoriteSpells && typeof savedFavoriteSpells === "object") {
      this.spellFavoriteKeysByActor = Object.fromEntries(
        Object.entries(savedFavoriteSpells).map(([actorId, spellKeys]) => [
          String(actorId),
          new Set(Array.isArray(spellKeys) ? spellKeys.map((entry) => String(entry)) : [])
        ])
      );
    } else {
      this.spellFavoriteKeysByActor = {};
    }
    const savedPinnedActions = this.parseJsonSetting(
      game.settings.get(MODULE_ID, SETTING_KEYS.PINNED_ACTIONS),
      {}
    );
    if (savedPinnedActions && typeof savedPinnedActions === "object") {
      this.pinnedActionsByActor = Object.fromEntries(
        Object.entries(savedPinnedActions).map(([actorId, pinned]) => [
          String(actorId),
          Array.isArray(pinned)
            ? pinned
                .filter((entry) => entry && typeof entry === "object")
                .map((entry) => ({ type: String(entry.type ?? ""), key: String(entry.key ?? "") }))
                .filter((entry) => entry.type && entry.key)
                .slice(0, 5)
            : []
        ])
      );
    } else {
      this.pinnedActionsByActor = {};
    }

    this.isMinimized = Boolean(game.settings.get(MODULE_ID, SETTING_KEYS.MINIMIZED));
    const savedRestorePillPosition = this.parseJsonSetting(
      game.settings.get(MODULE_ID, SETTING_KEYS.RESTORE_PILL_POSITION),
      null
    );
    this.restorePillPosition = this.normalizeRestorePillPosition(savedRestorePillPosition);

    const savedUiMode = String(game.settings.get(MODULE_ID, SETTING_KEYS.UI_MODE) || DEFAULT_UI_MODE);
    this.uiMode = VALID_UI_MODES.has(savedUiMode) ? savedUiMode : DEFAULT_UI_MODE;

    this._stateLoadedFromSettings = true;
  }

  serializeQuickSkillsState() {
    return Object.fromEntries(
      Object.entries(this.quickSkillSelectionsByActor).map(([actorId, skillSet]) => [
        actorId,
        Array.from(skillSet instanceof Set ? skillSet : new Set())
      ])
    );
  }

  persistRosterState() {
    if (!game?.settings) return;
    const roster = Array.from(new Set(this.rosterActorIds.map((id) => String(id))));
    game.settings.set(MODULE_ID, SETTING_KEYS.ROSTER, JSON.stringify(roster));
  }

  persistQuickSkillsState() {
    if (!game?.settings) return;
    const serialized = this.serializeQuickSkillsState();
    game.settings.set(MODULE_ID, SETTING_KEYS.QUICK_SKILLS, JSON.stringify(serialized));
  }

  persistFavoriteAttacksState() {
    if (!game?.settings) return;
    const serialized = this.serializeFavoriteAttacksState();
    game.settings.set(MODULE_ID, SETTING_KEYS.COMBAT_FAVORITES, JSON.stringify(serialized));
  }

  persistFavoriteSpellsState() {
    if (!game?.settings) return;
    const serialized = this.serializeFavoriteSpellsState();
    game.settings.set(MODULE_ID, SETTING_KEYS.SPELL_FAVORITES, JSON.stringify(serialized));
  }

  persistPinnedActionsState() {
    if (!game?.settings) return;
    const serialized = this.serializePinnedActionsState();
    game.settings.set(MODULE_ID, SETTING_KEYS.PINNED_ACTIONS, JSON.stringify(serialized));
  }

  persistMinimizedState() {
    if (!game?.settings) return;
    game.settings.set(MODULE_ID, SETTING_KEYS.MINIMIZED, Boolean(this.isMinimized));
  }

  normalizeRestorePillPosition(position) {
    if (!position || typeof position !== "object") return null;
    const top = Number(position.top);
    const left = Number(position.left);
    if (!Number.isFinite(top) || !Number.isFinite(left)) return null;
    return { top, left };
  }

  persistRestorePillPosition(position) {
    const normalized = this.normalizeRestorePillPosition(position);
    this.restorePillPosition = normalized;
    if (!game?.settings) return;
    game.settings.set(MODULE_ID, SETTING_KEYS.RESTORE_PILL_POSITION, JSON.stringify(normalized));
  }

  loadPdfPageRefMappings() {
    if (!game?.settings) return {};
    const mappings = game.settings.get(MODULE_ID, SETTING_KEYS.PDF_PAGE_REF_MAPPINGS);
    return mappings && typeof mappings === "object" ? mappings : {};
  }

  async savePdfPageRefMappings(mappings) {
    if (!game?.settings) return;
    const normalized = mappings && typeof mappings === "object" ? mappings : {};
    await game.settings.set(MODULE_ID, SETTING_KEYS.PDF_PAGE_REF_MAPPINGS, normalized);
  }

  getPdfPageRefMappings() {
    return this.loadPdfPageRefMappings();
  }

  getPdfPageRefMappingRows() {
    const mappings = this.getPdfPageRefMappings();
    return Object.entries(mappings)
      .map(([key, mapping]) => ({
        key,
        name: String(mapping?.name ?? this.getDefaultPdfMapName(key) ?? key),
        path: String(mapping?.path ?? ""),
        pathDisplay: String(mapping?.path ?? "").trim() || "No path set",
        pathDisplayTooltip: String(mapping?.path ?? "").trim() || "No path set",
        statusText: String(mapping?.path ?? "").trim() ? "Mapped" : "Missing path",
        offset: Number(mapping?.offset) || 0,
        testPage: this.getMappedPdfFinalPage(mapping, 1)
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  clearPdfMapDraft() {
    this.pdfMapDraft = { key: "", name: "", path: "", offset: 0 };
  }

  normalizePdfMapKey(key) {
    return normalizePdfMapKey(key);
  }

  getPageRefKeyNameMap() {
    return PAGE_REF_KEY_NAMES && typeof PAGE_REF_KEY_NAMES === "object" ? PAGE_REF_KEY_NAMES : {};
  }

  getPageRefKeyName(key) {
    const normalizedKey = this.normalizePdfMapKey(key);
    if (!normalizedKey) return "";

    const mappedName = getPageRefKeyNameFromMap(normalizedKey, this.getPageRefKeyNameMap());
    if (mappedName) return mappedName;

    const fallbackDefaults = {
      B: "Basic Set: Characters / Combined Basic Set",
      BX: "Basic Set: Campaigns",
      M: "Magic",
      MA: "Martial Arts",
      P: "Powers",
      HT: "High-Tech",
      LT: "Low-Tech",
      UT: "Ultra-Tech",
      "DF1:": "Dungeon Fantasy 1: Adventurers",
      "DF2:": "Dungeon Fantasy 2: Dungeons",
      DFS: "Dungeon Fantasy RPG: Spells"
    };

    const pyramidIssue3 = normalizedKey.match(/^PY(\d+):$/);
    if (pyramidIssue3) return `Pyramid Magazine, Issue 3-${pyramidIssue3[1]}`;
    const pyramidIssue4 = normalizedKey.match(/^PY4-(\d+):$/);
    if (pyramidIssue4) return `Pyramid Magazine, Issue 4-${pyramidIssue4[1]}`;

    return fallbackDefaults[normalizedKey] ?? "";
  }

  getDefaultPdfMapName(key) {
    return this.getPageRefKeyName(key);
  }

  parsePageReferences(refText) {
    return parsePageReferences(refText);
  }

  resolvePageRef(rawRef) {
    const first = this.parsePageReferences(rawRef)[0];
    if (!first) return null;
    const mapping = this.getPdfPageRefMappings()[first.key];
    if (!mapping) return null;
    const finalPage = this.getMappedPdfFinalPage(mapping, first.page);
    return { raw: first.raw, key: first.key, page: first.page, finalPage, mapping };
  }

  getMappedPdfFinalPage(mapping, page = 1) {
    return getMappedPdfFinalPage(mapping, page);
  }

  buildPdfPageUrl(path, finalPage) {
    return buildPdfPageUrl(path, finalPage);
  }

  openMappedPdfReference(key, page = 1, { notify = false, refLabel = null } = {}) {
    const normalizedKey = this.normalizePdfMapKey(key);
    const mapping = this.getPdfPageRefMappings()[normalizedKey];
    if (!mapping) {
      ui.notifications?.warn(`QuickDeck: No PDF mapping found for key "${normalizedKey}".`);
      return;
    }
    const basePage = Number(page);
    const safeBasePage = Number.isFinite(basePage) ? basePage : 1;
    const offset = Number(mapping?.offset ?? 0);
    const safeOffset = Number.isFinite(offset) ? offset : 0;
    const finalPage = this.getMappedPdfFinalPage(mapping, safeBasePage);
    const url = this.buildPdfPageUrl(mapping.path, finalPage);
    if (!url) {
      ui.notifications?.warn(`QuickDeck: Invalid PDF path for key "${normalizedKey}".`);
      return;
    }
    if (notify) {
      if (refLabel) ui.notifications?.info(`QuickDeck PDF: ${refLabel} → PDF page ${finalPage}.`);
      else ui.notifications?.info(`QuickDeck PDF: ${normalizedKey} page ${safeBasePage} + offset ${safeOffset} = PDF page ${finalPage}.`);
    }
    window.open(url, "_blank");
  }

  tryOpenMappedPdfReference(pageHint) {
    const refs = this.parsePageReferences(pageHint);
    if (!refs.length) return { opened: false, missingKey: null, hadParseableRefs: false };

    let firstMissingKey = null;
    for (const ref of refs) {
      const resolved = this.resolvePageRef(ref.raw);
      if (resolved?.mapping?.path) {
        this.openMappedPdfReference(resolved.key, resolved.page, { notify: true, refLabel: resolved.raw });
        return { opened: true, missingKey: null, hadParseableRefs: true };
      }
      if (!firstMissingKey && ref?.key) firstMissingKey = ref.key;
    }

    return { opened: false, missingKey: firstMissingKey, hadParseableRefs: true };
  }

  prefillPdfMapDraftForKey(key) {
    const normalized = this.normalizePdfMapKey(key);
    this.pdfMapDraft = {
      key: normalized,
      name: this.getDefaultPdfMapName(normalized) || normalized,
      path: "",
      offset: 0
    };
    this.openActionsDrawer("settings");
  }

  getQd18ShellWidth() {
    const configuredWidth = Number(this.position?.width ?? this.options?.width ?? 780);
    return Math.max(720, configuredWidth);
  }

  scheduleQd18WindowResize() {}

  setLeftPanelCollapsed(collapsed) {
    this.isLeftPanelCollapsed = Boolean(collapsed);
    this.render(false);
  }

  toggleLeftPanelCollapsed() { this.setLeftPanelCollapsed(!this.isLeftPanelCollapsed); }

  setRightPanelCollapsed(collapsed) {
    this.isRightPanelCollapsed = Boolean(collapsed);
    this.render(false);
  }

  toggleRightPanelCollapsed() { this.setRightPanelCollapsed(!this.isRightPanelCollapsed); }

  openDrawerFromCollapsedRail(drawer) {
    if (!drawer || !VALID_DRAWERS.has(drawer)) return;
    this.isRightPanelCollapsed = false;
    this.activeDrawer = drawer;
    this.render(false);
  }

  applyDefaultDrawerIfNeeded() {
    if (this.activeDrawer) return;
    const configuredDrawer = game.settings.get(MODULE_ID, SETTING_KEYS.DEFAULT_DRAWER);
    if (configuredDrawer === "none") return;
    const drawer = configuredDrawer === "quick-skills" ? "skills" : configuredDrawer;
    if (!VALID_DRAWERS.has(drawer)) return;
    this.activeDrawer = drawer;
  }

  sanitizePersistentState() {
    const allActors = this.getCombatActors();
    const validActorIds = new Set(allActors.map((actor) => actor.id));
    const originalRosterLength = this.rosterActorIds.length;
    this.rosterActorIds = this.rosterActorIds.filter((id) => validActorIds.has(id));

    let removedQuickSkills = false;
    let removedFavoriteAttacks = false;
    let removedFavoriteSpells = false;
    for (const actorId of Object.keys(this.quickSkillSelectionsByActor)) {
      if (!validActorIds.has(actorId)) {
        delete this.quickSkillSelectionsByActor[actorId];
        removedQuickSkills = true;
      }
    }

    for (const actorId of Object.keys(this.combatFavoriteAttackKeysByActor)) {
      if (!validActorIds.has(actorId)) {
        delete this.combatFavoriteAttackKeysByActor[actorId];
        removedFavoriteAttacks = true;
      }
    }

    for (const actorId of Object.keys(this.spellFavoriteKeysByActor)) {
      if (!validActorIds.has(actorId)) {
        delete this.spellFavoriteKeysByActor[actorId];
        removedFavoriteSpells = true;
      }
    }

    if (this.activeActorId && !this.rosterActorIds.includes(this.activeActorId)) {
      this.activeActorId = this.rosterActorIds[0] ?? null;
    }
    if (!this.activeActorId && this.rosterActorIds.length > 0) {
      this.activeActorId = this.rosterActorIds[0];
    }

    if (this.rosterActorIds.length !== originalRosterLength) {
      this.persistRosterState();
    }
    if (removedQuickSkills) {
      this.persistQuickSkillsState();
    }
    if (removedFavoriteAttacks) {
      this.persistFavoriteAttacksState();
    }
    if (removedFavoriteSpells) {
      this.persistFavoriteSpellsState();
    }
  }

  getVisibleCountBySearchText(entries, searchTerm) {
    const search = this.normalizeSearchText(searchTerm);
    if (!search) return entries.length;
    return entries.filter((entry) =>
      this.normalizeSearchText(entry?.searchText).includes(search)
    ).length;
  }

  normalizeSearchText(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  buildSearchText(parts = []) {
    return parts
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean)
      .join(" ");
  }

  updateCountText(html, countKey, value) {
    const target = html.find(`[data-count='${countKey}']`)[0];
    if (target) target.textContent = String(value);
  }


  formatSearchStatus(visible, label, hasQuery) {
    if (hasQuery && visible === 0) return `No matching ${label}`;
    return `${visible} ${label}`;
  }

  updateSearchUiState(html, section, visible, label, hasQuery) {
    const status = html.find(`[data-search-status='${section}']`)[0];
    if (status) status.textContent = this.formatSearchStatus(visible, label, hasQuery);
    const empty = html.find(`[data-search-empty='${section}']`)[0];
    if (empty) empty.hidden = !(hasQuery && visible === 0);
    const clearButton = html.find(`[data-action='clear-${section}-search']`)[0];
    if (clearButton) clearButton.hidden = !hasQuery;
  }

  applyDomFilterBySelector(html, rowSelector, searchTerm) {
    const normalizedSearch = this.normalizeSearchText(searchTerm);
    const rows = html.find(rowSelector).toArray();
    let visible = 0;

    for (const row of rows) {
      const searchableText = this.normalizeSearchText(row.dataset.searchText);
      const isVisible = !normalizedSearch || searchableText.includes(normalizedSearch);
      row.hidden = !isVisible;
      if (isVisible) visible += 1;
    }

    return { visible, total: rows.length };
  }

  applyAvailableActorFilter(html) {
    const { visible, total } = this.applyDomFilterBySelector(
      html,
      "[data-search-row='available']",
      this.availableSearch
    );
    const hasQuery = Boolean(this.normalizeSearchText(this.availableSearch));
    this.updateCountText(html, "available-visible", visible);
    this.updateCountText(html, "available-total", total);
    this.updateSearchUiState(html, "available", visible, "inactive characters", hasQuery);
  }

  applyCombatFilter(html) {
    const { visible, total } = this.applyDomFilterBySelector(
      html,
      "[data-search-row='combat']",
      this.combatSearch
    );
    this.updateCountText(html, "attacks-visible", visible);
    this.updateCountText(html, "attacks-total", total);
    this.updateSearchUiState(html, "combat", visible, "attacks", Boolean(this.normalizeSearchText(this.combatSearch)));
  }

  applySkillsFilter(html) {
    const { visible, total } = this.applyDomFilterBySelector(
      html,
      "[data-search-row='skills']",
      this.skillsSearch
    );
    this.updateCountText(html, "skills-visible", visible);
    this.updateCountText(html, "skills-total", total);
    this.updateSearchUiState(html, "skills", visible, "skills", Boolean(this.normalizeSearchText(this.skillsSearch)));
  }

  applyQuickSkillsFilter(html) {
    const { visible, total } = this.applyDomFilterBySelector(
      html,
      "[data-search-row='quick-skills']",
      this.quickSkillsSearch
    );
    this.updateCountText(html, "quick-skills-visible", visible);
    this.updateCountText(html, "quick-skills-total", total);
  }

  applySpellsFilter(html) {
    const { visible, total } = this.applyDomFilterBySelector(
      html,
      "[data-search-row='spells']",
      this.spellsSearch
    );
    this.updateCountText(html, "spells-visible", visible);
    this.updateCountText(html, "spells-total", total);
    this.updateSearchUiState(html, "spells", visible, "spells", Boolean(this.normalizeSearchText(this.spellsSearch)));
  }

  toDisplayValue(value) {
    return value === undefined || value === null || value === "" ? "—" : value;
  }

  getModifierBucketStatus() {
    const fallbackStatus = {
      available: false,
      totalText: "+0",
      stateLabel: "Native bucket unavailable",
      detailLabel: "Safe fallback",
      cssClass: "quickdeck-modifier-neutral quickdeck-modifier-unavailable"
    };

    let bucket = null;
    try {
      bucket = (globalThis.GURPS ?? globalThis.game?.GURPS)?.ModifierBucket;
    } catch (_error) {
      return fallbackStatus;
    }

    if (!bucket || typeof bucket !== "object") return fallbackStatus;

    try {
      const stack = bucket.modifierStack && typeof bucket.modifierStack === "object" ? bucket.modifierStack : null;
      const rawTotal = typeof bucket.currentSum === "function" ? bucket.currentSum() : stack?.currentSum;
      const numericTotal = Number(rawTotal);
      const nativeDisplay = typeof stack?.displaySum === "string" ? stack.displaySum.trim() : "";
      const totalText = Number.isFinite(numericTotal)
        ? `${numericTotal >= 0 ? "+" : ""}${numericTotal}`
        : nativeDisplay || "+0";
      const normalizedTotal = Number.isFinite(numericTotal) ? numericTotal : Number(totalText);
      const modifierList = Array.isArray(stack?.modifierList) ? stack.modifierList : [];
      const stackIsEmpty = typeof bucket.isEmpty === "function" ? bucket.isEmpty() : modifierList.length === 0;
      const detailLabel = stackIsEmpty
        ? "No modifiers queued"
        : `${modifierList.length} modifier${modifierList.length === 1 ? "" : "s"} queued`;
      const polarityClass =
        Number.isFinite(normalizedTotal) && normalizedTotal > 0
          ? "quickdeck-modifier-positive"
          : Number.isFinite(normalizedTotal) && normalizedTotal < 0
            ? "quickdeck-modifier-negative"
            : "quickdeck-modifier-neutral";

      return {
        available: true,
        totalText,
        stateLabel: "Native GURPS ModifierBucket",
        detailLabel,
        cssClass: polarityClass
      };
    } catch (_error) {
      return fallbackStatus;
    }
  }

  openNativeModifierBucket(actorId = null, event = null) {
    const gurps = globalThis.GURPS ?? globalThis.game?.GURPS;
    const bucket = gurps?.ModifierBucket;
    if (!bucket || typeof bucket !== "object") {
      ui.notifications?.warn("QuickDeck: Native GURPS ModifierBucket is unavailable.");
      return false;
    }

    const actor = actorId ? game.actors.get(actorId) : this.getActiveActor();
    if (actor && typeof gurps?.SetLastActor === "function") gurps.SetLastActor(actor);

    const focusNativeBucket = (renderedApp = null) => {
      this.focusNativeWindow(renderedApp);
      this.focusNativeWindow(bucket.editor);
      this.focusNativeWindow(bucket);
    };
    const scheduleFocusNativeBucket = (renderedApp = null) => {
      try {
        focusNativeBucket(renderedApp);
        setTimeout(() => {
          try {
            focusNativeBucket(renderedApp);
          } catch (_error) {
            // Focusing is best-effort; a focus failure should not imply the native editor failed to open.
          }
        }, 0);
      } catch (_error) {
        // Focusing is best-effort; a focus failure should not imply the native editor failed to open.
      }
    };

    return this.runWithNativeWindowFocusGuard(() => {
      try {
        if (typeof bucket.editor?.render === "function") {
          const renderedApp = bucket.editor.render(true);
          bucket.SHOWING = true;
          scheduleFocusNativeBucket(renderedApp);
          return true;
        }

        if (typeof bucket.render === "function") {
          const renderedApp = bucket.render(true);
          bucket.SHOWING = true;
          scheduleFocusNativeBucket(renderedApp);
          return true;
        }

        if (typeof bucket._onenter === "function") {
          bucket._onenter(event);
          bucket.SHOWING = true;
          scheduleFocusNativeBucket(bucket.editor);
          return true;
        }
      } catch (_error) {
        ui.notifications?.warn("QuickDeck: Could not open the native GURPS ModifierBucket UI.");
        return false;
      }

      ui.notifications?.warn("QuickDeck: Native GURPS ModifierBucket UI API is unavailable.");
      return false;
    }, "modifier-bucket");
  }

  parseDefenseScore(value) {
    if (value === undefined || value === null || value === "") return null;
    const match = String(value).match(/-?\d+/);
    return match ? Number(match[0]) : null;
  }

  getBestAttackDefense(attacks, key) {
    let firstValue = null;
    let bestValue = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const attack of attacks) {
      const value = attack?.[key];
      if (value === undefined || value === null || value === "") continue;

      if (firstValue === null) firstValue = value;

      const score = this.parseDefenseScore(value);
      if (score !== null && score > bestScore) {
        bestScore = score;
        bestValue = value;
      }
    }

    return bestValue ?? firstValue ?? null;
  }

  summarizeActorPath(actor, path) {
    const value = foundry.utils.getProperty(actor, path);
    const summary = {
      path,
      exists: value !== undefined && value !== null,
      kind: Array.isArray(value) ? "array" : typeof value
    };

    if (!summary.exists) return summary;

    if (Array.isArray(value)) {
      summary.length = value.length;
      const firstObject = value.find((item) => item && typeof item === "object");
      if (firstObject) summary.sampleKeys = Object.keys(firstObject).slice(0, 10);
      return summary;
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value);
      summary.keyCount = entries.length;
      const firstObjectEntry = entries.find(([, item]) => item && typeof item === "object");
      if (firstObjectEntry) {
        summary.sampleEntryKey = firstObjectEntry[0];
        summary.sampleKeys = Object.keys(firstObjectEntry[1]).slice(0, 10);
      }
    }

    return summary;
  }

  dumpActiveActorData() {
    const actor = this.getActiveActor();
    if (!actor) {
      console.log("gurps-quickdeck | No active actor selected for debug dump.");
      return;
    }

    const melee = this.extractAttacks(actor).filter((item) => item.type === "Melee").length;
    const ranged = this.extractAttacks(actor).filter((item) => item.type === "Ranged").length;
    const skills = this.extractSkills(actor).length;

    console.log("gurps-quickdeck | Active actor debug summary", {
      actor: actor.name,
      paths: [
        this.summarizeActorPath(actor, "system.melee"),
        this.summarizeActorPath(actor, "system.ranged"),
        this.summarizeActorPath(actor, "system.skills"),
        this.summarizeActorPath(actor, "system.ads")
      ],
      extractedCounts: {
        melee,
        ranged,
        skills
      }
    });
  }

  openActorSheet(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      console.warn("gurps-quickdeck | Could not open actor sheet, actor not found.", {
        actorId
      });
      return;
    }
    if (typeof actor.sheet?.render !== "function") {
      console.warn("gurps-quickdeck | Could not open actor sheet, actor sheet render missing.", {
        actorId
      });
      return;
    }

    return this.runWithNativeWindowFocusGuard(() => actor.sheet.render(true), "open-actor-sheet");
  }

  parseRollTarget(value) {
    if (value === undefined || value === null || value === "") return null;
    const match = String(value).match(/-?\d+/);
    return match ? Number(match[0]) : null;
  }

  escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async callIfFunction(context, path, ...args) {
    const fn = foundry.utils.getProperty(context, path);
    if (typeof fn !== "function") return false;
    try {
      await fn.call(context, ...args);
      return true;
    } catch (error) {
      console.warn(`gurps-quickdeck | Roll method failed at "${path}".`, error);
      return false;
    }
  }

  async callAnyMethod(candidates = []) {
    for (const candidate of candidates) {
      if (!candidate?.context || !candidate.path) continue;
      const succeeded = await this.callIfFunction(
        candidate.context,
        candidate.path,
        ...(candidate.args ?? [])
      );
      if (succeeded) return true;
    }
    return false;
  }

  getObjectMethodCandidates(context, args = []) {
    if (!context || typeof context !== "object") return [];

    const preferredPaths = [
      "roll",
      "rollSkill",
      "rollAttack",
      "rollWeapon",
      "rollMelee",
      "rollRanged",
      "performAction",
      "doRoll",
      "test",
      "action"
    ];

    const discoveredPaths = Object.keys(context)
      .filter((key) => typeof context[key] === "function")
      .filter((key) => /^roll|^perform|^test|^use|^do/i.test(key));

    return [...preferredPaths, ...discoveredPaths].map((path) => ({
      context,
      path,
      args
    }));
  }

  async tryGurpsRoll(actor, rollContext) {
    const numericTarget = this.parseRollTarget(rollContext.value);
    const skillRaw = rollContext.skill?.raw ?? null;
    const actionName = rollContext.skillName ?? rollContext.attackName ?? rollContext.defense;
    const actionPayload = {
      type: rollContext.type,
      actor,
      skill: rollContext.skill ?? null,
      attack: rollContext.attack ?? null,
      defense: rollContext.defense ?? null,
      name: actionName,
      target: numericTarget
    };

    const actorPaths = [
      "rollSkill",
      "rollSkillCheck",
      "rollSkillObject",
      "rollWeapon",
      "rollAttack",
      "rollDefense",
      "rollAttribute",
      "rollTest",
      "rollAgainst",
      "roll"
    ];
    const actorCandidates = actorPaths.flatMap((path) => [
      { context: actor, path, args: [rollContext, numericTarget] },
      { context: actor, path, args: [actionPayload] },
      { context: actor, path, args: [actionName, numericTarget] }
    ]);
    if (await this.callAnyMethod(actorCandidates)) return true;

    const gurpsSafePaths = [
      "performAction",
      "performItemAction",
      "handleRoll",
      "roll",
      "rollSkill",
      "rollAttack",
      "rollDefense",
      "doRoll"
    ];
    const gurpsCandidates = gurpsSafePaths.flatMap((path) => [
      { context: game.GURPS, path, args: [actionPayload] },
      { context: game.GURPS, path, args: [actor, rollContext, numericTarget] },
      { context: game.GURPS, path, args: [actor, actionName, numericTarget] }
    ]);
    if (await this.callAnyMethod(gurpsCandidates)) return true;

    if (rollContext.type === "defense") {
      const gurps = globalThis.GURPS ?? game.GURPS;
      const defense = String(rollContext.defense ?? "").trim();
      if (defense && typeof gurps?.executeOTF === "function") {
        const previousWindowIds = this._nativeWindowFocusLock?.previousWindowIds ?? this.getNativeWindowIds();
        if (!this._nativeWindowFocusLock) this.startNativeWindowFocusLock(previousWindowIds, "native-defense");
        try {
          if (typeof gurps?.SetLastActor === "function") gurps.SetLastActor(actor);
          await gurps.executeOTF(`[${defense}]`, false, null, actor);
          return true;
        } catch (error) {
          console.warn("gurps-quickdeck | Native GURPS defense OTF failed.", error);
        } finally {
          this.scheduleNativeWindowFocus(previousWindowIds);
          this.scheduleChatFocus();
        }
      }
      console.warn("gurps-quickdeck | No GURPS-native defense roll method found.", {
        actor: actor?.name,
        defense
      });
    }

    if (rollContext.type === "skill") {
      console.warn("gurps-quickdeck | No GURPS-native skill roll method found, using 3d6 fallback.", {
        actor: actor?.name,
        skill: rollContext.skillName,
        rawSkillKeys: skillRaw && typeof skillRaw === "object" ? Object.keys(skillRaw).slice(0, 20) : []
      });
    }
    return false;
  }

  async createFallbackRollChat(actor, rollContext, roll = null, target = null) {
    const speaker = ChatMessage.getSpeaker({ actor });
    const rawTargetLabel = rollContext.value ?? "—";
    const targetLabel = this.escapeHtml(rawTargetLabel);
    const actorName = this.escapeHtml(actor?.name ?? "Unknown");
    const skillName = this.escapeHtml(rollContext.skillName ?? "—");
    const attackName = this.escapeHtml(rollContext.attackName ?? "—");
    const defenseName = this.escapeHtml(rollContext.defense ?? "—");
    const rollTotal =
      roll?.total ?? (typeof roll?.result === "string" ? Number(roll.result) : null);
    const hasNumericTarget = Number.isFinite(target);
    const isSuccess = hasNumericTarget && Number.isFinite(rollTotal) ? rollTotal <= target : null;
    const margin =
      hasNumericTarget && Number.isFinite(rollTotal) ? Math.abs(target - rollTotal) : null;
    const outcomeText =
      isSuccess === null ? "No target value found" : isSuccess ? "Success" : "Failure";
    const marginText =
      margin === null
        ? "—"
        : isSuccess
          ? `Margin of Success: ${margin}`
          : `Margin of Failure: ${margin}`;
    const rollFormula = roll?.formula ?? "3d6";
    const rollDetail = roll?.result ?? "—";
    const chatTitle =
      rollContext.type === "skill"
        ? "QuickDeck Skill Roll"
        : rollContext.type === "defense"
          ? "QuickDeck Defense Roll"
          : "QuickDeck Attack Roll";
    const content = `
      <div class="gurps-quickdeck-roll-fallback">
        <h3>${chatTitle}</h3>
        <p><strong>Actor:</strong> ${actorName}</p>
        ${rollContext.type === "skill" ? `<p><strong>Skill:</strong> ${skillName}</p>` : ""}
        ${rollContext.type === "attack" ? `<p><strong>Attack:</strong> ${attackName}</p>` : ""}
        ${rollContext.type === "defense" ? `<p><strong>Defense:</strong> ${defenseName}</p>` : ""}
        <p><strong>Roll:</strong> ${this.escapeHtml(rollContext.label)}</p>
        <p><strong>Target:</strong> ${targetLabel}</p>
        <p><strong>3d6 Result:</strong> ${this.escapeHtml(`${rollFormula} = ${rollDetail} (Total ${rollTotal ?? "—"})`)}</p>
        <p><strong>Outcome:</strong> ${outcomeText}</p>
        <p><strong>${marginText}</strong></p>
        ${hasNumericTarget ? "" : "<p><em>No numeric target value found for comparison.</em></p>"}
      </div>
    `;
    const flavor = `${chatTitle}: ${this.escapeHtml(rollContext.label)}`;

    if (roll && typeof roll.toMessage === "function") {
      try {
        await roll.toMessage({ speaker, flavor, content });
        return;
      } catch (error) {
        console.warn("gurps-quickdeck | roll.toMessage failed, falling back to ChatMessage.create.", error);
      }
    }

    try {
      await ChatMessage.create({
        speaker,
        flavor,
        rolls: roll ? [roll] : [],
        content
      });
    } catch (error) {
      console.warn("gurps-quickdeck | ChatMessage.create failed for fallback roll.", error);
    }
  }

  async triggerNativeSheetRoll(actor, dataset, { event = null, targets = [], label = "roll", focusReason = null, scheduleChat = true } = {}) {
    const gurps = globalThis.GURPS ?? game.GURPS;
    if (!actor || !dataset?.otf) return false;

    if (typeof gurps?.SetLastActor === "function") gurps.SetLastActor(actor);
    const previousWindowIds = this.getNativeWindowIds();
    this.startNativeWindowFocusLock(previousWindowIds, focusReason ?? `native-sheet-${label}`);

    if (dataset.key && typeof gurps?.handleRoll === "function") {
      try {
        const fakeEvent = this.buildGurpsHandleRollEvent(dataset);
        await gurps.handleRoll(fakeEvent, actor, { targets });
        return true;
      } catch (error) {
        console.warn(`gurps-quickdeck | Native GURPS ${label} handleRoll failed, falling back to OTF.`, error);
      } finally {
        this.scheduleNativeWindowFocus(previousWindowIds);
        if (scheduleChat) this.scheduleChatFocus();
      }
    }

    try {
      if (typeof gurps?.executeOTF === "function") {
        await gurps.executeOTF(`[${dataset.otf}]`, false, event, actor);
        return true;
      }
    } catch (_error) {
      // Let the caller decide whether a non-native fallback is appropriate.
    } finally {
      this.scheduleNativeWindowFocus(previousWindowIds);
      if (scheduleChat) this.scheduleChatFocus();
    }

    return false;
  }



  getNativeWindowIds() {
    try {
      return new Set(Object.keys(ui?.windows ?? {}).map((id) => String(id)));
    } catch (_error) {
      return new Set();
    }
  }

  getWindowTitleText(app) {
    try {
      const element = app?.element?.[0] ?? app?.element;
      return element?.querySelector?.(".window-title")?.textContent ?? app?.element?.find?.(".window-title")?.text?.() ?? "";
    } catch (_error) {
      return "";
    }
  }

  isQuickDeckWindow(app) {
    const parts = [
      app?.id,
      app?.appId,
      app?.options?.id,
      app?.options?.title,
      app?.title,
      app?.constructor?.name,
      this.getWindowTitleText(app)
    ].map((part) => String(part ?? ""));
    return app === this || parts.some((part) => /quickdeck/i.test(part));
  }

  isLikelyNativeGurpsWindow(app) {
    const parts = [
      app?.id,
      app?.appId,
      app?.options?.id,
      app?.options?.title,
      app?.title,
      app?.constructor?.name,
      this.getWindowTitleText(app)
    ].map((part) => String(part ?? ""));
    if (this.isQuickDeckWindow(app)) return false;
    return parts.some((part) => NATIVE_GURPS_WINDOW_PATTERN.test(part));
  }

  isNativeWindowFocusCandidate(app, previousWindowIds = new Set()) {
    if (!app || this.isQuickDeckWindow(app)) return false;

    const appId = this.getNativeWindowId(app);
    if (appId && previousWindowIds?.has?.(appId)) {
      return this.isLikelyNativeGurpsWindow(app);
    }

    // During a QuickDeck-started native-window guard, newly registered Foundry windows
    // are the important case even when their title is only an actor name and does not
    // match a GURPS-specific pattern.
    return true;
  }

  getQuickDeckWindowElement() {
    try {
      return this._overlayRoot
        ?? document.getElementById("gurps-quickdeck-overlay")
        ?? this.element?.[0]
        ?? this.element
        ?? document.getElementById(this.options?.id ?? this.id);
    } catch (_error) {
      return null;
    }
  }

  getWindowZIndex(app) {
    try {
      const element = app?.element?.[0] ?? app?.element;
      const rawZIndex = element?.style?.zIndex || (element ? globalThis.getComputedStyle?.(element)?.zIndex : null);
      const zIndex = Number.parseInt(rawZIndex, 10);
      return Number.isFinite(zIndex) ? zIndex : null;
    } catch (_error) {
      return null;
    }
  }

  raiseNativeWindow(app) {
    try {
      if (typeof app?.bringToFront === "function") {
        app.bringToFront();
        return;
      }
      if (typeof app?.bringToTop === "function") {
        app.bringToTop();
      }
    } catch (_error) {
      // Native window focus is best-effort only.
    }
  }

  lowerQuickDeckBelow(app) {
    const quickDeckElement = this.getQuickDeckWindowElement();
    if (!quickDeckElement) return;

    let nativeZIndex = this.getWindowZIndex(app);
    if (!Number.isFinite(nativeZIndex)) {
      this.raiseNativeWindow(app);
      nativeZIndex = this.getWindowZIndex(app);
    }

    if (!Number.isFinite(nativeZIndex)) return;
    quickDeckElement.style.zIndex = String(Math.max(0, nativeZIndex - 1));
  }

  focusNativeWindow(app) {
    this.raiseNativeWindow(app);

    this.lowerQuickDeckBelow(app);

    try {
      const element = app?.element?.[0] ?? app?.element;
      element?.focus?.({ preventScroll: true });
    } catch (_error) {
      // Native window focus is best-effort only.
    }
  }

  getNativeWindowId(app) {
    const id = app?.appId ?? app?.id ?? app?.options?.id;
    return id === undefined || id === null ? null : String(id);
  }

  handleNativeWindowFocusLockRender(app) {
    const lock = this._nativeWindowFocusLock;
    if (!lock || Date.now() > lock.until) return;
    if (!this.isNativeWindowFocusCandidate(app, lock.previousWindowIds)) return;

    const appId = this.getNativeWindowId(app);
    this.focusNativeWindow(app);
    lock.focusedWindowIds.add(appId ?? app?.constructor?.name ?? "unknown");
  }

  startNativeWindowFocusLock(previousWindowIds = new Set(), reason = "native-window") {
    this.stopNativeWindowFocusLock({ force: true });

    const previousIds = previousWindowIds instanceof Set ? previousWindowIds : new Set();
    const quickDeckElement = this.getQuickDeckWindowElement();
    const until = Date.now() + NATIVE_WINDOW_FOCUS_GUARD_MS;
    const lock = {
      reason,
      previousWindowIds: new Set(previousIds),
      previousQuickDeckZIndex: this.getWindowZIndex(this),
      previousQuickDeckInlineZIndex: quickDeckElement?.style?.zIndex ?? "",
      focusedWindowIds: new Set(),
      persistWhileNativeOpen: ["primary-", "secondary-"].some((prefix) => String(reason ?? "").startsWith(prefix)),
      maxUntil: Date.now() + SECONDARY_NATIVE_WINDOW_FOCUS_MAX_MS,
      hooks: [],
      timeoutId: null,
      until
    };
    const onRender = (app) => this.handleNativeWindowFocusLockRender(app);

    for (const hookName of ["renderApplicationV1", "renderApplicationV2", "renderApplication"]) {
      try {
        const hookId = globalThis.Hooks?.on?.(hookName, onRender);
        lock.hooks.push([hookName, hookId, onRender]);
      } catch (_error) {
        // Native window focus locking is best-effort only.
      }
    }

    lock.timeoutId = globalThis.setTimeout?.(() => this.stopNativeWindowFocusLock(), NATIVE_WINDOW_FOCUS_GUARD_MS) ?? null;
    this._nativeWindowFocusLock = lock;

    this.bringNativeWindowsToFront(previousIds);
    return lock;
  }

  hasFocusedNativeWindowsOpen(lock) {
    if (!lock?.focusedWindowIds?.size) return false;
    const openWindowIds = this.getNativeWindowIds();
    for (const id of lock.focusedWindowIds) {
      if (openWindowIds.has(String(id))) return true;
    }
    return false;
  }

  shouldExtendNativeWindowFocusLock(lock) {
    return Boolean(
      lock?.persistWhileNativeOpen &&
      Date.now() < lock.maxUntil &&
      this.hasFocusedNativeWindowsOpen(lock)
    );
  }

  stopNativeWindowFocusLock({ force = false } = {}) {
    const lock = this._nativeWindowFocusLock;
    if (!lock) return;

    if (!force && this.shouldExtendNativeWindowFocusLock(lock)) {
      lock.until = Date.now() + NATIVE_WINDOW_FOCUS_GUARD_MS;
      lock.timeoutId = globalThis.setTimeout?.(() => this.stopNativeWindowFocusLock(), NATIVE_WINDOW_FOCUS_GUARD_MS) ?? null;
      this.bringNativeWindowsToFront(lock.previousWindowIds);
      return;
    }

    for (const [hookName, hookId, hookCallback] of lock.hooks ?? []) {
      try {
        globalThis.Hooks?.off?.(hookName, hookId);
      } catch (_error) {
        // Native window focus locking is best-effort only.
      }

      try {
        globalThis.Hooks?.off?.(hookName, hookCallback);
      } catch (_error) {
        // Native window focus locking is best-effort only.
      }
    }

    if (lock.timeoutId) {
      try {
        globalThis.clearTimeout?.(lock.timeoutId);
      } catch (_error) {
        // Native window focus locking is best-effort only.
      }
    }

    const quickDeckElement = this.getQuickDeckWindowElement();
    if (quickDeckElement?.style) quickDeckElement.style.zIndex = lock.previousQuickDeckInlineZIndex ?? "";

    this._nativeWindowFocusLock = null;
  }

  bringNativeWindowsToFront(previousWindowIds = new Set()) {
    const previousIds = previousWindowIds instanceof Set ? previousWindowIds : new Set();
    try {
      const windows = Object.values(ui?.windows ?? {});
      for (const app of windows) {
        if (!this.isNativeWindowFocusCandidate(app, previousIds)) continue;
        this.focusNativeWindow(app);
        const appId = this.getNativeWindowId(app);
        this._nativeWindowFocusLock?.focusedWindowIds?.add?.(appId ?? app?.constructor?.name ?? "unknown");
      }
    } catch (_error) {
      // Native window focus is best-effort only.
    }
  }

  scheduleNativeWindowFocus(previousWindowIds = new Set()) {
    const guardedWindowIds = previousWindowIds instanceof Set ? previousWindowIds : new Set();
    this._lastNativeWindowIds = new Set(guardedWindowIds);
    this._nativeWindowFocusUntil = Date.now() + NATIVE_WINDOW_FOCUS_GUARD_MS;

    if (this._nativeWindowFocusLock) {
      this._nativeWindowFocusLock.previousWindowIds = new Set(guardedWindowIds);
      this._nativeWindowFocusLock.until = this._nativeWindowFocusUntil;
      if (this._nativeWindowFocusLock.timeoutId) globalThis.clearTimeout?.(this._nativeWindowFocusLock.timeoutId);
      this._nativeWindowFocusLock.timeoutId = globalThis.setTimeout?.(
        () => this.stopNativeWindowFocusLock(),
        NATIVE_WINDOW_FOCUS_GUARD_MS
      ) ?? null;
    }

    try {
      this.bringNativeWindowsToFront(guardedWindowIds);
    } catch (_error) {
      // Native window focus is best-effort only.
    }

    for (const delay of NATIVE_WINDOW_FOCUS_DELAYS_MS) {
      try {
        globalThis.setTimeout?.(() => {
          try {
            this.bringNativeWindowsToFront(guardedWindowIds);
          } catch (_error) {
            // Native window focus is best-effort only.
          }
        }, delay);
      } catch (_error) {
        // Native window focus is best-effort only.
      }
    }
  }

  runWithNativeWindowFocusGuard(callback, reason = "native-window") {
    const previousWindowIds = this.getNativeWindowIds();
    this.startNativeWindowFocusLock(previousWindowIds, reason);

    try {
      const result = callback(previousWindowIds);
      if (result && typeof result.then === "function") {
        return result
          .then((value) => {
            this.focusNativeWindow(value);
            return value;
          })
          .finally(() => this.scheduleNativeWindowFocus(previousWindowIds));
      }
      this.focusNativeWindow(result);
      this.scheduleNativeWindowFocus(previousWindowIds);
      return result;
    } catch (error) {
      this.scheduleNativeWindowFocus(previousWindowIds);
      throw error;
    }
  }

  scheduleNativeWindowFocusAfterRender() {
    if (Date.now() > this._nativeWindowFocusUntil) return;
    this.scheduleNativeWindowFocus(this._lastNativeWindowIds);
  }

  changeSidebarTab(tabName) {
    try {
      const sidebar = ui?.sidebar;
      if (typeof sidebar?.changeTab === "function") {
        sidebar.changeTab(tabName);
        return;
      }
      if (typeof sidebar?.activateTab === "function") {
        sidebar.activateTab(tabName);
      }
    } catch (_error) {
      // Sidebar focus is best-effort only.
    }
  }

  focusChatSidebar() {
    try {
      ui?.sidebar?.expand?.();
      this.changeSidebarTab("chat");
      ui?.chat?.render?.(true);
      this.raiseNativeWindow(ui?.chat);
    } catch (_error) {
      // Chat focus is best-effort and must not block native GURPS handling.
    }
  }

  scheduleChatFocus() {
    try {
      ui?.sidebar?.expand?.();
      ui?.sidebar?.activateTab?.("chat");
      this.focusChatSidebar();
    } catch (error) {
      console.warn("gurps-quickdeck | Could not activate Chat sidebar tab.", error);
      ui.notifications?.warn("QuickDeck: Could not activate Chat sidebar.");
    }
  }

  extractKnownHitLocation(attack) {
    const raw = attack?.raw && typeof attack.raw === "object" ? attack.raw : attack;
    const value = this.getFirstDefinedValue(raw, [
      "hitlocation",
      "hitLocation",
      "hit_location",
      "location",
      "calc.hitlocation",
      "calc.hitLocation",
      "damage.hitlocation",
      "damage.hitLocation",
      "dmg.hitlocation",
      "dmg.hitLocation"
    ]);
    const normalized = String(value ?? "").trim().toLowerCase();
    return normalized || null;
  }

  buildNativeDamagePassThroughOptions(attack) {
    const hitlocation = this.extractKnownHitLocation(attack);
    return hitlocation ? { hitlocation } : {};
  }

  rememberPendingAttackContext(actor, attack, attackIndex, dataset = null) {
    if (!actor || !attack) return null;
    const otf = dataset?.otf ? `[${dataset.otf}]` : `[${this.getSheetAttackOtf(attack)}]`;
    const context = {
      actorId: actor.id,
      attackIndex,
      attackName: this.getSheetAttackDisplayName(attack) || attack.name || "Unnamed Attack",
      otf,
      damage: this.getAttackDamageString(attack),
      sourcePath: attack.sourcePath ?? null,
      rawAttackReference: attack.raw ?? null,
      hitlocation: this.extractKnownHitLocation(attack),
      nativeDamageOptions: this.buildNativeDamagePassThroughOptions(attack)
    };
    this.pendingAttackContext = context;
    return context;
  }

  async executeNativeAttack(actor, attack, attackIndex, event = null) {
    const gurps = globalThis.GURPS ?? game.GURPS;
    if (!actor || !attack) return false;
    if (typeof gurps?.SetLastActor === "function") gurps.SetLastActor(actor);

    const dataset = this.getSheetAttackDataset(attack);
    this.rememberPendingAttackContext(actor, attack, attackIndex, dataset);
    const targets = Array.from(game.user?.targets ?? []);
    const previousWindowIds = this.getNativeWindowIds();
    this.startNativeWindowFocusLock(previousWindowIds, "native-attack");
    let handled = false;

    try {
      if (dataset.key && dataset.otf && typeof gurps?.handleRoll === "function") {
        const fakeEvent = this.buildGurpsHandleRollEvent(dataset);
        await gurps.handleRoll(fakeEvent, actor, { targets });
        handled = true;
      }
    } catch (error) {
      console.warn("gurps-quickdeck | Attack handleRoll failed, falling back to OTF.", error);
    } finally {
      this.scheduleNativeWindowFocus(previousWindowIds);
    }

    try {
      if (!handled && dataset.otf && typeof gurps?.executeOTF === "function") {
        await gurps.executeOTF(`[${dataset.otf}]`, false, event, actor);
        handled = true;
      }
    } catch (error) {
      console.warn("gurps-quickdeck | Attack OTF failed, falling back if possible.", error);
    } finally {
      this.scheduleNativeWindowFocus(previousWindowIds);
    }

    this.scheduleChatFocus();
    this.scheduleNativeWindowFocus(previousWindowIds);
    return handled;
  }

  async repeatLastAttack(event = null) {
    const context = this.pendingAttackContext;
    if (!context?.actorId || !Number.isFinite(context.attackIndex)) {
      ui.notifications?.warn("QuickDeck: No attack has been selected yet.");
      return;
    }

    const actor = game.actors.get(context.actorId);
    if (!actor) {
      ui.notifications?.warn("QuickDeck: The last attack actor is unavailable.");
      return;
    }

    const attack = this.getDerivedActorData(actor).attacks[context.attackIndex];
    if (!attack) {
      ui.notifications?.warn("QuickDeck: The last attack is unavailable.");
      return;
    }

    const handled = await this.executeNativeAttack(actor, attack, context.attackIndex, event);
    if (handled) return;

    ui.notifications?.warn("QuickDeck: Could not route repeated attack through GURPS handleRoll/OTF. Falling back to QuickDeck roll.");
    await this.triggerCombatRoll(actor.id, {
      type: "attack",
      label: `Attack (${attack.name})`,
      value: attack.level,
      attackName: attack.name,
      attackType: attack.type,
      attack
    });
    this.scheduleChatFocus();
  }

  clearUserTargets() {
    try {
      const targets = Array.from(game?.user?.targets ?? []);
      for (const token of targets) {
        if (typeof token?.setTarget === "function") {
          token.setTarget(false, { user: game.user, releaseOthers: false, groupSelection: false });
        }
      }
      game?.user?.targets?.clear?.();
      ui.notifications?.info("QuickDeck: Targets cleared.");
    } catch (error) {
      console.warn("gurps-quickdeck | Failed to clear targets.", error);
      ui.notifications?.warn("QuickDeck: Could not clear targets.");
    }
    this.render(false);
  }

  activateNextRosterActor() {
    if (this.rosterActorIds.length === 0) return;
    const currentIndex = this.activeActorId ? this.rosterActorIds.indexOf(this.activeActorId) : -1;
    const nextIndex = (currentIndex + 1) % this.rosterActorIds.length;
    this.activeActorId = this.rosterActorIds[nextIndex] ?? null;
    this.keepActiveActorInCenterRosterWindow();
    this.persistRosterState();
    this.render(false);
  }


  async rollPrimaryAttribute(event = null) {
    const actor = this.getActiveActor();
    if (!actor?.id) {
      ui.notifications?.warn("QuickDeck: No active actor selected for primary roll.");
      return;
    }

    const option = this.getSelectedPrimaryRollOption();
    if (!option) {
      ui.notifications?.warn("QuickDeck: Choose a primary roll first.");
      return;
    }

    const handled = await this.triggerNativeSheetRoll(actor, { name: option.label, otf: option.otf }, {
      event,
      focusReason: `primary-${option.key}`,
      label: option.key,
      scheduleChat: false
    });
    if (!handled) {
      ui.notifications?.warn(`QuickDeck: Could not route ${option.label} through native GURPS rolling.`);
    }
  }

  async rollSecondaryAttribute(event = null) {
    const actor = this.getActiveActor();
    if (!actor?.id) {
      ui.notifications?.warn("QuickDeck: No active actor selected for secondary roll.");
      return;
    }

    const option = this.getSelectedSecondaryRollOption();
    if (!option) {
      ui.notifications?.warn("QuickDeck: Choose a secondary roll first.");
      return;
    }

    const handled = await this.triggerNativeSheetRoll(actor, { name: option.label, otf: option.otf }, {
      event,
      focusReason: `secondary-${option.key}`,
      label: option.key,
      scheduleChat: false
    });
    if (!handled) {
      ui.notifications?.warn(`QuickDeck: Could not route ${option.label} through native GURPS rolling.`);
    }
  }

  async triggerCombatRoll(actorId, rollContext) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    if (!rollContext?.label) return;

    const shouldGuardNativeRoll = ["attack", "defense", "skill"].includes(rollContext.type);
    const usedSystemRoll = shouldGuardNativeRoll
      ? await this.runWithNativeWindowFocusGuard(() => this.tryGurpsRoll(actor, rollContext), `combat-${rollContext.type}`)
      : await this.tryGurpsRoll(actor, rollContext);
    if (usedSystemRoll) return;

    if (rollContext.type === "defense") {
      ui.notifications?.warn(`QuickDeck: Could not find a native GURPS roll for ${rollContext.defense ?? "this defense"}.`);
      return;
    }

    const target = this.parseRollTarget(rollContext.value);
    let roll = null;
    try {
      roll = await new Roll("3d6").evaluate();
    } catch (error) {
      console.warn("gurps-quickdeck | 3d6 fallback evaluation failed.", error);
      const message = error instanceof Error ? error.message : String(error);
      try {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          flavor: "QuickDeck Roll Failed",
          content: `<div class="gurps-quickdeck-roll-fallback"><h3>QuickDeck Roll Failed</h3><p><strong>Actor:</strong> ${this.escapeHtml(actor?.name ?? "Unknown")}</p><p><strong>Roll:</strong> ${this.escapeHtml(rollContext.label)}</p><p>${this.escapeHtml(message)}</p></div>`
        });
      } catch (chatError) {
        console.warn("gurps-quickdeck | Failed to create roll-failed chat card.", chatError);
      }
      return;
    }

    await this.createFallbackRollChat(actor, rollContext, roll, target);
  }

  getAttackDamageString(attack) {
    if (!attack || typeof attack !== "object") return null;

    const directDamage = this.getFirstDefinedValue(attack, [
      "damage",
      "dmg",
      "calc.damage",
      "calc.dmg",
      "damage.formula",
      "dmg.formula"
    ]);
    if (directDamage !== null) return String(directDamage);

    const rawDamage = this.getFirstDefinedValue(attack.raw, [
      "damage",
      "dmg",
      "calc.damage",
      "calc.dmg",
      "damage.formula",
      "dmg.formula"
    ]);
    if (rawDamage !== null) return String(rawDamage);

    return null;
  }

  getAttackDamageFormula(attack) {
    const raw = this.getAttackDamageString(attack);
    if (!raw) return null;
    const trimmed = String(raw).trim();
    return trimmed.length ? trimmed : null;
  }

  parseGurpsDamageString(rawDamage) {
    if (rawDamage === null || rawDamage === undefined) return null;
    const text = String(rawDamage).trim();
    if (!text.length) return null;
    const normalized = text.replace(/^\[|\]$/g, "").trim();
    const match = normalized.match(/^(?<formula>sw(?:ing)?|thr(?:ust)?|(?:\d+)?d(?:\d+)?(?:[+\-]\d+)?)(?:\s*(?:[x×*]\s*\d+(?:\.\d+)?)?)?(?:\s*(?<type>[a-zA-Z_][a-zA-Z0-9_+\-]*))?/i);
    if (!match?.groups?.formula) return null;
    const formula = match.groups.formula.trim();
    const damageType = (match.groups.type ?? "").trim().toLowerCase() || null;
    const isDerived = /^(sw|swing|thr|thrust)$/i.test(formula);
    return { formula, damageType, isDerived, original: text };
  }

  buildDamageOtfFromDamageText(damageText) {
    const parsed = this.parseGurpsDamageString(damageText);
    if (!parsed) return null;
    const suffix = parsed.damageType ? ` ${parsed.damageType}` : "";
    return `[${parsed.formula}${suffix}]`;
  }

  async rollParsedDamageFormula(actor, attack, parsed) {
    if (!actor || !parsed?.formula) return false;
    const attackName = attack?.name ?? "Attack";
    if (parsed.isDerived) {
      const derivedOtf = this.buildDamageOtfFromDamageText(parsed.original ?? parsed.formula);
      const gurps = globalThis.GURPS ?? game.GURPS;
      if (derivedOtf && typeof gurps?.executeOTF === "function") {
        try {
          await gurps.executeOTF(derivedOtf, false, actor);
          return true;
        } catch (error) {
          console.warn("gurps-quickdeck | Derived damage OTF failed.", { derivedOtf, error });
          ui.notifications?.warn(`QuickDeck: Could not route derived damage for ${attackName}.`);
          return false;
        }
      }
      ui.notifications?.warn(`QuickDeck: Could not route derived damage for ${attackName}.`);
      return false;
    }

    try {
      const roll = await new Roll(parsed.formula).evaluate();
      const damageLabel = parsed.damageType ? ` ${parsed.damageType}` : "";
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: `QuickDeck Damage (${attackName}${damageLabel})`
      });
      return true;
    } catch (error) {
      console.warn("gurps-quickdeck | Damage formula fallback roll failed.", { parsed, error });
      return false;
    }
  }

  async triggerDamageRoll(actorId, attackIndex, event = null) {
    if (!actorId || !Number.isFinite(attackIndex)) return;
    const actor = game.actors.get(actorId);
    if (!actor) return;

    const attack = this.getDerivedActorData(actor).attacks[attackIndex];
    if (!attack) return;

    if (event) event.preventDefault?.();
    const dataset = this.getSheetAttackDataset(attack);
    this.rememberPendingAttackContext(actor, attack, attackIndex, dataset ?? {});
    this.scheduleChatFocus();

    const formula = this.getAttackDamageFormula(attack);
    if (!formula) {
      ui.notifications?.warn(`QuickDeck: Could not find a rollable damage formula for ${attack?.name ?? "this attack"}.`);
      return;
    }

    const parsed = this.parseGurpsDamageString(formula);
    if (parsed && await this.rollParsedDamageFormula(actor, attack, parsed)) return;

    const damageOtf = this.buildDamageOtfFromDamageText(formula);
    const gurps = globalThis.GURPS ?? game.GURPS;
    if (damageOtf && typeof gurps?.executeOTF === "function") {
      try {
        await gurps.executeOTF(damageOtf, false, actor);
        return;
      } catch (error) {
        console.warn("gurps-quickdeck | Damage OTF execution failed.", { damageOtf, error });
      }
    }

    ui.notifications?.warn(`QuickDeck: Could not find a rollable damage formula for ${attack?.name ?? "this attack"}.`);
  }

  async waitForTargetSelection({ timeoutMs = 30000 } = {}) {
    return new Promise((resolve) => {
      let resolved = false;
      const complete = (token = null) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(token);
      };
      const onTargetToken = (user, token, targeted) => {
        if (!targeted) return;
        if (user?.id !== game.user?.id) return;
        complete(token ?? null);
      };
      const onControlToken = (token, controlled) => {
        if (!controlled) return;
        complete(token ?? null);
      };
      const timeoutId = window.setTimeout(() => complete(null), Math.max(2500, timeoutMs));
      const cleanup = () => {
        Hooks.off("targetToken", onTargetToken);
        Hooks.off("controlToken", onControlToken);
        window.clearTimeout(timeoutId);
      };
      Hooks.on("targetToken", onTargetToken);
      Hooks.on("controlToken", onControlToken);
    });
  }

  async runGuidedAttack(actor, attack, attackIndex, setup = {}) {
    const gurps = globalThis.GURPS ?? game.GURPS;
    if (typeof gurps?.SetLastActor === "function") gurps.SetLastActor(actor);
    const modifiers = [];
    const addModifier = (value, label) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric === 0) return;
      modifiers.push({ value: numeric, label });
      if (gurps?.ModifierBucket?.addModifier) gurps.ModifierBucket.addModifier(numeric, label);
    };
    addModifier(setup.coverMod, `QuickDeck Cover (${setup.coverLabel || "custom"})`);
    addModifier(setup.postureMod, `QuickDeck Posture (${setup.postureLabel || "custom"})`);
    addModifier(setup.rangeSpeedMod, `QuickDeck Range/Speed (${setup.rangeSpeedLabel || "custom"})`);
    addModifier(setup.customMod, `QuickDeck Custom (${setup.customLabel || "modifier"})`);
    if (setup.hitLocation) addModifier(setup.hitLocationMod, `QuickDeck Hit Location (${setup.hitLocation})`);

    const wasMinimized = this.isMinimized;
    if (!wasMinimized) this.minimizeQuickDeckWindow();
    ui.notifications?.info("QuickDeck: Target a token (T) or click-select one.");
    const token = await this.waitForTargetSelection();
    if (!wasMinimized) this.restoreQuickDeckWindow();
    if (!token) {
      ui.notifications?.warn("QuickDeck: No target selected. Attack cancelled.");
      return;
    }
    try {
      if (game.user && token?.setTarget) token.setTarget(true, { user: game.user, releaseOthers: true, groupSelection: false });
      else if (game.user?.targets instanceof Set) {
        game.user.targets.clear();
        game.user.targets.add(token);
      }
    } catch (error) {
      console.warn("gurps-quickdeck | Failed to set selected token as target.", error);
    }

    const otfName = String(attack?.name ?? "").trim().replaceAll(" ", "*");
    let usedOtF = false;
    try {
      if (otfName && typeof gurps?.executeOTF === "function") {
        await gurps.executeOTF(`[A:${otfName}]`);
        usedOtF = true;
      }
    } catch (error) {
      console.warn("gurps-quickdeck | Guided attack OTF failed, falling back.", error);
    }
    if (!usedOtF) {
      await this.triggerCombatRoll(actor.id, {
        type: "attack",
        label: `Attack (${attack.name})`,
        value: attack.level,
        attackName: attack.name,
        attackType: attack.type,
        attack
      });
    }

    const lastRoll = gurps?.lastTargetedRoll ?? (gurps?.lastTargetedRolls && actor?.id ? gurps.lastTargetedRolls[actor.id] : null);
    const hasRollResult = Boolean(lastRoll);
    const success = Boolean(hasRollResult && (lastRoll.isCritSuccess || (!lastRoll.failure && !lastRoll.isCritFailure)));
    const outcomeLabel = !hasRollResult
      ? "Unknown (no GURPS roll result)"
      : lastRoll?.isCritSuccess
        ? "Critical Success"
        : lastRoll?.isCritFailure
          ? "Critical Failure"
          : lastRoll?.failure
            ? "Failure"
            : "Success";
    ui.notifications?.info(`QuickDeck: Attack outcome: ${outcomeLabel}.`);
    this._pendingAttackGuidance = success ? { actorId: actor.id, attackIndex } : null;
    this.render(false);
  }

  bringReferenceAppToFrontSoon() {
    const app = this.referenceApp;
    if (!app || !app.rendered) return;

    const bring = () => app.bringReferenceToFront?.() || app.bringToTop?.();

    requestAnimationFrame(bring);
    setTimeout(bring, 75);
    setTimeout(bring, 200);
  }

  openReferenceEntry(referenceData = {}) {
    try {
      const existing = this.referenceApp;
      if (existing && typeof existing.close === "function") {
        existing.close({ force: true });
      }

      const app = new QuickDeckReferenceApp(referenceData);
      this.referenceApp = app;

      const baseLeft = Number(this.position?.left ?? this._position?.left ?? 0);
      const baseTop = Number(this.position?.top ?? this._position?.top ?? 0);
      const width = 460;
      const height = 520;
      const left = Math.max(20, Math.min(window.innerWidth - width, baseLeft + 40));
      const top = Math.max(20, Math.min(window.innerHeight - height, baseTop + 40));

      app.render(true, { focus: true, left, top, width, height });

      setTimeout(() => {
        app.bringToTop?.();
        app.bringToFront?.();
        app.element?.[0]?.focus?.();
      }, 0);

      app.once?.("close", () => {
        if (this.referenceApp === app) this.referenceApp = null;
      });
    } catch (error) {
      console.warn("gurps-quickdeck | Failed to open QuickDeck reference window.", error);
      ui.notifications?.warn("QuickDeck: Could not open reference window.");
    }
  }

  openReferenceIndexManager() {
    openReferenceIndexManager();
  }

  getCombatRosterState() {
    const combat = game?.combat;
    if (!combat) {
      return {
        combatantByActorId: new Map(),
        currentCombatantId: null
      };
    }

    const combatants = Array.from(combat.combatants ?? []);
    const combatantByActorId = new Map();
    for (const combatant of combatants) {
      const actorId = combatant?.actor?.id ?? combatant?.actorId ?? null;
      if (!actorId) continue;
      combatantByActorId.set(actorId, combatant);
    }

    const currentCombatantId =
      combat?.current?.combatantId ?? combat?.combatant?.id ?? null;

    return {
      combatantByActorId,
      currentCombatantId
    };
  }

  getCombatBadgeText(combatant) {
    if (!combatant) return null;

    const initiative = combatant?.initiative;
    if (initiative !== undefined && initiative !== null && initiative !== "") {
      return `Init ${initiative}`;
    }

    const turnIndex = combatant?.turn ?? combatant?.sort ?? null;
    if (turnIndex === undefined || turnIndex === null || turnIndex === "") return null;
    if (typeof turnIndex === "number" && Number.isFinite(turnIndex)) {
      return `Turn ${turnIndex + 1}`;
    }
    return `Turn ${turnIndex}`;
  }

  getResourceValue(actor, resource) {
    const normalized = String(resource ?? "").toUpperCase();
    if (!["HP", "FP"].includes(normalized)) return null;

    return this.getFirstDefinedValue(actor, [
      `system.${normalized}.value`,
      `data.data.${normalized}.value`
    ]);
  }

  getResourceMax(actor, resource) {
    const normalized = String(resource ?? "").toUpperCase();
    if (!["HP", "FP"].includes(normalized)) return null;

    return this.getFirstDefinedValue(actor, [
      `system.${normalized}.max`,
      `system.${normalized}.maxvalue`,
      `system.${normalized}.maxValue`,
      `system.${normalized}.value`,
      `data.data.${normalized}.max`,
      `data.data.${normalized}.maxvalue`,
      `data.data.${normalized}.maxValue`,
      `data.data.${normalized}.value`
    ]);
  }


  getResourcePercent(current, max) {
    const currentNumber = Number(current);
    const maxNumber = Number(max);
    if (!Number.isFinite(currentNumber) || !Number.isFinite(maxNumber) || maxNumber <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((currentNumber / maxNumber) * 100)));
  }

  getResourceSummary(actor, resource) {
    const current = this.getResourceValue(actor, resource);
    const max = this.getResourceMax(actor, resource) ?? current;
    return {
      value: current,
      max,
      display: this.toDisplayValue(current),
      maxDisplay: this.toDisplayValue(max),
      percent: this.getResourcePercent(current, max)
    };
  }

  getResourceUpdatePath(resource) {
    const normalized = String(resource ?? "").toUpperCase();
    if (!["HP", "FP"].includes(normalized)) return null;
    return `system.${normalized}.value`;
  }

  parseResourceNumber(rawValue) {
    if (typeof rawValue === "number") return Number.isFinite(rawValue) ? rawValue : null;
    const trimmed = String(rawValue ?? "").trim();
    if (!trimmed || trimmed === "—") return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async adjustActorResource(actorId, resource, delta) {
    const actor = actorId ? game.actors.get(actorId) : null;
    const path = this.getResourceUpdatePath(resource);
    const numericDelta = Number(delta);
    if (!actor || !path || !Number.isFinite(numericDelta)) return;

    const current = this.parseResourceNumber(this.getResourceValue(actor, resource));
    if (!Number.isFinite(current)) {
      ui.notifications?.warn(`QuickDeck: ${resource} is not a numeric value on ${actor.name}.`);
      return;
    }

    await this.setActorResourceValue(actor, resource, current + numericDelta);
  }

  async setActorResourceValue(actorOrId, resource, value) {
    const actor = typeof actorOrId === "string" ? game.actors.get(actorOrId) : actorOrId;
    const path = this.getResourceUpdatePath(resource);
    const numericValue = this.parseResourceNumber(value);
    if (!actor || !path) return;
    if (!Number.isFinite(numericValue)) {
      ui.notifications?.warn(`QuickDeck: Enter a numeric ${resource} value.`);
      return;
    }

    try {
      await actor.update({ [path]: numericValue });
      this.invalidateDerivedActorData(actor.id);
      this.render(false);
    } catch (error) {
      console.warn(`gurps-quickdeck | Failed to update ${resource}.`, error);
      ui.notifications?.warn(`QuickDeck: Could not update ${resource} for ${actor.name}.`);
    }
  }

  parseDropPayload(rawText) {
    if (!rawText || typeof rawText !== "string") return null;
    try {
      return JSON.parse(rawText);
    } catch (_error) {
      return null;
    }
  }

  async resolveActorFromDropData(event) {
    const transfer = event?.dataTransfer;
    if (!transfer) {
      console.warn("gurps-quickdeck | Ignored invalid drop: no dataTransfer.");
      return null;
    }

    const rawText = transfer.getData("text/plain");
    const parsedPayload = this.parseDropPayload(rawText);
    const payload = parsedPayload && typeof parsedPayload === "object" ? parsedPayload : null;

    const rawLooksLikeActorUuid = typeof rawText === "string" && /Actor\./.test(rawText);
    const type = payload?.type ?? payload?.documentName ?? payload?.data?.type ?? null;
    const documentName =
      payload?.documentName ?? payload?.data?.documentName ?? payload?.data?.documentType ?? type;
    const uuid = payload?.uuid ?? payload?.data?.uuid ?? payload?.actorUuid ?? null;
    const actorId = payload?.id ?? payload?.actorId ?? payload?.data?._id ?? payload?.data?.id ?? null;

    const isActorPayload = type === "Actor" || documentName === "Actor" || rawLooksLikeActorUuid;
    if (!isActorPayload) {
      console.warn("gurps-quickdeck | Ignored non-Actor drop payload.", payload ?? rawText);
      return null;
    }

    if (typeof fromUuid === "function" && (uuid || rawLooksLikeActorUuid)) {
      try {
        const uuidValue = uuid ?? rawText;
        const resolvedDocument = await fromUuid(uuidValue);
        if (resolvedDocument?.documentName === "Actor" || resolvedDocument instanceof Actor) {
          return resolvedDocument;
        }
        console.warn("gurps-quickdeck | Ignored drop: UUID did not resolve to Actor.", {
          uuid: uuidValue
        });
      } catch (error) {
        console.warn("gurps-quickdeck | Failed to resolve dropped UUID.", error);
      }
    }

    if (actorId) {
      const actor = game.actors.get(actorId);
      if (actor) return actor;
    }

    console.warn("gurps-quickdeck | Ignored invalid Actor drop payload.", payload ?? rawText);
    return null;
  }

  getDropTokenPosition(scene) {
    let x = Number(scene?.dimensions?.width) / 2 || 0;
    let y = Number(scene?.dimensions?.height) / 2 || 0;

    const stage = canvas?.stage;
    const scale = stage?.scale;
    const pivot = stage?.pivot;
    const screen = canvas?.app?.renderer?.screen;
    if (
      pivot &&
      scale &&
      Number.isFinite(pivot.x) &&
      Number.isFinite(pivot.y) &&
      Number.isFinite(scale.x) &&
      Number.isFinite(scale.y) &&
      scale.x !== 0 &&
      scale.y !== 0 &&
      screen
    ) {
      x = pivot.x + screen.width / (2 * scale.x);
      y = pivot.y + screen.height / (2 * scale.y);
    }

    if (typeof canvas?.grid?.getSnappedPosition === "function") {
      const snapped = canvas.grid.getSnappedPosition(x, y, 1);
      if (snapped && Number.isFinite(snapped.x) && Number.isFinite(snapped.y)) {
        x = snapped.x;
        y = snapped.y;
      }
    }

    return { x, y };
  }

  getClientPointFromEvent(event) {
    const sourceEvent =
      event?.data?.originalEvent ??
      event?.originalEvent ??
      event;
    const clientX = Number(sourceEvent?.clientX);
    const clientY = Number(sourceEvent?.clientY);
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    return { clientX, clientY };
  }

  convertClientToCanvasPosition(clientX, clientY) {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;

    if (typeof canvas?.canvasCoordinatesFromClient === "function") {
      const converted = canvas.canvasCoordinatesFromClient(clientX, clientY);
      if (converted && Number.isFinite(converted.x) && Number.isFinite(converted.y)) {
        return { x: converted.x, y: converted.y };
      }
    }

    const view = canvas?.app?.view;
    const stage = canvas?.stage;
    const inverseFn = stage?.worldTransform?.applyInverse;
    if (!view || typeof view.getBoundingClientRect !== "function" || typeof inverseFn !== "function") {
      return null;
    }

    const rect = view.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const point = new PIXI.Point(localX, localY);
    const worldPoint = inverseFn.call(stage.worldTransform, point);
    if (!worldPoint || !Number.isFinite(worldPoint.x) || !Number.isFinite(worldPoint.y)) return null;
    return { x: worldPoint.x, y: worldPoint.y };
  }

  getCanvasPointFromEvent(event) {
    const clientPoint = this.getClientPointFromEvent(event);
    if (!clientPoint) return null;
    return this.convertClientToCanvasPosition(clientPoint.clientX, clientPoint.clientY);
  }

  getSnappedCanvasPosition(point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
    if (typeof canvas?.grid?.getSnappedPosition !== "function") return point;
    const snapped = canvas.grid.getSnappedPosition(point.x, point.y, 1);
    if (!snapped || !Number.isFinite(snapped.x) || !Number.isFinite(snapped.y)) return point;
    return snapped;
  }


  createTokenDropReticle(view) {
    this.destroyTokenDropReticle();

    const reticle = document.createElement("div");
    reticle.className = "quickdeck-token-placement-reticle";
    reticle.setAttribute("aria-hidden", "true");
    reticle.innerHTML = '<span class="quickdeck-token-placement-reticle-ring"></span><span class="quickdeck-token-placement-reticle-crosshair"></span><span class="quickdeck-token-placement-reticle-core"></span>';
    document.body.appendChild(reticle);
    this._tokenDropReticleElement = reticle;

    if (view?.style) {
      this._tokenDropCursorTarget = view;
      this._tokenDropPreviousCursor = view.style.cursor ?? "";
      view.style.cursor = "crosshair";
    }

    const rect = view?.getBoundingClientRect?.();
    const clientX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const clientY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    this.updateTokenDropReticle(clientX, clientY);
  }

  updateTokenDropReticle(clientX, clientY) {
    const reticle = this._tokenDropReticleElement;
    if (!reticle || !Number.isFinite(Number(clientX)) || !Number.isFinite(Number(clientY))) return;
    reticle.style.transform = `translate3d(${Number(clientX)}px, ${Number(clientY)}px, 0) translate(-50%, -50%)`;
  }

  destroyTokenDropReticle() {
    if (this._tokenDropCursorTarget?.style) {
      this._tokenDropCursorTarget.style.cursor = this._tokenDropPreviousCursor ?? "";
    }
    this._tokenDropCursorTarget = null;
    this._tokenDropPreviousCursor = null;

    if (this._tokenDropReticleElement) {
      this._tokenDropReticleElement.remove();
      this._tokenDropReticleElement = null;
    }
  }

  async dropActorToken(actorId, requestedPosition = null) {
    const actor = game.actors.get(actorId);
    if (!actor) return;

    const scene = canvas?.scene ?? game?.scenes?.current ?? null;
    if (!scene || !canvas?.ready) {
      ui.notifications?.warn("QuickDeck: No active scene/canvas ready for dropping a token.");
      return;
    }

    if (!game?.user?.isGM && typeof scene.canUserModify === "function" && game?.user) {
      const canModify = scene.canUserModify(game.user, "update");
      if (!canModify) {
        ui.notifications?.warn("QuickDeck: You do not have permission to create tokens in this scene.");
        return;
      }
    }

    const prototypeToken = actor.prototypeToken?.toObject?.() ?? {};
    const tokenData = foundry.utils.mergeObject(prototypeToken, {
      actorId: actor.id,
      name: actor.name,
      img: actor.prototypeToken?.texture?.src ?? actor.img
    });
    tokenData.actorId = actor.id;
    tokenData.texture = tokenData.texture || {};
    tokenData.texture.src = actor.prototypeToken?.texture?.src || tokenData.texture.src || actor.img;
    tokenData.img = tokenData.texture.src || tokenData.img || actor.img;
    const snappedRequestedPosition = this.getSnappedCanvasPosition(requestedPosition);
    const fallbackPosition = this.getDropTokenPosition(scene);
    const { x, y } = snappedRequestedPosition ?? fallbackPosition;
    tokenData.x = x;
    tokenData.y = y;

    try {
      await scene.createEmbeddedDocuments("Token", [tokenData]);
    } catch (error) {
      console.warn("gurps-quickdeck | Failed to create token document.", error);
      ui.notifications?.warn("QuickDeck: Could not create token in this scene.");
    }
  }

  cancelTokenDrop({ notify = false, render = true } = {}) {
    const hadPendingDrop = Boolean(this.pendingTokenDropActorId || this._pendingTokenDropCleanup);
    if (typeof this._pendingTokenDropCleanup === "function") {
      try {
        this._pendingTokenDropCleanup();
      } catch (error) {
        console.warn("gurps-quickdeck | Failed during token-drop cleanup.", error);
      }
    }
    this._pendingTokenDropCleanup = null;
    this.pendingTokenDropActorId = null;
    this._tokenDropSceneId = null;
    this.destroyTokenDropReticle();
    if (notify) ui.notifications?.info("QuickDeck: Token placement cancelled.");
    if (render && hadPendingDrop) this.render(false);
  }

  armTokenDrop(actorId) {
    if (!actorId || !game.actors.has(actorId)) return;

    if (this.pendingTokenDropActorId === actorId) {
      this.cancelTokenDrop({ notify: true });
      return;
    }

    this.cancelTokenDrop({ render: false });

    const scene = canvas?.scene ?? game?.scenes?.current ?? null;
    if (!scene || !canvas?.ready) {
      ui.notifications?.warn("QuickDeck: No active scene/canvas ready for dropping a token.");
      return;
    }

    if (!game?.user?.isGM && typeof scene.canUserModify === "function" && game?.user) {
      const canModify = scene.canUserModify(game.user, "update");
      if (!canModify) {
        ui.notifications?.warn("QuickDeck: You do not have permission to create tokens in this scene.");
        return;
      }
    }

    const view = canvas?.app?.view;
    if (!view || typeof view.addEventListener !== "function") {
      ui.notifications?.warn("QuickDeck: Canvas interaction is unavailable in this environment.");
      return;
    }

    this.pendingTokenDropActorId = actorId;
    this._tokenDropSceneId = scene.id ?? null;
    this.createTokenDropReticle(view);
    ui.notifications?.info("QuickDeck: Click the canvas to place token. Right-click or press Escape to cancel.");

    if (!this.isMinimized) {
      this.isMinimized = true;
      this.persistMinimizedState();
      this.syncMinimizedPresentation();
    }

    const abortController = typeof AbortController === "function" ? new AbortController() : null;
    let cleanedUp = false;
    const cleanupListeners = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (abortController) abortController.abort();
      else {
        view.removeEventListener("pointerdown", onPointerDown, true);
        view.removeEventListener("pointermove", onPointerMove, true);
        view.removeEventListener("contextmenu", onContextMenu, true);
        window.removeEventListener("keydown", onKeyDown, true);
      }
      Hooks.off("canvasReady", onCanvasReady);
    };

    const onPointerMove = (event) => {
      const point = this.getClientPointFromEvent(event);
      if (!point) return;
      this.updateTokenDropReticle(point.clientX, point.clientY);
    };

    const onContextMenu = (event) => {
      if (!this.pendingTokenDropActorId) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const onPointerDown = async (event) => {
      if (!this.pendingTokenDropActorId) return;

      event.preventDefault();
      event.stopPropagation();

      if (event.button === 2) {
        this.cancelTokenDrop({ notify: true });
        return;
      }
      if (event.button !== 0) return;

      const activeDropActorId = this.pendingTokenDropActorId;
      const pointerPosition = this.getCanvasPointFromEvent(event);
      this.cancelTokenDrop({ render: false });

      try {
        if (!pointerPosition) {
          ui.notifications?.warn("QuickDeck: Could not detect pointer position, dropping at viewport center.");
        }
        await this.dropActorToken(activeDropActorId, pointerPosition);
      } catch (error) {
        console.warn("gurps-quickdeck | Failed to drop token from canvas click.", error);
        ui.notifications?.warn("QuickDeck: Could not drop token for this actor.");
      } finally {
        this.render(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      this.cancelTokenDrop({ notify: true });
    };

    const onCanvasReady = (canvasInstance) => {
      const nextSceneId = canvasInstance?.scene?.id ?? game?.scenes?.current?.id ?? null;
      if (!this.pendingTokenDropActorId) return;
      if (this._tokenDropSceneId && nextSceneId && this._tokenDropSceneId !== nextSceneId) {
        this.cancelTokenDrop({ notify: true });
      }
    };

    const listenerOptions = abortController ? { signal: abortController.signal, capture: true } : true;
    view.addEventListener("pointerdown", onPointerDown, listenerOptions);
    view.addEventListener("pointermove", onPointerMove, listenerOptions);
    view.addEventListener("contextmenu", onContextMenu, listenerOptions);
    window.addEventListener("keydown", onKeyDown, listenerOptions);
    Hooks.on("canvasReady", onCanvasReady);
    this._pendingTokenDropCleanup = () => {
      cleanupListeners();
    };

    this.render(false);
  }


  createTargetOpponentReticle(view) {
    this.destroyTargetOpponentReticle();

    const reticle = document.createElement("div");
    reticle.className = "quickdeck-target-opponent-reticle";
    reticle.setAttribute("aria-hidden", "true");
    reticle.innerHTML = '<span class="quickdeck-target-opponent-reticle-ring"></span><span class="quickdeck-target-opponent-reticle-crosshair"></span><span class="quickdeck-target-opponent-reticle-core"></span><span class="quickdeck-target-opponent-reticle-rune"></span>';
    document.body.appendChild(reticle);
    this._targetOpponentReticleElement = reticle;

    if (view?.style) {
      this._targetOpponentCursorTarget = view;
      this._targetOpponentPreviousCursor = view.style.cursor ?? "";
      view.style.cursor = "crosshair";
    }

    const rect = view?.getBoundingClientRect?.();
    const clientX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const clientY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    this.updateTargetOpponentReticle(clientX, clientY);
  }

  updateTargetOpponentReticle(clientX, clientY) {
    const reticle = this._targetOpponentReticleElement;
    if (!reticle || !Number.isFinite(Number(clientX)) || !Number.isFinite(Number(clientY))) return;
    reticle.style.transform = `translate3d(${Number(clientX)}px, ${Number(clientY)}px, 0) translate(-50%, -50%)`;
  }

  destroyTargetOpponentReticle() {
    if (this._targetOpponentCursorTarget?.style) {
      this._targetOpponentCursorTarget.style.cursor = this._targetOpponentPreviousCursor ?? "";
    }
    this._targetOpponentCursorTarget = null;
    this._targetOpponentPreviousCursor = null;

    if (this._targetOpponentReticleElement) {
      this._targetOpponentReticleElement.remove();
      this._targetOpponentReticleElement = null;
    }
  }

  getCurrentTargetDisplayName() {
    const targets = Array.from(game?.user?.targets ?? []).filter(Boolean);
    if (targets.length === 0) return "No target selected";
    const firstName = targets[0]?.document?.name ?? targets[0]?.name ?? "Target selected";
    if (targets.length === 1) return firstName;
    return `${firstName} +${targets.length - 1}`;
  }

  getTokenAtCanvasPoint(point) {
    if (!point || !canvas?.tokens?.placeables?.length) return null;

    const candidates = canvas.tokens.placeables
      .filter((token) => token?.visible !== false && token?.document)
      .filter((token) => {
        const bounds = token.bounds ?? token.getBounds?.();
        if (bounds && typeof bounds.contains === "function") return bounds.contains(point.x, point.y);

        const width = Number(token.w ?? token.width ?? token.document?.width ?? canvas?.grid?.size ?? 1);
        const height = Number(token.h ?? token.height ?? token.document?.height ?? canvas?.grid?.size ?? 1);
        const x = Number(token.x ?? token.document?.x);
        const y = Number(token.y ?? token.document?.y);
        if (![x, y, width, height].every(Number.isFinite)) return false;
        return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
      });

    return candidates.at(-1) ?? null;
  }

  async targetOpponentToken(token) {
    if (!token || typeof token.setTarget !== "function") {
      throw new Error("Selected token does not expose Foundry token targeting.");
    }

    const user = game?.user ?? null;
    const existingTargets = Array.from(user?.targets ?? []);
    for (const target of existingTargets) {
      if (target === token || typeof target?.setTarget !== "function") continue;
      target.setTarget(false, { user, releaseOthers: false, groupSelection: false });
    }

    await token.setTarget(true, { user, releaseOthers: true, groupSelection: false });
  }

  restoreAfterTargetOpponentMode() {
    this.isMinimized = false;
    this.persistMinimizedState();
    this.syncMinimizedPresentation();
  }

  cancelTargetOpponentMode({ notify = false, render = true, restore = true } = {}) {
    const hadPendingTarget = this.pendingTargetOpponentAttackIndex !== null || Boolean(this._pendingTargetOpponentCleanup);
    if (typeof this._pendingTargetOpponentCleanup === "function") {
      try {
        this._pendingTargetOpponentCleanup();
      } catch (error) {
        console.warn("gurps-quickdeck | Failed during target-opponent cleanup.", error);
      }
    }
    this._pendingTargetOpponentCleanup = null;
    this.pendingTargetOpponentAttackIndex = null;
    this._targetOpponentSceneId = null;
    this.destroyTargetOpponentReticle();
    if (notify) ui.notifications?.info("QuickDeck: Targeting cancelled.");
    if (restore && hadPendingTarget) this.restoreAfterTargetOpponentMode();
    if (render && hadPendingTarget) this.render(false);
  }

  startTargetOpponentMode(attackIndex) {
    if (!Number.isFinite(attackIndex)) return;

    if (this.pendingTargetOpponentAttackIndex !== null) {
      ui.notifications?.info("QuickDeck: Targeting mode is already active.");
      return;
    }

    const scene = canvas?.scene ?? game?.scenes?.current ?? null;
    if (!scene || !canvas?.ready) {
      ui.notifications?.warn("QuickDeck: No active scene/canvas ready for targeting.");
      return;
    }

    const view = canvas?.app?.view;
    if (!view || typeof view.addEventListener !== "function") {
      ui.notifications?.warn("QuickDeck: Canvas interaction is unavailable in this environment.");
      return;
    }

    this.cancelTokenDrop({ render: false });
    this.pendingTargetOpponentAttackIndex = attackIndex;
    this._targetOpponentSceneId = scene.id ?? null;
    this.createTargetOpponentReticle(view);
    ui.notifications?.info("QuickDeck: Click a token to target it. Right-click or press Escape to cancel.");

    if (!this.isMinimized) {
      this.isMinimized = true;
      this.persistMinimizedState();
      this.syncMinimizedPresentation();
    }

    const abortController = typeof AbortController === "function" ? new AbortController() : null;
    let cleanedUp = false;
    const cleanupListeners = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (abortController) abortController.abort();
      else {
        view.removeEventListener("pointerdown", onPointerDown, true);
        view.removeEventListener("pointermove", onPointerMove, true);
        view.removeEventListener("contextmenu", onContextMenu, true);
        window.removeEventListener("keydown", onKeyDown, true);
      }
      Hooks.off("canvasReady", onCanvasReady);
    };

    const onPointerMove = (event) => {
      const point = this.getClientPointFromEvent(event);
      if (!point) return;
      this.updateTargetOpponentReticle(point.clientX, point.clientY);
    };

    const onContextMenu = (event) => {
      if (this.pendingTargetOpponentAttackIndex === null) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const onPointerDown = async (event) => {
      if (this.pendingTargetOpponentAttackIndex === null) return;

      event.preventDefault();
      event.stopPropagation();

      if (event.button === 2) {
        this.cancelTargetOpponentMode({ notify: true });
        return;
      }
      if (event.button !== 0) return;

      try {
        const pointerPosition = this.getCanvasPointFromEvent(event);
        const token = this.getTokenAtCanvasPoint(pointerPosition);
        if (!token) {
          ui.notifications?.warn("QuickDeck: Click directly on a token to target it.");
          return;
        }

        await this.targetOpponentToken(token);
        this.cancelTargetOpponentMode({ render: false, restore: true });
      } catch (error) {
        console.warn("gurps-quickdeck | Failed during target opponent selection.", error);
        ui.notifications?.warn("QuickDeck: Could not target that token.");
        this.cancelTargetOpponentMode({ render: false, restore: true });
      } finally {
        this.render(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      this.cancelTargetOpponentMode({ notify: true });
    };

    const onCanvasReady = (canvasInstance) => {
      const nextSceneId = canvasInstance?.scene?.id ?? game?.scenes?.current?.id ?? null;
      if (this.pendingTargetOpponentAttackIndex === null) return;
      if (this._targetOpponentSceneId && nextSceneId && this._targetOpponentSceneId !== nextSceneId) {
        this.cancelTargetOpponentMode({ notify: true });
      }
    };

    const listenerOptions = abortController ? { signal: abortController.signal, capture: true } : true;
    view.addEventListener("pointerdown", onPointerDown, listenerOptions);
    view.addEventListener("pointermove", onPointerMove, listenerOptions);
    view.addEventListener("contextmenu", onContextMenu, listenerOptions);
    window.addEventListener("keydown", onKeyDown, listenerOptions);
    Hooks.on("canvasReady", onCanvasReady);
    this._pendingTargetOpponentCleanup = () => {
      cleanupListeners();
    };

    this.render(false);
  }

  toggleMinimizedState() {
    this.isMinimized = !this.isMinimized;
    if (this.isMinimized) {
      this.cancelTokenDrop({ render: false });
      this.cancelTargetOpponentMode({ render: false, restore: false });
      window.qdArtTunerOff?.();
    }
    this.persistMinimizedState();
    this.syncMinimizedPresentation();
  }

  async minimize() {
    this.cancelTokenDrop({ render: false });
    this.cancelTargetOpponentMode({ render: false, restore: false });
    window.qdArtTunerOff?.();
    if (!this.isMinimized) {
      this.isMinimized = true;
      this.persistMinimizedState();
    }
    this.syncMinimizedPresentation();
    return this;
  }

  async close(options) {
    this.cancelTokenDrop({ render: false });
    this.teardownQuickDeckCustomScrollbars();
    this.cancelTargetOpponentMode({ render: false, restore: false });
    window.qdArtTunerOff?.();
    this.unmountOverlay();
    this.showApplicationShellIfNeeded();
    this.removeFloatingRestoreIcon();
    if (this._actorSelectTimeout) {
      clearTimeout(this._actorSelectTimeout);
      this._actorSelectTimeout = null;
    }
    this.invalidateDerivedActorData();
    this.stopNativeWindowFocusLock({ force: true });
    return super.close(options);
  }

  async _render(force = false, options = {}) {
    const result = await super._render(force, options);
    this.hideApplicationShellForOverlay();
    await this.renderOverlay();
    this.syncHeaderMinimizeButton();
    this.syncMinimizedPresentation();
    this.bringReferenceAppToFrontSoon();
    return result;
  }

  syncHeaderMinimizeButton() {
    this.element
      ?.find?.(".quickdeck-header-minimize")
      ?.attr?.({
        title: "Minimize QuickDeck",
        "aria-label": "Minimize QuickDeck"
      });
  }

  syncMinimizedPresentation() {
    if (!this.rendered) return;
    if (this.isMinimized) {
      this.ensureFloatingRestoreIcon();
      this._overlayRoot?.classList?.add("is-minimized");
      return;
    }

    this.removeFloatingRestoreIcon();
    this._overlayRoot?.classList?.remove("is-minimized");
    if (this._nativeWindowFocusLock && Date.now() <= this._nativeWindowFocusLock.until) {
      this.bringNativeWindowsToFront(this._nativeWindowFocusLock.previousWindowIds);
      return;
    }
    this.raiseNativeWindow(this);
  }

  ensureFloatingRestoreIcon() {
    const existing = document.getElementById(this.getFloatingRestoreIconId());
    if (existing) {
      this._floatingRestoreIcon = existing;
      this.applyRestorePillPosition(existing);
      return;
    }

    const icon = document.createElement("button");
    icon.type = "button";
    icon.id = this.getFloatingRestoreIconId();
    icon.className = "quickdeck-floating-restore";
    icon.title = "Left-click restore · Right-drag move";
    icon.setAttribute("aria-label", "Left-click restore · Right-drag move");
    icon.innerHTML = '<span class="quickdeck-floating-restore-mark">QD</span><span class="quickdeck-floating-restore-label">QuickDeck</span>';
    icon.addEventListener("contextmenu", this.onFloatingRestoreContextMenu);
    icon.addEventListener("pointerdown", this.onFloatingRestorePointerDown);
    icon.addEventListener("click", this.onFloatingRestoreClick);
    document.body.appendChild(icon);
    this._floatingRestoreIcon = icon;
    this.applyRestorePillPosition(icon);
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
    this.render(false);
  };

  onFloatingRestoreContextMenu = (event) => {
    event.preventDefault();
  };

  onFloatingRestorePointerDown = (event) => {
    if (event.button !== 2) return;

    const icon = this._floatingRestoreIcon ?? document.getElementById(this.getFloatingRestoreIconId());
    if (!icon) return;

    event.preventDefault();
    event.stopPropagation();
    this._restorePillPreventClick = true;
    this.stopRestorePillDrag();

    const startLeft = Number.parseFloat(icon.style.left) || icon.offsetLeft || 0;
    const startTop = Number.parseFloat(icon.style.top) || icon.offsetTop || 0;
    const startClientX = Number(event.clientX);
    const startClientY = Number(event.clientY);
    const dragThreshold = 3;
    let didDrag = false;

    const updatePosition = (nextLeft, nextTop) => {
      const clamped = this.getClampedRestorePillPosition(nextLeft, nextTop, icon);
      icon.style.left = `${clamped.left}px`;
      icon.style.top = `${clamped.top}px`;
      icon.style.right = "auto";
      this.restorePillPosition = clamped;
    };

    const onPointerMove = (moveEvent) => {
      const deltaX = Number(moveEvent.clientX) - startClientX;
      const deltaY = Number(moveEvent.clientY) - startClientY;
      if (!didDrag && (Math.abs(deltaX) >= dragThreshold || Math.abs(deltaY) >= dragThreshold)) {
        didDrag = true;
      }
      updatePosition(startLeft + deltaX, startTop + deltaY);
    };

    const onPointerUp = () => {
      if (!didDrag) {
        this._restorePillPreventClick = false;
      } else {
        this.persistRestorePillPosition(this.restorePillPosition);
      }
      this.stopRestorePillDrag();
    };

    const onWindowBlur = () => {
      if (didDrag) this.persistRestorePillPosition(this.restorePillPosition);
      this.stopRestorePillDrag();
    };

    const abortController = typeof AbortController === "function" ? new AbortController() : null;
    const listenerOptions = abortController ? { signal: abortController.signal } : undefined;
    window.addEventListener("pointermove", onPointerMove, listenerOptions);
    window.addEventListener("pointerup", onPointerUp, listenerOptions);
    window.addEventListener("blur", onWindowBlur, listenerOptions);

    this._restorePillDragCleanup = () => {
      if (abortController) {
        abortController.abort();
        return;
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("blur", onWindowBlur);
    };
  };

  stopRestorePillDrag() {
    if (typeof this._restorePillDragCleanup === "function") {
      this._restorePillDragCleanup();
    }
    this._restorePillDragCleanup = null;
  }

  getClampedRestorePillPosition(left, top, icon) {
    const pill = icon ?? this._floatingRestoreIcon ?? document.getElementById(this.getFloatingRestoreIconId());
    const rect = pill?.getBoundingClientRect?.();
    const width = rect?.width ?? pill?.offsetWidth ?? 0;
    const height = rect?.height ?? pill?.offsetHeight ?? 0;
    const maxLeft = Math.max(0, window.innerWidth - width);
    const maxTop = Math.max(0, window.innerHeight - height);
    return {
      left: Math.min(Math.max(0, Number(left) || 0), maxLeft),
      top: Math.min(Math.max(0, Number(top) || 0), maxTop)
    };
  }

  applyRestorePillPosition(icon) {
    const pill = icon ?? this._floatingRestoreIcon;
    if (!pill) return;

    const fallbackRect = pill.getBoundingClientRect();
    const fallbackPosition = {
      left: fallbackRect.left,
      top: fallbackRect.top
    };
    const desired = this.restorePillPosition ?? fallbackPosition;
    const clamped = this.getClampedRestorePillPosition(desired.left, desired.top, pill);
    pill.style.left = `${clamped.left}px`;
    pill.style.top = `${clamped.top}px`;
    pill.style.right = "auto";
    this.restorePillPosition = clamped;
    this.persistRestorePillPosition(clamped);
  }

  removeFloatingRestoreIcon() {
    this.stopRestorePillDrag();
    const icon = this._floatingRestoreIcon ?? document.getElementById(this.getFloatingRestoreIconId());
    if (!icon) return;
    icon.removeEventListener("contextmenu", this.onFloatingRestoreContextMenu);
    icon.removeEventListener("pointerdown", this.onFloatingRestorePointerDown);
    icon.removeEventListener("click", this.onFloatingRestoreClick);
    icon.remove();
    this._floatingRestoreIcon = null;
  }


  getOverlayData() {
    const data = this.getData();
    data.overlayShellClass = "qd40-shell";
    return data;
  }

  async renderOverlay() {
    this.mountOverlay();
    if (!this._overlayRoot) return;
    const html = await renderQuickDeckTemplate(OVERLAY_TEMPLATE_PATH, this.getOverlayData());
    this.teardownQuickDeckCustomScrollbars();
    this._overlayRoot.innerHTML = html;
    this.applyQd31LayoutSizing(this.getQd31LayoutMetrics());
    this.setOverlayPosition();
    this.activateOverlayListeners(this._overlayRoot);
    this.setupQuickDeckCustomScrollbars(this._overlayRoot);
    focusQuickDeckCockpitFirst(this._overlayRoot);
  }

  mountOverlay() {
    if (this._overlayRoot && document.body.contains(this._overlayRoot)) return this._overlayRoot;
    const root = document.createElement("div");
    root.id = "gurps-quickdeck-overlay";
    root.className = "qd40-overlay";
    document.body.appendChild(root);
    this._overlayRoot = root;
    if (this._overlayWindowResizeHandler) {
      window.removeEventListener("resize", this._overlayWindowResizeHandler);
      window.addEventListener("resize", this._overlayWindowResizeHandler);
    }
    return root;
  }

  unmountOverlay() {
    this.teardownQuickDeckCustomScrollbars();
    this.stopOverlayDrag();
    if (this._overlayWindowResizeHandler) window.removeEventListener("resize", this._overlayWindowResizeHandler);
    this._overlayRoot?.remove();
    this._overlayRoot = null;
  }

  setOverlayPosition() {
    if (!this._overlayRoot) return;
    const fallbackLeft = Math.max(12, Math.round((window.innerWidth || 1440) * 0.16));
    const fallbackTop = Math.max(12, Math.round(((window.innerHeight || 900) - 820) * 0.5));
    const left = this._overlayPosition?.left ?? this.position?.left ?? fallbackLeft;
    const top = this._overlayPosition?.top ?? this.position?.top ?? fallbackTop;
    const clamped = this.getClampedOverlayPosition(left, top);
    this._overlayPosition = clamped;
    this._overlayRoot.style.left = `${clamped.left}px`;
    this._overlayRoot.style.top = `${clamped.top}px`;
  }

  startOverlayDrag(event) {
    if (!this._overlayRoot) return;
    const target = event.target;
    if (target?.closest?.("button, input, select, textarea, a")) return;

    event.preventDefault();
    const startLeft = Number.parseFloat(this._overlayRoot.style.left) || this._overlayRoot.offsetLeft || 0;
    const startTop = Number.parseFloat(this._overlayRoot.style.top) || this._overlayRoot.offsetTop || 0;
    const startClientX = Number(event.clientX);
    const startClientY = Number(event.clientY);

    this.stopOverlayDrag();
    this._overlayRoot.classList.add("qd40-dragging");

    const onPointerMove = (moveEvent) => {
      const deltaX = Number(moveEvent.clientX) - startClientX;
      const deltaY = Number(moveEvent.clientY) - startClientY;
      const clamped = this.getClampedOverlayPosition(startLeft + deltaX, startTop + deltaY);
      this._overlayPosition = clamped;
      this._overlayRoot.style.left = `${clamped.left}px`;
      this._overlayRoot.style.top = `${clamped.top}px`;
    };

    const onPointerUp = () => this.stopOverlayDrag();
    const onBlur = () => this.stopOverlayDrag();

    const abortController = typeof AbortController === "function" ? new AbortController() : null;
    const listenerOptions = abortController ? { signal: abortController.signal } : undefined;
    window.addEventListener("pointermove", onPointerMove, listenerOptions);
    window.addEventListener("pointerup", onPointerUp, listenerOptions);
    window.addEventListener("blur", onBlur, listenerOptions);

    this._overlayDragCleanup = () => {
      this._overlayRoot?.classList?.remove("qd40-dragging");
      if (abortController) { abortController.abort(); return; }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("blur", onBlur);
    };
  }

  stopOverlayDrag() {
    if (typeof this._overlayDragCleanup === "function") this._overlayDragCleanup();
    this._overlayDragCleanup = null;
  }

  getClampedOverlayPosition(left, top) {
    const overlay = this._overlayRoot;
    const rect = overlay?.getBoundingClientRect?.();
    const width = rect?.width ?? overlay?.offsetWidth ?? 0;
    const height = rect?.height ?? overlay?.offsetHeight ?? 0;
    const minLeft = 0;
    const minTop = 0;
    const maxLeft = Math.max(minLeft, (window.innerWidth || width) - width);
    const maxTop = Math.max(minTop, (window.innerHeight || height) - height);
    return {
      left: Math.min(Math.max(minLeft, Number(left) || 0), maxLeft),
      top: Math.min(Math.max(minTop, Number(top) || 0), maxTop)
    };
  }

  activateOverlayListeners(root) {
    this.activateListeners($(root));
    root.querySelector("[data-action=\"drag-overlay\"]")?.addEventListener("pointerdown", (event) => this.startOverlayDrag(event));
  }

  setupQuickDeckCustomScrollbars(root) {
    if (!root) return;
    this.teardownQuickDeckCustomScrollbars();
    this._quickDeckCustomScrollbarManager = new QuickDeckCustomScrollbarManager(root);
    this._quickDeckCustomScrollbarManager.setup();
  }

  teardownQuickDeckCustomScrollbars() {
    this._quickDeckCustomScrollbarManager?.teardown?.();
    this._quickDeckCustomScrollbarManager = null;
  }

  refreshQuickDeckCustomScrollbars() {
    this._quickDeckCustomScrollbarManager?.refreshAll?.();
  }

  hideApplicationShellForOverlay() {
    const host = this.getApplicationHostElement();
    if (!host?.classList) return;
    host.classList.add("qd40-host-hidden");
  }

  showApplicationShellIfNeeded() {
    const host = this.getApplicationHostElement();
    if (!host?.classList) return;
    host.classList.remove("qd40-host-hidden");
  }

  getData() {
    if (!this._stateLoadedFromSettings) this.loadPersistedState();
    this.sanitizePersistentState();
    this.applyDefaultDrawerIfNeeded();

    const allActors = this.getCombatActors();

    const { combatantByActorId, currentCombatantId } = this.getCombatRosterState();

    const rosterActors = this.rosterActorIds
      .map((id) => game.actors.get(id))
      .filter((actor) => actor && actor.id);

    const availableSearchNormalized = this.normalizeSearchText(this.availableSearch);
    const availableActors = allActors
      .map((actor) => ({
        id: actor.id,
        name: actor.name,
        img: actor.img || "icons/svg/mystery-man.svg",
        actorType: actor.type ? String(actor.type) : null,
        isInRoster: this.rosterActorIds.includes(actor.id),
        searchText: this.buildSearchText([actor.name, actor.type])
      }))
      .filter((actor) => !actor.isInRoster)
      .filter((actor) => {
        if (!actor.actorType) return true;
        const type = actor.actorType.toLowerCase();
        return type === "character" || type === "npc";
      })
      .map((actor) => ({
        ...actor,
        isAvailableSearchMatch:
          !availableSearchNormalized ||
          this.normalizeSearchText(actor.searchText).includes(availableSearchNormalized)
      }));

    const rosterActorViews = rosterActors.map((actor) => {
      const hp = this.getResourceSummary(actor, "HP");
      const fp = this.getResourceSummary(actor, "FP");
      return {
        id: actor.id,
        name: actor.name,
        img: actor.img || "icons/svg/mystery-man.svg",
        actorType: actor.type ? String(actor.type) : null,
        isActive: actor.id === this.activeActorId,
        combatBadge: this.getCombatBadgeText(combatantByActorId.get(actor.id)),
        isCurrentTurn:
          combatantByActorId.get(actor.id)?.id &&
          combatantByActorId.get(actor.id).id === currentCombatantId,
        hpDisplay: hp.display,
        hpMaxDisplay: hp.maxDisplay,
        hpPercent: hp.percent,
        fpDisplay: fp.display,
        fpMaxDisplay: fp.maxDisplay,
        fpPercent: fp.percent
      };
    });
    const centerRosterView = this.getCenterRosterView(rosterActorViews);

    const activeActor = this.getActiveActor();
    const shouldHydrateDerivedData = Boolean(activeActor);
    const includeAttacks = Boolean(activeActor);
    const includeSkills = Boolean(activeActor);
    const includeSpells = Boolean(activeActor);
    const derivedData = shouldHydrateDerivedData
      ? this.getDerivedActorData(activeActor, { includeAttacks, includeSkills, includeSpells })
      : {
          attacks: [],
          indexedAttacks: [],
          skills: [],
          indexedSkills: [],
          spells: [],
          indexedSpells: [],
          dodge: null,
          bestParry: null,
          bestBlock: null,
          currentHp: null,
          currentFp: null,
          maxHp: null,
          maxFp: null,
          move: null
        };
    const attacks = derivedData.attacks;
    const skills = derivedData.skills;
    const combatSearch = this.combatSearch;
    const skillsSearch = this.skillsSearch;
    const quickSkillsSearch = this.quickSkillsSearch;
    const spellsSearch = this.spellsSearch;
    const spells = derivedData.spells;

    const visibleAvailableCount = this.getVisibleCountBySearchText(availableActors, this.availableSearch);
    const availableSearchHasQuery = Boolean(this.normalizeSearchText(this.availableSearch));
    const activeActorId = activeActor?.id ?? null;
    const favoriteAttackSelection = this.getFavoriteAttackSelection(activeActorId);
    const modifierBucketStatus = this.getModifierBucketStatus();
    const pendingActorId = this._pendingAttackGuidance?.actorId ?? null;
    const pendingAttackIndex = Number.isFinite(this._pendingAttackGuidance?.attackIndex)
      ? this._pendingAttackGuidance.attackIndex
      : null;
    const decorateAttack = (entry) => {
      const attackKey = entry.attackKey ?? this.getAttackFavoriteKey(entry);
      const isFavorite = attackKey ? favoriteAttackSelection.has(attackKey) : false;
      return {
        ...entry,
        attackKey,
        isPinnedAction: attackKey ? this.isPinnedAction(activeActorId, "attack", attackKey) : false,
        isFavoriteAttack: isFavorite,
        favoriteToggleLabel: isFavorite ? "Unpin attack" : "Pin attack",
        showDamageFollowup: pendingActorId === activeActorId && pendingAttackIndex === entry.index
      };
    };
    const indexedAttacks = derivedData.indexedAttacks.map(decorateAttack);
    const favoriteAttacks = indexedAttacks.filter((entry) => entry.isFavoriteAttack);
    const filteredAttacks = this.filterEntriesBySearchText(indexedAttacks, combatSearch);
    const meleeAttacks = filteredAttacks.filter((entry) => entry.type === "Melee");
    const rangedAttacks = filteredAttacks.filter((entry) => entry.type === "Ranged");

    const quickSelection = this.getQuickSkillSelection(activeActorId);
    const indexedSkills = derivedData.indexedSkills.map((skill) => {
      const quickSkillKey = this.getQuickSkillKey(skill);
      const isQuickSkillSelected = quickSkillKey ? quickSelection.has(quickSkillKey) : false;
      return {
        ...skill,
        quickSkillKey,
        isQuickSkillSelected,
        isPinnedAction: quickSkillKey ? this.isPinnedAction(activeActorId, "skill", quickSkillKey) : false,
        quickSkillToggleLabel: isQuickSkillSelected ? "Unpin skill" : "Pin skill",
        levelDisplay: skill.level === undefined || skill.level === null ? "—" : String(skill.level),
        relativeLevelDisplay:
          skill.relativeLevel === undefined || skill.relativeLevel === null
            ? null
            : String(skill.relativeLevel),
        pointsDisplay:
          skill.points === undefined || skill.points === null ? null : String(skill.points),
        referenceDisplay:
          (skill.reference ?? skill.pageHint) === undefined || (skill.reference ?? skill.pageHint) === null
            ? null
            : String(skill.reference ?? skill.pageHint)
      };
    });
    const filteredSkills = this.filterEntriesBySearchText(indexedSkills, skillsSearch);
    const quickSkills = indexedSkills.filter((skill) => skill.isQuickSkillSelected);
    const filteredQuickSkills = this.filterEntriesBySearchText(quickSkills, quickSkillsSearch);
    const favoriteSpellSelection = this.getFavoriteSpellSelection(activeActorId);
    const indexedSpells = derivedData.indexedSpells.map((spell) => {
      const spellKey = spell.spellKey ?? this.getSpellFavoriteKey(spell);
      const isFavorite = spellKey ? favoriteSpellSelection.has(spellKey) : false;
      return {
        ...spell,
        spellKey,
        isFavoriteSpell: isFavorite,
        favoriteToggleLabel: isFavorite ? "Unpin spell" : "Pin spell",
        isPinnedAction: spellKey ? this.isPinnedAction(activeActorId, "spell", spellKey) : false
      };
    });
    const attackByKey = new Map(indexedAttacks.map((entry) => [entry.attackKey, entry]));
    const skillByKey = new Map(indexedSkills.map((entry) => [entry.quickSkillKey, entry]));
    const spellByKey = new Map(indexedSpells.map((entry) => [entry.spellKey, entry]));
    const pinnedActions = this.getPinnedActions(activeActorId).map((entry) => {
      if (entry.type === "attack") {
        const attack = attackByKey.get(entry.key);
        if (!attack) return null;
        return { type: "attack", badge: "Attack", key: entry.key, label: attack.name, action: "roll-attack", actorId: activeActorId, index: attack.index };
      }
      if (entry.type === "skill") {
        const skill = skillByKey.get(entry.key);
        if (!skill) return null;
        return { type: "skill", badge: "Skill", key: entry.key, label: skill.name, action: "roll-skill", actorId: activeActorId, index: skill.index };
      }
      if (entry.type === "spell") {
        const spell = spellByKey.get(entry.key);
        if (!spell) return null;
        return { type: "spell", badge: "Spell", key: entry.key, label: spell.name, action: "roll-spell", actorId: activeActorId, index: spell.index };
      }
      return null;
    }).filter(Boolean).slice(0, 5);
    const favoriteSpells = indexedSpells.filter((spell) => spell.isFavoriteSpell);
    const centerFavoriteSections = {
      combat: this.centerFavoriteSections?.combat ?? true,
      skills: this.centerFavoriteSections?.skills ?? true,
      spells: this.centerFavoriteSections?.spells ?? true
    };
    const filteredSpells = this.filterEntriesBySearchText(indexedSpells, spellsSearch);
    if (DEBUG) {
      const meleeCount = attacks.filter((attack) => attack.type === "Melee").length;
      const rangedCount = attacks.filter((attack) => attack.type === "Ranged").length;
      const firstSkills = skills.slice(0, 10).map((skill) => ({
        name: skill.name,
        level: skill.level ?? null
      }));
      console.log("gurps-quickdeck | Extraction debug", {
        activeActor: activeActor?.name ?? null,
        meleeCount,
        rangedCount,
        skillsCount: skills.length,
        firstSkills
      });
    }
    const dodge = derivedData.dodge;
    const bestParry = derivedData.bestParry;
    const bestBlock = derivedData.bestBlock;

    const currentHp = derivedData.currentHp;
    const currentFp = derivedData.currentFp;
    const maxHp = derivedData.maxHp;
    const maxFp = derivedData.maxFp;

    const gurpsData = {
      hp: currentHp ?? null,
      fp: currentFp ?? null,
      hpMax: maxHp ?? currentHp ?? null,
      fpMax: maxFp ?? currentFp ?? null,
      hpPercent: this.getResourcePercent(currentHp, maxHp ?? currentHp),
      fpPercent: this.getResourcePercent(currentFp, maxFp ?? currentFp),
      move: derivedData.move,
      dodge,
      defenses: {
        dodge,
        parry: bestParry,
        block: bestBlock
      },
      attacks,
      skills,
      display: {
        hp: this.toDisplayValue(currentHp),
        fp: this.toDisplayValue(currentFp),
        hpMax: this.toDisplayValue(maxHp ?? currentHp),
        fpMax: this.toDisplayValue(maxFp ?? currentFp),
        move: this.toDisplayValue(derivedData.move),
        dodge: this.toDisplayValue(dodge),
        parry: this.toDisplayValue(bestParry),
        block: this.toDisplayValue(bestBlock)
      }
    };

    return {
      availableSearch: this.availableSearch,
      combatSearch,
      skillsSearch,
      quickSkillsSearch,
      spellsSearch,
      availableActors,
      visibleAvailableCount,
      availableSearchStatusText: this.formatSearchStatus(visibleAvailableCount, "inactive characters", availableSearchHasQuery),
      availableSearchShowEmpty: availableSearchHasQuery && visibleAvailableCount === 0,
      rosterCount: rosterActors.length,
      availableCount: availableActors.length,
      rosterActors: rosterActorViews,
      centerRosterView,
      activeActor: activeActor
        ? {
            id: activeActor.id,
            name: activeActor.name,
            img: activeActor.img || "icons/svg/mystery-man.svg",
            actorType: activeActor.type ? String(activeActor.type) : null
          }
        : null,
      activeActorName: activeActor?.name ?? null,
      isTokenDropArmedForActive:
        Boolean(activeActor?.id) && this.pendingTokenDropActorId === activeActor.id,
      isTargetOpponentModeActive: this.pendingTargetOpponentAttackIndex !== null,
      currentTargetName: this.getCurrentTargetDisplayName(),
      modifierBucketStatus,
      canRepeatLastAttack: Boolean(this.pendingAttackContext?.actorId),
      lastAttackName: this.pendingAttackContext?.attackName ?? "No attack selected",
      gurpsData,
      primaryRollView: this.getPrimaryRollView(activeActor),
      secondaryRollView: this.getSecondaryRollView(activeActor, derivedData),
      hasAvailableActors: availableActors.length > 0,
      hasRosterActors: rosterActors.length > 0,
      activeDrawer: this.activeDrawer,
      uiMode: this.uiMode,
      isUi1Mode: this.isUi1Mode,
      isUi2Mode: this.isUi2Mode,
      isRosterDrawerOpen: this.isRosterDrawerOpen,
      isActionsDrawerOpen: this.isActionsDrawerOpen,
      isCombatDrawerOpen: this.activeDrawer === "combat",
      isSkillsDrawerOpen: this.activeDrawer === "skills",
      isQuickSkillsDrawerOpen: this.activeDrawer === "quick-skills",
      isSpellsDrawerOpen: this.activeDrawer === "spells",
      isSettingsDrawerOpen: this.activeDrawer === "settings",
      isDebugMode: DEBUG,
      attackCount: attacks.length,
      visibleAttackCount: filteredAttacks.length,
      combatSearchCount: filteredAttacks.length,
      combatSearchHasQuery: Boolean(this.normalizeSearchText(combatSearch)),
      combatSearchShowEmpty: Boolean(this.normalizeSearchText(combatSearch)) && filteredAttacks.length === 0,
      combatSearchStatusText: this.formatSearchStatus(filteredAttacks.length, "attacks", Boolean(this.normalizeSearchText(combatSearch))),
      meleeAttacks,
      rangedAttacks,
      favoriteAttacks,
      favoriteAttackCount: favoriteAttacks.length,
      skillsCount: skills.length,
      visibleSkillsCount: filteredSkills.length,
      skillsSearchCount: filteredSkills.length,
      skillsSearchHasQuery: Boolean(this.normalizeSearchText(skillsSearch)),
      skillsSearchShowEmpty: Boolean(this.normalizeSearchText(skillsSearch)) && filteredSkills.length === 0,
      skillsSearchStatusText: this.formatSearchStatus(filteredSkills.length, "skills", Boolean(this.normalizeSearchText(skillsSearch))),
      quickSkillsCount: quickSkills.length,
      visibleQuickSkillsCount: filteredQuickSkills.length,
      spellsCount: spells.length,
      visibleSpellsCount: filteredSpells.length,
      spellsSearchCount: filteredSpells.length,
      spellsSearchHasQuery: Boolean(this.normalizeSearchText(spellsSearch)),
      spellsSearchShowEmpty: Boolean(this.normalizeSearchText(spellsSearch)) && filteredSpells.length === 0,
      spellsSearchStatusText: this.formatSearchStatus(filteredSpells.length, "spells", Boolean(this.normalizeSearchText(spellsSearch))),
      favoriteSpells,
      favoriteSpellCount: favoriteSpells.length,
      centerFavoriteSections,
      isDragOverRoster: this.isDragOverRoster,
      indexedAttacks,
      indexedSkills,
      indexedQuickSkills: quickSkills,
      indexedSpells,
      pinnedActions,
      hasPinnedActions: pinnedActions.length > 0,
      uiBuildLabel: "QD v0.9.7.1 — batch1-fit",
      uiBranchLabel: "v0.9.7.1 batch1-fit",
      moduleVersion: game.modules.get(MODULE_ID)?.version ?? "unknown",
      isInfoPopoverOpen: this.isInfoPopoverOpen,
      devArtTunerEnabled: this.isDevArtTunerEnabled(),
      pdfMapDraft: this.pdfMapDraft,
      pdfPageRefMappings: this.getPdfPageRefMappingRows()
    };
  }


  get isUi2Mode() {
    return this.uiMode === "ui2";
  }

  get isUi1Mode() {
    return !this.isUi2Mode;
  }

  async setUiMode(mode) {
    const nextMode = VALID_UI_MODES.has(String(mode)) ? String(mode) : DEFAULT_UI_MODE;
    this.uiMode = nextMode;
    await game?.settings?.set?.(MODULE_ID, SETTING_KEYS.UI_MODE, nextMode);

    if (this.rendered) this.render(true, { focus: false });
    await this.renderOverlay();
    this.syncMinimizedPresentation();
  }

  isDevArtTunerEnabled() {
    try {
      return Boolean(game?.settings?.get?.(MODULE_ID, SETTING_KEYS.DEV_ART_TUNER_ENABLED));
    } catch (_error) {
      return false;
    }
  }

  async setDevArtTunerEnabled(enabled) {
    await game?.settings?.set?.(MODULE_ID, SETTING_KEYS.DEV_ART_TUNER_ENABLED, Boolean(enabled));
    if (!enabled) window.qdArtTunerOff?.();
    this.render(false, { focus: false });
  }

  openDevArtTuner() {
    installQuickDeckArtTunerGlobals();
    window.qdArtTunerOn?.();
  }

  closeDevArtTuner() {
    window.qdArtTunerOff?.();
  }

  copyDevArtTunerCss() {
    installQuickDeckArtTunerGlobals();
    void window.qdArtTunerCopyCss?.();
  }

  resetDevArtTuner() {
    installQuickDeckArtTunerGlobals();
    window.qdArtTunerReset?.();
  }

  statusDevArtTuner() {
    installQuickDeckArtTunerGlobals();
    window.qdArtTunerStatus?.();
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='set-ui-mode']").on("change", (event) => {
      event.preventDefault();
      const target = event.currentTarget;
      const nextMode = target.type === "checkbox"
        ? (target.checked ? "ui2" : "ui1")
        : target.value;
      void this.setUiMode(nextMode);
    });

    html.find("[data-action='add-actor']").on("click", (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      if (!actorId || !game.actors.has(actorId)) return;

      this.ensureActorTab(actorId);
      this.render();
    });

    html.find("[data-action='clear-roster']").on("click", (event) => {
      event.preventDefault();
      this.cancelTokenDrop({ render: false });
      this.cancelTargetOpponentMode({ render: false, restore: false });
      this.clearRoster();
      this.render();
    });

    html.find("[data-action='open-sheet']").on("click", (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      if (!actorId || !game.actors.has(actorId)) return;
      this.openActorSheet(actorId);
    });

    html.find("[data-action='drop-token']").on("click", async (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      if (!actorId || !game.actors.has(actorId)) return;

      try {
        this.armTokenDrop(actorId);
      } catch (error) {
        console.warn("gurps-quickdeck | Failed to drop token from QuickDeck.", error);
        ui.notifications?.warn("QuickDeck: Could not drop token for this actor.");
      }
    });

    html.find("[data-action='toggle-minimize']").on("click", (event) => {
      event.preventDefault();
      this.toggleMinimizedState();
    });

    html.find("[data-action='open-reference-index']").on("click", (event) => {
      event.preventDefault();
      this.openReferenceIndexManager();
    });

    html.find("[data-action='toggle-dev-art-tuner-enabled']").on("change", async (event) => {
      await this.setDevArtTunerEnabled(event.currentTarget.checked);
    });

    html.find("[data-action='open-dev-art-tuner']").on("click", (event) => {
      event.preventDefault();
      this.openDevArtTuner();
    });

    html.find("[data-action='close-dev-art-tuner']").on("click", (event) => {
      event.preventDefault();
      this.closeDevArtTuner();
    });

    html.find("[data-action='copy-dev-art-tuner-css']").on("click", (event) => {
      event.preventDefault();
      this.copyDevArtTunerCss();
    });

    html.find("[data-action='reset-dev-art-tuner']").on("click", (event) => {
      event.preventDefault();
      this.resetDevArtTuner();
    });

    html.find("[data-action='status-dev-art-tuner']").on("click", (event) => {
      event.preventDefault();
      this.statusDevArtTuner();
    });

    html.find("[data-action='remove-actor']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      if (!actorId) return;

      this.cancelTokenDrop({ render: false });
      this.cancelTargetOpponentMode({ render: false, restore: false });
      this.removeActorFromRoster(actorId);
      this.render();
    });

    html.find("[data-action='open-actor'], [data-action='center-roster-select']").on("click", (event) => {
      event.preventDefault();
      if (event.detail > 1) return;
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      if (!actorId || !game.actors.has(actorId)) return;

      if (this._actorSelectTimeout) clearTimeout(this._actorSelectTimeout);
      this._actorSelectTimeout = window.setTimeout(() => {
        this.selectCenterRosterActor(actorId);
        this.render();
        this._actorSelectTimeout = null;
      }, 225);
    });

    html.find("[data-action='open-actor'], [data-action='center-roster-select'], [data-action='open-active-actor-sheet']").on("dblclick", (event) => {
      event.preventDefault();
      if (this._actorSelectTimeout) {
        clearTimeout(this._actorSelectTimeout);
        this._actorSelectTimeout = null;
      }
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      if (!actorId || !game.actors.has(actorId)) return;

      this.selectCenterRosterActor(actorId);
      this.openActorSheet(actorId);
      this.render(false, { focus: false });
    });


    html.find("[data-action='center-roster-prev']").on("click", (event) => {
      event.preventDefault();
      this.pageCenterRoster("prev");
      this.render(false, { focus: false });
    });

    html.find("[data-action='center-roster-next']").on("click", (event) => {
      event.preventDefault();
      this.pageCenterRoster("next");
      this.render(false, { focus: false });
    });

    html.find("[data-action='toggle-center-roster-minimized']").on("click", (event) => {
      event.preventDefault();
      this.isCenterRosterMinimized = !this.isCenterRosterMinimized;
      this.render(false, { focus: false });
    });

    html.find("[data-action='available-search']").on("input", (event) => {
      const searchValue = event.currentTarget?.value;
      this.availableSearch = typeof searchValue === "string" ? searchValue : "";
      this.applyAvailableActorFilter(html);
    });


    html.find("[data-action='combat-search']").on("input", (event) => {
      const searchValue = event.currentTarget?.value;
      this.combatSearch = typeof searchValue === "string" ? searchValue : "";
      this.applyCombatFilter(html);
    });

    html.find("[data-action='skills-search']").on("input", (event) => {
      const searchValue = event.currentTarget?.value;
      this.skillsSearch = typeof searchValue === "string" ? searchValue : "";
      this.applySkillsFilter(html);
    });

    html.find("[data-action='quick-skills-search']").on("input", (event) => {
      const searchValue = event.currentTarget?.value;
      this.quickSkillsSearch = typeof searchValue === "string" ? searchValue : "";
      this.applyQuickSkillsFilter(html);
    });

    html.find("[data-action='spells-search']").on("input", (event) => {
      const searchValue = event.currentTarget?.value;
      this.spellsSearch = typeof searchValue === "string" ? searchValue : "";
      this.applySpellsFilter(html);
    });

    html.find("[data-action='clear-combat-search']").on("click", (event) => {
      event.preventDefault();
      this.combatSearch = "";
      const input = html.find("[data-action='combat-search']")[0];
      if (input) input.value = "";
      this.applyCombatFilter(html);
      input?.focus?.();
    });

    html.find("[data-action='clear-skills-search']").on("click", (event) => {
      event.preventDefault();
      this.skillsSearch = "";
      const input = html.find("[data-action='skills-search']")[0];
      if (input) input.value = "";
      this.applySkillsFilter(html);
      input?.focus?.();
    });

    html.find("[data-action='clear-spells-search']").on("click", (event) => {
      event.preventDefault();
      this.spellsSearch = "";
      const input = html.find("[data-action='spells-search']")[0];
      if (input) input.value = "";
      this.applySpellsFilter(html);
      input?.focus?.();
    });

    html.find("[data-action='toggle-quick-skill']").on("change click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const element = event.currentTarget;
      const actorId = element.dataset.actorId || this.activeActorId;
      const skillKey = element.dataset.skillKey;
      if (!actorId || !skillKey) return;

      let shouldSelect = true;
      if (element.type === "checkbox") shouldSelect = Boolean(element.checked);
      else shouldSelect = !this.getQuickSkillSelection(actorId).has(skillKey);

      this.setQuickSkillSelected(actorId, skillKey, shouldSelect);
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
    });

    html.find("[data-action='unpin-quick-skill']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const skillKey = event.currentTarget.dataset.skillKey;
      if (!actorId || !skillKey) return;

      this.setQuickSkillSelected(actorId, skillKey, false);
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
    });

    html.find("[data-action='toggle-favorite-attack']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const attackKey = event.currentTarget.dataset.attackKey;
      if (!actorId || !attackKey) return;

      const selection = this.getFavoriteAttackSelection(actorId);
      this.setFavoriteAttackSelected(actorId, attackKey, !selection.has(attackKey));
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
    });
    html.find("[data-action='toggle-pin-attack']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const attackKey = event.currentTarget.dataset.attackKey;
      this.togglePinnedAction(actorId, "attack", attackKey);
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
    });
    html.find("[data-action='remove-pinned-action']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const type = event.currentTarget.dataset.pinType;
      const key = event.currentTarget.dataset.pinKey;
      this.removePinnedAction(actorId, type, key);
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
    });
    html.find("[data-action='toggle-pin-skill']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const skillKey = event.currentTarget.dataset.skillKey;
      this.togglePinnedAction(actorId, "skill", skillKey);
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
    });
    html.find("[data-action='toggle-pin-spell']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const spellKey = event.currentTarget.dataset.spellKey;
      this.togglePinnedAction(actorId, "spell", spellKey);
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
    });

    html.find("[data-action='toggle-favorite-spell']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const spellKey = event.currentTarget.dataset.spellKey;
      if (!actorId || !spellKey) return;

      const selection = this.getFavoriteSpellSelection(actorId);
      this.setFavoriteSpellSelected(actorId, spellKey, !selection.has(spellKey));
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
    });

    html.find("[data-action='toggle-center-favorite-section']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const section = String(event.currentTarget.dataset.section || "").toLowerCase();
      if (!["combat", "skills", "spells"].includes(section)) return;
      const current = this.centerFavoriteSections?.[section];
      this.centerFavoriteSections = {
        combat: this.centerFavoriteSections?.combat ?? true,
        skills: this.centerFavoriteSections?.skills ?? true,
        spells: this.centerFavoriteSections?.spells ?? true,
        [section]: !(current ?? true)
      };
      this.render(false, { focus: false });
    });



    html.find("[data-action='toggle-drawer']").on("click", (event) => {
      event.preventDefault();
      const drawer = event.currentTarget.dataset.drawer;
      if (!drawer || !VALID_DRAWERS.has(drawer)) return;
      this.activeDrawer = this.activeDrawer === drawer ? null : drawer;
      this.isActionsDrawerOpen = true;
      this.render(false);
    });

    html.find("[data-action='open-roster-drawer'], [data-action='open-roster-sidecar']").on("click", (event) => { event.preventDefault(); this.openRosterDrawer(); });
    html.find("[data-action='close-roster-drawer'], [data-action='close-roster-sidecar']").on("click", (event) => { event.preventDefault(); this.closeRosterDrawer(); });
    html.find("[data-action='toggle-roster-drawer']").on("click", (event) => { event.preventDefault(); this.toggleRosterDrawer(); });
    html.find("[data-action='open-actions-drawer'], [data-action='open-actions-sidecar']").on("click", (event) => { event.preventDefault(); this.openActionsDrawer(event.currentTarget.dataset.drawer); });
    html.find("[data-action='close-actions-drawer'], [data-action='close-actions-sidecar']").on("click", (event) => { event.preventDefault(); this.closeActionsDrawer(); });
    html.find("[data-action='toggle-actions-drawer']").on("click", (event) => { event.preventDefault(); this.toggleActionsDrawer(event.currentTarget.dataset.drawer); });
    html.find("[data-action='toggle-info-popover']").on("click", (event) => { event.preventDefault(); event.stopPropagation(); this.isInfoPopoverOpen = !this.isInfoPopoverOpen; this.render(false); });
    html.find("[data-action='minimize-overlay']").on("click", (event) => { event.preventDefault(); event.stopPropagation(); this.toggleMinimizedState(); });
    html.find("[data-action='close-overlay']").on("click", async (event) => { event.preventDefault(); event.stopPropagation(); await this.close(); });

    html.find("[data-action='adjust-resource']").on("click", async (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const resource = event.currentTarget.dataset.resource;
      const delta = event.currentTarget.dataset.delta;
      await this.adjustActorResource(actorId, resource, delta);
    });

    html.find("[data-action='set-resource']").on("change", async (event) => {
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const resource = event.currentTarget.dataset.resource;
      await this.setActorResourceValue(actorId, resource, event.currentTarget.value);
    });

    html.find("[data-action='set-resource']").on("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      event.currentTarget.blur();
    });

    html.find("[data-action='primary-roll-select']").on("change", (event) => {
      const key = String(event.currentTarget.value || "");
      if (!PRIMARY_ROLL_OPTIONS.some((option) => option.key === key)) return;
      this.primaryRollKey = key;
      const selectedOption = event.currentTarget.selectedOptions?.[0];
      const valueDisplay = selectedOption?.dataset?.value ?? "—";
      const chip = event.currentTarget.closest?.(".qd31-primary-roll-chip");
      const valueElement = chip?.querySelector?.(".qd31-primary-roll-value");
      if (valueElement) valueElement.textContent = valueDisplay;
    });

    html.find("[data-action='roll-primary-attribute']").on("click", async (event) => {
      event.preventDefault();
      await this.rollPrimaryAttribute(event);
    });

    html.find("[data-action='secondary-roll-select']").on("change", (event) => {
      const key = String(event.currentTarget.value || "");
      if (!SECONDARY_ROLL_OPTIONS.some((option) => option.key === key)) return;
      this.secondaryRollKey = key;
      const selectedOption = event.currentTarget.selectedOptions?.[0];
      const valueDisplay = selectedOption?.dataset?.value ?? "—";
      const chip = event.currentTarget.closest?.(".qd31-secondary-roll-chip");
      const valueElement = chip?.querySelector?.(".qd31-secondary-roll-value");
      if (valueElement) valueElement.textContent = valueDisplay;
    });

    html.find("[data-action='roll-secondary-attribute']").on("click", async (event) => {
      event.preventDefault();
      await this.rollSecondaryAttribute(event);
    });

    html.find("[data-action='roll-defense']").on("click", async (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const defense = event.currentTarget.dataset.defense;
      const value = event.currentTarget.dataset.value;
      if (!actorId || !defense) return;

      const label = `Roll ${defense}`;
      await this.triggerCombatRoll(actorId, {
        type: "defense",
        defense,
        label,
        value
      });
    });

    html.find("[data-action='target-opponent']").on("click", (event) => {
      event.preventDefault();
      const attackIndex = Number(event.currentTarget.dataset.attackIndex);
      if (Number.isNaN(attackIndex)) return;

      try {
        this.startTargetOpponentMode(attackIndex);
      } catch (error) {
        console.warn("gurps-quickdeck | Failed to start target opponent mode.", error);
        this.cancelTargetOpponentMode({ render: false, restore: true });
        ui.notifications?.warn("QuickDeck: Could not start targeting mode.");
      }
    });
    html.find("[data-action='target-action']").on("click", (event) => {
      event.preventDefault();
      this.startTargetOpponentMode(-1);
    });

    html.find("[data-action='open-modifier-bucket']").on("click", (event) => {
      event.preventDefault();
      this.openNativeModifierBucket(event.currentTarget.dataset.actorId, event);
    });

    html.find("[data-action='open-chat']").on("click", (event) => {
      event.preventDefault();
      this.scheduleChatFocus();
    });

    html.find("[data-action='clear-targets']").on("click", (event) => {
      event.preventDefault();
      this.clearUserTargets();
    });

    html.find("[data-action='next-actor']").on("click", (event) => {
      event.preventDefault();
      this.activateNextRosterActor();
    });

    html.find("[data-action='repeat-last-attack']").on("click", async (event) => {
      event.preventDefault();
      await this.repeatLastAttack(event);
    });

    html.find("[data-action='roll-attack']").on("click", async (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const attackIndex = Number(event.currentTarget.dataset.attackIndex);
      if (!actorId || Number.isNaN(attackIndex)) {
        console.warn("gurps-quickdeck | Missing actorId or attackIndex for attack click.", { actorId, attackIndex });
        return;
      }

      const actor = game.actors.get(actorId);
      if (!actor) {
        console.warn("gurps-quickdeck | Attack click ignored: actor not found.", { actorId, attackIndex });
        return;
      }
      const attacks = this.getDerivedActorData(actor).attacks;
      const attack = attacks[attackIndex];
      if (!attack) {
        console.warn("gurps-quickdeck | Attack click ignored: attack not found.", { actorId, attackIndex });
        return;
      }


      const handled = await this.executeNativeAttack(actor, attack, attackIndex, event);
      if (!handled) {
        ui.notifications?.warn("QuickDeck: Could not route attack through GURPS handleRoll/OTF. Falling back to QuickDeck roll.");
        await this.triggerCombatRoll(actor.id, {
          type: "attack",
          label: `Attack (${attack.name})`,
          value: attack.level,
          attackName: attack.name,
          attackType: attack.type,
          attack
        });
        this.scheduleChatFocus();
      }
    });

    html.find("[data-action='roll-damage']").on("click", async (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const attackIndex = Number(event.currentTarget.dataset.attackIndex);
      if (!actorId || Number.isNaN(attackIndex)) return;
      await this.triggerDamageRoll(actorId, attackIndex);
    });

    html.find("[data-action='roll-skill']").on("click", async (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const skillIndex = Number(event.currentTarget.dataset.skillIndex);
      if (!actorId || Number.isNaN(skillIndex)) return;

      const actor = game.actors.get(actorId);
      const skill = this.getDerivedActorData(actor).skills[skillIndex];
      if (!actor || !skill) return;

      const dataset = this.getSheetSkillDataset(skill);
      const targets = Array.from(game.user?.targets ?? []);
      const handled = await this.triggerNativeSheetRoll(actor, dataset, {
        event,
        targets,
        label: "skill"
      });
      if (handled) return;

      ui.notifications?.warn("QuickDeck: Could not route skill through GURPS handleRoll/OTF. Falling back to QuickDeck roll.");
      const value =
        skill.level ??
        this.getFirstDefinedValue(skill.raw, ["level", "import", "value", "rsl"]);

      await this.triggerCombatRoll(actorId, {
        type: "skill",
        label: `Roll Skill (${skill.name})`,
        value,
        skillName: skill.name,
        skill
      });
    });

    html.find("[data-action='roll-spell']").on("click", async (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId || this.activeActorId;
      const spellIndex = Number(event.currentTarget.dataset.spellIndex);
      if (!actorId || Number.isNaN(spellIndex)) return;

      const actor = game.actors.get(actorId);
      const spell = this.getDerivedActorData(actor).spells[spellIndex];
      if (!actor || !spell) return;

      const dataset = this.getSheetSpellDataset(spell);
      const targets = Array.from(game.user?.targets ?? []);
      const handled = await this.triggerNativeSheetRoll(actor, dataset, {
        event,
        targets,
        label: "spell"
      });

      if (!handled) {
        ui.notifications?.warn("QuickDeck: Could not route spell through GURPS handleRoll/OTF.");
      }
    });

    html.find("[data-action='open-reference']").on("click", (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const type = String(element.dataset.refType ?? "rule");
      const name = String(element.dataset.refName ?? "Reference");
      const pageHint = element.dataset.refPage ?? "";
      const source = element.dataset.refSource ?? "";
      this.openReferenceEntry({ type, name, pageHint, source });
    });

    html.find("[data-action='pdf-map-key']").on("input", (event) => {
      const input = event.currentTarget;
      const raw = String(input.value ?? "");
      const nextKey = this.normalizePdfMapKey(raw);
      this.pdfMapDraft.key = nextKey;

      if (input.value !== nextKey) input.value = nextKey;

      const nameInput = html.find("[data-action='pdf-map-name']")[0];
      if (nameInput && !String(nameInput.value || "").trim()) {
        const defaultName = this.getDefaultPdfMapName(nextKey);
        if (defaultName) {
          this.pdfMapDraft.name = defaultName;
          nameInput.value = defaultName;
        }
      }
    });
    html.find("[data-action='pdf-map-name']").on("input", (event) => {
      this.pdfMapDraft.name = String(event.currentTarget.value ?? "");
    });
    html.find("[data-action='pdf-map-path']").on("input", (event) => {
      this.pdfMapDraft.path = String(event.currentTarget.value ?? "");
    });
    html.find("[data-action='pdf-map-offset']").on("input", (event) => {
      const parsed = Number.parseInt(event.currentTarget.value, 10);
      this.pdfMapDraft.offset = Number.isFinite(parsed) ? parsed : 0;
    });
    html.find("[data-action='choose-pdf-source']").on("click", (event) => {
      event.preventDefault();
      new FilePicker({
        type: "any",
        current: this.pdfMapDraft.path || "",
        callback: (path) => {
          this.pdfMapDraft.path = path;
          if (!String(path).toLowerCase().endsWith(".pdf")) ui.notifications?.warn("QuickDeck: Selected file does not end in .pdf.");
          this.render(false);
        }
      }).render(true);
    });
    html.find("[data-action='save-pdf-source']").on("click", async (event) => {
      event.preventDefault();
      const key = this.normalizePdfMapKey(this.pdfMapDraft.key);
      const path = String(this.pdfMapDraft.path || "").trim();
      if (!key) return ui.notifications?.warn("QuickDeck: PDF source key is required.");
      if (!path) return ui.notifications?.warn("QuickDeck: PDF path is required.");
      if (!path.toLowerCase().endsWith(".pdf")) return ui.notifications?.warn("QuickDeck: PDF path must end in .pdf.");
      const mappings = this.getPdfPageRefMappings();
      mappings[key] = {
        name: String(this.pdfMapDraft.name || this.getDefaultPdfMapName(key) || key),
        path,
        offset: Number.isFinite(Number.parseInt(this.pdfMapDraft.offset, 10)) ? Number.parseInt(this.pdfMapDraft.offset, 10) : 0
      };
      await this.savePdfPageRefMappings(mappings);
      this.clearPdfMapDraft();
      this.render(false);
    });
    html.find("[data-action='clear-pdf-source-draft']").on("click", (event) => {
      event.preventDefault();
      this.clearPdfMapDraft();
      this.render(false);
    });
    html.find("[data-action='edit-pdf-source']").on("click", (event) => {
      event.preventDefault();
      const key = this.normalizePdfMapKey(event.currentTarget.dataset.key);
      const mapping = this.getPdfPageRefMappings()[key];
      if (!mapping) return;
      this.pdfMapDraft = { key, name: String(mapping.name ?? ""), path: String(mapping.path ?? ""), offset: Number(mapping.offset) || 0 };
      this.render(false);
    });
    html.find("[data-action='remove-pdf-source']").on("click", async (event) => {
      event.preventDefault();
      const key = this.normalizePdfMapKey(event.currentTarget.dataset.key);
      const mappings = this.getPdfPageRefMappings();
      if (!mappings[key]) return;
      delete mappings[key];
      await this.savePdfPageRefMappings(mappings);
      this.render(false);
    });
    html.find("[data-action='test-pdf-source']").on("click", (event) => {
      event.preventDefault();
      this.openMappedPdfReference(event.currentTarget.dataset.key, 1, { notify: true });
    });

    const dropTarget = html.find("[data-drop-zone='roster']")[0];
    if (!dropTarget) {
      this.bringReferenceAppToFrontSoon();
      return;
    }

    dropTarget.addEventListener("dragenter", (event) => {
      event.preventDefault();
      this.isDragOverRoster = true;
      this.render(false);
    });

    dropTarget.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (!this.isDragOverRoster) {
        this.isDragOverRoster = true;
        this.render(false);
      }
    });

    dropTarget.addEventListener("dragleave", (event) => {
      event.preventDefault();
      if (event.currentTarget?.contains(event.relatedTarget)) return;
      this.isDragOverRoster = false;
      this.render(false);
    });

    dropTarget.addEventListener("drop", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.isDragOverRoster = false;

      try {
        const actor = await this.resolveActorFromDropData(event);
        if (!actor?.id) return;

        if (this.rosterActorIds.includes(actor.id)) {
          console.warn("gurps-quickdeck | Ignored duplicate dropped actor.", actor.name);
          return;
        }

        this.ensureActorTab(actor.id);
        console.log("gurps-quickdeck | Actor dropped", actor.name);
        this.render();
      } catch (error) {
        console.warn("gurps-quickdeck | Failed to process dropped actor.", error);
      }
    });

    this.applyAvailableActorFilter(html);
    this.applyCombatFilter(html);
    this.applySkillsFilter(html);
    this.applyQuickSkillsFilter(html);
    this.applySpellsFilter(html);
    this.bringReferenceAppToFrontSoon();
  }

}
