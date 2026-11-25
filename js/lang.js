/*
 * lang.js — LM.lang: every rule the code needs to know about Polish (spec 05 §1).
 *
 * The other files contain generic algorithms and read language facts only from here (rules) and from
 * js/config.js (values: names, locale, voices, characters). Unit tests: tools/tests.js, fixtures in
 * tools/fixtures/lang/.
 *
 *   stripMarks(str)          ą→a ć→c ę→e ł→l ń→n ó→o ś→s ź→z ż→z (any case; same length as the input)
 *   fold(str)                for search: lower-case + stripMarks + unified quotes and apostrophes; same length
 *   wordPattern              RegExp source for one Polish word (letters, inner hyphen or apostrophe)
 *   normalizeAnswer(str)     trim, one space, lower-case, ’ → ', no final punctuation; KEEPS diacritics
 *   normalizeSentence(str)   normalizeAnswer + punctuation removed („ ” « » dashes …); keeps diacritics
 *   variants(str)            equivalent spellings, the input included (Polish: [str])
 *   countWords(str)          words of a Polish text (a dash between spaces is not a word)
 *   isTarget(text)           fallback without a lang attribute: diacritics, or Polish function words that
 *                            outweigh English ones
 *   keepsCapital(word)       does the first word of a sentence keep its capital in a word pool (reorder)
 *   abbreviations            never end a sentence (with their own full stop, as written)
 *   functionWords            frequent Polish function words (isTarget)
 *   samples                  target-language samples for the flashcard form and the import help
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const MARKS = { "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n", "ó": "o", "ś": "s", "ź": "z", "ż": "z",
    "Ą": "A", "Ć": "C", "Ę": "E", "Ł": "L", "Ń": "N", "Ó": "O", "Ś": "S", "Ź": "Z", "Ż": "Z" };
  const MARKS_RE = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g;
  const HAS_MARKS = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
  const LETTERS = "A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż";

  function str(s) { return String(s == null ? "" : s); }

  /** ą→a … ż→z; one character in, one character out (offsets stay valid). */
  function stripMarks(s) {
    return str(s).replace(MARKS_RE, function (c) { return MARKS[c]; });
  }

  /** Quotes and apostrophes, one character each: typographic → plain. */
  const QUOTES = { "„": "\"", "”": "\"", "“": "\"", "«": "\"", "»": "\"", "’": "'", "‘": "'", "ʼ": "'", "`": "'", "´": "'" };

  /**
   * For search: lower-case, without Polish marks, quotes unified. Character by character, so the result has
   * exactly the length of the input and indexes found in it are valid in the original (highlighting).
   * Other Latin letters with marks (é, ü in names) lose them too (NFD); letters NFD does not split stay.
   */
  function fold(s) {
    const src = str(s);
    let out = "";
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (MARKS[c]) { out += MARKS[c].toLowerCase(); continue; }
      if (QUOTES[c]) { out += QUOTES[c]; continue; }
      const base = c.normalize("NFD")[0].toLowerCase();
      out += base.length === 1 ? base : c;
    }
    return out;
  }

  /** Trimmed, one space, lower case, ’ → ', no punctuation at the end. Diacritics stay. */
  function normalizeAnswer(s) {
    return str(s)
      .replace(/[’‘ʼ`´]/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[\s.,!?;:…]+$/, "")
      .trim()
      .toLowerCase();
  }

  /** normalizeAnswer + every punctuation mark removed (Polish quotes „ ” and « », dashes, brackets). */
  function normalizeSentence(s) {
    return normalizeAnswer(s)
      .replace(/[.,!?;:…"„”“«»()[\]]/g, " ")
      .replace(/(^|\s)[–—-]+(?=\s|$)/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** Polish has no contractions to expand: the only spelling is the input. */
  function variants(s) { return [str(s)]; }

  /** Words of a text: a dash or punctuation between spaces is not a word. */
  function countWords(s) {
    const words = str(s).trim().split(/\s+/).filter(function (w) { return /[\p{L}\p{N}]/u.test(w); });
    return words.length;
  }

  const FUNCTION_WORDS = ["i", "w", "z", "na", "do", "że", "się", "nie", "to", "jest", "a", "ale", "o", "po"];
  // Other very frequent Polish words without diacritics (isTarget only)
  const FREQUENT = ["czy", "jak", "co", "gdzie", "kto", "tak", "jestem", "mam", "masz", "ma", "mamy", "moja", "moje",
    "ten", "ta", "tu", "tam", "bardzo", "dobry", "dobrze", "jutro", "dzisiaj", "teraz"];
  // Words that are both Polish and frequent English words: half a point to each side
  const SHARED = ["a", "i", "to", "do", "o", "no", "on"];
  // Frequent English words that are not Polish words: they show the text is "mostly English"
  const ENGLISH = ["the", "an", "is", "are", "was", "were", "of", "and", "in", "it", "you", "that", "this", "for", "with",
    "be", "have", "has", "not", "what", "my", "we", "he", "she", "they", "at", "or", "from", "your", "can", "will", "there"];

  /**
   * Is a text without a lang attribute Polish? Diacritics decide at once; otherwise Polish function words must
   * reach two points and outweigh the English ones (words shared by both languages give half a point to each).
   */
  function isTarget(text) {
    const s = str(text);
    if (HAS_MARKS.test(s)) return true;
    const words = s.toLowerCase().split(/[^a-z']+/).filter(Boolean);
    let pl = 0, en = 0;
    words.forEach(function (w) {
      if (SHARED.indexOf(w) !== -1) { pl += 0.5; en += 0.5; }
      else if (FUNCTION_WORDS.indexOf(w) !== -1 || FREQUENT.indexOf(w) !== -1) pl++;
      else if (ENGLISH.indexOf(w) !== -1) en++;
    });
    return pl >= 2 && pl > en;
  }

  /**
   * A word pool (reorder) shows the first word of the model sentence in lower case so that it does not give the
   * order away. Polish has no always-capital pronoun like English "I"; a proper noun needs the content to say so.
   */
  function keepsCapital() { return false; }

  LM.lang = {
    stripMarks: stripMarks,
    fold: fold,
    wordPattern: "[" + LETTERS + "]+(?:[-'’][" + LETTERS + "]+)*",
    normalizeAnswer: normalizeAnswer,
    normalizeSentence: normalizeSentence,
    variants: variants,
    countWords: countWords,
    isTarget: isTarget,
    keepsCapital: keepsCapital,
    abbreviations: ["np.", "tzn.", "tj.", "m.in.", "itd.", "itp.", "dr", "prof.", "ul.", "godz.", "ok."],
    functionWords: FUNCTION_WORDS,
    samples: { basicFront: "Zgadzam się.", basicBack: "I agree.", cloze: "Wczoraj {{poszłam}} do kina.", clozeAlternatives: "{{poszłam|poszedłem}}" }
  };
})(window.LM);
