import { chromium } from "/home/abbas/portfolio-redesign/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const baseURL = process.env.ABRAHAMIC_TEST_URL || "http://127.0.0.1:4173/";
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

await page.addInitScript(() => {
  const notes = {};
  for (let index = 0; index < 130; index += 1) {
    const key = `note:scale-${index}`;
    const chapter = index % 13 + 1;
    const verse = Math.floor(index / 13) * 2 + 1;
    notes[key] = {
      title: `Study note ${String(index + 1).padStart(3, "0")} about a complete subject`,
      text: `A substantial reflection for performance testing, connection ${index + 1}.`,
      tags: [`topic-${index % 18}`, `theme-${index % 7}`],
      references: [`${chapter}:${verse}`, `${chapter}:${verse + 1}`],
      linkedNoteIds: index ? [`note:scale-${index - 1}`] : [],
      folderId: `folder-${index % 8}`,
      standalone: true,
      updatedAt: new Date(Date.now() - index * 1000).toISOString(),
    };
  }
  localStorage.setItem("quran-reader-notes-v1", JSON.stringify(notes));
  localStorage.setItem("abrahamic-books-notes-organizer-v1", JSON.stringify({
    viewMode: "flat",
    selectedFolderId: "all",
    folders: Array.from({ length: 8 }, (_, index) => ({ id: `folder-${index}`, name: `Study folder ${index + 1}`, parentId: "", createdAt: new Date().toISOString() })),
    tagCatalog: {},
  }));
});

await page.goto(baseURL, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".ayah-card", { timeout: 30000 });
await page.locator('[data-view="notesView"]').first().evaluate((button) => button.click());
await page.waitForSelector("#notesList .note-card");
const started = await page.evaluate(() => performance.now());
await page.locator("#notesMindMapMode").click();
await page.waitForSelector("#notesMindMap:not([hidden]) .mindmap-node");
const renderTime = await page.evaluate((start) => performance.now() - start, started);
const mapStats = await page.evaluate(() => ({
  nodes: document.querySelectorAll(".mindmap-node").length,
  edges: document.querySelectorAll(".mindmap-edge").length,
  zones: [...document.querySelectorAll(".mindmap-zone-title")].map((item) => item.textContent),
}));
if (renderTime > 3000) throw new Error(`Large mind map took ${Math.round(renderTime)}ms to render.`);
if (mapStats.nodes < 250 || mapStats.edges < 400 || mapStats.zones.length !== 6) throw new Error(`Large graph was incomplete: ${JSON.stringify(mapStats)}`);

await page.locator(".mindmap-node.node-tag").first().click();
if (!(await page.locator("#notesMindMap.has-map-selection").count())) throw new Error("Selecting a topic did not enter focused mode.");
await page.waitForTimeout(300);
const focusOpacity = await page.evaluate(() => {
  const connected = document.querySelector(".mindmap-node.is-connected");
  const unrelated = document.querySelector(".mindmap-node:not(.is-connected):not(.is-map-hidden)");
  return { connected: Number(getComputedStyle(connected).opacity), unrelated: Number(getComputedStyle(unrelated).opacity), container: document.querySelector("#notesMindMap").className, unrelatedClass: unrelated?.getAttribute("class") };
});
if (!(focusOpacity.connected > focusOpacity.unrelated * 5)) throw new Error(`Focus contrast was too weak: ${JSON.stringify(focusOpacity)}`);

await page.locator(".mindmap-node.node-collection").first().click();
await page.waitForSelector(".mindmap-node.is-range-child:not(.is-map-hidden)");
const expansion = await page.evaluate(() => {
  const collection = document.querySelector(".mindmap-node.node-collection.is-expanded");
  const identity = collection?.dataset.rangeIdentity;
  return {
    expandedVerses: [...document.querySelectorAll(".mindmap-node.is-range-child:not(.is-map-hidden)")].filter((node) => node.dataset.rangeIdentity === identity).length,
    collectionEdges: [...document.querySelectorAll(".mindmap-edge[data-range-detail]:not(.is-map-hidden)")].filter((edge) => edge.dataset.rangeIdentity === identity).length,
  };
});
if (expansion.expandedVerses < 2 || expansion.collectionEdges < expansion.expandedVerses) throw new Error(`Collection expansion was incomplete: ${JSON.stringify(expansion)}`);

await page.locator(".mindmap-node.is-range-child:not(.is-map-hidden)").first().click();
if (!(await page.locator(".mindmap-node.node-note.is-connected").count())) throw new Error("Selecting a verse did not reveal its connected note.");
await page.locator(".mindmap-search input").fill("Study note 119");
if (!(await page.locator(".mindmap-node.is-search-match").count())) throw new Error("Large-map search did not find a note.");
await page.waitForTimeout(450);
await page.screenshot({ path: "/tmp/abrahamic-mindmap-130-notes.png", fullPage: true });

await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
console.log(`130-note mind map rendered ${mapStats.nodes} nodes and ${mapStats.edges} edges in ${Math.round(renderTime)}ms.`);
