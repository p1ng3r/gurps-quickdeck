const MODULE_ID = "gurps-quickdeck";
export const REFERENCE_INDEX_SETTING_KEY = "referenceIndexJson";

const ALLOWED_TYPES = new Set(["skill", "spell", "rule"]);

function warnAndRecover(message, error) {
  console.warn(`${MODULE_ID} | ${message}`, error);
  ui.notifications?.warn(`QuickDeck: ${message}`);
}

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asType(value) {
  const normalized = asString(value).toLowerCase();
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

export function normalizeReferenceIndexEntry(entry = {}) {
  return {
    name: asString(entry.name),
    type: asType(entry.type),
    bookKey: asString(entry.bookKey),
    displayedPage: asDisplayedPage(entry.displayedPage),
    notes: asString(entry.notes)
  };
}

export function safeParseReferenceIndex(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim() === "") return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => normalizeReferenceIndexEntry(entry))
      .filter((entry) => entry.name);
  } catch (error) {
    warnAndRecover("Failed to parse Reference Index settings; using empty list.", error);
    return [];
  }
}

export function safeSerializeReferenceIndex(entries) {
  try {
    const normalized = Array.isArray(entries)
      ? entries.map((entry) => normalizeReferenceIndexEntry(entry)).filter((entry) => entry.name)
      : [];
    return JSON.stringify(normalized);
  } catch (error) {
    warnAndRecover("Failed to save Reference Index settings; keeping previous values.", error);
    return null;
  }
}

export function getReferenceIndex() {
  const rawValue = game.settings.get(MODULE_ID, REFERENCE_INDEX_SETTING_KEY);
  return safeParseReferenceIndex(rawValue);
}

export async function setReferenceIndex(entries) {
  const serialized = safeSerializeReferenceIndex(entries);
  if (serialized === null) return false;

  try {
    await game.settings.set(MODULE_ID, REFERENCE_INDEX_SETTING_KEY, serialized);
    return true;
  } catch (error) {
    warnAndRecover("Failed to write Reference Index settings.", error);
    return false;
  }
}
