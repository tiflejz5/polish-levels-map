/*
 * validate-lib.js — shared helpers of the content validators (tools/validate-*.js, spec 06 E11).
 *
 * Language facts come from js/config.js (LM.APP) and js/lang.js (LM.lang): the target alphabet, subject pronouns,
 * the speaker-gender endings and case names. This file holds only generic rules and English text.
 *
 *   createContext(opts)        { root, rel(), err(), warn(), errors, warnings, L, APP, … } for one run
 *   readJson(ctx, file)        parsed JSON, or null with an error (undefined when the file is missing)
 *   list(dir, re)              file names of one folder, sorted
 *   charset(ctx, where, text)  ERROR for characters outside ASCII + the target alphabet + typography (E11 rule 3)
 *   targetText(ctx, where, text)  charset + WARNING for a long target text without any diacritics (E11 rule 3)
 *   pronounVariants(ctx, where, accepted)   E11 rule 1
 *   speakerGender(ctx, where, accepted, note)  E11 rule 2
 *   nonEmpty(s), words(s)
 *   answerSpread(seq)          balanced correct answers in fixed-order choices: null or a message (ported from rozklad-regula.js)
 *   fixedSpread(ctx, where, items)  WARNING when the fixed-order multiple-choice items of one set break answerSpread
 */
"use strict";

const fs = require("fs");
const path = require("path");

const REPO = path.join(__dirname, "..");
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
// Typography allowed in any text field besides ASCII (the same list as docs/plan/scripts/validate_plan.py)
const TYPO = "—–…“”‘’·→✗✓×÷°€";
// An English note in a prompt that fixes the speaker's or addressee's gender (spec 05 §3)
const GENDER_NOTE = /\b(?:man|woman|men|women|male|female|boy|girl|he|she|him|her|his|hers|mr|mrs|ms|masculine|feminine)\b/i;
const NO_MARKS_LIMIT = 80;

let LM = null;
/** LM.APP and LM.lang, loaded once the way index.html loads them. */
function lang() {
  if (LM) return LM;
  global.window = global.window || global;
  require(path.join(REPO, "js", "config.js"));
  require(path.join(REPO, "js", "lang.js"));
  LM = global.window.LM;
  return LM;
}

function nonEmpty(s) { return typeof s === "string" && s.trim() !== ""; }

/** Files of one folder (sorted), filtered by a RegExp on the name; [] when the folder is missing. */
function list(dir, re) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(function (f) { return re.test(f) && fs.statSync(path.join(dir, f)).isFile(); }).sort();
}

/**
 * A validation run.
 *   opts.root      folder with the content layout (pages/, quizzes/, exercises/, tests/, decks/, lab/, …)
 *   opts.syllabus  path of syllabus.json
 *   opts.full      true for real content (levels.json, completeness, the full placement pool)
 */
function createContext(opts) {
  const ctx = {
    root: opts.root,
    syllabusFile: opts.syllabus,
    full: !!opts.full,
    strictComplete: !!opts.strictComplete,
    errors: [],
    warnings: [],
    topics: {},
    itemIds: new Set(),
    setsByTopic: {},
    L: lang().lang,
    APP: lang().APP,
    LEVELS: LEVELS
  };
  ctx.rel = function (file) { return path.relative(REPO, file).split(path.sep).join("/"); };
  ctx.err = function (where, msg) { ctx.errors.push(where + ": " + msg); };
  ctx.warn = function (where, msg) { ctx.warnings.push(where + ": " + msg); };
  ctx.path = function () { return path.join.apply(path, [ctx.root].concat(Array.prototype.slice.call(arguments))); };
  return ctx;
}

