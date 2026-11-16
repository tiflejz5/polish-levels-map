/*
 * validate.js — content validators (npm run validate; also the first step of npm run build).
 *
 * STAGE 1A: structural rules the build relies on. Every item-level rule of the original validators and of
 * docs/plan/scripts/validate_plan.py is ported in stage 4 (spec 06 E11); until then those checks are
 * reported as SKIPPED with the reason, so nobody mistakes "0 errors" for full coverage.
 *
 * Exit code 1 on errors. Warnings never fail.
 * Use: node tools/validate.js [--quiet]
 */
"use strict";


const C = require("./build/common");
const answerDistribution = require("./build/answer-distribution");

const errors = [];
const warnings = [];
const err = function (m) { errors.push(m); };
const warn = function (m) { warnings.push(m); };

function json(rel) {
  const file = C.content(rel);
  if (!C.exists(file)) return undefined;
  try { return C.readJson(file); } catch (e) { err(rel + ": invalid JSON (" + e.message + ")"); return null; }
}

// ---------- syllabus.json ----------
const syllabus = json("syllabus.json");
const topics = {};
if (!syllabus) err("syllabus.json: missing");
else {
  const cats = syllabus.categories || {};
  const unitIds = new Set();
  (syllabus.levels || []).forEach(function (l, i) {
    if (l.id !== C.LEVELS[i]) err("syllabus.json: level " + i + " is " + l.id + ", expected " + C.LEVELS[i]);
    (l.units || []).forEach(function (u) {
      if (unitIds.has(u.id)) err("syllabus.json: duplicate unit id " + u.id);
      unitIds.add(u.id);
      if (u.id.indexOf(l.id.toLowerCase() + "-") !== 0) err("syllabus.json: unit " + u.id + " is not prefixed with its level");
      (u.topics || []).forEach(function (t) {
        if (topics[t.id]) err("syllabus.json: duplicate topic id " + t.id);
        if (!/^(a1|a2|b1|b2|c1|c2)-[a-z]+-[a-z0-9-]+$/.test(t.id)) err("syllabus.json: bad topic id " + t.id);
        if (t.id.indexOf(l.id.toLowerCase() + "-" + t.category + "-") !== 0) err("syllabus.json: topic " + t.id + " does not match <level>-<category>-<slug>");
        if (!cats[t.category]) err("syllabus.json: topic " + t.id + " has unknown category " + t.category);
        if (!t.title) err("syllabus.json: topic " + t.id + " has no title");
        topics[t.id] = { level: l.id, category: t.category };
      });
    });
  });
}

// ---------- levels.json ----------
const levels = json("levels.json");
if (!levels) err("levels.json: missing");
else C.LEVELS.forEach(function (L) {
  if (["available", "soon"].indexOf(levels[L]) === -1) err("levels.json: " + L + " must be \"available\" or \"soon\"");
});

// ---------- pages ----------
const pageOf = {};
C.LEVELS.forEach(function (L) {
  C.list(C.content("pages", L.toLowerCase()), /\.md$/).forEach(function (f) {
    const rel = "pages/" + L.toLowerCase() + "/" + f;
    const meta = C.splitMd(C.read(C.content(rel))).meta;
    const t = topics[meta.id];
    if (!t) { err(rel + ": front matter id " + JSON.stringify(meta.id) + " is not a syllabus topic"); return; }
    if (C.pageFileOf(meta.id) !== L.toLowerCase() + "/" + f) err(rel + ": file name must be " + C.pageFileOf(meta.id));
    if (meta.level !== t.level) err(rel + ": level " + meta.level + " ≠ syllabus " + t.level);
    if (meta.category !== t.category) err(rel + ": category " + meta.category + " ≠ syllabus " + t.category);
    if (!meta.title) err(rel + ": no title");
    pageOf[meta.id] = true;
  });
});

// ---------- quizzes ----------
const quizOf = {};
C.LEVELS.forEach(function (L) {
  const dir = C.content("quizzes", L.toLowerCase());
  C.list(dir, /\.json$/).forEach(function (f) {
    const rel = "quizzes/" + L.toLowerCase() + "/" + f;
    const q = json(rel);
    if (!q) return;
    if (q.id + ".json" !== f) err(rel + ": id " + q.id + " ≠ file name");
    if (!topics[q.topic]) err(rel + ": unknown topic " + q.topic);
    else if (topics[q.topic].level !== L) err(rel + ": topic " + q.topic + " is not " + L);
    if (!Array.isArray(q.items) || !q.items.length) err(rel + ": no items");
    quizOf[q.topic] = true;
  });
});

