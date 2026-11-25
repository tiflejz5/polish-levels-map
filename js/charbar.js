/*
 * charbar.js — LM.charbar: the special-character bar under target-language inputs (spec 06 E3).
 *
 *   bar(opts)        a bar of buttons, one per letter of LM.APP.chars. A button inserts its letter at the cursor of
 *                    the last focused [data-charbar] field (or the nearest one before the bar), keeps the focus and
 *                    supports undo (insertText; fallback setRangeText). Shift + click or a long press: the capital.
 *                    opts.label: accessible name of the group.
 *   cycles()         { base letter: [marked forms…] } from LM.APP.chars grouped by LM.lang.stripMarks
 *   cycleHint()      "a → <a with ogonek>, z → … → …" for the shortcut panel, built from LM.APP.chars
 *   insert(field, text)  inserts text at the cursor of a field (undo kept where the browser allows)
 *
 * Desktop: in a [data-charbar] field Alt + base letter cycles the marked forms (Alt+A → the a with a mark; Alt+Z → the first
 * marked z, again → the second, again → z). AltGr (Ctrl+Alt, Polish keyboards) is left to the system. The view decides where a bar goes:
 * one bar may serve several fields (gaps of one item).
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const LONG_PRESS = 450; // ms
  let lastField = null;
  let lastCycle = null;   // { field, pos, base } of the last Alt + letter insertion
  let cache = null;

  function isField(n) {
    return !!(n && n.nodeType === 1 && n.hasAttribute("data-charbar") && /^(INPUT|TEXTAREA)$/.test(n.tagName));
  }

  function cycles() {
    if (cache) return cache;
    cache = {};
    (LM.APP.chars || []).forEach(function (ch) {
      const base = LM.lang.stripMarks(ch).toLowerCase();
      if (base === ch) return;
      (cache[base] = cache[base] || []).push(ch);
    });
    return cache;
  }

  function cycleHint() {
    const c = cycles();
    const keys = Object.keys(c);
    if (!keys.length) return "";
    const one = keys[0];
    const many = keys.find(function (k) { return c[k].length > 1; });
    const show = function (k) { return k + " → " + c[k].join(" → "); };
    return many && many !== one ? show(one) + ", " + show(many) : show(one);
  }

  /** Inserts text at the cursor (replacing a selection). insertText keeps the undo history and fires "input". */
  function insert(field, text) {
    if (!field || field.disabled || field.readOnly) return false;
    if (document.activeElement !== field) field.focus({ preventScroll: true });
    let done = false;
    try { done = document.execCommand && document.execCommand("insertText", false, text); } catch (e) { done = false; }
    if (!done) {
      const start = field.selectionStart == null ? field.value.length : field.selectionStart;
      const end = field.selectionEnd == null ? start : field.selectionEnd;
      field.setRangeText(text, start, end, "end");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return true;
  }

  /** The field a bar writes to: the last focused one inside the bar's item, else the nearest field before the bar. */
  function targetFor(bar) {
    const scope = bar.closest("[data-charbar-scope]") || bar.parentElement;
    if (lastField && document.contains(lastField) && !lastField.disabled && (!scope || scope.contains(lastField))) return lastField;
    const all = Array.prototype.filter.call(document.querySelectorAll("[data-charbar]"), function (f) { return isField(f) && !f.disabled; });
    let best = null;
    all.forEach(function (f) { if (f.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING) best = f; });
    return best || all[0] || null;
  }

  function bar(opts) {
    opts = opts || {};
    const el = LM.utils.el;
    const node = el("div", { class: "charbar", role: "group", "aria-label": opts.label || LM.APP.language + " letters" });
    (LM.APP.chars || []).forEach(function (ch) {
      let timer = null, longDone = false;
      const btn = el("button", {
        type: "button", class: "charbar-key", lang: LM.APP.targetLang, text: ch,
        "aria-label": "Insert " + ch, title: "Insert " + ch + " (Shift or a long press: " + ch.toUpperCase() + ")"
      });
      // Keep the focus (and the cursor) in the field
      btn.addEventListener("mousedown", function (e) { e.preventDefault(); });
      btn.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse") return;
        longDone = false;
        timer = setTimeout(function () { longDone = true; insert(targetFor(node), ch.toUpperCase()); }, LONG_PRESS);
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach(function (t) { btn.addEventListener(t, function () { clearTimeout(timer); }); });
      btn.addEventListener("contextmenu", function (e) { if (longDone) e.preventDefault(); });
      btn.addEventListener("click", function (e) {
        if (longDone) { longDone = false; return; }
        insert(targetFor(node), e.shiftKey ? ch.toUpperCase() : ch);
      });
      node.appendChild(btn);
    });
    return node;
  }

  document.addEventListener("focusin", function (e) { if (isField(e.target)) lastField = e.target; });

  // Alt + base letter: the marked forms in turn, then the base letter again
  document.addEventListener("keydown", function (e) {
    const f = e.target;
    if (!isField(f) || !e.altKey || e.ctrlKey || e.metaKey) return;
    const m = /^Key([A-Z])$/.exec(e.code || "");
    if (!m) return;
    const base = m[1].toLowerCase();
    const forms = cycles()[base];
    if (!forms) return;
    e.preventDefault();
    const upper = e.shiftKey;
    const seq = forms.concat(base).map(function (c) { return upper ? c.toUpperCase() : c; });
    const pos = f.selectionStart, end = f.selectionEnd;
    const prev = pos > 0 ? f.value.charAt(pos - 1) : "";
    const k = seq.indexOf(prev);
    if (pos === end && k !== -1 && lastCycle && lastCycle.field === f && lastCycle.pos === pos && lastCycle.base === base) {
      f.setSelectionRange(pos - 1, pos);
      insert(f, seq[(k + 1) % seq.length]);
    } else {
      insert(f, seq[0]);
    }
    lastCycle = { field: f, pos: f.selectionStart, base: base };
  });
  // Any other key ends a cycle (capture: runs before the handler above, which sets lastCycle again)
  document.addEventListener("keydown", function (e) {
    if (lastCycle && !e.altKey && e.key !== "Alt" && e.key !== "Shift") lastCycle = null;
  }, true);

  LM.charbar = { bar: bar, cycles: cycles, cycleHint: cycleHint, insert: insert };
})(window.LM);
