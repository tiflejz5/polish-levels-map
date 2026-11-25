/*
 * build/finals.js — content/tests/final-<level>.json → data/final-<level>.js (LM.FINALS["A1"], lazy).
 *
 * A pool is a standard exercise set with kind "level-test" (spec 07 §6). Items inherit level, tags, setId
 * and get `category`: the syllabus category of their topic (proportional draw, result breakdown; E10).
 */
"use strict";

const C = require("./common");

module.exports = function buildFinals(ctx) {
  const category = {};
  ctx.topics.forEach(function (t) { category[t.id] = t.category; });
  const done = [];
  let items = 0;
  C.LEVELS.forEach(function (L) {
    const lvl = L.toLowerCase();
    const file = C.content("tests", "final-" + lvl + ".json");
    if (!C.exists(file)) return;
    const set = C.readJson(file);
    set.items = (set.items || []).map(function (it) {
      if (!category[it.topic]) C.warn("tests/final-" + lvl + ".json: item " + it.id + " has unknown topic " + JSON.stringify(it.topic));
      return Object.assign({ level: set.level, tags: [], setId: set.id }, it, { category: category[it.topic] || null });
    });
    C.writeData("final-" + lvl + ".js", "content/tests/final-" + lvl + ".json",
      "(LM.FINALS = LM.FINALS || {})[" + JSON.stringify(set.level) + "] = " + JSON.stringify(set) + ";");
    done.push(L);
    items += set.items.length;
  });
  return "final tests: " + (done.join(" ") || "none") + (items ? " (" + items + " items)" : "");
};
