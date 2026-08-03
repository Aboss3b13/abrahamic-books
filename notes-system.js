const SERVER_API = "https://abbas2.ali-raza.net/AbrahamicBooks/api";
const SHARED_MIND_MAP_API = `${SERVER_API}/mindmaps.php`;
const SHARED_MIND_MAP_CHUNK_BYTES = 384 * 1024;

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
const newerThan = (left, right) => {
  const revisionDifference = Number(left?.revision || 0) - Number(right?.revision || 0);
  if (revisionDifference) return revisionDifference > 0;
  // A delete and an edit can be created at the same revision on two devices.
  // Keep the tombstone in that tie so stale cached content cannot reappear.
  if (Boolean(left?.deletedAt) !== Boolean(right?.deletedAt)) return Boolean(left?.deletedAt);
  const timeDifference = Date.parse(left?.updatedAt || 0) - Date.parse(right?.updatedAt || 0);
  if (timeDifference) return timeDifference > 0;
  return String(left?.deviceId || "").localeCompare(String(right?.deviceId || "")) > 0;
};

export class NotesSystem extends EventTarget {
  constructor({ onChange = () => {}, isNative = false } = {}) {
    super();
    this.onChange = onChange;
    this.db = null;
    this.syncing = false;
    this.syncRequested = false;
    this.timer = null;
    this.writeQueue = Promise.resolve();
    this.config = { mode: "local", deviceId: "", accountUid: "", salt: "", iterations: 250000 };
    this.isNative = isNative;
    this.key = null;
    this.user = null;
    this.unsubscribeRemote = null;
    this.sharedUnsubscribers = [];
    this.lastReadUnsubscribe = null;
    this.serverPollTimer = null;
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
    const hadPreviousRemoteSync = this.config.mode !== "local";
    if (hadPreviousRemoteSync) this.config.mode = "server";
    if (hadPreviousRemoteSync && !this.config.sessionToken) this.config.needsServerMigration = true;
    if (!["local", "server"].includes(this.config.mode)) this.config.mode = "local";
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
    if (this.config.sessionToken) {
      try {
        const session = await this.request("account.php?action=me");
        this.user = session.user;
        await this.activateAccount(this.user.uid);
      } catch {
        this.config.sessionToken = "";
        await this.setMeta("config", this.config);
      }
    }
    window.addEventListener("online", () => this.scheduleSync(200));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") this.scheduleSync(100);
    });
    if (this.config.mode === "server" && this.user) {
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
      linkedNoteIds: Array.isArray(note.linkedNoteIds) ? [...new Set(note.linkedNoteIds.map(String))].filter((linkedKey) => linkedKey && linkedKey !== resolvedKey) : [],
      folderId: String(note.folderId || ""),
      standalone: note.standalone ?? resolvedKey.startsWith("note:"), revision: Number(note.revision) || 1,
      createdAt: note.createdAt || note.updatedAt || now, updatedAt: note.updatedAt || now,
      deviceId: note.deviceId || this.config.deviceId, deletedAt: note.deletedAt || null,
      localOwnerUid: note.localOwnerUid || note.ownerUid || "",
      syncedRevision: Number(note.syncedRevision) || 0, syncState: note.syncState || "saved locally", conflictOf: note.conflictOf || null,
    };
  }

  async request(path, options = {}, authenticated = true) {
    const headers = { ...(options.headers || {}) };
    if (authenticated && this.config.sessionToken) headers.Authorization = `Bearer ${this.config.sessionToken}`;
    if (options.body && !(options.body instanceof Uint8Array) && typeof options.body !== "string") {
      headers["Content-Type"] = "application/json";
      options = { ...options, body: JSON.stringify(options.body) };
    }
    const response = await fetch(`${SERVER_API}/${path}`, { ...options, headers });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The Abrahamic Books server could not complete this request.");
    return result;
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
    if (!["local", "server"].includes(mode)) throw new Error("Unknown storage mode");
    this.config.mode = mode;
    await this.setMeta("config", this.config);
    this.emit(mode === "local" ? "saved locally" : this.user ? "syncing" : "offline");
    if (mode === "server" && this.user) this.scheduleSync(0);
  }

  async connect(email, password, createAccount = false) {
    if (!email || !password) throw new Error("Enter your email and password.");
    if (!navigator.onLine) throw new Error("Connect to the internet to sign in to your Abrahamic Books account.");
    const result = await this.request(`account.php?action=${createAccount ? "register" : "login"}`, {
      method: "POST", body: { email, password },
    }, false);
    const previousUid = this.config.accountUid;
    this.config.sessionToken = result.token;
    this.config.needsServerMigration = false;
    this.user = result.user;
    if (previousUid && previousUid !== this.user.uid) await this.migrateCachedAccount(previousUid, this.user.uid);
    await this.activateAccount(this.user.uid);
    await this.setMode("server");
    this.startRealtimeSync();
    await this.sync({ force: true });
  }

  async disconnect() {
    if (this.config.sessionToken) await this.request("account.php?action=logout", { method: "POST" }).catch(() => {});
    this.unsubscribeRemote?.();
    this.unsubscribeRemote = null;
    this.stopLastReadSync();
    this.stopSharedSync();
    this.user = null;
    this.config.sessionToken = "";
    this.config.accountUid = "";
    await this.setMode("local");
    this.onChange(await this.visibleMap());
  }

  get accountEmail() { return this.user?.email || ""; }
  get signedIn() { return Boolean(this.user); }

  async migrateCachedAccount(previousUid, nextUid) {
    for (const note of await this.all()) {
      if (note.localOwnerUid !== previousUid) continue;
      note.localOwnerUid = nextUid;
      note.syncedRevision = 0;
      note.syncState = "saved locally";
      await this.put(note, false);
    }
    const previousOrganizer = await this.getMeta(`organizer:${previousUid}`);
    if (previousOrganizer && !(await this.getMeta(`organizer:${nextUid}`))) await this.setMeta(`organizer:${nextUid}`, previousOrganizer);
    this.config.migratedLegacyAccountUid = previousUid;
    await this.setMeta("config", this.config);
  }

  stopLastReadSync() {
    this.lastReadUnsubscribe?.();
    this.lastReadUnsubscribe = null;
  }

  watchLastRead(onChange, onError = () => {}) {
    this.stopLastReadSync();
    if (!this.user) { onChange(null); return; }
    let active = true;
    const poll = async () => {
      try { const result = await this.request("sync.php?action=last-read"); if (active) onChange(result.lastRead || null); }
      catch (error) { if (active) onError(error); }
    };
    poll();
    const timer = setInterval(poll, 8000);
    this.lastReadUnsubscribe = () => { active = false; clearInterval(timer); };
  }

  async setLastRead(lastRead) {
    if (!this.user) return;
    await this.request("sync.php?action=last-read", { method: "POST", body: lastRead });
  }

  async getLastRead() {
    if (!this.user) return null;
    return (await this.request("sync.php?action=last-read")).lastRead || null;
  }

  stopSharedSync() {
    this.sharedUnsubscribers.forEach((unsubscribe) => unsubscribe?.());
    this.sharedUnsubscribers = [];
  }

  watchSharedNotes(onChange, onError = () => {}) {
    this.stopSharedSync();
    if (!this.user?.email) { onChange([]); return; }
    let active = true;
    const poll = async () => {
      try { const result = await this.request("shared-notes.php"); if (active) onChange(result.notes || []); }
      catch (error) { if (active) onError(error); }
    };
    poll();
    const timer = setInterval(poll, 8000);
    this.sharedUnsubscribers = [() => { active = false; clearInterval(timer); }];
  }

  async createSharedNote(note, inviteEmails = []) {
    if (!this.user?.email) throw new Error("Sign in before creating a shared note.");
    const memberEmails = [...new Set(inviteEmails.map((email) => String(email).trim().toLowerCase()).filter(Boolean))];
    return this.request("shared-notes.php", { method: "POST", body: {
      title: String(note.title || "Untitled shared note"), text: String(note.text || ""),
      tags: Array.isArray(note.tags) ? note.tags.map(String) : [], references: Array.isArray(note.references) ? note.references.map(String) : [],
      folderId: String(note.folderId || ""), memberEmails,
    } });
  }

  async updateSharedNote(id, changes) {
    if (!this.user) throw new Error("Sign in to edit shared notes.");
    const clean = {};
    for (const key of ["title", "text", "tags", "references", "folderId", "memberEmails"]) if (key in changes) clean[key] = changes[key];
    await this.request(`shared-notes.php?id=${encodeURIComponent(id)}`, { method: "PUT", body: clean });
  }

  async deleteSharedNote(id) {
    if (!this.user) throw new Error("Sign in to delete shared notes.");
    await this.request(`shared-notes.php?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async createSharedMindMap(map, inviteEmails = [], accessMode = "link") {
    if (!this.user?.email) throw new Error("Sign in before sharing a mind map.");
    const mode = accessMode === "custom" ? "custom" : "link";
    const memberEmails = mode === "custom"
      ? [...new Set(inviteEmails.map((email) => String(email).trim().toLowerCase()).filter(Boolean))]
      : [];
    if (mode === "custom" && !memberEmails.length) throw new Error("Add at least one email address.");
    const now = new Date().toISOString();
    const clean = {
      version: 1,
      title: String(map.title || "Shared mind map").slice(0, 120),
      focusNoteId: String(map.focusNoteId || ""),
      notes: Array.isArray(map.notes) ? map.notes : [],
      folders: Array.isArray(map.folders) ? map.folders : [],
      ownerUid: this.user.uid,
      memberEmails,
      accessMode: mode,
      createdAt: now,
      updatedAt: now,
    };
    if (!clean.notes.length) throw new Error("This mind map has no notes to share.");
    const bytes = utf8.encode(JSON.stringify(clean));
    const totalChunks = Math.max(1, Math.ceil(bytes.byteLength / SHARED_MIND_MAP_CHUNK_BYTES));
    const startResponse = await fetch(`${SHARED_MIND_MAP_API}?action=start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.config.sessionToken}` },
      body: JSON.stringify({ accessMode: mode, memberEmails, totalBytes: bytes.byteLength, totalChunks }),
    });
    const upload = await startResponse.json().catch(() => ({}));
    if (!startResponse.ok) throw new Error(upload.error || "Could not start the mind-map upload.");
    const uploadChunk = async (index) => {
      const response = await fetch(`${SHARED_MIND_MAP_API}?action=chunk&id=${encodeURIComponent(upload.id)}&index=${index}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream", "X-Upload-Token": upload.uploadToken },
        body: bytes.slice(index * SHARED_MIND_MAP_CHUNK_BYTES, (index + 1) * SHARED_MIND_MAP_CHUNK_BYTES),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Could not upload part ${index + 1}.`);
    };
    for (let index = 0; index < totalChunks; index += 3) {
      await Promise.all(Array.from({ length: Math.min(3, totalChunks - index) }, (_, offset) => uploadChunk(index + offset)));
    }
    const finishResponse = await fetch(`${SHARED_MIND_MAP_API}?action=finish&id=${encodeURIComponent(upload.id)}`, {
      method: "POST",
      headers: { "X-Upload-Token": upload.uploadToken },
    });
    const result = await finishResponse.json().catch(() => ({}));
    if (!finishResponse.ok) throw new Error(result.error || "Could not finish the mind-map upload.");
    return result;
  }

  async getSharedMindMap(id) {
    const safeId = String(id || "").trim();
    if (!/^[a-f0-9]{18}$/.test(safeId)) throw new Error("This mind map link is invalid.");
    const headers = {};
    if (this.user) headers.Authorization = `Bearer ${this.config.sessionToken}`;
    const response = await fetch(`${SHARED_MIND_MAP_API}?id=${encodeURIComponent(safeId)}`, { headers });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "This shared mind map is no longer available.");
    return result;
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
          parentId: typeof folder.parentId === "string" ? folder.parentId.slice(0, 120) : "",
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
    const key = `organizer:${this.currentOwnerUid()}`;
    const existing = (await this.getMeta(key)) || {};
    const contentUnchanged = JSON.stringify(existing.folders || []) === JSON.stringify(folders)
      && JSON.stringify(existing.tagCatalog || {}) === JSON.stringify(tagCatalog);
    const hasLegacySyncedUi = "viewMode" in existing || "selectedFolderId" in existing;
    const clean = {
      folders,
      tagCatalog,
      updatedAt: contentUnchanged && !hasLegacySyncedUi ? existing.updatedAt || "1970-01-01T00:00:00.000Z" : new Date().toISOString(),
      deviceId: contentUnchanged && !hasLegacySyncedUi ? existing.deviceId || this.config.deviceId : this.config.deviceId,
    };
    if (contentUnchanged && !hasLegacySyncedUi) return clean;
    await this.setMeta(key, clean);
    this.scheduleSync(250);
    return clean;
  }

  startRealtimeSync() {
    this.unsubscribeRemote?.();
    if (!this.user || this.config.mode !== "server") return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) this.scheduleSync(100);
    }, 8000);
    this.unsubscribeRemote = () => clearInterval(timer);
  }

  async sync({ force = false } = {}) {
    if (this.syncing) {
      this.syncRequested = true;
      return;
    }
    if (this.config.mode !== "server") return;
    if (!this.user) throw new Error("Sign in to your Abrahamic Books account first.");
    if (!navigator.onLine) { this.emit("offline"); return; }
    this.syncing = true;
    this.emit("syncing");
    try {
      await this.writeQueue;
      const remoteSnapshot = await this.request("sync.php?action=notes");
      const localRecords = (await this.all()).filter((note) => note.localOwnerUid === this.user.uid);
      const localByKey = new Map();
      for (const stored of localRecords) {
        const note = String(stored.key || "").trim() ? stored : this.normalize("", stored);
        if (note.key !== stored.key) await this.put(note, false);
        const existing = localByKey.get(note.key);
        if (!existing || newerThan(note, existing)) localByKey.set(note.key, note);
      }
      const remoteByKey = new Map();
      for (const data of remoteSnapshot.notes || []) {
        if (!data?.key) continue;
        const remote = this.normalize(data.key, data);
        const existing = remoteByKey.get(remote.key);
        if (!existing || newerThan(remote, existing)) remoteByKey.set(remote.key, remote);
      }
      let uploaded = 0;
      const allKeys = new Set([...localByKey.keys(), ...remoteByKey.keys()]);
      for (const key of allKeys) {
        const local = localByKey.get(key);
        const remote = remoteByKey.get(key);
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
      }
      await this.syncOrganizer();
      this.emit("synced", uploaded ? `${uploaded} local ${uploaded === 1 ? "note" : "notes"} synced to this VPS.` : `All notes are synced to this VPS for ${this.accountEmail}.`);
    } catch (error) {
      this.emit(navigator.onLine ? "conflict" : "offline", error.message);
      throw error;
    } finally {
      this.syncing = false;
      this.onChange(await this.visibleMap());
      if (this.syncRequested) {
        this.syncRequested = false;
        this.scheduleSync(0);
      }
    }
  }

  async syncOrganizer() {
    if (!this.user) return;
    const localKey = `organizer:${this.user.uid}`;
    const local = await this.getMeta(localKey);
    const remote = (await this.request("sync.php?action=organizer")).organizer;
    const localTime = Date.parse(local?.updatedAt || 0) || 0;
    const remoteTime = Date.parse(remote?.updatedAt || 0) || 0;
    if (remote && remoteTime > localTime) {
      await this.setMeta(localKey, remote);
      this.organizerOnChange(remote);
    } else if (local && (!remote || localTime > remoteTime)) {
      await this.request("sync.php?action=organizer", { method: "POST", body: local });
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
    await this.request("sync.php?action=note", { method: "POST", body: clean });
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
    const organizer = await this.getMeta(`organizer:${ownerUid}`) || null;
    if (!password) return JSON.stringify({ format: "abrahamic-books-backup-v3", exportedAt: new Date().toISOString(), notes: records, organizer }, null, 2);
    const oldKey = this.key;
    await this.unlock(password);
    const items = [];
    for (const note of records) items.push(await this.encodeRecord(note));
    const organizerItem = organizer ? await this.encodeRecord({ type: "organizer", organizer }) : "";
    this.key = oldKey;
    return JSON.stringify({ format: "abrahamic-books-encrypted-backup-v2", salt: this.config.salt, iterations: this.config.iterations, items, organizerItem });
  }

  async importBackup(text, password = "") {
    const backup = JSON.parse(text);
    let records = [];
    let organizer = backup.organizer && typeof backup.organizer === "object" ? backup.organizer : null;
    if (["abrahamic-books-encrypted-backup-v1", "abrahamic-books-encrypted-backup-v2"].includes(backup.format)) {
      if (!password) throw new Error("Enter the backup password or recovery key first.");
      const oldSalt = this.config.salt, oldIterations = this.config.iterations, oldKey = this.key;
      this.config.salt = backup.salt; this.config.iterations = backup.iterations || 250000;
      await this.unlock(password);
      for (const item of backup.items || []) records.push(await this.decodeRecord(item));
      if (backup.organizerItem) organizer = (await this.decodeRecord(backup.organizerItem))?.organizer || null;
      this.config.salt = oldSalt; this.config.iterations = oldIterations; this.key = oldKey;
    } else records = Array.isArray(backup.notes) ? backup.notes : Object.entries(backup.notes || backup).map(([key, note]) => ({ ...note, key: note.key || key }));
    for (const item of records) await this.put(this.normalize(item.key || `note:${uuid()}`, { ...item, id: uuid(), ownerUid: undefined, localOwnerUid: this.currentOwnerUid(), syncedRevision: 0, syncState: "saved locally" }), false);
    if (organizer) await this.saveOrganizer(organizer);
    this.onChange(await this.visibleMap());
    this.scheduleSync();
    return organizer;
  }

  scheduleSync(delay = 900) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync().catch(() => {}), delay);
  }
  async flush() {
    clearTimeout(this.timer);
    await this.writeQueue;
    if (this.config.mode === "server" && this.user && navigator.onLine) await this.sync({ force: true });
  }
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
