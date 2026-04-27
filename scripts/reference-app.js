import { getPdfSources } from "./pdf-sources-store.js";
import { matchReferenceSource } from "./reference-source-matcher.js";
import { getReferenceIndex } from "./reference-index-store.js";
import { openReferenceIndexManager } from "./reference-index-app.js";

const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/reference.hbs";

function normalizePathHint(pathHint) {
  if (typeof pathHint !== "string") return "";
  return pathHint.trim();
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

function parseDisplayedPage(value) {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.trunc(parsed);
  if (normalized <= 0) return null;
  return normalized;
}

function getTypeLabel(type) {
  if (type === "skill") return "Skill";
  if (type === "spell") return "Spell";
  return "Rule";
}

function findManualIndexMatch(referenceData = {}, entries = []) {
  const normalizedName = normalizeText(referenceData.name);
  const normalizedType = normalizeText(referenceData.type);

  if (!normalizedName) return null;

  const normalizedEntries = Array.isArray(entries) ? entries : [];

  const exactTypeMatch = normalizedEntries.find((entry) => {
    return normalizeText(entry?.name) === normalizedName && normalizeText(entry?.type) === normalizedType;
  });
  if (exactTypeMatch) {
    return {
      entry: exactTypeMatch,
      mode: "exact-name-type"
    };
  }

  const exactNameOnlyMatch = normalizedEntries.find((entry) => {
    return normalizeText(entry?.name) === normalizedName;
  });
  if (exactNameOnlyMatch) {
    return {
      entry: exactNameOnlyMatch,
      mode: "exact-name"
    };
  }

  return null;
}

function resolveReferenceMatch(referenceData = {}, configuredSources = []) {
  const manualIndex = getReferenceIndex();
  const manualMatch = findManualIndexMatch(referenceData, manualIndex);

  if (manualMatch?.entry) {
    const entry = manualMatch.entry;
    const manualReference = {
      ...referenceData,
      source: String(entry.bookKey ?? ""),
      pageHint: String(entry.displayedPage ?? "")
    };

    const sourceMatch = matchReferenceSource(manualReference, configuredSources);

    return {
      matchOrigin: "manual-index",
      matchOriginLabel: "Manual Index",
      manualMatchMode: manualMatch.mode,
      manualEntry: entry,
      matchedSource: sourceMatch?.source ?? null,
      displayedPage:
        sourceMatch?.displayedPage ?? parseDisplayedPage(entry.displayedPage) ?? parseDisplayedPage(referenceData.pageHint),
      pdfPageTarget:
        sourceMatch?.pdfPageTarget ?? null
    };
  }

  const actorHintMatch = matchReferenceSource(referenceData, configuredSources);

  if (actorHintMatch?.source) {
    return {
      matchOrigin: "actor-data-hint",
      matchOriginLabel: "Actor Data Hint",
      manualMatchMode: null,
      manualEntry: null,
      matchedSource: actorHintMatch.source,
      displayedPage: actorHintMatch.displayedPage,
      pdfPageTarget: actorHintMatch.pdfPageTarget
    };
  }

  return {
    matchOrigin: "no-match",
    matchOriginLabel: "No Match",
    manualMatchMode: null,
    manualEntry: null,
    matchedSource: null,
    displayedPage: parseDisplayedPage(referenceData.pageHint),
    pdfPageTarget: null
  };
}

function buildSafePdfOpenPath(pathHint, pdfPageTarget) {
  const normalizedHint = normalizePathHint(pathHint);
  if (!normalizedHint) return null;

  const blockedProtocolPattern = /^(?:javascript|data|vbscript):/i;
  if (blockedProtocolPattern.test(normalizedHint)) return null;

  const cleanHint = normalizedHint.split("#")[0].trim();
  if (!cleanHint) return null;

  const safePath = encodeURI(cleanHint);

  if (!Number.isInteger(pdfPageTarget) || pdfPageTarget <= 0) {
    return safePath;
  }

  return `${safePath}#page=${pdfPageTarget}`;
}

async function copyTextToClipboard(text) {
  const safeText = typeof text === "string" ? text : "";
  if (!safeText) return false;

  try {
    if (globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(safeText);
      return true;
    }
  } catch (error) {
    // Continue to legacy fallback.
  }

  try {
    const helper = document.createElement("textarea");
    helper.value = safeText;
    helper.setAttribute("readonly", "readonly");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.focus();
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    return Boolean(copied);
  } catch (error) {
    return false;
  }
}

export class QuickDeckReferenceApp extends Application {
  constructor(referenceData = {}, options = {}) {
    super(options);
    this.referenceData = {
      name: String(referenceData?.name ?? "Reference"),
      type: String(referenceData?.type ?? "rule"),
      source: String(referenceData?.source ?? ""),
      pageHint: String(referenceData?.pageHint ?? "")
    };
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "gurps-quickdeck-reference-app",
      classes: ["gurps-quickdeck-reference"],
      popOut: true,
      minimizable: true,
      resizable: false,
      width: 430,
      height: "auto",
      title: "QuickDeck Reference",
      template: TEMPLATE_PATH
    });
  }

  getData() {
    const typeLabel = getTypeLabel(this.referenceData.type);

    const configuredSources = getPdfSources().map((source) => ({
      displayName: source.displayName,
      bookKey: source.bookKey,
      fileHint: source.fileHint,
      pageOffset: source.pageOffset,
      notes: source.notes
    }));

    const resolvedMatch = resolveReferenceMatch(this.referenceData, configuredSources);
    const matchedSourcePath = normalizePathHint(resolvedMatch?.matchedSource?.fileHint);
    const numericPageHint = parseDisplayedPage(this.referenceData.pageHint);
    const manualEntryPrefill = {
      name: this.referenceData.name,
      type: this.referenceData.type,
      bookKey: resolvedMatch?.matchedSource?.bookKey || this.referenceData.source || "",
      displayedPage: numericPageHint ? String(numericPageHint) : "",
      notes: ""
    };
    const hasExactManualEntry = resolvedMatch?.manualMatchMode === "exact-name-type";

    return {
      title: this.referenceData.name,
      type: typeLabel,
      source: this.referenceData.source || null,
      pageHint: this.referenceData.pageHint || null,
      hasLocalReference: false,
      hasConfiguredSources: configuredSources.length > 0,
      configuredSources,
      hasMatchedSource: Boolean(resolvedMatch?.matchedSource),
      matchedSource: resolvedMatch?.matchedSource ?? null,
      displayedPage: resolvedMatch?.displayedPage ?? null,
      hasDisplayedPage: Number.isInteger(resolvedMatch?.displayedPage),
      pdfPageTarget: resolvedMatch?.pdfPageTarget ?? null,
      hasPdfPageTarget: Number.isInteger(resolvedMatch?.pdfPageTarget),
      matchedSourcePath,
      hasMatchedSourcePath: Boolean(matchedSourcePath),
      matchOrigin: resolvedMatch?.matchOrigin ?? "no-match",
      matchOriginLabel: resolvedMatch?.matchOriginLabel ?? "No Match",
      hasManualEntry: Boolean(resolvedMatch?.manualEntry),
      manualEntry: resolvedMatch?.manualEntry ?? null,
      manualMatchMode: resolvedMatch?.manualMatchMode ?? null,
      hasExactManualEntry,
      referenceIndexButtonLabel: hasExactManualEntry
        ? "Edit Reference Index Entry"
        : "Add to Reference Index",
      prefillEntryName: manualEntryPrefill.name,
      prefillEntryType: manualEntryPrefill.type,
      prefillEntryBookKey: manualEntryPrefill.bookKey,
      prefillEntryDisplayedPage: manualEntryPrefill.displayedPage,
      sourcePlaceholderText:
        "No PDF sources configured yet. Use QuickDeck → PDF Sources to add local metadata.",
      noMatchText: "No matching PDF source found.",
      placeholderText:
        "QuickDeck reference notes are local placeholders for now. PDF import/indexing support is planned for user-provided content in a future update."
    };
  }

  _openMatchedPdf(event) {
    event.preventDefault();

    const pathHint = event.currentTarget?.dataset?.fileHint ?? "";
    const rawPageTarget = Number(event.currentTarget?.dataset?.pdfPageTarget);
    const pdfPageTarget = Number.isInteger(rawPageTarget) ? rawPageTarget : null;
    const safePath = buildSafePdfOpenPath(pathHint, pdfPageTarget);

    if (!safePath) {
      ui.notifications?.warn("QuickDeck: No valid PDF file path hint to open.");
      return;
    }

    try {
      const openedWindow = globalThis.window?.open?.(safePath, "_blank", "noopener,noreferrer");
      if (!openedWindow) {
        ui.notifications?.warn(
          "QuickDeck: Browser blocked PDF opening. Copy the file path manually."
        );
      }
    } catch (error) {
      console.warn("QuickDeck | Failed to open PDF path hint.", error);
      ui.notifications?.warn("QuickDeck: Browser blocked PDF opening. Copy the file path manually.");
    }
  }

  async _copyMatchedPath(event) {
    event.preventDefault();

    const pathHint = normalizePathHint(event.currentTarget?.dataset?.fileHint ?? "");
    if (!pathHint) {
      ui.notifications?.warn("QuickDeck: No file path to copy.");
      return;
    }

    const copied = await copyTextToClipboard(pathHint);
    if (copied) {
      ui.notifications?.info("QuickDeck: PDF file path copied.");
      return;
    }

    ui.notifications?.warn("QuickDeck: Could not copy path automatically. Copy the file path manually.");
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='open-matched-pdf']").on("click", (event) => {
      this._openMatchedPdf(event);
    });

    html.find("[data-action='copy-matched-pdf-path']").on("click", async (event) => {
      await this._copyMatchedPath(event);
    });

    html.find("[data-action='open-reference-index-entry']").on("click", (event) => {
      event.preventDefault();
      const entryData = {
        name: String(event.currentTarget?.dataset?.prefillName ?? ""),
        type: String(event.currentTarget?.dataset?.prefillType ?? "rule"),
        bookKey: String(event.currentTarget?.dataset?.prefillBookKey ?? ""),
        displayedPage: String(event.currentTarget?.dataset?.prefillDisplayedPage ?? ""),
        notes: ""
      };

      const result = openReferenceIndexManager(entryData);
      if (!result) return;

      const notificationText =
        result.mode === "existing"
          ? "QuickDeck: Opened existing Reference Index entry."
          : "QuickDeck: Added a prefilled Reference Index row.";
      ui.notifications?.info(notificationText);
    });
  }
}
