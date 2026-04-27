const MODULE_ID = "gurps-quickdeck";

const DEFAULT_MAX_PAGES = 60;
const DEFAULT_MAX_SNIPPET_CHARS = 300;

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeSearchQuery(query) {
  return normalizeText(query).replace(/\s+/g, " ");
}

function getPdfJsApi() {
  const candidates = [
    globalThis?.pdfjsLib,
    globalThis?.window?.pdfjsLib,
    globalThis?.foundry?.pdfjsLib,
    globalThis?.game?.pdfjsLib
  ];

  for (const api of candidates) {
    if (api && typeof api.getDocument === "function") {
      return api;
    }
  }

  return null;
}

function extractPageText(textContent) {
  if (!textContent?.items || !Array.isArray(textContent.items)) return "";

  const text = textContent.items
    .map((item) => {
      if (!item || typeof item.str !== "string") return "";
      return item.str;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

function buildSentenceSnippet(text, matchIndex, maxChars = DEFAULT_MAX_SNIPPET_CHARS) {
  if (!text) return "";

  const sentencePattern = /[^.!?\n]+[.!?]?/g;
  const sentences = [];
  let sentence;
  while ((sentence = sentencePattern.exec(text)) !== null) {
    const value = sentence[0].trim();
    if (!value) continue;
    sentences.push({
      start: sentence.index,
      end: sentence.index + sentence[0].length,
      value
    });
  }

  if (!sentences.length) {
    const start = Math.max(0, matchIndex - Math.floor(maxChars / 2));
    return text.slice(start, start + maxChars).trim();
  }

  const centerIndex = sentences.findIndex((entry) => matchIndex >= entry.start && matchIndex < entry.end);
  const targetIndex = centerIndex >= 0 ? centerIndex : 0;

  const selected = [sentences[targetIndex].value];
  let remaining = maxChars - selected[0].length;

  for (let offset = 1; offset <= 2 && remaining > 0; offset += 1) {
    const next = sentences[targetIndex + offset];
    if (!next) break;
    const candidateLength = next.value.length + 1;
    if (candidateLength > remaining) break;
    selected.push(next.value);
    remaining -= candidateLength;
  }

  let snippet = selected.join(" ").trim();

  if (snippet.length > maxChars) {
    snippet = `${snippet.slice(0, maxChars - 1).trim()}…`;
  }

  return snippet;
}

function getSearchPageRange(totalPages, pageTarget, maxPages) {
  const normalizedTotal = Number.isInteger(totalPages) && totalPages > 0 ? totalPages : 0;
  if (!normalizedTotal) return [];

  const normalizedMaxPages = Math.max(1, Math.min(maxPages, normalizedTotal));
  const normalizedTarget = Number.isInteger(pageTarget) && pageTarget > 0 ? pageTarget : 1;
  const startPage = Math.min(normalizedTarget, normalizedTotal);

  const pages = [];
  for (let pageNumber = startPage; pageNumber <= normalizedTotal && pages.length < normalizedMaxPages; pageNumber += 1) {
    pages.push(pageNumber);
  }

  return pages;
}

function normalizeSnippet(snippet, maxChars) {
  const compact = normalizeText(snippet).replace(/\s+/g, " ");
  if (!compact) return "";
  if (compact.length <= maxChars) return compact;
  return `${compact.slice(0, maxChars - 1).trim()}…`;
}

export function isPdfTextSearchAvailable() {
  return Boolean(getPdfJsApi());
}

export async function searchPdfTextSnippet(filePath, query, options = {}) {
  const safePath = normalizeText(filePath);
  const safeQuery = normalizeSearchQuery(query);
  const maxPages = Number.isInteger(options.maxPages)
    ? Math.max(1, Math.min(options.maxPages, 200))
    : DEFAULT_MAX_PAGES;
  const maxSnippetChars = Number.isInteger(options.maxSnippetChars)
    ? Math.max(80, Math.min(options.maxSnippetChars, 600))
    : DEFAULT_MAX_SNIPPET_CHARS;
  const pageTarget = Number.isInteger(options.pageTarget) && options.pageTarget > 0
    ? options.pageTarget
    : null;

  if (!safePath || !safeQuery) {
    return {
      ok: false,
      reason: "invalid-input"
    };
  }

  const pdfjsLib = getPdfJsApi();
  if (!pdfjsLib) {
    return {
      ok: false,
      reason: "pdfjs-unavailable"
    };
  }

  let loadingTask;

  try {
    loadingTask = pdfjsLib.getDocument({ url: safePath });
    const pdfDocument = await loadingTask.promise;

    const normalizedQuery = safeQuery.toLowerCase();
    const pagesToSearch = getSearchPageRange(pdfDocument.numPages, pageTarget, maxPages);

    for (const pageNumber of pagesToSearch) {
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = extractPageText(textContent);
      if (!pageText) continue;

      const normalizedPageText = pageText.toLowerCase();
      const matchIndex = normalizedPageText.indexOf(normalizedQuery);
      if (matchIndex < 0) continue;

      const snippet = normalizeSnippet(
        buildSentenceSnippet(pageText, matchIndex, maxSnippetChars),
        maxSnippetChars
      );

      return {
        ok: true,
        page: pageNumber,
        snippet,
        searchedPages: pageNumber - pagesToSearch[0] + 1
      };
    }

    return {
      ok: false,
      reason: "no-match",
      searchedPages: pagesToSearch.length
    };
  } catch (error) {
    console.warn(`${MODULE_ID} | Failed during PDF text search.`, error);
    return {
      ok: false,
      reason: "search-failed"
    };
  } finally {
    try {
      if (loadingTask && typeof loadingTask.destroy === "function") {
        await loadingTask.destroy();
      }
    } catch (error) {
      // Non-fatal cleanup.
    }
  }
}
