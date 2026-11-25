/*
 * trail.js — the Trail view (spec v7 13, section 4): the learning path A1 → C2 with lands, units, stops, checkpoints
 * and exam branches; the stop sheet (Read → Check yourself → Done / Skip); quizzes and checkpoints in the exercise engine.
 *
 *   #/trail              the trail view (the current stop scrolled into view)
 *   #/trail/<stopId>     as above, with the stop sheet open (links from “Today”; the address goes back to #/trail)
 *
 * Pure logic: js/trail-logic.js. State: js/trail-store.js (plm.trail.<profile>). Data: data/trail.js (LM.TRAIL, generated
 * from the syllabus at build time, spec 06 E9: stop = topic, one checkpoint per unit) and data/quizzes-<level>.js
 * (LM.QUIZZES by topic id, on demand). A "soon" level is drawn dimmed with "Coming soon" and has no stops to open.
 * Accessibility: the stop list is an <ol> with buttons, the state is written as text (“done”, “current”, “skipped”).
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const U = LM.utils;
  const el = U.el;
  const HASH = "#/trail";
  const ROW = 108;                 // height of a stop row (px)
  // Stop icon by syllabus category
  const CAT_ICON = { cases: "layout-grid", verbs: "clock", grammar: "notebook-text", functions: "arrow-left-right", vocabulary: "layers" };
  const STATUS_TEXT = { done: "done", current: "current", open: "open", skipped: "skipped" };

  function SL() { return LM.trailLogic; }
  function ST() { return LM.trailStore; }
  function pd() { return LM.profileData; }
  function hasProfile() { return !!(LM.app && LM.app.getActiveProfile()); }

  // =====================================================================
  // DATA AND STATE
  // =====================================================================

  /** The trail data is loaded (start script), and the logic and the store are ready. */
  function loaded() { return !!(LM.TRAIL && LM.trailLogic && LM.trailStore); }
  /** The trail can be computed for the active profile. */
  function ready() { return loaded() && hasProfile() && !!(LM.state && LM.state.ready); }

  function env() {
    return {
      isKnown: function (id) { return LM.state.progress[id] === true; },
      setPercent: function (setId) { const r = pd() ? pd().setScore(setId) : null; return r && r.best.total ? Math.round(100 * r.best.score / r.best.total) : null; }
    };
  }

  function testLevel() { const t = hasProfile() && pd() ? pd().lastTest() : null; return t && t.level ? t.level : null; }

  /** The active profile's starting point: { level, source, at }. */
  function startInfo() {
    const s = SL().effectiveStart(ST().data(), testLevel());
    if (LM.syllabus.isAvailable(s.level)) return s;
    // A start in a "soon" level (e.g. the placement result) falls back to the highest available level below it (E1)
    const ids = LM.LEVEL_IDS, avail = LM.syllabus.availableLevelIds();
    const below = avail.filter(function (l) { return ids.indexOf(l) < ids.indexOf(s.level); }).pop() || avail[0] || s.level;
    return Object.assign({}, s, { level: below });
  }

  /** The whole trail with the current state (142 nodes — computed every time, no cache, so never out of date). */
  function trail() { return SL().buildTrail(LM.TRAIL, ST().data(), env(), startInfo().level); }

  function nodeById(tr, id) { return tr.nodes.find(function (n) { return n.id === id; }) || null; }

  function stopCat(stop) { const t = LM.syllabus.topic(stop.id); return t ? t.category : null; }
  function landName(level) { const l = LM.syllabus.level(level); return l ? l.land : level; }
  function levelSoon(level) { return !LM.syllabus.isAvailable(level); }

  function pageHref(stop) { return "#/" + stop.page; }
  function setHref(stop) { return "#/practice/set/" + stop.set; }

  /** Text for labels: “Stop 7 of 22 in Meadow”. */
  function positionText(n) { return "Stop " + n.number + " of " + n.levelTotal + " in " + landName(n.level); }

  // =====================================================================
  // API FOR OTHER VIEWS (Today, topic page, level page, stats)
  // =====================================================================

  /** The active profile's current stop or null: { node, unit: { done, total, index, count, title }, level } */
  function current() {
    if (!ready()) return null;
    const tr = trail();
    if (!tr.current) return null;
    return { node: tr.current, unit: SL().unitProgress(tr, tr.current.unitId), level: tr.current.level, trail: tr };
  }

  /** Land progress with the starting point taken into account: { done, total, percent, skipped }. */
  function levelInfo(level) {
    if (!ready()) return null;
    const tr = trail();
    const p = SL().levelProgress(tr, level);
    return Object.assign(p, { skipped: SL().LEVELS.indexOf(level) < tr.startIndex && p.percent < 100, isCurrent: !!(tr.current && tr.current.level === level) });
  }

  function startLevelId() { return ready() ? startInfo().level : null; }

  /** The "Stop N of M" bar at the end of a topic page (stop id = topic id), or null (unknown topic, "soon" level). */
  function barFor(topicId) {
    if (!loaded() || levelSoon(LM.syllabus.levelOfId(topicId))) return null;
    let found = null;
    LM.TRAIL.levels.forEach(function (lv) { lv.units.forEach(function (u) { u.stops.forEach(function (s) { if (s.type === "lesson" && s.id === topicId) found = s.id; }); }); });
    if (!found) return null;
    const guest = !hasProfile();
    const tr = guest ? SL().buildTrail(LM.TRAIL, SL().emptyState(), { isKnown: function () { return false; }, setPercent: function () { return null; } }, "A1") : trail();
    const n = nodeById(tr, found);
    if (!n) return null;
    const lessons = tr.nodes.filter(function (x) { return x.type === "lesson"; });
    const after = lessons.slice(lessons.indexOf(n) + 1).filter(function (x) { return !x.soon; });
    const next = after.find(function (x) { return x.status !== "done" && x.status !== "skipped"; }) || after[0] || null;
    const actions = [];
    if (n.stop.quiz) actions.push(el("button", { type: "button", class: "btn btn-primary btn-small", onclick: function () { startQuiz(n); } }, LM.ui.withIcon("play", "Check yourself (4 questions)")));
    else actions.push(el("button", { type: "button", class: "btn btn-secondary btn-small", onclick: function () { openSheet(n.id); } }, "Open the stop on the trail"));
    if (next) actions.push(el("a", { class: "btn btn-secondary btn-small", href: HASH + "/" + next.id }, LM.ui.withIcon("arrow-right", "Next stop")));
    return el("aside", { class: "card sz-bar lvl-" + n.level, "aria-label": "Trail: " + positionText(n) }, [
      el("p", { class: "sz-bar-text" }, [
        el("span", { class: "sz-bar-land", "aria-hidden": "true" }, LM.ui.landIcon(n.level, { size: 22 })),
        el("span", null, [el("strong", { text: positionText(n) }), n.status === "done" ? el("span", { class: "sz-bar-done", text: " · done" }) : null])
      ]),
      el("div", { class: "sz-bar-actions" }, actions)
    ]);
  }

  // =====================================================================
  // LOADING QUIZZES AND CHECKPOINTS
  // =====================================================================

  const quizLevels = {};
  /** Loads data/quizzes-<level>.js once (a level without quizzes has no file: the stops then have no quiz). */
  function loadQuizzes(level) {
    const lvl = String(level).toLowerCase();
    if (quizLevels[lvl]) return quizLevels[lvl];
    quizLevels[lvl] = LM.loadModule("data/quizzes-" + lvl + ".js").catch(function () { /* level without quizzes */ });
    return quizLevels[lvl];
  }

  /** Quiz items in the engine format (topic, level and set needed for the attempt log and stats). */
  function quizItems(quiz) {
    return quiz.items.map(function (it) { return Object.assign({ topic: quiz.topic, level: quiz.level, setId: quiz.id, tags: ["trail"] }, it); });
  }

  /** The stop's quiz (after the level is loaded) or null. */
  function quizById(id) { return (LM.QUIZZES && LM.QUIZZES[id]) || null; }

  function startQuiz(n) {
    LM.app.withProfile("The quiz result is saved in your profile.", function () {
      loadQuizzes(n.level).then(function () {
        const quiz = quizById(n.stop.quiz);
        if (!quiz) { LM.ui.toast({ text: "This stop has no quiz yet.", icon: "info" }); return; }
        closeSheet();
        runSession({
          title: quiz.title, intro: quiz.intro, items: quizItems(quiz), kind: "quiz", node: n, quiz: quiz
        });
      });
    });
  }

  function startReview(n) {
    LM.app.withProfile("The checkpoint result is saved in your profile.", function () {
      const level = n.level;
      const stops = {};
      LM.TRAIL.levels.forEach(function (lv) { lv.units.forEach(function (u) { u.stops.forEach(function (s) { stops[s.id] = s; }); }); });
      const setIds = (n.stop.from || []).map(function (id) { return stops[id] && stops[id].set; }).filter(Boolean);
      Promise.all([loadQuizzes(level), setIds.length ? LM.exercises.loadSets(setIds) : Promise.resolve([]), LM.final ? LM.final.load(level) : Promise.resolve(null)]).then(function (res) {
        const sets = {};
        res[1].forEach(function (s) { sets[s.id] = s.items || []; });
        const src = {
          stops: stops,
          quizItems: function (id) { const s = stops[id]; const q = s && s.quiz ? quizById(s.quiz) : null; return q ? quizItems(q) : []; },
          setItems: function (setId) { return sets[setId] || []; },
          finalItems: function () { return res[2] && res[2].items ? res[2].items : []; }
        };
        const pick = SL().pickReview(Object.assign({ level: level }, n.stop), src, Math.random);
        if (!pick.source || !pick.items.length) { LM.ui.toast({ text: "The checkpoint is available once quizzes are added.", icon: "info" }); return; }
        closeSheet();
        runSession({ title: n.stop.title, intro: "Checkpoint: " + LM.plural(pick.items.length, "question", "questions") + " from this unit.", items: pick.items, kind: "review", node: n });
      });
    });
  }

  /** A session in the exercise engine (js/exercise-engine.js, startCustom) with its own result saving and result screen. */
  function runSession(cfg) {
    const n = cfg.node;
    LM.exercises.startCustom({
      title: cfg.title, intro: cfg.intro, items: cfg.items, mode: "learn", autostart: true, // the “custom:” key — a session at #/practice/session
      back: { href: HASH, label: "Back to the trail" },
      hooks: {
        finish: function (run, s) {
          if (cfg.kind === "quiz") {
            const rec = ST().recordQuiz(n.id, s.score);
            return { kind: "quiz", passed: s.score >= SL().PASS_QUIZ, best: rec ? rec.best : s.score };
          }
          ST().recordReview(n.id, s.score, s.total);
          return { kind: "review", passed: true, best: s.score };
        },
        afterFinish: function () { if (LM.app.refreshLearning) LM.app.refreshLearning(); },
        renderDone: function (view, run, api) { renderResult(view, run, api, cfg); }
      }
    });
  }

  /** Result screen of a quiz / checkpoint: score, pass, the “I know this” offer (never automatic), next steps. */
  function renderResult(view, run, api, cfg) {
    const n = cfg.node, fin = run.final || { passed: false };
    const tr = trail();
    const node = nodeById(tr, n.id) || n;
    const next = nextLesson(tr, node);
    const isQuiz = cfg.kind === "quiz";
    view.className = "view tool-view ex-view sz-result-view lvl-" + n.level;
    document.title = (isQuiz ? "Quiz result" : "Checkpoint result") + " · Trail · " + LM.APP.appTitle;
    view.appendChild(el("header", { class: "tool-head" }, [
      LM.ui.breadcrumbs([{ label: "Trail", href: HASH }, { label: cfg.title }]),
      el("h1", { class: "tool-title", text: isQuiz ? "Result: " + n.stop.title : cfg.title })
    ]));
    const needed = SL().PASS_QUIZ;
    const wrong = run.items.filter(api.isWrong);
    const missing = isQuiz ? (n.stop.items || []).filter(function (id) { return LM.state.progress[id] !== true; }) : [];
    const umiemBox = isQuiz && fin.passed && missing.length ? el("div", { class: "ex-known", role: "status" }, [
      el("span", { class: "ex-known-icon", "aria-hidden": "true" }, LM.icon("sparkles", { size: 20 })),
      el("div", { class: "ex-known-body" }, [
        el("p", null, [el("strong", { text: "Mark “I know this”? " }), "You passed the quiz, but only you can mark “I know this”. Mark it for: " + node.stop.title + "?"]),
        el("p", { class: "ex-journal-actions" }, el("button", { type: "button", class: "btn btn-primary btn-small", onclick: function (e) {
          missing.forEach(function (id) { LM.app.setProgress(id, true); });
          e.currentTarget.closest(".ex-known").replaceWith(el("div", { class: "ex-known is-done", role: "status" }, [LM.icon("check", { size: 18 }), el("p", { text: "Marked “I know this”. Well done!" })]));
        } }, LM.ui.withIcon("check", "Mark “I know this”")))
      ])
    ]) : null;
    view.appendChild(el("section", { class: "card ex-result sz-result " + (fin.passed ? "is-passed" : "is-failed"), "aria-live": "polite" }, [
      el("p", { class: "ex-result-score" }, [el("strong", { class: "num", text: run.score + "/" + run.total }), el("span", { class: "ex-result-pct num", text: Math.round(100 * run.score / Math.max(1, run.total)) + "%" })]),
      isQuiz
        ? el("p", { class: "lf-verdict" }, [
          el("span", { class: "c1-mark " + (fin.passed ? "is-ok" : "is-bad"), "aria-hidden": "true" }, LM.icon(fin.passed ? "check" : "x", { size: 16 })),
          el("strong", { text: fin.passed ? "Stop done" : "Not yet" }),
          el("span", { class: "lf-need", text: " – you need " + needed + " of " + run.total + " correct answers" })
        ])
        : el("p", { class: "tool-note", text: "Checkpoint saved. The result does not block the way ahead; wrong answers went into the mistake log." }),
      umiemBox,
      wrong.length ? el("div", { class: "sz-wrong" }, [
        el("h2", { class: "lf-h", text: "To review (" + wrong.length + ")" }),
        el("ul", { class: "lf-topic-list" }, wrong.map(function (p) { return el("li", null, [api.itemSummary(p.item), el("span", { class: "tool-note", lang: LM.lang.isTarget(api.modelAnswer(p.item)) ? LM.APP.targetLang : null, text: " → " + api.modelAnswer(p.item) })]); }))
      ]) : el("p", { class: "tool-note", text: "No mistakes – well done!" }),
      api.journalSummary(),
      el("div", { class: "tool-actions" }, [
        next && (fin.passed || !isQuiz) ? el("a", { class: "btn btn-primary", href: HASH + "/" + next.id }, LM.ui.withIcon("arrow-right", "Next stop")) : null,
        isQuiz && !fin.passed ? el("button", { type: "button", class: "btn btn-primary", onclick: function () { startQuiz(node); } }, LM.ui.withIcon("rotate-ccw", "Try again")) : null,
        isQuiz && !fin.passed ? el("a", { class: "btn btn-secondary", href: pageHref(node.stop) }, "Read the topic again") : null,
        el("a", { class: "btn btn-secondary", href: HASH }, "Back to the trail")
      ]),
      isQuiz ? LM.ui.reportLink(node.stop.quiz || node.id) : null // E12
    ]));
  }

  function nextLesson(tr, node) {
    const lessons = tr.nodes.filter(function (x) { return x.type === "lesson" && x.levelIndex >= tr.startIndex; });
    const i = lessons.findIndex(function (x) { return x.id === node.id; });
    const after = i === -1 ? lessons : lessons.slice(i + 1);
    return after.find(function (x) { return x.status === "open"; }) || null;
  }

  // =====================================================================
  // STOP SHEET
  // =====================================================================

  let sheet = null;

  function closeSheet() { if (sheet) { sheet.close(); sheet = null; } }

  function openSheet(id, opts) {
    if (!ready()) { LM.app.withProfile("The Trail saves your progress in a profile.", function () { openSheet(id, opts); }); return; }
    opts = opts || {};
    closeSheet();
    const body = el("div", { class: "sz-sheet-body" });
    sheet = LM.dialogs.open({
      title: "", className: "dialog-sz sz-sheet", body: body, cancelValue: false,
      actions: [{ label: "Close", value: false, autofocus: true }]
    });
    const sh = sheet;
    sh.result.then(function () { if (sheet === sh) sheet = null; });
    paintSheet(body, id, opts);
  }

  /** Is the stop in a later land than the current one while the previous land has no passed final test (spec 3.3)? */
  function recommendFirst(tr, n) {
    const cur = tr.current;
    if (!cur || n.levelIndex <= cur.levelIndex) return null;
    const prev = SL().LEVELS[n.levelIndex - 1];
    const passed = pd() ? pd().passedLevels() : {};
    return passed[prev] ? null : cur.level;
  }

  function paintSheet(body, id, opts) {
    const tr = trail();
    const n = nodeById(tr, id);
    const dlg = body.closest("dialog");
    if (!n) { body.replaceChildren(el("p", { text: "There is no such stop." })); return; }
    const title = dlg && dlg.querySelector(".dialog-title");
    if (title) title.textContent = n.stop.title;
    const parts = [];
    const st = n.current ? "current" : n.status;
    parts.push(el("p", { class: "sz-sheet-meta" }, [
      n.type === "lesson" ? positionText(n) : "Checkpoint · " + n.unitTitle,
      " · ", el("strong", { class: "sz-state is-" + st, text: STATUS_TEXT[st] }),
      n.via === "start" ? " (skipped by the placement test)" : n.via === "skip" ? " (skipped by you)" : n.via === "quiz" ? " (by the quiz)" : n.via === "umiem" ? " (every topic “I know this”)" : n.via === "set" ? " (by the exercise set)" : ""
    ]));

    const rec = opts.force ? null : recommendFirst(tr, n);
    if (rec) {
      parts.push(el("div", { class: "sz-recommend", role: "note" }, [
        el("p", { text: "We suggest finishing " + landName(rec) + " first. The later lands are open, the trail only suggests an order." }),
        el("button", { type: "button", class: "btn btn-secondary btn-small", onclick: function () { paintSheet(body, id, { force: true }); } }, "Open it anyway")
      ]));
      body.replaceChildren.apply(body, parts);
      return;
    }

    if (n.type === "checkpoint") {
      parts.push(el("p", { text: "Six questions from the stops of this unit. The result does not block the way ahead; wrong answers go into the mistake log." }));
      const r = ST().data().reviews[n.id];
      if (r) parts.push(el("p", { class: "tool-note", text: "Best score: " + r.best + "/" + r.of + "." }));
      parts.push(el("div", { class: "sz-sheet-actions" }, [
        el("button", { type: "button", class: "btn btn-primary", onclick: function () { startReview(n); } }, LM.ui.withIcon("play", r ? "Do the checkpoint again" : "Start the checkpoint"))
      ]));
      body.replaceChildren.apply(body, parts);
      return;
    }

    // checklist topics with “I know this”
    const textOf = function (topicId) { const t = LM.syllabus.topic(topicId); return t ? t.title : topicId; };
    parts.push(el("h3", { class: "sz-sheet-h", text: "What you learn here" }));
    parts.push(el("ul", { class: "sz-items" }, (n.stop.items || []).map(function (itemId) {
      const done = LM.state.progress[itemId] === true;
      const cid = "sz-i-" + itemId;
      return el("li", null, el("label", { class: "sz-item", for: cid }, [
        el("input", { type: "checkbox", id: cid, checked: done, onchange: function (e) {
          LM.app.setProgress(itemId, e.target.checked);
          paintSheet(body, id, Object.assign({}, opts, { force: true }));
          refreshView();
        } }),
        el("span", { text: textOf(itemId) })
      ]));
    })));

    // steps 1 and 2
    parts.push(el("ol", { class: "sz-steps" }, [
      el("li", null, [el("strong", { text: "Read" }), el("a", { class: "btn btn-secondary btn-small", href: pageHref(n.stop), onclick: closeSheet }, LM.ui.withIcon("file-text", "Open the topic page"))]),
      el("li", null, [el("strong", { text: "Check yourself" }), el("span", { class: "sz-step-actions" }, [
        n.stop.quiz ? el("button", { type: "button", class: "btn btn-primary btn-small", onclick: function () { startQuiz(n); } }, LM.ui.withIcon("play", "Quiz (4 questions)")) : null,
        n.stop.set ? el("a", { class: "btn btn-secondary btn-small", href: setHref(n.stop), onclick: closeSheet }, "Exercise set") : null,
        !n.stop.quiz && !n.stop.set ? el("a", { class: "btn btn-secondary btn-small", href: pageHref(n.stop), onclick: closeSheet }, "Practice on the topic page") : null
      ])])
    ]));
    const qrec = ST().data().stops[n.id];
    if (qrec && qrec.via === "quiz" && typeof qrec.best === "number") parts.push(el("p", { class: "tool-note", text: "Best quiz score: " + qrec.best + "/4." }));

    // the “I know this” offer after the quiz (never automatic)
    const missing = (n.stop.items || []).filter(function (itemId) { return LM.state.progress[itemId] !== true; });
    if (n.via === "quiz" && missing.length) {
      parts.push(el("div", { class: "ex-known", role: "status" }, [
        el("span", { class: "ex-known-icon", "aria-hidden": "true" }, LM.icon("sparkles", { size: 20 })),
        el("div", { class: "ex-known-body" }, [
          el("p", null, [el("strong", { text: "Mark “I know this”? " }), "You passed the quiz. Mark it for: " + n.stop.title + "?"]),
          el("p", { class: "ex-journal-actions" }, el("button", { type: "button", class: "btn btn-primary btn-small", onclick: function () {
            missing.forEach(function (itemId) { LM.app.setProgress(itemId, true); });
            paintSheet(body, id, Object.assign({}, opts, { force: true }));
            refreshView();
          } }, LM.ui.withIcon("check", "Mark “I know this”")))
        ])
      ]));
    }

    // done / skip
    const foot = [];
    const next = nextLesson(tr, n);
    if (n.status === "done") {
      foot.push(el("button", { type: "button", class: "btn btn-primary", onclick: function () { closeSheet(); if (next) openSheet(next.id); else refreshView(); } }, LM.ui.withIcon("arrow-right", next ? "Done, next" : "Done")));
    }
    if (n.via === "skip") foot.push(el("button", { type: "button", class: "btn btn-secondary", onclick: function () { ST().unskipStop(n.id); paintSheet(body, id, Object.assign({}, opts, { force: true })); refreshView(); } }, "Undo skip"));
    else if (n.status !== "done") foot.push(el("button", { type: "button", class: "btn btn-link", onclick: function () {
      ST().skipStop(n.id);
      closeSheet();
      refreshView();
    } }, "Skip this stop"));
    if (foot.length) parts.push(el("div", { class: "sz-sheet-actions" }, foot));
    body.replaceChildren.apply(body, parts);
  }

  // =====================================================================
  // STARTING POINT
  // =====================================================================

  function startDialog() {
    LM.app.withProfile("The starting point is saved in your profile.", function () {
      const cur = startInfo();
      const form = el("form", { class: "sz-start-form" }, SL().LEVELS.map(function (lvl) {
        const id = "sz-start-" + lvl;
        return el("label", { class: "sz-start-opt lvl-" + lvl, for: id }, [
          el("input", { type: "radio", name: "sz-start", id: id, value: lvl, checked: cur.level === lvl, disabled: levelSoon(lvl) }),
          el("span", { class: "sz-start-land", "aria-hidden": "true" }, LM.ui.landIcon(lvl, { size: 22 })),
          el("span", { text: LM.ui.landLabel(lvl) + (levelSoon(lvl) ? " (coming soon)" : "") })
        ]);
      }));
      LM.dialogs.open({
        title: "Change the starting point",
        body: [el("p", { text: "Lands before the starting point get the status “skipped”. They block nothing, and you can go back to them." }), form],
        cancelValue: false,
        actions: [
          { label: "Cancel", value: false },
          { label: "Save", variant: "btn-primary", value: true, onClick: function () {
            const v = form.querySelector("input:checked");
            if (v) ST().setStart(v.value, "manual");
          } }
        ]
      }).result.then(function (ok) { if (ok) { refreshView(); if (LM.app.refreshLearning) LM.app.refreshLearning(); } });
    });
  }

  // =====================================================================
  // VIEW
  // =====================================================================

  function parseRoute(hash) {
    const m = /^#\/trail(?:\/([a-z0-9-]+))?\/?$/.exec(String(hash || ""));
    return m ? { kind: "trail", open: m[1] || null } : null;
  }

  function refreshView() { if (LM.state.view === "trail") render({ kind: "trail", open: null }, { keepScroll: true }); }

  function nodeButton(n, geo) {
    const st = n.current ? "current" : n.status;
    const isReview = n.type === "checkpoint";
    const cat = isReview ? null : stopCat(n.stop);
    const label = (isReview ? "Checkpoint: " : "") + n.stop.title + ". " + (isReview ? "" : positionText(n) + ". ") + STATUS_TEXT[st] + (n.via === "start" ? " by the placement test" : "") + ".";
    const icon = st === "done" ? "check" : isReview ? "rotate-ccw" : (st === "skipped" ? "arrow-right" : CAT_ICON[cat] || "notebook-text");
    return el("li", { class: "sz-node is-" + st + (isReview ? " is-review" : ""), style: "left:" + geo.x.toFixed(1) + "%;top:" + geo.y + "px", "data-stop": n.id }, [
      el("button", { type: "button", class: "sz-btn", "aria-label": label, "aria-haspopup": "dialog", onclick: function () { openSheet(n.id); } }, [
        el("span", { class: "sz-circle", "aria-hidden": "true" }, LM.icon(icon, { size: st === "done" ? 24 : 22 })),
        el("span", { class: "sz-title", "aria-hidden": "true", text: isReview ? "Checkpoint" : n.stop.title })
      ])
    ]);
  }

  function unitBlock(tr, unit, nodes) {
    const prog = SL().unitProgress(tr, unit.id);
    const n = nodes.length;
    const H = n * ROW;
    const geo = nodes.map(function (node, i) {
      const k = node.global !== null ? node.global : (nodes[i - 1] ? nodes[i - 1].global : 0) + 0.5;
      return { x: 50 + 25 * Math.sin(k * 0.95 + node.levelIndex), y: Math.round(i * ROW + ROW / 2) };
    });
    // a curve through the node centres
    let d = "M" + geo[0].x.toFixed(1) + " " + geo[0].y;
    for (let i = 1; i < geo.length; i++) {
      const a = geo[i - 1], b = geo[i], my = (a.y + b.y) / 2;
      d += " C" + a.x.toFixed(1) + " " + my + " " + b.x.toFixed(1) + " " + my + " " + b.x.toFixed(1) + " " + b.y;
    }
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "sz-wire"); svg.setAttribute("viewBox", "0 0 100 " + H); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
    return el("section", { class: "sz-unit", "aria-labelledby": "sz-u-" + unit.id }, [
      el("div", { class: "sz-unit-head" }, [
        el("h3", { class: "sz-unit-title", id: "sz-u-" + unit.id, text: "Unit " + prog.index + " · " + unit.title }),
        el("span", { class: "sz-unit-prog num", text: prog.done + "/" + prog.total, "aria-label": prog.done + " of " + prog.total + " stops done" })
      ]),
      el("div", { class: "sz-lane", style: "height:" + H + "px" }, [svg, el("ol", { class: "sz-stops" }, nodes.map(function (node, i) { return nodeButton(node, geo[i]); }))])
    ]);
  }

  function branchList(level, lv) {
    if (!lv.branches || !lv.branches.length) return null;
    const mine = LM.examMy ? LM.examMy.isMine : function () { return false; };
    return el("section", { class: "sz-branches", "aria-label": "Exam branches after " + level }, [
      el("h3", { class: "sz-unit-title", text: "Exam branches" }),
      el("ul", { class: "sz-branch-list" }, lv.branches.map(function (b) {
        const pinned = mine(b.exam);
        return el("li", null, el("a", { class: "sz-branch" + (pinned ? " is-pinned" : ""), href: b.route }, [
          el("span", { class: "sz-branch-icon", "aria-hidden": "true" }, LM.icon("graduation-cap", { size: 22 })),
          el("span", { class: "sz-branch-body" }, [
            el("strong", { text: b.label }),
            pinned ? el("span", { class: "chip", text: "Pinned to Today" }) : null,
            el("span", { class: "tool-note", text: b.note })
          ]),
          el("span", { "aria-hidden": "true" }, LM.icon("chevron-right", { size: 20 }))
        ]));
      }))
    ]);
  }

  /** A "soon" land: dimmed, "Coming soon", the unit titles of the syllabus, no stops to open (spec 06 E1). */
  function soonSection(lv) {
    const level = lv.level;
    return el("section", { class: "sz-level is-soon lvl-" + level, "aria-labelledby": "sz-l-" + level }, [
      el("header", { class: "sz-level-head" }, [
        el("span", { class: "sz-level-icon", "aria-hidden": "true" }, LM.ui.landIcon(level, { size: 30 })),
        el("div", { class: "sz-level-text" }, [
          el("h2", { class: "sz-level-title", id: "sz-l-" + level, text: LM.ui.landLabel(level) }),
          el("p", { class: "sz-level-sub" }, el("span", { class: "chip sz-soon-chip", text: "Coming soon" }))
        ]),
        el("div", { class: "sz-level-links" }, el("a", { class: "btn btn-link btn-small", href: LM.app.levelHash(level) }, "Planned topics"))
      ]),
      el("ol", { class: "sz-soon-units" }, lv.units.map(function (u) {
        const n = u.stops.filter(function (s) { return s.type === "lesson"; }).length;
        return el("li", null, [el("span", { text: u.title }), el("span", { class: "tool-note num", text: " · " + n + " stops" })]);
      }))
    ]);
  }

  function levelSection(tr, lv, curLevel) {
    const level = lv.level;
    if (lv.status === "soon") return soonSection(lv);
    const p = SL().levelProgress(tr, level);
    const skipped = SL().LEVELS.indexOf(level) < tr.startIndex && p.percent < 100;
    const passed = LM.final ? LM.final.passedText(level) : null;
    const isCur = curLevel === level;
    const nodesOf = function (unitId) { return tr.nodes.filter(function (x) { return x.unitId === unitId; }); };
    const units = lv.units.map(function (u) { return unitBlock(tr, u, nodesOf(u.id)); });
    const head = el("header", { class: "sz-level-head" }, [
      el("span", { class: "sz-level-icon", "aria-hidden": "true" }, LM.ui.landIcon(level, { size: 30 })),
      el("div", { class: "sz-level-text" }, [
        el("h2", { class: "sz-level-title", id: "sz-l-" + level, text: LM.ui.landLabel(level) }),
        el("p", { class: "sz-level-sub num" }, [
          p.done + " of " + LM.plural(p.total, "stop", "stops") + " (" + p.percent + "%)",
          skipped ? el("span", { class: "chip", text: "Skipped by the placement test" }) : null,
          isCur ? el("span", { class: "chip is-here", text: "You are here" }) : null,
          passed ? el("span", { class: "chip", text: passed }) : null
        ])
      ]),
      el("div", { class: "sz-level-links" }, [
        el("a", { class: "btn btn-link btn-small", href: LM.app.levelHash(level) }, "Topic list"),
        el("a", { class: "btn btn-secondary btn-small", href: lv.finalTest }, level + " final test")
      ])
    ]);
    const inner = [head].concat(units);
    const br = branchList(level, lv);
    if (br) inner.push(br);
    const cls = "sz-level lvl-" + level + (skipped ? " is-skipped" : "") + (isCur ? " is-current" : "");
    if (skipped) {
      return el("details", { class: cls, "aria-labelledby": "sz-l-" + level }, [
        el("summary", { class: "sz-level-summary" }, [el("span", { "aria-hidden": "true" }, LM.ui.landIcon(level, { size: 24 })), el("span", { text: LM.ui.landLabel(level) + " · skipped by the placement test (" + p.done + "/" + p.total + ")" })])
      ].concat(inner));
    }
    return el("section", { class: cls, "aria-labelledby": "sz-l-" + level }, inner);
  }

  /**
   * First start (a new profile with no starting point chosen and no test, or a guest): "placement test or start at A1".
   * On the Trail the buttons act in place; elsewhere (the home page) "Start at A1" opens the Trail. A guest is asked
   * for a profile first (guest mode), then the action runs.
   */
  function firstRun(opts) {
    opts = opts || {};
    const first = FIRST_LEVEL();
    const toTest = function (e) {
      if (hasProfile()) return; // the link does it
      e.preventDefault();
      LM.app.withProfile("The placement test result is saved in your profile.", function () { location.hash = LM.placement ? LM.placement.HASH : "#/placement"; });
    };
    const startFirst = function () {
      LM.app.withProfile("The starting point is saved in your profile.", function () {
        ST().setStart(first, "default");
        if (opts.home) location.hash = HASH; else refreshView();
      });
    };
    return el("section", { class: "card sz-first" + (opts.home ? " home-first" : ""), "aria-labelledby": "sz-first-title" }, [
      el("h2", { class: "sz-first-title", id: "sz-first-title", text: "Where do you want to start?" }),
      el("p", { text: "The Trail is one path through six lands, from " + landName("A1") + " to " + landName("C2") + ". You can start at the beginning or take a short placement test, and the trail starts where it makes sense for you." }),
      el("div", { class: "tool-actions" }, [
        el("a", { class: "btn btn-primary", href: LM.placement ? LM.placement.HASH : "#/placement", onclick: toTest }, LM.ui.withIcon("target", "Take the placement test (6 min)")),
        el("button", { type: "button", class: "btn btn-secondary", onclick: startFirst }, "Start at " + first)
      ])
    ]);
  }

  /** The first available level (the trail starts there by default). */
  function FIRST_LEVEL() { return LM.syllabus.availableLevelIds()[0] || "A1"; }

  function needsFirstRun() {
    if (!hasProfile()) return true;
    const st = ST().data();
    return !st.start && !testLevel() && !Object.keys(st.stops).length && !Object.keys(st.reviews).length && !Object.keys(LM.state.progress).length;
  }

  /** The first-run card for the home page, or null when the profile has already started (or the Trail is not loaded). */
  function firstRunCard() { return loaded() && needsFirstRun() ? firstRun({ home: true }) : null; }

  function render(route, opts) {
    opts = opts || {};
    route = route || parseRoute(location.hash) || { kind: "trail", open: null };
    const view = document.getElementById("view");
    const scroll = opts.keepScroll ? U.getScroll() : 0;
    view.className = "view tool-view sz-view";
    view.dataset.file = HASH;
    view.replaceChildren();
    document.title = "Trail · " + LM.APP.appTitle;
    if (!ready()) {
      view.appendChild(el("p", { class: "tool-note", role: "status", text: "Loading the Trail…" }));
      return;
    }
    const tr = trail();
    const start = startInfo();
    const cur = tr.current;
    view.appendChild(LM.ui.pageHead({ eyebrow: "Learning", title: "Trail", lead: "One path through the lands from A1 to C2: small stops with a checkpoint every few steps. The trail suggests an order, but nothing is locked." }));
    if (needsFirstRun()) view.appendChild(firstRun());

    const startText = start.source === "test" ? "from the placement test" : start.source === "manual" ? "chosen by you" : "default";
    const bar = [
      el("div", { class: "sz-now" }, cur ? [
        el("p", { class: "sz-now-label", text: "Current stop" }),
        el("p", { class: "sz-now-title" }, [el("strong", { text: cur.stop.title }), el("span", { class: "tool-note", text: " · " + positionText(cur) })]),
        el("p", { class: "tool-note num", text: "Unit " + SL().unitProgress(tr, cur.unitId).index + " · " + cur.unitTitle + " · " + SL().unitProgress(tr, cur.unitId).done + "/" + SL().unitProgress(tr, cur.unitId).total })
      ] : [el("p", { class: "sz-now-title" }, el("strong", { text: "You have done the whole trail from your starting point. Congratulations!" }))]),
      el("div", { class: "sz-now-actions" }, [
        cur ? el("button", { type: "button", class: "btn btn-primary", onclick: function () { openSheet(cur.id); } }, LM.ui.withIcon("arrow-right", "Continue the trail")) : null,
        el("button", { type: "button", class: "btn btn-secondary", onclick: startDialog }, "Change the starting point")
      ])
    ];
    view.appendChild(el("section", { class: "card sz-now-card", "aria-label": "Current stop" }, bar));
    view.appendChild(el("p", { class: "tool-note sz-start-note" }, "Starting point: " + LM.ui.landLabel(start.level) + " (" + startText + ")."));

    const curLevel = cur ? cur.level : null;
    LM.TRAIL.levels.forEach(function (lv) { view.appendChild(levelSection(tr, lv, curLevel)); });

    if (opts.keepScroll) U.setScroll(scroll);
    else {
      const here = cur ? view.querySelector('[data-stop="' + cur.id + '"]') : null;
      if (here) {
        const reduce = LM.reducedMotion && LM.reducedMotion();
        const details = here.closest("details");
        if (details) details.open = true;
        requestAnimationFrame(function () { here.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); });
      } else U.setScroll(0);
    }
    if (route.open) {
      history.replaceState(null, "", HASH); // the address goes back to #/trail, a reload does not open the sheet again
      openSheet(route.open);
    }
  }

  /** "See Meadow on the trail" on the level page. */
  function levelLink(level) {
    if (!loaded() || levelSoon(level)) return null;
    return el("a", { class: "btn btn-link btn-small sz-level-link", href: HASH }, LM.ui.withIcon("route", "See " + landName(level) + " on the trail"));
  }

  /** The “Trail” tile in Stats: stops done per level and the average quiz score. */
  function statsTile() {
    if (!ready()) return null;
    const tr = trail();
    const st = ST().data();
    const avg = SL().quizAverage(st);
    const rows = SL().LEVELS.filter(function (lvl) { return !levelSoon(lvl); }).map(function (lvl) {
      const p = SL().levelProgress(tr, lvl);
      return el("li", { class: "sz-st-row lvl-" + lvl }, [
        el("span", { class: "sz-st-name", text: LM.ui.landLabel(lvl) }),
        el("span", { class: "sz-st-bar", "aria-hidden": "true" }, el("span", { class: "sz-st-fill", style: "width:" + p.percent + "%" })),
        el("span", { class: "sz-st-n num", text: p.done + "/" + p.total })
      ]);
    });
    const quizzes = Object.keys(st.stops).filter(function (id) { return st.stops[id].via === "quiz"; }).length;
    return el("section", { class: "card st-tile st-wide", "aria-labelledby": "st-trail" }, [
      el("h2", { class: "tile-title", id: "st-trail", text: "Trail" }),
      el("ul", { class: "sz-st-list" }, rows),
      el("p", { class: "tool-note", text: avg === null ? "Stop quizzes: none yet. A quiz is passed with 3 of 4 questions." : "Stop quizzes: " + LM.plural(quizzes, "attempt", "attempts") + ", average score " + avg + "%." }),
      el("p", null, el("a", { class: "btn btn-link btn-small", href: HASH }, "Open the Trail"))
    ]);
  }

  LM.trail = {
    levelLink: levelLink, statsTile: statsTile,
    HASH: HASH, parseRoute: parseRoute, render: render, loaded: loaded, ready: ready,
    current: current, levelInfo: levelInfo, startLevel: startLevelId, firstRunCard: firstRunCard, barFor: barFor, openSheet: openSheet, startQuiz: startQuiz, positionText: positionText
  };
})(window.LM);
