function identityForReference(parsed) {
  if (parsed.type === "quran") return `quran:${parsed.chapter}`;
  if (parsed.type === "old" || parsed.type === "new") return `${parsed.type}:${parsed.book}:${parsed.chapter}`;
  return "";
}

/** Group adjacent scripture keys without changing their stored representation. */
export function groupConsecutiveReferences(references, parseReference) {
  const groups = [];
  for (const reference of references || []) {
    const parsed = parseReference(reference);
    const identity = identityForReference(parsed);
    const previous = groups.at(-1);
    if (identity && previous?.identity === identity && parsed.verse === previous.end + 1) {
      previous.end = parsed.verse;
      previous.references.push(reference);
      continue;
    }
    groups.push({
      identity,
      parsed,
      start: Number(parsed.verse) || 0,
      end: Number(parsed.verse) || 0,
      references: [reference],
    });
  }
  return groups;
}

export function formatReferenceRange(group, { separator = ":", includeSource = false } = {}) {
  if (!group || group.references.length === 1 && !["quran", "old", "new"].includes(group.parsed.type)) {
    return group?.parsed?.label || "Reference";
  }
  const { parsed, start, end } = group;
  const verses = start === end ? String(start) : `${start}-${end}`;
  if (parsed.type === "quran") return `${includeSource ? "Quran " : ""}${parsed.chapter}${separator}${verses}`;
  if (parsed.type === "old" || parsed.type === "new") return `${parsed.book} ${parsed.chapter}${separator}${verses}`;
  return parsed.label || "Reference";
}

export function rangeIdentity(group) {
  return `${group.identity}:${group.start}-${group.end}`;
}
