/*
 * final.js — level final tests A1–C2 (pack v6, spec 13 section 2).
 *
 *   #/a1/test … #/c2/test   start screen → a session in Exam mode in the exercise engine
 *                           (js/exercise-engine.js, LM.exercises.startFinal) → result
 *
 * The level's pool of 30 items: content/tests/final-<level>.json → data/final-<level>.js (tools/build/finals.js),
 * loaded on demand. Drawing 20 items with a proportional share of categories and the pass mark in points:
 * js/final-logic.js. Result and level badge: LM.profileData (plm.finals).
 *
 * Also here: the “level passed” badge (Trail, sidebar, level header), the “Final test” card on the level page
 * and the tip on the “Today” page (≥ 70% “I know this” at the level).
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const U = LM.utils;
  const el = U.el;

  const DRAW = 20;
  const PASS = 80;
  const MINUTES = 15;
  const READY_PERCENT = 70; // from this % of “I know this” at the level we suggest the final test

  function pd() { return LM.profileData; }
  function F() { return LM.finalLogic; }
  function levelHash(level) { return LM.app.levelHash(level); }
  function testHash(level) { return "#/" + String(level).toLowerCase() + "/test"; }

  /** “2026-11-12” → “Nov 12, 2026”. */
  function fmtDate(day) { return LM.fmt.date(day) || String(day || ""); }

  function categories() { return LM.syllabus.categories(); }
  function categoryLabel(key) { return categories()[key] || key; }
  function categoryOf(item) { return item.category || "grammar"; }

  // =====================================================================
  // LEVEL BADGE (Trail, sidebar, level header)
  // =====================================================================

  /** The day the active profile passed the level (“YYYY-MM-DD”) or null. */
  function passedAt(level) {
    const r = LM.app.getActiveProfile() ? pd().finalResult(level) : null;
    return r && r.passedAt ? r.passedAt : null;
  }

  /** Text for screen readers and labels: “A1 passed · Nov 12, 2026” or null. */
  function passedText(level) {
    const d = passedAt(level);
    return d ? level + " passed · " + fmtDate(d) : null;
  }

  /**
   * Badge stamp: an award icon in a circle (a shape, not colour alone) + hidden text “A1 passed · Nov 12, 2026”
   * (opts.hideText — when the parent link gives the label).
   */
  function stamp(level, opts) {
    const text = passedText(level);
    if (!text) return null;
    opts = opts || {};
    return el("span", { class: "lvl-stamp lvl-" + level + (opts.cls ? " " + opts.cls : ""), "data-level": level }, [
      el("span", { class: "lvl-stamp-icon", "aria-hidden": "true" }, LM.icon("award", { size: opts.size || 14 })),
      opts.hideText ? null : el("span", { class: "visually-hidden", text: text })
    ]);
  }

  /** The label “Passed · Nov 12, 2026” in the level page header (visible text) or null. */
  function headerLabel(level) {
    const d = passedAt(level);
    if (!d) return null;
    return el("p", { class: "lvl-passed-label lvl-" + level }, [
      el("span", { class: "lvl-stamp-icon", "aria-hidden": "true" }, LM.icon("award", { size: 16 })),
      el("span", { text: "Passed · " + fmtDate(d) }),
      el("span", { class: "visually-hidden", text: " (" + level + " final test)" })
    ]);
  }

  // =====================================================================
  // DATA
  // =====================================================================

  /** The level's pool (Promise → the set, or null when there is no file). */
  function load(level) {
    if (LM.FINALS && LM.FINALS[level]) return Promise.resolve(LM.FINALS[level]);
    return LM.loadModule("data/final-" + level.toLowerCase() + ".js").then(function () {
      return (LM.FINALS && LM.FINALS[level]) || null;
    }, function () { return null; });
  }

  /** Points needed to pass for the given total of the test (the pass mark in points). */
  function pointsNeeded(total, percent) { return Math.ceil(total * percent / 100); }

  function percentOf(r) { return r.total ? Math.round(r.score / r.total * 100) : 0; }

  // =====================================================================
  // START SCREEN
  // =====================================================================

  function backTo(level) { return { href: levelHash(level), label: "Back to level " + level }; }

  function renderStart(view, level) {
    document.title = level + " final test · " + LM.APP.appTitle;
    view.className = "view tool-view ex-view lf-view lvl-" + level;
    if (!LM.syllabus.isAvailable(level)) { // a "soon" level has no final test yet (spec 06 E1)
      view.appendChild(el("section", { class: "card page-pending", "aria-labelledby": "lf-soon-title" }, [
        el("h1", { class: "page-pending-title", id: "lf-soon-title", text: level + " final test" }),
        el("p", { class: "page-pending-lead", text: level + " is on its way. Its final test comes with its topics." }),
        el("p", null, el("a", { class: "btn btn-secondary", href: levelHash(level) }, LM.ui.withIcon("chevron-left", "See the planned topics")))
      ]));
      return;
    }
    const info = pd().finalResult(level);
    const msg = el("p", { class: "tool-note lf-msg", role: "status", "aria-live": "polite" });
    const startBtn = el("button", { type: "button", class: "btn btn-primary", "data-fk": "start", onclick: function () { begin(level, startBtn, msg); } },
      LM.ui.withIcon("play", info ? "Take the test again" : "Start the test"));
    const when = passedText(level);
    view.appendChild(el("header", { class: "tool-head" }, [
      el("p", { class: "tool-eyebrow" }, el("a", { href: levelHash(level) }, "Level " + level)),
      el("h1", { class: "tool-title", text: level + " final test" }),
      el("p", { class: "tool-lead", text: DRAW + " questions from the whole of " + level + ", about " + MINUTES + " minutes. You pass with " + PASS + "% of the points (" + pointsNeeded(DRAW, PASS) + " of " + DRAW + ")." })
    ]));
    view.appendChild(el("section", { class: "card lf-card" }, [
      when ? el("p", { class: "lf-passed" }, [stamp(level, { hideText: true }), el("strong", { text: when })]) : null,
      info ? el("p", { class: "tool-note", text: "Best score: " + info.best.score + "/" + info.best.total + " points (" + percentOf(info.best) + "%) · last: " +
        info.last.score + "/" + info.last.total + " points (" + fmtDate(info.last.date) + ")" }) : el("p", { class: "tool-note", text: "Not taken yet." }),
      el("ul", { class: "lf-rules" }, [
        el("li", { text: "Questions from different topic pages of the level, drawn again for every attempt." }),
        el("li", { text: "Exam mode: explanations only after the last question. Mistakes go into the mistake log." }),
        el("li", { text: "The test is always available. It does not mark anything as “I know this” – you still do that yourself." })
      ]),
      msg,
      el("div", { class: "tool-actions" }, [startBtn, el("a", { class: "btn btn-link", href: levelHash(level) }, "Back to level " + level)])
    ]));
    setTimeout(function () { startBtn.focus({ preventScroll: true }); }, 0);
  }

  /** Draws items from the pool and starts the session in the engine. */
  function begin(level, btn, msg) {
    btn.disabled = true;
    msg.textContent = "Drawing the questions…";
    load(level).then(function (set) {
      btn.disabled = false;
      if (!set || !Array.isArray(set.items) || !set.items.length) {
        msg.textContent = "The question pool of this level is not available yet. Run: npm run build";
        return;
      }
      msg.textContent = "";
      start(level, set);
    });
  }

  /** A new attempt: drawing + an Exam mode session at #/<level>/test. */
  function start(level, set) {
    const items = F().drawItems(set.items, set.draw || DRAW, categoryOf);
    LM.exercises.startFinal({
      level: level, title: set.title || level + " final test", items: items, back: backTo(level),
      hooks: {
        finish: function (run, s) { return finish(level, set, run, s); },
        afterFinish: function (run) { afterFinish(level, run); },
        renderDone: function (view, run, api) { renderResult(view, run, api, level, set); }
      }
    });
  }

  // =====================================================================
  // END AND RESULT
  // =====================================================================

  /** Saves the result (plm.finals) and computes the breakdown by category. Returns run.final. */
  function finish(level, set, run, s) {
    const percent = set.passPercent || PASS;
    const passed = F().isPassed(s.score, s.total, percent);
    const saved = pd().saveFinalResult(level, { score: s.score, total: s.total, passed: passed });
    return {
      passed: passed, saved: saved, percent: percent, needed: pointsNeeded(s.total, percent),
      breakdown: F().breakdown(run.items.map(function (p) { return { item: p.item, res: p.res }; }), categoryOf)
    };
  }

  /** After passing: refresh the sidebar (badge) and congratulations (milestone lvl-<level>-passed). */
  function afterFinish(level, run) {
    if (!run.final || !run.final.passed) return;
    if (LM.render && LM.render.renderSidebar) LM.render.renderSidebar();
    if (run.final.saved && run.final.saved.firstPass && LM.celebrate) LM.celebrate.check({ event: "final", level: level });
  }

  function topicInfo(id) { return LM.exercises.topicInfo(id); }

  function renderResult(view, run, api, level, set) {
    const fin = run.final;
    const total = run.total;
    const pct = total ? Math.round(run.score / total * 100) : 0;
    const passed = fin && fin.passed;
    document.title = level + " final test result · " + LM.APP.appTitle;
    view.className = "view tool-view ex-view lf-view lvl-" + level;
    view.appendChild(el("header", { class: "tool-head" }, [
      el("p", { class: "tool-eyebrow" }, el("a", { href: levelHash(level) }, "Level " + level)),
      el("h1", { class: "tool-title", text: level + " final test" })
    ]));

    const wrong = run.items.filter(api.isWrong);
    const catRows = fin.breakdown.categories.map(function (c) {
      const showPct = c.total >= 3; // as in the placement test: no percentages for a sample < 3
      return el("li", { class: c.score === c.total ? "is-full" : "" }, [
        el("span", { class: "lf-cat-name", text: categoryLabel(c.key) }),
        el("strong", { class: "num", text: c.score + "/" + c.total }),
        showPct ? el("span", { class: "lf-cat-pct num", text: Math.round(c.score / c.total * 100) + "%" }) : null,
        el("span", { class: "lf-cat-bar", "aria-hidden": "true" }, el("span", { class: "lf-cat-fill", style: "width:" + Math.round(c.score / c.total * 100) + "%" }))
      ]);
    });
    const weak = fin.breakdown.topics.slice(0, 6);
    const names = weak.slice(0, 3).map(function (t) { const i = topicInfo(t.topic); return i ? i.title : t.topic; });
    const sets = el("p", { class: "tool-note lf-sets", hidden: true });
    const actions = el("div", { class: "tool-actions" }, [
      el("button", { type: "button", class: "btn " + (passed ? "btn-secondary" : "btn-primary"), "data-fk": "again", onclick: function () { start(level, set); } }, LM.ui.withIcon("rotate-ccw", "Take the test again")),
      el("a", { class: "btn btn-secondary", href: levelHash(level) }, "Back to level " + level),
      passed ? el("a", { class: "btn btn-link", href: "#/today" }, LM.ui.withIcon("arrow-right", "See the Trail")) : null
    ]);

    view.appendChild(el("section", { class: "card ex-result lf-result " + (passed ? "is-passed" : "is-failed"), "aria-live": "polite" }, [
      el("p", { class: "ex-result-score" }, [
        el("strong", { class: "num", text: run.score + "/" + total + " points" }),
        el("span", { class: "ex-result-pct num", text: pct + "%" })
      ]),
      el("p", { class: "lf-verdict" }, [
        el("span", { class: "c1-mark " + (passed ? "is-ok" : "is-bad"), "aria-hidden": "true" }, LM.icon(passed ? "check" : "x", { size: 16 })),
        el("strong", { text: passed ? "Passed" : "Not yet" }),
        el("span", { class: "lf-need", text: " – pass mark " + fin.percent + "% (" + fin.needed + " of " + total + " points)" })
      ]),
      passed && fin.saved && fin.saved.firstPass
        ? el("p", { class: "lf-passed" }, [stamp(level, { hideText: true }), el("strong", { text: level + " passed · " + fmtDate(fin.saved.passedAt) + ". The badge is now on the Trail, in the sidebar and on the level page." })])
        : passed ? el("p", { class: "tool-note", text: "You passed level " + level + " on " + fmtDate(fin.saved.passedAt) + "." })
          : el("p", { class: "ex-result-comment", text: passedAt(level) ? "Your " + level + " badge stays – this result was below the pass mark. Look at the mistakes and try again." : "You need " + LM.plural(Math.max(0, fin.needed - run.score), "more point", "more points") + " to pass. Look at the mistakes, review the topics and try again." }),
      fin.saved ? el("p", { class: "tool-note", text: "Best score: " + fin.saved.best.score + "/" + fin.saved.best.total + " points (" + percentOf(fin.saved.best) + "%)." }) : null,
      el("h2", { class: "lf-h", text: "Result by category" }),
      el("ul", { class: "lf-cats" }, catRows),
      !passed && names.length ? el("p", { class: "lf-weak" }, [el("span", { class: "review-label", text: "Most mistakes in: " }), names.join(", ") + "."]) : null,
      weak.length ? el("div", { class: "lf-topics" }, [
        el("h2", { class: "lf-h", text: "Topics to review" }),
        el("ul", { class: "lf-topic-list" }, weak.map(function (t) {
          const i = topicInfo(t.topic);
          return el("li", null, [
            i ? el("a", { href: i.href, text: i.title }) : el("span", { text: t.topic }),
            el("span", { class: "tool-note", text: " – " + LM.plural(t.wrong, "item", "items") + " with a mistake" })
          ]);
        }))
      ]) : el("p", { class: "tool-note", text: "No mistakes – well done!" }),
      sets,
      api.journalSummary(),
      actions
    ]));
    // “Sets for these topics” (only when these topics have exercise sets)
    if (!passed && weak.length) LM.exercises.loadIndex().then(function (index) {
      const found = [];
      weak.forEach(function (t) { (index.topics[t.topic] || []).forEach(function (id) { if (index.sets[id] && found.indexOf(id) === -1) found.push(id); }); });
      if (!found.length || !sets.isConnected) return;
      sets.hidden = false;
      sets.replaceChildren(el("span", { class: "review-label", text: "Sets for these topics: " }));
      found.slice(0, 4).forEach(function (id, k) {
        if (k) sets.appendChild(document.createTextNode(", "));
        sets.appendChild(el("a", { href: "#/practice/set/" + id, text: index.sets[id].title }));
      });
      actions.insertBefore(el("a", { class: "btn btn-secondary", href: "#/practice/set/" + found[0] }, "Sets for these topics"), actions.children[1]);
    });

    // The list of mistakes (with no mistakes the result card already says so)
    if (wrong.length) view.appendChild(el("section", { class: "card ex-review" }, [
      el("h2", { class: "section-title", text: "To correct (" + wrong.length + ")" }),
      el("ol", { class: "ex-wrong" }, wrong.map(function (p) {
        const mine = api.userAnswer(p);
        return el("li", null, [
          el("p", { class: "ex-wrong-q" }, [el("span", { class: "chip", text: api.typeShort[p.item.type] }), p.res && p.res.max > 1 ? el("span", { class: "chip", text: p.res.points + "/" + p.res.max + " points" }) : null, " ", api.itemSummary(p.item)]),
          el("p", { class: "journal-row is-wrong" }, [el("span", { class: "review-label", text: "Your answer: " }), el("span", { lang: mine && LM.lang.isTarget(mine) ? LM.APP.targetLang : null, text: mine || "(none)" })]),
          el("p", { class: "journal-row is-right" }, [el("span", { class: "review-label", text: "Correct: " }), el("strong", { lang: LM.lang.isTarget(api.modelAnswer(p.item)) ? LM.APP.targetLang : null, text: api.modelAnswer(p.item) })]),
          p.item.explanation ? el("p", { class: "ex-wrong-expl", text: p.item.explanation }) : null,
          p.item.trap ? el("p", { class: "ex-wrong-trap" }, [el("strong", { text: "Trap: " }), p.item.trap]) : null
        ]);
      }))
    ]));
    setTimeout(function () { const b = view.querySelector("[data-fk='again']"); if (b) b.focus({ preventScroll: true }); }, 0);
  }

  // =====================================================================
  // THE CARD ON THE LEVEL PAGE AND THE TIP ON “TODAY”
  // =====================================================================

  /** The “A1 final test” card under the level summary. */
  function card(level) {
    const info = LM.app.getActiveProfile() ? pd().finalResult(level) : null;
    const when = passedText(level);
    return el("section", { class: "card lf-level-card lvl-" + level, "aria-labelledby": "lf-card-title" }, [
      el("div", { class: "lf-level-card-body" }, [
        el("h2", { class: "section-title", id: "lf-card-title" }, [el("span", { class: "callout-icon", "aria-hidden": "true" }, LM.icon("award", { size: 20 })), level + " final test"]),
        el("p", { text: DRAW + " questions from the whole level, about " + MINUTES + " minutes. Passing with " + PASS + "% (" + pointsNeeded(DRAW, PASS) + " of " + DRAW + ") gives you the level badge on the Trail." }),
        when ? el("p", { class: "lf-passed" }, [stamp(level, { hideText: true }), el("strong", { text: when })]) : null,
        info ? el("p", { class: "tool-note", text: "Best score: " + info.best.score + "/" + info.best.total + " points (" + percentOf(info.best) + "%), last: " + info.last.score + "/" + info.last.total + " (" + fmtDate(info.last.date) + ")." })
          : el("p", { class: "tool-note", text: "The test is always available – you can take it without marking “I know this”." })
      ]),
      el("a", { class: "btn btn-primary", href: testHash(level), "aria-label": (info ? "Take the final test again: " : "Start the final test: ") + level }, LM.ui.withIcon("play", info ? "Take it again" : "Start the test"))
    ]);
  }

  /**
   * The tip on “Today”: the lowest level with ≥ 70% “I know this” and no passed final test.
   * stats = [{ id, percent, … }] as in LM.today. Returns a tile or null.
   */
  /** The level ready for the final test (≥ 70% “I know this”, not passed yet) from the list of level stats, or null (the map card on Today). */
  function readyLevel(stats) {
    if (!LM.app.getActiveProfile()) return null;
    const passed = pd().passedLevels();
    return stats.find(function (x) { return !x.soon && x.total !== 0 && x.percent >= READY_PERCENT && !passed[x.id]; }) || null;
  }


  function todayTip(stats) {
    if (!LM.app.getActiveProfile()) return null;
    const passed = pd().passedLevels();
    const s = stats.find(function (x) { return !x.soon && x.total !== 0 && x.percent >= READY_PERCENT && !passed[x.id]; });
    if (!s) return null;
    return el("section", { class: "card bento-tile bento-tip lf-tip", "aria-label": s.id + " final test" }, [
      el("div", { class: "today-tip-body" }, [
        el("h2", { class: "tile-title", text: "Ready for the " + s.id + " final test?" }),
        el("p", { class: "tool-note", text: "You have marked " + s.percent + "% of the " + s.id + " topics “I know this”. " + DRAW + " questions, about " + MINUTES + " minutes, you pass with " + PASS + "%." })
      ]),
      el("a", { class: "btn btn-primary", href: testHash(s.id) }, LM.ui.withIcon("award", "Take the " + s.id + " final test"))
    ]);
  }

  LM.final = {
    DRAW: DRAW, PASS: PASS, MINUTES: MINUTES,
    renderStart: renderStart, load: load, fmtDate: fmtDate,
    passedAt: passedAt, passedText: passedText, stamp: stamp, headerLabel: headerLabel,
    card: card, todayTip: todayTip, readyLevel: readyLevel, testHash: testHash
  };
})(window.LM);
