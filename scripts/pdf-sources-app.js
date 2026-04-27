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
  }
}
