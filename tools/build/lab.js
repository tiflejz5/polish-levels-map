/*
 * build/lab.js — content/lab/*.json → data/lab.js (LM.LAB, lazy; spec 09 §1).
 *
 * LM.LAB = {
 *   cases:  [case cards]                      content/lab/cases.json   { cases: [...] }
 *   models: [model phrases, 14 forms each]    content/lab/models.json  { models: [...] }
 *   trees:  [decision trees]                  content/lab/trees.json   { trees: [...] }
 *   aspect: { title, summary, verb, forms }   content/lab/aspect.json
 * }
 * A missing file gives an empty list (or null for aspect); the views say "being written".
 */
"use strict";

const C = require("./common");

module.exports = function buildLab() {
  const read = function (name) { const f = C.content("lab", name + ".json"); return C.exists(f) ? C.readJson(f) : null; };
  const cases = read("cases"), models = read("models"), trees = read("trees"), aspect = read("aspect");
  if (!cases && !models && !trees && !aspect) return "lab: no content/lab";
  const lab = {
    cases: cases ? cases.cases || [] : [],
    models: models ? models.models || [] : [],
    trees: trees ? trees.trees || [] : [],
    aspect: aspect ? { title: aspect.title, summary: aspect.summary, note: aspect.note || "", verb: aspect.verb, forms: aspect.forms || [] } : null
  };
  C.writeData("lab.js", "content/lab/", "LM.LAB = " + JSON.stringify(lab) + ";");
  return "lab: " + lab.cases.length + " case cards, " + lab.models.length + " model phrases, " + lab.trees.length + " trees" +
    (lab.aspect ? ", aspect strip (" + lab.aspect.forms.length + " forms)" : "");
};
