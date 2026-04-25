const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/quickdeck.hbs";

export class QuickDeckApp extends Application {
  constructor(options = {}) {
    super(options);
    this.openTabs = [];
    this.activeActorId = null;
    this.isCombatPanelCollapsed = false;
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

  getCombatActors() {
    return game.actors
      .filter((actor) => {
        if (!actor || !actor.id) return false;
        return typeof actor.sheet?.render === "function";
      })
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

  toDisplayValue(value) {
    return value === undefined || value === null || value === "" ? "—" : value;
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

  openActorSheet(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    if (typeof actor.sheet?.render !== "function") return;

    actor.sheet.render(true);
  }

  getData() {
    const actors = this.getCombatActors();

    // Keep tabs in sync with actors currently available.
    this.openTabs = this.openTabs.filter((id) => game.actors.has(id));

    if (!this.activeActorId && actors.length > 0) {
      this.activeActorId = actors[0].id;
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
    const attacks = this.extractAttacks(activeActor);
    const dodge = foundry.utils.getProperty(activeActor, "system.currentdodge") ?? null;
    const bestParry = this.getBestAttackDefense(attacks, "parry");
    const bestBlock = this.getBestAttackDefense(attacks, "block");

    // Defensive GURPS data access: these paths may vary or be absent.
    const gurpsData = {
      hp: foundry.utils.getProperty(activeActor, "system.HP.value") ?? null,
      fp: foundry.utils.getProperty(activeActor, "system.FP.value") ?? null,
      move: foundry.utils.getProperty(activeActor, "system.basicmove.value") ?? null,
      dodge,
      defenses: {
        dodge,
        parry: bestParry,
        block: bestBlock
      },
      attacks,
      display: {
        hp: this.toDisplayValue(foundry.utils.getProperty(activeActor, "system.HP.value")),
        fp: this.toDisplayValue(foundry.utils.getProperty(activeActor, "system.FP.value")),
        move: this.toDisplayValue(
          foundry.utils.getProperty(activeActor, "system.basicmove.value")
        ),
        dodge: this.toDisplayValue(dodge),
        parry: this.toDisplayValue(bestParry),
        block: this.toDisplayValue(bestBlock)
      }
    };

    return {
      actors: actors.map((actor) => ({
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
      hasActors: actors.length > 0,
      isCombatPanelCollapsed: this.isCombatPanelCollapsed
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

    html.find("[data-action='open-actor']").on("dblclick", (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId;
      if (!actorId || !game.actors.has(actorId)) return;

      this.openActorSheet(actorId);
    });

    html.find("[data-action='activate-tab']").on("click", (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId;
      if (!actorId || !game.actors.has(actorId)) return;

      this.activeActorId = actorId;
      this.render();
    });

    html.find("[data-action='toggle-combat-panel']").on("click", (event) => {
      event.preventDefault();
      this.isCombatPanelCollapsed = !this.isCombatPanelCollapsed;
      this.render();
    });
  }
}
