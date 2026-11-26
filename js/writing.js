/*
 * writing.js — the “Writing” section (pack v6, spec 17, section 1): model answers with comments.
 *
 *   #/writing                              list of model answers grouped by exam and text type
 *   #/writing/models/<exam>/<id>           a model answer with comments (view: js/writing-model.js)
 *
 * Data: tasks with modelNotes in content/exams/<exam>/training/writing.json (the exam's writing trainer,
 * LM.exams.trainerData). The `model` texts are not changed; the notes point at exact fragments (anchors).
 *
 *   LM.writing.parseRoute(hash), render(), examList() → Promise of [{ exam, T, tasks }]
 *   LM.writing.hrefModel(examId, taskId), LM.writing.pageSection(examId) — a section with links on the exams' “Writing” pages
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const U = LM.utils;
  const el = U.el;
  const HASH = "#/writing";

  const GENRES = { essay: "Essay", email: "Email", letter: "Letter", blog: "Blog post", forum: "Forum post",
    article: "Article", review: "Review", report: "Report", proposal: "Proposal", story: "Story" };

  const TYPES = { // keys are the stored comment types of the model-answer data
    punkty: { label: "Task completion", icon: "check", help: "Which part of the task this passage covers." },
    lacznik: { label: "Linking", icon: "arrow-right", help: "A conjunction, a linking phrase, a move between paragraphs." },
    rejestr: { label: "Register", icon: "user-round", help: "Formality and tone – what to avoid in this text type." },
    struktura: { label: "Organization", icon: "layout-grid", help: "The role of a paragraph, the opening, the ending, a topic sentence." },
    zakres: { label: "Range", icon: "sparkles", help: "A structure or vocabulary that raises the mark." },
    uwaga: { label: "To improve", icon: "triangle-alert", help: "What could be done better." }
  };
  const TYPE_ORDER = ["punkty", "lacznik", "rejestr", "struktura", "zakres", "uwaga"];

  function reg() { return LM.EXAM_REGISTRY || { exams: [] }; }
  function genreLabel(g) { return GENRES[g] || g; }
  function hrefModel(examId, taskId) { return HASH + "/models/" + examId + "/" + taskId; }

  /** Words of a model answer, counted as the writing trainer counts them (without the given opening). */
  function wordCount(examId, task) {
    return LM.examLogic.countWritingWords(String(task.model || ""), task.opening, LM.lang && LM.lang.countWords);
  }

  // =====================================================================
  // DATA
  // =====================================================================

  let cache = null;

  /** Exams with a writing trainer and tasks with modelNotes: [{ exam, T, tasks }] in registry order. */
  function examList() {
    if (cache) return Promise.resolve(cache);
    const list = reg().exams.filter(function (e) { return e.status === "active"; });
    return Promise.all(list.map(function (e) {
      const load = LM.exams ? LM.exams.load(e).then(function (d) { return d ? LM.exams.trainerData(e, "writing") : null; }) : Promise.resolve(null);
      return load.then(function (T) {
        const tasks = T && T.tasks ? T.tasks.filter(function (t) { return t.model && t.modelNotes; }) : [];
        return tasks.length ? { exam: e, T: T, tasks: tasks } : null;
      });
    })).then(function (rows) {
      cache = rows.filter(Boolean);
      return cache;
    });
  }

  /** Exam chip: the short name + the full name for screen readers; the registry colour as an extra. */
  function examChip(e) {
    const accent = e.accent || "var(--accent)";
    return el("span", { class: "chip wz-exam", style: "--exam: " + accent }, [
      el("span", { "aria-hidden": "true", text: e.code }),
      el("span", { class: "visually-hidden", text: e.label })
    ]);
  }

  // =====================================================================
  // ROUTES
  // =====================================================================

  function parseRoute(hash) {
    const m = /^#\/writing(?:\/(.*))?$/.exec(hash || "");
    if (!m) return null;
    const p = (m[1] || "").replace(/\/+$/, "").split("/").filter(Boolean).map(function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } });
    if (!p.length) return { kind: "list" };
    if (p[0] === "models" && p[1] && p[2] && !p[3]) return { kind: "model", exam: p[1], task: p[2] };
    if (p[0] === "phrases" && p.length <= 2) return { kind: "phrases", group: p[1] || "" };
    return null;
  }

  // =====================================================================
  // LIST OF MODEL ANSWERS
  // =====================================================================

  function head(title, lead) {
    return LM.ui.pageHead({ eyebrow: "Learning · Writing", title: title, lead: lead });
  }

  function noteCount(task) { return ((task.modelNotes && task.modelNotes.annotations) || []).length; }

  function card(row, task) {
    const n = noteCount(task);
    const words = wordCount(row.exam.id, task);
    return el("li", { class: "card wz-card" }, [
      el("a", { class: "wz-card-link", href: hrefModel(row.exam.id, task.id) }, [
        el("span", { class: "wz-card-title", text: task.title || task.id }),
        el("span", { class: "wz-card-meta" }, [
          el("span", { class: "chip", text: genreLabel(task.genre) }),
          el("span", { class: "tool-note", text: LM.plural(words, "word", "words") + " · " + LM.plural(n, "comment", "comments") })
        ])
      ])
    ]);
  }

  function renderList(view) {
    view.appendChild(head("Writing – model answers with comments", "Model texts with comments in the margin: what covers the task, how linking and register work, what raises the range, and what could be done better."));
    view.appendChild(el("p", { class: "card wz-phrases-link" }, [
      el("a", { href: HASH + "/phrases", class: "wz-card-title", text: "Phrase bank for writing" }),
      el("span", { class: "tool-note", text: " – phrases by function (opinion, counter-argument, requests…), with level, register and text type filters." })
    ]));
    const body = el("div", { class: "wz-list", "aria-live": "polite" }, el("p", { class: "tool-note", role: "status", text: "Loading the model answers…" }));
    view.appendChild(body);
    examList().then(function (rows) {
      if (!view.contains(body)) return;
      body.replaceChildren();
      if (!rows.length) { body.appendChild(el("p", { class: "tool-note", text: "There are no model answers with comments yet." })); return; }
      body.appendChild(el("nav", { class: "chip-filter wz-jump", "aria-label": "Exams" }, rows.map(function (r) {
        return el("a", { class: "chip-btn", href: "#wz-" + r.exam.id, onclick: function (ev) { ev.preventDefault(); const t = document.getElementById("wz-" + r.exam.id); if (t) t.scrollIntoView({ block: "start" }); } }, r.exam.code);
      })));
      rows.forEach(function (r) {
        const genres = [];
        r.tasks.forEach(function (t) { if (genres.indexOf(t.genre) === -1) genres.push(t.genre); });
        body.appendChild(el("section", { class: "wz-exam-block", "aria-labelledby": "wz-" + r.exam.id }, [
          el("h2", { class: "section-title wz-exam-title", id: "wz-" + r.exam.id }, [examChip(r.exam), " " + r.exam.label]),
          genres.map(function (g) {
            return el("div", { class: "wz-genre" }, [
              el("h3", { class: "wz-genre-title", text: genreLabel(g) }),
              el("ul", { class: "wz-card-list" }, r.tasks.filter(function (t) { return t.genre === g; }).map(function (t) { return card(r, t); }))
            ]);
          })
        ]));
      });
    });
  }

  // =====================================================================
  // AN EXAM'S “WRITING” PAGE: the “Model answers with comments” section (no editing of .md)
  // =====================================================================

  /** A section with links to the model answers of an exam (or null when there are none with comments). It fills after the data loads. */
  function pageSection(examId) {
    const box = el("section", { class: "card wz-page-section", "aria-labelledby": "wz-ps-" + examId, hidden: true });
    examList().then(function (rows) {
      const r = rows.find(function (x) { return x.exam.id === examId; });
      if (!r) return;
      box.appendChild(el("h2", { class: "section-title", id: "wz-ps-" + examId, text: "Model answers with comments" }));
      box.appendChild(el("p", { class: "tool-note", text: "Model texts with comments in the margin – see what works in them and what could be better." }));
      box.appendChild(el("ul", { class: "wz-ps-list" }, r.tasks.map(function (t) {
        return el("li", null, [el("a", { href: hrefModel(r.exam.id, t.id), text: t.title || t.id }), el("span", { class: "tool-note", text: " · " + genreLabel(t.genre) })]);
      })));
      box.appendChild(el("p", null, el("a", { class: "btn btn-secondary btn-small", href: HASH }, "All model answers")));
      box.hidden = false;
    });
    return box;
  }

  // =====================================================================
  // VIEW
  // =====================================================================

  function render() {
    const view = document.getElementById("view");
    const route = parseRoute(location.hash) || { kind: "list" };
    view.className = "view tool-view writing-view";
    view.dataset.file = HASH;
    view.replaceChildren();
    const lazy = route.kind === "model" ? ["writingModel", "js/writing-model.js"] : route.kind === "phrases" ? ["writingPhrases", "js/writing-phrases.js"] : null;
    if (lazy) {
      // The view modules load only when you open them (fewer scripts at start)
      const draw = function () { LM[lazy[0]].render(view, route); };
      if (LM[lazy[0]]) { draw(); return; }
      view.appendChild(el("p", { class: "tool-note", role: "status", text: "Loading…" }));
      LM.loadModule(lazy[1]).then(function () {
        if (view.isConnected && LM.state.view === "writing" && !view.querySelector(".tool-head")) { view.replaceChildren(); draw(); }
      }, function (err) { console.warn(err.message); view.replaceChildren(el("p", { class: "tool-note", text: "The view could not be loaded. Reload the page." })); });
      return;
    }
    document.title = "Writing · " + LM.APP.appTitle;
    renderList(view);
  }

  LM.writing = {
    HASH: HASH, TYPES: TYPES, TYPE_ORDER: TYPE_ORDER, GENRES: GENRES,
    parseRoute: parseRoute, render: render, examList: examList, examChip: examChip, head: head,
    hrefModel: hrefModel, pageSection: pageSection, wordCount: wordCount, genreLabel: genreLabel
  };
})(window.LM);
