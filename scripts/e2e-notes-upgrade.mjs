import { chromium } from "/home/abbas/portfolio-redesign/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 834, height: 1194 } });
const baseURL = process.env.ABRAHAMIC_TEST_URL || "http://127.0.0.1:4173/";
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(baseURL, { waitUntil: "domcontentloaded" });
await page.locator('[data-view="notesView"]').click();

async function createNote(title, body, tag) {
  await page.locator("#newStudyNote").click();
  await page.waitForSelector("#noteSheet[open]");
  await page.locator("#noteName").fill(title);
  await page.locator("#noteEditor").fill(body);
  await page.locator("#noteTagCreate").fill(tag);
  await page.locator("#addNoteTag").click();
  await page.locator('#noteSheet button[value="close"]').last().click();
  await page.waitForTimeout(400);
}

const longTitle = "A complete mind map title that must remain visible inside its node";
await createNote(longTitle, "inclusive-search-marker mercy and patience", "alpha");
await createNote("Second topic note", "inclusive-search-marker wisdom", "beta");

await page.locator('[data-tag="alpha"]').click();
await page.locator('[data-tag="beta"]').click();
if (await page.locator("#notesList .note-card").count() !== 2) throw new Error("Multiple hashtags did not use inclusive OR matching.");
if (await page.locator("#tagFilters [data-clear-tags]").count()) throw new Error("A clear button remains in the hashtag rail.");

await page.locator('.note-card:has-text("Second topic note") .note-card-main').click();
await page.locator("#noteTagSearch").fill("alpha");
if (!(await page.locator('#noteTagChoices [data-note-tag="alpha"]').count())) throw new Error("The editor hashtag search did not find alpha.");
await page.locator('#noteSheet button[value="close"]').last().click();

await page.locator('[data-tag="alpha"]').click();
await page.locator('[data-tag="beta"]').click();
await page.locator("#notesMindMapMode").click();
await page.waitForSelector("#notesMindMap:not([hidden]) .mindmap-node");
const completeMapTitle = await page.locator(".mindmap-node.node-note .node-label").allTextContents();
if (!completeMapTitle.includes(longTitle)) throw new Error("The mind map truncated a note title.");
await page.screenshot({ path: "/tmp/abrahamic-mindmap-light.png", fullPage: true });
await page.evaluate(() => document.documentElement.dataset.theme = "dark");
await page.screenshot({ path: "/tmp/abrahamic-mindmap-dark.png", fullPage: true });
await page.locator(".mindmap-close").click();

await page.locator('[data-view="searchView"]').click();
await page.locator("#globalSearchType").selectOption("notes");
await page.locator("#globalSearch").fill("inclusive-search-marker wisdom");
await page.locator("#runSearch").click();
await page.waitForSelector('.search-result:has-text("Second topic note")');
if (await page.locator('.search-result:has-text("Second topic note")').count() !== 1) throw new Error("Global note search did not return note body text.");

await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
console.log("Notes filters, hashtag search, full mind-map titles, dark mode, and global note search passed.");
