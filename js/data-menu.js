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

  /** Otwiera okno wyboru pliku i zwraca jego tekst (Promise). */
  function pickFileText() {
    return new Promise(function (resolve) {
      const input = el("input", { type: "file", accept: ".json,application/json" });
      input.addEventListener("change", function () {
        const file = input.files && input.files[0];
        if (!file) return;
        file.text().then(resolve, function () {
          LM.dialogs.alert({ title: "Błąd odczytu", message: "Nie udało się odczytać pliku." });
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
      return LM.dialogs.alert({ title: "Nie można zaimportować danych", message: e.message });
    }
    const ls = LM.profileData.summarizeImport(parsed.learning);
    return LM.dialogs.confirm({
      title: "Zastąpić dane w tej przeglądarce?",
      message: "Plik zawiera profile (" + profiles.profiles.length + "): " + (profiles.profiles.map(function (p) { return p.name; }).join(", ") || "brak") +
        (ls ? ", wpisy w dzienniku błędów: " + ls.journalEntries : "") +
        ".\n\nObecne profile, ich postęp i dane nauki w tej przeglądarce zostaną zastąpione.",
      confirmLabel: "Importuj i nadpisz"
    }).then(function (ok) {
      if (!ok) return false;
      app().replaceProfiles(profiles, parsed);
      LM.dialogs.alert({ title: "Gotowe", message: "Dane zostały zaimportowane." });
      return true;
    });
  }

  // ---------- Reset ----------

  /** Reset danych — podwójne potwierdzenie z zaleceniem eksportu. */
  function resetAll() {
    LM.dialogs.confirm({
      title: "Zresetować dane?",
      message: "Zostaną usunięte wszystkie profile z ich postępem „Umiem”, dziennikiem błędów, serią nauki, wynikami testu poziomu, fiszkami, Szlakiem i notatkami. " +
        "Aplikacja wróci do stanu jak przy pierwszym otwarciu, bez żadnych profili. Motyw i układ panelu zostają.\n\n" +
        "Zalecenie: najpierw zrób „Eksportuj dane”, żeby mieć kopię.",
      confirmLabel: "Dalej"
    }).then(function (ok) {
      if (!ok) return false;
      return LM.dialogs.confirm({
        title: "Na pewno?",
        message: "To ostatnie ostrzeżenie. Tej operacji nie można cofnąć. Jeśli nie masz kopii, anuluj i najpierw zrób eksport.",
        confirmLabel: "Tak, usuń dane"
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
