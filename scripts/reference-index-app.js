import {
  findReferenceIndexEntryIndex,
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

let referenceIndexApp = null;

export class QuickDeckReferenceIndexApp extends Application {
  constructor(options = {}) {
    super(options);
    this.entries = getReferenceIndex();
    this.pendingFocusIndex = null;
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
        focusRow: Number.isInteger(this.pendingFocusIndex) && this.pendingFocusIndex === index,
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

  refreshEntriesFromSettings() {
    this.entries = getReferenceIndex();
  }

  prepareEntryForEdit(entryData = {}) {
    this.refreshEntriesFromSettings();
    const normalized = normalizeReferenceIndexEntry(entryData);
    if (!normalized.name) return null;

    const existingIndex = findReferenceIndexEntryIndex(this.entries, normalized);
    if (existingIndex >= 0) {
      this.pendingFocusIndex = existingIndex;
      return {
        mode: "existing",
        index: existingIndex
      };
    }

    this.entries.push({
      ...normalized,
      notes: normalized.notes || ""
    });
    this.pendingFocusIndex = this.entries.length - 1;
    return {
      mode: "added",
      index: this.pendingFocusIndex
    };
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

    if (Number.isInteger(this.pendingFocusIndex)) {
      const selector = `[data-reference-index-row][data-index='${this.pendingFocusIndex}'] [data-field='name']`;
      const focusTarget = html.find(selector)?.get(0);
      if (focusTarget) {
        window.setTimeout(() => {
          try {
            focusTarget.focus();
            if (typeof focusTarget.select === "function") focusTarget.select();
          } catch (error) {
            console.warn("gurps-quickdeck | Failed to focus reference index row.", error);
          }
        }, 0);
      }
    }

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

export function openReferenceIndexManager(entryData = null) {
  try {
    if (!referenceIndexApp) referenceIndexApp = new QuickDeckReferenceIndexApp();
    let result = null;
    if (entryData) {
      result = referenceIndexApp.prepareEntryForEdit(entryData);
    } else {
      referenceIndexApp.refreshEntriesFromSettings();
      referenceIndexApp.pendingFocusIndex = null;
    }
    referenceIndexApp.render(true);
    const safeResult = result ?? {};
    return {
      app: referenceIndexApp,
      ...safeResult
    };
  } catch (error) {
    console.warn("gurps-quickdeck | Failed to open reference index manager.", error);
    ui.notifications?.warn("QuickDeck: Could not open Reference Index manager.");
    return null;
  }
}
