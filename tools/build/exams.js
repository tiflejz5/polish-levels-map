/*
 * build/exams.js — exam registry and exam data (spec 06 E8, spec 12).
 *
 * Sources: <exams dir>/registry.json  { exams: [{ id, code, label, level, status, order, accent, … }] }
 *          <exams dir>/<id>/manifest.json, pages/*.md, sets/*.json, training/*.json (paths from the manifest)
 * Output:  data/exams-registry.js   LM.EXAM_REGISTRY = { version, exams, links, boxTitles, sets }   (small, at start)
 *          data/exam-<id>.js        (LM.EXAMS = LM.EXAMS || {})[id] = { manifest, pages, trainers }  (lazy)
 *
 * <exams dir> is content/exams; the tests point it at tools/fixtures/exam-demo (C.useExamsDir).
 * No registry file = empty registry (the sidebar group stays hidden). Sets are item-format sets, built by
 * build/exercises.js; the lettered formats of the original app's C1 module are gone.
 */
"use strict";

const path = require("path");
const C = require("./common");

module.exports = function buildExams() {
  const root = C.examsDir();
  const regFile = path.join(root, "registry.json");
  const registry = C.exists(regFile) ? C.readJson(regFile) : { exams: [] };
  const exams = (registry.exams || []).slice().sort(function (a, b) { return (a.order || 99) - (b.order || 99); });
  const links = {};
  const boxTitles = {};
  const sets = {};
  const summary = [];
  const src = C.examsSource();

  exams.forEach(function (exam) {
    const dir = path.join(root, exam.id);
    if (exam.status !== "active" || !C.exists(path.join(dir, "manifest.json"))) return;
    const manifest = C.readJson(path.join(dir, "manifest.json"));
    const pages = {};
    const trainers = {};
    const ids = [];
    manifest.sections.forEach(function (sec) {
      (sec.pages || []).forEach(function (p) {
        const file = path.join(dir, p.file);
        if (C.exists(file)) pages[p.id] = C.read(file);
        else C.warn("exams/" + exam.id + ": no page file " + p.file);
      });
      (sec.exerciseGroups || []).forEach(function (g) {
        g.sets.forEach(function (s) {
          ids.push(s.id);
          sets[s.id] = { exam: exam.id, label: s.label, group: g.label, maxScore: s.maxScore || null, href: "#/practice/set/" + s.id };
        });
      });
      (sec.trainers || []).forEach(function (t) {
        const file = path.join(dir, t.file);
        if (C.exists(file)) trainers[t.id] = C.readJson(file);
        else C.warn("exams/" + exam.id + ": no trainer file " + t.file);
      });
    });
    exam.setIds = ids;
    if (C.exists(path.join(dir, "links.json"))) {
      const pw = C.readJson(path.join(dir, "links.json"));
      links[exam.id] = pw.links || [];
      if (pw.boxTitle) boxTitles[exam.id] = pw.boxTitle;
    }
    C.writeData("exam-" + exam.id + ".js", src + "/" + exam.id + "/",
      "(LM.EXAMS = LM.EXAMS || {})[" + JSON.stringify(exam.id) + "] = " +
      JSON.stringify({ manifest: manifest, pages: pages, trainers: trainers }) + ";");
    summary.push(exam.id + ": " + Object.keys(pages).length + " pages, " + Object.keys(trainers).length + " trainers");
  });

  C.writeData("exams-registry.js", src + "/registry.json",
    "LM.EXAM_REGISTRY = " + JSON.stringify({ version: 1, exams: exams, links: links, boxTitles: boxTitles, sets: sets }) + ";");
  return "exams: " + (exams.length ? exams.map(function (e) { return e.id + (e.status === "active" ? "" : " (" + e.status + ")"); }).join(", ") : "registry empty") +
    (summary.length ? " | " + summary.join(" | ") : "");
};
