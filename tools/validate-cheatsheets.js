/*
 * validate-cheatsheets.js — level cheat sheets cheatsheets/<level>.md (spec 07 §3; the original cheat-sheet rules).
 *
 * Front matter id cheatsheet-<level>, level, title, summary; fixed headings in order: Forms · Grammar · Phrases ·
 * Signal words · Watch out; Forms max 8 table rows, Grammar 4–8 bullets, Phrases 10–16 pairs, Signal words max 10
 * rows, Watch out 5 lines "✗ → ✓"; no ~~strike-through~~ (the renderer has none); a long sheet (> 650 words) may not fit
 * one printed page (warning). No content until the level extras (stage X).
 */
"use strict";

const path = require("path");
const V = require("./validate-lib");

const HEADINGS = ["Forms", "Grammar", "Phrases", "Signal words", "Watch out"];

function section(body, h) {
  const m = new RegExp("^## " + h + "\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))", "m").exec(body);
  return m ? m[1] : "";
}
function tableRows(s) { return s.split("\n").filter(function (l) { return /^\|/.test(l) && !/^\|\s*-/.test(l); }).length - 1; }
function bullets(s) { return s.split("\n").filter(function (l) { return /^[-*] /.test(l); }).length; }

function checkSheet(ctx, file, level) {
  const rel = ctx.rel(file);
  const text = V.readText(file);
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  const fm = {};
  if (m) m[1].split("\n").forEach(function (l) { const i = l.indexOf(":"); if (i !== -1) fm[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  if (fm.id !== "cheatsheet-" + level.toLowerCase()) ctx.err(rel, "front matter id must be cheatsheet-" + level.toLowerCase());
  if (fm.level !== level) ctx.err(rel, "level must be " + level);
  ["title", "summary"].forEach(function (k) { if (!fm[k]) ctx.err(rel, "front matter: " + k + " missing"); });
  const body = m ? text.slice(m[0].length) : text;
  const heads = (body.match(/^## (.+)$/gm) || []).map(function (h) { return h.slice(3).trim(); });
  if (heads.join("|") !== HEADINGS.join("|")) ctx.err(rel, "headings must be, in order: " + HEADINGS.join(" · ") + " (found: " + heads.join(" · ") + ")");
  if (body.indexOf("~~") !== -1) ctx.err(rel, "no ~~strike-through~~ (the renderer has none): use ✗ … → ✓ …");
  const forms = tableRows(section(body, "Forms"));
  if (forms > 8) ctx.err(rel, "Forms: at most 8 table rows (" + forms + ")");
  const g = bullets(section(body, "Grammar"));
  if (g < 4 || g > 8) ctx.err(rel, "Grammar: 4–8 bullets (" + g + ")");
  const ph = Math.max(tableRows(section(body, "Phrases")), bullets(section(body, "Phrases")));
  if (ph < 10 || ph > 16) ctx.err(rel, "Phrases: 10–16 pairs (" + ph + ")");
  const sig = tableRows(section(body, "Signal words"));
  if (sig > 10) ctx.err(rel, "Signal words: at most 10 table rows (" + sig + ")");
  const watch = section(body, "Watch out").split("\n").filter(function (l) { return /^[-*] /.test(l); });
  if (watch.length !== 5) ctx.err(rel, "Watch out: 5 lines (" + watch.length + ")");
  watch.forEach(function (l) { if (l.indexOf("✗") === -1 || l.indexOf("✓") === -1 || l.indexOf("→") === -1) ctx.err(rel, "Watch out line must be ✗ … → ✓ …: " + JSON.stringify(l.slice(0, 50))); });
  const n = (body.replace(/[|#*\-_>`]/g, " ").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
  if (n > 650) ctx.warn(rel, n + " words – the sheet may not fit one printed page");
  V.charset(ctx, rel, body);
}

module.exports = function validateCheatsheets(ctx) {
  const dir = ctx.path("cheatsheets");
  let n = 0;
  V.list(dir, /\.md$/).forEach(function (f) {
    const level = f.replace(/\.md$/, "").toUpperCase();
    if (ctx.LEVELS.indexOf(level) === -1) { ctx.err(ctx.rel(path.join(dir, f)), "file name must be <level>.md"); return; }
    checkSheet(ctx, path.join(dir, f), level);
    n++;
  });
  return { sheets: n };
};
