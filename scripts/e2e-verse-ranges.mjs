import { chromium } from "/home/abbas/portfolio-redesign/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(process.env.ABRAHAMIC_TEST_URL || "http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".ayah-card", { timeout: 30000 });
await page.locator('[data-view="notesView"]').click();
await page.locator("#newStudyNote").click();
await page.locator("#noteName").fill("Range picker verification");
await page.locator("#toggleVerseRangePicker").click();
await page.locator("#verseRangeSource").selectOption("quran");
await page.locator("#verseRangeBook").selectOption("2");
await page.waitForSelector('#verseRangeGrid [data-range-verse="34"]');
await page.locator('#verseRangeGrid [data-range-verse="1"]').click();
await page.locator('#verseRangeGrid [data-range-verse="34"]').click();
if (!(await page.locator("#addVerseRange").textContent()).includes("34 verses")) throw new Error("Range total did not update.");
await page.locator("#addVerseRange").click();
if (await page.locator("#noteReferences .reference-pill").count() !== 1) throw new Error("Consecutive references were not compacted in the editor.");
if (!(await page.locator("#noteReferences .reference-pill").textContent()).includes("2.1-34")) throw new Error("Editor did not show 2.1-34.");
await page.locator("#noteReferences [data-toggle-reference-range]").click();
if (await page.locator("#noteReferences .reference-collection-verses:not([hidden]) [data-jump]").count() !== 34) throw new Error("Editor collection did not expand to 34 verses.");
await page.screenshot({ path: "/tmp/abrahamic-editor-collection.png", fullPage: true });
await page.locator("#noteReferences [data-toggle-reference-range]").click();
await page.waitForFunction(() => document.querySelector("#noteReferences .reference-collection-verses")?.hidden);
await page.screenshot({ path: "/tmp/abrahamic-verse-range-picker.png", fullPage: true });
await page.locator('#noteSheet button[value="close"]').last().click();
await page.waitForSelector('.note-card:has-text("Range picker verification")');
if (!(await page.locator('.note-card:has-text("Range picker verification") .reference-link').textContent()).includes("2.1-34")) throw new Error("Note card did not compact the range.");

// The same verse in a second note must reuse the global collection node.
await page.locator("#newStudyNote").click();
await page.locator("#noteName").fill("Overlapping verse verification");
await page.locator("#toggleVerseRangePicker").click();
await page.locator("#verseRangeSource").selectOption("quran");
await page.locator("#verseRangeBook").selectOption("2");
await page.waitForSelector('#verseRangeGrid [data-range-verse="10"]');
await page.locator('#verseRangeGrid [data-range-verse="10"]').click();
await page.locator("#addVerseRange").click();
await page.waitForSelector('#noteReferences [data-reference-keys="2:10"]');
await page.locator('#noteSheet button[value="close"]').last().click();
await page.waitForSelector('.note-card:has-text("Overlapping verse verification")');

await page.locator("#notesMindMapMode").click();
await page.waitForSelector("#notesMindMap:not([hidden]) .mindmap-node");
const rangeNode = page.locator('.mindmap-node.node-collection:has-text("2:1-34")');
if (await rangeNode.count() !== 1) throw new Error("Mind map did not create one shared collection node.");
if (await page.locator('.mindmap-node.node-reference:not(.is-range-child):has-text("Quran 2:10")').count()) throw new Error("Overlapping verse was duplicated outside its collection.");
if (await page.locator('.mindmap-node.node-reference.is-range-child').count()) throw new Error("Collapsed verses reserved hidden space in the mind map.");
if (!(await rangeNode.textContent()).includes("2 NOTES")) throw new Error("Shared collection did not connect both notes.");
await rangeNode.evaluate((node) => node.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
await page.waitForTimeout(500);
if (errors.length) throw new Error(`Mind-map collection errors:\n${errors.join("\n")}`);
await page.waitForFunction(() => document.querySelectorAll('.mindmap-node.is-range-child:not(.is-map-hidden)').length === 34);
if (await page.locator('.mindmap-node.is-range-child:not(.is-map-hidden)').count() !== 34) throw new Error("Mind map collection did not expand all verses inline.");
if (await page.locator('.mindmap-node.is-range-child:not(.is-map-hidden):has-text("Quran 2:10")').count() !== 1) throw new Error("Shared verse was not unique inside the expanded collection.");
await page.screenshot({ path: "/tmp/abrahamic-mindmap-collection.png", fullPage: true });
await rangeNode.evaluate((node) => node.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
await page.waitForFunction(() => document.querySelectorAll('.mindmap-node.is-range-child:not(.is-map-hidden)').length === 0);

await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
console.log("Verse range picker, compact note labels, and mind-map expansion passed.");
