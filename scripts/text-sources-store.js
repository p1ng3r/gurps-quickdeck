const MODULE_ID = "gurps-quickdeck";
export const TEXT_SOURCES_SETTING_KEY = "textSourcesJson";

function warnAndRecover(message, error) {
  console.warn(`${MODULE_ID} | ${message}`, error);
  ui.notifications?.warn(`QuickDeck: ${message}`);
}

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeDateIso(value) {
  const raw = asString(value);
  if (!raw) return new Date().toISOString();

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

export function normalizeTextSource(source = {}) {
  return {
    id: asString(source.id) || foundry.utils.randomID(),
    displayName: asString(source.displayName),
    bookKey: asString(source.bookKey),
    rawText: asString(source.rawText),
    createdAt: normalizeDateIso(source.createdAt)
  };
}

export function safeParseTextSources(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim() === "") return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => normalizeTextSource(entry));
  } catch (error) {
    warnAndRecover("Failed to parse Text Sources settings; using empty list.", error);
    return [];
  }
}

export function safeSerializeTextSources(sources) {
  try {
    const normalized = Array.isArray(sources) ? sources.map((source) => normalizeTextSource(source)) : [];
    return JSON.stringify(normalized);
  } catch (error) {
    warnAndRecover("Failed to save Text Sources settings; keeping previous values.", error);
    return null;
  }
}

export function getTextSources() {
  const rawValue = game.settings.get(MODULE_ID, TEXT_SOURCES_SETTING_KEY);
  return safeParseTextSources(rawValue);
}

export async function setTextSources(sources) {
  const serialized = safeSerializeTextSources(sources);
  if (serialized === null) return false;

  try {
    await game.settings.set(MODULE_ID, TEXT_SOURCES_SETTING_KEY, serialized);
    return true;
  } catch (error) {
    warnAndRecover("Failed to write Text Sources settings.", error);
    return false;
  }
}
