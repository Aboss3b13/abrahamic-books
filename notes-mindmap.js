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
    tag: point(.22, .76), book: point(.77, .78), reference: point(.76, .48),
  } : {
    root: point(.48, .5), folder: point(.2, .32), note: point(.45, .52),
    tag: point(.4, .82), book: point(.79, .26), reference: point(.8, .61),
  };
  const anchorFor = (node) => {
    if (node.id === "root") return center;
    if (node.id === "hub:folders") return portrait ? point(.5, .1) : point(.12, .23);
    if (node.id === "hub:topics") return portrait ? point(.18, .61) : point(.36, .91);
    if (node.id === "hub:books") return portrait ? point(.82, .63) : point(.88, .14);
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
      const desired = (a.layoutWidth + b.layoutWidth) * .28 + (kind === "tag" ? 115 : 88);
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
  return { width, height, byId, links, openingScale: Math.max(1, width / viewport.width) };
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function nodeWidth(node) {
  if (node.type === "root") return 168;
  if (node.type === "hub") return 138;
  return clamp(78 + node.label.length * 9.4, 148, node.type === "note" ? 292 : 252);
}

function nodeHeight(node) {
  return node.type === "note" ? 68 : 56;
}

function shortLabel(value, limit = 25) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
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
  const graph = buildGraph(options);
  const counts = graph.nodes.reduce((result, node) => ({ ...result, [node.type]: (result[node.type] || 0) + 1 }), {});
  if (!options.entries.length) {
    container.innerHTML = `<button class="mindmap-close mindmap-empty-close" type="button" aria-label="Close mind map"><i class="ti ti-x"></i></button><div class="mindmap-empty"><i class="ti ti-affiliate" aria-hidden="true"></i><h3>No notes to map yet</h3><p>Create a note or clear the current filters to reveal your knowledge map.</p></div>`;
    container.querySelector(".mindmap-close").addEventListener("click", closeMap);
    return;
  }

  container.innerHTML = `
    <header class="mindmap-header">
      <div><span class="mindmap-kicker">Knowledge graph</span><h3>Connections across your library</h3><p>${counts.note || 0} notes · ${counts.tag || 0} topics · ${counts.reference || 0} references · ${counts.book || 0} books</p></div>
      <div class="mindmap-actions" role="group" aria-label="Mind map controls">
        <button type="button" data-map-zoom="out" aria-label="Zoom out"><i class="ti ti-minus"></i></button>
        <button type="button" data-map-reset aria-label="Fit map"><i class="ti ti-focus-centered"></i><span>Fit</span></button>
        <button type="button" data-map-zoom="in" aria-label="Zoom in"><i class="ti ti-plus"></i></button>
      </div>
      <button class="mindmap-close" type="button" aria-label="Close mind map"><i class="ti ti-x"></i></button>
    </header>
    <div class="mindmap-stage"><svg role="img" aria-label="Interactive graph connecting notes, folders, hashtags, books and scripture references"></svg></div>
    <div class="mindmap-hint"><i class="ti ti-zoom-scan"></i> Drag to explore · pinch or scroll to zoom · tap for details</div>
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
    const mx = (edge.a.x + edge.b.x) / 2;
    path.setAttribute("d", `M ${edge.a.x} ${edge.a.y} Q ${mx} ${(edge.a.y + edge.b.y) / 2 - Math.min(34, Math.abs(edge.b.x - edge.a.x) * .08)} ${edge.b.x} ${edge.b.y}`);
    edgeLayer.append(path);
  });

  graph.nodes.forEach((node) => {
    const width = nodeWidth(node); const height = nodeHeight(node);
    const group = svgElement("g", { class: `mindmap-node node-${node.type}`, transform: `translate(${node.x} ${node.y})`, tabindex: "0", role: "button", "aria-label": `${node.type}: ${node.label}`, "data-node-id": node.id });
    group.append(svgElement("rect", { x: -width / 2, y: -height / 2, width, height, rx: height / 2 }));
    const icon = svgElement("text", { class: "node-icon", x: -width / 2 + 23, y: 1, "aria-hidden": "true" });
    icon.textContent = ({ root: "✦", hub: "•", note: "✎", folder: "▰", tag: "#", book: "▤", reference: "↗" })[node.type] || "•";
    const label = svgElement("text", { class: "node-label", x: node.type === "hub" ? 0 : -width / 2 + 43, y: 1, "text-anchor": node.type === "hub" ? "middle" : "start" });
    const visibleLabel = node.type === "tag" ? node.label.replace(/^#/, "") : node.label;
    // Keep the rendered glyphs inside the pill. The full value remains in the
    // accessible label and inspector, while the compact label prevents long
    // note titles from visually colliding with neighboring nodes.
    label.textContent = shortLabel(visibleLabel, node.type === "note" ? 18 : 19);
    group.append(icon, label); nodeLayer.append(group);
  });

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
        if (byId.get(relatedId)?.type !== "reference") return;
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
    const relatedReferences = [...neighbors].filter((id) => byId.get(id)?.type === "reference").length;
    const relationSummary = node.type === "tag"
      ? `${relatedNotes} ${relatedNotes === 1 ? "note" : "notes"} · ${relatedReferences} ${relatedReferences === 1 ? "passage" : "passages"}`
      : `${related} direct ${related === 1 ? "connection" : "connections"}`;
    const action = node.type === "note" ? "Open note" : node.type === "reference" ? "Read passage" : node.type === "tag" ? "Show notes & verses" : "";
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
  container.querySelector(".mindmap-close").addEventListener("click", closeMap);

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
    container._mindMapCleanup = () => { cancelAnimationFrame(resizeFrame); observer.disconnect(); };
  }
}
