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
await page.screenshot({ path: "/tmp/abrahamic-verse-range-picker.png", fullPage: true });
await page.locator('#noteSheet button[value="close"]').last().click();
await page.waitForSelector('.note-card:has-text("Range picker verification")');
if (!(await page.locator('.note-card:has-text("Range picker verification") .reference-link').textContent()).includes("2.1-34")) throw new Error("Note card did not compact the range.");

await page.locator("#notesMindMapMode").click();
await page.waitForSelector("#notesMindMap:not([hidden]) .mindmap-node");
const rangeNode = page.locator('.mindmap-node.node-reference:has-text("2:1-34")');
if (await rangeNode.count() !== 1) throw new Error("Mind map did not create one compact range node.");
await rangeNode.click();
await page.waitForFunction(() => document.querySelectorAll('[data-node-id^="range-verse:"]').length === 34);
if (await page.locator('[data-node-id^="range-verse:"]').count() !== 34) throw new Error("Mind map range did not expand to its verses.");
await page.locator('.mindmap-node.node-reference:has-text("2:1-34")').click();
await page.waitForFunction(() => !document.querySelector('[data-node-id^="range-verse:"]'));

await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
console.log("Verse range picker, compact note labels, and mind-map expansion passed.");
