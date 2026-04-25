import { QuickDeckApp } from "./quickdeck-app.js";

const MODULE_ID = "gurps-quickdeck";
let quickDeckApp = null;

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
    }
  };
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
