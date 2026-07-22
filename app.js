import { Capacitor, registerPlugin } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import "@tabler/icons-webfont/dist/tabler-icons.min.css";
import { NotesSystem } from "./notes-system.js";

const API = "https://api.quran.com/api/v4";
const OFFLINE = {
  base: "./offline",
  defaultTranslation: 85,
  defaultTafsir: 169,
};
const STORE = {
  notes: "quran-reader-notes-v1",
  prefs: "quran-reader-prefs-v1",
  downloadedTranslations: "quran-downloaded-translations",
  downloadedTafsirs: "quran-downloaded-tafsirs",
  downloadedCommentaries: "bible-downloaded-commentaries",
  notesOrganizer: "abrahamic-books-notes-organizer-v1",
};
const PUBLIC_APP_URL = "https://abbas2.ali-raza.net/AbrahamicBooks/";
let notesSystem;
const NotesFiles = registerPlugin("NotesFiles");
const WidgetData = registerPlugin("WidgetData");

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

const BUNDLED_HADITH_COLLECTIONS = new Set([
  "abudawud", "bukhari", "dehlawi", "ibnmajah", "malik",
  "muslim", "nasai", "nawawi", "qudsi", "tirmidhi",
]);

const state = {
  chapters: [],
  translations: [],
  tafsirs: [],
  commentaries: [],
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
  selectedCommentary: "matthew-henry",
  theme: "sepia",
  width: "comfortable",
  arabicFont: "uthmani",
  translationFont: "system",
  arabicScale: 1,
  translationScale: 1,
  lineScale: 1,
  compactCards: false,
  showOriginalBible: true,
  showArabic: true,
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
  appLanguage: "en",
  verses: [],
  notes: {},
  sharedNotes: [],
  notesSection: "private",
  notesSort: "updated-desc",
  noteSelectMode: false,
  selectedNotes: new Set(),
  expandedNoteReferences: new Set(),
  currentNoteReferences: [],
  noteTagFilter: "",
  noteViewMode: "flat",
  selectedFolderId: "all",
  noteFolders: [],
  tagCatalog: {},
  originalWordCache: {},
  currentNoteKey: null,
  focusedVerseKey: null,
  copyVerseKey: null,
  searchIndex: null,
  searchAbort: 0,
  currentView: "readView",
  viewScrollPositions: { readView: 0, searchView: 0, notesView: 0 },
  searchResults: [],
  searchSelectMode: false,
  selectedSearchResults: new Set(),
  readSelectMode: false,
  selectedReadVerses: new Set(),
  activeSearchGroup: -1,
  selectedSearchSources: new Set(),
  savedSearchSources: null,
  workspaceTool: "notesView",
  workspaceToolScroll: { notesView: 0, searchView: 0 },
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
  verses: document.querySelector("#verses"),
  readSelectionBar: document.querySelector("#readSelectionBar"),
  readSelectionCount: document.querySelector("#readSelectionCount"),
  selectAllRead: document.querySelector("#selectAllRead"),
  clearReadSelection: document.querySelector("#clearReadSelection"),
  shareReadSelection: document.querySelector("#shareReadSelection"),
  noteReadSelection: document.querySelector("#noteReadSelection"),
  doneReadSelection: document.querySelector("#doneReadSelection"),
  focusedVerseBar: document.querySelector("#focusedVerseBar"),
  focusedVerseLabel: document.querySelector("#focusedVerseLabel"),
  continueReading: document.querySelector("#continueReading"),
  status: document.querySelector("#status"),
  translationButton: document.querySelector("#translationButton"),
  tafsirButton: document.querySelector("#tafsirButton"),
  lastReadButton: document.querySelector("#lastReadButton"),
  themeButton: document.querySelector("#themeButton"),
  decreaseFont: document.querySelector("#decreaseFont"),
  increaseFont: document.querySelector("#increaseFont"),
  settingsButton: document.querySelector("#settingsButton"),
  readerSettingsSheet: document.querySelector("#readerSettingsSheet"),
  verseCopySheet: document.querySelector("#verseCopySheet"),
  verseCopySubtitle: document.querySelector("#verseCopySubtitle"),
  verseCopyOptions: document.querySelector("#verseCopyOptions"),
  copyOriginalOnly: document.querySelector("#copyOriginalOnly"),
  copyTranslationOnly: document.querySelector("#copyTranslationOnly"),
  copySelectedVerse: document.querySelector("#copySelectedVerse"),
  shareVerseLink: document.querySelector("#shareVerseLink"),
  settingsSummary: document.querySelector("#settingsSummary"),
  accountSettingsButton: document.querySelector("#accountSettingsButton"),
  themeSelect: document.querySelector("#themeSelect"),
  widthSelect: document.querySelector("#widthSelect"),
  arabicFontSelect: document.querySelector("#arabicFontSelect"),
  translationFontSelect: document.querySelector("#translationFontSelect"),
  originalLanguageToggle: document.querySelector("#originalLanguageToggle"),
  arabicTextToggle: document.querySelector("#arabicTextToggle"),
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
  noteTagChoices: document.querySelector("#noteTagChoices"),
  noteTagCreate: document.querySelector("#noteTagCreate"),
  addNoteTag: document.querySelector("#addNoteTag"),
  noteTagDescription: document.querySelector("#noteTagDescription"),
  noteFolderSelect: document.querySelector("#noteFolderSelect"),
  createFolderFromEditor: document.querySelector("#createFolderFromEditor"),
  noteName: document.querySelector("#noteName"),
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
  commentarySheet: document.querySelector("#commentarySheet"),
  commentarySearch: document.querySelector("#commentarySearch"),
  commentaryList: document.querySelector("#commentaryList"),
  commentarySummary: document.querySelector("#commentarySummary"),
  noteSheet: document.querySelector("#noteSheet"),
  noteTitle: document.querySelector("#noteTitle"),
  noteSubtitle: document.querySelector("#noteSubtitle"),
  noteEditor: document.querySelector("#noteEditor"),
  shareNote: document.querySelector("#shareNote"),
  openReferences: document.querySelector("#openReferences"),
  deleteNote: document.querySelector("#deleteNote"),
  referenceOverviewSheet: document.querySelector("#referenceOverviewSheet"),
  referenceOverviewSubtitle: document.querySelector("#referenceOverviewSubtitle"),
  referenceOverviewContent: document.querySelector("#referenceOverviewContent"),
  tafsirContentSheet: document.querySelector("#tafsirContentSheet"),
  tafsirContentTitle: document.querySelector("#tafsirContentTitle"),
  tafsirContentSubtitle: document.querySelector("#tafsirContentSubtitle"),
  tafsirContent: document.querySelector("#tafsirContent"),
  notesView: document.querySelector("#notesView"),
  readView: document.querySelector("#readView"),
  notesCount: document.querySelector("#notesCount"),
  notesSearch: document.querySelector("#notesSearch"),
  notesSearchHelpButton: document.querySelector("#notesSearchHelpButton"),
  notesSearchHelp: document.querySelector("#notesSearchHelp"),
  notesSort: document.querySelector("#notesSort"),
  notesList: document.querySelector("#notesList"),
  sharedNotesLocked: document.querySelector("#sharedNotesLocked"),
  sharedNotesBadge: document.querySelector("#sharedNotesBadge"),
  privateNotesTab: document.querySelector("#privateNotesTab"),
  sharedNotesTab: document.querySelector("#sharedNotesTab"),
  toggleNoteSelect: document.querySelector("#toggleNoteSelect"),
  noteSelectionBar: document.querySelector("#noteSelectionBar"),
  noteSelectionCount: document.querySelector("#noteSelectionCount"),
  selectAllNotes: document.querySelector("#selectAllNotes"),
  shareSelectedNotes: document.querySelector("#shareSelectedNotes"),
  clearNoteSelection: document.querySelector("#clearNoteSelection"),
  moveSelectedNotes: document.querySelector("#moveSelectedNotes"),
  copySelectedNotes: document.querySelector("#copySelectedNotes"),
  deleteSelectedNotes: document.querySelector("#deleteSelectedNotes"),
  doneNoteSelection: document.querySelector("#doneNoteSelection"),
  sharedNotesSignIn: document.querySelector("#sharedNotesSignIn"),
  newStudyNote: document.querySelector("#newStudyNote"),
  notesFlatMode: document.querySelector("#notesFlatMode"),
  notesFolderMode: document.querySelector("#notesFolderMode"),
  createNoteFolder: document.querySelector("#createNoteFolder"),
  noteFolderBrowser: document.querySelector("#noteFolderBrowser"),
  exportNotes: document.querySelector("#exportNotes"),
  importNotes: document.querySelector("#importNotes"),
  globalSearch: document.querySelector("#globalSearch"),
  globalSearchHelpButton: document.querySelector("#globalSearchHelpButton"),
  globalSearchHelp: document.querySelector("#globalSearchHelp"),
  searchFilterButton: document.querySelector("#searchFilterButton"),
  searchFilterSummary: document.querySelector("#searchFilterSummary"),
  searchFilterSheet: document.querySelector("#searchFilterSheet"),
  sourceFilterSearch: document.querySelector("#sourceFilterSearch"),
  sourceFilterSubtitle: document.querySelector("#sourceFilterSubtitle"),
  sourceFilterList: document.querySelector("#sourceFilterList"),
  selectAllSources: document.querySelector("#selectAllSources"),
  clearAllSources: document.querySelector("#clearAllSources"),
  runSearch: document.querySelector("#runSearch"),
  searchSummary: document.querySelector("#searchSummary"),
  searchResults: document.querySelector("#searchResults"),
  searchBookIndex: document.querySelector("#searchBookIndex"),
  toggleSearchSelect: document.querySelector("#toggleSearchSelect"),
  searchSelectionBar: document.querySelector("#searchSelectionBar"),
  searchSelectionCount: document.querySelector("#searchSelectionCount"),
  selectAllSearch: document.querySelector("#selectAllSearch"),
  clearSearchSelection: document.querySelector("#clearSearchSelection"),
  noteSearchSelection: document.querySelector("#noteSearchSelection"),
  doneSearchSelection: document.querySelector("#doneSearchSelection"),
  noteTransferSheet: document.querySelector("#noteTransferSheet"),
  noteTransferTitle: document.querySelector("#noteTransferTitle"),
  noteTransferSubtitle: document.querySelector("#noteTransferSubtitle"),
  noteTransferFolders: document.querySelector("#noteTransferFolders"),
  notesSyncStatus: document.querySelector("#notesSyncStatus"),
  notesSyncIcon: document.querySelector("#notesSyncIcon"),
  notesSyncLabel: document.querySelector("#notesSyncLabel"),
  notesSyncSheet: document.querySelector("#notesSyncSheet"),
  syncAccountStatus: document.querySelector("#syncAccountStatus"),
  firebaseEmail: document.querySelector("#firebaseEmail"),
  firebasePassword: document.querySelector("#firebasePassword"),
  connectFirebase: document.querySelector("#connectFirebase"),
  createFirebaseAccount: document.querySelector("#createFirebaseAccount"),
  syncNow: document.querySelector("#syncNow"),
  disconnectFirebase: document.querySelector("#disconnectFirebase"),
  exportEncryptedBackup: document.querySelector("#exportEncryptedBackup"),
  importEncryptedBackup: document.querySelector("#importEncryptedBackup"),
  shareNoteSheet: document.querySelector("#shareNoteSheet"),
  shareSnapshot: document.querySelector("#shareSnapshot"),
  shareCollaborative: document.querySelector("#shareCollaborative"),
  collaborateSheet: document.querySelector("#collaborateSheet"),
  collaboratorEmails: document.querySelector("#collaboratorEmails"),
  createCollaborativeNote: document.querySelector("#createCollaborativeNote"),
  appLanguageSelect: document.querySelector("#appLanguageSelect"),
};

init();
registerServiceWorker();

async function init() {
  await loadLocalState();
  setupResponsiveWorkspace();
  bindEvents();
  syncStickyOffset();
  setStatus("Loading chapters, translations, and tafsir sources...");

  try {
    state.offlineManifest = await getOfflineJSON("manifest.json").catch(() => null);
    const [chapters, translations, tafsirs, commentaries, hadithEditions, hadithInfo, shiaHadithBooks] = await Promise.all([
      getOfflineJSON("quran/chapters.json").catch(() => getJSON(`${API}/chapters?language=en`)),
      getOfflineJSON("quran/translations.json").catch(() => getJSON(`${API}/resources/translations`)),
      getOfflineJSON("quran/tafsirs.json").catch(() => getJSON(`${API}/resources/tafsirs`)),
      getJSON("https://bible.helloao.org/api/available_commentaries.json").catch(() => ({ commentaries: [{ id: "matthew-henry", name: "Matthew Henry Bible Commentary", languageName: "English", numberOfBooks: 65 }] })),
      getOfflineJSON("hadith/editions.json").catch(() => getJSON("https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.min.json")).catch(() => ({})),
      getOfflineJSON("hadith/info.json").catch(() => getJSON("https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/info.min.json")).catch(() => ({})),
      getOfflineJSON("hadith/thaqalayn-books.json").catch(() => getJSON("https://www.thaqalayn-api.net/api/v2/allbooks")).catch(() => []),
    ]);

    state.chapters = chapters.chapters || [];
    state.translations = sortResources(translations.translations || []);
    state.tafsirs = sortResources(tafsirs.tafsirs || []);
    state.commentaries = commentaries.commentaries || [];
    state.hadithInfo = hadithInfo || {};
    state.hadithBooks = parseHadithBooks(hadithEditions, state.offlineManifest?.hadith?.thaqalaynSections ? shiaHadithBooks : []);
    initializeSearchSources();

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
    syncSavedLastReadToWidget();
    syncWidgetNotes();
    await openSharedLink();
    await setupAppLinks();
  } catch (error) {
    setStatus(`Could not load Quran data. ${error.message}`);
  }
}

async function setupAppLinks() {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const restoreOnResume = async () => {
    await refreshAccountLastRead();
    await waitForStableLayout();
    restoreAppPosition();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") captureAppPosition(true);
    else restoreOnResume();
  });
  window.addEventListener("pagehide", () => captureAppPosition(true));
  window.addEventListener("pageshow", restoreOnResume);
  window.addEventListener("popstate", () => openSharedLink());
  const incoming = new URL(location.href);
  const isSharedNavigation = incoming.searchParams.has("ref") || incoming.searchParams.has("refs") || incoming.searchParams.has("note") || /(?:^|[&#])(note|notes)=/.test(incoming.hash);
  if (!isSharedNavigation) await restoreOnResume();
  if (!Capacitor.isNativePlatform()) return;
  const openAppUrl = async (url) => {
    const incoming = new URL(url);
    const supportedPath = incoming.pathname.startsWith("/AbrahamicBooks") || incoming.pathname.startsWith("/quran");
    if (incoming.hostname !== "abbas2.ali-raza.net" || !supportedPath) return;
    history.replaceState(null, "", `${location.pathname}${incoming.search}${incoming.hash}`);
    await openSharedLink();
  };
  await CapacitorApp.addListener("appUrlOpen", ({ url }) => openAppUrl(url));
  await CapacitorApp.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) {
      captureAppPosition(true);
      syncSavedLastReadToWidget();
      return;
    }
    restoreOnResume();
  });
  const launch = await CapacitorApp.getLaunchUrl();
  if (launch?.url) await openAppUrl(launch.url);
}

function bindEvents() {
  bindRenderedSearchResults();
  if ("ResizeObserver" in window) new ResizeObserver(syncStickyOffset).observe(els.topbar);
  window.addEventListener("resize", syncStickyOffset, { passive: true });
  window.addEventListener("wheel", markScrollIntent, { passive: true });
  window.addEventListener("touchstart", markScrollIntent, { passive: true });
  window.addEventListener("pointerdown", markScrollIntent, { passive: true });
  els.traditionSelect.addEventListener("change", () => {
    state.focusedVerseKey = null;
    state.tradition = els.traditionSelect.value;
    state.scripture = getAllowedScriptures()[0].value;
    savePrefs();
    renderScriptureOptions();
    renderScriptureControls();
    loadCurrentScripture();
  });

  els.scriptureSelect.addEventListener("change", () => {
    state.focusedVerseKey = null;
    state.scripture = els.scriptureSelect.value;
    state.tradition = getTraditionForScripture(state.scripture);
    savePrefs();
    renderScriptureOptions();
    renderScriptureControls();
    loadCurrentScripture();
  });

  els.chapterSelect.addEventListener("change", () => {
    state.focusedVerseKey = null;
    loadChapter(Number(els.chapterSelect.value));
  });

  els.bibleBookSelect.addEventListener("change", () => {
    state.focusedVerseKey = null;
    state.selectedBibleBook = els.bibleBookSelect.value;
    state.selectedBibleChapter = 1;
    savePrefs();
    renderBibleChapterOptions();
    loadBibleChapter();
  });

  els.bibleChapterSelect.addEventListener("change", () => {
    state.focusedVerseKey = null;
    state.selectedBibleChapter = Number(els.bibleChapterSelect.value);
    savePrefs();
    loadBibleChapter();
  });

  els.hadithCollectionSelect.addEventListener("change", () => {
    state.focusedVerseKey = null;
    state.selectedHadithBook = els.hadithCollectionSelect.value;
    state.selectedHadithSection = 1;
    savePrefs();
    renderHadithSectionOptions();
    loadHadithSection();
  });

  els.hadithSectionSelect.addEventListener("change", () => {
    state.focusedVerseKey = null;
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
  els.accountSettingsButton.addEventListener("click", () => {
    els.readerSettingsSheet.close();
    openNotesSyncSettings();
  });
  els.tafsirButton.addEventListener("click", () => openDialog(state.scripture === "quran" ? els.tafsirSheet : els.commentarySheet, els.tafsirButton));
  els.commentarySearch.addEventListener("input", renderCommentaryList);
  els.lastReadButton.addEventListener("click", restoreLastRead);
  els.copyOriginalOnly.addEventListener("click", () => applyVerseCopyPreset("original"));
  els.copyTranslationOnly.addEventListener("click", () => applyVerseCopyPreset("translation"));
  els.copySelectedVerse.addEventListener("click", copySelectedVerseText);
  els.shareVerseLink.addEventListener("click", copyCurrentVerseLink);
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
  els.arabicTextToggle.addEventListener("change", () => {
    updateReaderPref("showArabic", els.arabicTextToggle.checked);
    if (state.scripture === "quran") renderVerses();
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
  els.noteName.addEventListener("input", saveCurrentNote);
  els.noteTags.addEventListener("input", saveCurrentNote);
  els.addNoteTag.addEventListener("click", createNoteTag);
  els.noteTagCreate.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      createNoteTag();
    }
  });
  els.noteFolderSelect.addEventListener("change", saveCurrentNote);
  els.createFolderFromEditor.addEventListener("click", () => createNoteFolder(true));
  els.referenceSearch.addEventListener("input", renderReferenceResults);
  els.referenceSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addReferenceFromSearch();
    }
  });
  els.deleteNote.addEventListener("click", deleteCurrentNote);
  els.shareNote.addEventListener("click", shareCurrentNote);
  els.openReferences.addEventListener("click", showReferenceOverview);
  els.continueReading.addEventListener("click", continueReadingFromFocus);
  els.newStudyNote.addEventListener("click", createStandaloneNote);
  els.notesFlatMode.addEventListener("click", () => setNotesViewMode("flat"));
  els.notesFolderMode.addEventListener("click", () => setNotesViewMode("folders"));
  els.createNoteFolder.addEventListener("click", () => createNoteFolder(false));
  els.notesSearch.addEventListener("input", renderNotes);
  els.notesSearchHelpButton.addEventListener("click", () => {
    const open = els.notesSearchHelp.hidden;
    els.notesSearchHelp.hidden = !open;
    els.notesSearchHelpButton.setAttribute("aria-expanded", String(open));
  });
  els.globalSearchHelpButton.addEventListener("click", () => {
    const open = els.globalSearchHelp.hidden;
    els.globalSearchHelp.hidden = !open;
    els.globalSearchHelpButton.setAttribute("aria-expanded", String(open));
  });
  els.notesSort.addEventListener("change", () => {
    state.notesSort = els.notesSort.value;
    renderNotes();
  });
  els.privateNotesTab.addEventListener("click", () => switchNotesSection("private"));
  els.sharedNotesTab.addEventListener("click", () => switchNotesSection("shared"));
  els.sharedNotesSignIn.addEventListener("click", openNotesSyncSettings);
  els.toggleNoteSelect.addEventListener("click", toggleNoteSelection);
  els.doneNoteSelection.addEventListener("click", () => toggleNoteSelection(false));
  els.selectAllNotes.addEventListener("click", selectAllNotes);
  els.clearNoteSelection.addEventListener("click", () => { state.selectedNotes.clear(); updateNoteSelectionUI(); });
  els.moveSelectedNotes.addEventListener("click", () => openNoteTransfer("move"));
  els.copySelectedNotes.addEventListener("click", () => openNoteTransfer("copy"));
  els.deleteSelectedNotes.addEventListener("click", deleteSelectedNotes);
  els.shareSelectedNotes.addEventListener("click", shareSelectedNotes);
  els.exportNotes.addEventListener("click", exportNotes);
  els.importNotes.addEventListener("change", importNotes);
  document.querySelectorAll('input[name="notesMode"]').forEach((input) => input.addEventListener("change", changeNotesMode));
  els.connectFirebase.addEventListener("click", () => connectFirebase(false));
  els.createFirebaseAccount.addEventListener("click", () => connectFirebase(true));
  els.syncNow.addEventListener("click", () => runNotesAction(() => notesSystem.sync({ force: true })));
  els.disconnectFirebase.addEventListener("click", () => runNotesAction(async () => {
    await notesSystem.disconnect();
    const localReference = localStorage.getItem("quran-reader-local-last-read-v1") || "";
    const localUpdatedAt = localStorage.getItem("quran-reader-local-last-read-updated-v1") || "";
    if (localReference) localStorage.setItem("quran-reader-last-read-v1", localReference);
    else localStorage.removeItem("quran-reader-last-read-v1");
    if (localUpdatedAt) localStorage.setItem("quran-reader-last-read-updated-v1", localUpdatedAt);
    else localStorage.removeItem("quran-reader-last-read-updated-v1");
    localStorage.setItem("quran-reader-last-read-owner-v1", "__local__");
    updateDashboard(localReference);
    updateSyncUI("saved locally");
  }));
  els.exportEncryptedBackup.addEventListener("click", exportEncryptedBackup);
  els.importEncryptedBackup.addEventListener("change", importEncryptedBackup);
  els.shareSnapshot.addEventListener("click", shareSnapshotNote);
  els.shareCollaborative.addEventListener("click", openCollaborativeShare);
  els.createCollaborativeNote.addEventListener("click", createCollaborativeNote);
  els.appLanguageSelect.addEventListener("change", () => setAppLanguage(els.appLanguageSelect.value));
  els.runSearch.addEventListener("click", runGlobalSearch);
  els.globalSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runGlobalSearch();
    }
  });
  let liveSearchTimer;
  els.globalSearch.addEventListener("input", () => {
    clearTimeout(liveSearchTimer);
    const query = els.globalSearch.value.trim();
    if (query.length < 2) return;
    liveSearchTimer = setTimeout(runGlobalSearch, 320);
  });
  els.searchFilterButton.addEventListener("click", () => {
    renderSearchSourceFilters();
    openDialog(els.searchFilterSheet);
  });
  els.sourceFilterSearch.addEventListener("input", renderSearchSourceFilters);
  els.selectAllSources.addEventListener("click", () => setAllSearchSources(true));
  els.clearAllSources.addEventListener("click", () => setAllSearchSources(false));
  els.searchFilterSheet.addEventListener("close", () => {
    if (els.globalSearch.value.trim().length >= 2) runGlobalSearch();
  });
  els.toggleSearchSelect.addEventListener("click", toggleSearchSelectMode);
  els.selectAllSearch.addEventListener("click", selectAllSearchResults);
  els.clearSearchSelection.addEventListener("click", clearSearchSelection);
  els.noteSearchSelection.addEventListener("click", createNoteFromSearchSelection);
  els.doneSearchSelection.addEventListener("click", () => toggleSearchSelectMode(false));
  els.selectAllRead.addEventListener("click", selectAllReadVerses);
  els.clearReadSelection.addEventListener("click", clearReadSelection);
  els.shareReadSelection.addEventListener("click", shareReadSelection);
  els.noteReadSelection.addEventListener("click", createNoteFromReadSelection);
  els.doneReadSelection.addEventListener("click", exitReadSelectMode);

  installLongPress(els.searchResults, ".search-result", (card) => {
    if (!state.searchSelectMode) state.searchSelectMode = true;
    toggleSearchResult(card.dataset.searchId, true);
  });
  installLongPress(els.verses, ".ayah-card", (card) => {
    if (!state.readSelectMode) state.readSelectMode = true;
    toggleReadVerse(card.dataset.key, true);
  });
  installLongPress(els.notesList, ".note-card", (card) => {
    if (!state.noteSelectMode) state.noteSelectMode = true;
    toggleSelectedNote(card.dataset.noteKey);
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view, true));
  });
  setupSwipeNavigation();

  window.addEventListener("scroll", handleToolbarScroll, { passive: true });
  document.querySelectorAll(".reader-controls, .view-toolbar").forEach((toolbar) => {
    toolbar.addEventListener("click", (event) => {
      const workspaceCollapsed = isLandscapeWorkspace()
        && document.body.classList.contains("workspace-tool-collapsed")
        && toolbar.closest("#workspaceLeft");
      const headerTap = event.target.closest(".filter-toolbar-heading, .notes-header") && !event.target.closest("button, input, select, textarea, a, label");
      if (!document.body.classList.contains("controls-collapsed") && !workspaceCollapsed) {
        if (headerTap && !isLandscapeWorkspace()) {
          document.body.classList.remove("controls-manually-expanded");
          setControlsCollapsed(true, true);
        }
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (workspaceCollapsed) expandWorkspaceToolbar();
      else expandActiveToolbar();
    });
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("close", syncModalState);
    dialog.addEventListener("cancel", syncModalState);
  });

  els.verses.addEventListener("click", (event) => {
    const card = event.target.closest(".ayah-card");
    if (!state.readSelectMode || !card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleReadVerse(card.dataset.key);
  });

  els.verses.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const key = button.closest(".ayah-card")?.dataset.key;
    if (!key) return;

    if (button.dataset.action === "note") openNote(key);
    if (button.dataset.action === "tafsir") openTafsir(key, button);
    if (button.dataset.action === "commentary") openBibleCommentary(key, button);
    if (button.dataset.action === "bookmark") saveLastRead(key);
    if (button.dataset.action === "copy") openVerseCopy(key);
    if (button.dataset.action === "share") shareVerseDirect(key, button);
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

function setupSwipeNavigation() {
  const views = [...document.querySelectorAll(".bottom-nav .nav-item")].map((item) => item.dataset.view);
  const main = document.querySelector("main");
  let startX = 0;
  let startY = 0;
  let startedAt = 0;
  let blocked = false;
  let axis = "";
  let transitioning = false;
  const isHorizontalScroller = (target) => {
    if (target.closest("input, textarea, select, dialog, .sheet, .bottom-nav, .search-book-index, .quick-actions, .notes-tabs, .notes-filter-row, .tag-filters, .ayah-actions, .selection-bar, .search-check")) return true;
    for (let node = target; node && node !== main; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (node.scrollWidth > node.clientWidth + 4 && ["auto", "scroll"].includes(style.overflowX)) return true;
    }
    return false;
  };
  main?.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    blocked = transitioning || isLandscapeWorkspace() || isHorizontalScroller(event.target);
    axis = "";
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    startedAt = performance.now();
  }, { passive: true });
  main?.addEventListener("touchmove", (event) => {
    if (blocked || event.touches.length !== 1 || axis === "vertical") return;
    const deltaX = event.touches[0].clientX - startX;
    const deltaY = event.touches[0].clientY - startY;
    if (!axis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 12) axis = Math.abs(deltaX) > Math.abs(deltaY) * 1.25 ? "horizontal" : "vertical";
    if (axis === "horizontal") {
      if (event.cancelable) event.preventDefault();
      const activeView = document.querySelector(`#${state.currentView}`);
      const travel = Math.max(-72, Math.min(72, deltaX * 0.34));
      activeView?.classList.add("gesture-tracking");
      if (activeView) {
        activeView.style.transform = `translate3d(${travel}px, 0, 0)`;
      }
    }
  }, { passive: false });
  main?.addEventListener("touchend", (event) => {
    const activeView = document.querySelector(`#${state.currentView}`);
    activeView?.classList.remove("gesture-tracking");
    if (activeView) {
      activeView.style.transform = "";
      activeView.style.opacity = "";
    }
    if (blocked || event.changedTouches.length !== 1 || performance.now() - startedAt > 650) return;
    const deltaX = event.changedTouches[0].clientX - startX;
    const deltaY = event.changedTouches[0].clientY - startY;
    if (axis === "vertical" || Math.abs(deltaX) < 72 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;
    const current = views.indexOf(state.currentView);
    if (current < 0) return;
    // The sections form a loop: swiping past either edge arrives at the other.
    const next = (current + (deltaX < 0 ? 1 : -1) + views.length) % views.length;
    transitioning = true;
    switchView(views[next], false, null, deltaX < 0 ? "swipe-left" : "swipe-right");
    setTimeout(() => { transitioning = false; }, 360);
  }, { passive: true });
  main?.addEventListener("touchcancel", () => {
    const activeView = document.querySelector(`#${state.currentView}`);
    activeView?.classList.remove("gesture-tracking");
    if (activeView) { activeView.style.transform = ""; activeView.style.opacity = ""; }
  }, { passive: true });
}

let toolbarScrollFrame = false;
let lastSearchSpyAt = 0;
let controlsExpandedAt = 0;
let previousToolbarScrollY = 0;
let viewSwitchingUntil = 0;
let workspaceToolbarExpandedAt = 0;
let previousWorkspaceToolbarScrollY = 0;
let suspendedAppPosition = null;
let lastStableAppPosition = null;
let appPositionFrame = 0;
let lastScrollIntentAt = 0;
let resumeRestoreToken = 0;
let controlsMotion = null;
let controlsMotionToolbar = null;

function markScrollIntent() {
  lastScrollIntentAt = performance.now();
  resumeRestoreToken += 1;
}

function captureAppPosition(protectFromSystemReset = false) {
  const workspace = document.querySelector("#workspaceLeft");
  const reader = document.querySelector("#readView");
  const nextPosition = {
    view: state.currentView,
    windowTop: window.scrollY,
    workspaceTop: workspace?.scrollTop || 0,
    readerTop: reader?.scrollTop || 0,
    controlsCollapsed: document.body.classList.contains("controls-collapsed"),
    workspaceToolCollapsed: document.body.classList.contains("workspace-tool-collapsed"),
  };
  const previous = lastStableAppPosition;
  const looksLikeSystemReset = protectFromSystemReset
    && nextPosition.view === previous?.view
    && nextPosition.windowTop < 8
    && previous.windowTop > 80
    && performance.now() - lastScrollIntentAt > 650;
  suspendedAppPosition = looksLikeSystemReset ? previous : nextPosition;
  if (!looksLikeSystemReset) lastStableAppPosition = nextPosition;
  state.viewScrollPositions[state.currentView] = suspendedAppPosition.windowTop;
  try { sessionStorage.setItem("abrahamic-app-position-v1", JSON.stringify(suspendedAppPosition)); } catch {}
  syncUrlState();
}

function getReaderAnchorKey() {
  if (state.focusedVerseKey) return state.focusedVerseKey;
  const offset = (els.topbar?.getBoundingClientRect().height || 0) + (getActiveToolbar()?.getBoundingClientRect().height || 0) + 24;
  const cards = [...els.verses.querySelectorAll(".ayah-card[data-key]")];
  const visible = cards.find((card) => card.getBoundingClientRect().bottom > offset);
  return visible?.dataset.key || cards[0]?.dataset.key || "";
}

function syncUrlState() {
  if (location.protocol === "file:" || location.hash.includes("note=") || location.hash.includes("notes=")) return;
  const url = new URL(location.href);
  url.searchParams.set("view", state.currentView);
  if (state.currentView === "readView") {
    const key = getReaderAnchorKey();
    if (key) url.searchParams.set("at", key);
  } else {
    url.searchParams.delete("at");
  }
  url.searchParams.delete("ref");
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (`${location.pathname}${location.search}${location.hash}` !== next) history.replaceState({ appNavigation: true }, "", next);
}

function rememberAppPosition() {
  if (document.visibilityState === "hidden" || appPositionFrame) return;
  appPositionFrame = requestAnimationFrame(() => {
    appPositionFrame = 0;
    captureAppPosition(true);
  });
}

function restoreAppPosition() {
  let position = suspendedAppPosition;
  if (!position) {
    try { position = JSON.parse(sessionStorage.getItem("abrahamic-app-position-v1") || "null"); } catch {}
  }
  if (!position || position.view !== state.currentView) return;
  const token = ++resumeRestoreToken;
  const apply = () => {
    if (token !== resumeRestoreToken) return;
    viewSwitchingUntil = performance.now() + 360;
    document.body.classList.toggle("controls-collapsed", Boolean(position.controlsCollapsed));
    document.body.classList.toggle("workspace-tool-collapsed", Boolean(position.workspaceToolCollapsed));
    window.scrollTo({ top: Math.max(0, Number(position.windowTop) || 0), behavior: "auto" });
    document.querySelector("#workspaceLeft")?.scrollTo({ top: Math.max(0, Number(position.workspaceTop) || 0), behavior: "auto" });
    document.querySelector("#readView")?.scrollTo({ top: Math.max(0, Number(position.readerTop) || 0), behavior: "auto" });
    previousToolbarScrollY = window.scrollY;
  };
  apply();
  // Android can resize its WebView twice while returning from the launcher.
  // Re-apply after those layout passes, unless the user has already interacted.
  setTimeout(apply, 90);
  setTimeout(apply, 280);
}

function handleToolbarScroll() {
  if (toolbarScrollFrame) return;
  toolbarScrollFrame = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    if (performance.now() < viewSwitchingUntil) {
      previousToolbarScrollY = y;
      toolbarScrollFrame = false;
      return;
    }
    const manuallyExpanded = document.body.classList.contains("controls-manually-expanded");
    const scrollingDown = y > previousToolbarScrollY + 2;

    if (y < 56) {
      // A collapsed toolbar only reopens when the user presses it. Layout
      // changes and browser scroll restoration must never reopen controls.
      document.body.classList.remove("controls-manually-expanded");
    } else if (manuallyExpanded && scrollingDown && y - controlsExpandedAt > 140) {
      document.body.classList.remove("controls-manually-expanded");
      setControlsCollapsed(true, true);
    } else if (!manuallyExpanded && scrollingDown && y > 220) {
      setControlsCollapsed(true, true);
    }

    if (state.currentView === "searchView" && performance.now() - lastSearchSpyAt >= 80) {
      updateSearchJumpActive();
      lastSearchSpyAt = performance.now();
    }
    previousToolbarScrollY = y;
    rememberAppPosition();
    toolbarScrollFrame = false;
  });
}

