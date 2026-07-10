const API = "https://api.quran.com/api/v4";
const OFFLINE = {
  base: "./offline",
  defaultTranslation: 85,
  defaultTafsir: 169,
};
const STORE = {
  notes: "quran-reader-notes-v1",
  prefs: "quran-reader-prefs-v1",
};

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

const state = {
  chapters: [],
  translations: [],
  tafsirs: [],
  hadithBooks: [],
  hadithInfo: {},
  hadithSections: {},
  offlineManifest: null,
  tradition: "islam",
  scripture: "quran",
  selectedBibleBook: "Genesis",
  selectedBibleChapter: 1,
  selectedHadithBook: "bukhari",
  selectedHadithSection: 1,
  selectedChapter: 1,
  selectedTranslations: [85],
  selectedTafsir: 169,
  theme: "sepia",
  width: "comfortable",
  arabicFont: "uthmani",
  translationFont: "mono",
  arabicScale: 1,
  translationScale: 1,
  lineScale: 1,
  compactCards: false,
  showOriginalBible: true,
  cardStyle: "soft",
  headerStyle: "pattern",
  customTheme: {
    paper: "#111816",
    paper2: "#16221f",
    panel: "#1c2925",
    ink: "#eef5ef",
    muted: "#a8b8b1",
    line: "#31433d",
    accent: "#7ac7ad",
    highlight: "#d2a84c",
  },
  verses: [],
  notes: {},
  currentNoteReferences: [],
  noteTagFilter: "",
  originalWordCache: {},
  currentNoteKey: null,
  searchIndex: null,
  searchAbort: 0,
  currentView: "readView",
  viewScrollPositions: { readView: 0, searchView: 0, notesView: 0 },
  searchResults: [],
  searchSelectMode: false,
  selectedSearchResults: new Set(),
};

const els = {
  topbar: document.querySelector(".topbar"),
  chapterTitle: document.querySelector("#chapterTitle"),
  chapterMeta: document.querySelector("#chapterMeta"),
  traditionSelect: document.querySelector("#traditionSelect"),
  scriptureSelect: document.querySelector("#scriptureSelect"),
  chapterSelect: document.querySelector("#chapterSelect"),
  chapterControlLabel: document.querySelector("#chapterControlLabel"),
  bibleBookSelect: document.querySelector("#bibleBookSelect"),
  bibleChapterSelect: document.querySelector("#bibleChapterSelect"),
  hadithCollectionSelect: document.querySelector("#hadithCollectionSelect"),
  hadithSectionSelect: document.querySelector("#hadithSectionSelect"),
  verseControlLabel: document.querySelector("#verseControlLabel"),
  ayahSearch: document.querySelector("#ayahSearch"),
  dashboardSurah: document.querySelector("#dashboardSurah"),
  dashboardProgress: document.querySelector("#dashboardProgress"),
  dashboardNotes: document.querySelector("#dashboardNotes"),
  verses: document.querySelector("#verses"),
  status: document.querySelector("#status"),
  translationButton: document.querySelector("#translationButton"),
  tafsirButton: document.querySelector("#tafsirButton"),
  lastReadButton: document.querySelector("#lastReadButton"),
  themeButton: document.querySelector("#themeButton"),
  decreaseFont: document.querySelector("#decreaseFont"),
  increaseFont: document.querySelector("#increaseFont"),
  settingsButton: document.querySelector("#settingsButton"),
  readerSettingsSheet: document.querySelector("#readerSettingsSheet"),
  settingsSummary: document.querySelector("#settingsSummary"),
  themeSelect: document.querySelector("#themeSelect"),
  widthSelect: document.querySelector("#widthSelect"),
  arabicFontSelect: document.querySelector("#arabicFontSelect"),
  translationFontSelect: document.querySelector("#translationFontSelect"),
  originalLanguageToggle: document.querySelector("#originalLanguageToggle"),
  arabicSizeRange: document.querySelector("#arabicSizeRange"),
  translationSizeRange: document.querySelector("#translationSizeRange"),
  lineHeightRange: document.querySelector("#lineHeightRange"),
  cardStyleSelect: document.querySelector("#cardStyleSelect"),
  headerStyleSelect: document.querySelector("#headerStyleSelect"),
  customThemeControls: document.querySelector("#customThemeControls"),
  customPaper: document.querySelector("#customPaper"),
  customPaper2: document.querySelector("#customPaper2"),
  customPanel: document.querySelector("#customPanel"),
  customInk: document.querySelector("#customInk"),
  customMuted: document.querySelector("#customMuted"),
  customLine: document.querySelector("#customLine"),
  customAccent: document.querySelector("#customAccent"),
  customHighlight: document.querySelector("#customHighlight"),
  compactToggle: document.querySelector("#compactToggle"),
  wordSheet: document.querySelector("#wordSheet"),
  wordTitle: document.querySelector("#wordTitle"),
  wordSubtitle: document.querySelector("#wordSubtitle"),
  wordContent: document.querySelector("#wordContent"),
  noteTags: document.querySelector("#noteTags"),
  referenceSearch: document.querySelector("#referenceSearch"),
  referenceResults: document.querySelector("#referenceResults"),
  noteReferences: document.querySelector("#noteReferences"),
  tagFilters: document.querySelector("#tagFilters"),
  notesVersePreview: document.querySelector("#notesVersePreview"),
  translationSheet: document.querySelector("#translationSheet"),
  translationSearch: document.querySelector("#translationSearch"),
  translationList: document.querySelector("#translationList"),
  translationSummary: document.querySelector("#translationSummary"),
  tafsirSheet: document.querySelector("#tafsirSheet"),
  tafsirSearch: document.querySelector("#tafsirSearch"),
  tafsirList: document.querySelector("#tafsirList"),
  tafsirSummary: document.querySelector("#tafsirSummary"),
  noteSheet: document.querySelector("#noteSheet"),
  noteTitle: document.querySelector("#noteTitle"),
  noteSubtitle: document.querySelector("#noteSubtitle"),
  noteEditor: document.querySelector("#noteEditor"),
  deleteNote: document.querySelector("#deleteNote"),
  tafsirContentSheet: document.querySelector("#tafsirContentSheet"),
  tafsirContentTitle: document.querySelector("#tafsirContentTitle"),
  tafsirContentSubtitle: document.querySelector("#tafsirContentSubtitle"),
  tafsirContent: document.querySelector("#tafsirContent"),
  notesView: document.querySelector("#notesView"),
  readView: document.querySelector("#readView"),
  notesCount: document.querySelector("#notesCount"),
  notesSearch: document.querySelector("#notesSearch"),
  notesList: document.querySelector("#notesList"),
  newStudyNote: document.querySelector("#newStudyNote"),
  exportNotes: document.querySelector("#exportNotes"),
  importNotes: document.querySelector("#importNotes"),
  globalSearch: document.querySelector("#globalSearch"),
  searchScope: document.querySelector("#searchScope"),
  runSearch: document.querySelector("#runSearch"),
  searchSummary: document.querySelector("#searchSummary"),
  searchResults: document.querySelector("#searchResults"),
  toggleSearchSelect: document.querySelector("#toggleSearchSelect"),
  searchSelectionBar: document.querySelector("#searchSelectionBar"),
  searchSelectionCount: document.querySelector("#searchSelectionCount"),
  selectAllSearch: document.querySelector("#selectAllSearch"),
  clearSearchSelection: document.querySelector("#clearSearchSelection"),
  noteSearchSelection: document.querySelector("#noteSearchSelection"),
};

init();
registerServiceWorker();

let filtersAreCompact = false;
let filterFramePending = false;
let filtersExpandedAt = 0;

async function init() {
  loadLocalState();
  bindEvents();
  syncStickyOffset();
  setStatus("Loading chapters, translations, and tafsir sources...");

  try {
    state.offlineManifest = await getOfflineJSON("manifest.json").catch(() => null);
    const [chapters, translations, tafsirs, hadithEditions, hadithInfo, shiaHadithBooks] = await Promise.all([
      getOfflineJSON("quran/chapters.json").catch(() => getJSON(`${API}/chapters?language=en`)),
      getOfflineJSON("quran/translations.json").catch(() => getJSON(`${API}/resources/translations`)),
      getOfflineJSON("quran/tafsirs.json").catch(() => getJSON(`${API}/resources/tafsirs`)),
      getOfflineJSON("hadith/editions.json").catch(() => getJSON("https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.min.json")).catch(() => ({})),
      getOfflineJSON("hadith/info.json").catch(() => getJSON("https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/info.min.json")).catch(() => ({})),
      getOfflineJSON("hadith/thaqalayn-books.json").catch(() => getJSON("https://www.thaqalayn-api.net/api/v2/allbooks")).catch(() => []),
    ]);

    state.chapters = chapters.chapters || [];
    state.translations = sortResources(translations.translations || []);
    state.tafsirs = sortResources(tafsirs.tafsirs || []);
    state.hadithInfo = hadithInfo || {};
    state.hadithBooks = parseHadithBooks(hadithEditions, state.offlineManifest?.hadith?.thaqalaynSections ? shiaHadithBooks : []);

    if (!state.translations.some((item) => item.id === state.selectedTranslations[0])) {
      const english = state.translations.find((item) => item.language_name === "english");
      state.selectedTranslations = [english?.id || state.translations[0]?.id].filter(Boolean);
    }

    if (!state.tafsirs.some((item) => item.id === state.selectedTafsir)) {
      const englishTafsir = state.tafsirs.find((item) => item.language_name === "english");
      state.selectedTafsir = englishTafsir?.id || state.tafsirs[0]?.id;
    }

    renderChapterOptions();
    renderBibleBookOptions();
    renderHadithBookOptions();
    renderScriptureOptions();
    renderScriptureControls();
    renderResourceLists();
    renderNotes();
    await loadCurrentScripture();
  } catch (error) {
    setStatus(`Could not load Quran data. ${error.message}`);
  }
}

