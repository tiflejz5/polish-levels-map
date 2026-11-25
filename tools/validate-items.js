/*
 * validate-items.js — rules for one exercise item, every type (spec 07 §5, spec 06 E6 and E11).
 *
 * The union of docs/plan/scripts/validate_plan.py (check_item, check_mc) and the original engine's item validator
 * (formats kept: field names, gap numbering, option notes, word bags, key words, play limits).
 * Target-language fields (spec 07 §5) go through the charset check; accepted answers through the E11 heuristics.
 *
 *   checkItem(ctx, where, item, set)   set: the set the item belongs to (passage, script) or null
 *   checkMc(ctx, where, item, set)     multiple choice (also used by the placement questions)
 */
"use strict";

const V = require("./validate-lib");

const TYPES = ["multiple-choice", "reorder", "find-error", "short-answer", "gap-fill", "match", "transformation", "translate", "dictation", "paradigm"];
const KINDS = ["form", "function", "meaning", "reading", "listening"];
const MATCH_MODES = ["definition", "halves", "translation", "response"];
const nonEmpty = V.nonEmpty;

/** Lower case, one space, no final punctuation (duplicate detection). */
function norm(s) { return String(s).trim().replace(/\s+/g, " ").replace(/’/g, "'").replace(/[.,!?;:]+$/, "").toLowerCase(); }

/** The task's English text (gender notes, E11 rule 2). */
function noteOf(it) { return [it.prompt, it.source, it.hint, it.context, it.gloss].filter(Boolean).join(" "); }

function checkMc(ctx, where, it, set) {
  const o = it.options;
  const max = it.fixedOrder ? 8 : 4;
  if (!Array.isArray(o) || o.length < 2 || o.length > max || !o.every(nonEmpty)) {
    ctx.err(where, "multiple-choice needs 2–" + max + " non-empty options" + (it.fixedOrder ? "" : " (up to 8 only with fixedOrder)"));
    return;
  }
  if (new Set(o.map(function (x) { return x.trim().toLowerCase(); })).size !== o.length) ctx.err(where, "duplicate options");
  else if (new Set(o.map(function (x) { return ctx.L.normalizeSentence(x); })).size !== o.length) ctx.err(where, "two options are the same after normalisation");
  const c = it.correct;
  if (!Number.isInteger(c) || c < 0 || c >= o.length) ctx.err(where, "correct must be an option index");
  if (!nonEmpty(it.explanation)) ctx.err(where, "explanation missing");
  const notes = it.optionNotes;
  if (notes != null) {
    if (!Array.isArray(notes) || notes.length !== o.length) ctx.err(where, "optionNotes length differs from options");
    else if (Number.isInteger(c) && c >= 0 && c < notes.length && notes[c] !== null) ctx.err(where, "optionNotes for the correct option must be null");
    else if (notes.some(function (n, i) { return i !== c && (n === null || !nonEmpty(n)); })) ctx.warn(where, "a wrong option has no note");
  }
  if (it.kind != null && KINDS.indexOf(it.kind) === -1) ctx.err(where, "unknown kind " + JSON.stringify(it.kind));
  // (The original rule "kind form needs a ___ gap" is not kept: the gold examples have form items that compare whole sentences.)
  if (it.kind === "reading" && !(set && nonEmpty(set.passage))) ctx.err(where, "kind \"reading\" without a passage in the set");
  if (it.kind === "listening" && !nonEmpty(it.script) && !(set && nonEmpty(set.script))) ctx.err(where, "kind \"listening\" without a script (item or set)");
  o.forEach(function (x) { V.charset(ctx, where, x); });
}

function checkItem(ctx, where, it, set) {
  if (!it || typeof it !== "object") { ctx.err(where, "not an item"); return; }
  const t = it.type;
  if (TYPES.indexOf(t) === -1) { ctx.err(where, "unknown type " + JSON.stringify(t)); return; }
  if (t !== "dictation" && !nonEmpty(it.explanation)) ctx.err(where, "explanation missing");
  if (it.tags != null && !(Array.isArray(it.tags) && it.tags.every(function (x) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x); }))) ctx.err(where, "tags must be lower-case kebab strings");
  if (it.level != null && ctx.LEVELS.indexOf(it.level) === -1) ctx.err(where, "unknown level " + JSON.stringify(it.level));
  if (it.topic != null && !ctx.topics[it.topic]) ctx.err(where, "topic " + JSON.stringify(it.topic) + " is not in the syllabus");
  const fn = CHECKS[t];
  if (fn) fn(ctx, where, it, set);
}

