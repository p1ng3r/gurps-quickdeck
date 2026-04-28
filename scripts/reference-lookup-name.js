function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asLookupText(value) {
  return asString(value).toLowerCase();
}

export function getReferenceBaseName(name) {
  const normalized = asString(name);
  if (!normalized) return "";

  const baseName = normalized.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return baseName || normalized;
}

export function buildReferenceLookupNames(name) {
  const normalizedName = asLookupText(name);
  if (!normalizedName) {
    return {
      exact: "",
      base: "",
      hasBaseVariant: false
    };
  }

  const base = asLookupText(getReferenceBaseName(name));
  return {
    exact: normalizedName,
    base,
    hasBaseVariant: Boolean(base && base !== normalizedName)
  };
}