function bindEvents() {
  if ("ResizeObserver" in window) new ResizeObserver(syncStickyOffset).observe(els.topbar);
  window.addEventListener("resize", syncStickyOffset, { passive: true });
  els.traditionSelect.addEventListener("change", () => {
    state.tradition = els.traditionSelect.value;
    state.scripture = getAllowedScriptures()[0].value;
    savePrefs();
    renderScriptureOptions();
    renderScriptureControls();
    loadCurrentScripture();
  });

  els.scriptureSelect.addEventListener("change", () => {
    state.scripture = els.scriptureSelect.value;
    state.tradition = getTraditionForScripture(state.scripture);
    savePrefs();
    renderScriptureOptions();
    renderScriptureControls();
    loadCurrentScripture();
  });

  els.chapterSelect.addEventListener("change", () => {
    loadChapter(Number(els.chapterSelect.value));
  });

  els.bibleBookSelect.addEventListener("change", () => {
    state.selectedBibleBook = els.bibleBookSelect.value;
    state.selectedBibleChapter = 1;
    savePrefs();
    renderBibleChapterOptions();
    loadBibleChapter();
  });

  els.bibleChapterSelect.addEventListener("change", () => {
    state.selectedBibleChapter = Number(els.bibleChapterSelect.value);
    savePrefs();
    loadBibleChapter();
  });

  els.hadithCollectionSelect.addEventListener("change", () => {
    state.selectedHadithBook = els.hadithCollectionSelect.value;
    state.selectedHadithSection = 1;
    savePrefs();
    renderHadithSectionOptions();
    loadHadithSection();
  });

  els.hadithSectionSelect.addEventListener("change", () => {
    state.selectedHadithSection = Number(els.hadithSectionSelect.value) || 1;
    savePrefs();
    loadHadithSection();
  });

  els.ayahSearch.addEventListener("change", jumpToAyah);
  els.ayahSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      jumpToAyah();
    }
  });

  els.translationButton.addEventListener("click", () => openDialog(els.translationSheet));
  els.settingsButton.addEventListener("click", () => openDialog(els.readerSettingsSheet));
  els.tafsirButton.addEventListener("click", () => openDialog(els.tafsirSheet));
  els.lastReadButton.addEventListener("click", restoreLastRead);
  els.themeButton.addEventListener("click", toggleTheme);
  els.decreaseFont.addEventListener("click", () => changeArabicScale(-0.08));
  els.increaseFont.addEventListener("click", () => changeArabicScale(0.08));
  els.themeSelect.addEventListener("change", () => updateReaderPref("theme", els.themeSelect.value));
  els.widthSelect.addEventListener("change", () => updateReaderPref("width", els.widthSelect.value));
  els.arabicFontSelect.addEventListener("change", () => updateReaderPref("arabicFont", els.arabicFontSelect.value));
  els.translationFontSelect.addEventListener("change", () => updateReaderPref("translationFont", els.translationFontSelect.value));
  els.originalLanguageToggle.addEventListener("change", () => {
    updateReaderPref("showOriginalBible", els.originalLanguageToggle.checked);
    if (state.scripture !== "quran") renderVerses();
  });
  els.arabicSizeRange.addEventListener("input", () => updateReaderPref("arabicScale", Number(els.arabicSizeRange.value)));
  els.translationSizeRange.addEventListener("input", () => updateReaderPref("translationScale", Number(els.translationSizeRange.value)));
  els.lineHeightRange.addEventListener("input", () => updateReaderPref("lineScale", Number(els.lineHeightRange.value)));
  els.cardStyleSelect.addEventListener("change", () => updateReaderPref("cardStyle", els.cardStyleSelect.value));
  els.headerStyleSelect.addEventListener("change", () => updateReaderPref("headerStyle", els.headerStyleSelect.value));
  els.compactToggle.addEventListener("change", () => updateReaderPref("compactCards", els.compactToggle.checked));
  [els.customPaper, els.customPaper2, els.customPanel, els.customInk, els.customMuted, els.customLine, els.customAccent, els.customHighlight].forEach((input) => {
    input.addEventListener("input", updateCustomTheme);
  });
  els.translationSearch.addEventListener("input", renderTranslationList);
  els.tafsirSearch.addEventListener("input", renderTafsirList);
  els.noteEditor.addEventListener("input", saveCurrentNote);
  els.noteTags.addEventListener("input", saveCurrentNote);
  els.referenceSearch.addEventListener("input", renderReferenceResults);
  els.referenceSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addReferenceFromSearch();
    }
  });
  els.deleteNote.addEventListener("click", deleteCurrentNote);
  els.newStudyNote.addEventListener("click", createStandaloneNote);
  els.notesSearch.addEventListener("input", renderNotes);
  els.exportNotes.addEventListener("click", exportNotes);
  els.importNotes.addEventListener("change", importNotes);
  els.runSearch.addEventListener("click", runGlobalSearch);
  els.globalSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runGlobalSearch();
    }
  });
  els.searchScope.addEventListener("change", () => {
    if (els.globalSearch.value.trim()) runGlobalSearch();
  });
  els.toggleSearchSelect.addEventListener("click", toggleSearchSelectMode);
  els.selectAllSearch.addEventListener("click", selectAllSearchResults);
  els.clearSearchSelection.addEventListener("click", clearSearchSelection);
  els.noteSearchSelection.addEventListener("click", createNoteFromSearchSelection);

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view, true));
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("close", syncModalState);
    dialog.addEventListener("cancel", syncModalState);
  });

  window.addEventListener("scroll", updateFilterBarState, { passive: true });
  document.querySelector(".reader-controls")?.addEventListener("click", () => {
    if (!document.body.classList.contains("filters-compact")) return;
    document.body.classList.add("filters-expanded");
    filtersExpandedAt = window.scrollY;
  });

  els.verses.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const key = button.closest(".ayah-card")?.dataset.key;
    if (!key) return;

    if (button.dataset.action === "note") openNote(key);
    if (button.dataset.action === "tafsir") openTafsir(key);
    if (button.dataset.action === "bookmark") saveLastRead(key);
  });

  els.verses.addEventListener("click", (event) => {
    const word = event.target.closest(".arabic-word");
    if (!word) return;
    openWordTranslation(word.closest(".ayah-card")?.dataset.key, Number(word.dataset.position));
  });

  els.verses.addEventListener("click", (event) => {
    const word = event.target.closest(".original-word");
    if (!word) return;
    openOriginalWordTranslation(word.dataset.word, word.dataset.lang, word.closest(".ayah-card")?.dataset.key);
  });
}

function updateFilterBarState() {
  if (filterFramePending) return;
  filterFramePending = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    if (!filtersAreCompact && y > 340) filtersAreCompact = true;
    if (filtersAreCompact && y < 120) {
      filtersAreCompact = false;
      document.body.classList.remove("filters-expanded");
    }
    if (filtersAreCompact && document.body.classList.contains("filters-expanded") && Math.abs(y - filtersExpandedAt) > 70) {
      document.body.classList.remove("filters-expanded");
    }
    document.body.classList.toggle("filters-compact", filtersAreCompact);
    filterFramePending = false;
  });
}

async function loadChapter(chapterNumber) {
  state.scripture = "quran";
  state.selectedChapter = chapterNumber;
  els.chapterSelect.value = String(chapterNumber);
  savePrefs();
  updateChapterHeader();
  updateDashboard();
  setStatus("Loading ayat...");
  els.verses.innerHTML = "";

  try {
    const ids = state.selectedTranslations.join(",");
    const data = shouldUseOfflineQuran(ids)
      ? await getOfflineJSON(`quran/chapter-${chapterNumber}.json`).catch(() => getJSON(`${API}/verses/by_chapter/${chapterNumber}?language=en&words=true&translations=${ids}&per_page=300&word_fields=text_uthmani,translation,transliteration`))
      : await getJSON(`${API}/verses/by_chapter/${chapterNumber}?language=en&words=true&translations=${ids}&per_page=300&word_fields=text_uthmani,translation,transliteration`);
    state.verses = data.verses || [];

    renderVerses();
    updateDashboard();
    setStatus("");
  } catch (error) {
    setStatus(`Could not load this surah. ${error.message}`);
  }
}

async function loadCurrentScripture() {
  if (state.scripture === "quran") {
    await loadChapter(state.selectedChapter);
  } else if (state.scripture === "hadith") {
    await loadHadithSection();
  } else {
    await loadBibleChapter();
  }
}

async function loadBibleChapter() {
  const book = state.selectedBibleBook;
  const chapter = state.selectedBibleChapter;
  const bookId = BOOK_IDS[book];
  savePrefs();
  updateBibleHeader();
  setStatus(`Loading ${book} ${chapter}...`);
  els.verses.innerHTML = "";

  try {
    const originalTranslation = state.scripture === "old" ? "hbo_wlc" : "grc_sbl";
    const bundled = await getOfflineJSON(`bible/${state.scripture}-${bookId}-${chapter}.json`).catch(() => null);
    const [englishData, originalData] = bundled
      ? [bundled.english, bundled.original]
      : await Promise.all([
          getJSON(`https://bible.helloao.org/api/eng_web/${bookId}/${chapter}.json`),
          getJSON(`https://bible.helloao.org/api/${originalTranslation}/${bookId}/${chapter}.json`).catch(() => null),
        ]);
    const originalByVerse = new Map(extractBibleVerses(originalData).map((verse) => [verse.number, verse.text]));
    state.verses = extractBibleVerses(englishData).map((verse) => ({
      scripture: state.scripture,
      verse_key: bibleKey(book, chapter, verse.number),
      bible_reference: `${book} ${chapter}:${verse.number}`,
      text: verse.text,
      originalText: originalByVerse.get(verse.number) || "",
      originalLanguage: state.scripture === "old" ? "Hebrew" : "Greek",
      translations: [{ text: verse.text, resource_id: "web" }],
      book_name: book,
      chapter,
      verse_number: verse.number,
    }));
    renderVerses();
    updateDashboard();
    setStatus("");
  } catch (error) {
    setStatus(`Could not load ${book} ${chapter}. ${error.message}`);
  }
}

function renderScriptureControls() {
  state.tradition = getTraditionForScripture(state.scripture);
  renderScriptureOptions();
  els.traditionSelect.value = state.tradition;
  els.scriptureSelect.value = state.scripture;
  const isQuran = state.scripture === "quran";
  const isHadith = state.scripture === "hadith";
  const isBible = !isQuran && !isHadith;

  els.chapterControlLabel.textContent = "Surah";
  els.chapterSelect.closest(".field").hidden = !isQuran;
  document.querySelectorAll(".bible-field").forEach((field) => {
    field.hidden = !isBible;
  });
  document.querySelectorAll(".hadith-field").forEach((field) => {
    field.hidden = !isHadith;
  });
  els.tafsirButton.hidden = !isQuran;
  els.translationButton.hidden = !isQuran;

  if (isQuran) {
    els.verseControlLabel.textContent = "Ayah";
    els.ayahSearch.placeholder = "2:255 or 255";
  } else if (isHadith) {
    els.verseControlLabel.textContent = "Hadith";
    els.ayahSearch.placeholder = "Hadith number";
  } else {
    els.verseControlLabel.textContent = "Verse";
    els.ayahSearch.placeholder = `${state.selectedBibleBook} ${state.selectedBibleChapter}:1`;
  }

  if (isBible) {
    renderBibleBookOptions();
    renderBibleChapterOptions();
  }
  if (isHadith) renderHadithSectionOptions();
}

