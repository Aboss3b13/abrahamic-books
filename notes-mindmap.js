import { collectReferenceCollections, formatReferenceRange, rangeIdentity } from "./reference-ranges.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const hash = (value) => [...String(value)].reduce((sum, char) => ((sum << 5) - sum + char.charCodeAt(0)) | 0, 0);
const titleCase = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

function scriptureBook(parsed) {
  if (parsed.type === "quran") return { id: "book:quran", label: "Quran", group: "quran" };
  if (parsed.type === "old") return { id: `book:bible:${parsed.book}`, label: parsed.book, group: "bible" };
  if (parsed.type === "new") return { id: `book:bible:${parsed.book}`, label: parsed.book, group: "bible" };
  if (parsed.type === "hadith") return { id: `book:hadith:${parsed.book}`, label: titleCase(parsed.book), group: "hadith" };
  return { id: "book:other", label: "References", group: "reference" };
}

function buildGraph({ entries, folders, formatReference, parseReference, expandedRangeIds = new Set(), rootLabel = "My notes", rootType = "root", focusFolderId = "" }) {
  const nodes = new Map();
  const edges = new Map();
  const addNode = (node) => {
    if (!nodes.has(node.id)) nodes.set(node.id, node);
    return nodes.get(node.id);
  };
  const addEdge = (source, target, kind) => {
    const id = `${source}|${target}|${kind}`;
    if (!edges.has(id)) edges.set(id, { id, source, target, kind });
  };

  addNode({ id: "root", label: rootLabel, type: "root", scopeType: rootType, weight: Math.max(1, entries.length) });
  const hubs = [
    ...(!focusFolderId ? [["hub:folders", "Notes", "folder"]] : []),
    ["hub:topics", "Topics", "tag"],
    ["hub:books", "Scripture", "book"],
  ];
  hubs.forEach(([id, label, type]) => { addNode({ id, label, type: "hub" }); addEdge("root", id, type); });

  folders.forEach((folder) => {
    addNode({ id: `folder:${folder.id}`, label: folder.name, type: "folder", rawId: folder.id });
    const parent = !folder.parentId || folder.parentId === focusFolderId ? (focusFolderId ? "root" : "hub:folders") : `folder:${folder.parentId}`;
    addEdge(parent, `folder:${folder.id}`, "folder");
  });

  entries.forEach(([key, note]) => {
    const noteId = `note:${key}`;
    addNode({ id: noteId, label: note.title?.trim() || "Untitled note", type: "note", rawId: key, summary: note.text || "", weight: 1 + (note.tags?.length || 0) + (note.references?.length || 0) });
    const folderSource = focusFolderId && note.folderId === focusFolderId
      ? "root"
      : note.folderId ? `folder:${note.folderId}` : "hub:folders";
    addEdge(folderSource, noteId, "folder");

    (note.tags || []).forEach((tag) => {
      const tagId = `tag:${tag}`;
      addNode({ id: tagId, label: `#${tag}`, type: "tag", rawId: tag });
      addEdge("hub:topics", tagId, "tag");
      addEdge(noteId, tagId, "tag");
    });

  });

  // Build shared scripture nodes after every note is known. A verse therefore
  // appears once globally, even when one note stores it by itself and another
  // stores it as part of a consecutive passage.
  collectReferenceCollections(entries, parseReference).forEach((collection) => {
    const book = scriptureBook(collection.parsed);
    const bookNode = addNode({ ...book, type: "book" });
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
      bookGroup: bookNode.group,
    });
    addEdge("hub:books", bookNode.id, "book");
    addEdge(bookNode.id, referenceId, "reference");
    if (expanded) {
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
          bookGroup: bookNode.group,
        });
        addEdge(referenceId, verseId, "collection");
        (collection.referenceNoteIds.get(reference) || []).forEach((noteKey) => addEdge(`note:${noteKey}`, verseId, "reference"));
      });
    } else {
      collection.noteIds.forEach((noteKey) => addEdge(`note:${noteKey}`, referenceId, "reference"));
    }
  });

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

