import { QuickDeckReferenceApp } from "./reference-app.js";

const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/quickdeck.hbs";
const DEBUG = false;
const MODULE_ID = "gurps-quickdeck";
const SETTING_KEYS = {
  ROSTER: "rosterActorIds",
  QUICK_SKILLS: "quickSkillSelectionsByActor",
  DEFAULT_DRAWER: "defaultDrawer"
};
const VALID_DRAWERS = new Set(["combat", "skills", "quick-skills", "spells"]);

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
    this._actorSelectTimeout = null;
    this.isDragOverRoster = false;
    this.pendingTokenDropActorId = null;
    this._pendingTokenDropCleanup = null;
    this._tokenDropSceneId = null;
    this.isMinimized = false;
    this._stateLoadedFromSettings = false;
    this.loadPersistedState();
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
    }
    this.activeActorId = actorId;
  }

  clearRoster() {
    this.rosterActorIds = [];
    this.activeActorId = null;
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

    this.persistRosterState();
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
      reference: this.getFirstDefinedValue(skill, ["reference", "ref", "pageRef", "pageref", "book"]),
      pageHint: this.getFirstDefinedValue(skill, [
        "pageRef",
        "pageref",
        "page",
        "refPage",
        "referencePage"
      ]),
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

  normalizeSpell(spell) {
    if (!spell || typeof spell !== "object") return null;
    const name =
      this.getFirstDefinedValue(spell, ["name", "spell", "label", "title"]) ?? "Unnamed Spell";

    return {
      name,
      level: this.getFirstDefinedValue(spell, ["level", "calc.level", "import", "value"]),
      class: this.getFirstDefinedValue(spell, ["class", "spellClass", "category"]),
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
      raw: spell
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

  extractSpells(actor) {
    if (!actor) return [];

    const spells = [];
    const spellSources = [
      "system.spells",
      "data.data.spells",
      "system.magic",
      "data.data.magic",
      "system.traits.spells",
      "data.data.traits.spells"
    ];

    for (const path of spellSources) {
      const collection = foundry.utils.getProperty(actor, path);
      const entries = this.collectNestedMatches(collection, (entry) => this.isSpellLike(entry));
      for (const entry of entries) {
        const normalized = this.normalizeSpell(entry);
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
      const normalized = this.normalizeSpell(item?.system ?? item);
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

  applyDefaultDrawerIfNeeded() {
    if (this.activeDrawer) return;
    const configuredDrawer = game.settings.get(MODULE_ID, SETTING_KEYS.DEFAULT_DRAWER);
    if (configuredDrawer === "none") return;
    if (!VALID_DRAWERS.has(configuredDrawer)) return;
    this.activeDrawer = configuredDrawer;
  }

  sanitizePersistentState() {
    const allActors = this.getCombatActors();
    const validActorIds = new Set(allActors.map((actor) => actor.id));
    const originalRosterLength = this.rosterActorIds.length;
    this.rosterActorIds = this.rosterActorIds.filter((id) => validActorIds.has(id));

    let removedQuickSkills = false;
    for (const actorId of Object.keys(this.quickSkillSelectionsByActor)) {
      if (!validActorIds.has(actorId)) {
        delete this.quickSkillSelectionsByActor[actorId];
        removedQuickSkills = true;
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
    this.updateCountText(html, "available-visible", visible);
    this.updateCountText(html, "available-total", total);
  }

  applyCombatFilter(html) {
    const { visible, total } = this.applyDomFilterBySelector(
      html,
      "[data-search-row='combat']",
      this.combatSearch
    );
    this.updateCountText(html, "attacks-visible", visible);
    this.updateCountText(html, "attacks-total", total);
  }

  applySkillsFilter(html) {
    const { visible, total } = this.applyDomFilterBySelector(
      html,
      "[data-search-row='skills']",
      this.skillsSearch
    );
    this.updateCountText(html, "skills-visible", visible);
    this.updateCountText(html, "skills-total", total);
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

  async triggerCombatRoll(actorId, rollContext) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    if (!rollContext?.label) return;

    const usedSystemRoll = await this.tryGurpsRoll(actor, rollContext);
    if (usedSystemRoll) return;

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

  extractConcreteDamageFormula(damageText) {
    const normalizedDamage = String(damageText ?? "").trim();
    if (!normalizedDamage) return null;
    if (/^(sw|thr)\b/i.test(normalizedDamage)) return null;

    const match = normalizedDamage.match(/(\d+)d(6)?(?:\s*([+-])\s*(\d+))?/i);
    if (!match?.[1]) return null;

    const diceCount = Number(match[1]);
    if (!Number.isFinite(diceCount) || diceCount <= 0) return null;

    const modifierSign = match[3] ?? "";
    const modifierValue = match[4] ?? "";
    const modifier = modifierSign && modifierValue ? `${modifierSign}${modifierValue}` : "";

    return `${diceCount}d6${modifier}`;
  }

  async createDamageChatCard({
    actor,
    attackName,
    damageText,
    formula,
    roll = null,
    manualNeeded = false,
    errorMessage = null
  }) {
    const speaker = ChatMessage.getSpeaker({ actor });
    const actorName = this.escapeHtml(actor?.name ?? "Unknown");
    const safeAttackName = this.escapeHtml(attackName ?? "Unnamed Attack");
    const safeDamageText = this.escapeHtml(damageText ?? "—");
    const safeFormula = this.escapeHtml(formula ?? "—");
    const safeError = this.escapeHtml(errorMessage ?? "");
    const total = Number.isFinite(roll?.total) ? roll.total : "—";

    const content = `
      <div class="gurps-quickdeck-roll-fallback">
        <h3>QuickDeck Damage Roll</h3>
        <p><strong>Actor:</strong> ${actorName}</p>
        <p><strong>Attack:</strong> ${safeAttackName}</p>
        <p><strong>Damage String:</strong> ${safeDamageText}</p>
        <p><strong>Formula:</strong> ${safeFormula}</p>
        ${errorMessage ? `<p><strong>Error:</strong> ${safeError}</p>` : ""}
        ${manualNeeded ? "<p><strong>Manual damage needed.</strong></p>" : `<p><strong>Total:</strong> ${this.escapeHtml(String(total))}</p>`}
      </div>
    `;
    const flavor = manualNeeded
      ? `QuickDeck Damage: ${safeAttackName} (manual)`
      : `QuickDeck Damage: ${safeAttackName}`;

    if (roll && typeof roll.toMessage === "function") {
      try {
        await roll.toMessage({ speaker, flavor, content });
        return;
      } catch (error) {
        console.warn("gurps-quickdeck | roll.toMessage failed, falling back to ChatMessage.create.", error);
      }
    }

    await ChatMessage.create({
      speaker,
      flavor,
      rolls: roll ? [roll] : [],
      content
    });
  }

  async triggerDamageRoll(actorId, attackIndex) {
    if (!actorId || !Number.isFinite(attackIndex)) return;
    const actor = game.actors.get(actorId);
    if (!actor) return;

    const attacks = this.extractAttacks(actor);
    const attack = attacks[attackIndex];
    if (!attack) return;

    const damageText = this.getAttackDamageString(attack) ?? "—";
    const formula = this.extractConcreteDamageFormula(damageText);

    if (!formula) {
      await this.createDamageChatCard({
        actor,
        attackName: attack.name,
        damageText,
        formula: null,
        manualNeeded: true
      });
      return;
    }

    let roll = null;
    try {
      roll = await new Roll(formula).evaluate();
    } catch (error) {
      console.warn("gurps-quickdeck | Damage roll evaluation failed.", { formula, error });
      const message = error instanceof Error ? error.message : String(error);
      await this.createDamageChatCard({
        actor,
        attackName: attack.name,
        damageText,
        formula,
        manualNeeded: true,
        errorMessage: message
      });
      return;
    }

    await this.createDamageChatCard({
      actor,
      attackName: attack.name,
      damageText,
      formula,
      roll
    });
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

  openReferenceEntry(referenceData = {}) {
    try {
      const app = new QuickDeckReferenceApp(referenceData);
      app.render(true);
    } catch (error) {
      console.warn("gurps-quickdeck | Failed to open QuickDeck reference window.", error);
      ui.notifications?.warn("QuickDeck: Could not open reference window.");
    }
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
    ui.notifications?.info("QuickDeck: Click the canvas to place token.");

    const abortController = typeof AbortController === "function" ? new AbortController() : null;
    let cleanedUp = false;
    const cleanupListeners = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (abortController) {
        abortController.abort();
        return;
      }
      view.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      Hooks.off("canvasReady", onCanvasReady);
    };

    const onPointerDown = async (event) => {
      if (!this.pendingTokenDropActorId) return;
      const activeDropActorId = this.pendingTokenDropActorId;
      const pointerPosition = this.getCanvasPointFromEvent(event);
      cleanupListeners();

      try {
        if (!pointerPosition) {
          ui.notifications?.warn("QuickDeck: Could not detect pointer position, dropping at viewport center.");
        }
        await this.dropActorToken(activeDropActorId, pointerPosition);
      } catch (error) {
        console.warn("gurps-quickdeck | Failed to drop token from canvas click.", error);
        ui.notifications?.warn("QuickDeck: Could not drop token for this actor.");
      } finally {
        this.cancelTokenDrop({ render: false });
        this.render(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      this.cancelTokenDrop({ notify: true });
    };

    const onCanvasReady = (canvasInstance) => {
      const nextSceneId = canvasInstance?.scene?.id ?? game?.scenes?.current?.id ?? null;
      if (!this.pendingTokenDropActorId) return;
      if (this._tokenDropSceneId && nextSceneId && this._tokenDropSceneId !== nextSceneId) {
        this.cancelTokenDrop({ notify: true });
      }
    };

    const listenerOptions = abortController ? { signal: abortController.signal } : undefined;
    view.addEventListener("pointerdown", onPointerDown, listenerOptions);
    window.addEventListener("keydown", onKeyDown, listenerOptions);
    Hooks.on("canvasReady", onCanvasReady);
    this._pendingTokenDropCleanup = () => {
      cleanupListeners();
      Hooks.off("canvasReady", onCanvasReady);
    };

    this.render(false);
  }

  toggleMinimizedState() {
    this.isMinimized = !this.isMinimized;
    if (this.isMinimized) this.cancelTokenDrop({ render: false });
    this.render(false);
  }

  async minimize() {
    this.cancelTokenDrop({ render: false });
    return super.minimize();
  }

  async close(options) {
    this.cancelTokenDrop({ render: false });
    return super.close(options);
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

    const availableActors = allActors.map((actor) => ({
        id: actor.id,
        name: actor.name,
        img: actor.img || "icons/svg/mystery-man.svg",
        actorType: actor.type ? String(actor.type) : null,
        isInRoster: this.rosterActorIds.includes(actor.id),
        searchText: this.buildSearchText([actor.name, actor.type])
      }));

    const activeActor = this.getActiveActor();
    const attacks = this.extractAttacks(activeActor);
    const skills = this.extractSkills(activeActor);
    const combatSearch = this.combatSearch;
    const skillsSearch = this.skillsSearch;
    const quickSkillsSearch = this.quickSkillsSearch;
    const spellsSearch = this.spellsSearch;
    const spells = this.extractSpells(activeActor);

    const indexedAttacks = attacks.map((attack, index) => ({
      ...attack,
      index,
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
    const filteredAttacks = this.filterAttacks(indexedAttacks, combatSearch);

    const activeActorId = activeActor?.id ?? null;
    const quickSelection = this.getQuickSkillSelection(activeActorId);
    const indexedSkills = skills.map((skill, index) => {
      const quickSkillKey = this.getQuickSkillKey(skill);
      return {
        ...skill,
        index,
        quickSkillKey,
        isQuickSkillSelected: quickSkillKey ? quickSelection.has(quickSkillKey) : false,
        searchText: this.buildSearchText([skill.name, skill.level, skill.relativeLevel, skill.points])
      };
    });
    const filteredSkills = this.filterSkills(indexedSkills, skillsSearch);
    const quickSkills = indexedSkills.filter((skill) => skill.isQuickSkillSelected);
    const filteredQuickSkills = this.filterSkills(quickSkills, quickSkillsSearch);
    const indexedSpells = spells.map((spell, index) => ({
      ...spell,
      index,
      searchText: this.buildSearchText([
        spell.name,
        spell.level,
        spell.class,
        spell.cost,
        spell.duration,
        spell.reference,
        spell.pageHint
      ])
    }));
    const filteredSpells = this.filterSkills(indexedSpells, spellsSearch);
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

    const currentHp = this.getResourceValue(activeActor, "HP");
    const currentFp = this.getResourceValue(activeActor, "FP");
    const maxHp = this.getResourceMax(activeActor, "HP");
    const maxFp = this.getResourceMax(activeActor, "FP");

    const gurpsData = {
      hp: currentHp ?? null,
      fp: currentFp ?? null,
      hpMax: maxHp ?? currentHp ?? null,
      fpMax: maxFp ?? currentFp ?? null,
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
        hp: this.toDisplayValue(currentHp),
        fp: this.toDisplayValue(currentFp),
        hpMax: this.toDisplayValue(maxHp ?? currentHp),
        fpMax: this.toDisplayValue(maxFp ?? currentFp),
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
      spellsSearch,
      availableActors,
      visibleAvailableCount: this.getVisibleCountBySearchText(availableActors, this.availableSearch),
      rosterCount: rosterActors.length,
      availableCount: availableActors.length,
      rosterActors: rosterActors.map((actor) => ({
        id: actor.id,
        name: actor.name,
        img: actor.img || "icons/svg/mystery-man.svg",
        actorType: actor.type ? String(actor.type) : null,
        isActive: actor.id === this.activeActorId,
        combatBadge: this.getCombatBadgeText(combatantByActorId.get(actor.id)),
        isCurrentTurn:
          combatantByActorId.get(actor.id)?.id &&
          combatantByActorId.get(actor.id).id === currentCombatantId
      })),
      activeActor: activeActor
        ? {
            id: activeActor.id,
            name: activeActor.name,
            img: activeActor.img || "icons/svg/mystery-man.svg",
            actorType: activeActor.type ? String(activeActor.type) : null
          }
        : null,
      activeActorName: activeActor?.name ?? null,
      isMinimized: this.isMinimized,
      isTokenDropArmedForActive:
        Boolean(activeActor?.id) && this.pendingTokenDropActorId === activeActor.id,
      gurpsData,
      hasAvailableActors: availableActors.length > 0,
      hasRosterActors: rosterActors.length > 0,
      activeDrawer: this.activeDrawer,
      isCombatDrawerOpen: this.activeDrawer === "combat",
      isSkillsDrawerOpen: this.activeDrawer === "skills",
      isQuickSkillsDrawerOpen: this.activeDrawer === "quick-skills",
      isSpellsDrawerOpen: this.activeDrawer === "spells",
      isDebugMode: DEBUG,
      attackCount: attacks.length,
      visibleAttackCount: filteredAttacks.length,
      skillsCount: skills.length,
      visibleSkillsCount: filteredSkills.length,
      quickSkillsCount: quickSkills.length,
      visibleQuickSkillsCount: filteredQuickSkills.length,
      spellsCount: spells.length,
      visibleSpellsCount: filteredSpells.length,
      isDragOverRoster: this.isDragOverRoster,
      indexedAttacks,
      indexedSkills,
      indexedQuickSkills: quickSkills,
      indexedSpells
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
      this.cancelTokenDrop({ render: false });
      this.clearRoster();
      this.render();
    });

    html.find("[data-action='open-sheet']").on("click", (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId;
      if (!actorId || !game.actors.has(actorId)) return;
      this.openActorSheet(actorId);
    });

    html.find("[data-action='drop-token']").on("click", async (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId;
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

    html.find("[data-action='remove-actor']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const actorId = event.currentTarget.dataset.actorId;
      if (!actorId) return;

      this.cancelTokenDrop({ render: false });
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
        if (this.activeActorId && this.activeActorId !== actorId) {
          this.cancelTokenDrop({ render: false });
        }
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

      if (this.activeActorId && this.activeActorId !== actorId) {
        this.cancelTokenDrop({ render: false });
      }
      this.activeActorId = actorId;
      this.openActorSheet(actorId);
      this.render();
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

    html.find("[data-action='roll-damage']").on("click", async (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId;
      const attackIndex = Number(event.currentTarget.dataset.attackIndex);
      if (!actorId || Number.isNaN(attackIndex)) return;
      await this.triggerDamageRoll(actorId, attackIndex);
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

    html.find("[data-action='open-reference']").on("click", (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const type = String(element.dataset.refType ?? "rule");
      const name = String(element.dataset.refName ?? "Reference");
      const pageHint = element.dataset.refPage ?? "";
      const source = element.dataset.refSource ?? "";
      this.openReferenceEntry({ type, name, pageHint, source });
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
  }
}