function renderScriptureOptions() {
  const allowed = getAllowedScriptures();
  if (!allowed.some((item) => item.value === state.scripture)) {
    state.scripture = allowed[0].value;
  }
  els.scriptureSelect.innerHTML = allowed
    .map((item) => `<option value="${item.value}">${escapeHTML(item.label)}</option>`)
    .join("");
  els.scriptureSelect.value = state.scripture;
}

function getAllowedScriptures() {
  return state.tradition === "christianity"
    ? [{ value: "old", label: "Old Testament" }, { value: "new", label: "New Testament" }]
    : [{ value: "quran", label: "Quran" }, { value: "hadith", label: "Hadith" }];
}

function getTraditionForScripture(scripture) {
  return scripture === "old" || scripture === "new" ? "christianity" : "islam";
}

function renderBibleBookOptions() {
  const books = getBibleBooks();
  if (!books.some(([name]) => name === state.selectedBibleBook)) {
    state.selectedBibleBook = books[0]?.[0] || "Genesis";
    state.selectedBibleChapter = 1;
  }
  els.bibleBookSelect.innerHTML = books.map(([name]) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join("");
  els.bibleBookSelect.value = state.selectedBibleBook;
  renderBibleChapterOptions();
}

function renderBibleChapterOptions() {
  const chapters = getBibleBooks().find(([name]) => name === state.selectedBibleBook)?.[1] || 1;
  state.selectedBibleChapter = clampNumber(state.selectedBibleChapter, 1, chapters);
  els.bibleChapterSelect.innerHTML = Array.from({ length: chapters }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join("");
  els.bibleChapterSelect.value = String(state.selectedBibleChapter);
}

function updateBibleHeader() {
  els.chapterTitle.textContent = `${state.selectedBibleBook} ${state.selectedBibleChapter}`;
  els.chapterMeta.textContent = `${state.scripture === "old" ? "Old Testament" : "New Testament"} · World English Bible`;
  els.dashboardSurah.textContent = state.selectedBibleBook;
}

async function loadHadithSection() {
  const book = state.selectedHadithBook;
  const section = state.selectedHadithSection;
  const info = state.hadithBooks.find((item) => item.key === book);
  savePrefs();
  els.chapterTitle.textContent = info?.name || "Hadith";
  els.chapterMeta.textContent = `Hadith · ${info?.tradition || "Available public collections"} · Section ${section}`;
  els.dashboardSurah.textContent = info?.name || "Hadith";
  setStatus(`Loading ${info?.name || book}, section ${section}...`);
  els.verses.innerHTML = "";

  try {
    if (info?.source === "thaqalayn") {
      await loadThaqalaynHadithSection(info, section);
      return;
    }
    const bundled = await getOfflineJSON(`hadith/${book}/section-${section}.json`).catch(() => null);
    const [engData, araData] = bundled
      ? [bundled.english, bundled.arabic]
      : await Promise.all([
          getJSON(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-${book}/sections/${section}.min.json`),
          getJSON(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-${book}/sections/${section}.min.json`).catch(() => null),
        ]);
    const arabicByNumber = new Map((araData?.hadiths || []).map((item) => [Number(item.hadithnumber), item.text]));
    const sectionName = engData.metadata?.section?.[String(section)] || `Section ${section}`;
    state.verses = (engData.hadiths || []).map((item) => ({
      scripture: "hadith",
      verse_key: hadithKey(book, section, item.hadithnumber),
      bible_reference: `${info?.name || book} ${item.hadithnumber}`,
      text: item.text || "",
      originalText: arabicByNumber.get(Number(item.hadithnumber)) || "",
      originalLanguage: "Arabic",
      book_name: info?.name || book,
      chapter: section,
      sectionName,
      verse_number: Number(item.hadithnumber),
      grades: item.grades || [],
      reference: item.reference,
    }));
    renderVerses();
    updateDashboard();
    setStatus("");
  } catch (error) {
    setStatus(`Could not load this hadith section. ${error.message}`);
  }
}

async function loadThaqalaynHadithSection(info, section) {
  const ranges = buildHadithRanges(info);
  const selected = ranges.find((item) => item.id === section) || ranges[0];
  if (!selected) throw new Error("No hadith range is available for this collection.");

  const ids = Array.from({ length: selected.end - selected.start + 1 }, (_, index) => selected.start + index);
  const bundled = await getOfflineJSON(`hadith/${info.key}/section-${section}.json`).catch(() => null);
  const records = bundled?.records || await Promise.all(
    ids.map((id) => getJSON(`https://www.thaqalayn-api.net/api/v2/${info.apiId}/${id}`).catch(() => null))
  );
  state.verses = records.filter(Boolean).map((item) => ({
    scripture: "hadith",
    verse_key: hadithKey(info.key, section, item.id),
    bible_reference: `${info.name} ${item.id}`,
    text: item.englishText || item.frenchText || "",
    originalText: item.arabicText || "",
    originalLanguage: "Arabic",
    book_name: item.book || info.name,
    chapter: section,
    sectionName: item.chapter || item.category || selected.label,
    verse_number: Number(item.id),
    grades: buildThaqalaynGrades(item),
    reference: { book: item.book || info.name, hadith: item.id },
    metadata: [
      item.author ? `Author: ${item.author}` : "",
      item.translator ? `Translator: ${item.translator}` : "",
      item.category ? `Category: ${item.category}` : "",
      item.chapter ? `Chapter: ${item.chapter}` : "",
    ].filter(Boolean),
  }));
  renderVerses();
  updateDashboard();
  setStatus("");
}

function renderHadithBookOptions() {
  const books = state.hadithBooks.length ? state.hadithBooks : [{ key: "bukhari", name: "Sahih al Bukhari", sections: 97, tradition: "Sunni" }];
  if (!books.some((item) => item.key === state.selectedHadithBook)) state.selectedHadithBook = books[0].key;
  els.hadithCollectionSelect.innerHTML = books.map((item) => `<option value="${escapeHTML(item.key)}">${escapeHTML(item.tradition)} · ${escapeHTML(item.name)}</option>`).join("");
  els.hadithCollectionSelect.value = state.selectedHadithBook;
  renderHadithSectionOptions();
}

function renderHadithSectionOptions() {
  const book = state.hadithBooks.find((item) => item.key === state.selectedHadithBook);
  if (book?.source === "thaqalayn") {
    const ranges = buildHadithRanges(book);
    if (!ranges.some((item) => item.id === state.selectedHadithSection)) state.selectedHadithSection = ranges[0]?.id || 1;
    els.hadithSectionSelect.innerHTML = ranges
      .map((range) => `<option value="${range.id}">${escapeHTML(range.label)}</option>`)
      .join("");
    els.hadithSectionSelect.value = String(state.selectedHadithSection);
    return;
  }
  const sectionMap = state.hadithInfo?.[state.selectedHadithBook]?.metadata?.sections || {};
  const sectionIds = Object.keys(sectionMap).map(Number).filter((item) => item > 0).sort((a, b) => a - b);
  const sections = sectionIds.length ? sectionIds : Array.from({ length: book?.sections || 80 }, (_, index) => index + 1);
  if (!sections.includes(state.selectedHadithSection)) state.selectedHadithSection = sections[0] || 1;
  els.hadithSectionSelect.innerHTML = sections.map((id) => `<option value="${id}">${id}. ${escapeHTML(sectionMap[id] || `Section ${id}`)}</option>`).join("");
  els.hadithSectionSelect.value = String(state.selectedHadithSection);
}

function renderChapterOptions() {
  els.chapterSelect.innerHTML = state.chapters
    .map((chapter) => `<option value="${chapter.id}">${chapter.id}. ${escapeHTML(chapter.name_simple)} · ${escapeHTML(chapter.name_arabic)}</option>`)
    .join("");
  els.chapterSelect.value = String(state.selectedChapter);
}

function updateChapterHeader() {
  const chapter = getChapter(state.selectedChapter);
  if (!chapter) return;
  els.chapterTitle.textContent = `${chapter.name_simple} · ${chapter.name_arabic}`;
  els.chapterMeta.textContent = `${chapter.translated_name?.name || ""} · ${chapter.verses_count} ayat · ${chapter.revelation_place}`;
  els.dashboardSurah.textContent = chapter.name_simple;
}

function renderVerses() {
  els.verses.innerHTML = state.verses.map(renderVerse).join("");
  if (!state.verses.length) {
    setStatus("No ayat found for this surah.");
  }
  updateDashboard();
}

function renderVerse(verse) {
  const noteData = state.notes[verse.verse_key];
  const note = noteData ? noteData.text?.trim() : "";
  const isQuran = !verse.scripture || verse.scripture === "quran";
  const isHadith = verse.scripture === "hadith";
  const tags = noteData?.tags || [];
  const verseTranslations = verse.translations || [];
  const translations = verseTranslations.length
    ? verseTranslations.map(renderTranslation).join("")
    : `<div class="translation"><p>No selected translation returned for this ayah.</p></div>`;

  return `
    <article class="ayah-card" id="ayah-${verse.verse_key.replaceAll(":", "-")}" data-key="${verse.verse_key}">
      <div class="ayah-top">
        <div class="ayah-key">${escapeHTML(displayKey(verse))}</div>
        <div class="ayah-actions">
          <button class="mini-button ${note ? "active" : ""}" type="button" data-action="note" aria-label="Note for ${verse.verse_key}">✎</button>
          ${isQuran ? `<button class="mini-button" type="button" data-action="tafsir" aria-label="Tafsir for ${verse.verse_key}">≡</button>` : ""}
          <button class="mini-button" type="button" data-action="bookmark" aria-label="Save ${verse.verse_key} as last read">⌖</button>
        </div>
      </div>
      ${isQuran ? `<div class="arabic" lang="ar" dir="rtl">${renderArabicWords(verse)}</div><div class="translations">${translations}</div>` : `${state.showOriginalBible && verse.originalText ? `<div class="original-scripture" dir="${verse.scripture === "old" || isHadith ? "rtl" : "ltr"}">${isHadith ? escapeHTML(verse.originalText) : renderOriginalWords(verse)}</div>` : ""}<div class="scripture-text">${escapeHTML(verse.text || "")}</div>`}
      <div class="verse-meta">${renderVerseMeta(verse)}</div>
      ${note ? `<div class="note-preview">${escapeHTML(note)}</div>` : ""}
      ${tags.length ? `<div class="note-tags">${tags.map((tag) => `<span>#${escapeHTML(tag)}</span>`).join("")}</div>` : ""}
    </article>
  `;
}

function renderOriginalWords(verse) {
  return String(verse.originalText || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `<button class="original-word" type="button" data-lang="${verse.scripture === "old" ? "he" : "el"}" data-word="${escapeHTML(word)}">${escapeHTML(word)}</button>`)
    .join(" ");
}

function renderVerseMeta(verse) {
  if (!verse.scripture || verse.scripture === "quran") {
    const chapter = getChapter(Number(verse.verse_key.split(":")[0]));
    return [
      chapter?.revelation_place ? `${capitalize(chapter.revelation_place)}` : "",
      verse.juz_number ? `Juz ${verse.juz_number}` : "",
      verse.page_number ? `Page ${verse.page_number}` : "",
      verse.ruku_number ? `Ruku ${verse.ruku_number}` : "",
    ].filter(Boolean).map((item) => `<span>${escapeHTML(item)}</span>`).join("");
  }

  if (verse.scripture === "hadith") {
    return [
      verse.book_name,
      verse.sectionName,
      verse.reference?.book ? `Book ${verse.reference.book}` : "",
      verse.reference?.hadith ? `Hadith ${verse.reference.hadith}` : `Hadith ${verse.verse_number}`,
      verse.grades?.[0]?.grade ? `Grade: ${verse.grades[0].grade}` : "",
      ...(verse.metadata || []),
    ].filter(Boolean).map((item) => `<span>${escapeHTML(item)}</span>`).join("");
  }

  return [
    verse.scripture === "old" ? "Old Testament" : "New Testament",
    "World English Bible",
    verse.originalText ? verse.originalLanguage : "",
    `${verse.book_name} ${verse.chapter}:${verse.verse_number}`,
  ].filter(Boolean).map((item) => `<span>${escapeHTML(item)}</span>`).join("");
}

function renderArabicWords(verse) {
  if (!Array.isArray(verse.words) || !verse.words.length) return escapeHTML(verse.text_uthmani || "");
  return verse.words
    .map((word) => {
      if (word.char_type_name === "end") return `<span class="ayah-end">${escapeHTML(word.text_uthmani || word.text || "")}</span>`;
      return `<button class="arabic-word" type="button" data-position="${word.position}" aria-label="Translate ${escapeHTML(word.text_uthmani || word.text || "")}">${escapeHTML(word.text_uthmani || word.text || "")}</button>`;
    })
    .join(" ");
}

function renderTranslation(translation) {
  if (translation.resource_id === "web") {
    return `<div class="translation"><div class="translation-name">World English Bible</div><p>${escapeHTML(translation.text || "")}</p></div>`;
  }
  const resource = state.translations.find((item) => item.id === translation.resource_id);
  const name = resource ? `${resource.name} · ${resource.language_name}` : `Translation ${translation.resource_id}`;
  return `
    <div class="translation">
      <div class="translation-name">${escapeHTML(name)}</div>
      <p>${sanitizeHTML(translation.text || "")}</p>
    </div>
  `;
}

function renderResourceLists() {
  updateTranslationSummary();
  updateTafsirSummary();
  renderTranslationList();
  renderTafsirList();
}

function renderTranslationList() {
  const query = els.translationSearch.value.trim().toLowerCase();
  const selected = new Set(state.selectedTranslations);
  const filtered = state.translations.filter((item) => resourceMatches(item, query));

  els.translationList.innerHTML = filtered.map((item) => `
    <label class="resource-row">
      <input type="checkbox" value="${item.id}" ${selected.has(item.id) ? "checked" : ""}>
      <span>
        <strong>${escapeHTML(item.name)}</strong>
        <span>${escapeHTML(item.language_name)} · ${escapeHTML(item.author_name || "Unknown author")}</span>
      </span>
    </label>
  `).join("");

  els.translationList.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      const id = Number(input.value);
      if (input.checked) {
        state.selectedTranslations = [...new Set([...state.selectedTranslations, id])];
      } else {
        state.selectedTranslations = state.selectedTranslations.filter((item) => item !== id);
      }
      savePrefs();
      updateTranslationSummary();
      loadChapter(state.selectedChapter);
    });
  });
}

