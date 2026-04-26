const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/quickdeck.hbs";
const DEBUG = false;

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
    this.quickSkillSelectionsByActor = {};
    this._actorSelectTimeout = null;
    this._searchRenderTimers = {};
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
    if (!value || typeof value !== "object") return false;

    const hasName = this.objectHasAnyPath(value, ["name"]);
    if (!hasName) return false;

    const hasRealSkillField = this.objectHasAnyPath(value, [
      "difficulty",
      "defaults",
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
      level: this.getFirstDefinedValue(skill, ["calc.level", "level", "value", "import", "rsl"]),
      relativeLevel: this.getFirstDefinedValue(skill, [
        "calc.rsl",
        "relativeLevel",
        "relative",
        "rsl",
        "relative_level"
      ]),
      points: this.getFirstDefinedValue(skill, ["points", "calc.points", "pts", "spent", "cp"]),
      raw: skill
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
  }

  filterAttacks(attacks, searchTerm) {
    const search = String(searchTerm ?? "").trim().toLowerCase();
    if (!search) return attacks;

    return attacks.filter((attack) => {
      const haystack = [
        attack.name,
        attack.type,
        attack.damage,
        attack.level,
        attack.reachOrRange,
        attack.parry,
        attack.block
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");
      return haystack.includes(search);
    });
  }

  filterSkills(skills, searchTerm) {
    const search = String(searchTerm ?? "").trim().toLowerCase();
    if (!search) return skills;

    return skills.filter((skill) => {
      const haystack = `${String(skill.name ?? "").toLowerCase()} ${String(skill.level ?? "").toLowerCase()}`;
      return haystack.includes(search);
    });
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
    const attackRaw = rollContext.attack?.raw ?? null;
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

    const contextualCandidates = [
      ...this.getObjectMethodCandidates(skillRaw, [actor, rollContext, numericTarget]),
      ...this.getObjectMethodCandidates(attackRaw, [actor, rollContext, numericTarget]),
      ...this.getObjectMethodCandidates(skillRaw, [rollContext, numericTarget]),
      ...this.getObjectMethodCandidates(attackRaw, [rollContext, numericTarget]),
      ...this.getObjectMethodCandidates(actor.sheet, [rollContext, numericTarget]),
      ...this.getObjectMethodCandidates(actor.system, [rollContext, numericTarget])
    ];

    const usedContextualRoll = await this.callAnyMethod(contextualCandidates);
    if (usedContextualRoll) return true;

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
      "roll",
      "system.rollSkill",
      "system.rollTest",
      "system.rollAgainst"
    ];
    const actorCandidates = actorPaths.flatMap((path) => [
      { context: actor, path, args: [rollContext, numericTarget] },
      { context: actor, path, args: [actionPayload] },
      { context: actor, path, args: [actionName, numericTarget] }
    ]);
    if (await this.callAnyMethod(actorCandidates)) return true;

    const gurpsPaths = [
      "performAction",
      "performItemAction",
      "handleRoll",
      "roll",
      "rollSkill",
      "rollAttack",
      "rollDefense",
      "doRoll"
    ];
    const gurpsCandidates = gurpsPaths.flatMap((path) => [
      { context: game.GURPS, path, args: [actionPayload] },
      { context: game.GURPS, path, args: [actor, rollContext, numericTarget] },
      { context: game.GURPS, path, args: [actor, actionName, numericTarget] }
    ]);
    if (await this.callAnyMethod(gurpsCandidates)) return true;

    if (rollContext.type === "skill") {
      console.warn("gurps-quickdeck | No GURPS-native skill roll method found, using 3d6 fallback.", {
        actor: actor?.name,
        skill: rollContext.skillName,
        rawSkillKeys: skillRaw && typeof skillRaw === "object" ? Object.keys(skillRaw).slice(0, 20) : [],
        hasActorSheet: Boolean(actor?.sheet)
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
      await roll.toMessage({ speaker, flavor, content });
      return;
    }

    await ChatMessage.create({
      speaker,
      flavor,
      rolls: roll ? [roll] : [],
      content
    });
  }

  async triggerCombatRoll(actorId, rollContext) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    if (!rollContext?.label) return;

    const usedSystemRoll = await this.tryGurpsRoll(actor, rollContext);
    if (usedSystemRoll) return;

    const target = this.parseRollTarget(rollContext.value);
    const roll = await new Roll("3d6").evaluate();
    await this.createFallbackRollChat(actor, rollContext, roll, target);
  }

  captureInputState(inputElement) {
    if (!inputElement) return null;
    return {
      action: inputElement.dataset.action ?? null,
      actorId: inputElement.dataset.actorId ?? null,
      resource: inputElement.dataset.resource ?? null,
      value: inputElement.value ?? "",
      selectionStart:
        typeof inputElement.selectionStart === "number" ? inputElement.selectionStart : null,
      selectionEnd:
        typeof inputElement.selectionEnd === "number" ? inputElement.selectionEnd : null
    };
  }

  async renderPreservingInput(inputState = null) {
    await this.render();
    if (!inputState?.action) return;

    let selector = `[data-action='${inputState.action}']`;
    if (inputState.actorId) selector += `[data-actor-id='${inputState.actorId}']`;
    if (inputState.resource) selector += `[data-resource='${inputState.resource}']`;
    const replacement = this.element?.find(selector)?.[0];
    if (!replacement) return;

    replacement.focus();
    if (
      typeof replacement.setSelectionRange === "function" &&
      inputState.selectionStart !== null &&
      inputState.selectionEnd !== null
    ) {
      replacement.setSelectionRange(inputState.selectionStart, inputState.selectionEnd);
    }
  }

  scheduleSearchRender(action, inputElement) {
    if (!action) return;
    const state = this.captureInputState(inputElement);
    if (this._searchRenderTimers[action]) clearTimeout(this._searchRenderTimers[action]);
    this._searchRenderTimers[action] = window.setTimeout(async () => {
      await this.renderPreservingInput(state);
      delete this._searchRenderTimers[action];
    }, 100);
  }

  async updateActorResource(actorId, resource, rawValue) {
    if (!actorId || !resource) return;
    const actor = game.actors.get(actorId);
    if (!actor) return;

    const trimmedValue = String(rawValue ?? "").trim();
    if (!trimmedValue) return;

    const parsed = Number(trimmedValue);
    if (!Number.isFinite(parsed)) return;

    const normalizedResource = String(resource).toLowerCase();
    let path = null;
    if (normalizedResource === "hp") path = "system.HP.value";
    if (normalizedResource === "fp") path = "system.FP.value";
    if (!path) return;

    await actor.update({ [path]: parsed });
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
    const combatSearch = this.combatSearch;
    const skillsSearch = this.skillsSearch;
    const quickSkillsSearch = this.quickSkillsSearch;

    const indexedAttacks = attacks.map((attack, index) => ({
      ...attack,
      index
    }));
    const filteredAttacks = this.filterAttacks(indexedAttacks, combatSearch);

    const activeActorId = activeActor?.id ?? null;
    const quickSelection = this.getQuickSkillSelection(activeActorId);
    const indexedSkills = skills.map((skill, index) => {
      const quickSkillKey = this.getQuickSkillKey(skill);
      return {
        ...skill,
        index,
        quickSkillKey,
        isQuickSkillSelected: quickSkillKey ? quickSelection.has(quickSkillKey) : false
      };
    });
    const filteredSkills = this.filterSkills(indexedSkills, skillsSearch);
    const quickSkills = indexedSkills.filter((skill) => skill.isQuickSkillSelected);
    const filteredQuickSkills = this.filterSkills(quickSkills, quickSkillsSearch);
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
      combatSearch,
      skillsSearch,
      quickSkillsSearch,
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
      isQuickSkillsDrawerOpen: this.activeDrawer === "quick-skills",
      isDebugMode: DEBUG,
      attackCount: attacks.length,
      visibleAttackCount: filteredAttacks.length,
      skillsCount: skills.length,
      visibleSkillsCount: filteredSkills.length,
      quickSkillsCount: quickSkills.length,
      visibleQuickSkillsCount: filteredQuickSkills.length,
      isDragOverRoster: this.isDragOverRoster,
      indexedAttacks: filteredAttacks,
      indexedSkills: filteredSkills,
      indexedQuickSkills: filteredQuickSkills
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
      this.scheduleSearchRender("available-search", event.currentTarget);
    });


    html.find("[data-action='combat-search']").on("input", (event) => {
      const searchValue = event.currentTarget?.value;
      this.combatSearch = typeof searchValue === "string" ? searchValue : "";
      this.scheduleSearchRender("combat-search", event.currentTarget);
    });

    html.find("[data-action='skills-search']").on("input", (event) => {
      const searchValue = event.currentTarget?.value;
      this.skillsSearch = typeof searchValue === "string" ? searchValue : "";
      this.scheduleSearchRender("skills-search", event.currentTarget);
    });

    html.find("[data-action='quick-skills-search']").on("input", (event) => {
      const searchValue = event.currentTarget?.value;
      this.quickSkillsSearch = typeof searchValue === "string" ? searchValue : "";
      this.scheduleSearchRender("quick-skills-search", event.currentTarget);
    });

    html.find("[data-action='toggle-quick-skill']").on("change", (event) => {
      const actorId = event.currentTarget.dataset.actorId;
      const skillKey = event.currentTarget.dataset.skillKey;
      if (!actorId || !skillKey) return;

      this.setQuickSkillSelected(actorId, skillKey, Boolean(event.currentTarget.checked));
      this.render();
    });

    const commitResourceUpdate = async (event) => {
      const input = event.currentTarget;
      const actorId = input?.dataset?.actorId;
      const resource = input?.dataset?.resource;
      if (!actorId || !resource) return;
      if (input.dataset.lastCommittedValue === input.value) return;
      input.dataset.lastCommittedValue = input.value;
      await this.updateActorResource(actorId, resource, input.value);
      this.render();
    };

    html.find("[data-action='update-resource']").on("change", commitResourceUpdate);
    html.find("[data-action='update-resource']").on("blur", commitResourceUpdate);
    html.find("[data-action='update-resource']").on("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      await commitResourceUpdate(event);
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

    html.find("[data-action='roll-skill']").on("click", async (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId;
      const skillIndex = Number(event.currentTarget.dataset.skillIndex);
      if (!actorId || Number.isNaN(skillIndex)) return;

      const actor = game.actors.get(actorId);
      const skills = this.extractSkills(actor);
      const skill = skills[skillIndex];
      if (!skill) return;

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
