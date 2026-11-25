/*
 * mistake-task.js — a "mistake" item in the Review session: when a mistake-log entry has a ref to an exercise item,
 * the session shows the ORIGINAL item (with its hint) instead of a card built from the entry's text.
 *
 *   Pure logic (tests: node tools/tests.js):
 *     parseRef(ref)        "ex:<item id>" → { kind: "ex", itemId } or null
 *     viewFor(entry)       "task" (entry with a known ref) | "card" (manual entry, no ref, unknown ref)
 *   With data:
 *     sourceOf(itemId)     { kind: "set" | "quiz" | "final", … } — which data file holds the item
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

  /**
   * Where an item id lives (ids follow the content model, spec 07): "final-<level>-NN" → the level's final test,
   * "<quiz id>-q<n>" → a trail quiz (data/quizzes-<level>.js, the level is the id's prefix), anything else → an exercise set.
   */
  function sourceOf(itemId) {
    let m = /^final-([abc][12])-\d{1,3}$/.exec(itemId);
    if (m) return { kind: "final", level: m[1].toUpperCase() };
    m = /^(([abc][12])-[a-z0-9-]+)-q\d{1,2}$/.exec(itemId);
    if (m) return { kind: "quiz", quizId: m[1], level: m[2] };
    return { kind: "set", setId: itemId.replace(/-\d{1,3}$/, "") };
  }

  function findIn(list, id) { return (list || []).find(function (i) { return i.id === id; }) || null; }

  /** The original item of an entry, or null (manual entry, deleted set, missing file: the session shows the card). */
  function load(entry) {
    const ref = parseRef(entry && entry.ref);
    if (!ref || !LM.exercises) return Promise.resolve(null);
    const id = ref.itemId, src = sourceOf(id);
    const found = function (item) { return item ? { kind: "engine", item: item } : null; };
    const none = function () { return null; };
    if (src.kind === "final") {
      return LM.loadModule("data/final-" + src.level.toLowerCase() + ".js").then(function () {
        const set = LM.FINALS && LM.FINALS[src.level];
        return found(set ? findIn(set.items, id) : null);
      }, none);
    }
    if (src.kind === "quiz") {
      return LM.loadModule("data/quizzes-" + src.level + ".js").then(function () {
        const quiz = LM.QUIZZES && LM.QUIZZES[src.quizId];
        const item = quiz ? findIn(quiz.items, id) : null;
        // the same engine fields the trail adds to quiz items (topic and level for the attempt log and stats)
        return found(item ? Object.assign({ topic: quiz.topic, level: quiz.level, setId: quiz.id, tags: ["trail"] }, item) : null);
      }, none);
    }
    return LM.exercises.loadSets([src.setId]).then(function (sets) { return found(sets[0] ? findIn(sets[0].items, id) : null); }, none);
  }

  LM.mistakeTask = { parseRef: parseRef, viewFor: viewFor, sourceOf: sourceOf, load: load };
})(window.LM);
