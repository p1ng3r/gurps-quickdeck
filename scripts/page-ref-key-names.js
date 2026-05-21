const PAGE_REF_KEY_NAMES = {
  B: "Basic Set: Characters / Combined Basic Set",
  BX: "Basic Set: Campaigns",
  M: "Magic",
  MA: "Martial Arts",
  P: "Powers",
  HT: "High-Tech",
  LT: "Low-Tech",
  UT: "Ultra-Tech",
  DFA: "Dungeon Fantasy RPG: Adventurers",
  DFX: "Dungeon Fantasy RPG: Exploits",
  DFS: "Dungeon Fantasy RPG: Spells",
  DFM: "Dungeon Fantasy RPG: Monsters",
  DFMI1: "Dungeon Fantasy RPG Monsters 1",
  DFMI2: "Dungeon Fantasy RPG Monsters 2"
};

function addRange(prefix, start, end, resolver) {
  for (let index = start; index <= end; index += 1) {
    PAGE_REF_KEY_NAMES[`${prefix}${index}:`] = resolver(index);
  }
}

addRange("DF", 1, 20, (i) => `Dungeon Fantasy ${i}`);
PAGE_REF_KEY_NAMES["DF1:"] = "Dungeon Fantasy 1: Adventurers";
PAGE_REF_KEY_NAMES["DF2:"] = "Dungeon Fantasy 2: Dungeons";

addRange("DFA", 1, 3, (i) => `Dungeon Fantasy Adventures ${i}`);
addRange("DFM", 1, 5, (i) => `Dungeon Fantasy Monsters ${i}`);
addRange("DFT", 1, 4, (i) => `Dungeon Fantasy Treasures ${i}`);
addRange("PU", 1, 9, (i) => `Power-Ups ${i}`);
PAGE_REF_KEY_NAMES["PU2:"] = "Power-Ups 2: Perks";
addRange("MH", 1, 6, (i) => `Monster Hunters ${i}`);
addRange("ACT", 1, 9, (i) => `Action ${i}`);
addRange("SS", 1, 8, (i) => `Social Engineering: Savoir-Faire ${i}`);

function getPageRefKeyNameFromMap(key, map = PAGE_REF_KEY_NAMES) {
  const normalized = String(key ?? "").trim().toUpperCase();
  if (!normalized) return "";

  if (Object.hasOwn(map, normalized)) return map[normalized];

  const pyramidIssue3 = normalized.match(/^PY(\d+):$/);
  if (pyramidIssue3) return `Pyramid Magazine, Issue 3-${pyramidIssue3[1]}`;

  const pyramidIssue4 = normalized.match(/^PY4-(\d+):$/);
  if (pyramidIssue4) return `Pyramid Magazine, Issue 4-${pyramidIssue4[1]}`;

  return "";
}

export { PAGE_REF_KEY_NAMES, getPageRefKeyNameFromMap };
