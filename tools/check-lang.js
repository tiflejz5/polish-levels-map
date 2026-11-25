/*
 * check-lang.js — fails when code contains Polish UI text or language facts outside js/lang.js and js/config.js
 * (spec 04 §4, CLAUDE.md rules 4 and 5).
 *
 *   node tools/check-lang.js          (or: npm run check:lang)
 *
 * Scanned: js/, css/, index.html, tools/ (comments included: comments must be English too).
 * Not scanned: js/lang.js and js/config.js (the only code files that may hold Polish), this file (it holds the
 * stop list), tools/legacy/ (unchanged validators of the original app, deleted in stage 4), tools/fixtures/ (data).
 *
 * Rules (one finding per rule and line):
 *   diacritics   Polish letters ą ć ę ł ń ó ś ź ż, any case
 *   quote        the Polish opening quote „ (the closing ” is also the English closing quote, so it is allowed)
 *   stop-word    a frequent Polish UI word (whole word, any case)
 *   locale       the locale codes pl-PL, en-GB, en-US (locales come from LM.APP)
 *   legacy-name  names of the original app: ELM, elm_, niezbednik, szlak, fiszki
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
const SKIP_DIRS = ["tools/legacy", "tools/fixtures", "node_modules"];

const STOP_WORDS = ["Dodaj", "Zapisz", "Anuluj", "Usuń", "Dalej", "Wróć", "Wynik", "Poziom", "Zadanie",
  "Pokaż", "Ukryj", "Umiem", "Dziś", "Szlak", "Fiszki", "Zestaw", "Błąd", "Powtórka", "Egzamin"];

const RULES = [
  { id: "diacritics", re: /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/u },
  { id: "quote", re: /„/u },
  { id: "stop-word", re: new RegExp("(?<![\\p{L}\\p{N}_])(?:" + STOP_WORDS.join("|") + ")(?![\\p{L}\\p{N}_])", "iu") },
  { id: "locale", re: /\b(?:pl-PL|en-GB|en-US)\b/ },
  { id: "legacy-name", re: /\bELM\b|\belm_|niezbednik|szlak|fiszki/i }
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
  console.log("check:lang OK: " + files.length + " files, no Polish text or language facts outside js/lang.js and js/config.js.");
}

if (require.main === module) main();
module.exports = { checkText: checkText, RULES: RULES };
