/*
 * callouts.js — highlighted sections (callouts) and polishing of Markdown content
 * (DESIGN.md, section 3.7). The .md files stay unchanged: sections are recognized
 * by the TEXT of the heading (## H2 or a bold subheading “**Key ideas**”).
 * The headings are the fixed English headings of spec 07 §1 (topic pages) and §2 (level summaries).
 *
 * A new callout = a new entry in CALLOUT_RULES (a pattern for the heading text,
 * type → class .callout-<type> in css/style.css, a Lucide icon from assets/icons.js).
 *
 * Also: tables in a scrolling container with “there is more” shadows.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  // Order matters: the first matching rule wins.
  const CALLOUT_RULES = [
    { match: new RegExp("^(" + escapeRe(LM.APP.mistakesHeading) + "|the most common trap|watch out)", "i"), type: "trap", icon: "triangle-alert", label: "Watch out" },
    { match: /^real life vs exam/i, type: "real-exam", icon: "arrow-left-right", label: "Real life vs exam" },
    { match: /^(key ideas|what you can do at this level)/i, type: "key", icon: "sparkles", label: "Key points" },
    { match: /^(what next|are you ready)/i, type: "next", icon: "map-pin", label: "Next" },
    { match: /^(examples|key phrases|word partners)/i, type: "examples", icon: "list-checks", label: "Examples" }
  ];

  function ruleFor(text) {
    const t = String(text || "").trim();
    return CALLOUT_RULES.find(function (r) { return r.match.test(t); }) || null;
  }

  function decorate(box, heading, rule) {
    box.classList.add("callout", "callout-" + rule.type);
    if (heading && !heading.querySelector(".callout-icon")) {
      heading.classList.add("callout-title");
      heading.insertBefore(LM.utils.el("span", { class: "callout-icon", "aria-hidden": "true" }, LM.icon(rule.icon, { size: 20 })), heading.firstChild);
    }
  }

  /** Callouts in the tree from LM.markdown.render (## sections and **…** subheadings). */
  function apply(root) {
    if (!root) return;
    // 1. ## sections (the whole section is the callout)
    root.querySelectorAll(".md-section").forEach(function (section) {
      if (section.classList.contains("is-answers")) return;
      const h2 = section.querySelector(":scope > h2");
      const rule = h2 && ruleFor(h2.textContent);
      if (rule) decorate(section, h2, rule);
    });
    // 2. **…** subheadings (callout = the subheading + paragraphs up to the next subheading / heading)
    root.querySelectorAll("p.md-subhead").forEach(function (sub) {
      const rule = ruleFor(sub.textContent);
      if (!rule || sub.closest(".callout")) return;
      const box = LM.utils.el("div");
      sub.parentNode.insertBefore(box, sub);
      let n = sub;
      while (n && !(n !== sub && (n.matches && (n.matches("p.md-subhead") || /^H[1-3]$/.test(n.nodeName))))) {
        const next = n.nextElementSibling;
        box.appendChild(n);
        n = next;
      }
      decorate(box, sub, rule);
    });
    enhanceTables(root);
    root.querySelectorAll(".callout-real-exam").forEach(enhanceRealExam);
  }

  /** Exam codes of the "Exam" column → the registry entry (code, label, accent); unknown code → null. */
  function examByCode(code) {
    const list = (LM.EXAM_REGISTRY && LM.EXAM_REGISTRY.exams) || [];
    return list.find(function (e) { return String(e.code).toUpperCase() === String(code).toUpperCase(); }) || null;
  }

  /**
   * “Real life vs exam” (spec v6 16, section 2.3): codes in the third column → chips with the exam colour, text
   * (short name + full name for screen readers) and a link to the exam page; cells get labels for the card view on phones.
   */
  function enhanceRealExam(box) {
    const table = box.querySelector("table");
    if (!table) return;
    const labels = Array.prototype.map.call(table.querySelectorAll("thead th"), function (th) { return th.textContent.trim(); });
    table.querySelectorAll("tbody tr").forEach(function (tr) {
      const cells = tr.querySelectorAll("td");
      Array.prototype.forEach.call(cells, function (td, i) { if (labels[i]) td.setAttribute("data-label", labels[i]); });
      const last = cells[2];
      if (!last || last.querySelector(".exam-chip")) return;
      const codes = last.textContent.split("·").map(function (c) { return c.trim(); }).filter(Boolean);
      if (!codes.length || !codes.every(examByCode)) return;
      last.classList.add("exam-chips");
      last.replaceChildren.apply(last, codes.map(function (code) {
        const e = examByCode(code);
        const chip = LM.utils.el("a", { class: "exam-chip", href: "#/exams/" + e.id, style: "--exam: " + (e.accent || "var(--accent)"), title: "Useful for: " + e.label }, [
          LM.utils.el("span", { "aria-hidden": "true", text: e.code }),
          LM.utils.el("span", { class: "visually-hidden", text: e.label })
        ]);
        return chip;
      }));
    });
    const wrap = table.closest(".md-table-wrap");
    if (wrap) wrap.setAttribute("aria-label", "Real life vs exam: sentences from real life and exam-style tasks");
  }

  /**
   * Tables: the .md-table-wrap container scrolls horizontally; an overlay with shadows
   * shows that there is more content on the left / right (classes .has-left / .has-right).
   */
  function enhanceTables(root) {
    root.querySelectorAll(".md-table-wrap").forEach(function (wrap) {
      if (wrap.parentNode.classList.contains("md-table")) return;
      const frame = LM.utils.el("div", { class: "md-table" });
      wrap.parentNode.insertBefore(frame, wrap);
      frame.appendChild(wrap);
      wrap.setAttribute("tabindex", "0"); // keyboard scrolling
      wrap.setAttribute("role", "region");
      const head = wrap.querySelector("th");
      wrap.setAttribute("aria-label", "Table" + (head ? ": " + head.textContent.trim() : "") + " (scrolls horizontally)");
      const update = function () {
        const max = wrap.scrollWidth - wrap.clientWidth;
        frame.classList.toggle("has-left", wrap.scrollLeft > 2);
        frame.classList.toggle("has-right", max > 2 && wrap.scrollLeft < max - 2);
        if (max <= 2) { wrap.removeAttribute("tabindex"); } else { wrap.setAttribute("tabindex", "0"); }
      };
      wrap.addEventListener("scroll", update, { passive: true });
      if (window.ResizeObserver) new ResizeObserver(update).observe(wrap);
      requestAnimationFrame(update);
    });
  }

  LM.callouts = { RULES: CALLOUT_RULES, apply: apply, ruleFor: ruleFor };
})(window.LM);