function readText(file) { return fs.readFileSync(file, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n"); }

function readJson(ctx, file) {
  if (!fs.existsSync(file)) return undefined;
  try { return JSON.parse(readText(file)); } catch (e) { ctx.err(ctx.rel(file), "cannot read JSON (" + e.message + ")"); return null; }
}

/** E11 rule 3: characters outside ASCII, the target alphabet and the typography list → error. */
function charset(ctx, where, text) {
  const allowed = ctx.L.alphabet + TYPO;
  const bad = [];
  Array.from(String(text == null ? "" : text)).forEach(function (c) {
    if (c.charCodeAt(0) > 126 && allowed.indexOf(c) === -1 && bad.indexOf(c) === -1) bad.push(c);
  });
  if (bad.length) ctx.err(where, "characters outside the " + ctx.APP.language + " alphabet: " + bad.sort().join(" ") + " in " + JSON.stringify(String(text).slice(0, 60)));
}

/** charset + a warning for a long target-language text with no diacritics at all (probably stripped). */
function targetText(ctx, where, text) {
  charset(ctx, where, text);
  const s = String(text == null ? "" : text);
  if (s.length > NO_MARKS_LIMIT && ctx.L.stripMarks(s) === s) {
    ctx.warn(where, "a " + ctx.APP.language + " text of " + s.length + " characters without any diacritics (stripped?): " + JSON.stringify(s.slice(0, 50)));
  }
}

/** Words of a sentence for comparison: no punctuation, lower case. */
function words(s) { return lang().lang.normalizeSentence(s).split(" ").filter(Boolean); }

/** E11 rule 1: an accepted sentence starting with a subject pronoun needs the variant without it. */
function pronounVariants(ctx, where, accepted) {
  const norm = function (s) { return String(s).replace(/[?!.,]/g, "").trim().toLowerCase(); };
  const have = new Set((accepted || []).map(norm));
  (accepted || []).forEach(function (a) {
    const w = norm(a).split(/\s+/);
    if (w.length > 1 && ctx.L.pronouns.indexOf(w[0]) !== -1 && !have.has(w.slice(1).join(" "))) {
      ctx.warn(where, "accepted " + JSON.stringify(a) + " starts with a subject pronoun; the variant without it is missing");
    }
  });
}

/**
 * E11 rule 2: an accepted answer with a 1st / 2nd person past or conditional form of one gender, no accepted answer
 * with the other gender and no gender note in the English task text → warning.
 *   accepted  answers of ONE field (a gap, a cell, a translation)
 *   note      the English text of the task (prompt, source, hint, context)
 */
function speakerGender(ctx, where, accepted, note) {
  const seen = { m: [], f: [] };
  (accepted || []).forEach(function (a) {
    String(a).split(/\s+/).forEach(function (w) {
      const g = ctx.L.speakerGender(w);
      if (g && seen[g].indexOf(w) === -1) seen[g].push(w);
    });
  });
  if (!seen.m.length === !seen.f.length) return; // both genders, or neither
  if (GENDER_NOTE.test(String(note || ""))) return;
  const one = seen.m.length ? "masculine" : "feminine";
  ctx.warn(where, "only the " + one + " form (" + (seen.m.length ? seen.m : seen.f).join(", ") + ") is accepted and the task has no gender note");
}

/**
 * Balanced correct answers where the learner sees the options in a fixed order (options are shuffled otherwise):
 * no option position is correct in more than half of the items, and none more than twice in a row.
 * seq = the correct positions or letters in item order; fewer than 3 → null (the rule means nothing).
 */
const SPREAD_MAX_SHARE = 0.5, SPREAD_MAX_RUN = 2;
function answerSpread(seq) {
  if (!Array.isArray(seq) || seq.length < 3) return null;
  const counts = {};
  seq.forEach(function (x) { counts[x] = (counts[x] || 0) + 1; });
  const keys = Object.keys(counts);
  const worst = keys.reduce(function (a, k) { return counts[k] > counts[a] ? k : a; }, keys[0]);
  const dist = keys.sort().map(function (k) { return k + "×" + counts[k]; }).join(" ") + " [" + seq.join(",") + "]";
  if (counts[worst] / seq.length > SPREAD_MAX_SHARE) return "option " + worst + " is correct in " + counts[worst] + " of " + seq.length + " fixed-order items (max 50%): " + dist;
  let run = 1;
  for (let i = 1; i < seq.length; i++) {
    run = seq[i] === seq[i - 1] ? run + 1 : 1;
    if (run > SPREAD_MAX_RUN) return "option " + seq[i] + " is correct more than " + SPREAD_MAX_RUN + " times in a row (items " + (i - SPREAD_MAX_RUN + 1) + "–" + (i + 1) + "): " + dist;
  }
  return null;
}
function fixedSpread(ctx, where, items) {
  const seq = (items || []).filter(function (it) { return it && it.type === "multiple-choice" && it.fixedOrder === true; }).map(function (it) { return it.correct; });
  const msg = answerSpread(seq);
  if (msg) ctx.warn(where, msg);
}

module.exports = {
  REPO: REPO, LEVELS: LEVELS, TYPO: TYPO,
  lang: lang, createContext: createContext, readJson: readJson, readText: readText, list: list,
  nonEmpty: nonEmpty, words: words, charset: charset, targetText: targetText,
  pronounVariants: pronounVariants, speakerGender: speakerGender, answerSpread: answerSpread, fixedSpread: fixedSpread
};
