/*
 * lab-cases.js — the Case Lab (LM.lab; spec 09). Shared parts (timeline, decision tree, compare picker, listen
 * buttons, practice, loading) are LM.labKit (js/lab.js).
 *
 * Routes (each view has its own address):
 *   #/lab                          Map: the seven cases in the school order
 *   #/lab/<case>                   Case card
 *   #/lab/pick[/<tree>]            Pick the case (decision trees; rules written in the data, not AI)
 *   #/lab/compare[/<a>/<b>]        Compare two cases
 *   #/lab/forms[/model/<id>]       Declension viewer: one model phrase in all 14 forms
 *   #/lab/forms/case/<case>        Declension viewer: all model phrases in one case
 *   #/lab/aspect                   Aspect and tense strip: the five forms on one timeline
 *
 * Data: data/lab.js (LM.LAB = { cases, models, trees, aspect }) generated from content/lab/ by npm run build
 * (tools/build/lab.js), loaded on demand. Case names, Polish names and question words come from LM.lang.cases;
 * the case colour (--case-<short>) is never the only carrier: the case name is always shown next to it.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const U = LM.utils;
  const el = U.el;
  const K = LM.labKit;
  const BASE = "#/lab";
  const RESERVED = ["pick", "compare", "forms", "aspect"];

  // Tab state (in the tab's memory)
  let lastCase = null;
  let numberOf = "singular";          // case card: endings switch
  const stacks = {};                  // Pick: { treeId: [{ node, option }] }
  const sceneState = {};

  function lab() { return LM.LAB || null; }
  function usable() { const d = LM.LAB; return d && Array.isArray(d.cases) ? d : null; }
  const load = K.loader("data/lab.js", usable, BASE);

  function caseInfo(id) { return LM.lang.caseOf(id); }
  function caseCard(id) { const d = lab(); return d ? d.cases.find(function (c) { return c.id === id; }) || null : null; }
  function model(id) { const d = lab(); return d ? (d.models || []).find(function (m) { return m.id === id; }) || null : null; }
  function tree(id) { const d = lab(); return d ? (d.trees || []).find(function (t) { return t.id === id; }) || null : null; }

  /** CSS class with the case colour (--case: the token of this case). */
  function caseClass(id) { return "case-" + String(id).slice(0, 3); }
  function caseName(id) { const c = caseInfo(id); return c ? c.name : id; }
  function target(text, tag, extra) { return el(tag || "span", Object.assign({ lang: LM.APP.targetLang, text: text }, extra || {})); }

  /** "Genitive" + the Polish name and question words, always together with the colour marker. */
  function caseBadge(id, opts) {
    const c = caseInfo(id);
    opts = opts || {};
    return el("span", { class: "case-badge " + caseClass(id) }, [
      el("span", { class: "case-dot", "aria-hidden": "true" }),
      el("span", { class: "case-badge-name", text: c ? c.name : id }),
      c && !opts.short ? el("span", { class: "case-badge-q", lang: LM.APP.targetLang, text: c.questions }) : null
    ]);
  }

  // =====================================================================
  // ROUTES
  // =====================================================================

  function parseRoute(hash) {
    const m = /^#\/lab(?:\/([a-z0-9-]+)(?:\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?)?)?\/?$/.exec(hash || "");
    if (!m) return null;
    if (!m[1]) return { tab: "map" };
    if (m[1] === "pick") return m[3] ? null : { tab: "pick", tree: m[2] || null };
    if (m[1] === "compare") return (m[2] && !m[3]) ? null : { tab: "compare", a: m[2] || null, b: m[3] || null };
    if (m[1] === "forms") {
      if (!m[2]) return { tab: "forms", by: "model", id: null };
      if ((m[2] === "model" || m[2] === "case") && m[3]) return { tab: "forms", by: m[2], id: m[3] };
      return null;
    }
    if (m[1] === "aspect") return m[2] ? null : { tab: "aspect" };
    if (m[2]) return null;
    return { tab: "card", id: m[1] };
  }

  function header(route) {
    const items = [
      { id: "map", label: "Map", icon: "layout-grid", href: BASE },
      { id: "card", label: "Case card", icon: "notebook-text", href: BASE + "/" + (route.tab === "card" ? route.id : (lastCase || "nominative")) },
      { id: "pick", label: "Pick the case", icon: "route", href: BASE + "/pick" },
      { id: "compare", label: "Compare", icon: "arrow-left-right", href: BASE + "/compare" },
      { id: "forms", label: "Declension", icon: "table", href: BASE + "/forms" },
      { id: "aspect", label: "Aspect", icon: "clock", href: BASE + "/aspect" }
    ];
    return [
      LM.ui.pageHead({ eyebrow: "Learning · " + LM.APP.lab.title, title: LM.APP.lab.title, lead: "Seven cases on cards, a path that picks the case for you, every form of model phrases and the aspect on a timeline.", className: "lab-head" }),
      K.tabs(items, route.tab, LM.APP.lab.title + " tabs")
    ];
  }

  function missing(textValue) {
    return el("div", { class: "empty-state" }, [
      el("p", { class: "empty-state-text", text: textValue }),
      el("p", null, el("a", { class: "btn btn-secondary", href: BASE }, "Back to the map"))
    ]);
  }

  // =====================================================================
  // VIEW 1: MAP
  // =====================================================================

  function mapTile(c) {
    const card = caseCard(c.id);
    const inner = [
      el("span", { class: "lab-tile-top" }, [
        el("span", { class: "lab-tile-name" }, [el("span", { class: "case-dot", "aria-hidden": "true" }), c.name]),
        card ? K.levelChip(card.level) : null
      ]),
      el("span", { class: "lab-tile-pl" }, [target(card ? card.name : c.native.charAt(0).toUpperCase() + c.native.slice(1)), " · ", target(c.questions)]),
      el("span", { class: "lab-tile-ex", text: card ? card.summary : "Being written." })
    ];
    if (!card) return el("div", { class: "lab-tile is-empty " + caseClass(c.id), "data-case": c.id }, inner);
    return el("a", { class: "lab-tile " + caseClass(c.id), href: BASE + "/" + c.id, "data-case": c.id }, inner);
  }

  function renderMap(view) {
    const grid = el("ol", { class: "lab-case-grid", "aria-label": "The seven cases" }, LM.lang.cases.map(function (c) {
      return el("li", null, mapTile(c));
    }));
    grid.addEventListener("keydown", mapKeys);
    view.appendChild(el("section", { class: "lab-section", "aria-labelledby": "lab-map-title" }, [
      el("h2", { class: "section-title", id: "lab-map-title", text: "The seven cases" }),
      el("p", { class: "tool-note", text: "In the order Polish schools teach them. Each case has a name, a colour and its question words. Arrow keys move between the cards, Enter opens one." }),
      grid
    ]));
    view.appendChild(el("section", { class: "lab-section lab-more", "aria-label": "More in the lab" }, [
      moreLink(BASE + "/pick", "route", "Pick the case", "Answer a few questions about your sentence."),
      moreLink(BASE + "/forms", "table", "Declension", "Model phrases in all 14 forms."),
      moreLink(BASE + "/aspect", "clock", "Aspect and tense", "Five verb forms on one timeline.")
    ]));
  }

  function moreLink(href, icon, title, textValue) {
    return el("a", { class: "card lab-more-link", href: href }, [
      el("span", { class: "lab-more-icon", "aria-hidden": "true" }, LM.icon(icon, { size: 22 })),
      el("span", null, [el("strong", { text: title }), el("span", { class: "lab-more-text", text: textValue })])
    ]);
  }

  /** Arrow keys between map cards (the visual grid: up / down = the card above / below). */
  function mapKeys(e) {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (keys.indexOf(e.key) === -1) return;
    const tiles = Array.prototype.slice.call(e.currentTarget.querySelectorAll("a.lab-tile"));
    const i = tiles.indexOf(document.activeElement);
    if (i === -1) return;
    let j = i;
    if (e.key === "ArrowLeft") j = Math.max(0, i - 1);
    else if (e.key === "ArrowRight") j = Math.min(tiles.length - 1, i + 1);
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = tiles.length - 1;
    else {
      const r = tiles[i].getBoundingClientRect();
      const down = e.key === "ArrowDown";
      let best = -1, bestD = Infinity;
      tiles.forEach(function (t, k) {
        const q = t.getBoundingClientRect();
        if (down ? q.top <= r.top + 4 : q.top >= r.top - 4) return;
        const d = Math.abs(q.top - r.top) * 10 + Math.abs(q.left - r.left);
        if (d < bestD) { bestD = d; best = k; }
      });
      if (best !== -1) j = best;
    }
    e.preventDefault();
    tiles[j].focus();
  }

  // =====================================================================
  // VIEW 2: CASE CARD
  // =====================================================================

  function renderCard(view, id) {
    const c = caseCard(id);
    const info = caseInfo(id);
    if (!c || !info) { view.appendChild(missing(info ? "The " + info.name + " card is being written." : "There is no such case in the lab.")); return; }
    lastCase = c.id;
    document.title = info.name + " · " + LM.APP.lab.title;
    const card = el("article", { class: "lab-card " + caseClass(c.id), "aria-labelledby": "lab-card-title" });
    card.appendChild(el("header", { class: "card lab-card-head" }, [
      el("div", { class: "lab-card-top" }, [
        el("p", { class: "lab-card-eyebrow" }, [K.levelChip(c.level), el("span", { text: "Case " + (LM.lang.cases.indexOf(info) + 1) + " of 7" })]),
        K.notesButton("lab:" + c.id, LM.APP.lab.title + " · " + info.name, BASE + "/" + c.id)
      ]),
      el("h2", { class: "lab-card-title", id: "lab-card-title" }, [el("span", { class: "case-dot is-big", "aria-hidden": "true" }), info.name]),
      el("p", { class: "lab-card-pl" }, [target(c.name), " · ", target(c.questions)]),
      el("p", { class: "lab-card-summary", text: c.summary })
    ]));

    card.appendChild(K.section("Uses", el("ul", { class: "lab-uses" }, c.uses.map(function (u) {
      return el("li", { class: "card lab-use" }, [
        el("p", { class: "lab-use-label", text: u.label }),
        el("p", { class: "lab-use-en" }, [target(u.pl), K.speakButton(u.pl)]),
        el("p", { class: "lab-use-pl", text: u.en })
      ]);
    }))));
    if (c.endings) card.appendChild(K.section("Endings", endingsBlock(c)));
    if (c.triggers) card.appendChild(K.section("What triggers it", triggersBlock(c.triggers)));
    if (c.traps && c.traps.length) {
      card.appendChild(el("section", { class: "callout callout-trap lab-traps" }, [
        el("h3", { class: "callout-title" }, [el("span", { class: "callout-icon", "aria-hidden": "true" }, LM.icon("triangle-alert", { size: 20 })), LM.APP.mistakesHeading]),
        el("ul", null, c.traps.map(function (x) { return el("li", { text: x }); }))
      ]));
    }
    if (c.contrasts && c.contrasts.length) {
      card.appendChild(K.section("Compare with…", el("ul", { class: "lab-contrasts" }, c.contrasts.map(function (x) {
        return el("li", { class: "card lab-contrast" }, [
          el("p", { class: "lab-contrast-head" }, [caseBadge(c.id, { short: true }), " vs ", caseBadge(x.with, { short: true })]),
          el("p", { text: x.rule }),
          exampleList(x.examples),
          el("a", { class: "btn btn-secondary btn-small", href: BASE + "/compare/" + c.id + "/" + x.with }, LM.ui.withIcon("arrow-left-right", "Compare side by side"))
        ]);
      }))));
    }
    card.appendChild(K.section("In all forms", el("p", { class: "lab-practice-links" }, [
      el("a", { class: "btn btn-secondary", href: BASE + "/forms/case/" + c.id }, LM.ui.withIcon("table", "Model phrases in the " + info.name))
    ])));
    const practice = el("div", { class: "lab-practice" }, el("p", { class: "tool-note", text: "Loading the sets…" }));
    card.appendChild(K.section("Practice this case", practice));
    K.fillPractice(practice, { topicIds: c.topicIds, setTags: c.setTags, empty: "Exercise sets for this case are still being written." });
    view.appendChild(card);
  }

  function exampleList(list) {
    if (!list || !list.length) return null;
    return el("ul", { class: "lab-contrast-ex" }, list.map(function (x) { return el("li", null, [target(x), K.speakButton(x)]); }));
  }

  /** Endings: nouns and adjectives side by side, with a singular / plural switch (two buttons, aria-pressed). */
  function endingsBlock(c) {
    const box = el("div", { class: "lab-endings" });
    function paint() {
      const nouns = c.endings[numberOf] || {};
      const adjAll = c.endings.adjective ? c.endings.adjective[numberOf] : null;
      const adj = typeof adjAll === "string" ? null : (adjAll || {});
      const rows = Object.keys(nouns);
      Object.keys(adj || {}).forEach(function (k) { if (rows.indexOf(k) === -1) rows.push(k); });
      const sw = el("div", { class: "lab-switch", role: "group", "aria-label": "Number" }, ["singular", "plural"].map(function (n) {
        const on = n === numberOf;
        return el("button", { type: "button", class: "chip-btn" + (on ? " is-active" : ""), "aria-pressed": on ? "true" : "false",
          onclick: function () { numberOf = n; paint(); box.querySelector(".chip-btn.is-active").focus(); } }, n === "singular" ? "Singular" : "Plural");
      }));
      const table = el("div", { class: "md-table" }, el("div", { class: "md-table-wrap" }, el("table", { class: "lab-end-table" }, [
        el("caption", { class: "visually-hidden", text: caseName(c.id) + " endings, " + numberOf }),
        el("thead", null, el("tr", null, [el("th", { scope: "col", text: "Gender" }), el("th", { scope: "col", text: "Noun" }), el("th", { scope: "col", text: "Adjective" })])),
        el("tbody", null, rows.map(function (g) {
          return el("tr", null, [
            el("th", { scope: "row", text: g }),
            el("td", { "data-label": "Noun", lang: LM.APP.targetLang, text: nouns[g] || "—" }),
            el("td", { "data-label": "Adjective", lang: LM.APP.targetLang, text: adj ? (adj[g] || "—") : (adjAll || "—") })
          ]);
        }))
      ])));
      K.fill(box, [sw, table, el("p", { class: "tool-note", text: "“= nominative” means the form is the same as the dictionary form." })]);
    }
    paint();
    return box;
  }

  function triggersBlock(t) {
    const groups = [["prepositions", "Prepositions"], ["verbs", "Verbs"], ["other", "Other"]];
    return el("div", { class: "lab-triggers" }, groups.filter(function (g) { return t[g[0]] && t[g[0]].length; }).map(function (g) {
      return el("div", { class: "lab-trigger-group" }, [
        el("h4", { class: "lab-trigger-title", text: g[1] }),
        el("ul", { class: "lab-signals" }, t[g[0]].map(function (s) {
          return el("li", null, el("button", { type: "button", class: "chip-btn lab-trigger", lang: LM.APP.targetLang, "aria-label": "Listen: " + s,
            onclick: function () { if (LM.shortcuts) LM.shortcuts.speak(s.replace(/\s*\(.*\)\s*/, " ").trim()); } }, s));
        }))
      ]);
    }));
  }

  // =====================================================================
  // VIEW 3: PICK THE CASE
  // =====================================================================

  function renderPick(view, route) {
    const trees = lab().trees || [];
    if (!trees.length) { view.appendChild(el("p", { class: "tool-note", text: "No decision trees yet (content/lab/trees.json)." })); return; }
    const t = (route.tree && tree(route.tree)) || trees[0];
    if (route.tree && !tree(route.tree)) { view.appendChild(missing("There is no such decision tree.")); return; }
    if (trees.length > 1) {
      view.appendChild(el("nav", { class: "lab-tree-pick", "aria-label": "Decision trees" }, el("ul", { class: "lab-signals" }, trees.map(function (x) {
        const on = x.id === t.id;
        return el("li", null, el("a", { class: "chip-btn" + (on ? " is-active" : ""), href: BASE + "/pick/" + x.id, "aria-current": on ? "page" : null, text: x.title }));
      }))));
    }
    const stack = stacks[t.id] = stacks[t.id] || [];
    view.appendChild(el("h2", { class: "section-title", text: t.title }));
    if (t.intro) view.appendChild(el("p", { class: "tool-note", text: t.intro }));
    view.appendChild(K.treeView({
      tree: t, stack: stack,
      rerender: function () { render(parseRoute(location.hash)); },
      renderResult: pickResult
    }));
    view.appendChild(el("p", { class: "tool-note", text: "These are rules written in the data, not artificial intelligence – the same path always gives the same result." }));
  }

  function pickResult(o) {
    const out = [];
    if (o.result && o.result.length) {
      const names = o.result.map(caseName);
      out.push(el("h2", { class: "lab-question lab-result-title", tabindex: "-1", text: o.result.length > 1 ? "These fit: " + names.join(", ") : "Use the " + names[0] }));
      if (o.why) out.push(el("p", { class: "lab-why", text: o.why }));
      if (o.example) out.push(el("p", { class: "lab-use-en" }, [target(o.example.pl), K.speakButton(o.example.pl), el("span", { class: "lab-use-pl", text: " – " + o.example.en })]));
      out.push(el("ul", { class: "lab-results" }, o.result.map(function (id) {
        const c = caseCard(id);
        return el("li", { class: "card lab-result " + caseClass(id) }, [
          el("p", { class: "lab-result-name" }, [caseBadge(id), c ? " " : null, c ? K.levelChip(c.level) : null]),
          c ? el("p", { text: c.summary }) : el("p", { class: "tool-note", text: "This card is being written." }),
          c ? el("a", { class: "btn btn-primary btn-small", href: BASE + "/" + id }, LM.ui.withIcon("arrow-right", "Open the " + caseName(id) + " card")) : null
        ]);
      })));
    } else if (o.answer) {
      out.push(el("h2", { class: "lab-question lab-result-title", tabindex: "-1", text: o.answer.title }));
      if (o.answer.text) out.push(el("p", { class: "lab-why", text: o.answer.text }));
      (o.answer.examples || []).forEach(function (x) {
        out.push(el("p", { class: "lab-use-en" }, [target(x.pl), K.speakButton(x.pl), el("span", { class: "lab-use-pl", text: " – " + x.en })]));
      });
      if (o.answer.href) out.push(el("a", { class: "btn btn-primary btn-small", href: o.answer.href }, LM.ui.withIcon("arrow-right", o.answer.linkLabel || "Open")));
    }
    return out;
  }

  // =====================================================================
  // VIEW 4: COMPARE
  // =====================================================================

  function renderCompare(view, route) {
    const all = lab().cases;
    if (all.length < 2) { view.appendChild(el("p", { class: "tool-note", text: "Two case cards are needed to compare." })); return; }
    const a = caseCard(route.a) || caseCard(lastCase) || all[0];
    const first = a.contrasts && a.contrasts[0] ? a.contrasts[0].with : null;
    let b = caseCard(route.b) || caseCard(first) || all.find(function (c) { return c.id !== a.id; });
    if (b.id === a.id) b = all.find(function (c) { return c.id !== a.id; });

    view.appendChild(K.comparePicker({
      items: all.map(function (c) { return { id: c.id, label: caseName(c.id) + " (" + c.name + ")" }; }),
      a: a.id, b: b.id, labelA: "First case", labelB: "Second case",
      onChange: function (x, y) { location.hash = BASE + "/compare/" + x + "/" + y; }
    }));

    const column = function (c) {
      const info = caseInfo(c.id);
      return el("section", { class: "card lab-compare-col " + caseClass(c.id), "aria-labelledby": "cmp-" + c.id }, [
        el("h2", { class: "lab-card-title", id: "cmp-" + c.id }, [el("span", { class: "case-dot is-big", "aria-hidden": "true" }), info.name, " ", K.levelChip(c.level)]),
        el("p", { class: "lab-card-pl" }, [target(c.name), " · ", target(c.questions)]),
        el("p", { text: c.summary }),
        el("h3", { class: "lab-block-title", text: "When to use it" }),
        el("ul", { class: "lab-when" }, c.uses.map(function (u) {
          return el("li", null, [el("strong", { text: u.label + ": " }), target(u.pl), K.speakButton(u.pl)]);
        })),
        el("h3", { class: "lab-block-title", text: "Singular endings" }),
        el("ul", { class: "lab-when" }, Object.keys((c.endings && c.endings.singular) || {}).map(function (g) {
          return el("li", null, [g + ": ", target(c.endings.singular[g])]);
        }))
      ]);
    };
    view.appendChild(el("div", { class: "lab-compare" }, [column(a), column(b)]));

    const diffs = [];
    (a.contrasts || []).forEach(function (x) { if (x.with === b.id) diffs.push(x); });
    (b.contrasts || []).forEach(function (x) { if (x.with === a.id) diffs.push(x); });
    view.appendChild(el("section", { class: "card lab-diff", "aria-labelledby": "lab-diff-title" }, [
      el("h2", { class: "section-title", id: "lab-diff-title", text: "Differences" }),
      diffs.length ? el("div", { class: "md-table" }, el("div", { class: "md-table-wrap" }, el("table", null, [
        el("thead", null, el("tr", null, [el("th", { text: "Rule" }), el("th", { text: "Example pair" })])),
        el("tbody", null, diffs.map(function (d) {
          return el("tr", null, [el("td", { "data-label": "Rule", text: d.rule }), el("td", { "data-label": "Example pair" }, (d.examples || []).map(function (x) {
            return el("p", { class: "lab-diff-ex" }, [target(x), K.speakButton(x)]);
          }))]);
        }))
      ]))) : el("p", { class: "tool-note", text: "There is no rule written for this pair yet. Compare the uses and endings above." })
    ]));
  }

  // =====================================================================
  // VIEW 5: DECLENSION VIEWER
  // =====================================================================

  /** Common start of two words; the rest of the form is shown as its ending (only when the start is long enough). */
  function withEnding(form, base) {
    const fw = form.split(" "), bw = (base || "").split(" ");
    const out = [];
    fw.forEach(function (w, i) {
      if (i) out.push(" ");
      const b = bw[i] || "";
      let k = 0;
      while (k < w.length && k < b.length && w[k] === b[k]) k++;
      if (w === b || k < 2 || k === w.length) { out.push(w); return; }
      out.push(w.slice(0, k), el("span", { class: "lab-end", text: w.slice(k) }));
    });
    return out;
  }

  function formCell(text, base, label) {
    return el("td", { "data-label": label }, [el("span", { lang: LM.APP.targetLang, class: "lab-form" }, withEnding(text, base)), K.speakButton(text)]);
  }

  function renderForms(view, route) {
    const models = lab().models || [];
    if (!models.length) { view.appendChild(el("p", { class: "tool-note", text: "No model phrases yet (content/lab/models.json)." })); return; }
    const by = route.by;
    const modeSwitch = el("div", { class: "lab-switch", role: "group", "aria-label": "Show" }, [
      el("a", { class: "chip-btn" + (by === "model" ? " is-active" : ""), href: BASE + "/forms/model/" + (by === "model" && route.id ? route.id : models[0].id), "aria-current": by === "model" ? "page" : null }, "One phrase, all forms"),
      el("a", { class: "chip-btn" + (by === "case" ? " is-active" : ""), href: BASE + "/forms/case/" + (by === "case" ? route.id : "nominative"), "aria-current": by === "case" ? "page" : null }, "One case, all phrases")
    ]);
    view.appendChild(modeSwitch);
    if (by === "case") return formsByCase(view, route.id, models);
    const m = route.id ? model(route.id) : models[0];
    if (!m) { view.appendChild(missing("There is no such model phrase.")); return; }

    view.appendChild(el("nav", { class: "lab-model-pick", "aria-label": "Model phrases" }, el("ul", { class: "lab-signals" }, models.map(function (x) {
      const on = x.id === m.id;
      return el("li", null, el("a", { class: "chip-btn" + (on ? " is-active" : ""), href: BASE + "/forms/model/" + x.id, "aria-current": on ? "page" : null, lang: LM.APP.targetLang, text: x.singular.nominative }));
    }))));
    view.appendChild(el("section", { class: "card lab-forms", "aria-labelledby": "lab-forms-title" }, [
      el("h2", { class: "lab-card-title", id: "lab-forms-title" }, [target(m.singular.nominative), el("span", { class: "lab-forms-en", text: " – " + m.en })]),
      el("p", { class: "tool-note", text: "Gender: " + m.gender + ". The ending (what changes against the nominative) is underlined." }),
      el("div", { class: "md-table" }, el("div", { class: "md-table-wrap" }, el("table", { class: "lab-forms-table" }, [
        el("caption", { class: "visually-hidden", text: m.singular.nominative + ": all forms" }),
        el("thead", null, el("tr", null, [el("th", { scope: "col", text: "Case" }), el("th", { scope: "col", text: "Singular" }), el("th", { scope: "col", text: "Plural" })])),
        el("tbody", null, LM.lang.cases.map(function (c) {
          return el("tr", { class: caseClass(c.id) }, [
            el("th", { scope: "row" }, caseLink(c)),
            formCell(m.singular[c.id], m.singular.nominative, "Singular"),
            formCell(m.plural[c.id], m.plural.nominative, "Plural")
          ]);
        }))
      ])))
    ]));
  }

  function caseLink(c) {
    const inner = [el("span", { class: "case-dot", "aria-hidden": "true" }), el("span", { class: "case-badge-name", text: c.name }), el("span", { class: "case-badge-q", lang: LM.APP.targetLang, text: c.questions })];
    return caseCard(c.id) ? el("a", { class: "case-badge is-link", href: BASE + "/" + c.id }, inner) : el("span", { class: "case-badge" }, inner);
  }

  function formsByCase(view, id, models) {
    const c = caseInfo(id);
    if (!c) { view.appendChild(missing("There is no such case.")); return; }
    view.appendChild(el("nav", { class: "lab-model-pick", "aria-label": "Cases" }, el("ul", { class: "lab-signals" }, LM.lang.cases.map(function (x) {
      const on = x.id === c.id;
      return el("li", null, el("a", { class: "chip-btn case-chip " + caseClass(x.id) + (on ? " is-active" : ""), href: BASE + "/forms/case/" + x.id, "aria-current": on ? "page" : null }, [
        el("span", { class: "case-dot", "aria-hidden": "true" }), x.name
      ]));
    }))));
    view.appendChild(el("section", { class: "card lab-forms " + caseClass(c.id), "aria-labelledby": "lab-forms-title" }, [
      el("h2", { class: "lab-card-title", id: "lab-forms-title" }, [el("span", { class: "case-dot is-big", "aria-hidden": "true" }), c.name, " ", target(c.questions, "span", { class: "lab-card-pl" })]),
      el("div", { class: "md-table" }, el("div", { class: "md-table-wrap" }, el("table", { class: "lab-forms-table" }, [
        el("caption", { class: "visually-hidden", text: "All model phrases in the " + c.name }),
        el("thead", null, el("tr", null, [el("th", { scope: "col", text: "Model phrase" }), el("th", { scope: "col", text: "Singular" }), el("th", { scope: "col", text: "Plural" })])),
        el("tbody", null, models.map(function (m) {
          return el("tr", null, [
            el("th", { scope: "row" }, el("a", { href: BASE + "/forms/model/" + m.id }, [target(m.singular.nominative), el("span", { class: "lab-forms-en", text: " · " + m.en })])),
            formCell(m.singular[c.id], m.singular.nominative, "Singular"),
            formCell(m.plural[c.id], m.plural.nominative, "Plural")
          ]);
        }))
      ])))
    ]));
  }

  // =====================================================================
  // VIEW 6: ASPECT AND TENSE STRIP
  // =====================================================================

  function aspectColor(a) { return a === "perfective" ? "var(--aspect-perf)" : "var(--aspect-impf)"; }

  function renderAspect(view) {
    const a = lab().aspect;
    if (!a || !a.forms || !a.forms.length) { view.appendChild(el("p", { class: "tool-note", text: "The aspect strip is being written." })); return; }
    const compact = window.innerWidth < 640;
    const tl = K.timeline({
      compact: compact,
      lanes: a.forms.map(function (f) {
        return { label: f.name + (compact ? "" : " · " + f.aspect), color: aspectColor(f.aspect), elements: f.scene.elements };
      }),
      ariaLabel: a.title + ". " + a.forms.map(function (f) { return f.name + ", " + f.aspect + ": " + f.scene.description; }).join(" ")
    });
    view.appendChild(el("section", { class: "card lab-aspect", "aria-labelledby": "lab-aspect-title" }, [
      el("h2", { class: "lab-card-title", id: "lab-aspect-title", text: a.title }),
      el("p", { class: "lab-card-summary", text: a.summary }),
      el("p", { class: "lab-aspect-pair" }, [
        el("span", { class: "aspect-key is-impf" }, [el("span", { class: "aspect-swatch", "aria-hidden": "true" }), "imperfective (a line: the process) ", target(a.verb.imperfective)]),
        el("span", { class: "aspect-key is-perf" }, [el("span", { class: "aspect-swatch", "aria-hidden": "true" }), "perfective (a diamond: the result) ", target(a.verb.perfective)]),
        el("span", { class: "lab-forms-en", text: " – " + a.verb.en })
      ]),
      el("figure", { class: "tl-figure" }, [tl.node, el("figcaption", { class: "visually-hidden", text: "The same forms as a list follow." })]),
      el("ol", { class: "lab-aspect-list" }, a.forms.map(function (f) {
        return el("li", { class: "lab-aspect-item is-" + (f.aspect === "perfective" ? "perf" : "impf") }, [
          el("p", { class: "lab-aspect-name" }, [el("strong", { text: f.name }), " · " + f.aspect + " ", target(f.form, "span", { class: "lab-aspect-form" }), f.level ? " " : null, f.level ? K.levelChip(f.level) : null]),
          el("p", { class: "tool-note", text: f.summary }),
          el("p", { class: "lab-use-en" }, [target(f.example.pl), K.speakButton(f.example.pl)]),
          el("p", { class: "lab-use-pl", text: f.example.en })
        ]);
      })),
      a.note ? el("p", { class: "tool-note", text: a.note }) : null
    ]));
    K.animateTimeline(tl.parts);
  }

  // =====================================================================
  // DRAWING
  // =====================================================================

  /** The map skeleton: the seven names are known in advance (LM.lang), so the grid draws at once. */
  function mapSkeleton() {
    return K.skeleton("Loading the lab…", el("ol", { class: "lab-case-grid", "aria-hidden": "true" }, LM.lang.cases.map(function (c) {
      return el("li", null, el("span", { class: "lab-tile is-skeleton " + caseClass(c.id) }, [
        el("span", { class: "lab-tile-name" }, [el("span", { class: "case-dot" }), c.name])
      ]));
    })));
  }

  function render(route) {
    route = route || parseRoute(location.hash) || { tab: "map" };
    const view = document.getElementById("view");
    view.className = "view tool-view lab-view";
    view.dataset.file = BASE;
    view.replaceChildren();
    document.title = LM.APP.lab.title + " · " + LM.APP.appTitle;
    header(route).forEach(function (n) { view.appendChild(n); });
    if (!usable()) {
      view.appendChild(route.tab === "map" ? mapSkeleton() : K.skeleton("Loading the lab…"));
      load().then(function (data) {
        const sk = view.querySelector(".lab-skeleton");
        if (!data) {
          if (sk) sk.remove();
          view.appendChild(el("p", { class: "tool-note", text: "The lab data could not be loaded (data/lab.js)." }));
          return;
        }
        const now = parseRoute(location.hash);
        if (now) render(now);
      });
      return;
    }
    if (route.tab === "map") renderMap(view);
    else if (route.tab === "card") renderCard(view, route.id);
    else if (route.tab === "pick") renderPick(view, route);
    else if (route.tab === "compare") renderCompare(view, route);
    else if (route.tab === "forms") renderForms(view, route);
    else renderAspect(view);
  }

  LM.lab = { BASE: BASE, RESERVED: RESERVED, parseRoute: parseRoute, render: render, load: load, withEnding: withEnding };
})(window.LM);
