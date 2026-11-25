/*
 * validate.js — content validators (npm run validate; also the first step of npm run build). Spec 06 E11.
 *
 *   node tools/validate.js                    content/ (the real content)
 *   node tools/validate.js --root docs/plan   the plan: docs/plan/syllabus.json + docs/plan/examples/ (same layout)
 *   node tools/validate.js --quiet            no SKIPPED lines
 *   node tools/validate.js --json             { errors, warnings } as JSON (tools/tests.js compares it with Python)
 *
 * Every rule of docs/plan/scripts/validate_plan.py, the rules of the original app's validators for the formats this
 * app keeps, and the E11 heuristics. Modules (each: function (ctx)):
 *   validate-pages.js        topic pages            validate-exercises.js   sets, map, mixes, quizzes, final tests
 *   validate-tests.js        placement test         validate-decks.js       flashcard decks
 *   validate-lab.js          Case Lab data          validate-cheatsheets.js cheat sheets
 *   validate-phrases.js      writing phrase bank    validate-items.js       one item, every type (used by the others)
 *   validate-lib.js          context, charset, E11 heuristics (subject pronoun, speaker gender, no-diacritics warning)
 *
 * Until the first content stage an "available" level that is not complete, and a placement pool that is not full,
 * are warnings (STRICT_COMPLETE = false); validate_plan.py reports them as errors. Exit code 1 on errors.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const V = require("./validate-lib");

// Switch to true in the first content stage (stage C): completeness and pool sizes become errors.
const STRICT_COMPLETE = false;
const LANG_ID = "pl";

function run(opts) {
  const root = path.resolve(V.REPO, opts.root || "content");
  const plan = fs.existsSync(path.join(root, "examples"));
  const ctx = V.createContext({
    root: plan ? path.join(root, "examples") : root,
    syllabus: path.join(root, "syllabus.json"),
    full: !plan,
    strictComplete: STRICT_COMPLETE
  });
  const out = { ctx: ctx, plan: plan, stats: {} };

  // ---------- syllabus.json ----------
  const sylRel = ctx.rel(ctx.syllabusFile);
  const syl = V.readJson(ctx, ctx.syllabusFile);
  if (syl === undefined) ctx.err(sylRel, "missing");
  if (syl) {
    if (syl.lang !== LANG_ID && syl.lang !== ctx.APP.targetLang) ctx.err(sylRel, "lang is " + JSON.stringify(syl.lang) + ", expected " + JSON.stringify(ctx.APP.targetLang));
    const cats = syl.categories || {};
    if ((syl.levels || []).map(function (l) { return l.id; }).join(",") !== V.LEVELS.join(",")) ctx.err(sylRel, "levels must be exactly A1…C2 in order");
    const unitIds = new Set();
    (syl.levels || []).forEach(function (L) {
      ["land", "goal"].forEach(function (k) { if (!L[k]) ctx.err(sylRel, L.id + ": missing " + k); });
      if (!L.units || !L.units.length) ctx.err(sylRel, L.id + ": no units");
      (L.units || []).forEach(function (U) {
        if (unitIds.has(U.id)) ctx.err(sylRel, "duplicate unit id " + U.id);
        unitIds.add(U.id);
        if (String(U.id).indexOf(String(L.id).toLowerCase() + "-") !== 0) ctx.err(sylRel, "unit " + U.id + " is not prefixed with its level");
        const ts = U.topics || [];
        if (!ts.length) ctx.err(sylRel, U.id + ": empty unit");
        if (ts.length < 2 || ts.length > 8) ctx.warn(sylRel, U.id + ": " + ts.length + " topics (expected 2–8)");
        ts.forEach(function (T) {
          const m = /^(a1|a2|b1|b2|c1|c2)-([a-z]+)-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(T.id || "");
          if (!m) { ctx.err(sylRel, "bad topic id " + JSON.stringify(T.id)); return; }
          if (m[1].toUpperCase() !== L.id) ctx.err(sylRel, T.id + " is listed under " + L.id);
          if (m[2] !== T.category || !cats[T.category]) ctx.err(sylRel, T.id + ": category mismatch or unknown category");
          if (ctx.topics[T.id]) ctx.err(sylRel, "duplicate topic id " + T.id);
          ["title", "example"].forEach(function (k) { if (!T[k]) ctx.err(sylRel, T.id + ": missing " + k); });
          ctx.topics[T.id] = { level: L.id, unit: U.id, category: T.category, title: T.title };
        });
      });
    });
  }

  // ---------- levels.json (content only) ----------
  let levels = null;
  if (!plan) {
    levels = V.readJson(ctx, path.join(root, "levels.json"));
    if (!levels) ctx.err("content/levels.json", "missing");
    else V.LEVELS.forEach(function (L) { if (["available", "soon"].indexOf(levels[L]) === -1) ctx.err(ctx.rel(path.join(root, "levels.json")), L + " must be \"available\" or \"soon\""); });
  }

  // ---------- modules ----------
  const pages = require("./validate-pages")(ctx);
  const ex = require("./validate-exercises")(ctx);
  require("./validate-tests")(ctx);
  const decks = require("./validate-decks")(ctx);
  require("./validate-lab")(ctx);
  const sheets = require("./validate-cheatsheets")(ctx);
  require("./validate-phrases")(ctx);
  out.stats = { topics: Object.keys(ctx.topics).length, pages: Object.keys(pages.pageOf).length, quizzes: Object.keys(ex.quizOf).length, sets: ex.sets, decks: decks.decks, cards: decks.cards, sheets: sheets.sheets };

  // ---------- an available level must be complete ----------
  if (levels && syl) V.LEVELS.forEach(function (L) {
    if (levels[L] !== "available") return;
    const ids = Object.keys(ctx.topics).filter(function (id) { return ctx.topics[id].level === L; });
    const noPage = ids.filter(function (id) { return !pages.pageOf[id]; });
    const noQuiz = ids.filter(function (id) { return !ex.quizOf[id]; });
    const lvl = L.toLowerCase();
    const extras = ["summaries/" + lvl + ".md", "cheatsheets/" + lvl + ".md", "tests/final-" + lvl + ".json"].filter(function (r) { return !fs.existsSync(path.join(root, r)); });
    if (!noPage.length && !noQuiz.length && !extras.length) return;
    const msg = "available but not complete: " + noPage.length + "/" + ids.length + " topics without a page, " + noQuiz.length + "/" + ids.length +
      " without a quiz" + (extras.length ? ", missing " + extras.join(", ") : "");
    if (STRICT_COMPLETE) ctx.err(L, msg);
    else ctx.warn(L, msg + " (an error from the first content stage on)");
  });
  return out;
}

const SKIPPED = [
  ["Case Lab decision trees, strip and colours", "stage 6"],
  ["model answers, speaking trainer, exam folders", "validate-models.js, validate-speaking.js, stage E"]
];

function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf("--root");
  const res = run({ root: i !== -1 ? argv[i + 1] : "content" });
  const ctx = res.ctx;
  if (argv.indexOf("--json") !== -1) {
    process.stdout.write(JSON.stringify({ errors: ctx.errors, warnings: ctx.warnings }) + "\n");
  } else {
    ctx.warnings.forEach(function (w) { console.log("WARNING  " + w); });
    ctx.errors.forEach(function (e) { console.log("ERROR    " + e); });
    if (argv.indexOf("--quiet") === -1) SKIPPED.forEach(function (s) { console.log("SKIPPED  " + s[0] + " → " + s[1]); });
    const st = res.stats;
    console.log("validate" + (res.plan ? " (plan examples)" : "") + ": " + st.topics + " topics, " + st.pages + " pages, " + st.quizzes + " quizzes, " +
      st.sets + " sets, " + st.decks + " decks (" + st.cards + " cards), " + st.sheets + " cheat sheets — " + ctx.errors.length + " error(s), " + ctx.warnings.length + " warning(s)");
  }
  return ctx;
}

if (require.main === module) {
  const ctx = main();
  if (ctx.errors.length) process.exit(1);
} else {
  // Required by tools/build.js: validate content/ and report like the command line
  const ctx = main();
  module.exports = { errors: ctx.errors, warnings: ctx.warnings, run: run };
}