function renderTafsirList() {
  const query = els.tafsirSearch.value.trim().toLowerCase();
  const filtered = state.tafsirs.filter((item) => resourceMatches(item, query));

  els.tafsirList.innerHTML = filtered.map((item) => `
    <button class="resource-row ${item.id === state.selectedTafsir ? "active" : ""}" type="button" data-id="${item.id}">
      <strong>${escapeHTML(item.name)}</strong>
      <span>${escapeHTML(item.language_name)} · ${escapeHTML(item.author_name || "Unknown author")}</span>
    </button>
  `).join("");

  els.tafsirList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTafsir = Number(button.dataset.id);
      savePrefs();
      updateTafsirSummary();
      renderTafsirList();
    });
  });
}

function updateTranslationSummary() {
  const names = state.selectedTranslations
    .map((id) => state.translations.find((item) => item.id === id)?.name)
    .filter(Boolean);
  els.translationSummary.textContent = names.length ? names.join(", ") : "Arabic only";
  els.translationButton.textContent = `${names.length || 0} translations`;
}

function updateTafsirSummary() {
  const tafsir = state.tafsirs.find((item) => item.id === state.selectedTafsir);
  els.tafsirSummary.textContent = tafsir ? `${tafsir.name} · ${tafsir.language_name}` : "Select a tafsir source";
}

function openNote(key) {
  const parsed = parseReferenceKey(key);
  const chapter = parsed.type === "quran" ? getChapter(Number(key.split(":")[0])) : null;
  state.currentNoteKey = key;
  state.currentNoteReferences = state.notes[key]?.references || [];
  els.noteTitle.textContent = parsed.type === "note" ? "Study note" : `Note ${formatReferenceKey(key)}`;
  els.noteSubtitle.textContent = parsed.type === "note" ? "Add any references below" : chapter ? chapter.name_simple : parsed.label || "Verse note";
  els.noteEditor.value = state.notes[key]?.text || "";
  els.noteTags.value = (state.notes[key]?.tags || []).join(", ");
  els.referenceSearch.value = "";
  renderNoteReferences();
  renderReferenceResults();
  openDialog(els.noteSheet);
  setTimeout(() => els.noteEditor.focus(), 80);
}

function createStandaloneNote() {
  const key = `note:${Date.now()}`;
  state.notes[key] = { text: "", tags: [], references: [], updatedAt: new Date().toISOString(), standalone: true };
  saveNotes();
  renderNotes();
  openNote(key);
}

function saveCurrentNote() {
  const key = state.currentNoteKey;
  if (!key) return;
  const text = els.noteEditor.value;

  const tags = parseTags(els.noteTags.value);

  if (text.trim() || tags.length || state.currentNoteReferences.length || key.startsWith("note:")) {
    state.notes[key] = { text, tags, references: state.currentNoteReferences, updatedAt: new Date().toISOString() };
  } else {
    delete state.notes[key];
  }

  saveNotes();
  refreshVerse(key);
  renderNotes();
}

function deleteCurrentNote() {
  if (!state.currentNoteKey) return;
  delete state.notes[state.currentNoteKey];
  saveNotes();
  refreshVerse(state.currentNoteKey);
  renderNotes();
  els.noteEditor.value = "";
  els.noteTags.value = "";
  els.referenceSearch.value = "";
  state.currentNoteReferences = [];
  els.noteSheet.close();
}

function openWordTranslation(key, position) {
  const verse = state.verses.find((item) => item.verse_key === key);
  const word = verse?.words?.find((item) => item.position === position);
  if (!word) return;

  els.wordTitle.textContent = word.text_uthmani || word.text || "Word";
  els.wordSubtitle.textContent = `${key} · word ${position}`;
  els.wordContent.innerHTML = `
    <div class="word-arabic" lang="ar" dir="rtl">${escapeHTML(word.text_uthmani || word.text || "")}</div>
    <div class="word-translation"><strong>${escapeHTML(word.translation?.text || "No translation available")}</strong></div>
    <div>${escapeHTML(word.transliteration?.text || "")}</div>
  `;
  openDialog(els.wordSheet);
}

