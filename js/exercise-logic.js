/*
 * exercise-logic.js — pure logic of the exercise engine (no DOM), tested
 * in tools/tests.js. Spec: docs/rozbudowa-v2/spec/01-typy-zadan.md
 * and the reference spec 02 (lab and mixed sets) (the mixed-set algorithm).
 *
 *   normalize(str)                    answer comparison: LM.lang.normalizeAnswer (diacritics kept)
 *   match(answer, accepted, opts)     typed answers (spec 05 §2): { ok, near: accents|ending|typo|null, closest, index, diff }
 *   shuffle(list, rng)                Fisher–Yates shuffle (a copy of the list)
 *   prepareChoice(item, rng)          multiple-choice options in random order
 *   reorderTokens(item, rng)          words to put in order (never in the correct order); punctuation-only tokens
 *                                     (dashes) are left out, the first word loses its capital unless it is a proper noun
 *   paradigmCells(item)               [{ index, label, accepted, given }] of a paradigm item; cells to fill = not given
 *   evaluate(item, answer, opts)      { correct, points, max, near, lenient, … } for every item type
 *                                     (opts.lenientAccents: an answer that differs only in Polish marks counts, spec 05 §2)
 *   maxPoints(item)                   maximum points for an item (old types: 1)
 *   sessionScore(results)             session score in points { score, total }
 *   scoreTransformationParts(item, answer, limit)  Cambridge-style transformation
 *   normalizeSentence(str)            a sentence for comparison: LM.lang.normalizeSentence (no punctuation)
 *   matchesSentence(answer, accepted) does the sentence match any variant
 *   wordDiff(model, got)              word-by-word comparison (missing / extra / replaced)
 *   prepareMatch(item, rng)           the right column of match pairs (always shuffled)
 *
 * Types of pack v6 (the reference app's v6 item-type spec): gap-fill, match,
 * transformation, translate, dictation. Answers: { texts: […] }, { pairs: { leftIndex: rightText } },
 * { text }, { text }, { text } or { skipped: true } (dictation without a voice).
 * paradigm (spec 06 E6): { texts: [one per cell, given cells ignored] }; a point per cell to fill, correct = all.
 *   pickMix(pool, opts, rng)          drawing a mixed set
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const TYPES = ["multiple-choice", "reorder", "find-error", "short-answer", "gap-fill", "match", "transformation", "translate", "dictation", "paradigm"];

  /** Trimmed, one space, ’ → ', no punctuation at the end, lower case; diacritics kept (LM.lang.normalizeAnswer). */
  function normalize(str) { return LM.lang.normalizeAnswer(str); }

  function shuffle(list, rng) {
    const out = list.slice();
    const r = rng || Math.random;
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  /** Edit distance (for the “Watch the spelling” hint). */
  function distance(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    let prev = [];
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  /**
   * Options in random order (unless fixedOrder):
   * [{ text, note, original }], correct = the new index of the correct one.
   */
  function prepareChoice(item, rng) {
    const opts = item.options.map(function (text, i) {
      return { text: text, note: item.optionNotes ? item.optionNotes[i] || null : null, original: i };
    });
    const order = item.fixedOrder ? opts : shuffle(opts, rng);
    return { options: order, correct: order.findIndex(function (o) { return o.original === item.correct; }) };
  }

  /**
   * Words of the model sentence: final punctuation and punctuation-only tokens (a dash between spaces) left out,
   * quotes stay on their words. The first word loses its capital (it would give the order away) unless
   * LM.lang.keepsCapital says so, the item says keepCapital: true, or another accepted order has the same word with a
   * capital inside the sentence (a proper noun: "Tomek czyta…" / "…czyta Tomek.").
   */
  function answerTokens(sentence, item) {
    const words = String(sentence).trim().replace(/[.!?;…]+(?=["”»]?$)/, "").split(/\s+/)
      .filter(function (w) { return /[\p{L}\p{N}]/u.test(w); });
    if (words.length && !keepCapital(words[0], item)) {
      words[0] = words[0].replace(/\p{L}/u, function (c) { return c.toLowerCase(); });
    }
    return words;
  }

  /** Does the first word of a reorder sentence keep its capital? */
  function keepCapital(word, item) {
    if (LM.lang.keepsCapital(word)) return true;
    if (!item) return false;
    if (item.keepCapital === true) return true;
    const bare = function (w) { return String(w).replace(/[^\p{L}\p{N}'’-]/gu, ""); };
    const w = bare(word);
    if (!w || w.charAt(0) === w.charAt(0).toLowerCase()) return false;
    // A capital after a colon or a full stop, or at the start of a quotation, is a sentence capital, not a name
    return (item.answers || []).some(function (a) {
      const t = String(a).trim().split(/\s+/);
      return t.some(function (x, i) { return i > 0 && bare(x) === w && !/^["\u201e\u201c\u00ab(]/.test(x) && !/[:.!?]$/.test(t[i - 1]); });
    });
  }

  /**
   * Pool of words to put in order: [{ id, text }] from answers[0] + extraTokens, shuffled so
   * that it is NOT already the correct sentence.
   */
  function reorderTokens(item, rng) {
    const words = answerTokens(item.answers[0], item).concat(item.extraTokens || []);
    const tokens = words.map(function (text, i) { return { id: "t" + i, text: text }; });
    if (tokens.length < 2) return tokens;
    let out = shuffle(tokens, rng);
    for (let tries = 0; tries < 20 && isAccepted(item, out.map(function (t) { return t.text; })); tries++) out = shuffle(tokens, rng);
    if (isAccepted(item, out.map(function (t) { return t.text; }))) out.push(out.shift()); // last resort
    return out;
  }

  /** Punctuation never decides (LM.lang.normalizeSentence): a comma or a dash in another place is the same order. */
  function isAccepted(item, words) {
    const s = LM.lang.normalizeSentence(words.join(" "));
    return item.answers.some(function (a) { return LM.lang.normalizeSentence(a) === s; });
  }

  /** Index of the first word of the answer that differs from the model (or -1). */
  function firstDifference(item, words) {
    const model = answerTokens(item.answers[0], item).map(LM.lang.normalizeSentence);
    const got = words.map(LM.lang.normalizeSentence);
    for (let i = 0; i < Math.max(model.length, got.length); i++) {
      if (model[i] !== got[i]) return i;
    }
    return -1;
  }

  /**
   * Grading an answer. The answer depends on the type:
   *   multiple-choice: { chosen: indeks w ORYGINALNYCH options }
   *   reorder:         { words: [text…] }
   *   find-error:      { noError: true } or { range: [from, to], fix: "…" }
   *   short-answer:    { text: "…" }
   */
  function evaluate(item, answer, opts) {
    const res = evaluateType(item, answer || {}, opts || {});
    // Points (spec v6 12, section 1): one-point types — 1 for a correct item
    if (res.max === undefined) { res.max = maxPoints(item); res.points = res.correct ? res.max : 0; }
    return res;
  }

  /** Maximum points for an item: gaps, pairs and cells to fill — a point each, transformation with parts — 2, the rest — 1. */
  function maxPoints(item) {
    if (item.type === "gap-fill") return (item.gaps || []).length || 1;
    if (item.type === "paradigm") return paradigmCells(item).filter(function (c) { return !c.given; }).length || 1;
    if (item.type === "match") return (item.pairs || []).length || 1;
    if (item.type === "transformation") return item.parts ? 2 : 1;
    return 1;
  }

  /**
   * Session score in points: results = [{ item, res }] (res = null → an item without an answer, 0 of maxPoints).
   * An item with res.max = 0 (e.g. a dictation skipped without a voice) does not count for the score.
   */
  function sessionScore(results) {
    let score = 0, total = 0;
    results.forEach(function (r) {
      if (r.res) { score += r.res.points || 0; total += r.res.max; }
      else total += maxPoints(r.item);
    });
    return { score: score, total: total };
  }

  function evaluateType(item, answer, opts) {
    if (item.type === "multiple-choice") {
      return { correct: answer.chosen === item.correct, answered: Number.isInteger(answer.chosen) };
    }
    if (item.type === "reorder") {
      const words = answer.words || [];
      const ok = words.length > 0 && isAccepted(item, words);
      return { correct: ok, answered: words.length > 0, diffAt: ok ? -1 : firstDifference(item, words) };
    }
    if (item.type === "find-error") {
      if (answer.noError) return { correct: !!item.noError, answered: true, rangeOk: !!item.noError, fixOk: !!item.noError };
      const r = answer.range;
      if (!r) return { correct: false, answered: false, rangeOk: false, fixOk: false };
      if (item.noError) return { correct: false, answered: true, rangeOk: false, fixOk: false };
      const rangeOk = r[0] === item.errorRange[0] && r[1] === item.errorRange[1];
      const fix = shortAnswer(item.fixes, answer.fix, opts);
      return { correct: rangeOk && fix.correct, answered: true, rangeOk: rangeOk, fixOk: fix.correct, near: fix.near, lenient: rangeOk && fix.lenient };
    }
    if (item.type === "short-answer") return shortAnswer(item.accepted, answer.text, opts);
    if (item.type === "gap-fill") {
      const texts = answer.texts || [];
      const gaps = item.gaps.map(function (g, i) { return shortAnswer(g.accepted, texts[i], opts); });
      const points = gaps.filter(function (g) { return g.correct; }).length;
      return { correct: points === gaps.length, answered: gaps.some(function (g) { return g.answered; }), points: points, max: gaps.length, gaps: gaps,
        lenient: gaps.some(function (g) { return g.lenient; }) };
    }
    if (item.type === "match") {
      const chosen = answer.pairs || {};
      const pairs = item.pairs.map(function (pair, i) { return chosen[i] != null && chosen[i] === pair[1]; });
      const points = pairs.filter(Boolean).length;
      return { correct: points === pairs.length, answered: Object.keys(chosen).some(function (k) { return chosen[k] != null; }), points: points, max: pairs.length, pairs: pairs };
    }
    if (item.type === "paradigm") {
      const texts = answer.texts || [];
      const cells = paradigmCells(item).map(function (c) {
        return c.given ? { given: true, correct: true, answered: false } : shortAnswer(c.accepted, texts[c.index], opts);
      });
      const open = cells.filter(function (c) { return !c.given; });
      const points = open.filter(function (c) { return c.correct; }).length;
      return { correct: open.length > 0 && points === open.length, answered: open.some(function (c) { return c.answered; }), points: points, max: open.length,
        cells: cells, lenient: open.some(function (c) { return c.lenient; }) };
    }
    if (item.type === "transformation") return evaluateTransformation(item, answer.text, opts);
    if (item.type === "translate") return evaluateSentence(item.accepted, answer.text, opts);
    if (item.type === "dictation") {
      // No target-language voice: the item is skipped and counts neither for the score nor for the stats
      if (answer.skipped) return { correct: false, answered: true, skipped: true, points: 0, max: 0 };
      return evaluateSentence([item.text].concat(item.accepted || []), answer.text, opts);
    }
    return { correct: false, answered: false };
  }

  /** Cells of a paradigm item in file order: { index, label, accepted: [..], given }. */
  function paradigmCells(item) {
    return ((item && item.cells) || []).map(function (c, i) {
      return { index: i, label: String(c.label == null ? "" : c.label), accepted: Array.isArray(c.accepted) ? c.accepted : [], given: !!c.given };
    });
  }

  /** One field like short-answer: LM.exLogic.match; a near miss gives 0 points with a hint (accents: lenient mode). */
  function shortAnswer(accepted, value, opts) {
    const m = match(value, accepted);
    const lenient = !m.ok && m.near === "accents" && !!(opts && opts.lenientAccents);
    return { correct: m.ok || lenient, answered: m.answered, near: m.ok ? null : m.near, closest: m.closest, lenient: lenient };
  }

  // =====================================================================
  // ANSWER CHECKING (spec 05 §2): exact → accents → ending → typo → word diff
  // =====================================================================

  function L() { return LM.lang; }

  /** Normalized spellings of a text (LM.lang.variants, then normalized), without duplicates. */
  function forms(text, sentence) {
    const N = sentence ? L().normalizeSentence : L().normalizeAnswer;
    const out = [];
    L().variants(String(text == null ? "" : text)).forEach(function (v) { const n = N(v); if (out.indexOf(n) === -1) out.push(n); });
    return out;
  }

  /** Allowed edit distance of a typo for a word of this length: 1 from 5 letters, 2 from 9 letters. */
  function typoLimit(len) { return len >= 9 ? 2 : len >= 5 ? 1 : 0; }

  /** Single words: the first 60% of the letters (at least 3) are the same, only the ending differs. */
  function endingOnly(mine, model) {
    if (/\s/.test(mine) || /\s/.test(model)) return false;
    const a = L().stripMarks(mine), b = L().stripMarks(model);
    const k = Math.max(3, Math.ceil(b.length * 0.6));
    return a !== b && a.length >= k && b.length >= k && a.slice(0, k) === b.slice(0, k);
  }

  /** Every word the same or within the typo limit (marks ignored), at least one real typo, same number of words. */
  function typoOnly(mine, model) {
    const a = L().stripMarks(mine).split(" "), b = L().stripMarks(model).split(" ");
    if (a.length !== b.length) return false;
    let typos = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === b[i]) continue;
      const d = distance(a[i], b[i]);
      if (d > typoLimit(b[i].length)) return false;
      typos++;
    }
    return typos > 0;
  }

  /**
   * Checks a typed answer against the accepted ones (spec 05 §2). Capital letters never matter.
   *   opts.sentence  translate / dictation / transformation: punctuation ignored, word diff when wrong
   * Returns { ok, near: null | "accents" | "ending" | "typo", closest (accepted text), index (its position in
   * accepted), answered, diff (sentences with near = null: word ops against the closest variant) }.
   * near never makes an answer correct; the caller decides about lenient accents.
   */
  function match(answer, accepted, opts) {
    const sentence = !!(opts && opts.sentence);
    const list = (accepted || []).map(function (a, i) { return { text: String(a == null ? "" : a), index: i, forms: forms(a, sentence) }; })
      .filter(function (a) { return a.forms.some(Boolean); });
    const mine = forms(answer, sentence).filter(Boolean);
    const first = list[0] || { text: "", index: 0 };
    if (!mine.length) return { ok: false, near: null, closest: first.text, index: first.index, answered: false, diff: null };
    const result = function (ok, near, a, diff) { return { ok: ok, near: near, closest: a.text, index: a.index, answered: true, diff: diff || null }; };
    const find = function (test) {
      for (let i = 0; i < list.length; i++) {
        for (let j = 0; j < list[i].forms.length; j++) {
          for (let k = 0; k < mine.length; k++) if (test(mine[k], list[i].forms[j])) return list[i];
        }
      }
      return null;
    };
    let hit = find(function (m, v) { return m === v; });
    if (hit) return result(true, null, hit);
    hit = find(function (m, v) { return L().stripMarks(m) === L().stripMarks(v); });
    if (hit) return result(false, "accents", hit);
    if (!sentence) {
      hit = find(endingOnly);
      if (hit) return result(false, "ending", hit);
    }
    hit = find(typoOnly);
    if (hit) return result(false, "typo", hit);
    if (!sentence || !list.length) return result(false, null, first);
    const best = closestDiff(mine, list);
    return result(false, null, best ? best.entry : first, best ? best.diff.ops : null);
  }

  // =====================================================================
  // SENTENCES (translate, dictation, transformation): word-by-word comparison
  // =====================================================================

  /** Normalized sentence for comparison (LM.lang.normalizeSentence: no punctuation, diacritics kept). */
  function normalizeSentence(text) { return L().normalizeSentence(text); }

  /** Does the sentence match (after normalization) any of the accepted ones? */
  function matchesSentence(answer, accepted) { return match(answer, accepted, { sentence: true }).ok; }

  /**
   * Word-by-word comparison (edit distance on words):
   * [{ op: "same" | "missing" | "extra" | "replace", word (model), got (answer) }].
   */
  function wordDiff(model, got) {
    const m = model.length, n = got.length;
    const d = [];
    for (let i = 0; i <= m; i++) { d.push([i]); for (let j = 1; j <= n; j++) d[i][j] = i ? 0 : j; }
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (model[i - 1] === got[j - 1] ? 0 : 1));
      }
    }
    const ops = [];
    let i = m, j = n;
    // On a tie: first matching words, then missing / extra (more words stay “in place”), replacement last
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && model[i - 1] === got[j - 1] && d[i][j] === d[i - 1][j - 1]) {
        ops.unshift({ op: "same", word: model[i - 1] });
        i--; j--;
      } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
        ops.unshift({ op: "missing", word: model[i - 1] });
        i--;
      } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
        ops.unshift({ op: "extra", got: got[j - 1] });
        j--;
      } else {
        ops.unshift({ op: "replace", word: model[i - 1], got: got[j - 1] });
        i--; j--;
      }
    }
    return { distance: d[m][n], ops: ops };
  }

  /** The closest accepted variant (fewest word changes) and the comparison with it. */
  function closestDiff(mine, list) {
    let best = null;
    list.forEach(function (entry) {
      entry.forms.forEach(function (v) {
        const model = v.split(" ").filter(Boolean);
        mine.forEach(function (m) {
          const diff = wordDiff(model, m.split(" ").filter(Boolean));
          if (!best || diff.distance < best.diff.distance) best = { entry: entry, diff: diff };
        });
      });
    });
    return best;
  }

  /** translate / dictation: 1 point for a match; otherwise the hint (near) or the comparison with the closest variant. */
  function evaluateSentence(accepted, text, opts) {
    const m = match(text, accepted, { sentence: true });
    const lenient = !m.ok && m.near === "accents" && !!(opts && opts.lenientAccents);
    const correct = m.ok || lenient;
    return { correct: correct, answered: m.answered, points: correct ? 1 : 0, max: 1, near: m.ok ? null : m.near, lenient: lenient,
      diff: correct ? null : m.diff, closest: m.index, closestText: m.closest };
  }

  /** Number of words in a transformation and the reason for rejecting it before grading (limit, key word), or null. */
  function transformationCheck(item, text, lim) {
    const t = trTokens(text);
    if (!t.length) return { words: 0, msg: "No answer." };
    if (t.length < lim[0] || t.length > lim[1]) return { words: t.length, msg: "Type " + lim[0] + "–" + lim[1] + " words (you have " + plural(t.length, "word", "words") + ")." };
    if (!findSeq(t, trTokens(item.keyword), 0).length) return { words: t.length, msg: "Use the key word without changing it (" + item.keyword + ")." };
    return { words: t.length, msg: null };
  }

  /** Word limit of a transformation item: wordLimit or 2–5 (B1–B2). */
  function transformationLimit(item) {
    const w = item.wordLimit;
    return Array.isArray(w) && w.length === 2 && w[0] >= 1 && w[0] <= w[1] ? w : [2, 5];
  }

  /**
   * transformation: without parts — 1 point for a match with answers (LM.exLogic.match, sentence mode);
   * with parts — 2 points, Cambridge style (scoreTransformationParts), a full match with answers always 2.
   */
  function evaluateTransformation(item, text, opts) {
    const lim = transformationLimit(item);
    const max = item.parts ? 2 : 1;
    const check = transformationCheck(item, text, lim);
    const answered = check.words > 0;
    if (check.msg) return { correct: false, answered: answered, points: 0, max: max, msg: check.msg, parts: item.parts ? item.parts.map(function () { return false; }) : null };
    const m = match(text, item.answers, { sentence: true });
    const lenient = !m.ok && m.near === "accents" && !!opts.lenientAccents;
    if (m.ok || lenient) return { correct: true, answered: true, points: max, max: max, msg: null, near: m.ok ? null : m.near, lenient: lenient, parts: item.parts ? item.parts.map(function () { return true; }) : null };
    if (!item.parts) return { correct: false, answered: true, points: 0, max: 1, msg: null, near: m.near, closest: m.index, parts: null };
    const r = scoreTransformationParts(item, text, lim);
    return { correct: r.score === 2, answered: true, points: r.score, max: 2, msg: r.msg, parts: r.parts };
  }

  /**
   * The right column of match pairs: [{ id, text }] (pairs + extraRight), always shuffled —
   * never in the order of the pairs in the file.
   */
  function prepareMatch(item, rng) {
    const right = item.pairs.map(function (p, i) { return { id: "r" + i, text: p[1] }; })
      .concat((item.extraRight || []).map(function (t, i) { return { id: "x" + i, text: t }; }));
    const inOrder = function (list) { return item.pairs.every(function (p, i) { return list[i].text === p[1]; }); };
    let out = shuffle(right, rng);
    for (let tries = 0; tries < 20 && inOrder(out); tries++) out = shuffle(right, rng);
    if (inOrder(out)) out.push(out.shift());
    return out;
  }

  // =====================================================================
  // SENTENCE TRANSFORMATIONS (shared by the “transformation” type)
  // =====================================================================

  /** "1 word", "3 words": local, because this file is pure (the unit tests load it without js/utils.js). */
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  /** Upper case, ’ → ', no punctuation (except the apostrophe), single spaces. */
  function trNorm(text) {
    return String(text || "")
      .toUpperCase()
      .replace(/[’‘`´]/g, "'")
      .replace(/[^\p{L}\p{N}'\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** Words of a transformation answer (upper case, no punctuation; one token per LM.lang.countWords word). */
  function trTokens(text) {
    return trNorm(text).split(" ").filter(function (w) { return LM.lang.countWords(w) === 1; });
  }

  /** Positions where the sequence “needle” occurs in “hay” (from index from). */
  function findSeq(hay, needle, from) {
    const hits = [];
    if (!needle.length) return hits;
    for (let i = from || 0; i + needle.length <= hay.length; i++) {
      let ok = true;
      for (let j = 0; j < needle.length; j++) {
        if (hay[i + j] !== needle[j]) { ok = false; break; }
      }
      if (ok) hits.push(i);
    }
    return hits;
  }

  const TR_DEFAULT_LIMIT = [3, 6]; // C1 Advanced

  /**
   * Cambridge-style transformation: the word count within the limit (limit = [min, max], default 3–6),
   * the key word unchanged, 1 point for each part (item.parts = [[variants]…]); a later part counts
   * when it comes AFTER the previous one. An item with one part: 2 points or 0.
   * Returns { score, parts: [true/false…], msg } (msg — the reason for 0 points before grading the parts, or null).
   */
  function scoreTransformationParts(item, answer, limit) {
    const lim = Array.isArray(limit) ? limit : TR_DEFAULT_LIMIT;
    const t = trTokens(answer);
    const parts = item.parts.map(function () { return false; });
    if (!t.length) return { score: 0, parts: parts, msg: "No answer." };
    if (t.length < lim[0] || t.length > lim[1]) {
      return { score: 0, parts: parts, msg: "Type " + lim[0] + "–" + lim[1] + " words (you have " + plural(t.length, "word", "words") + ")." };
    }
    if (!findSeq(t, trTokens(item.keyword), 0).length) {
      return { score: 0, parts: parts, msg: "Use the key word without changing it (" + item.keyword + ")." };
    }
    let cursor = 0;
    item.parts.forEach(function (variants, k) {
      let bestEnd = -1;
      variants.forEach(function (variant) {
        const v = trTokens(variant);
        const starts = findSeq(t, v, cursor);
        if (starts.length) {
          const end = starts[0] + v.length;
          if (bestEnd === -1 || end < bestEnd) bestEnd = end;
        }
      });
      if (bestEnd !== -1) { parts[k] = true; cursor = bestEnd; }
    });
    const max = item.parts.length === 1 ? 2 : item.parts.length;
    const score = parts.filter(Boolean).length * (max / item.parts.length);
    return { score: score, parts: parts, msg: null };
  }

  /**
   * Mixed set (spec 02, B.3).
   * pool: items (with a topic field); opts: { count, exclude: [id…], types: [type…], weight: fn(item) → weight }.
   * Weights (e.g. LM.stats.mixWeight) raise the chance of drawing weak / unseen items within a topic.
   * 1. type filter, 2. excluding the last session (when the pool is big enough),
   * 3. round-robin over topics (random within a topic), 4. order: at most 2 items of the same type in a row.
   * Returns { items, requested, available }.
   */
  function pickMix(pool, opts, rng) {
    opts = opts || {};
    const r = rng || Math.random;
    let items = pool.filter(function (it) { return !opts.types || !opts.types.length || opts.types.indexOf(it.type) !== -1; });
    const available = items.length;
    const count = Math.min(opts.count || 10, available);
    const exclude = new Set(opts.exclude || []);
    const fresh = items.filter(function (it) { return !exclude.has(it.id); });
    if (fresh.length >= count) items = fresh;

    const byTopic = {};
    const topicOrder = [];
    (opts.weight ? weightedOrder(items, opts.weight, r) : shuffle(items, r)).forEach(function (it) {
      const t = it.topic || "";
      if (!byTopic[t]) { byTopic[t] = []; topicOrder.push(t); }
      byTopic[t].push(it);
    });
    const picked = [];
    let round = 0;
    while (picked.length < count) {
      let any = false;
      topicOrder.forEach(function (t) {
        if (picked.length < count && byTopic[t][round]) { picked.push(byTopic[t][round]); any = true; }
      });
      if (!any) break;
      round++;
    }
    return { items: limitRuns(shuffle(picked, r), 2), requested: opts.count || 10, available: available };
  }

  /**
   * Weighted random order (Efraimidis–Spirakis): an element with weight 2 has twice
   * the chance to come first than one with weight 1. No weights = a plain shuffle.
   */
  function weightedOrder(list, weight, rng) {
    const r = rng || Math.random;
    return list.map(function (it) {
      const w = Math.max(0.01, Number(weight(it)) || 1);
      return { it: it, key: Math.pow(r() || 1e-9, 1 / w) };
    }).sort(function (a, b) { return b.key - a.key; }).map(function (x) { return x.it; });
  }

  /** Reorders the items so that the same type does not come more than max times in a row (when possible). */
  function limitRuns(list, max) {
    const out = list.slice();
    for (let i = max; i < out.length; i++) {
      let run = true;
      for (let k = 1; k <= max; k++) if (out[i - k].type !== out[i].type) run = false;
      if (!run) continue;
      const j = out.findIndex(function (x, idx) { return idx > i && x.type !== out[i].type; });
      if (j === -1) break;
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  /**
   * The “set 8/10” label in the level list (pack v8, S4): from the best results of the topic's sets
   * ([{ score, total }]) picks the set with the highest percentage (tie: more points). → { score, total, high, text } or null.
   * high = a score ≥ 80% (a dot in the land colour).
   */
  function bestSetLabel(bests) {
    let top = null;
    (bests || []).forEach(function (b) {
      if (!b || !(b.total > 0) || !(b.score >= 0)) return;
      const pct = b.score / b.total;
      if (!top || pct > top.pct || (pct === top.pct && b.total > top.total)) top = { score: b.score, total: b.total, pct: pct };
    });
    return top ? { score: top.score, total: top.total, high: top.pct >= 0.8, text: "set " + top.score + "/" + top.total } : null;
  }

  /**
   * The sentence for listening with the S key (pack v8, S5): before checking a gap is a pause (" … "), after checking — the model answer.
   * Returns the text or "" (a type without a sentence to read: match pairs, dictation, putting in order before checking).
   */
  function speechText(item, answered) {
    const PAUSE = " … ";
    const tidy = function (t) { return String(t).replace(/\s+/g, " ").replace(/\s+([,.;!?])/g, "$1").trim(); };
    // Only target-language text is read (spec 05 §4): a speaker label or an English instruction before a colon goes,
    // and so does a bracket that is not target text ("(I like music.)") or that follows a gap (a lemma hint: "{{1}} (brat)")
    const lines = function (t) {
      return String(t || "").split("\n").map(function (l) {
        const lead = /^([^:\n]{1,60}):\s+/.exec(l);
        if (lead && (/^\p{Lu}[\p{L}\p{N} ]{0,12}$/u.test(lead[1]) || LM.lang.looksEnglish(lead[1]))) return l.slice(lead[0].length);
        return l;
      }).join(" ");
    };
    const brackets = function (t) {
      return String(t).replace(/(_{2,}|\{\{\d+\}\})?(\s*)\(([^()]*)\)/g, function (m, gap, sp, inner) {
        if (gap) return gap;
        return LM.lang.isTarget(inner) ? m : "";
      });
    };
    if (!item) return "";
    switch (item.type) {
      case "multiple-choice": {
        const gap = /_{2,}/;
        const text = brackets(lines(item.prompt));
        if (!gap.test(text)) return tidy(text);
        return tidy(text.replace(gap, answered ? item.options[item.correct] : PAUSE));
      }
      case "short-answer":
        return tidy(brackets(lines(item.prompt)).replace(/_{2,}/, answered ? item.accepted[0] : PAUSE));
      case "gap-fill":
        return tidy(brackets(item.text).replace(/\{\{(\d+)\}\}/g, function (m, n) {
          const g = item.gaps[Number(n) - 1];
          return answered && g ? g.accepted[0] : PAUSE;
        }));
      case "transformation":
        return tidy([item.before, answered ? item.answers[0] : PAUSE, item.after].filter(Boolean).join(" "));
      case "reorder":
        return answered ? tidy(item.answers[0]) : "";
      case "translate":
        return answered ? tidy(item.accepted[0]) : "";
      case "find-error":
        return tidy((item.tokens || []).join(" "));
      case "paradigm":
        // After checking: the forms in table order; before: nothing (it would give the answers away)
        return answered ? paradigmCells(item).map(function (c) { return c.accepted[0]; }).filter(Boolean).join(", ") : "";
      default:
        return "";
    }
  }

  LM.exLogic = {
    speechText: speechText,
    bestSetLabel: bestSetLabel,
    TYPES: TYPES,
    normalize: normalize,
    match: match,
    shuffle: shuffle,
    distance: distance,
    prepareChoice: prepareChoice,
    answerTokens: answerTokens,
    reorderTokens: reorderTokens,
    paradigmCells: paradigmCells,
    firstDifference: firstDifference,
    evaluate: evaluate,
    maxPoints: maxPoints,
    sessionScore: sessionScore,
    plural: plural,
    trTokens: trTokens,
    findSeq: findSeq,
    scoreTransformationParts: scoreTransformationParts,
    transformationLimit: transformationLimit,
    normalizeSentence: normalizeSentence,
    matchesSentence: matchesSentence,
    wordDiff: wordDiff,
    prepareMatch: prepareMatch,
    pickMix: pickMix,
    weightedOrder: weightedOrder,
    limitRuns: limitRuns
  };
})(window.LM);