function expandActiveToolbar() {
  // Preserve the passage under the user's eyes while the sticky controls grow.
  // Ignore the compensating scroll briefly so it cannot re-collapse the panel.
  viewSwitchingUntil = performance.now() + 520;
  setControlsCollapsed(false, true);
  document.body.classList.add("controls-manually-expanded");
  controlsExpandedAt = window.scrollY;
  previousToolbarScrollY = window.scrollY;
}

function expandWorkspaceToolbar() {
  document.body.classList.remove("workspace-tool-collapsed");
  document.body.classList.add("workspace-tool-manually-expanded");
  const pane = document.querySelector("#workspaceLeft");
  workspaceToolbarExpandedAt = pane?.scrollTop || 0;
}

function updateWorkspaceToolbar(scrollTop) {
  const manuallyExpanded = document.body.classList.contains("workspace-tool-manually-expanded");
  const scrollingDown = scrollTop > previousWorkspaceToolbarScrollY + 2;
  if (scrollTop < 30) {
    document.body.classList.remove("workspace-tool-collapsed", "workspace-tool-manually-expanded");
  } else if (manuallyExpanded && scrollingDown && scrollTop - workspaceToolbarExpandedAt > 100) {
    document.body.classList.remove("workspace-tool-manually-expanded");
    document.body.classList.add("workspace-tool-collapsed");
  } else if (!manuallyExpanded && scrollingDown && scrollTop > 120) {
    document.body.classList.add("workspace-tool-collapsed");
  }
  previousWorkspaceToolbarScrollY = scrollTop;
}

function getActiveToolbar() {
  if (state.currentView === "readView") return document.querySelector(".reader-controls");
  return document.querySelector(`#${state.currentView} .view-toolbar`);
}

function setControlsCollapsed(collapsed, compensateScroll = true) {
  if (isLandscapeWorkspace()) {
    document.body.classList.remove("controls-collapsed", "controls-manually-expanded");
    return;
  }
  if (document.body.classList.contains("controls-collapsed") === collapsed) return;
  const toolbar = getActiveToolbar();
  const startHeight = toolbar?.getBoundingClientRect().height || 0;
  if (controlsMotion) {
    controlsMotion.cancel();
    controlsMotionToolbar?.classList.remove("toolbar-in-motion");
    controlsMotion = null;
    controlsMotionToolbar = null;
  }
  document.body.classList.toggle("controls-collapsed", collapsed);
  const endHeight = toolbar?.getBoundingClientRect().height || startHeight;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!toolbar || reduceMotion || Math.abs(endHeight - startHeight) < 1) {
    captureAppPosition(true);
    return;
  }

  // Animate only the toolbar's layout. Continuously calling scrollBy while a
  // sticky element changes height makes mobile WebViews feed synthetic scroll
  // events back into this handler, which causes the visible vibration.
  toolbar.classList.add("toolbar-in-motion");
  controlsMotionToolbar = toolbar;
  controlsMotion = toolbar.animate(
    [
      { height: `${startHeight}px`, opacity: collapsed ? 1 : .86 },
      { height: `${endHeight}px`, opacity: 1 },
    ],
    { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" },
  );
  viewSwitchingUntil = performance.now() + 500;
  controlsMotion.addEventListener("finish", () => {
    toolbar.classList.remove("toolbar-in-motion");
    controlsMotion = null;
    controlsMotionToolbar = null;
    previousToolbarScrollY = window.scrollY;
    captureAppPosition(true);
  }, { once: true });
}

function getToolbarViewportAnchor(toolbar) {
  if (!toolbar || window.scrollY < 80) return null;
  const cutoff = toolbar.getBoundingClientRect().bottom + 8;
  const activeView = document.querySelector(`#${state.currentView}`);
  const candidates = [...(activeView?.querySelectorAll(".ayah-card, .search-result, .note-card") || [])];
  const element = candidates.find((item) => item.getBoundingClientRect().bottom > cutoff);
  return element ? { element, top: element.getBoundingClientRect().top } : null;
}

function stabilizeToolbarAnchor(anchor) {
  if (!anchor?.element?.isConnected) return;
  const keep = () => {
    if (!anchor.element.isConnected) return;
    const delta = anchor.element.getBoundingClientRect().top - anchor.top;
    if (Math.abs(delta) > .25) window.scrollBy({ top: delta, behavior: "auto" });
    captureAppPosition(true);
  };
  requestAnimationFrame(keep);
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
  els.tafsirButton.hidden = isHadith;
  els.tafsirButton.innerHTML = isBible ? `<span aria-hidden="true">☷</span><strong>Commentaries</strong><small>Bible study sources</small>` : `<span aria-hidden="true">☷</span><strong>Tafsir</strong><small>Commentary sources</small>`;
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
}

async function loadHadithSection() {
  const book = state.selectedHadithBook;
  const section = state.selectedHadithSection;
  const info = state.hadithBooks.find((item) => item.key === book);
  savePrefs();
  els.chapterTitle.textContent = info?.name || "Hadith";
  els.chapterMeta.textContent = `Hadith · ${info?.tradition || "Available public collections"} · Section ${section}`;
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
}

function renderVerses() {
  const visibleVerses = state.focusedVerseKey
    ? state.verses.filter((verse) => verse.verse_key === state.focusedVerseKey)
    : state.verses;
  els.verses.innerHTML = visibleVerses.map(renderVerse).join("");
  updateReadSelectionUI();
  els.focusedVerseBar.hidden = !state.focusedVerseKey;
  if (state.focusedVerseKey) els.focusedVerseLabel.textContent = formatReferenceKey(state.focusedVerseKey);
  if (!visibleVerses.length) {
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
    <article class="ayah-card ${state.selectedReadVerses.has(verse.verse_key) ? "selected" : ""}" id="ayah-${verse.verse_key.replaceAll(":", "-")}" data-key="${verse.verse_key}">
      <span class="verse-selection-check" aria-hidden="true">✓</span>
      <div class="ayah-top">
        <div class="ayah-key">${escapeHTML(displayKey(verse))}</div>
        <div class="ayah-actions">
          <button class="mini-button ${note ? "active" : ""}" type="button" data-action="note" aria-label="Note for ${verse.verse_key}">✎</button>
          <button class="mini-button" type="button" data-action="copy" aria-label="Copy ${escapeHTML(displayKey(verse))}" title="Copy verse"><i class="ti ti-copy" aria-hidden="true"></i></button>
          <button class="mini-button share-mini-button" type="button" data-action="share" aria-label="Share ${escapeHTML(displayKey(verse))}" title="Share verse">${shareIcon()}</button>
          ${isQuran ? `<button class="mini-button" type="button" data-action="tafsir" aria-label="Tafsir for ${verse.verse_key}">≡</button>` : !isHadith ? `<button class="mini-button" type="button" data-action="commentary" aria-label="Commentary for ${escapeHTML(displayKey(verse))}">≡</button>` : ""}
          <button class="mini-button last-read-marker ${isLastRead(verse.verse_key) ? "active" : ""}" type="button" data-action="bookmark" aria-label="Mark ${escapeHTML(displayKey(verse))} as last read" title="Mark as last read"><i class="ti ti-bookmark${isLastRead(verse.verse_key) ? "-filled" : ""}" aria-hidden="true"></i><span>Last read</span></button>
        </div>
      </div>
      ${isQuran ? `${state.showArabic ? `<div class="arabic" lang="ar" dir="rtl">${renderArabicWords(verse)}</div>` : ""}<div class="translations">${translations}</div>` : `${state.showOriginalBible && verse.originalText ? `<div class="original-scripture" dir="${verse.scripture === "old" || isHadith ? "rtl" : "ltr"}">${isHadith ? escapeHTML(verse.originalText) : renderOriginalWords(verse)}</div>` : ""}<div class="scripture-text">${escapeHTML(verse.text || "")}</div>`}
      <div class="verse-meta">${renderVerseMeta(verse)}</div>
      ${note ? `<div class="note-preview">${escapeHTML(note)}</div>` : ""}
      ${tags.length ? `<div class="note-tags">${tags.map((tag) => `<span>#${escapeHTML(tag)}</span>`).join("")}</div>` : ""}
    </article>
  `;
}

function shareIcon() {
  return `<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a3 3 0 1 0-2.83-4A3 3 0 0 0 15 5c0 .2.02.39.06.57L8.91 9.08A3 3 0 1 0 9 13.1l6.09 3.48A3 3 0 0 0 15 17a3 3 0 1 0 .91-2.15L9.86 11.4c.09-.28.14-.58.14-.9 0-.3-.04-.58-.12-.85l6.1-3.49A3 3 0 0 0 18 8Z"/></svg>`;
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
  renderCommentaryList();
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
      <button class="resource-download" type="button" data-download-id="${item.id}" aria-label="Download ${escapeHTML(item.name)}"><i class="ti ti-download" aria-hidden="true"></i></button>
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
  els.translationList.querySelectorAll("[data-download-id]").forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault(); event.stopPropagation(); downloadTranslation(Number(button.dataset.downloadId), button);
  }));
}

async function downloadTranslation(id, button) {
  if (!("caches" in window)) { setStatus("Downloads are not supported in this browser."); return; }
  const cache = await caches.open("abrahamic-quran-resources-v1");
  button.disabled = true;
  try {
    for (let chapter = 1; chapter <= 114; chapter += 1) {
      button.textContent = `${chapter}%`;
      const url = `${API}/verses/by_chapter/${chapter}?language=en&words=true&translations=${id}&per_page=300&word_fields=text_uthmani,translation,transliteration`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download stopped at surah ${chapter}.`);
      await cache.put(url, response);
    }
    rememberDownloaded(STORE.downloadedTranslations, id);
    refreshSearchSources();
    button.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i>'; setStatus("Translation downloaded — it is now available in Search.");
  } catch (error) { button.innerHTML = '<i class="ti ti-download" aria-hidden="true"></i>'; setStatus(error.message); }
  finally { button.disabled = false; }
}

async function downloadTafsir(id, button) {
  if (!("caches" in window)) return setStatus("Offline downloads are not supported here.");
  const cache = await caches.open("abrahamic-quran-resources-v1"); button.disabled = true;
  try {
    for (let chapter = 1; chapter <= 114; chapter += 1) {
      button.textContent = `${chapter}%`; const rows = [];
      for (let page = 1; ; page += 1) {
        const data = await getJSON(`${API}/tafsirs/${id}/by_chapter/${chapter}?per_page=50&page=${page}`);
        rows.push(...(data.tafsirs || [])); if (!data.pagination?.next_page) break;
      }
      await cache.put(new Request(`${location.origin}${location.pathname}offline-downloads/tafsir/${id}/${chapter}.json`), new Response(JSON.stringify({ tafsirs: rows }), { headers: { "content-type": "application/json" } }));
    }
    rememberDownloaded(STORE.downloadedTafsirs, id);
    refreshSearchSources();
    button.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i>'; setStatus("Tafsir downloaded — it is now available in Search.");
  } catch (error) { button.innerHTML = '<i class="ti ti-download" aria-hidden="true"></i>'; setStatus(`Tafsir download failed: ${error.message}`); }
  finally { button.disabled = false; }
}

async function downloadCommentary(id, button) {
  if (!("caches" in window)) return setStatus("Offline downloads are not supported here.");
  const cache = await caches.open("abrahamic-bible-commentaries-v1"); button.disabled = true;
  try {
    const catalog = await getJSON(`https://bible.helloao.org/api/c/${id}/books.json`);
    let completed = 0; const total = catalog.books.reduce((sum, book) => sum + (book.numberOfChapters || 0), 0);
    for (const book of catalog.books) for (let chapter = book.firstChapterNumber || 1; chapter <= (book.lastChapterNumber || 0); chapter += 1) {
      const url = `https://bible.helloao.org/api/c/${id}/${book.id}/${chapter}.json`;
      await cache.put(url, await fetch(url)); completed += 1; button.textContent = `${Math.round(completed / total * 100)}%`;
    }
    rememberDownloaded(STORE.downloadedCommentaries, id);
    refreshSearchSources();
    button.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i>'; setStatus("Commentary downloaded — it is now available in Search.");
  } catch (error) { button.innerHTML = '<i class="ti ti-download" aria-hidden="true"></i>'; setStatus(`Commentary download failed: ${error.message}`); }
  finally { button.disabled = false; }
}

function renderTafsirList() {
  const query = els.tafsirSearch.value.trim().toLowerCase();
  const filtered = state.tafsirs.filter((item) => resourceMatches(item, query));

  els.tafsirList.innerHTML = filtered.map((item) => `<div class="resource-row ${item.id === state.selectedTafsir ? "active" : ""}"><button class="resource-choice" type="button" data-id="${item.id}"><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.language_name)} · ${escapeHTML(item.author_name || "Unknown author")}</span></button><button class="resource-download" type="button" data-tafsir-download="${item.id}" aria-label="Download ${escapeHTML(item.name)}"><i class="ti ti-download" aria-hidden="true"></i></button></div>`).join("");

  els.tafsirList.querySelectorAll("button[data-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTafsir = Number(button.dataset.id);
      savePrefs();
      updateTafsirSummary();
      renderTafsirList();
    });
  });
  els.tafsirList.querySelectorAll("[data-tafsir-download]").forEach((button) => button.addEventListener("click", () => downloadTafsir(Number(button.dataset.tafsirDownload), button)));
}

function renderCommentaryList() {
  const query = els.commentarySearch.value.trim().toLowerCase();
  const items = state.commentaries.filter((item) => `${item.name} ${item.languageName || ""}`.toLowerCase().includes(query));
  els.commentaryList.innerHTML = items.map((item) => `<div class="resource-row ${item.id === state.selectedCommentary ? "active" : ""}"><button class="resource-choice" type="button" data-commentary-id="${escapeHTML(item.id)}"><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.languageName || "English")} · ${item.numberOfBooks || 0} books${item.id === "matthew-henry" ? " · Included" : ""}</span></button><button class="resource-download" type="button" data-commentary-download="${escapeHTML(item.id)}" aria-label="Download ${escapeHTML(item.name)}"><i class="ti ti-download" aria-hidden="true"></i></button></div>`).join("");
  els.commentaryList.querySelectorAll("[data-commentary-id]").forEach((button) => button.addEventListener("click", () => { state.selectedCommentary = button.dataset.commentaryId; savePrefs(); renderCommentaryList(); updateCommentarySummary(); }));
  els.commentaryList.querySelectorAll("[data-commentary-download]").forEach((button) => button.addEventListener("click", () => downloadCommentary(button.dataset.commentaryDownload, button)));
}

function updateCommentarySummary() { const item = state.commentaries.find((entry) => entry.id === state.selectedCommentary); els.commentarySummary.textContent = item ? `${item.name} · ${item.languageName || "English"}` : "Choose a commentary"; }

function updateTranslationSummary() {
  const names = state.selectedTranslations
    .map((id) => state.translations.find((item) => item.id === id)?.name)
    .filter(Boolean);
  els.translationSummary.textContent = names.length ? names.join(", ") : "Arabic only";
  els.translationButton.querySelector("strong").textContent = "Translations";
  els.translationButton.querySelector("small").textContent = names.length ? `${names.length} selected` : "Arabic only";
}

function updateTafsirSummary() {
  const tafsir = state.tafsirs.find((item) => item.id === state.selectedTafsir);
  els.tafsirSummary.textContent = tafsir ? `${tafsir.name} · ${tafsir.language_name}` : "Select a tafsir source";
}

function openNote(key) {
  const sharedId = key.startsWith("shared:") ? key.slice(7) : "";
  const sharedNote = sharedId ? state.sharedNotes.find((note) => note.id === sharedId) : null;
  const parsed = parseReferenceKey(key);
  const chapter = parsed.type === "quran" ? getChapter(Number(key.split(":")[0])) : null;
  const existing = sharedNote || state.notes[key] || {};
  const references = Array.isArray(existing.references) ? [...existing.references] : [];
  if (parsed.type !== "note" && !references.includes(key)) references.unshift(key);
  state.currentNoteKey = key;
  state.currentNoteReferences = references;
  els.noteTitle.textContent = existing.title?.trim() || "Edit note";
  els.noteSubtitle.textContent = sharedNote ? `Shared by ${sharedNote.ownerEmail || "a collaborator"} · live editing` : parsed.type === "note" ? "All fields can be changed" : `${chapter?.name_simple || parsed.label || "Verse"} · reference saved below`;
  els.noteName.value = existing.title || "";
  els.noteEditor.value = existing.text || "";
  els.noteTags.value = (existing.tags || []).join(", ");
  els.noteTagCreate.value = "";
  els.noteTagDescription.value = "";
  renderNoteFolderOptions(existing.folderId || "");
  renderNoteTagPicker();
  els.referenceSearch.value = "";
  renderNoteReferences();
  renderReferenceResults();
  if (parsed.type !== "note" && !existing.references?.includes(key)) saveCurrentNote();
  openDialog(els.noteSheet);
  setTimeout(() => els.noteName.focus(), 80);
}

function createStandaloneNote() {
  const key = `note:${crypto.randomUUID()}`;
  const folderId = state.noteViewMode === "folders" && state.selectedFolderId !== "all" ? state.selectedFolderId : "";
  state.notes[key] = { title: "", text: "", tags: [], references: [], folderId, updatedAt: new Date().toISOString(), standalone: true };
  saveNotes();
  renderNotes();
  openNote(key);
}

