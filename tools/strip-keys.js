/*
 * strip-keys.js — items without their answer key, for the solver subagent (spec 10 §4, step 4).
 *
 *   node tools/strip-keys.js <file or folder>… [--out tasks.json]
 *   npm run strip-keys -- content/quizzes/a1 content/exercises/a1-cases-accusative-1.json
 *
 * Reads quizzes, exercise sets, final tests (items) and the placement test (questions); writes JSON
 * { about, count, tasks: [{ id, type, level, task, … }] } to stdout or --out. Folders are read recursively (*.json,
 * except exercises/topics.json and mixes.json).
 *
 * Removed everywhere: correct, accepted, answers, explanation, optionNotes, trap, tags, fixes, errorRange, noError, parts.
 * What the solver gets instead, by type:
 *   multiple-choice  prompt / question, options (file order), passage of the set or question
 *   reorder          context, words: the tiles in the app's shuffled order (never the solution)
 *   find-error       tokens (numbered), and the instruction to say which tokens are wrong and the fix (or "no mistake")
 *   short-answer     prompt with its ___ gap
 *   gap-fill         text with {{n}} gaps, context, gap hints
 *   match            prompt, mode, left column, right column shuffled
 *   transformation   source, keyword, before ___ after, word limit
 *   translate        source (English), hint
 *   dictation        text (the key IS the text: the solver lists acceptable spellings and checks the sentence)
 *   paradigm         prompt, lemma, gloss, cells: label + the given forms only
 * Shuffles use a seed from the item id, so the output is the same on every run.
 */
"use strict";

const fs = require("fs");
const path = require("path");

global.window = global.window || global;
require(path.join(__dirname, "..", "js", "config.js"));
require(path.join(__dirname, "..", "js", "lang.js"));
require(path.join(__dirname, "..", "js", "exercise-logic.js"));
const X = global.window.LM.exLogic;

/** A small deterministic generator from a string (the item id). */
function seeded(text) {
  let x = 0;
  for (let i = 0; i < text.length; i++) x = (x * 31 + text.charCodeAt(i)) % 2147483647;
  x = x || 1;
  return function () { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
}

const TASK = {
  "multiple-choice": "Choose the one correct option.",
  "reorder": "Put all the words in order to make a sentence that means the English context.",
  "find-error": "Say which token(s) contain the mistake (indexes from 0) and give the correction, or say there is no mistake.",
  "short-answer": "Type what goes in the gap ___.",
  "gap-fill": "Type what goes in each gap {{n}} (a hint in brackets is the base form).",
  "match": "Match every item on the left with one item on the right.",
  "transformation": "Complete the second sentence so it means the same as the source, using the key word unchanged (word limit given).",
  "translate": "Translate the English sentence.",
  "dictation": "This is a dictation: the learner hears this text. List every spelling a careful teacher would also accept and flag any mistake in it.",
  "paradigm": "Fill in every cell of the table that is not given."
};

function strip(it, ctx) {
  const id = String(it.id || "");
  const out = { id: id, type: it.type || "multiple-choice", level: it.level || ctx.level || null, task: TASK[it.type || "multiple-choice"] || "" };
  const passage = it.passage || ctx.passage;
  switch (out.type) {
    case "multiple-choice":
      if (passage && (it.kind === "reading" || it.passage)) out.passage = passage;
      if (it.script) out.transcript = it.script;
      out.prompt = it.prompt != null ? it.prompt : it.question;
      out.options = it.options;
      break;
    case "reorder":
      out.context = it.context;
      out.words = X.reorderTokens(it, seeded(id)).map(function (t) { return t.text; });
      break;
    case "find-error":
      out.tokens = (it.tokens || []).map(function (t, i) { return i + ": " + t; });
      break;
    case "short-answer":
      if (it.context) out.context = it.context;
      out.prompt = it.prompt;
      break;
    case "gap-fill":
      if (it.context) out.context = it.context;
      out.text = it.text;
      out.gapHints = (it.gaps || []).map(function (g, i) { return g.hint ? "{{" + (i + 1) + "}} " + g.hint : null; }).filter(Boolean);
      break;
    case "match":
      out.prompt = it.prompt;
      out.mode = it.mode;
      out.left = (it.pairs || []).map(function (p) { return p[0]; });
      out.right = X.prepareMatch(it, seeded(id)).map(function (r) { return r.text; });
      break;
    case "transformation":
      out.source = it.source;
      out.keyword = it.keyword;
      out.sentence = [it.before, "___", it.after].filter(Boolean).join(" ");
      out.wordLimit = X.transformationLimit(it);
      break;
    case "translate":
      out.source = it.source;
      if (it.hint) out.hint = it.hint;
      break;
    case "dictation":
      out.text = it.text;
      break;
    case "paradigm":
      out.prompt = it.prompt;
      out.lemma = it.lemma;
      if (it.gloss) out.gloss = it.gloss;
      out.cells = (it.cells || []).map(function (c) { return c.given ? { label: c.label, given: (c.accepted || [])[0] } : { label: c.label }; });
      break;
    default:
      out.unknown = true;
  }
  return out;
}

/** Items of one file with their context: { level, passage, items }. */
function itemsOf(file) {
  const d = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
  if (Array.isArray(d.questions)) return { level: null, passage: null, items: d.questions };
  return { level: d.level || null, passage: d.passage || null, items: d.items || [] };
}

function files(arg) {
  const p = path.resolve(arg);
  if (!fs.existsSync(p)) throw new Error("no such file or folder: " + arg);
  if (fs.statSync(p).isFile()) return [p];
  let out = [];
  fs.readdirSync(p).sort().forEach(function (f) {
    const full = path.join(p, f);
    if (fs.statSync(full).isDirectory()) out = out.concat(files(full));
    else if (/\.json$/.test(f) && f !== "topics.json" && f !== "mixes.json" && f !== "index.json") out.push(full);
  });
  return out;
}

function stripFiles(list) {
  const tasks = [];
  list.forEach(function (f) {
    const ctx = itemsOf(f);
    ctx.items.forEach(function (it) { tasks.push(strip(it, ctx)); });
  });
  return tasks;
}

function main() {
  const argv = process.argv.slice(2);
  const o = argv.indexOf("--out");
  const outFile = o !== -1 ? argv[o + 1] : null;
  const inputs = argv.filter(function (a, i) { return a !== "--out" && (o === -1 || i !== o + 1); });
  if (!inputs.length) {
    console.error("usage: node tools/strip-keys.js <file or folder>… [--out tasks.json]");
    process.exit(2);
  }
  let list = [];
  inputs.forEach(function (a) { list = list.concat(files(a)); });
  const tasks = stripFiles(list);
  const json = JSON.stringify({ about: "Tasks without the answer key (tools/strip-keys.js) for the solver subagent, spec 10 §4.", count: tasks.length, tasks: tasks }, null, 2) + "\n";
  if (outFile) { fs.writeFileSync(outFile, json, "utf8"); console.error("strip-keys: " + tasks.length + " tasks → " + outFile); }
  else process.stdout.write(json);
}

if (require.main === module) main();
module.exports = { strip: strip, stripFiles: stripFiles };
