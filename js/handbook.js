/*
 * handbook.js — topic pages, level summaries, cheat sheets and the home page (data/pages.js → LM.PAGES).
 *
 * Every topic comes from the syllabus (LM.syllabus, spec 06 E2); there is no label matching any more.
 *   #/a1/<category>-<slug>   topic page (topic id without the level prefix), LM.PAGES.pages["a1/<…>.md"]
 *   #/a1/cheatsheet          the level cheat sheet, LM.PAGES.cheatsheets.A1
 * A syllabus topic without a page shows "This topic is being written" (spec 06 E1); a slug that is not in the
 * syllabus is not a topic route (the app shows "Page not found").
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const U = LM.utils;
  const el = U.el;
  const S = function () { return LM.syllabus; };

  // Sections (## headings) hidden behind "Show answers"
  const HIDDEN_SECTIONS = ["Answers", "Sample answers"];
  const APP_TITLE = function () { return LM.APP.appTitle; };

  function data() { return LM.PAGES || null; }

  // =====================================================================
  // ROUTES
  // =====================================================================

  function routeOf(topicId) { return S().route(topicId); }

  /**
   * "#/a1/cases-accusative" → { level: "A1", topicId } · "#/a1/cheatsheet" → { level, cheatsheet: true }.
   * null when the hash is not a topic route of a known syllabus topic.
   */
  function parseRoute(hash) {
    const m = /^#\/([abc][12])\/([a-z0-9-]+)\/?$/.exec(hash || "");
    if (!m) return null;
    const level = m[1].toUpperCase();
    if (m[2] === "cheatsheet") return { level: level, cheatsheet: true };
    const t = S().topicByRoute(level, m[2]);
    return t ? { level: level, topicId: t.id } : null;
  }

  function hasPage(topicId) {
    const d = data();
    return !!(d && d.pages[S().pageFile(topicId)]);
  }

  function pageText(topicId) { return hasPage(topicId) ? data().pages[S().pageFile(topicId)] : null; }

  /** Title of a topic: the page's front matter title, else the syllabus title. */
  function titleOf(topicId) {
    const text = pageText(topicId);
    const meta = text ? LM.markdown.parseFrontmatter(text).meta : {};
    const t = S().topic(topicId);
    return meta.title || (t ? t.title : topicId);
  }

  // =====================================================================
  // TOPIC PAGE
  // =====================================================================

  function levelCrumb(levelId) { return { label: "Level " + levelId, href: LM.app.levelHash(levelId), onclick: function () { LM.app.goToList({ levelId: levelId }); } }; }

  function renderPage(route) {
    if (route.cheatsheet) return renderCheatsheet(route);
    const view = document.getElementById("view");
    const topic = S().topic(route.topicId);
    const levelId = topic.level;
    // The same page drawn again (e.g. profile switch) keeps its scroll position
    const keepScroll = view.dataset.file === topic.id ? U.getScroll() : 0;
    view.className = "view page-view lvl-" + levelId;
    view.dataset.file = topic.id;
    view.replaceChildren();
    const crumbs = [levelCrumb(levelId), { label: S().categoryName(topic.category), href: LM.app.levelHash(levelId), onclick: levelCrumb(levelId).onclick }];

    if (!hasPage(topic.id)) {
      U.setScroll(0);
      view.appendChild(el("div", { class: "page-head" }, LM.ui.breadcrumbs(crumbs.concat([{ label: topic.title }]))));
      view.appendChild(el("section", { class: "card page-pending", "aria-labelledby": "page-pending-title" }, [
        el("h1", { class: "page-pending-title", id: "page-pending-title", text: topic.title }),
        el("p", { class: "page-pending-lead", text: S().isAvailable(levelId) ? "This topic is being written." : levelId + " is on its way. This topic is being written." }),
        topic.example ? el("p", { class: "page-pending-example", lang: LM.APP.targetLang, text: topic.example }) : null,
        el("p", null, el("a", { class: "btn btn-secondary", href: LM.app.levelHash(levelId) }, LM.ui.withIcon("chevron-left", "Back to level " + levelId)))
      ]));
      document.title = topic.title + " · " + APP_TITLE();
      return;
    }

    const doc = LM.markdown.parse(pageText(topic.id));
    const pageTitle = doc.meta.title || topic.title;
    view.appendChild(el("div", { class: "page-head" }, [
      LM.ui.breadcrumbs(crumbs.concat([{ label: pageTitle }])),
      LM.notes ? LM.notes.button(topic.id, { title: levelId + " · " + pageTitle, route: location.hash }) : null,
      S().isAvailable(levelId) ? knowToggle(topic) : null
    ]));

    const article = el("article", { class: "md" }, LM.markdown.render(doc.blocks, { hiddenSections: HIDDEN_SECTIONS }));
    // Exam boxes after the explanation (from the exam registry; none until stage E)
    if (LM.exams && LM.exams.insertExamBoxes) LM.exams.insertExamBoxes(article, LM.exams.examBoxesFor(topic.id));
    if (LM.callouts) LM.callouts.apply(article); // highlighted sections and tables (js/callouts.js)
    view.appendChild(LM.toc ? LM.toc.wrap(article) : article); // table of contents at ≥ 4 sections (js/toc.js)
    // "Check yourself": the topic's exercise sets (index loaded on demand)
    if (LM.exercises) view.appendChild(LM.exercises.topicSection(topic.id));
    const trailBar = LM.trail ? LM.trail.barFor(topic.id) : null; // "Stop N of M" (Trail)
    if (trailBar) view.appendChild(trailBar);
    view.appendChild(topicNav(topic));
    const report = LM.ui.reportLink(topic.id); // E12
    if (report) view.appendChild(report);
    document.title = pageTitle + " · " + APP_TITLE();
    if (LM.profileData) LM.profileData.setLastPage(location.hash, levelId + " · " + pageTitle);
    U.setScroll(keepScroll);
  }

  // =====================================================================
  // PREVIOUS / NEXT TOPIC
  // =====================================================================

  let topicLinks = null; // { prev, next } for the open page: { href, label } — for the [ and ] shortcuts

  /** Footer of a topic page: "‹ Previous: …" and "Next topic: … ›"; at the end of a level "Start A2 ›". */
  function topicNav(topic) {
    const ids = S().topics(topic.level).map(function (t) { return t.id; }).filter(function (id) { return id === topic.id || hasPage(id); });
    const n = LM.learn.topicNeighbors(ids, topic.id);
    const ids6 = LM.LEVEL_IDS;
    const nextLevel = ids6[ids6.indexOf(topic.level) + 1] || null;
    topicLinks = {
      prev: n.prev ? { href: routeOf(n.prev), label: titleOf(n.prev) } : null,
      next: n.next ? { href: routeOf(n.next), label: titleOf(n.next) }
        : nextLevel ? { href: LM.app.levelHash(nextLevel), label: "Start " + nextLevel } : null
    };
    const items = [];
    items.push(topicLinks.prev
      ? el("a", { class: "topic-nav-link is-prev", href: topicLinks.prev.href, rel: "prev" }, [LM.icon("chevron-left", { size: 18 }), el("span", null, [el("span", { class: "topic-nav-kicker", text: "Previous" }), el("span", { class: "topic-nav-title", text: topicLinks.prev.label })])])
      : el("span", { class: "topic-nav-gap" }));
    if (topicLinks.next) {
      items.push(el("a", { class: "topic-nav-link is-next", href: topicLinks.next.href, rel: "next" }, [
        el("span", null, [el("span", { class: "topic-nav-kicker", text: n.next ? "Next topic" : "End of " + topic.level }), el("span", { class: "topic-nav-title", text: topicLinks.next.label })]),
        LM.icon("chevron-right", { size: 18 })
      ]));
    }
    return el("nav", { class: "page-foot topic-nav", "aria-label": "Previous and next topic" }, items);
  }

  // Shortcuts: [ previous topic, ] next topic (outside text fields)
  document.addEventListener("keydown", function (e) {
    if (!LM.state || LM.state.view !== "page" || !topicLinks || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (document.querySelector(".dialog-backdrop, dialog[open]")) return;
    const link = e.key === "[" ? topicLinks.prev : e.key === "]" ? topicLinks.next : null;
    if (link) { e.preventDefault(); location.hash = link.href; }
  });

  // =====================================================================
  // CHEAT SHEET (content/cheatsheets/<level>.md), route #/a2/cheatsheet
  // =====================================================================

  let printPending = false;

  function cheatsheetRoute(levelId) { return "#/" + levelId.toLowerCase() + "/cheatsheet"; }

  function cheatsheetText(levelId) {
    const d = data();
    return (d && d.cheatsheets && d.cheatsheets[levelId]) || null;
  }

  function printCheatsheet() { if (LM.print) LM.print.now(); else window.print(); }

  /** On screen a normal content page with a Print button; in print one A4 sheet in two columns. */
  function renderCheatsheet(route) {
    const view = document.getElementById("view");
    const levelId = route.level;
    const text = S().isAvailable(levelId) ? cheatsheetText(levelId) : null;
    const key = "#cheatsheet:" + levelId;
    const keepScroll = view.dataset.file === key ? U.getScroll() : 0;
    view.className = "view page-view sciaga-view lvl-" + levelId;
    view.dataset.file = key;
    view.replaceChildren();
    const crumb = levelCrumb(levelId);
    if (!text) {
      view.appendChild(el("div", { class: "page-head" }, LM.ui.breadcrumbs([crumb, { label: "Cheat sheet" }])));
      view.appendChild(el("div", { class: "empty-state" }, el("p", { class: "empty-state-text", text: "There is no cheat sheet for " + levelId + " yet." })));
      document.title = "Cheat sheet " + levelId + " · " + APP_TITLE();
      return;
    }
    const doc = LM.markdown.parse(text);
    const title = doc.meta.title || "Cheat sheet " + levelId;
    view.appendChild(el("div", { class: "page-head sciaga-tools" }, [
      LM.ui.breadcrumbs([crumb, { label: "Cheat sheet" }]),
      el("button", { type: "button", class: "btn btn-primary sciaga-print", onclick: printCheatsheet }, LM.ui.withIcon("download", "Print"))
    ]));
    view.appendChild(el("header", { class: "sciaga-head" }, [
      el("span", { class: "sciaga-code", "aria-hidden": "true", text: levelId }),
      el("div", { class: "sciaga-head-text" }, [
        el("p", { class: "sciaga-title", text: title }),
        el("p", { class: "sciaga-sub", text: "Level " + levelId + " · " + APP_TITLE() })
      ])
    ]));
    // The file's first # heading is replaced by the header above
    const blocks = doc.blocks.filter(function (b, i) { return !(b.type === "heading" && b.level === 1 && i === 0); });
    view.appendChild(el("article", { class: "md sciaga" }, LM.markdown.render(blocks)));
    document.title = title + " · " + APP_TITLE();
    if (LM.profileData) LM.profileData.setLastPage(location.hash, title);
    U.setScroll(keepScroll);
    if (printPending) { printPending = false; setTimeout(printCheatsheet, 300); }
  }

  /** "Cheat sheet A2" card on the level page (Open / Print), or null when the level has none. */
  function cheatsheetCard(levelId) {
    const text = S().isAvailable(levelId) ? cheatsheetText(levelId) : null;
    if (!text) return null;
    const meta = LM.markdown.parseFrontmatter(text).meta;
    return el("section", { class: "card lf-level-card sciaga-card lvl-" + levelId, "aria-labelledby": "sciaga-card-title" }, [
      el("div", { class: "lf-level-card-body" }, [
        el("h2", { class: "section-title", id: "sciaga-card-title" }, [el("span", { class: "callout-icon", "aria-hidden": "true" }, LM.icon("file-text", { size: 20 })), "Cheat sheet " + levelId + ": one page to print"]),
        el("p", { text: meta.summary || "The key forms, phrases and traps of the level on one A4 page." })
      ]),
      el("div", { class: "sciaga-card-actions" }, [
        el("a", { class: "btn btn-primary", href: cheatsheetRoute(levelId) }, LM.ui.withIcon("file-text", "Open")),
        el("button", { type: "button", class: "btn btn-secondary", onclick: function () { printPending = true; location.hash = cheatsheetRoute(levelId); } }, LM.ui.withIcon("download", "Print"))
      ])
    ]);
  }

  // =====================================================================
  // LEVEL SUMMARY (content/summaries/<level>.md)
  // =====================================================================

  function renderSummary(levelId) {
    const d = data();
    const text = S().isAvailable(levelId) && d && d.summaries && d.summaries[levelId];
    if (!text) return null;
    const doc = LM.markdown.parse(text);
    const section = el("section", { class: "card level-summary md", "aria-labelledby": "summary-title" }, LM.markdown.render(doc.blocks));
    const h2 = section.querySelector("h2");
    if (h2) { h2.id = "summary-title"; h2.classList.add("section-title"); }
    // Paragraphs that are only bold text become subheadings
    section.querySelectorAll("p").forEach(function (p) {
      if (p.childNodes.length === 1 && p.firstChild.nodeName === "STRONG") p.classList.add("md-subhead");
    });
    if (LM.callouts) LM.callouts.apply(section);
    return section;
  }

  // =====================================================================
  // HOME (content/home.md), route #/
  // =====================================================================

  /** The six levels with their land and status, linked to the level pages (used when home.md has no level table). */
  function levelOverview() {
    return el("section", { class: "card home-levels", "aria-labelledby": "home-levels-title" }, [
      el("h2", { class: "section-title", id: "home-levels-title", text: "Levels" }),
      el("ul", { class: "home-level-list" }, S().levelIds().map(function (id) {
        const l = S().level(id);
        const soon = !S().isAvailable(id);
        return el("li", { class: "home-level lvl-" + id + (soon ? " is-soon" : "") }, el("a", { class: "home-level-link", href: LM.app.levelHash(id) }, [
          el("span", { class: "home-level-icon", "aria-hidden": "true" }, LM.ui.landIcon(id, { size: 28 })),
          el("span", { class: "home-level-text" }, [
            el("strong", { text: id + " · " + l.land }),
            el("span", { class: "home-level-goal", text: l.goal })
          ]),
          soon ? el("span", { class: "chip home-level-soon", text: "Soon" }) : null
        ]));
      }))
    ]);
  }

  function renderHome() {
    const view = document.getElementById("view");
    const keepScroll = view.dataset.file === "#home" ? U.getScroll() : 0;
    view.className = "view home-view";
    view.dataset.file = "#home";
    view.replaceChildren();
    document.title = APP_TITLE();

    const d = data();
    const firstRun = LM.trail && LM.trail.firstRunCard ? LM.trail.firstRunCard() : null; // "placement test or start at A1"
    if (!d || !d.home) {
      view.appendChild(LM.ui.pageHead({ title: APP_TITLE(), lead: LM.APP.tagline }));
      if (firstRun) view.appendChild(firstRun);
      if (LM.today && LM.today.compactTrail) view.appendChild(LM.today.compactTrail());
      view.appendChild(levelOverview());
      view.appendChild(homeFooter());
      U.setScroll(keepScroll);
      return;
    }
    const doc = LM.markdown.parse(d.home);
    const article = el("article", { class: "md home" }, LM.markdown.render(doc.blocks));
    linkLevelTable(article);
    wordmarkHeading(article);
    if (LM.callouts) LM.callouts.apply(article);
    if (firstRun) article.insertBefore(firstRun, article.querySelector(".md-section"));
    if (LM.today && LM.today.compactTrail) {
      const first = article.querySelector(".md-section");
      if (first) article.insertBefore(LM.today.compactTrail(), first); else article.appendChild(LM.today.compactTrail());
    }
    if (LM.exams && LM.exams.insertAfterIntro && LM.examCover) LM.exams.insertAfterIntro(article, LM.examCover.homeSection());
    view.appendChild(article);
    view.appendChild(homeFooter());
    U.setScroll(keepScroll);
  }

  /** The home heading that equals the app title is drawn as the wordmark: "Polish" in the accent, the rest in ink (spec 11 §1). */
  function wordmarkHeading(root) {
    const h1 = root.querySelector("h1");
    const parts = LM.APP.wordmark;
    if (!h1 || !parts || h1.textContent.trim() !== parts.join(" ")) return;
    h1.classList.add("home-wordmark");
    h1.replaceChildren(el("span", { class: "logo-word-accent", text: parts[0] }), document.createTextNode(" " + parts[1]));
  }

  /** Home footer (spec 06 E12): version, the privacy sentence, the source repository. */
  function homeFooter() {
    return el("footer", { class: "home-foot" }, [
      el("p", { class: "num", text: "Version " + LM.VERSION }),
      el("p", { text: "No accounts. Your progress stays in this browser." }),
      LM.APP.repoUrl ? el("p", null, el("a", { href: LM.APP.repoUrl, target: "_blank", rel: "noopener" }, LM.ui.withIcon("external-link", "Source code"))) : null
    ]);
  }

  /**
   * In home.md tables the level codes A1…C2 of the first column become links to the level pages;
   * a column headed "Status" is filled from content/levels.json, so the text never goes stale.
   */
  function linkLevelTable(root) {
    root.querySelectorAll("table").forEach(function (table) {
      const heads = Array.prototype.map.call(table.querySelectorAll("thead th"), function (th) { return th.textContent.trim().toLowerCase(); });
      const statusCol = heads.indexOf("status");
      if (statusCol === -1) return;
      table.querySelectorAll("tbody tr").forEach(function (tr) {
        const code = tr.cells[0] ? tr.cells[0].textContent.trim().toUpperCase() : "";
        const cell = tr.cells[statusCol];
        if (LM.LEVEL_IDS.indexOf(code) === -1 || !cell) return;
        cell.textContent = S().isAvailable(code) ? "Available" : "Coming soon";
      });
    });
    root.querySelectorAll("tbody tr").forEach(function (tr) {
      const cell = tr.cells[0];
      const code = cell ? cell.textContent.trim().toUpperCase() : "";
      if (LM.LEVEL_IDS.indexOf(code) === -1) return;
      tr.classList.add("lvl-row", "lvl-" + code);
      cell.replaceChildren(el("a", { class: "level-link lvl-" + code, href: LM.app.levelHash(code), "aria-label": "Go to level " + code }, [el("span", { class: "level-dot", "aria-hidden": "true" }), code]));
    });
  }

  // =====================================================================
  // "I KNOW THIS"
  // =====================================================================

  /** The page's "I know this" switch: the same state as the checkbox on the level page (active profile). */
  function knowToggle(topic) {
    const done = LM.state.progress[topic.id] === true;
    const label = el("label", { class: "know-toggle know-toggle-lg" + (done ? " is-done" : "") }, [
      el("input", {
        type: "checkbox",
        checked: done,
        "aria-label": "I know this: " + topic.title,
        onchange: function (e) {
          if (!LM.app.hasProfiles()) { // guest mode: profile first, then the tick (the page redraws itself)
            const input = e.target, on = input.checked;
            input.checked = !on;
            LM.app.withProfile("Your “I know this” marks are saved in your profile.", function () { LM.app.setProgress(topic.id, on); LM.app.renderAll(); });
            return;
          }
          LM.app.setProgress(topic.id, e.target.checked);
          label.classList.toggle("is-fresh", e.target.checked);
        }
      }),
      el("span", { text: "I know this" })
    ]);
    return label;
  }

  /** Checklist entry of a topic: { id, text, done } or null (topic of a "soon" level or unknown). */
  function checkItem(topicId) {
    const t = S().topic(topicId);
    if (!t || !S().isAvailable(t.level)) return null;
    return { id: t.id, text: t.title, done: LM.state.progress[t.id] === true };
  }

  // [[topic id]] links in Markdown: the topic page (its title); a topic of a "soon" level is shown without a link (E1)
  LM.markdown.resolveWiki = function (id) {
    const t = S().topic(id);
    if (!t) return null;
    return { href: S().isAvailable(t.level) ? routeOf(id) : null, text: titleOf(id), level: t.level, kind: "page" };
  };

  LM.handbook = {
    routeOf: routeOf,
    parseRoute: parseRoute,
    hasPage: hasPage,
    titleOf: titleOf,
    checkItem: checkItem,
    renderPage: renderPage,
    renderSummary: renderSummary,
    cheatsheetCard: cheatsheetCard,
    cheatsheetRoute: cheatsheetRoute,
    renderHome: renderHome
  };
})(window.LM);
