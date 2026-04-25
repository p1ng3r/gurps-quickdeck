const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/quickdeck.hbs";
const DEBUG = false;

export class QuickDeckApp extends Application {
  constructor(options = {}) {
    super(options);
    this.rosterActorIds = [];
    this.activeActorId = null;
    this.activeDrawer = null;
    this.availableSearch = "";
    this._actorSelectTimeout = null;
    this.isDragOverRoster = false;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "gurps-quickdeck-app",
      classes: ["gurps-quickdeck"],
      popOut: true,
      minimizable: true,
      resizable: true,
      width: 840,
      height: 560,
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
    if (!actorId || !game.actors.has(actorId)) return;
    if (!this.rosterActorIds.includes(actorId)) {
      this.rosterActorIds.push(actorId);
    }
    this.activeActorId = actorId;
  }

  clearRoster() {
    this.rosterActorIds = [];
    this.activeActorId = null;
  }

  removeActorFromRoster(actorId) {
    if (!actorId) return;

    const previousLength = this.rosterActorIds.length;
    this.rosterActorIds = this.rosterActorIds.filter((id) => id !== actorId);
    if (this.rosterActorIds.length === previousLength) return;

    if (this.activeActorId === actorId) {
      this.activeActorId = this.rosterActorIds[0] ?? null;
    }
  }

  onActorDeleted(actorId) {
    this.removeActorFromRoster(actorId);
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
        continue;
      }

