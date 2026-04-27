const MODULE_ID = "gurps-quickdeck";
export const PDF_SOURCES_SETTING_KEY = "pdfSourcesJson";

function warnAndRecover(message, error) {
  console.warn(`${MODULE_ID} | ${message}`, error);
  ui.notifications?.warn(`QuickDeck: ${message}`);
}

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asPageOffset(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.trunc(numeric);
}

export function normalizePdfSource(source = {}) {
  const displayName = asString(source.displayName);
  const bookKey = asString(source.bookKey);
  const fileHint = asString(source.fileHint);
  const notes = asString(source.notes);

  return {
    displayName: displayName || "Untitled Source",
    bookKey,
    fileHint,
    pageOffset: asPageOffset(source.pageOffset),
    notes
  };
}

export function safeParsePdfSources(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim() === "") return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => normalizePdfSource(entry));
  } catch (error) {
    warnAndRecover("Failed to parse PDF source settings; using empty list.", error);
    return [];
  }
}

export function safeSerializePdfSources(sources) {
  try {
    const normalized = Array.isArray(sources)
      ? sources.map((source) => normalizePdfSource(source))
      : [];
    return JSON.stringify(normalized);
  } catch (error) {
    warnAndRecover("Failed to save PDF source settings; keeping previous values.", error);
    return null;
  }
}

export function getPdfSources() {
  const rawValue = game.settings.get(MODULE_ID, PDF_SOURCES_SETTING_KEY);
  return safeParsePdfSources(rawValue);
}

export async function setPdfSources(sources) {
  const serialized = safeSerializePdfSources(sources);
  if (serialized === null) return false;

  try {
    await game.settings.set(MODULE_ID, PDF_SOURCES_SETTING_KEY, serialized);
    return true;
  } catch (error) {
    warnAndRecover("Failed to write PDF source settings.", error);
    return false;
  }
}