function saveCurrentNote() {
  const key = state.currentNoteKey;
  if (!key) return;
  const text = els.noteEditor.value;
  const title = els.noteName.value;
  els.noteTitle.textContent = title.trim() || "Edit note";
  const tags = parseTags(els.noteTags.value);
  const folderId = els.noteFolderSelect.value || "";

  if (key.startsWith("shared:")) {
    const id = key.slice(7);
    const shared = state.sharedNotes.find((note) => note.id === id);
    if (!shared) return;
    Object.assign(shared, { title, text, tags, folderId, references: state.currentNoteReferences, updatedAt: new Date().toISOString() });
    clearTimeout(saveCurrentNote.sharedTimer);
    saveCurrentNote.sharedTimer = setTimeout(() => notesSystem.updateSharedNote(id, { title, text, tags, folderId, references: state.currentNoteReferences }).catch((error) => setStatus(error.message)), 450);
    renderNotes();
    return;
  }

  if (title.trim() || text.trim() || tags.length || state.currentNoteReferences.length || key.startsWith("note:")) {
    state.notes[key] = { ...(state.notes[key] || {}), title, text, tags, folderId, references: state.currentNoteReferences, updatedAt: new Date().toISOString(), standalone: key.startsWith("note:") };
  } else {
    delete state.notes[key];
  }

  saveNotes();
  refreshVerse(key);
  renderNotes();
}

async function deleteCurrentNote() {
  if (!state.currentNoteKey) return;
  const deletedKey = state.currentNoteKey;
  if (deletedKey.startsWith("shared:")) {
    await notesSystem?.deleteSharedNote(deletedKey.slice(7));
    state.currentNoteKey = null;
    els.noteSheet.close();
    return;
  }
  await notesSystem?.remove(deletedKey);
  delete state.notes[deletedKey];
  refreshVerse(deletedKey);
  renderNotes();
  els.noteEditor.value = "";
  els.noteName.value = "";
  els.noteTags.value = "";
  els.noteTagCreate.value = "";
  renderNoteTagPicker();
  els.referenceSearch.value = "";
  state.currentNoteReferences = [];
  state.currentNoteKey = null;
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

  const lookupWord = normalizeBiblicalWord(word, lang);
  const cacheKey = `${lang}:${lookupWord}`;
  if (!state.originalWordCache[cacheKey]) {
    try {
      const lexical = await getWiktionaryGloss(lookupWord, lang).catch(() => "");
      const data = lexical ? null : await getJSON(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(lookupWord)}&langpair=${lang}%7Cen`);
      state.originalWordCache[cacheKey] = lexical || data?.responseData?.translatedText || "";
    } catch {
      state.originalWordCache[cacheKey] = "";
    }
  }

  const translation = state.originalWordCache[cacheKey];
  els.wordContent.innerHTML = `
    <div class="word-arabic" dir="${lang === "he" ? "rtl" : "ltr"}">${escapeHTML(word)}</div>
    <div class="word-translation"><strong>${escapeHTML(translation || "No direct word translation found")}</strong></div>
    <div>${escapeHTML(label)} dictionary lookup${lookupWord !== word ? ` · normalized as ${escapeHTML(lookupWord)}` : ""}.</div>
  `;
}

function normalizeBiblicalWord(word, lang) {
  const cleaned = cleanOriginalWord(word).normalize("NFC");
  if (lang === "he") return cleaned.replace(/[\u0591-\u05AF\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, "");
  return cleaned;
}

async function getWiktionaryGloss(word, lang) {
  const response = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error("No dictionary entry");
  const data = await response.json();
  const wanted = lang === "he" ? /hebrew/i : /(?:ancient )?greek/i;
  const entries = Object.values(data).flat().filter((entry) => wanted.test(entry.language || ""));
  const definitions = entries.flatMap((entry) => entry.definitions || []).map((item) => stripHTML(item.definition || "")).filter(Boolean);
  return definitions.slice(0, 3).join("; ");
}

async function openTafsir(key, sourceButton = null) {
  const tafsir = state.tafsirs.find((item) => item.id === state.selectedTafsir);
  els.tafsirContentTitle.textContent = `Tafsir ${key}`;
  els.tafsirContentSubtitle.textContent = tafsir ? tafsir.name : "Loading...";
  els.tafsirContent.innerHTML = "<p>Loading tafsir...</p>";
  openDialog(els.tafsirContentSheet, sourceButton, "study");

  try {
    const data = await getDownloadedTafsir(key).catch(() => getBundledTafsir(key)).catch(() => getJSON(`${API}/tafsirs/${state.selectedTafsir}/by_ayah/${key}`));
    revealStudyContent(sanitizeHTML(data.tafsir?.text || "<p>No tafsir returned for this ayah.</p>"));
  } catch (error) {
    revealStudyContent(`<p>${escapeHTML(error.message)}</p>`);
  }
}

async function getDownloadedTafsir(key) {
  const chapter = Number(key.split(":")[0]);
  const response = await caches.match(`${location.origin}${location.pathname}offline-downloads/tafsir/${state.selectedTafsir}/${chapter}.json`);
  if (!response) throw new Error("Not downloaded");
  const data = await response.json(); const row = data.tafsirs?.find((item) => item.verse_key === key);
  if (!row) throw new Error("No downloaded entry"); return { tafsir: row };
}

async function openBibleCommentary(key, sourceButton = null) {
  const parsed = parseReferenceKey(key); const bookId = BOOK_IDS[parsed.book];
  const commentary = state.commentaries.find((item) => item.id === state.selectedCommentary);
  els.tafsirContentTitle.textContent = `${parsed.label} commentary`;
  els.tafsirContentSubtitle.textContent = commentary?.name || state.selectedCommentary;
  els.tafsirContent.innerHTML = "<p>Loading commentary...</p>"; openDialog(els.tafsirContentSheet, sourceButton, "study");
  try {
    const url = `https://bible.helloao.org/api/c/${state.selectedCommentary}/${bookId}/${parsed.chapter}.json`;
    const data = state.selectedCommentary === "matthew-henry" ? await getOfflineJSON(`commentary/matthew-henry/${bookId}-${parsed.chapter}.json`).catch(() => getJSON(url)) : await getJSON(url);
    const entry = data.chapter?.content?.find((item) => item.type === "verse" && Number(item.number) === parsed.verse);
    const paragraphs = Array.isArray(entry?.content) ? entry.content : [];
    revealStudyContent(paragraphs.length ? paragraphs.map((text) => `<p>${escapeHTML(text)}</p>`).join("") : "<p>No commentary entry is available for this verse.</p>");
  } catch (error) { revealStudyContent(`<p>${escapeHTML(error.message)}</p>`); }
}

function revealStudyContent(html) {
  els.tafsirContent.innerHTML = html;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    els.tafsirContent.animate(
      [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" },
    );
  }
}

function renderNotes({ animate = true } = {}) {
  const query = els.notesSearch.value.trim();
  const searchExpression = parseSearchExpression(query);
  renderNoteFolderBrowser();
  const sourceEntries = state.notesSection === "shared"
    ? state.sharedNotes.map((note) => [`shared:${note.id}`, note])
    : Object.entries(state.notes);
  const entries = sourceEntries
    .filter(([, note]) => note.title?.trim() || note.text?.trim() || note.tags?.length || note.references?.length || note.standalone)
    .sort((a, b) => compareNotes(a[1], b[1], state.notesSort))
    .filter(([key, note]) => {
      const tags = note.tags || [];
      const folderName = state.noteFolders.find((folder) => folder.id === note.folderId)?.name || "";
      const tagDescriptions = tags.map((tag) => state.tagCatalog[tag]?.description || "").join(" ");
      const haystack = `${key} ${note.title || ""} ${formatReferenceKey(key)} ${note.text || ""} ${(note.references || []).map(formatReferenceKey).join(" ")} ${tags.join(" ")} ${tagDescriptions} ${folderName}`;
      const matchesSearch = !query || searchExpression.matches(normalizeSearchText(haystack));
      const matchesTag = !state.noteTagFilter || tags.includes(state.noteTagFilter);
      const matchesFolder = state.noteViewMode !== "folders" || (note.folderId || "") === (state.selectedFolderId === "all" ? "" : state.selectedFolderId);
      return matchesSearch && matchesTag && matchesFolder;
    });

  const privateTotal = Object.values(state.notes).filter((note) => note.title?.trim() || note.text?.trim() || note.tags?.length || note.references?.length || note.standalone).length;
  const total = state.notesSection === "shared" ? state.sharedNotes.length : privateTotal;
  els.notesCount.textContent = state.notesSection === "shared" ? `${total} shared ${total === 1 ? "note" : "notes"}` : `${total} saved ${total === 1 ? "note" : "notes"}`;
  els.sharedNotesBadge.textContent = String(state.sharedNotes.length);
  const locked = state.notesSection === "shared" && !notesSystem?.signedIn;
  els.sharedNotesLocked.hidden = !locked;
  els.notesList.hidden = locked;
  renderTagFilters();

  els.notesList.classList.toggle("notes-simple-list", state.noteViewMode === "flat");
  els.notesList.classList.toggle("selecting", state.noteSelectMode);
  els.notesList.classList.toggle("notes-sync-update", !animate);
  els.notesList.innerHTML = entries.length
    ? entries.map(([key, note]) => {
        const tags = note.tags || [];
        const refs = note.references || [];
        const referencesExpanded = state.expandedNoteReferences.has(key);
        const visibleRefs = referencesExpanded ? refs : refs.slice(0, 4);
        const updatedLabel = formatNoteDate(note.updatedAt);
        const folderName = state.noteFolders.find((folder) => folder.id === note.folderId)?.name || "";
        const visibility = state.notesSection === "shared" ? "Shared" : "Private";
        return `
          <article class="note-card ${state.selectedNotes.has(key) ? "selected" : ""} ${referencesExpanded ? "references-expanded" : ""}" data-note-key="${escapeHTML(key)}" style="--note-order:${Math.min(8, entries.findIndex(([entryKey]) => entryKey === key))}">
            ${state.noteSelectMode ? `<label class="note-select"><input type="checkbox" data-select-key="${escapeHTML(key)}" ${state.selectedNotes.has(key) ? "checked" : ""}><span aria-hidden="true"></span></label>` : ""}
            <button class="note-card-main" type="button" data-key="${escapeHTML(key)}">
              <span class="note-card-heading"><span class="note-card-title"><span class="note-card-icon"><i class="ti ti-notes" aria-hidden="true"></i></span><strong>${escapeHTML(note.title?.trim() || "Untitled note")}</strong></span><time>${escapeHTML(updatedLabel)}</time></span>
              ${folderName ? `<span class="note-folder-label"><i class="ti ti-folder" aria-hidden="true"></i>${escapeHTML(folderName)}</span>` : ""}
              <p>${escapeHTML(note.text || "No text added yet.")}</p>
              ${tags.length ? `<div class="note-tags">${tags.map((tag) => `<span>#${escapeHTML(tag)}</span>`).join("")}</div>` : ""}
            </button>
            <div class="note-card-footer">
              <div class="note-card-references">${visibleRefs.map((ref) => `<button class="reference-link" type="button" data-ref="${escapeHTML(ref)}"><i class="ti ti-book-2" aria-hidden="true"></i><span>${escapeHTML(formatReferenceKey(ref))}</span><i class="ti ti-chevron-right reference-link-arrow" aria-hidden="true"></i></button>`).join("")}${refs.length > 4 ? `<button class="reference-expand-button" type="button" data-expand-references="${escapeHTML(key)}" aria-expanded="${referencesExpanded}"><i class="ti ti-${referencesExpanded ? "chevron-up" : "chevron-down"}" aria-hidden="true"></i><span>${referencesExpanded ? "Show fewer" : `Show all ${refs.length}`}</span></button>` : ""}</div>
              <span class="note-visibility"><i class="ti ti-${state.notesSection === "shared" ? "users" : "lock"}" aria-hidden="true"></i>${visibility}</span>
            </div>
          </article>
        `;
      }).join("")
    : `<div class="notes-empty"><i class="ti ti-notebook" aria-hidden="true"></i><h3>${query || state.noteTagFilter ? "No matching notes" : state.noteViewMode === "folders" ? "This folder is empty" : "Your notes start here"}</h3><p>${query || state.noteTagFilter ? "Try another search or filter." : state.noteViewMode === "folders" ? "Create a note here or open another folder." : "Capture a reflection, verse, or study thought and keep it close."}</p>${query || state.noteTagFilter ? "" : '<button class="text-button primary" type="button" data-empty-new><i class="ti ti-file-plus" aria-hidden="true"></i>Create a note</button>'}</div>`;

  els.notesList.querySelectorAll("button[data-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.key;
      if (state.noteSelectMode) { toggleSelectedNote(key); return; }
      openNote(key);
    });
  });
  els.notesList.querySelectorAll("button[data-ref]").forEach((button) => {
    button.addEventListener("click", () => navigateToReference(button.dataset.ref));
  });
  els.notesList.querySelectorAll("[data-expand-references]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.expandReferences;
      if (state.expandedNoteReferences.has(key)) state.expandedNoteReferences.delete(key);
      else state.expandedNoteReferences.add(key);
      renderNotes();
    });
  });
  els.notesList.querySelectorAll("input[data-select-key]").forEach((input) => input.addEventListener("change", () => toggleSelectedNote(input.dataset.selectKey)));
  els.notesList.querySelector("[data-empty-new]")?.addEventListener("click", createStandaloneNote);
  updateNoteSelectionUI();
  if (!animate) requestAnimationFrame(() => requestAnimationFrame(() => els.notesList.classList.remove("notes-sync-update")));
}

function renderNoteFolderBrowser() {
  const folderMode = state.noteViewMode === "folders";
  els.notesFlatMode.classList.toggle("active", !folderMode);
  els.notesFolderMode.classList.toggle("active", folderMode);
  els.notesFlatMode.setAttribute("aria-pressed", String(!folderMode));
  els.notesFolderMode.setAttribute("aria-pressed", String(folderMode));
  els.noteFolderBrowser.hidden = !folderMode;
  if (!folderMode) return;
  const folderNotes = state.notesSection === "shared" ? state.sharedNotes : Object.values(state.notes);
  const currentId = state.selectedFolderId === "all" ? "" : state.selectedFolderId;
  const children = state.noteFolders
    .filter((folder) => (folder.parentId || "") === currentId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const currentNotes = folderNotes.filter((note) => (note.folderId || "") === currentId).length;
  const path = getFolderPath(currentId);
  const itemCount = currentNotes + children.length;
  els.noteFolderBrowser.innerHTML = `
    <div class="note-folder-browser-heading">
      <div class="note-folder-navigation" aria-hidden="true"><i class="ti ti-arrow-left"></i><i class="ti ti-arrow-up"></i></div>
      <nav class="note-folder-path" aria-label="Current folder"><button type="button" data-folder-crumb=""><i class="ti ti-device-desktop" aria-hidden="true"></i><span>Notes</span></button>${path.map((folder) => `<i class="ti ti-chevron-right" aria-hidden="true"></i><button type="button" data-folder-crumb="${escapeHTML(folder.id)}"><span>${escapeHTML(folder.name)}</span></button>`).join("")}</nav>
      <small>${itemCount} ${itemCount === 1 ? "item" : "items"}</small>
    </div>
    <div class="note-folder-grid">
      ${children.map((folder) => {
        const noteCount = folderNotes.filter((note) => (note.folderId || "") === folder.id).length;
        const folderCount = state.noteFolders.filter((candidate) => (candidate.parentId || "") === folder.id).length;
        const contents = noteCount + folderCount;
        return `<div class="note-folder-tile">
          <button class="note-folder-open" type="button" data-folder-id="${escapeHTML(folder.id)}" title="Open ${escapeHTML(folder.name)}"><i class="ti ti-folder-filled" aria-hidden="true"></i><span><strong>${escapeHTML(folder.name)}</strong><small>${contents} ${contents === 1 ? "item" : "items"}</small></span></button>
          <div class="note-folder-actions" aria-label="Actions for ${escapeHTML(folder.name)}">
            <button type="button" data-rename-folder="${escapeHTML(folder.id)}" aria-label="Rename ${escapeHTML(folder.name)}" title="Rename"><i class="ti ti-pencil" aria-hidden="true"></i></button>
            <button type="button" data-delete-folder="${escapeHTML(folder.id)}" aria-label="Delete ${escapeHTML(folder.name)}" title="Delete"><i class="ti ti-trash" aria-hidden="true"></i></button>
          </div>
        </div>`;
      }).join("") || `<p class="note-folder-empty"><i class="ti ti-folder-open" aria-hidden="true"></i>No folders here</p>`}
    </div>`;
  els.noteFolderBrowser.querySelectorAll("[data-folder-crumb]").forEach((button) => button.addEventListener("click", () => openNoteFolder(button.dataset.folderCrumb)));
  els.noteFolderBrowser.querySelectorAll("[data-folder-id]").forEach((button) => button.addEventListener("click", () => {
    openNoteFolder(button.dataset.folderId);
  }));
  els.noteFolderBrowser.querySelectorAll("[data-rename-folder]").forEach((button) => button.addEventListener("click", () => renameNoteFolder(button.dataset.renameFolder)));
  els.noteFolderBrowser.querySelectorAll("[data-delete-folder]").forEach((button) => button.addEventListener("click", () => deleteNoteFolder(button.dataset.deleteFolder)));
}

function getFolderPath(folderId) {
  const path = [];
  const visited = new Set();
  let current = state.noteFolders.find((folder) => folder.id === folderId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = state.noteFolders.find((folder) => folder.id === (current.parentId || ""));
  }
  return path;
}

function getFolderDisplayPath(folderId) {
  return getFolderPath(folderId).map((folder) => folder.name).join(" / ");
}

function openNoteFolder(folderId = "") {
  state.selectedFolderId = state.noteFolders.some((folder) => folder.id === folderId) ? folderId : "";
  saveNotesOrganizer();
  renderNotes();
}

function compareNotes(a, b, sort) {
  if (sort === "title-asc") return String(a.title || "Untitled note").localeCompare(String(b.title || "Untitled note"), undefined, { sensitivity: "base" });
  const field = sort === "created-desc" ? "createdAt" : "updatedAt";
  const left = Date.parse(a[field] || a.updatedAt || 0) || 0;
  const right = Date.parse(b[field] || b.updatedAt || 0) || 0;
  return sort === "updated-asc" ? left - right : right - left;
}

function formatNoteDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "Saved";
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function switchNotesSection(section) {
  state.notesSection = section;
  state.noteTagFilter = "";
  state.selectedNotes.clear();
  state.noteSelectMode = false;
  els.privateNotesTab.classList.toggle("active", section === "private");
  els.sharedNotesTab.classList.toggle("active", section === "shared");
  els.privateNotesTab.setAttribute("aria-selected", String(section === "private"));
  els.sharedNotesTab.setAttribute("aria-selected", String(section === "shared"));
  renderNotes();
}

function toggleNoteSelection(force = !state.noteSelectMode) {
  state.noteSelectMode = force;
  if (!force) state.selectedNotes.clear();
  updateNoteSelectionUI();
}
function toggleSelectedNote(key) {
  state.selectedNotes.has(key) ? state.selectedNotes.delete(key) : state.selectedNotes.add(key);
  updateNoteSelectionUI();
}
function updateNoteSelectionUI() {
  const count = state.selectedNotes.size;
  els.noteSelectionBar.hidden = !state.noteSelectMode;
  els.noteSelectionCount.textContent = `${count} selected`;
  els.toggleNoteSelect.setAttribute("aria-pressed", String(state.noteSelectMode));
  els.toggleNoteSelect.classList.toggle("active", state.noteSelectMode);
  els.toggleNoteSelect.innerHTML = `<i class="ti ti-${state.noteSelectMode ? "check" : "square-dashed"}" aria-hidden="true"></i><span>${state.noteSelectMode ? "Done selecting" : "Select"}</span>`;
  els.notesList.classList.toggle("selecting", state.noteSelectMode);
  [els.shareSelectedNotes, els.moveSelectedNotes, els.copySelectedNotes, els.deleteSelectedNotes].forEach((button) => { button.disabled = !count; });
  els.notesList.querySelectorAll(".note-card[data-note-key]").forEach((card) => {
    const key = card.dataset.noteKey;
    const selected = state.selectedNotes.has(key);
    card.classList.toggle("selected", selected);
    let control = card.querySelector(".note-select");
    if (state.noteSelectMode && !control) {
      control = document.createElement("label");
      control.className = "note-select selection-control-enter";
      control.innerHTML = `<input type="checkbox" data-select-key="${escapeHTML(key)}"><span aria-hidden="true"></span>`;
      control.querySelector("input").addEventListener("change", () => toggleSelectedNote(key));
      card.prepend(control);
    } else if (!state.noteSelectMode && control) {
      const outro = control.animate?.([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.72)" }], { duration: 160, easing: "ease-in" });
      if (outro) outro.finished.then(() => control.remove()).catch(() => control.remove());
      else control.remove();
    }
    const input = control?.querySelector("input");
    if (input) input.checked = selected;
  });
}
function selectAllNotes() {
  const keys = [...els.notesList.querySelectorAll("[data-note-key]")].map((item) => item.dataset.noteKey);
  state.selectedNotes = keys.length && keys.every((key) => state.selectedNotes.has(key)) ? new Set() : new Set(keys);
  updateNoteSelectionUI();
}
async function deleteSelectedNotes() {
  if (!state.selectedNotes.size || !window.confirm(`Delete ${state.selectedNotes.size} selected notes?`)) return;
  for (const key of state.selectedNotes) {
    if (key.startsWith("shared:")) await notesSystem.deleteSharedNote(key.slice(7));
    else { await notesSystem.remove(key); delete state.notes[key]; }
  }
  toggleNoteSelection(false);
}
async function shareSelectedNotes() {
  const notes = [...state.selectedNotes].map((key) => {
    const note = key.startsWith("shared:") ? state.sharedNotes.find((item) => `shared:${item.id}` === key) : state.notes[key];
    if (!note) return null;
    return {
      title: String(note.title || ""), text: String(note.text || ""),
      tags: Array.isArray(note.tags) ? note.tags.map(String) : [],
      references: Array.isArray(note.references) ? note.references.map(String) : [],
      createdAt: note.createdAt || "", updatedAt: note.updatedAt || "",
      standalone: Boolean(note.standalone),
    };
  }).filter(Boolean);
  const url = makePublicLink(`notes=${encodeBase64Url(JSON.stringify({ version: 1, notes }))}`);
  const title = `${notes.length} Abrahamic Books ${notes.length === 1 ? "note" : "notes"}`;
  try {
    if (Capacitor.isNativePlatform()) await Share.share({ title, text: "Open this link to import the complete notes, tags, and references.", url, dialogTitle: "Share notes" });
    else if (navigator.share) await navigator.share({ title, text: "Open this link to import the complete notes, tags, and references.", url });
    else if (!(await copyShareLink(url))) window.prompt("Copy notes link:", url);
  } catch (error) { if (error?.name !== "AbortError" && !(await copyShareLink(url))) window.prompt("Copy notes link:", url); }
}

function openNoteTransfer(mode) {
  if (!state.selectedNotes.size) return;
  const copying = mode === "copy";
  els.noteTransferSheet.dataset.mode = copying ? "copy" : "move";
  els.noteTransferTitle.textContent = copying ? "Copy notes to" : "Move notes to";
  els.noteTransferSubtitle.textContent = `${state.selectedNotes.size} selected · choose a destination`;
  const folders = [{ id: "", name: "Notes", path: "Top level", icon: "home" }, ...state.noteFolders.map((folder) => ({ ...folder, path: getFolderDisplayPath(folder.id), icon: "folder" }))];
  els.noteTransferFolders.innerHTML = folders.map((folder) => `<button class="note-transfer-folder" type="button" data-transfer-folder="${escapeHTML(folder.id)}"><i class="ti ti-${folder.icon}" aria-hidden="true"></i><span><strong>${escapeHTML(folder.path || folder.name)}</strong><small>${copying ? "Create copies here" : "Move here"}</small></span><i class="ti ti-chevron-right" aria-hidden="true"></i></button>`).join("");
  els.noteTransferFolders.querySelectorAll("[data-transfer-folder]").forEach((button) => button.addEventListener("click", () => applyNoteTransfer(mode, button.dataset.transferFolder)));
  openDialog(els.noteTransferSheet, copying ? els.copySelectedNotes : els.moveSelectedNotes);
}

async function applyNoteTransfer(mode, folderId) {
  const selectedKeys = [...state.selectedNotes];
  els.noteTransferFolders.classList.add("working");
  try {
    for (const key of selectedKeys) {
      const shared = key.startsWith("shared:") ? state.sharedNotes.find((note) => `shared:${note.id}` === key) : null;
      const note = shared || state.notes[key];
      if (!note) continue;
      if (mode === "copy") {
        const copyKey = `note:${crypto.randomUUID()}`;
        const copy = {
          title: String(note.title || ""), text: String(note.text || ""),
          tags: Array.isArray(note.tags) ? [...note.tags] : [], references: Array.isArray(note.references) ? [...note.references] : [],
          folderId, standalone: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        state.notes[copyKey] = await notesSystem.save(copyKey, copy);
      } else if (shared) {
        shared.folderId = folderId;
        await notesSystem.updateSharedNote(shared.id, { folderId });
      } else {
        state.notes[key] = await notesSystem.save(key, { ...note, folderId });
      }
    }
    state.noteViewMode = "folders";
    state.selectedFolderId = folderId;
    saveNotesOrganizer();
    els.noteTransferSheet.close();
    state.noteSelectMode = false;
    state.selectedNotes.clear();
    renderNotes();
  } catch (error) {
    setStatus(`Could not ${mode} every note. ${error.message}`);
  } finally {
    els.noteTransferFolders.classList.remove("working");
  }
}

function renderTagFilters() {
  const source = state.notesSection === "shared" ? state.sharedNotes : Object.values(state.notes);
  const tags = [...new Set(source.flatMap((note) => note.tags || []))].sort();
  els.privateNotesTab.classList.toggle("active", state.notesSection === "private" && !state.noteTagFilter);
  els.sharedNotesTab.classList.toggle("active", state.notesSection === "shared" && !state.noteTagFilter);
  els.tagFilters.innerHTML = tags.map((tag) => `<button class="tag-chip ${state.noteTagFilter === tag ? "active" : ""}" type="button" data-tag="${escapeHTML(tag)}">#${escapeHTML(tag)}</button>`).join("");
  els.tagFilters.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.noteTagFilter = button.dataset.tag;
      renderNotes();
    });
  });
}

