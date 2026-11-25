/*
 * build/search.js — search index → data/search-index.js (LM.SEARCH_INDEX, lazy: loaded when search opens).
 *
 * Groups and sources:
 *   pages      topic pages, level summaries, cheat sheets (content/pages, summaries, cheatsheets)
 *   exams      pages of active exams in the registry (content/exams/<id>/)
 *   exercises  topic sets, mixes, decks, fixed shortcuts (flashcards, My words, writing)
 *   lab        Case Lab entries: added in stage 6
 * Notes and the mistake log are private: js/search.js adds them in the browser, not this file.
 *
 * Record: { id, group, title, headings[], summary, text (no Markdown, max 4000 chars), level, category, route }
 * Above ~1 MB the text is clipped to 900 characters per record.
 *
 * STAGE 1A: routes and shortcut texts are still those of the ported app (Polish UI). Stage 1B switches the
 * routes (spec 02 §6), stage 2 translates the texts.
 */
"use strict";

const path = require("path");
const C = require("./common");

const TEXT_MAX = 4000;
const SIZE_LIMIT = 1024 * 1024;

/** ## and ### headings (without #). */
function headings(body) {
  return (body.match(/^#{2,3}\s+.+$/gm) || []).map(function (h) { return clean(h.replace(/^#+\s+/, "")); });
}

/** Text without Markdown syntax (links, [[id]], bold, tables, quotes, lists). */
function clean(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|?\s*:?-{2,}.*$/gm, " ")
    .replace(/\|/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+(\[[ xX]\]\s*)?/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_`~]+/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ") > max * 0.8 ? cut.lastIndexOf(" ") : max);
}

module.exports = function buildSearch(ctx) {
  const records = [];
  // Levels with status "soon" are not indexed (spec 06 E1): records with such a level are dropped
  const status = C.readJson(C.content("levels.json"));
  let soonSkipped = 0;
  const add = function (r) {
    if (r.level && status[String(r.level).toUpperCase()] !== "available") { soonSkipped++; return; }
    records.push({
      id: r.id, group: r.group, title: r.title || "", headings: r.headings || [], summary: r.summary || "",
      text: clip(r.text || "", TEXT_MAX), level: r.level || null, category: r.category || null, route: r.route
    });
  };
  const categories = ctx.syllabus.categories || {};
  const topicTitle = {};

  // ---------- Topic pages ----------
  ctx.topics.forEach(function (t) {
    topicTitle[t.id] = t.title;
    const rel = C.pageFileOf(t.id);
    const file = C.content("pages", rel);
    if (!C.exists(file)) return;
    const md = C.splitMd(C.read(file));
    if (md.meta.title) topicTitle[t.id] = md.meta.title;
    add({
      id: "page:" + t.id, group: "pages", title: md.meta.title || t.title, headings: headings(md.body),
      summary: md.meta.summary || "", text: clean(md.body.replace(/^#\s+.+$/m, "")), level: t.level,
      category: categories[t.category] || t.category, route: "#/" + rel.replace(/\.md$/, "")
    });
  });
  C.list(C.content("summaries"), /^[abc][12]\.md$/i).forEach(function (f) {
    const lvl = f.replace(/\.md$/i, "").toUpperCase();
    const md = C.splitMd(C.read(C.content("summaries", f)));
    add({ id: "summary:" + lvl, group: "pages", title: "Podsumowanie poziomu " + lvl, headings: headings(md.body), text: clean(md.body), level: lvl, route: "#/" + lvl.toLowerCase() });
  });
  C.list(C.content("cheatsheets"), /^[abc][12]\.md$/i).forEach(function (f) {
    const lvl = f.replace(/\.md$/i, "").toUpperCase();
    const md = C.splitMd(C.read(C.content("cheatsheets", f)));
    add({ id: "cheatsheet:" + lvl, group: "pages", title: "Cheat sheet " + lvl, headings: headings(md.body), summary: md.meta.summary || "", text: clean(md.body), level: lvl, category: "Cheat sheet", route: "#/" + lvl.toLowerCase() + "/cheatsheet" });
  });

  // ---------- Exams from the registry ----------
  const regFile = path.join(C.examsDir(), "registry.json");
  const exams = C.exists(regFile) ? (C.readJson(regFile).exams || []) : [];
  exams.forEach(function (exam) {
    const dir = path.join(C.examsDir(), exam.id);
    if (exam.status !== "active" || !C.exists(path.join(dir, "manifest.json"))) return;
    C.readJson(path.join(dir, "manifest.json")).sections.forEach(function (sec) {
      (sec.pages || []).forEach(function (pg) {
        const file = path.join(dir, pg.file);
        if (!C.exists(file)) return;
        const md = C.splitMd(C.read(file));
        add({
          id: exam.id + ":" + pg.id, group: "exams", title: md.meta.title || pg.label, headings: headings(md.body), summary: md.meta.summary || "",
          text: clean(md.body.replace(/^#\s+.+$/m, "")), level: null, category: exam.label + " · " + sec.label,
          route: "#/exams/" + exam.id + (pg.id === "overview" ? "" : "/" + pg.id)
        });
      });
    });
  });

  // ---------- Flashcards: shortcuts only (cards are not indexed: too much noise) ----------
  add({ id: "cards", group: "exercises", title: "Flashcards and mistakes", summary: "One review queue: flashcards from decks, My mistakes and weak spots from practice, at growing intervals.", text: "flashcards review active recall decks mistake log weak spots", category: "Flashcards", route: "#/review" });
  add({ id: "cards:mistakes", group: "exercises", title: "My mistakes (flashcards)", summary: "A flashcard deck made from the entries of the mistake log.", text: "flashcards my mistakes mistake log", category: "Flashcards", route: "#/review/decks/deck/u-moje-bledy" });
  add({ id: "cards:words", group: "exercises", title: "My words", summary: "Words and phrases you selected in texts, with the sentence and the meaning.", text: "my words personal glossary saved words flashcards selection", category: "Flashcards", route: "#/review/words" });

  // Phrase bank (B1 extras): the bank page and each group
  const phrasesFile = C.content("writing", "phrases.json");
  if (C.exists(phrasesFile)) {
    const groups = C.readJson(phrasesFile).groups || [];
    add({ id: "phrases", group: "exercises", title: "Phrase bank for writing", summary: "Phrases by function with level, register and text type filters.", text: "phrases writing phrase bank " + groups.map(function (g) { return g.label; }).join(" "), category: "Writing", route: "#/writing/phrases" });
    groups.forEach(function (g) {
      add({ id: "zwroty:" + g.id, group: "exercises", title: "Zwroty: " + g.label, summary: g.description || "", text: g.phrases.map(function (p) { return p.text + " " + p.en; }).join(" "), category: "Writing", route: "#/writing/phrases/" + g.id });
    });
  }

  // Built-in decks by title (no cards)
  const decksFile = C.content("decks", "index.json");
  if (C.exists(decksFile)) C.readJson(decksFile).decks.forEach(function (d) {
    add({ id: "cards:deck:" + d.id, group: "exercises", title: d.title + " (flashcards)", summary: d.description, text: "flashcards deck " + d.title + " " + d.level, category: "Flashcards", route: "#/review/decks/deck/" + d.id });
  });

  // ---------- Exercises (topic sets and mixes) ----------
  const mapFile = C.content("exercises", "topics.json");
  if (C.exists(mapFile)) {
    const map = C.readJson(mapFile).topics || {};
    Object.keys(map).forEach(function (t) {
      map[t].forEach(function (id) {
        const file = C.content("exercises", id + ".json");
        if (!C.exists(file)) return;
        const s = C.readJson(file);
        add({ id: "set:" + id, group: "exercises", title: s.title, summary: s.intro || "", text: "Topic: " + (topicTitle[t] || t), level: s.level, category: "Exercise set", route: "#/practice/set/" + id });
      });
    });
  }
  const mixFile = C.content("exercises", "mixes.json");
  if (C.exists(mixFile)) C.readJson(mixFile).mixes.forEach(function (m) {
    add({ id: "mix:" + m.id, group: "exercises", title: m.title, summary: m.description || "", text: "Mixed set. Topics: " + m.topics.map(function (t) { return topicTitle[t] || t; }).join(", "), category: "Mixed set", route: "#/practice/mix/" + m.id });
  });

  // ---------- Write (with size control) ----------
  let json = JSON.stringify({ version: 1, records: records });
  if (json.length > SIZE_LIMIT) {
    records.forEach(function (r) { r.text = clip(r.text, 900); });
    json = JSON.stringify({ version: 1, records: records });
  }
  C.writeData("search-index.js", "content/", "LM.SEARCH_INDEX = " + json + ";");
  const groups = {};
  records.forEach(function (r) { groups[r.group] = (groups[r.group] || 0) + 1; });
  return "search: " + records.length + " records (" + Object.keys(groups).map(function (g) { return g + " " + groups[g]; }).join(", ") + "), " + Math.round(json.length / 1024) + " kB" + (soonSkipped ? ", " + soonSkipped + " records of soon levels left out" : "");
};
