/*
 * build/exercises.js — exercise sets and mixes.
 *
 * Sources: content/exercises/topics.json (topic id → [set ids]), content/exercises/<set id>.json,
 *          content/exercises/mixes.json, and item-format sets of active exams (content/exams/<id>/manifest.json).
 * Output:  data/sets/<set id>.js   (LM.SETS = LM.SETS || {})[id] = full set   (lazy)
 *          data/sets-index.js      LM.SETS_INDEX = { version, topics, sets (cards without items), mixes, tenseByTopic }
 *
 * A map entry without its file is skipped with a warning. Content rules: npm run validate.
 */
"use strict";

const path = require("path");
const C = require("./common");

function typeCounts(items) {
  const out = {};
  items.forEach(function (it) { out[it.type] = (out[it.type] || 0) + 1; });
  return out;
}

module.exports = function buildExercises() {
  // Points of a set card: the same function the app uses (js/exercise-logic.js)
  global.window = global.window || global;
  require(path.join(C.ROOT, "js", "exercise-logic.js"));
  const pointsOf = function (items) { return items.reduce(function (s, it) { return s + global.window.LM.exLogic.maxPoints(it); }, 0); };

  const mapFile = C.content("exercises", "topics.json");
  const map = C.exists(mapFile) ? C.readJson(mapFile) : { topics: {} };
  const topics = {};
  const sets = {};

  const writeSet = function (setId, set, source) {
    return C.writeData("sets/" + setId + ".js", source, "(LM.SETS = LM.SETS || {})[" + JSON.stringify(setId) + "] = " + JSON.stringify(set) + ";");
  };

  Object.keys(map.topics || {}).forEach(function (topic) {
    (map.topics[topic] || []).forEach(function (setId) {
      const file = C.content("exercises", setId + ".json");
      if (!C.exists(file)) { C.warn("exercises/topics.json: no file for set " + setId + " (skipped)"); return; }
      const set = C.readJson(file);
      set.items = (set.items || []).map(function (it) {
        return Object.assign({ topic: set.topic || null, level: set.level || null, tags: [], setId: setId }, it);
      });
      const out = writeSet(setId, set, "content/exercises/" + setId + ".json");
      (topics[topic] = topics[topic] || []).push(setId);
      sets[setId] = {
        id: setId, topic: set.topic || topic, level: set.level || null, title: set.title || setId, intro: set.intro || "",
        count: set.items.length, points: pointsOf(set.items), types: typeCounts(set.items),
        defaultMode: set.defaultMode === "exam" ? "exam" : "learn", file: out
      };
    });
  });

  // Item-format sets of active exams (spec 12); the exam's own data is built by build/exams.js
  const regFile = path.join(C.examsDir(), "registry.json");
  const exams = C.exists(regFile) ? (C.readJson(regFile).exams || []) : [];
  exams.forEach(function (exam) {
    const dir = path.join(C.examsDir(), exam.id);
    if (exam.status !== "active" || !C.exists(path.join(dir, "manifest.json"))) return;
    C.readJson(path.join(dir, "manifest.json")).sections.forEach(function (sec) {
      (sec.exerciseGroups || []).forEach(function (g) {
        g.sets.forEach(function (meta) {
          const file = path.join(dir, meta.file);
          if (!C.exists(file)) { C.warn("exams/" + exam.id + ": no file " + meta.file + " (skipped)"); return; }
          const set = C.readJson(file);
          if (!Array.isArray(set.items)) { C.warn("exams/" + exam.id + ": " + meta.file + " has no items (skipped)"); return; }
          set.items = set.items.map(function (it) { return Object.assign({ topic: set.topic || null, level: set.level || null, tags: [], setId: meta.id }, it); });
          const out = writeSet(meta.id, set, C.examsSource() + "/" + exam.id + "/" + meta.file);
          sets[meta.id] = {
            id: meta.id, topic: null, level: set.level || null, title: set.title || meta.label, intro: set.intro || "",
            count: set.items.length, points: pointsOf(set.items), types: typeCounts(set.items),
            defaultMode: set.defaultMode === "exam" ? "exam" : "learn", file: out, exam: exam.id, group: g.label,
            hasPassage: !!set.passage, listening: set.items.some(function (it) { return it.kind === "listening"; })
          };
        });
      });
    });
  });

  const mixFile = C.content("exercises", "mixes.json");
  const mixes = C.exists(mixFile) ? (C.readJson(mixFile).mixes || []) : [];

  // tenseByTopic: link "See it on the timeline" of the tense lab; empty until the Case Lab (stage 6)
  C.writeData("sets-index.js", ["content/exercises/", "content/exams/"],
    "LM.SETS_INDEX = " + JSON.stringify({ version: 1, topics: topics, sets: sets, mixes: mixes, tenseByTopic: {} }) + ";");
  const nItems = Object.keys(sets).reduce(function (s, k) { return s + sets[k].count; }, 0);
  return "exercises: " + Object.keys(sets).length + " sets, " + nItems + " items, " + mixes.length + " mixes";
};
