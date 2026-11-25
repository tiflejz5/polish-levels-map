/*
 * validate-lab.js — Case Lab data lab/*.json (spec 09; rules of validate_plan.py check_lab). Decision trees are
 * checked by stage 6.
 *
 *   cases / cards   id, name, nameEn, level, summary, uses, traps, topicIds (all in the syllabus); a case id is one of
 *                   LM.lang.cases; unique ids
 *   axes            every card's column and row exist
 *   models          singular and plural with exactly the seven cases, target charset
 */
"use strict";

const path = require("path");
const V = require("./validate-lib");

function checkLab(ctx, file) {
  const rel = ctx.rel(file);
  const d = V.readJson(ctx, file);
  if (!d) return;
  const caseIds = ctx.L.cases.map(function (c) { return c.id; });
  const seen = new Set();
  (d.cards || []).concat(d.cases || []).forEach(function (c) {
    const w = rel + " " + c.id;
    ["id", "name", "nameEn", "level", "summary", "uses", "traps", "topicIds"].forEach(function (k) {
      const v = c[k];
      if (!v || (Array.isArray(v) && !v.length)) ctx.err(w, "missing " + k);
    });
    if (seen.has(c.id)) ctx.err(w, "duplicate id");
    seen.add(c.id);
    if (c.level != null && ctx.LEVELS.indexOf(c.level) === -1) ctx.err(w, "unknown level " + c.level);
    (c.topicIds || []).forEach(function (t) { if (!ctx.topics[t]) ctx.err(w, "topicId " + JSON.stringify(t) + " not in syllabus"); });
    if (c.name) V.charset(ctx, w, c.name);
    (c.uses || []).forEach(function (u) { if (u && u.pl) V.charset(ctx, w, u.pl); });
  });
  (d.cases || []).forEach(function (c) { if (caseIds.indexOf(c.id) === -1) ctx.err(rel + " " + c.id, "case id must be one of " + caseIds.join(", ")); });
  if (d.axes) {
    const cols = new Set((d.axes.columns || []).map(function (a) { return a.id; }));
    const rows = new Set((d.axes.rows || []).map(function (a) { return a.id; }));
    (d.cards || []).forEach(function (c) { if (!cols.has(c.column) || !rows.has(c.row)) ctx.err(rel, c.id + ": column/row not in axes"); });
  }
  (d.models || []).forEach(function (m) {
    ["singular", "plural"].forEach(function (num) {
      const keys = Object.keys(m[num] || {}).sort();
      if (keys.join(",") !== caseIds.slice().sort().join(",")) ctx.err(rel, "model " + m.id + ": " + num + " must have all 7 cases");
      Object.keys(m[num] || {}).forEach(function (k) { V.charset(ctx, rel, m[num][k]); });
    });
  });
}

module.exports = function validateLab(ctx) {
  const dir = ctx.path("lab");
  V.list(dir, /\.json$/).filter(function (f) { return f.indexOf("trees") === -1; }).forEach(function (f) { checkLab(ctx, path.join(dir, f)); });
};
