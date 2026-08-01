function identityForReference(parsed) {
  if (parsed.type === "quran") return `quran:${parsed.chapter}`;
  if (parsed.type === "old" || parsed.type === "new") return `${parsed.type}:${parsed.book}:${parsed.chapter}`;
  return "";
}

/**
 * Build one canonical set of scripture collections across several notes.
 * A verse is represented once even when several notes reference it, and the
 * union of consecutive verses in a chapter becomes one shared collection.
 */
export function collectReferenceCollections(entries, parseReference) {
  const scriptureBuckets = new Map();
  const otherReferences = new Map();

  for (const [noteId, note] of entries || []) {
    for (const reference of new Set(note?.references || [])) {
      const parsed = parseReference(reference);
      const identity = identityForReference(parsed);
      const verse = Number(parsed.verse) || 0;
      if (!identity || verse < 1) {
        if (!otherReferences.has(reference)) otherReferences.set(reference, { reference, parsed, noteIds: new Set() });
        otherReferences.get(reference).noteIds.add(noteId);
        continue;
      }
      if (!scriptureBuckets.has(identity)) scriptureBuckets.set(identity, { identity, verses: new Map() });
      const bucket = scriptureBuckets.get(identity);
      if (!bucket.verses.has(verse)) bucket.verses.set(verse, { reference, parsed, noteIds: new Set() });
      bucket.verses.get(verse).noteIds.add(noteId);
    }
  }

  const collections = [];
  scriptureBuckets.forEach((bucket) => {
    const verses = [...bucket.verses.entries()].sort(([left], [right]) => left - right);
    let run = [];
    const commit = () => {
      if (!run.length) return;
      const referenceNoteIds = new Map(run.map(([, item]) => [item.reference, new Set(item.noteIds)]));
      collections.push({
        identity: bucket.identity,
        parsed: run[0][1].parsed,
        start: run[0][0],
        end: run.at(-1)[0],
        references: run.map(([, item]) => item.reference),
        noteIds: new Set(run.flatMap(([, item]) => [...item.noteIds])),
        referenceNoteIds,
      });
      run = [];
    };
    verses.forEach((item) => {
      if (run.length && item[0] !== run.at(-1)[0] + 1) commit();
      run.push(item);
    });
    commit();
  });

  otherReferences.forEach(({ reference, parsed, noteIds }) => collections.push({
    identity: "",
    parsed,
    start: Number(parsed.verse) || 0,
    end: Number(parsed.verse) || 0,
    references: [reference],
    noteIds,
    referenceNoteIds: new Map([[reference, new Set(noteIds)]]),
  }));
  return collections;
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
