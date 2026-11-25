/*
 * build/exams.js — exam registry and exam data (spec 06 E8, spec 12).
 *
 * Sources: content/exams/registry.json  { exams: [{ id, code, label, route, status, order, … }] }
 *          content/exams/<id>/manifest.json, links.json, pages/*.md, trainers/*.json, sets/*.json (paths from the manifest)
 * Output:  data/exams-registry.js   LM.EXAM_REGISTRY = { version, exams, links, boxTitles, sets }   (small, at start)
 *          data/exam-<id>.js        (LM.EXAMS = LM.EXAMS || {})[id] = { manifest, pages, trainers, exercises }  (lazy)
 *
 * No registry file = empty registry (the sidebar group stays hidden). Item-format sets go through build/exercises.js.
 */
"use strict";

const path = require("path");
const C = require("./common");
const answerDistribution = require("./answer-distribution");

const C1_TYPES = ["multiple-choice-cloze", "word-formation", "open-cloze", "transformation"];
/** Section trainers: "trainer" (one) or "trainers" (a list). */
function sectionTrainers(sec) { return Array.isArray(sec.trainers) ? sec.trainers : sec.trainer ? [sec.trainer] : []; }

module.exports = function buildExams() {
  const regFile = C.content("exams", "registry.json");
  const registry = C.exists(regFile) ? C.readJson(regFile) : { exams: [] };
  const exams = (registry.exams || []).slice().sort(function (a, b) { return (a.order || 99) - (b.order || 99); });
  const links = {};
  const boxTitles = {};
  const sets = {};
  const summary = [];

  exams.forEach(function (exam) {
    const dir = C.content("exams", exam.id);
    if (exam.status !== "active" || !C.exists(path.join(dir, "manifest.json"))) return;
    const manifest = C.readJson(path.join(dir, "manifest.json"));
    const pages = {};
    const trainers = {};
    const exercises = {};
    const ids = [];
    manifest.sections.forEach(function (sec) {
      (sec.pages || []).forEach(function (p) {
        const file = path.join(dir, p.file);
        if (C.exists(file)) pages[p.id] = C.read(file);
      });
      (sec.exerciseGroups || []).forEach(function (g) {
        g.sets.forEach(function (s) {
          ids.push(s.id);
          const file = path.join(dir, s.file);
          const json = C.exists(file) ? C.readJson(file) : null;
          const lettered = !!json && C1_TYPES.indexOf(json.type) !== -1;
          if (lettered) exercises[s.id] = json;
          const spread = lettered ? answerDistribution.check(json) : null;
          if (spread) throw new Error("answer letters in exams/" + exam.id + "/" + s.id + ": " + spread);
          sets[s.id] = {
            exam: exam.id, label: s.label, group: g.label, maxScore: s.maxScore || null, format: lettered ? "c1" : "items",
            href: lettered ? "#/exams/" + exam.id + "/sets/" + s.id : "#/practice/set/" + s.id
          };
        });
      });
      sectionTrainers(sec).forEach(function (t) {
        const file = path.join(dir, t.file);
        if (C.exists(file)) trainers[t.id] = C.readJson(file);
      });
    });
    exam.setIds = ids;
    if (C.exists(path.join(dir, "links.json"))) {
      const pw = C.readJson(path.join(dir, "links.json"));
      links[exam.id] = pw.links || [];
      if (pw.boxTitle) boxTitles[exam.id] = pw.boxTitle;
    }
    C.writeData("exam-" + exam.id + ".js", "content/exams/" + exam.id + "/",
      "(LM.EXAMS = LM.EXAMS || {})[" + JSON.stringify(exam.id) + "] = " +
      JSON.stringify({ manifest: manifest, pages: pages, trainers: trainers, exercises: exercises }) + ";");
    summary.push(exam.id + ": " + Object.keys(pages).length + " pages, " + Object.keys(trainers).length + " trainers");
  });

  C.writeData("exams-registry.js", "content/exams/registry.json",
    "LM.EXAM_REGISTRY = " + JSON.stringify({ version: 1, exams: exams, links: links, boxTitles: boxTitles, sets: sets }) + ";");
  return "exams: " + (exams.length ? exams.map(function (e) { return e.id + (e.status === "active" ? "" : " (" + e.status + ")"); }).join(", ") : "registry empty") +
    (summary.length ? " | " + summary.join(" | ") : "");
};
