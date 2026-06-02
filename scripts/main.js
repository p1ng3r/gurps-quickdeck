import { REFERENCE_INDEX_SETTING_KEY } from "./reference-index-store.js";
import { QuickDeckApp } from "./quickdeck-app.js";

const MODULE_ID = "gurps-quickdeck";
const SETTING_KEYS = {
  ROSTER: "rosterActorIds",
  QUICK_SKILLS: "quickSkillSelectionsByActor",
  COMBAT_FAVORITES: "combatFavoriteAttackKeysByActor",
  SPELL_FAVORITES: "spellFavoriteKeysByActor",
  PINNED_ACTIONS: "pinnedActionsByActor",
  DEFAULT_DRAWER: "defaultDrawer",
  UI_MODE: "uiMode",
  MINIMIZED: "isMinimized",
  RESTORE_PILL_POSITION: "restorePillPosition",
  DEV_ART_TUNER_ENABLED: "devArtTunerEnabled",
  REFERENCE_INDEX: REFERENCE_INDEX_SETTING_KEY,
  PDF_PAGE_REF_MAPPINGS: "pdfPageRefMappings"
};
let quickDeckApp = null;
function openQuickDeck() {
  if (!quickDeckApp) {
    quickDeckApp = new QuickDeckApp();
  }

  quickDeckApp.isMinimized = false;
  quickDeckApp.persistMinimizedState?.();
  quickDeckApp.removeFloatingRestoreIcon?.();

  const existingOverlay = document.getElementById("gurps-quickdeck-overlay");
  if (existingOverlay && existingOverlay !== quickDeckApp._overlayRoot) existingOverlay.remove();

  quickDeckApp.render(true);
  void quickDeckApp.renderOverlay?.();
  quickDeckApp.syncMinimizedPresentation?.();

  return quickDeckApp;
}

