/*
 * trail-store.js — the Trail state in localStorage (spec v7 13, section 3).
 *
 *   Key per profile: plm.trail.<profileId> (key registry: js/profile-data.js)
 *   { version: 1, start: { level, source: "test"|"manual"|"default", at } | null,
 *     stops: { <stopId>: { done, via: "quiz"|"umiem"|"skip"|"set", best?, at } },
 *     reviews: { <checkpointId>: { best, of, at } } }
 *
 * Export / import / reset and profile deletion work as in js/cards-store.js (the “trail” part of the backup).
 * Validation: LM.trailLogic.sanitizeState. Without a profile: a temporary state, not saved.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const PREFIX = LM.APP.storagePrefix + "trail.";
  const BACKUP = ".corrupt-backup";
  const memory = {}; // { profileId: stan }

  function L() { return LM.trailLogic; }
  function app() { return LM.app; }
  function keyOf(pid) { return PREFIX + pid; }
  /** Profile id of a stored key, or null (other keys and backups). */
  function idOfKey(k) { return k && k.indexOf(PREFIX) === 0 && k.slice(-BACKUP.length) !== BACKUP && k.length > PREFIX.length ? k.slice(PREFIX.length) : null; }
  function activeId() { const p = app() && app().getActiveProfile(); return p ? p.id : null; }
  function stamp() { return new Date().toISOString(); }

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

  function save(pid) {
    pid = pid || activeId();
    if (!pid || !memory[pid]) return true;
    if (LM.state && LM.state.storageOk === false) return false;
    try { window.localStorage.setItem(keyOf(pid), JSON.stringify(memory[pid])); return true; } catch (e) {
      if (app() && app().reportSaveError) app().reportSaveError("Trail progress was not saved! The browser storage is full or not available.");
      return false;
    }
  }

  /** State of the active profile (without a profile — temporary). */
  function data() { return load(activeId()); }

  // ---------- state changes ----------

  /** Starting point. source: “test” (placement test result), “manual” (by hand), “default”. A manual choice is not overwritten by a test. */
  function setStart(level, source, force) {
    if (!activeId() || L().LEVELS.indexOf(level) === -1) return false;
    const d = data();
    if (!force && source === "test" && d.start && d.start.source === "manual") return false;
    d.start = { level: level, source: source === "manual" || source === "test" ? source : "default", at: stamp() };
    return save();
  }

  /** A stop's quiz result (number of correct answers); we keep the best. Passed with ≥ 3/4 (via “quiz”). */
  function recordQuiz(stopId, score) {
    if (!activeId()) return null;
    const d = data();
    const prev = d.stops[stopId];
    const prevBest = prev && prev.via === "quiz" && typeof prev.best === "number" ? prev.best : 0;
    const best = Math.max(score, prevBest);
    d.stops[stopId] = { done: best >= L().PASS_QUIZ, via: "quiz", best: best, at: stamp() };
    save();
    return d.stops[stopId];
  }

  function skipStop(stopId) {
    if (!activeId()) return false;
    const d = data();
    const cur = d.stops[stopId];
    if (cur && cur.via === "quiz" && cur.best >= L().PASS_QUIZ) return false; // a stop passed by a quiz stays passed
    d.stops[stopId] = { done: false, via: "skip", at: stamp() };
    return save();
  }

  function unskipStop(stopId) {
    if (!activeId()) return false;
    const d = data();
    if (d.stops[stopId] && d.stops[stopId].via === "skip") { delete d.stops[stopId]; return save(); }
    return false;
  }

  function recordReview(id, best, of) {
    if (!activeId()) return null;
    const d = data();
    const prev = d.reviews[id];
    d.reviews[id] = { best: Math.max(best, prev ? prev.best : 0), of: of, at: stamp() };
    save();
    return d.reviews[id];
  }

  // ---------- profiles, export, import, reset ----------

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
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("The \"trail\" part of the file has a wrong format.");
    const out = {};
    Object.keys(raw).slice(0, 500).forEach(function (pid) {
      if (typeof pid !== "string" || pid.length > 80) return;
      out[pid] = L().sanitizeState(raw[pid]); // exception = the whole import is refused
    });
    return out;
  }

  /** Saving an import: the part from the file replaces the Trail data; profiles not on the list are deleted. */
  function applyImport(parsed, profileIds) {
    storedIds().forEach(function (pid) { if (!parsed[pid]) removeProfile(pid); });
    Object.keys(parsed).forEach(function (pid) { memory[pid] = parsed[pid]; save(pid); });
    if (profileIds) storedIds().forEach(function (pid) { if (profileIds.indexOf(pid) === -1) removeProfile(pid); });
  }

  function clearAll() { storedIds().forEach(removeProfile); }

  LM.trailStore = {
    keyOf: keyOf, load: load, data: data, save: save,
    setStart: setStart, recordQuiz: recordQuiz, skipStop: skipStop, unskipStop: unskipStop, recordReview: recordReview,
    exportData: exportData, parseImport: parseImport, applyImport: applyImport, removeProfile: removeProfile, clearAll: clearAll
  };
})(window.LM);
