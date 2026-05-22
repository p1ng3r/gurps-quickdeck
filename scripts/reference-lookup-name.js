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
      hasBaseVariant: false,
      aliases: []
    };
  }

  const base = asLookupText(getReferenceBaseName(name));
  const aliases = [normalizedName];
  if (base && base !== normalizedName) aliases.push(base);

  const orSplit = normalizedName.split(/\s+or\s+/i).map((part) => part.trim()).filter(Boolean);
  if (orSplit.length > 1) {
    for (const part of orSplit) {
      if (!aliases.includes(part)) aliases.push(part);
      const partBase = asLookupText(getReferenceBaseName(part));
      if (partBase && !aliases.includes(partBase)) aliases.push(partBase);
    }
  }

  return {
    exact: normalizedName,
    base,
    hasBaseVariant: Boolean(base && base !== normalizedName),
    aliases
  };
}
