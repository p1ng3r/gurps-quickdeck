import {
  getReferenceIndex,
  normalizeReferenceIndexEntry,
  setReferenceIndex
} from "./reference-index-store.js";

const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/reference-index.hbs";

const ENTRY_TYPE_CHOICES = [
  { value: "skill", label: "Skill" },
  { value: "spell", label: "Spell" },
  { value: "rule", label: "Rule" }
];

export class QuickDeckReferenceIndexApp extends Application {
  constructor(options = {}) {
    super(options);
    this.entries = getReferenceIndex();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "gurps-quickdeck-reference-index-app",
      classes: ["gurps-quickdeck", "gurps-quickdeck-reference-index"],
      popOut: true,
      minimizable: true,
      resizable: true,
      width: 760,
      height: 580,
      title: "QuickDeck Reference Index",
      template: TEMPLATE_PATH
    });
  }

  getData() {
    const rows = this.entries.map((entry, index) => {
      const normalized = normalizeReferenceIndexEntry(entry);
      return {
        index,
        ...normalized,
        typeOptions: ENTRY_TYPE_CHOICES.map((choice) => ({
          ...choice,
          selected: choice.value === normalized.type
        }))
      };
    });

    return {
      entries: rows,
      hasEntries: rows.length > 0
    };
  }

  addEntry() {
    this.entries.push(
      normalizeReferenceIndexEntry({
        name: "",
        type: "skill",
        bookKey: "",
        displayedPage: "",
        notes: ""
      })
    );
  }

  removeEntry(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.entries.length) return;
    this.entries.splice(index, 1);
  }

  readEntriesFromForm(html) {
    const rowElements = Array.from(html.find("[data-reference-index-row]") ?? []);
    this.entries = rowElements.map((row) => {
      const pick = (field) => row.querySelector(`[data-field='${field}']`)?.value ?? "";
      return normalizeReferenceIndexEntry({
        name: pick("name"),
        type: pick("type"),
        bookKey: pick("bookKey"),
        displayedPage: pick("displayedPage"),
        notes: pick("notes")
      });
    });
  }

  async saveEntries(html) {
    this.readEntriesFromForm(html);
    const saved = await setReferenceIndex(this.entries);
    if (!saved) return;
    ui.notifications?.info("QuickDeck: Reference Index metadata saved.");
    this.render(false);
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='add-reference-index-entry']").on("click", (event) => {
      event.preventDefault();
      this.readEntriesFromForm(html);
      this.addEntry();
      this.render(false);
    });

    html.find("[data-action='remove-reference-index-entry']").on("click", (event) => {
      event.preventDefault();
      const index = Number(event.currentTarget.dataset.index);
      this.readEntriesFromForm(html);
      this.removeEntry(index);
      this.render(false);
    });

    html.find("[data-action='save-reference-index']").on("click", async (event) => {
      event.preventDefault();
      await this.saveEntries(html);
    });
  }
}
