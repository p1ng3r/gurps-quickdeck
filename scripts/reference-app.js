import { getPdfSources } from "./pdf-sources-store.js";
import { matchReferenceSource } from "./reference-source-matcher.js";

const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/reference.hbs";

function normalizePathHint(pathHint) {
  if (typeof pathHint !== "string") return "";
  return pathHint.trim();
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
    const typeLabel =
      this.referenceData.type === "skill"
        ? "Skill"
        : this.referenceData.type === "spell"
          ? "Spell"
          : "Rule";

    const configuredSources = getPdfSources().map((source) => ({
      displayName: source.displayName,
      bookKey: source.bookKey,
      fileHint: source.fileHint,
      pageOffset: source.pageOffset,
      notes: source.notes
    }));

    const sourceMatch = matchReferenceSource(this.referenceData, configuredSources);
    const matchedSourcePath = normalizePathHint(sourceMatch?.source?.fileHint);

    return {
      title: this.referenceData.name,
      type: typeLabel,
      source: this.referenceData.source || null,
      pageHint: this.referenceData.pageHint || null,
      hasLocalReference: false,
      hasConfiguredSources: configuredSources.length > 0,
      configuredSources,
      hasMatchedSource: Boolean(sourceMatch?.source),
      matchedSource: sourceMatch?.source ?? null,
      displayedPage: sourceMatch?.displayedPage ?? null,
      hasDisplayedPage: Number.isInteger(sourceMatch?.displayedPage),
      pdfPageTarget: sourceMatch?.pdfPageTarget ?? null,
      hasPdfPageTarget: Number.isInteger(sourceMatch?.pdfPageTarget),
      matchedSourcePath,
      hasMatchedSourcePath: Boolean(matchedSourcePath),
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
  }
}
