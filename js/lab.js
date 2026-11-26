/*
 * lab.js — LM.labKit: the parts of the lab that do not depend on its data (spec 09, ported from the tense lab of
 * the reference app). The Case Lab itself (routes, views, data) is js/lab-cases.js (LM.lab).
 *
 *   fill(node, list)                  replace children (null and false skipped)
 *   speakButton(text)                 listen button (LM.speech), null without speech support
 *   section(title, body)              a titled block of a card page
 *   levelChip(level)                  the A1…C2 chip
 *   tabs(items, active, label)        tab bar of links ({ id, label, icon, href }), aria-current on the active one
 *   notesButton(id, title, route)     the "My notes" button of an item (LM.notes), or null
 *   timeline(opts)                    SVG timeline drawing: { node, parts } (see below)
 *   timelineFigure(opts)              timeline + scene switch + text description, animated on entry
 *   animateTimeline(parts) / animateAll(root)
 *   treeView(opts)                    decision-tree view (questions → options → next | result)
 *   comparePicker(opts)               two selects "first / second item"
 *   fillPractice(box, opts)           exercise sets by topic ids and set tags, mixes and topic pages
 *   loader(path, usable)              lazy loader of a generated data file; prefetch on hover / idle time
 *   skeleton(label, bars)             a loading skeleton
 *   focusLater(selector)              focus after the next render (keeps the scroll position)
 *
 * Timeline: coordinates -1 (distant past) … 0 (now) … 1 (future). One or more lanes share one axis scale and one
 * "now" line. role="img" + aria-label = the description, the same description is visible as text (figcaption).
 * Elements: point, range, open-left, open-right, repeat, result, marker. GSAP DrawSVG animation on entry, none with
 * reduced motion.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const U = LM.utils;
  const el = U.el;
  const SVG_NS = "http://www.w3.org/2000/svg";

  function fill(node, list) { node.replaceChildren(); U.appendChildren(node, list); }

  // =====================================================================
  // SMALL PARTS
  // =====================================================================

  function speakButton(text) {
    if (!LM.speech || LM.speech.status() === "unsupported") return null;
    return el("button", {
      type: "button", class: "btn btn-link lab-speak listen-btn", "aria-label": "Listen: " + text, "data-tooltip": "Listen",
      onclick: function () { LM.speech.speak(text); }
    }, LM.icon("volume-2", { size: 18 }));
  }

  function section(title, body, extra) {
    return el("section", { class: "lab-block" + (extra ? " " + extra : "") }, [el("h3", { class: "lab-block-title", text: title }), body]);
  }

  function levelChip(level) { return el("span", { class: "chip is-level lvl-" + level, text: level }); }

  function tabs(items, active, label) {
    return el("nav", { class: "lab-tabs", "aria-label": label }, el("ul", null, items.map(function (it) {
      const on = it.id === active;
      return el("li", null, el("a", { class: "lab-tab" + (on ? " is-active" : ""), href: it.href, "aria-current": on ? "page" : null }, [
        el("span", { "aria-hidden": "true" }, LM.icon(it.icon, { size: 18 })),
        el("span", { text: it.label })
      ]));
    })));
  }

  function notesButton(id, title, route) {
    return LM.notes ? LM.notes.button(id, { title: title, route: route }) : null;
  }

  function focusLater(selector) {
    setTimeout(function () { const n = document.querySelector(selector); if (n) n.focus({ preventScroll: true }); }, 0);
  }

  // =====================================================================
  // TIMELINE (SVG)
  // =====================================================================

  function svg(tag, attrs, children) {
    const n = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, String(attrs[k])); });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function text(x, y, value, attrs) {
    return svg("text", Object.assign({ x: x, y: y }, attrs || {}), [document.createTextNode(value)]);
  }

  let gradientSeq = 0;

  /**
   * Draws a timeline. opts:
   *   lanes     [{ label?, color, elements: [...] }] — one lane = the classic single axis with labels above it;
   *             several lanes share the x scale and the "now" line, each lane name sits above its line and the
   *             element labels below it
   *   compact   440 units wide instead of 800 (phones, comparison columns: labels stay ≥ about 12 px)
   *   ariaLabel the description for role="img"
   * Returns { node, parts: { axis: [lines], marks: [], labels: [], now } }.
   */
  function timeline(opts) {
    const compact = !!opts.compact;
    const W = compact ? 440 : 800, LEFT = compact ? 36 : 46, RIGHT = W - LEFT;
    const xOf = function (v) { return LEFT + (Math.max(-1, Math.min(1, v)) + 1) / 2 * (RIGHT - LEFT); };
    const lanes = opts.lanes || [];
    const multi = lanes.length > 1;
    const charW = compact ? 9.4 : 7.6;
    const parts = { axis: [], marks: [], labels: [], now: null };
    const defs = svg("defs");
    const body = svg("g");

    // Single lane: label rows grow upwards; several lanes: fixed lane height, labels below the line
    let y = 0, topY = 0;
    const LANE_H = 74;
    lanes.forEach(function (lane, li) {
      const color = lane.color || "var(--accent)";
      const gid = "tl-grad-" + (++gradientSeq);
      defs.appendChild(svg("linearGradient", { id: gid, x1: "0", x2: "1", y1: "0", y2: "0" }, [
        svg("stop", { offset: "0", style: "stop-color:" + color + ";stop-opacity:0" }),
        svg("stop", { offset: "0.55", style: "stop-color:" + color + ";stop-opacity:1" })
      ]));
      defs.appendChild(svg("marker", { id: gid + "-arrow", viewBox: "0 0 10 10", refX: "6", refY: "5", markerWidth: "4", markerHeight: "4", orient: "auto" }, [
        svg("path", { d: "M0 0 L10 5 L0 10 z", style: "fill:" + color })
      ]));
      const AY = multi ? 40 + li * LANE_H : 120;
      y = AY;
      const marks = svg("g", { class: "tl-marks" });
      const labels = [];
      (lane.elements || []).forEach(function (e) {
        let g;
        if (e.kind === "point") {
          g = svg("circle", { cx: xOf(e.at), cy: AY, r: 9, class: "tl-point", style: "fill:" + color });
          if (e.label) labels.push({ x: xOf(e.at), text: e.label });
        } else if (e.kind === "range") {
          g = svg("line", { x1: xOf(e.from), x2: xOf(e.to), y1: AY, y2: AY, class: "tl-range", style: "stroke:" + color });
          if (e.label) labels.push({ x: (xOf(e.from) + xOf(e.to)) / 2, text: e.label });
        } else if (e.kind === "open-left") {
          g = svg("line", { x1: LEFT, x2: xOf(e.to), y1: AY, y2: AY, class: "tl-range", style: "stroke:url(#" + gid + ")" });
          if (e.label) labels.push({ x: (LEFT + xOf(e.to)) / 2 + 40, text: e.label });
        } else if (e.kind === "open-right") {
          g = svg("line", { x1: xOf(e.from), x2: RIGHT - 12, y1: AY, y2: AY, class: "tl-range", style: "stroke:" + color, "marker-end": "url(#" + gid + "-arrow)" });
          if (e.label) labels.push({ x: (xOf(e.from) + RIGHT) / 2, text: e.label });
        } else if (e.kind === "repeat") {
          const n = Math.max(2, e.count || 5);
          g = svg("g", { class: "tl-repeat" });
          for (let i = 0; i < n; i++) g.appendChild(svg("circle", { cx: xOf(e.from + (e.to - e.from) * i / (n - 1)), cy: AY, r: 6, style: "fill:" + color }));
          if (e.label) labels.push({ x: (xOf(e.from) + xOf(e.to)) / 2, text: e.label });
        } else if (e.kind === "result") {
          const x = xOf(e.at);
          g = svg("g", { class: "tl-result" }, [
            svg("rect", { x: x - 10, y: AY - 10, width: 20, height: 20, rx: 3, transform: "rotate(45 " + x + " " + AY + ")", style: "stroke:" + color }),
            svg("circle", { cx: x, cy: AY, r: 3.5, style: "fill:" + color })
          ]);
          if (e.label) labels.push({ x: x, text: e.label });
        } else if (e.kind === "marker") {
          const x = xOf(e.at);
          g = svg("line", { x1: x, x2: x, y1: AY - 16, y2: AY + 22, class: "tl-marker" });
          labels.push({ x: x, text: e.label, marker: true });
        }
        if (g) { marks.appendChild(g); parts.marks.push(g); }
      });

      // Labels in rows without overlap (width estimated from the number of characters)
      const rows = [];
      const labelNodes = labels.sort(function (a, b) { return a.x - b.x; }).map(function (l) {
        const w = l.text.length * charW + 14;
        let row = 0;
        while (rows[row] !== undefined && rows[row] > l.x - w / 2) row++;
        rows[row] = l.x + w / 2;
        const ly = multi ? AY + 28 + row * 20 : AY - 24 - row * 22;
        const x = Math.max(LEFT + w / 2 - 30, Math.min(RIGHT - w / 2 + 30, l.x));
        return text(x, ly, l.text, { class: "tl-label" + (l.marker ? " is-marker" : ""), "text-anchor": "middle" });
      });
      parts.labels = parts.labels.concat(labelNodes);
      if (!multi) topY = rows.length ? AY - 50 - (rows.length - 1) * 22 : AY - 44;

      const axis = svg("line", { x1: LEFT - 20, x2: RIGHT + 20, y1: AY, y2: AY, class: "tl-axis" });
      parts.axis.push(axis);
      body.appendChild(svg("g", { class: "tl-lane" }, [
        axis,
        multi && lane.label ? text(LEFT - 20, AY - 14, lane.label, { class: "tl-lane-label" }) : null,
        marks,
        svg("g", { class: "tl-labels" }, labelNodes)
      ]));
    });

    const bottom = multi ? y + LANE_H - 18 : y + 50;
    const nowTop = multi ? 8 : topY + 4;
    const now = svg("g", { class: "tl-now" }, [
      svg("line", { x1: xOf(0), x2: xOf(0), y1: nowTop, y2: bottom - 32, class: "tl-now-line" }),
      text(xOf(0), bottom - 12, "now", { "text-anchor": "middle", class: "tl-now-label" })
    ]);
    parts.now = now;
    const ends = svg("g", { class: "tl-ends" }, [
      text(LEFT - 20, bottom - 12, "past", { class: "tl-end" }),
      text(RIGHT + 20, bottom - 12, "future", { "text-anchor": "end", class: "tl-end" })
    ]);
    const vTop = multi ? 0 : topY;
    const root = svg("svg", {
      class: "tl-svg" + (compact ? " is-compact" : "") + (multi ? " is-lanes" : ""), viewBox: "0 " + vTop + " " + W + " " + (bottom - vTop),
      role: "img", "aria-label": opts.ariaLabel || "", focusable: "false"
    }, [defs, now, ends, body]);
    return { node: root, parts: parts };
  }

  /**
   * One item's timeline with a scene switch and a text description. opts:
   *   title, color, scenes [{ id, label, description, elements }], state (an object remembering the chosen scene
   *   under opts.key), compact, noSwitch, animate (default true).
   */
  function timelineFigure(opts) {
    const box = el("div", { class: "tl-block" });
    const state = opts.state || {};
    function paint(animateIt) {
      const scene = opts.scenes.find(function (s) { return s.id === state[opts.key]; }) || opts.scenes[0];
      const tl = timeline({
        lanes: [{ color: opts.color, elements: scene.elements }],
        compact: !!opts.compact || window.innerWidth < 640,
        ariaLabel: opts.title + " – " + scene.label + ": " + scene.description
      });
      const switcher = opts.scenes.length > 1 && !opts.noSwitch ? el("div", { class: "tl-scenes", role: "group", "aria-label": "Situations of use" }, opts.scenes.map(function (s) {
        const on = s.id === scene.id;
        return el("button", {
          type: "button", class: "chip-btn" + (on ? " is-active" : ""), "aria-pressed": on ? "true" : "false",
          onclick: function () { state[opts.key] = s.id; paint(true); const b = box.querySelector(".chip-btn.is-active"); if (b) b.focus(); }
        }, s.label);
      })) : null;
      fill(box, [
        switcher,
        el("figure", { class: "tl-figure" }, [
          tl.node,
          el("figcaption", { class: "tl-caption" }, [el("strong", { text: scene.label + ": " }), scene.description])
        ])
      ]);
      if (animateIt) animateTimeline(tl.parts);
    }
    paint(opts.animate !== false);
    return box;
  }

  function animateTimeline(parts) {
    if (!LM.motion) return;
    LM.motion.run(["DrawSVGPlugin"], function (gsap, reduce) {
      if (!gsap || reduce) return;
      const tl = gsap.timeline();
      tl.fromTo(parts.axis, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.6, ease: "power2.out", stagger: 0.08 });
      tl.from(parts.now, { autoAlpha: 0, duration: 0.25 }, 0.35);
      parts.marks.forEach(function (m, i) {
        if (m.tagName === "line") tl.fromTo(m, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.5, ease: "power2.out" }, 0.45 + i * 0.12);
        else tl.from(m, { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 50%", duration: 0.35, ease: "back.out(2)" }, 0.45 + i * 0.12);
      });
      if (parts.labels.length) tl.from(parts.labels, { autoAlpha: 0, y: 6, duration: 0.3, stagger: 0.06 }, 0.6);
    });
  }

  function animateAll(root) {
    const svgs = Array.prototype.slice.call(root.querySelectorAll(".tl-svg"));
    if (!svgs.length || !LM.motion) return;
    LM.motion.run(["DrawSVGPlugin"], function (gsap, reduce) {
      if (!gsap || reduce) return;
      svgs.forEach(function (s, i) {
        gsap.fromTo(s.querySelectorAll(".tl-axis"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.6, delay: i * 0.1, ease: "power2.out" });
        gsap.from(s.querySelectorAll(".tl-marks > *, .tl-labels > *"), { autoAlpha: 0, duration: 0.35, stagger: 0.08, delay: 0.4 + i * 0.1 });
      });
    });
  }

  // =====================================================================
  // DECISION TREE
  // =====================================================================

  /**
   * A decision tree: { start, nodes: { id: { question, help?, options: [{ label, next } | { label, result, why? }] } } }.
   * opts: tree, stack (array of { node, option }, kept by the caller), rerender(), renderResult(option) → nodes,
   * note (text under the card). Returns the card section.
   */
  function treeView(opts) {
    const tree = opts.tree, stack = opts.stack;
    const last = stack[stack.length - 1];
    const done = last && !last.option.next ? last.option : null;
    const nodeId = done ? null : (last ? last.option.next : tree.start);
    const node = nodeId ? tree.nodes[nodeId] : null;
    const again = function (sel) { opts.rerender(); focusLater(sel); };

    const crumbs = el("ol", { class: "lab-path", "aria-label": "Your choices" }, [el("li", { text: "Start" })].concat(stack.map(function (s) {
      return el("li", { text: s.option.label });
    })));
    const body = [];
    if (node) {
      body.push(el("h2", { class: "lab-question", id: "lab-q", tabindex: "-1", text: node.question }));
      if (node.help) body.push(el("p", { class: "tool-note", text: node.help }));
      body.push(el("ul", { class: "lab-answers", "aria-labelledby": "lab-q" }, node.options.map(function (o) {
        return el("li", null, el("button", {
          type: "button", class: "lab-answer",
          onclick: function () { stack.push({ node: nodeId, option: o }); again("#lab-q, .lab-result-title"); }
        }, [el("span", { lang: o.lang || null, text: o.label }), el("span", { "aria-hidden": "true" }, LM.icon("chevron-right", { size: 18 }))]));
      })));
    } else {
      Array.prototype.push.apply(body, opts.renderResult(done));
    }
    body.push(el("div", { class: "tool-actions" }, [
      stack.length ? el("button", { type: "button", class: "btn btn-secondary", onclick: function () { stack.pop(); again("#lab-q"); } }, LM.ui.withIcon("arrow-left", "Back")) : null,
      stack.length ? el("button", { type: "button", class: "btn btn-link", onclick: function () { stack.length = 0; again("#lab-q"); } }, LM.ui.withIcon("rotate-ccw", "Start again")) : null
    ]));
    return el("section", { class: "card lab-pick", "aria-live": "polite" }, [crumbs].concat(body));
  }

  // =====================================================================
  // COMPARE
  // =====================================================================

  /** Two selects. opts: items [{ id, label }], a, b, onChange(a, b). */
  function comparePicker(opts) {
    const select = function (id, value, label) {
      const s = el("select", { class: "field lab-select", id: id, onchange: function () {
        opts.onChange(document.getElementById("lab-a").value, document.getElementById("lab-b").value);
      } }, opts.items.map(function (it) { return el("option", { value: it.id, text: it.label }); }));
      s.value = value;
      return el("div", { class: "lab-select-wrap" }, [el("label", { class: "field-label", for: id, text: label }), s]);
    };
    return el("div", { class: "card lab-compare-pick" }, [
      select("lab-a", opts.a, opts.labelA || "First item"),
      el("span", { class: "lab-vs", "aria-hidden": "true" }, LM.icon("arrow-left-right", { size: 20 })),
      select("lab-b", opts.b, opts.labelB || "Second item")
    ]);
  }

  // =====================================================================
  // PRACTICE
  // =====================================================================

  /**
   * Exercise sets linked to an item: sets of its topics and sets tagged with one of its set tags (the sets index
   * lists the tags of each set's items), mixes with these topics and the topic pages. opts: topicIds, setTags, empty.
   */
  function fillPractice(box, opts) {
    if (!LM.exercises) { box.replaceChildren(); return; }
    const ids = opts.topicIds || [], tags = opts.setTags || [];
    LM.exercises.loadIndex().then(function (index) {
      const setIds = [];
      const add = function (s) { if (setIds.indexOf(s) === -1) setIds.push(s); };
      ids.forEach(function (n) { (index.topics[n] || []).forEach(add); });
      Object.keys(index.sets).forEach(function (s) {
        const set = index.sets[s];
        if (!set.exam && (set.tags || []).some(function (t) { return tags.indexOf(t) !== -1; })) add(s);
      });
      const mixes = index.mixes.filter(function (m) { return m.topics.some(function (x) { return ids.indexOf(x) !== -1; }); });
      const pages = ids.map(LM.exercises.topicInfo).filter(Boolean);
      fill(box, [
        setIds.length ? el("div", { class: "ex-set-grid" }, setIds.map(function (s) { return index.sets[s]; }).filter(Boolean).map(LM.exercises.setCard))
          : el("p", { class: "tool-note", text: opts.empty || "Exercise sets for this item are still being written." }),
        mixes.length ? el("p", { class: "lab-practice-links" }, mixes.map(function (m) {
          return el("a", { class: "btn btn-secondary", href: LM.exercises.BASE + "/mix/" + m.id }, LM.ui.withIcon("shuffle", "Mixed set: " + m.title));
        })) : null,
        pages.length ? el("p", { class: "lab-practice-links" }, pages.map(function (p) {
          return el("a", { class: "wiki-link wiki-chip lvl-" + p.level, href: p.href }, [LM.icon("notebook-text", { size: 14 }), el("span", { class: "wiki-chip-level", text: p.level }), el("span", { class: "wiki-chip-text", text: p.title })]);
        })) : null
      ]);
    });
  }

  // =====================================================================
  // LOADING
  // =====================================================================

  /**
   * A lazy loader of a generated data file. usable() returns the data or null. The file is fetched ahead on
   * browser idle time and when a pointer or focus comes near a link to base (not in data saver mode).
   */
  function loader(path, usable, base) {
    let pending = null;
    function load() {
      const ready = usable();
      if (ready) return Promise.resolve(ready);
      if (!pending) {
        pending = LM.loadModule(path).then(usable, function (e) { console.warn(e.message + " — run: npm run build"); pending = null; return null; });
      }
      return pending;
    }
    function bind() {
      const near = function (e) { const a = e.target && e.target.closest && e.target.closest('a[href^="' + base + '"]'); if (a) load(); };
      ["pointerover", "focusin", "touchstart"].forEach(function (type) { document.addEventListener(type, near, { passive: true }); });
      const conn = navigator.connection;
      if (conn && conn.saveData) return;
      const idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 2500); };
      idle(load, { timeout: 5000 });
    }
    if (base) {
      if (document.readyState === "complete") bind();
      else window.addEventListener("load", bind, { once: true });
    }
    return load;
  }

  function skeleton(label, content) {
    return el("div", { class: "lab-skeleton", "aria-busy": "true" }, [
      el("p", { class: "visually-hidden", role: "status", text: label }),
      content || el("div", { "aria-hidden": "true" }, [
        el("div", { class: "lab-skel-bar lab-skel-wide" }),
        el("div", { class: "lab-skel-bar" }),
        el("div", { class: "lab-skel-bar lab-skel-short" })
      ])
    ]);
  }

  LM.labKit = {
    fill: fill, speakButton: speakButton, section: section, levelChip: levelChip, tabs: tabs, notesButton: notesButton,
    focusLater: focusLater, timeline: timeline, timelineFigure: timelineFigure, animateTimeline: animateTimeline,
    animateAll: animateAll, treeView: treeView, comparePicker: comparePicker, fillPractice: fillPractice,
    loader: loader, skeleton: skeleton
  };
})(window.LM);
