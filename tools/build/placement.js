/*
 * build/placement.js — content/tests/placement.json → data/placement.js (LM.PLACEMENT, lazy).
 *
 * Question: { id, level, skill (grammar | vocabulary | reading), type: "multiple-choice", passage (reading only),
 *             question, options [4], correct, explanation, topicId } (spec 07 §6).
 * Broken questions are left out with a warning; the rest is written. Full content rules: validators.
 */
"use strict";

const C = require("./common");

const SKILLS = ["grammar", "vocabulary", "reading"];

module.exports = function buildPlacement(ctx) {
  const file = C.content("tests", "placement.json");
  if (!C.exists(file)) return "placement: no content/tests/placement.json";
  const topicIds = new Set(ctx.topics.map(function (t) { return t.id; }));
  const raw = C.readJson(file);
  if (raw.version !== 1 || !Array.isArray(raw.questions)) throw new Error("tests/placement.json needs \"version\": 1 and a \"questions\" list");
  const seen = new Set();
  const questions = raw.questions.filter(function (q, i) {
    const where = "tests/placement.json #" + (i + 1) + (q && q.id ? " (" + q.id + ")" : "");
    const fail = function (msg) { C.warn(where + ": " + msg + " (left out)"); return false; };
    if (!q || typeof q.id !== "string" || !q.id) return fail("no id");
    if (seen.has(q.id)) return fail("duplicate id");
    if (C.LEVELS.indexOf(q.level) === -1) return fail("bad level");
    if (q.type !== "multiple-choice") return fail("type must be multiple-choice");
    if (SKILLS.indexOf(q.skill) === -1) return fail("bad skill");
    if (!Array.isArray(q.options) || q.options.length < 2) return fail("options");
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) return fail("correct");
    if (q.skill === "reading" && !(typeof q.passage === "string" && q.passage.trim())) return fail("reading without passage");
    if (q.topicId && !topicIds.has(q.topicId)) { C.warn(where + ": unknown topicId " + q.topicId + " (kept, without link)"); q.topicId = null; }
    seen.add(q.id);
    // The placement view links a question to its topic through itemId (reference format); topicId is the content field.
    return Object.assign(q, { itemId: q.topicId || null });
  });
  C.writeData("placement.js", "content/tests/placement.json", "LM.PLACEMENT = " + JSON.stringify({ version: 1, questions: questions }) + ";");
  const per = C.LEVELS.map(function (l) { return l + " " + questions.filter(function (q) { return q.level === l; }).length; }).join(", ");
  return "placement: " + questions.length + " questions (" + per + ")";
};
