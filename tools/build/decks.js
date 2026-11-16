/*
 * build/decks.js — flashcard decks.
 *
 *   data/decks-index.js      LM.DECKS_INDEX = { version, decks: [{ id, title, description, level, count, file }] }  (small, at start)
 *   data/decks/<id>.js       (LM.DECKS = LM.DECKS || {})[id] = deck   (lazy)
 *
 * Source: content/decks/index.json (order, titles) and content/decks/<file>. A new deck = a JSON file + an index entry.
 */
"use strict";

const C = require("./common");

module.exports = function buildDecks() {
  const indexFile = C.content("decks", "index.json");
  const index = C.exists(indexFile) ? C.readJson(indexFile) : { version: 1, decks: [] };
  let cards = 0;
  const decks = [];
  index.decks.forEach(function (d) {
    const file = C.content("decks", d.file);
    if (!C.exists(file)) { C.warn("decks/index.json: no file " + d.file + " (skipped)"); return; }
    const deck = C.readJson(file);
    cards += deck.cards.length;
    const out = C.writeData("decks/" + d.id + ".js", "content/decks/" + d.file,
      "(LM.DECKS = LM.DECKS || {})[" + JSON.stringify(d.id) + "] = " + JSON.stringify(deck) + ";");
    decks.push({ id: d.id, title: d.title, description: d.description, level: d.level, count: deck.cards.length, file: out });
  });
  C.writeData("decks-index.js", "content/decks/index.json", "LM.DECKS_INDEX = " + JSON.stringify({ version: index.version, decks: decks }) + ";");
  return "decks: " + decks.length + ", cards: " + cards;
};
