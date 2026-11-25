/*
 * tests.js — unit tests of the pure learning logic (js/learning.js):
 * review schedule, streak and the placement test algorithm,
 * the exercise engine (js/exercise-logic.js) on the fixture sets,
 * and the attempt log / stats / automatic reviews (js/learning-stats.js).
 * No dependencies: built-in Node modules (assert).
 *
 * Usage (from the project folder):
 *   node tools/tests.js
 */
"use strict";

const assert = require("assert");
const path = require("path");

global.window = global;
require(path.join(__dirname, "..", "js", "config.js")); // LM.APP first, as in index.html
require(path.join(__dirname, "..", "js", "lang.js"));
require(path.join(__dirname, "..", "js", "learning.js"));
require(path.join(__dirname, "..", "js", "exercise-logic.js"));
require(path.join(__dirname, "..", "js", "learning-stats.js"));
require(path.join(__dirname, "..", "js", "search-logic.js"));
require(path.join(__dirname, "..", "js", "exam-logic.js"));
require(path.join(__dirname, "..", "js", "final-logic.js"));
require(path.join(__dirname, "..", "js", "cards-logic.js"));
require(path.join(__dirname, "..", "js", "cards-schedule.js"));
require(path.join(__dirname, "..", "js", "trail-logic.js"));
const L = global.LM.learn;
const X = global.LM.exLogic;

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log("  ok  " + name); } catch (e) { failures.push(name); console.log("  FAIL " + name + "\n       " + e.message); }
}

// Replacing “today” (one function today())
function withToday(day, fn) {
  const original = L.today;
  L.today = function () { return day; };
  try { fn(); } finally { L.today = original; }
}

