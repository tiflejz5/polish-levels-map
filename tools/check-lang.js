/*
 * check-lang.js — fails when code contains Polish UI text or language facts outside js/lang.js and js/config.js
 * (spec 04 §4, CLAUDE.md rules 4 and 5).
 *
 *   node tools/check-lang.js          (or: npm run check:lang)
 *
 * Scanned: js/, css/, index.html, tools/, assets/ (*.js, *.svg; not vendor/ or fonts/); comments included: comments must be English too.
 * Not scanned: js/lang.js and js/config.js (the only code files that may hold Polish), this file (it holds the
 * stop list), tools/fixtures/ (data, including the Polish test fixtures).
 *
 * Rules (one finding per rule and line). Polish language facts live only in js/lang.js, js/config.js and content/
 * (stage 3, spec 05):
 *   diacritics     Polish letters, any case (the letters are written as escapes in RULES below)
 *   quote          the Polish opening quote (U+201E; the closing quote is also the English one, so it is allowed)
 *   stop-word      a frequent Polish UI word (whole word, any case)
 *   locale         the locale codes pl-PL, en-GB, en-US (locales come from LM.APP)
 *   legacy-name    names of the original app: ELM, elm_, niezbednik, szlak, fiszki, kraina, sciaga, matura, u-moje-
 *   lang-code      js/: a hard-coded language code as a string ("pl", lang: "en"); use LM.APP.targetLang / uiLocale
 *   abbreviation   js/: a Polish abbreviation as a string ("np.", "m.in.", …); they are LM.lang.abbreviations
 *   function-word  js/: a Polish function word as a string ("jest", "nie", "ale"); they are LM.lang.functionWords
 *   english-rule   js/: names of the English rules deleted in stage 3 (contractions, en-GB voices, isPolish, …)
 *   speech-api     js/: the Web Speech API outside js/speech.js (one implementation, LM.speech)
 *
 * False positives go into tools/check-lang-allow.json: [{ "file", "contains", "reason" }]. An entry matches a
 * finding when the file is the same and the line contains the given text. Unused entries are reported as warnings.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ALLOW_FILE = path.join(__dirname, "check-lang-allow.json");

const SKIP_FILES = ["js/lang.js", "js/config.js", "tools/check-lang.js"];
const SKIP_DIRS = ["tools/fixtures", "node_modules", "assets/vendor", "assets/fonts"];

const STOP_WORDS = ["Dodaj", "Zapisz", "Anuluj", "Usuń", "Dalej", "Wróć", "Wynik", "Poziom", "Zadanie",
  "Pokaż", "Ukryj", "Umiem", "Dziś", "Szlak", "Fiszki", "Zestaw", "Błąd", "Powtórka", "Egzamin",
  "Opanowane", "Nowe", "Wszystkie", "Zapisano", "Gotowe", "Talia", "Talie", "Karta", "Karty", "Notatki", "Statystyki",
  "Podsumowanie", "Zwroty", "Egzaminy", "Wyszukiwarka", "Zmieniono", "Dodano", "Usunieto", "pkt"];

const JS = /^js\//;
const RULES = [
  { id: "diacritics", re: /[\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c\u0104\u0106\u0118\u0141\u0143\u00d3\u015a\u0179\u017b]/u },
  { id: "quote", re: /\u201e/u },
  { id: "stop-word", re: new RegExp("(?<![\\p{L}\\p{N}_])(?:" + STOP_WORDS.join("|") + ")(?![\\p{L}\\p{N}_])", "iu") },
  { id: "locale", re: /\b(?:pl-PL|en-GB|en-US)\b/ },
  { id: "legacy-name", re: /\bELM\b|\belm_|niezbednik|szlak|fiszki|kraina|sciaga|\bmatura|u-moje-/i },
  { id: "lang-code", only: JS, re: /\blang\s*[:=]\s*["'][a-z]{2}(?:-[A-Za-z]{2})?["']|["'](?:pl|pl-pl|pl_PL)["']|\/\^pl\b/ },
  { id: "abbreviation", only: JS, re: /["'](?:np|tzn|tj|m\.in|itd|itp|godz|ul|prof|ok)\.["']/ },
  { id: "function-word", only: JS, re: /["'](?:jest|nie|ale|sie|ze)["']/i },
  { id: "english-rule", only: JS, re: /\b(?:FIXED_CONTRACTIONS|CONTRACTION|expandWord|sentenceVariants|isPolish|inPolishColumn|inExplanationColumn|targetVoices|speechLang|hasTargetLetters|foldChars)\b|en\[-_\]GB/ },
  { id: "speech-api", only: JS, except: ["js/speech.js"], re: /\bspeechSynthesis\b|\bSpeechSynthesisUtterance\b/ }
];

function rel(p) { return path.relative(ROOT, p).split(path.sep).join("/"); }

function listFiles() {
  const out = [];
  function walk(dir, exts) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
      const full = path.join(dir, d.name);
      const r = rel(full);
      if (d.isDirectory()) {
        if (SKIP_DIRS.indexOf(r) === -1 && d.name !== "node_modules") walk(full, exts);
      } else if (exts.indexOf(path.extname(d.name)) !== -1 && SKIP_FILES.indexOf(r) === -1) out.push(full);
    });
  }
  walk(path.join(ROOT, "js"), [".js"]);
  walk(path.join(ROOT, "css"), [".css"]);
  walk(path.join(ROOT, "tools"), [".js"]);
  walk(path.join(ROOT, "assets"), [".js", ".svg"]);
  out.push(path.join(ROOT, "index.html"));
  return out;
}

function loadAllow() {
  if (!fs.existsSync(ALLOW_FILE)) return [];
  const list = JSON.parse(fs.readFileSync(ALLOW_FILE, "utf8"));
  if (!Array.isArray(list)) throw new Error("check-lang-allow.json must be an array");
  return list.map(function (e) {
    if (!e.file || !e.contains || !e.reason) throw new Error("check-lang-allow.json: every entry needs file, contains and reason");
    return { file: e.file, contains: e.contains, reason: e.reason, used: 0 };
  });
}

/** Pure check of one file's text; exported for the unit tests. */
function checkText(file, text, allow) {
  const findings = [];
  text.split(/\r?\n/).forEach(function (line, i) {
    RULES.forEach(function (rule) {
      if (rule.only && !rule.only.test(file)) return;
      if (rule.except && rule.except.indexOf(file) !== -1) return;
      const m = rule.re.exec(line);
      if (!m) return;
      const a = (allow || []).find(function (e) { return e.file === file && line.indexOf(e.contains) !== -1; });
      if (a) { a.used++; return; }
      findings.push({ file: file, line: i + 1, rule: rule.id, match: m[0], text: line.trim().slice(0, 140) });
    });
  });
  return findings;
}

function main() {
  const allow = loadAllow();
  const files = listFiles();
  let findings = [];
  files.forEach(function (f) { findings = findings.concat(checkText(rel(f), fs.readFileSync(f, "utf8"), allow)); });
  allow.filter(function (e) { return !e.used; }).forEach(function (e) {
    console.warn("warning: unused allow entry: " + e.file + " · " + JSON.stringify(e.contains));
  });
  if (findings.length) {
    findings.forEach(function (f) { console.log(f.file + ":" + f.line + "  [" + f.rule + " " + JSON.stringify(f.match) + "]  " + f.text); });
    const byFile = {};
    findings.forEach(function (f) { byFile[f.file] = (byFile[f.file] || 0) + 1; });
    console.log("\ncheck:lang FAILED: " + findings.length + " findings in " + Object.keys(byFile).length + " files.");
    process.exit(1);
  }
  console.log("check:lang OK: " + files.length + " files, no Polish text or language facts outside js/lang.js, js/config.js and content/.");
}

if (require.main === module) main();
module.exports = { checkText: checkText, RULES: RULES };
