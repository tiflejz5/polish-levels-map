/*
 * cards.js — the flashcards tab (spec 10, section 5): active recall with reviews at growing intervals.
 *
 * Routes:
 *   #/review/decks                 tab “Decks”: list of decks, settings
 *   #/review/session[?only=…]       session: flashcards, “My mistakes” and weak-spot items in one queue
 *   #/review/decks/deck/<id>        browsing a deck (card list, filters, suspending)
 *   #/review/decks/deck/<id>/new    a new card (your own decks)
 *   #/review/decks/deck/<id>/card/<id>  editing your own card
 *   #/review/decks/import          TSV/CSV import with a preview
 *
 * Data: built-in decks (data/decks/<id>.js, loaded on demand; index
 * LM.DECKS_INDEX), state and your own cards in LM.cardsStore (plm.cards.<profileId>).
 * Logic without DOM: LM.cardsLogic, LM.cardsSchedule. User content only as
 * text (textContent / text nodes), no innerHTML.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const U = LM.utils;
  const el = U.el;
  const HASH = "#/review/decks";      // the “Decks” tab and its sub-pages
  const SESSION = "#/review/session";   // the unified session
  const HOME = "#/review";            // “Due today”
  const MISTAKES_ID = "u-moje-bledy";  // stored deck id
  const WORDS_ID = "u-moje-slowa"; // system deck “My words” (system: "words", pack v6 spec 14); stored id
  const GRADE_INFO = [
    { id: "again", label: "Again", key: "1" },
    { id: "hard", label: "Hard", key: "2" },
    { id: "good", label: "Good", key: "3" },
    { id: "easy", label: "Easy", key: "4" }
  ];

  function L() { return LM.cardsLogic; }
  function H() { return LM.cardsSchedule; }
  function S() { return LM.cardsStore; }
  function st() { return S().data(); }
  function now() { return Date.now(); }
  function app() { return LM.app; }
  function hasProfile() { return !!(app() && app().getActiveProfile()); }
  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }

  // =====================================================================
  // DECKS AND CARDS
  // =====================================================================

  function index() { return (LM.DECKS_INDEX && LM.DECKS_INDEX.decks) || []; }
  function builtInDeck(id) { return index().find(function (d) { return d.id === id; }) || null; }
  function loaded(id) { return LM.DECKS && LM.DECKS[id]; }

  /** Loads the built-in decks (all from the index). Promise. */
  function loadDecks() {
    return Promise.all(index().map(function (d) {
      if (loaded(d.id)) return null;
      return LM.loadModule(d.file).catch(function () { return null; });
    }));
  }

  /** All decks: built-in (from the index) and your own (including “My mistakes”). */
  function allDecks() {
    const out = index().map(function (d) { return { id: d.id, title: d.title, description: d.description, level: d.level, builtIn: true, count: d.count }; });
    st().userDecks.forEach(function (d) {
      out.push({ id: d.id, title: d.title, description: d.system === "mistakes" ? "Cards added from the mistake log." : d.system === "words" ? "Words and phrases you selected in texts – each with the sentence it comes from." : "Your deck.", builtIn: false, system: d.system || null,
        count: st().userCards.filter(function (c) { return c.deck === d.id; }).length });
    });
    return out;
  }
  function deckById(id) { return allDecks().find(function (d) { return d.id === id; }) || null; }

  /** Cards of a deck (with the deck field). Built-in decks must be loaded. */
  function cardsOf(deckId) {
    const b = builtInDeck(deckId);
    if (b) {
      const d = loaded(deckId);
      return d ? d.cards.map(function (c) { return Object.assign({ deck: deckId }, c); }) : [];
    }
    return st().userCards.filter(function (c) { return c.deck === deckId; });
  }

  function cardById(id) {
    if (/^u-/.test(id)) return st().userCards.find(function (c) { return c.id === id; }) || null;
    const deckId = id.replace(/-\d{3}$/, "");
    return cardsOf(deckId).find(function (c) { return c.id === id; }) || null;
  }

  /** The deck a card belongs to (without loading the decks). */
  function deckOfId(id) {
    if (/^u-/.test(id)) { const c = st().userCards.find(function (x) { return x.id === id; }); return c ? c.deck : null; }
    return id.replace(/-\d{3}$/, "");
  }

  function enabled() { return st().settings.enabledDecks; }
  function today() { return L().studyDay(now()); }
  function todayCounts() { return st().daily[today()] || { new: 0, reviews: 0, again: 0, good: 0, answers: 0, minutes: 0 }; }

  /** Counts for today without loading the decks (badge, Today, “Due today”): one queue from js/review-queue.js. */
  function dueSummary() {
    const b = LM.reviewQueue.breakdown();
    return { total: b.total, card: b.card, mistake: b.mistake, exercise: b.exercise, due: b.due, fresh: b.fresh };
  }

  function badgeCount() { return hasProfile() ? LM.reviewQueue.dueCount() : 0; }

  /** The nearest due time (ms) after moment “t” among cards and items with a saved state, or null. */
  function nextDue(t) { return LM.reviewQueue.nextDue(t); }

  function fmtWhen(ms) {
    const d = new Date(ms), t = now();
    const hm = LM.fmt.time(d);
    const day = L().studyDay(ms);
    if (day === L().studyDay(t)) return "today at " + hm;
    if (day === L().studyDay(t + H().DAY)) return "tomorrow at " + hm;
    return LM.fmt.dayMonth(d) + " at " + hm;
  }

  function saveState(force) { S().save(null, force === true); refreshChrome(); }

  /** The sidebar badge and the “Today” tile after a data change. */
  function refreshChrome() {
    if (LM.render && LM.render.renderToolsNav) LM.render.renderToolsNav();
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: filename });
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  // =====================================================================
  // DRAWING A CARD (front / back) — text nodes only
  // =====================================================================

  function clozeParts(card) { return L().parseCloze(card.text); }

  /** Exam chips from the card's tags: a short label shown, the full description for screen readers and in the tooltip (spec 15, section 3). */
  function examChips(card) {
    const ex = L().examsOf(card, LM.EXAM_REGISTRY);
    if (!ex.length) return null;
    const hint = "Phrases typical of this exam's tasks. Original sentences, not from past papers.";
    return el("p", { class: "fc-exams" }, [
      el("span", { class: "review-label", text: "Useful for: " }),
      ex.map(function (e) {
        return el("span", { class: "chip fc-exam is-" + e.code, title: hint }, [
          el("span", { "aria-hidden": "true", text: e.short }),
          el("span", { class: "visually-hidden", text: e.name })
        ]);
      })
    ]);
  }

  // Hints of LM.exLogic.match for typed cards (spec 05 §2); the closest accepted answer follows
  const TYPED_NEAR = {
    accents: "Almost. Check the " + LM.APP.language + " letters: ",
    ending: "Right word, wrong ending: ",
    typo: "Looks like a typo: "
  };

  function renderFront(card) {
    const nodes = [];
    if (card.type === "cloze") {
      const c = clozeParts(card);
      nodes.push(el("p", { class: "fc-text", lang: LM.APP.targetLang }, c.ok
        ? [document.createTextNode(c.before), el("span", { class: "fc-blank", "aria-label": "gap" }, "_____"), document.createTextNode(c.after)]
        : [document.createTextNode(card.text)]));
    } else {
      nodes.push(el("p", { class: "fc-text", lang: L().isTarget(card.front) ? LM.APP.targetLang : null, text: card.front }));
    }
    if (card.hint) nodes.push(el("p", { class: "fc-hint" }, [el("span", { class: "review-label", text: "Hint: " }), document.createTextNode(card.hint)]));
    else if (card.word && card.type === "cloze") {
      // “My words” without a meaning: the hint is the first letter (the gap length does not give it away)
      const c = clozeParts(card);
      const first = c.ok ? c.answers[0].charAt(0) : "";
      if (first) nodes.push(el("p", { class: "fc-hint" }, [el("span", { class: "review-label", text: "Hint: " }), document.createTextNode("starts with “" + first + "”")]));
    }
    const chips = examChips(card);
    if (chips) nodes.push(chips);
    return nodes;
  }

  function renderBack(card) {
    const nodes = [];
    const answers = L().answersOf(card);
    if (card.type === "cloze") {
      const c = clozeParts(card);
      nodes.push(el("p", { class: "fc-text", lang: LM.APP.targetLang }, c.ok
        ? [document.createTextNode(c.before), el("strong", { class: "fc-answer", text: c.answers[0] }), document.createTextNode(c.after)]
        : [document.createTextNode(card.text)]));
    } else {
      nodes.push(el("p", { class: "fc-text fc-back", lang: card.type === "typed" || L().isTarget(card.back) ? LM.APP.targetLang : null }, el("strong", { class: "fc-answer", text: card.back })));
    }
    if (answers.length > 1) nodes.push(el("p", { class: "fc-extra" }, [el("span", { class: "review-label", text: "Also accepted: " }), document.createTextNode(answers.slice(1).join(", "))]));
    if (card.example) nodes.push(el("p", { class: "fc-extra", lang: LM.APP.targetLang }, [el("span", { class: "review-label", text: "Example: " }), document.createTextNode(card.example)]));
    // “My words”: the meaning (when there is one), extra examples and the source
    if (card.word && card.hint && card.type === "cloze") nodes.push(el("p", { class: "fc-extra" }, [el("span", { class: "review-label", text: "Meaning: " }), document.createTextNode(card.hint)]));
    if (card.examples && card.examples.length) {
      nodes.push(el("div", { class: "fc-extra fc-examples" }, [
        el("span", { class: "review-label", text: card.examples.length === 1 ? "Second example:" : "More examples:" }),
        el("ul", { class: "fc-example-list", lang: LM.APP.targetLang }, card.examples.map(function (x) { return el("li", { text: x }); }))
      ]));
    }
    if (card.source && (card.source.route || card.source.title)) {
      nodes.push(el("p", { class: "fc-extra fc-source" }, [el("span", { class: "review-label", text: "Source: " }),
        card.source.route ? el("a", { href: card.source.route, text: card.source.title || card.source.route }) : document.createTextNode(card.source.title)]));
    }
    if (card.note) nodes.push(el("p", { class: "fc-extra" }, [el("span", { class: "review-label", text: "Uwaga: " }), document.createTextNode(card.note)]));
    const chips = examChips(card);
    if (chips) nodes.push(chips);
    return nodes;
  }

  // =====================================================================
  // MAIN SCREEN
  // =====================================================================

  function head(title, lead) {
    return LM.ui.pageHead({ eyebrow: (title === "My words" ? "Your progress · My words" : "Learning · Flashcards and mistakes"), title: title, lead: lead });
  }

  function noProfile(view) {
    view.appendChild(LM.review.header("decks", "Learn words, collocations and verbs with active recall."));
    view.appendChild(el("div", { class: "empty-state" }, [
      el("p", { class: "empty-state-text", text: "Flashcards save your progress in a profile." }),
      el("p", { class: "empty-state-hint", text: "Add or choose a profile in the top right corner to start." })
    ]));
  }

  /** The “Decks” tab: list of built-in and your own decks, import, new deck, settings. */
  function renderHome(view) {
    view.appendChild(LM.review.header("decks", "First try to remember, then check. Cards you find harder come back more often."));
    const decks = allDecks();
    const on = enabled();
    if (!on.length || !decks.some(function (d) { return on.indexOf(d.id) !== -1 && d.count; })) {
      view.appendChild(el("section", { class: "empty-state fc-empty" }, [
        el("p", { class: "empty-state-text", text: "How do flashcards work?" }),
        el("p", { class: "empty-state-hint", text: "You see the front of the card and try to remember the answer before you show it. Then you rate how it went. The better you know a card, the less often it comes back – and hard cards come up more often." }),
        el("button", { type: "button", class: "btn btn-primary", onclick: function () { toggleDeck(index()[0].id, true); render(); } }, "Turn on the first deck")
      ]));
    }

    view.appendChild(el("h2", { class: "section-title", text: "Decks" }));
    view.appendChild(el("div", { class: "fc-actions" }, [
      el("a", { class: "btn btn-secondary", href: HASH + "/import" }, LM.ui.withIcon("upload", "Import cards")),
      el("button", { type: "button", class: "btn btn-secondary", onclick: createDeck }, LM.ui.withIcon("plus", "New deck"))
    ]));
    view.appendChild(el("ul", { class: "fc-deck-list" }, decks.filter(function (d) { return d.builtIn; }).map(deckCard)));
    const own = decks.filter(function (d) { return !d.builtIn; });
    view.appendChild(el("h2", { class: "section-title", text: "My decks" }));
    if (!own.length) view.appendChild(el("p", { class: "tool-note", text: "You have no decks of your own yet. Create a deck – mistakes from the log go into the “My mistakes” deck automatically." }));
    else view.appendChild(el("ul", { class: "fc-deck-list" }, own.map(deckCard)));

    view.appendChild(settingsSection());
  }

  function renderThemes(view, level) {
    view.appendChild(LM.ui.breadcrumbs([{ label: "Flashcards and mistakes", href: HOME }, { label: "Decks", href: HASH }, { label: "Themes" }]));
    view.appendChild(head("Theme flashcards", "Words and phrases on everyday themes, from A1 to B1. Each deck is turned on separately."));
    const levels = ["", "A1", "A2", "B1"];
    view.appendChild(el("div", { class: "chip-filter", role: "group", "aria-label": "Level" }, levels.map(function (l) {
      const active = l === level;
      return el("a", { class: "chip-btn" + (active ? " is-active" : ""), href: HASH + "/themes" + (l ? "/" + l.toLowerCase() : ""), "aria-current": active ? "true" : null }, [active ? LM.icon("check", { size: 16 }) : null, l || "All"]);
    })));
    const themes = allDecks().filter(function (d) { return /^temat-/.test(d.id); }).filter(function (d) {
      return !level || cardsOf(d.id).some(function (c) { return c.level === level; });
    });
    if (!themes.length) { view.appendChild(el("p", { class: "tool-note", text: "No theme decks at this level." })); return; }
    view.appendChild(el("ul", { class: "fc-deck-list" }, themes.map(deckCard)));
  }

  function bar(stats) {
    const total = Math.max(1, stats.total);
    const seg = function (n, cls) { return n ? el("span", { class: "fc-bar-seg " + cls, style: "width:" + (100 * n / total) + "%" }) : null; };
    return el("div", { class: "fc-bar-wrap" }, [
      el("div", { class: "fc-bar", "aria-hidden": "true" }, [seg(stats.mastered, "is-mastered"), seg(stats.review + stats.learning, "is-learning"), seg(stats.new, "is-new")]),
      el("p", { class: "fc-bar-legend" }, [
        el("span", { class: "fc-legend is-new", text: "New: " + stats.new }),
        el("span", { class: "fc-legend is-learning", text: "Learning: " + (stats.learning + stats.review) }),
        el("span", { class: "fc-legend is-due", text: "Due today: " + stats.due }),
        el("span", { class: "fc-legend is-later", text: "Later: " + stats.later }),
        el("span", { class: "fc-legend is-mastered", text: "Mastered: " + stats.mastered }),
        stats.suspended ? el("span", { class: "fc-legend", text: "Suspended: " + stats.suspended }) : null
      ])
    ]);
  }

  function deckCard(d) {
    const on = enabled().indexOf(d.id) !== -1;
    const stats = L().deckStats(cardsOf(d.id), st().cards, now());
    const sw = el("button", {
      type: "button", class: "fc-switch", role: "switch", "aria-checked": on ? "true" : "false",
      "aria-label": "Included in learning: " + d.title,
      onclick: function () { toggleDeck(d.id, !on); render(); const again = document.querySelector('.fc-switch[aria-label="Included in learning: ' + d.title.replace(/"/g, '\\"') + '"]'); if (again) again.focus(); }
    }, [el("span", { class: "fc-switch-track", "aria-hidden": "true" }, el("span", { class: "fc-switch-thumb" })), el("span", { class: "fc-switch-text", text: on ? "On" : "Off" })]);
    const actions = [el("a", { class: "btn btn-secondary btn-small", href: d.system === "words" ? "#/review/words" : HASH + "/deck/" + d.id }, "Browse")];
    if (!d.builtIn) actions.push(el("a", { class: "btn btn-secondary btn-small", href: HASH + "/deck/" + d.id + "/new" }, LM.ui.withIcon("plus", "Add card")));
    actions.push(el("button", { type: "button", class: "btn btn-secondary btn-small", onclick: function () { exportDeck(d); } }, LM.ui.withIcon("download", "Export")));
    return el("li", { class: "card fc-deck" + (on ? " is-on" : "") }, [
      el("div", { class: "fc-deck-head" }, [
        el("h3", { class: "fc-deck-title", text: d.title }),
        d.level ? el("span", { class: "c1-chip", text: d.level }) : null,
        el("span", { class: "c1-chip", text: LM.plural(d.count, "card", "cards") })
      ]),
      el("p", { class: "fc-deck-desc", text: d.description }),
      bar(stats),
      el("div", { class: "fc-deck-foot" }, [sw, el("div", { class: "fc-deck-actions" }, actions)])
    ]);
  }

  function toggleDeck(id, on) {
    const list = st().settings.enabledDecks;
    const i = list.indexOf(id);
    if (on && i === -1) list.push(id);
    if (!on && i !== -1) list.splice(i, 1);
    saveState();
  }

  function createDeck() {
    if (!hasProfile()) return;
    LM.dialogs.prompt({ title: "New deck", label: "Deck name", confirmLabel: "Create deck" }).then(function (name) {
      if (!name) return;
      const d = { id: "u-" + U.uid("deck").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40), title: name.trim().slice(0, 80), createdAt: new Date().toISOString() };
      st().userDecks.push(d);
      st().settings.enabledDecks.push(d.id);
      saveState();
      location.hash = HASH + "/deck/" + d.id;
    });
  }

  function exportDeck(d) {
    const cards = cardsOf(d.id);
    downloadText(LM.APP.exportName + "-deck-" + d.id + ".tsv", L().exportTsv(cards), "text/tab-separated-values;charset=utf-8");
    LM.ui.toast({ text: "Exported " + LM.plural(cards.length, "card", "cards") + " (TSV for Anki).", icon: "download" });
  }

  function settingsSection() {
    const s = st().settings;
    const num = function (id, label, key, max, hint) {
      const input = el("input", { type: "number", class: "field fc-num", id: id, min: "0", max: String(max), value: String(s[key]),
        onchange: function () { const v = Math.max(0, Math.min(max, Math.floor(Number(input.value) || 0))); input.value = String(v); s[key] = v; saveState(); } });
      return el("div", { class: "form-field" }, [el("label", { class: "field-label", for: id, text: label }), input, hint ? el("p", { class: "tool-note", text: hint }) : null]);
    };
    const check = function (id, label, key, hint) {
      const input = el("input", { type: "checkbox", id: id, checked: !!s[key], onchange: function () { s[key] = input.checked; saveState(); } });
      return el("div", { class: "fc-check" }, [input, el("label", { for: id, text: label }), hint ? el("p", { class: "tool-note", text: hint }) : null]);
    };
    return el("details", { class: "card fc-settings" }, [
      el("summary", { class: "fc-settings-title", text: "Flashcard settings" }),
      el("div", { class: "fc-settings-grid" }, [
        num("fc-new", "New cards per day", "newPerDay", 100, "Default: 10."),
        num("fc-rev", "Reviews per day (limit)", "reviewsPerDay", 999, "Default: 100.")
      ]),
      check("fc-type", "Type the answer first (cloze and basic cards)", "typeAnswerFirst", "“Type” cards always need a typed answer."),
      check("fc-fuzz", "Spread the due dates (±5%) so cards from one day do not come back together", "fuzz")
    ]);
  }

  // =====================================================================
  // LEARNING SESSION
  // =====================================================================

  let session = null;
  let extraNewToday = { day: null, used: false }; // “Add 5 more new cards” — once a day

  /** Cards of the turned-on decks (for “Add 5 more new cards”). */
  function sessionCards() {
    const on = enabled();
    let out = [];
    allDecks().forEach(function (d) { if (on.indexOf(d.id) !== -1) out = out.concat(cardsOf(d.id)); });
    return out;
  }

  /** Filter from the address: #/review/session?only=mistakes | weak | decks | deck:<id> [&max=10] [&outside=1]. */
  function sessionFilter() {
    const m = /[?&]only=([^&]+)/.exec(location.hash || "");
    const v = m ? decodeURIComponent(m[1]) : "";
    const mx = /[?&]max=(\d{1,3})/.exec(location.hash || "");
    const max = mx ? Number(mx[1]) : 0; // “Short session (10)”
    const offPlan = /[?&]outside=1(&|$)/.test(location.hash || ""); // “Learn now”: a deck outside the day's plan
    if (v === "mistakes") return { kind: "mistake", label: "My mistakes", max: max };
    if (v === "weak") return { kind: "exercise", label: "Weak spots", max: max };
    if (v === "decks") return { kind: "card", label: "Flashcards from decks", max: max };
    const d = /^deck:([a-z0-9-]+)$/.exec(v);
    if (d) { const deck = deckById(d[1]); return { kind: "all", deck: d[1], label: deck ? deck.title : "Deck", max: max, offPlan: offPlan }; }
    return { kind: "all", label: max ? "Short session" : "", max: max };
  }

  /** The session queue from js/review-queue.js (interleaved, with the day limits), narrowed by the filter. */
  function sessionQueue(filter, extraNew) {
    const ctx = LM.reviewQueue.ctx();
    ctx.extraNew = extraNew || 0;
    if (filter.deck) {
      // “Learn now” (offPlan): no daily limits for new cards and reviews, also for a deck that is not included in learning.
      const lim = filter.offPlan ? { newPerDay: 99999, reviewsPerDay: 99999 } : {};
      ctx.state = Object.assign({}, ctx.state, { settings: Object.assign({}, ctx.state.settings, lim, { enabledDecks: [filter.deck] }) });
      ctx.weak = [];
    }
    const q = LM.reviewQueue.queueFrom(ctx, now()).filter(function (it) {
      if (filter.deck) return it.kind !== "exercise" && deckOfId(it.id) === filter.deck;
      return filter.kind === "all" || it.kind === filter.kind;
    });
    return filter.max ? q.slice(0, filter.max) : q;
  }

  function kindOfId(id) { return LM.reviewQueue.kindOf(id, /^ex:/.test(id) ? null : deckOfId(id)); }

  function startSession(extraNew) {
    const t = now();
    const filter = sessionFilter();
    const q = sessionQueue(filter, extraNew);
    const learning = [], queue = [], exTopic = {};
    q.forEach(function (it) {
      const x = st().cards[it.id];
      if (x && (x.state === "learning" || x.state === "relearning")) learning.push(it.id); else queue.push(it.id);
      if (it.kind === "exercise") exTopic[it.id] = it.topic;
    });
    session = {
      filter: filter, queue: queue, pool: learning, exTopic: exTopic, total: q.length,
      done: 0, current: null, revealed: false, typed: null, undo: [], startedAt: t,
      grades: { again: 0, hard: 0, good: 0, easy: 0 }, againById: {}, kinds: { card: 0, mistake: 0, exercise: 0 }, finished: false, root: null, taskFallback: {},
      profileId: app().getActiveProfile().id
    };
    advance();
  }

  function advance() {
    const pick = L().pickNext(session.pool, session.queue, st().cards, now());
    session.revealed = false;
    session.typed = null;
    if (!pick) { session.current = null; finishSession(); return; }
    session.current = pick.id;
    if (pick.from === "queue") session.queue.shift();
  }

  function finishSession() {
    if (session.finished) return;
    session.finished = true;
    const minutes = Math.round((now() - session.startedAt) / 60000);
    if (session.done) {
      const d = st().daily[today()] = st().daily[today()] || { new: 0, reviews: 0, again: 0, good: 0, answers: 0, minutes: 0 };
      d.minutes = Math.min(1440, (d.minutes || 0) + minutes);
      saveState();
    }
    // A finished session (≥ 5 items) = a learning day in the existing streak mechanism
    if (session.done >= 5 && LM.markActivity) LM.markActivity();
  }

  function cardIsTyped(card) {
    return card.type === "typed" || (st().settings.typeAnswerFirst && (card.type === "cloze" || card.type === "basic"));
  }

  /** “in 10 min”, “in 3 hours”, “in 8 days”, “in 1.3 months” — time until the card's next review. */
  function whenText(ms) {
    const min = Math.round(ms / 60000);
    if (min < 60) return "in " + Math.max(1, min) + " min";
    if (ms < H().DAY) { const h = Math.round(ms / 3600000); return "in " + LM.plural(h, "hour", "hours"); }
    const days = Math.round(ms / H().DAY);
    if (days < 31) return "in " + LM.plural(days, "day", "days");
    if (days < 365) return "in " + LM.fmt.number(days / 30.4, 1) + " months";
    return "in " + LM.fmt.number(days / 365, 1) + " years";
  }

  /** Grading an item (flashcard, “My mistakes”, exercise item): one schedule(), day counters, state in the session. */
  function applyGrade(id, g) {
    const t = now();
    const prev = st().cards[id];
    const base = prev && prev.state !== "new" ? prev : Object.assign(H().newCard(), prev && prev.suspended ? { suspended: true } : {});
    const dayKey = today();
    session.undo.push({ id: id, prev: clone(prev), daily: clone(st().daily[dayKey]), queue: session.queue.slice(), pool: session.pool.slice(),
      done: session.done, grades: clone(session.grades), againById: clone(session.againById), kinds: clone(session.kinds) });
    if (session.undo.length > 20) session.undo.shift();
    const next = H().schedule(base, g, t, null, { fuzz: st().settings.fuzz, random: Math.random });
    if (prev && prev.again) next.again = prev.again;
    if (g === "again") next.again = (next.again || 0) + 1;
    st().cards[id] = next;
    session.lastNote = "Next review: " + whenText(next.due - t); // shown above the next card (aria-live)
    const d = st().daily[dayKey] = st().daily[dayKey] || { new: 0, reviews: 0, again: 0, good: 0, answers: 0, minutes: 0 };
    if (!prev || prev.state === "new") { d.new++; if (/^ex:/.test(id)) d.exNew = (d.exNew || 0) + 1; }
    else if (prev.state === "review") d.reviews++;
    if (g === "again") d.again++;
    if (g === "good" || g === "easy") d.good++;
    d.answers = (d.answers || 0) + 1;
    saveState();
    session.grades[g]++;
    session.kinds[kindOfId(id)]++;
    if (g === "again") session.againById[id] = (session.againById[id] || 0) + 1;
    session.done++;
    const i = session.pool.indexOf(id);
    // An exercise item rated “Again” does not come back in the same session (you saw the explanation); it comes back next time when due
    if ((next.state === "learning" || next.state === "relearning") && !/^ex:/.test(id)) { if (i === -1) session.pool.push(id); }
    else if (i !== -1) session.pool.splice(i, 1);
  }

  function grade(g) {
    if (!session || !session.current || !session.revealed || /^ex:/.test(session.current)) return;
    applyGrade(session.current, g);
    advance();
    paintSession();
  }

  /** An exercise item from the engine is finished: correct = Good, wrong = Again; a skipped dictation (no voice) does not count. */
  function finishExercise(id, res) {
    if (!session || session.current !== id) return;
    if (res && res.skipped) { session.total = Math.max(session.done, session.total - 1); }
    else applyGrade(id, res && res.correct ? "good" : "again");
    advance();
    render();
  }

  function undoLast() {
    if (!session || !session.undo.length) return;
    session.lastNote = null;
    const u = session.undo.pop();
    if (u.prev === undefined) delete st().cards[u.id]; else st().cards[u.id] = u.prev;
    const dayKey = today();
    if (u.daily === undefined) delete st().daily[dayKey]; else st().daily[dayKey] = u.daily;
    saveState(true); // undoing on purpose lowers the number of reviews: no merging with the saved record
    session.queue = u.queue; session.pool = u.pool; session.done = u.done; session.grades = u.grades; session.againById = u.againById; session.kinds = u.kinds;
    session.finished = false;
    session.current = u.id; session.revealed = !/^ex:/.test(u.id); session.typed = null;
    paintSession();
    announce("Last rating undone.");
  }

  /** Suspend (W) or put off until tomorrow (B) the current card. */
  function setAside(kind) {
    if (!session || !session.current) return;
    const id = session.current;
    const prev = st().cards[id];
    session.undo.push({ id: id, prev: clone(prev), daily: clone(st().daily[today()]), queue: session.queue.slice(), pool: session.pool.slice(),
      done: session.done, grades: clone(session.grades), againById: clone(session.againById) });
    const x = Object.assign(H().newCard(), prev || {});
    if (kind === "suspend") x.suspended = true; else x.buriedUntil = L().dayEnd(now());
    st().cards[id] = x;
    saveState();
    const i = session.pool.indexOf(id);
    if (i !== -1) session.pool.splice(i, 1);
    session.total = Math.max(session.done, session.total - 1);
    advance();
    paintSession();
    announce(kind === "suspend" ? "Card suspended. You can restore it when you browse the deck." : "Card put off until tomorrow.");
  }

  let liveNode = null;
  function announce(text) { if (liveNode) liveNode.textContent = text; }

  function renderSession(view) {
    if (!session || session.stale) startSession(0);
    session.root = el("div", { class: "fc-session" });
    view.appendChild(session.root);
    paintSession();
  }

  /** One progress bar for the whole session (also above an item in the engine's view). */
  function progressBlock() {
    const remainingLearn = session.pool.length;
    const total = Math.max(session.total, session.done + 1);
    const pct = session.total ? Math.min(100, 100 * session.done / total) : 0;
    return el("div", { class: "fc-progress" }, [
      el("p", { class: "fc-progress-text", text: (session.done + 1) + " of " + total + (remainingLearn ? " · learning: " + remainingLearn : "") + (session.filter && session.filter.label ? " · " + session.filter.label : "") }),
      el("div", { class: "fc-progress-bar", role: "progressbar", "aria-label": "Session progress", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(session.done) },
        el("span", { class: "fc-progress-fill", style: "width:" + pct + "%" }))
    ]);
  }

  /** An “item” entry: we load it from the bank and hand it to the exercise engine (view with the explanation); the result comes back to finishExercise. */
  function paintExercise(root) {
    const id = session.current;
    root.appendChild(el("div", { class: "fc-session-top" }, [
      el("a", { class: "c1-back fc-back", href: HOME }, LM.ui.withIcon("chevron-left", "Flashcards and mistakes")),
      progressBlock()
    ]));
    root.appendChild(el("p", { class: "tool-note", role: "status", text: "Loading the item…" }));
    const topic = session.exTopic[id];
    LM.exercises.loadTopicItems(topic ? [topic] : []).then(function (pool) {
      if (!session || session.current !== id) return;
      const item = pool.find(function (it) { return it.id === id.slice(3); });
      if (!item) { finishExercise(id, { skipped: true }); return; } // the item is no longer in the bank: no rating
      LM.exercises.startSingle({
        item: item, back: { href: HOME, label: "Flashcards and mistakes" },
        progress: progressBlock,
        onDone: function (res) { finishExercise(id, res); }
      });
    }, function () { finishExercise(id, { skipped: true }); });
  }

  /** The log entry a “My mistakes” card was made from (by sourceItemId or the card id). */
  function journalEntryOf(card) {
    if (!LM.profileData) return null;
    return LM.profileData.entries().find(function (e) { return L().journalSource(e) === card.sourceItemId || L().journalCardId(e) === card.id; }) || null;
  }

  /** A "mistake" item with a ref: the original exercise item, scored automatically like any item. */
  function paintMistakeTask(root, card, entry) {
    const id = card.id;
    root.appendChild(el("div", { class: "fc-session-top" }, [
      el("a", { class: "c1-back fc-back", href: HOME }, LM.ui.withIcon("chevron-left", "Flashcards and mistakes")),
      progressBlock()
    ]));
    root.appendChild(el("p", { class: "tool-note", role: "status", text: "Loading the item…" }));
    LM.mistakeTask.load(entry).then(function (desc) {
      if (!session || session.current !== id) return;
      if (!desc) { session.taskFallback[id] = true; paintSession(); return; } // the item is gone (a deleted set): a card with the full context
      const done = function (res) { finishExercise(id, res); };
      LM.exercises.startSingle({ item: desc.item, back: { href: HOME, label: "Flashcards and mistakes" }, progress: progressBlock, noJournal: true, onDone: done });
    }, function () { session.taskFallback[id] = true; paintSession(); });
  }

  function paintSession() {
    const root = session && session.root;
    if (!root) return;
    root.replaceChildren();
    liveNode = el("p", { class: "visually-hidden", "aria-live": "polite" });
    if (!session.current) { root.appendChild(summaryView()); root.appendChild(liveNode); return; }
    if (/^ex:/.test(session.current)) { paintExercise(root); return; }
    const card = cardById(session.current);
    if (!card) { advance(); paintSession(); return; }
    // A log mistake with a ref to an item: the original item with its hint (js/mistake-task.js); without a ref or without the item — a card
    if (card.deck === MISTAKES_ID && !session.taskFallback[card.id]) {
      const entry = journalEntryOf(card);
      if (entry && LM.mistakeTask && LM.mistakeTask.viewFor(entry) === "task") { paintMistakeTask(root, card, entry); return; }
    }
    const deck = deckById(card.deck);
    root.appendChild(el("div", { class: "fc-session-top" }, [
      el("a", { class: "c1-back fc-back", href: HOME }, LM.ui.withIcon("chevron-left", "Flashcards and mistakes")),
      progressBlock(),
      el("button", { type: "button", class: "btn btn-secondary btn-small", onclick: function () { session.current = null; finishSession(); paintSession(); } }, "End session")
    ]));

    const typedMode = cardIsTyped(card);
    const cardNode = el("section", { class: "card fc-card" + (session.revealed ? " is-revealed" : ""), "aria-label": "Flashcard" + (deck ? " from the deck " + deck.title : "") }, [
      el("p", { class: "fc-card-meta" }, [deck ? el("span", { text: deck.title }) : null, el("span", { class: "fc-type", text: { basic: "Basic", cloze: "Cloze", typed: "Type" }[card.type] })]),
      el("div", { class: "fc-front" }, renderFront(card)),
      LM.ui.listenButton(cardSpeech(card, session.revealed), "Listen to the card (S)")
    ]);
    if (session.lastNote) root.appendChild(el("p", { class: "fc-last-note", role: "status" }, [LM.icon("check", { size: 16 }), " " + session.lastNote]));
    root.appendChild(cardNode);

    // Typing mode: a field, Enter checks
    let input = null;
    if (typedMode) {
      input = el("input", { type: "text", class: "field fc-input", id: "fc-input", autocomplete: "off", autocapitalize: "off", spellcheck: "false",
        lang: LM.APP.targetLang, "data-charbar": "", "aria-label": "Your answer", value: session.typed ? session.typed.input : "", disabled: session.revealed });
      if (session.typed) input.classList.add(session.typed.result.result === "exact" ? "is-ok" : TYPED_NEAR[session.typed.result.result] ? "is-close" : "is-bad");
      cardNode.appendChild(el("div", { class: "fc-type-row" }, [
        el("label", { class: "field-label", for: "fc-input", text: "Type the answer and press Enter" }),
        input,
        session.revealed || !LM.charbar ? null : LM.charbar.bar()
      ]));
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); checkTyped(card, input.value); }
      });
    }
    const result = el("p", { class: "fc-result", "aria-live": "polite" });
    if (session.typed) {
      const r = session.typed.result;
      result.className = "fc-result is-" + r.result;
      const lead = r.lenient ? "Correct – accepted without accents. Check the " + LM.APP.language + " letters: "
        : r.result === "exact" ? "Correct!" : r.result === "empty" ? "No answer." : TYPED_NEAR[r.result] || "Not correct. Correct: ";
      result.replaceChildren.apply(result, [
        LM.icon(r.result === "exact" ? "check" : TYPED_NEAR[r.result] ? "triangle-alert" : "x", { size: 18 }),
        document.createTextNode(" " + lead),
        r.result === "exact" && !r.lenient || r.result === "empty" ? null : el("strong", { lang: LM.APP.targetLang, text: r.expected })
      ].filter(Boolean));
    }
    cardNode.appendChild(result);

    if (session.revealed) {
      cardNode.appendChild(el("div", { class: "fc-backside" + (LM.reducedMotion && LM.reducedMotion() ? "" : " is-anim") }, renderBack(card)));
      // E12: a quiet "Report a mistake" on the back of content cards (own cards are the learner's text)
      if (!/^u-/.test(card.id)) { const rep = LM.ui.reportLink(card.topic || (deck && (deck.topic || deck.id)) || card.deck); if (rep) cardNode.appendChild(rep); }
      const pv = H().preview(st().cards[card.id] && st().cards[card.id].state !== "new" ? st().cards[card.id] : H().newCard(), now());
      const suggested = session.typed ? session.typed.result.suggested : null;
      root.appendChild(el("div", { class: "fc-grades", role: "group", "aria-label": "Rate how it went" }, GRADE_INFO.map(function (g) {
        const when = H().formatDelay(pv[g.id].delay);
        const isSug = suggested === g.id;
        return el("button", {
          type: "button", class: "btn fc-grade is-" + g.id + (isSug ? " is-suggested" : ""), "data-grade": g.id,
          "aria-label": g.label + " – next review " + when + (isSug ? " (suggested rating)" : ""),
          onclick: function () { grade(g.id); }
        }, [el("span", { class: "fc-grade-label", text: g.label }), el("span", { class: "fc-grade-when", text: when }),
          el("span", { class: "fc-grade-key", "aria-hidden": "true", text: g.key }), isSug ? el("span", { class: "fc-grade-sug", "aria-hidden": "true", text: "suggested" }) : null]);
      })));
    } else if (!typedMode) {
      root.appendChild(el("div", { class: "fc-reveal-row" }, el("button", { type: "button", class: "btn btn-primary btn-large fc-reveal", onclick: reveal }, "Show answer")));
    } else {
      root.appendChild(el("div", { class: "fc-reveal-row" }, [
        el("button", { type: "button", class: "btn btn-primary btn-large", onclick: function () { checkTyped(card, input.value); } }, "Check"),
        el("button", { type: "button", class: "btn btn-link", onclick: function () { checkTyped(card, ""); } }, "I don't know – show")
      ]));
    }

    const own = /^u-/.test(card.id);
    root.appendChild(el("div", { class: "fc-tools" }, [
      el("button", { type: "button", class: "btn btn-link btn-small", disabled: !session.undo.length, onclick: undoLast }, LM.ui.withIcon("undo-2", "Undo (Z)")),
      own ? el("a", { class: "btn btn-link btn-small", href: HASH + "/deck/" + card.deck + "/card/" + card.id }, LM.ui.withIcon("pencil", "Edit (E)")) : null,
      el("button", { type: "button", class: "btn btn-link btn-small", onclick: function () { setAside("suspend"); } }, LM.ui.withIcon("pause", "Suspend (W)")),
      el("button", { type: "button", class: "btn btn-link btn-small", onclick: function () { setAside("bury"); } }, LM.ui.withIcon("clock", "Put off until tomorrow (B)"))
    ]));
    root.appendChild(el("p", { class: "tool-note fc-keys", text: "Shortcuts: Space – show / Good, 1–4 – ratings, S – listen, Z – undo, W – suspend, B – put off" + (own ? ", E – edit" : "") + ", ? – list." }));
    root.appendChild(liveNode);

    // Optional auto-play of the Polish side (spec 06 E5, off by default): once per new text of the card
    const said = cardSpeech(card, session.revealed);
    if (said && session.autoplayed !== card.id + "|" + said && hasProfile() && LM.profileData.prefs().autoplayCards && LM.speech.available()) {
      session.autoplayed = card.id + "|" + said;
      LM.speech.stop();
      LM.speech.speak(said);
    }

    // Focus: the typing field or the main button
    setTimeout(function () {
      const target = !session.revealed && input ? input : root.querySelector(session.revealed ? ".fc-grade.is-suggested, .fc-grade.is-good" : ".fc-reveal");
      if (target) target.focus({ preventScroll: true });
    }, 0);
  }

  /** The card's sentence for listening (S): a cloze gap as a pause, after showing the answer; text not in the target language is not read. */
  function cardSpeech(card, revealed) {
    const c = card.type === "cloze" ? L().parseCloze(card.text) : null;
    if (c && c.ok) return (c.before + (revealed ? c.answers[0] : " … ") + c.after).replace(/\s+/g, " ").trim();
    const front = String(card.front || ""), back = String(card.back || "");
    if (front && L().isTarget(front)) return front;
    return revealed && back && L().isTarget(back) ? back : "";
  }

  function reveal() {
    if (!session || session.revealed) return;
    session.revealed = true;
    paintSession();
  }

  function checkTyped(card, value) {
    if (!session || session.revealed) return;
    const prefs = hasProfile() && LM.profileData ? LM.profileData.prefs() : {};
    session.typed = { input: value, result: L().checkAnswer(value, L().answersOf(card), { lenientAccents: !!prefs.lenientAccents }) };
    session.revealed = true;
    paintSession();
  }

  /** How many items (flashcards, mistakes, items) fall due tomorrow. */
  function dueTomorrow() {
    const end = L().dayEnd(now()), on = enabled();
    let n = 0;
    Object.keys(st().cards).forEach(function (id) {
      const x = st().cards[id];
      if (x.suspended || x.state === "new" || x.due < end || x.due >= end + H().DAY) return;
      if (/^ex:/.test(id)) { n++; return; }
      const deck = deckOfId(id);
      if (deck && (on.indexOf(deck) !== -1 || deck === MISTAKES_ID)) n++;
    });
    return n;
  }

  function summaryView() {
    const box = el("section", { class: "card fc-summary", "aria-labelledby": "fc-sum-title" });
    const total = session.done;
    if (!total) {
      const next = nextDue(now());
      box.appendChild(el("h2", { class: "section-title", id: "fc-sum-title", text: "All done for today" }));
      box.appendChild(LM.ui.emptyState({ art: "brak-powtorek", title: next ? "Next review: " + fmtWhen(next) + "." : "You have nothing to review. Turn on a deck, add a mistake to the log or do a few exercises." }));
      box.appendChild(summaryActions());
      return box;
    }
    const goodPct = Math.round(100 * (session.grades.good + session.grades.easy) / total);
    const minutes = Math.max(1, Math.round((now() - session.startedAt) / 60000));
    const hardest = Object.keys(session.againById).sort(function (a, b) { return session.againById[b] - session.againById[a]; }).slice(0, 5);
    const k = session.kinds;
    box.appendChild(el("h2", { class: "section-title", id: "fc-sum-title", text: "Session summary" }));
    box.appendChild(el("ul", { class: "fc-sum-stats" }, [
      el("li", null, [el("strong", { class: "num", text: String(total) }), " " + LM.pluralWord(total, "item", "items")]),
      el("li", null, [el("strong", { class: "num", text: goodPct + "%" }), " Good or Easy"]),
      el("li", null, [el("strong", { class: "num", text: minutes + " min" }), " spent"]),
      el("li", null, [el("strong", { class: "num", text: String(dueTomorrow()) }), " due tomorrow"])
    ]));
    box.appendChild(el("p", { class: "tool-note fc-sum-kinds", text: "Flashcards: " + k.card + " · My mistakes: " + k.mistake + " · Items: " + k.exercise }));
    if (hardest.length) {
      box.appendChild(el("h3", { class: "c1-check-title", text: "Hardest items" }));
      box.appendChild(el("ul", { class: "fc-hardest" }, hardest.map(function (id) {
        const c = /^ex:/.test(id) ? null : cardById(id);
        return el("li", null, [document.createTextNode(c ? L().frontText(c) : "A weak-spot item"), el("span", { class: "tool-note", text: " · Again: " + session.againById[id] + "×" })]);
      })));
    }
    if (total >= 5) box.appendChild(el("p", { class: "tool-note", text: "This session counts for your streak." }));
    box.appendChild(summaryActions());
    return box;
  }

  function summaryActions() {
    const day = today();
    if (extraNewToday.day !== day) extraNewToday = { day: day, used: false };
    const cards = sessionCards();
    const unseen = cards.filter(function (c) { const x = st().cards[c.id]; return (!x || x.state === "new") && !L().isHidden(x, now()); }).length;
    return el("div", { class: "fc-actions" }, [
      !extraNewToday.used && unseen ? el("button", { type: "button", class: "btn btn-primary", onclick: function () {
        extraNewToday.used = true;
        startSession(5);
        paintSession();
      } }, LM.ui.withIcon("plus", "Add 5 more new cards")) : null,
      el("a", { class: "btn btn-secondary", href: HOME }, "Back to Flashcards and mistakes")
    ]);
  }

  /** Session shortcuts: they do not work in text fields (except Enter, which the field handles). */
  function onKey(e) {
    if (session && session.current && /^ex:/.test(session.current)) return; // an item: the exercise engine has the shortcuts
    if (document.querySelector(".mt-task, .ex-view .ex-card")) return;       // a mistake with a ref: an item with its own shortcuts
    if (!session || !session.root || !document.contains(session.root) || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (document.querySelector(".dialog-backdrop, dialog[open]")) return;
    const k = e.key.toLowerCase();
    if (!session.current) return;
    if (k === " " || k === "spacebar") {
      if (t && (t.tagName === "BUTTON" || t.tagName === "A") && !session.revealed && !t.classList.contains("fc-reveal")) return;
      e.preventDefault();
      if (!session.revealed) { if (!cardIsTyped(cardById(session.current) || {})) reveal(); }
      else grade("good");
    } else if (k === "enter" && !session.revealed && !(t && (t.tagName === "BUTTON" || t.tagName === "A"))) {
      if (!cardIsTyped(cardById(session.current) || {})) { e.preventDefault(); reveal(); }
    } else if (["1", "2", "3", "4"].indexOf(k) !== -1 && session.revealed) {
      e.preventDefault(); grade(GRADE_INFO[Number(k) - 1].id);
    } else if (k === "z") { e.preventDefault(); undoLast(); }
    else if (k === "s") { // listen to the card's sentence (the gap is a pause until the answer is shown)
      e.preventDefault();
      const text = cardSpeech(cardById(session.current) || {}, session.revealed);
      if (text && LM.shortcuts) LM.shortcuts.speak(text);
      else if (!text) LM.ui.toast({ text: "This card has no " + LM.APP.language + " sentence to listen to.", icon: "volume-x" });
    }
    else if (k === "w") { e.preventDefault(); setAside("suspend"); }
    else if (k === "b") { e.preventDefault(); setAside("bury"); }
    else if (k === "e" && /^u-/.test(session.current)) {
      e.preventDefault();
      const c = cardById(session.current);
      location.hash = HASH + "/deck/" + c.deck + "/card/" + c.id;
    }
  }
  document.addEventListener("keydown", onKey);

  // =====================================================================
  // ROUTES AND DRAWING
  // =====================================================================

  function parseRoute(hash) {
    // #/review/decks[/import | /themes[/<level>] | /deck/<id>[/new | /card/<id>]], #/review/session[?…], #/review/words
    const m = /^#\/review\/(decks|session|words)(?:\/([^?]*))?(?:\?.*)?$/.exec(hash || "");
    if (!m) return null;
    if (m[1] === "session") return { kind: "session" };
    if (m[1] === "words") return { kind: "words" };
    const p = (m[2] || "").replace(/\/+$/, "").split("/").filter(Boolean).map(decodeURIComponent);
    if (!p.length) return { kind: "home" };
    if (p[0] === "import") return { kind: "import" };
    if (p[0] === "themes") return { kind: "themes", level: /^(a1|a2|b1)$/.test(p[1] || "") ? p[1].toUpperCase() : "" };
    if (p[0] === "deck" && p[1] === WORDS_ID && !p[2]) return { kind: "words" };
    if (p[0] === "deck" && p[1]) {
      if (p[2] === "new") return { kind: "edit", deck: p[1], card: null };
      if (p[2] === "card" && p[3]) return { kind: "edit", deck: p[1], card: p[3] };
      return { kind: "deck", deck: p[1] };
    }
    return null;
  }

  let lastRoute = null;

  function render() {
    const view = document.getElementById("view");
    const route = parseRoute(location.hash) || { kind: "home" };
    view.className = "view tool-view cards-view";
    view.dataset.file = route.kind === "session" ? SESSION : HASH;
    view.replaceChildren();
    document.title = "Flashcards and mistakes · " + LM.APP.appTitle;
    if (!hasProfile()) { session = null; noProfile(view); return; }
    // A new session on every visit from another page; redrawing the same session keeps the state
    if (route.kind === "session" && lastRoute !== location.hash && session) session.stale = true;
    // The session belongs to the profile — after a profile change we start again
    if (session && session.profileId !== app().getActiveProfile().id) session.stale = true;
    lastRoute = location.hash;
    if (!index().every(function (d) { return loaded(d.id); })) {
      view.appendChild(el("p", { class: "tool-note", role: "status", text: "Loading the decks…" }));
      loadDecks().then(function () { if (parseRoute(location.hash)) render(); });
      return;
    }
    if (route.kind === "session") renderSession(view);
    else if (route.kind === "themes") renderThemes(view, route.level);
    else if (route.kind === "words" && LM.words) { document.title = "My words · " + LM.APP.appTitle; LM.words.renderView(view); }
    else if (LM.cardsBrowse && route.kind !== "home") LM.cardsBrowse.render(view, route);
    else renderHome(view);
  }

  window.addEventListener("hashchange", function () { if (!parseRoute(location.hash)) lastRoute = null; });

  // =====================================================================
  // INTEGRATIONS (spec 10, 5.4–5.5)
  // =====================================================================

  function journalSource(e) { return L().journalSource(e); }

  /** Does the log entry have a card already (by card id or sourceItemId)? */
  function hasJournalCard(e) { return hasProfile() && L().hasJournalCard(st(), e); }

  function cardFromJournal(e) { return L().journalCard(e); }

  /** The log entry's card, if there is one. */
  function journalCardOf(e) {
    const sid = L().journalSource(e), id = L().journalCardId(e);
    return st().userCards.find(function (c) { return c.id === id || c.sourceItemId === sid; }) || null;
  }

  /** State of the entry's card for the “My mistakes” view: { state, due, interval, mastered } or null. */
  function mistakeInfo(e) {
    const c = hasProfile() ? journalCardOf(e) : null;
    const x = c ? st().cards[c.id] : null;
    if (!x || x.state === "new") return null;
    return { state: x.state, due: x.due, interval: x.interval, mastered: x.state === "review" && x.interval >= 21, suspended: !!x.suspended };
  }

  /**
   * Adds a log entry to the “My mistakes” deck with the state “first review tomorrow”. opts.silent — no message.
   * Every entry has a card (new entries at once). → { status, card }
   */
  function addFromJournal(e, opts) {
    opts = opts || {};
    if (!hasProfile()) return { status: "no-profile" };
    if (hasJournalCard(e)) {
      if (!opts.silent) LM.ui.toast({ text: "This mistake already has a card (the “My mistakes” deck).", icon: "layers" });
      return { status: "exists" };
    }
    const card = L().journalCard(e);
    if (!card) return { status: "error" };
    L().ensureMistakesDeck(st());
    const id = L().journalCardId(e);
    const added = Object.assign({ id: id, deck: MISTAKES_ID, createdAt: new Date().toISOString(), sourceItemId: L().journalSource(e) }, card);
    st().userCards.push(added);
    st().cards[id] = L().newJournalState(now());
    saveState();
    return { status: "added", card: added };
  }

  /** An entry deleted from the log: its card and its state go too. */
  function journalRemoved(e) {
    if (!hasProfile()) return;
    const c = journalCardOf(e);
    if (!c) return;
    delete st().cards[c.id];
    st().userCards = st().userCards.filter(function (x) { return x.id !== c.id; });
    saveState();
  }

  /** An entry changed in the log: the card content is refreshed, the state stays. */
  function journalUpdated(e) {
    if (!hasProfile()) return;
    const c = journalCardOf(e);
    if (!c) { addFromJournal(e, { silent: true }); return; }
    ["front", "back", "text", "note", "accepted", "type"].forEach(function (k) { delete c[k]; });
    Object.assign(c, L().journalCard(e));
    saveState();
  }

  /** Another mistake in an item that has an entry: the card comes back tomorrow (like the old stage 1), with the slip saved. */
  function journalWrong(e) {
    if (!hasProfile()) return;
    addFromJournal(e, { silent: true });
    const id = L().journalCardId(e);
    const c = journalCardOf(e);
    const cid = c ? c.id : id;
    const x = st().cards[cid];
    const back = L().newJournalState(now());
    st().cards[cid] = x && x.state !== "new" ? Object.assign({}, x, { state: "review", step: 0, interval: 1, due: back.due, lapses: (x.lapses || 0) + 1 }) : back;
    saveState();
  }

  /** A correct answer in an item with an entry: when the card is due today (or overdue), it counts as “Good”. → true when counted. */
  function journalCorrect(e) {
    if (!hasProfile()) return false;
    const c = journalCardOf(e);
    const x = c ? st().cards[c.id] : null;
    if (!x || x.state !== "review" || x.suspended || x.due >= L().dayEnd(now())) return false;
    st().cards[c.id] = H().schedule(x, "good", now(), null, { fuzz: st().settings.fuzz, random: Math.random });
    saveState();
    return true;
  }

  /** A mistake from an exercise went into the log: a card at once (always, no setting). */
  function autoAddFromJournal(e) {
    if (!e || !hasProfile()) return;
    addFromJournal(e, { silent: true });
  }

  // ---------- “Make a flashcard…” from a selection (selection menu and shortcuts: js/words.js) ----------

  /** The new card form with the selected text as the front (existing behaviour, unchanged). */
  function openFromSelection(text) {
    if (!hasProfile()) { app().withProfile("Flashcards are saved in your profile.", function () { openFromSelection(text); }); return; }
    LM.cardsBrowse.prefill({ type: "basic", front: text });
    const own = st().userDecks.filter(function (d) { return !d.system; });
    if (LM.words) LM.words.hideMenu();
    location.hash = HASH + "/deck/" + (own.length ? own[0].id : "new") + "/new";
  }

  // ---------- The “Flashcards for the exam” tile on exam pages (pack v6, spec 15, section 4) ----------

  /** Exam deck tile on an exam's overview: the decks listed in the exam's registry entry ("decks": [deck ids]). */
  function examTile(examId) {
    const exam = LM.exams ? LM.exams.byId(examId) : null;
    const ids = ((exam && exam.decks) || []).filter(function (id) { return index().some(function (d) { return d.id === id; }); });
    if (!ids.length) return null;
    const decks = ids.map(function (id) { return index().find(function (d) { return d.id === id; }); });
    const box = el("section", { class: "card fc-exam-tile", "aria-labelledby": "fc-exam-title-" + examId });
    function paint() {
      const profile = hasProfile();
      const on = profile ? enabled() : [];
      const allOn = profile && ids.every(function (id) { return on.indexOf(id) !== -1; });
      const parts = [
        el("h2", { class: "tile-title", id: "fc-exam-title-" + examId, text: "Flashcards for the exam" }),
        el("p", { class: "tool-note", text: "Phrases typical of this exam's tasks. Original sentences, not from past papers." })
      ];
      decks.forEach(function (d) {
        const ready = profile && loaded(d.id);
        const stats = ready ? L().deckStats(cardsOf(d.id), st().cards, now()) : null;
        parts.push(el("div", { class: "fc-exam-deck" }, [
          el("p", { class: "fc-exam-deck-title" }, [el("strong", { text: d.title }), " ", el("span", { class: "c1-chip", text: LM.plural(d.count, "card", "cards") })]),
          stats ? el("p", { class: "tool-note", text: "New: " + stats.new + " · Learning: " + (stats.learning + stats.review) + " · Mastered: " + stats.mastered }) : null
        ]));
      });
      if (!profile) parts.push(el("p", { class: "tool-note", text: "Add a profile to learn with flashcards." }));
      parts.push(el("div", { class: "fc-actions" }, [
        profile
          ? el("button", { type: "button", class: "btn btn-primary", onclick: function () { ids.forEach(function (id) { if (enabled().indexOf(id) === -1) toggleDeck(id, true); }); location.hash = HASH + "/session"; } },
            LM.ui.withIcon("play", allOn ? "Start learning" : "Turn on and start learning"))
          : null,
        el("a", { class: "btn btn-secondary", href: HASH + "/deck/" + ids[0] }, LM.ui.withIcon("layers", "Browse cards"))
      ]));
      box.replaceChildren.apply(box, parts.filter(Boolean));
    }
    paint();
    if (hasProfile()) loadDecks().then(paint);
    return box;
  }

  // ---------- The “Today” tile and the section in Stats ----------

  /** The “Flashcards and mistakes” tile on the Today dashboard (no profile — null): one count from js/review-queue.js. */
  function todayTile() {
    return hasProfile() ? LM.review.todayCard() : null;
  }

  /** The “Flashcards” section in Stats: reviews in 30 days, share correct (from 20 reviews), mastered, a 7-day forecast. */
  function statsTile() {
    if (!hasProfile()) return null;
    const s = st(), t = now(), dayMs = H().DAY;
    const days = [];
    for (let i = 29; i >= 0; i--) days.push(L().studyDay(t - i * dayMs));
    const per = days.map(function (d) { return (s.daily[d] && s.daily[d].answers) || 0; });
    const total = per.reduce(function (a, b) { return a + b; }, 0);
    const good = days.reduce(function (a, d) { return a + ((s.daily[d] && s.daily[d].good) || 0); }, 0);
    let mastered = 0;
    const forecast = [0, 0, 0, 0, 0, 0, 0];
    const end0 = L().dayEnd(t);
    Object.keys(s.cards).forEach(function (id) {
      const x = s.cards[id];
      if (x.suspended || x.state === "new") return;
      if (x.state === "review" && x.interval >= 21) mastered++;
      const due = Math.max(x.due, x.buriedUntil || 0);
      const k = due < end0 ? 0 : Math.floor((due - end0) / dayMs) + 1;
      if (k < 7) forecast[k]++;
    });
    const head = el("h2", { class: "tile-title", id: "st-cards", text: "Flashcards" });
    if (!total && !Object.keys(s.cards).length) {
      return el("section", { class: "card st-tile st-cards", "aria-labelledby": "st-cards" }, [head,
        el("p", { class: "st-empty", text: "You have no flashcard reviews yet. Start with a deck in the Decks tab – the stats appear after your first session." }),
        el("p", null, el("a", { class: "btn btn-secondary btn-small", href: HASH }, "Open flashcards"))]);
    }
    const max = Math.max(1, Math.max.apply(null, per));
    const bars = el("div", { class: "fc-st-bars", role: "img", "aria-label": "Flashcard reviews in the last 30 days: " + total + " in total, the most in one day: " + Math.max.apply(null, per) + "." },
      per.map(function (n, i) { return el("span", { class: "fc-st-bar" + (n ? "" : " is-zero"), style: "height:" + Math.max(n ? 6 : 2, Math.round(100 * n / max)) + "%", title: LM.fmt.dayMonth(days[i]) + ": " + n, "aria-hidden": "true" }); }));
    const stat = function (label, value, note) {
      return el("div", { class: "st-stat" }, [el("p", { class: "st-stat-label", text: label }), el("p", { class: "st-stat-value", text: value }), note ? el("p", { class: "st-stat-note tool-note", text: note }) : null]);
    };
    const pct = total >= 20 ? Math.round(100 * good / total) + "%" : "—";
    const fLabels = ["today", "tomorrow"].concat([2, 3, 4, 5, 6].map(function (k) { return LM.fmt.weekday(new Date(t + k * dayMs), "short"); }));
    return el("section", { class: "card st-tile st-cards", "aria-labelledby": "st-cards" }, [head,
      el("div", { class: "st-stats is-three" }, [
        stat("Reviews (30 days)", String(total)),
        stat("Good or Easy (30 days)", pct, total >= 20 ? null : "Shown from 20 reviews (now: " + total + ")."),
        stat("Mastered cards", String(mastered), "interval of at least 21 days")
      ]),
      el("p", { class: "review-label", text: "Reviews per day – the last 30 days" }),
      bars,
      LM.words && LM.words.counts().total
        ? el("p", { class: "tool-note fc-st-words" }, ["My words: ", el("strong", { class: "num", text: String(LM.words.counts().total) }), " (mastered: " + LM.words.counts().mastered + ") · ", el("a", { href: "#/review/words", text: "Open" })])
        : null,
      el("p", { class: "review-label", text: "Review forecast for 7 days" }),
      el("ol", { class: "fc-st-forecast" }, forecast.map(function (n, i) {
        return el("li", null, [el("span", { class: "fc-st-fc-day", text: fLabels[i] }), el("strong", { class: "num", text: String(n) })]);
      })),
      el("p", null, el("a", { class: "btn btn-secondary btn-small", href: HASH }, "Open flashcards"))
    ]);
  }

  LM.cards = {
    HASH: HASH, SESSION: SESSION, HOME: HOME, MISTAKES_ID: MISTAKES_ID, WORDS_ID: WORDS_ID, parseRoute: parseRoute, render: render, badgeCount: badgeCount, dueSummary: dueSummary,
    hasJournalCard: hasJournalCard, addFromJournal: addFromJournal, autoAddFromJournal: autoAddFromJournal, mistakeInfo: mistakeInfo,
    journalRemoved: journalRemoved, journalUpdated: journalUpdated, journalWrong: journalWrong, journalCorrect: journalCorrect,
    todayTile: todayTile, statsTile: statsTile, examTile: examTile, openFromSelection: openFromSelection,
    // for browsing / editing and integration
    internal: { hasProfile: hasProfile, st: st, saveState: saveState, allDecks: allDecks, deckById: deckById, cardsOf: cardsOf, cardById: cardById, enabled: enabled,
      toggleDeck: toggleDeck, examChips: examChips, renderFront: renderFront, renderBack: renderBack, head: head, downloadText: downloadText,
      exportDeck: exportDeck, bar: bar, loadDecks: loadDecks, fmtWhen: fmtWhen, deckOfId: deckOfId, nextDue: nextDue }
  };
})(window.LM);
