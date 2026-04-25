const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/quickdeck.hbs";

export class QuickDeckApp extends Application {
  constructor(options = {}) {
    super(options);
    this.openTabs = [];
    this.activeActorId = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "gurps-quickdeck-app",
      classes: ["gurps-quickdeck"],
      popOut: true,
      minimizable: true,
      resizable: true,
      width: 720,
      height: 520,
      title: "GURPS QuickDeck",
      template: TEMPLATE_PATH
    });
  }

  getCharacterActors() {
    return game.actors
      .filter((actor) => actor.type === "character")
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  ensureActorTab(actorId) {
    if (!this.openTabs.includes(actorId)) {
      this.openTabs.push(actorId);
    }

    this.activeActorId = actorId;
  }

  onActorDeleted(actorId) {
    this.openTabs = this.openTabs.filter((id) => id !== actorId);

    if (this.activeActorId === actorId) {
      this.activeActorId = this.openTabs[0] ?? null;
    }

    this.render();
  }

  getActiveActor() {
    return this.activeActorId ? game.actors.get(this.activeActorId) : null;
  }

  getData() {
    const characters = this.getCharacterActors();

    // Keep tabs in sync with actors currently available.
    this.openTabs = this.openTabs.filter((id) => game.actors.has(id));

    if (!this.activeActorId && characters.length > 0) {
      this.activeActorId = characters[0].id;
      this.ensureActorTab(this.activeActorId);
    }

    const tabs = this.openTabs
      .map((id) => game.actors.get(id))
      .filter(Boolean)
      .map((actor) => ({
        id: actor.id,
        name: actor.name,
        img: actor.img || "icons/svg/mystery-man.svg",
        isActive: actor.id === this.activeActorId
      }));

    const activeActor = this.getActiveActor();

    // Defensive GURPS data access: these paths may vary or be absent.
    const gurpsData = {
      hp: foundry.utils.getProperty(activeActor, "system.HP.value") ?? null,
      fp: foundry.utils.getProperty(activeActor, "system.FP.value") ?? null,
      move: foundry.utils.getProperty(activeActor, "system.basicmove.value") ?? null,
      dodge: foundry.utils.getProperty(activeActor, "system.currentdodge") ?? null
    };

    return {
      characters: characters.map((actor) => ({
        id: actor.id,
        name: actor.name,
        img: actor.img || "icons/svg/mystery-man.svg",
        isActive: actor.id === this.activeActorId
      })),
      tabs,
      activeActor: activeActor
        ? {
            id: activeActor.id,
            name: activeActor.name,
            img: activeActor.img || "icons/svg/mystery-man.svg"
          }
        : null,
      gurpsData,
      hasCharacters: characters.length > 0
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='open-actor']").on("click", (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId;
      if (!actorId || !game.actors.has(actorId)) return;

      this.ensureActorTab(actorId);
      this.render();
    });

    html.find("[data-action='activate-tab']").on("click", (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId;
      if (!actorId || !game.actors.has(actorId)) return;

      this.activeActorId = actorId;
      this.render();
    });
  }
}