function getKnownNoteTags() {
  const notes = [...Object.values(state.notes), ...state.sharedNotes];
  return [...new Set([...Object.keys(state.tagCatalog), ...notes.flatMap((note) => Array.isArray(note.tags) ? note.tags : [])].map(String).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function renderNoteTagPicker() {
  const selected = new Set(parseTags(els.noteTags.value));
  const tags = [...new Set([...getKnownNoteTags(), ...selected])];
  els.noteTagChoices.innerHTML = tags.length
    ? tags.map((tag) => {
        const description = state.tagCatalog[tag]?.description || "";
        return `<div class="note-tag-item">
          <button class="note-tag-choice ${selected.has(tag) ? "active" : ""}" type="button" data-note-tag="${escapeHTML(tag)}" aria-pressed="${selected.has(tag)}" ${description ? `title="${escapeHTML(description)}"` : ""}><i class="ti ti-${selected.has(tag) ? "check" : "tag"}" aria-hidden="true"></i><span><b>#${escapeHTML(tag)}</b>${description ? `<small>${escapeHTML(description)}</small>` : ""}</span></button>
          <span class="note-tag-actions">
            <button type="button" data-rename-tag="${escapeHTML(tag)}" aria-label="Rename hashtag ${escapeHTML(tag)}" title="Rename hashtag"><i class="ti ti-pencil" aria-hidden="true"></i></button>
            <button type="button" data-delete-tag="${escapeHTML(tag)}" aria-label="Delete hashtag ${escapeHTML(tag)}" title="Delete hashtag"><i class="ti ti-trash" aria-hidden="true"></i></button>
          </span>
        </div>`;
      }).join("")
    : `<p class="note-tag-empty">No tags yet. Create the first one below.</p>`;
  els.noteTagChoices.querySelectorAll("[data-note-tag]").forEach((button) => {
    button.addEventListener("click", () => toggleCurrentNoteTag(button.dataset.noteTag));
  });
  els.noteTagChoices.querySelectorAll("[data-rename-tag]").forEach((button) => button.addEventListener("click", () => renameNoteTag(button.dataset.renameTag)));
  els.noteTagChoices.querySelectorAll("[data-delete-tag]").forEach((button) => button.addEventListener("click", () => deleteNoteTag(button.dataset.deleteTag)));
}

function toggleCurrentNoteTag(tag) {
  const tags = new Set(parseTags(els.noteTags.value));
  if (tags.has(tag)) tags.delete(tag);
  else if (tags.size < 12) tags.add(tag);
  else {
    setStatus("A note can have up to 12 tags.");
    return;
  }
  els.noteTags.value = [...tags].join(", ");
  renderNoteTagPicker();
  saveCurrentNote();
}

function normalizeNoteTag(value) {
  return String(value || "")
    .trim().toLowerCase().replace(/^#+/, "").replace(/\s+/g, "-").replace(/[^\p{L}\p{N}_-]+/gu, "")
    .slice(0, 40);
}

function createNoteTag() {
  const tag = normalizeNoteTag(els.noteTagCreate.value);
  if (!tag) {
    els.noteTagCreate.focus();
    return;
  }
  const selected = new Set(parseTags(els.noteTags.value));
  if (selected.size >= 12 && !selected.has(tag)) {
    setStatus("A note can have up to 12 tags.");
    return;
  }
  selected.add(tag);
  const description = String(els.noteTagDescription.value || "").trim().slice(0, 240);
  state.tagCatalog[tag] = { ...(state.tagCatalog[tag] || {}), description };
  saveNotesOrganizer();
  els.noteTags.value = [...selected].join(", ");
  els.noteTagCreate.value = "";
  els.noteTagDescription.value = "";
  renderNoteTagPicker();
  saveCurrentNote();
  els.noteTagCreate.focus();
}

async function updateTagAcrossNotes(oldTag, newTag = "") {
  const replaceTags = (tags) => [...new Set((Array.isArray(tags) ? tags : []).flatMap((tag) => tag === oldTag ? (newTag ? [newTag] : []) : [tag]))];
  const changedPrivate = Object.entries(state.notes).filter(([, note]) => Array.isArray(note.tags) && note.tags.includes(oldTag));
  for (const [key, note] of changedPrivate) {
    const updated = { ...note, tags: replaceTags(note.tags), updatedAt: new Date().toISOString() };
    state.notes[key] = await notesSystem.save(key, updated);
  }
  const changedShared = state.sharedNotes.filter((note) => Array.isArray(note.tags) && note.tags.includes(oldTag));
  for (const note of changedShared) {
    const tags = replaceTags(note.tags);
    note.tags = tags;
    try { await notesSystem.updateSharedNote(note.id, { tags }); }
    catch (error) { setStatus(`Some shared notes could not be updated: ${error.message}`); }
  }
}

async function renameNoteTag(oldTag) {
  const rawName = window.prompt(`Rename #${oldTag} to:`, oldTag);
  if (rawName === null) return;
  const newTag = normalizeNoteTag(rawName);
  if (!newTag || newTag === oldTag) return;
  const selected = parseTags(els.noteTags.value).map((tag) => tag === oldTag ? newTag : tag);
  els.noteTags.value = [...new Set(selected)].join(", ");
  const oldDetails = state.tagCatalog[oldTag] || {};
  state.tagCatalog[newTag] = { ...oldDetails, ...(state.tagCatalog[newTag] || {}) };
  delete state.tagCatalog[oldTag];
  if (state.noteTagFilter === oldTag) state.noteTagFilter = newTag;
  try {
    await updateTagAcrossNotes(oldTag, newTag);
    saveNotesOrganizer();
    renderNoteTagPicker();
    renderNotes();
    setStatus(`Renamed #${oldTag} to #${newTag}.`);
  } catch (error) { setStatus(`Could not rename the hashtag: ${error.message}`); }
}

async function deleteNoteTag(tag) {
  if (!window.confirm(`Delete #${tag}? It will be removed from every note.`)) return;
  els.noteTags.value = parseTags(els.noteTags.value).filter((item) => item !== tag).join(", ");
  delete state.tagCatalog[tag];
  if (state.noteTagFilter === tag) state.noteTagFilter = "";
  try {
    await updateTagAcrossNotes(tag);
    saveNotesOrganizer();
    renderNoteTagPicker();
    renderNotes();
    setStatus(`Deleted #${tag}.`);
  } catch (error) { setStatus(`Could not delete the hashtag: ${error.message}`); }
}

function renderNoteFolderOptions(selectedId = els.noteFolderSelect?.value || "") {
  if (!els.noteFolderSelect) return;
  const folders = [...state.noteFolders].sort((a, b) => getFolderDisplayPath(a.id).localeCompare(getFolderDisplayPath(b.id), undefined, { sensitivity: "base" }));
  els.noteFolderSelect.innerHTML = `<option value="">Notes (top level)</option>${folders.map((folder) => `<option value="${escapeHTML(folder.id)}">${escapeHTML(getFolderDisplayPath(folder.id))}</option>`).join("")}`;
  els.noteFolderSelect.value = state.noteFolders.some((folder) => folder.id === selectedId) ? selectedId : "";
}

function setNotesViewMode(mode) {
  state.noteViewMode = mode === "folders" ? "folders" : "flat";
  if (state.noteViewMode === "flat") state.selectedFolderId = "all";
  else if (state.selectedFolderId === "all") state.selectedFolderId = "";
  saveNotesOrganizer();
  renderNotes();
}

function createNoteFolder(fromEditor = false) {
  const rawName = window.prompt("Folder name:");
  if (rawName === null) return;
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!name) return;
  const requestedParentId = fromEditor ? (els.noteFolderSelect.value || "") : (state.selectedFolderId === "all" ? "" : state.selectedFolderId);
  const parentId = state.noteFolders.some((folder) => folder.id === requestedParentId) ? requestedParentId : "";
  const existing = state.noteFolders.find((folder) => (folder.parentId || "") === parentId && folder.name.localeCompare(name, undefined, { sensitivity: "base" }) === 0);
  const folder = existing || { id: `folder:${crypto.randomUUID()}`, name, parentId, createdAt: new Date().toISOString() };
  if (!existing) state.noteFolders.push(folder);
  state.noteFolders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  state.noteViewMode = "folders";
  state.selectedFolderId = folder.id;
  saveNotesOrganizer();
  renderNoteFolderOptions(folder.id);
  if (fromEditor) {
    els.noteFolderSelect.value = folder.id;
    saveCurrentNote();
  }
  renderNotes();
}

function renameNoteFolder(folderId) {
  const folder = state.noteFolders.find((item) => item.id === folderId);
  if (!folder) return;
  const rawName = window.prompt("Rename folder:", folder.name);
  if (rawName === null) return;
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!name || name === folder.name) return;
  const duplicate = state.noteFolders.some((item) => item.id !== folderId && (item.parentId || "") === (folder.parentId || "") && item.name.localeCompare(name, undefined, { sensitivity: "base" }) === 0);
  if (duplicate) {
    setStatus("A folder with that name already exists here.");
    return;
  }
  folder.name = name;
  saveNotesOrganizer();
  renderNoteFolderOptions(folderId);
  renderNotes();
  setStatus(`Folder renamed to ${name}.`);
}

async function deleteNoteFolder(folderId) {
  const folder = state.noteFolders.find((item) => item.id === folderId);
  if (!folder || !window.confirm(`Delete “${folder.name}”? Its notes and subfolders will be moved to the parent folder.`)) return;
  const parentId = folder.parentId || "";
  state.noteFolders.forEach((item) => { if ((item.parentId || "") === folderId) item.parentId = parentId; });
  state.noteFolders = state.noteFolders.filter((item) => item.id !== folderId);
  const changedPrivate = Object.entries(state.notes).filter(([, note]) => (note.folderId || "") === folderId);
  try {
    for (const [key, note] of changedPrivate) {
      const updated = { ...note, folderId: parentId, updatedAt: new Date().toISOString() };
      state.notes[key] = await notesSystem.save(key, updated);
    }
    for (const note of state.sharedNotes.filter((item) => (item.folderId || "") === folderId)) {
      note.folderId = parentId;
      try { await notesSystem.updateSharedNote(note.id, { folderId: parentId }); }
      catch (error) { setStatus(`Some shared notes could not be moved: ${error.message}`); }
    }
    if (state.selectedFolderId === folderId) state.selectedFolderId = parentId;
    if (els.noteFolderSelect.value === folderId) els.noteFolderSelect.value = parentId;
    saveNotesOrganizer();
    renderNoteFolderOptions(parentId);
    renderNotes();
    setStatus(`Deleted ${folder.name}. Its contents are safe in the parent folder.`);
  } catch (error) { setStatus(`Could not delete the folder: ${error.message}`); }
}

function saveNotesOrganizer() {
  const organizer = {
    viewMode: state.noteViewMode,
    selectedFolderId: state.selectedFolderId,
    folders: state.noteFolders,
    tagCatalog: state.tagCatalog,
  };
  localStorage.setItem(STORE.notesOrganizer, JSON.stringify(organizer));
  notesSystem?.saveOrganizer(organizer).then((saved) => {
    localStorage.setItem(STORE.notesOrganizer, JSON.stringify(saved));
  }).catch(() => {});
}

function applyNotesOrganizer(organizer = {}) {
  state.noteViewMode = organizer.viewMode === "folders" ? "folders" : "flat";
  state.selectedFolderId = typeof organizer.selectedFolderId === "string" ? organizer.selectedFolderId : "all";
  state.noteFolders = Array.isArray(organizer.folders)
    ? organizer.folders.filter((folder) => folder && typeof folder.id === "string" && typeof folder.name === "string").map((folder) => ({ ...folder, parentId: typeof folder.parentId === "string" ? folder.parentId : "" }))
    : [];
  state.tagCatalog = organizer.tagCatalog && typeof organizer.tagCatalog === "object" ? organizer.tagCatalog : {};
  if (state.selectedFolderId !== "all" && state.selectedFolderId !== "" && !state.noteFolders.some((folder) => folder.id === state.selectedFolderId)) {
    state.selectedFolderId = state.noteViewMode === "folders" ? "" : "all";
  }
  if (state.noteViewMode === "folders" && state.selectedFolderId === "all") state.selectedFolderId = "";
  localStorage.setItem(STORE.notesOrganizer, JSON.stringify({ ...organizer, folders: state.noteFolders, tagCatalog: state.tagCatalog }));
  renderNoteFolderOptions();
  renderNotes();
}

function renderReferenceResults() {
  const query = els.referenceSearch.value.trim();
  const token = (renderReferenceResults.token || 0) + 1;
  renderReferenceResults.token = token;
  clearTimeout(renderReferenceResults.timer);
  if (!query) {
    els.referenceResults.innerHTML = "";
    return;
  }
  if (normalizeSearchText(query).length < 2 && !parseLooseReference(query)) {
    els.referenceResults.innerHTML = `<div class="status">Type at least 2 characters to search the complete library.</div>`;
    return;
  }
  els.referenceResults.innerHTML = `<div class="reference-searching"><span aria-hidden="true"></span>Finding real passages…</div>`;
  renderReferenceResults.timer = setTimeout(async () => {
    const { suggestions, truncated } = await collectReferenceSuggestions(query, token);
    if (renderReferenceResults.token !== token) return;
    els.referenceResults.innerHTML = suggestions.length
      ? `${suggestions.map((item) => `<button class="reference-row" type="button" data-key="${escapeHTML(item.key)}"><span>${escapeHTML(item.kind || "Passage")}</span><strong>${escapeHTML(item.label)}</strong>${item.preview ? `<small>${escapeHTML(item.preview)}</small>` : ""}</button>`).join("")}${truncated ? '<p class="reference-results-meta">More matches exist — add a chapter or verse number to narrow the list.</p>' : ""}`
      : `<div class="status">No real passage matched. Try Quran 2:255, Al-Baqarah, John 3, Bukhari 52, or part of a verse.</div>`;
    els.referenceResults.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => addNoteReference(button.dataset.key));
    });
  }, 140);
}

function addReferenceFromSearch() {
  const parsed = parseLooseReference(els.referenceSearch.value.trim());
  if (parsed) addNoteReference(parsed.key);
}

async function addNoteReference(key) {
  if (!key || state.currentNoteReferences.includes(key)) return;
  try {
    key = await resolveReferenceKey(key);
  } catch (error) {
    setStatus(error.message);
    return;
  }
  if (state.currentNoteReferences.includes(key)) return;
  state.currentNoteReferences = [...state.currentNoteReferences, key];
  els.referenceSearch.value = "";
  renderReferenceResults();
  renderNoteReferences();
  saveCurrentNote();
}

async function collectReferenceSuggestions(query, token) {
  // Keep broad searches useful across every tradition. Each source gets its
  // own allowance so a common Quran word cannot crowd Bible or hadith results
  // out of the list before those collections have been searched.
  const limit = 1080;
  const sourceLimit = 360;
  const suggestions = [];
  const seen = new Set();
  const sourceCounts = new Map();
  let truncated = false;
  const add = (item) => {
    if (!item?.key || seen.has(item.key)) return;
    const kind = item.kind || "Passage";
    if (suggestions.length >= limit || (sourceCounts.get(kind) || 0) >= sourceLimit) { truncated = true; return; }
    seen.add(item.key);
    sourceCounts.set(kind, (sourceCounts.get(kind) || 0) + 1);
    suggestions.push(item);
  };
  const sourceFull = (kind) => (sourceCounts.get(kind) || 0) >= sourceLimit;
  const stopped = () => renderReferenceResults.token !== token;
  const normalized = normalizeSearchText(query).replace(/\b(quran|surah|chapter|book|hadith)\b/g, " ").replace(/\s+/g, " ").trim();
  const parsed = parseLooseReference(query);
  if (parsed) add({ ...parsed, kind: parsed.type === "quran" ? "Quran" : parsed.type === "hadith" ? "Hadith" : "Bible" });

  const quranTail = normalized.match(/^(.+?)\s+(\d{1,3})$/);
  const quranName = quranTail?.[1]?.trim() || normalized;
  const quranVerse = quranTail?.[2] ? Number(quranTail[2]) : 0;
  const chapterMatches = state.chapters.filter((chapter) => {
    const label = normalizeSearchText(`${chapter.id} ${chapter.name_simple} ${chapter.name_arabic} ${chapter.translated_name?.name || ""}`);
    return quranName && quranName.split(" ").every((word) => label.includes(word));
  });
  for (const chapter of chapterMatches) {
    const verses = quranVerse ? [quranVerse] : Array.from({ length: chapter.verses_count || 0 }, (_, index) => index + 1);
    verses.filter((verse) => verse <= chapter.verses_count).forEach((verse) => add({ key: `${chapter.id}:${verse}`, label: `${chapter.name_simple} ${chapter.id}:${verse}`, kind: "Quran" }));
    if (stopped()) return { suggestions: [], truncated: false };
    if (sourceFull("Quran")) break;
  }

  const bibleBooks = [...OLD_TESTAMENT, ...NEW_TESTAMENT];
  for (const [book, chapterCount] of bibleBooks) {
    const bookLabel = normalizeSearchText(book);
    if (!normalized.includes(bookLabel) && !bookLabel.includes(normalized)) continue;
    const remainder = normalized.replace(bookLabel, "").trim();
    const chapterNumber = Number(remainder.match(/^\d{1,3}/)?.[0] || 0);
    const chapters = chapterNumber ? [chapterNumber] : Array.from({ length: chapterCount }, (_, index) => index + 1);
    for (const chapter of chapters.filter((item) => item >= 1 && item <= chapterCount)) {
      const bookId = BOOK_IDS[book];
      const data = await getOfflineJSON(`bible/${getBookSet(book)}-${bookId}-${chapter}.json`).catch(() => null);
      const verses = extractBibleVerses(data?.english);
      (verses.length ? verses : [{ number: 1, text: "" }]).forEach((verse) => add({ key: bibleKey(book, chapter, verse.number), label: `${book} ${chapter}:${verse.number}`, kind: "Bible", preview: verse.text.slice(0, 110) }));
      if (stopped() || sourceFull("Bible")) break;
    }
    if (stopped() || sourceFull("Bible")) break;
  }

  const hadithQuery = normalizeHadithSearchText(query.replace(/\d+[\s:]?\d*$/, ""));
  const requestedNumber = Number(query.match(/(\d{1,6})\s*$/)?.[1] || 0);
  const hadithBooks = state.hadithBooks.filter((book) => {
    const label = normalizeHadithSearchText(`${book.name} ${book.key} ${book.tradition}`);
    return hadithQuery && (label.includes(hadithQuery) || hadithQuery.includes(normalizeHadithSearchText(book.name)));
  });
  for (const book of hadithBooks) {
    if (requestedNumber) {
      const rawKey = hadithKey(book.key, 1, requestedNumber);
      const resolved = await resolveReferenceKey(rawKey).catch(() => "");
      if (resolved) add({ key: resolved, label: `${book.name} · Hadith ${requestedNumber}`, kind: "Hadith" });
      continue;
    }
    if (book.source === "thaqalayn") {
      const records = await getOfflineJSON(`hadith-search/${book.key}.json`).catch(() => []);
      for (const item of records) {
        add({ key: hadithKey(book.key, item.section, item.id), label: `${book.name} · Hadith ${item.id}`, kind: "Hadith", preview: String(item.text || "").slice(0, 110) });
        if (sourceFull("Hadith")) break;
      }
    } else {
      const sectionMap = state.hadithInfo?.[book.key]?.metadata?.sections || {};
      for (const section of Object.keys(sectionMap).map(Number).filter(Boolean).sort((a, b) => a - b)) {
        const data = await getOfflineJSON(`hadith/${book.key}/section-${section}.json`).catch(() => null);
        for (const item of data?.english?.hadiths || []) {
          add({ key: hadithKey(book.key, section, item.hadithnumber), label: `${book.name} · Hadith ${item.hadithnumber}`, kind: "Hadith", preview: String(item.text || "").slice(0, 110) });
          if (sourceFull("Hadith")) break;
        }
        if (sourceFull("Hadith") || stopped()) break;
      }
    }
    if (stopped() || sourceFull("Hadith")) break;
  }

  // If the text is not a recognisable reference or book name, search the
  // actual bundled text across Quran, every Bible book, and every hadith
  // collection. Results remain real, resolvable offline references.
  if (!suggestions.length && normalized.length >= 3) {
    const expression = parseSearchExpression(query);
    for (const chapter of state.chapters) {
      const data = await getOfflineJSON(`quran/chapter-${chapter.id}.json`).catch(() => null);
      for (const verse of data?.verses || []) {
        const text = [verse.text_uthmani, ...(verse.translations || []).map((item) => stripHTML(item.text))].join(" ");
        if (expression.matches(normalizeSearchText(text))) add({ key: verse.verse_key, label: `${chapter.name_simple} ${verse.verse_key}`, kind: "Quran", preview: stripHTML(verse.translations?.[0]?.text || "").slice(0, 110) });
      }
      if (sourceFull("Quran") || stopped()) break;
    }

    for (const [book, chapterCount] of [...OLD_TESTAMENT, ...NEW_TESTAMENT]) {
      const testament = getBookSet(book);
      const bookId = BOOK_IDS[book];
      for (let chapter = 1; chapter <= chapterCount; chapter += 1) {
        const data = await getOfflineJSON(`bible/${testament}-${bookId}-${chapter}.json`).catch(() => null);
        for (const verse of extractBibleVerses(data?.english)) {
          if (expression.matches(normalizeSearchText(`${book} ${chapter} ${verse.number} ${verse.text}`))) {
            add({ key: bibleKey(book, chapter, verse.number), label: `${book} ${chapter}:${verse.number}`, kind: "Bible", preview: verse.text.slice(0, 110) });
          }
        }
        if (sourceFull("Bible") || stopped()) break;
      }
      if (sourceFull("Bible") || stopped()) break;
    }

    for (const book of state.hadithBooks) {
      if (book.source === "thaqalayn") {
        const records = await getOfflineJSON(`hadith-search/${book.key}.json`).catch(() => []);
        for (const item of records) {
          const text = `${book.name} ${item.chapter || ""} ${item.text || ""} ${item.arabic || ""}`;
          if (expression.matches(normalizeSearchText(text))) {
            add({ key: hadithKey(book.key, item.section, item.id), label: `${book.name} · Hadith ${item.id}`, kind: "Hadith", preview: String(item.text || "").slice(0, 110) });
          }
          if (sourceFull("Hadith") || stopped()) break;
        }
      } else {
        const sectionMap = state.hadithInfo?.[book.key]?.metadata?.sections || {};
        const sections = Object.keys(sectionMap).map(Number).filter(Boolean).sort((a, b) => a - b);
        for (const section of sections) {
          const data = await getOfflineJSON(`hadith/${book.key}/section-${section}.json`).catch(() => null);
          const arabicByNumber = new Map((data?.arabic?.hadiths || []).map((item) => [Number(item.hadithnumber), item.text]));
          for (const item of data?.english?.hadiths || []) {
            const text = `${book.name} ${sectionMap[section] || ""} ${item.text || ""} ${arabicByNumber.get(Number(item.hadithnumber)) || ""}`;
            if (expression.matches(normalizeSearchText(text))) {
              add({ key: hadithKey(book.key, section, item.hadithnumber), label: `${book.name} · Hadith ${item.hadithnumber}`, kind: "Hadith", preview: String(item.text || "").slice(0, 110) });
            }
            if (sourceFull("Hadith") || stopped()) break;
          }
          if (sourceFull("Hadith") || stopped()) break;
        }
      }
      if (sourceFull("Hadith") || stopped()) break;
    }
  }
  return { suggestions, truncated };
}

function renderNoteReferences() {
  els.openReferences.disabled = state.currentNoteReferences.length === 0;
  const referenceLabel = state.currentNoteReferences.length
    ? `View ${state.currentNoteReferences.length} ${state.currentNoteReferences.length === 1 ? "reference" : "references"}`
    : "View references";
  els.openReferences.innerHTML = `<i class="ti ti-books" aria-hidden="true"></i><span>${referenceLabel}</span>`;
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
    button.addEventListener("click", () => navigateToReference(button.dataset.jump));
  });
}

async function showReferenceOverview(referenceOverride = null) {
  const references = Array.isArray(referenceOverride) ? [...new Set(referenceOverride)] : [...state.currentNoteReferences];
  if (!references.length) return;
  state.focusedVerseKey = null;
  if (els.noteSheet.open) els.noteSheet.close();
  els.referenceOverviewSubtitle.textContent = Array.isArray(referenceOverride)
    ? `${references.length} shared ${references.length === 1 ? "passage" : "passages"}`
    : `${references.length} ${references.length === 1 ? "reference" : "references"} from this note`;
  els.referenceOverviewContent.innerHTML = `<div class="status">Loading referenced verses...</div>`;
  openDialog(els.referenceOverviewSheet);

  const items = [];
  const repairedReferences = [];
  for (const key of references) {
    try {
      const resolvedKey = await ensureReferenceLoaded(key);
      const verse = state.verses.find((item) => item.verse_key === resolvedKey);
      items.push({ key: resolvedKey, verse });
      repairedReferences.push(resolvedKey);
    } catch (error) {
      items.push({ key, verse: null, error: error.message });
      repairedReferences.push(key);
    }
  }
  if (!Array.isArray(referenceOverride) && repairedReferences.some((key, index) => key !== state.currentNoteReferences[index])) {
    state.currentNoteReferences = [...new Set(repairedReferences)];
    saveCurrentNote();
  }

  els.referenceOverviewContent.innerHTML = items.map(renderReferenceOverviewCard).join("");
  els.referenceOverviewContent.querySelectorAll("[data-continue-reference]").forEach((button) => {
    button.addEventListener("click", () => {
      els.referenceOverviewSheet.close();
      jumpToReference(button.dataset.continueReference, "auto", true);
    });
  });
  els.referenceOverviewContent.querySelectorAll("[data-share-reference]").forEach((button) => {
    button.addEventListener("click", () => shareReference(button.dataset.shareReference, button));
  });
  els.referenceOverviewContent.querySelectorAll("[data-tafsir-reference]").forEach((button) => {
    button.addEventListener("click", () => {
      els.referenceOverviewSheet.close();
      openTafsir(button.dataset.tafsirReference);
    });
  });
}

