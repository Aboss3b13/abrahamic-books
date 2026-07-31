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

function buildGraph({ entries, folders, formatReference, parseReference }) {
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

  addNode({ id: "root", label: "My notes", type: "root", weight: Math.max(1, entries.length) });
  const hubs = [
    ["hub:folders", "Folders", "folder"],
    ["hub:topics", "Topics", "tag"],
    ["hub:books", "Books", "book"],
  ];
  hubs.forEach(([id, label, type]) => { addNode({ id, label, type: "hub" }); addEdge("root", id, type); });

  folders.forEach((folder) => {
    addNode({ id: `folder:${folder.id}`, label: folder.name, type: "folder", rawId: folder.id });
    addEdge(folder.parentId ? `folder:${folder.parentId}` : "hub:folders", `folder:${folder.id}`, "folder");
  });

  entries.forEach(([key, note]) => {
    const noteId = `note:${key}`;
    addNode({ id: noteId, label: note.title?.trim() || "Untitled note", type: "note", rawId: key, summary: note.text || "", weight: 1 + (note.tags?.length || 0) + (note.references?.length || 0) });
    addEdge(note.folderId ? `folder:${note.folderId}` : "hub:folders", noteId, "folder");

    (note.tags || []).forEach((tag) => {
      const tagId = `tag:${tag}`;
      addNode({ id: tagId, label: `#${tag}`, type: "tag", rawId: tag });
      addEdge("hub:topics", tagId, "tag");
      addEdge(noteId, tagId, "tag");
    });

    (note.references || []).forEach((reference) => {
      const parsed = parseReference(reference);
      const book = scriptureBook(parsed);
      const bookNode = addNode({ ...book, type: "book" });
      const referenceId = `reference:${reference}`;
      addNode({ id: referenceId, label: formatReference(reference), type: "reference", rawId: reference, bookGroup: bookNode.group });
      addEdge("hub:books", bookNode.id, "book");
      addEdge(bookNode.id, referenceId, "reference");
      addEdge(noteId, referenceId, "reference");
    });
  });

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

function layOut(nodes, edges) {
  const width = Math.max(760, nodes.length * 13);
  const height = Math.max(580, Math.sqrt(nodes.length) * 96);
  const center = { x: width / 2, y: height / 2 };
  const anchors = {
    root: center,
    hub: center,
    folder: { x: width * .24, y: height * .34 },
    note: { x: width * .5, y: height * .5 },
    tag: { x: width * .48, y: height * .82 },
    book: { x: width * .76, y: height * .3 },
    reference: { x: width * .79, y: height * .63 },
  };
  const byId = new Map(nodes.map((node, index) => {
    const seed = Math.abs(hash(node.id));
    const anchor = anchors[node.type] || center;
    node.x = node.id === "root" ? center.x : anchor.x + ((seed % 181) - 90) * 2.1;
    node.y = node.id === "root" ? center.y : anchor.y + (((seed >> 7) % 151) - 75) * 1.8;
    node.vx = 0; node.vy = 0; node.index = index;
    return [node.id, node];
  }));
  const links = edges.map((edge) => ({ ...edge, a: byId.get(edge.source), b: byId.get(edge.target) })).filter((edge) => edge.a && edge.b);

  for (let step = 0; step < 150; step += 1) {
    const heat = 1 - step / 175;
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      const anchor = anchors[a.type] || center;
      a.vx += (anchor.x - a.x) * .0007;
      a.vy += (anchor.y - a.y) * .0007;
      for (let j = i + 1; j < nodes.length && (nodes.length < 260 || j < i + 90); j += 1) {
        const b = nodes[j];
        let dx = b.x - a.x; let dy = b.y - a.y;
        const d2 = Math.max(80, dx * dx + dy * dy);
        const force = (a.type === "root" || b.type === "root" ? 1300 : 620) / d2;
        dx *= force; dy *= force;
        a.vx -= dx; a.vy -= dy; b.vx += dx; b.vy += dy;
      }
    }
    links.forEach(({ a, b, kind }) => {
      const dx = b.x - a.x; const dy = b.y - a.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desired = kind === "folder" ? 145 : kind === "tag" ? 165 : 135;
      const pull = (distance - desired) * .0045;
      a.vx += dx / distance * pull; a.vy += dy / distance * pull;
      b.vx -= dx / distance * pull; b.vy -= dy / distance * pull;
    });
    nodes.forEach((node) => {
      if (node.id === "root") { node.x = center.x; node.y = center.y; return; }
      node.vx *= .78; node.vy *= .78;
      const horizontalPadding = nodeWidth(node) / 2 + 16;
      node.x = clamp(node.x + node.vx * heat, horizontalPadding, width - horizontalPadding);
      node.y = clamp(node.y + node.vy * heat, 55, height - 55);
    });
  }
  return { width, height, byId, links };
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function nodeWidth(node) {
  if (node.type === "root") return 168;
  if (node.type === "hub") return 138;
  return clamp(76 + node.label.length * 8.8, 140, node.type === "note" ? 276 : 238);
}

function shortLabel(value, limit = 25) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

export function renderNotesMindMap(container, options) {
  const graph = buildGraph(options);
  const counts = graph.nodes.reduce((result, node) => ({ ...result, [node.type]: (result[node.type] || 0) + 1 }), {});
  if (!options.entries.length) {
    container.innerHTML = `<button class="mindmap-close mindmap-empty-close" type="button" aria-label="Close mind map"><i class="ti ti-x"></i></button><div class="mindmap-empty"><i class="ti ti-affiliate" aria-hidden="true"></i><h3>No notes to map yet</h3><p>Create a note or clear the current filters to reveal your knowledge map.</p></div>`;
    container.querySelector(".mindmap-close").addEventListener("click", options.onClose);
    return;
  }

  container.innerHTML = `
    <header class="mindmap-header">
      <div><span class="mindmap-kicker">Knowledge graph</span><h3>Connections across your library</h3><p>${counts.note || 0} notes · ${counts.tag || 0} topics · ${counts.reference || 0} references · ${counts.book || 0} books</p></div>
      <div class="mindmap-actions" role="group" aria-label="Mind map controls">
        <button type="button" data-map-zoom="out" aria-label="Zoom out"><i class="ti ti-minus"></i></button>
        <button type="button" data-map-reset aria-label="Fit map"><i class="ti ti-focus-centered"></i><span>Fit</span></button>
        <button type="button" data-map-zoom="in" aria-label="Zoom in"><i class="ti ti-plus"></i></button>
        <button class="mindmap-close" type="button" aria-label="Close mind map"><i class="ti ti-x"></i></button>
      </div>
    </header>
    <div class="mindmap-stage"><svg role="img" aria-label="Interactive graph connecting notes, folders, hashtags, books and scripture references"></svg><div class="mindmap-hint"><i class="ti ti-zoom-scan"></i> Drag to explore · pinch or scroll to zoom · tap for details</div></div>
    <aside class="mindmap-inspector" hidden></aside>`;

  const stage = container.querySelector(".mindmap-stage");
  const svg = stage.querySelector("svg");
  const inspector = container.querySelector(".mindmap-inspector");
  const { width, height, byId, links } = layOut(graph.nodes, graph.edges);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const world = svgElement("g", { class: "mindmap-world" });
  const edgeLayer = svgElement("g", { class: "mindmap-edges" });
  const nodeLayer = svgElement("g", { class: "mindmap-nodes" });
  world.append(edgeLayer, nodeLayer); svg.append(world);

  links.forEach((edge) => {
    const path = svgElement("path", { class: `mindmap-edge edge-${edge.kind}`, "data-source": edge.source, "data-target": edge.target });
    const mx = (edge.a.x + edge.b.x) / 2;
    path.setAttribute("d", `M ${edge.a.x} ${edge.a.y} Q ${mx} ${(edge.a.y + edge.b.y) / 2 - Math.min(34, Math.abs(edge.b.x - edge.a.x) * .08)} ${edge.b.x} ${edge.b.y}`);
    edgeLayer.append(path);
  });

  graph.nodes.forEach((node) => {
    const width = nodeWidth(node); const height = node.type === "note" ? 68 : 56;
    const group = svgElement("g", { class: `mindmap-node node-${node.type}`, transform: `translate(${node.x} ${node.y})`, tabindex: "0", role: "button", "aria-label": `${node.type}: ${node.label}`, "data-node-id": node.id });
    group.append(svgElement("rect", { x: -width / 2, y: -height / 2, width, height, rx: height / 2 }));
    const icon = svgElement("text", { class: "node-icon", x: -width / 2 + 23, y: 1, "aria-hidden": "true" });
    icon.textContent = ({ root: "✦", hub: "•", note: "✎", folder: "▰", tag: "#", book: "▤", reference: "↗" })[node.type] || "•";
    const label = svgElement("text", { class: "node-label", x: node.type === "hub" ? 0 : -width / 2 + 43, y: 1, "text-anchor": node.type === "hub" ? "middle" : "start" });
    label.textContent = shortLabel(node.label, node.type === "note" ? 25 : 21);
    group.append(icon, label); nodeLayer.append(group);
  });

  const openingScale = stage.clientWidth < 700 ? 1.42 : stage.clientWidth < 1100 ? 1.18 : 1;
  let scale = openingScale;
  let tx = width / 2 - width / 2 * scale;
  let ty = height / 2 - height / 2 * scale;
  let selected = "";
  const applyTransform = () => world.setAttribute("transform", `translate(${tx} ${ty}) scale(${scale})`);
  const fit = () => { scale = 1; tx = 0; ty = 0; applyTransform(); };
  const zoom = (factor, clientX = stage.clientWidth / 2, clientY = stage.clientHeight / 2) => {
    const next = clamp(scale * factor, .45, 3.2);
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width * width;
    const y = (clientY - rect.top) / rect.height * height;
    tx = x - (x - tx) * next / scale; ty = y - (y - ty) * next / scale; scale = next; applyTransform();
  };
  applyTransform();
  const selectNode = (node) => {
    selected = selected === node.id ? "" : node.id;
    const neighbors = new Set([selected]);
    links.forEach((edge) => { if (edge.source === selected) neighbors.add(edge.target); if (edge.target === selected) neighbors.add(edge.source); });
    container.classList.toggle("has-map-selection", Boolean(selected));
    nodeLayer.querySelectorAll(".mindmap-node").forEach((item) => item.classList.toggle("is-connected", neighbors.has(item.dataset.nodeId)));
    edgeLayer.querySelectorAll(".mindmap-edge").forEach((item) => item.classList.toggle("is-connected", item.dataset.source === selected || item.dataset.target === selected));
    if (!selected) { inspector.hidden = true; return; }
    const related = Math.max(0, neighbors.size - 1);
    const action = node.type === "note" ? "Open note" : node.type === "reference" ? "Read passage" : node.type === "tag" ? "Filter by topic" : "";
    inspector.innerHTML = `<button class="mindmap-inspector-close" type="button" aria-label="Close details"><i class="ti ti-x"></i></button><span>${escapeHTML(node.type)}</span><strong>${escapeHTML(node.label)}</strong>${node.summary ? `<p>${escapeHTML(shortLabel(node.summary, 150))}</p>` : ""}<small>${related} direct ${related === 1 ? "connection" : "connections"}</small>${action ? `<button class="text-button primary" type="button" data-map-action>${escapeHTML(action)}<i class="ti ti-arrow-right"></i></button>` : ""}`;
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
    group.addEventListener("click", (event) => { event.stopPropagation(); if (performance.now() < suppressClickUntil) return; selectNode(node); });
    group.addEventListener("dblclick", () => {
      if (node.type === "note") options.onOpenNote(node.rawId);
      if (node.type === "reference") options.onOpenReference(node.rawId);
      if (node.type === "tag") options.onFilterTag(node.rawId);
    });
    group.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); selectNode(node); } });
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
  container.querySelector(".mindmap-close").addEventListener("click", options.onClose);
}