function renderQuickDeckIfOpen() {
  if (!quickDeckApp?.rendered || quickDeckApp?.isMinimized) return;
  quickDeckApp.render(false, { focus: false });
  quickDeckApp.scheduleNativeWindowFocusAfterRender?.();
}

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
  game.gurpsQuickDeckDebug = {
    open: () => openQuickDeck(),
    forceOpen: () => openQuickDeck(),
    dumpActiveActorData: () => {
      if (!quickDeckApp) {
        console.warn(`${MODULE_ID} | QuickDeck is not open; open it first to dump active actor data.`);
        return;
      }
      quickDeckApp.dumpActiveActorData();
    },
  };
});

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING_KEYS.ROSTER, {
    name: "QuickDeck Roster",
    hint: "Client-side saved actor IDs for your QuickDeck roster.",
    scope: "client",
    config: false,
    type: String,
    default: "[]"
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.QUICK_SKILLS, {
    name: "QuickDeck Skill Pins",
    hint: "Client-side saved Quick Skills per actor.",
    scope: "client",
    config: false,
    type: String,
    default: "{}"
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.COMBAT_FAVORITES, {
    name: "QuickDeck Combat Favorites",
    hint: "Client-side saved favorite combat attack keys per actor.",
    scope: "client",
    config: false,
    type: String,
    default: "{}"
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.SPELL_FAVORITES, {
    name: "QuickDeck Spell Favorites",
    hint: "Client-side saved favorite spell keys per actor.",
    scope: "client",
    config: false,
    type: String,
    default: "{}"
  });
  game.settings.register(MODULE_ID, SETTING_KEYS.PINNED_ACTIONS, {
    name: "QuickDeck Pinned Actions",
    hint: "Client-side saved pinned quick actions per actor.",
    scope: "client",
    config: false,
    type: String,
    default: "{}"
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.DEFAULT_DRAWER, {
    name: "Default QuickDeck Drawer",
    hint: "Drawer opened by default when QuickDeck has no active drawer.",
    scope: "client",
    config: true,
    type: String,
    choices: {
      none: "None",
      combat: "Combat",
      skills: "Skills",
      "quick-skills": "Quick Skills",
      spells: "Spells"
    },
    default: "none"
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.UI_MODE, {
    name: "QuickDeck UI Mode",
    hint: "Client-side QuickDeck interface mode. UI2 is experimental.",
    scope: "client",
    config: false,
    type: String,
    choices: {
      ui1: "UI1 / Current UI",
      ui2: "UI2 / Experimental UI"
    },
    default: "ui1"
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.MINIMIZED, {
    name: "QuickDeck Minimized State",
    hint: "Whether QuickDeck opens in minimized icon mode for this client.",
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.RESTORE_PILL_POSITION, {
    name: "QuickDeck Restore Pill Position",
    hint: "Client-side saved top/left position for the minimized QuickDeck restore pill.",
    scope: "client",
    config: false,
    type: String,
    default: "null"
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.DEV_ART_TUNER_ENABLED, {
    name: "QuickDeck Dev Art Tuner Enabled",
    hint: "Client-side toggle for the developer-only QuickDeck art/layout tuner controls.",
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });



  game.settings.register(MODULE_ID, SETTING_KEYS.REFERENCE_INDEX, {
    name: "QuickDeck Local Overrides Metadata",
    hint: "Client-side JSON list of manual local override entries used by QuickDeck Reference.",
    scope: "client",
    config: false,
    type: String,
    default: "[]"
  });
  game.settings.register(MODULE_ID, SETTING_KEYS.PDF_PAGE_REF_MAPPINGS, {
    name: "PDF Page Reference Mappings",
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });

});

function injectQuickDeckActorDirectoryButton(html) {
  const root = html?.[0] ?? html;
  if (!root) return;

  /*
   * Foundry v13/sidebar markup can vary by theme/system/module.
   * The old hook only used .header-actions, so the launcher vanished if that
   * exact container was not present. Try the normal action strip first, then
   * fall back to the directory header itself.
   */
  const headerActions =
    root.querySelector(".header-actions")
    ?? root.querySelector(".directory-header .header-actions")
    ?? root.querySelector(".directory-header")
    ?? root.querySelector("header")
    ?? root;

  if (!headerActions) return;

  if (root.querySelector(`[data-action='${MODULE_ID}-open']`)) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("quickdeck-open-button");
  button.dataset.action = `${MODULE_ID}-open`;
  button.title = "Open GURPS QuickDeck";
  button.setAttribute("aria-label", "Open GURPS QuickDeck");
  button.innerHTML = '<i class="fas fa-id-card"></i> QD Run';
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openQuickDeck();
  });

  headerActions.appendChild(button);
}

Hooks.on("renderActorDirectory", (_app, html) => {
  injectQuickDeckActorDirectoryButton(html);
});

Hooks.on("deleteActor", (actor) => {
  if (!quickDeckApp) return;
  quickDeckApp.invalidateDerivedActorData(actor?.id);
  quickDeckApp.onActorDeleted(actor.id);
});

Hooks.on("updateActor", (actor) => {
  if (!quickDeckApp) return;
  quickDeckApp.invalidateDerivedActorData(actor?.id);
  renderQuickDeckIfOpen();
});

Hooks.on("createItem", (item) => {
  const actorId = item?.parent?.id ?? item?.actor?.id ?? null;
  if (!quickDeckApp || !actorId) return;
  quickDeckApp.invalidateDerivedActorData(actorId);
  renderQuickDeckIfOpen();
});

Hooks.on("updateItem", (item) => {
  const actorId = item?.parent?.id ?? item?.actor?.id ?? null;
  if (!quickDeckApp || !actorId) return;
  quickDeckApp.invalidateDerivedActorData(actorId);
  renderQuickDeckIfOpen();
});

Hooks.on("deleteItem", (item) => {
  const actorId = item?.parent?.id ?? item?.actor?.id ?? null;
  if (!quickDeckApp || !actorId) return;
  quickDeckApp.invalidateDerivedActorData(actorId);
  renderQuickDeckIfOpen();
});

function refreshQuickDeckOnCombatChange() {
  renderQuickDeckIfOpen();
}

let pendingModifierBucketRefresh = null;
function refreshQuickDeckOnModifierBucketChange() {
  if (!quickDeckApp?.rendered || quickDeckApp?.isMinimized) return;

  if (pendingModifierBucketRefresh) clearTimeout(pendingModifierBucketRefresh);
  pendingModifierBucketRefresh = setTimeout(() => {
    pendingModifierBucketRefresh = null;
    renderQuickDeckIfOpen();
  }, 0);
}

Hooks.on("renderModifierBucket", () => {
  refreshQuickDeckOnModifierBucketChange();
});

Hooks.on("updateCombat", () => {
  refreshQuickDeckOnCombatChange();
});

Hooks.on("updateCombatant", () => {
  refreshQuickDeckOnCombatChange();
});

Hooks.on("combatTurn", () => {
  refreshQuickDeckOnCombatChange();
});

Hooks.on("deleteCombat", () => {
  refreshQuickDeckOnCombatChange();
});
