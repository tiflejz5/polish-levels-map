/*
 * validate-lab.js — Case Lab data lab/*.json (spec 09 §1; rules of validate_plan.py check_lab, extended in stage 6).
 *
 *   cases    id is one of LM.lang.cases, unique; name, nameEn, questions, level, summary, uses, traps, topicIds;
 *            topicIds in the syllabus; nameEn and questions match LM.lang; contrasts point to another case;
 *            uses { label, pl, en }; endings singular / plural / adjective are strings or objects of strings;
 *            setTags are non-empty strings; every target-language field passes the alphabet check
 *   models   all 14 forms (7 cases × singular and plural), non-empty, alphabet; unique ids; gender, en
 *   trees    start exists; every option has exactly one of next / result / answer; next nodes exist; results are
 *            case ids; every node reachable from the start; no cycles
 *   aspect   five forms with aspect imperfective | perfective, a scene (label, description, elements on -1 … 1)
 *            and an example { pl, en }
 * A tree result or a contrast may name a case without a card yet: the views say "being written" (no warning).
 */
"use strict";

const path = require("path");
const V = require("./validate-lib");

const ELEMENT_KINDS = ["point", "range", "open-left", "open-right", "repeat", "result", "marker"];
const ASPECTS = ["imperfective", "perfective"];

function strings(v) {
  if (typeof v === "string") return [v];
  if (v && typeof v === "object") return Object.keys(v).reduce(function (a, k) { return a.concat(strings(v[k])); }, []);
  return [];
}

function checkCases(ctx, rel, d, caseIds) {
  const seen = new Set();
  (d.cards || []).concat(d.cases || []).forEach(function (c) {
    const w = rel + " " + c.id;
    ["id", "name", "nameEn", "level", "summary", "uses", "traps", "topicIds"].forEach(function (k) {
      const v = c[k];
      if (!v || (Array.isArray(v) && !v.length)) ctx.err(w, "missing " + k);
    });
    if (seen.has(c.id)) ctx.err(w, "duplicate id");
    seen.add(c.id);
    if (c.level != null && ctx.LEVELS.indexOf(c.level) === -1) ctx.err(w, "unknown level " + c.level);
    (c.topicIds || []).forEach(function (t) { if (!ctx.topics[t]) ctx.err(w, "topicId " + JSON.stringify(t) + " not in syllabus"); });
    if (c.name) V.charset(ctx, w, c.name);
    (c.uses || []).forEach(function (u, i) {
      if (!u || !u.label || !u.pl || !u.en) ctx.err(w, "use #" + (i + 1) + " needs label, pl and en");
      if (u && u.pl) V.charset(ctx, w, u.pl);
    });
  });
  (d.cases || []).forEach(function (c) {
    const w = rel + " " + c.id;
    const info = ctx.L.caseOf(c.id);
    if (caseIds.indexOf(c.id) === -1) { ctx.err(w, "case id must be one of " + caseIds.join(", ")); return; }
    if (c.nameEn && c.nameEn !== info.name) ctx.err(w, "nameEn " + JSON.stringify(c.nameEn) + " ≠ " + JSON.stringify(info.name) + " (LM.lang.cases)");
    if (c.name && c.name.toLowerCase() !== info.native) ctx.err(w, "name " + JSON.stringify(c.name) + " ≠ " + JSON.stringify(info.native) + " (LM.lang.cases)");
    if (!c.questions) ctx.err(w, "missing questions");
    else if (c.questions !== info.questions) ctx.err(w, "questions " + JSON.stringify(c.questions) + " ≠ " + JSON.stringify(info.questions) + " (LM.lang.cases)");
    if (!Array.isArray(c.setTags) || !c.setTags.length || c.setTags.some(function (t) { return typeof t !== "string" || !t.trim(); })) ctx.err(w, "setTags must be a non-empty list of tags");
    const t = c.triggers || {};
    Object.keys(t).forEach(function (k) {
      if (["prepositions", "verbs", "other"].indexOf(k) === -1) ctx.err(w, "unknown trigger group " + k);
      else if (!Array.isArray(t[k])) ctx.err(w, "triggers." + k + " must be a list");
      else t[k].forEach(function (s) { V.charset(ctx, w, s); });
    });
    if (!c.endings || !c.endings.singular || !c.endings.plural) ctx.err(w, "endings need singular and plural");
    else {
      ["singular", "plural"].forEach(function (n) { if (typeof c.endings[n] !== "object") ctx.err(w, "endings." + n + " must be an object (gender → ending)"); });
      if (c.endings.adjective && (!c.endings.adjective.singular || !c.endings.adjective.plural)) ctx.err(w, "endings.adjective needs singular and plural");
      strings(c.endings).forEach(function (s) { V.charset(ctx, w, s); });
    }
    (c.contrasts || []).forEach(function (x) {
      if (caseIds.indexOf(x.with) === -1 || x.with === c.id) ctx.err(w, "contrast with " + JSON.stringify(x.with) + ": must be another case id");
      if (!x.rule) ctx.err(w, "contrast with " + x.with + ": missing rule");
      if (!Array.isArray(x.examples) || x.examples.length < 2) ctx.err(w, "contrast with " + x.with + ": an example pair is needed");
      (x.examples || []).forEach(function (s) { V.charset(ctx, w, s); });
    });
    (c.traps || []).forEach(function (s) { V.charset(ctx, w, s); });
  });
}

