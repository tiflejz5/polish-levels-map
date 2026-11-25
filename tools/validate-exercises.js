/*
 * validate-exercises.js — exercise sets, trail quizzes, level final tests and mixes (spec 07 §4–§6, E6, E10).
 *
 *   exercises/<set id>.json      version 1, id = file name = <topic id>-<n>, topic in the syllabus, title, 8–12 items,
 *                                at least four item types (verbs, grammar, cases), item ids <set id>-NN unique in the bank
 *   exercises/topics.json        every topic exists, every listed set has a file; sets not listed → warning
 *   exercises/mixes.json         id, title, known topics (with sets: warning), known types, count
 *   quizzes/<level>/<topic>.json id = topic = file name, passScore 3, exactly 4 items, multiple choice (one gap-fill)
 *   tests/final-<level>.json     kind level-test, id final-<level>, draw 20, passPercent 80, defaultMode exam, 30 items
 *                                of that level, ≥ 70% of its topics, every category, ≥ half multiple choice,
 *                                no dictation, at most two paradigm; category shares (warning)
 * Every item: validate-items.js.
 * Returns { quizOf, setsByTopic }.
 */
"use strict";

const path = require("path");
const V = require("./validate-lib");
const I = require("./validate-items");

const GRAMMAR_CATS = ["verbs", "grammar", "cases"];

function itemId(ctx, where, it) {
  if (!V.nonEmpty(it && it.id)) { ctx.err(where, "item without id"); return; }
  if (ctx.itemIds.has(it.id)) ctx.err(where, "duplicate item id " + it.id + " (ids are unique in the whole bank)");
  ctx.itemIds.add(it.id);
}

