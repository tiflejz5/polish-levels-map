/*
 * data-menu.js — backups and reset ("Data" section of the profile menu).
 *
 * Export: one file <LM.APP.exportName>-YYYY-MM-DD.json with the envelope of js/store.js
 *   { app, kind: "backup", version: 1, exportedAt, data: { profiles, learning, cards, trail } }
 * The data sections come from the key registry (js/profile-data.js), so every per-profile key is in it.
 * Import accepts only that file: another app's file (for example the English app) is refused with a clear
 * message, nothing changes. Reset clears every registry key except theme and sidebar.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const U = LM.utils;
  const el = U.el;

  function app() { return LM.app; }

  // ---------- Export ----------

  function exportAll() {
    LM.store.downloadJSON(LM.store.backupFileName(), LM.store.wrapBackup(LM.profileData.exportAll()));
  }

  // ---------- Import ----------

  /** Opens the file picker and returns the file's text (Promise). */
  function pickFileText() {
    return new Promise(function (resolve) {
      const input = el("input", { type: "file", accept: ".json,application/json" });
      input.addEventListener("change", function () {
        const file = input.files && input.files[0];
        if (!file) return;
        file.text().then(resolve, function () {
          LM.dialogs.alert({ title: "Could not read the file", message: "The file could not be read. Choose the file again." });
        });
      });
      input.click();
    });
  }

  function importAll() {
    pickFileText().then(importText);
  }

  /** Backup text → checks every part → one confirmation → replaces the data. Any error: nothing changes. */
  function importText(text) {
    let profiles, parsed;
    try {
      parsed = LM.profileData.parseAll(LM.store.parseBackup(text));
      profiles = parsed.profiles;
    } catch (e) {
      return LM.dialogs.alert({ title: "Cannot import the data", message: e.message });
    }
    const ls = LM.profileData.summarizeImport(parsed.learning);
    return LM.dialogs.confirm({
      title: "Replace the data in this browser?",
      message: "The file has " + LM.plural(profiles.profiles.length, "profile", "profiles") + ": " + (profiles.profiles.map(function (p) { return p.name; }).join(", ") || "none") +
        (ls ? "; entries in the mistake log: " + ls.journalEntries : "") +
        ".\n\nThe profiles, their progress and learning data in this browser will be replaced.",
      confirmLabel: "Import and replace"
    }).then(function (ok) {
      if (!ok) return false;
      app().replaceProfiles(profiles, parsed);
      LM.dialogs.alert({ title: "Data imported", message: "The data was imported." });
      return true;
    });
  }

  // ---------- Reset ----------

  /** Data reset — double confirmation that recommends an export first. */
  function resetAll() {
    LM.dialogs.confirm({
      title: "Reset the data?",
      message: "All profiles will be deleted with their “I know this” progress, mistake log, streak, placement test results, flashcards, Trail and notes. " +
        "The app goes back to how it was when you first opened it, with no profiles. The theme and the sidebar layout stay.\n\n" +
        "Tip: first use “Export data” to keep a copy.",
      confirmLabel: "Continue"
    }).then(function (ok) {
      if (!ok) return false;
      return LM.dialogs.confirm({
        title: "Are you sure?",
        message: "This is the last warning. This cannot be undone. If you have no copy, cancel and export first.",
        confirmLabel: "Yes, delete the data"
      });
    }).then(function (ok) {
      if (!ok) return;
      LM.profileData.resetAll(); // every key of the registry except theme and sidebar (js/profile-data.js)
      app().replaceProfiles(LM.createEmptyProfiles());
    });
  }

  LM.dataMenu = {
    exportAll: exportAll,
    importAll: importAll,
    importText: importText,
    resetAll: resetAll
  };
})(window.LM);
