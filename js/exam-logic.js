/*
 * exam-logic.js — czysta logika egzaminów (bez DOM; testy w tools/tests.js).
 * Specyfikacja: docs/rozbudowa-v2/spec/05-egzaminy-i-egzamin-osmoklasisty.md, 5.1–5.2.
 *
 *   countWritingWords(text, opening, count)  words of a writing task: count(text) from LM.lang, without the given
 *                                 opening when the learner copied it (no exam-specific counting rules in code, spec 06 E8)
 *   writingZone(n, T)             counter zone: low (< warnBelow), warn (< min), ok, over (> max)
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const HAS_WORD_CHAR = /[\p{L}\p{N}]/u;

  /** Default count when no counter is given: whitespace-separated tokens with a letter or digit. */
  function plainCount(t) { return t.split(/\s+/).filter(function (w) { return w && HAS_WORD_CHAR.test(w); }).length; }

  function countWritingWords(text, opening, count) {
    let t = String(text || "").replace(/\r\n/g, "\n").trim();
    const open = String(opening || "").trim();
    if (open && t.slice(0, open.length).toLowerCase() === open.toLowerCase()) t = t.slice(open.length);
    return (typeof count === "function" ? count : plainCount)(t.trim());
  }

  /** T: { wordRange: [min, max], warnBelow }. */
  function writingZone(n, T) {
    const min = T.wordRange[0], max = T.wordRange[1];
    if (T.warnBelow && n < T.warnBelow) return "low";
    if (n < min) return "warn";
    if (n > max) return "over";
    return "ok";
  }

  /**
   * Before which section of a topic page the exam boxes go. titles = the ## headings in order (spec 07 §1).
   * The first of: "Real life vs exam", the common-mistakes heading (LM.APP.mistakesHeading), "Practice"; else before
   * "Answers"; else -1 (end of the article).
   */
  function examBoxAnchorIndex(titles, mistakesHeading) {
    const norm = titles.map(function (s) { return String(s || "").trim().toLowerCase(); });
    const before = ["real life vs exam", String(mistakesHeading || "").trim().toLowerCase(), "practice"].filter(Boolean);
    for (let i = 0; i < norm.length; i++) if (before.indexOf(norm[i]) !== -1) return i;
    for (let i = 0; i < norm.length; i++) if (norm[i] === "answers" || norm[i] === "sample answers") return i;
    return -1;
  }

  // ---------- B1/B2: daty i „Moje egzaminy” ----------

  const MONTHS_GEN = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
  const WEEKDAYS = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

  function dayNumber(day) {
    const m = DAY.exec(day || "");
    return m ? Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000) : null;
  }

  function localToday() {
    const n = new Date();
    return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0");
  }

  /** Liczba dni od today do day ("RRRR-MM-DD"); ujemna = data minęła; null przy złej dacie. */
  function daysBetween(day, today) {
    const a = dayNumber(day), b = dayNumber(today || localToday());
    return a === null || b === null ? null : a - b;
  }

  /** "2027-05-06" → "czwartek, 6 maja 2027" (bez zależności od ICU przeglądarki). */
  function formatDatePl(day) {
    const m = DAY.exec(day || "");
    if (!m) return "";
    const wd = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
    return WEEKDAYS[wd] + ", " + Number(m[3]) + " " + MONTHS_GEN[Number(m[2]) - 1] + " " + m[1];
  }

  /**
   * State for myExams from raw data: input = { registry, examsRecord: { exams: { id: { examDate } }, my }, isSetDone(setId) }.
   * Returns { dates, doneSets, totalSets, my }.
   */
  function examMyState(input) {
    const rec = input.examsRecord || {};
    const out = { dates: {}, doneSets: {}, totalSets: {}, my: (rec.my && typeof rec.my === "object") ? rec.my : {} };
    ((input.registry && input.registry.exams) || []).forEach(function (e) {
      const ids = e.setIds || [];
      const x = rec.exams && rec.exams[e.id];
      out.totalSets[e.id] = ids.length;
      out.dates[e.id] = x && typeof x.examDate === "string" ? x.examDate : "";
      out.doneSets[e.id] = ids.filter(function (id) { return input.isSetDone && input.isSetDone(id); }).length;
    });
    return out;
  }

  /**
   * Egzaminy „moje”: ustawiona data albo ukończony zestaw (i nie odpięty ręcznie), albo ręcznie przypięte.
   * state = examMyState(...). Zwraca [{ id, reason: "date"|"sets"|"pinned", days }] — najpierw najbliższe daty
   * (dziś i przyszłe rosnąco), potem miniony termin (najświeższy pierwszy), na końcu bez daty (kolejność rejestru).
   */
  function myExams(state, registry, today) {
    const out = [];
    ((registry && registry.exams) || []).forEach(function (e, order) {
      if (e.status !== "active") return;
      const flag = state.my && state.my[e.id];
      if (flag === "hidden") return;
      const date = state.dates && state.dates[e.id];
      const days = date ? daysBetween(date, today) : null;
      const done = (state.doneSets && state.doneSets[e.id]) || 0;
      let reason = null;
      if (days !== null) reason = "date";
      else if (done > 0) reason = "sets";
      else if (flag === "pinned") reason = "pinned";
      if (reason) out.push({ id: e.id, reason: reason, days: days, order: order });
    });
    function rank(x) { return x.days === null ? 2 : x.days >= 0 ? 0 : 1; }
    out.sort(function (a, b) {
      const ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      if (ra === 0 && a.days !== b.days) return a.days - b.days;
      if (ra === 1 && a.days !== b.days) return b.days - a.days;
      return a.order - b.order;
    });
    return out.map(function (x) { return { id: x.id, reason: x.reason, days: x.days }; });
  }

  /**
   * Podział egzaminów w pasku: { shown, hidden } (id w kolejności rejestru dla hidden, w kolejności „moich” dla shown).
   * mineIds = id z myExams; currentId = egzamin otwarty na ekranie (zostaje w pasku, choćby nie był „mój”).
   * Brak moich → wszystkie jak dawniej, bez „+N”.
   */
  function navSplit(registry, mineIds, currentId) {
    const all = ((registry && registry.exams) || []).map(function (e) { return e.id; });
    if (!mineIds || !mineIds.length) return { shown: all, hidden: [] };
    const shown = mineIds.filter(function (id) { return all.indexOf(id) !== -1; });
    if (currentId && all.indexOf(currentId) !== -1 && shown.indexOf(currentId) === -1) shown.push(currentId);
    return { shown: shown, hidden: all.filter(function (id) { return shown.indexOf(id) === -1; }) };
  }

  LM.examLogic = {
    navSplit: navSplit,
    countWritingWords: countWritingWords, writingZone: writingZone, examBoxAnchorIndex: examBoxAnchorIndex,
    daysBetween: daysBetween, formatDatePl: formatDatePl, localToday: localToday, examMyState: examMyState, myExams: myExams
  };
})(window.LM);