function checkSet(ctx, file) {
  const rel = ctx.rel(file);
  const d = V.readJson(ctx, file);
  if (!d) return null;
  const f = path.basename(file);
  if (d.version !== 1) ctx.err(rel, "version must be 1");
  if (d.id + ".json" !== f) ctx.err(rel, "id " + d.id + " ≠ file name");
  if (!ctx.topics[d.topic]) ctx.err(rel, "topic " + JSON.stringify(d.topic) + " not in syllabus");
  else if (d.level !== ctx.topics[d.topic].level) ctx.err(rel, "level " + d.level + " ≠ the topic's level " + ctx.topics[d.topic].level);
  if (!new RegExp("^" + String(d.topic).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "-\\d+$").test(String(d.id))) ctx.err(rel, "set id must be <topic id>-<n>");
  if (!V.nonEmpty(d.title)) ctx.err(rel, "title missing");
  const items = Array.isArray(d.items) ? d.items : [];
  if (items.length < 8 || items.length > 12) ctx.err(rel, "set: 8–12 items");
  const types = new Set(items.map(function (it) { return it && it.type; }));
  if (types.size < 4 && ctx.topics[d.topic] && GRAMMAR_CATS.indexOf(ctx.topics[d.topic].category) !== -1) ctx.err(rel, "set: at least four different item types");
  if (d.passage != null && d.passage !== null) V.targetText(ctx, rel + " passage", d.passage);
  items.forEach(function (it, i) {
    const w = rel + " #" + (i + 1);
    itemId(ctx, w, it);
    if (!new RegExp("^" + String(d.id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "-\\d\\d$").test(String(it && it.id))) ctx.err(w, "item id must be <set id>-NN");
    if (it && !(Array.isArray(it.tags) && it.tags.length)) ctx.warn(w, "no tags");
    I.checkItem(ctx, w, Object.assign({ level: d.level }, it), d);
  });
  return d;
}

function checkQuiz(ctx, file, level) {
  const rel = ctx.rel(file);
  const d = V.readJson(ctx, file);
  if (!d) return null;
  if (d.id !== d.topic || !ctx.topics[d.topic]) ctx.err(rel, "quiz id must equal an existing topic id");
  else if (level && ctx.topics[d.topic].level !== level) ctx.err(rel, "topic " + d.topic + " is not " + level);
  if (path.basename(file) !== d.id + ".json") ctx.err(rel, "file name must be <topic id>.json");
  const items = Array.isArray(d.items) ? d.items : [];
  if (d.passScore !== 3 || items.length !== 4) ctx.err(rel, "quiz: exactly 4 items, passScore 3");
  const ids = new Set();
  items.forEach(function (it, i) {
    const w = rel + " #" + (i + 1);
    if (["multiple-choice", "gap-fill"].indexOf(it && it.type) === -1) ctx.err(w, "quiz items are multiple-choice (one gap-fill allowed)");
    if (ids.has(it && it.id)) ctx.err(w, "duplicate id");
    ids.add(it && it.id);
    I.checkItem(ctx, w, it, d);
    if (it && it.type === "gap-fill" && (it.gaps || []).length !== 1) ctx.err(w, "a quiz gap-fill has a single gap");
  });
  if (items.filter(function (it) { return it && it.type === "gap-fill"; }).length > 1) ctx.err(rel, "at most one gap-fill item");
  const pos = items.filter(function (it) { return it && it.type === "multiple-choice"; }).map(function (it) { return it.correct; });
  if (pos.length >= 3 && new Set(pos).size === 1) ctx.warn(rel, "the correct option is always in the same position");
  return d;
}

function checkFinal(ctx, file, level) {
  const rel = ctx.rel(file);
  const d = V.readJson(ctx, file);
  if (!d) return;
  const items = Array.isArray(d.items) ? d.items : [];
  if (d.version !== 1) ctx.err(rel, "version must be 1");
  if (d.kind !== "level-test") ctx.err(rel, "kind must be \"level-test\"");
  if (!ctx.topics[d.topic] && d.topic != null) ctx.err(rel, "topic " + JSON.stringify(d.topic) + " not in syllabus");
  // Pool size and coverage: errors from the first content stage on; until then a short temporary pool is a warning
  const pool = ctx.strictComplete ? ctx.err : ctx.warn;
  const later = ctx.strictComplete ? "" : " (an error from the first content stage on)";
  if (d.draw !== 20 || d.passPercent !== 80) ctx.err(rel, "final test: draw 20, passPercent 80");
  if (items.length !== 30) pool(rel, "final test: " + items.length + " items, expected 30" + later);
  if (d.id !== "final-" + level.toLowerCase()) ctx.err(rel, "id must be final-" + level.toLowerCase());
  if (d.level !== level) ctx.err(rel, "level must be " + level);
  if (d.defaultMode !== "exam") ctx.err(rel, "defaultMode must be \"exam\"");
  if (!V.nonEmpty(d.title)) ctx.err(rel, "title missing");
  const covered = new Set(), perCat = {};
  let mc = 0, par = 0;
  items.forEach(function (it, i) {
    const w = rel + " #" + (i + 1);
    itemId(ctx, w, it);
    if (!it) return;
    if (!ctx.topics[it.topic]) ctx.err(w, "topic " + JSON.stringify(it.topic) + " is required and must be in the syllabus");
    else if (ctx.topics[it.topic].level !== level) ctx.err(w, "topic " + it.topic + " is not from " + level);
    else { covered.add(it.topic); perCat[ctx.topics[it.topic].category] = (perCat[ctx.topics[it.topic].category] || 0) + 1; }
    if (it.type === "dictation") ctx.err(w, "no dictation in a final test (it must not depend on a voice)");
    if (it.type === "multiple-choice") mc++;
    if (it.type === "paradigm") par++;
    I.checkItem(ctx, w, Object.assign({ level: d.level }, it), d);
  });
  if (mc * 2 < items.length) ctx.err(rel, mc + " of " + items.length + " items are multiple choice (at least half needed)");
  if (par > 2) ctx.err(rel, par + " paradigm items (at most two)");
  const levelTopics = Object.keys(ctx.topics).filter(function (t) { return ctx.topics[t].level === level; });
  if (covered.size < 0.7 * levelTopics.length) pool(rel, "covers " + covered.size + " of " + levelTopics.length + " topics (at least 70%)" + later);
  const catCount = {};
  levelTopics.forEach(function (t) { catCount[ctx.topics[t].category] = (catCount[ctx.topics[t].category] || 0) + 1; });
  Object.keys(catCount).forEach(function (c) {
    const want = items.length * catCount[c] / levelTopics.length;
    const got = perCat[c] || 0;
    if (!got) ctx.err(rel, "no items from category " + JSON.stringify(c));
    else if (Math.abs(got - want) > 2) ctx.warn(rel, "category " + JSON.stringify(c) + " has " + got + " items, proportionally about " + want.toFixed(1));
  });
}

module.exports = function validateExercises(ctx) {
  // ---------- sets ----------
  const exDir = ctx.path("exercises");
  const setFiles = V.list(exDir, /\.json$/).filter(function (f) { return f !== "topics.json" && f !== "mixes.json"; });
  const sets = {};
  setFiles.forEach(function (f) { const d = checkSet(ctx, path.join(exDir, f)); if (d) sets[f.replace(/\.json$/, "")] = d; });

  // ---------- map topic → sets (content only; the examples have none) ----------
  const setsByTopic = {};
  const map = V.readJson(ctx, path.join(exDir, "topics.json"));
  if (map) {
    const listed = new Set();
    Object.keys(map.topics || {}).forEach(function (t) {
      if (!ctx.topics[t]) ctx.err(ctx.rel(path.join(exDir, "topics.json")), "unknown topic " + t);
      (map.topics[t] || []).forEach(function (id) {
        listed.add(id);
        if (!sets[id] && setFiles.indexOf(id + ".json") === -1) ctx.err(ctx.rel(path.join(exDir, "topics.json")), "no file exercises/" + id + ".json");
        else if (sets[id] && sets[id].topic !== t) ctx.err(ctx.rel(path.join(exDir, "topics.json")), id + " is listed under " + t + " but its topic is " + sets[id].topic);
        (setsByTopic[t] = setsByTopic[t] || []).push(id);
      });
    });
    Object.keys(sets).forEach(function (id) { if (!listed.has(id)) ctx.warn(ctx.rel(path.join(exDir, id + ".json")), "not listed in exercises/topics.json (not built)"); });
  }

  // ---------- mixes ----------
  const mixes = V.readJson(ctx, path.join(exDir, "mixes.json"));
  if (mixes) {
    const seen = new Set();
    (mixes.mixes || []).forEach(function (m) {
      const at = ctx.rel(path.join(exDir, "mixes.json")) + " " + (m.id || "?");
      if (!/^[a-z0-9][a-z0-9-]*$/.test(m.id || "")) ctx.err(at, "id: lower-case letters, digits and hyphens");
      if (seen.has(m.id)) ctx.err(at, "duplicate id");
      seen.add(m.id);
      if (!V.nonEmpty(m.title)) ctx.err(at, "title missing");
      if (m.level != null && ctx.LEVELS.indexOf(m.level) === -1) ctx.err(at, "unknown level " + m.level);
      if (!Array.isArray(m.topics) || !m.topics.length) ctx.err(at, "topics missing");
      (m.topics || []).forEach(function (t) {
        if (!ctx.topics[t]) ctx.err(at, "unknown topic " + t);
        else if (!setsByTopic[t]) ctx.warn(at, "topic " + t + " has no sets yet");
      });
      (m.types || []).forEach(function (t) { if (I.TYPES.indexOf(t) === -1) ctx.err(at, "unknown type " + t); });
      if (m.count != null && !(Number.isInteger(m.count) && m.count > 0)) ctx.err(at, "count must be a positive integer");
    });
  }

  // ---------- quizzes ----------
  const quizOf = {};
  ctx.LEVELS.forEach(function (L) {
    const dir = ctx.path("quizzes", L.toLowerCase());
    V.list(dir, /\.json$/).forEach(function (f) { const q = checkQuiz(ctx, path.join(dir, f), L); if (q && q.topic) quizOf[q.topic] = true; });
  });

  // ---------- final tests ----------
  ctx.LEVELS.forEach(function (L) {
    const file = ctx.path("tests", "final-" + L.toLowerCase() + ".json");
    if (require("fs").existsSync(file)) checkFinal(ctx, file, L);
  });
  V.list(ctx.path("tests"), /^final-.*\.json$/).forEach(function (f) {
    if (!/^final-(a1|a2|b1|b2|c1|c2)\.json$/.test(f)) ctx.err(ctx.rel(ctx.path("tests", f)), "final test files are final-<level>.json");
  });

  ctx.setsByTopic = setsByTopic;
  return { quizOf: quizOf, setsByTopic: setsByTopic, sets: Object.keys(sets).length };
};