function checkModels(ctx, rel, models, caseIds) {
  const seen = new Set();
  (models || []).forEach(function (m) {
    const w = rel + " model " + m.id;
    if (!m.id || seen.has(m.id)) ctx.err(w, "missing or duplicate id");
    seen.add(m.id);
    if (!m.gender || !m.en) ctx.err(w, "missing gender or en");
    ["singular", "plural"].forEach(function (num) {
      const keys = Object.keys(m[num] || {}).sort();
      if (keys.join(",") !== caseIds.slice().sort().join(",")) ctx.err(rel, "model " + m.id + ": " + num + " must have all 7 cases");
      Object.keys(m[num] || {}).forEach(function (k) {
        const f = m[num][k];
        if (typeof f !== "string" || !f.trim()) ctx.err(w, num + " " + k + ": empty form");
        else {
          V.charset(ctx, rel, f);
          if (/[^ \p{L}-]/u.test(f)) ctx.err(w, num + " " + k + ": only letters, spaces and hyphens in a form: " + JSON.stringify(f));
          if (f !== f.toLowerCase()) ctx.warn(w, num + " " + k + ": capital letter in a common-noun form " + JSON.stringify(f));
        }
      });
    });
  });
}

function checkTrees(ctx, rel, trees, caseIds) {
  const seen = new Set();
  (trees || []).forEach(function (t) {
    const w = rel + " tree " + t.id;
    if (!t.id || seen.has(t.id)) ctx.err(w, "missing or duplicate id");
    seen.add(t.id);
    if (!t.title) ctx.err(w, "missing title");
    const nodes = t.nodes || {};
    if (!nodes[t.start]) { ctx.err(w, "start node " + JSON.stringify(t.start) + " does not exist"); return; }
    Object.keys(nodes).forEach(function (id) {
      const n = nodes[id];
      if (!n.question) ctx.err(w, "node " + id + ": missing question");
      if (!Array.isArray(n.options) || n.options.length < 2) ctx.err(w, "node " + id + ": at least two options");
      (n.options || []).forEach(function (o, i) {
        const wo = "node " + id + " option #" + (i + 1);
        if (!o.label) ctx.err(w, wo + ": missing label");
        const kinds = ["next", "result", "answer"].filter(function (k) { return o[k] != null; });
        if (kinds.length !== 1) { ctx.err(w, wo + ": exactly one of next, result, answer"); return; }
        if (o.next != null && !nodes[o.next]) ctx.err(w, wo + ": next " + JSON.stringify(o.next) + " does not exist");
        if (o.result != null) {
          if (!Array.isArray(o.result) || !o.result.length) ctx.err(w, wo + ": result must be a list of case ids");
          (o.result || []).forEach(function (r) {
            if (caseIds.indexOf(r) === -1) ctx.err(w, wo + ": result " + JSON.stringify(r) + " is not a case id");
          });
          if (!o.why) ctx.err(w, wo + ": missing why");
          if (o.example) { if (!o.example.pl || !o.example.en) ctx.err(w, wo + ": example needs pl and en"); else V.charset(ctx, w, o.example.pl); }
        }
        if (o.answer != null && (!o.answer.title || !o.answer.text)) ctx.err(w, wo + ": answer needs title and text");
        (o.answer && o.answer.examples || []).forEach(function (x) { if (!x.pl || !x.en) ctx.err(w, wo + ": answer example needs pl and en"); else V.charset(ctx, w, x.pl); });
      });
    });
    // Reachability and cycles (depth-first from the start)
    const state = {};
    const visit = function (id, trail) {
      if (state[id] === 1) { ctx.err(w, "cycle: " + trail.concat(id).join(" → ")); return; }
      if (state[id] === 2) return;
      state[id] = 1;
      (nodes[id].options || []).forEach(function (o) { if (o.next && nodes[o.next]) visit(o.next, trail.concat(id)); });
      state[id] = 2;
    };
    visit(t.start, []);
    Object.keys(nodes).forEach(function (id) { if (!state[id]) ctx.err(w, "node " + id + " is not reachable from the start"); });
  });
}

