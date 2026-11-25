/*
 * validate-decks.js — flashcard decks (spec 07 §7; rules of validate_plan.py check_deck and the original deck validator).
 *
 *   decks/index.json   version 1; every entry: id, title, level, file that exists, count = number of cards; unique ids
 *   decks/<id>.json    id = index id; cards: id <deck id>-NNN unique in all decks, level A1–C2, tags (warning);
 *                      typed: front, accepted, back; cloze: exactly one {{gap}}, hint (English), en (warning); other types → error
 * Target fields (accepted, back, example, cloze text) go through the charset check, accepted answers through the
 * pronoun and speaker-gender heuristics (E11). Deck files without an index entry are checked too (the examples have none).
 */
"use strict";

const path = require("path");
const V = require("./validate-lib");

function checkDeck(ctx, file, cardIds) {
  const rel = ctx.rel(file);
  const d = V.readJson(ctx, file);
  if (!d) return null;
  if (!V.nonEmpty(d.id)) ctx.err(rel, "id missing");
  const cards = Array.isArray(d.cards) ? d.cards : [];
  if (!cards.length) ctx.err(rel, "no cards");
  let typed = 0;
  cards.forEach(function (c, i) {
    const w = rel + " #" + (i + 1);
    if (!new RegExp("^" + String(d.id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "-\\d{3}$").test(String(c.id))) ctx.err(w, "card id must be <deck id>-NNN");
    if (cardIds.has(c.id)) ctx.err(w, "duplicate id");
    cardIds.add(c.id);
    if (ctx.LEVELS.indexOf(c.level) === -1) ctx.err(w, "level missing");
    if (!(Array.isArray(c.tags) && c.tags.length)) ctx.warn(w, "no tags");
    if (c.type === "typed") {
      typed++;
      if (!V.nonEmpty(c.front) || !Array.isArray(c.accepted) || !c.accepted.length || !V.nonEmpty(c.back)) ctx.err(w, "typed: front, accepted, back");
      (c.accepted || []).forEach(function (a) { V.charset(ctx, w, a); });
      if (c.back) V.charset(ctx, w, c.back);
      if (c.example) V.charset(ctx, w, c.example);
      V.pronounVariants(ctx, w, c.accepted);
      V.speakerGender(ctx, w, c.accepted, c.front + " " + (c.note || ""));
    } else if (c.type === "cloze") {
      const gaps = String(c.text || "").match(/\{\{[^}]+\}\}/g) || [];
      if (gaps.length !== 1) ctx.err(w, "cloze: exactly one {{gap}}");
      if (!V.nonEmpty(c.hint)) ctx.err(w, "cloze: hint (English) missing");
      if (!V.nonEmpty(c.en)) ctx.warn(w, "cloze: no English translation (en)");
      V.charset(ctx, w, c.text || "");
      if (gaps.length === 1) V.speakerGender(ctx, w, gaps[0].slice(2, -2).split("|"), (c.hint || "") + " " + (c.en || "") + " " + (c.note || ""));
    } else ctx.err(w, "unknown card type " + JSON.stringify(c.type));
  });
  return { deck: d, count: cards.length, typed: typed };
}

module.exports = function validateDecks(ctx) {
  const dir = ctx.path("decks");
  const cardIds = new Set();
  const files = V.list(dir, /\.json$/).filter(function (f) { return f !== "index.json"; });
  const checked = {};
  files.forEach(function (f) { checked[f] = checkDeck(ctx, path.join(dir, f), cardIds); });
  const index = V.readJson(ctx, path.join(dir, "index.json"));
  if (index) {
    const rel = ctx.rel(path.join(dir, "index.json"));
    if (index.version !== 1) ctx.err(rel, "version must be 1");
    const ids = new Set(), listed = new Set();
    (index.decks || []).forEach(function (e) {
      const at = rel + " " + (e.id || "?");
      if (!V.nonEmpty(e.id) || ids.has(e.id)) ctx.err(at, "missing or duplicate id");
      ids.add(e.id);
      if (!V.nonEmpty(e.title)) ctx.err(at, "title missing");
      listed.add(e.file);
      const c = checked[e.file];
      if (c === undefined) { ctx.err(at, "no file decks/" + e.file); return; }
      if (!c) return;
      if (c.deck.id !== e.id) ctx.err(at, "deck file id " + c.deck.id + " ≠ index id");
      if (e.count !== c.count) ctx.err(at, "count is " + e.count + " but the deck has " + c.count + " cards");
    });
    files.forEach(function (f) { if (!listed.has(f)) ctx.warn(ctx.rel(path.join(dir, f)), "not listed in decks/index.json (not built)"); });
  }
  return { decks: files.length, cards: cardIds.size };
};
