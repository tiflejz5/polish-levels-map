/*
 * build/pages.js — topic pages, level summaries, cheat sheets and the home page → data/pages.js (LM.PAGES).
 *
 * Sources: content/pages/<level>/<category>-<slug>.md, content/summaries/<level>.md,
 *          content/cheatsheets/<level>.md, content/home.md
 * LM.PAGES = { index, pages: { "<level>/<file>.md": markdown }, summaries: { A1: md }, cheatsheets: { A1: md }, home }
 *
 * `index` keeps the shape the handbook view reads today (levels → items { id, category, file, label }),
 * generated from the syllabus. Stage 1B (E2) moves the views to LM.SYLLABUS and drops it.
 */
"use strict";

const path = require("path");
const C = require("./common");

module.exports = function buildPages(ctx) {
  const syllabus = ctx.syllabus;
  const known = {};
  const index = { version: 2, categories: syllabus.categories, levels: [] };
  syllabus.levels.forEach(function (l) {
    const items = [];
    l.units.forEach(function (u) {
      u.topics.forEach(function (t) {
        const file = C.pageFileOf(t.id);
        known[file] = t.id;
        items.push({ id: t.id, category: t.category, file: file, label: t.title });
      });
    });
    index.levels.push({ level: l.id, items: items });
  });

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
    "LM.PAGES = " + JSON.stringify({ index: index, pages: pages, summaries: summaries, cheatsheets: cheatsheets, home: home }) + ";");
  return "pages: " + Object.keys(pages).length + ", summaries: " + (Object.keys(summaries).join(" ") || "none") +
    ", cheat sheets: " + (Object.keys(cheatsheets).join(" ") || "none") + ", home: " + (home ? "yes" : "none");
};