function layOut(nodes, edges, viewport) {
  const viewportWidth = Math.max(320, Number(viewport.width) || window.innerWidth || 390);
  const viewportHeight = Math.max(320, Number(viewport.height) || window.innerHeight || 640);
  viewport = { width: viewportWidth, height: viewportHeight };
  const density = Math.max(1, Math.sqrt(nodes.length / 16));
  let width = Math.max(360, viewport.width) * density;
  let height = Math.max(480, viewport.height) * density;
  const center = { x: width / 2, y: height / 2 };
  const portrait = height > width * 1.08;
  const point = (x, y) => ({ x: width * x, y: height * y });
  const anchors = portrait ? {
    root: point(.5, .42), folder: point(.5, .2), note: point(.48, .43),
    tag: point(.22, .76), book: point(.77, .78), reference: point(.76, .48), collection: point(.76, .48),
  } : {
    root: point(.48, .5), folder: point(.2, .32), note: point(.45, .52),
    tag: point(.4, .82), book: point(.79, .26), reference: point(.8, .61), collection: point(.8, .61),
  };
  const anchorFor = (node) => {
    if (node.id === "root") return center;
    if (node.id === "hub:folders") return portrait ? point(.5, .1) : point(.12, .23);
    if (node.id === "hub:topics") return portrait ? point(.18, .61) : point(.36, .91);
    if (node.id === "hub:books") return portrait ? point(.82, .63) : point(.88, .14);
    if (node.rangeChild) {
      const seed = Math.abs(hash(node.rangeParentId));
      const side = seed % 2 ? 1 : -1;
      return portrait ? point(side > 0 ? .82 : .18, .48) : point(.82, side > 0 ? .7 : .52);
    }
    return anchors[node.type] || center;
  };
  const byId = new Map(nodes.map((node, index) => {
    const seed = Math.abs(hash(node.id));
    const anchor = anchorFor(node);
    node.x = node.id === "root" ? center.x : anchor.x + ((seed % 201) / 200 - .5) * width * .34;
    node.y = node.id === "root" ? center.y : anchor.y + (((seed >> 8) % 201) / 200 - .5) * height * .22;
    node.vx = 0; node.vy = 0; node.index = index; node.layoutWidth = nodeWidth(node); node.layoutHeight = nodeHeight(node);
    return [node.id, node];
  }));
  const links = edges.map((edge) => ({ ...edge, a: byId.get(edge.source), b: byId.get(edge.target) })).filter((edge) => edge.a && edge.b);
  const separateNodes = () => {
    const cellSize = 310;
    const grid = new Map();
    nodes.forEach((node) => {
      const gx = Math.floor(node.x / cellSize); const gy = Math.floor(node.y / cellSize);
      for (let x = gx - 1; x <= gx + 1; x += 1) for (let y = gy - 1; y <= gy + 1; y += 1) {
        (grid.get(`${x}:${y}`) || []).forEach((other) => {
          let dx = node.x - other.x; let dy = node.y - other.y;
          if (!dx && !dy) { dx = hash(node.id) % 2 ? 1 : -1; dy = 1; }
          const overlapX = (node.layoutWidth + other.layoutWidth) / 2 + 20 - Math.abs(dx);
          const overlapY = (node.layoutHeight + other.layoutHeight) / 2 + 18 - Math.abs(dy);
          if (overlapX <= 0 || overlapY <= 0) return;
          const fixedNode = node.id === "root"; const fixedOther = other.id === "root";
          const nodeShare = fixedNode ? 0 : fixedOther ? 1 : .5;
          if (overlapX < overlapY) {
            const direction = Math.sign(dx) || (hash(node.id) % 2 ? 1 : -1);
            const shift = direction * overlapX;
            node.x += shift * nodeShare; other.x -= shift * (1 - nodeShare);
          } else {
            const direction = Math.sign(dy) || (hash(node.id) % 2 ? -1 : 1);
            const shift = direction * overlapY;
            node.y += shift * nodeShare; other.y -= shift * (1 - nodeShare);
          }
        });
      }
      const key = `${gx}:${gy}`; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(node);
    });
  };
  for (let step = 0; step < 92; step += 1) {
    const heat = 1 - step / 110;
    nodes.forEach((node) => {
      const anchor = anchorFor(node);
      node.vx += (anchor.x - node.x) * .0024;
      node.vy += (anchor.y - node.y) * .0024;
    });
    links.forEach(({ a, b, kind }) => {
      const dx = b.x - a.x; const dy = b.y - a.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desired = (a.layoutWidth + b.layoutWidth) * .28 + (kind === "tag" ? 115 : kind === "collection" ? 58 : 88);
      const pull = (distance - desired) * .006;
      a.vx += dx / distance * pull; a.vy += dy / distance * pull;
      b.vx -= dx / distance * pull; b.vy -= dy / distance * pull;
    });
    nodes.forEach((node) => {
      if (node.id === "root") { node.x = center.x; node.y = center.y; return; }
      node.vx *= .72; node.vy *= .72;
      const horizontalPadding = node.layoutWidth / 2 + 18;
      const verticalPadding = node.layoutHeight / 2 + 18;
      node.x = clamp(node.x + node.vx * heat, horizontalPadding, width - horizontalPadding);
      node.y = clamp(node.y + node.vy * heat, verticalPadding, height - verticalPadding);
    });
    separateNodes();
  }
  for (let pass = 0; pass < 12; pass += 1) separateNodes();

  // Lock nodes one at a time, moving only the occasional residual collision
  // to the nearest free point. Unlike a force-only pass, this makes overlap
  // impossible even when a phone has a dense graph with long labels.
  const placed = [];
  const overlapsPlaced = (node, x, y) => placed.some((other) => (
    Math.abs(x - other.x) < (node.layoutWidth + other.layoutWidth) / 2 + 22
    && Math.abs(y - other.y) < (node.layoutHeight + other.layoutHeight) / 2 + 20
  ));
  nodes.forEach((node) => {
    const origin = { x: node.x, y: node.y };
    if (overlapsPlaced(node, node.x, node.y)) {
      let found = false;
      for (let ring = 1; ring < 120 && !found; ring += 1) {
        for (let offset = -ring; offset <= ring && !found; offset += 1) {
          const candidates = [
            [origin.x + offset * 34, origin.y - ring * 28],
            [origin.x + offset * 34, origin.y + ring * 28],
            [origin.x - ring * 34, origin.y + offset * 28],
            [origin.x + ring * 34, origin.y + offset * 28],
          ];
          const free = candidates.find(([x, y]) => !overlapsPlaced(node, x, y));
          if (free) { [node.x, node.y] = free; found = true; }
        }
      }
    }
    placed.push(node);
  });

  const margin = 34;
  const minX = Math.min(...nodes.map((node) => node.x - node.layoutWidth / 2)) - margin;
  const maxX = Math.max(...nodes.map((node) => node.x + node.layoutWidth / 2)) + margin;
  const minY = Math.min(...nodes.map((node) => node.y - node.layoutHeight / 2)) - margin;
  const maxY = Math.max(...nodes.map((node) => node.y + node.layoutHeight / 2)) + margin;
  const contentWidth = maxX - minX; const contentHeight = maxY - minY;
  const viewportRatio = viewport.width / viewport.height;
  if (contentWidth / contentHeight > viewportRatio) { width = contentWidth; height = width / viewportRatio; }
  else { height = contentHeight; width = height * viewportRatio; }
  const offsetX = (width - contentWidth) / 2 - minX;
  const offsetY = (height - contentHeight) / 2 - minY;
  nodes.forEach((node) => { node.x += offsetX; node.y += offsetY; });
  // The SVG viewBox already fits the complete graph to the stage. Starting at
  // a second scale clips the outer nodes on phones and hides the relationships
  // the map is meant to explain.
  return { width, height, byId, links, openingScale: 1 };
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function nodeWidth(node) {
  const value = String(node.type === "tag" ? node.label.replace(/^#/, "") : node.label || "");
  const longestWord = value.split(/\s+/).reduce((longest, word) => Math.max(longest, word.length), 0);
  if (node.type === "hub") return clamp(118 + value.length * 5, 150, 220);
  return clamp(112 + Math.min(value.length, 44) * 5.4 + longestWord * 2.2, node.type === "root" ? 190 : 176, node.type === "note" ? 380 : 330);
}

function nodeHeight(node) {
  const lines = getNodeLabelLines(node, node.layoutWidth || nodeWidth(node));
  return Math.max(node.type === "hub" ? 58 : 68, 32 + lines.length * 18 + (["root", "hub"].includes(node.type) ? 0 : 19));
}

function shortLabel(value, limit = 25) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function getNodeLabelLines(node, width) {
  const value = String(node.type === "tag" ? node.label.replace(/^#/, "") : node.label || "Untitled").trim();
  // SVG text does not participate in normal CSS wrapping. Use a conservative
  // character width so labels always remain inside their node at every zoom.
  const maxCharacters = Math.max(10, Math.floor((width - (node.type === "hub" ? 28 : 64)) / 10.2));
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

export function renderNotesMindMap(container, options) {
  container._mindMapCleanup?.();
  container._mindMapCleanup = null;
  container.classList.remove("has-map-selection");
  const closeMap = () => {
    container._mindMapCleanup?.();
    container._mindMapCleanup = null;
    options.onClose();
  };
  container._expandedReferenceRanges ||= new Set();
  options.expandedRangeIds = container._expandedReferenceRanges;
  const graph = buildGraph(options);
  const counts = graph.nodes.reduce((result, node) => ({ ...result, [node.type]: (result[node.type] || 0) + 1 }), {});
  if (!options.entries.length && !options.folders.length) {
    container.innerHTML = `<button class="mindmap-close mindmap-empty-close" type="button" aria-label="Close mind map"><i class="ti ti-x"></i></button><div class="mindmap-empty"><i class="ti ti-affiliate" aria-hidden="true"></i><h3>No notes to map yet</h3><p>Create a note or clear the current filters to reveal your knowledge map.</p></div>`;
    container.querySelector(".mindmap-close").addEventListener("click", closeMap);
    return;
  }

  container.innerHTML = `
    <header class="mindmap-header">
      <div><span class="mindmap-kicker">Your notes, clearly connected</span><h3>${options.focusFolderId ? `${escapeHTML(options.rootLabel)} connections` : "Notes and their scripture"}</h3><p>${counts.note || 0} ${(counts.note || 0) === 1 ? "note" : "notes"} · ${counts.collection || 0} ${(counts.collection || 0) === 1 ? "collection" : "collections"} · ${counts.reference || 0} individual ${(counts.reference || 0) === 1 ? "verse" : "verses"}</p></div>
      <div class="mindmap-actions" role="group" aria-label="Mind map controls">
        <button type="button" data-map-zoom="out" aria-label="Zoom out"><i class="ti ti-minus"></i></button>
        <button type="button" data-map-reset aria-label="Fit map"><i class="ti ti-focus-centered"></i><span>Fit</span></button>
        <button type="button" data-map-zoom="in" aria-label="Zoom in"><i class="ti ti-plus"></i></button>
      </div>
      <button class="mindmap-close" type="button" aria-label="Close mind map"><i class="ti ti-x"></i></button>
    </header>
    <div class="mindmap-guide"><i class="ti ti-bulb" aria-hidden="true"></i><span><strong>Explore every connection.</strong> Tap a collection to unfold its verses directly in the map; tap it again to collapse.</span></div>
    <div class="mindmap-legend" aria-label="Mind map key"><span data-legend="note"><i></i>Note</span><span data-legend="collection"><i></i>Verse collection</span><span data-legend="reference"><i></i>Single verse</span><span data-legend="tag"><i></i>Topic</span><span data-legend="folder"><i></i>Folder</span><span data-legend="book"><i></i>Scripture</span></div>
    <div class="mindmap-stage"><svg role="img" aria-label="Interactive graph connecting notes, folders, hashtags, books and scripture references"></svg></div>
    <div class="mindmap-hint"><i class="ti ti-zoom-scan"></i> Drag to move · pinch or scroll to zoom · double-tap a verse to read</div>
    <aside class="mindmap-inspector" hidden></aside>`;

  const stage = container.querySelector(".mindmap-stage");
  const svg = stage.querySelector("svg");
  const inspector = container.querySelector(".mindmap-inspector");
  const { width, height, byId, links, openingScale } = layOut(graph.nodes, graph.edges, { width: stage.clientWidth, height: stage.clientHeight });
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const world = svgElement("g", { class: "mindmap-world" });
  const edgeLayer = svgElement("g", { class: "mindmap-edges" });
  const nodeLayer = svgElement("g", { class: "mindmap-nodes" });
  world.append(edgeLayer, nodeLayer); svg.append(world);

  links.forEach((edge) => {
    const path = svgElement("path", { class: `mindmap-edge edge-${edge.kind}`, "data-edge-id": edge.id, "data-source": edge.source, "data-target": edge.target });
    const dx = edge.b.x - edge.a.x;
    const bend = Math.min(48, Math.abs(dx) * .1) * (hash(edge.id) % 2 ? 1 : -1);
    const c1x = edge.a.x + dx * .42;
    const c2x = edge.a.x + dx * .58;
    path.setAttribute("d", `M ${edge.a.x} ${edge.a.y} C ${c1x} ${edge.a.y + bend}, ${c2x} ${edge.b.y + bend}, ${edge.b.x} ${edge.b.y}`);
    edgeLayer.append(path);
  });

  graph.nodes.forEach((node, nodeIndex) => {
    const width = nodeWidth(node); const height = nodeHeight(node);
    const group = svgElement("g", { class: `mindmap-node node-${node.type}${node.scopeType ? ` scope-${node.scopeType}` : ""}${node.expanded ? " is-expanded" : ""}${node.rangeChild ? " is-range-child" : ""}`, transform: `translate(${node.x} ${node.y})`, tabindex: "0", role: "button", "aria-label": node.isCollection ? `Verse collection ${node.label}. ${node.expanded ? "Expanded. Activate to collapse." : "Collapsed. Activate to expand."}` : `${node.scopeType || node.type}: ${node.label}`, "data-node-id": node.id, style: `--node-order:${Math.min(nodeIndex, 16)}` });
    const fullLabel = svgElement("title");
    fullLabel.textContent = node.label;
    group.append(fullLabel);
    group.append(svgElement("rect", { x: -width / 2, y: -height / 2, width, height, rx: height / 2 }));
    const icon = svgElement("text", { class: "node-icon", x: -width / 2 + 23, y: 1, "aria-hidden": "true" });
    icon.textContent = node.isCollection ? (node.expanded ? "−" : "+") : ({ root: "✦", hub: "•", note: "✎", folder: "▰", tag: "#", book: "▤", reference: "↗" })[node.type] || "•";
    const hasTypeLabel = !["root", "hub"].includes(node.type);
    const lines = getNodeLabelLines(node, width);
    const lineHeight = 18;
    const labelCenter = hasTypeLabel ? -8 : 0;
    const labelStartY = labelCenter - (lines.length - 1) * lineHeight / 2;
    const label = svgElement("text", { class: "node-label", x: node.type === "hub" ? 0 : -width / 2 + 43, y: labelStartY, "text-anchor": node.type === "hub" ? "middle" : "start" });
    lines.forEach((line, index) => {
      const span = svgElement("tspan", { x: node.type === "hub" ? 0 : -width / 2 + 43, dy: index ? lineHeight : 0 });
      span.textContent = index < lines.length - 1 ? `${line} ` : line;
      label.append(span);
    });
    group.append(icon, label);
    if (hasTypeLabel) {
      const typeLabel = svgElement("text", { class: "node-type-label", x: -width / 2 + 43, y: labelStartY + lines.length * lineHeight + 2 });
      typeLabel.textContent = node.isCollection ? `${node.references.length} VERSES · ${node.noteCount} ${node.noteCount === 1 ? "NOTE" : "NOTES"} · ${node.expanded ? "COLLAPSE" : "EXPAND"}` : ({ note: "NOTE", folder: "FOLDER", tag: "TOPIC", book: "SCRIPTURE", reference: node.rangeChild ? "VERSE IN COLLECTION" : "SINGLE VERSE" })[node.type] || node.type.toUpperCase();
      group.append(typeLabel);
    }
    nodeLayer.append(group);
  });

  const savedView = container._mindMapView;
  let scale = savedView?.scale || openingScale;
  let tx = savedView ? width / 2 - savedView.centerX * width * scale : width / 2 - width / 2 * scale;
  let ty = savedView ? height / 2 - savedView.centerY * height * scale : height / 2 - height / 2 * scale;
  let selected = "";
  let transformFrame = 0;
  const applyTransform = () => {
    if (transformFrame) return;
    transformFrame = requestAnimationFrame(() => {
      transformFrame = 0;
      world.setAttribute("transform", `translate(${tx} ${ty}) scale(${scale})`);
      container._mindMapView = {
        scale,
        centerX: (width / 2 - tx) / scale / width,
        centerY: (height / 2 - ty) / scale / height,
      };
    });
  };
  const fit = () => { scale = 1; tx = 0; ty = 0; applyTransform(); };
  const zoom = (factor, clientX = stage.clientWidth / 2, clientY = stage.clientHeight / 2) => {
    const next = clamp(scale * factor, .45, 3.2);
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width * width;
    const y = (clientY - rect.top) / rect.height * height;
    tx = x - (x - tx) * next / scale; ty = y - (y - ty) * next / scale; scale = next; applyTransform();
  };
  applyTransform();
  if (container._mindMapWasUpdated && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    stage.animate(
      [{ opacity: .72, transform: "scale(.992)" }, { opacity: 1, transform: "none" }],
      { duration: 280, easing: "cubic-bezier(.16,1,.3,1)" },
    );
  }
  container._mindMapWasUpdated = false;
  const selectNode = (node) => {
    selected = selected === node.id ? "" : node.id;
    const neighbors = new Set([selected]);
    const connectedEdgeIds = new Set();
    links.forEach((edge) => {
      if (edge.source === selected) { neighbors.add(edge.target); connectedEdgeIds.add(edge.id); }
      if (edge.target === selected) { neighbors.add(edge.source); connectedEdgeIds.add(edge.id); }
    });
    // A topic is most useful when it reveals both the tagged notes and every
    // scripture passage attached to those notes. Include that second hop in
    // the highlighted selection instead of making users inspect each note.
    if (node.type === "tag" && selected) {
      const taggedNoteIds = new Set([...neighbors].filter((id) => byId.get(id)?.type === "note"));
      links.forEach((edge) => {
        const noteId = taggedNoteIds.has(edge.source) ? edge.source : taggedNoteIds.has(edge.target) ? edge.target : "";
        if (!noteId) return;
        const relatedId = edge.source === noteId ? edge.target : edge.source;
        if (!["reference", "collection"].includes(byId.get(relatedId)?.type)) return;
        neighbors.add(relatedId);
        connectedEdgeIds.add(edge.id);
      });
    }
    container.classList.toggle("has-map-selection", Boolean(selected));
    nodeLayer.querySelectorAll(".mindmap-node").forEach((item) => item.classList.toggle("is-connected", neighbors.has(item.dataset.nodeId)));
    edgeLayer.querySelectorAll(".mindmap-edge").forEach((item) => item.classList.toggle("is-connected", connectedEdgeIds.has(item.dataset.edgeId)));
    if (!selected) { inspector.hidden = true; return; }
    const related = Math.max(0, neighbors.size - 1);
    const relatedNotes = [...neighbors].filter((id) => byId.get(id)?.type === "note").length;
    const relatedReferences = [...neighbors].filter((id) => ["reference", "collection"].includes(byId.get(id)?.type)).length;
    const relationSummary = node.type === "tag"
      ? `${relatedNotes} ${relatedNotes === 1 ? "note" : "notes"} · ${relatedReferences} ${relatedReferences === 1 ? "passage" : "passages"}`
      : `${related} direct ${related === 1 ? "connection" : "connections"}`;
    const action = node.type === "note" ? "Open note" : node.type === "reference" ? "Read verse" : node.type === "tag" ? "Show related notes" : "";
    inspector.innerHTML = `<button class="mindmap-inspector-close" type="button" aria-label="Close details"><i class="ti ti-x"></i></button><span>${escapeHTML(node.type)}</span><strong>${escapeHTML(node.label)}</strong>${node.summary ? `<p>${escapeHTML(shortLabel(node.summary, 150))}</p>` : ""}<small>${escapeHTML(relationSummary)}</small>${action ? `<button class="text-button primary" type="button" data-map-action>${escapeHTML(action)}<i class="ti ti-arrow-right"></i></button>` : ""}`;
    inspector.hidden = false;
    inspector.querySelector(".mindmap-inspector-close").addEventListener("click", () => selectNode(node));
    inspector.querySelector("[data-map-action]")?.addEventListener("click", () => {
      if (node.type === "note") options.onOpenNote(node.rawId);
      if (node.type === "reference") options.onOpenReference(node.rawId);
      if (node.type === "tag") options.onFilterTag(node.rawId);
    });
  };

  let suppressClickUntil = 0;
  nodeLayer.querySelectorAll(".mindmap-node").forEach((group) => {
    const node = byId.get(group.dataset.nodeId);
    const toggleRangeNode = () => {
      const collapsing = container._expandedReferenceRanges.has(node.rangeIdentity);
      const complete = () => {
        if (collapsing) container._expandedReferenceRanges.delete(node.rangeIdentity);
        else container._expandedReferenceRanges.add(node.rangeIdentity);
        // Expansion changes the graph bounds and topology. Fit the new graph so
        // every newly revealed verse is visible instead of inheriting a pan
        // position calculated for the smaller collapsed graph.
        container._mindMapView = null;
        container._mindMapWasUpdated = true;
        renderNotesMindMap(container, options);
      };
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        group.querySelector("rect").animate(
          collapsing
            ? [{ transform: "scale(1)" }, { transform: "scale(.94)" }]
            : [{ transform: "scale(1)" }, { transform: "scale(1.06)" }],
          { duration: 150, easing: "cubic-bezier(.4,0,.2,1)" },
        ).finished.then(complete).catch(complete);
      } else complete();
    };
    group.addEventListener("click", (event) => {
      event.stopPropagation();
      if (node.isCollection) return toggleRangeNode();
      if (performance.now() < suppressClickUntil) return;
      selectNode(node);
    });
    group.addEventListener("dblclick", () => {
      if (node.type === "note") options.onOpenNote(node.rawId);
      if (node.type === "reference") options.onOpenReference(node.rawId);
      if (node.type === "tag") options.onFilterTag(node.rawId);
    });
    group.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); group.dispatchEvent(new MouseEvent("click", { bubbles: true })); } });
  });
  svg.addEventListener("click", () => { if (selected) selectNode(byId.get(selected)); });
  svg.addEventListener("wheel", (event) => { event.preventDefault(); zoom(event.deltaY < 0 ? 1.12 : .89, event.clientX, event.clientY); }, { passive: false });
  const pointers = new Map();
  let gesture = null;
  const mapPoint = (point) => { const rect = svg.getBoundingClientRect(); return { x: (point.x - rect.left) / rect.width * width, y: (point.y - rect.top) / rect.height * height }; };
  const pointerPair = () => [...pointers.values()].slice(0, 2);
  const beginGesture = () => {
    const points = pointerPair();
    if (points.length === 2) {
      const a = mapPoint(points[0]); const b = mapPoint(points[1]);
      gesture = { type: "pinch", distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, scale, tx, ty, moved: false };
    } else if (points.length === 1) {
      const point = mapPoint(points[0]);
      gesture = { type: "pan", point, tx, ty, moved: false };
    }
  };
  svg.addEventListener("pointerdown", (event) => {
    // Keep taps on nodes as taps. Pointer capture is only needed for panning
    // the empty canvas and otherwise retargets the eventual click to the SVG.
    if (event.target.closest?.(".mindmap-node")) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    svg.setPointerCapture(event.pointerId);
    beginGesture();
    stage.classList.add("is-panning");
  });
  svg.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = pointerPair();
    if (points.length === 2 && gesture?.type !== "pinch") beginGesture();
    if (gesture?.type === "pinch" && points.length === 2) {
      const a = mapPoint(points[0]); const b = mapPoint(points[1]);
      const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const next = clamp(gesture.scale * distance / gesture.distance, .55, 4.5);
      tx = midpoint.x - (gesture.midpoint.x - gesture.tx) * next / gesture.scale;
      ty = midpoint.y - (gesture.midpoint.y - gesture.ty) * next / gesture.scale;
      scale = next; gesture.moved = true; suppressClickUntil = performance.now() + 280; applyTransform();
    } else if (gesture?.type === "pan" && points.length === 1) {
      const point = mapPoint(points[0]);
      const dx = point.x - gesture.point.x; const dy = point.y - gesture.point.y;
      if (Math.hypot(dx, dy) > 4) { gesture.moved = true; suppressClickUntil = performance.now() + 220; }
      tx = gesture.tx + dx; ty = gesture.ty + dy; applyTransform();
    }
  });
  const endPointer = (event) => {
    pointers.delete(event.pointerId);
    if (pointers.size) beginGesture();
    else { gesture = null; stage.classList.remove("is-panning"); }
  };
  svg.addEventListener("pointerup", endPointer); svg.addEventListener("pointercancel", endPointer);
  container.querySelector("[data-map-reset]").addEventListener("click", fit);
  container.querySelectorAll("[data-map-zoom]").forEach((button) => button.addEventListener("click", () => zoom(button.dataset.mapZoom === "in" ? 1.2 : .82)));
  container.querySelector(".mindmap-close").addEventListener("click", closeMap);

  container._mindMapCleanup = () => cancelAnimationFrame(transformFrame);

  if ("ResizeObserver" in window) {
    const initial = {
      width: container.clientWidth || window.innerWidth,
      height: container.clientHeight || window.innerHeight,
    };
    const initialOrientation = initial.width >= initial.height ? "landscape" : "portrait";
    let resizeFrame = 0;
    const observer = new ResizeObserver(([entry]) => {
      const { width: nextWidth, height: nextHeight } = entry.contentRect;
      // Mobile rotation can briefly report a zero-sized box while browser UI
      // and safe-area insets settle. Keep the current stable map for that frame.
      if (nextWidth < 200 || nextHeight < 200) return;
      const nextOrientation = nextWidth >= nextHeight ? "landscape" : "portrait";
      const widthChanged = Math.abs(nextWidth - initial.width) > Math.max(48, initial.width * .12);
      if (nextOrientation === initialOrientation && !widthChanged) return;
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => renderNotesMindMap(container, options));
    });
    observer.observe(container);
    container._mindMapCleanup = () => { cancelAnimationFrame(transformFrame); cancelAnimationFrame(resizeFrame); observer.disconnect(); };
  }
}
