import { getPdfSources, normalizePdfSource, setPdfSources } from "./pdf-sources-store.js";

const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/pdf-sources.hbs";

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
      hasSources: rows.length > 0
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

  _getFileHintInput(row, html) {
    const rowElement = html.find(`[data-source-row][data-index='${row}']`)?.[0];
    return rowElement?.querySelector("[data-field='fileHint']") ?? null;
  }

  _derivePickerDirectory(pathHint) {
    if (typeof pathHint !== "string" || !pathHint.trim()) return "";
    const sanitized = pathHint.trim();
    const slashIndex = Math.max(sanitized.lastIndexOf("/"), sanitized.lastIndexOf("\\"));
    if (slashIndex <= 0) return "";
    return sanitized.slice(0, slashIndex);
  }

  async pickFileHint(index, html) {
    const fileHintInput = this._getFileHintInput(index, html);
    if (!fileHintInput) {
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
  }
}