async function openOriginalWordTranslation(rawWord, lang, key) {
  const word = cleanOriginalWord(rawWord);
  if (!word) return;
  const label = lang === "he" ? "Hebrew" : "Greek";
  els.wordTitle.textContent = word;
  els.wordSubtitle.textContent = `${formatReferenceKey(key)} · ${label}`;
  els.wordContent.innerHTML = `
    <div class="word-arabic" dir="${lang === "he" ? "rtl" : "ltr"}">${escapeHTML(word)}</div>
    <div class="word-translation">Looking up translation...</div>
  `;
  openDialog(els.wordSheet);

  const cacheKey = `${lang}:${word}`;
  if (!state.originalWordCache[cacheKey]) {
    try {
      const data = await getJSON(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${lang}%7Cen`);
      state.originalWordCache[cacheKey] = data.responseData?.translatedText || "";
    } catch {
      state.originalWordCache[cacheKey] = "";
    }
  }

  const translation = state.originalWordCache[cacheKey];
  els.wordContent.innerHTML = `
    <div class="word-arabic" dir="${lang === "he" ? "rtl" : "ltr"}">${escapeHTML(word)}</div>
    <div class="word-translation"><strong>${escapeHTML(translation || "No direct word translation found")}</strong></div>
    <div>${escapeHTML(label)} word lookup. Inflected biblical forms may translate imperfectly.</div>
  `;
}

async function openTafsir(key) {
  const tafsir = state.tafsirs.find((item) => item.id === state.selectedTafsir);
  els.tafsirContentTitle.textContent = `Tafsir ${key}`;
  els.tafsirContentSubtitle.textContent = tafsir ? tafsir.name : "Loading...";
  els.tafsirContent.innerHTML = "<p>Loading tafsir...</p>";
  openDialog(els.tafsirContentSheet);

  try {
    const data = await getBundledTafsir(key).catch(() => getJSON(`${API}/tafsirs/${state.selectedTafsir}/by_ayah/${key}`));
    els.tafsirContent.innerHTML = sanitizeHTML(data.tafsir?.text || "<p>No tafsir returned for this ayah.</p>");
  } catch (error) {
    els.tafsirContent.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
  }
}

function renderNotes() {
  const query = els.notesSearch.value.trim().toLowerCase();
  const entries = Object.entries(state.notes)
    .filter(([, note]) => note.text?.trim() || note.tags?.length || note.references?.length || note.standalone)
    .sort((a, b) => new Date(b[1].updatedAt) - new Date(a[1].updatedAt))
    .filter(([key, note]) => {
      const tags = note.tags || [];
      const haystack = `${key} ${formatReferenceKey(key)} ${note.text || ""} ${(note.references || []).map(formatReferenceKey).join(" ")} ${tags.join(" ")}`.toLowerCase();
      const matchesSearch = haystack.includes(query);
      const matchesTag = !state.noteTagFilter || tags.includes(state.noteTagFilter);
      return matchesSearch && matchesTag;
    });

  const total = Object.values(state.notes).filter((note) => note.text?.trim() || note.tags?.length || note.references?.length || note.standalone).length;
  els.notesCount.textContent = `${total} saved ${total === 1 ? "note" : "notes"}`;
  els.dashboardNotes.textContent = String(total);
  renderTagFilters();

  els.notesList.innerHTML = entries.length
    ? entries.map(([key, note]) => {
        const tags = note.tags || [];
        const refs = note.references || [];
        return `
          <article class="note-card">
            <button type="button" data-key="${key}">
              <strong>${escapeHTML(key.startsWith("note:") ? "Study note" : formatReferenceKey(key))}</strong>
              <p>${escapeHTML(note.text || "")}</p>
              ${tags.length ? `<div class="note-tags">${tags.map((tag) => `<span>#${escapeHTML(tag)}</span>`).join("")}</div>` : ""}
              ${refs.length ? `<div class="note-tags">${refs.map((ref) => `<span>${escapeHTML(formatReferenceKey(ref))}</span>`).join("")}</div>` : ""}
            </button>
          </article>
        `;
      }).join("")
    : `<div class="status">No notes yet.</div>`;

  els.notesList.querySelectorAll("button[data-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.key;
      showNoteVersePreview(key);
    });
  });
}

function renderTagFilters() {
  const tags = [...new Set(Object.values(state.notes).flatMap((note) => note.tags || []))].sort();
  els.tagFilters.innerHTML = tags.length
    ? [`<button class="tag-chip ${state.noteTagFilter ? "" : "active"}" type="button" data-tag="">All</button>`, ...tags.map((tag) => `<button class="tag-chip ${state.noteTagFilter === tag ? "active" : ""}" type="button" data-tag="${escapeHTML(tag)}">#${escapeHTML(tag)}</button>`)].join("")
    : "";
  els.tagFilters.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.noteTagFilter = button.dataset.tag;
      renderNotes();
    });
  });
}

function renderReferenceResults() {
  const query = els.referenceSearch.value.trim();
  if (!query) {
    els.referenceResults.innerHTML = "";
    return;
  }

  const parsed = parseLooseReference(query);
  const suggestions = [];
  if (parsed) suggestions.push(parsed);

  if (!parsed) {
    const numeric = query.match(/^(\d{1,3})(?::(\d{1,3}))?$/);
    if (numeric) suggestions.push({ key: `${Number(numeric[1])}:${Number(numeric[2] || 1)}`, label: `Quran ${Number(numeric[1])}:${Number(numeric[2] || 1)}`, type: "quran" });

    state.chapters
      .filter((chapter) => `${chapter.id} ${chapter.name_simple} ${chapter.name_arabic}`.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 4)
      .forEach((chapter) => suggestions.push({ key: `${chapter.id}:1`, label: `Quran ${chapter.name_simple} 1`, type: "quran" }));

    [...OLD_TESTAMENT, ...NEW_TESTAMENT]
      .filter(([name]) => name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .forEach(([name]) => {
        suggestions.push({ key: bibleKey(name, 1, 1), label: `${name} 1:1`, type: getBookSet(name) });
        suggestions.push({ key: bibleKey(name, 1, 2), label: `${name} 1:2`, type: getBookSet(name) });
      });

    state.hadithBooks
      .filter((item) => `${item.name} ${item.key} ${item.tradition}`.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .forEach((item) => suggestions.push({ key: hadithKey(item.key, 1, 1), label: `${item.name} hadith 1`, type: "hadith" }));
  }

  els.referenceResults.innerHTML = suggestions.length
    ? suggestions.map((item) => `<button class="reference-row" type="button" data-key="${escapeHTML(item.key)}">${escapeHTML(item.label)}</button>`).join("")
    : `<div class="status">Type an exact reference like Quran 2:255, John 3:16, Genesis 1:1, or search a book/surah name.</div>`;

  els.referenceResults.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => addNoteReference(button.dataset.key));
  });
}

function addReferenceFromSearch() {
  const parsed = parseLooseReference(els.referenceSearch.value.trim());
  if (parsed) addNoteReference(parsed.key);
}

function addNoteReference(key) {
  if (!key || state.currentNoteReferences.includes(key)) return;
  state.currentNoteReferences = [...state.currentNoteReferences, key];
  els.referenceSearch.value = "";
  renderReferenceResults();
  renderNoteReferences();
  saveCurrentNote();
}

function renderNoteReferences() {
  els.noteReferences.innerHTML = state.currentNoteReferences.length
    ? state.currentNoteReferences.map((key) => `
      <div class="reference-pill">
        <button type="button" data-jump="${escapeHTML(key)}">${escapeHTML(formatReferenceKey(key))}</button>
        <button type="button" data-remove="${escapeHTML(key)}" aria-label="Remove ${escapeHTML(key)}">×</button>
      </div>
    `).join("")
    : "";

  els.noteReferences.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentNoteReferences = state.currentNoteReferences.filter((key) => key !== button.dataset.remove);
      renderNoteReferences();
      saveCurrentNote();
    });
  });

  els.noteReferences.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => jumpToReference(button.dataset.jump));
  });
}

async function showNoteVersePreview(key) {
  if (key.startsWith("note:")) {
    const note = state.notes[key] || {};
    const refs = note.references || [];
    els.notesVersePreview.hidden = false;
    els.notesVersePreview.innerHTML = `
      <strong>Study note</strong>
      <p class="preview-translation">${escapeHTML(note.text || "")}</p>
      ${refs.length ? `<div class="note-tags">${refs.map((ref) => `<button class="tag-chip" type="button" data-ref="${escapeHTML(ref)}">${escapeHTML(formatReferenceKey(ref))}</button>`).join("")}</div>` : ""}
      <div class="sheet-actions">
        <button class="text-button" type="button" data-action="edit-note">Edit note</button>
      </div>
    `;
    els.notesVersePreview.querySelector('[data-action="edit-note"]').addEventListener("click", () => openNote(key));
    els.notesVersePreview.querySelectorAll("[data-ref]").forEach((button) => {
      button.addEventListener("click", () => jumpToReference(button.dataset.ref));
    });
    return;
  }
  await ensureReferenceLoaded(key);
  const verse = state.verses.find((item) => item.verse_key === key);
  const parsed = parseReferenceKey(key);
  const translation = parsed.type === "quran" ? verse?.translations?.[0]?.text || "" : verse?.text || "";
  const refs = state.notes[key]?.references || [];
  els.notesVersePreview.hidden = false;
  els.notesVersePreview.innerHTML = `
    <strong>${escapeHTML(formatReferenceKey(key))}</strong>
    ${parsed.type === "quran" ? `<div class="preview-arabic" lang="ar" dir="rtl">${renderArabicWords(verse || {})}</div>` : ""}
    <p class="preview-translation">${sanitizeHTML(translation)}</p>
    ${refs.length ? `<div class="note-tags">${refs.map((ref) => `<span>${escapeHTML(formatReferenceKey(ref))}</span>`).join("")}</div>` : ""}
    <div class="sheet-actions">
      <button class="text-button" type="button" data-action="edit-note">Edit note</button>
      <button class="text-button primary" type="button" data-action="jump-note">Jump to verse</button>
    </div>
  `;
  els.notesVersePreview.querySelector('[data-action="edit-note"]').addEventListener("click", () => openNote(key));
  els.notesVersePreview.querySelector('[data-action="jump-note"]').addEventListener("click", () => {
    switchView("readView");
    requestAnimationFrame(() => scrollToKey(key));
  });
}

function jumpToAyah() {
  const raw = els.ayahSearch.value.trim();
  if (!raw) return;
  const parsedRef = parseLooseReference(raw);
  if (parsedRef) {
    jumpToReference(parsedRef.key);
    return;
  }
  if (state.scripture !== "quran") {
    const verse = Number(raw);
    if (verse && state.scripture === "hadith") scrollToKey(hadithKey(state.selectedHadithBook, state.selectedHadithSection, verse));
    else if (verse) scrollToKey(bibleKey(state.selectedBibleBook, state.selectedBibleChapter, verse));
    return;
  }
  const key = raw.includes(":") ? raw : `${state.selectedChapter}:${raw}`;
  const [chapter, ayah] = key.split(":").map(Number);
  if (!chapter || !ayah) return;

  if (chapter !== state.selectedChapter) {
    loadChapter(chapter).then(() => scrollToKey(key));
  } else {
    scrollToKey(key);
  }
}

async function jumpToReference(key) {
  await ensureReferenceLoaded(key);
  switchView("readView");
  requestAnimationFrame(() => scrollToKey(key));
}

async function ensureReferenceLoaded(key) {
  const parsed = parseReferenceKey(key);
  if (parsed.type === "quran") {
    if (state.scripture !== "quran" || parsed.chapter !== state.selectedChapter) {
      state.scripture = "quran";
      renderScriptureControls();
      await loadChapter(parsed.chapter);
    }
    return;
  }

  if (parsed.type === "hadith") {
    state.scripture = "hadith";
    state.selectedHadithBook = parsed.book;
    state.selectedHadithSection = parsed.section;
    renderScriptureControls();
    await loadHadithSection();
    return;
  }

  state.scripture = parsed.type;
  state.selectedBibleBook = parsed.book;
  state.selectedBibleChapter = parsed.chapter;
  renderScriptureControls();
  await loadBibleChapter();
}