function renderReferenceOverviewCard({ key, verse, error = "" }) {
  if (!verse) return `
    <article class="reference-overview-card">
      <strong>${escapeHTML(formatReferenceKey(key))}</strong>
      <p>${escapeHTML(error || "This reference could not be loaded.")}</p>
      <div class="reference-overview-actions">
        <button class="text-button primary" type="button" data-continue-reference="${escapeHTML(key)}"><i class="ti ti-book-2" aria-hidden="true"></i><span>Continue reading</span></button>
        <button class="text-button share-text-button" type="button" data-share-reference="${escapeHTML(key)}">${shareIcon()}<span>Share</span></button>
      </div>
    </article>`;

  const parsed = parseReferenceKey(key);
  const isQuran = parsed.type === "quran";
  const translation = isQuran ? stripHTML(verse.translations?.[0]?.text || "") : verse.text || "";
  const metadata = renderVerseMeta(verse);
  return `
    <article class="reference-overview-card">
      <div class="reference-overview-heading">
        <strong>${escapeHTML(formatReferenceKey(key))}</strong>
        <span>${escapeHTML(parsed.type === "quran" ? "Quran" : parsed.type === "hadith" ? "Hadith" : parsed.type === "old" ? "Old Testament" : "New Testament")}</span>
      </div>
      ${isQuran ? `<div><span class="reference-language-label">Arabic</span><div class="reference-overview-arabic" lang="ar" dir="rtl">${escapeHTML(verse.text_uthmani || "")}</div></div>` : verse.originalText ? `<div><span class="reference-language-label">${escapeHTML(verse.originalLanguage || "Original language")}</span><div class="reference-overview-original" dir="${parsed.type === "old" || parsed.type === "hadith" ? "rtl" : "ltr"}">${escapeHTML(verse.originalText)}</div></div>` : ""}
      <div><span class="reference-language-label">English</span><p class="reference-overview-translation">${escapeHTML(translation)}</p></div>
      ${metadata ? `<div class="verse-meta reference-overview-meta">${metadata}</div>` : ""}
      <div class="reference-overview-actions">
        <button class="text-button primary" type="button" data-continue-reference="${escapeHTML(key)}"><i class="ti ti-book-2" aria-hidden="true"></i><span>Continue reading</span></button>
        ${isQuran ? `<button class="text-button" type="button" data-tafsir-reference="${escapeHTML(key)}"><i class="ti ti-notes" aria-hidden="true"></i><span>Tafsir</span></button>` : ""}
        <button class="text-button share-text-button" type="button" data-share-reference="${escapeHTML(key)}">${shareIcon()}<span>Share</span></button>
      </div>
    </article>`;
}

function navigateToReference(key) {
  if (els.noteSheet.open) els.noteSheet.close();
  jumpToReference(key);
}

async function showNoteVersePreview(key) {
  if (key.startsWith("note:")) {
    const note = state.notes[key] || {};
    const refs = note.references || [];
    els.notesVersePreview.hidden = false;
    els.notesVersePreview.innerHTML = `
      <strong>${escapeHTML(note.title?.trim() || "Untitled note")}</strong>
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
      ${refs.length ? `<div class="note-tags">${refs.map((ref) => `<button class="tag-chip" type="button" data-ref="${escapeHTML(ref)}">${escapeHTML(formatReferenceKey(ref))}</button>`).join("")}</div>` : ""}
    <div class="sheet-actions">
      <button class="text-button" type="button" data-action="edit-note">Edit note</button>
      <button class="text-button primary" type="button" data-action="jump-note">Jump to verse</button>
    </div>
  `;
  els.notesVersePreview.querySelector('[data-action="edit-note"]').addEventListener("click", () => openNote(key));
  els.notesVersePreview.querySelectorAll("[data-ref]").forEach((button) => {
    button.addEventListener("click", () => navigateToReference(button.dataset.ref));
  });
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
    if (verse && state.scripture === "hadith") jumpToReference(hadithKey(state.selectedHadithBook, state.selectedHadithSection, verse));
    else if (verse) jumpToReference(bibleKey(state.selectedBibleBook, state.selectedBibleChapter, verse));
    return;
  }
  const key = raw.includes(":") ? raw : `${state.selectedChapter}:${raw}`;
  const [chapter, ayah] = key.split(":").map(Number);
  if (!chapter || !ayah) return;

  jumpToReference(key);
}

async function jumpToReference(key, behavior = "smooth", focused = true) {
  const sourceView = state.currentView;
  const sourceScrollTop = window.scrollY;
  const keepVerseSearchFocused = document.activeElement === els.ayahSearch;
  try {
    key = await ensureReferenceLoaded(key);
  } catch (error) {
    setStatus(error.message);
    return;
  }
  state.focusedVerseKey = focused ? key : null;
  renderVerses();
  switchView("readView", false, sourceView === "readView" ? null : sourceScrollTop);
  await waitForStableLayout();
  if (focused) {
    if (!keepVerseSearchFocused) {
      document.body.classList.remove("controls-manually-expanded");
      setControlsCollapsed(true);
    }
    await waitForStableLayout();
    // An instant view-local jump prevents a long page scroll animation from
    // continuing after the user returns to Search or Notes.
    scrollToFocusedVerse(isLandscapeWorkspace() ? behavior : "auto");
    if (keepVerseSearchFocused) {
      document.body.classList.add("controls-manually-expanded");
      controlsExpandedAt = window.scrollY;
      previousToolbarScrollY = window.scrollY;
      els.ayahSearch.focus({ preventScroll: true });
      const end = els.ayahSearch.value.length;
      els.ayahSearch.setSelectionRange?.(end, end);
    }
  } else {
    scrollToKey(key, behavior);
  }
}

function scrollToFocusedVerse(behavior = "smooth") {
  if (isLandscapeWorkspace()) {
    const reader = document.querySelector("#readView");
    reader?.scrollTo({ top: Math.max(0, els.focusedVerseBar.offsetTop - 16), behavior });
    return;
  }
  const toolbarHeight = getActiveToolbar()?.getBoundingClientRect().height || 0;
  const headerHeight = els.topbar?.getBoundingClientRect().height || 0;
  const top = els.focusedVerseBar.getBoundingClientRect().top + window.scrollY - headerHeight - toolbarHeight - 16;
  window.scrollTo({ top: Math.max(0, top), behavior });
}

async function continueReadingFromFocus() {
  const key = state.focusedVerseKey;
  if (!key) return;
  state.focusedVerseKey = null;
  renderVerses();
  await waitForStableLayout();
  scrollToKey(key, "auto");
}

function waitForStableLayout() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function ensureReferenceLoaded(key) {
  key = await resolveReferenceKey(key);
  const parsed = parseReferenceKey(key);
  if (parsed.type === "quran") {
    if (state.scripture !== "quran" || parsed.chapter !== state.selectedChapter) {
      state.scripture = "quran";
      renderScriptureControls();
      await loadChapter(parsed.chapter);
    }
    return key;
  }

  if (parsed.type === "hadith") {
    state.scripture = "hadith";
    state.selectedHadithBook = parsed.book;
    state.selectedHadithSection = parsed.section;
    renderScriptureControls();
    await loadHadithSection();
    return key;
  }

  state.scripture = parsed.type;
  state.selectedBibleBook = parsed.book;
  state.selectedBibleChapter = parsed.chapter;
  renderScriptureControls();
  await loadBibleChapter();
  return key;
}

async function resolveReferenceKey(key) {
  const parsed = parseReferenceKey(key);
  if (parsed.type === "note") return key;
  if (parsed.type === "quran") {
    const chapter = getChapter(parsed.chapter);
    if (!chapter || parsed.verse < 1 || parsed.verse > Number(chapter.verses_count || 0)) throw new Error(`${formatReferenceKey(key)} does not exist.`);
    return `${parsed.chapter}:${parsed.verse}`;
  }
  if (parsed.type === "old" || parsed.type === "new") {
    const chapterCount = [...OLD_TESTAMENT, ...NEW_TESTAMENT].find(([name]) => name === parsed.book)?.[1] || 0;
    if (parsed.chapter < 1 || parsed.chapter > chapterCount) throw new Error(`${parsed.label} does not exist.`);
    const data = await getOfflineJSON(`bible/${parsed.type}-${BOOK_IDS[parsed.book]}-${parsed.chapter}.json`).catch(() => null);
    const exists = extractBibleVerses(data?.english).some((verse) => Number(verse.number) === parsed.verse);
    if (!exists) throw new Error(`${parsed.label} does not exist.`);
    return bibleKey(parsed.book, parsed.chapter, parsed.verse);
  }
  if (parsed.type !== "hadith") return key;
  const book = state.hadithBooks.find((item) => item.key === parsed.book);
  if (!book) throw new Error("That hadith collection is not available in this library.");
  if (book.source === "thaqalayn") {
    const records = await getOfflineJSON(`hadith-search/${book.key}.json`).catch(() => []);
    const record = records.find((item) => Number(item.id) === parsed.verse);
    if (!record) throw new Error(`${book.name} hadith ${parsed.verse} does not exist in the bundled collection.`);
    return hadithKey(book.key, Number(record.section), parsed.verse);
  }
  const sectionMap = state.hadithInfo?.[book.key]?.metadata?.sections || {};
  const sectionIds = Object.keys(sectionMap).map(Number).filter((item) => item > 0).sort((a, b) => a - b);
  const orderedSections = [parsed.section, ...sectionIds.filter((section) => section !== parsed.section)];
  for (const section of orderedSections) {
    const data = await getOfflineJSON(`hadith/${book.key}/section-${section}.json`).catch(() => null);
    if ((data?.english?.hadiths || []).some((item) => Number(item.hadithnumber) === parsed.verse)) return hadithKey(book.key, section, parsed.verse);
  }
  throw new Error(`${book.name} hadith ${parsed.verse} does not exist in the bundled collection.`);
}

function scrollToKey(key, behavior = "smooth") {
  const target = document.querySelector(`#ayah-${CSS.escape(key.replaceAll(":", "-"))}`);
  if (!target) {
    setStatus(`Ayah ${key} was not found in this surah.`);
    return;
  }
  // Materialize deferred cards once before measuring a deep link. Their real
  // heights are then remembered by contain-intrinsic-size, so subsequent
  // scrolling stays lightweight without shifting the requested verse.
  els.verses.classList.add("measuring-jump");
  void els.verses.offsetHeight;
  document.body.classList.remove("controls-manually-expanded");
  setControlsCollapsed(true);
  if (isLandscapeWorkspace()) {
    const reader = document.querySelector("#readView");
    reader?.scrollTo({ top: Math.max(0, target.offsetTop - 16), behavior });
    requestAnimationFrame(() => els.verses.classList.remove("measuring-jump"));
    updateDashboard(key);
    return;
  }
  const headerHeight = els.topbar?.getBoundingClientRect().height || 0;
  const toolbarHeight = getActiveToolbar()?.getBoundingClientRect().height || 0;
  const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - toolbarHeight - 16;
  window.scrollTo({ top: Math.max(0, top), behavior });
  requestAnimationFrame(() => els.verses.classList.remove("measuring-jump"));
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
  const previousKey = localStorage.getItem("quran-reader-last-read-v1");
  recordLastRead(key);
  updateDashboard(key);
  if (previousKey && previousKey !== key) updateLastReadMarker(previousKey, false);
  updateLastReadMarker(key, true);
  const marker = els.verses.querySelector(`[data-key="${CSS.escape(key)}"] [data-action="bookmark"]`);
  playLastReadAnimation(marker);
}

function updateLastReadMarker(key, active = isLastRead(key)) {
  const marker = els.verses.querySelector(`[data-key="${CSS.escape(key)}"] [data-action="bookmark"]`);
  if (!marker) return;
  marker.classList.toggle("active", active);
  const icon = marker.querySelector(".ti");
  if (icon) icon.className = `ti ti-bookmark${active ? "-filled" : ""}`;
  marker.setAttribute("aria-pressed", String(active));
}

function isLastRead(key) {
  return localStorage.getItem("quran-reader-last-read-v1") === key;
}

function playLastReadAnimation(button) {
  if (!button || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  button.classList.remove("last-read-confirmed");
  void button.offsetWidth;
  button.classList.add("last-read-confirmed");
  setTimeout(() => button.classList.remove("last-read-confirmed"), 900);
}

function recordLastRead(key) {
  const updatedAt = new Date().toISOString();
  localStorage.setItem("quran-reader-last-read-v1", key);
  localStorage.setItem("quran-reader-last-read-updated-v1", updatedAt);
  const ownerUid = notesSystem?.user?.uid || "__local__";
  localStorage.setItem("quran-reader-last-read-owner-v1", ownerUid);
  if (ownerUid === "__local__") {
    localStorage.setItem("quran-reader-local-last-read-v1", key);
    localStorage.setItem("quran-reader-local-last-read-updated-v1", updatedAt);
  }
  const verse = state.verses.find((item) => item.verse_key === key);
  const text = stripHTML(verse?.translations?.[0]?.text || verse?.text || verse?.english?.text || verse?.text_uthmani || "");
  const payload = { reference: key, label: formatReferenceKey(key), text: text.slice(0, 320), updatedAt };
  if (Capacitor.isNativePlatform()) WidgetData.setLastRead(payload).catch(() => {});
  if (notesSystem?.signedIn) notesSystem.setLastRead(payload).catch((error) => setStatus(`Last read saved locally; account sync will retry. ${error.message}`));
}

function startAccountLastReadSync() {
  if (!notesSystem?.signedIn) return;
  notesSystem.watchLastRead(applyAccountLastRead, (error) => setStatus(`Could not sync last read: ${error.message}`));
}

function applyAccountLastRead(remote) {
  if (!notesSystem?.signedIn) return;
  const accountUid = notesSystem.user?.uid || "";
  const localReference = localStorage.getItem("quran-reader-last-read-v1") || "";
  const localUpdatedAt = localStorage.getItem("quran-reader-last-read-updated-v1") || "";
  const localOwner = localStorage.getItem("quran-reader-last-read-owner-v1") || "";
  const localBelongsToAccount = !localOwner || localOwner === "__local__" || localOwner === accountUid;
  if (!remote?.reference) {
    if (localReference && localBelongsToAccount) {
      localStorage.setItem("quran-reader-last-read-owner-v1", accountUid);
      notesSystem.setLastRead({ reference: localReference, label: formatReferenceKey(localReference), text: "", updatedAt: localUpdatedAt || new Date().toISOString() }).catch(() => {});
    } else if (!localBelongsToAccount) {
      localStorage.removeItem("quran-reader-last-read-v1");
      updateLastReadMarker(localReference, false);
      updateDashboard("");
    }
    return;
  }
  if (localReference && localBelongsToAccount && Date.parse(localUpdatedAt || 0) > Date.parse(remote.updatedAt || 0)) {
    notesSystem.setLastRead({ reference: localReference, label: formatReferenceKey(localReference), text: "", updatedAt: localUpdatedAt }).catch(() => {});
    return;
  }
  const previousKey = localReference;
  localStorage.setItem("quran-reader-last-read-v1", remote.reference);
  localStorage.setItem("quran-reader-last-read-updated-v1", remote.updatedAt || new Date().toISOString());
  localStorage.setItem("quran-reader-last-read-owner-v1", accountUid);
  if (previousKey && previousKey !== remote.reference) updateLastReadMarker(previousKey, false);
  updateLastReadMarker(remote.reference, true);
  updateDashboard(remote.reference);
  if (Capacitor.isNativePlatform()) WidgetData.setLastRead(remote).catch(() => {});
}

async function refreshAccountLastRead() {
  if (!notesSystem?.signedIn || !navigator.onLine) return;
  try { applyAccountLastRead(await notesSystem.getLastRead()); }
  catch (error) { setStatus(`Last read will refresh when the connection returns. ${error.message}`); }
}

function syncSavedLastReadToWidget() {
  if (!Capacitor.isNativePlatform()) return;
  const key = localStorage.getItem("quran-reader-last-read-v1");
  if (!key) return;
  const verse = state.verses.find((item) => item.verse_key === key);
  const text = stripHTML(verse?.translations?.[0]?.text || verse?.text || verse?.english?.text || verse?.text_uthmani || "");
  const payload = { reference: key, label: formatReferenceKey(key) };
  if (text) payload.text = text.slice(0, 320);
  WidgetData.setLastRead(payload).catch(() => {});
}

async function restoreLastRead() {
  const key = localStorage.getItem("quran-reader-last-read-v1");
  if (!key) {
    setStatus("No last-read ayah saved yet.");
    setTimeout(() => setStatus(""), 1600);
    return;
  }
  state.focusedVerseKey = null;
  try {
    await jumpToReference(key, "smooth", false);
  } catch (error) {
    setStatus(`Could not open the last-read passage. ${error.message}`);
  }
}

async function exportNotes() {
  const buildFolderTree = (parentId = "", ancestors = new Set()) => state.noteFolders
    .filter((folder) => (folder.parentId || "") === parentId && !ancestors.has(folder.id))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      notes: Object.entries(state.notes).filter(([, note]) => (note.folderId || "") === folder.id).map(([key, note]) => ({ key, ...note })),
      folders: buildFolderTree(folder.id, new Set([...ancestors, folder.id])),
    }));
  const payload = {
    format: "abrahamic-books-folder-export-v1",
    exportedAt: new Date().toISOString(),
    notes: state.notes,
    organizer: { viewMode: state.noteViewMode, selectedFolderId: state.selectedFolderId, folders: state.noteFolders, tagCatalog: state.tagCatalog },
    folderStructure: {
      name: "Notes",
      notes: Object.entries(state.notes).filter(([, note]) => !(note.folderId || "")).map(([key, note]) => ({ key, ...note })),
      folders: buildFolderTree(),
    },
  };
  const json = JSON.stringify(payload, null, 2);
  const filename = `abrahamic-books-notes-${new Date().toISOString().slice(0, 10)}.json`;

  if (Capacitor.isNativePlatform()) {
    try {
      await NotesFiles.saveToDownloads({ filename, data: json, mimeType: "application/json" });
      setStatus(`Notes saved to Downloads as ${filename}.`);
      setTimeout(() => setStatus(""), 3200);
      return;
    } catch (error) {
      try {
        const saved = await Filesystem.writeFile({ path: filename, data: json, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
        setStatus(`Downloads was unavailable, so notes were saved to Documents as ${filename}.`);
        await Share.share({ title: "Abrahamic Books notes", text: "Exported notes backup", url: saved.uri, dialogTitle: "Save or share your notes backup" });
        return;
      } catch (fallbackError) { setStatus(`Could not save notes: ${fallbackError.message}`); return; }
    }
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openVerseCopy(key) {
  const verse = state.verses.find((item) => item.verse_key === key);
  if (!verse) return;
  state.copyVerseKey = key;
  els.verseCopySubtitle.textContent = `${formatReferenceKey(key)} · choose one or more versions`;
  renderVerseCopyOptions(verse);
  openDialog(els.verseCopySheet);
}

async function shareVerseDirect(key, button) {
  const url = makePublicLink(`?ref=${encodeURIComponent(key)}`);
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ text: url, dialogTitle: "Share link" });
      showCopiedState(button, "Shared");
      return;
    }
    if (navigator.share) {
      await navigator.share({ text: url });
      showCopiedState(button, "Shared");
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
  }
  const copied = await copyShareLink(url);
  if (copied) {
    showCopiedState(button);
    setStatus("Verse link copied for sharing.");
  } else window.prompt("Copy this verse link:", url);
}

function getVerseCopyChoices(verse) {
  const isQuran = !verse.scripture || verse.scripture === "quran";
  const choices = [];
  const original = isQuran ? getQuranArabicText(verse) : verse.originalText;
  if (original) choices.push({ id: "original", kind: "original", label: isQuran ? "Arabic original" : "Original language", text: String(original) });
  if (isQuran) {
    (verse.translations || []).forEach((translation, index) => {
      const resource = state.translations.find((item) => Number(item.id) === Number(translation.resource_id));
      choices.push({
        id: `translation-${index}`,
        kind: "translation",
        label: resource?.name || `Translation ${index + 1}`,
        detail: resource?.language_name || "Translation",
        text: stripHTML(translation.text || ""),
      });
    });
  } else if (verse.text) {
    choices.push({ id: "translation-0", kind: "translation", label: "Displayed translation", detail: "Translation", text: String(verse.text) });
  }
  return choices.filter((choice) => choice.text.trim());
}

function getQuranArabicText(verse) {
  if (String(verse.text_uthmani || "").trim()) return String(verse.text_uthmani).trim();
  return (verse.words || [])
    .map((word) => word.text_uthmani || word.text || "")
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderVerseCopyOptions(verse) {
  const choices = getVerseCopyChoices(verse);
  els.verseCopyOptions.innerHTML = `<legend>Select original text and translations</legend>${choices.map((choice, index) => `
    <label class="copy-choice">
      <input type="checkbox" value="${escapeHTML(choice.id)}" ${choice.kind === "original" || (!choices.some((item) => item.kind === "original") && index === 0) ? "checked" : ""}>
      <span><strong>${escapeHTML(choice.label)}</strong>${choice.detail ? `<small>${escapeHTML(choice.detail)}</small>` : ""}</span>
      <i class="ti ti-check" aria-hidden="true"></i>
    </label>`).join("")}`;
  els.copyOriginalOnly.disabled = !choices.some((choice) => choice.kind === "original");
  els.copyTranslationOnly.disabled = !choices.some((choice) => choice.kind === "translation");
}

function applyVerseCopyPreset(kind) {
  const verse = state.verses.find((item) => item.verse_key === state.copyVerseKey);
  if (!verse) return;
  const choices = getVerseCopyChoices(verse);
  els.verseCopyOptions.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = choices.find((choice) => choice.id === input.value)?.kind === kind;
  });
}

async function copySelectedVerseText() {
  const verse = state.verses.find((item) => item.verse_key === state.copyVerseKey);
  if (!verse) return;
  const selected = new Set([...els.verseCopyOptions.querySelectorAll('input:checked')].map((input) => input.value));
  const choices = getVerseCopyChoices(verse).filter((choice) => selected.has(choice.id));
  if (!choices.length) {
    setStatus("Choose at least one text to copy.");
    return;
  }
  const text = [formatReferenceKey(state.copyVerseKey), ...choices.map((choice) => `${choice.label}\n${choice.text}`)].join("\n\n");
  const copied = await copyShareLink(text);
  if (copied) {
    showCopiedState(els.copySelectedVerse);
    setStatus("Verse text copied.");
    setTimeout(() => els.verseCopySheet.close(), 500);
  } else window.prompt("Copy verse text:", text);
}

async function copyCurrentVerseLink() {
  if (!state.copyVerseKey) return;
  await shareReference(state.copyVerseKey, els.shareVerseLink);
}

async function shareReference(key, button) {
  const url = makePublicLink(`?ref=${encodeURIComponent(key)}`);
  const copied = await copyShareLink(url);
  if (copied) showCopiedState(button);
  else window.prompt("Copy this verse link:", url);
}

async function shareCurrentNote() {
  openDialog(els.shareNoteSheet);
}

async function shareSnapshotNote() {
  const note = state.notes[state.currentNoteKey];
  if (!note) return;
  const payload = {
    title: note.title || "",
    text: note.text || "",
    tags: note.tags || [],
    references: note.references || [],
  };
  const url = makePublicLink(`note=${encodeBase64Url(JSON.stringify(payload))}`);
  const copied = await copyShareLink(url);
  if (copied) showCopiedState(els.shareNote);
  else window.prompt("Copy this note link:", url);
  els.shareNoteSheet.close();
}

function openCollaborativeShare() {
  if (!notesSystem?.signedIn) {
    els.shareNoteSheet.close();
    openNotesSyncSettings();
    setStatus("Sign in before inviting collaborators.");
    return;
  }
  els.shareNoteSheet.close();
  els.collaboratorEmails.value = "";
  openDialog(els.collaborateSheet);
}

async function createCollaborativeNote() {
  const note = state.notes[state.currentNoteKey];
  if (!note) return;
  const emails = els.collaboratorEmails.value.split(/[,;\s]+/).filter(Boolean);
  try {
    const created = await notesSystem.createSharedNote(note, emails);
    els.collaborateSheet.close();
    switchNotesSection("shared");
    setStatus(`Shared note created${emails.length ? ` for ${emails.length} collaborator${emails.length === 1 ? "" : "s"}` : ""}.`);
    setTimeout(() => openNote(`shared:${created.id}`), 250);
  } catch (error) { setStatus(error.message); }
}

function startSharedNotes() {
  notesSystem.watchSharedNotes((notes) => { state.sharedNotes = notes; renderNotes(); }, (error) => setStatus(`Shared notes: ${error.message}`));
}

function openNotesSyncSettings() {
  const mode = notesSystem.config.mode;
  const radio = document.querySelector(`input[name="notesMode"][value="${mode}"]`);
  if (radio) radio.checked = true;
  if (notesSystem.accountEmail) els.firebaseEmail.value = notesSystem.accountEmail;
  updateSyncUI(mode === "local" ? "saved locally" : notesSystem.user ? "synced" : "offline");
  openDialog(els.notesSyncSheet);
}

async function changeNotesMode(event) {
  await notesSystem.setMode(event.target.value);
  updateSyncUI(event.target.value === "local" ? "saved locally" : "offline");
}

