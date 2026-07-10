import { mkdir, readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const API = "https://api.quran.com/api/v4";
const OUT_DIR = "public/offline";
const DEFAULT_TRANSLATION = 85;
const DEFAULT_TAFSIR = 169;

const OLD_TESTAMENT = [
  ["Genesis", 50], ["Exodus", 40], ["Leviticus", 27], ["Numbers", 36], ["Deuteronomy", 34],
  ["Joshua", 24], ["Judges", 21], ["Ruth", 4], ["1 Samuel", 31], ["2 Samuel", 24],
  ["1 Kings", 22], ["2 Kings", 25], ["1 Chronicles", 29], ["2 Chronicles", 36], ["Ezra", 10],
  ["Nehemiah", 13], ["Esther", 10], ["Job", 42], ["Psalms", 150], ["Proverbs", 31],
  ["Ecclesiastes", 12], ["Song of Solomon", 8], ["Isaiah", 66], ["Jeremiah", 52], ["Lamentations", 5],
  ["Ezekiel", 48], ["Daniel", 12], ["Hosea", 14], ["Joel", 3], ["Amos", 9], ["Obadiah", 1],
  ["Jonah", 4], ["Micah", 7], ["Nahum", 3], ["Habakkuk", 3], ["Zephaniah", 3], ["Haggai", 2],
  ["Zechariah", 14], ["Malachi", 4],
];

const NEW_TESTAMENT = [
  ["Matthew", 28], ["Mark", 16], ["Luke", 24], ["John", 21], ["Acts", 28], ["Romans", 16],
  ["1 Corinthians", 16], ["2 Corinthians", 13], ["Galatians", 6], ["Ephesians", 6], ["Philippians", 4],
  ["Colossians", 4], ["1 Thessalonians", 5], ["2 Thessalonians", 3], ["1 Timothy", 6], ["2 Timothy", 4],
  ["Titus", 3], ["Philemon", 1], ["Hebrews", 13], ["James", 5], ["1 Peter", 5], ["2 Peter", 3],
  ["1 John", 5], ["2 John", 1], ["3 John", 1], ["Jude", 1], ["Revelation", 22],
];

const BOOK_IDS = {
  "Genesis": "GEN", "Exodus": "EXO", "Leviticus": "LEV", "Numbers": "NUM", "Deuteronomy": "DEU",
  "Joshua": "JOS", "Judges": "JDG", "Ruth": "RUT", "1 Samuel": "1SA", "2 Samuel": "2SA",
  "1 Kings": "1KI", "2 Kings": "2KI", "1 Chronicles": "1CH", "2 Chronicles": "2CH", "Ezra": "EZR",
  "Nehemiah": "NEH", "Esther": "EST", "Job": "JOB", "Psalms": "PSA", "Proverbs": "PRO",
  "Ecclesiastes": "ECC", "Song of Solomon": "SNG", "Isaiah": "ISA", "Jeremiah": "JER", "Lamentations": "LAM",
  "Ezekiel": "EZK", "Daniel": "DAN", "Hosea": "HOS", "Joel": "JOL", "Amos": "AMO", "Obadiah": "OBA",
  "Jonah": "JON", "Micah": "MIC", "Nahum": "NAM", "Habakkuk": "HAB", "Zephaniah": "ZEP", "Haggai": "HAG",
  "Zechariah": "ZEC", "Malachi": "MAL", "Matthew": "MAT", "Mark": "MRK", "Luke": "LUK", "John": "JHN",
  "Acts": "ACT", "Romans": "ROM", "1 Corinthians": "1CO", "2 Corinthians": "2CO", "Galatians": "GAL",
  "Ephesians": "EPH", "Philippians": "PHP", "Colossians": "COL", "1 Thessalonians": "1TH", "2 Thessalonians": "2TH",
  "1 Timothy": "1TI", "2 Timothy": "2TI", "Titus": "TIT", "Philemon": "PHM", "Hebrews": "HEB",
  "James": "JAS", "1 Peter": "1PE", "2 Peter": "2PE", "1 John": "1JN", "2 John": "2JN", "3 John": "3JN",
  "Jude": "JUD", "Revelation": "REV",
};

await mkdir(`${OUT_DIR}/quran`, { recursive: true });
await mkdir(`${OUT_DIR}/tafsir/${DEFAULT_TAFSIR}`, { recursive: true });
await mkdir(`${OUT_DIR}/bible`, { recursive: true });
await mkdir(`${OUT_DIR}/hadith`, { recursive: true });

const manifest = {
  generatedAt: new Date().toISOString(),
  quran: { translationIds: [DEFAULT_TRANSLATION], chapters: 114 },
  tafsir: { ids: [DEFAULT_TAFSIR], ayahs: 0 },
  bible: { old: 0, new: 0, originals: ["hbo_wlc", "grc_sbl"] },
  hadith: { metadata: true, sections: false, collections: [], thaqalaynSections: false },
};

const chapters = await fetchJSON(`${API}/chapters?language=en`);
const translations = await fetchJSON(`${API}/resources/translations`);
const tafsirs = await fetchJSON(`${API}/resources/tafsirs`);
await writeJSON(`${OUT_DIR}/quran/chapters.json`, chapters);
await writeJSON(`${OUT_DIR}/quran/translations.json`, translations);
await writeJSON(`${OUT_DIR}/quran/tafsirs.json`, tafsirs);

for (const chapter of chapters.chapters || []) {
  const id = chapter.id;
  const path = `${OUT_DIR}/quran/chapter-${id}.json`;
  const data = await readJSON(path).catch(() => fetchJSON(`${API}/verses/by_chapter/${id}?language=en&words=true&translations=${DEFAULT_TRANSLATION}&per_page=300&word_fields=text_uthmani,translation,transliteration`));
  await writeJSON(path, data);
  console.log(`Quran ${id}/114`);
}

for (const chapter of chapters.chapters || []) {
  const entries = {};
  const data = await fetchJSON(`${API}/tafsirs/${DEFAULT_TAFSIR}/by_chapter/${chapter.id}?per_page=300`);
  for (const tafsir of data.tafsirs || []) {
    entries[tafsir.verse_key] = { tafsir };
    manifest.tafsir.ayahs += 1;
  }
  await writeJSON(`${OUT_DIR}/tafsir/${DEFAULT_TAFSIR}/chapter-${chapter.id}.json`, entries);
  console.log(`Tafsir ${chapter.id}/114`);
}

await writeBible("old", OLD_TESTAMENT, "hbo_wlc");
await writeBible("new", NEW_TESTAMENT, "grc_sbl");

const hadithEditions = await fetchJSON("https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.min.json").catch(() => ({}));
const hadithInfo = await fetchJSON("https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/info.min.json").catch(() => ({}));
const thaqalaynBooks = await fetchJSON("https://www.thaqalayn-api.net/api/v2/allbooks").catch(() => []);
await writeJSON(`${OUT_DIR}/hadith/editions.json`, hadithEditions);
await writeJSON(`${OUT_DIR}/hadith/info.json`, hadithInfo);
await writeJSON(`${OUT_DIR}/hadith/thaqalayn-books.json`, thaqalaynBooks);
await writeHadithCollections(hadithEditions, hadithInfo);

await writeJSON(`${OUT_DIR}/manifest.json`, manifest);

async function writeBible(type, books, originalTranslation) {
  for (const [book, chaptersCount] of books) {
    const bookId = BOOK_IDS[book];
    for (let chapter = 1; chapter <= chaptersCount; chapter += 1) {
      const path = `${OUT_DIR}/bible/${type}-${bookId}-${chapter}.json`;
      const payload = await readJSON(path).catch(async () => {
        const [english, original] = await Promise.all([
          fetchJSON(`https://bible.helloao.org/api/eng_web/${bookId}/${chapter}.json`),
          fetchJSON(`https://bible.helloao.org/api/${originalTranslation}/${bookId}/${chapter}.json`).catch(() => null),
        ]);
        return { english, original };
      });
      await writeJSON(path, payload);
      manifest.bible[type] += 1;
      console.log(`${type} ${book} ${chapter}/${chaptersCount}`);
    }
  }
}

async function writeHadithCollections(editions, info) {
  const books = Object.entries(editions || {})
    .map(([key, value]) => {
      const english = value.collection?.find((item) => item.name === `eng-${key}`) || value.collection?.find((item) => item.language === "English");
      if (!english) return null;
      const sectionMap = info?.[key]?.metadata?.sections || {};
      const sectionIds = Object.keys(sectionMap).map(Number).filter((item) => item > 0).sort((a, b) => a - b);
      return { key, sectionIds: sectionIds.length ? sectionIds : [1] };
    })
    .filter(Boolean);

  manifest.hadith.sections = 0;

  for (const book of books) {
    await mkdir(`${OUT_DIR}/hadith/${book.key}`, { recursive: true });
    manifest.hadith.collections.push(book.key);
    for (const section of book.sectionIds) {
      const [english, arabic] = await Promise.all([
        fetchJSON(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-${book.key}/sections/${section}.min.json`).catch(() => null),
        fetchJSON(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-${book.key}/sections/${section}.min.json`).catch(() => null),
      ]);
      if (!english && !arabic) continue;
      await writeJSON(`${OUT_DIR}/hadith/${book.key}/section-${section}.json`, { english, arabic });
      manifest.hadith.sections += 1;
      console.log(`Hadith ${book.key} section ${section}`);
    }
  }
}

async function fetchJSON(url, attempt = 1) {
  const response = await fetch(url, {
    headers: { "accept": "application/json", "user-agent": "abrahamic-books-offline-builder" },
  });
  if (response.ok) return response.json();
  if (attempt < 4 && [429, 500, 502, 503, 504].includes(response.status)) {
    await delay(500 * attempt);
    return fetchJSON(url, attempt + 1);
  }
  throw new Error(`${url} failed with ${response.status}`);
}

async function writeJSON(path, value) {
  await writeFile(path, JSON.stringify(value));
}

async function readJSON(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
