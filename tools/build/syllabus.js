/*
 * build/syllabus.js — content/syllabus.json + content/levels.json → data/syllabus.js (LM.SYLLABUS).
 *
 * LM.SYLLABUS = { version, lang, language, categories, levels: [{ id, land, goal, status, units: [{ id, title, topics }] }] }
 * status per level comes from levels.json ("available" | "soon"; spec 06 E1). Loaded at start (small).
 */
"use strict";

const C = require("./common");

const STATUSES = ["available", "soon"];

module.exports = function buildSyllabus() {
  const syllabus = C.readJson(C.content("syllabus.json"));
  const levels = C.readJson(C.content("levels.json"));
  const out = {
    version: syllabus.version, lang: syllabus.lang, language: syllabus.language, categories: syllabus.categories,
    levels: syllabus.levels.map(function (l) {
      let status = levels[l.id];
      if (STATUSES.indexOf(status) === -1) { C.warn("levels.json: " + l.id + " has status " + JSON.stringify(status) + ", using \"soon\""); status = "soon"; }
      return Object.assign({}, l, { status: status });
    })
  };
  Object.keys(levels).forEach(function (k) {
    if (!syllabus.levels.some(function (l) { return l.id === k; })) C.warn("levels.json: unknown level " + k);
  });
  C.writeData("syllabus.js", ["content/syllabus.json", "content/levels.json"], "LM.SYLLABUS = " + JSON.stringify(out) + ";");
  return {
    syllabus: syllabus,
    topics: C.topicsOf(syllabus),
    summary: "syllabus: " + out.levels.length + " levels, " + C.topicsOf(syllabus).length + " topics (available: " +
      out.levels.filter(function (l) { return l.status === "available"; }).map(function (l) { return l.id; }).join(", ") + ")"
  };
};
