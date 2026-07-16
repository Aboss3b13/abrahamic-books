import { access, mkdir, writeFile } from "node:fs/promises";

const id = process.argv[2] || "matthew-henry";
const base = "https://bible.helloao.org/api";
const out = `public/offline/commentary/${id}`;
const get = async (url) => { for (let attempt = 0; attempt < 5; attempt += 1) { const response = await fetch(url); if (response.ok && response.headers.get("content-type")?.includes("json")) return response.json(); await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1))); } throw new Error(`Could not download ${url}`); };
const catalog = await get(`${base}/c/${id}/books.json`);
await mkdir(out, { recursive: true });
await writeFile(`${out}/books.json`, JSON.stringify(catalog));
const jobs = catalog.books.flatMap((book) => Array.from({ length: book.numberOfChapters || 0 }, (_, index) => ({ book: book.id, chapter: (book.firstChapterNumber || 1) + index })));
let cursor = 0;
async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    try { await access(`${out}/${job.book}-${job.chapter}.json`); continue; } catch {}
    try {
      const data = await get(`${base}/c/${id}/${job.book}/${job.chapter}.json`);
      await writeFile(`${out}/${job.book}-${job.chapter}.json`, JSON.stringify(data));
    } catch (error) { console.warn(error.message); }
    if (cursor % 50 === 0) console.log(`${cursor}/${jobs.length}`);
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
console.log(`Bundled ${id}: ${jobs.length} chapters.`);
