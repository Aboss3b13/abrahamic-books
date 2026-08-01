import { chromium } from "/home/abbas/portfolio-redesign/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const baseURL = process.env.ABRAHAMIC_TEST_URL || "http://127.0.0.1:4173/";
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("favicon")) errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(baseURL, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".ayah-card", { timeout: 30000 });

await page.locator('.ayah-card button[data-action="note"]').first().click();
await page.waitForSelector("#noteDestinationSheet[open]");
await page.locator("#createFromSelection").click();
await page.waitForSelector("#noteSheet[open]");
await page.locator("#noteName").fill("Mobile capture test");
await page.locator("#noteEditor").fill("A durable draft created from read mode.");
await page.screenshot({ path: "/tmp/abrahamic-mobile-editor.png", fullPage: true });
await page.locator('#noteSheet button[value="close"]').last().click();
await page.waitForTimeout(500);

await page.locator('.ayah-card button[data-action="note"]').nth(1).click();
await page.waitForSelector("#noteDestinationSheet[open]");
await page.locator("#noteDestinationSearch").fill("Mobile capture test");
await page.locator('.note-destination-row:has-text("Mobile capture test")').click();
await page.waitForSelector("#noteSheet[open]");
if (await page.locator("#noteReferences .reference-pill").count() !== 1 || !(await page.locator("#noteReferences .reference-jump").textContent()).includes("1.1-2")) {
  throw new Error("Adding a passage to an existing note did not merge references.");
}
await page.locator("#noteReferences [data-toggle-reference-range]").click();
await page.waitForSelector("#noteReferences .reference-collection-verses:not([hidden])");
const verseNamesAreComplete = await page.locator("#noteReferences .reference-collection-verses > button > strong").evaluateAll((labels) => labels.every((label) => {
  const style = getComputedStyle(label);
  return style.textOverflow !== "ellipsis" && style.whiteSpace === "normal" && label.scrollWidth <= label.clientWidth + 1;
}));
if (!verseNamesAreComplete) throw new Error("An expanded editor collection clipped a verse name.");
await page.locator("#noteReferences [data-toggle-reference-range]").click();
await page.waitForFunction(() => document.querySelector("#noteReferences .reference-collection-verses")?.hidden);
await page.locator("#referenceSearch").fill("Quran 2:1");
await page.locator("#referenceSearch").press("Enter");
await page.waitForFunction(() => document.querySelectorAll("#noteReferences .reference-pill").length === 2);
const referenceLabelsBefore = await page.locator("#noteReferences .reference-jump").allTextContents();
await page.locator("#noteReferences .reference-drag-handle").nth(1).scrollIntoViewIfNeeded();
const dragFrom = await page.locator("#noteReferences .reference-drag-handle").nth(1).boundingBox();
const dragTo = await page.locator("#noteReferences .reference-drag-handle").first().boundingBox();
await page.mouse.move(dragFrom.x + dragFrom.width / 2, dragFrom.y + dragFrom.height / 2);
await page.mouse.down();
await page.mouse.move(dragTo.x + dragTo.width / 2, dragTo.y + dragTo.height / 2, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(250);
const referenceLabelsAfter = await page.locator("#noteReferences .reference-jump").allTextContents();
if (referenceLabelsAfter[0] === referenceLabelsBefore[0]) {
  throw new Error("Dragging cross-references did not change their order.");
}
await page.locator('#noteSheet button[value="close"]').last().click();
await page.waitForTimeout(350);

await page.locator('[data-view="notesView"]').click();
await page.waitForSelector('.note-card:has-text("Mobile capture test")');
await page.locator('.note-card:has-text("Mobile capture test") .note-card-main').click();
if (!(await page.locator("#noteEditor").inputValue()).includes("A durable draft created from read mode.")) {
  throw new Error("Saved note text did not survive reopening.");
}
await page.locator('#noteSheet button[value="close"]').last().click();
await page.waitForTimeout(350);
await page.screenshot({ path: "/tmp/abrahamic-mobile-notes.png", fullPage: true });

await page.locator('[data-view="readView"]').click();
const firstCard = page.locator(".ayah-card").first();
await firstCard.scrollIntoViewIfNeeded();
await firstCard.dispatchEvent("pointerdown", { button: 0, clientX: 120, clientY: 240, pointerType: "touch" });
await page.waitForTimeout(620);
await firstCard.dispatchEvent("pointerup", { button: 0, clientX: 120, clientY: 240, pointerType: "touch" });
await page.waitForSelector("#readSelectionBar:not([hidden])");
await page.waitForTimeout(750);
await page.locator(".ayah-card").nth(1).click();
await page.locator("#noteReadSelection").click();
await page.waitForSelector("#noteDestinationSheet[open]");
await page.locator("#createFromSelection").click();
await page.waitForSelector("#noteSheet[open]");
await page.locator("#noteName").fill("Reference only reading note");
if (await page.locator("#noteEditor").inputValue()) throw new Error("Read multi-select copied verse text into the note.");
if (await page.locator("#noteTags").inputValue()) throw new Error("Read multi-select added an automatic reading tag.");
if (await page.locator("#noteReferences .reference-pill").count() !== 1
  || !(await page.locator("#noteReferences .reference-jump").textContent()).includes("1.1-2")) {
  throw new Error("Read multi-select did not compact consecutive cross-references.");
}
await page.locator('#noteSheet button[value="close"]').last().click();
await page.waitForTimeout(400);
await page.locator('[data-view="notesView"]').click();
await page.locator("#notesSearch").fill("praise worlds");
await page.waitForSelector('.note-card:has-text("Reference only reading note")', { timeout: 10000 });
await page.locator("#notesSearch").fill("praise impossibleword");
await page.waitForTimeout(350);
if (await page.locator('.note-card:has-text("Reference only reading note")').count()) {
  throw new Error("Notes search returned a result even though one required word was absent.");
}
await page.locator("#notesSearch").fill("rais");
await page.waitForTimeout(250);
if (await page.locator('.note-card:has-text("Reference only reading note")').count()) {
  throw new Error("Notes search matched an unrelated word substring.");
}
await page.locator("#notesSearch").fill("");
await page.waitForTimeout(250);
await page.locator("#notesMindMapMode").click();
await page.waitForSelector("#notesMindMap:not([hidden]) .mindmap-node.node-collection");
const collection = page.locator(".mindmap-node.node-collection").first();
await collection.click();
await page.waitForSelector(".mindmap-node.is-range-child");
const graphExpansion = await page.evaluate(() => {
  const verses = [...document.querySelectorAll(".mindmap-node.is-range-child")];
  return {
    verseCount: verses.length,
    hasDetachedTray: Boolean(document.querySelector(".mindmap-collection-panel")),
    allVersesConnectedToNotes: verses.every((verse) => document.querySelector(`.mindmap-edge[data-target="${CSS.escape(verse.dataset.nodeId)}"][data-source^="note:"]`)),
  };
});
if (graphExpansion.verseCount < 2 || graphExpansion.hasDetachedTray || !graphExpansion.allVersesConnectedToNotes) {
  throw new Error(`Verse collection did not expand into correctly connected mind-map nodes: ${JSON.stringify(graphExpansion)}`);
}
await page.screenshot({ path: "/tmp/abrahamic-mobile-mindmap-expanded.png", fullPage: true });
await page.locator(".mindmap-node.node-collection.is-expanded").first().click();
await page.waitForFunction(() => !document.querySelector(".mindmap-node.is-range-child"));
await page.locator(".mindmap-close").click();
await page.locator("#notesFolderMode").click();
await page.screenshot({ path: "/tmp/abrahamic-mobile-folders.png", fullPage: true });

await page.setViewportSize({ width: 834, height: 1194 });
await page.locator('.note-card:has-text("Mobile capture test") .note-card-main').click();
await page.waitForSelector("#noteSheet[open]");
await page.screenshot({ path: "/tmp/abrahamic-tablet-editor.png", fullPage: true });
await page.locator('#noteSheet button[value="close"]').last().click();
await page.locator("#settingsButton").click();
await page.waitForSelector("#readerSettingsSheet[open]");
await page.screenshot({ path: "/tmp/abrahamic-tablet-settings.png", fullPage: true });
await page.locator('#readerSettingsSheet button[value="close"]').click();

await page.locator('[data-view="readView"]').click();
await page.locator('.ayah-card button[data-action="tafsir"]').first().click();
await page.waitForSelector("#tafsirContentSheet[open] #studySourceSelect");
if (await page.locator("#studySourceSelect option").count() < 1) throw new Error("Study source switcher is empty.");
await page.locator('#tafsirContentSheet button[value="close"]').click();

await page.locator('[data-view="notesView"]').click();
await page.locator('.note-card:has-text("Mobile capture test") .note-card-main').click();
await page.locator("#deleteNote").click();
await page.waitForTimeout(450);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.locator('[data-view="notesView"]').click();
await page.waitForSelector("#notesView.view.active");
if (await page.locator('.note-card:has-text("Mobile capture test")').count()) {
  throw new Error("Deleted note reappeared after reload.");
}
await page.locator('[data-view="searchView"]').click();
await page.waitForSelector("#searchView.view.active");
await page.locator("#searchFilterButton").click();
await page.waitForSelector("#searchFilterSheet[open]");
const sourceGroups = await page.locator("#sourceFilterList").innerText();
if (!sourceGroups.includes("Quran") || !sourceGroups.includes("Tafsir") || sourceGroups.includes("Quran & commentary")) {
  throw new Error("Tafsir is not separated from Quran in search filters.");
}

await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
console.log("Responsive note capture, persistence, and study-source smoke tests passed.");
