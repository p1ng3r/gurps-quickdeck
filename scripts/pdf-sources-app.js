import { getPdfSources, normalizePdfSource, setPdfSources } from "./pdf-sources-store.js";

const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/pdf-sources.hbs";
const DEFAULT_SAMPLE_BOOK_PAGE = 10;
const PAGE_OFFSET_SLIDER_MIN = -50;
const PAGE_OFFSET_SLIDER_MAX = 50;

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function getFilenameFromPath(pathHint) {
  const normalized = asString(pathHint).replace(/\\+/g, "/");
  if (!normalized) return "";

  const parts = normalized.split("/").filter(Boolean);
  return parts.at(-1) ?? "";
}

function normalizeFilenameBase(filename) {
  return asString(filename)
    .replace(/\.pdf$/i, "")
    .replace(/[._-]+/g, " ")
    .replace(/\bgurps\b/gi, " ")
    .replace(/\b4(?:th)?\s*edition\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(value) {
  return asString(value)
    .toLowerCase()
    .replace(/\b([a-z0-9])([a-z0-9']*)/g, (_match, first, rest) => `${first.toUpperCase()}${rest}`)
    .trim();
}

function toSlug(value) {
  return asString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

function suggestMetadataFromPath(pathHint) {
  const filename = getFilenameFromPath(pathHint);
  const normalizedBase = normalizeFilenameBase(filename);
  if (!normalizedBase) {
    return {
      displayName: "",
      bookKey: ""
    };
  }

  return {
    displayName: toTitleCase(normalizedBase),
    bookKey: toSlug(normalizedBase)
  };
}

function parseInteger(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.trunc(numeric);
}

export class QuickDeckPdfSourcesApp extends Application {
  constructor(options = {}) {
    super(options);
    this.sources = getPdfSources();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "gurps-quickdeck-pdf-sources-app",
      classes: ["gurps-quickdeck", "gurps-quickdeck-pdf-sources"],
      popOut: true,
      minimizable: true,
      resizable: true,
      width: 700,
      height: 560,
      title: "QuickDeck PDF Sources",
      template: TEMPLATE_PATH
    });
  }

  getData() {
    const rows = this.sources.map((source, index) => ({
      index,
      ...normalizePdfSource(source)
    }));

    return {
      sources: rows,
      hasSources: rows.length > 0,
      defaultSampleBookPage: DEFAULT_SAMPLE_BOOK_PAGE,
      pageOffsetSliderMin: PAGE_OFFSET_SLIDER_MIN,
      pageOffsetSliderMax: PAGE_OFFSET_SLIDER_MAX
    };
  }

  addSource() {
    this.sources.push(
      normalizePdfSource({
        displayName: "",
        bookKey: "",
        fileHint: "",
        pageOffset: 0,
        notes: ""
      })
    );
  }

  removeSource(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.sources.length) return;
    this.sources.splice(index, 1);
  }

  readSourcesFromForm(html) {
    const rowElements = Array.from(html.find("[data-source-row]") ?? []);
    const mapped = rowElements.map((row) => {
      const pick = (field) => row.querySelector(`[data-field='${field}']`)?.value ?? "";
      return normalizePdfSource({
        displayName: pick("displayName"),
        bookKey: pick("bookKey"),
        fileHint: pick("fileHint"),
        pageOffset: pick("pageOffset"),
        notes: pick("notes")
      });
    });

    this.sources = mapped;
  }

  async saveSources(html) {
    this.readSourcesFromForm(html);
    const saved = await setPdfSources(this.sources);
    if (!saved) return;
    ui.notifications?.info("QuickDeck: PDF source metadata saved.");
    this.render(false);
  }

  _getRowElement(row, html) {
    return html.find(`[data-source-row][data-index='${row}']`)?.[0] ?? null;
  }

  _getFileHintInput(row, html) {
    const rowElement = this._getRowElement(row, html);
    return rowElement?.querySelector("[data-field='fileHint']") ?? null;
  }

  _derivePickerDirectory(pathHint) {
    if (typeof pathHint !== "string" || !pathHint.trim()) return "";
    const sanitized = pathHint.trim();
    const slashIndex = Math.max(sanitized.lastIndexOf("/"), sanitized.lastIndexOf("\\"));
    if (slashIndex <= 0) return "";
    return sanitized.slice(0, slashIndex);
  }

  _autofillMetadataFromPath(rowElement, selectedPath) {
    if (!rowElement) return;

    const displayNameInput = rowElement.querySelector("[data-field='displayName']");
    const bookKeyInput = rowElement.querySelector("[data-field='bookKey']");
    if (!displayNameInput || !bookKeyInput) return;

    const suggestion = suggestMetadataFromPath(selectedPath);
    if (!asString(displayNameInput.value) && suggestion.displayName) {
      displayNameInput.value = suggestion.displayName;
      displayNameInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (!asString(bookKeyInput.value) && suggestion.bookKey) {
      bookKeyInput.value = suggestion.bookKey;
      bookKeyInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  _syncOffsetInputs(rowElement, sourceField) {
    const numberInput = rowElement?.querySelector("[data-field='pageOffset']");
    const sliderInput = rowElement?.querySelector("[data-helper='pageOffsetSlider']");
    if (!numberInput || !sliderInput) return;

    const sourceValue = sourceField === "slider" ? sliderInput.value : numberInput.value;
    const parsed = parseInteger(sourceValue, 0);
    numberInput.value = String(parsed);
    sliderInput.value = String(parsed);
  }

  _updateOffsetPreview(rowElement) {
    if (!rowElement) return;

    const numberInput = rowElement.querySelector("[data-field='pageOffset']");
    const sampleInput = rowElement.querySelector("[data-helper='sampleBookPage']");
    const previewText = rowElement.querySelector("[data-helper='offsetPreviewText']");
    const previewValueInput = rowElement.querySelector("[data-helper='computedPdfPage']");
    if (!numberInput || !sampleInput || !previewText || !previewValueInput) return;

    const offset = parseInteger(numberInput.value, 0);
    const sampleBookPage = parseInteger(sampleInput.value, DEFAULT_SAMPLE_BOOK_PAGE);
    const pdfPage = sampleBookPage + offset;

    previewText.textContent = `Book page ${sampleBookPage} + offset ${offset} = PDF page ${pdfPage}`;
    previewValueInput.value = String(pdfPage);
  }

  _initializeOffsetHelpers(html) {
    const rows = Array.from(html.find("[data-source-row]") ?? []);
    for (const rowElement of rows) {
      this._syncOffsetInputs(rowElement, "number");
      this._updateOffsetPreview(rowElement);
    }
  }

  async pickFileHint(index, html) {
    const rowElement = this._getRowElement(index, html);
    const fileHintInput = this._getFileHintInput(index, html);
    if (!fileHintInput || !rowElement) {
      ui.notifications?.warn("QuickDeck: Unable to find file/path hint field for this row.");
      return;
    }

    if (typeof globalThis.FilePicker !== "function") {
      ui.notifications?.warn("QuickDeck: FilePicker is unavailable; paste your PDF path manually.");
      return;
    }

    const existingHint = fileHintInput.value?.trim() ?? "";
    const currentDirectory = this._derivePickerDirectory(existingHint);

    try {
      const picker = new globalThis.FilePicker({
        type: "data",
        current: currentDirectory || undefined,
        callback: (path) => {
          const selectedPath = typeof path === "string" ? path.trim() : "";
          if (!selectedPath) return;
          if (!selectedPath.toLowerCase().endsWith(".pdf")) {
            ui.notifications?.warn("QuickDeck: Please choose a .pdf file.");
            return;
          }

          fileHintInput.value = selectedPath;
          fileHintInput.dispatchEvent(new Event("change", { bubbles: true }));
          this._autofillMetadataFromPath(rowElement, selectedPath);
        }
      });

      picker.extensions = [".pdf"];
      picker.render(true);
    } catch (error) {
      console.warn("QuickDeck | Failed to open FilePicker for PDF source path.", error);
      ui.notifications?.warn("QuickDeck: FilePicker failed to open; paste your PDF path manually.");
    }
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='add-source']").on("click", (event) => {
      event.preventDefault();
      this.readSourcesFromForm(html);
      this.addSource();
      this.render(false);
    });

    html.find("[data-action='remove-source']").on("click", (event) => {
      event.preventDefault();
      const index = Number(event.currentTarget.dataset.index);
      this.readSourcesFromForm(html);
      this.removeSource(index);
      this.render(false);
    });

    html.find("[data-action='save-sources']").on("click", async (event) => {
      event.preventDefault();
      await this.saveSources(html);
    });

    html.find("[data-action='pick-file-hint']").on("click", async (event) => {
      event.preventDefault();
      const index = Number(event.currentTarget.dataset.index);
      if (!Number.isInteger(index) || index < 0) {
        ui.notifications?.warn("QuickDeck: Invalid PDF source row for file picker.");
        return;
      }
      await this.pickFileHint(index, html);
    });

    html.find("[data-field='pageOffset']").on("input", (event) => {
      const rowElement = event.currentTarget.closest("[data-source-row]");
      this._syncOffsetInputs(rowElement, "number");
      this._updateOffsetPreview(rowElement);
    });

    html.find("[data-helper='pageOffsetSlider']").on("input", (event) => {
      const rowElement = event.currentTarget.closest("[data-source-row]");
      this._syncOffsetInputs(rowElement, "slider");
      this._updateOffsetPreview(rowElement);
    });

    html.find("[data-helper='sampleBookPage']").on("input", (event) => {
      const rowElement = event.currentTarget.closest("[data-source-row]");
      this._updateOffsetPreview(rowElement);
    });

    this._initializeOffsetHelpers(html);
  }
}