function scrollToKey(key) {
  const target = document.querySelector(`#ayah-${CSS.escape(key.replaceAll(":", "-"))}`);
  if (!target) {
    setStatus(`Ayah ${key} was not found in this surah.`);
    return;
  }
  const headerOffset = document.querySelector(".topbar")?.getBoundingClientRect().height || 0;
  const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 14;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  updateDashboard(key);
  target.animate(
    [
      { outline: "3px solid rgba(176, 130, 47, 0.0)" },
      { outline: "3px solid rgba(176, 130, 47, 0.55)" },
      { outline: "3px solid rgba(176, 130, 47, 0.0)" },
    ],
    { duration: 1300, easing: "ease-out" },
  );
}

function refreshVerse(key) {
  const verse = state.verses.find((item) => item.verse_key === key);
  const current = document.querySelector(`[data-key="${CSS.escape(key)}"]`);
  if (verse && current) current.outerHTML = renderVerse(verse);
}

function saveLastRead(key) {
  localStorage.setItem("quran-reader-last-read-v1", key);
  updateDashboard(key);
  setStatus(`Saved ${key} as last read.`);
  setTimeout(() => setStatus(""), 1600);
}

function restoreLastRead() {
  const key = localStorage.getItem("quran-reader-last-read-v1");
  if (!key) {
    setStatus("No last-read ayah saved yet.");
    setTimeout(() => setStatus(""), 1600);
    return;
  }
  if (key.startsWith("old:") || key.startsWith("new:") || key.startsWith("hadith:")) {
    jumpToReference(key);
    return;
  }
  const chapter = Number(key.split(":")[0]);
  if (chapter !== state.selectedChapter) {
    loadChapter(chapter).then(() => scrollToKey(key));
  } else {
    scrollToKey(key);
  }
}

function exportNotes() {
  const payload = {
    exportedAt: new Date().toISOString(),
    notes: state.notes,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "quran-notes.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importNotes(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = parsed.notes && typeof parsed.notes === "object" ? parsed.notes : parsed;
      state.notes = { ...state.notes, ...incoming };
      saveNotes();
      renderVerses();
      renderNotes();
      setStatus("Imported notes.");
      setTimeout(() => setStatus(""), 1600);
    } catch {
      setStatus("Could not import that notes file.");
    }
  });
  reader.readAsText(file);
  event.target.value = "";
}

function switchView(viewId, reselectedFromNav = false) {
  const isCurrentView = state.currentView === viewId;
  if (isCurrentView) {
    if (reselectedFromNav) {
      state.viewScrollPositions[viewId] = 0;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return;
  }

  state.viewScrollPositions[state.currentView] = window.scrollY;
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
  if (viewId === "notesView") renderNotes();
  state.currentView = viewId;
  document.body.classList.remove("filters-expanded");
  requestAnimationFrame(() => window.scrollTo({ top: state.viewScrollPositions[viewId] || 0, behavior: "auto" }));
}

async function runGlobalSearch() {
  const query = els.globalSearch.value.trim();
  const scope = els.searchScope.value;
  const token = Date.now();
  state.searchAbort = token;
  clearSearchSelection();

  if (query.length < 2) {
    els.searchSummary.textContent = "Enter at least 2 characters";
    els.searchResults.innerHTML = "";
    return;
  }

  els.runSearch.disabled = true;
  els.searchSummary.textContent = "Searching offline bundle...";
  els.searchResults.innerHTML = `<div class="status">Searching bundled texts...</div>`;

  try {
    const results = await searchOfflineTexts(query, scope, token);
    if (state.searchAbort !== token) return;
    renderSearchResults(results, query);
  } catch (error) {
    els.searchResults.innerHTML = `<div class="status">${escapeHTML(error.message)}</div>`;
    els.searchSummary.textContent = "Search failed";
  } finally {
    if (state.searchAbort === token) els.runSearch.disabled = false;
  }
}

async function searchOfflineTexts(query, scope, token) {
  const needle = normalizeSearchText(query);
  const results = [];
  const maxResults = 120;
  const include = (name) => scope === "all" || scope === name;
  const pushResult = (result) => {
    if (results.length >= maxResults) return;
    const haystack = normalizeSearchText(`${result.title} ${result.label} ${result.text} ${result.extra || ""}`);
    if (haystack.includes(needle)) results.push(result);
  };
  const shouldStop = () => state.searchAbort !== token || results.length >= maxResults;

  if (include("quran")) {
    for (let chapter = 1; chapter <= 114 && !shouldStop(); chapter += 1) {
      const data = await getOfflineJSON(`quran/chapter-${chapter}.json`).catch(() => null);
      for (const verse of data?.verses || []) {
        pushResult({
          key: verse.verse_key,
          type: "Quran",
          title: `Quran ${verse.verse_key}`,
          label: getChapter(chapter)?.name_simple || `Surah ${chapter}`,
          text: [verse.text_uthmani, ...(verse.translations || []).map((item) => stripHTML(item.text))].filter(Boolean).join(" "),
        });
        if (shouldStop()) break;
      }
    }
  }

  if (include("tafsir")) {
    for (let chapter = 1; chapter <= 114 && !shouldStop(); chapter += 1) {
      const data = await getOfflineJSON(`tafsir/${OFFLINE.defaultTafsir}/chapter-${chapter}.json`).catch(() => null);
      for (const [key, item] of Object.entries(data || {})) {
        pushResult({
          key,
          type: "Tafsir",
          title: `Tafsir ${key}`,
          label: getChapter(chapter)?.name_simple || `Surah ${chapter}`,
          text: stripHTML(item?.tafsir?.text || ""),
        });
        if (shouldStop()) break;
      }
    }
  }

  if (include("bible")) {
    const groups = [["old", OLD_TESTAMENT], ["new", NEW_TESTAMENT]];
    for (const [testament, books] of groups) {
      for (const [book, chapters] of books) {
        const bookId = BOOK_IDS[book];
        for (let chapter = 1; chapter <= chapters && !shouldStop(); chapter += 1) {
          const data = await getOfflineJSON(`bible/${testament}-${bookId}-${chapter}.json`).catch(() => null);
          const originalByVerse = new Map(extractBibleVerses(data?.original).map((verse) => [verse.number, verse.text]));
          for (const verse of extractBibleVerses(data?.english)) {
            pushResult({
              key: bibleKey(book, chapter, verse.number),
              type: testament === "old" ? "Old Testament" : "New Testament",
              title: `${book} ${chapter}:${verse.number}`,
              label: "World English Bible",
              text: verse.text,
              extra: originalByVerse.get(verse.number) || "",
            });
            if (shouldStop()) break;
          }
        }
      }
    }
  }

  if (include("hadith")) {
    for (const book of state.hadithBooks) {
      if (book.source === "thaqalayn") continue;
      const sectionMap = state.hadithInfo?.[book.key]?.metadata?.sections || {};
      const sectionIds = Object.keys(sectionMap).map(Number).filter((item) => item > 0).sort((a, b) => a - b);
      for (const section of sectionIds) {
        if (shouldStop()) break;
        const data = await getOfflineJSON(`hadith/${book.key}/section-${section}.json`).catch(() => null);
        const arabicByNumber = new Map((data?.arabic?.hadiths || []).map((item) => [Number(item.hadithnumber), item.text]));
        for (const item of data?.english?.hadiths || []) {
          pushResult({
            key: hadithKey(book.key, section, item.hadithnumber),
            type: "Hadith",
            title: `${book.name} ${item.hadithnumber}`,
            label: sectionMap[section] || `Section ${section}`,
            text: item.text || "",
            extra: arabicByNumber.get(Number(item.hadithnumber)) || "",
          });
          if (shouldStop()) break;
        }
      }
    }
  }

  return results;
}

function renderSearchResults(results, query) {
  state.searchResults = results.map((result, index) => ({ ...result, searchId: `${result.type}:${result.key}:${index}` }));
  els.searchSummary.textContent = results.length
    ? `${results.length} result${results.length === 1 ? "" : "s"} for "${query}"`
    : `No offline results for "${query}"`;
  els.searchResults.innerHTML = state.searchResults.length
    ? state.searchResults.map((result) => `
      <article class="search-result" data-search-id="${escapeHTML(result.searchId)}">
        <label class="search-check" aria-label="Select ${escapeHTML(result.title)}">
          <input type="checkbox" ${state.selectedSearchResults.has(result.searchId) ? "checked" : ""}>
          <span aria-hidden="true"></span>
        </label>
        <button type="button" data-key="${escapeHTML(result.key)}" data-type="${escapeHTML(result.type)}">
          <span>${escapeHTML(result.type)}</span>
          <strong>${escapeHTML(result.title)}</strong>
          <small>${escapeHTML(result.label || "")}</small>
          <p>${escapeHTML(makeSnippet(result.text || result.extra || "", query))}</p>
        </button>
      </article>
    `).join("")
    : `<div class="status">No matching bundled text was found.</div>`;

  els.searchResults.querySelectorAll("button[data-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".search-result");
      if (state.searchSelectMode) {
        toggleSearchResult(card.dataset.searchId);
        return;
      }
      if (button.dataset.type === "Tafsir") openSearchTafsir(button.dataset.key);
      else jumpToReference(button.dataset.key);
    });
  });
  els.searchResults.querySelectorAll(".search-check input").forEach((checkbox) => {
    checkbox.addEventListener("change", () => toggleSearchResult(checkbox.closest(".search-result").dataset.searchId, checkbox.checked));
  });
  updateSearchSelectionUI();
}

async function openSearchTafsir(key) {
  const parsed = parseReferenceKey(key);
  if (parsed.type !== "quran") return;
  state.scripture = "quran";
  state.selectedChapter = parsed.chapter;
  state.selectedTafsir = OFFLINE.defaultTafsir;
  savePrefs();
  await openTafsir(key);
}

function syncStickyOffset() {
  const height = Math.ceil(els.topbar?.getBoundingClientRect().height || 0);
  document.documentElement.style.setProperty("--topbar-height", `${height}px`);
}

function toggleSearchSelectMode() {
  state.searchSelectMode = !state.searchSelectMode;
  if (!state.searchSelectMode) state.selectedSearchResults.clear();
  updateSearchSelectionUI();
}

function toggleSearchResult(searchId, force) {
  const shouldSelect = force ?? !state.selectedSearchResults.has(searchId);
  if (shouldSelect) state.selectedSearchResults.add(searchId);
  else state.selectedSearchResults.delete(searchId);
  updateSearchSelectionUI();
}

function selectAllSearchResults() {
  if (!state.searchResults.length) return;
  const allSelected = state.searchResults.every((result) => state.selectedSearchResults.has(result.searchId));
  state.selectedSearchResults = allSelected ? new Set() : new Set(state.searchResults.map((result) => result.searchId));
  updateSearchSelectionUI();
}

