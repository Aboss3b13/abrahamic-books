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
assert(notesSystemSource.includes("SHARED_MIND_MAP_API"), "mind-map snapshots should use the short-link sharing service");
assert(notesSystemSource.includes("this.user.getIdToken()"), "private mind-map sharing should authenticate with the existing Firebase account");
assert(notesSystemSource.includes("SHARED_MIND_MAP_CHUNK_BYTES"), "large shared maps should upload in safe chunks");
assert(!notesSystemSource.includes("map.notes.slice(0, 60)"), "sharing must not cap maps at sixty notes");

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
assert(appSource.includes('makePublicLink(`map=${created.id}`)'), "shared mind maps should use a short document ID");
assert(appSource.includes("text: String(note.text || \"\")"), "shared maps must retain complete note text");
assert(appSource.includes("async function saveSharedMindMap"), "recipients need a way to save the map and its notes");
assert(appSource.includes(".mindmap-stage"), "map gestures must not trigger app-level swipe navigation");

const shareApiSource = readFileSync(new URL("../public/api/mindmaps.php", import.meta.url), "utf8");
assert(shareApiSource.includes("accounts:lookup"), "the sharing service must verify Firebase identities for private maps");
assert(shareApiSource.includes("accessMode"), "the sharing service must enforce link and custom access modes");
assert(shareApiSource.includes('action === \'chunk\''), "the sharing service must accept maps in chunks");

console.log("Mindmap search and text containment checks passed.");
