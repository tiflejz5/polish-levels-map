/*
 * extract-strings.js — lists the string literals of the UI code that a user may see (spec 04 §4, step 6).
 * A reading aid for the consistency pass, not a validator: it uses heuristics and never fails.
 *
 *   node tools/extract-strings.js              every candidate as  file:line  "text"
 *   node tools/extract-strings.js --unique     each text once, with its count, sorted A–Z
 *   node tools/extract-strings.js --count      only the totals
 *   node tools/extract-strings.js --file js/today.js   one file only
 *
 * Sources: js/*.js (string and template literals, comments skipped), index.html (text nodes and the
 * attributes title, aria-label, placeholder, alt, content), css/*.css (content: "…").
 * A literal counts as UI text when it has a letter and looks like words rather than code: CSS class lists,
 * routes, file names, identifiers, storage keys and regular expressions are dropped.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

/** Returns [{ text, line }] for every string / template literal in JS source; comments and regexes are skipped. */
function jsLiterals(src) {
  const out = [];
  let i = 0, line = 1, last = "";
  const n = src.length;
  function push(text, ln) { out.push({ text: text, line: ln }); }
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "\n") { line++; i++; continue; }
    if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") line++; i++; }
      i += 2; continue;
    }
    if (c === "\"" || c === "'") {
      const start = line; let s = ""; i++;
      while (i < n && src[i] !== c) {
        if (src[i] === "\\") { s += src[i + 1] === "n" ? "\n" : src[i + 1]; i += 2; continue; }
        if (src[i] === "\n") line++;
        s += src[i++];
      }
      i++; push(s, start); last = "x"; continue;
    }
    if (c === "`") {
      const start = line; let s = ""; i++;
      while (i < n && src[i] !== "`") {
        if (src[i] === "\\") { s += src[i + 1]; i += 2; continue; }
        if (src[i] === "$" && src[i + 1] === "{") {
          let depth = 1; i += 2; s += "{…}";
          while (i < n && depth) { if (src[i] === "{") depth++; else if (src[i] === "}") depth--; if (src[i] === "\n") line++; i++; }
          continue;
        }
        if (src[i] === "\n") line++;
        s += src[i++];
      }
      i++; push(s, start); last = "x"; continue;
    }
    if (c === "/" && /[(,=:[!&|?{};+\-*%<>~^]|^$|return$/.test(last)) {
      // regular expression literal
      i++; let inClass = false;
      while (i < n && src[i] !== "\n") {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === "[") inClass = true; else if (src[i] === "]") inClass = false;
        else if (src[i] === "/" && !inClass) break;
        i++;
      }
      i++; while (/[a-z]/.test(src[i] || "")) i++;
      last = "x"; continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (/[A-Za-z_$0-9]/.test(c)) {
      let w = ""; while (i < n && /[A-Za-z_$0-9]/.test(src[i])) w += src[i++];
      last = w === "return" || w === "typeof" ? "return" : "x"; continue;
    }
    last = c; i++;
  }
  return out;
}

const CODE_LIKE = [
  /^[a-z0-9_.:#\/?=&%-]*$/i,                       // one token: id, class, key, route, file
  /^[a-z0-9_-]+(?:\s+[a-z0-9_-]+)*$/,              // lower-case class list "btn btn-primary"
  /^(?:#|\.|\/|\.\/|data\/|js\/|assets\/|https?:)/, // routes, selectors, paths, URLs
  /^[\w-]+\.(?:js|css|json|md|html|svg|png|woff2?)(\?.*)?$/i,
  /^plm\./,
  /^[\s\W\d]*$/                                    // no letters
];

function looksLikeUi(text) {
  const t = text.trim();
  if (t.length < 2 || !/\p{L}/u.test(t)) return false;
  if (CODE_LIKE.some(function (re) { return re.test(t); })) return /^[A-Z][a-z]+$/.test(t); // keep "Next", "Done"
  if (/^[a-z]+(?:[A-Z][a-z0-9]*)+$/.test(t)) return false; // camelCase
  if (/[{};]\s*$|=>|function\s*\(/.test(t)) return false; // code in a string
  if (/^\s*[\w-]+\s*:\s*[^ ]+;?$/.test(t) && !/\s\w+\s/.test(t)) return false; // css "width: 10px"
  return true;
}

function htmlStrings(src) {
  const out = [];
  const lines = src.split(/\r?\n/);
  lines.forEach(function (l, i) {
    let m;
    const attr = /\b(?:title|aria-label|placeholder|alt|content)="([^"]+)"/g;
    while ((m = attr.exec(l))) if (looksLikeUi(m[1]) && !/^width=|^text\/|^#|^\w+-\w+$/.test(m[1])) out.push({ text: m[1], line: i + 1 });
    const tx = />([^<>]+)</g;
    while ((m = tx.exec(l))) { const t = m[1].trim(); if (t && looksLikeUi(t)) out.push({ text: t, line: i + 1 }); }
  });
  return out;
}

function cssStrings(src) {
  const out = [];
  src.split(/\r?\n/).forEach(function (l, i) {
    const m = /content:\s*"([^"]*\p{L}[^"]*)"/u.exec(l);
    if (m) out.push({ text: m[1], line: i + 1 });
  });
  return out;
}

function collect(onlyFile) {
  const rows = [];
  function add(file, list) { list.forEach(function (x) { rows.push({ file: file, line: x.line, text: x.text }); }); }
  fs.readdirSync(path.join(ROOT, "js")).filter(function (f) { return f.endsWith(".js"); }).sort().forEach(function (f) {
    const file = "js/" + f;
    if (onlyFile && onlyFile !== file) return;
    add(file, jsLiterals(fs.readFileSync(path.join(ROOT, file), "utf8")).filter(function (x) { return looksLikeUi(x.text); }));
  });
  if (!onlyFile || onlyFile === "index.html") add("index.html", htmlStrings(fs.readFileSync(path.join(ROOT, "index.html"), "utf8")));
  fs.readdirSync(path.join(ROOT, "css")).filter(function (f) { return f.endsWith(".css"); }).forEach(function (f) {
    const file = "css/" + f;
    if (!onlyFile || onlyFile === file) add(file, cssStrings(fs.readFileSync(path.join(ROOT, file), "utf8")));
  });
  return rows;
}

function main() {
  const args = process.argv.slice(2);
  const fi = args.indexOf("--file");
  const rows = collect(fi !== -1 ? args[fi + 1] : null);
  const uniq = {};
  rows.forEach(function (r) { const k = r.text.replace(/\s+/g, " ").trim(); uniq[k] = (uniq[k] || 0) + 1; });
  if (args.indexOf("--count") !== -1) {
    console.log(rows.length + " UI string literals, " + Object.keys(uniq).length + " unique.");
    return;
  }
  if (args.indexOf("--unique") !== -1) {
    Object.keys(uniq).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (k) { console.log(String(uniq[k]).padStart(3) + "  " + k); });
  } else {
    rows.forEach(function (r) { console.log(r.file + ":" + r.line + "  " + JSON.stringify(r.text)); });
  }
  console.log("\n" + rows.length + " UI string literals, " + Object.keys(uniq).length + " unique.");
}

if (require.main === module) main();
module.exports = { jsLiterals: jsLiterals, looksLikeUi: looksLikeUi };