function clearSearchSelection() {
  state.selectedSearchResults.clear();
  updateSearchSelectionUI();
}

function updateSearchSelectionUI() {
  const count = state.selectedSearchResults.size;
  els.searchResults.classList.toggle("selecting", state.searchSelectMode);
  els.searchSelectionBar.hidden = !state.searchSelectMode;
  els.toggleSearchSelect.classList.toggle("active", state.searchSelectMode);
  els.toggleSearchSelect.setAttribute("aria-pressed", String(state.searchSelectMode));
  els.toggleSearchSelect.textContent = state.searchSelectMode ? "Done" : "Select";
  els.searchSelectionCount.textContent = `${count} selected`;
  els.noteSearchSelection.disabled = count === 0;
  const allSelected = state.searchResults.length > 0 && state.searchResults.every((result) => state.selectedSearchResults.has(result.searchId));
  els.selectAllSearch.textContent = allSelected ? "Deselect all" : "Select all";
  els.searchResults.querySelectorAll(".search-result").forEach((card) => {
    const checked = state.selectedSearchResults.has(card.dataset.searchId);
    card.classList.toggle("selected", checked);
    const input = card.querySelector(".search-check input");
    if (input) input.checked = checked;
  });
}

function createNoteFromSearchSelection() {
  const selected = state.searchResults.filter((result) => state.selectedSearchResults.has(result.searchId));
  if (!selected.length) return;
  const key = `note:${Date.now()}`;
  const references = [...new Set(selected.map((result) => result.key))];
  const text = selected.map((result) => `${result.title}\n${makeSnippet(result.text || result.extra || "", els.globalSearch.value.trim())}`).join("\n\n");
  state.notes[key] = { text, tags: ["search"], references, updatedAt: new Date().toISOString(), standalone: true };
  saveNotes();
  renderNotes();
  openNote(key);
  state.searchSelectMode = false;
  state.selectedSearchResults.clear();
  updateSearchSelectionUI();
}

function loadLocalState() {
  try {
    state.notes = JSON.parse(localStorage.getItem(STORE.notes)) || {};
  } catch {
    state.notes = {};
  }

  try {
    const prefs = JSON.parse(localStorage.getItem(STORE.prefs)) || {};
    state.tradition = ["islam", "christianity"].includes(prefs.tradition) ? prefs.tradition : state.tradition;
    state.scripture = ["quran", "old", "new", "hadith"].includes(prefs.scripture) ? prefs.scripture : state.scripture;
    state.tradition = getTraditionForScripture(state.scripture);
    state.selectedBibleBook = typeof prefs.selectedBibleBook === "string" ? prefs.selectedBibleBook : state.selectedBibleBook;
    state.selectedBibleChapter = Number(prefs.selectedBibleChapter) || state.selectedBibleChapter;
    state.selectedHadithBook = typeof prefs.selectedHadithBook === "string" ? prefs.selectedHadithBook : state.selectedHadithBook;
    state.selectedHadithSection = Number(prefs.selectedHadithSection) || state.selectedHadithSection;
    state.selectedChapter = Number(prefs.selectedChapter) || state.selectedChapter;
    state.selectedTranslations = Array.isArray(prefs.selectedTranslations) ? prefs.selectedTranslations : state.selectedTranslations;
    state.selectedTafsir = Number(prefs.selectedTafsir) || state.selectedTafsir;
    state.theme = ["light", "dark", "sepia", "midnight", "emerald", "contrast", "rose", "ocean", "graphite", "paper", "custom"].includes(prefs.theme) ? prefs.theme : state.theme;
    state.width = ["comfortable", "narrow", "wide"].includes(prefs.width) ? prefs.width : state.width;
    state.arabicFont = ["uthmani", "naskh", "scheherazade", "serif"].includes(prefs.arabicFont) ? prefs.arabicFont : state.arabicFont;
    state.translationFont = ["system", "serif", "humanist", "mono"].includes(prefs.translationFont) ? prefs.translationFont : state.translationFont;
    state.arabicScale = clampNumber(Number(prefs.arabicScale) || state.arabicScale, 0.84, 1.4);
    state.translationScale = clampNumber(Number(prefs.translationScale) || state.translationScale, 0.9, 1.22);
    state.lineScale = clampNumber(Number(prefs.lineScale) || state.lineScale, 1, 1.24);
    state.compactCards = Boolean(prefs.compactCards);
    state.showOriginalBible = prefs.showOriginalBible !== false;
    state.cardStyle = ["soft", "flat", "outlined"].includes(prefs.cardStyle) ? prefs.cardStyle : state.cardStyle;
    state.headerStyle = ["pattern", "solid", "minimal"].includes(prefs.headerStyle) ? prefs.headerStyle : state.headerStyle;
    if (prefs.customTheme && typeof prefs.customTheme === "object") {
      state.customTheme = { ...state.customTheme, ...prefs.customTheme };
    }
  } catch {
    savePrefs();
  }

  applyReaderPrefs();
}

function savePrefs() {
  localStorage.setItem(STORE.prefs, JSON.stringify({
    tradition: state.tradition,
    scripture: state.scripture,
    selectedBibleBook: state.selectedBibleBook,
    selectedBibleChapter: state.selectedBibleChapter,
    selectedHadithBook: state.selectedHadithBook,
    selectedHadithSection: state.selectedHadithSection,
    selectedChapter: state.selectedChapter,
    selectedTranslations: state.selectedTranslations,
    selectedTafsir: state.selectedTafsir,
    theme: state.theme,
    width: state.width,
    arabicFont: state.arabicFont,
    translationFont: state.translationFont,
    arabicScale: state.arabicScale,
    translationScale: state.translationScale,
    lineScale: state.lineScale,
    compactCards: state.compactCards,
    showOriginalBible: state.showOriginalBible,
    cardStyle: state.cardStyle,
    headerStyle: state.headerStyle,
    customTheme: state.customTheme,
  }));
}

function saveNotes() {
  localStorage.setItem(STORE.notes, JSON.stringify(state.notes));
}

function setStatus(message) {
  els.status.textContent = message;
}

function updateDashboard(activeKey = localStorage.getItem("quran-reader-last-read-v1")) {
  const isQuran = state.scripture === "quran";
  const isHadith = state.scripture === "hadith";
  const chapter = isQuran ? getChapter(state.selectedChapter) : null;
  const hadithBook = state.hadithBooks.find((item) => item.key === state.selectedHadithBook);
  els.dashboardSurah.textContent = isQuran ? chapter?.name_simple || "Quran" : isHadith ? hadithBook?.name || "Hadith" : state.selectedBibleBook;

  const active = parseReferenceKey(activeKey || "");
  const verseCount = chapter?.verses_count || state.verses.length || 0;
  const activeChapter = isQuran ? state.selectedChapter : isHadith ? state.selectedHadithSection : state.selectedBibleChapter;
  const progress = active.type === state.scripture && active.chapter === activeChapter ? active.verse : state.verses.length ? 1 : 0;
  els.dashboardProgress.textContent = `${Math.min(progress, verseCount)} / ${verseCount}`;
  els.dashboardNotes.textContent = String(Object.values(state.notes).filter((note) => note.text?.trim() || note.tags?.length || note.references?.length || note.standalone).length);
}

function changeArabicScale(delta) {
  state.arabicScale = clampNumber(Number((state.arabicScale + delta).toFixed(2)), 0.84, 1.4);
  applyReaderPrefs();
  savePrefs();
}

function toggleTheme() {
  updateReaderPref("theme", state.theme === "dark" ? "light" : "dark");
}

function updateReaderPref(key, value) {
  if (key === "arabicScale") state.arabicScale = clampNumber(Number(value), 0.84, 1.4);
  else if (key === "translationScale") state.translationScale = clampNumber(Number(value), 0.9, 1.22);
  else if (key === "lineScale") state.lineScale = clampNumber(Number(value), 1, 1.24);
  else state[key] = value;

  applyReaderPrefs();
  savePrefs();
}

