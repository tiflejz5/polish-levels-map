/*
 * validate-tests.js — the placement test tests/placement*.json (spec 07 §6, E10; rules of validate_plan.py check_placement).
 *
 * Every question: unique id, level, skill grammar | vocabulary | reading, type multiple-choice, 4 options (the
 * multiple-choice rules of validate-items.js), reading passages of the right length, topicId in the syllabus and of the
 * same level (warning) and of a category that fits the skill (warning: cases, verbs and grammar topics are grammar).
 * The full pool (10 per level: 5 grammar, 3 vocabulary, 2 reading) is checked for real content; until the first content
 * stage a short pool is a warning (ctx.strictComplete).
 */
"use strict";

const path = require("path");
const V = require("./validate-lib");
const I = require("./validate-items");

const SKILLS = ["grammar", "vocabulary", "reading"];
const SKILL_OF_CATEGORY = { cases: "grammar", verbs: "grammar", grammar: "grammar", vocabulary: "vocabulary", functions: "vocabulary" };

function checkPlacement(ctx, file, full) {
  const rel = ctx.rel(file);
  const d = V.readJson(ctx, file);
  if (!d) return;
  if (d.version !== 1) ctx.err(rel, "version must be 1");
  const ids = new Set(), count = {};
  (d.questions || []).forEach(function (q, i) {
    const w = rel + " #" + (i + 1);
    if (ids.has(q.id)) ctx.err(w, "duplicate id");
    ids.add(q.id);
    if (ctx.LEVELS.indexOf(q.level) === -1 || SKILLS.indexOf(q.skill) === -1) ctx.err(w, "level / skill");
    if (q.type !== "multiple-choice") ctx.err(w, "type must be multiple-choice");
    if ((q.options || []).length !== 4) ctx.err(w, "4 options");
    if (!V.nonEmpty(q.question)) ctx.err(w, "question missing");
    I.checkMc(ctx, w, Object.assign({}, q, { kind: "function" }), null);
    if (q.skill === "reading") {
      const n = String(q.passage || "").split(/\s+/).filter(Boolean).length;
      const lim = ["A1", "A2", "B1"].indexOf(q.level) !== -1 ? [30, 80] : [60, 130];
      if (n < lim[0] || n > lim[1]) ctx.err(w, "reading passage " + n + " words (expected " + lim[0] + "–" + lim[1] + ")");
      V.targetText(ctx, w, q.passage || "");
    } else if (q.passage != null) ctx.warn(w, "a passage on a " + q.skill + " question");
    if (q.topicId != null && !ctx.topics[q.topicId]) ctx.err(w, "topicId " + JSON.stringify(q.topicId) + " not in syllabus");
    const T = q.topicId ? ctx.topics[q.topicId] : null;
    if (T && T.level !== q.level) ctx.warn(w, "topicId is from another level");
    if (T && q.skill !== "reading" && SKILL_OF_CATEGORY[T.category] && SKILL_OF_CATEGORY[T.category] !== q.skill) {
      ctx.warn(w, "a " + T.category + " topic counts as " + SKILL_OF_CATEGORY[T.category] + ", not " + q.skill);
    }
    count[q.level + " " + q.skill] = (count[q.level + " " + q.skill] || 0) + 1;
  });
  if (!full) return;
  ctx.LEVELS.forEach(function (lv) {
    const got = SKILLS.map(function (s) { return count[lv + " " + s] || 0; });
    if (got.join(",") !== "5,3,2") {
      (ctx.strictComplete ? ctx.err : ctx.warn)(rel, lv + ": (" + got.join(", ") + ") questions (grammar, vocabulary, reading), expected (5, 3, 2)" +
        (ctx.strictComplete ? "" : " (an error from the first content stage on)"));
    }
  });
}

module.exports = function validateTests(ctx) {
  const dir = ctx.path("tests");
  V.list(dir, /^placement.*\.json$/).forEach(function (f) { checkPlacement(ctx, path.join(dir, f), ctx.full && f.indexOf("sample") === -1); });
};
