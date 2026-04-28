import { getReferenceIndex } from "./reference-index-store.js";
import { loadBundledReferenceSummaries, findBundledReferenceSummary } from "./reference-summaries-store.js";
import { openReferenceIndexManager } from "./reference-index-app.js";
import { buildReferenceLookupNames } from "./reference-lookup-name.js";

const TEMPLATE_PATH = "modules/gurps-quickdeck/templates/reference.hbs";

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

function getTypeLabel(type) {
  if (type === "skill") return "Skill";
  if (type === "spell") return "Spell";
  return "Rule";
}

function findManualIndexMatch(referenceData = {}, entries = []) {
  const lookupNames = buildReferenceLookupNames(referenceData.name);
  const normalizedName = lookupNames.exact;
  const normalizedBaseName = lookupNames.base;
  const normalizedType = normalizeText(referenceData.type);
  if (!normalizedName) return null;

  const normalizedEntries = Array.isArray(entries) ? entries : [];

  const exactTypeMatch = normalizedEntries.find((entry) => {
    return normalizeText(entry?.name) === normalizedName && normalizeText(entry?.type) === normalizedType;
  });
  if (exactTypeMatch) return { entry: exactTypeMatch, mode: "exact-name-type" };

  const exactNameOnlyMatch = normalizedEntries.find((entry) => {
    return normalizeText(entry?.name) === normalizedName;
  });
  if (exactNameOnlyMatch) return { entry: exactNameOnlyMatch, mode: "exact-name" };

  const baseNameTypeMatch = normalizedEntries.find((entry) => {
    return normalizeText(entry?.name) === normalizedBaseName && normalizeText(entry?.type) === normalizedType;
  });
  if (baseNameTypeMatch) return { entry: baseNameTypeMatch, mode: "base-name-type", matchedBaseName: baseNameTypeMatch.name };

  const baseNameOnlyMatch = normalizedEntries.find((entry) => {
    return normalizeText(entry?.name) === normalizedBaseName;
  });
  if (baseNameOnlyMatch) return { entry: baseNameOnlyMatch, mode: "base-name", matchedBaseName: baseNameOnlyMatch.name };

  return null;
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

  async getData() {
    const typeLabel = getTypeLabel(this.referenceData.type);
    const bundledSummaries = await loadBundledReferenceSummaries();
    const bundledSummaryMatch = findBundledReferenceSummary(this.referenceData, bundledSummaries);
    const bundledSummaryEntry = bundledSummaryMatch?.entry ?? null;
    const bundledBaseMatched = Boolean(bundledSummaryMatch && bundledSummaryMatch.mode.startsWith("base-name"));

    const manualMatch = findManualIndexMatch(this.referenceData, getReferenceIndex());
    const manualEntry = manualMatch?.entry ?? null;
    const manualBaseMatched = Boolean(manualMatch && manualMatch.mode.startsWith("base-name"));
    const hasExactManualEntry = manualMatch?.mode === "exact-name-type";

    const sourceName =
      manualEntry?.bookKey || this.referenceData.source || bundledSummaryEntry?.sourceName || bundledSummaryEntry?.bookKey || null;
    const displayedPage =
      manualEntry?.displayedPage || this.referenceData.pageHint || bundledSummaryEntry?.displayedPage || null;

    const manualEntryPrefill = {
      name: this.referenceData.name,
      type: this.referenceData.type,
      bookKey: manualEntry?.bookKey || this.referenceData.source || bundledSummaryEntry?.bookKey || "",
      displayedPage: manualEntry?.displayedPage || bundledSummaryEntry?.displayedPage || "",
      notes: manualEntry?.notes || ""
    };

    return {
      title: this.referenceData.name,
      type: typeLabel,
      source: this.referenceData.source || null,
      pageHint: this.referenceData.pageHint || null,
      hasManualEntry: Boolean(manualEntry),
      manualEntry,
      hasManualBaseMatch: manualBaseMatched,
      manualMatchedBaseName: manualMatch?.matchedBaseName || null,
      referenceIndexButtonLabel: hasExactManualEntry ? "Edit Local Override" : "Add Local Override",
      prefillEntryName: manualEntryPrefill.name,
      prefillEntryType: manualEntryPrefill.type,
      prefillEntryBookKey: manualEntryPrefill.bookKey,
      prefillEntryDisplayedPage: manualEntryPrefill.displayedPage,
      hasBundledSummary: Boolean(bundledSummaryEntry?.summary),
      bundledSummary: bundledSummaryEntry?.summary || null,
      hasBundledDescription: Boolean(bundledSummaryEntry?.description),
      bundledDescription: bundledSummaryEntry?.description || null,
      hasBundledNotes: Boolean(bundledSummaryEntry?.notes),
      bundledNotes: bundledSummaryEntry?.notes || null,
      bundledSourceName: bundledSummaryEntry?.sourceName || null,
      bundledDisplayedPage: bundledSummaryEntry?.displayedPage || null,
      bundledAttribute: bundledSummaryEntry?.attribute || null,
      bundledDifficulty: bundledSummaryEntry?.difficulty || null,
      bundledDefaults: bundledSummaryEntry?.defaults || null,
      bundledSpecialtyRequired: bundledSummaryEntry?.specialtyRequired || null,
      bundledSpellClass: bundledSummaryEntry?.spellClass || null,
      bundledCollege: bundledSummaryEntry?.college || null,
      bundledDuration: bundledSummaryEntry?.duration || null,
      bundledCost: bundledSummaryEntry?.cost || null,
      bundledTimeToCast: bundledSummaryEntry?.timeToCast || null,
      bundledPrerequisites: bundledSummaryEntry?.prerequisites || null,
      bundledItem: bundledSummaryEntry?.item || null,
      hasBundledSourceName: Boolean(bundledSummaryEntry?.sourceName),
      hasBundledDisplayedPage: Boolean(bundledSummaryEntry?.displayedPage),
      hasBundledAttribute: Boolean(bundledSummaryEntry?.attribute),
      hasBundledDifficulty: Boolean(bundledSummaryEntry?.difficulty),
      hasBundledDefaults: Boolean(bundledSummaryEntry?.defaults),
      hasBundledSpecialtyRequired: Boolean(bundledSummaryEntry?.specialtyRequired),
      hasBundledSpellClass: Boolean(bundledSummaryEntry?.spellClass),
      hasBundledCollege: Boolean(bundledSummaryEntry?.college),
      hasBundledDuration: Boolean(bundledSummaryEntry?.duration),
      hasBundledCost: Boolean(bundledSummaryEntry?.cost),
      hasBundledTimeToCast: Boolean(bundledSummaryEntry?.timeToCast),
      hasBundledPrerequisites: Boolean(bundledSummaryEntry?.prerequisites),
      hasBundledItem: Boolean(bundledSummaryEntry?.item),
      hasBundledSkillDetails: Boolean(
        bundledSummaryEntry?.attribute ||
          bundledSummaryEntry?.difficulty ||
          bundledSummaryEntry?.defaults ||
          bundledSummaryEntry?.specialtyRequired ||
          bundledSummaryEntry?.sourceName ||
          bundledSummaryEntry?.displayedPage
      ),
      hasBundledSpellDetails: Boolean(
        bundledSummaryEntry?.spellClass ||
          bundledSummaryEntry?.college ||
          bundledSummaryEntry?.duration ||
          bundledSummaryEntry?.cost ||
          bundledSummaryEntry?.timeToCast ||
          bundledSummaryEntry?.prerequisites ||
          bundledSummaryEntry?.item
      ),
      sourceName,
      displayedPage,
      hasSourceName: Boolean(sourceName),
      hasDisplayedPage: Boolean(displayedPage),
      hasBundledMatch: Boolean(bundledSummaryEntry),
      hasBundledBaseMatch: bundledBaseMatched,
      bundledMatchedBaseName: bundledSummaryMatch?.matchedBaseName || null,
      hasSummaryData: Boolean(bundledSummaryEntry?.summary || bundledSummaryEntry?.description || bundledSummaryEntry?.notes),
      emptyStateText: "No bundled summary matched this entry yet."
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

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
          ? "QuickDeck: Opened existing Local Override entry."
          : "QuickDeck: Added a prefilled Local Override row.";
      ui.notifications?.info(notificationText);
    });
  }
}
