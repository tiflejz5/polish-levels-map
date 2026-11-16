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
  const add = function (r) {
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
    add({ id: "cheatsheet:" + lvl, group: "pages", title: "Ściąga " + lvl, headings: headings(md.body), summary: md.meta.summary || "", text: clean(md.body), level: lvl, category: "Ściąga", route: "#/" + lvl.toLowerCase() + "/sciaga" });
  });

  // ---------- Exams from the registry ----------
  const regFile = C.content("exams", "registry.json");
  const exams = C.exists(regFile) ? (C.readJson(regFile).exams || []) : [];
  exams.forEach(function (exam) {
    const dir = C.content("exams", exam.id);
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
  add({ id: "fiszki", group: "exercises", title: "Fiszki i błędy", summary: "Jedna kolejka powtórek: fiszki z talii, Moje błędy i słabe punkty z ćwiczeń, w rosnących odstępach.", text: "fiszki flashcards powtórki active recall talie dziennik błędów słabe punkty", category: "Fiszki", route: "#/powtorki" });
  add({ id: "fiszki:bledy", group: "exercises", title: "Moje błędy (fiszki)", summary: "Talia fiszek z wpisów Dziennika błędów.", text: "fiszki moje błędy dziennik", category: "Fiszki", route: "#/powtorki/talie/talia/u-moje-bledy" });
  add({ id: "fiszki:slowa", group: "exercises", title: "Moje słowa", summary: "Słowa i wyrażenia zaznaczone w tekstach, ze zdaniem i znaczeniem.", text: "moje słowa słowniczek osobisty zapisane słówka fiszki zaznaczenie", category: "Fiszki", route: "#/powtorki/moje-slowa" });

  // Phrase bank (B1 extras): the bank page and each group
  const phrasesFile = C.content("writing", "phrases.json");
  if (C.exists(phrasesFile)) {
    const groups = C.readJson(phrasesFile).groups || [];
    add({ id: "zwroty", group: "exercises", title: "Bank zwrotów do pisania", summary: "Zwroty według funkcji z filtrem poziomu, rejestru i gatunku.", text: "zwroty pisanie phrases writing " + groups.map(function (g) { return g.label; }).join(" "), category: "Pisanie", route: "#/pisanie/zwroty" });
    groups.forEach(function (g) {
      add({ id: "zwroty:" + g.id, group: "exercises", title: "Zwroty: " + g.label, summary: g.description || "", text: g.phrases.map(function (p) { return p.text + " " + p.en; }).join(" "), category: "Pisanie", route: "#/pisanie/zwroty/" + g.id });
    });
  }

  // Built-in decks by title (no cards)
  const decksFile = C.content("decks", "index.json");
  if (C.exists(decksFile)) C.readJson(decksFile).decks.forEach(function (d) {
    add({ id: "fiszki:talia:" + d.id, group: "exercises", title: d.title + " (fiszki)", summary: d.description, text: "fiszki talia " + d.title + " " + d.level, category: "Fiszki", route: "#/powtorki/talie/talia/" + d.id });
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
        add({ id: "set:" + id, group: "exercises", title: s.title, summary: s.intro || "", text: "Temat: " + (topicTitle[t] || t), level: s.level, category: "Zestaw zadań", route: "#/cwiczenia/zestaw/" + id });
      });
    });
  }
  const mixFile = C.content("exercises", "mixes.json");
  if (C.exists(mixFile)) C.readJson(mixFile).mixes.forEach(function (m) {
    add({ id: "mix:" + m.id, group: "exercises", title: m.title, summary: m.description || "", text: "Zestaw mieszany. Tematy: " + m.topics.map(function (t) { return topicTitle[t] || t; }).join(", "), category: "Zestaw mieszany", route: "#/cwiczenia/mix/" + m.id });
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
  return "search: " + records.length + " records (" + Object.keys(groups).map(function (g) { return g + " " + groups[g]; }).join(", ") + "), " + Math.round(json.length / 1024) + " kB";
};
