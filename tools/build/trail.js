/*
 * build/trail.js — trail and trail stop quizzes.
 *
 *   data/trail.js               LM.TRAIL = { version, levels }   (small, loaded at start)
 *   data/quizzes-<level>.js     LM.QUIZZES["<topic id>"] = quiz  (lazy), from content/quizzes/<level>/*.json
 *
 * STAGE 1A: the trail is written empty. Stage 1B (spec 06 E9) generates it from the syllabus
 * (one stop per topic) here, in this module.
 */
"use strict";

const path = require("path");
const C = require("./common");

module.exports = function buildTrail() {
  C.writeData("trail.js", ["content/syllabus.json"], "LM.TRAIL = " + JSON.stringify({ version: 1, levels: [] }) + ";");
  let quizzes = 0;
  const files = [];
  C.LEVELS.forEach(function (L) {
    const lvl = L.toLowerCase();
    const dir = C.content("quizzes", lvl);
    const list = C.list(dir, /\.json$/);
    if (!list.length) return;
    let body = "const Q = (LM.QUIZZES = LM.QUIZZES || {});\n";
    list.forEach(function (f) {
      const q = C.readJson(path.join(dir, f));
      body += "Q[" + JSON.stringify(q.id) + "] = " + JSON.stringify(q) + ";\n";
      quizzes++;
    });
    files.push(C.writeData("quizzes-" + lvl + ".js", "content/quizzes/" + lvl + "/", body));
  });
  return "trail: empty until stage 1B, quizzes: " + quizzes + (files.length ? " (" + files.join(", ") + ")" : "");
};
