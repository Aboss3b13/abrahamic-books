import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  browserLocalPersistence,
} from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDcZTfjyNPnbGCBdO6HvPSLttQsrOZYx-E",
  authDomain: "abrahamic-books.firebaseapp.com",
  projectId: "abrahamic-books",
  storageBucket: "abrahamic-books.firebasestorage.app",
  messagingSenderId: "709558646345",
  appId: "1:709558646345:web:1e95def83c407e1e0b3198",
  measurementId: "G-LG1GDFMJ9H",
};

const DB_NAME = "abrahamic-books-notes";
const DB_VERSION = 1;
const NOTES = "notes";
const META = "meta";
const LOCAL_OWNER = "__local__";
const utf8 = new TextEncoder();
const decode = new TextDecoder();
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const uuid = () => crypto.randomUUID?.() || `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(4)).join("-")}`;
const recoverNoteKey = (key, note = {}) => {
  const supplied = String(key || note.key || "").trim();
  if (supplied) return supplied;
  const reference = Array.isArray(note.references) ? String(note.references.find(Boolean) || "").trim() : "";
  if (reference && !note.standalone) return reference;
  return `note:${note.id || uuid()}`;
};
const cloudIdForKey = (key) => {
  const safeKey = String(key || "").trim();
  if (!safeKey) throw new Error("A note is missing its storage key. Run sync again to repair it.");
  return btoa(unescape(encodeURIComponent(safeKey))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const newerThan = (left, right) => {
  const timeDifference = Date.parse(left?.updatedAt || 0) - Date.parse(right?.updatedAt || 0);
  if (timeDifference) return timeDifference > 0;
  return Number(left?.revision || 0) > Number(right?.revision || 0);
};

export class NotesSystem extends EventTarget {
  constructor({ onChange = () => {}, isNative = false } = {}) {
    super();
    this.onChange = onChange;
    this.db = null;
    this.syncing = false;
    this.timer = null;
    this.writeQueue = Promise.resolve();
    this.config = { mode: "local", deviceId: "", accountUid: "", salt: "", iterations: 250000 };
    this.isNative = isNative;
    this.key = null;
    const firebaseApp = initializeApp(FIREBASE_CONFIG);
    this.auth = getAuth(firebaseApp);
    this.firestore = getFirestore(firebaseApp);
    this.user = null;
    this.unsubscribeRemote = null;
    this.sharedUnsubscribers = [];
    this.lastReadUnsubscribe = null;
    this.organizerOnChange = () => {};
  }

  async init(legacy = {}) {
    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(NOTES, { keyPath: "id" });
        request.result.createObjectStore(META, { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    this.config = { ...this.config, ...((await this.getMeta("config")) || {}) };
    if (!["local", "firebase"].includes(this.config.mode)) this.config.mode = "local";
    if (!this.config.deviceId) this.config.deviceId = uuid();
    if (!this.config.salt) this.config.salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    await this.setMeta("config", this.config);
    const existing = await this.all();
    if (legacy && Object.keys(legacy).length) {
      const existingKeys = new Set(existing.map((note) => note.key));
      for (const [key, value] of Object.entries(legacy)) if (!existingKeys.has(key)) await this.put(this.normalize(key, value), false);
      localStorage.removeItem("quran-reader-notes-v1");
    }
    for (const stored of await this.all()) {
      if (!String(stored.key || "").trim()) {
        stored.key = recoverNoteKey("", stored);
        stored.updatedAt ||= new Date().toISOString();
        stored.revision = Math.max(1, Number(stored.revision) || 1);
        stored.syncedRevision = 0;
        await this.put(stored, false);
      }
    }
    await setPersistence(this.auth, browserLocalPersistence);
    await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        this.user = user;
        unsubscribe();
        resolve();
      });
    });
    if (this.user) await this.activateAccount(this.user.uid);
    else if (this.config.accountUid) {
      // Auth persistence can expire independently of IndexedDB. Never leave the
      // last signed-in account selected while the user is signed out.
      this.config.accountUid = "";
      await this.setMeta("config", this.config);
    }
    window.addEventListener("online", () => this.scheduleSync(200));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") this.scheduleSync(100);
    });
    if (this.config.mode === "firebase" && this.user) {
      this.startRealtimeSync();
      this.scheduleSync(100);
    }
    return this.visibleMap();
  }

  normalize(key, note = {}) {
    const now = new Date().toISOString();
    const resolvedKey = recoverNoteKey(key, note);
    return {
      id: note.id || uuid(), key: resolvedKey, title: String(note.title || ""), text: String(note.text || ""),
      tags: Array.isArray(note.tags) ? note.tags.map(String) : [], references: Array.isArray(note.references) ? note.references.map(String) : [],
      folderId: String(note.folderId || ""),
      standalone: note.standalone ?? resolvedKey.startsWith("note:"), revision: Number(note.revision) || 1,
      createdAt: note.createdAt || note.updatedAt || now, updatedAt: note.updatedAt || now,
      deviceId: note.deviceId || this.config.deviceId, deletedAt: note.deletedAt || null,
      localOwnerUid: note.localOwnerUid || note.ownerUid || "",
      syncedRevision: Number(note.syncedRevision) || 0, syncState: note.syncState || "saved locally", conflictOf: note.conflictOf || null,
    };
  }

  async save(key, note) {
    const operation = this.writeQueue.then(() => this.saveNow(key, note));
    this.writeQueue = operation.catch(() => {});
    return operation;
  }

  async saveNow(key, note) {
    const ownerUid = this.currentOwnerUid();
    const old = (await this.getByKey(key, ownerUid)) || {};
    const record = this.normalize(key, { ...old, ...note });
    record.revision = Math.max(1, Number(old.revision || 0) + 1);
    record.updatedAt = new Date().toISOString();
    record.deviceId = this.config.deviceId;
    record.localOwnerUid = ownerUid;
    record.deletedAt = null;
    record.syncState = this.config.mode === "local" ? "saved locally" : navigator.onLine ? "syncing" : "offline";
    await this.put(record);
    this.scheduleSync();
    return record;
  }

  async remove(key) {
    const operation = this.writeQueue.then(() => this.removeNow(key));
    this.writeQueue = operation.catch(() => {});
    return operation;
  }

  async removeNow(key) {
    const old = await this.getByKey(key, this.currentOwnerUid());
    if (!old) return;
    old.deletedAt = new Date().toISOString();
    old.updatedAt = old.deletedAt;
    old.revision += 1;
    old.deviceId = this.config.deviceId;
    old.syncState = this.config.mode === "local" ? "saved locally" : "syncing";
    await this.put(old);
    this.scheduleSync(0);
  }

  async visibleMap() {
    const map = {};
    const ownerUid = this.currentOwnerUid();
    for (const note of await this.all()) {
      if ((note.localOwnerUid || LOCAL_OWNER) !== ownerUid) continue;
      const existing = map[note.key];
      if ((!existing || newerThan(note, existing)) && !note.deletedAt) map[note.key] = note;
      else if (existing && newerThan(note, existing) && note.deletedAt) delete map[note.key];
    }
    return map;
  }

  async setMode(mode) {
    if (!["local", "firebase"].includes(mode)) throw new Error("Unknown storage mode");
    this.config.mode = mode;
    await this.setMeta("config", this.config);
    this.emit(mode === "local" ? "saved locally" : this.user ? "syncing" : "offline");
    if (mode === "firebase" && this.user) this.scheduleSync(0);
  }

  async connect(email, password, createAccount = false) {
    if (!email || !password) throw new Error("Enter your email and password.");
    if (!navigator.onLine) throw new Error("Connect to the internet to sign in to Firebase.");
    const credential = createAccount
      ? await createUserWithEmailAndPassword(this.auth, email, password)
      : await signInWithEmailAndPassword(this.auth, email, password);
    this.user = credential.user;
    await this.activateAccount(this.user.uid);
    await this.setMode("firebase");
    this.startRealtimeSync();
    await this.sync({ force: true });
  }

  async disconnect() {
    await signOut(this.auth);
    this.unsubscribeRemote?.();
    this.unsubscribeRemote = null;
    this.stopLastReadSync();
    this.stopSharedSync();
    this.user = null;
    this.config.accountUid = "";
    await this.setMode("local");
    this.onChange(await this.visibleMap());
  }

  get accountEmail() { return this.user?.email || ""; }
  get signedIn() { return Boolean(this.user); }

  stopLastReadSync() {
    this.lastReadUnsubscribe?.();
    this.lastReadUnsubscribe = null;
  }

  watchLastRead(onChange, onError = () => {}) {
    this.stopLastReadSync();
    if (!this.user) { onChange(null); return; }
    this.lastReadUnsubscribe = onSnapshot(
      doc(this.firestore, "users", this.user.uid, "notes", "reader-state-v1"),
      (snapshot) => onChange(snapshot.exists() ? snapshot.data()?.lastRead || null : null),
      onError,
    );
  }

  async setLastRead(lastRead) {
    if (!this.user) return;
    await setDoc(doc(this.firestore, "users", this.user.uid, "notes", "reader-state-v1"), { lastRead }, { merge: true });
  }

  async getLastRead() {
    if (!this.user) return null;
    const snapshot = await getDoc(doc(this.firestore, "users", this.user.uid, "notes", "reader-state-v1"));
    return snapshot.exists() ? snapshot.data()?.lastRead || null : null;
  }

  stopSharedSync() {
    this.sharedUnsubscribers.forEach((unsubscribe) => unsubscribe?.());
    this.sharedUnsubscribers = [];
  }

  watchSharedNotes(onChange, onError = () => {}) {
    this.stopSharedSync();
    if (!this.user?.email) { onChange([]); return; }
    const email = this.user.email.toLowerCase();
    const snapshots = new Map();
    const publish = () => onChange([...snapshots.values()].sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0)));
    const listen = (key, constraint) => onSnapshot(query(collection(this.firestore, "sharedNotes"), constraint), (result) => {
      for (const [id, value] of snapshots) if (value._query === key) snapshots.delete(id);
      result.docs.forEach((item) => snapshots.set(item.id, { id: item.id, ...item.data(), _query: key }));
      publish();
    }, onError);
    this.sharedUnsubscribers = [
      listen("owner", where("ownerUid", "==", this.user.uid)),
      listen("member", where("memberEmails", "array-contains", email)),
    ];
  }

  async createSharedNote(note, inviteEmails = []) {
    if (!this.user?.email) throw new Error("Sign in before creating a shared note.");
    const now = new Date().toISOString();
    const memberEmails = [...new Set(inviteEmails.map((email) => String(email).trim().toLowerCase()).filter(Boolean))];
    return addDoc(collection(this.firestore, "sharedNotes"), {
      title: String(note.title || "Untitled shared note"), text: String(note.text || ""),
      tags: Array.isArray(note.tags) ? note.tags.map(String) : [], references: Array.isArray(note.references) ? note.references.map(String) : [],
      folderId: String(note.folderId || ""),
      ownerUid: this.user.uid, ownerEmail: this.user.email.toLowerCase(), memberEmails,
      createdAt: now, updatedAt: now, updatedBy: this.user.email.toLowerCase(),
    });
  }

  async updateSharedNote(id, changes) {
    if (!this.user) throw new Error("Sign in to edit shared notes.");
    const clean = {};
    for (const key of ["title", "text", "tags", "references", "folderId", "memberEmails"]) if (key in changes) clean[key] = changes[key];
    clean.updatedAt = new Date().toISOString(); clean.updatedBy = this.accountEmail.toLowerCase();
    await updateDoc(doc(this.firestore, "sharedNotes", id), clean);
  }

  async deleteSharedNote(id) {
    if (!this.user) throw new Error("Sign in to delete shared notes.");
    await deleteDoc(doc(this.firestore, "sharedNotes", id));
  }

  async activateAccount(uid) {
    await this.writeQueue;
    this.config.accountUid = uid;
    await this.setMeta("config", this.config);
    // Legacy releases stored local notes without an owner. Claim them once for
    // the first account used after upgrade; never claim them on later switches.
    if (!this.config.legacyNotesClaimedBy) {
      for (const note of await this.all()) {
        if (!note.localOwnerUid) {
          note.localOwnerUid = uid;
          note.syncedRevision = 0;
          await this.put(note, false);
        }
      }
      this.config.legacyNotesClaimedBy = uid;
      await this.setMeta("config", this.config);
    }
    const accountOrganizerKey = `organizer:${uid}`;
    if (!(await this.getMeta(accountOrganizerKey))) {
      const localOrganizer = await this.getMeta(`organizer:${LOCAL_OWNER}`);
      // A cloud organizer must win when an existing account is first used on
      // this device. The old local organizer is only a migration fallback for
      // accounts that do not have a cloud organizer yet.
      if (localOrganizer) await this.setMeta(accountOrganizerKey, { ...localOrganizer, updatedAt: "1970-01-01T00:00:00.000Z" });
    }
    this.onChange(await this.visibleMap());
  }

  async initOrganizer(organizer = {}) {
    const key = `organizer:${this.currentOwnerUid()}`;
    const existing = await this.getMeta(key);
    if (existing) return existing;
    const initial = {
      ...organizer,
      updatedAt: organizer.updatedAt || "1970-01-01T00:00:00.000Z",
      deviceId: organizer.deviceId || this.config.deviceId,
    };
    await this.setMeta(key, initial);
    return initial;
  }

  watchOrganizer(onChange = () => {}) {
    this.organizerOnChange = onChange;
  }

  async saveOrganizer(organizer = {}) {
    const folders = Array.isArray(organizer.folders)
      ? organizer.folders
        .filter((folder) => folder && typeof folder.id === "string" && typeof folder.name === "string")
        .map((folder) => ({
          id: folder.id.slice(0, 120),
          name: folder.name.trim().slice(0, 60),
          createdAt: folder.createdAt || new Date().toISOString(),
        }))
        .filter((folder) => folder.id && folder.name)
      : [];
    const tagCatalog = organizer.tagCatalog && typeof organizer.tagCatalog === "object"
      ? Object.fromEntries(Object.entries(organizer.tagCatalog).slice(0, 250).map(([tag, details]) => [
        String(tag).slice(0, 40),
        { description: String(details?.description || "").slice(0, 240) },
      ]))
      : {};
    const clean = {
      viewMode: organizer.viewMode === "folders" ? "folders" : "flat",
      selectedFolderId: typeof organizer.selectedFolderId === "string" ? organizer.selectedFolderId : "all",
      folders,
      tagCatalog,
      updatedAt: new Date().toISOString(),
      deviceId: this.config.deviceId,
    };
    await this.setMeta(`organizer:${this.currentOwnerUid()}`, clean);
    this.scheduleSync(250);
    return clean;
  }

  startRealtimeSync() {
    this.unsubscribeRemote?.();
    if (!this.user || this.config.mode !== "firebase") return;
    let initialSnapshot = true;
    this.unsubscribeRemote = onSnapshot(
      collection(this.firestore, "users", this.user.uid, "notes"),
      () => {
        if (initialSnapshot) { initialSnapshot = false; return; }
        this.scheduleSync(100);
      },
      (error) => this.emit("conflict", `Firebase listener: ${error.message}`),
    );
  }

  async sync({ force = false } = {}) {
    if (this.syncing || this.config.mode !== "firebase") return;
    if (!this.user) throw new Error("Sign in to Firebase first.");
    if (!navigator.onLine) { this.emit("offline"); return; }
    this.syncing = true;
    this.emit("syncing");
    try {
      await this.writeQueue;
      const remoteSnapshot = await getDocs(collection(this.firestore, "users", this.user.uid, "notes"));
      const localRecords = (await this.all()).filter((note) => note.localOwnerUid === this.user.uid);
      const localByKey = new Map();
      for (const stored of localRecords) {
        const note = String(stored.key || "").trim() ? stored : this.normalize("", stored);
        if (note.key !== stored.key) await this.put(note, false);
        const existing = localByKey.get(note.key);
        if (!existing || newerThan(note, existing)) localByKey.set(note.key, note);
      }
      const remoteByKey = new Map();
      const duplicateRemoteDocs = [];
      for (const remoteDoc of remoteSnapshot.docs) {
        const data = remoteDoc.data();
        if (!data?.key) continue;
        const remote = this.normalize(data.key, data);
        const existing = remoteByKey.get(remote.key);
        if (!existing || newerThan(remote, existing.note)) {
          if (existing) duplicateRemoteDocs.push({ id: existing.docId, key: remote.key });
          remoteByKey.set(remote.key, { note: remote, docId: remoteDoc.id });
        } else duplicateRemoteDocs.push({ id: remoteDoc.id, key: remote.key });
      }
      let uploaded = 0;
      const allKeys = new Set([...localByKey.keys(), ...remoteByKey.keys()]);
      for (const key of allKeys) {
        const local = localByKey.get(key);
        const remoteEntry = remoteByKey.get(key);
        const remote = remoteEntry?.note;
        if (!local && remote) {
          remote.syncState = "synced";
          remote.syncedRevision = remote.revision;
          remote.localOwnerUid = this.user.uid;
          await this.put(remote, false);
        } else if (local && (!remote || newerThan(local, remote))) {
          await this.upload(local);
          uploaded += 1;
        } else if (local && remote && newerThan(remote, local)) {
          await this.put({ ...remote, id: local.id, localOwnerUid: this.user.uid, syncedRevision: remote.revision, syncState: "synced" }, false);
        } else if (local) {
          local.syncedRevision = local.revision;
          local.syncState = "synced";
          await this.put(local, false);
        }

        const canonicalId = cloudIdForKey(key);
        if (remoteEntry && remoteEntry.docId !== canonicalId) {
          const winner = newerThan(remote, local) ? remote : local;
          if (winner) await this.upload(winner);
          duplicateRemoteDocs.push({ id: remoteEntry.docId, key });
        }
      }
      const deletions = new Map(duplicateRemoteDocs.map((entry) => [entry.id, entry]));
      for (const duplicate of deletions.values()) {
        if (duplicate.id === cloudIdForKey(duplicate.key)) continue;
        await deleteDoc(doc(this.firestore, "users", this.user.uid, "notes", duplicate.id));
      }
      await this.syncOrganizer();
      this.emit("synced", uploaded ? `${uploaded} local ${uploaded === 1 ? "note" : "notes"} synced with ${this.accountEmail}.` : `All notes are synced with ${this.accountEmail}.`);
    } catch (error) {
      this.emit(navigator.onLine ? "conflict" : "offline", error.message);
      throw error;
    } finally {
      this.syncing = false;
      this.onChange(await this.visibleMap());
    }
  }

  async syncOrganizer() {
    if (!this.user) return;
    const localKey = `organizer:${this.user.uid}`;
    const local = await this.getMeta(localKey);
    const reference = doc(this.firestore, "users", this.user.uid, "notes", "notes-organizer-v1");
    const snapshot = await getDoc(reference);
    const remote = snapshot.exists() ? snapshot.data() : null;
    const localTime = Date.parse(local?.updatedAt || 0) || 0;
    const remoteTime = Date.parse(remote?.updatedAt || 0) || 0;
    if (remote && remoteTime > localTime) {
      await this.setMeta(localKey, remote);
      this.organizerOnChange(remote);
    } else if (local && (!remote || localTime > remoteTime)) {
      await setDoc(reference, local);
    }
  }

  async upload(note) {
    const clean = {
      ...note,
      ownerEmail: this.accountEmail.toLowerCase(),
      ownerUid: this.user.uid,
      syncState: "synced",
      syncedRevision: note.revision,
    };
    await setDoc(doc(this.firestore, "users", this.user.uid, "notes", cloudIdForKey(note.key)), clean);
    note.syncedRevision = note.revision;
    note.syncState = "synced";
    await this.put(note, false);
  }

  async unlock(password) {
    if (!password) throw new Error("Enter a backup password or recovery key.");
    const material = await crypto.subtle.importKey("raw", utf8.encode(password), "PBKDF2", false, ["deriveKey"]);
    this.key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: unb64(this.config.salt), iterations: this.config.iterations, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }

  async encodeRecord(note) {
    if (!this.key) throw new Error("Enter a backup password first.");
    const clean = { ...note, syncState: undefined, syncedRevision: undefined };
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, this.key, utf8.encode(JSON.stringify(clean)));
    return JSON.stringify({ format: 1, encrypted: true, salt: this.config.salt, iterations: this.config.iterations, iv: b64(iv), data: b64(cipher) });
  }

  async decodeRecord(text) {
    const envelope = JSON.parse(text);
    if (!envelope.encrypted) return envelope.note;
    if (!this.key) throw new Error("Enter the backup password to read these notes.");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(envelope.iv) }, this.key, unb64(envelope.data));
    return JSON.parse(decode.decode(plain));
  }

  async exportBackup(password = "") {
    // A backup belongs to the active profile only. Including cached data for
    // other accounts would itself be a cross-account privacy leak.
    const ownerUid = this.currentOwnerUid();
    const records = (await this.all()).filter((note) => (note.localOwnerUid || LOCAL_OWNER) === ownerUid);
    if (!password) return JSON.stringify({ format: "abrahamic-books-backup-v2", exportedAt: new Date().toISOString(), notes: records }, null, 2);
    const oldKey = this.key;
    await this.unlock(password);
    const items = [];
    for (const note of records) items.push(await this.encodeRecord(note));
    this.key = oldKey;
    return JSON.stringify({ format: "abrahamic-books-encrypted-backup-v1", salt: this.config.salt, iterations: this.config.iterations, items });
  }

  async importBackup(text, password = "") {
    const backup = JSON.parse(text);
    let records = [];
    if (backup.format === "abrahamic-books-encrypted-backup-v1") {
      if (!password) throw new Error("Enter the backup password or recovery key first.");
      const oldSalt = this.config.salt, oldIterations = this.config.iterations, oldKey = this.key;
      this.config.salt = backup.salt; this.config.iterations = backup.iterations || 250000;
      await this.unlock(password);
      for (const item of backup.items || []) records.push(await this.decodeRecord(item));
      this.config.salt = oldSalt; this.config.iterations = oldIterations; this.key = oldKey;
    } else records = Array.isArray(backup.notes) ? backup.notes : Object.entries(backup.notes || backup).map(([key, note]) => ({ ...note, key: note.key || key }));
    for (const item of records) await this.put(this.normalize(item.key || `note:${uuid()}`, { ...item, id: uuid(), ownerUid: undefined, localOwnerUid: this.currentOwnerUid(), syncedRevision: 0, syncState: "saved locally" }), false);
    this.onChange(await this.visibleMap());
    this.scheduleSync();
  }

  scheduleSync(delay = 900) { clearTimeout(this.timer); this.timer = setTimeout(() => this.sync().catch(() => {}), delay); }
  emit(state, detail = "") { this.dispatchEvent(new CustomEvent("status", { detail: { state, detail } })); }
  async all() { return this.tx(NOTES, "readonly", (store) => store.getAll()); }
  currentOwnerUid() { return this.user?.uid || this.config.accountUid || LOCAL_OWNER; }
  async getByKey(key, ownerUid = this.currentOwnerUid()) {
    return (await this.all()).filter((note) => note.key === key && (note.localOwnerUid || LOCAL_OWNER) === ownerUid).reduce((newest, note) => !newest || newerThan(note, newest) ? note : newest, null);
  }
  async put(note, notify = true) { await this.tx(NOTES, "readwrite", (store) => store.put(note)); if (notify) this.onChange(await this.visibleMap()); }
  async getMeta(key) { return (await this.tx(META, "readonly", (store) => store.get(key)))?.value; }
  async setMeta(key, value) { return this.tx(META, "readwrite", (store) => store.put({ key, value })); }
  async clearAllNotes() { return this.tx(NOTES, "readwrite", (store) => store.clear()); }
  tx(store, mode, action) { return new Promise((resolve, reject) => { const transaction = this.db.transaction(store, mode); const request = action(transaction.objectStore(store)); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
}
