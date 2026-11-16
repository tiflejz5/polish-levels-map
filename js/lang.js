/*
 * lang.js — LM.lang: every rule the code needs to know about Polish (spec 05 §1).
 *
 * STAGE 1 STUB: enough to boot and to fix the interface. Nothing calls it yet;
 * the real implementation (answer checking, folding for search, tests of spec 05 §6)
 * comes in stage 3, when the English-specific rules in the other files move here.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const MARKS = { "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n", "ó": "o", "ś": "s", "ź": "z", "ż": "z",
    "Ą": "A", "Ć": "C", "Ę": "E", "Ł": "L", "Ń": "N", "Ó": "O", "Ś": "S", "Ź": "Z", "Ż": "Z" };
  const MARKS_RE = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g;

  /** ą→a … ż→z; one character in, one character out (offsets stay valid). */
  function stripMarks(str) {
    return String(str == null ? "" : str).replace(MARKS_RE, function (c) { return MARKS[c]; });
  }

  /** For search: lower-case + stripMarks + unified quotes; same length as the input. TODO stage 3: full spec. */
  function fold(str) {
    return stripMarks(String(str == null ? "" : str).toLowerCase()).replace(/[„”“’‘]/g, function (c) { return c === "’" || c === "‘" ? "'" : "\""; });
  }

  /** Trim, collapse spaces, lower-case, ’ → ', drop a final full stop. Keeps diacritics. */
  function normalizeAnswer(str) {
    return String(str == null ? "" : str).trim().replace(/\s+/g, " ").toLowerCase().replace(/[’‘]/g, "'").replace(/\.$/, "");
  }

  /** normalizeAnswer + punctuation removed (including „ ” and dashes). TODO stage 3: full spec. */
  function normalizeSentence(str) {
    return normalizeAnswer(str).replace(/[.,!?;:„”“"()…–—]/g, " ").replace(/\s+/g, " ").trim();
  }

  function countWords(str) {
    const s = String(str == null ? "" : str).trim();
    return s ? s.split(/\s+/).length : 0;
  }

  const FUNCTION_WORDS = ["i", "w", "z", "na", "do", "że", "się", "nie", "to", "jest", "a", "ale", "o", "po"];

  /** Fallback when there is no lang attribute. TODO stage 3: "not mostly English" check. */
  function isTarget(text) {
    const s = String(text == null ? "" : text);
    if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(s)) return true;
    const words = s.toLowerCase().split(/[^a-ząćęłńóśźż]+/).filter(Boolean);
    return words.filter(function (w) { return FUNCTION_WORDS.indexOf(w) !== -1; }).length >= 2;
  }

  LM.lang = {
    stripMarks: stripMarks,
    fold: fold,
    wordPattern: "[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+(?:[-'][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)*",
    normalizeAnswer: normalizeAnswer,
    normalizeSentence: normalizeSentence,
    variants: function (str) { return [str]; },
    countWords: countWords,
    isTarget: isTarget,
    abbreviations: ["np.", "tzn.", "tj.", "m.in.", "itd.", "itp.", "dr", "prof.", "ul.", "godz.", "ok."],
    functionWords: FUNCTION_WORDS
  };
})(window.LM);
