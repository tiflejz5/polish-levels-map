/*
 * final-logic.js — pure logic of the level final tests (no DOM, tests in tools/tests.js).
 * Spec: docs/rozbudowa-v6/spec/13-test-poziomu-i-testy-koncowe.md, section 2.
 *
 *   drawItems(pool, draw, categoryOf, rng)   draws `draw` items from the pool; each category is represented
 *                                            in proportion to its share of the pool (at least 1), items
 *                                            of one category from different topic pages where possible; an item
 *                                            worth several points counts as one; at most TYPE_LIMIT items of a
 *                                            limited type (paradigm: 2, spec 06 E6)
 *   isPassed(score, total, percent)          the pass mark counted in points (score / total ≥ percent %)
 *   breakdown(results, categoryOf)           the result split into categories and topics with mistakes
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  function X() { return LM.exLogic; }

  // Item types with a cap per drawn test (spec 06 E6: at most two "Fill the table" items)
  const TYPE_LIMIT = { paradigm: 2 };

  /**
   * Replaces items over a type's cap with unused items of other types (same category first, then any).
   * Without enough replacements the extra items stay (a small pool must still give a test).
   */
  function capTypes(picked, pool, categoryOf, rng) {
    const out = picked.slice();
    Object.keys(TYPE_LIMIT).forEach(function (type) {
      const idx = out.map(function (it, i) { return it.type === type ? i : -1; }).filter(function (i) { return i !== -1; });
      idx.slice(TYPE_LIMIT[type]).forEach(function (i) {
        const used = new Set(out);
        const free = X().shuffle(pool.filter(function (it) { return !used.has(it) && !TYPE_LIMIT[it.type]; }), rng);
        const cat = categoryOf(out[i]) || "other";
        const same = free.find(function (it) { return (categoryOf(it) || "other") === cat; });
        const repl = same || free[0];
        if (repl) out[i] = repl;
      });
    });
    return out;
  }

  /** Does the score in points reach the pass mark (e.g. 16 of 20 at 80%)? */
  function isPassed(score, total, percent) {
    return total > 0 && score * 100 >= percent * total;
  }

  /** Picks k items, preferring different topics (the next item from a topic not used yet, when there is one). */
  function pickSpread(items, k, rng) {
    const left = X().shuffle(items, rng);
    const out = [];
    const used = new Set();
    while (out.length < k && left.length) {
      let i = left.findIndex(function (it) { return !used.has(it.topic); });
      if (i === -1) i = 0;
      const it = left.splice(i, 1)[0];
      used.add(it.topic);
      out.push(it);
    }
    return out;
  }

  /** How many items from each category: proportional (largest remainder method), at least 1, at most as many as the pool has. */
  function allocate(counts, draw) {
    const cats = Object.keys(counts);
    const total = cats.reduce(function (s, c) { return s + counts[c]; }, 0);
    const alloc = {};
    const quota = function (c) { return draw * counts[c] / total; };
    cats.forEach(function (c) { alloc[c] = Math.min(counts[c], Math.max(1, Math.floor(quota(c)))); });
    let sum = cats.reduce(function (s, c) { return s + alloc[c]; }, 0);
    while (sum < draw) {
      const room = cats.filter(function (c) { return alloc[c] < counts[c]; });
      if (!room.length) break;
      room.sort(function (a, b) { return (quota(b) - alloc[b]) - (quota(a) - alloc[a]) || (a < b ? -1 : 1); });
      alloc[room[0]]++; sum++;
    }
    while (sum > draw) {
      const over = cats.filter(function (c) { return alloc[c] > 1; });
      if (!over.length) break;
      over.sort(function (a, b) { return (alloc[b] - quota(b)) - (alloc[a] - quota(a)) || (a < b ? -1 : 1); });
      alloc[over[0]]--; sum--;
    }
    return alloc;
  }

  /**
   * Drawing a test: `draw` items from the pool (an item worth several points is still one item). The item's category
   * from categoryOf(item). Returns an array in random order in which the same item type does not come
   * more than twice in a row. A pool not bigger than `draw` → all items.
   */
  function drawItems(pool, draw, categoryOf, rng) {
    const byCat = {};
    pool.forEach(function (it) {
      const c = categoryOf(it) || "other";
      (byCat[c] = byCat[c] || []).push(it);
    });
    const counts = {};
    Object.keys(byCat).forEach(function (c) { counts[c] = byCat[c].length; });
    const alloc = pool.length <= draw ? counts : allocate(counts, draw);
    let picked = [];
    Object.keys(byCat).sort().forEach(function (c) { picked = picked.concat(pickSpread(byCat[c], alloc[c], rng)); });
    picked = capTypes(picked, pool, categoryOf, rng);
    // Order: the same type at most twice in a row (limitRuns is one-pass, so after an unlucky
    // shuffle we try again; after 40 tries the last one stays)
    let order;
    for (let tries = 0; tries < 40; tries++) {
      order = X().limitRuns(X().shuffle(picked, rng), 2);
      if (!order.some(function (it, i) { return i >= 2 && order[i - 1].type === it.type && order[i - 2].type === it.type; })) break;
    }
    return order;
  }

  /**
   * The result breakdown. results = [{ item, res }] (res from LM.exLogic.evaluate; null → no answer).
   * Returns { categories: [{ key, score, total }] (in order of first appearance),
   * topics: [{ topic, lost, wrong }] — topics that lost points, most lost first }.
   * Skipped items (max = 0) do not count.
   */
  function breakdown(results, categoryOf) {
    const cats = [];
    const byCat = {};
    const byTopic = {};
    results.forEach(function (r) {
      const max = r.res ? r.res.max : X().maxPoints(r.item);
      if (!max) return;
      const pts = r.res ? r.res.points || 0 : 0;
      const c = categoryOf(r.item) || "other";
      if (!byCat[c]) { byCat[c] = { key: c, score: 0, total: 0 }; cats.push(byCat[c]); }
      byCat[c].score += pts;
      byCat[c].total += max;
      if (pts < max && r.item.topic) {
        const t = byTopic[r.item.topic] || (byTopic[r.item.topic] = { topic: r.item.topic, lost: 0, wrong: 0 });
        t.lost += max - pts;
        t.wrong++;
      }
    });
    const topics = Object.keys(byTopic).map(function (k) { return byTopic[k]; })
      .sort(function (a, b) { return b.lost - a.lost || b.wrong - a.wrong || (a.topic < b.topic ? -1 : 1); });
    return { categories: cats, topics: topics };
  }

  LM.finalLogic = { TYPE_LIMIT: TYPE_LIMIT, isPassed: isPassed, allocate: allocate, drawItems: drawItems, breakdown: breakdown };
})(window.LM);
