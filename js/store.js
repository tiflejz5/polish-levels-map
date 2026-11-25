/*
 * store.js — profiles, UI state and the backup file envelope (spec 02 §5).
 *
 *   plm.profiles  { version: 1, activeId | null, profiles: [{ id, name, progress: { <topic id>: true } }] }
 *   plm.ui        { levelId, categoryId } — convenience only, errors are ignored
 * Keys come from LM.APP.storagePrefix; the full key list is the registry in js/profile-data.js.
 * All schemas are version 1. There are no migrations: data of the original app (elm_* keys) is never read.
 *
 * Content (the checklist) is NOT stored any more (spec 01 D8): it comes from data/. Until stage 1B removes
 * the old content store, loadContent() returns the built-in list and saveContent() keeps nothing.
 *
 * Backup file: { app: LM.APP.exportName, kind: "backup", version: 1, exportedAt, data: { profiles, learning, cards, trail } },
 * file name <exportName>-YYYY-MM-DD.json. Import refuses a file of another app with a clear message.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const U = LM.utils;
  const P = LM.APP.storagePrefix;
  const PROFILES_KEY = P + "profiles";
  const UI_KEY = P + "ui";
  const TEST_KEY = P + "storage-test";
  const VERSION = 1;          // plm.profiles schema
  const BACKUP_VERSION = 1;   // backup file envelope

  // ---------- localStorage access ----------

  /** Does localStorage work? (it can be blocked in private mode or by settings) */
  function isStorageAvailable() {
    try {
      window.localStorage.setItem(TEST_KEY, "1");
      window.localStorage.removeItem(TEST_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  function readRaw(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  /** Writes text; returns { ok, error }. */
  function writeRaw(key, text) {
    try {
      window.localStorage.setItem(key, text);
      return { ok: true };
    } catch (e) {
      const quota = e && (e.name === "QuotaExceededError" || e.code === 22);
      return { ok: false, error: quota ? "The browser storage is full." : "The browser did not allow saving data." };
    }
  }

  function str(value) {
    if (typeof value === "string") return value;
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function parseJSON(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error("The data is not valid JSON (" + e.message + ").");
    }
  }

  // ---------- Content (memory only until stage 1B) ----------

  function loadContent() { return { status: "new", data: LM.createDefaultData() }; }
  function saveContent() { return { ok: true }; }

  // ---------- Profiles (each profile has its own progress) ----------

  /** Progress: only "topic id → true" entries are kept. */
  function normalizeProgress(raw) {
    if (!U.isPlainObject(raw)) throw new Error("Progress is not an object.");
    const clean = {};
    Object.keys(raw).forEach(function (key) {
      if (raw[key] === true) clean[key] = true;
    });
    return clean;
  }

  /**
   * Checks a profile list and returns a clean copy. An empty list is valid (the welcome screen shows).
   * Throws when the shape or version is wrong.
   */
  function normalizeProfiles(raw) {
    if (!U.isPlainObject(raw) || !Array.isArray(raw.profiles)) throw new Error("No profile list (\"profiles\").");
    if (raw.version !== VERSION) {
      throw new Error(typeof raw.version === "number" && raw.version > VERSION
        ? "The profiles come from a newer version of the app. Update the app files."
        : "Unknown profile data version (" + JSON.stringify(raw.version) + ").");
    }
    const seen = new Set();
    const profiles = raw.profiles.filter(U.isPlainObject).map(function (p) {
      let id = typeof p.id === "string" ? p.id.trim() : "";
      if (!id || seen.has(id)) id = U.uid("p");
      seen.add(id);
      return {
        id: id,
        name: str(p.name).trim() || "Unnamed profile",
        progress: U.isPlainObject(p.progress) ? normalizeProgress(p.progress) : {}
      };
    });
    const activeId = profiles.some(function (p) { return p.id === raw.activeId; })
      ? raw.activeId
      : (profiles.length ? profiles[0].id : null);
    return { version: VERSION, activeId: activeId, profiles: profiles };
  }

  /**
   * Loads the profiles: { status: "new" | "ok" | "corrupt", data, error?, raw? }.
   * "corrupt" leaves the stored value untouched; js/app.js shows the corrupt-data screen
   * (import a backup, download the broken data, or start with no profiles).
   */
  function loadProfiles() {
    const raw = readRaw(PROFILES_KEY);
    if (raw === null) return { status: "new", data: LM.createEmptyProfiles() };
    try {
      return { status: "ok", data: normalizeProfiles(parseJSON(raw)) };
    } catch (e) {
      return { status: "corrupt", data: LM.createEmptyProfiles(), error: e.message || String(e), raw: raw };
    }
  }

  function saveProfiles(profilesData) {
    return writeRaw(PROFILES_KEY, JSON.stringify(profilesData));
  }

  // Registry owner of the "profiles" section (js/profile-data.js). The list itself lives in LM.state.
  function exportData() { return JSON.parse(JSON.stringify((LM.state && LM.state.profiles) || LM.createEmptyProfiles())); }
  function parseImport(raw) { return normalizeProfiles(raw); }
  function applyImport() { /* js/app.js replaceProfiles() sets LM.state.profiles and saves it */ }
  function removeProfile() { /* the profile list is edited by js/app.js */ }
  function clearAll() {
    try { window.localStorage.removeItem(PROFILES_KEY); } catch (e) { /* no access */ }
  }

  // ---------- UI state (convenience only) ----------

  function loadUI() {
    const fallback = { levelId: LM.LEVEL_IDS[0], categoryId: null };
    try {
      const ui = JSON.parse(readRaw(UI_KEY) || "null");
      if (!U.isPlainObject(ui)) return fallback;
      return {
        levelId: typeof ui.levelId === "string" ? ui.levelId : fallback.levelId,
        categoryId: typeof ui.categoryId === "string" ? ui.categoryId : null
      };
    } catch (e) {
      return fallback;
    }
  }

  function saveUI(ui) {
    writeRaw(UI_KEY, JSON.stringify(ui));
  }

  // ---------- Backup file ----------

  function backupFileName() { return LM.APP.exportName + "-" + U.dateStamp() + ".json"; }

  /** The backup envelope around the data part (see the header). */
  function wrapBackup(data) {
    return { app: LM.APP.exportName, kind: "backup", version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: data };
  }

  /**
   * Reads a backup file's text → its data part. Throws with a message for the user when the file is
   * not JSON, belongs to another app, is not a backup, or comes from a newer version.
   */
  function parseBackup(text) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { throw new Error("The file is not a valid JSON file."); }
    if (!U.isPlainObject(obj)) throw new Error("The file does not contain data of this app.");
    if (obj.app !== LM.APP.exportName) {
      throw new Error(typeof obj.app === "string" && obj.app
        ? "This file belongs to another app (" + obj.app + "), not to " + LM.APP.appTitle + ". Nothing was changed."
        : "This is not a " + LM.APP.appTitle + " backup. Nothing was changed.");
    }
    if (obj.kind !== "backup") throw new Error("This file is not a backup (kind: " + JSON.stringify(obj.kind) + ").");
    if (typeof obj.version !== "number" || obj.version > BACKUP_VERSION) throw new Error("The backup comes from a newer version of the app. Update the app files.");
    if (!U.isPlainObject(obj.data)) throw new Error("The backup has no data.");
    return obj.data;
  }

  /** Downloads an object as a .json file (Blob + link with the download attribute). */
  function downloadJSON(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = U.el("a", { href: url, download: filename });
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  LM.store = {
    VERSION: VERSION,
    BACKUP_VERSION: BACKUP_VERSION,
    isStorageAvailable: isStorageAvailable,
    loadContent: loadContent,
    saveContent: saveContent,
    normalizeProfiles: normalizeProfiles,
    loadProfiles: loadProfiles,
    saveProfiles: saveProfiles,
    exportData: exportData,
    parseImport: parseImport,
    applyImport: applyImport,
    removeProfile: removeProfile,
    clearAll: clearAll,
    loadUI: loadUI,
    saveUI: saveUI,
    backupFileName: backupFileName,
    wrapBackup: wrapBackup,
    parseBackup: parseBackup,
    downloadJSON: downloadJSON
  };
})(window.LM);
