/*
 * exam-core.js — the generic exams module (spec 06 E8, spec 12).
 *
 * The registry (data/exams-registry.js → LM.EXAM_REGISTRY, from content/exams/registry.json) is the only source of
 * exam ids, codes, labels, colours, statuses and descriptions. The code knows no exam by name. Until stage E the
 * registry is empty and the sidebar group "Exams" is hidden; tools/fixtures/exam-demo keeps this code under test.
 *
 *   #/exams/<id>                      overview page (page id "overview", with the countdown)
 *   #/exams/<id>/<page>               a page of the manifest (pages/*.md)
 *   #/exams/<id>/practice             the exam's sets (exercise engine, #/practice/set/<set id>)
 *   #/exams/<id>/writing[/<task>]     writing trainer (js/writing-trainer.js), config from the exam's writing.json
 *   #/exams/<id>/speaking             speaking trainer (js/speaking-trainer.js, loaded on demand)
 *   status "soon": #/exams/<id>       a "work in progress" page
 * An unknown exam id is not an exam route (the app shows "Page not found").
 *
 * Exam data (manifest, pages, trainers) loads when the exam is opened: data/exam-<id>.js. Learner data
 * (plm.exams, per profile): exam date, writing drafts, ticked task lists — through LM.profileData.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const U = LM.utils;
  const el = U.el;
  const HIDDEN_SECTIONS = ["Answers", "Sample answers"];
  const OVERVIEW = "overview";

  function reg() { return LM.EXAM_REGISTRY || { exams: [], links: {}, sets: {} }; }
  function exams() { return reg().exams; }
  function byId(id) { return exams().find(function (e) { return e.id === id; }) || null; }
  function pd() { return LM.profileData; }
  function base(e) { return "#/exams/" + e.id; }
  function data(e) { return (LM.EXAMS && LM.EXAMS[e.id]) || null; }
  function words(n) { return n + " " + (n === 1 ? "word" : "words"); }
  function accentStyle(e) { return e.accent ? "--exam-accent:" + e.accent + ";--exam-accent-2:" + (e.accent2 || e.accent) : null; }

  function load(e) {
    if (data(e)) return Promise.resolve(data(e));
    return LM.loadModule("data/exam-" + e.id + ".js").then(function () { return data(e); }, function (err) { console.warn(err.message + " (run: npm run build)"); return null; });
  }

  // =====================================================================
  // ROUTES
  // =====================================================================

  function parseRoute(hash) {
    const m = /^#\/exams\/([a-z0-9-]+)(?:\/(.*))?$/.exec(hash || "");
    if (!m) return null;
    const e = byId(m[1]);
    if (!e) return null;
    const parts = (m[2] || "").replace(/\/+$/, "").split("/").filter(Boolean);
    if (e.status !== "active") return { examId: e.id, kind: "soon" };
    if (!parts.length) return { examId: e.id, kind: "page", id: OVERVIEW };
    if (parts[0] === "practice") return { examId: e.id, kind: "exercises" };
    if (parts[0] === "writing") return { examId: e.id, kind: "writing", task: parts[1] || null };
    if (parts[0] === "speaking") return { examId: e.id, kind: "speaking" };
    return { examId: e.id, kind: "page", id: parts.join("/") };
  }

  function hrefPage(e, id) { return id === OVERVIEW ? base(e) : base(e) + "/" + id; }

  // =====================================================================
  // MANIFEST
  // =====================================================================

  function sections(e) { const d = data(e); return d ? d.manifest.sections : []; }

  function findPage(e, id) {
    for (const s of sections(e)) {
      const p = (s.pages || []).find(function (x) { return x.id === id; });
      if (p) return { page: p, section: s };
    }
    return null;
  }

  /** Trainers of a section: [{ id, type: "writing" | "speaking", label, file }]. */
  function sectionTrainers(s) { return Array.isArray(s.trainers) ? s.trainers : []; }
  function trainerOf(s, type) { return sectionTrainers(s).find(function (t) { return t.type === type; }) || null; }
  function trainerSection(e, type) { return sections(e).find(function (s) { return !!trainerOf(s, type); }) || null; }
  function trainerData(e, type) {
    const s = trainerSection(e, type);
    return s && data(e) ? data(e).trainers[trainerOf(s, type).id] || null : null;
  }

  function sectionIdOf(e, route) {
    if (!route) return null;
    if (route.kind === "page") { const f = findPage(e, route.id); return f ? f.section.id : null; }
    if (route.kind === "exercises") { const s = sections(e).find(function (x) { return x.exerciseGroups; }); return s ? s.id : null; }
    if (route.kind === "writing" || route.kind === "speaking") { const s = trainerSection(e, route.kind); return s ? s.id : null; }
    return null;
  }

  // =====================================================================
  // PAGES
  // =====================================================================

  function crumb(e, text) {
    return LM.ui.breadcrumbs(text ? [{ label: e.label, href: base(e) }, { label: text }] : [{ label: e.label, href: base(e) }]);
  }

  function notFound(e, message) {
    return el("div", { class: "empty-state" }, [
      el("p", { class: "empty-state-text", text: message || "There is no such page in " + e.label + "." }),
      el("a", { class: "btn btn-secondary", href: base(e) }, "Go to the exam overview")
    ]);
  }

  /** "- [ ] …" task lists on exam pages: ticks saved per profile and page. */
  function wireTasks(e, article, pageId) {
    const boxes = article.querySelectorAll("input.md-task");
    if (!boxes.length || !pd()) return;
    const tasks = pd().examData(e.id).tasks;
    const saved = tasks[pageId] || {};
    boxes.forEach(function (box, i) {
      if (Object.prototype.hasOwnProperty.call(saved, i)) box.checked = saved[i] === true;
      box.addEventListener("change", function () {
        tasks[pageId] = tasks[pageId] || {};
        tasks[pageId][i] = box.checked;
        pd().saveExams();
      });
    });
    article.appendChild(el("p", { class: "c1-tasks-reset" }, el("button", {
      type: "button", class: "btn btn-link btn-small",
      onclick: function () { boxes.forEach(function (b) { b.checked = false; }); delete tasks[pageId]; pd().saveExams(); }
    }, "Untick everything on this page")));
  }

  function pageNav(e, pageId) {
    const all = [];
    sections(e).forEach(function (s) { (s.pages || []).forEach(function (p) { all.push(p); }); });
    const i = all.findIndex(function (p) { return p.id === pageId; });
    const prev = all[i - 1], next = all[i + 1];
    if (!prev && !next) return null;
    return el("nav", { class: "c1-pager", "aria-label": "Neighbouring pages" }, [
      prev ? el("a", { class: "btn btn-secondary", href: hrefPage(e, prev.id) }, LM.ui.withIcon("arrow-left", prev.label)) : el("span"),
      next ? el("a", { class: "btn btn-secondary", href: hrefPage(e, next.id) }, [next.label, LM.icon("arrow-right", { size: 18 })]) : null
    ]);
  }

  /** "Exam information checked on <Month YYYY>. Always confirm on the official site: <link>" (spec 12 §4). */
  function sourcesNote(e) {
    const links = (e.sources || (data(e).manifest.links || [])).filter(function (l) { return /^https:\/\//.test(l.url); });
    return el("aside", { class: "callout callout-trap exam-facts-note", "aria-label": "How current this is" }, [
      el("p", { class: "callout-title" }, [el("span", { class: "callout-icon", "aria-hidden": "true" }, LM.icon("info", { size: 20 })),
        e.checkedOn ? "Exam information checked on " + e.checkedOn + "." : "Exam information"]),
      el("p", null, ["Always confirm on the official site" + (links.length ? ": " : "."), links.length ? links.map(function (l, i) {
        return [i ? ", " : "", el("a", { href: l.url, target: "_blank", rel: "noopener noreferrer" }, [l.label, el("span", { class: "visually-hidden", text: " (opens in a new tab)" })])];
      }) : null])
    ]);
  }

  // [[id]] links on exam pages: first the general ones (topics), then the pages of the exam being drawn
  let wikiExam = null;
  const prevResolve = LM.markdown.resolveWiki;
  LM.markdown.resolveWiki = function (id) {
    const r = prevResolve ? prevResolve(id) : null;
    if (r || !wikiExam) return r;
    const f = findPage(wikiExam, id);
    return f ? { href: hrefPage(wikiExam, id), text: f.page.label, kind: "exam" } : null;
  };

  function renderPage(view, e, id) {
    const found = findPage(e, id);
    const text = found && data(e).pages[id];
    if (!text) { view.appendChild(notFound(e)); return null; }
    const doc = LM.markdown.parse(text);
    wikiExam = e;
    view.appendChild(el("div", { class: "c1-page-tools" }, [
      crumb(e, found.section.label),
      el("div", { class: "c1-page-actions" }, [
        id === OVERVIEW ? LM.examCover.pinButton(e) : null,
        LM.notes ? LM.notes.button(e.id + ":" + id, { title: e.code + " · " + (doc.meta.title || found.page.label), route: location.hash }) : null
      ])
    ]));
    const article = el("article", { class: "md c1-page exam-page" }, LM.markdown.render(doc.blocks, { hiddenSections: HIDDEN_SECTIONS }));
    wikiExam = null; // the [[id]] context only while the exam page is drawn
    if (id === OVERVIEW) insertAfterIntro(article, el("div", { class: "exam-overview-top" }, [LM.examDate.cardFor(e), sourcesNote(e)]));
    wireTasks(e, article, id);
    if (LM.callouts) LM.callouts.apply(article);
    view.appendChild(article);
    if (found.page.models && LM.writing) view.appendChild(LM.writing.pageSection(e.id));
    if (id === OVERVIEW && LM.cards && LM.cards.examTile) { const ft = LM.cards.examTile(e.id); if (ft) view.appendChild(ft); }
    const nav = pageNav(e, id);
    if (nav) view.appendChild(nav);
    return doc.meta.title || found.page.label;
  }

  /** The exam's sets in the manifest's groups (exercise engine cards: score, item count, "Start"). */
  function renderExercises(view, e) {
    const section = sections(e).find(function (s) { return s.exerciseGroups; });
    if (!section) { view.appendChild(notFound(e)); return null; }
    view.appendChild(crumb(e, section.label));
    view.appendChild(el("h1", { class: "c1-title", text: section.label }));
    view.appendChild(el("p", { class: "c1-lead", text: "Sets in the format of the exam tasks. Your score and mistakes are saved in your profile; mistakes go to your mistake log." }));
    const box = el("div", { class: "exam-groups" }, el("p", { class: "tool-note", text: "Loading the sets…" }));
    view.appendChild(box);
    LM.exercises.loadIndex().then(function (index) {
      box.replaceChildren();
      section.exerciseGroups.forEach(function (g) {
        const cards = g.sets.map(function (s) { return index.sets[s.id]; }).filter(Boolean).map(function (meta) {
          const card = LM.exercises.setCard(meta);
          if (meta.listening) card.insertBefore(el("p", { class: "exam-tts-note" }, [LM.icon("volume-2", { size: 14 }), " Synthesised voice of the browser"]), card.children[1]);
          if (meta.hasPassage) card.insertBefore(el("p", { class: "exam-tts-note" }, [LM.icon("file-text", { size: 14 }), " A text to read"]), card.children[1]);
          return card;
        });
        box.appendChild(el("section", { class: "exam-group", "aria-label": g.label }, [
          el("h2", { class: "c1-group-title", text: g.label }),
          cards.length ? el("div", { class: "ex-set-grid" }, cards) : el("p", { class: "tool-note", text: "The sets for this part are being written." })
        ]));
      });
    });
    return section.label;
  }

  // ---------- Writing trainer (shared engine; everything exam-specific comes from the exam's writing.json) ----------

  const trainers = {};

  /**
   * Config keys of writing.json used here (all optional except wordRange and timeMinutes):
   *   genres { key: label }, parts { "1": { label, note } }, genrePages { genre: page id }, lead,
   *   messages { low, over, lowNote }, lowScope, timerNote, rubricNotes [], rubric, choiceGroups, tasks[]
   */
  function writingTrainer(e) {
    if (trainers[e.id]) return trainers[e.id];
    const L = LM.examLogic;
    const T0 = function () { return trainerData(e, "writing") || {}; };
    const href = function (taskId) { return base(e) + "/writing" + (taskId ? "/" + taskId : ""); };
    const genreName = function (g) { const G = T0().genres || {}; return G[g] || g; };
    const msg = function (k) { return (T0().messages || {})[k] || null; };
    trainers[e.id] = LM.writingTrainer.create({
      trainer: function () { return trainerData(e, "writing"); },
      section: function () { return trainerSection(e, "writing"); },
      crumb: function (label) { return crumb(e, label); },
      notFound: function (msg2) { return notFound(e, msg2); },
      href: href,
      examId: e.id,
      drafts: function () { return pd().examData(e.id).drafts; },
      save: function () { pd().saveExams(); },
      choices: function () { return pd().examData(e.id).choices; },
      countWords: function (text, task) { return L.countWritingWords(text, task && task.opening, LM.lang.countWords); },
      wordsLabel: words,
      counter: function (n, T) {
        const z = L.writingZone(n, T);
        const hint = {
          low: " · " + (msg("low") || "too short for a full score"),
          warn: " · a bit more: the range is " + T.wordRange[0] + "–" + T.wordRange[1],
          ok: " · within " + T.wordRange[0] + "–" + T.wordRange[1],
          over: " · " + (msg("over") || "over the limit") + " (" + T.wordRange[1] + ")"
        }[z];
        return { cls: { low: "is-low", warn: "is-warn", ok: "is-ok", over: "is-over" }[z], hint: hint };
      },
      listTitle: "Writing trainer",
      listLead: function (T) {
        if (T.lead) return T.lead;
        const genres = [];
        T.tasks.forEach(function (t) { const g = genreName(t.genre); if (genres.indexOf(g) === -1) genres.push(g); });
        return genres.join(", ") + ": " + T.wordRange[0] + "–" + T.wordRange[1] + " words, " + T.timeMinutes + " minutes per task. " +
          "The word counter is approximate, and your draft saves itself in your profile.";
      },
      chips: function (task, T, inList) {
        const out = [task.part ? "Part " + task.part : null, genreName(task.genre), task.points ? task.points + " pts" : null];
        if (!inList) out.push(T.wordRange[0] + "–" + T.wordRange[1] + " words");
        return out.filter(Boolean);
      },
      genreTitle: function () { return "Text type"; },
      genrePage: function (task) {
        const id = (T0().genrePages || {})[task.genre];
        const f = id ? findPage(e, id) : null;
        return f ? { href: hrefPage(e, id), label: f.page.label } : null;
      },
      partGroups: T0().parts ? function (T, tasks) {
        return Object.keys(T.parts).map(function (n) {
          return { label: T.parts[n].label, note: T.parts[n].note, tasks: tasks.filter(function (t) { return String(t.part) === n; }) };
        });
      } : null,
      lowNote: msg("lowNote") ? function (n, T) { return "Fewer than " + T.warnBelow + " words: " + msg("lowNote"); } : null,
      modelHref: function (task) { return "#/writing/models/" + e.id + "/" + task.id; },
      timerKey: function (task) { return e.id + ":writing:" + task.id; },
      timerNote: T0().timerNote || "Leave a few minutes to check your spelling: the editor does not underline mistakes.",
      rubricNotes: T0().rubricNotes || [],
      lowScope: T0().lowScope || "content",
      examExtras: true
    });
    return trainers[e.id];
  }

  // ---------- Speaking trainer ----------

  const speakers = {};

  function speakingTrainer(e) {
    if (speakers[e.id]) return speakers[e.id];
    speakers[e.id] = LM.speakingTrainer.create({
      data: function () { return trainerData(e, "speaking"); },
      section: function () { return trainerSection(e, "speaking"); },
      crumb: function (label) { return crumb(e, label); },
      notFound: function (msg) { return notFound(e, msg); },
      examId: e.id
    });
    return speakers[e.id];
  }

  // =====================================================================
  // "WORK IN PROGRESS" PAGE
  // =====================================================================

  function soonIllustration() {
    const NS = "http://www.w3.org/2000/svg";
    const s = function (tag, attrs) { const n = document.createElementNS(NS, tag); Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); }); return n; };
    const svg = s("svg", { viewBox: "0 0 160 160", class: "soon-art", "aria-hidden": "true", focusable: "false" });
    // A compass on scaffolding: ring, needle, four beams
    [["20", "140", "140", "140"], ["32", "140", "32", "60"], ["128", "140", "128", "60"], ["32", "100", "128", "100"]].forEach(function (l) {
      svg.appendChild(s("line", { x1: l[0], y1: l[1], x2: l[2], y2: l[3], class: "soon-beam" }));
    });
    svg.appendChild(s("circle", { cx: "80", cy: "62", r: "38", class: "soon-ring" }));
    svg.appendChild(s("path", { d: "M80 32 L90 62 L80 92 L70 62 Z", class: "soon-needle" }));
    svg.appendChild(s("circle", { cx: "80", cy: "62", r: "4", class: "soon-dot" }));
    return svg;
  }

  function renderSoon(view, e) {
    const active = exams().find(function (x) { return x.status === "active"; });
    view.appendChild(el("section", { class: "card soon-card", "aria-labelledby": "soon-title" }, [
      soonIllustration(),
      el("div", { class: "soon-body" }, [
        el("p", { class: "soon-badge" }, [LM.icon("clock", { size: 16 }), "Work in progress"]),
        el("h1", { class: "soon-title", id: "soon-title", text: e.label }),
        e.description ? el("p", { class: "soon-desc", text: e.description }) : null,
        el("p", { class: "tool-note", text: "We are working on this exam. Come back soon." }),
        el("div", { class: "tool-actions" }, [
          el("a", { class: "btn btn-primary", href: "#/today" }, LM.ui.withIcon("sunrise", "Back to Today")),
          active ? el("a", { class: "btn btn-secondary", href: base(active) }, LM.ui.withIcon("arrow-right", "See: " + active.label)) : null
        ])
      ])
    ]));
    return e.label;
  }

  // =====================================================================
  // DRAWING
  // =====================================================================

  function render(route) {
    const e = byId(route.examId);
    const view = document.getElementById("view");
    view.className = "view c1-view exam-view exam-" + e.id;
    view.dataset.file = "#exam:" + e.id + ":" + route.kind + ":" + (route.id || route.task || "");
    view.replaceChildren();
    if (route.kind === "soon") {
      document.title = renderSoon(view, e) + " · " + LM.APP.appTitle;
      return;
    }
    if (!data(e)) {
      view.appendChild(el("p", { class: "tool-note", role: "status", text: "Loading the exam…" }));
      load(e).then(function (d) {
        if (!d) { view.replaceChildren(notFound(e, "The exam data (data/exam-" + e.id + ".js) is missing. Run: npm run build")); return; }
        const now = parseRoute(location.hash);
        if (now && now.examId === e.id) { render(now); renderNav(); }
      });
      return;
    }
    view.appendChild(LM.examCover[route.kind === "page" && route.id === OVERVIEW ? "full" : "compact"](e));
    let title = null;
    if (route.kind === "page") title = renderPage(view, e, route.id);
    else if (route.kind === "exercises") title = renderExercises(view, e);
    else if (route.kind === "writing") title = trainerData(e, "writing") ? writingTrainer(e).render(view, route.task) : (view.appendChild(notFound(e)), null);
    else if (route.kind === "speaking") {
      if (!trainerData(e, "speaking")) view.appendChild(notFound(e));
      else if (LM.speakingTrainer) title = speakingTrainer(e).render(view);
      else {
        view.appendChild(el("p", { class: "tool-note", role: "status", text: "Loading the trainer…" }));
        LM.loadModule("js/recorder.js").then(function () { return LM.loadModule("js/speaking-trainer.js"); }).then(function () {
          const now = parseRoute(location.hash);
          if (now && now.examId === e.id && now.kind === "speaking") render(now);
        }, function (err) { console.warn(err.message); view.replaceChildren(notFound(e, "The trainer could not be loaded. Reload the page.")); });
        title = "Speaking trainer";
      }
    }
    document.title = (title ? title + " · " : "") + e.label + " · " + LM.APP.appTitle;
    if (title && pd()) pd().setLastPage(location.hash, e.label + " · " + title);
  }

  // =====================================================================
  // SIDEBAR: the "Exams" group from the registry (hidden while the registry is empty).
  // Exams shown in #exams-nav; the "+N" button for the others in #exams-more-nav.
  // =====================================================================

  const expanded = {};

  function navItem(href, label, active, icon) {
    return el("li", null, el("a", {
      class: "c1-nav-link" + (active ? " is-active" : "") + (icon ? " is-trainer" : ""),
      href: href, "aria-current": active ? "page" : null
    }, [
      icon ? LM.icon(icon, { size: 16, class: "c1-nav-icon" }) : null,
      el("span", { class: "c1-nav-label", text: label })
    ]));
  }

  /** Countdown on the tile: "15 d", "today", or null (no date / date passed). */
  function tileDays(e) {
    const i = LM.examMy.info(e.id);
    if (i.days === null || i.days < 0) return null;
    return i.days === 0 ? "today" : i.days + " d";
  }

  /** Exam tile in the sidebar: 44×44, code and countdown in the exam's colours. */
  function examTile(e, here, soon) {
    const days = soon ? null : tileDays(e);
    const info = LM.examMy.info(e.id);
    const countdown = !soon && info.days !== null && info.days >= 0 ? LM.examDate.stateText(info.days) : "";
    return el("a", {
      class: "sb-item exam-chip" + (soon ? " is-soon" : "") + (here ? " is-active" : ""),
      href: base(e),
      style: accentStyle(e),
      "aria-current": here ? "page" : null,
      "aria-label": e.label + (soon ? ", soon: work in progress" : countdown ? ", " + countdown : "")
    }, [
      el("span", { class: "sb-icon", "aria-hidden": "true" }, el("span", { class: "exam-chip-badge is-tile" }, [
        el("span", { class: "exam-tile-code", text: e.code }),
        days ? el("span", { class: "exam-tile-days num", text: days }) : null
      ])),
      el("span", { class: "sb-label" }, [
        el("span", { class: "sb-label-title", text: e.label }),
        soon ? el("span", { class: "sb-label-sub" }, el("span", { class: "exam-soon-tag", text: "soon" }))
          : el("span", { class: "sb-label-sub", text: LM.examMy.navSub(e) })
      ])
    ]);
  }

  /** The exam open on screen stays in the sidebar even when it is not "mine". */
  function currentExamId() {
    const st = LM.state;
    return st && st.view === "exam" && st.toolRoute ? st.toolRoute.examId : null;
  }

  function split() {
    return LM.examLogic.navSplit(reg(), LM.examMy.list().map(function (m) { return m.id; }), currentExamId());
  }

  function renderNav() {
    const box = document.getElementById("exams-nav");
    if (!box) return;
    box.replaceChildren();
    const moreBox = document.getElementById("exams-more-nav");
    if (moreBox) moreBox.replaceChildren();
    const empty = !exams().length;
    box.hidden = empty;
    if (moreBox) moreBox.hidden = empty;
    if (empty) return;
    const route = LM.state && LM.state.view === "exam" ? LM.state.toolRoute : null;
    const sp = split();
    const list = el("ul", { class: "sb-list exam-list" });
    sp.shown.forEach(function (id) {
      const e = byId(id);
      if (!e) return;
      const soon = e.status !== "active";
      const here = !!(route && route.examId === e.id);
      const li = el("li", null, examTile(e, here, soon));
      list.appendChild(li);
      // Sections of the open exam (expanded sidebar only)
      if (here && data(e) && !soon) {
        const current = sectionIdOf(e, route);
        const secs = el("div", { class: "sb-c1-sections exam-sections" });
        sections(e).forEach(function (s) {
          const open = Object.prototype.hasOwnProperty.call(expanded, e.id + s.id) ? expanded[e.id + s.id] : s.id === current;
          const listId = "exam-sec-" + e.id + "-" + s.id;
          const ul = el("ul", { class: "c1-sec-list", id: listId, hidden: !open });
          (s.pages || []).forEach(function (p) { ul.appendChild(navItem(hrefPage(e, p.id), p.label, route.kind === "page" && route.id === p.id)); });
          if (s.exerciseGroups) ul.appendChild(navItem(base(e) + "/practice", "All sets", route.kind === "exercises"));
          const w = trainerOf(s, "writing"), sp2 = trainerOf(s, "speaking");
          if (w) ul.appendChild(navItem(base(e) + "/writing", w.label, route.kind === "writing", "pencil"));
          if (sp2) ul.appendChild(navItem(base(e) + "/speaking", sp2.label, route.kind === "speaking", "mic"));
          secs.appendChild(el("div", { class: "c1-sec" + (s.id === current ? " is-current" : "") }, [
            el("button", {
              type: "button", class: "c1-sec-toggle", "aria-expanded": open ? "true" : "false", "aria-controls": listId,
              onclick: function () {
                expanded[e.id + s.id] = !open;
                renderNav();
                const again = document.querySelector('[aria-controls="' + listId + '"]');
                if (again) again.focus();
              }
            }, [el("span", { class: "c1-sec-caret", "aria-hidden": "true" }, LM.icon("chevron-right", { size: 16 })), s.label]),
            ul
          ]));
        });
        li.appendChild(secs);
      }
    });
    box.appendChild(el("p", { class: "sb-caption", id: "sb-exams-caption", text: sp.hidden.length ? "My exams" : "Exams" }));
    box.appendChild(list);
    if (moreBox && sp.hidden.length) moreBox.appendChild(moreButton(sp.hidden));
    if (popover) refreshPopover();
  }

  // =====================================================================
  // "+N": popover with the other exams (link + "Pin" switch)
  // =====================================================================

  let popover = null;   // { node, ids }

  function moreButton(hidden) {
    const n = hidden.length;
    return el("button", {
      type: "button", class: "sb-item exam-more", id: "exam-more",
      "aria-haspopup": "dialog", "aria-expanded": popover ? "true" : "false", "aria-controls": "exam-pop",
      "aria-label": "Show the other exams (" + n + ")",
      onclick: function () { if (popover) closePopover(true); else openPopover(); }
    }, [
      el("span", { class: "sb-icon", "aria-hidden": "true" }, el("span", { class: "exam-more-badge num", text: "+" + n })),
      el("span", { class: "sb-label" }, el("span", { class: "sb-label-title", text: "Other exams" }))
    ]);
  }

  function popoverRows() {
    return popover.ids.map(function (id) {
      const e = byId(id);
      if (!e) return null;
      const soon = e.status !== "active";
      const mine = LM.examMy.isMine(id);
      const inner = [
        el("span", { class: "exam-chip-badge", "aria-hidden": "true", text: e.code }),
        el("span", { class: "exam-pop-label" }, [
          el("span", { class: "exam-pop-title", text: e.label }),
          el("span", { class: "exam-pop-sub", text: soon ? "soon: work in progress" : (e.subtitle || "") })
        ])
      ];
      return el("li", { class: "exam-pop-row" + (soon ? " is-soon" : ""), style: accentStyle(e) }, [
        soon ? el("span", { class: "exam-pop-link is-disabled" }, inner)
          : el("a", { class: "exam-pop-link", href: base(e), onclick: function () { closePopover(false); } }, inner),
        soon ? null : el("button", {
          type: "button", class: "exam-pop-pin", role: "switch", "aria-checked": mine ? "true" : "false", "data-pin": id,
          "aria-label": "Pin: " + e.label,
          onclick: function () { if (mine) LM.examMy.unpin(id); else LM.examMy.pin(id); }
        }, [el("span", { text: "Pin" }), el("span", { class: "switch-track", "aria-hidden": "true" }, el("span", { class: "switch-thumb" }))])
      ]);
    }).filter(Boolean);
  }

  /** After pinning or unpinning the list stays (same set of exams) and focus stays on the switch. */
  function refreshPopover() {
    if (!popover) return;
    const active = document.activeElement;
    const focused = active && active.getAttribute ? active.getAttribute("data-pin") : null;
    const ul = popover.node.querySelector(".exam-pop-list");
    ul.replaceChildren.apply(ul, popoverRows());
    const btn = document.getElementById("exam-more");
    if (btn) btn.setAttribute("aria-expanded", "true");
    if (focused) { const again = popover.node.querySelector('[data-pin="' + focused + '"]'); if (again) again.focus(); }
  }

  function placePopover() {
    const btn = document.getElementById("exam-more");
    if (!popover || !btn) return;
    const node = popover.node;
    if (window.matchMedia("(max-width: 767px)").matches) { node.style.left = ""; node.style.top = ""; return; }
    const r = btn.getBoundingClientRect();
    // With the sidebar expanded the popover opens beside the panel's right edge, not the narrow bar
    const sb = document.getElementById("sidebar");
    const panelRight = sb && sb.classList.contains("is-expanded") ? document.getElementById("sb-panel").getBoundingClientRect().right : r.right;
    const expandedW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--panel-w")) || 288;
    const edge = sb && sb.classList.contains("is-expanded") ? Math.max(panelRight, expandedW) : r.right;
    node.style.left = Math.round(edge + 8) + "px";
    node.style.top = Math.max(8, Math.min(Math.round(r.top), window.innerHeight - node.offsetHeight - 8)) + "px";
  }

  function onPopoverKey(e) {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePopover(true); }
  }

  function closeOnRoute() { closePopover(false); }

  function onPopoverOutside(e) {
    if (!popover) return;
    if (popover.node.contains(e.target) || (e.target.closest && e.target.closest("#exam-more"))) return;
    closePopover(false);
  }

  function openPopover() {
    const node = el("div", { class: "exam-pop", id: "exam-pop", role: "dialog", "aria-label": "Other exams" }, [
      el("p", { class: "exam-pop-head", text: "Other exams" }),
      el("ul", { class: "exam-pop-list" })
    ]);
    popover = { node: node, ids: split().hidden.slice() };
    document.body.appendChild(node);
    refreshPopover();
    placePopover();
    node.addEventListener("keydown", onPopoverKey);
    // Tab out of the list closes the popover (no focus trap)
    let pointerInside = false;
    node.addEventListener("pointerdown", function () { pointerInside = true; setTimeout(function () { pointerInside = false; }, 80); });
    node.addEventListener("focusout", function (e) {
      const to = e.relatedTarget;
      if (to && (node.contains(to) || (to.closest && to.closest("#exam-more")))) return;
      setTimeout(function () {
        if (!popover || popover.node !== node || pointerInside) return;
        const a = document.activeElement;
        if (a && (node.contains(a) || (a.closest && a.closest("#exam-more")))) return;
        closePopover(false);
      }, 0);
    });
    document.addEventListener("pointerdown", onPopoverOutside, true);
    window.addEventListener("resize", placePopover);
    window.addEventListener("hashchange", closeOnRoute);
    if (LM.sidebar && LM.sidebar.hold) LM.sidebar.hold(true);
    const first = node.querySelector("a, button");
    if (first) first.focus();
  }

  /** Closes the popover; focus = true gives focus back to "+N" (or the first tile when the button is gone). */
  function closePopover(focus) {
    if (!popover) return;
    popover.node.remove();
    popover = null;
    document.removeEventListener("pointerdown", onPopoverOutside, true);
    window.removeEventListener("resize", placePopover);
    window.removeEventListener("hashchange", closeOnRoute);
    if (LM.sidebar && LM.sidebar.hold) LM.sidebar.hold(false);
    const btn = document.getElementById("exam-more");
    if (btn) btn.setAttribute("aria-expanded", "false");
    if (focus) {
      const target = btn || document.querySelector("#exams-nav .exam-chip");
      if (target) target.focus();
    }
  }

  // =====================================================================
  // EXAM BOXES ON TOPIC PAGES (one per exam with a link, in registry order)
  // =====================================================================

  function examBox(e, link) {
    const setsMeta = reg().sets || {};
    const items = (link.exercises || []).map(function (id) {
      const meta = setsMeta[id];
      if (!meta) { console.warn("Exam box " + e.code + ": unknown set " + id); return null; }
      const score = pd() ? pd().setScore(id) : null;
      return el("li", null, [
        el("a", { href: meta.href || "#/practice/set/" + id }, [meta.group + ": " + meta.label, LM.icon("chevron-right", { size: 16 })]),
        el("span", { class: "c1-exam-box-best", text: score ? "best score " + score.best.score + "/" + score.best.total : "not done yet" })
      ]);
    }).filter(Boolean);
    const title = (reg().boxTitles && reg().boxTitles[e.id]) || "In the exam: " + e.label;
    return el("aside", { class: "exam-box callout exam-box-" + e.id, style: accentStyle(e), "aria-label": title }, [
      el("div", { class: "c1-exam-box-head" }, [
        el("span", { class: "exam-chip-badge", "aria-hidden": "true", text: e.code }),
        el("a", { class: "c1-exam-box-title exam-box-title", href: base(e) }, title)
      ]),
      (link.examParts || []).length ? el("div", { class: "c1-chips" }, link.examParts.map(function (p) { return el("span", { class: "c1-chip", text: p }); })) : null,
      link.note ? el("p", { class: "c1-exam-box-note" }, LM.markdown.inline(link.note)) : null,
      items.length ? el("ul", { class: "c1-exam-box-links" }, items) : null
    ]);
  }

  /** Boxes for a topic: one per active exam that links to it, in registry order; null when there are none. */
  function examBoxesFor(topicId) {
    const out = [];
    exams().forEach(function (e) {
      if (e.status !== "active") return;
      const link = (reg().links[e.id] || []).find(function (l) { return l.itemId === topicId; });
      if (link) out.push(examBox(e, link));
    });
    if (!out.length) return null;
    return out.length === 1 ? out[0] : el("div", { class: "exam-boxes" }, out);
  }

  /** Puts node before the article's first section (after the intro). */
  function insertAfterIntro(article, node) {
    if (!node) return;
    const first = article.querySelector(".md-section");
    if (first) article.insertBefore(node, first);
    else article.appendChild(node);
  }

  /** Puts the exam boxes after the explanation: before "Real life vs exam" / common mistakes / "Practice" (exam-logic). */
  function insertExamBoxes(article, node) {
    if (!node) return;
    const secs = Array.prototype.filter.call(article.children, function (n) { return n.classList && n.classList.contains("md-section"); });
    const titles = secs.map(function (s) { const h = s.querySelector("h2"); return h ? h.textContent : ""; });
    const i = LM.examLogic.examBoxAnchorIndex(titles, LM.APP.mistakesHeading);
    if (i >= 0) article.insertBefore(node, secs[i]);
    else article.appendChild(node);
  }

  /** For the exercise engine: back from an exam set to the exam's list of sets. */
  function setBack(examId) {
    const e = byId(examId);
    return e ? { href: base(e) + "/practice", label: "Back to the sets: " + e.label } : null;
  }

  LM.exams = {
    parseRoute: parseRoute,
    render: render,
    renderNav: renderNav,
    closePopover: closePopover,
    examBoxesFor: examBoxesFor,
    insertExamBoxes: insertExamBoxes,
    insertAfterIntro: insertAfterIntro,
    setBack: setBack,
    trainerData: trainerData,
    href: base,
    byId: byId,
    list: exams,
    load: load
  };
})(window.LM);