function checkAspect(ctx, rel, a) {
  if (!a.title || !a.summary) ctx.err(rel, "missing title or summary");
  if (!a.verb || !a.verb.imperfective || !a.verb.perfective || !a.verb.en) ctx.err(rel, "verb needs imperfective, perfective and en");
  else { V.charset(ctx, rel, a.verb.imperfective); V.charset(ctx, rel, a.verb.perfective); }
  const forms = a.forms || [];
  if (forms.length !== 5) ctx.err(rel, "the strip has five forms (spec 09 §1), found " + forms.length);
  const seen = new Set();
  forms.forEach(function (f) {
    const w = rel + " " + f.id;
    if (!f.id || seen.has(f.id)) ctx.err(w, "missing or duplicate id");
    seen.add(f.id);
    if (!f.name || !f.form || !f.summary) ctx.err(w, "missing name, form or summary");
    if (ASPECTS.indexOf(f.aspect) === -1) ctx.err(w, "aspect must be " + ASPECTS.join(" or "));
    if (f.form) V.charset(ctx, w, f.form);
    if (!f.example || !f.example.pl || !f.example.en) ctx.err(w, "example needs pl and en");
    else V.charset(ctx, w, f.example.pl);
    const s = f.scene;
    if (!s || !s.label || !s.description || !Array.isArray(s.elements) || !s.elements.length) { ctx.err(w, "scene needs label, description and elements"); return; }
    s.elements.forEach(function (e, i) {
      if (ELEMENT_KINDS.indexOf(e.kind) === -1) ctx.err(w, "element #" + (i + 1) + ": unknown kind " + JSON.stringify(e.kind));
      ["at", "from", "to"].forEach(function (k) { if (e[k] != null && (typeof e[k] !== "number" || e[k] < -1 || e[k] > 1)) ctx.err(w, "element #" + (i + 1) + ": " + k + " must be a number in -1 … 1"); });
    });
  });
}

module.exports = function validateLab(ctx) {
  const dir = ctx.path("lab");
  const caseIds = ctx.L.cases.map(function (c) { return c.id; });
  const files = V.list(dir, /\.json$/);
  const data = {};
  files.forEach(function (f) { data[f] = V.readJson(ctx, path.join(dir, f)); });
  files.forEach(function (f) {
    const d = data[f];
    if (!d) return;
    const rel = ctx.rel(path.join(dir, f));
    if (d.cases || d.cards) checkCases(ctx, rel, d, caseIds);
    if (d.models) checkModels(ctx, rel, d.models, caseIds);
    if (d.trees) checkTrees(ctx, rel, d.trees, caseIds);
    if (d.forms) checkAspect(ctx, rel, d);
  });
};
