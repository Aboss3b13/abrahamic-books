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
  arabicScale: 1,
  verses: [],
  notes: {},
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
  decreaseFont: document.querySelector("#decreaseFont"),
  increaseFont: document.querySelector("#increaseFont"),
  settingsButton: document.querySelector("#settingsButton"),
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
  els.settingsButton.addEventListener("click", () => openDialog(els.translationSheet));
  els.tafsirButton.addEventListener("click", () => openDialog(els.tafsirSheet));
  els.lastReadButton.addEventListener("click", restoreLastRead);
  els.decreaseFont.addEventListener("click", () => changeArabicScale(-0.08));
  els.increaseFont.addEventListener("click", () => changeArabicScale(0.08));
  els.translationSearch.addEventListener("input", renderTranslationList);
  els.tafsirSearch.addEventListener("input", renderTafsirList);
  els.noteEditor.addEventListener("input", saveCurrentNote);
  els.deleteNote.addEventListener("click", deleteCurrentNote);
  els.notesSearch.addEventListener("input", renderNotes);
  els.exportNotes.addEventListener("click", exportNotes);
  els.importNotes.addEventListener("change", importNotes);

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
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
    const [arabicData, translationData] = await Promise.all([
      getJSON(`${API}/quran/verses/uthmani?chapter_number=${chapterNumber}&per_page=300`),
      ids
        ? getJSON(`${API}/verses/by_chapter/${chapterNumber}?language=en&words=false&translations=${ids}&per_page=300`)
        : Promise.resolve({ verses: [] }),
    ]);

    const translationsByKey = new Map((translationData.verses || []).map((verse) => [verse.verse_key, verse.translations || []]));
    state.verses = (arabicData.verses || []).map((verse) => ({
      ...verse,
      translations: translationsByKey.get(verse.verse_key) || [],
    }));

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
      <div class="arabic" lang="ar" dir="rtl">${escapeHTML(verse.text_uthmani)}</div>
      <div class="translations">${translations}</div>
      ${note ? `<div class="note-preview">${escapeHTML(note)}</div>` : ""}
    </article>
  `;
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
  openDialog(els.noteSheet);
  setTimeout(() => els.noteEditor.focus(), 80);
}

function saveCurrentNote() {
  const key = state.currentNoteKey;
  if (!key) return;
  const text = els.noteEditor.value;

  if (text.trim()) {
    state.notes[key] = { text, updatedAt: new Date().toISOString() };
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
  els.noteSheet.close();
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
    .filter(([, note]) => note.text.trim())
    .sort((a, b) => new Date(b[1].updatedAt) - new Date(a[1].updatedAt))
    .filter(([key, note]) => {
      const chapter = getChapter(Number(key.split(":")[0]));
      const haystack = `${key} ${chapter?.name_simple || ""} ${chapter?.name_arabic || ""} ${note.text}`.toLowerCase();
      return haystack.includes(query);
    });

  const total = Object.values(state.notes).filter((note) => note.text.trim()).length;
  els.notesCount.textContent = `${total} saved ${total === 1 ? "note" : "notes"}`;
  els.dashboardNotes.textContent = String(total);

  els.notesList.innerHTML = entries.length
    ? entries.map(([key, note]) => {
        const chapter = getChapter(Number(key.split(":")[0]));
        return `
          <article class="note-card">
            <button type="button" data-key="${key}">
              <strong>${escapeHTML(key)} · ${escapeHTML(chapter?.name_simple || "Surah")}</strong>
              <p>${escapeHTML(note.text)}</p>
            </button>
          </article>
        `;
      }).join("")
    : `<div class="status">No notes yet.</div>`;

  els.notesList.querySelectorAll("button[data-key]").forEach((button) => {
    button.addEventListener("click", async () => {
      const key = button.dataset.key;
      const chapterNumber = Number(key.split(":")[0]);
      switchView("readView");
      if (chapterNumber !== state.selectedChapter) await loadChapter(chapterNumber);
      scrollToKey(key);
      openNote(key);
    });
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
  target.scrollIntoView({ behavior: "smooth", block: "center" });
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
    state.arabicScale = clampNumber(Number(prefs.arabicScale) || state.arabicScale, 0.84, 1.32);
  } catch {
    savePrefs();
  }

  applyArabicScale();
}

function savePrefs() {
  localStorage.setItem(STORE.prefs, JSON.stringify({
    selectedChapter: state.selectedChapter,
    selectedTranslations: state.selectedTranslations,
    selectedTafsir: state.selectedTafsir,
    arabicScale: state.arabicScale,
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
  state.arabicScale = clampNumber(Number((state.arabicScale + delta).toFixed(2)), 0.84, 1.32);
  applyArabicScale();
  savePrefs();
}

function applyArabicScale() {
  document.documentElement.style.setProperty("--arabic-scale", state.arabicScale);
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
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
