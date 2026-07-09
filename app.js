const API = "https://api.quran.com/api/v4";
const STORE = {
  notes: "quran-reader-notes-v1",
  prefs: "quran-reader-prefs-v1",
};

const state = {
  chapters: [],
  translations: [],
  tafsirs: [],
  selectedChapter: 1,
  selectedTranslations: [85],
  selectedTafsir: 169,
  theme: "light",
  width: "comfortable",
  arabicFont: "uthmani",
  translationFont: "system",
  arabicScale: 1,
  translationScale: 1,
  lineScale: 1,
  compactCards: false,
  cardStyle: "soft",
  headerStyle: "pattern",
  customTheme: {
    paper: "#111816",
    panel: "#1c2925",
    ink: "#eef5ef",
    accent: "#7ac7ad",
  },
  verses: [],
  notes: {},
  noteTagFilter: "",
  bibleReference: "John 3:16",
  currentNoteKey: null,
};

const els = {
  chapterTitle: document.querySelector("#chapterTitle"),
  chapterMeta: document.querySelector("#chapterMeta"),
  chapterSelect: document.querySelector("#chapterSelect"),
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
  arabicSizeRange: document.querySelector("#arabicSizeRange"),
  translationSizeRange: document.querySelector("#translationSizeRange"),
  lineHeightRange: document.querySelector("#lineHeightRange"),
  cardStyleSelect: document.querySelector("#cardStyleSelect"),
  headerStyleSelect: document.querySelector("#headerStyleSelect"),
  customThemeControls: document.querySelector("#customThemeControls"),
  customPaper: document.querySelector("#customPaper"),
  customPanel: document.querySelector("#customPanel"),
  customInk: document.querySelector("#customInk"),
  customAccent: document.querySelector("#customAccent"),
  compactToggle: document.querySelector("#compactToggle"),
  wordSheet: document.querySelector("#wordSheet"),
  wordTitle: document.querySelector("#wordTitle"),
  wordSubtitle: document.querySelector("#wordSubtitle"),
  wordContent: document.querySelector("#wordContent"),
  noteTags: document.querySelector("#noteTags"),
  tagFilters: document.querySelector("#tagFilters"),
  notesVersePreview: document.querySelector("#notesVersePreview"),
  libraryCollection: document.querySelector("#libraryCollection"),
  libraryNotice: document.querySelector("#libraryNotice"),
  bibleControls: document.querySelector("#bibleControls"),
  bibleReference: document.querySelector("#bibleReference"),
  loadBibleReference: document.querySelector("#loadBibleReference"),
  libraryContent: document.querySelector("#libraryContent"),
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
  exportNotes: document.querySelector("#exportNotes"),
  importNotes: document.querySelector("#importNotes"),
};

init();

async function init() {
  loadLocalState();
  bindEvents();
  setStatus("Loading chapters, translations, and tafsir sources...");

  try {
    const [chapters, translations, tafsirs] = await Promise.all([
      getJSON(`${API}/chapters?language=en`),
      getJSON(`${API}/resources/translations`),
      getJSON(`${API}/resources/tafsirs`),
    ]);

    state.chapters = chapters.chapters || [];
    state.translations = sortResources(translations.translations || []);
    state.tafsirs = sortResources(tafsirs.tafsirs || []);

    if (!state.translations.some((item) => item.id === state.selectedTranslations[0])) {
      const english = state.translations.find((item) => item.language_name === "english");
      state.selectedTranslations = [english?.id || state.translations[0]?.id].filter(Boolean);
    }

    if (!state.tafsirs.some((item) => item.id === state.selectedTafsir)) {
      const englishTafsir = state.tafsirs.find((item) => item.language_name === "english");
      state.selectedTafsir = englishTafsir?.id || state.tafsirs[0]?.id;
    }

    renderChapterOptions();
    renderResourceLists();
    renderNotes();
    await loadChapter(state.selectedChapter);
  } catch (error) {
    setStatus(`Could not load Quran data. ${error.message}`);
  }
}

