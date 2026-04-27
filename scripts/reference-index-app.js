import {
  findReferenceIndexEntryIndex,
  getReferenceIndex,
  normalizeReferenceIndexEntry,
  safeSerializeReferenceIndex,
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

  getSearchableText(row) {
    const fieldValues = ["name", "type", "bookKey", "displayedPage", "notes"].map((field) => {
      return row.querySelector(`[data-field='${field}']`)?.value ?? "";
    });
    return fieldValues.join(" ").toLowerCase();
  }

  applySearchFilter(html) {
    const searchInput = html.find("[data-reference-index-search]")?.get(0);
    const emptyState = html.find("[data-reference-filter-empty]")?.get(0);
    const rows = Array.from(html.find("[data-reference-index-row]") ?? []);
    if (!searchInput || rows.length <= 0) {
      if (emptyState) emptyState.hidden = true;
      return;
    }

    const needle = String(searchInput.value ?? "").trim().toLowerCase();
    let visibleCount = 0;

    for (const row of rows) {
      const matches = !needle || this.getSearchableText(row).includes(needle);
      row.hidden = !matches;
      if (matches) visibleCount += 1;
    }

    if (emptyState) emptyState.hidden = visibleCount > 0 || !needle;
  }

  async saveEntries(html) {
    this.readEntriesFromForm(html);
    const saved = await setReferenceIndex(this.entries);
    if (!saved) return;
    ui.notifications?.info("QuickDeck: Reference Index metadata saved.");
    this.render(false);
  }

  async copyToClipboard(text) {
    const asText = typeof text === "string" ? text : "";
    if (!asText) return false;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(asText);
        return true;
      }
    } catch (error) {
      console.warn("gurps-quickdeck | Clipboard API copy failed; falling back to textarea copy.", error);
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = asText;
      textarea.setAttribute("readonly", "readonly");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return Boolean(copied);
    } catch (error) {
      console.warn("gurps-quickdeck | Legacy copy fallback failed.", error);
      return false;
    }
  }

  getUniqueEntryKey(entry) {
    const normalized = normalizeReferenceIndexEntry(entry);
    return `${String(normalized.name || "").toLowerCase()}::${String(normalized.type || "").toLowerCase()}`;
  }

  parseImportPayload(rawValue) {
    if (typeof rawValue !== "string" || !rawValue.trim()) {
      return {
        ok: false,
        message: "Import JSON is empty.",
        entries: []
      };
    }

    try {
      const parsed = JSON.parse(rawValue);
      if (!Array.isArray(parsed)) {
        return {
          ok: false,
          message: "Import JSON must be an array of metadata entries.",
          entries: []
        };
      }

      const entries = parsed.map((entry) => normalizeReferenceIndexEntry(entry)).filter((entry) => entry.name);
      if (entries.length <= 0) {
        return {
          ok: false,
          message: "No valid named entries found in import JSON.",
          entries: []
        };
      }

      return {
        ok: true,
        message: null,
        entries
      };
    } catch (error) {
      console.warn("gurps-quickdeck | Reference Index JSON import parse error.", error);
      return {
        ok: false,
        message: "Import JSON is invalid. Please fix the JSON and try again.",
        entries: []
      };
    }
  }

  async exportReferenceIndexJson(html) {
    this.readEntriesFromForm(html);
    const serialized = safeSerializeReferenceIndex(this.entries);
    if (serialized === null) {
      ui.notifications?.warn("QuickDeck: Could not serialize Reference Index metadata for export.");
      return;
    }

    const copied = await this.copyToClipboard(serialized);
    if (copied) {
      ui.notifications?.info("QuickDeck: Reference Index metadata JSON copied to clipboard.");
    } else {
      ui.notifications?.warn("QuickDeck: Could not copy Reference Index JSON automatically.");
    }
  }

  async importReferenceIndexJson(html, mode = "merge") {
    const importField = html.find("[data-reference-index-import-json]")?.get(0);
    if (!importField) {
      ui.notifications?.warn("QuickDeck: Import field unavailable.");
      return;
    }

    const parsed = this.parseImportPayload(importField.value ?? "");
    if (!parsed.ok) {
      ui.notifications?.warn(`QuickDeck: ${parsed.message}`);
      return;
    }

    this.readEntriesFromForm(html);

    let nextEntries = [];
    if (mode === "replace") {
      nextEntries = parsed.entries;
    } else {
      const merged = [];
      const keyToIndex = new Map();

      for (const current of this.entries) {
        const normalizedCurrent = normalizeReferenceIndexEntry(current);
        if (!normalizedCurrent.name) continue;
        const key = this.getUniqueEntryKey(normalizedCurrent);
        if (keyToIndex.has(key)) continue;
        keyToIndex.set(key, merged.length);
        merged.push(normalizedCurrent);
      }

      for (const incoming of parsed.entries) {
        const normalizedIncoming = normalizeReferenceIndexEntry(incoming);
        if (!normalizedIncoming.name) continue;
        const key = this.getUniqueEntryKey(normalizedIncoming);
        const existingIndex = keyToIndex.get(key);
        if (Number.isInteger(existingIndex)) {
          merged[existingIndex] = normalizedIncoming;
        } else {
          keyToIndex.set(key, merged.length);
          merged.push(normalizedIncoming);
        }
      }

      nextEntries = merged;
    }

    const saved = await setReferenceIndex(nextEntries);
    if (!saved) return;

    this.entries = nextEntries;
    this.pendingFocusIndex = null;
    this.render(false);
    const modeLabel = mode === "replace" ? "replaced" : "merged";
    ui.notifications?.info(`QuickDeck: Imported metadata ${modeLabel} successfully.`);
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

    html.find("[data-reference-index-search]").on("input", () => {
      this.applySearchFilter(html);
    });
    this.applySearchFilter(html);

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

    html.find("[data-action='export-reference-index-json']").on("click", async (event) => {
      event.preventDefault();
      await this.exportReferenceIndexJson(html);
    });

    html.find("[data-action='import-reference-index-merge']").on("click", async (event) => {
      event.preventDefault();
      await this.importReferenceIndexJson(html, "merge");
    });

    html.find("[data-action='import-reference-index-replace']").on("click", async (event) => {
      event.preventDefault();
      await this.importReferenceIndexJson(html, "replace");
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
