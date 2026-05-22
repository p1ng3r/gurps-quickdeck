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
  "DFMI1:": "Dungeon Fantasy RPG: Magic Items 1",
  "DFMI2:": "Dungeon Fantasy RPG: Magic Items 2"
};

function addRange(prefix, start, end, resolver) {
  for (let index = start; index <= end; index += 1) {
    PAGE_REF_KEY_NAMES[`${prefix}${index}:`] = resolver(index);
  }
}

addRange("DF", 1, 20, (i) => `Dungeon Fantasy ${i}`);
PAGE_REF_KEY_NAMES["DF1:"] = "Dungeon Fantasy 1: Adventurers";
PAGE_REF_KEY_NAMES["DF2:"] = "Dungeon Fantasy 2: Dungeons";

addRange("DFA", 1, 3, (i) => `Dungeon Fantasy Adventure ${i}`);
addRange("DFM", 1, 5, (i) => `Dungeon Fantasy Monsters ${i}`);
PAGE_REF_KEY_NAMES["DFM2:"] = "Dungeon Fantasy Monsters 2: Icky Goo";
PAGE_REF_KEY_NAMES["DFM3:"] = "Dungeon Fantasy Monsters 3: Born of Myth & Magic";
PAGE_REF_KEY_NAMES["DFM4:"] = "Dungeon Fantasy Monsters 4: Dragons";
PAGE_REF_KEY_NAMES["DFM5:"] = "Dungeon Fantasy Monsters 5: Demons";
addRange("DFT", 1, 4, (i) => `Dungeon Fantasy Treasures ${i}`);
addRange("PU", 1, 9, (i) => `Power-Ups ${i}`);
PAGE_REF_KEY_NAMES["PU2:"] = "Power-Ups 2: Perks";
addRange("MH", 1, 6, (i) => `Monster Hunters ${i}`);
addRange("ACT", 1, 9, (i) => `Action ${i}`);
PAGE_REF_KEY_NAMES["ACT1:"] = "Action 1: Heroes";
PAGE_REF_KEY_NAMES["ACT2:"] = "Action 2: Exploits";
PAGE_REF_KEY_NAMES["ACT3:"] = "Action 3: Furious Fists";
PAGE_REF_KEY_NAMES["ACT4:"] = "Action 4: Specialists";
PAGE_REF_KEY_NAMES["ACT5:"] = "Action 5: Dictionary of Danger";
PAGE_REF_KEY_NAMES["ACT6:"] = "Action 6: Tricked-Out Rides";
PAGE_REF_KEY_NAMES["ACT7:"] = "Action 7: Mercenaries";
PAGE_REF_KEY_NAMES["ACT9:"] = "Action 9: The City";
addRange("SS", 1, 8, (i) => `Spaceships ${i}`);
PAGE_REF_KEY_NAMES["SS1:"] = "Spaceships";
PAGE_REF_KEY_NAMES["SS2:"] = "Spaceships 2: Traders, Liners, and Transports";
PAGE_REF_KEY_NAMES["SS3:"] = "Spaceships 3: Warships and Space Pirates";
PAGE_REF_KEY_NAMES["SS4:"] = "Spaceships 4: Fighters, Carriers, and Mecha";
PAGE_REF_KEY_NAMES["SS5:"] = "Spaceships 5: Exploration and Colony Spacecraft";
PAGE_REF_KEY_NAMES["SS6:"] = "Spaceships 6: Mining and Industrial Spacecraft";
PAGE_REF_KEY_NAMES["SS7:"] = "Spaceships 7: Divergent and Paranormal Tech";
PAGE_REF_KEY_NAMES["SS8:"] = "Spaceships 8: Transhuman Spacecraft";

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

PAGE_REF_KEY_NAMES["DF3:"] = "Dungeon Fantasy 3: The Next Level";
PAGE_REF_KEY_NAMES["DF4:"] = "Dungeon Fantasy 4: Sages";
PAGE_REF_KEY_NAMES["DF5:"] = "Dungeon Fantasy 5: Allies";
PAGE_REF_KEY_NAMES["DF6:"] = "Dungeon Fantasy 6: 40 Artifacts";
PAGE_REF_KEY_NAMES["DF7:"] = "Dungeon Fantasy 7: Clerics";
PAGE_REF_KEY_NAMES["DF8:"] = "Dungeon Fantasy 8: Treasure Tables";
PAGE_REF_KEY_NAMES["DF9:"] = "Dungeon Fantasy 9: Summoners";
PAGE_REF_KEY_NAMES["DF10:"] = "Dungeon Fantasy 10: Taverns";
PAGE_REF_KEY_NAMES["DF11:"] = "Dungeon Fantasy 11: Power-Ups";
PAGE_REF_KEY_NAMES["DF12:"] = "Dungeon Fantasy 12: Ninja";
PAGE_REF_KEY_NAMES["DF13:"] = "Dungeon Fantasy 13: Loadouts";
PAGE_REF_KEY_NAMES["DF14:"] = "Dungeon Fantasy 14: Psi";
PAGE_REF_KEY_NAMES["DF15:"] = "Dungeon Fantasy 15: Henchmen";
PAGE_REF_KEY_NAMES["DF16:"] = "Dungeon Fantasy 16: Wilderness Adventures";
PAGE_REF_KEY_NAMES["DF17:"] = "Dungeon Fantasy 17: Guilds";
PAGE_REF_KEY_NAMES["DF18:"] = "Dungeon Fantasy 18: Power Items";
PAGE_REF_KEY_NAMES["DF19:"] = "Dungeon Fantasy 19: Incantation Magic";
PAGE_REF_KEY_NAMES["DF20:"] = "Dungeon Fantasy 20: Slayers";
PAGE_REF_KEY_NAMES["DFA1:"] = "Dungeon Fantasy Adventure 1: Mirror of the Fire Demon";
PAGE_REF_KEY_NAMES["DFA2:"] = "Dungeon Fantasy Adventure 2: Tomb of the Dragon King";
PAGE_REF_KEY_NAMES["DFA3:"] = "Dungeon Fantasy Adventure 3: Deep Night and the Star";