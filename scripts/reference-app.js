import { getPdfSources } from "./pdf-sources-store.js";

const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/reference.hbs";

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

    return {
      title: this.referenceData.name,
      type: typeLabel,
      source: this.referenceData.source || null,
      pageHint: this.referenceData.pageHint || null,
      hasLocalReference: false,
      hasConfiguredSources: configuredSources.length > 0,
      configuredSources,
      sourcePlaceholderText:
        "No PDF sources configured yet. Use QuickDeck → PDF Sources to add local metadata.",
      placeholderText:
        "QuickDeck reference notes are local placeholders for now. PDF import/indexing support is planned for user-provided content in a future update."
    };
  }
}
