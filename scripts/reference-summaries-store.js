import { buildReferenceLookupNames } from "./reference-lookup-name.js";

const MODULE_ID = "gurps-quickdeck";
const REFERENCE_SUMMARIES_PATHS = [
  `modules/${MODULE_ID}/data/reference-summaries.json`,
  `modules/${MODULE_ID}/data/basic-set-skills.reference-summaries.json`,
  `modules/${MODULE_ID}/data/dungeon-fantasy-adventurers-skills.reference-summaries.json`,
  `modules/${MODULE_ID}/data/martial-arts-techniques.reference-summaries.json`,
  `modules/${MODULE_ID}/data/martial-arts-combat.reference-summaries.json`,
  `modules/${MODULE_ID}/data/magic.reference-summaries.json`
];
const ALLOWED_TYPES = new Set(["skill", "spell", "rule"]);

let cachedSummaries = null;
let loadAttempted = false;
let loadingPromise = null;
let cachedSummaryLookup = null;

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asLookupText(value) {
  return asString(value).toLowerCase();
}

function asType(value) {
  const normalized = asLookupText(value);
  if (ALLOWED_TYPES.has(normalized)) return normalized;
  return "rule";
}

function asDisplayedPage(value) {
  const raw = asString(value);
  if (!raw) return "";
  if (!/^\d+$/.test(raw)) return "";

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return "";
  const normalized = Math.trunc(parsed);
  if (normalized <= 0) return "";
  return String(normalized);
}

function asDefaults(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => asString(entry))
      .filter((entry) => Boolean(entry))
      .join("; ");
  }
  return asString(value);
}

function normalizeReferenceSummaryEntry(entry = {}) {
  return {
    name: asString(entry.name),
    type: asType(entry.type),
    bookKey: asString(entry.bookKey),
    sourceName: asString(entry.sourceName),
    displayedPage: asDisplayedPage(entry.displayedPage),
    attribute: asString(entry.attribute),
    difficulty: asString(entry.difficulty),
    defaults: asDefaults(entry.defaults),
    summary: asString(entry.summary),
    description: asString(entry.description),
    notes: asString(entry.notes),
    specialtyRequired: asString(entry.specialtyRequired),
    spellClass: asString(entry.spellClass),
    college: asString(entry.college),
    duration: asString(entry.duration),
    cost: asString(entry.cost),
    timeToCast: asString(entry.timeToCast),
    prerequisites: asString(entry.prerequisites),
    item: asString(entry.item)
  };
}

function warnLoadIssue(message, error) {
  console.warn(`${MODULE_ID} | ${message}`, error);
}

function normalizeSummaryArray(entries) {
  const normalizedEntries = Array.isArray(entries) ? entries : [];
  return normalizedEntries
    .map((entry) => normalizeReferenceSummaryEntry(entry))
    .filter((entry) => entry.name);
}

function makeDedupKey(entry = {}) {
  const name = asLookupText(entry.name);
  const type = asLookupText(entry.type);
  const sourceOrBook = asLookupText(entry.bookKey || entry.sourceName);
  return `${name}|${type}|${sourceOrBook}`;
}

async function loadSummaryFile(path) {
  try {
    const response = await fetch(path, { method: "GET" });
    if (!response.ok) {
      warnLoadIssue(`Bundled reference summaries unavailable at ${path}; continuing.`, {
        status: response.status,
        statusText: response.statusText
      });
      return [];
    }

    const parsed = await response.json();
    if (!Array.isArray(parsed)) {
      warnLoadIssue(`Bundled reference summaries JSON at ${path} is not an array; continuing.`);
      return [];
    }

    return normalizeSummaryArray(parsed);
  } catch (error) {
    warnLoadIssue(`Failed to load bundled reference summaries from ${path}; continuing.`, error);
    return [];
  }
}

function dedupeSummaries(entries = []) {
  const deduped = [];
  const seen = new Set();

  for (const entry of entries) {
    const key = makeDedupKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }

  return deduped;
}

function buildSummaryLookup(summaries = []) {
  const byNameType = new Map();
  const byName = new Map();

  for (const entry of summaries) {
    const lookupNames = buildReferenceLookupNames(entry?.name);
    if (!lookupNames.exact) continue;
    const type = asLookupText(entry?.type);

    for (const nameAlias of lookupNames.aliases) {
      const nameTypeKey = `${nameAlias}|${type}`;
      const nameTypeEntries = byNameType.get(nameTypeKey) ?? [];
      nameTypeEntries.push(entry);
      byNameType.set(nameTypeKey, nameTypeEntries);

      const nameEntries = byName.get(nameAlias) ?? [];
      nameEntries.push(entry);
      byName.set(nameAlias, nameEntries);
    }
  }

  return { byNameType, byName };
}