function updateSyncUI(syncState, detail = "") {
  const labels = { "saved locally": "Saved locally", syncing: "Syncing…", synced: "Synced", offline: "Offline", conflict: "Conflict" };
  els.notesSyncLabel.textContent = labels[syncState] || syncState;
  els.notesSyncStatus.dataset.state = syncState;
  const icons = { "saved locally": "ti-device-floppy", syncing: "ti-loader-2", synced: "ti-circle-check", offline: "ti-wifi-off", conflict: "ti-alert-triangle" };
  els.notesSyncIcon.className = `ti ${icons[syncState] || "ti-info-circle"}`;
  const mode = notesSystem?.config.mode || "local";
  els.syncAccountStatus.textContent = mode === "local" ? "Local-only · no account required" : notesSystem?.user ? `Firebase · ${notesSystem.accountEmail}` : "Firebase is not connected";
  if (detail) document.querySelector("#syncHelp").textContent = detail;
}

async function runNotesAction(action) {
  try { await action(); }
  catch (error) { updateSyncUI(navigator.onLine ? "conflict" : "offline", error.message); setStatus(error.message); }
}

async function connectFirebase(createAccount) {
  await runNotesAction(async () => {
    await notesSystem.connect(els.firebaseEmail.value.trim(), els.firebasePassword.value, createAccount);
    startSharedNotes();
    startAccountLastReadSync();
    els.firebasePassword.value = "";
    updateSyncUI("synced", createAccount ? "Firebase account created and notes synced." : "Signed in and synced with Firebase.");
  });
}

async function exportEncryptedBackup() {
  const password = window.prompt("Choose a backup password or recovery key. It is never stored.");
  if (!password) return;
  try {
    const json = await notesSystem.exportBackup(password);
    downloadText(json, `abrahamic-books-encrypted-${new Date().toISOString().slice(0, 10)}.abbackup`);
  } catch (error) { updateSyncUI("conflict", error.message); }
}

function downloadText(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importEncryptedBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const password = window.prompt("Backup password or recovery key (leave blank for an unencrypted backup):") || "";
    const organizer = await notesSystem.importBackup(await file.text(), password);
    if (organizer) applyNotesOrganizer(organizer);
    setStatus("Notes backup imported locally.");
  } catch (error) { setStatus(`Could not import backup: ${error.message}`); }
  event.target.value = "";
}

function makePublicLink(fragment) {
  const isPublicWeb = /^https?:$/.test(location.protocol) && !["localhost", "127.0.0.1"].includes(location.hostname);
  const base = isPublicWeb ? `${location.origin}${location.pathname.replace(/[^/]*$/, "")}` : PUBLIC_APP_URL;
  return fragment.startsWith("?") ? `${base}${fragment}` : `${base}#${fragment}`;
}

function copyShareLink(url) {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(url).then(() => true, () => legacyCopy(url));
  }
  // Run synchronously while the tap still has browser permission. This is
  // important on the public HTTP site and older Android WebViews.
  return Promise.resolve(legacyCopy(url));
}

function legacyCopy(url) {
  const input = document.createElement("textarea");
  input.value = url;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.inset = "0";
  input.style.width = "1px";
  input.style.height = "1px";
  input.style.opacity = "0.01";
  document.body.append(input);
  input.focus({ preventScroll: true });
  input.select();
  input.setSelectionRange(0, input.value.length);
  const copied = document.execCommand("copy");
  input.remove();
  return copied;
}

function showCopiedState(button, label = "Copied") {
  if (!button) return;
  const original = button.innerHTML;
  const originalWidth = button.getBoundingClientRect().width;
  button.style.setProperty("--morph-width", `${originalWidth}px`);
  button.classList.add("active", "button-morph-success");
  button.innerHTML = `<i class="ti ti-check" aria-hidden="true"></i><span class="copied-label">${escapeHTML(label)}</span>`;
  setTimeout(() => {
    button.classList.add("button-morph-returning");
    setTimeout(() => {
    button.innerHTML = original;
      button.classList.remove("active", "button-morph-success", "button-morph-returning");
      button.style.removeProperty("--morph-width");
    }, 180);
  }, 1250);
}

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

async function openSharedLink() {
  const queryParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.slice(1));
  const requestedView = queryParams.get("view");
  if (["readView", "notesView", "searchView"].includes(requestedView)) switchView(requestedView);
  const requestedNote = queryParams.get("note");
  if (requestedNote && state.notes[requestedNote]) openNote(requestedNote);
  if (requestedView === "searchView" && queryParams.get("focus") === "search") {
    requestAnimationFrame(() => els.globalSearch.focus({ preventScroll: true }));
  }
  const reference = queryParams.get("ref") || hashParams.get("ref");
  if (reference) {
    await jumpToReference(reference, "auto");
    return;
  }
  const resumeReference = queryParams.get("at");
  if (resumeReference) {
    await jumpToReference(resumeReference, "auto", false);
    return;
  }
  const referenceCollection = queryParams.get("refs");
  if (referenceCollection) {
    const references = referenceCollection.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 50);
    if (!references.length) { setStatus("This shared passage collection is empty."); return; }
    await showReferenceOverview(references);
    return;
  }
  const encodedNotes = hashParams.get("notes");
  const encodedNote = hashParams.get("note");
  if (!encodedNote && !encodedNotes) return;
  try {
    if (encodedNotes) {
      const sharedCollection = JSON.parse(decodeBase64Url(encodedNotes));
      const items = Array.isArray(sharedCollection?.notes) ? sharedCollection.notes : [];
      if (!items.length) throw new Error("Empty notes collection");
      for (const shared of items.slice(0, 250)) {
        const key = `note:${crypto.randomUUID()}`;
        state.notes[key] = {
          title: String(shared.title || "Shared note"), text: String(shared.text || ""),
          tags: Array.isArray(shared.tags) ? shared.tags.map(String).slice(0, 12) : [],
          references: Array.isArray(shared.references) ? [...new Set(shared.references.map(String))].slice(0, 50) : [],
          createdAt: shared.createdAt || new Date().toISOString(), updatedAt: shared.updatedAt || new Date().toISOString(), standalone: true,
        };
      }
      saveNotes();
      switchView("notesView");
      renderNotes();
      setStatus(`Imported ${items.length} shared ${items.length === 1 ? "note" : "notes"}, including tags and references.`);
      history.replaceState(null, "", `${location.pathname}${location.search}`);
      return;
    }
    const shared = JSON.parse(decodeBase64Url(encodedNote));
    const key = `note:${crypto.randomUUID()}`;
    state.notes[key] = {
      title: String(shared.title || "Shared note"),
      text: String(shared.text || ""),
      tags: Array.isArray(shared.tags) ? shared.tags.map(String).slice(0, 12) : [],
      references: Array.isArray(shared.references) ? [...new Set(shared.references.map(String))].slice(0, 50) : [],
      updatedAt: new Date().toISOString(),
      standalone: true,
    };
    saveNotes();
    switchView("notesView");
    openNote(key);
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  } catch {
    setStatus("This shared note link is invalid.");
  }
}

async function importNotes(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    const organizer = await notesSystem.importBackup(text);
    if (organizer) applyNotesOrganizer(organizer);
    renderVerses(); renderNotes(); setStatus("Imported notes locally.");
    setTimeout(() => setStatus(""), 1600);
  } catch { setStatus("Could not import that notes file."); }
  event.target.value = "";
}

function switchView(viewId, reselectedFromNav = false, currentScrollOverride = null, transition = "section") {
  if (isLandscapeWorkspace()) {
    if (viewId === "notesView" || viewId === "searchView") {
      setWorkspaceTool(viewId);
      return;
    }
    if (viewId === "readView") {
      if (reselectedFromNav) document.body.classList.toggle("workspace-left-collapsed");
      return;
    }
  }
  const isCurrentView = state.currentView === viewId;
  if (isCurrentView) {
    if (reselectedFromNav) {
      state.viewScrollPositions[viewId] = 0;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return;
  }

  const leavingTop = currentScrollOverride ?? window.scrollY;
  if (transition === "section") {
    const viewOrder = ["readView", "searchView", "notesView"];
    transition = viewOrder.indexOf(viewId) >= viewOrder.indexOf(state.currentView) ? "swipe-left" : "swipe-right";
  }
  state.viewScrollPositions[state.currentView] = leavingTop;
  document.querySelector(`#${state.currentView}`)?.setAttribute("data-saved-scroll", String(leavingTop));
  const destinationView = document.querySelector(`#${viewId}`);
  const savedOnView = Number(destinationView?.getAttribute("data-saved-scroll"));
  const restoreTop = Number.isFinite(savedOnView) ? savedOnView : state.viewScrollPositions[viewId] || 0;

  // Finish all destination work while it is still hidden. This keeps a swipe to
  // one visual update instead of revealing the view and then reflowing it.
  if (viewId === "notesView") renderNotes();
  document.body.classList.remove("controls-collapsed", "controls-manually-expanded");
  state.currentView = viewId;
  previousToolbarScrollY = restoreTop;
  viewSwitchingUntil = performance.now() + 120;

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.remove("view-enter", "swipe-left", "swipe-right");
    view.classList.toggle("active", view.id === viewId);
  });
  destinationView?.classList.add("view-enter", transition);
  const finishTransition = () => destinationView?.classList.remove("view-enter", "section", "swipe-left", "swipe-right");
  destinationView?.addEventListener("animationend", finishTransition, { once: true });
  setTimeout(finishTransition, 440);
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));

  // scrollTo forces the newly displayed view to lay out before the browser can
  // paint it, so the user never sees an intermediate scroll position.
  window.scrollTo({ top: restoreTop, behavior: "auto" });
  requestAnimationFrame(syncUrlState);
}

function isLandscapeWorkspace() {
  return window.matchMedia("(min-width: 960px) and (orientation: landscape)").matches;
}

function setupResponsiveWorkspace() {
  const main = document.querySelector("main");
  const readView = document.querySelector("#readView");
  const notesView = document.querySelector("#notesView");
  const searchView = document.querySelector("#searchView");
  if (!main || !readView || !notesView || !searchView || document.querySelector("#workspaceLeft")) return;

  const left = document.createElement("aside");
  left.id = "workspaceLeft";
  left.className = "workspace-pane workspace-left";
  left.innerHTML = `
    <div class="workspace-pane-head">
      <div class="workspace-tabs" role="tablist" aria-label="Research tools">
        <button type="button" role="tab" data-workspace-tool="notesView">Notes</button>
        <button type="button" role="tab" data-workspace-tool="searchView">Search</button>
      </div>
      <button class="workspace-collapse" type="button" data-collapse-pane="left" aria-label="Collapse notes and search panel">‹</button>
    </div>`;
  left.append(notesView, searchView);

  const right = document.createElement("aside");
  right.id = "workspaceRight";
  right.className = "workspace-pane workspace-right";
  right.innerHTML = `<div class="workspace-pane-head workspace-filter-head"><strong>Reading filters</strong><button class="workspace-collapse" type="button" data-collapse-pane="right" aria-label="Collapse reading filters">›</button></div>`;

  const leftDivider = document.createElement("div");
  leftDivider.className = "workspace-divider workspace-divider-left";
  leftDivider.dataset.resizePane = "left";
  leftDivider.setAttribute("role", "separator");
  leftDivider.setAttribute("aria-orientation", "vertical");
  leftDivider.setAttribute("aria-label", "Resize notes and search panel");

  const rightDivider = document.createElement("div");
  rightDivider.className = "workspace-divider workspace-divider-right";
  rightDivider.dataset.resizePane = "right";
  rightDivider.setAttribute("role", "separator");
  rightDivider.setAttribute("aria-orientation", "vertical");
  rightDivider.setAttribute("aria-label", "Resize reading filters");

  main.prepend(left);
  readView.after(leftDivider, rightDivider, right);

  const controls = readView.querySelector(".reader-controls");
  const quickActions = readView.querySelector(".quick-actions");
  [controls, quickActions].forEach((node) => {
    if (!node) return;
    const marker = document.createComment(`workspace-${node.className}`);
    node.before(marker);
    node._workspaceMarker = marker;
  });

  const media = window.matchMedia("(min-width: 960px) and (orientation: landscape)");
  const sync = () => {
    const active = media.matches;
    document.body.classList.toggle("landscape-workspace", active);
    if (active) {
      [controls, quickActions].forEach((node) => node && right.append(node));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
      readView.classList.add("active");
      setWorkspaceTool(state.workspaceTool, false);
      document.body.classList.remove("controls-collapsed", "controls-manually-expanded");
    } else {
      [controls, quickActions].forEach((node) => node?._workspaceMarker?.after(node));
      document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === state.currentView));
      document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === state.currentView));
      document.body.classList.remove("workspace-left-collapsed", "workspace-right-collapsed", "workspace-tool-collapsed", "workspace-tool-manually-expanded");
    }
    syncStickyOffset();
  };
  media.addEventListener("change", sync);
  sync();

  left.querySelectorAll("[data-workspace-tool]").forEach((button) => button.addEventListener("click", () => setWorkspaceTool(button.dataset.workspaceTool)));
  let workspaceScrollFrame = false;
  left.addEventListener("scroll", () => {
    state.workspaceToolScroll[state.workspaceTool] = left.scrollTop;
    if (workspaceScrollFrame) return;
    workspaceScrollFrame = true;
    requestAnimationFrame(() => {
      updateWorkspaceToolbar(left.scrollTop);
      if (state.workspaceTool === "searchView") updateSearchJumpActive();
      workspaceScrollFrame = false;
    });
  }, { passive: true });
  document.querySelectorAll("[data-collapse-pane]").forEach((button) => button.addEventListener("click", () => {
    document.body.classList.toggle(`workspace-${button.dataset.collapsePane}-collapsed`);
  }));
  setupWorkspaceResizer(leftDivider, "left");
  setupWorkspaceResizer(rightDivider, "right");
  leftDivider.addEventListener("click", () => document.body.classList.remove("workspace-left-collapsed"));
  rightDivider.addEventListener("click", () => document.body.classList.remove("workspace-right-collapsed"));
}

