/*
 * build/answer-distribution.js — rule for "choose A, B, C or D" sets (gaps[].options = { A, B, C, D },
 * gaps[].answer = letter): no letter is correct in more than 50% of the gaps of a set and none is correct
 * more than 2 times in a row. Sets with one or two gaps are skipped (the rule makes no sense there).
 * (Ported from rozklad-regula.js; messages are translated in stage 2.)
 *
 * Use: require("./answer-distribution").check(set) → error text or null;
 *      checkAll() → errors for every content/exams/<exam>/sets/*.json (none until stage E).
 * Called by build/exams.js (npm run build) and tools/validate.js: an error stops them.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..", "content", "exams");
const MAX_SHARE = 0.5;
const MAX_RUN = 2;

function isLettered(set) {
  return !!set && Array.isArray(set.gaps) && set.gaps.length > 0 && set.gaps.every(function (g) {
    return g && g.options && typeof g.options === "object" && !Array.isArray(g.options) && typeof g.answer === "string";
  });
}

/** Opis naruszenia reguły albo null. */
function check(set) {
  if (!isLettered(set) || set.gaps.length < 3) return null;
  const seq = set.gaps.map(function (g) { return g.answer; });
  const counts = {};
  seq.forEach(function (l) { counts[l] = (counts[l] || 0) + 1; });
  const dist = Object.keys(counts).sort().map(function (l) { return l + counts[l]; }).join(" ") + " [" + seq.join("") + "]";
  const worst = Object.keys(counts).reduce(function (a, l) { return counts[l] > counts[a] ? l : a; }, Object.keys(counts)[0]);
  if (counts[worst] / seq.length > MAX_SHARE) return "litera " + worst + " poprawna w " + counts[worst] + " z " + seq.length + " luk (max 50%): " + dist;
  let run = 1;
  for (let i = 1; i < seq.length; i++) {
    run = seq[i] === seq[i - 1] ? run + 1 : 1;
    if (run > MAX_RUN) return "litera " + seq[i] + " poprawna więcej niż " + MAX_RUN + " razy z rzędu (luki " + (i - MAX_RUN + 1) + "–" + (i + 1) + "): " + dist;
  }
  return null;
}

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out; // no exam data in this repo yet
  fs.readdirSync(dir).forEach(function (name) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.json$/.test(name) && path.basename(path.dirname(p)) === "sets") out.push(p);
  });
  return out;
}

/** Errors of every lettered set in content/exams/<exam>/sets/*.json. → [{ file, id, error }] */
function checkAll() {
  const errors = [];
  walk(ROOT, []).sort().forEach(function (file) {
    let json;
    try { json = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, "")); } catch (e) { return; }
    (function find(x) {
      if (Array.isArray(x)) { x.forEach(find); return; }
      if (!x || typeof x !== "object") return;
      if (isLettered(x)) {
        const e = check(x);
        if (e) errors.push({ file: path.relative(ROOT, file).replace(/\\/g, "/"), id: x.id || path.basename(file), error: e });
      } else Object.keys(x).forEach(function (k) { find(x[k]); });
    })(json);
  });
  return errors;
}

module.exports = { check: check, checkAll: checkAll, isLettered: isLettered };