function applyReaderPrefs() {
  const root = document.documentElement;
  root.dataset.theme = state.theme;
  root.dataset.width = state.width;
  root.dataset.arabicFont = state.arabicFont;
  root.dataset.translationFont = state.translationFont;
  root.dataset.density = state.compactCards ? "compact" : "comfortable";
  root.dataset.cardStyle = state.cardStyle;
  root.dataset.headerStyle = state.headerStyle;
  root.style.setProperty("--arabic-scale", state.arabicScale);
  root.style.setProperty("--translation-scale", state.translationScale);
  root.style.setProperty("--line-scale", state.lineScale);
  if (state.theme === "custom") {
    root.style.setProperty("--paper", state.customTheme.paper);
    root.style.setProperty("--paper-2", state.customTheme.paper2);
    root.style.setProperty("--panel", state.customTheme.panel);
    root.style.setProperty("--ink", state.customTheme.ink);
    root.style.setProperty("--muted", state.customTheme.muted);
    root.style.setProperty("--line", state.customTheme.line);
    root.style.setProperty("--green", state.customTheme.accent);
    root.style.setProperty("--green-2", state.customTheme.accent);
    root.style.setProperty("--gold", state.customTheme.highlight);
    root.style.setProperty("--gold-soft", state.customTheme.highlight);
  } else {
    ["--paper", "--paper-2", "--panel", "--ink", "--muted", "--line", "--green", "--green-2", "--gold", "--gold-soft"].forEach((name) => root.style.removeProperty(name));
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", state.theme === "dark" ? "#111816" : "#173f35");

  els.themeSelect.value = state.theme;
  els.widthSelect.value = state.width;
  els.arabicFontSelect.value = state.arabicFont;
  els.translationFontSelect.value = state.translationFont;
  els.arabicSizeRange.value = String(state.arabicScale);
  els.translationSizeRange.value = String(state.translationScale);
  els.lineHeightRange.value = String(state.lineScale);
  els.compactToggle.checked = state.compactCards;
  els.originalLanguageToggle.checked = state.showOriginalBible;
  els.cardStyleSelect.value = state.cardStyle;
  els.headerStyleSelect.value = state.headerStyle;
  els.customPaper.value = state.customTheme.paper;
  els.customPaper2.value = state.customTheme.paper2;
  els.customPanel.value = state.customTheme.panel;
  els.customInk.value = state.customTheme.ink;
  els.customMuted.value = state.customTheme.muted;
  els.customLine.value = state.customTheme.line;
  els.customAccent.value = state.customTheme.accent;
  els.customHighlight.value = state.customTheme.highlight;
  els.customThemeControls.hidden = state.theme !== "custom";
  els.themeButton.textContent = state.theme === "dark" ? "Light mode" : "Dark mode";
  els.settingsSummary.textContent = `${capitalize(state.theme)} · ${capitalize(state.arabicFont)} Arabic · ${capitalize(state.translationFont)} translation`;
}

function updateCustomTheme() {
  state.customTheme = {
    paper: els.customPaper.value,
    paper2: els.customPaper2.value,
    panel: els.customPanel.value,
    ink: els.customInk.value,
    muted: els.customMuted.value,
    line: els.customLine.value,
    accent: els.customAccent.value,
    highlight: els.customHighlight.value,
  };
  state.theme = "custom";
  applyReaderPrefs();
  savePrefs();
}

function parseTags(value) {
  return [...new Set(String(value)
    .split(/[,#\s]+/)
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean))].slice(0, 12);
}

function syncModalState() {
  document.body.classList.toggle("modal-open", Boolean(document.querySelector("dialog[open]")));
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getBibleBooks() {
  return state.scripture === "new" ? NEW_TESTAMENT : OLD_TESTAMENT;
}

function parseHadithBooks(editions, thaqalaynBooks = []) {
  const sunniBooks = Object.entries(editions || {}).map(([key, value]) => {
    const english = value.collection?.find((item) => item.name === `eng-${key}`) || value.collection?.find((item) => item.language === "English");
    if (!english) return null;
    return {
      key,
      apiId: key,
      name: value.name || key,
      sections: Object.keys(state.hadithInfo?.[key]?.metadata?.sections || {}).filter((item) => Number(item) > 0).length || (english.has_sections ? 80 : 1),
      tradition: classifyHadithTradition(key, value.name),
      source: "hadith-api",
    };
  }).filter(Boolean);

  const shiaBooks = (Array.isArray(thaqalaynBooks) ? thaqalaynBooks : []).map((book) => ({
    key: `thaqalayn-${book.bookId}`,
    apiId: book.bookId,
    name: book.volume ? `${book.BookName || book.englishName || book.bookId}, Vol. ${book.volume}` : book.BookName || book.englishName || book.bookId,
    sections: Math.max(1, Math.ceil(((Number(book.idRangeMax) || 1) - (Number(book.idRangeMin) || 1) + 1) / 25)),
    tradition: "Shia",
    source: "thaqalayn",
    idRangeMin: Number(book.idRangeMin) || 1,
    idRangeMax: Number(book.idRangeMax) || 1,
    author: book.author || "",
    translator: book.translator || "",
  }));

  return [...sunniBooks, ...shiaBooks].sort((a, b) => {
    const tradition = a.tradition.localeCompare(b.tradition);
    return tradition || a.name.localeCompare(b.name);
  });
}

function buildHadithRanges(book) {
  const min = Number(book?.idRangeMin) || 1;
  const max = Math.max(min, Number(book?.idRangeMax) || min);
  const size = 25;
  return Array.from({ length: Math.ceil((max - min + 1) / size) }, (_, index) => {
    const start = min + index * size;
    const end = Math.min(max, start + size - 1);
    return { id: index + 1, start, end, label: `${start}-${end}` };
  });
}

function buildThaqalaynGrades(item) {
  return [
    item.majlisiGrading ? { name: "Majlisi", grade: item.majlisiGrading } : null,
    item.mohseniGrading ? { name: "Mohseni", grade: item.mohseniGrading } : null,
    item.behbudiGrading ? { name: "Behbudi", grade: item.behbudiGrading } : null,
  ].filter(Boolean);
}

function classifyHadithTradition(key, name = "") {
  const label = `${key} ${name}`.toLowerCase();
  if (label.includes("kafi") || label.includes("thaqalayn") || label.includes("shia")) return "Shia";
  if (label.includes("muwatta")) return "Maliki/Sunni";
  return "Sunni";
}

function extractBibleVerses(data) {
  return (data?.chapter?.content || [])
    .filter((item) => item.type === "verse")
    .map((verse) => ({
      number: verse.number,
      text: flattenBibleContent(verse.content).trim(),
    }))
    .filter((verse) => verse.text);
}

function flattenBibleContent(content) {
  return (content || []).map((item) => {
    if (typeof item === "string") return item;
    if (item?.text) return item.text;
    if (item?.heading) return item.heading;
    if (item?.lineBreak) return " ";
    return "";
  }).join(" ").replace(/\s+/g, " ");
}

function getBookSet(book) {
  if (OLD_TESTAMENT.some(([name]) => name.toLowerCase() === String(book).toLowerCase())) return "old";
  if (NEW_TESTAMENT.some(([name]) => name.toLowerCase() === String(book).toLowerCase())) return "new";
  return "old";
}

function bibleKey(book, chapter, verse) {
  return `${getBookSet(book)}:${String(book).replaceAll(" ", "_")}:${chapter}:${verse}`;
}

function hadithKey(book, section, number) {
  return `hadith:${book}:${section}:${number}`;
}

function parseReferenceKey(key) {
  const raw = String(key || "");
  if (!raw) return { type: state.scripture, chapter: state.selectedChapter, verse: 0, label: "" };
  if (raw.startsWith("note:")) return { type: "note", label: "Study note" };
  if (raw.startsWith("hadith:")) {
    const [, book, section, number] = raw.split(":");
    const info = state.hadithBooks.find((item) => item.key === book);
    return { type: "hadith", book, section: Number(section), chapter: Number(section), verse: Number(number), label: `${info?.name || book} ${number}` };
  }
  if (raw.startsWith("old:") || raw.startsWith("new:")) {
    const [type, bookRaw, chapter, verse] = raw.split(":");
    const book = bookRaw.replaceAll("_", " ");
    return { type, book, chapter: Number(chapter), verse: Number(verse), label: `${book} ${chapter}:${verse}` };
  }
  const [chapter, verse] = raw.split(":").map(Number);
  return { type: "quran", chapter, verse, label: `Quran ${raw}` };
}

function cleanOriginalWord(word) {
  return String(word || "")
    .replace(/[.,;:!?()[\]{}"“”‘’·׃־]/g, "")
    .trim();
}

function parseLooseReference(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const quran = raw.match(/^(?:quran\s*)?(\d{1,3})[:\s](\d{1,3})$/i);
  if (quran) return { type: "quran", key: `${Number(quran[1])}:${Number(quran[2])}`, label: `Quran ${Number(quran[1])}:${Number(quran[2])}` };

  const bible = raw.match(/^((?:[1-3]\s*)?[a-zA-Z ]+?)\s+(\d{1,3})(?::(\d{1,3}))?$/);
  const hadith = raw.match(/^hadith\s+(.+?)\s+(\d{1,3})[:\s](\d{1,6})$/i);
  if (hadith) {
    const book = normalizeHadithBook(hadith[1]);
    if (book) return { type: "hadith", key: hadithKey(book.key, Number(hadith[2]), Number(hadith[3])), label: `${book.name} ${hadith[3]}` };
  }
  if (!bible) return null;
  const book = normalizeBibleBook(bible[1]);
  if (!book) return null;
  const chapter = Number(bible[2]);
  const verse = Number(bible[3] || 1);
  return { type: getBookSet(book), key: bibleKey(book, chapter, verse), label: `${book} ${chapter}:${verse}` };
}

function normalizeHadithBook(value) {
  const query = String(value || "").toLowerCase().trim();
  return state.hadithBooks.find((item) => item.key === query || item.name.toLowerCase() === query) || state.hadithBooks.find((item) => item.name.toLowerCase().includes(query));
}

function normalizeBibleBook(book) {
  const cleaned = String(book).trim().replace(/\s+/g, " ").toLowerCase();
  const all = [...OLD_TESTAMENT, ...NEW_TESTAMENT].map(([name]) => name);
  return all.find((name) => name.toLowerCase() === cleaned) || all.find((name) => name.toLowerCase().startsWith(cleaned)) || null;
}

function formatReferenceKey(key) {
  const parsed = parseReferenceKey(key);
  if (parsed.type === "quran") return `Quran ${parsed.chapter}:${parsed.verse}`;
  return parsed.label;
}

function displayKey(verse) {
  if (verse.bible_reference) return verse.bible_reference;
  return verse.verse_key;
}

function capitalize(value) {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

function getChapter(number) {
  return state.chapters.find((chapter) => chapter.id === number);
}

function resourceMatches(item, query) {
  if (!query) return true;
  return [item.name, item.author_name, item.language_name, item.slug, item.translated_name?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function sortResources(resources) {
  return [...resources].sort((a, b) => {
    const lang = String(a.language_name || "").localeCompare(String(b.language_name || ""));
    if (lang !== 0) return lang;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function normalizeSearchText(value) {
  return stripHTML(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[^\p{L}\p{N}\s:]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHTML(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSnippet(text, query) {
  const clean = stripHTML(text);
  const lower = clean.toLowerCase();
  const index = lower.indexOf(String(query).toLowerCase());
  const start = index > 40 ? index - 40 : 0;
  const snippet = clean.slice(start, start + 190);
  return `${start > 0 ? "... " : ""}${snippet}${clean.length > start + 190 ? " ..." : ""}`;
}

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.json();
}

async function getOfflineJSON(path) {
  const response = await fetch(`${OFFLINE.base}/${path}`);
  if (!response.ok) throw new Error(`Offline data missing: ${path}`);
  return response.json();
}

function shouldUseOfflineQuran(ids) {
  const selected = String(ids || "")
    .split(",")
    .map(Number)
    .filter(Boolean);
  return selected.length === 1 && selected[0] === OFFLINE.defaultTranslation;
}

async function getBundledTafsir(key) {
  if (state.selectedTafsir !== OFFLINE.defaultTafsir) throw new Error("Selected tafsir is not bundled.");
  const chapter = Number(String(key).split(":")[0]);
  const data = await getOfflineJSON(`tafsir/${OFFLINE.defaultTafsir}/chapter-${chapter}.json`);
  const tafsir = data?.[key];
  if (!tafsir) throw new Error(`Bundled tafsir missing for ${key}.`);
  return tafsir;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

function openDialog(dialog) {
  if (dialog.open) return;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
  syncModalState();
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sanitizeHTML(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attr) => {
      if (attr.name.startsWith("on") || attr.name === "style") node.removeAttribute(attr.name);
    });
  });
  return template.innerHTML;
}
