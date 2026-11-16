/*
 * build.js — the one build entry point (spec 02 §4).
 *
 *   npm run build              validate → regenerate data/ from content/ → stamp the version
 *   npm run build -- --bump    the same, after raising "lmVersion" in package.json by one
 *
 * data/ is wiped and written again on every run, so it never keeps files of deleted content.
 * Version stamp: package.json "lmVersion" is the only source. The build rewrites ?v=N on every
 * <script src> and <link href> of local files in index.html and LM.VERSION in js/config.js
 * (LM.loadModule adds it to lazy files). Nobody edits ?v= by hand.
 *
 * Generators live in tools/build/*.js (one per data family).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const C = require("./build/common");

const t0 = Date.now();
const bump = process.argv.indexOf("--bump") !== -1;

// 1. Validate (errors stop the build)
const v = require("./validate");
if (v.errors.length) { console.error("build: stopped, fix the validation errors first"); process.exit(1); }

// 2. Version
const pkgFile = path.join(C.ROOT, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
if (!Number.isInteger(pkg.lmVersion) || pkg.lmVersion < 1) throw new Error("package.json: \"lmVersion\" must be a positive integer");
if (bump) {
  pkg.lmVersion += 1;
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}
const version = pkg.lmVersion;

// 3. Generate data/
fs.rmSync(C.DATA, { recursive: true, force: true });
fs.mkdirSync(C.DATA, { recursive: true });
const ctx = require("./build/syllabus")();
const report = [ctx.summary];
[
  require("./build/pages"),
  require("./build/trail"),
  require("./build/exercises"),
  require("./build/placement"),
  require("./build/finals"),
  require("./build/decks"),
  require("./build/lab"),
  require("./build/writing"),
  require("./build/exams"),
  require("./build/search")
].forEach(function (step) { report.push(step(ctx)); });

// 4. Stamp the version (rewrites only when something changes, so a clean build leaves the tree clean)
function rewrite(file, fn) {
  const before = fs.readFileSync(file, "utf8");
  const after = fn(before);
  if (after !== before) fs.writeFileSync(file, after, "utf8");
  return after !== before;
}
const htmlFile = path.join(C.ROOT, "index.html");
const html = fs.readFileSync(htmlFile, "utf8");
const localRef = /(<(?:script|link)\b[^>]*?\s(?:src|href)=")((?!https?:|\/\/|data:)[^"?#]+\.(?:js|css))(?:\?v=\d+)?(")/g;
const refs = (html.match(localRef) || []).length;
const htmlChanged = rewrite(htmlFile, function (s) { return s.replace(localRef, "$1$2?v=" + version + "$3"); });
const cfgChanged = rewrite(path.join(C.ROOT, "js", "config.js"), function (s) {
  if (!/^LM\.VERSION = \d+;/m.test(s)) throw new Error("js/config.js: line \"LM.VERSION = <n>;\" not found");
  return s.replace(/^LM\.VERSION = \d+;/m, "LM.VERSION = " + version + ";");
});

// 5. Report
report.forEach(function (r) { console.log("  " + r); });
C.warnings.forEach(function (w) { console.log("WARNING  " + w); });
console.log("build: " + C.written.length + " files in data/, version " + version + (bump ? " (bumped)" : "") +
  ", index.html " + refs + " refs" + (htmlChanged ? " (updated)" : "") + (cfgChanged ? ", LM.VERSION updated" : "") +
  ", " + (Date.now() - t0) + " ms");
