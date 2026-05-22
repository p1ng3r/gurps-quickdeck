export function normalizePdfMapKey(key) {
  return String(key ?? "").trim().toUpperCase();
}

export function normalizePdfBookKeyAlias(keyOrSlug) {
  const trimmed = String(keyOrSlug ?? "").trim();
  if (!trimmed) return "";
  const normalizedSlug = trimmed.toLowerCase();
  const aliases = {
    "dungeon-fantasy-adventurers": "DFA",
    "dungeon-fantasy-rpg-adventurers": "DFA",
    "dungeon-fantasy-exploits": "DFX",
    "dungeon-fantasy-rpg-exploits": "DFX",
    "dungeon-fantasy-spells": "DFS",
    "dungeon-fantasy-rpg-spells": "DFS",
    magic: "M",
    "gurps-magic": "M",
    "martial-arts": "MA",
    "gurps-martial-arts": "MA",
    "basic-set-characters": "B",
    "gurps-basic-set-characters": "B",
    "basic-set-campaigns": "BX",
    "gurps-basic-set-campaigns": "BX"
  };
  return aliases[normalizedSlug] ?? normalizePdfMapKey(trimmed);
}

export function parsePageReferences(refText) {
  return String(refText ?? "")
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((raw) => {
      const match = raw.match(/^(.*?)(\d+)$/);
      if (!match) return null;
      return { raw, key: normalizePdfMapKey(match[1]), page: Number(match[2]) };
    })
    .filter((entry) => entry && entry.key && Number.isFinite(entry.page));
}

export function buildPageReference({ pageHint = "", bookKey = "", displayedPage = "" } = {}) {
  const parsedHint = parsePageReferences(pageHint)[0];
  if (parsedHint) return parsedHint;

  const normalizedKey = normalizePdfBookKeyAlias(bookKey);
  const page = Number.parseInt(String(displayedPage ?? "").trim(), 10);
  if (!normalizedKey || !Number.isFinite(page)) return null;
  return { raw: `${normalizedKey}${page}`, key: normalizedKey, page };
}

export function getMappedPdfFinalPage(mapping, page = 1) {
  const basePage = Number(page);
  const offset = Number(mapping?.offset ?? 0);
  return Math.max(1, (Number.isFinite(basePage) ? basePage : 1) + (Number.isFinite(offset) ? offset : 0));
}

export function buildPdfPageUrl(path, finalPage) {
  const cleanPath = String(path || "").trim();
  if (!cleanPath) return null;
  const basePath = cleanPath.split("#")[0];
  const route = basePath.startsWith("http://")
    || basePath.startsWith("https://")
    || basePath.startsWith("/")
    || basePath.startsWith("data:")
    ? basePath
    : foundry?.utils?.getRoute
      ? foundry.utils.getRoute(basePath)
      : basePath;
  return `${route}#page=${finalPage}`;
}