console.log("Dates");
test("today() returns the local day YYYY-MM-DD", function () {
  assert.match(L.today(), /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(L.isDay(L.today()));
});
test("today() can be replaced", function () {
  withToday("2030-01-02", function () { assert.strictEqual(L.today(), "2030-01-02"); });
});
test("addDays across the end of a month, a year and a leap day", function () {
  assert.strictEqual(L.addDays("2026-01-31", 1), "2026-02-01");
  assert.strictEqual(L.addDays("2026-12-31", 1), "2027-01-01");
  assert.strictEqual(L.addDays("2028-02-28", 1), "2028-02-29");
  assert.strictEqual(L.addDays("2026-03-01", -1), "2026-02-28");
});
test("addDays across a clock change (end of March and of October)", function () {
  assert.strictEqual(L.addDays("2026-03-28", 1), "2026-03-29");
  assert.strictEqual(L.addDays("2026-03-29", 1), "2026-03-30");
  assert.strictEqual(L.addDays("2026-10-24", 1), "2026-10-25");
  assert.strictEqual(L.addDays("2026-10-25", 1), "2026-10-26");
  assert.strictEqual(L.diffDays("2026-10-24", "2026-10-26"), 2);
});
test("isDay rejects bad dates", function () {
  ["2026-02-30", "2026-13-01", "tomorrow", "", null, "2026-1-1"].forEach(function (d) { assert.strictEqual(L.isDay(d), false, String(d)); });
});

console.log("Review schedule");
test("REVIEW_STEPS = [1, 3, 7]", function () {
  assert.deepStrictEqual(L.REVIEW_STEPS, [1, 3, 7]);
});
test("new entry: first review tomorrow", function () {
  assert.deepStrictEqual(L.newReview("2026-10-19"), { stage: 0, due: "2026-10-20", mastered: false });
});
test("not due on the day it was added, due the next day", function () {
  const r = L.newReview("2026-10-19");
  assert.strictEqual(L.isDue(r, "2026-10-19"), false);
  assert.strictEqual(L.isDue(r, "2026-10-20"), true);
});
test("overdue review = to do today (no penalty)", function () {
  const r = L.newReview("2026-10-01");
  assert.strictEqual(L.isDue(r, "2026-10-19"), true);
  // “I knew it” after being overdue: the next stage counts from today, not from the due date
  assert.deepStrictEqual(L.reviewKnown(r, "2026-10-19"), { stage: 1, due: "2026-10-22", mastered: false });
});
test("full path 1 → 3 → 7 → mastered", function () {
  let r = L.newReview("2026-10-19");                 // due 20
  r = L.reviewKnown(r, "2026-10-20");                // +3 → 23
  assert.deepStrictEqual(r, { stage: 1, due: "2026-10-23", mastered: false });
  r = L.reviewKnown(r, "2026-10-23");                // +7 → 30
  assert.deepStrictEqual(r, { stage: 2, due: "2026-10-30", mastered: false });
  r = L.reviewKnown(r, "2026-10-30");                // after the last stage
  assert.strictEqual(r.mastered, true);
  assert.strictEqual(L.isDue(r, "2027-01-01"), false);
});
test("“Wrong again” goes back to stage 1 (tomorrow)", function () {
  const r = { stage: 2, due: "2026-10-30", mastered: false };
  assert.deepStrictEqual(L.reviewAgain(r, "2026-10-30"), { stage: 0, due: "2026-10-31", mastered: false });
});
test("changing the step array changes the schedule", function () {
  const saved = L.REVIEW_STEPS.slice();
  L.REVIEW_STEPS.splice(0, L.REVIEW_STEPS.length, 2, 5);
  try {
    let r = L.newReview("2026-10-19");
    assert.strictEqual(r.due, "2026-10-21");
    r = L.reviewKnown(r, "2026-10-21");
    assert.strictEqual(r.due, "2026-10-26");
    assert.strictEqual(L.reviewKnown(r, "2026-10-26").mastered, true);
  } finally {
    L.REVIEW_STEPS.splice(0, L.REVIEW_STEPS.length, ...saved);
  }
});

console.log("Streak");
test("no activity → 0 / 0", function () {
  assert.deepStrictEqual(L.streak([], "2026-10-19"), { current: 0, longest: 0, activeToday: false });
});
test("activity today → streak 1", function () {
  assert.deepStrictEqual(L.streak(["2026-10-19"], "2026-10-19"), { current: 1, longest: 1, activeToday: true });
});
test("activity yesterday, none yet today → the streak is still alive", function () {
  const s = L.streak(["2026-10-16", "2026-10-17", "2026-10-18"], "2026-10-19");
  assert.strictEqual(s.current, 3);
  assert.strictEqual(s.activeToday, false);
});
test("a gap longer than a day → streak 0, the longest stays", function () {
  const s = L.streak(["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-17"], "2026-10-19");
  assert.strictEqual(s.current, 0);
  assert.strictEqual(s.longest, 3);
});
test("duplicates, order and bad entries do not break the count", function () {
  const s = L.streak(["2026-10-19", "bad", "2026-10-18", "2026-10-19", "2026-10-17", "2026-02-30"], "2026-10-19");
  assert.deepStrictEqual(s, { current: 3, longest: 3, activeToday: true });
});
test("streak across the end of a month", function () {
  const s = L.streak(["2026-09-29", "2026-09-30", "2026-10-01"], "2026-10-01");
  assert.strictEqual(s.current, 3);
});
test("days in the future are skipped", function () {
  assert.strictEqual(L.streak(["2026-10-25"], "2026-10-19").longest, 0);
});
test("the last 7 days: oldest first, up to today", function () {
  const w = L.lastDays(["2026-10-13", "2026-10-19", "2026-10-01"], "2026-10-19", 7);
  assert.strictEqual(w.length, 7);
  assert.deepStrictEqual(w[0], { day: "2026-10-13", active: true });
  assert.deepStrictEqual(w[6], { day: "2026-10-19", active: true });
  assert.strictEqual(w.filter(function (d) { return d.active; }).length, 2);
});

console.log("Placement test");
function bank(perLevel) {
  const out = [];
  L.LEVELS.forEach(function (lvl) {
    for (let i = 0; i < perLevel; i++) out.push({ id: lvl + "-" + i, level: lvl });
  });
  return out;
}
test("start A2, correct → up, wrong → down, limits A1/C2", function () {
  assert.strictEqual(L.LEVELS[L.nextLevelIndex(L.LEVELS.indexOf("A2"), true)], "B1");
  assert.strictEqual(L.LEVELS[L.nextLevelIndex(L.LEVELS.indexOf("A2"), false)], "A1");
  assert.strictEqual(L.nextLevelIndex(0, false), 0);
  assert.strictEqual(L.nextLevelIndex(5, true), 5);
  assert.strictEqual(L.START_LEVEL, "A2");
  assert.strictEqual(L.TEST_LENGTH, 12);
});
test("drawing without repeats from the level pool", function () {
  const q = bank(3);
  const used = new Set();
  for (let i = 0; i < 3; i++) {
    const p = L.pickQuestion(q, 2, used, Math.random);
    assert.strictEqual(p.level, "B1");
    assert.ok(!used.has(p.id));
    used.add(p.id);
  }
});
test("pool used up → neighbouring level (direction of movement on a tie)", function () {
  const q = bank(1);
  const used = new Set(["B1-0"]);
  assert.strictEqual(L.pickQuestion(q, 2, used, function () { return 0; }, true).level, "B2");
  assert.strictEqual(L.pickQuestion(q, 2, used, function () { return 0; }, false).level, "A2");
  used.add("B2-0"); used.add("A2-0");
  assert.ok(["A1", "C1"].indexOf(L.pickQuestion(q, 2, used, function () { return 0; }, true).level) !== -1);
});
test("no questions → null", function () {
  const q = bank(1);
  assert.strictEqual(L.pickQuestion(q, 0, new Set(q.map(function (x) { return x.id; }))), null);
});
/** Pool with skill: per level 5 grammar, 3 vocabulary, 2 reading (id: <level>-<skill>-<n>). */
function skillBank() {
  const out = [];
  L.LEVELS.forEach(function (lvl) {
    [["grammar", 5], ["vocabulary", 3], ["reading", 2]].forEach(function (s) {
      for (let i = 0; i < s[1]; i++) out.push({ id: lvl + "-" + s[0] + "-" + i, level: lvl, skill: s[0] });
    });
  });
  return out;
}
test("pickQuestion without opts works as before (the same results for the same draw)", function () {
  const q = skillBank();
  for (let s = 1; s < 20; s++) {
    const a = L.pickQuestion(q, 2, new Set(), seeded(s), true);
    const b = L.pickQuestion(q, 2, new Set(), seeded(s), true, undefined);
    assert.strictEqual(a.id, b.id);
  }
});
test("pickQuestion: avoids questions from the previous attempt when the pool allows it", function () {
  const q = skillBank();
  const b1 = q.filter(function (x) { return x.level === "B1"; }).map(function (x) { return x.id; });
  const avoid = b1.slice(0, 8);
  for (let s = 1; s < 50; s++) {
    const p = L.pickQuestion(q, 2, new Set(), seeded(s), false, { avoidIds: avoid });
    assert.ok(avoid.indexOf(p.id) === -1, p.id);
  }
  // all from the level were in the previous attempt → still takes one from the level (does not escape to another)
  const p = L.pickQuestion(q, 2, new Set(), seeded(3), false, { avoidIds: b1 });
  assert.strictEqual(p.level, "B1");
});
test("pickQuestion: balances skills — the rarest in the attempt, a tie at random", function () {
  const q = skillBank();
  for (let s = 1; s < 50; s++) {
    assert.strictEqual(L.pickQuestion(q, 1, new Set(), seeded(s), false, { skillCounts: { grammar: 2, vocabulary: 1, reading: 0 } }).skill, "reading");
    assert.notStrictEqual(L.pickQuestion(q, 1, new Set(), seeded(s), false, { skillCounts: { grammar: 1, vocabulary: 1, reading: 1 } }).skill, undefined);
  }
  const seen = new Set();
  for (let s = 1; s < 60; s++) seen.add(L.pickQuestion(q, 1, new Set(), seeded(s * 104729), false, { skillCounts: { grammar: 1, vocabulary: 0, reading: 0 } }).skill);
  assert.deepStrictEqual(Array.from(seen).sort(), ["reading", "vocabulary"]);
  // a skill missing in the level pool (reading used up) → the rarest of the available ones
  const used = new Set(["A2-reading-0", "A2-reading-1"]);
  assert.strictEqual(L.pickQuestion(q, 1, used, seeded(2), false, { skillCounts: { grammar: 3, vocabulary: 1, reading: 0 } }).skill, "vocabulary");
  // a question without skill = grammar
  assert.strictEqual(L.pickQuestion([{ id: "x", level: "A1" }], 0, new Set(), seeded(1), false, { skillCounts: { grammar: 5 } }).id, "x");
});
test("simulation of 12 questions with opts: every skill appears, the next attempt has other questions", function () {
  const q = skillBank();
  function run(avoid, seed) {
    const rnd = seeded(seed);
    const used = new Set(); const counts = {}; const ids = [];
    let idx = 1;
    for (let i = 0; i < L.TEST_LENGTH; i++) {
      const p = L.pickQuestion(q, idx, used, rnd, i % 2 === 0, { avoidIds: avoid, skillCounts: counts });
      used.add(p.id); ids.push(p.id); counts[L.skillOf(p)] = (counts[L.skillOf(p)] || 0) + 1;
      idx = L.nextLevelIndex(idx, i % 2 === 0);
    }
    return { ids: ids, counts: counts };
  }
  const first = run([], 11);
  assert.ok(first.counts.grammar >= 1 && first.counts.vocabulary >= 1 && first.counts.reading >= 1, JSON.stringify(first.counts));
  assert.ok(Math.max(first.counts.grammar, first.counts.vocabulary, first.counts.reading) - Math.min(first.counts.grammar, first.counts.vocabulary, first.counts.reading) <= 1);
  // The second attempt repeats a question only when a level ran out of new ones (10 questions per level)
  const second = run(first.ids, 12);
  L.LEVELS.forEach(function (lvl) {
    const at = function (ids) { return ids.filter(function (id) { return id.indexOf(lvl + "-") === 0; }); };
    const fresh = 10 - at(first.ids).length;
    const repeated = at(second.ids).filter(function (id) { return first.ids.indexOf(id) !== -1; }).length;
    assert.strictEqual(repeated, Math.max(0, at(second.ids).length - fresh), lvl);
  });
});
test("result = average of the last 6 levels, rounded down", function () {
  // A2 B1 B2 C1 B2 B1 | B2 C1 B2 C1 C2 C1 → last 6: 3,4,3,4,5,4 = 23/6 = 3.83 → B2
  const asked = [1, 2, 3, 4, 3, 2, 3, 4, 3, 4, 5, 4];
  assert.strictEqual(L.LEVELS[L.resultLevelIndex(asked)], "B2");
  assert.strictEqual(L.resultLevelIndex([0, 0, 0, 0, 0, 1]), 0);
  assert.strictEqual(L.resultLevelIndex([5, 5, 5, 5, 5, 5]), 5);
  assert.strictEqual(L.resultLevelIndex([1, 2]), 1); // fewer than 6 questions: the average of those there are
});
function simulate(answerCorrect, perLevel) {
    const q = bank(perLevel);
    const used = new Set();
    let idx = L.LEVELS.indexOf(L.START_LEVEL);
    const asked = [];
    let prevCorrect = null;
    for (let i = 0; i < L.TEST_LENGTH; i++) {
      const p = L.pickQuestion(q, idx, used, Math.random, !!prevCorrect);
      used.add(p.id);
      // As in js/placement.js: the target level counts (idx), not the level
      // of the drawn question (different only when the level pool is empty)
      asked.push(idx);
      prevCorrect = answerCorrect;
      idx = L.nextLevelIndex(idx, answerCorrect);
    }
    return L.LEVELS[L.resultLevelIndex(asked)];
}
test("simulation (big pool): all correct → C2, all wrong → A1", function () {
  assert.strictEqual(simulate(true, 12), "C2");
  assert.strictEqual(simulate(false, 12), "A1");
});
test("simulation (small pool, 2 questions per level): the result does not “drift”", function () {
  // 12 questions in the pool = exactly as many as the test lasts. When a level pool
  // runs out, questions come from neighbouring levels, but the target level
  // (and the result) stays — the test always gets to the end.
  for (let i = 0; i < 50; i++) {
    assert.strictEqual(simulate(true, 2), "C2");
    assert.strictEqual(simulate(false, 2), "A1");
  }
});

console.log("\nExercise engine");
const fs = require("fs");
// Polish fixtures of the language layer (spec 05 §6): tools/fixtures/lang/
const LANG_FX = path.join(__dirname, "fixtures", "lang");
function langFixture(name) { return JSON.parse(fs.readFileSync(path.join(LANG_FX, name + ".json"), "utf8")); }
const PL_ITEMS = langFixture("items").items;
const LANG_ACCENTED = langFixture("match").cases.find(function (c) { return c.near === "accents"; }).closest;
function plItem(id) { return PL_ITEMS.find(function (it) { return it.id === id; }); }
// Test-only English fixtures from english-levels-map@275be9f (tools/fixtures/legacy-en); replaced by Polish fixtures in stages 3–4
const LEGACY = path.join(__dirname, "fixtures", "legacy-en");
const SETS_DIR = path.join(LEGACY, "sets");
const exBank = fs.readdirSync(SETS_DIR).filter(function (f) { return /\.json$/.test(f); })
  .map(function (f) { return JSON.parse(fs.readFileSync(path.join(SETS_DIR, f), "utf8")); });
const allItems = [].concat.apply([], exBank.map(function (s) { return s.items.map(function (it) { return Object.assign({ topic: s.topic }, it); }); }));
function seeded(seed) { let x = seed; return function () { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }

test("normalize: spaces, apostrophes, final punctuation, case; diacritics kept (LM.lang.normalizeAnswer)", function () {
  langFixture("lang").normalizeAnswer.forEach(function (c) { assert.strictEqual(X.normalize(c[0]), c[1], c[0]); });
  assert.strictEqual(X.normalize("Really?!"), "really");
  assert.notStrictEqual(X.normalize(LANG_ACCENTED), X.normalize(global.LM.lang.stripMarks(LANG_ACCENTED)));
});
test("prepareChoice: the correct answer and the notes follow the option after shuffling", function () {
  const item = allItems.find(function (it) { return it.type === "multiple-choice" && it.optionNotes; });
  for (let s = 1; s < 30; s++) {
    const p = X.prepareChoice(item, seeded(s));
    assert.strictEqual(p.options[p.correct].original, item.correct);
    assert.strictEqual(p.options[p.correct].note, null);
    p.options.forEach(function (o) { assert.strictEqual(o.text, item.options[o.original]); });
  }
  const fixed = X.prepareChoice(Object.assign({}, item, { fixedOrder: true }), seeded(3));
  assert.deepStrictEqual(fixed.options.map(function (o) { return o.original; }), item.options.map(function (_, i) { return i; }));
});
test("reorderTokens: never in the correct order at once, the same set of words", function () {
  allItems.filter(function (it) { return it.type === "reorder"; }).forEach(function (it) {
    for (let s = 1; s < 40; s++) {
      const t = X.reorderTokens(it, seeded(s)).map(function (x) { return x.text; });
      assert.ok(!X.evaluate(it, { words: t }).correct, it.id + " given in the correct order");
      assert.deepStrictEqual(t.slice().sort(), X.answerTokens(it.answers[0], it).concat(it.extraTokens || []).sort());
    }
  });
});
test("evaluate: the model answer of every item of the fixture sets is correct", function () {
  assert.ok(allItems.length >= 60);
  allItems.forEach(function (it) {
    const r = X.evaluate(it, modelAnswerOf(it));
    assert.ok(r.correct && r.points === r.max && r.max === X.maxPoints(it), it.id);
  });
});
test("evaluate: find-error tells a wrong part from a wrong correction", function () {
  const it = { type: "find-error", tokens: ["I", "buyed", "a", "bike."], errorRange: [1, 1], fixes: ["bought"] };
  assert.strictEqual(X.evaluate(it, { range: [2, 2], fix: "bought" }).rangeOk, false);
  const r = X.evaluate(it, { range: [1, 1], fix: "buy" });
  assert.ok(r.rangeOk && !r.fixOk && !r.correct);
  assert.ok(!X.evaluate(it, { noError: true }).correct);
  assert.ok(X.evaluate({ type: "find-error", tokens: ["Ok."], noError: true }, { noError: true }).correct);
});
test("evaluate: short-answer — case does not matter; accents / ending / typo = 0 points with a hint; lenient accents", function () {
  const it = plItem("pl-fx-01");
  const model = it.accepted[0];
  assert.ok(X.evaluate(it, { text: " " + model.toUpperCase() + " " }).correct);
  const accents = X.evaluate(it, { text: global.LM.lang.stripMarks(model) });
  assert.deepStrictEqual([accents.correct, accents.near, accents.closest, accents.points], [false, "accents", model, 0]);
  const lenient = X.evaluate(it, { text: global.LM.lang.stripMarks(model) }, { lenientAccents: true });
  assert.deepStrictEqual([lenient.correct, lenient.lenient, lenient.near, lenient.points], [true, true, "accents", 1], "counted, the reminder stays");
  assert.strictEqual(X.evaluate(it, { text: model }, { lenientAccents: true }).lenient, false, "an exact answer is not lenient");
  const ending = X.evaluate(it, { text: model.slice(0, -1) + "y" }, { lenientAccents: true });
  assert.deepStrictEqual([ending.correct, ending.near], [false, "ending"], "lenient mode does not accept other near misses");
});
test("reorder: pointing at the first difference", function () {
  const it = { type: "reorder", answers: ["I didn't go to school yesterday."] };
  assert.strictEqual(X.firstDifference(it, ["i", "didn't", "to", "go", "school", "yesterday"]), 2);
});
/** An answer to an old-type item: correct or wrong (for the points regression test). */
function oldTypeAnswer(it, ok) {
  if (it.type === "multiple-choice") return { chosen: ok ? it.correct : (it.correct + 1) % it.options.length };
  if (it.type === "reorder") return { words: ok ? X.answerTokens(it.answers[0], it) : X.answerTokens(it.answers[0], it).reverse() };
  if (it.type === "find-error") return ok ? (it.noError ? { noError: true } : { range: it.errorRange.slice(), fix: it.fixes[0] }) : (it.noError ? { range: [0, 0], fix: "x" } : { noError: true });
  return { text: ok ? it.accepted[0] : "zzz" };
}
test("points: the score of every set of old types equals the number of correct items", function () {
  const OLD = ["multiple-choice", "reorder", "find-error", "short-answer"];
  // Topic sets of the legacy fixtures (the original exam sets are not copied)
  const sets = exBank.filter(function (s) { return s.items.every(function (it) { return OLD.indexOf(it.type) !== -1; }); });
  assert.ok(sets.length >= 5, "too few sets: " + sets.length);
  sets.forEach(function (s) {
    for (let seed = 1; seed <= 12; seed++) {
      const rng = seeded(seed);
      const results = s.items.map(function (it) {
        const ok = seed === 1 ? true : seed === 2 ? false : rng() < 0.5;
        return { item: it, res: X.evaluate(it, oldTypeAnswer(it, ok)) };
      });
      // The score so far: number of correct items / number of items
      const before = { score: results.filter(function (r) { return r.res.correct; }).length, total: s.items.length };
      assert.deepStrictEqual(X.sessionScore(results), before, s.id + " (seed " + seed + ")");
      results.forEach(function (r) {
        assert.strictEqual(X.maxPoints(r.item), 1);
        assert.strictEqual(r.res.max, 1);
        assert.strictEqual(r.res.points, r.res.correct ? 1 : 0, r.item.id);
      });
    }
  });
});
test("points: sessionScore sums points and maxima, skips items with max = 0", function () {
  const r = X.sessionScore([
    { item: { type: "short-answer" }, res: { correct: true, points: 1, max: 1 } },
    { item: { type: "x" }, res: { correct: false, points: 1, max: 2 } },
    { item: { type: "x" }, res: { correct: false, points: 0, max: 0, skipped: true } },
    { item: { type: "multiple-choice" }, res: null }
  ]);
  assert.deepStrictEqual(r, { score: 2, total: 4 });
});
// Part 4 grading before it moved into exercise-logic.js (a copy from js/c1-exercises.js) — the reference for the compatibility test
const OLD_PART4 = (function () {
  function norm(text) { return String(text || "").toUpperCase().replace(/[’‘`´]/g, "'").replace(/[^\p{L}\p{N}'\s]/gu, "").replace(/\s+/g, " ").trim(); }
  // Stage 3: the English contraction rule (a contraction = two words) is deleted from the engine, so from this copy too
  function tokens(text) { return norm(text).split(" ").filter(Boolean); }
  function findSeq(hay, needle, from) { const hits = []; if (!needle.length) return hits; for (let i = from || 0; i + needle.length <= hay.length; i++) { let ok = true; for (let j = 0; j < needle.length; j++) { if (hay[i + j] !== needle[j]) { ok = false; break; } } if (ok) hits.push(i); } return hits; }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function itemMax(item) { return item.parts.length === 1 ? 2 : item.parts.length; }
  return function (item, answer, limit) {
    const lim = Array.isArray(limit) ? limit : [3, 6];
    const t = tokens(answer);
    const parts = item.parts.map(function () { return false; });
    if (!t.length) return { score: 0, parts: parts, msg: "No answer." };
    if (t.length < lim[0] || t.length > lim[1]) return { score: 0, parts: parts, msg: "Type " + lim[0] + "–" + lim[1] + " words (you have " + plural(t.length, "word", "words") + ")." };
    if (!findSeq(t, tokens(item.keyword), 0).length) return { score: 0, parts: parts, msg: "Use the key word without changing it (" + item.keyword + ")." };
    let cursor = 0;
    item.parts.forEach(function (variants, k) {
      let bestEnd = -1;
      variants.forEach(function (variant) { const v = tokens(variant); const starts = findSeq(t, v, cursor); if (starts.length) { const end = starts[0] + v.length; if (bestEnd === -1 || end < bestEnd) bestEnd = end; } });
      if (bestEnd !== -1) { parts[k] = true; cursor = bestEnd; }
    });
    return { score: parts.filter(Boolean).length * (itemMax(item) / item.parts.length), parts: parts, msg: null };
  };
})();
test("transformations: the shared grading = the old C1/B2 Part 4 grading on all real items", function () {
  const dir = path.join(LEGACY, "transformation");
  const sets = fs.readdirSync(dir).filter(function (f) { return /\.json$/.test(f); }).map(function (f) {
    return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8").replace(/^﻿/, ""));
  });
  assert.ok(sets.length >= 10, "too few Part 4 sets: " + sets.length);
  let checked = 0;
  sets.forEach(function (s) {
    const lim = Array.isArray(s.wordLimit) ? s.wordLimit : undefined;
    s.items.forEach(function (it) {
      const first = it.parts.map(function (p) { return p[0]; }).join(" ");
      const answers = [
        it.model, it.model.toLowerCase(), first, "", "   ",
        it.model + " and so on now", it.model.split(" ").slice(0, 2).join(" "),
        it.model.split(" ").filter(function (w) { return w.toUpperCase() !== it.keyword.toUpperCase(); }).concat("xx").join(" "),
        it.model.replace(new RegExp("\\b" + it.keyword + "\\b", "i"), it.keyword + "S"),
        it.parts[0][0] + " xx yy", "xx " + it.parts[it.parts.length - 1][0], it.parts[it.parts.length - 1][0] + " " + it.parts[0][0],
        it.model.replace(/n't/i, " not").replace(/'s\b/i, " is"), it.model + ".", "“" + it.model + "”"
      ];
      it.parts.forEach(function (p) { p.forEach(function (v) { answers.push(v + " " + it.keyword); answers.push(it.keyword + " " + v); }); });
      answers.forEach(function (a) {
        assert.deepStrictEqual(X.scoreTransformationParts(it, a, lim), OLD_PART4(it, a, lim), s.id + " #" + it.n + ": “" + a + "”");
        checked++;
      });
      assert.strictEqual(X.scoreTransformationParts(it, it.model, lim).score, 2, s.id + " #" + it.n + " model < 2 points");
    });
  });
  assert.ok(checked > 500);
});
// ---------- New item types (pack v6, spec 12) ----------
const PILOT = JSON.parse(fs.readFileSync(path.join(LEGACY, "pilot-new-types.json"), "utf8")).items;
function pilot(id) { return PILOT.find(function (it) { return it.id === id; }); }
/** The model answer of an item (every type) in the evaluate format. */
function modelAnswerOf(it) {
  if (it.type === "multiple-choice") return { chosen: it.correct };
  if (it.type === "reorder") return { words: X.answerTokens(it.answers[0], it) };
  if (it.type === "find-error") return it.noError ? { noError: true } : { range: it.errorRange.slice(), fix: it.fixes[0] };
  if (it.type === "gap-fill") return { texts: it.gaps.map(function (g) { return g.accepted[0]; }) };
  if (it.type === "match") { const p = {}; it.pairs.forEach(function (x, i) { p[i] = x[1]; }); return { pairs: p }; }
  if (it.type === "transformation") return { text: it.answers[0] };
  if (it.type === "dictation") return { text: it.text };
  if (it.type === "paradigm") return { texts: it.cells.map(function (c) { return c.given ? "" : c.accepted[0]; }) };
  return { text: it.accepted[0] };
}

test("maxPoints: gaps and pairs a point each, transformation with parts 2, the rest 1", function () {
  assert.strictEqual(X.maxPoints(pilot("v6-pilot-01")), 2);
  assert.strictEqual(X.maxPoints(pilot("v6-pilot-03")), 4);
  assert.strictEqual(X.maxPoints(pilot("v6-pilot-05")), 1);
  assert.strictEqual(X.maxPoints(pilot("v6-pilot-06")), 2);
  assert.strictEqual(X.maxPoints(pilot("v6-pilot-07")), 1);
  assert.strictEqual(X.maxPoints(pilot("v6-pilot-09")), 1);
});
test("new types: the model answer of every item in the sample file gives full points", function () {
  PILOT.forEach(function (it) {
    const r = X.evaluate(it, modelAnswerOf(it));
    assert.ok(r.correct && r.points === X.maxPoints(it) && r.max === X.maxPoints(it), it.id + " " + JSON.stringify(r));
  });
});
test("gap-fill: a point for each gap, near misses = 0 points with a hint per gap, case does not matter", function () {
  const it = plItem("pl-fx-02");
  const a = it.gaps[0].accepted[0], b = it.gaps[1].accepted[0];
  const half = X.evaluate(it, { texts: [a.toUpperCase(), "zzz"] });
  assert.deepStrictEqual([half.points, half.max, half.correct], [1, 2, false]);
  assert.deepStrictEqual(half.gaps.map(function (g) { return g.correct; }), [true, false]);
  const near = X.evaluate(it, { texts: [a, global.LM.lang.stripMarks(b)] });
  assert.deepStrictEqual([near.gaps[1].near, near.gaps[1].closest, near.points], ["accents", b, 1]);
  const lenient = X.evaluate(it, { texts: [a, global.LM.lang.stripMarks(b)] }, { lenientAccents: true });
  assert.deepStrictEqual([lenient.points, lenient.correct, lenient.lenient], [2, true, true]);
  assert.ok(!X.evaluate(it, { texts: ["", " "] }).answered);
});
test("match: a point for each pair, extraRight is never correct", function () {
  const it = pilot("v6-pilot-03");
  const r = X.evaluate(it, { pairs: { 0: it.pairs[0][1], 1: it.pairs[2][1], 2: it.pairs[1][1], 3: it.extraRight[0] } });
  assert.deepStrictEqual([r.points, r.max, r.correct], [1, 4, false]);
  assert.deepStrictEqual(r.pairs, [true, false, false, false]);
  assert.ok(!X.evaluate(it, { pairs: {} }).answered);
});
test("prepareMatch: the right column is always shuffled, with extraRight, nothing lost", function () {
  PILOT.filter(function (it) { return it.type === "match"; }).forEach(function (it) {
    for (let s = 1; s < 60; s++) {
      const right = X.prepareMatch(it, seeded(s));
      assert.ok(!it.pairs.every(function (p, i) { return right[i].text === p[1]; }), it.id + " in the correct order");
      assert.deepStrictEqual(right.map(function (r) { return r.text; }).sort(), it.pairs.map(function (p) { return p[1]; }).concat(it.extraRight || []).sort());
    }
  });
});
test("transformation: answers, word limit (LM.lang.countWords), key word; with parts — partial points", function () {
  const it = pilot("v6-pilot-05");
  assert.ok(X.evaluate(it, { text: "that I saw Tom was" }).correct);
  assert.ok(X.evaluate(it, { text: "i SAW tom was" }).correct);
  const long = X.evaluate(it, { text: "I saw Tom for the first time was" });
  assert.ok(!long.correct && /2–5 words \(you have 8 words\)/.test(long.msg), long.msg);
  const kw = X.evaluate(it, { text: "I seen Tom was" });
  assert.ok(!kw.correct && /key word without changing it \(SAW\)/.test(kw.msg));
  assert.strictEqual(X.evaluate(it, { text: "I saw him was" }).points, 0);
  const p = pilot("v6-pilot-06");
  const one = X.evaluate(p, { text: "is said to being" });
  assert.deepStrictEqual([one.points, one.max, one.correct], [1, 2, false]);
  assert.deepStrictEqual(one.parts, [true, false]);
  assert.strictEqual(X.evaluate(p, { text: "is said to be" }).points, 2);
  // Polish: no contraction rule, an apostrophe word is one word; accents give a hint
  const pl = plItem("pl-fx-04");
  assert.ok(X.evaluate(pl, { text: pl.answers[0] }).correct);
  assert.strictEqual(X.trTokens("didn't go").length, 2, "a contraction is one word now");
  const tooLong = X.evaluate(pl, { text: "ma już dwadzieścia lat" }); // pl-fixture
  assert.ok(/2–3 words \(you have 4 words\)/.test(tooLong.msg), tooLong.msg);
  const acc = X.evaluate(pl, { text: global.LM.lang.stripMarks(pl.answers[0]) });
  assert.deepStrictEqual([acc.correct, acc.near], [false, "accents"]);
  assert.ok(X.evaluate(pl, { text: global.LM.lang.stripMarks(pl.answers[0]) }, { lenientAccents: true }).correct);
});
test("normalizeSentence: the language's punctuation („ ” « » dashes) removed, diacritics kept, no contraction rule", function () { // pl-fixture
  langFixture("lang").normalizeSentence.forEach(function (c) {
    assert.strictEqual(X.normalizeSentence(c[0]), c[1], c[0]);
    assert.strictEqual(global.LM.lang.normalizeSentence(c[0]), c[1], c[0]);
  });
  assert.strictEqual(X.normalizeSentence("I don’t know, really."), "i don't know really", "English contractions are not expanded any more");
  assert.strictEqual(X.normalizeSentence("  Hello ,  world  "), "hello world");
  assert.strictEqual(X.sentenceVariants, undefined, "the English 's / 'd readings are deleted");
});
test("translate: a match after normalization, every accepted order, hints near: accents / typo, lenient accents", function () {
  const it = plItem("pl-fx-03");
  assert.ok(X.evaluate(it, { text: it.accepted[0].toLowerCase().replace(/[.]/g, "") }).correct);
  assert.ok(X.evaluate(it, { text: it.accepted[1] }).correct, "the second order");
  const acc = X.evaluate(it, { text: global.LM.lang.stripMarks(it.accepted[1]) });
  assert.deepStrictEqual([acc.correct, acc.near, acc.closest, acc.closestText], [false, "accents", 1, it.accepted[1]]);
  assert.ok(X.evaluate(it, { text: global.LM.lang.stripMarks(it.accepted[0]) }, { lenientAccents: true }).lenient);
  assert.ok(!X.evaluate({ type: "translate", accepted: ["x"] }, { text: "" }).answered);
});
test("word-by-word comparison: missing, extra, replaced (6-word Polish sentence); the closest variant; a typo", function () {
  const D = langFixture("items").diff;
  assert.strictEqual(D.model.length, 6);
  assert.deepStrictEqual(X.wordDiff(D.model, D.got).ops.filter(function (o) { return o.op !== "same"; }), D.ops);
  const r = X.wordDiff(["mam", "brata"], ["mam", "brat"]);
  assert.deepStrictEqual(r.ops[1], { op: "replace", word: "brata", got: "brat" });
  const it = plItem("pl-fx-03");
  const miss = X.evaluate(it, { text: "Mam brata." });
  assert.ok(!miss.near && miss.closest === 0 && miss.diff.some(function (o) { return o.op === "missing"; }), JSON.stringify(miss));
  const second = X.evaluate(it, { text: "Mam siostrę i." }); // pl-fixture
  assert.strictEqual(second.closest, 1, "the closest accepted order");
});
test("dictation: text and variants from accepted; skipped (no voice) — 0 of 0, does not count", function () {
  const it = pilot("v6-pilot-10");
  assert.ok(X.evaluate(it, { text: "I have never eaten anything so spicy in my life" }).correct);
  assert.ok(X.evaluate(it, { text: "ive never eaten anything so spicy in my life" }).correct === false);
  const s = X.evaluate(it, { skipped: true });
  assert.deepStrictEqual([s.points, s.max, s.skipped, s.correct], [0, 0, true, false]);
  assert.deepStrictEqual(X.sessionScore([{ item: it, res: s }, { item: pilot("v6-pilot-03"), res: X.evaluate(pilot("v6-pilot-03"), modelAnswerOf(pilot("v6-pilot-03"))) }]), { score: 4, total: 4 });
});
test("pickMix: evenly over topics, no repeats, limit, type filter, ≤ 2 of the same type in a row", function () {
  for (let s = 1; s < 30; s++) {
    const m = X.pickMix(allItems, { count: 15 }, seeded(s));
    assert.strictEqual(m.items.length, 15);
    assert.strictEqual(new Set(m.items.map(function (x) { return x.id; })).size, 15);
    const per = {};
    m.items.forEach(function (x) { per[x.topic] = (per[x.topic] || 0) + 1; });
    const counts = Object.keys(per).map(function (k) { return per[k]; });
    assert.ok(Math.max.apply(null, counts) - Math.min.apply(null, counts) <= 1, "uneven: " + JSON.stringify(per));
    for (let i = 2; i < m.items.length; i++) {
      const same = m.items[i].type === m.items[i - 1].type && m.items[i].type === m.items[i - 2].type;
      if (same) assert.ok(m.items.slice(i + 1).every(function (x) { return x.type === m.items[i].type; }), "3 in a row");
    }
  }
  const fe = X.pickMix(allItems, { count: 50, types: ["find-error"] }, seeded(5));
  assert.ok(fe.items.every(function (x) { return x.type === "find-error"; }));
  assert.strictEqual(fe.items.length, fe.available);
});
test("pickMix: excludes items of the last session when the pool is big enough", function () {
  const first = X.pickMix(allItems, { count: 10 }, seeded(7));
  const ids = first.items.map(function (x) { return x.id; });
  const second = X.pickMix(allItems, { count: 10, exclude: ids }, seeded(8));
  assert.ok(second.items.every(function (x) { return ids.indexOf(x.id) === -1; }));
});

console.log("\nLevel final tests (pack v6, spec 13 section 2)");
const F = global.LM.finalLogic;
/** A pool of 30 items like A1: verbs 4, grammar 14, functions 8, vocabulary 4 (2 topics per category, some items worth several points). */
function finalPool() {
  const plan = [["verbs", 6], ["grammar", 14], ["functions", 8], ["vocabulary", 2]];
  const out = [];
  plan.forEach(function (p) {
    for (let i = 0; i < p[1]; i++) {
      const multi = i % 5 === 4;
      out.push(multi
        ? { id: p[0] + "-" + i, type: "gap-fill", topic: p[0] + "-t" + (i % 4), text: "{{1}} {{2}} {{3}}", gaps: [{ accepted: ["a"] }, { accepted: ["b"] }, { accepted: ["c"] }] }
        : { id: p[0] + "-" + i, type: i % 2 ? "short-answer" : "multiple-choice", topic: p[0] + "-t" + (i % 4), prompt: "x ___", accepted: ["a"], options: ["a", "b"], correct: 0 });
    }
  });
  return out;
}
const catOf = function (it) { return it.id.split("-")[0]; };
test("isPassed: the pass mark in points (16/20 at 80%), limits and empty", function () {
  assert.ok(F.isPassed(16, 20, 80) && !F.isPassed(15, 20, 80));
  assert.ok(F.isPassed(24, 29, 80) && !F.isPassed(23, 29, 80)); // with items worth several points total ≠ 20
  assert.ok(F.isPassed(20, 20, 100) && !F.isPassed(0, 0, 80));
});
test("allocate: proportional, sum = draw, every category ≥ 1, not more than in the pool", function () {
  const main = F.allocate({ a: 6, b: 14, c: 8, d: 2 }, 20); // kwoty: 4; 9,33; 5,33; 1,33
  assert.strictEqual(main.a + main.b + main.c + main.d, 20);
  assert.ok(main.a === 4 && main.c === 5 && main.b >= 9 && main.b <= 10 && main.d >= 1 && main.d <= 2);
  assert.deepStrictEqual(F.allocate({ a: 3, b: 3 }, 20), { a: 3, b: 3 }); // not more than in the pool
  const a = F.allocate({ a: 1, b: 20, c: 9 }, 20);
  assert.strictEqual(a.a + a.b + a.c, 20);
  assert.ok(a.a === 1 && a.b <= 20 && a.c >= 1);
  const small = F.allocate({ a: 2, b: 2, c: 26 }, 20);
  assert.strictEqual(small.a + small.b + small.c, 20);
  assert.ok(small.a >= 1 && small.b >= 1 && small.a <= 2 && small.b <= 2);
});
test("drawItems: 20 of 30, no duplicates, every category represented proportionally (±1)", function () {
  const pool = finalPool();
  const counts = {};
  pool.forEach(function (it) { counts[catOf(it)] = (counts[catOf(it)] || 0) + 1; });
  for (let s = 1; s < 60; s++) {
    const d = F.drawItems(pool, 20, catOf, seeded(s));
    assert.strictEqual(d.length, 20);
    assert.strictEqual(new Set(d.map(function (x) { return x.id; })).size, 20);
    const got = {};
    d.forEach(function (it) { got[catOf(it)] = (got[catOf(it)] || 0) + 1; });
    Object.keys(counts).forEach(function (c) {
      assert.ok(got[c] >= 1, "missing category " + c);
      assert.ok(Math.abs(got[c] - 20 * counts[c] / 30) <= 1, c + ": " + got[c] + " instead of about " + (20 * counts[c] / 30).toFixed(1));
    });
    // an item worth several points is one item of the 20, not several
    assert.ok(d.every(function (it) { return pool.indexOf(it) !== -1; }));
  }
});
test("drawItems: different draws give different sets; a type does not repeat more than 2 times in a row; different topics in a category", function () {
  const pool = finalPool();
  const a = F.drawItems(pool, 20, catOf, seeded(1)).map(function (x) { return x.id; }).join();
  const b = F.drawItems(pool, 20, catOf, seeded(2)).map(function (x) { return x.id; }).join();
  assert.notStrictEqual(a, b);
  for (let s = 1; s < 40; s++) {
    const d = F.drawItems(pool, 20, catOf, seeded(s));
    const bad = d.some(function (it, i) { return i >= 2 && d[i - 1].type === it.type && d[i - 2].type === it.type; });
    // limitRuns works “when possible”: in this pool (3 types) it is always possible
    assert.ok(!bad, "3 in a row (seed " + s + ")");
    const gr = d.filter(function (it) { return catOf(it) === "grammar"; });
    assert.strictEqual(new Set(gr.map(function (it) { return it.topic; })).size, 4); // 9 items from 4 topics → all 4 topics
  }
});
test("drawItems: a pool not bigger than draw → all items", function () {
  const pool = finalPool().slice(0, 12);
  assert.strictEqual(F.drawItems(pool, 20, catOf, seeded(5)).length, 12);
});
test("breakdown: points by category, topics that lost points, skipped ones do not count", function () {
  const pool = finalPool();
  const results = pool.slice(0, 8).map(function (it, i) {
    return { item: it, res: X.evaluate(it, it.type === "gap-fill" ? { texts: i % 2 ? ["a", "x", "x"] : ["a", "b", "c"] } : it.type === "multiple-choice" ? { chosen: i % 2 ? 1 : 0 } : { text: i % 2 ? "zzz" : "a" }) };
  });
  results.push({ item: { id: "dictation-1", type: "dictation", topic: "t-x" }, res: { correct: false, points: 0, max: 0, skipped: true } });
  const b = F.breakdown(results, catOf);
  const total = b.categories.reduce(function (s, c) { return s + c.total; }, 0);
  assert.strictEqual(total, results.slice(0, 8).reduce(function (s, r) { return s + r.res.max; }, 0));
  assert.ok(b.categories.every(function (c) { return c.score <= c.total; }));
  assert.ok(b.topics.every(function (t) { return t.lost > 0 && t.topic !== "t-x"; }));
  for (let i = 1; i < b.topics.length; i++) assert.ok(b.topics[i - 1].lost >= b.topics[i].lost);
  assert.deepStrictEqual(F.breakdown([], catOf), { categories: [], topics: [] });
});

// ---------- Real final test pools (fixtures) ----------
// Legacy fixture: the A1 pool of the original app and its topic categories (tools/fixtures/legacy-en/finals)
const LV_CATS = JSON.parse(fs.readFileSync(path.join(LEGACY, "finals", "categories.json"), "utf8")).categories;
const POOLS = ["a1"].map(function (l) {
  return JSON.parse(fs.readFileSync(path.join(LEGACY, "finals", l + ".json"), "utf8"));
});
test("final test pools: the model answer of each of the 180 items gives full points", function () {
  let n = 0;
  POOLS.forEach(function (set) {
    set.items.forEach(function (it) {
      const r = X.evaluate(it, modelAnswerOf(it));
      assert.ok(r.correct && r.points === X.maxPoints(it) && r.points === r.max, set.id + " " + it.id + " " + JSON.stringify(r));
      n++;
    });
  });
  assert.strictEqual(n, 30 * POOLS.length);
});
test("final test pools: all accepted / answers variants are accepted, and an empty answer gives no points", function () {
  POOLS.forEach(function (set) {
    set.items.forEach(function (it) {
      if (it.type === "translate") it.accepted.forEach(function (a) { assert.ok(X.evaluate(it, { text: a }).correct, it.id + " “" + a + "”"); });
      if (it.type === "transformation") it.answers.forEach(function (a) { assert.ok(X.evaluate(it, { text: a }).correct, it.id + " “" + a + "”"); });
      if (it.type === "short-answer") it.accepted.forEach(function (a) { assert.ok(X.evaluate(it, { text: a }).correct, it.id + " “" + a + "”"); });
      if (it.type === "gap-fill") it.gaps.forEach(function (g, i) { g.accepted.forEach(function (a) {
        const texts = it.gaps.map(function (x) { return x.accepted[0]; }); texts[i] = a;
        assert.ok(X.evaluate(it, { texts: texts }).correct, it.id + " gap " + (i + 1) + " “" + a + "”");
      }); });
      const empty = X.evaluate(it, it.type === "match" ? { pairs: {} } : it.type === "gap-fill" ? { texts: [] } : it.type === "multiple-choice" ? {} : it.type === "reorder" ? { words: [] } : it.type === "find-error" ? {} : { text: "" });
      assert.strictEqual(empty.points, 0, it.id + " empty answer");
    });
  });
});
test("final test pools: drawing 20 of 30 – category shares, items from different topic pages, different sets", function () {
  POOLS.forEach(function (set) {
    const cat = function (it) { return LV_CATS[it.topic]; };
    const pool = {};
    set.items.forEach(function (it) { pool[cat(it)] = (pool[cat(it)] || 0) + 1; });
    const seen = new Set();
    for (let s = 1; s <= 25; s++) {
      const d = F.drawItems(set.items, set.draw, cat, seeded(s * 7919));
      assert.strictEqual(d.length, 20);
      assert.strictEqual(new Set(d.map(function (x) { return x.id; })).size, 20);
      Object.keys(pool).forEach(function (c) {
        const got = d.filter(function (it) { return cat(it) === c; }).length;
        assert.ok(got >= 1 && Math.abs(got - 20 * pool[c] / 30) <= 1.01, set.id + " " + c + ": " + got + " (pool " + pool[c] + ")");
      });
      seen.add(d.map(function (x) { return x.id; }).sort().join());
    }
    assert.ok(seen.size >= 20, set.id + ": too few different draws (" + seen.size + ")");
  });
});

// ---------- Profile data: plm.finals (level badges) ----------
global.localStorage = { _d: {}, getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; }, setItem: function (k, v) { this._d[k] = String(v); }, removeItem: function (k) { delete this._d[k]; }, key: function (i) { return Object.keys(this._d)[i] || null; }, get length() { return Object.keys(this._d).length; } };
require(path.join(__dirname, "..", "js", "utils.js"));
let activeProfile = "p1";
global.LM.app = { getActiveProfile: function () { return activeProfile ? { id: activeProfile } : null; }, reportSaveError: function () { throw new Error("save error"); } };
require(path.join(__dirname, "..", "js", "profile-data.js"));
const PD = global.LM.profileData;
function freshPD() { PD.clearAll(); activeProfile = "p1"; }

test("plm.finals: the key is in KEYS next to the others, the placement test has its own (plm.placement)", function () {
  assert.strictEqual(PD.KEYS.levelTests, "plm.finals");
  assert.strictEqual(PD.KEYS.levelTest, "plm.placement");
});
test("saveFinalResult: first pass, best score by percentage, the badge stays after a fail", function () {
  freshPD();
  assert.strictEqual(PD.finalResult("A1"), null);
  const fail = PD.saveFinalResult("A1", { score: 12, total: 20, passed: false });
  assert.deepStrictEqual([fail.passed, fail.firstPass, fail.passedAt], [false, false, null]);
  const pass = PD.saveFinalResult("A1", { score: 17, total: 20, passed: true });
  assert.deepStrictEqual([pass.passed, pass.firstPass, pass.best.score], [true, true, 17]);
  const again = PD.saveFinalResult("A1", { score: 18, total: 22, passed: true }); // 81,8% < 85%
  assert.deepStrictEqual([again.firstPass, again.best.score, again.last.score], [false, 17, 18]);
  const worse = PD.saveFinalResult("A1", { score: 9, total: 20, passed: false });
  assert.strictEqual(worse.passedAt, pass.passedAt); // the badge does not go away
  assert.deepStrictEqual(PD.passedLevels(), { A1: pass.passedAt });
  assert.strictEqual(PD.saveFinalResult("Z9", { score: 1, total: 2, passed: true }), null);
  assert.strictEqual(PD.saveFinalResult("A2", { score: 5, total: 0, passed: true }), null);
});
test("plm.finals: data per profile, nothing is saved without a profile", function () {
  freshPD();
  PD.saveFinalResult("B1", { score: 20, total: 20, passed: true });
  activeProfile = "p2";
  assert.strictEqual(PD.finalResult("B1"), null);
  assert.deepStrictEqual(PD.passedLevels(), {});
  activeProfile = null;
  assert.strictEqual(PD.saveFinalResult("B1", { score: 20, total: 20, passed: true }), null);
  assert.strictEqual(PD.finalResult("B1"), null);
});
test("plm.finals: the export has the key, the import restores the data, profile deletion and reset clear it", function () {
  freshPD();
  PD.saveFinalResult("C1", { score: 18, total: 20, passed: true });
  const exported = JSON.parse(JSON.stringify(PD.exportData()));
  assert.ok(exported.levelTests && exported.levelTests.profiles.p1.levels.C1.passedAt);
  PD.clearAll();
  assert.strictEqual(PD.finalResult("C1"), null);
  assert.strictEqual(global.localStorage.getItem("plm.finals"), null);
  PD.applyImport(PD.parseImport(exported), ["p1"]);
  assert.strictEqual(PD.finalResult("C1").best.score, 18);
  assert.ok(global.localStorage.getItem("plm.finals"));
  PD.removeProfile("p1");
  assert.strictEqual(PD.finalResult("C1"), null);
  assert.strictEqual(JSON.parse(global.localStorage.getItem("plm.finals")).profiles.p1, undefined);
});
test("import: a kind missing from the learning part is an empty store (no migrations); profiles not in the list are dropped", function () {
  freshPD();
  PD.saveFinalResult("A2", { score: 16, total: 20, passed: true });
  const file = JSON.parse(JSON.stringify(PD.exportData()));
  const parsed = PD.parseImport(file);
  assert.ok(parsed.journal && parsed.exercises && parsed.levelTests);
  PD.applyImport(parsed, ["p1"]);
  assert.strictEqual(PD.finalResult("A2").passedAt !== null, true);
  PD.applyImport(parsed, ["inny"]);
  assert.strictEqual(PD.finalResult("A2"), null, "a profile that is not in the file loses its data");
  delete file.levelTests;
  assert.deepStrictEqual(PD.parseImport(file).levelTests, { version: 1, profiles: {} });
  assert.throws(function () { PD.parseImport(undefined); }, /learning/);
});
test("import: a damaged or too new plm.finals key → an error, junk in the data filtered out", function () {
  freshPD();
  assert.throws(function () { PD.parseImport({ levelTests: { version: 99, profiles: {} } }); }, /Unsupported data version/);
  assert.throws(function () { PD.parseImport({ levelTests: { version: 1 } }); }, /Wrong data format/);
  const parsed = PD.parseImport({ levelTests: { version: 1, profiles: { p1: { levels: {
    A1: { passedAt: "someday", best: { score: 30, total: 20, date: "2026-01-01" }, last: { score: 15, total: 20, date: "2026-01-02" } }, // bad day, bad best
    A2: { passedAt: "2026-02-03", best: { score: 16, total: 20, date: "2026-02-03" } },                                               // brak last
    Z9: { passedAt: "2026-02-03", best: { score: 1, total: 2, date: "2026-02-03" } },                                                 // unknown level
    B1: "tekst"
  } } } } });
  const lv = parsed.levelTests.profiles.p1.levels;
  assert.deepStrictEqual(Object.keys(lv).sort(), ["A1", "A2"]);
  assert.deepStrictEqual([lv.A1.passedAt, lv.A1.best.score, lv.A1.last.score], [null, 15, 15]);
  assert.deepStrictEqual([lv.A2.passedAt, lv.A2.last.score], ["2026-02-03", 16]);
});
test("plm.finals: a damaged record in localStorage → an empty state and a .corrupt-backup copy", function () {
  // A new instance of the module (the profileData cache is filled only on the first read)
  const file = path.join(__dirname, "..", "js", "profile-data.js");
  const keep = global.LM.profileData;
  delete require.cache[require.resolve(file)];
  global.localStorage.setItem("plm.finals", "{niepoprawny json");
  require(file);
  assert.deepStrictEqual(global.LM.profileData.passedLevels(), {});
  assert.strictEqual(global.localStorage.getItem("plm.finals.corrupt-backup"), "{niepoprawny json");
  global.localStorage.removeItem("plm.finals");
  global.localStorage.removeItem("plm.finals.corrupt-backup");
  global.LM.profileData = keep;
});

console.log("\nAttempt log and stats");
const T = global.LM.stats;
function att(itemId, topic, type, level, correct, day) {
  return { t: day + "T10:00:00.000Z", day: day, itemId: itemId, setId: null, topic: topic, level: level, type: type, tags: [], correct: correct, mode: "learn", answer: "" };
}
function recWith(list) { const r = { items: [], aggregates: {} }; list.forEach(function (a) { T.pushAttempt(r, a); }); return r; }

test("ring buffer: limit, the oldest into aggregates, stats without loss", function () {
  const r = { items: [], aggregates: {} };
  for (let i = 0; i < 10; i++) T.pushAttempt(r, att("x-" + (i % 3), "t1", "reorder", "A1", i % 2 === 0, "2026-10-0" + (1 + (i % 9))), 6);
  assert.strictEqual(r.items.length, 6);
  const compacted = Object.keys(r.aggregates).reduce(function (s, k) { return s + r.aggregates[k].n; }, 0);
  assert.strictEqual(compacted, 4);
  const all = T.aggregate(r, "topic").t1;
  assert.deepStrictEqual(all, { n: 10, ok: 5 }); // attempts + aggregates = all answers
  assert.strictEqual(r.items[0].itemId, "x-" + (4 % 3)); // the newest stayed
  // Default limit 3000
  const big = { items: [], aggregates: {} };
  for (let i = 0; i < 3005; i++) T.pushAttempt(big, att("y", "t", "reorder", "A1", true, "2026-10-01"));
  assert.strictEqual(big.items.length, T.MAX_ATTEMPTS);
  assert.strictEqual(big.aggregates.y.n, 5);
});

test("accuracy aggregated by topic, type and level; a small sample = no score", function () {
  const r = recWith([
    att("a", "t1", "reorder", "A1", true, "2026-10-01"), att("b", "t1", "reorder", "A1", false, "2026-10-01"),
    att("c", "t1", "find-error", "A1", true, "2026-10-02"), att("d", "t1", "find-error", "A1", true, "2026-10-02"),
    att("e", "t1", "multiple-choice", "A1", true, "2026-10-03"),
    att("f", "t2", "multiple-choice", "B1", false, "2026-10-03"), att("g", "t2", "multiple-choice", "B1", false, "2026-10-03")
  ]);
  assert.deepStrictEqual(T.aggregate(r, "topic"), { t1: { n: 5, ok: 4 }, t2: { n: 2, ok: 0 } });
  assert.deepStrictEqual(T.aggregate(r, "type")["multiple-choice"], { n: 3, ok: 1 });
  assert.deepStrictEqual(T.aggregate(r, "level"), { A1: { n: 5, ok: 4 }, B1: { n: 2, ok: 0 } });
  assert.strictEqual(T.accuracy({ n: 4, ok: 4 }), null);
  assert.strictEqual(T.accuracy({ n: 5, ok: 4 }), 0.8);
  const ranked = T.ranked(r, "topic");
  assert.deepStrictEqual(ranked.map(function (x) { return x.key; }), ["t1"]); // t2 has < 5 attempts
});

test("topics for weak-spot practice: ≥ 5 attempts, < 70%, ascending, max. 3", function () {
  const list = [];
  const make = function (topic, n, ok) { for (let i = 0; i < n; i++) list.push(att(topic + "-" + i, topic, "reorder", "A2", i < ok, "2026-10-05")); };
  make("dobry", 10, 9); make("slaby", 10, 3); make("sredni", 10, 6); make("mala-proba", 4, 0); make("najgorszy", 6, 1); make("graniczny", 10, 7);
  const weak = T.weakTopics(recWith(list));
  assert.deepStrictEqual(weak.map(function (x) { return x.key; }), ["najgorszy", "slaby", "sredni"]);
  assert.deepStrictEqual(T.weakTopics(recWith([att("a", "t", "reorder", "A1", true, "2026-10-01")])), []);
});

test("summary and weekly trend (today injected)", function () {
  const r = recWith([
    att("a", "t", "reorder", "A1", true, "2026-10-20"), att("b", "t", "reorder", "A1", false, "2026-10-14"),
    att("c", "t", "reorder", "A1", true, "2026-09-25"), att("d", "t", "reorder", "A1", true, "2026-07-01")
  ]);
  const s = T.summary(r, "2026-10-20");
  assert.deepStrictEqual([s.n7, s.n30, s.n], [2, 3, 4]); // Oct 14 is within 7 days (14–20)
  const w = T.weekly(r, "2026-10-20", 12);
  assert.strictEqual(w.length, 12);
  assert.strictEqual(w[11].start, "2026-10-19"); // Monday
  assert.strictEqual(w[11].n, 1);
  assert.strictEqual(w[10].n, 1);
  assert.strictEqual(w.reduce(function (x, y) { return x + y.n; }, 0), 3); // July is outside the 12 weeks
  const g = T.activityGrid(["2026-10-19", "2026-10-21"], "2026-10-20", 12);
  assert.strictEqual(g.length, 12);
  assert.ok(g[11][0].active && g[11][0].day === "2026-10-19");
  assert.ok(g[11][2].future && g[11][2].active);
});

test("log dedup: a new entry, an active one without a duplicate (back to stage 1), a mastered one comes back, daily limit", function () {
  const today = "2026-10-20";
  assert.deepStrictEqual(T.planWrong(null, { today: today, autoToday: 0 }), { action: "create" });
  assert.deepStrictEqual(T.planWrong(null, { today: today, autoToday: 30 }), { action: "limit" });
  const stage0 = { review: { stage: 0, due: "2026-10-21", mastered: false } };
  assert.deepStrictEqual(T.planWrong(stage0, { today: today, autoToday: 99 }), { action: "update", review: stage0.review }); // existing: the limit does not apply
  const stage2 = { review: { stage: 2, due: "2026-10-27", mastered: false } };
  assert.deepStrictEqual(T.planWrong(stage2, { today: today, autoToday: 0 }), { action: "update", review: { stage: 0, due: "2026-10-21", mastered: false } });
  const mastered = { review: { stage: 2, due: "2026-10-01", mastered: true } };
  assert.deepStrictEqual(T.planWrong(mastered, { today: today, autoToday: 0 }), { action: "reopen", review: { stage: 0, due: "2026-10-21", mastered: false } });
});

test("a correct answer counts as a review only when it is due (today or overdue)", function () {
  const today = "2026-10-20";
  assert.strictEqual(T.planCorrect(null, today), null);
  assert.strictEqual(T.planCorrect({ review: { stage: 0, due: "2026-10-21", mastered: false } }, today), null); // not yet
  assert.strictEqual(T.planCorrect({ review: { stage: 2, due: "2026-10-10", mastered: true } }, today), null);  // mastered
  assert.deepStrictEqual(T.planCorrect({ review: { stage: 0, due: "2026-10-20", mastered: false } }, today), { action: "review", review: { stage: 1, due: "2026-10-23", mastered: false } });
  assert.deepStrictEqual(T.planCorrect({ review: { stage: 2, due: "2026-10-15", mastered: false } }, today).review.mastered, true); // last stage → mastered
});

test("the “I know this” suggestion: the last two ≥ 80%, not when already known, a 14-day pause after a decline", function () {
  const o = { isKnown: false, dismissedDay: null, today: "2026-10-20" };
  assert.strictEqual(T.suggestKnown([0.9], o), false);
  assert.strictEqual(T.suggestKnown([0.8, 0.9], o), true);
  assert.strictEqual(T.suggestKnown([1, 0.7, 0.9], o), false);
  assert.strictEqual(T.suggestKnown([0.5, 0.8, 1], o), true);
  assert.strictEqual(T.suggestKnown([0.9, 0.9], Object.assign({}, o, { isKnown: true })), false);
  assert.strictEqual(T.suggestKnown([0.9, 0.9], Object.assign({}, o, { dismissedDay: "2026-10-10" })), false);
  assert.strictEqual(T.suggestKnown([0.9, 0.9], Object.assign({}, o, { dismissedDay: "2026-10-06" })), true);
});

test("weights: generator (accuracy < 60% × 2, new × 1.5) and practice (no correct answer in 14 days × 2)", function () {
  const r = recWith([
    att("weak", "t", "reorder", "A1", false, "2026-10-01"), att("weak", "t", "reorder", "A1", false, "2026-10-02"), att("weak", "t", "reorder", "A1", true, "2026-10-03"),
    att("good", "t", "reorder", "A1", true, "2026-10-19"),
    att("old", "t", "reorder", "A1", true, "2026-09-01")
  ]);
  const mw = T.mixWeight(r);
  assert.deepStrictEqual([mw({ id: "weak" }), mw({ id: "good" }), mw({ id: "new" })], [2, 1, 1.5]);
  const ww = T.weakWeight(r, "2026-10-20");
  // “weak” answered correctly 17 days ago — outside the 14-day window, so weight 2
  assert.deepStrictEqual([ww({ id: "good" }), ww({ id: "weak" }), ww({ id: "old" }), ww({ id: "new" })], [1, 2, 2, 2]);
});

test("weighted drawing: an item with weight 2 comes into the set more often", function () {
  const pool = [];
  for (let i = 0; i < 20; i++) pool.push({ id: "z" + i, topic: "t", type: "reorder" });
  let heavy = 0, light = 0;
  for (let s = 1; s <= 400; s++) {
    const m = X.pickMix(pool, { count: 5, weight: function (it) { return it.id === "z0" ? 2 : 1; } }, seeded(s * 104729 + 7)); // a big seed: the first number is not close to 0
    if (m.items.some(function (x) { return x.id === "z0"; })) heavy++;
    if (m.items.some(function (x) { return x.id === "z1"; })) light++;
  }
  assert.ok(heavy > light * 1.4, "waga 2: " + heavy + ", waga 1: " + light);
});

console.log("\nWyszukiwarka");
const SR = global.LM.searchLogic;
const SFX = langFixture("search");
const recs = SR.prepare(SFX.records.concat([
  { id: "5", group: "pages", title: "Present Perfect", headings: [], summary: "", text: "Present tense." },
  { id: "6", group: "lab", title: "Present Simple", headings: [], summary: "", text: "" }
]));

test("fold: LM.lang.fold — Polish letters (ł has no decomposition), case, quotes, the same length", function () { // pl-fixture
  langFixture("lang").fold.forEach(function (c) {
    assert.strictEqual(SR.fold(c[0]), c[1], c[0]);
    assert.strictEqual(SR.fold(c[0]).length, c[0].length, "length " + c[0]);
  });
  assert.strictEqual("ł".normalize("NFD"), "ł", "NFD does not split ł; fold must handle it itself"); // pl-fixture
  assert.deepStrictEqual(SR.tokenize("Don’t stop, I'm here!"), ["don't", "stop", "i'm", "here"]);
  assert.deepStrictEqual(SR.tokenize("biało-czerwona A1"), ["bialo-czerwona", "bialo", "czerwona", "a1"]); // pl-fixture
});
test("search: Polish words with and without marks (ł too), hyphenated words, every word must match", function () { // pl-fixture
  const ids = function (q) { return [].concat.apply([], SR.search(recs, q).groups.map(function (g) { return g.results.map(function (r) { return r.record.id; }); })); };
  SFX.queries.forEach(function (c) { assert.deepStrictEqual(ids(c[0]), c[1], c[0]); });
  assert.deepStrictEqual(ids("pres").slice(0, 2).sort(), ["5", "6"]);
  assert.deepStrictEqual(ids("mieszkam lodzi"), ["2"]); // both words
  assert.deepStrictEqual(ids("mieszkam zzzz"), []);
});
test("highlight and snippet with Polish text: offsets in the original, ł matched by l and by ł", function () { // pl-fixture
  SFX.highlight.forEach(function (c) {
    const parts = SR.highlight(c[0], c[1]);
    assert.strictEqual(parts.map(function (x) { return x.text; }).join(""), c[0], "the text unchanged");
    assert.deepStrictEqual(parts.filter(function (x) { return x.hit; }).map(function (x) { return x.text; }), c[2], c[0] + " / " + c[1]);
  });
  const sn = SR.snippet(SFX.records[1].text + " <b>x</b>", "wroclaw");
  assert.ok(sn.some(function (x) { return x.hit && /^Wroc/.test(x.text); }));
  assert.ok(sn.map(function (x) { return x.text; }).join("").indexOf("<b>") !== -1); // the text unchanged, for textContent
});
test("search: typos only from 5 characters, swapped letters = one typo", function () {
  assert.ok(SR.search(recs, "presnet").total > 0);
  assert.strictEqual(SR.search(recs, "pest").total, 0); // short: no tolerance
  assert.strictEqual(SR.distance("presnet", "present"), 1);
});
test("search: anchor to a heading, groups in the given order, limit and “show more”", function () {
  const r = SR.search(recs, "typowe", { groups: ["lab", "pages"] });
  assert.strictEqual(r.groups[0].results[0].anchor, SFX.records[0].headings[1]);
  const g = SR.search(recs, "present", { groups: ["lab", "pages"], limit: 1 });
  assert.deepStrictEqual(g.groups.map(function (x) { return x.group; }), ["lab", "pages"]);
  assert.strictEqual(g.groups[1].results.length, 1);
  assert.strictEqual(SR.search(recs, "present", { limit: 1, expanded: { lab: true } }).groups.find(function (x) { return x.group === "lab"; }).results.length, 1);
});
test("snippet and highlight: parts with a hit flag, no HTML", function () {
  assert.deepStrictEqual(SR.highlight("Present Perfect", "perf").filter(function (p) { return p.hit; }).map(function (p) { return p.text; }), ["Perfect"]);
});

console.log("\nEgzaminy: strefy licznika (spec 06, 4.2)");
const EL = global.LM.examLogic;
test("writingZone: matura podstawowa (<80, 80–99, 100–150, >150)", function () {
  const T = { wordRange: [100, 150], warnBelow: 80 };
  assert.deepStrictEqual([79, 80, 99, 100, 150, 151].map(function (n) { return EL.writingZone(n, T); }), ["low", "warn", "warn", "ok", "ok", "over"]);
});
test("writingZone: matura rozszerzona (<160, 160–199, 200–250, >250)", function () {
  const T = { wordRange: [200, 250], warnBelow: 160 };
  assert.deepStrictEqual([159, 160, 199, 200, 250, 251].map(function (n) { return EL.writingZone(n, T); }), ["low", "warn", "warn", "ok", "ok", "over"]);
});

console.log("\nFlashcards: schedule (spec 10, section 3; vectors tools/fixtures/scheduler-vectors.json)");
const FH = global.LM.cardsSchedule;
const VEC = JSON.parse(require("fs").readFileSync(path.join(__dirname, "fixtures", "scheduler-vectors.json"), "utf8"));
const CARD_FIELDS = ["state", "step", "ease", "interval", "pendingInterval", "lapses", "reps", "due"];
test("vectors: the configuration matches the default", function () {
  Object.keys(VEC.config).forEach(function (k) { assert.deepStrictEqual(FH.DEFAULT_CONFIG[k], VEC.config[k], k); });
});
VEC.scenarios.forEach(function (sc) {
  test("schedule: scenario “" + sc.name + "” (" + sc.steps.length + " steps)", function () {
    let card = FH.newCard();
    sc.steps.forEach(function (st, i) {
      const before = JSON.stringify(card);
      const next = FH.schedule(card, st.grade, st.now);
      assert.strictEqual(JSON.stringify(card), before, "step " + (i + 1) + ": the input card was changed");
      CARD_FIELDS.forEach(function (f) { assert.strictEqual(next[f], st.card[f], "step " + (i + 1) + " (" + st.grade + "): " + f); });
      card = next;
    });
  });
});
test("schedule: numeric ratings 1–4 = again/hard/good/easy, an unknown rating → an error", function () {
  const c = FH.newCard();
  ["again", "hard", "good", "easy"].forEach(function (g, i) { assert.deepStrictEqual(FH.schedule(c, i + 1, 1000), FH.schedule(c, g, 1000)); });
  assert.throws(function () { FH.schedule(c, "super", 1000); });
});
test("schedule: ±5% spread only for intervals ≥ 3 d, randomness from outside", function () {
  const rev = { state: "review", step: 0, ease: 2.5, interval: 40, pendingInterval: 0, lapses: 0, reps: 5, due: 0 };
  const base = FH.schedule(rev, "good", 0).interval; // 100
  assert.strictEqual(FH.schedule(rev, "good", 0, null, { fuzz: true, random: function () { return 1; } }).interval, base + 5);
  assert.strictEqual(FH.schedule(rev, "good", 0, null, { fuzz: true, random: function () { return 0; } }).interval, base - 5);
  const grad = FH.schedule(Object.assign(FH.newCard(), { state: "learning", step: 1 }), "good", 0, null, { fuzz: true, random: function () { return 1; } });
  assert.strictEqual(grad.interval, 1); // 1 d < 3 d — no spread
});
test("preview and formatDelay: preview of the due dates of the four ratings", function () {
  const pv = FH.preview(FH.newCard(), 0);
  assert.deepStrictEqual(["again", "hard", "good", "easy"].map(function (g) { return FH.formatDelay(pv[g].delay); }), ["1 min", "1 min", "10 min", "4 d"]);
  assert.strictEqual(FH.formatDelay(3 * FH.DAY), "3 d");
  assert.strictEqual(FH.formatDelay(90 * FH.DAY), "3 mo");
});

console.log("\nFlashcards: answer check, cloze, queue, TSV/CSV, state (spec 10, section 8)");
const FL = global.LM.cardsLogic;
test("normalize: lower case, spaces, apostrophes, punctuation at the edges (Polish quotes too), diacritics kept", function () {
  assert.strictEqual(FL.normalize("  Don’t   Give Up!  "), "don't give up");
  assert.strictEqual(FL.normalize("“Come up with”."), "come up with");
  assert.strictEqual(FL.normalize("well-known"), "well-known"); // a hyphen inside stays
  langFixture("words").selection.forEach(function (c) { assert.strictEqual(FL.normalize(c[0]), c[1].toLowerCase(), c[0]); });
});
test("checkAnswer: the shared LM.exLogic.match — exact / accents / ending / typo / wrong / empty, lenient accents", function () {
  const M = langFixture("match").cases.filter(function (c) { return !c.sentence; });
  M.forEach(function (c) {
    const r = FL.checkAnswer(c.answer, c.accepted);
    const want = c.answered === false ? "empty" : c.ok ? "exact" : c.near || "wrong";
    assert.strictEqual(r.result, want, c.answer);
    if (want !== "empty") assert.strictEqual(r.expected, c.closest, c.answer);
  });
  assert.strictEqual(FL.checkAnswer("siotrę", ["siostrę"]).suggested, "hard"); // pl-fixture
  assert.strictEqual(FL.checkAnswer("kawe", ["kawę"]).suggested, "hard"); // pl-fixture
  assert.strictEqual(FL.checkAnswer("kawa", ["kawę"]).suggested, "again"); // pl-fixture
  const len = FL.checkAnswer("kawe", ["kawę"], { lenientAccents: true }); // pl-fixture
  assert.deepStrictEqual([len.result, len.lenient, len.suggested], ["exact", true, "good"]);
  assert.strictEqual(FL.checkAnswer("   ", ["kot"]).result, "empty");
});
test("checkAnswer: alternatives a|b, case and apostrophes", function () {
  const alts = FL.parseCloze("I {{gave up|quit}} smoking.").answers;
  assert.strictEqual(FL.checkAnswer("QUIT", alts).result, "exact");
  assert.strictEqual(FL.checkAnswer("gave up", alts).expected, "gave up");
  assert.strictEqual(FL.checkAnswer("can't", ["can’t"]).result, "exact");
  assert.strictEqual(FL.levenshtein("kitten", "sitting"), 3);
});
test("parseCloze: one gap, alternatives, bad input", function () {
  const c = FL.parseCloze("She {{came up with}} a plan.");
  assert.deepStrictEqual([c.ok, c.before, c.answers, c.after], [true, "She ", ["came up with"], " a plan."]);
  assert.strictEqual(FL.parseCloze("No gap").ok, false);
  assert.strictEqual(FL.parseCloze("{{a}} i {{b}}").ok, false);
  assert.strictEqual(FL.parseCloze("Empty {{a|}} alternative").ok, false);
  assert.strictEqual(FL.parseCloze("Empty {{ }} gap").ok, false);
  assert.strictEqual(FL.parseCloze("Bad {{brace} text").ok, false);
  assert.strictEqual(FL.frontText({ type: "cloze", text: "We've {{run out of}} milk." }), "We've _____ milk.");
});
test("Anki: {{c1::…}} ↔ {{…}}", function () {
  assert.strictEqual(FL.fromAnki("I {{c1::gave up::stop doing}} it."), "I {{gave up}} it.");
  assert.strictEqual(FL.toAnki("I {{gave up|quit}} it.", "stop doing"), "I {{c1::gave up::stop doing}} it.");
});
test("studyDay: the day boundary at 04:00 (local time)", function () {
  assert.strictEqual(FL.studyDay(new Date(2026, 10, 2, 3, 59).getTime()), "2026-11-01");
  assert.strictEqual(FL.studyDay(new Date(2026, 10, 2, 4, 0).getTime()), "2026-11-02");
  assert.strictEqual(FL.dayStart("2026-11-02"), new Date(2026, 10, 2, 4, 0).getTime());
  assert.strictEqual(FL.dayEnd(new Date(2026, 10, 2, 23, 0).getTime()), new Date(2026, 10, 3, 4, 0).getTime());
});
test("buildQueue: order learning → reviews (most overdue) → new, limits, suspended and buried", function () {
  const now = new Date(2026, 10, 2, 12, 0).getTime(), H = 3600000;
  const cards = [];
  for (let i = 1; i <= 15; i++) cards.push({ id: "t-" + String(i).padStart(3, "0"), deck: "t" });
  const st = {
    "t-001": { state: "review", due: now - 48 * H, interval: 3 }, "t-002": { state: "review", due: now - 2 * H, interval: 3 },
    "t-003": { state: "review", due: now + 10 * H, interval: 3 },            // still today (before 04:00 tomorrow)
    "t-004": { state: "review", due: now + 30 * H, interval: 3 },            // tomorrow — skipped
    "t-005": { state: "learning", due: now - 60000, step: 1 }, "t-006": { state: "relearning", due: now + 5 * 60000 },
    "t-007": { state: "review", due: now - H, suspended: true }, "t-008": { state: "review", due: now - H, buriedUntil: now + H }
  };
  const q = FL.buildQueue({ cards: cards, state: st, now: now, settings: { newPerDay: 3, reviewsPerDay: 100 } });
  assert.deepStrictEqual(q.learning, ["t-005", "t-006"]);
  assert.deepStrictEqual(q.review, ["t-001", "t-002", "t-003"]);
  assert.deepStrictEqual(q.fresh, ["t-009", "t-010", "t-011"]);
  const lim = FL.buildQueue({ cards: cards, state: st, now: now, settings: { newPerDay: 10, reviewsPerDay: 2 }, today: { new: 8, reviews: 1 } });
  assert.deepStrictEqual([lim.review, lim.fresh], [["t-001"], ["t-009", "t-010"]]);
  assert.strictEqual(FL.buildQueue({ cards: cards, state: st, now: now, settings: { newPerDay: 3 }, today: { new: 3 }, extraNew: 5 }).fresh.length, 5);
  const def = FL.buildQueue({ cards: cards, state: {}, now: now });
  assert.strictEqual(def.fresh.length, 10); // 10 new by default
});
test("buildQueue: a “random” deck shuffles new cards only within itself", function () {
  const cards = ["a-001", "a-002", "a-003", "b-001", "b-002"].map(function (id) { return { id: id, deck: id.slice(0, 1) }; });
  const q = FL.buildQueue({ cards: cards, state: {}, now: 0, settings: { newPerDay: 10, randomDecks: ["a"] }, random: function () { return 0; } });
  assert.deepStrictEqual(q.fresh, ["a-002", "a-003", "a-001", "b-001", "b-002"]);
});
test("pickNext: learning due now → queue → learning within 20 min", function () {
  const now = 1000000000;
  const st = { L1: { due: now + 5 * 60000 }, L2: { due: now - 1 } };
  assert.deepStrictEqual(FL.pickNext(["L1", "L2"], ["Q1"], st, now), { id: "L2", from: "learning" });
  assert.deepStrictEqual(FL.pickNext(["L1"], ["Q1"], st, now), { id: "Q1", from: "queue" });
  assert.deepStrictEqual(FL.pickNext(["L1"], [], st, now), { id: "L1", from: "ahead" });
  assert.strictEqual(FL.pickNext([], [], st, now), null);
});
test("deckStats: new / learning / mastered (≥ 21 d) / suspended", function () {
  const s = FL.deckStats([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }],
    { b: { state: "learning", due: 0 }, c: { state: "review", interval: 30, due: 9e15 }, d: { state: "review", interval: 5, due: 0 }, e: { state: "review", suspended: true } }, 1);
  assert.deepStrictEqual([s.new, s.learning, s.mastered, s.review, s.suspended, s.due], [1, 1, 1, 1, 1, 2]);
});
test("parseDelimited: tab / semicolon, RFC 4180 quotes, new lines in a field, Polish letters", function () {
  const p = FL.parseDelimited('type;front;back\nbasic;"I am ""20""";"I am 20;\nyears"\nbasic;Żółć;bile\n'); // pl-fixture
  assert.strictEqual(p.separator, ";");
  assert.deepStrictEqual(p.rows[1].cells, ["basic", 'I am "20"', "I am 20;\nyears"]);
  assert.deepStrictEqual(p.rows[2], { line: 4, cells: ["basic", "Żółć", "bile"] }); // pl-fixture
  assert.strictEqual(FL.parseDelimited("a\tb\n").separator, "\t");
});
test("importCards: spec columns, Anki format ({{c1::…}}), rejections with a reason, limit", function () {
  const r = FL.importCards("type\tfront\tback\thint\texample\tnote\ttags\n" +
    "cloze\tShe {{c1::came up with}} it.\t\tinvent\t\t\tphrasal c1\n" +
    "typed\trefrigerator (US)\tfridge|refrigerator\n" +
    "cloze\tNo gap\n" +
    "kosmos\ta\tb\n" +
    "basic\tZgadzam się.\tI agree.\n"); // pl-fixture
  assert.strictEqual(r.cards.length, 3);
  assert.deepStrictEqual(r.cards[0], { type: "cloze", tags: ["phrasal", "c1"], text: "She {{came up with}} it.", hint: "invent" });
  assert.deepStrictEqual(r.cards[1].accepted, ["fridge", "refrigerator"]);
  assert.deepStrictEqual(r.rejected.map(function (x) { return x.line; }), [4, 5]);
  const anki = FL.importCards("I {{c1::gave up}} smoking.\tstop doing\tphrasal\nZgadzam się.\tI agree.\t\n"); // pl-fixture
  assert.deepStrictEqual(anki.cards.map(function (c) { return c.type; }), ["cloze", "basic"]);
  assert.strictEqual(FL.importCards("basic\t" + "x".repeat(501) + "\ty\n").rejected[0].reason.indexOf("500") !== -1, true);
  assert.strictEqual(FL.importCards("basic\ta\tb\nbasic\tc\td\nbasic\te\tf\n", { limit: 2 }).cards.length, 2);
});
test("exportTsv: Anki (front, back, tags), cloze as {{c1::…}}, export → import", function () {
  const cards = [{ type: "cloze", text: "I {{gave up|quit}} it.", hint: "stop doing", tags: ["a"] }, { type: "basic", front: "I am 20.", back: "I am 20.", note: "Not: I have", tags: [] }];
  const tsv = FL.exportTsv(cards);
  assert.strictEqual(tsv.split("\n")[0], "I {{c1::gave up::stop doing}} it.\t\ta");
  const back = FL.importCards(tsv);
  assert.deepStrictEqual([back.cards[0].type, back.cards[0].text, back.cards[1].front], ["cloze", "I {{gave up}} it.", "I am 20."]);
});
test("sanitizeState: damaged data, unknown version, too long fields, pruning daily", function () {
  assert.throws(function () { FL.sanitizeState(null); });
  assert.throws(function () { FL.sanitizeState({ version: 2 }); });
  const daily = {};
  for (let i = 0; i < 410; i++) daily[new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10)] = { new: 1, reviews: 2, again: 0, minutes: 3 };
  const s = FL.sanitizeState({
    version: 1,
    cards: { "kolokacje-001": { state: "review", ease: 9, interval: 5, due: 5 }, "bad id!": { state: "review" }, "x-001": { state: "weird" } },
    userDecks: [{ id: "u-1", title: "Mine" }, { id: "bad id!", title: "x" }],
    userCards: [{ id: "u-c1", deck: "u-1", type: "basic", front: "a".repeat(800), back: "b" }, { id: "u-c2", deck: "u-1", type: "magia", front: "a", back: "b" }, { id: "u-c3", deck: "u-9", type: "basic", front: "a", back: "b" }],
    settings: { newPerDay: 5, enabledDecks: ["kolokacje", 7], typeAnswerFirst: "yes" },
    daily: daily
  });
  assert.deepStrictEqual(Object.keys(s.cards), ["kolokacje-001"]);
  assert.strictEqual(s.cards["kolokacje-001"].ease, 2.5);
  assert.deepStrictEqual(s.userDecks.map(function (d) { return d.id; }), ["u-1"]);
  assert.deepStrictEqual([s.userCards.length, s.userCards[0].front.length], [1, 500]);
  assert.deepStrictEqual([s.settings.newPerDay, s.settings.enabledDecks, s.settings.typeAnswerFirst], [5, ["kolokacje"], false]);
  assert.strictEqual(Object.keys(s.daily).length, 400);
  assert.strictEqual(Object.keys(s.daily)[0], "2025-01-11");
});

console.log("\nCards store: key plm.cards.<id> (spec 02 §5)");
test("cards-store: key plm.cards.<id>; broken value → .corrupt-backup and empty state; backups are not profiles", function () {
  if (!global.addEventListener) global.addEventListener = function () {};
  const storePath = path.join(__dirname, "..", "js", "cards-store.js");
  require(storePath);
  const CS = global.LM.cardsStore;
  assert.strictEqual(CS.keyOf("pc1"), "plm.cards.pc1");
  global.localStorage.setItem("plm.cards.pc1", "{broken");
  assert.deepStrictEqual(CS.load("pc1"), FL.emptyState());
  assert.strictEqual(global.localStorage.getItem("plm.cards.pc1.corrupt-backup"), "{broken");
  assert.deepStrictEqual(Object.keys(CS.exportData()), ["pc1"], "the backup key is not read as a profile");
  CS.removeProfile("pc1");
  assert.strictEqual(global.localStorage.getItem("plm.cards.pc1.corrupt-backup"), null, "profile deletion removes its backup too");
  assert.strictEqual(global.localStorage.getItem("plm.cards.pc1"), null);
});

console.log("\nTrail: logic (spec v7 13)");
{
  const SL = global.LM.trailLogic;
  const data = { levels: [
    { level: "A1", land: "Meadow", units: [
      { id: "a1-u1", title: "First sentences", stops: [
        { id: "a1-01", type: "lesson", title: "Introductions", items: ["e_a1_f01"], page: "a1/x", quiz: "trail-a1-01" },
        { id: "a1-02", type: "lesson", title: "To be", items: ["e_a1_g05", "e_a1_g06"], page: "a1/y", quiz: "trail-a1-02" },
        { id: "a1-03", type: "lesson", title: "Verbs", items: ["e_a1_g07"], page: "a1/z", set: "a1-set-1" },
        { id: "a1-u1-checkpoint", type: "checkpoint", title: "Checkpoint", from: ["a1-01", "a1-02", "a1-03"], size: 6 }
      ] }
    ] },
    { level: "A2", land: "Las", units: [
      { id: "a2-u1", title: "Dom", stops: [
        { id: "a2-01", type: "lesson", title: "Home", items: ["e_a2_v01"], page: "a2/x", quiz: "trail-a2-01" },
        { id: "a2-u1-checkpoint", type: "checkpoint", title: "Checkpoint", from: ["a2-01"], size: 6 }
      ] }
    ] },
    { level: "C1", land: "Mountains", units: [
      { id: "c1-u1", title: "Styl", stops: [
        { id: "c1-01", type: "lesson", title: "Styl", items: ["e_c1_g01"], page: "c1/x" },
        { id: "c1-02", type: "lesson", title: "Rejestr", items: ["e_c1_f01"], page: "c1/y" },
        { id: "c1-u1-checkpoint", type: "checkpoint", title: "Checkpoint", from: ["c1-01", "c1-02"], size: 6 }
      ] }
    ] }
  ] };
  const known = {}, setPct = {};
  const env = { isKnown: function (id) { return known[id] === true; }, setPercent: function (id) { return id in setPct ? setPct[id] : null; } };
  const reset = function () { Object.keys(known).forEach(function (k) { delete known[k]; }); Object.keys(setPct).forEach(function (k) { delete setPct[k]; }); };
  const stopOf = function (id) { let f = null; data.levels.forEach(function (l) { l.units.forEach(function (u) { u.stops.forEach(function (s) { if (s.id === id) f = s; }); }); }); return f; };

  test("trail stopStatus: quiz ≥ 3/4 passes (also after unticking “I know this”), 2/4 does not", function () {
    reset();
    const st = SL.emptyState();
    st.stops["a1-01"] = { done: true, via: "quiz", best: 3, at: "2026-11-12" };
    assert.deepStrictEqual(SL.statusOf(stopOf("a1-01"), st, env), { status: "done", via: "quiz" });
    known.e_a1_f01 = true; known.e_a1_f01 = false;                       // “I know this” unticked: the quiz stays
    assert.strictEqual(SL.statusOf(stopOf("a1-01"), st, env).status, "done");
    st.stops["a1-01"].best = 2;
    assert.strictEqual(SL.statusOf(stopOf("a1-01"), st, env).status, "open", "2/4 is too little");
  });
  test("trail stopStatus: all topics “I know this” pass, unticking undoes it (no quiz)", function () {
    reset();
    const st = SL.emptyState();
    known.e_a1_g05 = true;
    assert.strictEqual(SL.statusOf(stopOf("a1-02"), st, env).status, "open", "only some topics");
    known.e_a1_g06 = true;
    assert.deepStrictEqual(SL.statusOf(stopOf("a1-02"), st, env), { status: "done", via: "umiem" }); // pl-fixture: stored value
    known.e_a1_g06 = false;
    assert.strictEqual(SL.statusOf(stopOf("a1-02"), st, env).status, "open", "unticking undoes the pass");
  });
  test("trail stopStatus: a set ≥ 80% passes only a stop without a quiz; skip = skipped, not done", function () {
    reset();
    const st = SL.emptyState();
    setPct["a1-set-1"] = 79;
    assert.strictEqual(SL.statusOf(stopOf("a1-03"), st, env).status, "open");
    setPct["a1-set-1"] = 80;
    assert.deepStrictEqual(SL.statusOf(stopOf("a1-03"), st, env), { status: "done", via: "set" });
    const withQuiz = { id: "x", type: "lesson", items: ["e_x"], quiz: "q", set: "a1-set-1" };
    assert.strictEqual(SL.statusOf(withQuiz, st, env).status, "open", "a stop with a quiz is not passed by a set");
    st.stops["a1-02"] = { done: false, via: "skip", at: "2026-11-12" };
    assert.deepStrictEqual(SL.statusOf(stopOf("a1-02"), st, env), { status: "skipped", via: "skip" });
    known.e_a1_g05 = true; known.e_a1_g06 = true;
    assert.strictEqual(SL.statusOf(stopOf("a1-02"), st, env).status, "done", "a full “I know this” wins over a skip");
  });
  test("trail stopStatus: a checkpoint is done after an attempt, the result does not block", function () {
    const st = SL.emptyState();
    assert.strictEqual(SL.statusOf(stopOf("a1-u1-checkpoint"), st, env).status, "open");
    st.reviews["a1-u1-checkpoint"] = { best: 1, of: 6, at: "2026-11-12" };
    assert.strictEqual(SL.statusOf(stopOf("a1-u1-checkpoint"), st, env).status, "done");
  });
  test("trail buildTrail: the current stop from the starting point, lands before the start “skipped”", function () {
    reset();
    let st = SL.emptyState();
    let tr = SL.buildTrail(data, st, env);
    assert.strictEqual(tr.current.id, "a1-01", "start A1: the first stop");
    known.e_a1_f01 = true;
    tr = SL.buildTrail(data, st, env);
    assert.strictEqual(tr.current.id, "a1-02");
    st = SL.sanitizeState({ version: 1, start: { level: "C1", source: "test", at: "2026-11-12" } });
    tr = SL.buildTrail(data, st, env);
    assert.strictEqual(tr.current.id, "c1-01", "after a C1 test: the first C1 stop not done");
    const byId = function (id) { return tr.nodes.find(function (n) { return n.id === id; }); };
    assert.deepStrictEqual([byId("a1-02").status, byId("a1-02").via], ["skipped", "start"], "A1 before the start: skipped by the test");
    assert.strictEqual(byId("a1-01").status, "done", "done before the start stays done");
    assert.strictEqual(byId("a2-01").status, "skipped");
    assert.strictEqual(byId("c1-02").status, "open");
    assert.strictEqual(byId("a1-u1-checkpoint").status, "skipped");
    known.e_c1_g01 = true;
    assert.strictEqual(SL.buildTrail(data, st, env).current.id, "c1-02");
    known.e_c1_f01 = true;
    assert.strictEqual(SL.buildTrail(data, st, env).current, null, "everything done: no current stop");
  });
  test("trail: a skipped stop is not current; land and unit progress count only done stops", function () {
    reset();
    const st = SL.emptyState();
    st.stops["a1-01"] = { done: false, via: "skip", at: "2026-11-12" };
    known.e_a1_g05 = true; known.e_a1_g06 = true;                        // a1-02 done
    const tr = SL.buildTrail(data, st, env);
    assert.strictEqual(tr.current.id, "a1-03");
    assert.deepStrictEqual(SL.levelProgress(tr, "A1"), { done: 1, total: 3, percent: 33 });
    assert.deepStrictEqual(SL.levelProgress(tr, "C2"), { done: 0, total: 0, percent: 0 });
    const u = SL.unitProgress(tr, "a1-u1");
    assert.deepStrictEqual([u.done, u.total, u.index, u.count], [1, 3, 1, 1]);
    assert.strictEqual(tr.nodes.find(function (n) { return n.id === "a1-02"; }).number, 2, "stop number in the land");
  });
  test("trail pickReview: questions from the unit's quizzes evenly; fallback: sets → final test → no sources", function () {
    const rng = (function () { let x = 7; return function () { x = (x * 16807) % 2147483647; return x / 2147483647; }; })();
    const mk = function (p, n) { return Array.from({ length: n }, function (_, i) { return { id: p + i }; }); };
    const stops = { "a1-01": stopOf("a1-01"), "a1-02": stopOf("a1-02"), "a1-03": stopOf("a1-03") };
    const rev = stopOf("a1-u1-checkpoint");
    const quiz = { "a1-01": mk("q1-", 4), "a1-02": mk("q2-", 4), "a1-03": [] };
    let r = SL.pickReview(rev, { stops: stops, quizItems: function (id) { return quiz[id]; }, setItems: function () { return []; }, finalItems: function () { return []; } }, rng);
    assert.strictEqual(r.source, "quiz");
    assert.strictEqual(r.items.length, 6);
    assert.strictEqual(new Set(r.items.map(function (x) { return x.id; })).size, 6, "no repeats");
    assert.strictEqual(r.items.filter(function (x) { return /^q1-/.test(x.id); }).length, 3, "evenly from the stops");
    r = SL.pickReview(rev, { stops: stops, quizItems: function () { return []; }, setItems: function (id) { return mk(id + ":", 10); }, finalItems: function () { return []; } }, rng);
    assert.deepStrictEqual([r.source, r.items.length], ["set", 6], "only the stop with a set gives questions from the set");
    r = SL.pickReview(rev, { stops: {}, quizItems: function () { return []; }, setItems: function () { return []; }, finalItems: function (lvl) { return lvl === "A1" ? mk("f", 30) : []; } }, rng);
    assert.deepStrictEqual([r.source, r.items.length], ["final", 6]);
    r = SL.pickReview(rev, { stops: {}, quizItems: function () { return []; }, setItems: function () { return []; }, finalItems: function () { return []; } }, rng);
    assert.deepStrictEqual([r.source, r.items.length], [null, 0], "no sources: the node is skipped");
    const small = SL.pickReview({ id: "r", type: "checkpoint", from: ["a1-01"], size: 6 }, { stops: stops, quizItems: function () { return mk("s", 4); }, setItems: function () { return []; }, finalItems: function () { return []; } }, rng);
    assert.strictEqual(small.items.length, 4, "fewer questions than size: all");
  });
  test("trail effectiveStart: manual and from the test come first, without a test A1", function () {
    const none = SL.emptyState();
    assert.deepStrictEqual([SL.effectiveStart(none, null).level, SL.effectiveStart(none, null).source], ["A1", "default"]);
    assert.deepStrictEqual([SL.effectiveStart(none, "C1").level, SL.effectiveStart(none, "C1").source], ["C1", "test"]);
    const manual = SL.sanitizeState({ version: 1, start: { level: "B1", source: "manual", at: "2026-11-12" } });
    assert.strictEqual(SL.effectiveStart(manual, "C1").level, "B1");
    const def = SL.sanitizeState({ version: 1, start: { level: "A1", source: "default" } });
    assert.strictEqual(SL.effectiveStart(def, "B2").level, "B2", "the default start gives way to the test result");
  });
  test("trail sanitizeState: wrong format and version → exception, junk filtered out, export → import unchanged", function () {
    assert.throws(function () { SL.sanitizeState(null); });
    assert.throws(function () { SL.sanitizeState([]); });
    assert.throws(function () { SL.sanitizeState({ version: 2 }); });
    const s = SL.sanitizeState({
      version: 1,
      start: { level: "Z9", source: "test" },
      stops: { "a1-05": { done: true, via: "quiz", best: 4, at: "2026-11-12T10:00:00Z" }, "BAD ID": { via: "quiz" }, "a1-06": { via: "magic" }, "a1-07": { done: true, via: "skip", best: 99 }, "a1-08": "x" },
      reviews: { "a1-u1-checkpoint": { best: 5, of: 6, at: "2026-11-12" }, "a1-u2-checkpoint": { best: 9, of: 6 }, "a1-u3-checkpoint": {} }
    });
    assert.strictEqual(s.start, null, "unknown start level");
    assert.deepStrictEqual(Object.keys(s.stops).sort(), ["a1-05", "a1-07"]);
    assert.strictEqual(s.stops["a1-05"].best, 4);
    assert.strictEqual(s.stops["a1-07"].done, false, "skip is never “done”");
    assert.strictEqual(s.stops["a1-07"].best, undefined, "best out of range is rejected");
    assert.deepStrictEqual(Object.keys(s.reviews), ["a1-u1-checkpoint"]);
    assert.deepStrictEqual(SL.sanitizeState(JSON.parse(JSON.stringify(s))), s, "export → import unchanged");
    assert.strictEqual(SL.quizAverage(s), 100);
    assert.strictEqual(SL.quizAverage(SL.emptyState()), null);
  });
}

console.log("\nTrail generated from the syllabus (spec 06 E9)");
{
  const fs = require("fs");
  const SL = global.LM.trailLogic;
  const makeTrail = require(path.join(__dirname, "build", "trail.js")).makeTrail;
  const syl = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "content", "syllabus.json"), "utf8"));
  const status = { A1: "available", A2: "soon", B1: "soon", B2: "soon", C1: "soon", C2: "soon" };
  const T = makeTrail(syl, status, { "a1-cases-accusative": true }, { "a1-cases-accusative": ["a1-cases-accusative-1", "x-2"] }, null);
  const a1 = T.levels[0];
  test("trail: one lesson stop per topic in unit order, one checkpoint per unit", function () {
    let topics = 0, lessons = 0, checkpoints = 0;
    syl.levels.forEach(function (l) { l.units.forEach(function (u) { topics += u.topics.length; }); });
    T.levels.forEach(function (lv) { lv.units.forEach(function (u) { u.stops.forEach(function (s) { if (s.type === "lesson") lessons++; else checkpoints++; }); }); });
    assert.strictEqual(lessons, topics);
    assert.strictEqual(checkpoints, syl.levels.reduce(function (n, l) { return n + l.units.length; }, 0));
    assert.deepStrictEqual(a1.units[0].stops.slice(0, -1).map(function (s) { return s.id; }), syl.levels[0].units[0].topics.map(function (t) { return t.id; }));
    assert.deepStrictEqual([a1.level, a1.land, a1.status, a1.finalTest], ["A1", "Meadow", "available", "#/a1/test"]);
    assert.strictEqual(T.levels[2].status, "soon");
  });
  test("trail: lesson stop = topic (page, items, quiz only when the quiz exists, first set); checkpoint from, size", function () {
    const all = []; a1.units.forEach(function (u) { u.stops.forEach(function (s) { all.push(s); }); });
    const acc = all.find(function (s) { return s.id === "a1-cases-accusative"; });
    assert.deepStrictEqual(acc, { id: "a1-cases-accusative", type: "lesson", title: "Accusative: the direct object", page: "a1/cases-accusative", items: ["a1-cases-accusative"], quiz: "a1-cases-accusative", set: "a1-cases-accusative-1" });
    const byc = all.find(function (s) { return s.id === "a1-verbs-byc"; });
    assert.strictEqual(byc.quiz, undefined);
    assert.strictEqual(byc.set, undefined);
    const cp = a1.units[0].stops[a1.units[0].stops.length - 1];
    assert.strictEqual(cp.id, "a1-u1-checkpoint");
    assert.strictEqual(cp.type, "checkpoint");
    assert.deepStrictEqual(cp.from, a1.units[0].stops.slice(0, -1).map(function (s) { return s.id; }));
    assert.strictEqual(cp.size, Math.min(8, 2 * cp.from.length));
  });
  test("trail: overrides rename a stop and change a checkpoint's size; unknown keys are ignored", function () {
    const O = makeTrail(syl, status, {}, {}, { stops: { "a1-verbs-byc": { title: "Być" }, "a1-u1-checkpoint": { size: 3 }, "nope": { title: "x" } } }); // pl-fixture
    const stops = []; O.levels[0].units.forEach(function (u) { u.stops.forEach(function (s) { stops.push(s); }); });
    assert.strictEqual(stops.find(function (s) { return s.id === "a1-verbs-byc"; }).title, "Być"); // pl-fixture
    assert.strictEqual(stops.find(function (s) { return s.id === "a1-u1-checkpoint"; }).size, 3);
  });
  test("trail: ticking a topic passes its stop; quiz never ticks; soon levels are never current", function () {
    const progress = {};
    const env = { isKnown: function (id) { return progress[id] === true; }, setPercent: function () { return null; } };
    let tr = SL.buildTrail(T, SL.emptyState(), env);
    assert.strictEqual(tr.current.id, a1.units[0].stops[0].id);
    progress[a1.units[0].stops[0].id] = true;
    tr = SL.buildTrail(T, SL.emptyState(), env);
    assert.strictEqual(tr.current.id, a1.units[0].stops[1].id);
    const st = SL.emptyState();
    st.stops["a1-cases-accusative"] = { done: true, via: "quiz", best: 4, at: "2026-11-25" };
    assert.strictEqual(SL.statusOf({ id: "a1-cases-accusative", type: "lesson", items: ["a1-cases-accusative"], quiz: "a1-cases-accusative" }, st, env).status, "done");
    assert.strictEqual(progress["a1-cases-accusative"], undefined, "the quiz did not tick the topic");
    a1.units.forEach(function (u) { u.stops.forEach(function (s) { if (s.type === "lesson") progress[s.id] = true; }); });
    tr = SL.buildTrail(T, SL.emptyState(), env);
    assert.strictEqual(tr.current, null, "A1 done, the other levels are soon: no current stop");
    const b1 = SL.sanitizeState({ version: 1, start: { level: "B1", source: "manual", at: "" } });
    assert.strictEqual(SL.buildTrail(T, b1, env).current, null, "start in a soon level: nothing current");
    assert.ok(tr.nodes.filter(function (n) { return n.level === "B1"; }).every(function (n) { return n.soon; }));
  });
}

console.log("\nTrail: the plm.trail.<id> store, export, import, reset (spec v7 13)");
{
  require(path.join(__dirname, "..", "js", "trail-store.js"));
  const SS = global.LM.trailStore, SL = global.LM.trailLogic;
  const key = function (pid) { return "plm.trail." + pid; };
  const clean = function () { SS.clearAll(); ["pa", "pb"].forEach(function (p) { global.localStorage.removeItem(key(p)); }); };

  test("trailStore: saved under the key plm.trail.<id> with version, the quiz keeps the best score, a skip does not overwrite a passed quiz", function () {
    clean();
    activeProfile = "pa";
    assert.strictEqual(SS.recordQuiz("a1-01", 2).done, false);
    assert.strictEqual(SS.recordQuiz("a1-01", 4).done, true);
    assert.strictEqual(SS.recordQuiz("a1-01", 1).best, 4, "a worse attempt does not lower the best");
    assert.strictEqual(SS.skipStop("a1-01"), false, "a stop passed by a quiz cannot be skipped");
    assert.strictEqual(SS.skipStop("a1-02"), true);
    assert.strictEqual(SS.unskipStop("a1-02"), true);
    SS.recordReview("a1-u1-checkpoint", 5, 6);
    assert.strictEqual(SS.recordReview("a1-u1-checkpoint", 3, 6).best, 5);
    assert.strictEqual(SS.setStart("C1", "test"), true);
    assert.strictEqual(SS.setStart("B1", "manual"), true);
    assert.strictEqual(SS.setStart("C2", "test"), false, "a manual start is not overwritten by a test");
    assert.strictEqual(SS.setStart("C2", "test", true), true, "the “Start the trail at X” button forces the start");
    const raw = JSON.parse(global.localStorage.getItem(key("pa")));
    assert.strictEqual(raw.version, 1);
    assert.deepStrictEqual([raw.start.level, raw.stops["a1-01"].best, raw.reviews["a1-u1-checkpoint"].of], ["C2", 4, 6]);
    assert.strictEqual(raw.stops["a1-02"], undefined);
    assert.strictEqual(SS.setStart("Z9", "manual"), false);
    activeProfile = "p1";
  });
  test("trailStore: nothing is saved without a profile (temporary state)", function () {
    clean();
    activeProfile = null;
    assert.strictEqual(SS.recordQuiz("a1-01", 4), null);
    assert.strictEqual(SS.skipStop("a1-01"), false);
    assert.strictEqual(SS.recordReview("r", 1, 6), null);
    assert.deepStrictEqual(SS.exportData(), {});
    activeProfile = "p1";
  });
  test("trailStore: export → reset → import restores the data; a missing part in the file = an error", function () {
    clean();
    activeProfile = "pa"; SS.recordQuiz("a1-03", 3); SS.setStart("B2", "manual");
    activeProfile = "pb"; SS.recordQuiz("a1-04", 4);
    const exported = JSON.parse(JSON.stringify(SS.exportData()));
    assert.deepStrictEqual(Object.keys(exported).sort(), ["pa", "pb"]);
    assert.throws(function () { SS.parseImport(undefined); }, /trail/);
    assert.throws(function () { SS.parseImport(null); }, /trail/);
    // reset
    SS.clearAll();
    assert.strictEqual(global.localStorage.getItem(key("pa")), null);
    assert.strictEqual(global.localStorage.getItem(key("pb")), null);
    // import from a file: only the profiles on the list
    SS.applyImport(SS.parseImport(exported), ["pa"]);
    assert.ok(global.localStorage.getItem(key("pa")));
    assert.strictEqual(global.localStorage.getItem(key("pb")), null, "a profile not on the list is deleted");
    activeProfile = "pa";
    assert.strictEqual(SS.data().stops["a1-03"].best, 3);
    assert.strictEqual(SS.data().start.level, "B2");
    activeProfile = "p1";
  });
  test("trailStore: validation on import (a wrong part → exception), a damaged record → a .corrupt-backup copy and an empty state", function () {
    assert.throws(function () { SS.parseImport("tekst"); });
    assert.throws(function () { SS.parseImport([]); });
    assert.throws(function () { SS.parseImport({ pa: { version: 9 } }); });
    assert.deepStrictEqual(SS.parseImport({}), {});
    clean();
    global.localStorage.setItem(key("pb"), "{niepoprawny json");
    activeProfile = "pb";
    assert.deepStrictEqual(SS.data(), SL.emptyState());
    assert.strictEqual(global.localStorage.getItem(key("pb") + ".corrupt-backup"), "{niepoprawny json");
    global.localStorage.removeItem(key("pb") + ".corrupt-backup");
    activeProfile = "p1";
    clean();
  });
}

console.log("\nFavorite phrases: plm.phrases (pack v6, spec 17)");
test("plm.phrases: the key in KEYS, the star toggles per profile and is saved in localStorage", function () {
  assert.strictEqual(PD.KEYS.phrases, "plm.phrases");
  freshPD();
  assert.deepStrictEqual(PD.starredPhrases(), []);
  assert.strictEqual(PD.togglePhraseStar("opinion-05"), true);
  assert.strictEqual(PD.togglePhraseStar("counterargument-01"), true);
  assert.deepStrictEqual(PD.starredPhrases(), ["opinion-05", "counterargument-01"]);
  assert.strictEqual(PD.togglePhraseStar("opinion-05"), false);
  assert.deepStrictEqual(PD.starredPhrases(), ["counterargument-01"]);
  assert.strictEqual(PD.togglePhraseStar("Bad ID!"), false); // an invalid id is rejected
  assert.deepStrictEqual(JSON.parse(global.localStorage.getItem("plm.phrases")).profiles.p1.starred, ["counterargument-01"]);
  activeProfile = "p2";
  assert.deepStrictEqual(PD.starredPhrases(), []); // another profile has its own favorites
  activeProfile = "p1";
});
test("plm.phrases: export, import (filtering junk and duplicates), profile deletion and reset", function () {
  freshPD();
  PD.togglePhraseStar("opinia-01");
  const exp = JSON.parse(JSON.stringify(PD.exportData()));
  assert.deepStrictEqual(exp.phrases.profiles.p1.starred, ["opinia-01"]);
  const parsed = PD.parseImport({ phrases: { version: 1, profiles: { p1: { starred: ["a-01", "a-01", "BAD", 5, "b-02"] } } } });
  assert.deepStrictEqual(parsed.phrases.profiles.p1.starred, ["a-01", "b-02"]);
  assert.throws(function () { PD.parseImport({ phrases: { version: 99, profiles: {} } }); }, /Unsupported data version/);
  PD.applyImport(parsed, ["p1"]);
  assert.deepStrictEqual(PD.starredPhrases(), ["a-01", "b-02"]);
  PD.applyImport(parsed, ["inny"]);
  assert.deepStrictEqual(PD.starredPhrases(), [], "a profile that is not in the file loses its data");
  PD.togglePhraseStar("c-03");
  PD.clearAll();
  assert.deepStrictEqual(PD.starredPhrases(), []);
  assert.strictEqual(global.localStorage.getItem("plm.phrases"), null);
});

console.log("\nSpeaking trainer: seen in plm.speaking (pack v6, spec 18)");
test("plm.speaking: an old record without seen works, seen is optional, tolerant and in export/import/reset", function () {
  freshPD();
  // an old record (sessions only) normalizes as before, without the seen field
  const old = PD.parseImport({ speaking: { version: 1, profiles: { p1: { sessions: [{ day: "2026-01-02", exam: "exam-b2", part: 1, scores: { gv: 4 } }] } } } });
  assert.deepStrictEqual(old.speaking.profiles.p1, { sessions: [{ day: "2026-01-02", exam: "exam-b2", part: 1, scores: { gv: 4 } }] });
  PD.applyImport(old, ["p1"]);
  assert.deepStrictEqual(PD.speakingSeen("exam-b2:1"), []);
  assert.strictEqual(PD.markSpeakingSeen("exam-b2:1", "p1-home"), true);
  assert.strictEqual(PD.markSpeakingSeen("exam-b2:1", "p1-home"), true); // no duplicates
  assert.strictEqual(PD.markSpeakingSeen("exam-b2:1", "p1-work"), true);
  assert.strictEqual(PD.markSpeakingSeen("bad key", "x"), false);
  assert.strictEqual(PD.markSpeakingSeen("exam-b2:1", "Bad ID"), false);
  assert.deepStrictEqual(PD.speakingSeen("exam-b2:1"), ["p1-home", "p1-work"]);
  assert.strictEqual(PD.speakingSessions("exam-b2").length, 1); // sessions untouched
  const exp = JSON.parse(JSON.stringify(PD.exportData()));
  assert.deepStrictEqual(exp.speaking.profiles.p1.seen, { "exam-b2:1": ["p1-home", "p1-work"] });
  // the import filters out junk
  const parsed = PD.parseImport({ speaking: { version: 1, profiles: { p1: { sessions: [], seen: { "a:1": ["x-1", "x-1", "BAD", 5], "bad": ["x"], "b:2": "not a list" } } } } });
  assert.deepStrictEqual(parsed.speaking.profiles.p1.seen, { "a:1": ["x-1"] });
  // a “Whole exam” session keeps full
  const full = PD.addSpeakingSession({ exam: "matura-podstawowa", part: 1, scores: { komunikacja: 4 }, full: true });
  assert.strictEqual(full.full, true);
  assert.strictEqual(PD.addSpeakingSession({ exam: "matura-podstawowa", part: 2, scores: { zakres: 3 } }).full, undefined);
  // clearing the cycle
  assert.strictEqual(PD.markSpeakingSeen("exam-b2:1", null), true);
  assert.deepStrictEqual(PD.speakingSeen("exam-b2:1"), []);
  PD.markSpeakingSeen("exam-b2:2", "p2-x");
  PD.clearAll();
  assert.strictEqual(global.localStorage.getItem("plm.speaking"), null);
});

console.log("\nExams from the card's tags (pack v6, spec 15)");
test("examsOf: exam codes come from the registry (no list in code); registry order, case does not matter", function () {
  const reg = { exams: [{ id: "exam-demo", code: "DEMO", label: "Demo exam" }, { id: "exam-two", code: "TWO", label: "Second exam" }] };
  const codes = function (tags) { return FL.examsOf({ tags: tags }, reg).map(function (e) { return e.code; }); };
  assert.deepStrictEqual(codes(["vocabulary", "two", "Demo"]), ["demo", "two"]);
  assert.deepStrictEqual(codes(["e8", "matura"]), [], "codes of the original app mean nothing without a registry entry");
  assert.deepStrictEqual(FL.examsOf({ tags: ["demo"] }, reg)[0], { code: "demo", short: "DEMO", name: "Demo exam", id: "exam-demo" });
  assert.deepStrictEqual(FL.examsOf({ tags: ["demo"] }, { exams: [] }), []);
  assert.deepStrictEqual(FL.examsOf({}, reg), []);
  assert.deepStrictEqual(FL.examsOf(null, null), []);
});

console.log("\nMy words (pack v6, spec 14)");
test("wordFromSelection: 1–6 words and up to 60 characters, punctuation edges and {}| removed, no letters → empty", function () {
  assert.strictEqual(FL.wordFromSelection("  commute, "), "commute");
  assert.strictEqual(FL.wordFromSelection("“come up with”."), "come up with");
  assert.strictEqual(FL.wordFromSelection("a b c d e f"), "a b c d e f");
  assert.strictEqual(FL.wordFromSelection("a b c d e f g"), "");
  assert.strictEqual(FL.wordFromSelection("x".repeat(61)), "");
  assert.strictEqual(FL.wordFromSelection("x".repeat(60)), "x".repeat(60));
  assert.strictEqual(FL.wordFromSelection("{{up}}|down"), "up down");
  assert.strictEqual(FL.wordFromSelection("123 ... 45"), "");
  assert.strictEqual(FL.wordFromSelection("don’t"), "don’t");
  assert.strictEqual(FL.wordFromSelection(""), "");
});
test("isTarget (LM.lang.isTarget): 10 Polish and 10 English sentences; diacritics alone decide", function () {
  const T = langFixture("lang").isTarget;
  assert.strictEqual(T.polish.length, 10);
  assert.strictEqual(T.english.length, 10);
  T.polish.forEach(function (x) { assert.ok(FL.isTarget(x), x); });
  T.english.forEach(function (x) { assert.ok(!FL.isTarget(x), x); });
  ["", null, "naïve café", "über"].forEach(function (x) { assert.ok(!FL.isTarget(x), String(x)); });
  assert.strictEqual(FL.isPolish, undefined, "the old meaning (explanation language) is gone");
});
test("My words with Polish text: selection cleaning, word keys keep diacritics", function () {
  const W = langFixture("words");
  W.selection.forEach(function (c) { assert.strictEqual(FL.wordFromSelection(c[0]), c[1], c[0]); });
  W.sameKey.forEach(function (c) { assert.strictEqual(FL.wordKey(c[0]), FL.wordKey(c[1]), c.join(" = ")); });
  W.differentKey.forEach(function (c) { assert.notStrictEqual(FL.wordKey(c[0]), FL.wordKey(c[1]), c.join(" ≠ ")); });
});
test("splitSentences / extractSentence: Polish abbreviations (np., ul., m.in., itd., ok., godz., prof.), numbers, „quotes”, initials", function () { // pl-fixture
  const W = langFixture("words");
  W.extract.forEach(function (c) { assert.strictEqual(FL.extractSentence(W.text, c[0]), c[1], c[0]); });
  // the abbreviation list comes from LM.lang
  assert.ok(global.LM.lang.abbreviations.indexOf("np.") !== -1);
});
test("makeCloze with Polish words: diacritics, hyphens, case from the text, word boundaries", function () {
  langFixture("words").cloze.forEach(function (c) {
    assert.strictEqual(FL.makeCloze(c[0], c[1]), c[2], c[0] + " / " + c[1]);
    if (c[2]) assert.strictEqual(FL.parseCloze(c[2]).ok, true);
  });
});
test("extractSentence: a table cell and a single sentence, case and spaces, the selection not in the text", function () {
  assert.strictEqual(FL.extractSentence("  Commute   to work.  ", "COMMUTE"), "Commute to work.");
  assert.strictEqual(FL.extractSentence("I'm waiting for a bus", "bus"), "I'm waiting for a bus");
  assert.strictEqual(FL.extractSentence("First one. Second one.", "nic"), "First one.");
  assert.strictEqual(FL.extractSentence("", "x"), "");
  assert.strictEqual(FL.extractSentence("She said it’s fine. It is not.", "it's fine"), "She said it’s fine."); // typographic apostrophes
});
test("extractSentence: a sentence longer than 220 characters → a window around the word with “…” on both sides (≤ 220)", function () {
  const mid = ("Many people think that this long sentence goes on and on " .repeat(6)) + "but the commute to work takes ages " + ("and it never seems to end for anybody " .repeat(6)) + "really.";
  const s = FL.extractSentence(mid, "commute");
  assert.ok(s.length <= 220, "length " + s.length);
  assert.ok(/^…/.test(s) && /…$/.test(s), s);
  assert.ok(s.indexOf("commute") !== -1);
  assert.ok(!/…\S/.test(s.slice(1)) && !/\S…/.test(s.slice(0, -1)), "does not cut words: " + s);
  // the word at the start and at the end of a long sentence — “…” on one side only
  const head = "Commute " + "word ".repeat(60) + "end.";
  const hs = FL.extractSentence(head, "Commute");
  assert.ok(hs.length <= 220 && !/^…/.test(hs) && /…$/.test(hs), hs);
  const tail = "word ".repeat(60) + "commute end.";
  const ts = FL.extractSentence(tail, "commute");
  assert.ok(ts.length <= 220 && /^…/.test(ts) && !/…$/.test(ts), ts);
});
test("makeCloze: first occurrence, case from the text, word boundaries, no occurrence → null", function () {
  assert.strictEqual(FL.makeCloze("Most people commute to work. Some commute far.", "commute"), "Most people {{commute}} to work. Some commute far.");
  assert.strictEqual(FL.makeCloze("Commuting is tiring, but Commute is a word.", "commute"), "Commuting is tiring, but {{Commute}} is a word."); // “Commuting” is not “commute”
  assert.strictEqual(FL.makeCloze("She came up with a plan.", "come up with"), null);
  assert.strictEqual(FL.makeCloze("She came up   with a plan.", "came up with"), "She {{came up   with}} a plan.");
  assert.strictEqual(FL.makeCloze("It’s a deal.", "it's"), "{{It’s}} a deal.");
  assert.strictEqual(FL.makeCloze("The cat sat.", "dog"), null);
  assert.strictEqual(FL.makeCloze("Use {{braces}} here.", "braces"), "Use {{braces}} here."); // braces from the sentence removed and the gap added
  assert.strictEqual(FL.parseCloze(FL.makeCloze("Most people commute to work.", "commute")).ok, true);
  assert.strictEqual(FL.makeCloze("Cost: 5% (really)", "(really)"), "Cost: 5% {{(really)}}"); // regex special characters are escaped
});
test("wordKey: dedup by normalize (case, spaces, apostrophes)", function () {
  assert.strictEqual(FL.wordKey(" Commute. "), FL.wordKey("commute"));
  assert.strictEqual(FL.wordKey("Don’t"), FL.wordKey("don't"));
  assert.notStrictEqual(FL.wordKey("commute"), FL.wordKey("commuter"));
});
test("makeWordCard: cloze from the sentence; no occurrence → basic; no sentence; too many words → error; fields word/source/addedAt", function () {
  const a = FL.makeWordCard({ selection: "commute", sentence: "Most people commute to work by train.", source: { route: "#/b1/vocabulary", title: "Vocabulary B1" }, day: "2026-11-03" });
  assert.deepStrictEqual([a.card.type, a.card.text, a.card.word, a.card.addedAt, a.card.source.route], ["cloze", "Most people {{commute}} to work by train.", "commute", "2026-11-03", "#/b1/vocabulary"]);
  const withHint = FL.makeWordCard({ selection: "commute", sentence: "Most people commute to work.", hint: "travel to work" });
  assert.strictEqual(withHint.card.hint, "travel to work");
  const basic = FL.makeWordCard({ selection: "came up with", sentence: "She thought of a plan." });
  assert.deepStrictEqual([basic.card.type, basic.card.front, basic.card.back], ["basic", "came up with", "She thought of a plan."]);
  const none = FL.makeWordCard({ selection: "ephemeral", sentence: "" });
  assert.deepStrictEqual([none.card.type, none.card.front, none.card.back], ["basic", "ephemeral", "—"]);
  assert.ok(FL.makeWordCard({ selection: "a b c d e f g", sentence: "x" }).error);
  assert.ok(FL.makeWordCard({ selection: "", sentence: "x" }).error);
  const bad = FL.makeWordCard({ selection: "x", sentence: "x y", source: { route: "javascript:alert(1)", title: "T" }, day: "tomorrow" });
  assert.deepStrictEqual([bad.card.source, bad.card.addedAt], [{ title: "T" }, undefined]);
});
test("sanitizeState: new card fields (word, source, addedAt, examples) on saving and import, the system deck “words”, an old file without the fields", function () {
  const s = FL.sanitizeState({ version: 1, cards: {}, userDecks: [{ id: "u-moje-slowa", title: "My words", system: "words" }, { id: "u-moje-bledy", title: "My mistakes", system: "mistakes" }, { id: "u-x", title: "X", system: "other" }], userCards: [
    { id: "u-w1", deck: "u-moje-slowa", type: "cloze", text: "Most people {{commute}} to work.", hint: "travel to work", word: "commute".padEnd(80, "x"), source: { route: "#/b1/vocabulary", title: "T".repeat(200) }, addedAt: "2026-11-03", examples: ["a", "  b  ", "", 7, "c", "d", "e".repeat(300)] },
    { id: "u-w2", deck: "u-moje-slowa", type: "basic", front: "x", back: "y", word: 5, source: { route: "http://bad.example", title: "" }, addedAt: "2026-13-40", examples: "not a list" },
    { id: "u-w3", deck: "u-x", type: "basic", front: "old", back: "card" }
  ], settings: {}, daily: {} });
  assert.deepStrictEqual(s.userDecks.map(function (d) { return d.system || null; }), ["words", "mistakes", null]);
  const [w1, w2, w3] = s.userCards;
  assert.strictEqual(w1.word.length, 60);
  assert.deepStrictEqual([w1.source.route, w1.source.title.length, w1.addedAt], ["#/b1/vocabulary", 120, "2026-11-03"]);
  assert.deepStrictEqual(w1.examples, ["a", "b", "c"]); // max. 3, empty and non-text ones rejected
  assert.deepStrictEqual([w2.word, w2.source, w2.addedAt, w2.examples], [undefined, undefined, undefined, undefined]);
  assert.deepStrictEqual(Object.keys(w3).sort(), ["back", "deck", "front", "id", "tags", "type"]); // an old card without the new fields
  assert.strictEqual(FL.sanitizeWordFields({ examples: ["e".repeat(300)] }).examples[0].length, 220);
  // save → read → the same fields (round trip through JSON)
  assert.deepStrictEqual(FL.sanitizeState(JSON.parse(JSON.stringify(s))).userCards[0], w1);
});
test("exportWordsCsv: word; meaning; sentence; source, quotes and semicolons in fields", function () {
  const csv = FL.exportWordsCsv([
    { type: "cloze", text: "Most people {{commute}} to work; by train.", hint: "travel to work", word: "commute", source: { route: "#/b1/vocabulary", title: "Vocabulary B1" } },
    { type: "basic", front: "ephemeral", back: "He said \"hi\"." }
  ]).split("\n");
  assert.strictEqual(csv[0], "word;meaning;sentence;source");
  assert.strictEqual(csv[1], 'commute;travel to work;"Most people commute to work; by train.";Vocabulary B1 (#/b1/vocabulary)');
  assert.strictEqual(csv[2], 'ephemeral;;"He said ""hi"".";');
});

test("examBoxAnchor: exam boxes go after the explanation of a topic page (spec 07 §1 headings)", function () {
  const EL = global.LM.examLogic;
  const fs = require("fs");
  const MIST = global.LM.APP.mistakesHeading;
  // the ## headings of the example page content/pages/a1/cases-accusative.md
  const page = fs.readFileSync(path.join(__dirname, "..", "content", "pages", "a1", "cases-accusative.md"), "utf8");
  const titles = (page.match(/^## .+$/gm) || []).map(function (h) { return h.slice(3).trim(); });
  const i = EL.examBoxAnchorIndex(titles, MIST);
  assert.strictEqual(titles[i], MIST, JSON.stringify(titles));
  assert.ok(i > 0, "after the explanation, not at the top");
  assert.strictEqual(EL.examBoxAnchorIndex(["How it works", "Real life vs exam", MIST, "Practice"], MIST), 1);
  assert.strictEqual(EL.examBoxAnchorIndex(["How it works", "Examples", "Practice", "Answers"], MIST), 2);
  assert.strictEqual(EL.examBoxAnchorIndex(["How it works", "Examples", "Answers"], MIST), 2);
  assert.strictEqual(EL.examBoxAnchorIndex(["How it works", "Examples"], MIST), -1);
});

test("countWritingWords: the language counter, without the given opening when it was copied", function () {
  const EL = global.LM.examLogic;
  const count = function (t) { return t ? t.split(/\s+/).length : 0; };
  assert.strictEqual(EL.countWritingWords("Dear Anna, thanks for the letter.", "", count), 6);
  assert.strictEqual(EL.countWritingWords("Dear Anna, thanks for the letter.", "Dear Anna,", count), 4);
  assert.strictEqual(EL.countWritingWords("  ", "", count), 0);
  assert.strictEqual(EL.countWritingWords("Cześć :) ---", ""), 1, "default count skips tokens without letters or digits"); // pl-fixture
});

test("myExams: date, finished set, unpinned, pinned, date in the past (all exams alike, no special C1 store)", function () {
  const EL = global.LM.examLogic;
  const registry = { exams: [
    { id: "e8", status: "active", setIds: ["e8-1", "e8-2"] },
    { id: "mp", status: "active", setIds: ["mp-1"] },
    { id: "mr", status: "active", setIds: [] },
    { id: "soon", status: "soon", setIds: [] },
    { id: "c1", status: "active", setIds: ["c1-a", "c1-b"] }
  ] };
  const today = "2026-10-30";
  function run(input) { return EL.myExams(EL.examMyState(Object.assign({ registry: registry, examsRecord: { exams: {} }, isSetDone: function () { return false; } }, input)), registry, today); }
  assert.deepStrictEqual(run({}), [], "without data nothing is mine");
  // data
  assert.deepStrictEqual(run({ examsRecord: { exams: { mp: { examDate: "2027-05-06" } } } }), [{ id: "mp", reason: "date", days: 188 }]);
  // a set
  assert.deepStrictEqual(run({ isSetDone: function (id) { return id === "e8-2"; } }), [{ id: "e8", reason: "sets", days: null }]);
  // unpinned by hand (a date and a set are not enough)
  assert.deepStrictEqual(run({ examsRecord: { exams: { mp: { examDate: "2027-05-06" } }, my: { mp: "hidden" } } }), []);
  // pinned without a date and sets; a “soon” exam never
  assert.deepStrictEqual(run({ examsRecord: { exams: {}, my: { mr: "pinned", soon: "pinned" } } }), [{ id: "mr", reason: "pinned", days: null }]);
  // a date in the past: still mine, after the future ones, before exams without a date
  const mixed = run({
    examsRecord: { exams: { e8: { examDate: "2026-10-27" }, mp: { examDate: "2027-05-06" }, c1: { examDate: "2027-01-10" } }, my: { mr: "pinned" } }
  });
  assert.deepStrictEqual(mixed.map(function (x) { return x.id; }), ["c1", "mp", "e8", "mr"]);
  assert.strictEqual(mixed[2].days, -3);
  assert.deepStrictEqual(run({ examsRecord: { exams: { c1: { examDate: "2026-10-31" } } } }), [{ id: "c1", reason: "date", days: 1 }]);
  assert.deepStrictEqual(run({ isSetDone: function (id) { return id === "c1-b"; } }), [{ id: "c1", reason: "sets", days: null }]);
});

test("formatDateLong and daysBetween", function () {
  const EL = global.LM.examLogic;
  assert.strictEqual(EL.formatDateLong("2027-05-06"), "Thursday, May 6, 2027");
  assert.strictEqual(EL.formatDateLong("2027-05-12"), "Wednesday, May 12, 2027");
  assert.strictEqual(EL.formatDateLong("bad"), "");
  assert.strictEqual(EL.daysBetween("2026-11-01", "2026-10-30"), 2);
  assert.strictEqual(EL.daysBetween("2026-10-29", "2026-10-30"), -1);
});

test("navSplit: only mine + the rest in “+N”, the current exam stays, none of mine = all", function () {
  const EL = global.LM.examLogic;
  const reg = { exams: [{ id: "e8" }, { id: "mp" }, { id: "mr" }, { id: "b2" }, { id: "c1" }] };
  assert.deepStrictEqual(EL.navSplit(reg, ["c1", "mp"]), { shown: ["c1", "mp"], hidden: ["e8", "mr", "b2"] });
  assert.deepStrictEqual(EL.navSplit(reg, ["c1"], "b2"), { shown: ["c1", "b2"], hidden: ["e8", "mp", "mr"] });
  assert.deepStrictEqual(EL.navSplit(reg, ["c1"], "c1").shown, ["c1"]);
  assert.deepStrictEqual(EL.navSplit(reg, []), { shown: ["e8", "mp", "mr", "b2", "c1"], hidden: [] });
  assert.strictEqual(EL.navSplit(reg, ["x"]).hidden.length, 5);
});

console.log("\nReviews v8: the Flashcards and mistakes queue (spec 20, R2)");
require(path.join(__dirname, "..", "js", "review-queue.js"));
(function () {
  const R = global.LM.reviewQueue;
  const FLg = global.LM.cardsLogic;
  const HM = global.LM.cardsSchedule;
  const DAYMS = 86400000;
  const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime(); // 10.11.2026, 12:00
  const at = function (d, h, m) { return new Date(2026, 10, d, h, m || 0, 0).getTime(); };
  const rev = function (due, interval) { return Object.assign(HM.newCard(), { state: "review", interval: interval || 3, due: due, reps: 2 }); };

  // decks: d1 (4 cards), d2 (3 cards), “My mistakes” (3 user cards)
  function makeCtx(over) {
    const st = FLg.sanitizeState(FLg.emptyState());
    st.settings.enabledDecks = ["d1", "d2"];
    const userCards = ["u-mb-1", "u-mb-2", "u-mb-3"].map(function (id) { return { id: id, deck: "u-moje-bledy", type: "basic", front: "a", back: "b", tags: [] }; });
    st.userDecks.push({ id: "u-moje-bledy", title: "My mistakes", system: "mistakes" });
    st.userCards = userCards;
    const decks = [{ id: "d1", count: 4 }, { id: "d2", count: 3 }, { id: "u-moje-bledy", count: 3 }];
    const cards = { d1: [1, 2, 3, 4].map(function (i) { return { id: "d1-00" + i, deck: "d1" }; }), d2: [1, 2, 3].map(function (i) { return { id: "d2-00" + i, deck: "d2" }; }), "u-moje-bledy": userCards };
    const ctx = Object.assign({
      state: st, decks: decks, weak: [],
      cardsOf: function (id) { return cards[id] || []; },
      deckOf: function (id) { return /^u-mb/.test(id) ? "u-moje-bledy" : id.replace(/-\d{3}$/, ""); }
    }, over || {});
    return ctx;
  }
  const ids = function (q) { return q.map(function (x) { return x.id; }); };

  test("queue: empty when there are no cards to do (new limit 0)", function () {
    const ctx = makeCtx();
    ctx.state.settings.newPerDay = 0;
    assert.deepStrictEqual(R.queueFrom(ctx, NOW), []);
    const zero = R.summaryFrom(ctx, NOW);
    assert.deepStrictEqual([zero.card, zero.mistake, zero.exercise, zero.total, zero.due.total, zero.fresh.total], [0, 0, 0, 0, 0, 0]);
  });
  test("queue: overdue oldest first, new last, kinds: card / mistake / item", function () {
    const ctx = makeCtx({ weak: [{ id: "a1-x-1", topic: "t1" }] });
    ctx.state.settings.newPerDay = 2;
    ctx.state.cards["d1-001"] = rev(at(9, 5));            // a day overdue
    ctx.state.cards["u-mb-1"] = rev(at(5, 5));            // najstarsza
    ctx.state.cards["ex:a1-x-2"] = rev(at(8, 5));         // an item
    ctx.state.cards["d2-001"] = rev(at(10, 5));           // this morning
    ctx.state.cards["d2-002"] = rev(at(12, 5));           // the day after tomorrow: outside the day
    const q = R.queueFrom(ctx, NOW);
    assert.strictEqual(q[0].id, "u-mb-1", "the oldest overdue first");
    assert.strictEqual(ids(q).indexOf("d2-002"), -1);
    assert.deepStrictEqual(q.slice(0, 4).map(function (x) { return x.kind; }).sort(), ["card", "card", "exercise", "mistake"]);
    assert.ok(q.slice(4).every(function (x) { return x.due === 0; }), "new last");
    assert.strictEqual(q.length, 6, "4 overdue + 2 new (limit)");
  });
  test("queue: interleaving — at most 2 of the same kind and not the same topic in a row", function () {
    const items = [];
    for (let i = 0; i < 4; i++) items.push({ kind: "card", id: "c" + i, due: i, topic: "d1" });
    for (let i = 0; i < 3; i++) items.push({ kind: "mistake", id: "m" + i, due: 10 + i, topic: "u-moje-bledy" });
    items.push({ kind: "exercise", id: "e0", due: 20, topic: "t1" }, { kind: "card", id: "c9", due: 21, topic: "d2" });
    const out = R.interleave(items);
    assert.strictEqual(out.length, items.length);
    for (let i = 1; i < out.length; i++) assert.notStrictEqual(out[i].topic, out[i - 1].topic, "same topic in a row at " + i);
    for (let i = 2; i < out.length; i++) assert.ok(!(out[i].kind === out[i - 1].kind && out[i].kind === out[i - 2].kind), "third of a kind in a row at " + i);
  });
  test("queue: the daily review limit is shared by cards, mistakes and items (the oldest stay)", function () {
    const ctx = makeCtx();
    ctx.state.settings.reviewsPerDay = 3;
    ctx.state.settings.newPerDay = 0;
    ctx.state.cards["d1-001"] = rev(at(9, 5));
    ctx.state.cards["d1-002"] = rev(at(8, 5));
    ctx.state.cards["u-mb-1"] = rev(at(7, 5));
    ctx.state.cards["ex:a1-x-9"] = rev(at(6, 5));
    ctx.state.cards["d2-001"] = rev(at(5, 5));
    const q = R.queueFrom(ctx, NOW);
    assert.deepStrictEqual(ids(q).sort(), ["d2-001", "ex:a1-x-9", "u-mb-1"].sort());
    ctx.state.daily["2026-11-10"] = { new: 0, reviews: 2, again: 0, good: 0, answers: 2, minutes: 0 };
    assert.strictEqual(R.queueFrom(ctx, NOW).length, 1);
  });
  test("queue: new limit 10 a day, of which at most 3 new weak-spot items", function () {
    const weak = [1, 2, 3, 4, 5].map(function (i) { return { id: "w-" + i, topic: "t" + i }; });
    const ctx = makeCtx({ weak: weak });
    let q = R.queueFrom(ctx, NOW);
    assert.strictEqual(q.filter(function (x) { return x.kind === "exercise"; }).length, 3);
    assert.strictEqual(q.length, 10, "10 new: 7 cards and 3 items");
    assert.strictEqual(q[q.length - 1].kind === "exercise" || q[q.length - 2].kind === "exercise", true);
    ctx.state.daily["2026-11-10"] = { new: 2, reviews: 0, again: 0, good: 0, answers: 2, minutes: 0, exNew: 2 };
    q = R.queueFrom(ctx, NOW);
    assert.strictEqual(q.filter(function (x) { return x.kind === "exercise"; }).length, 1, "3 − 2 = 1 left");
    assert.strictEqual(q.length, 8, "new limit 10 − 2 done");
  });
  test("queue: the 04:00 day boundary — a card due after midnight but before 04:00 belongs to today's learning day", function () {
    const ctx = makeCtx();
    ctx.state.settings.newPerDay = 0;
    ctx.state.cards["d1-001"] = rev(at(11, 2, 0));   // tomorrow 02:00
    ctx.state.cards["d1-002"] = rev(at(11, 5, 0));   // tomorrow 05:00
    assert.deepStrictEqual(ids(R.queueFrom(ctx, at(10, 23, 0))), ["d1-001"]);
    assert.deepStrictEqual(ids(R.queueFrom(ctx, at(11, 1, 0))), ["d1-001"], "01:00 is still the learning day of Nov 10");
    assert.deepStrictEqual(ids(R.queueFrom(ctx, at(11, 6, 0))).sort(), ["d1-001", "d1-002"], "after 04:00 both are for today (the learning day ends Nov 12 04:00)");
  });
  test("queue: a turned-off deck is skipped, “My mistakes” is always in the queue, suspended and buried are skipped", function () {
    const ctx = makeCtx();
    ctx.state.settings.newPerDay = 0;
    ctx.state.settings.enabledDecks = ["d1"];
    ctx.state.cards["d2-001"] = rev(at(9, 5));
    ctx.state.cards["u-mb-2"] = rev(at(9, 5));
    ctx.state.cards["d1-001"] = Object.assign(rev(at(9, 5)), { suspended: true });
    ctx.state.cards["d1-002"] = Object.assign(rev(at(9, 5)), { buriedUntil: NOW + 3600000 });
    assert.deepStrictEqual(ids(R.queueFrom(ctx, NOW)), ["u-mb-2"]);
  });
  test("count / breakdown (summaryFrom) match the length and kinds of the queue", function () {
    const ctx = makeCtx({ weak: [{ id: "w1", topic: "t1" }, { id: "w2", topic: "t2" }] });
    ctx.state.settings.newPerDay = 5;
    ctx.state.cards["d1-001"] = rev(at(9, 5));
    ctx.state.cards["d2-001"] = Object.assign(HM.newCard(), { state: "learning", due: NOW - 1000 });
    ctx.state.cards["u-mb-1"] = rev(at(8, 5));
    ctx.state.cards["ex:old-1"] = rev(at(7, 5));
    const q = R.queueFrom(ctx, NOW), s = R.summaryFrom(ctx, NOW);
    assert.strictEqual(s.total, q.length);
    ["card", "mistake", "exercise"].forEach(function (k) { assert.strictEqual(s[k], q.filter(function (x) { return x.kind === k; }).length, k); });
  });
  test("P3: new cards are not “to review” — a fresh profile: 0 to review, 10 new; overdue separately", function () {
    const ctx = makeCtx();
    ctx.state.settings.newPerDay = 10;
    const fresh = R.summaryFrom(ctx, NOW);
    assert.deepStrictEqual([fresh.due.total, fresh.fresh.total, fresh.total], [0, 10, 10], "fresh profile");
    ctx.state.cards["d1-001"] = rev(at(9, 5));                                                    // review, due yesterday
    ctx.state.cards["d2-001"] = Object.assign(HM.newCard(), { state: "learning", due: NOW - 1000 }); // learning, due date passed
    ctx.state.cards["u-mb-1"] = rev(at(8, 5));                                                    // overdue mistake
    ctx.state.cards["d1-002"] = rev(at(20, 5), 8);                                                // review in 10 days: neither overdue nor new
    const s = R.summaryFrom(ctx, NOW);
    assert.deepStrictEqual([s.due.card, s.due.mistake, s.due.exercise, s.due.total], [2, 1, 0, 3]);
    assert.strictEqual(s.fresh.total, 6, "new: 10 cards in the decks minus 4 with a saved state");
    assert.strictEqual(s.total, s.due.total + s.fresh.total, "total = the whole day queue");
    assert.strictEqual(R.queueFrom(ctx, NOW).length, s.total);
    ctx.state.settings.newPerDay = 0;
    assert.deepStrictEqual([R.summaryFrom(ctx, NOW).due.total, R.summaryFrom(ctx, NOW).fresh.total], [3, 0]);
  });
  test("P3 regression: a card rated “Good” with an 8 d interval does not come back to the queue for 7 days (04:00 day boundary)", function () {
    const ctx = makeCtx();
    ctx.state.settings.newPerDay = 0;
    const base = Object.assign(HM.newCard(), { state: "review", interval: 3, due: NOW, reps: 3 });
    const pv = HM.preview(base, NOW).good;
    assert.strictEqual(pv.card.interval, 8, "preview: Good = 8 d");
    const rated = HM.schedule(base, "good", NOW, null, { fuzz: true, random: function () { return 0; } }); // also with the spread
    assert.strictEqual(rated.interval, 8);
    ctx.state.cards["d1-001"] = rated;
    for (let day = 0; day <= 7; day++) {
      [at(10 + day, 5), at(10 + day, 12), at(10 + day, 23, 59)].forEach(function (t) {
        if (t < NOW) return;
        assert.deepStrictEqual(ids(R.queueFrom(ctx, t)), [], "day +" + day + " (" + new Date(t).toISOString() + "): the card should not come back");
        assert.strictEqual(R.summaryFrom(ctx, t).due.total, 0);
      });
    }
    assert.deepStrictEqual(ids(R.queueFrom(ctx, at(18, 10))), ["d1-001"], "it comes back on day 8");
  });
  test("estimateMinutes: card 0.3, mistake 0.5, item 0.7 min (rounded, min. 1 when there is something)", function () {
    assert.strictEqual(R.estimateMinutes({ card: 10, mistake: 0, exercise: 0 }), 3);
    assert.strictEqual(R.estimateMinutes({ card: 11, mistake: 4, exercise: 3 }), 7);
    assert.strictEqual(R.estimateMinutes({ card: 1, mistake: 0, exercise: 0 }), 1);
    assert.strictEqual(R.estimateMinutes({ card: 0, mistake: 0, exercise: 0 }), 0);
  });
  test("weakTasks: wrong items from weak topics without a correct answer in 14 days; dictations skipped without a voice", function () {
    const row = function (id, topic, ok, day, type) { return { itemId: id, topic: topic, correct: ok, day: day, type: type || "gap-fill" }; };
    const items = [];
    for (let i = 0; i < 6; i++) items.push(row("t-" + i, "slaby", false, "2026-11-0" + (i % 5 + 1)));
    items.push(row("solved", "slaby", false, "2026-11-01"), row("solved", "slaby", true, "2026-11-09"));
    items.push(row("dyk", "slaby", false, "2026-11-08", "dictation"));
    for (let i = 0; i < 6; i++) items.push(row("ok-" + i, "dobry", i < 5, "2026-11-05"));
    const rec = { items: items, aggregates: {} };
    global.LM.learn.today = function () { return "2026-11-10"; };
    const all = R.weakTasks(rec, "2026-11-10");
    assert.ok(all.every(function (w) { return w.topic === "slaby"; }));
    assert.ok(all.some(function (w) { return w.id === "dyk"; }));
    assert.ok(!all.some(function (w) { return w.id === "solved"; }), "answered correctly in 14 days");
    assert.ok(!R.weakTasks(rec, "2026-11-10", { noVoice: true }).some(function (w) { return w.id === "dyk"; }));
    assert.deepStrictEqual(R.weakTasks({ items: [], aggregates: {} }, "2026-11-10"), []);
  });
})();

console.log("\nToday v8: map covered and the nearest review dates (spec 20, D)");
(function () {
  const L2 = global.LM.learn;
  const R = global.LM.reviewQueue;
  const FLg = global.LM.cardsLogic;
  const HM = global.LM.cardsSchedule;
  const lv = function (arr) { return arr.map(function (p, i) { return { id: ["A1", "A2", "B1", "B2", "C1", "C2"][i], percent: p }; }); };

  test("mapProgress: the average of the 6 levels' percentages (rounded) and the bar parts", function () {
    const m = L2.mapProgress(lv([100, 100, 46, 0, 0, 0]));
    assert.strictEqual(m.percent, 41);
    assert.deepStrictEqual(m.segments.map(function (s) { return s.percent; }), [100, 100, 46, 0, 0, 0]);
    assert.strictEqual(m.segments.length, 6);
    assert.strictEqual(m.segments[2].id, "B1");
  });
  test("mapProgress: a new profile 0%, the whole map 100%, rounding", function () {
    assert.strictEqual(L2.mapProgress(lv([0, 0, 0, 0, 0, 0])).percent, 0);
    assert.strictEqual(L2.mapProgress(lv([100, 100, 100, 100, 100, 100])).percent, 100);
    assert.strictEqual(L2.mapProgress(lv([1, 0, 0, 0, 0, 0])).percent, 0, "1/6 = 0,17 → 0");
    assert.strictEqual(L2.mapProgress(lv([50, 0, 0, 0, 0, 0])).percent, 8, "50/6 = 8,3 → 8");
    assert.strictEqual(L2.mapProgress(lv([100, 0, 0, 0, 0, 0])).percent, 17, "100/6 = 16,7 → 17");
  });
  test("mapProgress: out-of-range values clamped, an empty list and NaN are 0", function () {
    const m = L2.mapProgress(lv([150, -20, NaN, 0, 0, 0]));
    assert.deepStrictEqual(m.segments.map(function (s) { return s.percent; }), [100, 0, 0, 0, 0, 0]);
    assert.strictEqual(m.percent, 17);
    assert.deepStrictEqual(L2.mapProgress([]), { percent: 0, segments: [] });
    assert.strictEqual(L2.mapProgress(undefined).percent, 0);
  });

  test("upcomingFrom: the nearest due date and the number of items for tomorrow (04:00 day boundary)", function () {
    const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime();
    const at = function (d, h) { return new Date(2026, 10, d, h, 0, 0).getTime(); };
    const st = FLg.sanitizeState(FLg.emptyState());
    st.settings.enabledDecks = ["d1"];
    const rev = function (due) { return Object.assign(HM.newCard(), { state: "review", interval: 3, due: due, reps: 2 }); };
    st.cards["d1-001"] = rev(at(11, 9));          // tomorrow
    st.cards["d1-002"] = rev(at(11, 20));         // tomorrow
    st.cards["ex:a-1"] = rev(at(11, 6));          // tomorrow (an item)
    st.cards["d1-003"] = rev(at(13, 9));          // za 3 dni
    st.cards["d2-001"] = rev(at(11, 9));          // a turned-off deck: skipped
    st.cards["d1-004"] = rev(at(10, 9));          // this morning (already passed): not “next”
    const ctx = { state: st, decks: [{ id: "d1", count: 4 }, { id: "d2", count: 1 }], deckOf: function (id) { return id.replace(/-\d{3}$/, ""); } };
    const u = R.upcomingFrom(ctx, NOW);
    assert.strictEqual(u.next, at(11, 6));
    assert.strictEqual(u.tomorrow, 3);
    assert.deepStrictEqual(R.upcomingFrom({ state: FLg.sanitizeState(FLg.emptyState()), decks: [], deckOf: function () { return null; } }, NOW), { next: null, tomorrow: 0 });
  });
})();

console.log("\nContent v8: topic neighbours (S2)");
test("topicNeighbors: previous and next in the level order, edges and an unknown topic", function () {
  const ids = ["a", "b", "c"];
  assert.deepStrictEqual(global.LM.learn.topicNeighbors(ids, "b"), { prev: "a", next: "c" });
  assert.deepStrictEqual(global.LM.learn.topicNeighbors(ids, "a"), { prev: null, next: "b" });
  assert.deepStrictEqual(global.LM.learn.topicNeighbors(ids, "c"), { prev: "b", next: null });
  assert.deepStrictEqual(global.LM.learn.topicNeighbors(ids, "x"), { prev: null, next: null });
  assert.deepStrictEqual(global.LM.learn.topicNeighbors(["a"], "a"), { prev: null, next: null });
  assert.deepStrictEqual(global.LM.learn.topicNeighbors(undefined, "a"), { prev: null, next: null });
});

console.log("\nContent v8: the set label in the level list (S4)");
test("bestSetLabel: the topic's best set, the 80% threshold (dot), no results = null", function () {
  const f = global.LM.exLogic.bestSetLabel;
  assert.deepStrictEqual(f([{ score: 8, total: 10 }]), { score: 8, total: 10, high: true, text: "set 8/10" });
  assert.strictEqual(f([{ score: 7, total: 10 }]).high, false);
  assert.strictEqual(f([{ score: 7, total: 10 }, { score: 5, total: 5 }]).text, "set 5/5", "the higher percentage wins");
  assert.strictEqual(f([{ score: 5, total: 5 }, { score: 10, total: 10 }]).text, "set 10/10", "tie: more points");
  assert.strictEqual(f([null, undefined, { score: 3, total: 0 }]), null);
  assert.strictEqual(f([]), null);
  assert.strictEqual(f(undefined), null);
  assert.strictEqual(f([{ score: 0, total: 6 }]).text, "set 0/6");
});

console.log("\nContent v8: listening to the sentence with the S key (S5)");
test("speechText: a gap as a pause before checking, the answer after checking (choice, gap filling, transformation)", function () {
  const f = global.LM.exLogic.speechText;
  const mc = { type: "multiple-choice", prompt: "My brother ___ football every Saturday.", options: ["play", "plays", "playing"], correct: 1 };
  assert.strictEqual(f(mc, false), "My brother … football every Saturday.");
  assert.strictEqual(f(mc, true), "My brother plays football every Saturday.");
  const gf = { type: "gap-fill", text: "She {{1}} to school and {{2}} home.", gaps: [{ accepted: ["goes"] }, { accepted: ["comes", "walks"] }] };
  assert.strictEqual(f(gf, false), "She … to school and … home.");
  assert.strictEqual(f(gf, true), "She goes to school and comes home.");
  const tr = { type: "transformation", before: "I wish I", after: "more time.", answers: ["had"] };
  assert.strictEqual(f(tr, false), "I wish I … more time.");
  assert.strictEqual(f(tr, true), "I wish I had more time.");
  const sa = { type: "short-answer", prompt: "A: Where is Tom?\nB: He ___ at home.", accepted: ["is"] };
  assert.strictEqual(f(sa, false), "Where is Tom? He … at home.", "speaker labels are not read");
});
test("speechText: put in order and translate only after checking, match pairs and dictation without a sentence, find the mistake: the whole sentence", function () {
  const f = global.LM.exLogic.speechText;
  assert.strictEqual(f({ type: "reorder", answers: ["She likes tea."] }, false), "");
  assert.strictEqual(f({ type: "reorder", answers: ["She likes tea."] }, true), "She likes tea.");
  assert.strictEqual(f({ type: "translate", accepted: ["I am tired."] }, false), "");
  assert.strictEqual(f({ type: "translate", accepted: ["I am tired."] }, true), "I am tired.");
  assert.strictEqual(f({ type: "find-error", tokens: ["He", "go", "home", "."] }, false), "He go home.");
  assert.strictEqual(f({ type: "match", pairs: [["a", "b"]] }, true), "");
  assert.strictEqual(f({ type: "dictation", text: "x" }, false), "");
  assert.strictEqual(f(null, false), "");
  assert.strictEqual(f({ type: "multiple-choice", prompt: "Which is correct?", options: ["a", "b"], correct: 0 }, false), "Which is correct?", "a question without a gap is read in full");
});

console.log("\nCheck v8: queue interleaving (fixes after the review)");
test("interleave: when the kinds cannot be separated, still not the same topic twice in a row", function () {
  const R = global.LM.reviewQueue;
  const items = [];
  for (let i = 0; i < 6; i++) items.push({ kind: "card", id: "a" + i, due: i, topic: "d1" });
  for (let i = 0; i < 6; i++) items.push({ kind: "card", id: "b" + i, due: 10 + i, topic: "d2" });
  const out = R.interleave(items);
  assert.strictEqual(out.length, 12);
  for (let i = 1; i < out.length; i++) assert.notStrictEqual(out[i].topic, out[i - 1].topic, "same topic in a row at " + i);
});
test("queueFrom: four overdue mistakes in a row separated by new cards and items (≤ 2 of the same kind)", function () {
  const R = global.LM.reviewQueue, FLg = global.LM.cardsLogic, HM = global.LM.cardsSchedule;
  const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime();
  const st = FLg.sanitizeState(FLg.emptyState());
  st.settings.enabledDecks = ["d1", "d2"];
  const mist = [1, 2, 3, 4].map(function (i) { return { id: "u-mb-" + i, deck: "u-moje-bledy", type: "basic", front: "a", back: "b", tags: [] }; });
  st.userDecks.push({ id: "u-moje-bledy", title: "My mistakes", system: "mistakes" });
  st.userCards = mist;
  mist.forEach(function (m, i) { st.cards[m.id] = Object.assign(HM.newCard(), { state: "review", interval: 3, due: new Date(2026, 10, 5 + i, 5).getTime(), reps: 2 }); });
  const cards = { d1: [1, 2, 3, 4, 5].map(function (i) { return { id: "d1-00" + i, deck: "d1" }; }), d2: [1, 2, 3, 4, 5].map(function (i) { return { id: "d2-00" + i, deck: "d2" }; }), "u-moje-bledy": mist };
  const ctx = { state: st, decks: [{ id: "d1", count: 5 }, { id: "d2", count: 5 }, { id: "u-moje-bledy", count: 4 }], weak: [],
    cardsOf: function (id) { return cards[id] || []; }, deckOf: function (id) { return /^u-mb/.test(id) ? "u-moje-bledy" : id.replace(/-\d{3}$/, ""); } };
  const q = R.queueFrom(ctx, NOW);
  assert.strictEqual(q.length, 14, "4 overdue + 10 new");
  for (let i = 2; i < q.length; i++) assert.ok(!(q[i].kind === q[i - 1].kind && q[i].kind === q[i - 2].kind && q[i].kind === "mistake"), "third mistake in a row at " + i);
  for (let i = 1; i < q.length; i++) assert.notStrictEqual(q[i].topic, q[i - 1].topic, "same topic in a row at " + i);
  assert.strictEqual(q[0].id, "u-mb-1", "the oldest overdue still first");
  assert.strictEqual(R.summaryFrom(ctx, NOW).total, q.length);
});

test("interleave: random lists — when separating topics is possible (no topic > half), never the same topic in a row", function () {
  const R = global.LM.reviewQueue;
  let seed = 12345;
  const rnd = function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let trial = 0; trial < 300; trial++) {
    const n = 2 + Math.floor(rnd() * 40), topics = 1 + Math.floor(rnd() * 4);
    const items = [];
    for (let i = 0; i < n; i++) items.push({ kind: ["card", "mistake", "exercise"][Math.floor(rnd() * 3)], id: "x" + i, due: i, topic: "t" + Math.floor(rnd() * topics) });
    const counts = {};
    items.forEach(function (it) { counts[it.topic] = (counts[it.topic] || 0) + 1; });
    const feasible = Object.keys(counts).every(function (t) { return counts[t] <= Math.ceil(n / 2); });
    const out = R.interleave(items);
    assert.strictEqual(out.length, n);
    if (!feasible) continue;
    for (let i = 1; i < out.length; i++) assert.notStrictEqual(out[i].topic, out[i - 1].topic, "trial " + trial + ", position " + i);
  }
});

console.log("\n“My mistakes” cards: the full context and the item's hint (fix after v8)");
require(path.join(__dirname, "..", "js", "mistake-task.js"));
(function () {
  const FLg = global.LM.cardsLogic, MT = global.LM.mistakeTask, HM = global.LM.cardsSchedule;
  const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime();
  const entry = function (id, over) { return Object.assign({ id: id, createdAt: "2026-11-01", context: "", myAnswer: "x", correct: "", rule: "rule", source: "", category: "Use of English", itemId: "", ref: "", review: { stage: 1, due: "2026-11-12", mastered: false } }, over || {}); };
  const wf = entry("err-wf", { ref: "c1:uoe-p3-1:2", context: "Many teachers also welcome the _____ in time spent marking homework.\nBase word: REDUCE", correct: "reduction" });
  const abcd = entry("err-abcd", { ref: "c1:uoe-p1-4:1", context: "Few people would have predicted that vinyl records would _____ a comeback.\nA – make, B – take, C – pull, D – reach", correct: "A – make" });
  const tr = entry("err-tr", { ref: "ex:a2-transf-1-03", context: "Wish for more time\nWISH\nI wish I ___ more time.", correct: "I wish I had more time." });
  const bracket = entry("err-br", { ref: "ex:a1-verbs-present-1-05", context: "She ___ (go) to school every day.", correct: "goes" });
  const manual = entry("err-man", { context: "How do you say: long ago?\nHint: ago", correct: "a long time ago" });

  test("journalCard: word formation — the front has the base word next to the gap (the whole context, the gap in its own line)", function () {
    const c = FLg.journalCard(wf);
    assert.strictEqual(c.type, "cloze");
    assert.ok(/Many teachers also welcome the \{\{reduction\}\} in time/.test(c.text));
    assert.ok(/\nBase word: REDUCE$/.test(c.text), "the base word in its own line: " + JSON.stringify(c.text));
    const p = FLg.parseCloze(c.text);
    assert.ok(p.ok && p.answers[0] === "reduction" && /Base word: REDUCE/.test(p.after));
  });
  test("journalCard: choice A–D — the options on the front, the answer accepted as “A – make”, “make” and “A”", function () {
    const c = FLg.journalCard(abcd);
    assert.strictEqual(c.type, "cloze");
    assert.ok(/A – make, B – take, C – pull, D – reach/.test(c.text));
    const p = FLg.parseCloze(c.text);
    assert.deepStrictEqual(p.answers, ["A – make", "make", "A"]);
    assert.ok(/^Few people would have predicted that vinyl records would \{\{/.test(c.text));
  });
  test("journalCard: transformation — the key word on the front, the answer is the gap only (no repeated part of the sentence)", function () {
    const c = FLg.journalCard(tr);
    assert.strictEqual(c.type, "cloze");
    assert.ok(/^Wish for more time\nWISH\nI wish I \{\{had\}\} more time\.$/.test(c.text), JSON.stringify(c.text));
  });
  test("journalCard: the verb in brackets stays in the line with the gap", function () {
    const c = FLg.journalCard(bracket);
    assert.strictEqual(c.text, "She {{goes}} (go) to school every day.");
  });
  test("journalCard: a manual entry without ref and without a gap — a basic card with the whole context (split into lines), back = the correct answer", function () {
    const c = FLg.journalCard(manual);
    assert.strictEqual(c.type, "basic");
    assert.strictEqual(c.front, "How do you say: long ago?\nHint: ago");
    assert.strictEqual(c.back, "a long time ago");
    assert.strictEqual(c.note, "rule");
  });

  test("mistakeTask.parseRef / viewFor: entry with an ex: ref → task view; no ref, unknown or old exam ref → card", function () {
    assert.deepStrictEqual(MT.parseRef("ex:a1-verbs-present-1-05"), { kind: "ex", itemId: "a1-verbs-present-1-05" });
    assert.strictEqual(MT.parseRef("c1:uoe-p1-4:3"), null, "lettered exam refs were removed with the C1 module (E8)");
    assert.strictEqual(MT.parseRef("journal:err-1"), null);
    assert.strictEqual(MT.parseRef(""), null);
    assert.strictEqual(MT.viewFor(wf), "card");
    assert.strictEqual(MT.viewFor(tr), "task");
    assert.strictEqual(MT.viewFor(manual), "card");
    assert.strictEqual(MT.viewFor(entry("x", { ref: "something-manual" })), "card");
    assert.strictEqual(MT.viewFor(null), "card");
  });
})();

console.log("\nFlashcards: schedule and saving (fix of the schedule)");
(function () {
  const FLg = global.LM.cardsLogic, HM = global.LM.cardsSchedule;
  const DAYMS = 86400000;
  const NOW = new Date(2026, 10, 10, 18, 0, 0).getTime();
  const rev = function (iv, due, reps) { return Object.assign(HM.newCard(), { state: "review", interval: iv, due: due, reps: reps == null ? 3 : reps }); };

  test("spread: intervals < 20 d are saved exactly as in the preview (“Good: 8 d” = 8 d, “Easy: 4 d” = 4 d)", function () {
    for (let iv = 1; iv <= 9; iv++) {
      ["hard", "good", "easy"].forEach(function (g) {
        const base = rev(iv, NOW, 3);
        const pv = HM.preview(base, NOW)[g];
        if (pv.card.interval >= 20) return; // from 20 d the ±5% spread is intended (a separate test)
        [0, 0.25, 0.5, 0.75, 1].forEach(function (r) {
          const real = HM.schedule(base, g, NOW, null, { fuzz: true, random: function () { return r; } });
          assert.strictEqual(real.due, pv.card.due, "iv " + iv + " " + g + " random " + r + ": " + real.interval + " d instead of " + pv.card.interval + " d");
        });
      });
    }
    const graduating = HM.schedule(Object.assign(HM.newCard(), { state: "new" }), "easy", NOW, null, { fuzz: true, random: function () { return 0; } });
    assert.strictEqual(graduating.interval, 4, "new card + Easy = 4 d, not 3 d");
  });
  test("spread: from 20 d still ±5% (20 d → 19–21 d), randomness from outside", function () {
    const base = rev(8, NOW, 3); // Good: 20 d
    const lo = HM.schedule(base, "good", NOW, null, { fuzz: true, random: function () { return 0; } }).interval;
    const hi = HM.schedule(base, "good", NOW, null, { fuzz: true, random: function () { return 1; } }).interval;
    assert.strictEqual(HM.schedule(base, "good", NOW).interval, 20);
    assert.deepStrictEqual([lo, hi], [19, 21]);
  });
  test("several learning days: Good ×4 and Easy ×4 raise the interval with every rating (the state survives save and read)", function () {
    let t = NOW, st = {};
    const seq = [];
    ["good", "good", "good", "good", "good", "good"].forEach(function (g) {
      const base = st.state && st.state !== "new" ? st : HM.newCard();
      st = FLg.sanitizeState({ version: 1, cards: { "k-001": HM.schedule(base, g, t, null, { fuzz: true, random: function () { return 0.5; } }) } }).cards["k-001"];
      seq.push(st.state === "review" ? st.interval : 0);
      t = st.due;
    });
    assert.deepStrictEqual(seq, [0, 1, 3, 8, 20, 50]);
    let e = FLg.sanitizeState({ version: 1, cards: { "k-002": HM.schedule(HM.newCard(), "easy", NOW) } }).cards["k-002"];
    const ivs = [e.interval];
    for (let i = 0; i < 3; i++) { e = HM.schedule(e, "easy", e.due); ivs.push(e.interval); }
    assert.ok(ivs[1] > ivs[0] && ivs[2] > ivs[1] && ivs[3] > ivs[2], "Easy raises the interval every time: " + ivs.join(","));
  });

  test("saving from two browser tabs: a stale tab does not undo ratings (mergeStates)", function () {
    const stored = FLg.sanitizeState(FLg.emptyState());     // the record after a rating in tab A
    stored.cards["kolokacje-001"] = rev(8, NOW + 8 * DAYMS, 2);
    stored.daily["2026-11-10"] = { new: 1, reviews: 3, again: 0, good: 3, answers: 4, minutes: 2 };
    const stale = FLg.sanitizeState(FLg.emptyState());      // memory of tab B before the rating (the card still new)
    stale.daily["2026-11-10"] = { new: 0, reviews: 1, again: 1, good: 0, answers: 1, minutes: 0 };
    assert.strictEqual(FLg.mergeStates(stale, stored), true);
    assert.strictEqual(stale.cards["kolokacje-001"].interval, 8, "the rating from tab A taken over");
    assert.strictEqual(stale.daily["2026-11-10"].reviews, 3, "daily counter: the maximum");
    assert.strictEqual(stale.daily["2026-11-10"].again, 1);
    // memory newer than the record: it stays
    const fresh = FLg.sanitizeState(FLg.emptyState());
    fresh.cards["kolokacje-001"] = rev(20, NOW + 20 * DAYMS, 5);
    fresh.daily["2026-11-10"] = Object.assign({}, stored.daily["2026-11-10"]);
    assert.strictEqual(FLg.mergeStates(fresh, stored), false);
    assert.strictEqual(fresh.cards["kolokacje-001"].interval, 20);
    // a card without reviews (e.g. a suspended new one) in the record is not “newer” than no state
    const s2 = FLg.sanitizeState(FLg.emptyState()); s2.cards["kolokacje-009"] = Object.assign(HM.newCard(), { suspended: true });
    const m2 = FLg.sanitizeState(FLg.emptyState());
    assert.strictEqual(FLg.mergeStates(m2, s2), false);
    assert.strictEqual(m2.cards["kolokacje-009"], undefined);
  });
  test("deckStats: “due today” and “later” (after the 04:00 learning-day boundary)", function () {
    const cards = ["a", "b", "c", "d", "e"].map(function (x) { return { id: x }; });
    const state = {
      a: rev(3, NOW - 3600000),                                  // due today (overdue)
      b: rev(8, NOW + 8 * DAYMS),                                // later
      c: rev(1, new Date(2026, 10, 11, 2, 0, 0).getTime()),      // tomorrow 02:00 = still today's learning day
      d: rev(1, new Date(2026, 10, 11, 9, 0, 0).getTime())       // tomorrow 09:00 = later
    };
    const s = FLg.deckStats(cards, state, NOW);
    assert.strictEqual(s.due, 2);
    assert.strictEqual(s.later, 2);
    assert.strictEqual(s.new, 1);
  });
  test("“Add more new cards” (extraNew) does not touch cards in review: the queue has no cards that are not due, the state is unchanged", function () {
    const cards = [1, 2, 3, 4, 5, 6, 7].map(function (i) { return { id: "k-00" + i, deck: "k" }; });
    const state = { "k-001": rev(8, NOW + 8 * DAYMS), "k-002": rev(3, NOW + 2 * DAYMS) };
    const before = JSON.stringify(state);
    const q = FLg.buildQueue({ cards: cards, state: state, now: NOW, settings: { newPerDay: 2, reviewsPerDay: 100 }, today: { new: 2 }, extraNew: 5 });
    assert.deepStrictEqual(q.review, [], "cards due after today's learning day do not come back");
    assert.strictEqual(q.fresh.length, 5, "tylko nowe: 5 dodatkowych");
    assert.ok(q.fresh.every(function (id) { return !state[id]; }));
    assert.strictEqual(JSON.stringify(state), before, "buildQueue changes nothing");
  });
})();

console.log("\nStorage key registry (spec 02 §5)");
(function () {
  const fs = require("fs");
  const ROOT = path.join(__dirname, "..");
  require(path.join(ROOT, "js", "syllabus.js"));
  require(path.join(ROOT, "js", "store.js"));
  const pdFile = path.join(ROOT, "js", "profile-data.js");
  const REG = global.LM.profileData.REGISTRY;

  /** Code without comments (good enough for this scan: no comment markers inside the scanned strings). */
  function code(file) { return fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1"); }
  const files = fs.readdirSync(path.join(ROOT, "js")).filter(function (f) { return /\.js$/.test(f); }).map(function (f) { return path.join(ROOT, "js", f); }).concat([path.join(ROOT, "index.html")]);

  test("registry: every storage key built in code (prefix + name, or a literal plm.* key) is a registry key", function () {
    const regKeys = REG.map(function (r) { return r.key; });
    const found = [];
    files.forEach(function (file) {
      const src = code(file);
      let m;
      const viaPrefix = /(?:storagePrefix|\bP)\s*\+\s*"([^"]+)"/g;
      while ((m = viaPrefix.exec(src))) found.push({ file: file, key: "plm." + m[1] });
      const literal = /["'](plm\.[a-z0-9.-]+)["']/g;
      while ((m = literal.exec(src))) found.push({ file: file, key: m[1] });
    });
    assert.ok(found.length >= 15, "scan found too few keys: " + found.length);
    found.forEach(function (f) { assert.ok(regKeys.indexOf(f.key) !== -1, path.basename(f.file) + ": " + f.key + " is not in the registry"); });
  });
  test("registry: no code uses keys of the original app (elm_*, elm.<id>.*) or a key outside plm.", function () { // pl-fixture: names the old keys
    files.forEach(function (file) {
      const src = code(file);
      assert.ok(!/["']elm[._][^"']*["']/.test(src), path.basename(file) + " uses an elm key"); // pl-fixture
      assert.ok(!/localStorage\.(?:get|set|remove)Item\(\s*["'](?!plm\.)/.test(src), path.basename(file) + " uses a literal key without the plm. prefix");
    });
    REG.forEach(function (r) { assert.strictEqual(r.key.indexOf("plm."), 0, r.id); });
  });
  test("registry: every non-device entry has a section and an owner with export, import, reset and profile deletion", function () {
    if (!global.addEventListener) global.addEventListener = function () {};
    require(path.join(ROOT, "js", "cards-store.js"));
    require(path.join(ROOT, "js", "trail-store.js"));
    REG.forEach(function (r) {
      assert.ok(["device", "profiles", "profile"].indexOf(r.scope) !== -1, r.id + ": scope");
      if (r.scope === "device") { assert.strictEqual(typeof r.reset, "boolean", r.id); return; }
      assert.ok(r.section && r.owner, r.id + ": section / owner");
      const o = global.LM[r.owner];
      ["exportData", "parseImport", "applyImport", "removeProfile", "clearAll"].forEach(function (fn) { assert.strictEqual(typeof o[fn], "function", r.owner + "." + fn); });
    });
    assert.deepStrictEqual(global.LM.profileData.sections().map(function (s) { return s.section; }), ["profiles", "learning", "cards", "trail"]);
  });
  test("registry: export → reset → import restores every key; deleting a profile leaves nothing of it; reset keeps theme and sidebar", function () {
    const LS = global.localStorage;
    LS._d = {};
    // Seed every key: two profiles in each per-profile store, every device key
    const profiles = { version: 1, activeId: "p1", profiles: [{ id: "p1", name: "One", progress: { "a1-cases-accusative": true } }, { id: "p2", name: "Two", progress: {} }] };
    LS.setItem("plm.profiles", JSON.stringify(profiles));
    REG.filter(function (r) { return r.owner === "profileData"; }).forEach(function (r) { LS.setItem(r.key, JSON.stringify({ version: 1, profiles: { p1: {}, p2: {} } })); });
    ["p1", "p2"].forEach(function (pid) {
      LS.setItem("plm.cards." + pid, JSON.stringify(global.LM.cardsLogic.emptyState()));
      LS.setItem("plm.trail." + pid, JSON.stringify(global.LM.trailLogic.emptyState()));
    });
    ["theme", "sidebar", "ui", "search-recent"].forEach(function (k) { LS.setItem("plm." + k, k === "theme" ? "dark" : "{}"); });
    // Fresh module instances (they cache what they read)
    [pdFile, path.join(ROOT, "js", "cards-store.js"), path.join(ROOT, "js", "trail-store.js")].forEach(function (f) { delete require.cache[require.resolve(f)]; require(f); });
    const PDr = global.LM.profileData;
    global.LM.state = { profiles: global.LM.store.loadProfiles().data };
    Object.keys(LS._d).forEach(function (k) { assert.ok(PDr.isKnownKey(k), "unknown key " + k); });
    const perProfileKeys = Object.keys(LS._d).filter(function (k) { return !/^plm\.(theme|sidebar|ui|search-recent)$/.test(k); });
    assert.strictEqual(perProfileKeys.length, 1 + 13 + 4, "profiles + 13 learning kinds + cards and trail for 2 profiles");
    const before = {};
    perProfileKeys.forEach(function (k) { before[k] = JSON.parse(LS.getItem(k)); });

    const file = JSON.parse(JSON.stringify(global.LM.store.wrapBackup(PDr.exportAll())));
    assert.deepStrictEqual(Object.keys(file.data), ["profiles", "learning", "cards", "trail"]);
    PDr.resetAll();
    global.LM.store.clearAll();
    assert.deepStrictEqual(Object.keys(LS._d).sort(), ["plm.sidebar", "plm.theme"], "reset clears everything but theme and sidebar");

    const parsed = PDr.parseAll(global.LM.store.parseBackup(JSON.stringify(file)));
    global.LM.store.saveProfiles(parsed.profiles);
    PDr.applyAll(parsed, parsed.profiles.profiles.map(function (p) { return p.id; }));
    perProfileKeys.forEach(function (k) {
      assert.ok(LS.getItem(k) !== null, k + " restored");
      if (k === "plm.profiles") assert.deepStrictEqual(JSON.parse(LS.getItem(k)), before[k]);
      else if (/^plm\.(cards|trail)\./.test(k)) assert.deepStrictEqual(Object.keys(JSON.parse(LS.getItem(k))).sort(), Object.keys(before[k]).sort(), k);
      else assert.deepStrictEqual(Object.keys(JSON.parse(LS.getItem(k)).profiles).sort(), ["p1", "p2"], k);
    });

    PDr.removeProfileEverywhere("p2");
    Object.keys(LS._d).forEach(function (k) {
      assert.ok(!/\.p2$/.test(k), k + " still exists");
      if (k === "plm.profiles" || /^plm\.(theme|sidebar|cards|trail)/.test(k)) return;
      const v = JSON.parse(LS.getItem(k));
      if (v && v.profiles) assert.ok(!v.profiles.p2, k + " still has p2");
    });
    LS._d = {};
  });
  test("backup file: envelope, file name, foreign app refused, newer version refused", function () {
    const ST = global.LM.store;
    const env = ST.wrapBackup({ x: 1 });
    assert.deepStrictEqual([env.app, env.kind, env.version], ["polish-levels-map", "backup", 1]);
    assert.ok(/^polish-levels-map-\d{4}-\d{2}-\d{2}\.json$/.test(ST.backupFileName()));
    assert.deepStrictEqual(ST.parseBackup(JSON.stringify(env)), { x: 1 });
    const english = { app: "english-levels-map", kind: "backup", version: 2, data: { content: {}, progress: {} } };
    assert.throws(function () { ST.parseBackup(JSON.stringify(english)); }, /another app \(english-levels-map\)/);
    assert.throws(function () { ST.parseBackup(JSON.stringify({ profiles: [] })); }, /not a Polish Levels Map backup/);
    assert.throws(function () { ST.parseBackup(JSON.stringify(Object.assign({}, env, { version: 2 }))); }, /newer version/);
    assert.throws(function () { ST.parseBackup("{nope"); }, /not a valid JSON/);
    assert.throws(function () { global.LM.profileData.parseAll({ profiles: { version: 1, profiles: [] } }); }, /incomplete/);
  });
  test("profiles: version 1 only, no migrations; broken value → corrupt status, nothing written", function () {
    const ST = global.LM.store, LS = global.localStorage;
    LS._d = {};
    assert.strictEqual(ST.loadProfiles().status, "new");
    LS.setItem("plm.profiles", JSON.stringify({ version: 2, activeId: null, profiles: [] }));
    const r = ST.loadProfiles();
    assert.strictEqual(r.status, "corrupt");
    assert.ok(/newer version/.test(r.error));
    LS.setItem("plm.profiles", "{broken");
    assert.strictEqual(ST.loadProfiles().status, "corrupt");
    assert.strictEqual(LS.getItem("plm.profiles"), "{broken", "the broken value is left for the learner to download");
    assert.deepStrictEqual(Object.keys(LS._d), ["plm.profiles"], "no backup key");
    LS._d = {};
  });
})();

console.log("\nConfig and language stub (spec 02 §3, spec 05 §1)");
test("LM.APP: storage prefix plm., target language pl, export name", function () {
  assert.strictEqual(global.LM.APP.storagePrefix, "plm.");
  assert.strictEqual(global.LM.APP.targetLang, "pl");
  assert.strictEqual(global.LM.APP.exportName, "polish-levels-map");
  assert.strictEqual(global.LM.APP.chars.length, 9);
});
test("LM.lang: full interface (spec 05 §1); stripMarks and fold keep the length; countWords", function () {
  const LG = global.LM.lang;
  ["stripMarks", "fold", "normalizeAnswer", "normalizeSentence", "variants", "countWords", "isTarget", "keepsCapital"].forEach(function (k) { assert.strictEqual(typeof LG[k], "function", k); });
  assert.ok(Array.isArray(LG.abbreviations) && Array.isArray(LG.functionWords) && typeof LG.wordPattern === "string");
  ["targetVoices", "speechLang", "hasTargetLetters", "foldChars"].forEach(function (k) { assert.strictEqual(LG[k], undefined, k + " moved to LM.speech / removed"); });
  const F = langFixture("lang");
  F.stripMarks.forEach(function (c) { assert.strictEqual(LG.stripMarks(c[0]), c[1]); assert.strictEqual(LG.stripMarks(c[0]).length, c[0].length); });
  F.fold.forEach(function (c) { assert.strictEqual(LG.fold(c[0]).length, c[0].length); });
  F.countWords.forEach(function (c) { assert.strictEqual(LG.countWords(c[0]), c[1], c[0]); });
  F.normalizeAnswer.forEach(function (c) { assert.strictEqual(LG.normalizeAnswer(c[0]), c[1], c[0]); });
  assert.deepStrictEqual(LG.variants(F.stripMarks[0][0]), [F.stripMarks[0][0]]);
  const word = new RegExp("^" + LG.wordPattern + "$", "u");
  F.isTarget.polish.join(" ").replace(/[.,?!]/g, "").split(" ").forEach(function (w) { assert.ok(word.test(w), w); });
  assert.ok(word.test("biało-czerwona") && !word.test("-x") && !word.test("a b")); // pl-fixture
});
test("LM.exLogic.match: every fixture case (exact, accents, ending, typo, sentence diff)", function () {
  langFixture("match").cases.forEach(function (c) {
    const r = X.match(c.answer, c.accepted, { sentence: !!c.sentence });
    assert.deepStrictEqual([r.ok, r.near, r.closest], [c.ok, c.near, c.closest], c.answer + (c.why ? " (" + c.why + ")" : ""));
    if (c.index !== undefined) assert.strictEqual(r.index, c.index, c.answer);
    if (c.answered === false) assert.strictEqual(r.answered, false);
    if (c.sentence && !c.ok && !c.near) assert.ok(Array.isArray(r.diff) && r.diff.length, "a word diff for a wrong sentence");
  });
});

console.log("\nSpeech: LM.speech (spec 05 §4) with a fake speechSynthesis");
require(path.join(__dirname, "..", "js", "speech.js"));
/** A fake Web Speech API: voices, spoken utterances (ended at once when auto), cancel count. */
function fakeSpeech(voices, auto) {
  const spoken = [];
  const api = {
    spoken: spoken, cancels: 0, listeners: [],
    getVoices: function () { return voices; },
    speak: function (u) { spoken.push(u); if (auto) setImmediate(function () { if (u.onend) u.onend(); }); },
    cancel: function () { api.cancels++; },
    addEventListener: function (t, fn) { api.listeners.push(fn); }
  };
  global.speechSynthesis = api;
  global.SpeechSynthesisUtterance = function (text) { this.text = text; };
  return api;
}
function noSpeech() { delete global.speechSynthesis; delete global.SpeechSynthesisUtterance; }
const SP = global.LM.speech;
const V = function (lang, name, local) { return { lang: lang, name: name, localService: local !== false }; };

test("no synthesizer → unsupported: nothing is read, available() false", function () {
  noSpeech();
  assert.strictEqual(SP._refresh(true), "unsupported");
  assert.strictEqual(SP.available(), false);
  assert.strictEqual(SP.speak("x"), false);
  assert.strictEqual(SP.speakScript("A: x"), false);
});
test("voices without the target language → none (transcript, no dictation, hidden listen buttons)", function () {
  const api = fakeSpeech([V("en-US", "US"), V("de-DE", "DE")]); // pl-fixture
  assert.strictEqual(SP._refresh(true), "none");
  assert.strictEqual(SP.available(), false);
  assert.strictEqual(SP.speak("x"), false);
  assert.strictEqual(api.spoken.length, 0);
});
test("voices still loading (empty list): loading, then none after the wait; speak uses only the language code", function () {
  const api = fakeSpeech([]);
  assert.strictEqual(SP._refresh(false), "loading");
  assert.strictEqual(SP.speak("tekst"), true);
  assert.strictEqual(api.spoken[0].lang, global.LM.APP.speech.voices[0]);
  assert.strictEqual(api.spoken[0].voice, undefined);
  SP.stop();
  assert.strictEqual(SP._refresh(true), "none");
});
test("voice choice: prefix match on LM.APP.speech.voices, pl-PL before pl, local voices first, no other variants", function () { // pl-fixture
  const list = [V("en-GB", "GB"), V("pl", "plain"), V("pl-PL", "online", false), V("pl_PL", "local"), V("plx-XX", "not")]; // pl-fixture
  const picked = SP._pickVoices(list).map(function (v) { return v.name; });
  assert.deepStrictEqual(picked, ["local", "online", "plain"]);
});
test("speak: rate default 0.9, gaps read as a pause, the same text again stops (toggle), onend called", function () {
  const api = fakeSpeech([V("pl-PL", "Zosia")]); // pl-fixture
  assert.strictEqual(SP._refresh(true), "ready");
  assert.ok(SP.available());
  assert.strictEqual(SP.speak("Lubię ___ z mlekiem."), true); // pl-fixture
  const u = api.spoken[0];
  assert.strictEqual(u.rate, global.LM.APP.speech.rate);
  assert.strictEqual(u.voice.name, "Zosia");
  assert.ok(!/_/.test(u.text) && /…/.test(u.text), u.text);
  assert.ok(SP.speaking());
  assert.strictEqual(SP.speak("Lubię ___ z mlekiem."), false, "a second call while speaking stops"); // pl-fixture
  assert.ok(!SP.speaking());
  let ended = false;
  SP.speak("Dalej.", { rate: 0.7, onend: function () { ended = true; } }); // pl-fixture
  assert.strictEqual(api.spoken[1].rate, 0.7, "dictation keeps its slow replay");
  api.spoken[1].onend();
  assert.ok(ended && !SP.speaking());
});
test("speakScript: speaker labels not read, two voices take turns (A / B, names in order of appearance)", function () {
  const api = fakeSpeech([V("pl-PL", "One"), V("pl-PL", "Two")]); // pl-fixture
  SP._refresh(true);
  const lines = ["A: Dzień dobry.", "B: Dzień dobry pani.", "Anna: Cześć!", "Łukasz: Cześć, Anno.", "Anna: Pa!"]; // pl-fixture
  let finished = false;
  assert.ok(SP.speakScript(lines.join("\n"), { pause: 0, onend: function () { finished = true; } }));
  // utterances are queued one after another: end each in turn
  for (let i = 0; i < lines.length; i++) {
    const u = api.spoken[i];
    assert.ok(u, "line " + i);
    assert.ok(!/^[^:]+:/.test(u.text), "label read: " + u.text);
    u.onend();
  }
  assert.deepStrictEqual(api.spoken.map(function (u) { return u.voice.name; }), ["One", "Two", "One", "Two", "One"]);
  assert.ok(finished);
});
test("onChange: listeners hear the new status; stop() cancels", function () {
  const api = fakeSpeech([]);
  SP._refresh(false);
  const seen = [];
  const off = SP.onChange(function (st) { seen.push(st); });
  fakeSpeech([V("pl-PL", "P")]); // pl-fixture
  SP._refresh(true);
  off();
  noSpeech();
  SP._refresh(true);
  assert.deepStrictEqual(seen, ["ready"]);
  assert.ok(api.cancels >= 0);
});
noSpeech();
SP._refresh(true);


console.log("\nEnglish UI helpers: LM.plural and LM.fmt (spec 04 §1)");
require(path.join(__dirname, "..", "js", "utils.js"));
test("LM.plural: two English forms, only exactly 1 is singular, number formatted", function () {
  const P = global.LM.plural;
  assert.strictEqual(P(1, "day", "days"), "1 day");
  assert.strictEqual(P(0, "day", "days"), "0 days");
  assert.strictEqual(P(2, "day", "days"), "2 days");
  assert.strictEqual(P(5, "day", "days"), "5 days");
  assert.strictEqual(P(11, "day", "days"), "11 days");
  assert.strictEqual(P(21, "day", "days"), "21 days");
  assert.strictEqual(P(22, "card", "cards"), "22 cards");
  assert.strictEqual(P(1250, "card", "cards"), "1,250 cards");
  assert.strictEqual(global.LM.pluralWord(1, "mistake", "mistakes"), "mistake");
  assert.strictEqual(global.LM.pluralWord(3, "mistake", "mistakes"), "mistakes");
});
test("LM.fmt dates in US English; YYYY-MM-DD read as a local day", function () {
  const F = global.LM.fmt;
  assert.strictEqual(F.date("2026-11-12"), "Nov 12, 2026");
  assert.strictEqual(F.date("2026-01-01"), "Jan 1, 2026", "no time-zone shift to Dec 31");
  assert.strictEqual(F.longDate("2026-11-12"), "November 12, 2026");
  assert.strictEqual(F.dayMonth("2026-11-12"), "Nov 12");
  assert.strictEqual(F.weekday("2026-11-12"), "Thursday");
  assert.strictEqual(F.weekday("2026-11-12", "short"), "Thu");
  const d = new Date(2026, 10, 12, 15, 5);
  assert.strictEqual(F.date(d), "Nov 12, 2026");
  assert.strictEqual(F.date(d.getTime()), "Nov 12, 2026");
  assert.match(F.time(d), /^3:05\s?PM$/u);
  assert.match(F.dateTime(d), /^Nov 12, 2026, 3:05\s?PM$/u);
  ["", "tomorrow", null, undefined].forEach(function (v) { assert.strictEqual(F.date(v), "", String(v)); });
});
test("LM.fmt numbers and percents in US English", function () {
  const F = global.LM.fmt;
  assert.strictEqual(F.number(0), "0");
  assert.strictEqual(F.number(1234), "1,234");
  assert.strictEqual(F.number(1234567), "1,234,567");
  assert.strictEqual(F.number(2.345, 1), "2.3");
  assert.strictEqual(F.number(NaN), "");
  assert.strictEqual(F.percent(42), "42%");
  assert.strictEqual(F.percent(12.5, 1), "12.5%");
  assert.strictEqual(F.percent(100), "100%");
  assert.strictEqual(F.percent(undefined), "");
});

console.log("\nLanguage check of the code (spec 04 §4)");
test("check-lang: diacritics, Polish opening quote, stop words, locales, legacy names; English quotes pass; allow list", function () {
  const CL = require(path.join(__dirname, "check-lang.js"));
  const rules = function (line) { return CL.checkText("js/x.js", line, []).map(function (f) { return f.rule; }); };
  assert.deepStrictEqual(rules("const a = \"Dzień dobry\";"), ["diacritics"]); // pl-fixture
  assert.deepStrictEqual(rules("const a = \"„Hi”\";"), ["quote"]); // pl-fixture
  assert.deepStrictEqual(rules("label: \"Dalej\""), ["stop-word"]); // pl-fixture
  assert.deepStrictEqual(rules("u.lang = \"en-GB\";"), ["locale", "lang-code"]); // pl-fixture
  assert.deepStrictEqual(rules("ELM.x(); elm_theme"), ["legacy-name"]); // pl-fixture
  assert.deepStrictEqual(rules("text: “Next”, \"Continue the trail\", helmet, element, dalejx"), []);
  // stage 3: language facts only in js/lang.js, js/config.js and content/
  assert.deepStrictEqual(rules("el(\"p\", { lang: \"en\" })"), ["lang-code"]);
  assert.deepStrictEqual(rules("if (code === \"pl\") x();"), ["lang-code"]);
  assert.deepStrictEqual(rules("el(\"p\", { lang: LM.APP.targetLang })"), []);
  assert.deepStrictEqual(rules("const A = [\"np.\", \"m.in.\"];"), ["abbreviation"]);
  assert.deepStrictEqual(rules("const W = [\"jest\", \"nie\"];"), ["function-word"]);
  assert.deepStrictEqual(rules("const FIXED_CONTRACTIONS = {};"), ["english-rule"]);
  assert.deepStrictEqual(rules("window.speechSynthesis.cancel();"), ["speech-api"]);
  assert.deepStrictEqual(CL.checkText("js/speech.js", "window.speechSynthesis.cancel();", []), [], "LM.speech itself may use the API");
  assert.deepStrictEqual(CL.checkText("tools/build.js", "const A = [\"np.\"];", []), [], "js-only rules do not apply to tools");
  const allow = [{ file: "js/x.js", contains: "Dalej", reason: "test", used: 0 }]; // pl-fixture
  assert.deepStrictEqual(CL.checkText("js/x.js", "Dalej", allow), []); // pl-fixture
  assert.strictEqual(allow[0].used, 1);
  assert.strictEqual(CL.checkText("js/y.js", "Dalej", allow).length, 1, "allow entries are per file"); // pl-fixture
});
test("extract-strings: literals without comments and regexes; code-like strings dropped", function () {
  const ES = require(path.join(__dirname, "extract-strings.js"));
  const src = "// \"comment\"\nconst r = /\"x\"/g; el(\"button\", { class: \"btn btn-primary\", text: \"Start review\" }, `Stop ${n} of 26`);";
  const ui = ES.jsLiterals(src).filter(function (x) { return ES.looksLikeUi(x.text); }).map(function (x) { return x.text; });
  assert.deepStrictEqual(ui, ["Start review", "Stop {…} of 26"]);
  assert.strictEqual(ES.looksLikeUi("Next"), true);
  assert.strictEqual(ES.looksLikeUi("#/today"), false);
  assert.strictEqual(ES.looksLikeUi("plm.prefs"), false);
});

console.log("\nCallouts keyed on the English headings of spec 07 §1–2");
test("callouts: topic and summary headings map to callout types; other headings get none", function () {
  require(path.join(__dirname, "..", "js", "callouts.js"));
  const C = global.LM.callouts;
  const type = function (h) { const r = C.ruleFor(h); return r ? r.type : null; };
  assert.strictEqual(type(global.LM.APP.mistakesHeading), "trap");
  assert.strictEqual(type("Common mistakes for English speakers"), "trap");
  assert.strictEqual(type("The most common trap"), "trap");
  assert.strictEqual(type("Watch out"), "trap");
  assert.strictEqual(type("Real life vs exam"), "real-exam");
  assert.strictEqual(type("Key ideas"), "key");
  assert.strictEqual(type("What you can do at this level"), "key");
  assert.strictEqual(type("What next"), "next");
  assert.strictEqual(type("Examples"), "examples");
  assert.strictEqual(type("Key phrases"), "examples");
  assert.strictEqual(type("Word partners"), "examples");
  ["How it works", "When to use it", "Practice", "Answers", "Good to know", "Dialogue", "Words", "Culture note"].forEach(function (h) {
    assert.strictEqual(type(h), null, h);
  });
});

console.log("\nSyllabus: the only list of levels, units, categories and topics (spec 06 E1, E2)");
(function () {
  const fs = require("fs");
  const ROOT = path.join(__dirname, "..");
  require(path.join(ROOT, "js", "syllabus.js"));
  const SY = global.LM.syllabus;
  const saved = global.LM.SYLLABUS;
  const real = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "syllabus.json"), "utf8"));
  const status = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "levels.json"), "utf8"));
  global.LM.SYLLABUS = Object.assign({}, real, { levels: real.levels.map(function (l) { return Object.assign({}, l, { status: status[l.id] }); }) });
  try {
    test("syllabus: six levels in CEFR order, A1 has 25 topics in 5 units, ids unique", function () {
      assert.deepStrictEqual(SY.levelIds(), global.LM.LEVEL_IDS);
      assert.strictEqual(SY.topics("A1").length, 25);
      assert.strictEqual(SY.units("A1").length, 5);
      const ids = SY.allTopics().map(function (t) { return t.id; });
      assert.strictEqual(new Set(ids).size, ids.length);
      assert.strictEqual(SY.topic("a1-cases-accusative").level, "A1");
      assert.strictEqual(SY.topic("a1-cases-accusative").unit.indexOf("a1-u"), 0);
    });
    test("syllabus: groups by category in order of first appearance, topics keep unit order", function () {
      const g = SY.groups("A1");
      const firstSeen = [];
      SY.topics("A1").forEach(function (t) { if (firstSeen.indexOf(t.category) === -1) firstSeen.push(t.category); });
      assert.deepStrictEqual(g.map(function (x) { return x.id; }), firstSeen);
      assert.strictEqual(g.reduce(function (n, x) { return n + x.topics.length; }, 0), 25);
      g.forEach(function (x) { assert.strictEqual(x.name, real.categories[x.id]); });
      const order = SY.topics("A1").map(function (t) { return t.id; });
      g.forEach(function (x) { const idx = x.topics.map(function (t) { return order.indexOf(t.id); }); assert.deepStrictEqual(idx, idx.slice().sort(function (a, b) { return a - b; })); });
    });
    test("syllabus: routes and page files from the topic id; unknown slug → null", function () {
      assert.strictEqual(SY.route("a1-cases-accusative"), "#/a1/cases-accusative");
      assert.strictEqual(SY.pageFile("a1-cases-accusative"), "a1/cases-accusative.md");
      assert.strictEqual(SY.slugOf("b2-cases-x-y"), "cases-x-y");
      assert.strictEqual(SY.topicByRoute("A1", "cases-accusative").id, "a1-cases-accusative");
      assert.strictEqual(SY.topicByRoute("A1", "no-such-topic"), null);
    });
    test("syllabus: level status from levels.json; stats and countDone use topic ids, soon levels do not count", function () {
      assert.strictEqual(SY.isAvailable("A1"), true);
      assert.strictEqual(SY.isAvailable("B1"), false);
      assert.deepStrictEqual(SY.availableLevelIds(), ["A1"]);
      const a2 = SY.topics("A2")[0].id;
      const progress = { "a1-cases-accusative": true, "a1-verbs-byc": true, junk: true };
      progress[a2] = true;
      assert.deepStrictEqual(SY.stats(progress, "A1"), { done: 2, total: 25, percent: 8 });
      assert.strictEqual(SY.countDone(progress), 2);
      assert.deepStrictEqual(SY.stats({}, "C2").done, 0);
      assert.strictEqual(SY.level("X9"), null);
    });
  } finally {
    global.LM.SYLLABUS = saved;
  }
})();

console.log("\nExams: generic module with the fixture exam (spec 06 E8, tools/fixtures/exam-demo)");
(function () {
  const fs = require("fs");
  const os = require("os");
  const ROOT = path.join(__dirname, "..");
  const C = require(path.join(__dirname, "build", "common.js"));
  const FIX = path.join(__dirname, "fixtures", "exam-demo");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "plm-exam-"));
  const saved = { reg: global.LM.EXAM_REGISTRY, exams: global.LM.EXAMS, sets: global.LM.SETS_INDEX };
  const load = function (rel) { const f = path.join(tmp, rel); delete require.cache[f]; require(f); };
  try {
    C.useExamsDir(FIX);
    C.useDataDir(tmp);
    const report = require(path.join(__dirname, "build", "exams.js"))();
    require(path.join(__dirname, "build", "exercises.js"))();
    load("exams-registry.js");
    load("exam-exam-demo.js");
    load("sets-index.js");
    const R = global.LM.EXAM_REGISTRY;

    test("fixture build: registry in order, set ids, set metadata, exam data with pages and the writing trainer", function () {
      assert.ok(/exam-demo/.test(report), report);
      assert.deepStrictEqual(R.exams.map(function (e) { return e.id + ":" + e.status; }), ["exam-demo:active", "exam-soon:soon"]);
      assert.deepStrictEqual(R.exams[0].setIds, ["exam-demo-reading-1"]);
      assert.strictEqual(R.sets["exam-demo-reading-1"].href, "#/practice/set/exam-demo-reading-1");
      const D = global.LM.EXAMS["exam-demo"];
      assert.deepStrictEqual(Object.keys(D.pages).sort(), ["overview", "writing-part"]);
      assert.deepStrictEqual(D.trainers.writing.wordRange, [40, 80]);
      assert.strictEqual(global.LM.SETS_INDEX.sets["exam-demo-reading-1"].exam, "exam-demo");
      assert.strictEqual(global.LM.SETS_INDEX.sets["exam-demo-reading-1"].count, 2);
      assert.ok(!fs.existsSync(path.join(tmp, "exam-exam-soon.js")), "a soon exam has no data file");
    });

    test("exam routes: #/exams/<id>[/…]; unknown exam and routes of the original app are not exam routes", function () {
      global.LM.markdown = global.LM.markdown || {};
      require(path.join(ROOT, "js", "exam-core.js"));
      const X = global.LM.exams;
      assert.deepStrictEqual(X.parseRoute("#/exams/exam-demo"), { examId: "exam-demo", kind: "page", id: "overview" });
      assert.deepStrictEqual(X.parseRoute("#/exams/exam-demo/writing-part"), { examId: "exam-demo", kind: "page", id: "writing-part" });
      assert.deepStrictEqual(X.parseRoute("#/exams/exam-demo/practice"), { examId: "exam-demo", kind: "exercises" });
      assert.deepStrictEqual(X.parseRoute("#/exams/exam-demo/writing/demo-email"), { examId: "exam-demo", kind: "writing", task: "demo-email" });
      assert.deepStrictEqual(X.parseRoute("#/exams/exam-demo/speaking"), { examId: "exam-demo", kind: "speaking" });
      assert.deepStrictEqual(X.parseRoute("#/exams/exam-soon/anything"), { examId: "exam-soon", kind: "soon" });
      assert.strictEqual(X.parseRoute("#/exams/no-such-exam"), null);
      assert.strictEqual(X.parseRoute("#/egzamin-osmoklasisty"), null); // pl-fixture: a route of the original app
      assert.strictEqual(X.parseRoute("#/certyfikat-c1/cwiczenia"), null);
      assert.strictEqual(X.href(R.exams[0]), "#/exams/exam-demo");
    });

    test("my exams with the fixture: date makes it mine, soon exam never", function () {
      const EL = global.LM.examLogic;
      const st = EL.examMyState({ registry: R, examsRecord: { exams: { "exam-demo": { examDate: "2026-12-01" } }, my: { "exam-soon": "pinned" } }, isSetDone: function () { return false; } });
      assert.deepStrictEqual(EL.myExams(st, R, "2026-11-25"), [{ id: "exam-demo", reason: "date", days: 6 }]);
      assert.deepStrictEqual(EL.navSplit(R, ["exam-demo"]), { shown: ["exam-demo"], hidden: ["exam-soon"] });
    });

    test("the real registry is empty until stage E (sidebar group hidden)", function () {
      assert.ok(!fs.existsSync(path.join(ROOT, "content", "exams", "registry.json")) ||
        JSON.parse(fs.readFileSync(path.join(ROOT, "content", "exams", "registry.json"), "utf8")).exams.length === 0);
      const real = fs.readFileSync(path.join(ROOT, "data", "exams-registry.js"), "utf8");
      assert.ok(/"exams":\[\]/.test(real), "data/exams-registry.js has exams");
    });
  } finally {
    C.useExamsDir(null);
    C.useDataDir(null);
    global.LM.EXAM_REGISTRY = saved.reg;
    global.LM.EXAMS = saved.exams;
    global.LM.SETS_INDEX = saved.sets;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})();

// ---------- Stage 4: the engine with Polish data, paradigm (E6), tests (E10) ----------
console.log("Exercises with Polish data (stage 4)");
(function () {
  const exDir = path.join(__dirname, "..", "content", "exercises");
  const contentSets = fs.readdirSync(exDir).filter(function (f) { return /\.json$/.test(f) && f !== "topics.json" && f !== "mixes.json"; })
    .map(function (f) { return JSON.parse(fs.readFileSync(path.join(exDir, f), "utf8")); });
  const plItems = [].concat.apply([], contentSets.map(function (s) { return s.items.map(function (it) { return Object.assign({ topic: s.topic }, it); }); }));
  const byId = function (id) { return plItems.find(function (it) { return it.id === id; }); };
  const S4 = JSON.parse(fs.readFileSync(path.join(LANG_FX, "stage4.json"), "utf8"));
  const PAR = byId("a1-cases-accusative-1-09");

  test("content sets: every item type has Polish data", function () {
    const types = {};
    plItems.forEach(function (it) { types[it.type] = true; });
    X.TYPES.forEach(function (t) { assert.ok(types[t], "no Polish item of type " + t); });
  });
  test("content sets: the model answer of every item is correct with full points", function () {
    plItems.forEach(function (it) {
      const r = X.evaluate(it, modelAnswerOf(it));
      assert.ok(r.correct && r.points === r.max && r.max === X.maxPoints(it), it.id);
    });
  });
  test("content sets: every accepted variant counts (translate, dictation, transformation, short answer, reorder orders, cells)", function () {
    plItems.forEach(function (it) {
      if (it.type === "translate") it.accepted.forEach(function (a) { assert.ok(X.evaluate(it, { text: a }).correct, it.id + " " + a); });
      if (it.type === "dictation") (it.accepted || []).forEach(function (a) { assert.ok(X.evaluate(it, { text: a }).correct, it.id + " " + a); });
      if (it.type === "transformation") it.answers.forEach(function (a) { assert.ok(X.evaluate(it, { text: a }).correct, it.id + " " + a); });
      if (it.type === "short-answer") it.accepted.forEach(function (a) { assert.ok(X.evaluate(it, { text: a }).correct, it.id + " " + a); });
      if (it.type === "reorder") it.answers.forEach(function (a) {
        const words = a.trim().split(/\s+/).filter(function (w) { return /[\p{L}\p{N}]/u.test(w); });
        assert.ok(X.evaluate(it, { words: words }).correct, it.id + " " + a);
      });
      if (it.type === "paradigm") it.cells.forEach(function (c) { c.accepted.forEach(function (a) { assert.ok(X.match(a, c.accepted).ok, it.id + " " + a); }); });
    });
  });
  test("content sets: reorder tiles are never the solution and keep the words of the model", function () {
    plItems.filter(function (it) { return it.type === "reorder"; }).forEach(function (it) {
      for (let s = 1; s < 30; s++) {
        const t = X.reorderTokens(it, seeded(s)).map(function (x) { return x.text; });
        assert.ok(!X.evaluate(it, { words: t }).correct, it.id);
        assert.deepStrictEqual(t.slice().sort(), X.answerTokens(it.answers[0], it).sort());
      }
    });
  });

  test("paradigm: a point per cell to fill, given cells are free, correct = all cells", function () {
    const it = S4.paradigm;
    assert.strictEqual(X.maxPoints(it), 3);
    const all = X.evaluate(it, { texts: S4.paradigmAll });
    assert.deepStrictEqual([all.correct, all.points, all.max], [true, 3, 3]);
    const part = X.evaluate(it, { texts: S4.paradigmPart });
    assert.deepStrictEqual([part.correct, part.points, part.max, part.answered], [false, 1, 3, true]);
    assert.strictEqual(part.cells[0].given, true);
    assert.strictEqual(part.cells[3].near, "accents");
    const lenient = X.evaluate(it, { texts: S4.paradigmNoMarks }, { lenientAccents: true });
    assert.deepStrictEqual([lenient.correct, lenient.lenient], [true, true]);
    assert.strictEqual(X.evaluate(it, { texts: [] }).answered, false);
    assert.strictEqual(X.sessionScore([{ item: it, res: part }, { item: it, res: null }]).total, 6);
  });
  test("paradigm: the example item (6 phrases in the accusative) and a wrong ending in one cell", function () {
    assert.ok(PAR && PAR.type === "paradigm");
    assert.strictEqual(X.maxPoints(PAR), 6);
    const texts = PAR.cells.map(function (c) { return c.accepted[0]; });
    texts[1] = S4.exampleWrongCell;
    const r = X.evaluate(PAR, { texts: texts });
    assert.deepStrictEqual([r.points, r.max, r.correct], [5, 6, false]);
    assert.deepStrictEqual(X.paradigmCells(PAR).map(function (c) { return c.given; }), [false, false, false, false, false, false]);
  });
  test("paradigm: speech text only after checking, the forms in table order", function () {
    assert.strictEqual(X.speechText(PAR, false), "");
    assert.strictEqual(X.speechText(PAR, true), S4.exampleSpeech);
  });

  test("reorder: Polish quotes stay on their words, a dash is not a tile, the letter after a quote loses its capital", function () {
    const q = S4.quotes, it = q.item;
    assert.deepStrictEqual(X.answerTokens(it.answers[0], it), q.tokens);
    assert.ok(X.evaluate(it, { words: q.tokens }).correct);
    assert.ok(X.evaluate(it, { words: q.second }).correct, "the second order, punctuation ignored");
    assert.ok(!X.evaluate(it, { words: q.wrong }).correct);
  });
  test("reorder: a proper noun at the start keeps its capital (capitalised inside another order); keepCapital forces it", function () {
    const c = S4.capitals;
    const it = byId("a1-cases-accusative-1-06");
    assert.strictEqual(X.answerTokens(it.answers[0], it)[0], c.name);
    assert.strictEqual(X.answerTokens(c.otherOrder, { answers: [c.otherOrder] })[0], c.otherFirst);
    assert.strictEqual(X.answerTokens(c.city, { answers: [c.city], keepCapital: true })[0], c.cityKept);
    assert.strictEqual(X.answerTokens(c.city, { answers: [c.city] })[0], c.cityLower);
  });
  test("reorder: words with diacritics compare exactly (no folding), capitals never matter", function () {
    const d = S4.diacritics;
    assert.ok(X.evaluate(d.item, { words: d.upper }).correct);
    assert.ok(!X.evaluate(d.item, { words: d.folded }).correct);
    assert.strictEqual(X.firstDifference(d.item, d.swapped), 1);
  });
  test("translate: every natural order comes from the content, the variant without the pronoun counts", function () {
    const t = S4.translate;
    const it = byId("a1-cases-accusative-1-07");
    t.ok.forEach(function (a) { assert.ok(X.evaluate(it, { text: a }).correct, a); });
    assert.strictEqual(X.evaluate(it, { text: t.accents }).near, "accents");
    const d = X.evaluate(it, { text: t.wrong });
    assert.ok(!d.correct && d.diff.some(function (o) { return o.op === "replace" && o.word === t.word && o.got === t.got; }));
  });
  test("transformation: word limit and key word with Polish words (a dash is not a word)", function () {
    const t = S4.transformation;
    assert.strictEqual(X.trTokens(t.dash).length, 2);
    assert.ok(X.evaluate(t.item, { text: t.ok }).correct);
    assert.match(X.evaluate(t.item, { text: t.noKeyword }).msg, /key word/);
    assert.match(X.evaluate(t.item, { text: t.tooLong }).msg, /2–5 words/);
  });
  test("speechText: English instructions and glosses are not read, lemma hints after a gap are not read", function () {
    S4.speech.forEach(function (c) { assert.strictEqual(X.speechText(c.item, c.answered), c.text); });
  });

  test("LM.lang: speaker gender of past and conditional forms, case labels with questions", function () {
    assert.deepStrictEqual(S4.gender.words.map(global.LM.lang.speakerGender), S4.gender.expected);
    S4.caseLabels.forEach(function (c) { assert.strictEqual(global.LM.lang.caseLabel(c[0]), c[1]); });
    assert.deepStrictEqual(global.LM.lang.cases.map(function (c) { return c.id; }), ["nominative", "genitive", "dative", "accusative", "instrumental", "locative", "vocative"]);
    S4.english.forEach(function (c) { assert.strictEqual(global.LM.lang.looksEnglish(c[0]), c[1], c[0]); });
  });

  test("E10 placement: skills grammar / vocabulary / reading; cases and verbs count as grammar", function () {
    assert.strictEqual(L.skillOf({ skill: "cases" }), "grammar");
    assert.strictEqual(L.skillOf({ skill: "verbs" }), "grammar");
    assert.strictEqual(L.skillOf({ skill: "vocabulary" }), "vocabulary");
    assert.strictEqual(L.skillOf({ skill: "reading" }), "reading");
    assert.strictEqual(L.skillOf({}), "grammar");
    assert.strictEqual(L.skillOfCategory("functions"), "vocabulary");
  });
  test("E6/E10 final test: proportional draw over syllabus categories, at most two paradigm items", function () {
    const F = global.LM.finalLogic;
    const cats = ["cases", "verbs", "grammar", "vocabulary", "functions"];
    const pool = [];
    cats.forEach(function (c, ci) {
      for (let i = 0; i < 6; i++) pool.push({ id: c + i, topic: "t-" + c + (i % 3), category: c, type: i < 3 && ci < 2 ? "paradigm" : (i % 2 ? "multiple-choice" : "gap-fill") });
    });
    for (let s = 1; s < 40; s++) {
      const got = F.drawItems(pool, 20, function (it) { return it.category; }, seeded(s));
      assert.strictEqual(got.length, 20);
      assert.ok(got.filter(function (it) { return it.type === "paradigm"; }).length <= 2, "seed " + s);
      cats.forEach(function (c) {
        const n = got.filter(function (it) { return it.category === c; }).length;
        assert.ok(n >= 3 && n <= 5, c + " " + n);
      });
      assert.strictEqual(new Set(got.map(function (it) { return it.id; })).size, 20);
    }
  });
})();

console.log("\nResult: " + passed + " ok, " + failures.length + " failed");
if (failures.length) process.exit(1);
