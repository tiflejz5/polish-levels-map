/*
 * build/pages.js — topic pages, level summaries, cheat sheets and the home page → data/pages.js (LM.PAGES).
 *
 * Sources: content/pages/<level>/<category>-<slug>.md, content/summaries/<level>.md,
 *          content/cheatsheets/<level>.md, content/home.md
 * LM.PAGES = { pages: { "<level>/<file>.md": markdown }, summaries: { A1: md }, cheatsheets: { A1: md }, home }
 *
 * The list of topics is not repeated here: the views read it from LM.SYLLABUS (spec 06 E2). A page whose file
 * is not a syllabus topic is skipped with a warning.
 */
"use strict";

const path = require("path");
const C = require("./common");

module.exports = function buildPages(ctx) {
  const syllabus = ctx.syllabus;
  const known = {};
  C.topicsOf(syllabus).forEach(function (t) { known[C.pageFileOf(t.id)] = t.id; });

  const pages = {};
  const dir = C.content("pages");
  C.LEVELS.forEach(function (lvl) {
    C.list(path.join(dir, lvl.toLowerCase()), /\.md$/).forEach(function (f) {
      const rel = lvl.toLowerCase() + "/" + f;
      const text = C.read(path.join(dir, rel));
      const id = C.splitMd(text).meta.id;
      if (!known[rel]) { C.warn("pages/" + rel + ": not in the syllabus (skipped)"); return; }
      if (id !== known[rel]) C.warn("pages/" + rel + ": front matter id " + JSON.stringify(id) + " ≠ syllabus id " + known[rel]);
      pages[rel] = text;
    });
  });

  const byLevel = function (sub) {
    const out = {};
    C.list(C.content(sub), /^[abc][12]\.md$/i).forEach(function (f) {
      out[f.replace(/\.md$/i, "").toUpperCase()] = C.read(C.content(sub, f));
    });
    return out;
  };
  const summaries = byLevel("summaries");
  const cheatsheets = byLevel("cheatsheets");
  const home = C.exists(C.content("home.md")) ? C.read(C.content("home.md")) : null;

  C.writeData("pages.js", ["content/pages/", "content/summaries/", "content/cheatsheets/", "content/home.md", "content/syllabus.json"],
    "LM.PAGES = " + JSON.stringify({ pages: pages, summaries: summaries, cheatsheets: cheatsheets, home: home }) + ";");
  return "pages: " + Object.keys(pages).length + ", summaries: " + (Object.keys(summaries).join(" ") || "none") +
    ", cheat sheets: " + (Object.keys(cheatsheets).join(" ") || "none") + ", home: " + (home ? "yes" : "none");
};