function setWorkspaceTool(viewId, focus = true) {
  const nextTool = viewId === "searchView" ? "searchView" : "notesView";
  const pane = document.querySelector("#workspaceLeft");
  if (pane && state.workspaceTool !== nextTool) state.workspaceToolScroll[state.workspaceTool] = pane.scrollTop;
  state.workspaceTool = nextTool;
  document.querySelectorAll("#workspaceLeft .view").forEach((view) => view.classList.toggle("workspace-active", view.id === state.workspaceTool));
  document.querySelectorAll("[data-workspace-tool]").forEach((button) => {
    const active = button.dataset.workspaceTool === state.workspaceTool;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.body.classList.remove("workspace-left-collapsed");
  document.body.classList.remove("workspace-tool-manually-expanded");
  if (state.workspaceTool === "notesView") renderNotes();
  requestAnimationFrame(() => {
    pane?.scrollTo({ top: state.workspaceToolScroll[state.workspaceTool] || 0, behavior: "auto" });
    updateSearchJumpActive();
  });
  if (focus) document.querySelector(state.workspaceTool === "notesView" ? "#notesSearch" : "#globalSearch")?.focus({ preventScroll: true });
}

function setupWorkspaceResizer(divider, pane) {
  const storageKey = `quran-workspace-${pane}-width`;
  const saved = Number(localStorage.getItem(storageKey));
  if (saved) document.documentElement.style.setProperty(`--workspace-${pane}-width`, `${saved}px`);
  divider.addEventListener("pointerdown", (event) => {
    if (!isLandscapeWorkspace()) return;
    event.preventDefault();
    divider.setPointerCapture?.(event.pointerId);
    document.body.classList.add("workspace-resizing");
    const move = (moveEvent) => {
      const viewport = document.documentElement.clientWidth;
      const value = pane === "left" ? moveEvent.clientX : viewport - moveEvent.clientX;
      const min = pane === "left" ? 240 : 210;
      const max = pane === "left" ? viewport * 0.36 : viewport * 0.3;
      const width = Math.round(Math.min(max, Math.max(min, value)));
      document.documentElement.style.setProperty(`--workspace-${pane}-width`, `${width}px`);
      localStorage.setItem(storageKey, String(width));
    };
    const end = () => {
      document.body.classList.remove("workspace-resizing");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  });
}

async function runGlobalSearch() {
  const query = els.globalSearch.value.trim();
  const selectedSources = new Set(state.selectedSearchSources);
  const token = Date.now();
  state.searchAbort = token;
  clearSearchSelection();
  state.searchResults = [];

  if (query.length < 2) {
    els.searchSummary.textContent = "Enter at least 2 characters";
    els.searchResults.innerHTML = "";
    renderSearchBookIndex([], "Enter a search to see matching books");
    return;
  }

  if (!selectedSources.size) {
    els.searchSummary.textContent = "Choose at least one book to search";
    els.searchResults.innerHTML = `<div class="status">Open “Search in” and select one or more downloaded books.</div>`;
    renderSearchBookIndex([], "Choose one or more books");
    return;
  }

  els.runSearch.disabled = true;
  els.searchSummary.textContent = "Searching offline bundle...";
  els.searchResults.innerHTML = `<div class="status live-search-status"><span aria-hidden="true"></span>Searching bundled texts...</div>`;
  renderSearchBookIndex([], "Searching selected books…");
  const liveRenderer = createLiveSearchRenderer(query, token);

  try {
    const results = await searchOfflineTexts(query, selectedSources, token, (result) => liveRenderer.add(result));
    if (state.searchAbort !== token) return;
    liveRenderer.stop();
    renderSearchResults(results, query);
  } catch (error) {
    liveRenderer.stop();
    els.searchResults.innerHTML = `<div class="status">${escapeHTML(error.message)}</div>`;
    els.searchSummary.textContent = "Search failed";
  } finally {
    if (state.searchAbort === token) els.runSearch.disabled = false;
  }
}

async function searchOfflineTexts(query, selectedSources, token, onResult) {
  const expression = parseSearchExpression(query);
  const results = [];
  const pushResult = (_sourceId, result) => {
    const haystack = normalizeSearchText(`${result.title} ${result.label} ${result.text} ${result.extra || ""}`);
    if (expression.matches(haystack)) {
      results.push(result);
      onResult?.(result);
    }
  };
  const shouldStop = () => state.searchAbort !== token;

  if (selectedSources.has("quran")) {
    for (let chapter = 1; chapter <= 114 && !shouldStop(); chapter += 1) {
      const data = await getOfflineJSON(`quran/chapter-${chapter}.json`).catch(() => null);
      for (const verse of data?.verses || []) {
        pushResult("quran", {
          key: verse.verse_key,
          type: "Quran",
          title: `Quran ${verse.verse_key}`,
          label: getChapter(chapter)?.name_simple || `Surah ${chapter}`,
          book: "Quran",
          text: [verse.text_uthmani, ...(verse.translations || []).map((item) => stripHTML(item.text))].filter(Boolean).join(" "),
        });
        if (shouldStop()) break;
      }
    }
  }

  if (selectedSources.has("tafsir")) {
    for (let chapter = 1; chapter <= 114 && !shouldStop(); chapter += 1) {
      const data = await getOfflineJSON(`tafsir/${OFFLINE.defaultTafsir}/chapter-${chapter}.json`).catch(() => null);
      for (const [key, item] of Object.entries(data || {})) {
        pushResult("tafsir", {
          key,
          type: "Tafsir",
          title: `Tafsir ${key}`,
          label: getChapter(chapter)?.name_simple || `Surah ${chapter}`,
          book: "Tafsir",
          text: stripHTML(item?.tafsir?.text || ""),
        });
        if (shouldStop()) break;
      }
    }
  }

  for (const sourceId of selectedSources) {
    if (shouldStop()) break;
    if (sourceId.startsWith("translation:")) {
      const translationId = Number(sourceId.split(":")[1]);
      const resource = state.translations.find((item) => item.id === translationId);
      for (let chapter = 1; chapter <= 114 && !shouldStop(); chapter += 1) {
        const url = `${API}/verses/by_chapter/${chapter}?language=en&words=true&translations=${translationId}&per_page=300&word_fields=text_uthmani,translation,transliteration`;
        const response = await caches.match(url);
        if (!response) continue;
        const data = await response.json().catch(() => null);
        for (const verse of data?.verses || []) {
          const text = (verse.translations || []).find((item) => Number(item.resource_id) === translationId)?.text || "";
          pushResult(sourceId, {
            key: verse.verse_key,
            type: "Quran",
            title: `Quran ${verse.verse_key}`,
            label: resource?.name || `Translation ${translationId}`,
            book: resource?.name || `Quran translation ${translationId}`,
            text: stripHTML(text),
          });
        }
      }
    }

    if (sourceId.startsWith("tafsir:")) {
      const tafsirId = Number(sourceId.split(":")[1]);
      const resource = state.tafsirs.find((item) => item.id === tafsirId);
      for (let chapter = 1; chapter <= 114 && !shouldStop(); chapter += 1) {
        const response = await caches.match(`${location.origin}${location.pathname}offline-downloads/tafsir/${tafsirId}/${chapter}.json`);
        if (!response) continue;
        const data = await response.json().catch(() => null);
        for (const item of data?.tafsirs || []) {
          pushResult(sourceId, {
            key: item.verse_key,
            type: "Tafsir",
            sourceId,
            title: `Tafsir ${item.verse_key}`,
            label: resource?.name || `Tafsir ${tafsirId}`,
            book: resource?.name || `Tafsir ${tafsirId}`,
            text: stripHTML(item.text || item.tafsir?.text || ""),
          });
        }
      }
    }

    if (sourceId.startsWith("commentary:")) {
      const commentaryId = sourceId.slice("commentary:".length);
      const resource = state.commentaries.find((item) => item.id === commentaryId);
      for (const [book, chapters] of [...OLD_TESTAMENT, ...NEW_TESTAMENT]) {
        const bookId = BOOK_IDS[book];
        for (let chapter = 1; chapter <= chapters && !shouldStop(); chapter += 1) {
          const url = `https://bible.helloao.org/api/c/${commentaryId}/${bookId}/${chapter}.json`;
          const response = await caches.match(url);
          if (!response) continue;
          const data = await response.json().catch(() => null);
          for (const entry of data?.chapter?.content || []) {
            if (entry.type !== "verse") continue;
            const text = Array.isArray(entry.content) ? entry.content.join(" ") : String(entry.content || "");
            pushResult(sourceId, {
              key: bibleKey(book, chapter, Number(entry.number)),
              type: "Commentary",
              sourceId,
              title: `${book} ${chapter}:${entry.number}`,
              label: resource?.name || commentaryId,
              book: resource?.name || commentaryId,
              text,
            });
          }
        }
      }
    }
  }

  if ([...selectedSources].some((id) => id.startsWith("bible:"))) {
    const groups = [["old", OLD_TESTAMENT], ["new", NEW_TESTAMENT]];
    for (const [testament, books] of groups) {
      for (const [book, chapters] of books) {
        const bookId = BOOK_IDS[book];
        const sourceId = `bible:${testament}:${bookId}`;
        if (!selectedSources.has(sourceId)) continue;
        for (let chapter = 1; chapter <= chapters && !shouldStop(); chapter += 1) {
          const data = await getOfflineJSON(`bible/${testament}-${bookId}-${chapter}.json`).catch(() => null);
          const originalByVerse = new Map(extractBibleVerses(data?.original).map((verse) => [verse.number, verse.text]));
          for (const verse of extractBibleVerses(data?.english)) {
            pushResult(sourceId, {
              key: bibleKey(book, chapter, verse.number),
              type: testament === "old" ? "Old Testament" : "New Testament",
              title: `${book} ${chapter}:${verse.number}`,
              label: "World English Bible",
              book,
              text: verse.text,
              extra: originalByVerse.get(verse.number) || "",
            });
            if (shouldStop()) break;
          }
        }
      }
    }
  }

  if ([...selectedSources].some((id) => id.startsWith("hadith:"))) {
    for (const book of state.hadithBooks) {
      const sourceId = `hadith:${book.key}`;
      if (!selectedSources.has(sourceId)) continue;
      if (book.source === "thaqalayn") {
        const records = await getOfflineJSON(`hadith-search/${book.key}.json`).catch(() => []);
        for (const item of records) {
            pushResult(sourceId, {
              key: hadithKey(book.key, item.section, item.id),
              type: "Shia Hadith",
              title: `${book.name} · Hadith ${item.id}`,
              label: item.chapter || `Hadith ${item.id}`,
              book: book.name,
              text: item.text || "",
              extra: item.arabic || "",
            });
            if (shouldStop()) break;
        }
        continue;
      }
      const sectionMap = state.hadithInfo?.[book.key]?.metadata?.sections || {};
      const sectionIds = Object.keys(sectionMap).map(Number).filter((item) => item > 0).sort((a, b) => a - b);
      for (const section of sectionIds) {
        if (shouldStop()) break;
        const data = await getOfflineJSON(`hadith/${book.key}/section-${section}.json`).catch(() => null);
        const arabicByNumber = new Map((data?.arabic?.hadiths || []).map((item) => [Number(item.hadithnumber), item.text]));
        for (const item of data?.english?.hadiths || []) {
          pushResult(sourceId, {
            key: hadithKey(book.key, section, item.hadithnumber),
            type: "Hadith",
            title: `${book.name} ${item.hadithnumber}`,
            label: sectionMap[section] || `Section ${section}`,
            book: book.name,
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

function createLiveSearchRenderer(query, token) {
  const queue = [];
  const groups = new Map();
  let frame = 0;
  let count = 0;
  let started = false;
  const flush = () => {
    frame = 0;
    if (state.searchAbort !== token) return;
    if (!started) {
      els.searchResults.innerHTML = `<div class="live-search-grid" aria-live="polite"></div>`;
      started = true;
    }
    // Keep each paint small so controls remain responsive even for common words.
    const batch = queue.splice(0, 24);
    const grid = els.searchResults.querySelector(".live-search-grid");
    batch.forEach((result) => {
      const book = result.book || result.type;
      if (!groups.has(book)) {
        const index = groups.size;
        grid?.insertAdjacentHTML("beforeend", `<section class="search-book-group" id="search-book-${index}" data-book="${escapeHTML(book)}"><div class="search-book-results"></div></section>`);
        groups.set(book, { index, count: 0 });
      }
      const group = groups.get(book);
      group.count += 1;
      grid?.querySelector(`#search-book-${group.index} .search-book-results`)?.insertAdjacentHTML("beforeend", `
        <article class="search-result live-result" data-search-id="${escapeHTML(result.searchId)}">
          <label class="search-check" aria-label="Select ${escapeHTML(result.title)}">
            <input type="checkbox" ${state.selectedSearchResults.has(result.searchId) ? "checked" : ""}>
            <span aria-hidden="true"></span>
          </label>
          <button type="button" data-key="${escapeHTML(result.key)}" data-type="${escapeHTML(result.type)}">
            <span>${escapeHTML(result.type)}</span>
            <strong>${highlightSearchText(result.title, query)}</strong>
            <small>${highlightSearchText(result.label || "", query)}</small>
            <p>${highlightSearchText(makeSnippet(result.text || result.extra || "", query), query)}</p>
          </button>
        </article>`);
    });
    renderSearchBookIndex([...groups].map(([book, group]) => [book, group.count]), "Searching selected books…", true);
    if (queue.length) frame = requestAnimationFrame(flush);
  };
  return {
    add(result) {
      count += 1;
      const liveResult = { ...result, searchId: `${result.type}:${result.key}:${count - 1}` };
      state.searchResults.push(liveResult);
      queue.push(liveResult);
      els.searchSummary.textContent = `${count} result${count === 1 ? "" : "s"} so far for "${query}"`;
      if (!frame) frame = requestAnimationFrame(flush);
    },
    stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      queue.length = 0;
    },
  };
}

function renderSearchResults(results, query, searching = false) {
  results = Array.isArray(results) ? results.filter((result) => result && result.key) : [];
  state.searchResults = results.map((result, index) => ({ ...result, searchId: `${result.type}:${result.key}:${index}` }));
  const groups = new Map();
  state.searchResults.forEach((result) => {
    const book = result.book || result.type;
    if (!groups.has(book)) groups.set(book, []);
    groups.get(book).push(result);
  });
  els.searchSummary.textContent = results.length
    ? `${results.length} result${results.length === 1 ? "" : "s"}${searching ? " so far" : ""} for "${query}"`
    : `No offline results for "${query}"`;
  els.searchResults.innerHTML = state.searchResults.length
    ? [...groups.entries()].map(([book, bookResults], groupIndex) => `
      <section class="search-book-group" id="search-book-${groupIndex}" data-book="${escapeHTML(book)}">
        <div class="search-book-heading">
          <div><span>Book</span><strong>${escapeHTML(book)}</strong></div>
          <small>${bookResults.length} result${bookResults.length === 1 ? "" : "s"}</small>
        </div>
        <div class="search-book-results">
          ${bookResults.map((result) => `
            <article class="search-result" data-search-id="${escapeHTML(result.searchId)}">
              <label class="search-check" aria-label="Select ${escapeHTML(result.title)}">
                <input type="checkbox" ${state.selectedSearchResults.has(result.searchId) ? "checked" : ""}>
                <span aria-hidden="true"></span>
              </label>
              <button type="button" data-key="${escapeHTML(result.key)}" data-type="${escapeHTML(result.type)}">
                <span>${escapeHTML(result.type)}</span>
                <strong>${highlightSearchText(result.title, query)}</strong>
                <small>${highlightSearchText(result.label || "", query)}</small>
                <p>${highlightSearchText(makeSnippet(result.text || result.extra || "", query), query)}</p>
              </button>
            </article>
          `).join("")}
        </div>
      </section>
    `).join("")
    : searching
      ? `<div class="status live-search-status"><span aria-hidden="true"></span>Searching bundled texts...</div>`
      : `<div class="search-empty" role="status"><span aria-hidden="true">⌕</span><strong>No matches yet</strong><p>Try a shorter phrase, another spelling, or choose more downloaded books in “Search in”.</p></div>`;

  renderSearchBookIndex([...groups.entries()].map(([book, bookResults]) => [book, bookResults.length]), results.length ? "" : "No matching books");
  bindRenderedSearchResults();
  updateSearchSelectionUI();
  updateSearchJumpActive();
}

function renderSearchBookIndex(entries, placeholder = "Matching books will appear here", preservePosition = false) {
  els.searchBookIndex.hidden = false;
  if (preservePosition && entries.length) {
    const rail = els.searchBookIndex.querySelector(":scope > div");
    rail?.querySelector(".book-index-placeholder")?.remove();
    entries.forEach(([book, resultCount], index) => {
      let button = rail?.querySelector(`[data-group-index="${index}"]`);
      if (!button) {
        rail?.insertAdjacentHTML("beforeend", `<button type="button" data-group-index="${index}">${escapeHTML(book)} <span>${resultCount}</span></button>`);
        button = rail?.querySelector(`[data-group-index="${index}"]`);
        button?.addEventListener("click", () => scrollToSearchBook(index));
      } else {
        button.querySelector("span").textContent = String(resultCount);
      }
    });
    return;
  }
  els.searchBookIndex.innerHTML = `
    <span class="book-index-title">Jump to</span>
    <div>${entries.length ? entries.map(([book, resultCount], index) => `
      <button type="button" data-group-index="${index}">${escapeHTML(book)} <span>${resultCount}</span></button>
    `).join("") : `<span class="book-index-placeholder">${escapeHTML(placeholder)}</span>`}</div>`;
  els.searchBookIndex.querySelectorAll("[data-group-index]").forEach((button) => {
    button.addEventListener("click", () => scrollToSearchBook(Number(button.dataset.groupIndex)));
  });
}

function bindRenderedSearchResults() {
  if (els.searchResults.dataset.navigationBound === "true") return;
  els.searchResults.dataset.navigationBound = "true";
  els.searchResults.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-key]");
    if (!button || !els.searchResults.contains(button)) return;
    const card = button.closest(".search-result");
    if (state.searchSelectMode) {
      toggleSearchResult(card.dataset.searchId);
      return;
    }
    jumpToReference(button.dataset.key);
  });
  els.searchResults.addEventListener("change", (event) => {
    const checkbox = event.target.closest(".search-check input");
    if (!checkbox || !els.searchResults.contains(checkbox)) return;
    toggleSearchResult(checkbox.closest(".search-result").dataset.searchId, checkbox.checked);
  });
}

function scrollToSearchBook(index) {
  const target = document.querySelector(`#search-book-${index}`);
  if (!target) return;
  if (isLandscapeWorkspace()) {
    const pane = document.querySelector("#workspaceLeft");
    const sticky = els.searchBookIndex.getBoundingClientRect().height || 0;
    pane?.scrollTo({ top: Math.max(0, target.offsetTop - sticky - 66), behavior: "smooth" });
    return;
  }
  const topbar = els.topbar?.getBoundingClientRect().height || 0;
  const toolbar = document.querySelector("#searchView .view-toolbar")?.getBoundingClientRect().height || 0;
  const indexHeight = els.searchBookIndex.getBoundingClientRect().height || 0;
  const top = target.getBoundingClientRect().top + window.scrollY - topbar - toolbar - indexHeight - 18;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function updateSearchJumpActive() {
  if ((!isLandscapeWorkspace() && state.currentView !== "searchView") || els.searchBookIndex.hidden) return;
  if (isLandscapeWorkspace() && state.workspaceTool !== "searchView") return;
  if (isLandscapeWorkspace()) {
    const pane = document.querySelector("#workspaceLeft");
    const offset = (pane?.getBoundingClientRect().top || 0) + els.searchBookIndex.getBoundingClientRect().height + 58;
    const groups = [...els.searchResults.querySelectorAll(".search-book-group")];
    let active = 0;
    groups.forEach((group, index) => { if (group.getBoundingClientRect().top <= offset) active = index; });
    els.searchBookIndex.querySelectorAll("[data-group-index]").forEach((button, index) => {
      button.classList.toggle("active", index === active);
      if (index === active && state.activeSearchGroup !== active) {
        const rail = button.parentElement;
        rail.scrollTo({ left: Math.max(0, button.offsetLeft - (rail.clientWidth - button.offsetWidth) / 2), behavior: "auto" });
      }
    });
    state.activeSearchGroup = active;
    return;
  }
  const offset = (els.topbar?.getBoundingClientRect().height || 0)
    + (document.querySelector("#searchView .view-toolbar")?.getBoundingClientRect().height || 0)
    + (els.searchBookIndex.getBoundingClientRect().height || 0) + 26;
  const groups = [...els.searchResults.querySelectorAll(".search-book-group")];
  let active = 0;
  groups.forEach((group, index) => {
    if (group.getBoundingClientRect().top <= offset) active = index;
  });
  els.searchBookIndex.querySelectorAll("[data-group-index]").forEach((button, index) => {
    button.classList.toggle("active", index === active);
    if (index === active && state.activeSearchGroup !== active) {
      const rail = button.parentElement;
      const left = button.offsetLeft - (rail.clientWidth - button.offsetWidth) / 2;
      rail.scrollTo({ left: Math.max(0, left), behavior: "auto" });
    }
  });
  state.activeSearchGroup = active;
}

async function openSearchTafsir(key, searchId) {
  const parsed = parseReferenceKey(key);
  if (parsed.type !== "quran") return;
  state.scripture = "quran";
  state.selectedChapter = parsed.chapter;
  const result = state.searchResults.find((item) => item.searchId === searchId);
  state.selectedTafsir = Number(result?.sourceId?.split(":")[1]) || OFFLINE.defaultTafsir;
  savePrefs();
  await openTafsir(key);
}

async function openSearchCommentary(key, searchId) {
  const result = state.searchResults.find((item) => item.searchId === searchId);
  state.selectedCommentary = result?.sourceId?.slice("commentary:".length) || state.selectedCommentary;
  savePrefs();
  await openBibleCommentary(key);
}

function syncStickyOffset() {
  const height = Math.ceil(els.topbar?.getBoundingClientRect().height || 0);
  document.documentElement.style.setProperty("--topbar-height", `${height}px`);
}

function getSearchSourceGroups() {
  const tafsir = state.tafsirs.find((item) => item.id === OFFLINE.defaultTafsir);
  const downloadedTranslations = readDownloaded(STORE.downloadedTranslations)
    .filter((id) => Number(id) !== OFFLINE.defaultTranslation)
    .map((id) => state.translations.find((item) => item.id === Number(id)))
    .filter(Boolean)
    .map((item) => ({ id: `translation:${item.id}`, label: item.name, meta: `${item.language_name} Quran translation` }));
  const downloadedTafsirs = readDownloaded(STORE.downloadedTafsirs)
    .filter((id) => Number(id) !== OFFLINE.defaultTafsir)
    .map((id) => state.tafsirs.find((item) => item.id === Number(id)))
    .filter(Boolean)
    .map((item) => ({ id: `tafsir:${item.id}`, label: item.name, meta: `${item.language_name} tafsir` }));
  const downloadedCommentaries = readDownloaded(STORE.downloadedCommentaries)
    .map((id) => state.commentaries.find((item) => item.id === String(id)))
    .filter(Boolean)
    .map((item) => ({ id: `commentary:${item.id}`, label: item.name, meta: `${item.languageName || "English"} Bible commentary` }));
  const bibleItems = (type, books) => books.map(([book]) => ({
    id: `bible:${type}:${BOOK_IDS[book]}`,
    label: book,
    meta: type === "old" ? "Old Testament" : "New Testament",
  }));
  const hadithItems = state.hadithBooks
    .filter((book) => book.source === "thaqalayn" || BUNDLED_HADITH_COLLECTIONS.has(book.key))
    .map((book) => ({ id: `hadith:${book.key}`, label: book.name, meta: `${book.tradition} hadith` }));
  return [
    { id: "quran", label: "Quran & commentary", items: [
      { id: "quran", label: "Quran", meta: "Arabic and translation" },
      { id: "tafsir", label: tafsir?.name || "Tafsir", meta: "Downloaded commentary" },
      ...downloadedTranslations,
      ...downloadedTafsirs,
    ] },
    ...(downloadedCommentaries.length ? [{ id: "commentary", label: "Downloaded commentaries", items: downloadedCommentaries }] : []),
    { id: "old", label: "Old Testament", items: bibleItems("old", OLD_TESTAMENT) },
    { id: "new", label: "New Testament", items: bibleItems("new", NEW_TESTAMENT) },
    { id: "hadith", label: "Hadith collections", items: hadithItems },
  ];
}

function readDownloaded(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function rememberDownloaded(key, id) {
  const values = new Set(readDownloaded(key).map(String));
  values.add(String(id));
  localStorage.setItem(key, JSON.stringify([...values]));
}

function refreshSearchSources() {
  const available = getSearchSourceGroups().flatMap((group) => group.items.map((item) => item.id));
  available.forEach((id) => state.selectedSearchSources.add(id));
  savePrefs();
  renderSearchSourceFilters();
}

function initializeSearchSources() {
  const available = new Set(getSearchSourceGroups().flatMap((group) => group.items.map((item) => item.id)));
  state.selectedSearchSources = state.savedSearchSources === null
    ? new Set(available)
    : new Set(state.savedSearchSources.filter((id) => available.has(id)));
  updateSearchSourceSummary();
}

function renderSearchSourceFilters() {
  const query = els.sourceFilterSearch.value.trim().toLowerCase();
  const groups = getSearchSourceGroups();
  els.sourceFilterList.innerHTML = groups.map((group) => {
    const visible = group.items.filter((item) => !query || `${item.label} ${item.meta}`.toLowerCase().includes(query));
    if (!visible.length) return "";
    const selectedInGroup = group.items.filter((item) => state.selectedSearchSources.has(item.id)).length;
    return `
      <section class="source-group">
        <div class="source-group-heading">
          <div><strong>${escapeHTML(group.label)}</strong><span>${selectedInGroup} of ${group.items.length}</span></div>
          <button class="source-group-toggle" type="button" data-group="${escapeHTML(group.id)}">${selectedInGroup === group.items.length ? "Clear" : "Select all"}</button>
        </div>
        <div class="source-options">
          ${visible.map((item) => `
            <label class="source-option ${state.selectedSearchSources.has(item.id) ? "selected" : ""}">
              <input type="checkbox" value="${escapeHTML(item.id)}" ${state.selectedSearchSources.has(item.id) ? "checked" : ""}>
              <span class="source-checkmark" aria-hidden="true"></span>
              <span><strong>${escapeHTML(item.label)}</strong><small>${escapeHTML(item.meta)}</small></span>
            </label>
          `).join("")}
        </div>
      </section>
    `;
  }).join("") || `<div class="status">No downloaded book matches that name.</div>`;

  els.sourceFilterList.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) state.selectedSearchSources.add(input.value);
      else state.selectedSearchSources.delete(input.value);
      savePrefs();
      renderSearchSourceFilters();
      updateSearchSourceSummary();
    });
  });
  els.sourceFilterList.querySelectorAll("[data-group]").forEach((button) => {
    button.addEventListener("click", () => toggleSearchSourceGroup(button.dataset.group));
  });
  updateSearchSourceSummary();
}

function toggleSearchSourceGroup(groupId) {
  const group = getSearchSourceGroups().find((item) => item.id === groupId);
  if (!group) return;
  const allSelected = group.items.every((item) => state.selectedSearchSources.has(item.id));
  group.items.forEach((item) => allSelected ? state.selectedSearchSources.delete(item.id) : state.selectedSearchSources.add(item.id));
  savePrefs();
  renderSearchSourceFilters();
}

function setAllSearchSources(selected) {
  state.selectedSearchSources = selected
    ? new Set(getSearchSourceGroups().flatMap((group) => group.items.map((item) => item.id)))
    : new Set();
  savePrefs();
  renderSearchSourceFilters();
}

function updateSearchSourceSummary() {
  const all = getSearchSourceGroups().flatMap((group) => group.items);
  const selected = all.filter((item) => state.selectedSearchSources.has(item.id));
  els.searchFilterSummary.textContent = selected.length === all.length
    ? `All ${all.length} downloaded books`
    : selected.length === 0
      ? "No books selected"
      : `${selected.length} of ${all.length} books`;
  els.sourceFilterSubtitle.textContent = `${selected.length} selected · ${all.length - selected.length} excluded`;
  els.searchFilterButton.classList.toggle("empty", selected.length === 0);
}

function toggleSearchSelectMode(force = !state.searchSelectMode) {
  state.searchSelectMode = force;
  if (!state.searchSelectMode) state.selectedSearchResults.clear();
  updateSearchSelectionUI();
}

function installLongPress(container, selector, onLongPress) {
  let timer = null;
  let pressedItem = null;
  let startX = 0;
  let startY = 0;
  let blockClickUntil = 0;

  const cancel = () => {
    clearTimeout(timer);
    timer = null;
    pressedItem = null;
  };

  container.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("input, textarea, select, label")) return;
    pressedItem = event.target.closest(selector);
    if (!pressedItem) return;
    startX = event.clientX;
    startY = event.clientY;
    const item = pressedItem;
    timer = setTimeout(() => {
      timer = null;
      blockClickUntil = performance.now() + 700;
      navigator.vibrate?.(25);
      const beforeTop = item.getBoundingClientRect().top;
      onLongPress(item);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!item.isConnected) return;
        const delta = item.getBoundingClientRect().top - beforeTop;
        if (Math.abs(delta) < 0.5) return;
        if (isLandscapeWorkspace()) {
          const pane = item.closest("#workspaceLeft, #readView");
          if (pane) pane.scrollTop += delta;
        } else {
          window.scrollBy({ top: delta, behavior: "auto" });
        }
      }));
    }, 520);
  });
  container.addEventListener("pointermove", (event) => {
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > 10) cancel();
  }, { passive: true });
  container.addEventListener("pointerup", cancel, { passive: true });
  container.addEventListener("pointercancel", cancel, { passive: true });
  container.addEventListener("contextmenu", (event) => {
    if (event.target.closest(selector)) event.preventDefault();
  });
  container.addEventListener("click", (event) => {
    if (performance.now() > blockClickUntil || !event.target.closest(selector)) return;
    blockClickUntil = 0;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}

function toggleReadVerse(key, force) {
  const shouldSelect = force ?? !state.selectedReadVerses.has(key);
  if (shouldSelect) state.selectedReadVerses.add(key);
  else state.selectedReadVerses.delete(key);
  updateReadSelectionUI();
}

function selectAllReadVerses() {
  const visible = state.focusedVerseKey
    ? state.verses.filter((verse) => verse.verse_key === state.focusedVerseKey)
    : state.verses;
  const allSelected = visible.length > 0 && visible.every((verse) => state.selectedReadVerses.has(verse.verse_key));
  state.selectedReadVerses = allSelected ? new Set() : new Set(visible.map((verse) => verse.verse_key));
  updateReadSelectionUI();
}

function clearReadSelection() {
  state.selectedReadVerses.clear();
  updateReadSelectionUI();
}

function exitReadSelectMode() {
  state.readSelectMode = false;
  state.selectedReadVerses.clear();
  updateReadSelectionUI();
}

function updateReadSelectionUI() {
  const count = state.selectedReadVerses.size;
  els.verses.classList.toggle("selecting", state.readSelectMode);
  els.readSelectionBar.hidden = !state.readSelectMode;
  els.readSelectionCount.textContent = `${count} selected`;
  els.noteReadSelection.disabled = count === 0;
  els.shareReadSelection.disabled = count === 0;
  const visible = state.focusedVerseKey
    ? state.verses.filter((verse) => verse.verse_key === state.focusedVerseKey)
    : state.verses;
  const allSelected = visible.length > 0 && visible.every((verse) => state.selectedReadVerses.has(verse.verse_key));
  els.selectAllRead.innerHTML = `<i class="ti ti-${allSelected ? "square-minus" : "checks"}" aria-hidden="true"></i><span>${allSelected ? "Deselect all" : "Select all"}</span>`;
  els.verses.querySelectorAll(".ayah-card").forEach((card) => {
    card.classList.toggle("selected", state.selectedReadVerses.has(card.dataset.key));
  });
}

async function shareReadSelection() {
  const references = state.verses
    .filter((verse) => state.selectedReadVerses.has(verse.verse_key))
    .map((verse) => verse.verse_key);
  if (!references.length) return;
  const text = makePublicLink(`?refs=${encodeURIComponent(references.join(","))}`);
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ text, dialogTitle: "Share selected verses" });
      showCopiedState(els.shareReadSelection, "Shared");
      return;
    }
    if (navigator.share) {
      await navigator.share({ text });
      showCopiedState(els.shareReadSelection, "Shared");
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
  }
  if (await copyShareLink(text)) {
    showCopiedState(els.shareReadSelection);
    setStatus(`One link for ${references.length} selected verses copied.`);
  } else window.prompt("Copy selected verse links:", text);
}

function createNoteFromReadSelection() {
  const selected = state.verses.filter((verse) => state.selectedReadVerses.has(verse.verse_key));
  if (!selected.length) return;
  const key = `note:${crypto.randomUUID()}`;
  const references = selected.map((verse) => verse.verse_key);
  const text = selected.map((verse) => {
    const translation = verse.translations?.[0]?.text || verse.text || "";
    return `${formatReferenceKey(verse.verse_key)}\n${stripHTML(translation)}`;
  }).join("\n\n");
  state.notes[key] = { title: "Reading collection", text, tags: ["reading"], references, updatedAt: new Date().toISOString(), standalone: true };
  saveNotes();
  renderNotes();
  exitReadSelectMode();
  openNote(key);
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
  els.toggleSearchSelect.innerHTML = `<i class="ti ti-${state.searchSelectMode ? "check" : "square-dashed"}" aria-hidden="true"></i><span>${state.searchSelectMode ? "Done selecting" : "Select results"}</span>`;
  els.searchSelectionCount.textContent = `${count} selected`;
  els.noteSearchSelection.disabled = count === 0;
  const allSelected = state.searchResults.length > 0 && state.searchResults.every((result) => state.selectedSearchResults.has(result.searchId));
  els.selectAllSearch.innerHTML = `<i class="ti ti-${allSelected ? "square-minus" : "checks"}" aria-hidden="true"></i><span>${allSelected ? "Deselect all" : "Select all"}</span>`;
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
  const key = `note:${crypto.randomUUID()}`;
  const references = [...new Set(selected.map((result) => result.key))];
  const text = selected.map((result) => `${result.title}\n${makeSnippet(result.text || result.extra || "", els.globalSearch.value.trim())}`).join("\n\n");
  state.notes[key] = { title: "Search collection", text, tags: ["search"], references, updatedAt: new Date().toISOString(), standalone: true };
  saveNotes();
  renderNotes();
  openNote(key);
  state.searchSelectMode = false;
  state.selectedSearchResults.clear();
  updateSearchSelectionUI();
}

function noteRenderSignature(notes) {
  return JSON.stringify(Object.entries(notes || {}).sort(([left], [right]) => left.localeCompare(right)).map(([key, note]) => [
    key,
    note?.title || "",
    note?.text || "",
    note?.folderId || "",
    note?.updatedAt || "",
    Boolean(note?.deleted),
    Boolean(note?.standalone),
    note?.tags || [],
    note?.references || [],
  ]));
}

function applySyncedNotes(notes) {
  const changed = noteRenderSignature(state.notes) !== noteRenderSignature(notes);
  state.notes = notes;
  if (!changed) return;

  const visibleCard = [...els.notesList.querySelectorAll(".note-card[data-note-key]")]
    .find((card) => card.getBoundingClientRect().bottom > (els.topbar?.getBoundingClientRect().bottom || 0));
  const anchor = visibleCard ? { key: visibleCard.dataset.noteKey, top: visibleCard.getBoundingClientRect().top } : null;
  renderNotes({ animate: false });
  renderVerses();
  updateDashboard();
  syncWidgetNotes();
  if (anchor) requestAnimationFrame(() => {
    const replacement = [...els.notesList.querySelectorAll(".note-card[data-note-key]")]
      .find((card) => card.dataset.noteKey === anchor.key);
    if (replacement) window.scrollBy({ top: replacement.getBoundingClientRect().top - anchor.top, behavior: "auto" });
  });
}

