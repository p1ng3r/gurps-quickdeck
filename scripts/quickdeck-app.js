import { QuickDeckReferenceApp } from "./reference-app.js";
import { openReferenceIndexManager } from "./reference-index-app.js";

const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/quickdeck.hbs";
const DEBUG = false;
const MODULE_ID = "gurps-quickdeck";
const SETTING_KEYS = {
  ROSTER: "rosterActorIds",
  QUICK_SKILLS: "quickSkillSelectionsByActor",
  COMBAT_FAVORITES: "combatFavoriteAttackKeysByActor",
  SPELL_FAVORITES: "spellFavoriteKeysByActor",
  DEFAULT_DRAWER: "defaultDrawer",
  MINIMIZED: "isMinimized",
  RESTORE_PILL_POSITION: "restorePillPosition"
};
const VALID_DRAWERS = new Set(["combat", "skills", "quick-skills", "spells", "reference", "settings"]);
const NATIVE_WINDOW_FOCUS_DELAYS_MS = [0, 100, 250, 500, 900];
const NATIVE_WINDOW_FOCUS_GUARD_MS = 1500;
const NATIVE_GURPS_WINDOW_PATTERN = /gurps|damage|roll|modifier|bucket|attack|defense|melee|ranged|hit[-\s]?location|otf/i;


