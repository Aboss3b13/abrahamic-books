import assert from "node:assert/strict";
import { filterGraphForSearch } from "../notes-mindmap.js";

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

console.log("Mindmap search keeps expanded passage controls visible.");
