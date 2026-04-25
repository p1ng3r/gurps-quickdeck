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

  normalizeAttack(attack, type) {
    if (!attack || typeof attack !== "object") return null;

    const name =
      this.getFirstDefinedValue(attack, [
        "name",
        "originalName",
        "mode",
        "attack",
        "usage"
      ]) ?? "Unnamed Attack";

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
        "notes"
      ]),
      reachOrRange:
        this.getFirstDefinedValue(
          attack,
          type === "Melee"
            ? ["reach", "meleeReach", "range", "distance"]
            : ["range", "accRange", "distance", "reach"]
        ) ?? null,
      parryOrBlock: this.getFirstDefinedValue(attack, [
        "parry",
        "block",
        "defense",
        "defence"
      ]),
      raw: attack
    };
  }

  extractAttacks(actor) {
    if (!actor) return [];

    const attackSources = [
      { path: "system.melee", type: "Melee" },
      { path: "system.ranged", type: "Ranged" },
      { path: "data.data.melee", type: "Melee" },
      { path: "data.data.ranged", type: "Ranged" }
    ];

    const attacks = [];

    for (const source of attackSources) {
      const collection = foundry.utils.getProperty(actor, source.path);
      const entries = this.getCollectionEntries(collection);

      for (const entry of entries) {
        const normalized = this.normalizeAttack(entry, source.type);
        if (normalized) attacks.push(normalized);
      }
    }

    return attacks;
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
      dodge: foundry.utils.getProperty(activeActor, "system.currentdodge") ?? null,
      attacks: this.extractAttacks(activeActor)
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