const CHECKS = {
  "multiple-choice": checkMc,

  "reorder": function (ctx, where, it) {
    const a = it.answers;
    if (!Array.isArray(a) || !a.length || !a.every(nonEmpty) || !nonEmpty(it.context)) { ctx.err(where, "reorder needs context and answers"); return; }
    // The word bag of validate_plan.py: punctuation . , ; : ? ! removed, lower case (quotes and dashes count)
    const bag = function (s) { return s.replace(/[?!.,;:]/g, "").toLowerCase().split(/\s+/).filter(Boolean).sort().join("\u0000"); };
    if (a.some(function (x) { return bag(x) !== bag(a[0]); })) ctx.err(where, "reorder: every answer must use exactly the same words");
    if (V.words(a[0]).length < 2) ctx.err(where, "reorder: fewer than 2 words");
    if (a.length > 6) ctx.warn(where, "reorder: more than 6 orders – redesign the task (spec 05 §3)");
    const extra = it.extraTokens || [];
    const base = V.words(a[0]);
    if (!Array.isArray(extra) || extra.length > 2) ctx.err(where, "extraTokens: at most 2");
    else extra.forEach(function (e) { if (base.indexOf(String(e).toLowerCase()) !== -1) ctx.err(where, "extraToken " + JSON.stringify(e) + " is a word of the answer"); });
    if (it.keepCapital != null && typeof it.keepCapital !== "boolean") ctx.err(where, "keepCapital must be true or false");
    a.forEach(function (x) { V.charset(ctx, where, x); });
  },

  "find-error": function (ctx, where, it) {
    const tok = it.tokens;
    if (!Array.isArray(tok) || tok.length < 2 || !tok.every(nonEmpty)) { ctx.err(where, "find-error: tokens, at least 2 words"); return; }
    if (!it.noError) {
      const r = it.errorRange;
      const rangeOk = Array.isArray(r) && r.length === 2 && Number.isInteger(r[0]) && Number.isInteger(r[1]) && r[0] >= 0 && r[0] <= r[1] && r[1] < tok.length;
      if (!rangeOk || !Array.isArray(it.fixes) || !it.fixes.length) ctx.err(where, "find-error: tokens, errorRange [from, to], fixes");
      else {
        if (!it.fixes.every(function (f) { return typeof f === "string"; })) ctx.err(where, "fixes must be strings");
        const wrong = tok.slice(r[0], r[1] + 1).join(" ").toLowerCase();
        it.fixes.forEach(function (f) { if (String(f).toLowerCase() === wrong) ctx.err(where, "fix " + JSON.stringify(f) + " is the same as the wrong part"); });
      }
    }
    tok.concat(it.fixes || []).forEach(function (x) { V.charset(ctx, where, x); });
    V.speakerGender(ctx, where, it.fixes, noteOf(it));
  },

  "short-answer": function (ctx, where, it) {
    if ((String(it.prompt || "").match(/___/g) || []).length !== 1) ctx.err(where, "short-answer: the prompt needs exactly one ___ gap");
    if (!Array.isArray(it.accepted) || !it.accepted.length || !it.accepted.every(nonEmpty)) { ctx.err(where, "short-answer: accepted must be a non-empty list"); return; }
    it.accepted.forEach(function (x) { V.charset(ctx, where, x); });
    V.pronounVariants(ctx, where, it.accepted);
    V.speakerGender(ctx, where, it.accepted, noteOf(it));
  },

  "gap-fill": function (ctx, where, it) {
    const text = String(it.text || "");
    const nums = (text.match(/\{\{(\d+)\}\}/g) || []).map(function (m) { return Number(m.slice(2, -2)); });
    const gaps = Array.isArray(it.gaps) ? it.gaps : [];
    if (nums.length === 0 || nums.length !== gaps.length || nums.length > 4) ctx.err(where, "gap-fill: 1–4 gaps {{n}} matching gaps[]");
    if (nums.join(",") !== nums.map(function (_, i) { return i + 1; }).join(",")) ctx.err(where, "gap-fill: gaps must be numbered {{1}}…{{n}} in order");
    gaps.forEach(function (g, i) {
      if (!g || !Array.isArray(g.accepted) || !g.accepted.length || !g.accepted.every(nonEmpty)) { ctx.err(where, "gap " + (i + 1) + " without accepted answers"); return; }
      if (g.hint != null && !nonEmpty(g.hint)) ctx.err(where, "gap " + (i + 1) + ": hint must be non-empty text");
      g.accepted.forEach(function (a) { V.charset(ctx, where, a); });
      if (g.hint != null) V.charset(ctx, where, g.hint);
      V.speakerGender(ctx, where + " gap " + (i + 1), g.accepted, noteOf(it));
    });
    V.targetText(ctx, where, text);
  },

  "match": function (ctx, where, it) {
    const pairs = Array.isArray(it.pairs) ? it.pairs : [];
    if (MATCH_MODES.indexOf(it.mode) === -1 || pairs.length < 3 || pairs.length > 6) ctx.err(where, "match: mode (" + MATCH_MODES.join(", ") + ") and 3–6 pairs");
    if (!pairs.every(function (x) { return Array.isArray(x) && x.length === 2 && nonEmpty(x[0]) && nonEmpty(x[1]); })) { ctx.err(where, "match: every pair is [left, right] with non-empty texts"); return; }
    const left = pairs.map(function (x) { return norm(x[0]); }), right = pairs.map(function (x) { return norm(x[1]); });
    if (new Set(left).size !== left.length || new Set(right).size !== right.length) ctx.err(where, "match: duplicate side");
    const extra = it.extraRight == null ? [] : it.extraRight;
    if (!Array.isArray(extra) || extra.length > 2 || !extra.every(nonEmpty)) ctx.err(where, "extraRight: at most 2 non-empty texts");
    else if (extra.some(function (e) { return right.indexOf(norm(e)) !== -1; })) ctx.err(where, "extraRight repeats a right side");
    // Target sides (spec 07 §5): translation = English ↔ target, definition = target ↔ English, else both target
    pairs.forEach(function (x) {
      if (it.mode !== "translation") V.charset(ctx, where, x[0]);
      if (it.mode !== "definition") V.charset(ctx, where, x[1]);
    });
    // An English side with target-language letters: the pairs are probably the wrong way round (stage 5 finding)
    const englishSide = it.mode === "translation" ? 0 : it.mode === "definition" ? 1 : -1;
    if (englishSide !== -1 && pairs.some(function (x) { return ctx.L.stripMarks(String(x[englishSide])) !== String(x[englishSide]); })) {
      ctx.warn(where, "match (" + it.mode + "): the English side (" + (englishSide ? "right" : "left") + ") has " + ctx.APP.language + " letters; are the pairs the wrong way round?");
    }
  },

  "transformation": function (ctx, where, it) {
    const kw = String(it.keyword || "").trim();
    const answers = Array.isArray(it.answers) ? it.answers : [];
    ["source", "keyword", "answers"].forEach(function (k) { if (!(k === "answers" ? answers.length : nonEmpty(it[k]))) ctx.err(where, "transformation: " + k + " missing"); });
    ["before", "after"].forEach(function (k) { if (typeof it[k] !== "string") ctx.err(where, "transformation: " + k + " must be a string (may be empty)"); });
    const lim = it.wordLimit == null ? [2, 5] : it.wordLimit;
    if (!(Array.isArray(lim) && lim.length === 2 && lim[0] >= 1 && lim[0] <= lim[1])) { ctx.err(where, "wordLimit must be [min, max]"); return; }
    const kwWords = V.words(kw);
    answers.forEach(function (a) {
      if (!nonEmpty(a)) { ctx.err(where, "transformation: empty answer"); return; }
      const w = V.words(a);
      const has = kwWords.length && w.some(function (_, i) { return kwWords.every(function (k, j) { return w[i + j] === k; }); });
      if (kw && !has) ctx.err(where, "answer " + JSON.stringify(a) + " does not contain the key word " + kw);
      const n = ctx.L.countWords(a);
      if (n < lim[0] || n > lim[1]) ctx.err(where, "answer " + JSON.stringify(a) + " has " + n + " words, limit " + lim[0] + "–" + lim[1]);
      V.charset(ctx, where, a);
    });
    if (it.parts != null && (!Array.isArray(it.parts) || it.parts.length !== 2 || !it.parts.every(function (p) { return Array.isArray(p) && p.length && p.every(nonEmpty); }))) ctx.err(where, "parts must have exactly 2 lists of variants");
    [it.source, it.keyword, it.before, it.after].forEach(function (x) { if (x != null) V.charset(ctx, where, x); });
    V.speakerGender(ctx, where, answers, noteOf(it));
  },

  "translate": function (ctx, where, it) {
    const acc = Array.isArray(it.accepted) ? it.accepted : [];
    if (!nonEmpty(it.source) || acc.length < 1 || acc.length > 8 || !acc.every(nonEmpty)) ctx.err(where, "translate: source and 1–8 accepted");
    if (it.hint != null && !nonEmpty(it.hint)) ctx.err(where, "hint must be non-empty text");
    if (Array.from(String(it.source || "")).some(function (c) { return c.charCodeAt(0) > 126 && V.TYPO.indexOf(c) === -1; })) ctx.warn(where, "translate source should be English");
    V.pronounVariants(ctx, where, acc);
    V.speakerGender(ctx, where, acc, noteOf(it));
    acc.forEach(function (a) { V.charset(ctx, where, a); });
  },

  "dictation": function (ctx, where, it) {
    const n = String(it.text || "").trim().split(/\s+/).filter(Boolean).length;
    if (n < 4 || n > 30) ctx.err(where, "dictation: 4–30 words (has " + n + ")");
    const mp = it.maxPlays == null ? 3 : it.maxPlays;
    if (!Number.isInteger(mp) || mp < 1 || mp > 5) ctx.err(where, "maxPlays 1–5");
    if (it.accepted != null && (!Array.isArray(it.accepted) || !it.accepted.every(nonEmpty))) ctx.err(where, "accepted must be a list of non-empty variants");
    if (!nonEmpty(it.explanation)) ctx.warn(where, "dictation without an explanation (the spelling rule it trains)");
    V.targetText(ctx, where, it.text || "");
    (it.accepted || []).forEach(function (a) { V.charset(ctx, where, a); });
  },

  "paradigm": function (ctx, where, it) {
    const cells = Array.isArray(it.cells) ? it.cells : [];
    if (cells.length < 3 || cells.length > 8) ctx.err(where, "paradigm: 3–8 cells");
    if (new Set(cells.map(function (c) { return c && c.label; })).size !== cells.length) ctx.err(where, "paradigm: duplicate labels");
    if (cells.filter(function (c) { return c && !c.given; }).length < 2) ctx.err(where, "paradigm: at least 2 cells to fill");
    if (!nonEmpty(it.lemma) || !nonEmpty(it.prompt)) ctx.err(where, "paradigm: lemma and prompt");
    if (it.gloss != null && !nonEmpty(it.gloss)) ctx.err(where, "paradigm: gloss must be non-empty text");
    cells.forEach(function (c) {
      if (!c || !nonEmpty(c.label)) { ctx.err(where, "paradigm: a cell without a label"); return; }
      if (c.given != null && typeof c.given !== "boolean") ctx.err(where, "paradigm: given must be true or false");
      if (!Array.isArray(c.accepted) || !c.accepted.length || !c.accepted.every(nonEmpty)) { ctx.err(where, "paradigm: cell " + JSON.stringify(c.label) + " without accepted"); return; }
      c.accepted.forEach(function (a) { V.charset(ctx, where, a); });
      if (!ctx.L.caseOf(c.label)) V.charset(ctx, where, c.label);
      if (!c.given) V.speakerGender(ctx, where + " cell " + JSON.stringify(c.label), c.accepted, noteOf(it) + " " + c.label);
    });
    V.charset(ctx, where, it.lemma || "");
  }
};

module.exports = { TYPES: TYPES, checkItem: checkItem, checkMc: checkMc };