async function loadLocalState() {
  try {
    const organizer = JSON.parse(localStorage.getItem(STORE.notesOrganizer) || "null") || {};
    state.noteViewMode = organizer.viewMode === "folders" ? "folders" : "flat";
    state.selectedFolderId = typeof organizer.selectedFolderId === "string" ? organizer.selectedFolderId : "all";
    state.noteFolders = Array.isArray(organizer.folders)
      ? organizer.folders.filter((folder) => folder && typeof folder.id === "string" && typeof folder.name === "string").map((folder) => ({ ...folder, parentId: typeof folder.parentId === "string" ? folder.parentId : "" }))
      : [];
    state.tagCatalog = organizer.tagCatalog && typeof organizer.tagCatalog === "object" ? organizer.tagCatalog : {};
  } catch {
    state.noteFolders = [];
    state.tagCatalog = {};
  }
  let legacyNotes = {};
  try {
    legacyNotes = JSON.parse(localStorage.getItem(STORE.notes)) || {};
  } catch {
    legacyNotes = {};
  }

  notesSystem = new NotesSystem({ isNative: Capacitor.isNativePlatform(), onChange: applySyncedNotes });
  state.notes = await notesSystem.init(legacyNotes);
  const organizer = await notesSystem.initOrganizer({
    viewMode: state.noteViewMode,
    selectedFolderId: state.selectedFolderId,
    folders: state.noteFolders,
    tagCatalog: state.tagCatalog,
  });
  applyNotesOrganizer(organizer);
  notesSystem.watchOrganizer(applyNotesOrganizer);
  startSharedNotes();
  startAccountLastReadSync();
  notesSystem.addEventListener("status", (event) => updateSyncUI(event.detail.state, event.detail.detail));

  let notesMigrated = false;
  Object.entries(state.notes).forEach(([key, note]) => {
    if (!note || typeof note !== "object") {
      delete state.notes[key];
      notesMigrated = true;
      return;
    }
    if (typeof note.title !== "string") {
      note.title = "";
      notesMigrated = true;
    }
    if (!Array.isArray(note.references)) {
      note.references = [];
      notesMigrated = true;
    }
    if (!key.startsWith("note:") && !note.references.includes(key)) {
      note.references.unshift(key);
      notesMigrated = true;
    }
  });
  if (notesMigrated) saveNotes();

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
    state.selectedCommentary = typeof prefs.selectedCommentary === "string" ? prefs.selectedCommentary : state.selectedCommentary;
    state.savedSearchSources = Array.isArray(prefs.selectedSearchSources) ? prefs.selectedSearchSources : null;
    state.theme = ["light", "dark", "sepia", "midnight", "emerald", "contrast", "rose", "ocean", "graphite", "paper", "lavender", "desert", "forest", "nord", "sunset", "coffee", "slate", "aurora", "indigo", "mint", "sand", "amoled", "custom"].includes(prefs.theme) ? prefs.theme : state.theme;
    state.width = ["comfortable", "narrow", "wide"].includes(prefs.width) ? prefs.width : state.width;
    state.arabicFont = ["uthmani", "naskh", "scheherazade", "serif"].includes(prefs.arabicFont) ? prefs.arabicFont : state.arabicFont;
    state.translationFont = ["system", "serif", "humanist", "mono"].includes(prefs.translationFont) ? prefs.translationFont : state.translationFont;
    state.arabicScale = clampNumber(Number(prefs.arabicScale) || state.arabicScale, 0.84, 1.4);
    state.translationScale = clampNumber(Number(prefs.translationScale) || state.translationScale, 0.9, 1.22);
    state.lineScale = clampNumber(Number(prefs.lineScale) || state.lineScale, 1, 1.24);
    state.compactCards = Boolean(prefs.compactCards);
    state.showOriginalBible = prefs.showOriginalBible !== false;
    state.showArabic = prefs.showArabic !== false;
    state.cardStyle = ["soft", "flat", "outlined"].includes(prefs.cardStyle) ? prefs.cardStyle : state.cardStyle;
    state.headerStyle = ["pattern", "solid", "minimal"].includes(prefs.headerStyle) ? prefs.headerStyle : state.headerStyle;
    state.appLanguage = ["en", "ar", "de", "fr", "tr", "ur"].includes(prefs.appLanguage) ? prefs.appLanguage : "en";
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
    selectedCommentary: state.selectedCommentary,
    selectedSearchSources: [...state.selectedSearchSources],
    theme: state.theme,
    width: state.width,
    arabicFont: state.arabicFont,
    translationFont: state.translationFont,
    arabicScale: state.arabicScale,
    translationScale: state.translationScale,
    lineScale: state.lineScale,
    compactCards: state.compactCards,
    showOriginalBible: state.showOriginalBible,
    showArabic: state.showArabic,
    cardStyle: state.cardStyle,
    headerStyle: state.headerStyle,
    appLanguage: state.appLanguage,
    customTheme: state.customTheme,
  }));
}

function saveNotes() {
  const key = state.currentNoteKey;
  if (key && state.notes[key]) notesSystem?.save(key, state.notes[key]).then((saved) => { state.notes[key] = saved; }).catch((error) => updateSyncUI("conflict", error.message));
  else Object.entries(state.notes).filter(([, note]) => !note.id).forEach(([noteKey, note]) => notesSystem?.save(noteKey, note).then((saved) => { state.notes[noteKey] = saved; }));
}

function syncWidgetNotes() {
  if (!Capacitor.isNativePlatform() || !state.notes) return;
  const notes = Object.entries(state.notes)
    .filter(([, note]) => note && (note.title?.trim() || note.text?.trim() || note.references?.length))
    .sort(([, left], [, right]) => Date.parse(right.updatedAt || 0) - Date.parse(left.updatedAt || 0))
    .slice(0, 200)
    .map(([key, note]) => ({
      key,
      title: note.title?.trim() || (note.references?.[0] ? formatReferenceKey(note.references[0]) : "Untitled note"),
      text: note.text?.trim() || (note.references?.length ? `${note.references.length} saved reference${note.references.length === 1 ? "" : "s"}` : "Open note"),
      updatedAt: note.updatedAt || "",
    }));
  WidgetData.setNotes({ notes }).catch(() => {});
}

function setStatus(message) {
  els.status.textContent = message;
}

function updateDashboard() {
  const savedKey = localStorage.getItem("quran-reader-last-read-v1");
  els.lastReadButton.disabled = !savedKey;
  els.lastReadButton.title = savedKey ? `Resume ${formatReferenceKey(savedKey)}` : "Mark a verse as last read first";
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
    root.style.setProperty("--gold-soft", `color-mix(in srgb, ${state.customTheme.highlight} 22%, ${state.customTheme.panel})`);
  } else {
    ["--paper", "--paper-2", "--panel", "--ink", "--muted", "--line", "--green", "--green-2", "--gold", "--gold-soft"].forEach((name) => root.style.removeProperty(name));
  }
  const activeAccent = getComputedStyle(root).getPropertyValue("--green").trim() || "#173f35";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", activeAccent);

  els.themeSelect.value = state.theme;
  els.widthSelect.value = state.width;
  els.arabicFontSelect.value = state.arabicFont;
  els.translationFontSelect.value = state.translationFont;
  els.arabicSizeRange.value = String(state.arabicScale);
  els.translationSizeRange.value = String(state.translationScale);
  els.lineHeightRange.value = String(state.lineScale);
  els.compactToggle.checked = state.compactCards;
  els.originalLanguageToggle.checked = state.showOriginalBible;
  els.arabicTextToggle.checked = state.showArabic;
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
  els.themeButton.querySelector("strong").textContent = state.theme === "dark" ? "Light mode" : "Dark mode";
  els.settingsSummary.textContent = `${capitalize(state.theme)} · ${capitalize(state.arabicFont)} Arabic · ${capitalize(state.translationFont)} translation`;
  els.appLanguageSelect.value = state.appLanguage;
  applyAppLanguage();
}

const UI_COPY = {
  ar: {
    Read: "القراءة", Search: "البحث", Notes: "الملاحظات", All: "الكل", Shared: "مشتركة", "New note": "ملاحظة جديدة", Select: "تحديد",
    "Reading options": "خيارات القراءة", "Choose a text and passage": "اختر النص والمقطع", "Last read": "آخر قراءة", Tradition: "الديانة", Text: "النص", Chapter: "الفصل", Book: "الكتاب", Collection: "المجموعة", Section: "القسم", Verse: "الآية", Ayah: "آية", Hadith: "حديث",
    "Now reading": "تقرأ الآن", Progress: "التقدم", "Reader Settings": "إعدادات القارئ", "Personalize your reading experience": "خصّص تجربة القراءة", "App language": "لغة التطبيق", Appearance: "المظهر", Theme: "السمة", "Reader width": "عرض القارئ", Typography: "الخطوط", "Arabic font": "الخط العربي", "Translation font": "خط الترجمة", "Show Hebrew / Greek for Bible": "إظهار العبرية واليونانية للكتاب المقدس", "Show Arabic text in Quran": "إظهار النص العربي في القرآن", "Arabic size": "حجم العربية", "Translation size": "حجم الترجمة", "Line spacing": "تباعد الأسطر", "Reader layout": "تخطيط القارئ", "Card style": "نمط البطاقات", "Header style": "نمط الرأس", "Compact cards": "بطاقات مضغوطة",
    Translations: "الترجمات", Tafsir: "التفسير", "Dark mode": "الوضع الداكن", "Notes & account": "الملاحظات والحساب", "Offline Android app": "تطبيق أندرويد دون اتصال", "Download APK": "تنزيل التطبيق", "Copy verse": "نسخ الآية", "Choose the text to copy": "اختر النص المراد نسخه", "Original only": "الأصل فقط", "Translation only": "الترجمة فقط", "Select original text and translations": "اختر النص الأصلي والترجمات", "Copy selected text": "نسخ النص المحدد", "Copy verse link": "نسخ رابط الآية", "Search texts": "البحث في النصوص", "Search in": "البحث في", "Select results": "تحديد النتائج", "Add to note": "إضافة إلى ملاحظة", "Select all": "تحديد الكل", Clear: "مسح", Done: "تم", Sort: "ترتيب", Settings: "الإعدادات",
  },
  de: {
    Read: "Lesen", Search: "Suchen", Notes: "Notizen", All: "Alle", Shared: "Geteilt", "New note": "Neue Notiz", Select: "Auswählen",
    "Reading options": "Leseoptionen", "Choose a text and passage": "Text und Stelle auswählen", "Last read": "Zuletzt gelesen", Tradition: "Tradition", Text: "Text", Chapter: "Kapitel", Book: "Buch", Collection: "Sammlung", Section: "Abschnitt", Verse: "Vers", Ayah: "Aya", Hadith: "Hadith", "Now reading": "Aktuell", Progress: "Fortschritt",
    "Reader Settings": "Leseeinstellungen", "Personalize your reading experience": "Leseerlebnis anpassen", "App language": "App-Sprache", Appearance: "Darstellung", Theme: "Design", "Reader width": "Lesebreite", Typography: "Typografie", "Arabic font": "Arabische Schrift", "Translation font": "Übersetzungsschrift", "Show Hebrew / Greek for Bible": "Hebräisch/Griechisch der Bibel anzeigen", "Show Arabic text in Quran": "Arabischen Korantext anzeigen", "Arabic size": "Arabische Größe", "Translation size": "Übersetzungsgröße", "Line spacing": "Zeilenabstand", "Reader layout": "Leselayout", "Card style": "Kartenstil", "Header style": "Kopfstil", "Compact cards": "Kompakte Karten",
    Translations: "Übersetzungen", Tafsir: "Tafsir", "Dark mode": "Dunkelmodus", "Notes & account": "Notizen & Konto", "Offline Android app": "Offline-Android-App", "Download APK": "APK herunterladen", "Copy verse": "Vers kopieren", "Choose the text to copy": "Text zum Kopieren wählen", "Original only": "Nur Original", "Translation only": "Nur Übersetzung", "Select original text and translations": "Original und Übersetzungen auswählen", "Copy selected text": "Ausgewählten Text kopieren", "Copy verse link": "Verslink kopieren", "Search texts": "Texte durchsuchen", "Search in": "Suchen in", "Select results": "Ergebnisse auswählen", "Add to note": "Zu Notiz hinzufügen", "Select all": "Alle auswählen", Clear: "Leeren", Done: "Fertig", Sort: "Sortieren", Settings: "Einstellungen",
  },
  fr: {
    Read: "Lire", Search: "Rechercher", Notes: "Notes", All: "Tout", Shared: "Partagées", "New note": "Nouvelle note", Select: "Sélectionner",
    "Reading options": "Options de lecture", "Choose a text and passage": "Choisir un texte et un passage", "Last read": "Dernière lecture", Tradition: "Tradition", Text: "Texte", Chapter: "Chapitre", Book: "Livre", Collection: "Collection", Section: "Section", Verse: "Verset", Ayah: "Verset", Hadith: "Hadith", "Now reading": "Lecture actuelle", Progress: "Progression",
    "Reader Settings": "Paramètres de lecture", "Personalize your reading experience": "Personnalisez votre lecture", "App language": "Langue de l’application", Appearance: "Apparence", Theme: "Thème", "Reader width": "Largeur de lecture", Typography: "Typographie", "Arabic font": "Police arabe", "Translation font": "Police de traduction", "Show Hebrew / Greek for Bible": "Afficher l’hébreu/le grec de la Bible", "Show Arabic text in Quran": "Afficher le texte arabe du Coran", "Arabic size": "Taille de l’arabe", "Translation size": "Taille de la traduction", "Line spacing": "Interligne", "Reader layout": "Mise en page", "Card style": "Style des cartes", "Header style": "Style de l’en-tête", "Compact cards": "Cartes compactes",
    Translations: "Traductions", Tafsir: "Tafsir", "Dark mode": "Mode sombre", "Notes & account": "Notes et compte", "Offline Android app": "Application Android hors ligne", "Download APK": "Télécharger l’APK", "Copy verse": "Copier le verset", "Choose the text to copy": "Choisir le texte à copier", "Original only": "Original seulement", "Translation only": "Traduction seulement", "Select original text and translations": "Sélectionner l’original et les traductions", "Copy selected text": "Copier le texte sélectionné", "Copy verse link": "Copier le lien", "Search texts": "Rechercher dans les textes", "Search in": "Rechercher dans", "Select results": "Sélectionner les résultats", "Add to note": "Ajouter à une note", "Select all": "Tout sélectionner", Clear: "Effacer", Done: "Terminé", Sort: "Trier", Settings: "Paramètres",
  },
  tr: {
    Read: "Oku", Search: "Ara", Notes: "Notlar", All: "Tümü", Shared: "Paylaşılan", "New note": "Yeni not", Select: "Seç",
    "Reading options": "Okuma seçenekleri", "Choose a text and passage": "Metin ve bölüm seç", "Last read": "Son okunan", Tradition: "Gelenek", Text: "Metin", Chapter: "Bölüm", Book: "Kitap", Collection: "Koleksiyon", Section: "Kısım", Verse: "Ayet", Ayah: "Ayet", Hadith: "Hadis", "Now reading": "Şimdi okunuyor", Progress: "İlerleme",
    "Reader Settings": "Okuyucu Ayarları", "Personalize your reading experience": "Okuma deneyimini kişiselleştir", "App language": "Uygulama dili", Appearance: "Görünüm", Theme: "Tema", "Reader width": "Okuyucu genişliği", Typography: "Yazı", "Arabic font": "Arapça yazı tipi", "Translation font": "Çeviri yazı tipi", "Show Hebrew / Greek for Bible": "İncil’de İbranice/Yunanca göster", "Show Arabic text in Quran": "Kur’an Arapça metnini göster", "Arabic size": "Arapça boyutu", "Translation size": "Çeviri boyutu", "Line spacing": "Satır aralığı", "Reader layout": "Okuyucu düzeni", "Card style": "Kart stili", "Header style": "Başlık stili", "Compact cards": "Kompakt kartlar",
    Translations: "Çeviriler", Tafsir: "Tefsir", "Dark mode": "Karanlık mod", "Notes & account": "Notlar ve hesap", "Offline Android app": "Çevrimdışı Android uygulaması", "Download APK": "APK indir", "Copy verse": "Ayeti kopyala", "Choose the text to copy": "Kopyalanacak metni seç", "Original only": "Yalnızca özgün", "Translation only": "Yalnızca çeviri", "Select original text and translations": "Özgün metni ve çevirileri seç", "Copy selected text": "Seçili metni kopyala", "Copy verse link": "Ayet bağlantısını kopyala", "Search texts": "Metinlerde ara", "Search in": "Şurada ara", "Select results": "Sonuçları seç", "Add to note": "Nota ekle", "Select all": "Tümünü seç", Clear: "Temizle", Done: "Bitti", Sort: "Sırala", Settings: "Ayarlar",
  },
  ur: {
    Read: "پڑھیں", Search: "تلاش", Notes: "نوٹس", All: "سب", Shared: "مشترکہ", "New note": "نیا نوٹ", Select: "منتخب کریں",
    "Reading options": "پڑھنے کے اختیارات", "Choose a text and passage": "متن اور حوالہ منتخب کریں", "Last read": "آخری مطالعہ", Tradition: "روایت", Text: "متن", Chapter: "باب", Book: "کتاب", Collection: "مجموعہ", Section: "حصہ", Verse: "آیت", Ayah: "آیت", Hadith: "حدیث", "Now reading": "ابھی پڑھ رہے ہیں", Progress: "پیش رفت",
    "Reader Settings": "قاری کی ترتیبات", "Personalize your reading experience": "مطالعے کو اپنی پسند کے مطابق بنائیں", "App language": "ایپ کی زبان", Appearance: "ظاہری شکل", Theme: "تھیم", "Reader width": "قاری کی چوڑائی", Typography: "خط", "Arabic font": "عربی خط", "Translation font": "ترجمے کا خط", "Show Hebrew / Greek for Bible": "بائبل کی عبرانی/یونانی دکھائیں", "Show Arabic text in Quran": "قرآن کا عربی متن دکھائیں", "Arabic size": "عربی کا سائز", "Translation size": "ترجمے کا سائز", "Line spacing": "سطروں کا فاصلہ", "Reader layout": "قاری کی ترتیب", "Card style": "کارڈ کا انداز", "Header style": "ہیڈر کا انداز", "Compact cards": "مختصر کارڈز",
    Translations: "تراجم", Tafsir: "تفسیر", "Dark mode": "ڈارک موڈ", "Notes & account": "نوٹس اور اکاؤنٹ", "Offline Android app": "آف لائن اینڈرائیڈ ایپ", "Download APK": "اے پی کے ڈاؤن لوڈ کریں", "Copy verse": "آیت نقل کریں", "Choose the text to copy": "نقل کرنے کے لیے متن چنیں", "Original only": "صرف اصل", "Translation only": "صرف ترجمہ", "Select original text and translations": "اصل اور تراجم منتخب کریں", "Copy selected text": "منتخب متن نقل کریں", "Copy verse link": "آیت کا لنک نقل کریں", "Search texts": "متون میں تلاش", "Search in": "اس میں تلاش", "Select results": "نتائج منتخب کریں", "Add to note": "نوٹ میں شامل کریں", "Select all": "سب منتخب کریں", Clear: "صاف", Done: "مکمل", Sort: "ترتیب", Settings: "ترتیبات",
  },
};
const originalUiText = new WeakMap();
let languageObserver;
const AUTO_UI_CACHE_KEY = "abrahamic-ui-translations-v1";
const autoUiCache = (() => { try { return JSON.parse(localStorage.getItem(AUTO_UI_CACHE_KEY)) || {}; } catch { return {}; } })();
const autoTranslationPromises = new Map();
const autoTranslationQueue = [];
let autoTranslationWorkers = 0;
function setAppLanguage(language) { state.appLanguage = language; applyAppLanguage(); savePrefs(); }
function applyAppLanguage() {
  document.documentElement.lang = state.appLanguage;
  document.documentElement.dir = ["ar", "ur"].includes(state.appLanguage) ? "rtl" : "ltr";
  translateInterface(document.body);
  if (!languageObserver) {
    languageObserver = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) translateUiTextNode(node);
        else if (node.nodeType === Node.ELEMENT_NODE) translateInterface(node);
      }));
    });
    languageObserver.observe(document.body, { childList: true, subtree: true });
  }
}

function translateInterface(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(translateUiTextNode);
  const elements = root.matches?.("[placeholder], [aria-label], [title]") ? [root, ...root.querySelectorAll("[placeholder], [aria-label], [title]")] : [...root.querySelectorAll?.("[placeholder], [aria-label], [title]") || []];
  elements.forEach((element) => ["placeholder", "aria-label", "title"].forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return;
    const sourceKey = `i18n${attribute.replace(/(^|-)(\w)/g, (_, __, letter) => letter.toUpperCase())}`;
    if (!element.dataset[sourceKey]) element.dataset[sourceKey] = element.getAttribute(attribute);
    const source = element.dataset[sourceKey];
    const requestedLanguage = state.appLanguage;
    element.setAttribute(attribute, translateUiString(source));
    requestUiTranslation(source).then((translated) => {
      if (translated && state.appLanguage === requestedLanguage && element.isConnected) element.setAttribute(attribute, translated);
    });
  }));
}

function translateUiTextNode(node) {
  const parent = node.parentElement;
  if (!parent || parent.closest("script, style, .verses, .notes-list, .search-results, .resource-list, .tafsir-content, .word-content, .reference-overview-content, .verse-preview")) return;
  if (!originalUiText.has(node)) originalUiText.set(node, node.nodeValue);
  const original = originalUiText.get(node);
  const trimmed = original.trim();
  if (!trimmed) return;
  const translated = translateUiString(trimmed);
  node.nodeValue = original.replace(trimmed, translated);
  const requestedLanguage = state.appLanguage;
  requestUiTranslation(trimmed).then((automatic) => {
    if (!automatic || state.appLanguage !== requestedLanguage || !node.isConnected) return;
    node.nodeValue = original.replace(trimmed, automatic);
  });
}

function translateUiString(value) {
  if (state.appLanguage === "en") return value;
  return UI_COPY[state.appLanguage]?.[value] || autoUiCache[state.appLanguage]?.[value] || value;
}

function requestUiTranslation(source) {
  const language = state.appLanguage;
  if (language === "en" || !source || UI_COPY[language]?.[source] || autoUiCache[language]?.[source] || !/[A-Za-z]/.test(source) || source.length > 450) {
    return Promise.resolve(translateUiString(source));
  }
  const key = `${language}:${source}`;
  if (autoTranslationPromises.has(key)) return autoTranslationPromises.get(key);
  const promise = new Promise((resolve) => autoTranslationQueue.push({ language, source, resolve }));
  autoTranslationPromises.set(key, promise);
  startAutoTranslationWorkers();
  return promise;
}

function startAutoTranslationWorkers() {
  while (autoTranslationWorkers < 3 && autoTranslationQueue.length) {
    autoTranslationWorkers += 1;
    runAutoTranslationWorker();
  }
}

async function runAutoTranslationWorker() {
  while (autoTranslationQueue.length) {
    const job = autoTranslationQueue.shift();
    let translated = "";
    try {
      const data = await getJSON(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(job.source)}&langpair=en%7C${job.language}`);
      translated = String(data.responseData?.translatedText || "").trim();
      if (translated && translated.toLowerCase() !== job.source.toLowerCase()) {
        autoUiCache[job.language] ||= {};
        autoUiCache[job.language][job.source] = translated;
        localStorage.setItem(AUTO_UI_CACHE_KEY, JSON.stringify(autoUiCache));
      }
    } catch {
      translated = "";
    }
    job.resolve(translated || UI_COPY[job.language]?.[job.source] || job.source);
  }
  autoTranslationWorkers -= 1;
  startAutoTranslationWorkers();
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

  const hadith = raw.match(/^(?:hadith\s+)?(.+?)\s+(\d{1,3})[:\s](\d{1,6})$/i);
  if (hadith) {
    const book = normalizeHadithBook(hadith[1]);
    if (book) return { type: "hadith", key: hadithKey(book.key, Number(hadith[2]), Number(hadith[3])), label: `${book.name} ${hadith[3]}` };
  }
  const singleHadith = raw.match(/^(?:hadith\s+)?(.+?)\s+(\d{1,6})$/i);
  if (singleHadith) {
    const book = normalizeHadithBook(singleHadith[1]);
    if (book) {
      const number = Number(singleHadith[2]);
      const section = book.source === "thaqalayn"
        ? Math.max(1, Math.floor((number - book.idRangeMin) / 25) + 1)
        : 1;
      return { type: "hadith", key: hadithKey(book.key, section, number), label: `${book.name} ${number}` };
    }
  }
  const bible = raw.match(/^((?:[1-3]\s*)?[a-zA-Z ]+?)\s+(\d{1,3})(?::(\d{1,3}))?$/);
  if (!bible) return null;
  const book = normalizeBibleBook(bible[1]);
  if (!book) return null;
  const chapter = Number(bible[2]);
  const verse = Number(bible[3] || 1);
  return { type: getBookSet(book), key: bibleKey(book, chapter, verse), label: `${book} ${chapter}:${verse}` };
}

function normalizeHadithBook(value) {
  const query = normalizeHadithSearchText(value);
  if (!query) return null;
  return state.hadithBooks.find((item) => normalizeHadithSearchText(item.key) === query || normalizeHadithSearchText(item.name) === query)
    || state.hadithBooks.find((item) => normalizeHadithSearchText(item.name).includes(query) || query.includes(normalizeHadithSearchText(item.name)))
    || state.hadithBooks.find((item) => query.split(" ").every((word) => `${normalizeHadithSearchText(item.key)} ${normalizeHadithSearchText(item.name)}`.includes(word)));
}

function normalizeHadithSearchText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b(sahih|sunan|jami|hadith|the)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();
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

function parseSearchExpression(query) {
  const rawTokens = String(query || "").match(/"[^"]+"|\+|[^\s+]+/g) || [];
  const hasAnd = rawTokens.includes("+");
  const groups = [[]];
  rawTokens.forEach((raw) => {
    if (raw === "+") {
      if (groups.at(-1).length) groups.push([]);
      return;
    }
    const quoted = raw.startsWith('"') && raw.endsWith('"');
    const value = normalizeSearchText(quoted ? raw.slice(1, -1) : raw);
    if (value) groups.at(-1).push(value);
  });
  const usableGroups = groups.filter((group) => group.length);
  return {
    terms: usableGroups.flat(),
    matches(haystack) {
      if (!usableGroups.length) return true;
      if (!hasAnd) return usableGroups.flat().some((term) => haystack.includes(term));
      return usableGroups.every((group) => group.some((term) => haystack.includes(term)));
    },
  };
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
  const terms = parseSearchExpression(query).terms;
  const indexes = terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0);
  const index = indexes.length ? Math.min(...indexes) : -1;
  const start = index > 40 ? index - 40 : 0;
  const snippet = clean.slice(start, start + 190);
  return `${start > 0 ? "... " : ""}${snippet}${clean.length > start + 190 ? " ..." : ""}`;
}

function highlightSearchText(text, query) {
  const value = String(text || "");
  const tokens = String(query || "").match(/"[^"]+"|[^\s+]+/g) || [];
  const terms = [...new Set(tokens
    .map((token) => token.startsWith("\"") && token.endsWith("\"") ? token.slice(1, -1) : token)
    .flatMap((term) => [term, ...term.split(/\s+/)])
    .map((term) => term.trim())
    .filter(Boolean))]
    .sort((a, b) => b.length - a.length);

  if (!terms.length) return escapeHTML(value);
  const pattern = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const expression = new RegExp(pattern, "giu");
  let html = "";
  let cursor = 0;

  for (const match of value.matchAll(expression)) {
    const index = match.index ?? 0;
    html += escapeHTML(value.slice(cursor, index));
    html += `<mark class="search-highlight">${escapeHTML(match[0])}</mark>`;
    cursor = index + match[0].length;
  }

  return html + escapeHTML(value.slice(cursor));
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

function openDialog(dialog, sourceButton = null, motion = "sheet") {
  if (dialog.open) return;
  if (sourceButton && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    sourceButton.animate(
      [{ transform: "scale(1)" }, { transform: "scale(.92)" }, { transform: "scale(1.04)" }, { transform: "scale(1)" }],
      { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" },
    );
  }
  dialog.classList.toggle("study-opening", motion === "study");
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
  dialog.addEventListener("close", () => dialog.classList.remove("study-opening"), { once: true });
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
