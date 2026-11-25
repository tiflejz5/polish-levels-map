/*
 * cards-store.js — flashcard data in localStorage (spec 10, section 4).
 *
 *   Key per profile: plm.cards.<profileId> (key registry: js/profile-data.js)
 *   { version: 1, cards: { <id>: state }, userDecks: [...], userCards: [...], settings: {...}, daily: { <day>: {...} } }
 *
 * State is saved only for cards the user has touched (the rest = new). Saved after every
 * change, in try/catch; on an error (e.g. storage full) a message, and work goes on in memory.
 * A damaged record is put aside as plm.cards.<id>.corrupt-backup and we start from empty.
 * The data goes into the export (data.cards: { <profileId>: state }), import, reset and profile deletion
 * (key registry). Validation: LM.cardsLogic.sanitizeState.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const PREFIX = LM.APP.storagePrefix + "cards.";
  const BACKUP = ".corrupt-backup";
  const memory = {}; // { profileId: stan }
  let saveFailed = false;

  function L() { return LM.cardsLogic; }
  function app() { return LM.app; }
  function keyOf(pid) { return PREFIX + pid; }
  /** Profile id of a stored key, or null (other keys and backups). */
  function idOfKey(k) { return k && k.indexOf(PREFIX) === 0 && k.slice(-BACKUP.length) !== BACKUP && k.length > PREFIX.length ? k.slice(PREFIX.length) : null; }
  function activeId() { const p = app() && app().getActiveProfile(); return p ? p.id : null; }

  function load(pid) {
    if (!pid) return L().emptyState();
    if (memory[pid]) return memory[pid];
    let raw = null;
    try { raw = window.localStorage.getItem(keyOf(pid)); } catch (e) { raw = null; }
    let data = null;
    if (raw) {
      try { data = L().sanitizeState(JSON.parse(raw)); } catch (e) {
        try { window.localStorage.setItem(keyOf(pid) + BACKUP, raw); } catch (e2) { /* never mind */ }
        data = null;
      }
    }
    memory[pid] = data || L().emptyState();
    return memory[pid];
  }

  /** Adds to memory what another browser tab saved in the meantime (see cards-logic mergeStates). → true when something was taken. */
  function mergeStored(pid) {
    if (!memory[pid]) return false;
    try {
      const raw = window.localStorage.getItem(keyOf(pid));
      return raw ? L().mergeStates(memory[pid], L().sanitizeState(JSON.parse(raw))) : false;
    } catch (e) { return false; }
  }

  /**
   * Saving the profile state. By default it is merged with the record in localStorage (two browser tabs do not overwrite each other's ratings);
   * force = true saves the state from memory without merging (undoing a rating, import), because there the state goes back or is replaced on purpose.
   */
  function save(pid, force) {
    pid = pid || activeId();
    if (!pid || !memory[pid]) return true;
    if (LM.state && LM.state.storageOk === false) return false;
    if (!force) mergeStored(pid);
    try {
      memory[pid].daily = L().pruneDaily(memory[pid].daily, 400);
      window.localStorage.setItem(keyOf(pid), JSON.stringify(memory[pid]));
      saveFailed = false;
      return true;
    } catch (e) {
      if (!saveFailed && app() && app().reportSaveError) app().reportSaveError("Flashcards were not saved! The browser storage is full or not available – learning goes on, but changes may be lost when you close the page.");
      saveFailed = true;
      return false;
    }
  }

  /** State of the active profile (without a profile — temporary, not saved). */
  function data() { return load(activeId()); }

  /** Profiles that have a flashcard record (for export, reset and cleanup). */
  function storedIds() {
    const out = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        const pid = idOfKey(k);
        if (pid) out.push(pid);
      }
    } catch (e) { /* no access */ }
    Object.keys(memory).forEach(function (pid) { if (out.indexOf(pid) === -1) out.push(pid); });
    return out;
  }

  function removeProfile(pid) {
    delete memory[pid];
    try { window.localStorage.removeItem(keyOf(pid)); window.localStorage.removeItem(keyOf(pid) + BACKUP); } catch (e) { /* no access */ }
  }

  /** Export part: { <profileId>: state } (only profiles with data). */
  function exportData() {
    const out = {};
    storedIds().forEach(function (pid) { out[pid] = JSON.parse(JSON.stringify(load(pid))); });
    return out;
  }

  /** Import part: a wrong format → an exception with a description (the whole import is refused). */
  function parseImport(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("The \"cards\" part of the file has a wrong format.");
    const out = {};
    Object.keys(raw).slice(0, 500).forEach(function (pid) {
      if (typeof pid !== "string" || pid.length > 80) return;
      out[pid] = L().sanitizeState(raw[pid]); // exception = the whole import is refused (e.g. an unknown version)
    });
    return out;
  }

  /** Saving an import: the part from the file replaces the flashcards; profiles not on the list are deleted. */
  function applyImport(parsed, profileIds) {
    storedIds().forEach(function (pid) { if (!parsed[pid]) removeProfile(pid); });
    Object.keys(parsed).forEach(function (pid) { memory[pid] = parsed[pid]; save(pid, true); });
    if (profileIds) storedIds().forEach(function (pid) { if (profileIds.indexOf(pid) === -1) removeProfile(pid); });
  }

  function clearAll() { storedIds().forEach(removeProfile); }

  // Another browser tab saved flashcards: we take the newer ratings so the next save from here does not undo them
  window.addEventListener("storage", function (e) {
    const pid = idOfKey(e.key);
    if (!pid) return;
    if (memory[pid] && mergeStored(pid) && app() && app().refreshLearning) app().refreshLearning();
  });

  LM.cardsStore = {
    mergeStored: mergeStored,
    keyOf: keyOf, data: data, load: load, save: save,
    exportData: exportData, parseImport: parseImport, applyImport: applyImport,
    removeProfile: removeProfile, clearAll: clearAll
  };
})(window.LM);
