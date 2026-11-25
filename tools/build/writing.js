/*
 * build/writing.js — phrase bank for writing: content/writing/phrases.json → data/phrases.js (LM.PHRASES, lazy).
 *
 * Written in stage X of B1 (spec 07 §8). Until then there is no source and no output; the views that
 * need it stay hidden (owner decision, stage 0 Q4). Writing tasks and model answers: stage E.
 */
"use strict";

const C = require("./common");

module.exports = function buildWriting() {
  const file = C.content("writing", "phrases.json");
  if (!C.exists(file)) return "phrases: no content/writing/phrases.json (B1 extras)";
  const data = C.readJson(file);
  const total = data.groups.reduce(function (n, g) { return n + g.phrases.length; }, 0);
  C.writeData("phrases.js", "content/writing/phrases.json", "LM.PHRASES = " + JSON.stringify(data) + ";");
  return "phrases: " + data.groups.length + " groups, " + total + " phrases";
};
