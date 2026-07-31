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
if (await page.locator("#noteReferences .reference-pill").count() !== 2) {
  throw new Error("Adding a passage to an existing note did not merge references.");
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
await page.locator('[data-view="notesView"]').click();
if (await page.locator('.note-card:has-text("Mobile capture test")').count()) {
  throw new Error("Deleted note reappeared after reload.");
}
await page.locator('[data-view="searchView"]').click();
await page.locator("#searchFilterButton").click();
await page.waitForSelector("#searchFilterSheet[open]");
const sourceGroups = await page.locator("#sourceFilterList").innerText();
if (!sourceGroups.includes("Quran") || !sourceGroups.includes("Tafsir") || sourceGroups.includes("Quran & commentary")) {
  throw new Error("Tafsir is not separated from Quran in search filters.");
}

await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
console.log("Responsive note capture, persistence, and study-source smoke tests passed.");
