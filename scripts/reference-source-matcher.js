const MODULE_ID = "gurps-quickdeck";

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

function tokenizeHint(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function scoreFieldMatch(needle, haystack) {
  if (!needle || !haystack) return 0;
  if (needle === haystack) return 80;
  if (haystack.includes(needle) || needle.includes(haystack)) return 45;
  return 0;
}

function scoreTokenOverlap(tokens = [], sourceText = "") {
  if (!tokens.length || !sourceText) return 0;

  let score = 0;
  for (const token of tokens) {
    if (sourceText.includes(token)) score += 10;
  }

  return score;
}

function parseNumericPageHint(pageHint) {
  const raw = String(pageHint ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function buildSourceSearchText(source) {
  return [source?.displayName, source?.bookKey, source?.fileHint, source?.notes, source?.sourceType]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(" ");
}

function scoreSourceMatch(reference = {}, source = {}) {
  const sourceHint = normalizeText(reference.source);
  const sourceTokens = tokenizeHint(reference.source);
  const sourceBookKey = normalizeText(source.bookKey);
  const sourceDisplayName = normalizeText(source.displayName);
  const sourceSearchText = buildSourceSearchText(source);

  let score = 0;
  score += scoreFieldMatch(sourceHint, sourceBookKey);
  score += scoreFieldMatch(sourceHint, sourceDisplayName);
  score += scoreTokenOverlap(sourceTokens, sourceSearchText);

  if (!score && sourceHint) return 0;
  if (!sourceHint) {
    // If no source hint is provided, keep this as a weak fallback candidate.
    score += 1;
  }

  return score;
}

export function matchReferenceSource(reference = {}, sources = []) {
  try {
    const normalizedSources = Array.isArray(sources) ? sources.filter(Boolean) : [];
    if (!normalizedSources.length) return null;

    let bestMatch = null;

    for (const source of normalizedSources) {
      const score = scoreSourceMatch(reference, source);
      if (score <= 0) continue;

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { source, score };
      }
    }

    if (!bestMatch) return null;

    const displayedPage = parseNumericPageHint(reference.pageHint);
    const offset = Number(bestMatch.source?.pageOffset);
    const normalizedOffset = Number.isFinite(offset) ? Math.trunc(offset) : 0;
    const pdfPageTarget = displayedPage === null ? null : displayedPage + normalizedOffset;

    return {
      source: bestMatch.source,
      displayedPage,
      pdfPageTarget
    };
  } catch (error) {
    console.warn(`${MODULE_ID} | Failed to match reference source.`, error);
    ui.notifications?.warn("QuickDeck: Could not match reference source metadata.");
    return null;
  }
}
