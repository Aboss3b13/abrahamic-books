import { collectReferenceCollections, formatReferenceRange, rangeIdentity } from "./reference-ranges.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const MIN_MAP_SCALE = .025;
const MAX_MAP_SCALE = 40;
const titleCase = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

function scriptureBook(parsed) {
  if (parsed.type === "quran") return { id: "book:quran", label: "Quran", group: "quran" };
  if (["old", "new"].includes(parsed.type)) return { id: `book:bible:${parsed.book}`, label: parsed.book, group: "bible" };
  if (parsed.type === "hadith") return { id: `book:hadith:${parsed.book}`, label: titleCase(parsed.book), group: "hadith" };
  return { id: "book:other", label: "Other sources", group: "reference" };
}

function buildGraph({ entries, folders, formatReference, parseReference, expandedRangeIds = new Set() }) {
  const nodes = new Map();
  const edges = new Map();
  const noteKeys = new Set(entries.map(([key]) => key));
  const addNode = (node) => {
    if (!nodes.has(node.id)) nodes.set(node.id, node);
    return nodes.get(node.id);
  };
  const addEdge = (source, target, kind, details = {}) => {
    const ordered = kind === "note-link" && source > target ? [target, source] : [source, target];
    const id = `${ordered[0]}|${ordered[1]}|${kind}`;
    if (!edges.has(id)) edges.set(id, { id, source: ordered[0], target: ordered[1], kind, visible: true, ...details });
  };

  folders.forEach((folder) => addNode({ id: `folder:${folder.id}`, label: folder.name, type: "folder", rawId: folder.id }));

  entries.forEach(([key, note]) => {
    const noteId = `note:${key}`;
    addNode({
      id: noteId,
      label: note.title?.trim() || "Untitled note",
      type: "note",
      rawId: key,
      summary: note.text || "",
      externalScope: Boolean(note.mindMapExternal),
      searchText: `${note.title || ""} ${note.text || ""} ${(note.tags || []).join(" ")}`,
    });
    if (note.folderId && nodes.has(`folder:${note.folderId}`)) addEdge(`folder:${note.folderId}`, noteId, "folder");
    (note.tags || []).forEach((tag) => {
      const tagId = `tag:${tag}`;
      addNode({ id: tagId, label: `#${tag}`, type: "tag", rawId: tag });
      addEdge(noteId, tagId, "tag");
    });
    (note.linkedNoteIds || []).forEach((linkedKey) => {
      if (noteKeys.has(linkedKey) && linkedKey !== key) addEdge(noteId, `note:${linkedKey}`, "note-link");
    });
  });

  collectReferenceCollections(entries, parseReference).forEach((collection) => {
    const book = addNode({ ...scriptureBook(collection.parsed), type: "book" });
    const isCollection = collection.references.length > 1;
    const identity = rangeIdentity(collection);
    const referenceId = isCollection ? `collection:${identity}` : `reference:${collection.references[0]}`;
    const expanded = isCollection && expandedRangeIds.has(identity);
    addNode({
      id: referenceId,
      label: isCollection ? formatReferenceRange(collection, { separator: ":" }) : formatReference(collection.references[0]),
      type: isCollection ? "collection" : "reference",
      rawId: collection.references[0],
      references: collection.references,
      rangeIdentity: identity,
      isCollection,
      expanded,
      noteCount: collection.noteIds.size,
      bookGroup: book.group,
    });
    addEdge(book.id, referenceId, "book");

    if (!isCollection) {
      collection.noteIds.forEach((noteKey) => addEdge(`note:${noteKey}`, referenceId, "reference"));
      return;
    }

    collection.noteIds.forEach((noteKey) => addEdge(`note:${noteKey}`, referenceId, "reference", {
      rangeIdentity: identity,
      rangeSummary: true,
      visible: !expanded,
    }));
    collection.references.forEach((reference, verseIndex) => {
      const verseId = `reference:${reference}`;
      addNode({
        id: verseId,
        label: formatReference(reference),
        type: "reference",
        rawId: reference,
        references: [reference],
        rangeChild: true,
        rangeParentId: referenceId,
        rangeIdentity: identity,
        verseIndex,
        visible: expanded,
      });
      addEdge(referenceId, verseId, "collection", { rangeIdentity: identity, rangeDetail: true, visible: expanded });
      (collection.referenceNoteIds.get(reference) || []).forEach((noteKey) => addEdge(`note:${noteKey}`, verseId, "reference", {
        rangeIdentity: identity,
        rangeDetail: true,
        visible: expanded,
      }));
    });
  });

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

function filterGraphForSearch(graph, rawQuery) {
  const query = String(rawQuery || "").trim().toLocaleLowerCase();
  if (!query) return graph;
  const visibleIds = new Set(graph.nodes.filter((node) => node.visible !== false).map((node) => node.id));
  const matchingIds = new Set(graph.nodes
    .filter((node) => visibleIds.has(node.id) && `${node.label} ${node.searchText || ""}`.toLocaleLowerCase().includes(query))
    .map((node) => node.id));
  const includedIds = new Set(matchingIds);
  graph.edges.forEach((edge) => {
    if (!edge.visible || !visibleIds.has(edge.source) || !visibleIds.has(edge.target)) return;
    if (matchingIds.has(edge.source) || matchingIds.has(edge.target)) {
      includedIds.add(edge.source);
      includedIds.add(edge.target);
    }
  });
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const matchedTopics = [...matchingIds].filter((id) => nodeById.get(id)?.type === "tag");
  if (matchedTopics.length) {
    const topicNotes = new Set();
    graph.edges.forEach((edge) => {
      if (!edge.visible || !matchedTopics.includes(edge.source) && !matchedTopics.includes(edge.target)) return;
      const other = matchedTopics.includes(edge.source) ? edge.target : edge.source;
      if (nodeById.get(other)?.type === "note") topicNotes.add(other);
    });
    graph.edges.forEach((edge) => {
      if (!edge.visible || !["reference", "collection"].includes(edge.kind)) return;
      const noteId = topicNotes.has(edge.source) ? edge.source : topicNotes.has(edge.target) ? edge.target : "";
      if (!noteId) return;
      const other = edge.source === noteId ? edge.target : edge.source;
      if (!["reference", "collection"].includes(nodeById.get(other)?.type)) return;
      includedIds.add(noteId);
      includedIds.add(other);
    });
  }

  // Keep an expanded passage's summary node in the filtered graph whenever
  // one of its verses is visible. Without the parent, expanding a passage
  // during search removed the only control that could collapse it again.
  // Repeat until stable so the passage's scripture book can remain connected
  // too, making filtered results easier to understand.
  let addedContext = true;
  while (addedContext) {
    addedContext = false;
    graph.nodes.forEach((node) => {
      if (!includedIds.has(node.id) || !node.rangeParentId || includedIds.has(node.rangeParentId)) return;
      includedIds.add(node.rangeParentId);
      addedContext = true;
    });
    graph.edges.forEach((edge) => {
      if (!edge.visible) return;
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      const connectsIncludedPassage = includedIds.has(edge.source) && source?.type === "collection"
        || includedIds.has(edge.target) && target?.type === "collection";
      if (!connectsIncludedPassage) return;
      const other = includedIds.has(edge.source) ? edge.target : edge.source;
      if (nodeById.get(other)?.type !== "book" || includedIds.has(other)) return;
      includedIds.add(other);
      addedContext = true;
    });
  }
  return {
    nodes: graph.nodes.filter((node) => includedIds.has(node.id)),
    edges: graph.edges.filter((edge) => edge.visible && includedIds.has(edge.source) && includedIds.has(edge.target)),
    matchingIds,
  };
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function labelValue(node) {
  return String(node.type === "tag" ? node.label.replace(/^#/, "") : node.label || "Untitled").trim();
}

function nodeWidth(node) {
  const value = labelValue(node);
  const longestWord = value.split(/\s+/).reduce((longest, word) => Math.max(longest, word.length), 0);
  const maximum = node.type === "note" ? 300 : node.type === "reference" ? 240 : 260;
  return clamp(104 + Math.min(value.length, 36) * 4.6 + longestWord * 1.8, 164, maximum);
}

function getNodeLabelLines(node, width) {
  const value = labelValue(node);
  const maxCharacters = Math.max(9, Math.floor((width - 62) / 8.3));
  const words = value.split(/\s+/).flatMap((word) => word.length > maxCharacters
    ? word.match(new RegExp(`.{1,${maxCharacters}}`, "g")) || [word]
    : [word]);
  const lines = [];
  words.forEach((word) => {
    const current = lines.at(-1) || "";
    if (!current || `${current} ${word}`.length > maxCharacters) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
  });
  return lines.length ? lines : ["Untitled"];
}

function nodeHeight(node) {
  return Math.max(64, 32 + getNodeLabelLines(node, node.layoutWidth || nodeWidth(node)).length * 16 + 18);
}

const ZONE_META = {
  folder: { label: "Folders", description: "Where notes are kept", icon: "▰", columns: 1 },
  note: { label: "Notes", description: "Your ideas and reflections", icon: "✎", columns: 4 },
  tag: { label: "Topics", description: "Hashtags shared by notes", icon: "#", columns: 2 },
  book: { label: "Scripture", description: "Books and collections", icon: "▤", columns: 1 },
  collection: { label: "Passages", description: "Tap a passage to reveal its verses", icon: "＋", columns: 2 },
  reference: { label: "Verses", description: "Individual scripture references", icon: "↗", columns: 3 },
};

function layOut(nodes, viewport) {
  const order = ["folder", "note", "tag", "book", "collection", "reference"];
  const portrait = viewport.portrait;
  const zoneGap = 34;
  const panelPadding = 26;
  const headerHeight = 78;
  const cellGapX = 18;
  const cellGapY = 18;
  const rowHeight = 104;
  const zones = [];
  let cursorX = 24;
  let cursorY = 24;

  const placeZone = (type, items, columns, x, y, forcedWidth = 0) => {
    const cellWidth = Math.max(...items.map((node) => nodeWidth(node))) + cellGapX;
    const rows = Math.ceil(items.length / columns);
    const width = Math.max(forcedWidth, panelPadding * 2 + columns * cellWidth);
    const height = headerHeight + panelPadding + rows * rowHeight;
    const zone = { type, items, columns, cellWidth, x, y, width, height };
    const contentWidth = columns * cellWidth;
    const contentX = x + (width - contentWidth) / 2;
    items.forEach((node, index) => {
      node.layoutWidth = nodeWidth(node);
      node.layoutHeight = nodeHeight(node);
      node.x = contentX + cellWidth * (index % columns) + cellWidth / 2;
      node.y = y + headerHeight + rowHeight * Math.floor(index / columns) + rowHeight / 2;
    });
    return zone;
  };

  const itemsByType = new Map(order.map((type) => [type, nodes.filter((node) => node.type === type).sort((left, right) => left.label.localeCompare(right.label))]));

  if (portrait) {
    const fullWidth = 1240;
    const halfWidth = (fullWidth - zoneGap) / 2;
    const compactTypes = ["folder", "book", "tag", "collection"].filter((type) => itemsByType.get(type).length);
    const compactRows = Array.from({ length: Math.ceil(compactTypes.length / 2) }, (_, index) => compactTypes.slice(index * 2, index * 2 + 2));
    const rows = [compactRows[0], ["note"], ...compactRows.slice(1), ["reference"]].filter(Boolean);
    rows.forEach((rowTypes) => {
      const present = rowTypes.filter((type) => itemsByType.get(type).length);
      if (!present.length) return;
      const rowZones = present.map((type, index) => {
        const items = itemsByType.get(type);
        const fullRow = present.length === 1;
        const maximumColumns = fullRow ? (type === "note" ? 5 : type === "reference" ? 4 : 3) : 2;
        const desiredColumns = fullRow
          ? Math.max(2, Math.ceil(Math.sqrt(items.length * 1.35)))
          : (type === "folder" || type === "book" ? 1 : 2);
        const columns = Math.max(1, Math.min(maximumColumns, desiredColumns, items.length));
        const zoneWidth = fullRow ? fullWidth : halfWidth;
        const zoneX = 24 + (fullRow ? 0 : index * (halfWidth + zoneGap));
        return placeZone(type, items, columns, zoneX, cursorY, zoneWidth);
      });
      const rowHeight = Math.max(...rowZones.map((zone) => zone.height));
      rowZones.forEach((zone) => { zone.height = rowHeight; zones.push(zone); });
      cursorY += rowHeight + zoneGap;
    });
    const height = Math.max(760, cursorY - zoneGap + 24);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    return { width: fullWidth + 48, height, zones, byId, portrait };
  }

  order.forEach((type) => {
    const items = itemsByType.get(type);
    if (!items.length) return;
    const desiredColumns = ZONE_META[type].columns;
    const columns = Math.max(1, Math.min(desiredColumns, items.length));
    const zone = placeZone(type, items, columns, cursorX, 24);
    zones.push(zone);
    cursorX += zone.width + zoneGap;
  });

  const height = Math.max(520, ...zones.map((zone) => zone.height + 48));
  zones.forEach((zone) => { zone.height = height - 48; });
  const width = Math.max(720, cursorX - zoneGap + 24);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return { width, height, zones, byId, portrait };
}

function edgePath(edge) {
  const dx = edge.b.x - edge.a.x;
  const dy = edge.b.y - edge.a.y;
  if (Math.abs(dy) > Math.abs(dx) * 1.15) {
    const direction = Math.sign(dy) || 1;
    const startY = edge.a.y + direction * edge.a.layoutHeight / 2;
    const endY = edge.b.y - direction * edge.b.layoutHeight / 2;
    const bend = Math.max(48, Math.abs(endY - startY) * .42);
    return `M ${edge.a.x} ${startY} C ${edge.a.x} ${startY + direction * bend}, ${edge.b.x} ${endY - direction * bend}, ${edge.b.x} ${endY}`;
  }
  const direction = Math.sign(dx) || 1;
  const startX = edge.a.x + direction * edge.a.layoutWidth / 2;
  const endX = edge.b.x - direction * edge.b.layoutWidth / 2;
  const bend = Math.max(48, Math.abs(endX - startX) * .42);
  return `M ${startX} ${edge.a.y} C ${startX + direction * bend} ${edge.a.y}, ${endX - direction * bend} ${edge.b.y}, ${endX} ${edge.b.y}`;
}

function shortLabel(value, limit = 160) {
  const text = String(value || "");
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

export function renderNotesMindMap(container, options) {
  container._mindMapCleanup?.();
  container._expandedReferenceRanges ||= new Set();
  const expandedRangeIds = container._expandedReferenceRanges;
  const fullGraph = buildGraph({ ...options, expandedRangeIds });
  if (!fullGraph.nodes.length) {
    container.innerHTML = `<button class="mindmap-close mindmap-empty-close" type="button" aria-label="Close mind map"><i class="ti ti-x"></i></button><div class="mindmap-empty"><i class="ti ti-affiliate" aria-hidden="true"></i><h3>No notes to map yet</h3><p>Create a note or clear the current filters to reveal your knowledge map.</p></div>`;
    container.querySelector(".mindmap-close").addEventListener("click", options.onClose);
    return;
  }

  const searchQuery = String(container._mindMapSearchQuery || "");
  const graph = filterGraphForSearch(fullGraph, searchQuery);
  const noSearchResults = Boolean(searchQuery.trim() && !graph.nodes.length);

  const counts = graph.nodes.reduce((result, node) => ({ ...result, [node.type]: (result[node.type] || 0) + 1 }), {});
  container.classList.remove("has-map-selection", "has-map-search");
  container.innerHTML = `
    <header class="mindmap-header">
      <div><span class="mindmap-kicker">A clear map of your study</span><h3>${options.focusFolderId ? `${escapeHTML(options.rootLabel)} connections` : "Notes and connections"}</h3><p><span data-map-note-count>${counts.note || 0} notes</span> · <span data-map-topic-count>${counts.tag || 0} topics</span> · <span data-map-verse-count>${graph.nodes.filter((node) => node.type === "reference" && (!node.rangeChild || node.visible)).length} visible verses</span></p></div>
      <label class="mindmap-search"><i class="ti ti-search" aria-hidden="true"></i><input type="search" placeholder="Find a note, topic, or verse" aria-label="Find something in the mind map"><button type="button" aria-label="Clear map search" hidden><i class="ti ti-x"></i></button></label>
      <div class="mindmap-actions" role="group" aria-label="Mind map controls">
        <button type="button" data-map-zoom="out" aria-label="Zoom out"><i class="ti ti-minus"></i></button>
        <button type="button" data-map-reset aria-label="Fit entire map"><i class="ti ti-focus-centered"></i><span>Fit</span></button>
        ${expandedRangeIds.size ? `<button type="button" data-map-collapse aria-label="Collapse all expanded passages"><i class="ti ti-fold-down"></i><span>Collapse passages</span></button>` : ""}
        <button type="button" data-map-zoom="in" aria-label="Zoom in"><i class="ti ti-plus"></i></button>
      </div>
      <button class="mindmap-close" type="button" aria-label="Close mind map"><i class="ti ti-x"></i></button>
    </header>
    <div class="mindmap-guide"><i class="ti ti-pointer" aria-hidden="true"></i><span><strong>Tap anything to show its direct connections.</strong> Topics also reveal the verses connected through their notes.</span></div>
    <div class="mindmap-legend" aria-label="Mind map key"><span data-legend="note"><i></i>Note</span><span data-legend="note-link"><i></i>Linked note</span><span data-legend="tag"><i></i>Topic</span><span data-legend="folder"><i></i>Folder</span><span data-legend="book"><i></i>Scripture</span><span data-legend="collection"><i></i>Passage</span><span data-legend="reference"><i></i>Verse</span></div>
    <div class="mindmap-stage"><svg role="img" aria-label="Interactive clustered graph of notes, topics, scripture passages, and verses"></svg>${noSearchResults ? `<div class="mindmap-no-results"><i class="ti ti-search-off" aria-hidden="true"></i><strong>No connections found</strong><span>Try another note, topic, or verse.</span></div>` : ""}</div>
    <div class="mindmap-hint"><i class="ti ti-zoom-scan"></i> Drag to move · pinch or scroll to zoom · tap empty space to clear focus</div>
    <aside class="mindmap-inspector" hidden></aside>`;

  const stage = container.querySelector(".mindmap-stage");
  const svg = stage.querySelector("svg");
  const inspector = container.querySelector(".mindmap-inspector");
  const searchInput = container.querySelector(".mindmap-search input");
  const searchClear = container.querySelector(".mindmap-search button");
  searchInput.value = searchQuery;
  searchClear.hidden = !searchQuery;
  container.classList.toggle("has-map-search", Boolean(searchQuery));
  if (noSearchResults) {
    let searchTimer = 0;
    const updateSearch = () => {
      clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        container._mindMapSearchQuery = searchInput.value.trim();
        container._mindMapRestoreSearchFocus = true;
        delete container._mindMapView;
        renderNotesMindMap(container, options);
      }, 140);
    };
    searchInput.addEventListener("input", updateSearch);
    searchClear.addEventListener("click", () => {
      clearTimeout(searchTimer);
      container._mindMapSearchQuery = "";
      container._mindMapRestoreSearchFocus = true;
      delete container._mindMapView;
      renderNotesMindMap(container, options);
    });
    container.querySelector(".mindmap-close").addEventListener("click", options.onClose);
    if (container._mindMapRestoreSearchFocus) {
      delete container._mindMapRestoreSearchFocus;
      requestAnimationFrame(() => { searchInput.focus(); searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length); });
    }
    container._mindMapCleanup = () => clearTimeout(searchTimer);
    return;
  }
  const stageRect = stage.getBoundingClientRect();
  const viewportWidth = 1200;
  const viewportHeight = Math.max(620, viewportWidth * (stageRect.height || 700) / Math.max(stageRect.width || 1000, 1));
  const portrait = window.innerHeight > window.innerWidth;
  let responsiveBucket = `${portrait ? "portrait" : "landscape"}:${Math.round(stageRect.width / 160)}`;
  const visibleNodes = graph.nodes.filter((node) => node.visible !== false);
  const { width, height, zones, byId } = layOut(visibleNodes, { width: stageRect.width, height: stageRect.height, portrait });
  let resizeTimer = 0;
  const resizeObserver = new ResizeObserver(() => {
    const nextPortrait = window.innerHeight > window.innerWidth;
    const nextBucket = `${nextPortrait ? "portrait" : "landscape"}:${Math.round(stage.getBoundingClientRect().width / 160)}`;
    if (nextBucket === responsiveBucket) return;
    responsiveBucket = nextBucket;
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => renderNotesMindMap(container, options), 180);
  });
  resizeObserver.observe(stage);
  const links = graph.edges.map((edge) => ({ ...edge, a: byId.get(edge.source), b: byId.get(edge.target) })).filter((edge) => edge.a && edge.b && edge.visible);
  const adjacency = new Map();
  links.forEach((edge) => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.source).push(edge);
    adjacency.get(edge.target).push(edge);
  });
  svg.setAttribute("viewBox", `0 0 ${viewportWidth} ${viewportHeight}`);
  svg.dataset.layout = portrait ? "portrait" : "landscape";
  const world = svgElement("g", { class: "mindmap-world" });
  const zoneLayer = svgElement("g", { class: "mindmap-zones" });
  const edgeLayer = svgElement("g", { class: "mindmap-edges" });
  const nodeLayer = svgElement("g", { class: "mindmap-nodes" });
  world.append(zoneLayer, edgeLayer, nodeLayer);
  svg.append(world);

  zones.forEach((zone) => {
    const meta = ZONE_META[zone.type];
    const group = svgElement("g", { class: `mindmap-zone zone-${zone.type}`, "data-zone": zone.type });
    group.append(svgElement("rect", { x: zone.x, y: zone.y, width: zone.width, height: zone.height, rx: 24 }));
    const icon = svgElement("text", { class: "mindmap-zone-icon", x: zone.x + 22, y: zone.y + 31 });
    icon.textContent = meta.icon;
    const title = svgElement("text", { class: "mindmap-zone-title", x: zone.x + 48, y: zone.y + 29 });
    title.textContent = `${meta.label} · ${zone.items.length}`;
    const description = svgElement("text", { class: "mindmap-zone-description", x: zone.x + 22, y: zone.y + 54 });
    description.textContent = meta.description;
    group.append(icon, title, description);
    zoneLayer.append(group);
  });

  links.forEach((edge) => {
    const path = svgElement("path", {
      class: `mindmap-edge edge-${edge.kind}${edge.visible ? "" : " is-map-hidden"}`,
      "data-edge-id": edge.id,
      "data-source": edge.source,
      "data-target": edge.target,
      ...(edge.rangeIdentity ? { "data-range-identity": edge.rangeIdentity } : {}),
      ...(edge.rangeSummary ? { "data-range-summary": "true" } : {}),
      ...(edge.rangeDetail ? { "data-range-detail": "true" } : {}),
    });
    path.setAttribute("d", edgePath(edge));
    edgeLayer.append(path);
  });

  visibleNodes.forEach((node, nodeIndex) => {
    const nodeClass = `mindmap-node node-${node.type}${node.expanded ? " is-expanded" : ""}${node.rangeChild ? " is-range-child" : ""}${node.externalScope ? " is-external-note" : ""}${node.visible === false ? " is-map-hidden" : ""}${graph.matchingIds?.has(node.id) ? " is-search-match" : ""}`;
    const group = svgElement("g", {
      class: nodeClass,
      transform: `translate(${node.x} ${node.y})`,
      tabindex: node.visible === false ? "-1" : "0",
      role: "button",
      "aria-label": node.isCollection ? `Passage ${node.label}. ${node.expanded ? "Expanded; activate to collapse." : "Collapsed; activate to show its verses."}` : `${ZONE_META[node.type]?.label || node.type}: ${node.label}`,
      "data-node-id": node.id,
      "data-node-type": node.type,
      ...(node.rangeIdentity ? { "data-range-identity": node.rangeIdentity } : {}),
      style: `--node-order:${Math.min(nodeIndex, 12)}`,
    });
    const title = svgElement("title");
    title.textContent = node.label;
    group.append(title, svgElement("rect", { x: -node.layoutWidth / 2, y: -node.layoutHeight / 2, width: node.layoutWidth, height: node.layoutHeight, rx: 14 }));
    const icon = svgElement("text", { class: "node-icon", x: -node.layoutWidth / 2 + 19, y: -5, "aria-hidden": "true" });
    icon.textContent = node.isCollection ? (node.expanded ? "−" : "+") : ({ note: "✎", folder: "▰", tag: "#", book: "▤", reference: "↗" })[node.type] || "•";
    const lines = getNodeLabelLines(node, node.layoutWidth);
    const label = svgElement("text", { class: "node-label", x: -node.layoutWidth / 2 + 38, y: -7 - (lines.length - 1) * 8 });
    lines.forEach((line, index) => {
      const span = svgElement("tspan", { x: -node.layoutWidth / 2 + 38, dy: index ? 16 : 0 });
      span.textContent = index < lines.length - 1 ? `${line} ` : line;
      label.append(span);
    });
    const typeLabel = svgElement("text", { class: "node-type-label", x: -node.layoutWidth / 2 + 38, y: 13 + (lines.length - 1) * 8 });
    typeLabel.textContent = node.isCollection
      ? `${node.references.length} VERSES · ${node.noteCount} NOTES · ${node.expanded ? "SHOWN" : "TAP TO SHOW"}`
      : node.rangeChild ? "VERSE FROM PASSAGE" : node.externalScope ? "LINKED NOTE · OTHER FOLDER" : ({ note: "NOTE", folder: "FOLDER", tag: "TOPIC", book: "SCRIPTURE", reference: "VERSE" })[node.type];
    group.append(icon, label, typeLabel);
    nodeLayer.append(group);
  });

  const noteZone = zones.find((zone) => zone.type === "note");
  const fitPadding = portrait ? 22 : 34;
  const fitScale = clamp(Math.min((viewportWidth - fitPadding * 2) / width, (viewportHeight - fitPadding * 2) / height), MIN_MAP_SCALE, 4);
  const startScale = portrait ? clamp((viewportWidth - 28) / width, MIN_MAP_SCALE, 4) : fitScale;
  const startX = (viewportWidth - width * startScale) / 2;
  const startY = portrait ? 18 : (viewportHeight - height * startScale) / 2;
  const savedView = container._mindMapView?.orientation === (portrait ? "portrait" : "landscape") ? container._mindMapView : null;
  let scale = savedView?.scale || startScale;
  let tx = savedView?.tx ?? startX;
  let ty = savedView?.ty ?? startY;
  let transformFrame = 0;
  let cameraFrame = 0;
  let selected = "";
  const applyTransform = () => {
    if (transformFrame) return;
    transformFrame = requestAnimationFrame(() => {
      transformFrame = 0;
      world.setAttribute("transform", `translate(${tx} ${ty}) scale(${scale})`);
      container._mindMapView = { scale, tx, ty, orientation: portrait ? "portrait" : "landscape" };
    });
  };
  const animateView = (nextScale, nextTx, nextTy) => {
    cancelAnimationFrame(cameraFrame);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      scale = nextScale; tx = nextTx; ty = nextTy; applyTransform(); return;
    }
    const startScale = scale; const startX = tx; const startY = ty; const started = performance.now();
    const step = (now) => {
      const progress = clamp((now - started) / 320, 0, 1);
      const eased = 1 - (1 - progress) ** 3;
      scale = startScale + (nextScale - startScale) * eased;
      tx = startX + (nextTx - startX) * eased;
      ty = startY + (nextTy - startY) * eased;
      world.setAttribute("transform", `translate(${tx} ${ty}) scale(${scale})`);
      container._mindMapView = { scale, tx, ty, orientation: portrait ? "portrait" : "landscape" };
      if (progress < 1) cameraFrame = requestAnimationFrame(step);
    };
    cameraFrame = requestAnimationFrame(step);
  };
  const fit = () => animateView(fitScale, (viewportWidth - width * fitScale) / 2, (viewportHeight - height * fitScale) / 2);
  const zoom = (factor, clientX, clientY) => {
    cancelAnimationFrame(cameraFrame);
    const next = clamp(scale * factor, MIN_MAP_SCALE, MAX_MAP_SCALE);
    const rect = svg.getBoundingClientRect();
    const focalX = clientX ?? rect.left + rect.width / 2;
    const focalY = clientY ?? rect.top + rect.height / 2;
    const x = (focalX - rect.left) / rect.width * viewportWidth;
    const y = (focalY - rect.top) / rect.height * viewportHeight;
    tx = x - (x - tx) * next / scale;
    ty = y - (y - ty) * next / scale;
    scale = next;
    applyTransform();
  };
  applyTransform();

  const visibleEdge = (edge) => edge.visible;
  const showInspector = (node, connectedIds) => {
    const relatedNotes = [...connectedIds].filter((id) => byId.get(id)?.type === "note").length;
    const relatedVerses = [...connectedIds].filter((id) => byId.get(id)?.type === "reference").length;
    const action = node.type === "note" ? "Open note" : node.type === "reference" ? "Read verse" : node.type === "tag" ? "Show these notes" : "";
    inspector.innerHTML = `<button class="mindmap-inspector-close" type="button" aria-label="Clear focus"><i class="ti ti-x"></i></button><span>${escapeHTML(ZONE_META[node.type]?.label || node.type)}</span><strong>${escapeHTML(node.label)}</strong>${node.summary ? `<p>${escapeHTML(shortLabel(node.summary))}</p>` : ""}<small>${relatedNotes} ${relatedNotes === 1 ? "note" : "notes"} · ${relatedVerses} ${relatedVerses === 1 ? "verse" : "verses"} in focus</small>${action ? `<button class="text-button primary" type="button" data-map-action>${escapeHTML(action)}<i class="ti ti-arrow-right"></i></button>` : ""}`;
    inspector.hidden = false;
    inspector.querySelector(".mindmap-inspector-close").addEventListener("click", clearSelection);
    inspector.querySelector("[data-map-action]")?.addEventListener("click", () => {
      if (node.type === "note") options.onOpenNote(node.rawId);
      if (node.type === "reference") options.onOpenReference(node.rawId);
      if (node.type === "tag") options.onFilterTag(node.rawId);
    });
  };

  function clearSelection() {
    selected = "";
    container.classList.remove("has-map-selection");
    nodeLayer.querySelectorAll(".mindmap-node").forEach((item) => item.classList.remove("is-connected"));
    edgeLayer.querySelectorAll(".mindmap-edge").forEach((item) => item.classList.remove("is-connected"));
    inspector.hidden = true;
  }

  function selectNode(node) {
    if (selected === node.id) { clearSelection(); return; }
    selected = node.id;
    const connected = new Set([node.id]);
    const connectedEdges = new Set();
    (adjacency.get(node.id) || []).forEach((edge) => {
      if (!visibleEdge(edge)) return;
      connectedEdges.add(edge.id);
      connected.add(edge.source === node.id ? edge.target : edge.source);
    });
    // A topic connects directly to notes, but its useful scripture context is
    // one edge beyond those notes. Include only passage/verse edges here—not
    // folders, books, other topics, or further notes.
    if (node.type === "tag") {
      [...connected].forEach((connectedId) => {
        if (byId.get(connectedId)?.type !== "note") return;
        (adjacency.get(connectedId) || []).forEach((edge) => {
          if (!visibleEdge(edge) || !["reference", "collection"].includes(edge.kind)) return;
          const other = edge.source === connectedId ? edge.target : edge.source;
          if (!["reference", "collection"].includes(byId.get(other)?.type)) return;
          connected.add(other);
          connectedEdges.add(edge.id);
        });
      });
    }
    container.classList.add("has-map-selection");
    nodeLayer.querySelectorAll(".mindmap-node").forEach((item) => item.classList.toggle("is-connected", connected.has(item.dataset.nodeId)));
    edgeLayer.querySelectorAll(".mindmap-edge").forEach((item) => item.classList.toggle("is-connected", connectedEdges.has(item.dataset.edgeId)));
    showInspector(node, connected);
  }

  const toggleCollection = (node, group) => {
    const expanding = !expandedRangeIds.has(node.rangeIdentity);
    if (expanding) expandedRangeIds.add(node.rangeIdentity);
    else expandedRangeIds.delete(node.rangeIdentity);
    container._mindMapPendingSelection = node.id;
    renderNotesMindMap(container, options);
  };

  const activateNode = (group) => {
    if (!group || group.classList.contains("is-map-hidden")) return;
    const node = byId.get(group.dataset.nodeId);
    if (node.isCollection) toggleCollection(node, group);
    else selectNode(node);
  };
  nodeLayer.addEventListener("dblclick", (event) => {
    const group = event.target.closest?.(".mindmap-node");
    const node = byId.get(group?.dataset.nodeId);
    if (node?.type === "note") options.onOpenNote(node.rawId);
    if (node?.type === "reference") options.onOpenReference(node.rawId);
    if (node?.type === "tag") options.onFilterTag(node.rawId);
  });
  nodeLayer.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const group = event.target.closest?.(".mindmap-node");
    if (!group) return;
    event.preventDefault();
    activateNode(group);
  });

  let searchTimer = 0;
  const runSearch = () => {
    searchClear.hidden = !searchInput.value.trim();
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      container._mindMapSearchQuery = searchInput.value.trim();
      container._mindMapRestoreSearchFocus = true;
      delete container._mindMapView;
      renderNotesMindMap(container, options);
    }, 140);
  };
  searchInput.addEventListener("input", runSearch);
  searchClear.addEventListener("click", () => {
    clearTimeout(searchTimer);
    container._mindMapSearchQuery = "";
    container._mindMapRestoreSearchFocus = true;
    delete container._mindMapView;
    renderNotesMindMap(container, options);
  });

  svg.addEventListener("wheel", (event) => { event.preventDefault(); zoom(Math.exp(-event.deltaY * .0015), event.clientX, event.clientY); }, { passive: false });
  const pointers = new Map();
  let gesture = null;
  let gestureMoved = false;
  let pressedNode = null;
  const mapPoint = (point) => { const rect = svg.getBoundingClientRect(); return { x: (point.x - rect.left) / rect.width * viewportWidth, y: (point.y - rect.top) / rect.height * viewportHeight }; };
  const beginGesture = () => {
    const points = [...pointers.values()].slice(0, 2);
    if (points.length === 2) {
      const a = mapPoint(points[0]); const b = mapPoint(points[1]);
      gesture = { type: "pinch", distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, scale, tx, ty };
    } else if (points.length === 1) gesture = { type: "pan", point: mapPoint(points[0]), clientPoint: points[0], tx, ty };
  };
  svg.addEventListener("pointerdown", (event) => {
    cancelAnimationFrame(cameraFrame);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pressedNode = pointers.size === 1 ? event.target.closest?.(".mindmap-node") : null;
    gestureMoved = false;
    svg.setPointerCapture?.(event.pointerId);
    beginGesture();
  });
  svg.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.values()].slice(0, 2);
    if (points.length === 2 && gesture?.type !== "pinch") beginGesture();
    if (gesture?.type === "pinch" && points.length === 2) {
      gestureMoved = true;
      stage.classList.add("is-panning");
      const a = mapPoint(points[0]); const b = mapPoint(points[1]);
      const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const next = clamp(gesture.scale * distance / gesture.distance, MIN_MAP_SCALE, MAX_MAP_SCALE);
      tx = midpoint.x - (gesture.midpoint.x - gesture.tx) * next / gesture.scale;
      ty = midpoint.y - (gesture.midpoint.y - gesture.ty) * next / gesture.scale;
      scale = next;
    } else if (gesture?.type === "pan" && points.length === 1) {
      const point = mapPoint(points[0]);
      const distance = Math.hypot(points[0].x - gesture.clientPoint.x, points[0].y - gesture.clientPoint.y);
      if (distance > 5) {
        gestureMoved = true;
        stage.classList.add("is-panning");
        tx = gesture.tx + point.x - gesture.point.x;
        ty = gesture.ty + point.y - gesture.point.y;
      }
    }
    applyTransform();
  });
  const endPointer = (event) => {
    const shouldActivate = pointers.size === 1 && !gestureMoved;
    const targetNode = pressedNode;
    pointers.delete(event.pointerId);
    if (pointers.size) beginGesture();
    else {
      gesture = null;
      stage.classList.remove("is-panning");
      pressedNode = null;
      if (shouldActivate) {
        if (targetNode) activateNode(targetNode);
        else clearSelection();
      }
    }
  };
  svg.addEventListener("pointerup", endPointer);
  svg.addEventListener("pointercancel", (event) => { gestureMoved = true; endPointer(event); });
  container.querySelector("[data-map-reset]").addEventListener("click", fit);
  container.querySelector("[data-map-collapse]")?.addEventListener("click", () => {
    expandedRangeIds.clear();
    delete container._mindMapView;
    renderNotesMindMap(container, options);
  });
  container.querySelectorAll("[data-map-zoom]").forEach((button) => button.addEventListener("click", () => zoom(button.dataset.mapZoom === "in" ? 1.22 : .82)));
  container.querySelector(".mindmap-close").addEventListener("click", options.onClose);
  const pendingSelection = container._mindMapPendingSelection;
  if (pendingSelection && byId.has(pendingSelection)) {
    delete container._mindMapPendingSelection;
    selectNode(byId.get(pendingSelection));
  }
  if (container._mindMapRestoreSearchFocus) {
    delete container._mindMapRestoreSearchFocus;
    requestAnimationFrame(() => { searchInput.focus(); searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length); });
  }
  container._mindMapCleanup = () => { cancelAnimationFrame(transformFrame); cancelAnimationFrame(cameraFrame); clearTimeout(searchTimer); clearTimeout(resizeTimer); resizeObserver.disconnect(); };
}

export { filterGraphForSearch };
