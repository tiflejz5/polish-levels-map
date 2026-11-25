/*
 * mistake-task.js — a "mistake" item in the Review session: when a mistake-log entry has a ref to an exercise item,
 * the session shows the ORIGINAL item (with its hint) instead of a card built from the entry's text.
 *
 *   Pure logic (tests: node tools/tests.js):
 *     parseRef(ref)        "ex:<item id>" → { kind: "ex", itemId } or null
 *     viewFor(entry)       "task" (entry with a known ref) | "card" (manual entry, no ref, unknown ref)
 *   With data:
 *     load(entry)          Promise → { kind: "engine", item } | null (item not found → the session shows the card)
 * Engine items are drawn by LM.exercises.startSingle (js/cards.js). The lettered exam formats of the original app
 * (refs "<exam code>:<set>:<n>") were removed with the C1 module (spec 06 E8); such refs fall back to the card.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  function parseRef(ref) {
    const m = /^ex:([a-z0-9][a-z0-9-]*)$/.exec(String(ref || ""));
    return m ? { kind: "ex", itemId: m[1] } : null;
  }

  function viewFor(entry) { return entry && parseRef(entry.ref) ? "task" : "card"; }

  /** The original item of an entry, or null (manual entry, deleted set, missing file: the session shows the card). */
  function load(entry) {
    const ref = parseRef(entry && entry.ref);
    if (!ref || !LM.exercises) return Promise.resolve(null);
    const setId = ref.itemId.replace(/-\d{1,3}$/, "");
    return LM.exercises.loadSets([setId]).then(function (sets) {
      const item = sets[0] && sets[0].items.find(function (i) { return i.id === ref.itemId; });
      return item ? { kind: "engine", item: item } : null;
    }, function () { return null; });
  }

  LM.mistakeTask = { parseRef: parseRef, viewFor: viewFor, load: load };
})(window.LM);
