/*
 * syllabus.js — LM.syllabus: the one list of levels, units, categories and topics (spec 06 E1, E2).
 *
 * Source: LM.SYLLABUS (data/syllabus.js, generated from content/syllabus.json + content/levels.json).
 * The checklist is the list of topics: progress[<topic id>] = true. Nothing here touches the DOM or storage,
 * so tools/tests.js runs it in Node.
 *
 *   levelIds()                     ["A1", …, "C2"] in syllabus order
 *   level(id)                      { id, land, goal, status, units } or null
 *   isAvailable(id)                status "available" (spec 06 E1); "soon" levels have no pages, links or ticks
 *   availableLevelIds()
 *   categories(), categoryName(id) { cases: "Cases", … }
 *   topics(levelId)                topics of a level in unit order: [{ id, level, unit, category, title, example }]
 *   allTopics(), topic(id)
 *   groups(levelId)                [{ id, name, topics }] by category, in order of first appearance (level page)
 *   units(levelId)                 [{ id, title, topics }]
 *   slugOf(id), route(id)          "cases-accusative", "#/a1/cases-accusative"
 *   topicByRoute(levelId, slug)    topic or null
 *   pageFile(id)                   "a1/cases-accusative.md" (key in LM.PAGES.pages)
 *   stats(progress, levelId)       { done, total, percent }
 *   countDone(progress)            ticked topics of available levels (Today, profile list, celebrations)
 *
 * LM.LEVEL_IDS: the fixed CEFR list (the syllabus must contain exactly these levels; tools/validate.js checks it).
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  LM.LEVEL_IDS = ["A1", "A2", "B1", "B2", "C1", "C2"];

  const EMPTY = { categories: {}, levels: [] };
  const TOPIC_ID = /^([abc][12])-(.+)$/;

  let cache = null; // { src, levels, byId, all } rebuilt when LM.SYLLABUS is replaced (tests swap it)

  function index() {
    const src = LM.SYLLABUS || EMPTY;
    if (cache && cache.src === src) return cache;
    const byId = {};
    const all = [];
    const levels = {};
    (src.levels || []).forEach(function (l) {
      levels[l.id] = l;
      (l.units || []).forEach(function (u) {
        (u.topics || []).forEach(function (t) {
          const topic = Object.assign({ level: l.id, unit: u.id }, t);
          byId[t.id] = topic;
          all.push(topic);
        });
      });
    });
    cache = { src: src, levels: levels, byId: byId, all: all };
    return cache;
  }

  function levelIds() { return (index().src.levels || []).map(function (l) { return l.id; }); }
  function level(id) { return index().levels[id] || null; }
  function isAvailable(id) { const l = level(id); return !!l && l.status === "available"; }
  function availableLevelIds() { return levelIds().filter(isAvailable); }

  function categories() { return index().src.categories || {}; }
  function categoryName(id) { return categories()[id] || id || ""; }

  function allTopics() { return index().all; }
  function topic(id) { return index().byId[id] || null; }
  function topics(levelId) { return index().all.filter(function (t) { return t.level === levelId; }); }

  function units(levelId) {
    const l = level(levelId);
    if (!l) return [];
    return l.units.map(function (u) {
      return { id: u.id, title: u.title, topics: u.topics.map(function (t) { return topic(t.id); }) };
    });
  }

  /** Topics grouped by category, groups in order of first appearance, topics in unit order (spec 06 E2). */
  function groups(levelId) {
    const out = [];
    const byCat = {};
    topics(levelId).forEach(function (t) {
      if (!byCat[t.category]) {
        byCat[t.category] = { id: t.category, name: categoryName(t.category), topics: [] };
        out.push(byCat[t.category]);
      }
      byCat[t.category].topics.push(t);
    });
    return out;
  }

  function slugOf(id) { const m = TOPIC_ID.exec(id || ""); return m ? m[2] : ""; }
  function levelOfId(id) { const m = TOPIC_ID.exec(id || ""); return m ? m[1].toUpperCase() : null; }
  function route(id) { const m = TOPIC_ID.exec(id || ""); return m ? "#/" + m[1] + "/" + m[2] : "#/"; }
  function pageFile(id) { const m = TOPIC_ID.exec(id || ""); return m ? m[1] + "/" + m[2] + ".md" : null; }

  function topicByRoute(levelId, slug) {
    return topic(String(levelId).toLowerCase() + "-" + slug);
  }

  function stats(progress, levelId) {
    const list = topics(levelId);
    const done = list.filter(function (t) { return progress && progress[t.id] === true; }).length;
    return { done: done, total: list.length, percent: list.length ? Math.round((done / list.length) * 100) : 0 };
  }

  function countDone(progress) {
    if (!progress) return 0;
    return index().all.filter(function (t) { return progress[t.id] === true && isAvailable(t.level); }).length;
  }

  LM.syllabus = {
    levelIds: levelIds, level: level, isAvailable: isAvailable, availableLevelIds: availableLevelIds,
    categories: categories, categoryName: categoryName,
    allTopics: allTopics, topic: topic, topics: topics, units: units, groups: groups,
    slugOf: slugOf, levelOfId: levelOfId, route: route, pageFile: pageFile, topicByRoute: topicByRoute,
    stats: stats, countDone: countDone
  };
})(window.LM);
