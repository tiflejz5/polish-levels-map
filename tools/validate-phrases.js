/*
 * validate-phrases.js — the writing phrase bank writing/phrases.json (spec 07 §8; the original phrase-bank rules,
 * target text in the field `text`). Written in the B1 level extras; until then the file does not exist.
 *
 *   groups: unique id, label, genres ⊂ GENRES; at least 14 groups, 8–14 phrases each, 140–180 in all (ctx.full and
 *   strictComplete only: the size rules start with the content that brings the bank)
 *   phrase: id <group id>-NN unique, text (target) and en, level B1 | B2 | C1, register formal | neutral | informal,
 *   genres ⊂ the group's genres, example and note ≤ 200 characters; no duplicate English phrases;
 *   a group whose phrases all have one level → warning
 */
"use strict";

const V = require("./validate-lib");

const GENRES = ["email", "letter", "blog", "forum", "essay", "article", "review", "report", "proposal", "story"];
const REGISTERS = ["formal", "neutral", "informal"];
const LEVELS = ["B1", "B2", "C1"];

function norm(s) { return String(s).trim().replace(/\s+/g, " ").replace(/’/g, "'").replace(/[.,!?;]+$/, "").toLowerCase(); }

module.exports = function validatePhrases(ctx) {
  const file = ctx.path("writing", "phrases.json");
  const d = V.readJson(ctx, file);
  if (!d) return { phrases: 0 };
  const rel = ctx.rel(file);
  const groups = d.groups || [];
  const sizeRules = ctx.strictComplete;
  if (sizeRules && groups.length < 14) ctx.err(rel, groups.length + " groups, at least 14");
  const gids = {}, ids = {}, ens = {};
  let total = 0;
  groups.forEach(function (g) {
    const at = rel + " group " + JSON.stringify(g.id);
    const ph = g.phrases || [];
    total += ph.length;
    if (!g.id || gids[g.id]) ctx.err(at, "missing or duplicate group id");
    gids[g.id] = true;
    if (!g.label) ctx.err(at, "label missing");
    if (sizeRules && (ph.length < 8 || ph.length > 14)) ctx.err(at, ph.length + " phrases (8–14)");
    if (!g.genres || !g.genres.length || g.genres.some(function (x) { return GENRES.indexOf(x) === -1; })) ctx.err(at, "genres outside " + GENRES.join(", "));
    const levels = {};
    ph.forEach(function (x) {
      const q = rel + " phrase " + JSON.stringify(x.id);
      if (!x.id || ids[x.id]) ctx.err(q, "missing or duplicate id");
      ids[x.id] = true;
      if (!new RegExp("^" + g.id + "-\\d{2}$").test(String(x.id))) ctx.err(q, "id must be " + g.id + "-NN");
      if (LEVELS.indexOf(x.level) === -1) ctx.err(q, "level B1 / B2 / C1");
      levels[x.level] = true;
      if (REGISTERS.indexOf(x.register) === -1) ctx.err(q, "register outside " + REGISTERS.join(", "));
      if (x.genres && x.genres.some(function (y) { return (g.genres || []).indexOf(y) === -1; })) ctx.err(q, "genres must be a subset of the group's genres");
      if (!x.en || !x.text) ctx.err(q, "text and en are required");
      const key = norm(String(x.en || "").replace(/…/g, ""));
      if (ens[key]) ctx.err(q, "repeats " + ens[key]);
      ens[key] = x.id;
      if ((x.example && String(x.example).length > 200) || (x.note && String(x.note).length > 200)) ctx.err(q, "example and note: at most 200 characters");
      if (x.text) V.charset(ctx, q, x.text);
      if (x.example) V.charset(ctx, q, x.example);
    });
    if (ph.length > 1 && Object.keys(levels).length < 2) ctx.warn(at, "all phrases have one level");
  });
  if (sizeRules && (total < 140 || total > 180)) ctx.err(rel, total + " phrases in all (140–180)");
  return { phrases: total };
};
