const MODULE_ID = "gurps-quickdeck";
const REFERENCE_SUMMARIES_PATHS = [
  `modules/${MODULE_ID}/data/reference-summaries.json`,
  `modules/${MODULE_ID}/data/martial-arts-techniques.reference-summaries.json`,
  `modules/${MODULE_ID}/data/martial-arts-combat.reference-summaries.json`
];
const ALLOWED_TYPES = new Set(["skill", "spell", "rule"]);

let cachedSummaries = null;
let loadAttempted = false;

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
    specialtyRequired: asString(entry.specialtyRequired)
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

export async function loadBundledReferenceSummaries() {
  if (loadAttempted) return cachedSummaries ?? [];
  loadAttempted = true;

  const loadedArrays = await Promise.all(REFERENCE_SUMMARIES_PATHS.map((path) => loadSummaryFile(path)));
  cachedSummaries = dedupeSummaries(loadedArrays.flat());
  return cachedSummaries;
}

export function findBundledReferenceSummary(referenceData = {}, summaries = []) {
  const normalizedName = asLookupText(referenceData?.name);
  const normalizedType = asLookupText(referenceData?.type);
  if (!normalizedName) return null;

  const normalizedSummaries = Array.isArray(summaries) ? summaries : [];

  const exactNameType = normalizedSummaries.find((entry) => {
    return asLookupText(entry?.name) === normalizedName && asLookupText(entry?.type) === normalizedType;
  });
  if (exactNameType) return { entry: exactNameType, mode: "exact-name-type" };

  const exactNameOnly = normalizedSummaries.find((entry) => {
    return asLookupText(entry?.name) === normalizedName;
  });
  if (exactNameOnly) return { entry: exactNameOnly, mode: "exact-name" };

  return null;
}
