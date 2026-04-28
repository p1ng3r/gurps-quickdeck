import { getReferenceIndex, normalizeReferenceIndexEntry, setReferenceIndex } from "./reference-index-store.js";
import { getTextSources, normalizeTextSource, setTextSources } from "./text-sources-store.js";

const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/text-sources.hbs";
const DEFAULT_SOURCE_NAME = "Dungeon Fantasy Adventurers Skills";
const DEFAULT_SOURCE_BOOK_KEY = "dungeon-fantasy-adventurers";

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeSkillName(value) {
  return asString(value)
    .replace(/[†‡]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyHeaderLine(value) {
  const line = asString(value);
  if (!line) return true;

  if (line.length > 72) return true;
  if (/^[A-Z0-9\s\-:&]+$/.test(line) && line === line.toUpperCase()) return true;
  if (/^(skills?|spells?|advantages?|disadvantages?|combat|equipment|notes?)$/i.test(line)) return true;
  if (/^(page|chapter|table|contents?|overview|introduction|summary)$/i.test(line)) return true;
  return false;
}

function parseSkillCandidates(rawText = "", bookKey = "") {
  const lines = String(rawText || "")
    .split(/\r?\n/g)
    .map((line) => line.replace(/\t/g, " ").trim());

  const candidates = [];

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index];
    if (!current || isLikelyHeaderLine(current)) continue;

    const nextLine = lines[index + 1] ?? "";
    const difficultyMatch = nextLine.match(/^(ST|DX|IQ|HT|Will|Per)\s*\/\s*(Easy|Average|Hard|Very Hard)\b/i);
    if (!difficultyMatch) continue;

    const name = normalizeSkillName(current);
    if (!name) continue;
    if (!/^[A-Za-z][A-Za-z0-9'\-()\s/+,\.]*$/.test(name)) continue;

    const hasDagger = /[†‡]/.test(current);
    const confidence = hasDagger ? 0.91 : 0.97;
    candidates.push({
      id: `${name.toLowerCase()}::skill`,
      selected: true,
      name,
      type: "skill",
      bookKey: asString(bookKey),
      confidence,
      evidence: `${current} / ${nextLine}`
    });
  }

  const deduped = [];
  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    deduped.push(candidate);
  }

  return deduped;
}

export class QuickDeckTextSourcesApp extends Application {
  constructor(options = {}) {
    super(options);
    this.sources = getTextSources();
    this.reviewRows = [];
    this.reviewSourceId = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "gurps-quickdeck-text-sources-app",
      classes: ["gurps-quickdeck", "gurps-quickdeck-pdf-sources"],
      popOut: true,
      minimizable: true,
      resizable: true,
      width: 820,
      height: 680,
      title: "QuickDeck Text Sources",
      template: TEMPLATE_PATH
    });
  }

  getData() {
    const rows = this.sources.map((source, index) => ({
      index,
      ...normalizeTextSource(source)
    }));

    return {
      sources: rows,
      hasSources: rows.length > 0,
      reviewRows: this.reviewRows,
      hasReviewRows: this.reviewRows.length > 0,
      warningText:
        "Text sources are stored locally. Do not paste copyrighted material you do not have rights to use.",
      defaultSourceName: DEFAULT_SOURCE_NAME,
      defaultSourceBookKey: DEFAULT_SOURCE_BOOK_KEY
    };
  }

  addSource(prefill = {}) {
    this.sources.push(
      normalizeTextSource({
        displayName: prefill.displayName || "",
        bookKey: prefill.bookKey || "",
        rawText: prefill.rawText || "",
        createdAt: new Date().toISOString()
      })
    );
  }

  ensureRecommendedSource() {
    const existing = this.sources.find((source) => {
      return asString(source.displayName).toLowerCase() === DEFAULT_SOURCE_NAME.toLowerCase();
    });

    if (existing) return;
    this.addSource({
      displayName: DEFAULT_SOURCE_NAME,
      bookKey: DEFAULT_SOURCE_BOOK_KEY
    });
  }

  removeSource(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.sources.length) return;
    this.sources.splice(index, 1);
  }

  readSourcesFromForm(html) {
    const rowElements = Array.from(html.find("[data-source-row]") ?? []);
    this.sources = rowElements.map((row) => {
      const pick = (field) => row.querySelector(`[data-field='${field}']`)?.value ?? "";
      const previousId = row.dataset.sourceId;
      const createdAt = row.dataset.createdAt;
      return normalizeTextSource({
        id: previousId,
        displayName: pick("displayName"),
        bookKey: pick("bookKey"),
        rawText: pick("rawText"),
        createdAt
      });
    });
  }

  async saveSources(html) {
    this.readSourcesFromForm(html);
    const saved = await setTextSources(this.sources);
    if (!saved) return;
    ui.notifications?.info("QuickDeck: Text source metadata saved.");
    this.render(false);
  }

  getSourceById(sourceId) {
    return this.sources.find((source) => source.id === sourceId) ?? null;
  }

  syncReviewSelectionFromDom(html) {
    const checkboxes = Array.from(html.find("[data-review-select]") ?? []);
    const selectedById = new Map();

    for (const box of checkboxes) {
      selectedById.set(box.dataset.rowId, Boolean(box.checked));
    }

    this.reviewRows = this.reviewRows.map((row) => ({
      ...row,
      selected: selectedById.has(row.id) ? selectedById.get(row.id) : row.selected
    }));
  }

  buildReviewRowsForSource(sourceId, html) {
    this.readSourcesFromForm(html);
    const source = this.getSourceById(sourceId);
    if (!source) {
      ui.notifications?.warn("QuickDeck: Source row not found.");
      return;
    }

    const parsed = parseSkillCandidates(source.rawText, source.bookKey);
    this.reviewSourceId = source.id;
    this.reviewRows = parsed;

    if (!parsed.length) {
      ui.notifications?.warn("QuickDeck: No skill-like entries were detected in this text source.");
    } else {
      ui.notifications?.info(`QuickDeck: Found ${parsed.length} potential skills to review.`);
    }

    this.render(false);
  }

  async saveSelectedReviewRows(html) {
    if (!this.reviewRows.length) {
      ui.notifications?.warn("QuickDeck: Nothing to save. Build review rows first.");
      return;
    }

    this.syncReviewSelectionFromDom(html);
    const selected = this.reviewRows.filter((row) => row.selected);
    if (!selected.length) {
      ui.notifications?.warn("QuickDeck: No rows selected for save.");
      return;
    }

    const existing = getReferenceIndex();
    const indexByKey = new Map(
      existing.map((entry, index) => {
        const key = `${String(entry?.name || "").toLowerCase()}::${String(entry?.type || "").toLowerCase()}`;
        return [key, index];
      })
    );

    for (const row of selected) {
      const upsertEntry = normalizeReferenceIndexEntry({
        name: row.name,
        type: "skill",
        bookKey: row.bookKey,
        displayedPage: "",
        notes: ""
      });

      const key = `${upsertEntry.name.toLowerCase()}::${upsertEntry.type.toLowerCase()}`;
      const existingIndex = indexByKey.get(key);

      if (Number.isInteger(existingIndex) && existingIndex >= 0) {
        existing[existingIndex] = {
          ...existing[existingIndex],
          ...upsertEntry,
          notes: asString(existing[existingIndex]?.notes)
        };
      } else {
        existing.push(upsertEntry);
        indexByKey.set(key, existing.length - 1);
      }
    }

    const saved = await setReferenceIndex(existing);
    if (!saved) return;

    ui.notifications?.info(`QuickDeck: Saved ${selected.length} entries to Reference Index.`);
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='add-source']").on("click", (event) => {
      event.preventDefault();
      this.readSourcesFromForm(html);
      this.addSource();
      this.render(false);
    });

    html.find("[data-action='add-default-source']").on("click", (event) => {
      event.preventDefault();
      this.readSourcesFromForm(html);
      this.ensureRecommendedSource();
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

    html.find("[data-action='build-index-from-text-source']").on("click", (event) => {
      event.preventDefault();
      const sourceId = String(event.currentTarget.dataset.sourceId ?? "");
      if (!sourceId) return;
      this.buildReviewRowsForSource(sourceId, html);
    });

    html.find("[data-action='save-selected-review-rows']").on("click", async (event) => {
      event.preventDefault();
      await this.saveSelectedReviewRows(html);
    });

    html.find("[data-action='toggle-review-all']").on("click", (event) => {
      event.preventDefault();
      const shouldSelect = String(event.currentTarget.dataset.select ?? "all") === "all";
      this.reviewRows = this.reviewRows.map((row) => ({ ...row, selected: shouldSelect }));
      this.render(false);
    });
  }
}

let textSourcesApp = null;

export function openTextSourcesManager() {
  if (!textSourcesApp) {
    textSourcesApp = new QuickDeckTextSourcesApp();
  }

  textSourcesApp.render(true);
  return textSourcesApp;
}
