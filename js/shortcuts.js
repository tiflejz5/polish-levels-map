/*
 * shortcuts.js — the keyboard shortcut panel (“?”) and the shared sentence listening (pack v8, S5).
 *
 *   LM.shortcuts.open()        panel with the shortcuts of the current view (sets, review session, exams, topic pages)
 *   LM.shortcuts.speak(text)   reads a sentence aloud in the target language (LM.speech) with a message when there is no voice;
 *                              a second call while reading stops it
 *
 * Shortcuts do not work in text fields (except Enter, which the views handle themselves).
 * Sets: js/exercise-engine.js, review session: js/cards.js, topic pages: js/handbook.js; here: “?”,
 * listening to a row in exam exercises (S, the last chosen row), S on a focused example of a topic page (spec 06 E5),
 * and Enter = “Check” in exam fields. The Alt + letter rows come from LM.charbar (js/charbar.js).
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const U = LM.utils;
  const el = U.el;

  const CONTEXTS = {
    items: {
      title: "Shortcuts in sets",
      rows: [
        ["1–4 or A–D", "choose an answer (with options A–H: the option's letter)"],
        ["Enter", "Check, and after checking Next"],
        ["S", "listen to the sentence (before checking, a gap is a pause)"],
        ["Tab", "next gap or table cell"],
        ["Alt + letter", "CHARS"],
        ["Backspace", "take back the last word (putting words in order)"],
        ["Ctrl + Enter", "Check in a multi-line field"],
        ["?", "this list"]
      ]
    },
    session: {
      title: "Shortcuts in a review session",
      rows: [
        ["Space", "show the answer, then “Good”"],
        ["1–4", "ratings: Again, Hard, Good, Easy"],
        ["S", "listen to the sentence on the card (a gap is a pause)"],
        ["Alt + letter", "CHARS"],
        ["Z", "undo the last rating"],
        ["W", "suspend the card"],
        ["B", "put the card off until tomorrow"],
        ["E", "edit the card (your own decks)"],
        ["?", "this list"]
      ]
    },
    exam: {
      title: "Shortcuts in exercises",
      rows: [
        ["Enter", "Check (in an answer field)"],
        ["Tab", "next field"],
        ["Alt + letter", "CHARS"],
        ["S", "listen to the last chosen sentence (outside a text field)"],
        ["?", "this list"]
      ]
    },
    page: {
      title: "Shortcuts on a topic page",
      rows: [
        ["[", "previous topic of the level"],
        ["]", "next topic of the level"],
        ["S", "listen to the focused example (a table row or a dialogue)"],
        ["/", "search"],
        ["Ctrl + K", "search"],
        ["?", "this list"]
      ]
    },
    general: {
      title: "Shortcuts",
      rows: [
        ["/", "search"],
        ["Ctrl + K", "search"],
        ["?", "this list"]
      ]
    }
  };

  function contextNow() {
    if (document.querySelector(".ex-view .ex-card")) return "items";
    if (document.querySelector(".fc-session")) return "session";
    const v = LM.state && LM.state.view;
    if (v === "exam") return "exam";
    if (v === "page") return "page";
    return "general";
  }

  function typing(t) {
    return !!(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable));
  }

  function dialogOpen() { return !!document.querySelector("dialog[open], .dialog-backdrop:not([hidden])"); }

  function open() {
    const c = CONTEXTS[contextNow()];
    const list = el("dl", { class: "kbd-list" });
    c.rows.forEach(function (r) {
      if (r[1] === "CHARS") {
        const hint = LM.charbar ? LM.charbar.cycleHint() : "";
        if (!hint) return;
        r = [r[0], LM.APP.language + " letters in a text field: " + hint];
      }
      list.appendChild(el("dt", null, r[0].split(" or ").map(function (k, i) {
        return [i ? " or " : null, el("kbd", { text: k })];
      })));
      list.appendChild(el("dd", { text: r[1] }));
    });
    return LM.dialogs.open({
      title: c.title, className: "dialog-shortcuts",
      body: [list, el("p", { class: "tool-note", text: "Shortcuts do not work in text fields (except Enter)." })],
      cancelValue: true,
      actions: [{ label: "Close", value: true, variant: "btn-primary", autofocus: true }]
    }).result;
  }

  // ---------- listening ----------

  /** Reads a sentence in the target language (LM.speech); true when it started. No synthesizer or no voice: a message. */
  function speak(text, rate) {
    const st = LM.speech.status();
    if (st === "unsupported" || st === "none") {
      if (LM.ui) LM.ui.toast({ text: st === "unsupported" ? "This browser has no speech synthesizer." : "No " + LM.APP.language + " voice found on this device. See Learning settings in the profile menu.", icon: "volume-x" });
      return false;
    }
    if (LM.speech.speaking()) { LM.speech.stop(); return true; }
    return LM.speech.speak(text, { rate: rate });
  }

  // ---------- exam exercises: text fields in rows ----------

  let lastRow = null;

  function c1View() { return document.querySelector("#view .c1-tr-item, #view .c1-gap-item, #view [class*='c1-'][class*='-item']"); }

  /** Text of a row: without the key word and the feedback; answer fields as a pause (or the typed value). */
  function rowText(node) {
    let out = "";
    (function walk(n) {
      if (n.nodeType === 3) { out += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      if (/c1-(feedback|answer|explanation|journal|keyword|tr-key)/.test(n.className || "")) return;
      if (n.tagName === "INPUT" || n.tagName === "TEXTAREA") { out += n.value ? " " + n.value + " " : " … "; return; }
      for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
      if (n.tagName === "P" || n.tagName === "LI") out += " ";
    })(node);
    return out.replace(/\s+/g, " ").replace(/\s+([,.;!?])/g, "$1").trim();
  }

  document.addEventListener("focusin", function (e) {
    const li = e.target.closest && e.target.closest("#view li");
    if (li && c1View() && li.querySelector("input[type=text], textarea")) lastRow = li;
  });

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    // Enter in an answer field of an exam exercise = “Check” (sets from the engine handle it themselves)
    if (e.key === "Enter" && typing(t) && t.tagName === "INPUT" && !document.querySelector(".ex-view .ex-card") && c1View() && t.closest("#view li")) {
      const btn = Array.prototype.find.call(document.querySelectorAll("#view button.btn-primary"), function (b) { return b.textContent.trim() === "Check" && !b.disabled; });
      if (btn) { e.preventDefault(); btn.click(); }
      return;
    }
    if (typing(t) || dialogOpen()) return;
    if (e.key === "?") { e.preventDefault(); open(); return; }
    if ((e.key === "s" || e.key === "S") && c1View() && lastRow && document.contains(lastRow) && !document.querySelector(".ex-view .ex-card")) {
      const text = rowText(lastRow);
      if (text) { e.preventDefault(); speak(text); }
      return;
    }
    // S on a topic page: the focused example (a row of the Polish table or a blockquote with a listen button)
    if ((e.key === "s" || e.key === "S") && LM.markdown && LM.markdown.listenFor) {
      const host = LM.markdown.listenFor(document.activeElement);
      if (host) { e.preventDefault(); LM.markdown.listen(host); }
    }
  });

  LM.shortcuts = { open: open, speak: speak, contextNow: contextNow, CONTEXTS: CONTEXTS };
})(window.LM);
