import { QuickDeckPdfSourcesApp } from "./pdf-sources-app.js";
import { PDF_SOURCES_SETTING_KEY } from "./pdf-sources-store.js";
import { QuickDeckApp } from "./quickdeck-app.js";

const MODULE_ID = "gurps-quickdeck";
const SETTING_KEYS = {
  ROSTER: "rosterActorIds",
  QUICK_SKILLS: "quickSkillSelectionsByActor",
  DEFAULT_DRAWER: "defaultDrawer",
  PDF_IMPORT_PLACEHOLDER: "pdfImportPlaceholder",
  PDF_SOURCES: PDF_SOURCES_SETTING_KEY
};
let quickDeckApp = null;
let pdfSourcesApp = null;

function openPdfSourcesManager() {
  if (!pdfSourcesApp) {
    pdfSourcesApp = new QuickDeckPdfSourcesApp();
  }

  pdfSourcesApp.render(true);
  return pdfSourcesApp;
}

function openQuickDeck() {
  if (!quickDeckApp) {
    quickDeckApp = new QuickDeckApp();
  }

  quickDeckApp.render(true);
  return quickDeckApp;
}

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
  game.gurpsQuickDeckDebug = {
    open: () => openQuickDeck(),
    dumpActiveActorData: () => {
      if (!quickDeckApp) {
        console.warn(`${MODULE_ID} | QuickDeck is not open; open it first to dump active actor data.`);
        return;
      }
      quickDeckApp.dumpActiveActorData();
    },
    openPdfSources: () => openPdfSourcesManager()
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

  game.settings.register(MODULE_ID, SETTING_KEYS.PDF_IMPORT_PLACEHOLDER, {
    name: "QuickDeck PDF Import (Roadmap Placeholder)",
    hint: "Coming soon: users will import legally owned local PDFs for personal indexing. No copyrighted rulebook text is bundled.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, SETTING_KEYS.PDF_SOURCES, {
    name: "QuickDeck PDF Sources Metadata",
    hint: "Client-side JSON list of local source metadata used by QuickDeck Reference.",
    scope: "client",
    config: false,
    type: String,
    default: "[]"
  });
});

Hooks.on("renderActorDirectory", (app, html) => {
  const root = html?.[0] ?? html;
  if (!root) return;

  const headerActions = root.querySelector(".header-actions");
  if (!headerActions) return;

  if (headerActions.querySelector(`[data-action='${MODULE_ID}-open']`)) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("quickdeck-open-button");
  button.dataset.action = `${MODULE_ID}-open`;
  button.innerHTML = '<i class="fas fa-id-card"></i> QuickDeck';
  button.addEventListener("click", (event) => {
    event.preventDefault();
    openQuickDeck();
  });

  headerActions.appendChild(button);
});

Hooks.on("deleteActor", (actor) => {
  if (!quickDeckApp) return;
  quickDeckApp.onActorDeleted(actor.id);
});

function refreshQuickDeckOnCombatChange() {
  if (!quickDeckApp?.rendered) return;
  quickDeckApp.render(false);
}

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