      if (Array.isArray(current)) {
        for (const value of current) stack.push(value);
      } else {
        for (const value of Object.values(current)) stack.push(value);
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
    return this.objectHasAnyPath(value, [
      "name",
      "level",
      "relativeLevel",
      "rsl",
      "points",
      "pts",
      "import"
    ]);
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

  normalizeSkill(skill) {
    if (!skill || typeof skill !== "object") return null;

    const name =
      this.getFirstDefinedValue(skill, ["name", "label", "skill", "title"]) ??
      "Unnamed Skill";

    return {
      name,
      level: this.getFirstDefinedValue(skill, ["level", "value", "import", "rsl"]),
      relativeLevel: this.getFirstDefinedValue(skill, [
        "relativeLevel",
        "relative",
        "rsl",
        "relative_level"
      ]),
      points: this.getFirstDefinedValue(skill, ["points", "pts", "spent", "cp"])
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
      const entries = this.collectNestedMatches(collection, (entry) =>
        this.isAttackLike(entry)
      );

      for (const entry of entries) {
        const normalized = this.normalizeAttack(entry, source.type);
        if (normalized) attacks.push(normalized);
      }
    }

    return attacks;
  }

  extractSkills(actor) {
    if (!actor) return [];

    const skillSources = [
      "system.skills",
      "data.data.skills",
      "system.traits.skills"
    ];

    const skills = [];

    for (const path of skillSources) {
      const collection = foundry.utils.getProperty(actor, path);
      const entries = this.collectNestedMatches(collection, (entry) =>
        this.isSkillLike(entry)
      );

      for (const entry of entries) {
        const normalized = this.normalizeSkill(entry);
        if (normalized) skills.push(normalized);
      }
    }

    return skills;
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

    actor.sheet.render(true);
  }

  parseRollTarget(value) {
    if (value === undefined || value === null || value === "") return null;
    const match = String(value).match(/-?\d+/);
    return match ? Number(match[0]) : null;
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

  async tryGurpsRoll(actor, rollContext) {
    const numericTarget = this.parseRollTarget(rollContext.value);

    const actorPaths = [
      "rollSkill",
      "rollAttribute",
      "rollTest",
      "rollAgainst",
      "roll",
      "system.rollSkill",
      "system.rollTest",
      "system.rollAgainst"
    ];
    for (const path of actorPaths) {
      const succeeded = await this.callIfFunction(actor, path, rollContext, numericTarget);
      if (succeeded) return true;
    }

    const gurpsPaths = ["performAction", "roll", "rollSkill", "doRoll"];
    for (const path of gurpsPaths) {
      const succeeded = await this.callIfFunction(
        game.GURPS,
        path,
        actor,
        rollContext,
        numericTarget
      );
      if (succeeded) return true;
    }

    return false;
  }

  async createFallbackRollChat(actor, rollContext) {
    const speaker = ChatMessage.getSpeaker({ actor });
    const targetLabel = rollContext.value ?? "—";
    const content = `
      <div class="gurps-quickdeck-roll-fallback">
        <h3>QuickDeck Roll</h3>
        <p><strong>Actor:</strong> ${actor?.name ?? "Unknown"}</p>
        <p><strong>Roll:</strong> ${rollContext.label}</p>
        <p><strong>Target:</strong> ${targetLabel}</p>
      </div>
    `;

    await ChatMessage.create({
      speaker,
      content
    });
  }

  async triggerCombatRoll(actorId, rollContext) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    if (!rollContext?.label) return;

    const usedSystemRoll = await this.tryGurpsRoll(actor, rollContext);
    if (usedSystemRoll) return;
    await this.createFallbackRollChat(actor, rollContext);
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
    if (!transfer) return null;

    const rawText = transfer.getData("text/plain");
    const parsedPayload = this.parseDropPayload(rawText);
    const payload = parsedPayload && typeof parsedPayload === "object" ? parsedPayload : null;

    const rawLooksLikeUuid = typeof rawText === "string" && rawText.includes("Actor.");
    const type = payload?.type ?? payload?.documentName ?? payload?.data?.type ?? null;
    const uuid = payload?.uuid ?? payload?.data?.uuid ?? payload?.actorUuid ?? null;
    const actorId = payload?.id ?? payload?.actorId ?? payload?.data?._id ?? payload?.data?.id ?? null;

    const isActorPayload = !type || type === "Actor";

    if (typeof fromUuid === "function" && (uuid || rawLooksLikeUuid)) {
      try {
        const uuidValue = uuid ?? rawText;
        const resolvedDocument = await fromUuid(uuidValue);
        if (resolvedDocument?.documentName === "Actor" || resolvedDocument instanceof Actor) {
          return resolvedDocument;
        }
      } catch (error) {
        console.warn("gurps-quickdeck | Failed to resolve dropped UUID.", error);
      }
    }

    if (isActorPayload && actorId) {
      const actor = game.actors.get(actorId);
      if (actor) return actor;
    }

    return null;
  }

  getData() {
    const allActors = this.getCombatActors();
    const allActorIds = new Set(allActors.map((actor) => actor.id));
    this.rosterActorIds = this.rosterActorIds.filter((id) => allActorIds.has(id));

    if (this.activeActorId && !this.rosterActorIds.includes(this.activeActorId)) {
      this.activeActorId = null;
    }
    if (!this.activeActorId && this.rosterActorIds.length > 0) {
      this.activeActorId = this.rosterActorIds[0];
    }

    const rosterActors = this.rosterActorIds
      .map((id) => game.actors.get(id))
      .filter((actor) => actor && actor.id);

    const search = this.availableSearch.trim().toLowerCase();
    const availableActors = allActors
      .filter((actor) => {
        if (!search) return true;
        return (actor.name ?? "").toLowerCase().includes(search);
      })
      .map((actor) => ({
        id: actor.id,
        name: actor.name,
        img: actor.img || "icons/svg/mystery-man.svg",
        actorType: actor.type ? String(actor.type) : null,
        isInRoster: this.rosterActorIds.includes(actor.id)
      }));

    const activeActor = this.getActiveActor();
    const attacks = this.extractAttacks(activeActor);
    const skills = this.extractSkills(activeActor);
    if (DEBUG) {
      const meleeCount = attacks.filter((attack) => attack.type === "Melee").length;
      const rangedCount = attacks.filter((attack) => attack.type === "Ranged").length;
      console.log("gurps-quickdeck | Extraction debug", {
        activeActor: activeActor?.name ?? null,
        meleeCount,
        rangedCount,
        skillsCount: skills.length
      });
    }
    const dodge = foundry.utils.getProperty(activeActor, "system.currentdodge") ?? null;
    const bestParry = this.getBestAttackDefense(attacks, "parry");
    const bestBlock = this.getBestAttackDefense(attacks, "block");

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
      skills,
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
      availableSearch: this.availableSearch,
      availableActors,
      rosterCount: rosterActors.length,
      availableCount: availableActors.length,
      rosterActors: rosterActors.map((actor) => ({
        id: actor.id,
        name: actor.name,
        img: actor.img || "icons/svg/mystery-man.svg",
        actorType: actor.type ? String(actor.type) : null,
        isActive: actor.id === this.activeActorId
      })),
      activeActor: activeActor
        ? {
            id: activeActor.id,
            name: activeActor.name,
            img: activeActor.img || "icons/svg/mystery-man.svg",
            actorType: activeActor.type ? String(activeActor.type) : null
          }
        : null,
      gurpsData,
      hasAvailableActors: availableActors.length > 0,
      hasRosterActors: rosterActors.length > 0,
      activeDrawer: this.activeDrawer,
      isCombatDrawerOpen: this.activeDrawer === "combat",
      isSkillsDrawerOpen: this.activeDrawer === "skills",
      isDragOverRoster: this.isDragOverRoster,
      attackCount: attacks.length,
      skillsCount: skills.length,
      indexedSkills: skills.map((skill, index) => ({
        ...skill,
        index
      })),
      indexedAttacks: attacks.map((attack, index) => ({
        ...attack,
        index
      }))
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='add-actor']").on("click", (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId;
      if (!actorId || !game.actors.has(actorId)) return;

      this.ensureActorTab(actorId);
      this.render();
    });

    html.find("[data-action='clear-roster']").on("click", (event) => {
      event.preventDefault();
      this.clearRoster();
      this.render();
    });

    html.find("[data-action='open-sheet']").on("click", (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId;
      if (!actorId || !game.actors.has(actorId)) return;
      this.openActorSheet(actorId);
    });

    html.find("[data-action='remove-actor']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const actorId = event.currentTarget.dataset.actorId;
      if (!actorId) return;

      this.removeActorFromRoster(actorId);
      this.render();
    });

    html.find("[data-action='open-actor']").on("click", (event) => {
      event.preventDefault();
      if (event.detail > 1) return;
      const actorId = event.currentTarget.dataset.actorId;
      if (!actorId || !game.actors.has(actorId)) return;

      if (this._actorSelectTimeout) clearTimeout(this._actorSelectTimeout);
      this._actorSelectTimeout = window.setTimeout(() => {
        this.activeActorId = actorId;
        this.render();
        this._actorSelectTimeout = null;
      }, 225);
    });

    html.find("[data-action='open-actor']").on("dblclick", (event) => {
      event.preventDefault();
      if (this._actorSelectTimeout) {
        clearTimeout(this._actorSelectTimeout);
        this._actorSelectTimeout = null;
      }
      const actorId = event.currentTarget.dataset.actorId;
      if (!actorId || !game.actors.has(actorId)) return;

      this.activeActorId = actorId;
      this.openActorSheet(actorId);
      this.render();
    });

    html.find("[data-action='available-search']").on("input", (event) => {
      const searchValue = event.currentTarget?.value;
      this.availableSearch = typeof searchValue === "string" ? searchValue : "";
      this.render();
    });

    html.find("[data-action='toggle-drawer']").on("click", (event) => {
      event.preventDefault();
      const drawer = event.currentTarget.dataset.drawer;
      if (!drawer) return;

      this.activeDrawer = this.activeDrawer === drawer ? null : drawer;
      this.render();
    });

    html.find("[data-action='roll-defense']").on("click", async (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId;
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

    html.find("[data-action='roll-attack']").on("click", async (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId;
      const attackIndex = Number(event.currentTarget.dataset.attackIndex);
      if (!actorId || Number.isNaN(attackIndex)) return;

      const actor = game.actors.get(actorId);
      const attacks = this.extractAttacks(actor);
      const attack = attacks[attackIndex];
      if (!attack) return;

      const value =
        attack.level ??
        this.getFirstDefinedValue(attack.raw, ["skill", "level", "roll", "import"]);

      await this.triggerCombatRoll(actorId, {
        type: "attack",
        label: `Roll Attack (${attack.name})`,
        value,
        attackName: attack.name,
        attackType: attack.type,
        attack
      });
    });

    const dropTarget = html.find("[data-drop-zone='roster']")[0];
    if (!dropTarget) return;

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
      this.isDragOverRoster = false;
      const actor = await this.resolveActorFromDropData(event);
      if (actor?.id) {
        this.ensureActorTab(actor.id);
      }
      this.render();
    });
  }
}
