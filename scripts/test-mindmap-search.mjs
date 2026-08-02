import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { filterGraphForSearch, wrapNodeText } from "../notes-mindmap.js";

const graph = {
  nodes: [
    { id: "book:quran", type: "book", label: "Quran" },
    { id: "note:mercy", type: "note", label: "Mercy", searchText: "mercy and compassion" },
    { id: "collection:quran:1:1-2", type: "collection", label: "Quran 1:1–2", expanded: true },
    { id: "reference:quran:1:1", type: "reference", label: "Quran 1:1", rangeChild: true, rangeParentId: "collection:quran:1:1-2" },
  ],
  edges: [
    { id: "book-range", source: "book:quran", target: "collection:quran:1:1-2", kind: "book", visible: true },
    { id: "note-verse", source: "note:mercy", target: "reference:quran:1:1", kind: "reference", visible: true },
    { id: "range-verse", source: "collection:quran:1:1-2", target: "reference:quran:1:1", kind: "collection", visible: true },
  ],
};

const filtered = filterGraphForSearch(graph, "mercy");
const visibleIds = new Set(filtered.nodes.map((node) => node.id));

assert(visibleIds.has("note:mercy"), "the search match should remain visible");
assert(visibleIds.has("reference:quran:1:1"), "the matching note's expanded verse should remain visible");
assert(visibleIds.has("collection:quran:1:1-2"), "the expanded passage must remain visible so it can be collapsed");
assert(visibleIds.has("book:quran"), "the passage should retain its scripture context");

const wrapped = wrapNodeText("An extraordinarilylongunbrokenword followed by a note title that keeps going", 14, 4);
assert(wrapped.length <= 4, "mindmap labels must stay within their maximum line count");
assert(wrapped.every((line) => line.length <= 14), "every mindmap label line must fit its node width");

const mindMapSource = readFileSync(new URL("../notes-mindmap.js", import.meta.url), "utf8");
const liveSearchBlock = mindMapSource.slice(mindMapSource.indexOf("const runSearch ="), mindMapSource.indexOf('searchInput.addEventListener("input", runSearch)'));
assert(!liveSearchBlock.includes("renderNotesMindMap("), "typing in map search must not replace the focused input");
assert(liveSearchBlock.includes("is-search-filtered"), "map search should update the existing graph in place");
assert(liveSearchBlock.includes("reflowVisibleGraph"), "map search results should be laid out and fitted without large empty gaps");

const stylesSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
assert(stylesSource.includes(".mindmap-no-results[hidden]"), "the empty-search overlay must stay hidden when results exist");

const notesSystemSource = readFileSync(new URL("../notes-system.js", import.meta.url), "utf8");
const organizerSaveBlock = notesSystemSource.slice(notesSystemSource.indexOf("async saveOrganizer"), notesSystemSource.indexOf("startRealtimeSync"));
assert(!/\n\s+viewMode:/.test(organizerSaveBlock), "the active notes view must never be written to synced organizer data");
assert(!/\n\s+selectedFolderId:/.test(organizerSaveBlock), "the open folder must remain local to each device");

console.log("Mindmap search and text containment checks passed.");