function bindEvents() {
  els.chapterSelect.addEventListener("change", () => {
    loadChapter(Number(els.chapterSelect.value));
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
  els.arabicSizeRange.addEventListener("input", () => updateReaderPref("arabicScale", Number(els.arabicSizeRange.value)));
  els.translationSizeRange.addEventListener("input", () => updateReaderPref("translationScale", Number(els.translationSizeRange.value)));
  els.lineHeightRange.addEventListener("input", () => updateReaderPref("lineScale", Number(els.lineHeightRange.value)));
  els.cardStyleSelect.addEventListener("change", () => updateReaderPref("cardStyle", els.cardStyleSelect.value));
  els.headerStyleSelect.addEventListener("change", () => updateReaderPref("headerStyle", els.headerStyleSelect.value));
  els.compactToggle.addEventListener("change", () => updateReaderPref("compactCards", els.compactToggle.checked));
  [els.customPaper, els.customPanel, els.customInk, els.customAccent].forEach((input) => {
    input.addEventListener("input", updateCustomTheme);
  });
  els.translationSearch.addEventListener("input", renderTranslationList);
  els.tafsirSearch.addEventListener("input", renderTafsirList);
  els.noteEditor.addEventListener("input", saveCurrentNote);
  els.noteTags.addEventListener("input", saveCurrentNote);
  els.deleteNote.addEventListener("click", deleteCurrentNote);
  els.notesSearch.addEventListener("input", renderNotes);
  els.exportNotes.addEventListener("click", exportNotes);
  els.importNotes.addEventListener("change", importNotes);
  els.libraryCollection.addEventListener("change", renderLibrary);
  els.loadBibleReference.addEventListener("click", loadBibleReference);
  els.bibleReference.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      loadBibleReference();
    }
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("close", syncModalState);
    dialog.addEventListener("cancel", syncModalState);
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
}

async function loadChapter(chapterNumber) {
  state.selectedChapter = chapterNumber;
  els.chapterSelect.value = String(chapterNumber);
  savePrefs();
  updateChapterHeader();
  updateDashboard();
  setStatus("Loading ayat...");
  els.verses.innerHTML = "";

  try {
    const ids = state.selectedTranslations.join(",");
    const data = await getJSON(`${API}/verses/by_chapter/${chapterNumber}?language=en&words=true&translations=${ids}&per_page=300&word_fields=text_uthmani,translation,transliteration`);
    state.verses = data.verses || [];

    renderVerses();
    updateDashboard();
    setStatus("");
  } catch (error) {
    setStatus(`Could not load this surah. ${error.message}`);
  }
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
  const note = state.notes[verse.verse_key]?.text?.trim();
  const tags = state.notes[verse.verse_key]?.tags || [];
  const translations = verse.translations.length
    ? verse.translations.map(renderTranslation).join("")
    : `<div class="translation"><p>No selected translation returned for this ayah.</p></div>`;

  return `
    <article class="ayah-card" id="ayah-${verse.verse_key.replace(":", "-")}" data-key="${verse.verse_key}">
      <div class="ayah-top">
        <div class="ayah-key">${verse.verse_key}</div>
        <div class="ayah-actions">
          <button class="mini-button ${note ? "active" : ""}" type="button" data-action="note" aria-label="Note for ${verse.verse_key}">✎</button>
          <button class="mini-button" type="button" data-action="tafsir" aria-label="Tafsir for ${verse.verse_key}">≡</button>
          <button class="mini-button" type="button" data-action="bookmark" aria-label="Save ${verse.verse_key} as last read">⌖</button>
        </div>
      </div>
      <div class="arabic" lang="ar" dir="rtl">${renderArabicWords(verse)}</div>
      <div class="translations">${translations}</div>
      ${note ? `<div class="note-preview">${escapeHTML(note)}</div>` : ""}
      ${tags.length ? `<div class="note-tags">${tags.map((tag) => `<span>#${escapeHTML(tag)}</span>`).join("")}</div>` : ""}
    </article>
  `;
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
  const chapter = getChapter(Number(key.split(":")[0]));
  state.currentNoteKey = key;
  els.noteTitle.textContent = `Note ${key}`;
  els.noteSubtitle.textContent = chapter ? chapter.name_simple : "Ayah note";
  els.noteEditor.value = state.notes[key]?.text || "";
  els.noteTags.value = (state.notes[key]?.tags || []).join(", ");
  openDialog(els.noteSheet);
  setTimeout(() => els.noteEditor.focus(), 80);
}

function saveCurrentNote() {
  const key = state.currentNoteKey;
  if (!key) return;
  const text = els.noteEditor.value;

  const tags = parseTags(els.noteTags.value);

  if (text.trim() || tags.length) {
    state.notes[key] = { text, tags, updatedAt: new Date().toISOString() };
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

async function openTafsir(key) {
  const tafsir = state.tafsirs.find((item) => item.id === state.selectedTafsir);
  els.tafsirContentTitle.textContent = `Tafsir ${key}`;
  els.tafsirContentSubtitle.textContent = tafsir ? tafsir.name : "Loading...";
  els.tafsirContent.innerHTML = "<p>Loading tafsir...</p>";
  openDialog(els.tafsirContentSheet);

  try {
    const data = await getJSON(`${API}/tafsirs/${state.selectedTafsir}/by_ayah/${key}`);
    els.tafsirContent.innerHTML = sanitizeHTML(data.tafsir?.text || "<p>No tafsir returned for this ayah.</p>");
  } catch (error) {
    els.tafsirContent.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
  }
}

function renderNotes() {
  const query = els.notesSearch.value.trim().toLowerCase();
  const entries = Object.entries(state.notes)
    .filter(([, note]) => note.text?.trim() || note.tags?.length)
    .sort((a, b) => new Date(b[1].updatedAt) - new Date(a[1].updatedAt))
    .filter(([key, note]) => {
      const chapter = getChapter(Number(key.split(":")[0]));
      const tags = note.tags || [];
      const haystack = `${key} ${chapter?.name_simple || ""} ${chapter?.name_arabic || ""} ${note.text || ""} ${tags.join(" ")}`.toLowerCase();
      const matchesSearch = haystack.includes(query);
      const matchesTag = !state.noteTagFilter || tags.includes(state.noteTagFilter);
      return matchesSearch && matchesTag;
    });

  const total = Object.values(state.notes).filter((note) => note.text?.trim() || note.tags?.length).length;
  els.notesCount.textContent = `${total} saved ${total === 1 ? "note" : "notes"}`;
  els.dashboardNotes.textContent = String(total);
  renderTagFilters();

  els.notesList.innerHTML = entries.length
    ? entries.map(([key, note]) => {
        const chapter = getChapter(Number(key.split(":")[0]));
        const tags = note.tags || [];
        return `
          <article class="note-card">
            <button type="button" data-key="${key}">
              <strong>${escapeHTML(key)} · ${escapeHTML(chapter?.name_simple || "Surah")}</strong>
              <p>${escapeHTML(note.text || "")}</p>
              ${tags.length ? `<div class="note-tags">${tags.map((tag) => `<span>#${escapeHTML(tag)}</span>`).join("")}</div>` : ""}
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

async function showNoteVersePreview(key) {
  const chapterNumber = Number(key.split(":")[0]);
  if (chapterNumber !== state.selectedChapter) await loadChapter(chapterNumber);
  const verse = state.verses.find((item) => item.verse_key === key);
  const translation = verse?.translations?.[0]?.text || "";
  els.notesVersePreview.hidden = false;
  els.notesVersePreview.innerHTML = `
    <strong>${escapeHTML(key)} · ${escapeHTML(getChapter(chapterNumber)?.name_simple || "Surah")}</strong>
    <div class="preview-arabic" lang="ar" dir="rtl">${renderArabicWords(verse || {})}</div>
    <p class="preview-translation">${sanitizeHTML(translation)}</p>
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
  const key = raw.includes(":") ? raw : `${state.selectedChapter}:${raw}`;
  const [chapter, ayah] = key.split(":").map(Number);
  if (!chapter || !ayah) return;

  if (chapter !== state.selectedChapter) {
    loadChapter(chapter).then(() => scrollToKey(key));
  } else {
    scrollToKey(key);
  }
}

function scrollToKey(key) {
  const target = document.querySelector(`#ayah-${CSS.escape(key.replace(":", "-"))}`);
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

function switchView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
  if (viewId === "notesView") renderNotes();
  if (viewId === "libraryView") renderLibrary();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function loadLocalState() {
  try {
    state.notes = JSON.parse(localStorage.getItem(STORE.notes)) || {};
  } catch {
    state.notes = {};
  }

  try {
    const prefs = JSON.parse(localStorage.getItem(STORE.prefs)) || {};
    state.selectedChapter = Number(prefs.selectedChapter) || state.selectedChapter;
    state.selectedTranslations = Array.isArray(prefs.selectedTranslations) ? prefs.selectedTranslations : state.selectedTranslations;
    state.selectedTafsir = Number(prefs.selectedTafsir) || state.selectedTafsir;
    state.theme = ["light", "dark", "sepia", "midnight", "emerald", "contrast", "custom"].includes(prefs.theme) ? prefs.theme : state.theme;
    state.width = ["comfortable", "narrow", "wide"].includes(prefs.width) ? prefs.width : state.width;
    state.arabicFont = ["uthmani", "naskh", "scheherazade", "serif"].includes(prefs.arabicFont) ? prefs.arabicFont : state.arabicFont;
    state.translationFont = ["system", "serif", "humanist", "mono"].includes(prefs.translationFont) ? prefs.translationFont : state.translationFont;
    state.arabicScale = clampNumber(Number(prefs.arabicScale) || state.arabicScale, 0.84, 1.4);
    state.translationScale = clampNumber(Number(prefs.translationScale) || state.translationScale, 0.9, 1.22);
    state.lineScale = clampNumber(Number(prefs.lineScale) || state.lineScale, 1, 1.24);
    state.compactCards = Boolean(prefs.compactCards);
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
  const chapter = getChapter(state.selectedChapter);
  if (chapter) els.dashboardSurah.textContent = chapter.name_simple;

  const activeChapter = Number(String(activeKey || "").split(":")[0]);
  const activeAyah = Number(String(activeKey || "").split(":")[1]);
  const verseCount = chapter?.verses_count || state.verses.length || 0;
  const progress = activeChapter === state.selectedChapter && activeAyah ? activeAyah : state.verses.length ? 1 : 0;
  els.dashboardProgress.textContent = `${Math.min(progress, verseCount)} / ${verseCount}`;
  els.dashboardNotes.textContent = String(Object.values(state.notes).filter((note) => note.text.trim()).length);
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
    root.style.setProperty("--paper-2", state.customTheme.paper);
    root.style.setProperty("--panel", state.customTheme.panel);
    root.style.setProperty("--ink", state.customTheme.ink);
    root.style.setProperty("--green", state.customTheme.accent);
    root.style.setProperty("--green-2", state.customTheme.accent);
  } else {
    ["--paper", "--paper-2", "--panel", "--ink", "--green", "--green-2"].forEach((name) => root.style.removeProperty(name));
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
  els.cardStyleSelect.value = state.cardStyle;
  els.headerStyleSelect.value = state.headerStyle;
  els.customPaper.value = state.customTheme.paper;
  els.customPanel.value = state.customTheme.panel;
  els.customInk.value = state.customTheme.ink;
  els.customAccent.value = state.customTheme.accent;
  els.customThemeControls.hidden = state.theme !== "custom";
  els.themeButton.textContent = state.theme === "dark" ? "Light mode" : "Dark mode";
  els.settingsSummary.textContent = `${capitalize(state.theme)} · ${capitalize(state.arabicFont)} Arabic · ${capitalize(state.translationFont)} translation`;
}

function updateCustomTheme() {
  state.customTheme = {
    paper: els.customPaper.value,
    panel: els.customPanel.value,
    ink: els.customInk.value,
    accent: els.customAccent.value,
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

function renderLibrary() {
  const collection = els.libraryCollection.value;
  els.bibleControls.hidden = collection !== "bible";
  els.libraryContent.innerHTML = "";

  if (collection === "quran") {
    els.libraryNotice.textContent = "The Quran is available in the Read tab with Arabic, translations, tafsir, notes, and word-by-word translation.";
    return;
  }

  if (collection === "bible") {
    els.libraryNotice.textContent = "Open any Bible reference. Text is loaded from the public-domain World English Bible.";
    els.bibleReference.value = state.bibleReference;
    return;
  }

  els.libraryNotice.textContent = "This collection is listed as a library category. Full text sources can be added here once a reliable public-domain source is selected.";
  els.libraryContent.innerHTML = `<p class="scripture-verse">Available next: search, references, notes, and side-by-side study once the text source is connected.</p>`;
}

async function loadBibleReference() {
  const reference = els.bibleReference.value.trim();
  if (!reference) return;
  state.bibleReference = reference;
  els.libraryNotice.textContent = "Loading Bible reference...";
  els.libraryContent.innerHTML = "";

  try {
    const data = await getJSON(`https://bible-api.com/${encodeURIComponent(reference)}`);
    els.libraryNotice.textContent = `${data.translation_name || "Bible"} · ${data.reference || reference}`;
    els.libraryContent.innerHTML = `
      <h3>${escapeHTML(data.reference || reference)}</h3>
      ${(data.verses || []).map((verse) => `<p class="scripture-verse"><strong>${escapeHTML(`${verse.book_name} ${verse.chapter}:${verse.verse}`)}</strong> ${escapeHTML(verse.text.trim())}</p>`).join("") || `<p>${escapeHTML(data.text || "No text returned.")}</p>`}
    `;
  } catch (error) {
    els.libraryNotice.textContent = `Could not load that reference. ${error.message}`;
  }
}

function syncModalState() {
  document.body.classList.toggle("modal-open", Boolean(document.querySelector("dialog[open]")));
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.json();
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
