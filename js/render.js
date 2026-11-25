/*
 * render.js — rysowanie widoków: lewy panel (poziomy), nagłówek poziomu,
 * kategorie, lista essentials z polem „Umiem” i podsumowanie poziomu.
 *
 * Treść listy jest tylko do odczytu (dawny „Tryb edycji” został usunięty).
 * Każdy tekst trafia do DOM jako tekst (textContent), nigdy jako HTML.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const U = LM.utils;
  const el = U.el;

  // Skróty do innych części aplikacji (ładowane później, używane w trakcie działania)
  function app() { return LM.app; }

  // =====================================================================
  // ELEMENTY WSPÓLNE
  // =====================================================================

  /** Wypełnienie paska jako transform: scaleX (animuje się płynnie, bez przeliczania układu). */
  function fillStyle(percent) {
    return "transform:scaleX(" + Math.max(0, Math.min(100, percent)) / 100 + ")";
  }

  /** Pasek postępu. percent: 0–100. */
  function progressBar(percent, small, label) {
    return el("div", {
      class: "progress" + (small ? " is-small" : ""),
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": String(percent),
      "aria-label": label || "Postęp"
    }, el("div", { class: "progress-fill", style: fillStyle(percent) }));
  }

  /** Okrągły przycisk z symbolem i czytelną etykietą dla czytników ekranu. */
  function iconBtn(symbol, label, onClick, opts) {
    opts = opts || {};
    return el("button", {
      type: "button",
      class: "icon-btn" + (opts.danger ? " is-danger" : ""),
      "aria-label": label,
      "data-tooltip": label,
      disabled: !!opts.disabled,
      onclick: onClick
    }, LM.ICON_NODES && LM.ICON_NODES[symbol] ? LM.icon(symbol, { size: 18 }) : el("span", { "aria-hidden": "true", text: symbol }));
  }

  /** Pusty stan z komunikatem. */
  function emptyState(message) {
    return el("div", { class: "empty-state" }, el("p", { class: "empty-state-text", text: message }));
  }

  // =====================================================================
  // LEWY PANEL
  // =====================================================================

  /**
   * Pozycja lewego panelu: ikona (zawsze widoczna, także w wąskim pasku)
   * + etykieta (widoczna po rozwinięciu). Etykieta zostaje w DOM, więc
   * czytniki ekranu zawsze znają nazwę pozycji.
   */
  function sbItem(o) {
    return el("a", {
      class: "sb-item" + (o.cls ? " " + o.cls : "") + (o.active ? " is-active" : ""),
      href: o.href,
      "aria-current": o.active ? "page" : null,
      "aria-label": o.ariaLabel || null,
      onclick: o.onclick || null
    }, [
      el("span", { class: "sb-icon", "aria-hidden": "true" }, o.icon),
      el("span", { class: "sb-label" }, o.label),
      o.badge ? el("span", { class: "sb-badge num", "aria-hidden": "true", text: o.badge }) : null
    ]);
  }

  /** Poziom, którego test końcowy jest na ekranie (#/a1/test → "A1") albo null — wtedy w panelu świeci poziom, a nie „Ćwiczenia”. */
  function finalTestLevel() {
    const m = /^#\/([abcABC][12])\/test\/?$/.exec(location.hash || "");
    return m ? m[1].toUpperCase() : null;
  }

  /** Górna część lewego panelu: Dziś, Fiszki i błędy (jedna plakietka), Ćwiczenia, Lab czasów, Pisanie. */
  function renderToolsNav() {
    const box = document.getElementById("tools-nav");
    if (!box) return;
    const st = LM.state;
    const hasProfile = app().hasProfiles();
    const reviews = hasProfile && LM.reviewQueue ? LM.reviewQueue.dueCount() : 0; // jedna liczba: DO POWTÓRKI (fiszki + Moje błędy + słabe punkty); nowe karty osobno (spec v7 14, P3)
    const items = [
      { href: "#/trail", label: "Szlak", icon: "route", active: st.view === "trail" },
      { href: "#/today", label: "Dziś", icon: "sunrise", active: st.view === "today" },
      { href: "#/review", label: "Fiszki i błędy", icon: "layers", active: st.view === "review" || st.view === "cards" || st.view === "mistakes",
        badge: reviews ? String(reviews) : null, badgeLabel: reviews ? reviews + " do powtórki" : null },
      { href: "#/practice", label: "Ćwiczenia", icon: "dumbbell", active: st.view === "practice" && !finalTestLevel() },
      { href: "#/lab", label: "Lab czasów", icon: "flask-conical", active: st.view === "lab" },
      { href: "#/writing", label: "Pisanie", icon: "pencil", active: st.view === "writing" }
    ];
    box.replaceChildren(el("ul", { class: "sb-list" }, items.map(function (it) {
      return el("li", null, sbItem({
        href: it.href,
        active: it.active,
        cls: "is-tool",
        icon: LM.icon(it.icon, { size: 22 }),
        label: el("span", { class: "sb-label-title", text: it.label }),
        badge: it.badge,
        ariaLabel: it.badgeLabel ? it.label + ", " + it.badgeLabel : null
      }));
    })));
  }

  function syl() { return LM.syllabus; }

  // Level nodes are built once and then only updated (rings and bars move from the previous value, no flashing from zero).
  const levelNodes = {};

  function renderSidebar() {
    renderToolsNav();
    const st = LM.state;
    const list = document.getElementById("level-list");
    const currentId = LM.today && LM.today.currentLevelId ? LM.today.currentLevelId() : null;

    document.getElementById("sidebar-category-name").textContent = LM.APP.tagline;

    let ul = list.querySelector(":scope > ul.sb-list");
    if (!ul) { ul = el("ul", { class: "sb-list" }); list.replaceChildren(ul); }

    syl().levelIds().forEach(function (id) {
      const level = syl().level(id);
      const soon = !syl().isAvailable(id);
      const s = app().getLevelStats(id);
      const active = ((st.view === "level" || st.view === "page") && id === st.ui.levelId) || finalTestLevel() === id;
      let n = levelNodes[id];
      if (!n || !ul.contains(n.a)) {
        const ring = LM.ui.progressRing(s.percent, { size: 36, stroke: 4, node: LM.ui.landIcon(id, { size: 20 }), label: "Progress " + id });
        const fill = el("div", { class: "progress-fill", style: "transform:scaleX(" + s.percent / 100 + ")" });
        const count = el("span", { class: "sb-label-sub num" });
        const title = el("span", { class: "sb-label-title" });
        const bar = el("span", { class: "progress is-small sb-bar", "aria-hidden": "true" }, fill);
        // The level ring sits in a wrapper: the stamp of a passed final test lands on it
        const ringWrap = el("span", { class: "sb-ring-wrap" }, [ring, el("span", { class: "sb-ring-code", "aria-hidden": "true", text: id })]);
        const a = sbItem({
          href: app().levelHash(id),
          cls: "is-level lvl-" + id,
          icon: ringWrap,
          label: [title, count, bar],
          // Same address as now: redraw the list (e.g. back to the top) instead of doing nothing
          onclick: function (e) {
            if (location.hash === app().levelHash(id)) { e.preventDefault(); app().selectLevel(id); }
          }
        });
        n = levelNodes[id] = { a: a, ring: ring, ringWrap: ringWrap, fill: fill, count: count, title: title, bar: bar };
        ul.appendChild(el("li", null, a));
      }
      n.title.textContent = id + " · " + level.land;
      n.count.textContent = soon ? "soon" : s.done + " / " + s.total + " known";
      n.bar.hidden = soon;
      n.fill.style.transform = "scaleX(" + s.percent / 100 + ")";
      LM.ui.setRing(n.ring, s.percent);
      n.ring.removeAttribute("role"); // the link (aria-label) announces name and value, the ring is decoration
      n.ring.setAttribute("aria-hidden", "true");
      n.a.classList.toggle("is-active", active);
      n.a.classList.toggle("is-soon", soon);
      if (active) n.a.setAttribute("aria-current", "page"); else n.a.removeAttribute("aria-current");
      // Stamp of a passed final test: award on the ring + "A1 passed …" in the link label
      const passedText = !soon && LM.final ? LM.final.passedText(id) : null;
      const oldStamp = n.ringWrap.querySelector(".stamp");
      if (oldStamp) oldStamp.remove();
      if (passedText) n.ringWrap.appendChild(LM.ui.stamp(id, { size: 16 }));
      n.a.classList.toggle("is-passed", !!passedText);
      n.a.classList.toggle("is-current", id === currentId);
      n.a.setAttribute("aria-label", "Level " + id + ", " + level.land + (soon ? ": coming soon" : ": " + s.done + " of " + s.total + " topics known (" + s.percent + "%)") +
        (passedText ? ". " + passedText : "") + (id === currentId ? ". Current land" : ""));
    });

    // Under the levels: the "Exams" group from the registry (hidden while it is empty)
    if (LM.exams) LM.exams.renderNav();
  }

  // =====================================================================
  // MAIN AREA
  // =====================================================================

  /** Views that show profile data: without a profile they show the welcome card instead. */
  const PERSONAL_VIEWS = ["today", "review", "mistakes", "cards", "stats", "notes", "placement", "trail"];

  function renderMain(opts) {
    opts = opts || {};
    const v = LM.state.view;
    // Guest mode: public content works without a profile, saving actions ask for one (LM.profiles.requireProfile).
    // Personal pages without a profile show the welcome card under the same address.
    if (!app().hasProfiles() && PERSONAL_VIEWS.indexOf(v) !== -1) return LM.profiles.renderWelcome({ personal: true });
    if (v === "home") return LM.handbook.renderHome();
    if (v === "notfound") return renderNotFound();
    if (v === "exam") return LM.exams.render(LM.state.toolRoute);
    if (v === "review") return LM.review.render();
    if (v === "mistakes") return LM.mistakes.render(LM.state.toolRoute);
    if (v === "today") return LM.today.render();
    if (v === "placement") return LM.placement.render();
    if (v === "practice") return LM.exercises.render(LM.state.toolRoute);
    if (v === "lab") return LM.lab.render(LM.state.toolRoute);
    if (v === "stats") return LM.statsPage.render();
    if (v === "notes") return LM.notes.render();
    if (v === "cards") return LM.cards.render();
    if (v === "writing") return LM.writing.render();
    if (v === "trail") return LM.trail.render(LM.state.toolRoute);
    if (v === "page") return LM.handbook.renderPage(LM.state.route);
    renderLevel(opts);
  }

  /** "Page not found" for every hash no view knows (spec 02 §6). */
  function renderNotFound() {
    const view = document.getElementById("view");
    view.className = "view tool-view notfound-view";
    view.dataset.file = "#notfound";
    view.replaceChildren(el("section", { class: "card notfound", "aria-labelledby": "notfound-title" }, [
      el("h1", { class: "notfound-title", id: "notfound-title", text: "Page not found" }),
      el("p", { text: "There is no page at this address. It may have moved, or the link has a typo." }),
      el("p", null, el("a", { class: "btn btn-primary", href: "#/" }, LM.ui.withIcon("map", "Go to the home page")))
    ]));
    document.title = "Page not found · " + LM.APP.appTitle;
    U.setScroll(0);
  }

  function renderLevel(opts) {
    const view = document.getElementById("view");
    const scroll = opts.resetScroll ? 0 : U.getScroll();
    const levelId = LM.state.ui.levelId;
    const soon = !syl().isAvailable(levelId);

    view.className = "view lvl-" + levelId + (soon ? " is-soon" : "");
    delete view.dataset.file;
    view.replaceChildren();
    document.title = "Level " + levelId + " · " + LM.APP.appTitle;

    view.appendChild(renderLevelHeader(levelId, soon));
    if (soon) {
      view.appendChild(renderPlanned(levelId));
    } else {
      view.appendChild(renderTopics(levelId));
      const summary = LM.handbook.renderSummary(levelId);
      if (summary) view.appendChild(summary);
      const cheatsheet = LM.handbook.cheatsheetCard(levelId);
      if (cheatsheet) view.appendChild(cheatsheet);
      if (LM.final) view.appendChild(LM.final.card(levelId));
    }
    U.setScroll(typeof opts.scrollTop === "number" ? opts.scrollTop : scroll);
  }

  // ---------- Level header ----------

  /** Level header: big level code in the land colour, land and goal, ring with the progress of the whole level. */
  function renderLevelHeader(levelId, soon) {
    const level = syl().level(levelId);
    const s = app().getLevelStats(levelId);
    const text = el("div", { class: "level-hero-text" }, [
      el("p", { class: "level-kicker" }, [LM.ui.landIcon(levelId, { size: 16 }), LM.ui.landLabel(levelId)]),
      el("h1", { class: "level-title" }, [
        el("span", { class: "level-code-big", text: levelId }),
        el("span", { class: "level-name", text: level.land })
      ]),
      el("p", { class: "level-desc", text: level.goal }),
      !soon && LM.trail ? LM.trail.levelLink(levelId) : null
    ]);
    if (soon) {
      return el("header", { class: "card level-hero is-soon" }, [text, el("div", { class: "level-hero-ring" }, el("span", { class: "chip level-soon-chip", text: "Coming soon" }))]);
    }
    const ring = LM.ui.progressRing(s.percent, { size: 104, stroke: 8, label: "Progress in " + levelId, text: s.percent + "%" });
    ring.id = "level-ring";
    return el("header", { class: "card level-hero" }, [
      text,
      el("div", { class: "level-hero-ring" }, [
        ring,
        el("p", { class: "level-ring-label num", id: "level-ring-label", text: s.done + " of " + s.total + " known" }),
        LM.final ? LM.final.headerLabel(levelId) : null // "Passed · …" (final test)
      ])
    ]);
  }

  // ---------- Topics (checklist) ----------

  /** One checklist row: "I know this" on the left, the topic (link to its page) with a chevron on the right. */
  function topicRow(topic) {
    const done = LM.state.progress[topic.id] === true;
    const textId = "ess-text-" + topic.id;
    let li = null;
    const checkbox = el("label", { class: "umiem" }, [
      el("input", {
        type: "checkbox",
        checked: done,
        "aria-describedby": textId,
        onchange: function (e) {
          if (!app().hasProfiles()) { // guest mode: profile first, then the tick (the list redraws itself)
            const input = e.target, on = input.checked;
            input.checked = !on;
            app().withProfile("Your ticks are saved in your profile.", function () { app().setProgress(topic.id, on); app().renderAll(); });
            return;
          }
          app().setProgress(topic.id, e.target.checked);
          li.classList.toggle("is-done", e.target.checked);
          checkbox.classList.toggle("is-fresh", e.target.checked); // the stamp bounces only when ticking
        }
      }),
      el("span", { class: "visually-hidden", text: "I know this" })
    ]);
    const written = LM.handbook.hasPage(topic.id);
    li = el("li", { class: "ess-item has-page" + (done ? " is-done" : "") + (written ? "" : " is-pending"), "data-topic": topic.id }, [
      checkbox,
      el("div", { class: "ess-text", id: textId }, el("a", { class: "ess-link", href: LM.handbook.routeOf(topic.id), onclick: rememberScroll }, [
        el("span", { class: "ess-title" }, [
          el("span", { class: "ess-name", text: written ? LM.handbook.titleOf(topic.id) : topic.title }),
          el("span", { class: "ess-example", lang: LM.APP.targetLang, text: topic.example }),
          written ? null : el("span", { class: "ess-pending", text: "Being written" })
        ]),
        el("span", { class: "ess-link-arrow", "aria-hidden": "true" }, LM.icon("chevron-right", { size: 18 }))
      ]))
    ]);
    return li;
  }

  /** The checklist of an available level: topics grouped by syllabus category (order of first appearance). */
  function renderTopics(levelId) {
    const stats = app().getLevelStats(levelId);
    const section = el("section", { class: "essentials", "aria-labelledby": "ess-title" }, [
      el("div", { class: "section-head" }, [
        el("h2", { class: "section-title", id: "ess-title", text: "Topics" }),
        el("span", { class: "section-sub", text: "What you learn at " + levelId })
      ]),
      el("div", { class: "essentials-progress", id: "ess-progress" }, [
        progressBar(stats.percent, false, "Progress in " + levelId),
        el("span", { class: "progress-text", text: progressLabel(stats) })
      ])
    ]);
    syl().groups(levelId).forEach(function (g) {
      section.appendChild(el("h3", { class: "ess-group-title", text: g.name }));
      section.appendChild(el("ul", { class: "ess-list" }, g.topics.map(topicRow)));
    });
    // Best set score labels ("set 8/10") before the arrow, added when the exercise index has loaded
    if (LM.exercises && LM.exercises.setLabels) {
      const rows = section.querySelectorAll("li[data-topic]");
      const ids = Array.prototype.map.call(rows, function (r) { return r.getAttribute("data-topic"); });
      LM.exercises.setLabels(ids).then(function (labels) {
        Array.prototype.forEach.call(rows, function (row) {
          const lab = labels[row.getAttribute("data-topic")];
          const arrow = row.querySelector(".ess-link-arrow");
          if (!lab || !arrow || row.querySelector(".ess-set")) return;
          arrow.parentNode.insertBefore(el("span", { class: "ess-set" + (lab.high ? " is-high" : ""), title: "Best score of this topic's exercise set" }, [
            lab.high ? el("span", { class: "ess-set-dot", "aria-hidden": "true" }) : null, lab.text
          ]), arrow);
        });
      });
    }
    return section;
  }

  /** A "soon" level: the planned topics (titles and examples, no links, no checkboxes) (spec 06 E1). */
  function renderPlanned(levelId) {
    const section = el("section", { class: "essentials is-planned", "aria-labelledby": "ess-title" }, [
      el("div", { class: "section-head" }, [
        el("h2", { class: "section-title", id: "ess-title", text: "Planned topics" }),
        el("p", { class: "section-sub", text: levelId + " is on its way. The topics below are what it will cover." })
      ])
    ]);
    syl().groups(levelId).forEach(function (g) {
      section.appendChild(el("h3", { class: "ess-group-title", text: g.name }));
      section.appendChild(el("ul", { class: "ess-list is-planned" }, g.topics.map(function (t) {
        return el("li", { class: "ess-item is-planned" }, el("div", { class: "ess-text" }, el("span", { class: "ess-title" }, [
          el("span", { class: "ess-name", text: t.title }),
          el("span", { class: "ess-example", lang: LM.APP.targetLang, text: t.example })
        ])));
      })));
    });
    return section;
  }

  /** Remembers the list's scroll position before opening a page. */
  function rememberScroll() {
    LM.state.listScroll = U.getScroll();
  }

  function progressLabel(stats) {
    return stats.done + " of " + stats.total + " known · " + stats.percent + "%";
  }

  /** Updates the progress bar and ring without redrawing the page (focus stays). */
  function updateEssentialsProgress() {
    const box = document.getElementById("ess-progress");
    if (!box) return;
    const stats = app().getLevelStats(LM.state.ui.levelId);
    const bar = box.querySelector(".progress");
    bar.setAttribute("aria-valuenow", String(stats.percent));
    bar.querySelector(".progress-fill").style.transform = fillStyle(stats.percent).slice("transform:".length);
    const ring = document.getElementById("level-ring");
    if (ring) {
      LM.ui.setRing(ring, stats.percent, stats.percent + "%");
      const lbl = document.getElementById("level-ring-label");
      if (lbl) lbl.textContent = stats.done + " of " + stats.total + " known";
    }
    box.querySelector(".progress-text").textContent = progressLabel(stats);
  }

  LM.render = {
    renderSidebar: renderSidebar,
    renderToolsNav: renderToolsNav,
    renderMain: renderMain,
    updateEssentialsProgress: updateEssentialsProgress,
    iconBtn: iconBtn
  };
})(window.LM);