function parsePreferredBookKeys(referenceData = {}) {
  const preferred = [];
  const push = (value) => {
    const normalized = asLookupText(value);
    if (!normalized) return;
    if (!preferred.includes(normalized)) preferred.push(normalized);
  };

  const source = asString(referenceData?.source);
  const pageHint = asString(referenceData?.pageHint);

  if (/^b\b/i.test(source) || /basic\s*set/i.test(source)) push('b');
  if (/^dfa?\b/i.test(source) || /dungeon\s*fantasy/i.test(source)) push('dfa');
  if (/^m\b/i.test(source) || /^magic\b/i.test(source)) push('m');

  if (/\bB\s*\d+/i.test(pageHint) || /^B\b/i.test(pageHint)) push('b');
  if (/\bDFA\s*\d+/i.test(pageHint) || /^DFA\b/i.test(pageHint)) push('dfa');
  if (/\bM\s*\d+/i.test(pageHint) || /^M\b/i.test(pageHint)) push('m');

  return preferred;
}

function pickBestEntry(candidates = [], referenceData = {}) {
  if (!Array.isArray(candidates) || !candidates.length) return null;

  const preferredBookKeys = parsePreferredBookKeys(referenceData);
  const preferredSet = new Set(preferredBookKeys);

  let best = null;
  let bestScore = -Infinity;

  for (const entry of candidates) {
    let score = 0;
    const entryBookKey = asLookupText(entry?.bookKey);

    if (preferredSet.size && preferredSet.has(entryBookKey)) {
      score += 100;
      score += Math.max(0, 10 - preferredBookKeys.indexOf(entryBookKey));
    }

    if (entryBookKey === 'b') score += 2;

    if (!best || score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  return best;
}


function collectDiagnostics(entries = []) {
  const byType = {};
  const byBookKey = {};

  for (const entry of entries) {
    const typeKey = asType(entry?.type);
    const bookKey = asString(entry?.bookKey) || "unknown";
    byType[typeKey] = (byType[typeKey] ?? 0) + 1;
    byBookKey[bookKey] = (byBookKey[bookKey] ?? 0) + 1;
  }

  return { byType, byBookKey };
}

export async function loadBundledReferenceSummaries() {
  if (loadAttempted) return cachedSummaries ?? [];
  if (loadingPromise) return loadingPromise;
  loadAttempted = true;

  loadingPromise = Promise.all(REFERENCE_SUMMARIES_PATHS.map((path) => loadSummaryFile(path)))
    .then((loadedArrays) => {
      const files = REFERENCE_SUMMARIES_PATHS.map((path, index) => ({
        path,
        count: loadedArrays[index]?.length ?? 0
      }));

      cachedSummaries = dedupeSummaries(loadedArrays.flat());
      cachedSummaryLookup = buildSummaryLookup(cachedSummaries);

      const diagnostics = collectDiagnostics(cachedSummaries);
      console.debug("QuickDeck bundled references loaded", {
        total: cachedSummaries.length,
        byType: diagnostics.byType,
        byBookKey: diagnostics.byBookKey,
        files
      });

      return cachedSummaries;
    })
    .catch((error) => {
      warnLoadIssue("Failed while loading bundled reference summaries; continuing with empty data.", error);
      cachedSummaries = [];
      cachedSummaryLookup = buildSummaryLookup([]);
      return cachedSummaries;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

export function findBundledReferenceSummary(referenceData = {}, summaries = []) {
  const lookupNames = buildReferenceLookupNames(referenceData?.name);
  const normalizedName = lookupNames.exact;
  const normalizedBaseName = lookupNames.base;
  const normalizedType = asLookupText(referenceData?.type);
  if (!normalizedName) return null;

  const normalizedSummaries = Array.isArray(summaries) ? summaries : [];
  const lookup =
    normalizedSummaries === cachedSummaries && cachedSummaryLookup
      ? cachedSummaryLookup
      : buildSummaryLookup(normalizedSummaries);

  const exactNameType = pickBestEntry(lookup.byNameType.get(`${normalizedName}|${normalizedType}`) ?? [], referenceData);
  if (exactNameType) return { entry: exactNameType, mode: "exact-name-type" };

  const exactNameOnly = pickBestEntry(lookup.byName.get(normalizedName) ?? [], referenceData);
  if (exactNameOnly) return { entry: exactNameOnly, mode: "exact-name" };

  const baseNameType = pickBestEntry(lookup.byNameType.get(`${normalizedBaseName}|${normalizedType}`) ?? [], referenceData);
  if (baseNameType) return { entry: baseNameType, mode: "base-name-type", matchedBaseName: baseNameType.name };

  const baseNameOnly = pickBestEntry(lookup.byName.get(normalizedBaseName) ?? [], referenceData);
  if (baseNameOnly) return { entry: baseNameOnly, mode: "base-name", matchedBaseName: baseNameOnly.name };

  return null;
}
