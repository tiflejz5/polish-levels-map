/*
 * cards-store.js — dane fiszek w localStorage (spec 10, sekcja 4).
 *
 *   Klucz per profil: plm.cards.<profileId> (rejestr kluczy: js/profile-data.js)
 *   { version: 1, cards: { <id>: stan }, userDecks: [...], userCards: [...], settings: {...}, daily: { <dzień>: {...} } }
 *
 * Stan jest zapisywany tylko dla kart, które użytkownik ruszył (reszta = nowe). Zapis po każdej
 * zmianie, w try/catch; przy błędzie (np. brak miejsca) komunikat i praca dalej w pamięci.
 * Uszkodzony zapis jest odkładany jako plm.cards.<id>.corrupt-backup i zaczynamy od pustego.
 * Dane trafiają do eksportu (data.cards: { <profileId>: stan }), importu, resetu i usuwania profilu
 * (rejestr kluczy). Walidacja: LM.cardsLogic.sanitizeState.
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
        try { window.localStorage.setItem(keyOf(pid) + BACKUP, raw); } catch (e2) { /* trudno */ }
        data = null;
      }
    }
    memory[pid] = data || L().emptyState();
    return memory[pid];
  }

  /** Dołącza do pamięci to, co druga karta przeglądarki zapisała w międzyczasie (patrz fiszki-logic mergeStates). → true, gdy coś przejęto. */
  function mergeStored(pid) {
    if (!memory[pid]) return false;
    try {
      const raw = window.localStorage.getItem(keyOf(pid));
      return raw ? L().mergeStates(memory[pid], L().sanitizeState(JSON.parse(raw))) : false;
    } catch (e) { return false; }
  }

  /**
   * Zapis stanu profilu. Domyślnie scala go z zapisem w localStorage (dwie karty przeglądarki nie nadpisują sobie ocen);
   * force = true zapisuje stan z pamięci bez scalania (cofnięcie oceny, import), bo tam stan celowo się cofa albo zastępuje.
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
      if (!saveFailed && app() && app().reportSaveError) app().reportSaveError("Nie zapisano fiszek! Brak miejsca albo dostępu do pamięci przeglądarki – nauka trwa dalej, ale zmiany mogą zniknąć po zamknięciu strony.");
      saveFailed = true;
      return false;
    }
  }

  /** Stan aktywnego profilu (bez profilu — tymczasowy, niezapisywany). */
  function data() { return load(activeId()); }

  /** Profile, które mają zapis fiszek (do eksportu, resetu i porządkowania). */
  function storedIds() {
    const out = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        const pid = idOfKey(k);
        if (pid) out.push(pid);
      }
    } catch (e) { /* brak dostępu */ }
    Object.keys(memory).forEach(function (pid) { if (out.indexOf(pid) === -1) out.push(pid); });
    return out;
  }

  function removeProfile(pid) {
    delete memory[pid];
    try { window.localStorage.removeItem(keyOf(pid)); window.localStorage.removeItem(keyOf(pid) + BACKUP); } catch (e) { /* brak dostępu */ }
  }

  /** Część eksportu: { <profileId>: stan } (tylko profile z danymi). */
  function exportData() {
    const out = {};
    storedIds().forEach(function (pid) { out[pid] = JSON.parse(JSON.stringify(load(pid))); });
    return out;
  }

  /** Część importu: zły format → wyjątek z opisem (cały import odrzucony). */
  function parseImport(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("The \"cards\" part of the file has a wrong format.");
    const out = {};
    Object.keys(raw).slice(0, 500).forEach(function (pid) {
      if (typeof pid !== "string" || pid.length > 80) return;
      out[pid] = L().sanitizeState(raw[pid]); // wyjątek = cały import odrzucony (np. nieznana wersja)
    });
    return out;
  }

  /** Zapis importu: część z pliku zastępuje fiszki; profile spoza listy są usuwane. */
  function applyImport(parsed, profileIds) {
    storedIds().forEach(function (pid) { if (!parsed[pid]) removeProfile(pid); });
    Object.keys(parsed).forEach(function (pid) { memory[pid] = parsed[pid]; save(pid, true); });
    if (profileIds) storedIds().forEach(function (pid) { if (profileIds.indexOf(pid) === -1) removeProfile(pid); });
  }

  function clearAll() { storedIds().forEach(removeProfile); }

  // Druga karta przeglądarki zapisała fiszki: przejmujemy nowsze oceny, żeby następny zapis stąd ich nie cofnął
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