// ---------- exercise sets ----------
const itemIds = new Set();
const map = json("exercises/topics.json");
const setFiles = new Set(C.list(C.content("exercises"), /\.json$/).filter(function (f) { return f !== "topics.json" && f !== "mixes.json"; }));
const mapped = new Set();
if (map) Object.keys(map.topics || {}).forEach(function (t) {
  if (!topics[t]) err("exercises/topics.json: unknown topic " + t);
  (map.topics[t] || []).forEach(function (id) {
    mapped.add(id + ".json");
    if (!setFiles.has(id + ".json")) err("exercises/topics.json: no file exercises/" + id + ".json");
  });
});
setFiles.forEach(function (f) {
  const rel = "exercises/" + f;
  const s = json(rel);
  if (!s) return;
  if (s.id + ".json" !== f) err(rel + ": id " + s.id + " ≠ file name");
  if (!topics[s.topic]) err(rel + ": unknown topic " + s.topic);
  if (!mapped.has(f)) warn(rel + ": not listed in exercises/topics.json (not built)");
  (s.items || []).forEach(function (it) {
    if (itemIds.has(it.id)) err(rel + ": duplicate item id " + it.id);
    itemIds.add(it.id);
  });
});
const mixes = json("exercises/mixes.json");
if (mixes) (mixes.mixes || []).forEach(function (m) {
  (m.topics || []).forEach(function (t) { if (!topics[t]) err("exercises/mixes.json: " + m.id + " has unknown topic " + t); });
});

// ---------- decks ----------
const decks = json("decks/index.json");
if (decks) {
  const cardIds = new Set();
  (decks.decks || []).forEach(function (d) {
    const deck = json("decks/" + d.file);
    if (deck === undefined) { err("decks/index.json: no file decks/" + d.file); return; }
    if (!deck) return;
    if (deck.id !== d.id) err("decks/" + d.file + ": id " + deck.id + " ≠ index id " + d.id);
    (deck.cards || []).forEach(function (c) {
      if (cardIds.has(c.id)) err("decks/" + d.file + ": duplicate card id " + c.id);
      cardIds.add(c.id);
    });
  });
}

// ---------- tests, lab: parse only ----------
json("tests/placement.json");
C.LEVELS.forEach(function (L) { json("tests/final-" + L.toLowerCase() + ".json"); });
C.list(C.content("lab"), /\.json$/).forEach(function (f) { json("lab/" + f); });

// ---------- answer letters in lettered exam sets ----------
answerDistribution.checkAll().forEach(function (e) { err("exams/" + e.file + " " + e.id + ": " + e.error); });

// ---------- available level must be complete (warning until the first content stage) ----------
if (levels && syllabus) C.LEVELS.forEach(function (L) {
  if (levels[L] !== "available") return;
  const ids = Object.keys(topics).filter(function (id) { return topics[id].level === L; });
  const noPage = ids.filter(function (id) { return !pageOf[id]; });
  const noQuiz = ids.filter(function (id) { return !quizOf[id]; });
  const lvl = L.toLowerCase();
  const extras = ["summaries/" + lvl + ".md", "cheatsheets/" + lvl + ".md", "tests/final-" + lvl + ".json"].filter(function (r) { return !C.exists(C.content(r)); });
  if (noPage.length || noQuiz.length || extras.length) {
    warn(L + " is available but not complete: " + noPage.length + "/" + ids.length + " topics without a page, " +
      noQuiz.length + "/" + ids.length + " without a quiz" + (extras.length ? ", missing " + extras.join(", ") : "") +
      " (an error from the first content stage on)");
  }
});

const SKIPPED = [
  ["exercise and quiz item rules (types, options, answers, explanations), final-test pool rules", "validate-exercises.js, stage 4 (E11)"],
  ["deck card rules", "validate-decks.js, stage 4 (E11)"],
  ["rules of docs/plan/scripts/validate_plan.py (page sections, placement pool shape, E11 heuristics)", "stage 4 (E11)"],
  ["Case Lab data rules", "stage 6"],
  ["cheat sheets", "validate-cheatsheets.js, stage 4; no content until stage X"],
  ["phrase bank", "validate-phrases.js; no data until the B1 extras"],
  ["model answers, speaking trainer, exam folders", "validate-models.js, validate-speaking.js, stage E"]
];

const quiet = process.argv.indexOf("--quiet") !== -1;
warnings.forEach(function (w) { console.log("WARNING  " + w); });
errors.forEach(function (e) { console.log("ERROR    " + e); });
if (!quiet) SKIPPED.forEach(function (s) { console.log("SKIPPED  " + s[0] + " → " + s[1]); });
console.log("validate: " + Object.keys(topics).length + " topics, " + Object.keys(pageOf).length + " pages, " + Object.keys(quizOf).length + " quizzes, " +
  setFiles.size + " sets — " + errors.length + " error(s), " + warnings.length + " warning(s)");
if (require.main === module && errors.length) process.exit(1);
module.exports = { errors: errors, warnings: warnings };
