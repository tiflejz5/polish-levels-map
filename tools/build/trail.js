/*
 * build/trail.js — the trail, generated from the syllabus (spec 06 E9), and the trail stop quizzes.
 *
 *   data/trail.js               LM.TRAIL = { version, levels }   (small, loaded at start)
 *   data/quizzes-<level>.js     LM.QUIZZES["<topic id>"] = quiz  (lazy), from content/quizzes/<level>/*.json
 *
 * level → { level, land, status, finalTest, units }
 * unit  → { id, title, stops }: one lesson stop per topic, then one checkpoint
 *   lesson     { id: <topic id>, type: "lesson", title, page: "<level>/<slug>", items: [<topic id>], quiz?: <topic id>, set?: <first set id> }
 *              quiz only when content/quizzes/<level>/<topic id>.json exists; set = the topic's first exercise set
 *   checkpoint { id: "<unit id>-checkpoint", type: "checkpoint", title, from: [lesson ids], size: min(8, 2 × topics) }
 * Optional content/trail-overrides.json: { "stops": { "<stop id>": { "title": "…", "size": n } } } renames a stop or
 * changes a checkpoint's size. Passing rules live in js/trail-logic.js.
 */
"use strict";

const path = require("path");
const C = require("./common");

function quizzesOf(level) {
  const dir = C.content("quizzes", level.toLowerCase());
  const out = {};
  C.list(dir, /\.json$/).forEach(function (f) {
    const q = C.readJson(path.join(dir, f));
    out[q.id] = q;
  });
  return out;
}

/** The trail object (exported for the tests). syllabus = content/syllabus.json, status = content/levels.json. */
function makeTrail(syllabus, status, quizIds, setsByTopic, overrides) {
  const over = (overrides && overrides.stops) || {};
  const apply = function (stop) {
    const o = over[stop.id];
    if (!o) return stop;
    if (typeof o.title === "string" && o.title.trim()) stop.title = o.title.trim();
    if (stop.type === "checkpoint" && Number.isInteger(o.size) && o.size > 0) stop.size = o.size;
    return stop;
  };
  return {
    version: 1,
    levels: syllabus.levels.map(function (l) {
      return {
        level: l.id,
        land: l.land,
        status: status[l.id] === "available" ? "available" : "soon",
        finalTest: "#/" + l.id.toLowerCase() + "/test",
        units: l.units.map(function (u) {
          const lessons = u.topics.map(function (t) {
            const stop = { id: t.id, type: "lesson", title: t.title, page: C.pageFileOf(t.id).replace(/\.md$/, ""), items: [t.id] };
            if (quizIds[t.id]) stop.quiz = t.id;
            const sets = setsByTopic[t.id] || [];
            if (sets.length) stop.set = sets[0];
            return apply(stop);
          });
          const checkpoint = apply({
            id: u.id + "-checkpoint", type: "checkpoint", title: "Checkpoint: " + u.title,
            from: lessons.map(function (s) { return s.id; }), size: Math.min(8, 2 * lessons.length)
          });
          return { id: u.id, title: u.title, stops: lessons.concat([checkpoint]) };
        })
      };
    })
  };
}

module.exports = function buildTrail(ctx) {
  const syllabus = ctx.syllabus;
  const status = C.readJson(C.content("levels.json"));
  const setsFile = C.content("exercises", "topics.json");
  const setsByTopic = C.exists(setsFile) ? (C.readJson(setsFile).topics || {}) : {};
  const ovFile = C.content("trail-overrides.json");
  const overrides = C.exists(ovFile) ? C.readJson(ovFile) : null;

  let quizzes = 0;
  const files = [];
  const quizIds = {};
  C.LEVELS.forEach(function (L) {
    const lvl = L.toLowerCase();
    const qs = quizzesOf(L);
    const ids = Object.keys(qs).sort();
    if (!ids.length) return;
    let body = "const Q = (LM.QUIZZES = LM.QUIZZES || {});\n";
    ids.forEach(function (id) {
      quizIds[id] = true;
      body += "Q[" + JSON.stringify(id) + "] = " + JSON.stringify(qs[id]) + ";\n";
      quizzes++;
    });
    files.push(C.writeData("quizzes-" + lvl + ".js", "content/quizzes/" + lvl + "/", body));
  });

  const trail = makeTrail(syllabus, status, quizIds, setsByTopic, overrides);
  const sources = ["content/syllabus.json", "content/levels.json", "content/quizzes/", "content/exercises/topics.json"].concat(overrides ? ["content/trail-overrides.json"] : []);
  C.writeData("trail.js", sources, "LM.TRAIL = " + JSON.stringify(trail) + ";");
  let lessons = 0, checkpoints = 0;
  trail.levels.forEach(function (lv) { lv.units.forEach(function (u) { u.stops.forEach(function (s) { if (s.type === "lesson") lessons++; else checkpoints++; }); }); });
  return "trail: " + lessons + " lesson stops, " + checkpoints + " checkpoints; quizzes: " + quizzes + (files.length ? " (" + files.join(", ") + ")" : "");
};
module.exports.makeTrail = makeTrail;
