/*
 * build/lab.js — content/lab/*.json → data/lab.js (LM.LAB, lazy).
 *
 * LM.LAB = { <file name without .json>: data }  e.g. { cases, models, trees, aspect } (spec 09 §1).
 * The ported tense lab view still expects { tenses, tree }; the Case Lab view replaces it in stage 6.
 */
"use strict";

const C = require("./common");

module.exports = function buildLab() {
  const files = C.list(C.content("lab"), /\.json$/);
  if (!files.length) return "lab: no content/lab";
  const lab = {};
  files.forEach(function (f) { lab[f.replace(/\.json$/, "")] = C.readJson(C.content("lab", f)); });
  C.writeData("lab.js", "content/lab/", "LM.LAB = " + JSON.stringify(lab) + ";");
  return "lab: " + Object.keys(lab).join(", ");
};