export class QuickDeckApp extends Application {
  constructor(options = {}) {
    super(options);
    this.rosterActorIds = [];
    this.activeActorId = null;
    this.activeDrawer = "combat";
    this.availableSearch = "";
    this.combatSearch = "";
    this.skillsSearch = "";
    this.quickSkillsSearch = "";
    this.spellsSearch = "";
    this.quickSkillSelectionsByActor = {};
    this.combatFavoriteAttackKeysByActor = {};
    this.spellFavoriteKeysByActor = {};
    this._actorSelectTimeout = null;
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
    this._stateLoadedFromSettings = false;
    this._derivedActorDataCache = new Map();
    this.loadPersistedState();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "gurps-quickdeck-app",
      classes: ["gurps-quickdeck"],
      popOut: true,
      minimizable: true,
      resizable: true,
      width: 1380,
      height: 780,
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
      this.cancelTargetOpponentMode({ render: false, restore: false });
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
        if (normalized) skills.push(normalized);
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

    this.isMinimized = Boolean(game.settings.get(MODULE_ID, SETTING_KEYS.MINIMIZED));
    const savedRestorePillPosition = this.parseJsonSetting(
      game.settings.get(MODULE_ID, SETTING_KEYS.RESTORE_PILL_POSITION),
      null
    );
    this.restorePillPosition = this.normalizeRestorePillPosition(savedRestorePillPosition);

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

  async triggerNativeSheetRoll(actor, dataset, { event = null, targets = [], label = "roll" } = {}) {
    const gurps = globalThis.GURPS ?? game.GURPS;
    if (!actor || !dataset?.otf) return false;

    if (typeof gurps?.SetLastActor === "function") gurps.SetLastActor(actor);
    const previousWindowIds = this.getNativeWindowIds();
    this.startNativeWindowFocusLock(previousWindowIds, `native-sheet-${label}`);

    if (dataset.key && typeof gurps?.handleRoll === "function") {
      try {
        const fakeEvent = this.buildGurpsHandleRollEvent(dataset);
        await gurps.handleRoll(fakeEvent, actor, { targets });
        return true;
      } catch (error) {
        console.warn(`gurps-quickdeck | Native GURPS ${label} handleRoll failed, falling back to OTF.`, error);
      } finally {
        this.scheduleNativeWindowFocus(previousWindowIds);
        this.scheduleChatFocus();
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
      this.scheduleChatFocus();
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
      return this.element?.[0] ?? this.element ?? document.getElementById(this.options?.id ?? this.id);
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

  lowerQuickDeckBelow(app) {
    const quickDeckElement = this.getQuickDeckWindowElement();
    if (!quickDeckElement) return;

    let nativeZIndex = this.getWindowZIndex(app);
    if (!Number.isFinite(nativeZIndex)) {
      try {
        app?.bringToFront?.();
        app?.bringToTop?.();
      } catch (_error) {
        // Native window focus is best-effort only.
      }
      nativeZIndex = this.getWindowZIndex(app);
    }

    if (!Number.isFinite(nativeZIndex)) return;
    quickDeckElement.style.zIndex = String(Math.max(0, nativeZIndex - 1));
  }

  focusNativeWindow(app) {
    try {
      app?.bringToFront?.();
      app?.bringToTop?.();
    } catch (_error) {
      // Native window focus is best-effort only.
    }

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
    this.stopNativeWindowFocusLock();

    const previousIds = previousWindowIds instanceof Set ? previousWindowIds : new Set();
    const quickDeckElement = this.getQuickDeckWindowElement();
    const until = Date.now() + NATIVE_WINDOW_FOCUS_GUARD_MS;
    const lock = {
      reason,
      previousWindowIds: new Set(previousIds),
      previousQuickDeckZIndex: this.getWindowZIndex(this),
      previousQuickDeckInlineZIndex: quickDeckElement?.style?.zIndex ?? "",
      focusedWindowIds: new Set(),
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

  stopNativeWindowFocusLock() {
    const lock = this._nativeWindowFocusLock;
    if (!lock) return;

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

    this._nativeWindowFocusLock = null;
  }

  bringNativeWindowsToFront(previousWindowIds = new Set()) {
    const previousIds = previousWindowIds instanceof Set ? previousWindowIds : new Set();
    try {
      const windows = Object.values(ui?.windows ?? {});
      for (const app of windows) {
        if (!this.isNativeWindowFocusCandidate(app, previousIds)) continue;
        this.focusNativeWindow(app);
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

  focusChatSidebar() {
    try {
      ui?.sidebar?.expand?.();
      ui?.sidebar?.activateTab?.("chat");
      ui?.chat?.render?.(true);
      ui?.chat?.bringToFront?.();
      ui?.chat?.bringToTop?.();
    } catch (_error) {
      // Chat focus is best-effort and must not block native GURPS handling.
    }
  }

  scheduleChatFocus() {
    const lock = this._nativeWindowFocusLock;
    const previousWindowIds = lock?.previousWindowIds ?? this.getNativeWindowIds();
    if (!lock) this.startNativeWindowFocusLock(previousWindowIds, "chat");
    this.focusChatSidebar();
    globalThis.setTimeout?.(() => this.focusChatSidebar(), 0);
    globalThis.setTimeout?.(() => this.focusChatSidebar(), 100);
    this.scheduleNativeWindowFocus(previousWindowIds);
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
    this.persistRosterState();
    this.render(false);
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

  async triggerDamageRoll(actorId, attackIndex) {
    if (!actorId || !Number.isFinite(attackIndex)) return;
    const actor = game.actors.get(actorId);
    if (!actor) return;

    const attack = this.getDerivedActorData(actor).attacks[attackIndex];
    if (!attack) return;

    this.rememberPendingAttackContext(actor, attack, attackIndex, this.getSheetAttackDataset(attack));
    this.scheduleChatFocus();
    ui.notifications?.info("QuickDeck: Use the native GURPS chat damage controls for this attack.");
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

  openReferenceEntry(referenceData = {}) {
    try {
      const app = new QuickDeckReferenceApp(referenceData);
      app.render(true);
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
    }
    this.persistMinimizedState();
    this.syncMinimizedPresentation();
  }

  async minimize() {
    this.cancelTokenDrop({ render: false });
    this.cancelTargetOpponentMode({ render: false, restore: false });
    if (!this.isMinimized) {
      this.isMinimized = true;
      this.persistMinimizedState();
    }
    this.syncMinimizedPresentation();
    return this;
  }

  async close(options) {
    this.cancelTokenDrop({ render: false });
    this.cancelTargetOpponentMode({ render: false, restore: false });
    this.removeFloatingRestoreIcon();
    if (this._actorSelectTimeout) {
      clearTimeout(this._actorSelectTimeout);
      this._actorSelectTimeout = null;
    }
    this.invalidateDerivedActorData();
    this.stopNativeWindowFocusLock();
    return super.close(options);
  }

  async _render(force = false, options = {}) {
    const result = await super._render(force, options);
    this.syncMinimizedPresentation();
    return result;
  }

  restoreAndBringToFront() {
    if (this.isMinimized) {
      this.isMinimized = false;
      this.persistMinimizedState();
    }

    if (this.rendered) {
      this.syncMinimizedPresentation();
      this.rescueWindowPositionIfNeeded();
      this.bringQuickDeckToTop();
      return this;
    }

    this.render(true);
    this.scheduleBringToFrontAfterRender();
    return this;
  }

  scheduleBringToFrontAfterRender() {
    const bringForward = () => {
      if (!this.rendered) return;
      this.syncMinimizedPresentation();
      this.rescueWindowPositionIfNeeded();
      this.bringQuickDeckToTop();
    };

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(bringForward);
    }
    setTimeout(bringForward, 0);
  }

  bringQuickDeckToTop() {
    this.bringToTop?.();
  }

  rescueWindowPositionIfNeeded() {
    if (!this.rendered || this.isMinimized) return;

    const element = this.element?.[0] ?? this.element;
    if (!element?.getBoundingClientRect || typeof window === "undefined") return;

    const rect = element.getBoundingClientRect();
    const viewportWidth = Math.max(0, Number(window.innerWidth) || 0);
    const viewportHeight = Math.max(0, Number(window.innerHeight) || 0);
    if (!viewportWidth || !viewportHeight) return;

    const width = Number(rect.width);
    const height = Number(rect.height);
    const left = Number(rect.left);
    const top = Number(rect.top);
    const hasBadDimensions = !Number.isFinite(width) || !Number.isFinite(height) || width < 160 || height < 120;
    const isOffscreen = !Number.isFinite(left) || !Number.isFinite(top) || rect.right < 32 || rect.bottom < 32 || left > viewportWidth - 32 || top > viewportHeight - 32;
    const isHidden = element.offsetParent === null && getComputedStyle(element).position !== "fixed";
    if (!hasBadDimensions && !isOffscreen && !isHidden) return;

    const fallbackWidth = Math.min(Math.max(Number(this.options?.width) || 1180, 640), Math.max(320, viewportWidth - 48));
    const fallbackHeight = Math.min(Math.max(Number(this.options?.height) || 720, 420), Math.max(240, viewportHeight - 48));
    const safeWidth = hasBadDimensions ? fallbackWidth : Math.min(width, Math.max(160, viewportWidth - 48));
    const safeHeight = hasBadDimensions ? fallbackHeight : Math.min(height, Math.max(120, viewportHeight - 48));
    const maxLeft = Math.max(24, viewportWidth - safeWidth - 24);
    const maxTop = Math.max(24, viewportHeight - safeHeight - 24);
    const nextLeft = Math.min(Math.max(Number.isFinite(left) ? left : 24, 24), maxLeft);
    const nextTop = Math.min(Math.max(Number.isFinite(top) ? top : 24, 24), maxTop);
    const position = { left: nextLeft, top: nextTop };
    if (hasBadDimensions) {
      position.width = safeWidth;
      position.height = safeHeight;
    }
    this.setPosition?.(position);
  }

  syncMinimizedPresentation() {
    if (!this.rendered) return;
    if (this.isMinimized) {
      this.ensureFloatingRestoreIcon();
      this.element?.hide();
      return;
    }

    this.removeFloatingRestoreIcon();
    this.element?.show();
    if (this._nativeWindowFocusLock && Date.now() <= this._nativeWindowFocusLock.until) {
      this.bringNativeWindowsToFront(this._nativeWindowFocusLock.previousWindowIds);
      return;
    }
    this.bringToTop();
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
    const shouldHydrateDerivedData = Boolean(activeActor);
    const includeAttacks = shouldHydrateDerivedData;
    const includeSkills = shouldHydrateDerivedData;
    const includeSpells = shouldHydrateDerivedData;
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
        favoriteToggleLabel: isFavorite ? "Unpin spell" : "Pin spell"
      };
    });
    const favoriteSpells = indexedSpells.filter((spell) => spell.isFavoriteSpell);
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

    const activeActorPoints = activeActor
      ? this.getFirstDefinedValue(activeActor, [
          "system.totalpoints.value",
          "system.totalpoints",
          "system.points.total",
          "system.points",
          "system.traits.points.total",
          "system.calc.points",
          "system.attributes.points",
          "data.data.totalpoints.value",
          "data.data.totalpoints",
          "data.data.points.total",
          "data.data.points"
        ])
      : null;
    const activeActorPointsDisplay = ["number", "string"].includes(typeof activeActorPoints)
      ? String(activeActorPoints)
      : null;

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
      visibleAvailableCount: this.getVisibleCountBySearchText(availableActors, this.availableSearch),
      rosterCount: rosterActors.length,
      availableCount: availableActors.length,
      rosterActors: rosterActors.map((actor) => {
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
      }),
      activeActor: activeActor
        ? {
            id: activeActor.id,
            name: activeActor.name,
            img: activeActor.img || "icons/svg/mystery-man.svg",
            actorType: activeActor.type ? String(activeActor.type) : null,
            pointsDisplay: activeActorPointsDisplay
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
      hasAvailableActors: availableActors.length > 0,
      hasRosterActors: rosterActors.length > 0,
      activeDrawer: this.activeDrawer,
      isCombatDrawerOpen: this.activeDrawer === "combat",
      isSkillsDrawerOpen: this.activeDrawer === "skills",
      isQuickSkillsDrawerOpen: this.activeDrawer === "quick-skills",
      isSpellsDrawerOpen: this.activeDrawer === "spells",
      isReferenceDrawerOpen: this.activeDrawer === "reference",
      isSettingsDrawerOpen: this.activeDrawer === "settings",
      isDebugMode: DEBUG,
      attackCount: attacks.length,
      visibleAttackCount: filteredAttacks.length,
      meleeAttacks,
      rangedAttacks,
      favoriteAttacks,
      favoriteAttackCount: favoriteAttacks.length,
      skillsCount: skills.length,
      visibleSkillsCount: filteredSkills.length,
      quickSkillsCount: quickSkills.length,
      visibleQuickSkillsCount: filteredQuickSkills.length,
      spellsCount: spells.length,
      visibleSpellsCount: filteredSpells.length,
      favoriteSpells,
      favoriteSpellCount: favoriteSpells.length,
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
      this.cancelTargetOpponentMode({ render: false, restore: false });
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

    html.find("[data-action='open-reference-index']").on("click", (event) => {
      event.preventDefault();
      this.openReferenceIndexManager();
    });

    html.find("[data-action='remove-actor']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const actorId = event.currentTarget.dataset.actorId;
      if (!actorId) return;

      this.cancelTokenDrop({ render: false });
      this.cancelTargetOpponentMode({ render: false, restore: false });
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
          this.cancelTargetOpponentMode({ render: false, restore: false });
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
        this.cancelTargetOpponentMode({ render: false, restore: false });
      }
      this.activeActorId = actorId;
      this.openActorSheet(actorId);
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

    html.find("[data-action='toggle-quick-skill']").on("change", (event) => {
      const actorId = event.currentTarget.dataset.actorId;
      const skillKey = event.currentTarget.dataset.skillKey;
      if (!actorId || !skillKey) return;

      this.setQuickSkillSelected(actorId, skillKey, Boolean(event.currentTarget.checked));
      this.render();
    });

    html.find("[data-action='unpin-quick-skill']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const actorId = event.currentTarget.dataset.actorId;
      const skillKey = event.currentTarget.dataset.skillKey;
      if (!actorId || !skillKey) return;

      this.setQuickSkillSelected(actorId, skillKey, false);
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
    });

    html.find("[data-action='toggle-favorite-attack']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const actorId = event.currentTarget.dataset.actorId;
      const attackKey = event.currentTarget.dataset.attackKey;
      if (!actorId || !attackKey) return;

      const selection = this.getFavoriteAttackSelection(actorId);
      this.setFavoriteAttackSelected(actorId, attackKey, !selection.has(attackKey));
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
    });

    html.find("[data-action='toggle-favorite-spell']").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const actorId = event.currentTarget.dataset.actorId;
      const spellKey = event.currentTarget.dataset.spellKey;
      if (!actorId || !spellKey) return;

      const selection = this.getFavoriteSpellSelection(actorId);
      this.setFavoriteSpellSelected(actorId, spellKey, !selection.has(spellKey));
      this.render(false, { focus: false });
      this.scheduleNativeWindowFocusAfterRender();
    });

    html.find("[data-action='toggle-drawer']").on("click", (event) => {
      event.preventDefault();
      const drawer = event.currentTarget.dataset.drawer;
      if (!drawer) return;

      this.activeDrawer = drawer;
      this.render();
    });

    html.find("[data-action='adjust-resource']").on("click", async (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId;
      const resource = event.currentTarget.dataset.resource;
      const delta = event.currentTarget.dataset.delta;
      await this.adjustActorResource(actorId, resource, delta);
    });

    html.find("[data-action='set-resource']").on("change", async (event) => {
      const actorId = event.currentTarget.dataset.actorId;
      const resource = event.currentTarget.dataset.resource;
      await this.setActorResourceValue(actorId, resource, event.currentTarget.value);
    });

    html.find("[data-action='set-resource']").on("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      event.currentTarget.blur();
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
      const actorId = event.currentTarget.dataset.actorId;
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
      const actorId = event.currentTarget.dataset.actorId;
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
