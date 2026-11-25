/*
 * validate-pages.js — topic pages pages/<level>/<category>-<slug>.md (spec 07 §1; rules of validate_plan.py check_page).
 *
 * Front matter (id = syllabus id, level, category, title, summary ≤ 140), file name, fixed sections in order, Answers last,
 * body length (warning), the "| Polish | English |" table, the mistakes section (3–5 "✗ → ✓" lines), Practice 6–8
 * items matching Answers, [[links]] to topic ids, charset of the whole body.
 * Returns { pageOf: { topicId: true } } for the completeness check.
 */
"use strict";

const path = require("path");
const V = require("./validate-lib");

const GRAMMAR = ["How it works", "When to use it", "Examples", "Common mistakes for English speakers", "Practice", "Answers"];
const SECTIONS = {
  verbs: GRAMMAR, grammar: GRAMMAR, cases: GRAMMAR,
  functions: ["Key phrases", "Dialogue", "Common mistakes for English speakers", "Practice", "Answers"],
  vocabulary: ["Words", "Word partners", "Common mistakes for English speakers", "Practice", "Answers"]
};
const OPTIONAL = ["Good to know", "Culture note", "Real life vs exam"];
const WORDS = { A1: [300, 700], A2: [300, 700], B1: [450, 850], B2: [450, 850], C1: [500, 1000], C2: [500, 1000] };

function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function checkPage(ctx, file) {
  const where = ctx.rel(file);
  const raw = V.readText(file);
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!m) { ctx.err(where, "front matter missing"); return null; }
  const fm = {};
  m[1].split("\n").forEach(function (line) {
    const i = line.indexOf(":");
    if (i !== -1) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  const body = m[2];
  const T = ctx.topics[fm.id];
  if (!T) { ctx.err(where, "id " + JSON.stringify(fm.id || "") + " is not in the syllabus"); return null; }
  if (fm.level !== T.level || fm.category !== T.category) ctx.err(where, "level/category differ from the syllabus");
  ["title", "summary"].forEach(function (k) { if (!fm[k]) ctx.err(where, "front matter: " + k + " missing"); });
  if ((fm.summary || "").length > 140) ctx.err(where, "summary longer than 140 characters");
  const expect = T.category + "-" + fm.id.split("-").slice(2).join("-") + ".md";
  if (path.basename(file) !== expect || path.basename(path.dirname(file)) !== T.level.toLowerCase()) ctx.err(where, "file should be " + T.level.toLowerCase() + "/" + expect);
  if (!/^# \S/m.test(body)) ctx.err(where, "no # title");

  const heads = [];
  body.replace(/^## (.+?)\s*$/gm, function (_, h) { heads.push(h); return _; });
  const need = SECTIONS[T.category] || GRAMMAR;
  const seq = heads.filter(function (h) { return need.indexOf(h) !== -1; });
  if (seq.join("|") !== need.join("|")) ctx.err(where, "sections must be, in order: " + need.join(" · ") + " (found: " + heads.join(" · ") + ")");
  heads.forEach(function (h) { if (need.indexOf(h) === -1 && OPTIONAL.indexOf(h) === -1) ctx.err(where, "unknown section " + JSON.stringify(h)); });
  if (heads.length && heads[heads.length - 1] !== "Answers") ctx.err(where, "Answers must be the last section");

  const n = (body.replace(/[|*_#>-]/g, " ").match(/\S+/g) || []).length;
  const lim = WORDS[T.level];
  if (n < lim[0] || n > lim[1]) ctx.warn(where, n + " words (expected " + lim[0] + "–" + lim[1] + ")");
  if (!new RegExp("^\\|\\s*" + escapeRe(ctx.APP.language) + "\\s*\\|\\s*English\\s*\\|", "m").test(body)) ctx.err(where, "no table with header | " + ctx.APP.language + " | English |");

  const sec = /## Common mistakes for English speakers\n([\s\S]*?)(?=\n## )/.exec(body);
  if (sec) {
    const lines = sec[1].split("\n").filter(function (l) { return l.indexOf("- ") === 0; });
    if (lines.length < 3 || lines.length > 5) ctx.err(where, "mistakes section: 3–5 lines (found " + lines.length + ")");
    lines.forEach(function (l) {
      if (l.indexOf("✗") === -1 || l.indexOf("✓") === -1 || l.indexOf("→") === -1) ctx.err(where, "mistake line must be '- ✗ *wrong* → ✓ *right* — why': " + JSON.stringify(l.slice(0, 50)));
    });
  }
  const prac = /## Practice\n([\s\S]*?)(?=\n## )/.exec(body);
  const ans = /## Answers\n([\s\S]*)/.exec(body);
  if (prac && ans) {
    const a = (prac[1].match(/^\d+\./gm) || []).length, b = (ans[1].match(/^\d+\./gm) || []).length;
    if (a < 6 || a > 8) ctx.err(where, "practice: 6–8 numbered items (found " + a + ")");
    if (a !== b) ctx.err(where, "practice has " + a + " items but answers has " + b);
  }
  body.replace(/\[\[([^\]]+)\]\]/g, function (_, link) { if (!ctx.topics[link]) ctx.err(where, "link [[" + link + "]] is not a topic id"); return _; });
  V.charset(ctx, where, body);
  return fm.id;
}

module.exports = function validatePages(ctx) {
  const pageOf = {};
  ctx.LEVELS.forEach(function (L) {
    const dir = ctx.path("pages", L.toLowerCase());
    V.list(dir, /\.md$/).forEach(function (f) {
      const id = checkPage(ctx, path.join(dir, f));
      if (id) {
        if (pageOf[id]) ctx.err(ctx.rel(path.join(dir, f)), "a second page for " + id);
        pageOf[id] = true;
      }
    });
  });
  return { pageOf: pageOf };
};
