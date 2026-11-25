/*
 * speech.js — LM.speech: reading target-language text aloud with the Web Speech API (spec 05 §4, spec 06 E5).
 * The only place that touches speechSynthesis. Voice codes and the default rate come from LM.APP.speech.
 *
 *   status()                    "unsupported" | "loading" | "ready" | "none" (no voice of the target language)
 *   available()                 a target-language voice exists (status() === "ready")
 *   voices()                    matching voices, best first (order of LM.APP.speech.voices, local voices first)
 *   speak(text, opts)           reads one text; opts { rate, onend }. The same text again while it is being read
 *                               stops it (a toggle); another text replaces it. Gaps (___) are read as a short pause.
 *                               Returns true when reading started.
 *   speakScript(lines, opts)    a dialogue "A: … / B: …" (array or text with line breaks): speaker labels are not
 *                               read, two voices take turns when there are two; opts { rate, onend, pause }
 *   stop()                      stops reading (onend is not called)
 *   speaking()                  is something being read now
 *   onChange(fn)                fn(status) after the voice list changes; returns an unsubscribe function
 *   helpNode()                  "No <language> voice found on this device" with the "How to add one" text
 *
 * getVoices() is empty until "voiceschanged"; when it stays empty, the status turns "none" after a short wait.
 * <html data-voice="…"> mirrors status(), so CSS can hide listen buttons without a voice.
 * Only target-language text is passed in by the callers (never English instructions).
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const LOAD_WAIT = 2000;       // ms without voices before "none"
  const LINE_PAUSE = 450;       // ms between lines of a dialogue
  const GAP = /_{2,}/g;
  const LABEL = /^(\p{Lu}[\p{L}\p{N}]*(?: [\p{Lu}\p{N}][\p{L}\p{N}]*)?):\s*(.*)$/u;

  const listeners = [];
  let state = null;             // computed status
  let waited = false;           // LOAD_WAIT passed
  let current = null;           // { token, text }

  function synth() {
    return typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function" ? window.speechSynthesis : null;
  }

  function config() { return (LM.APP && LM.APP.speech) || { voices: [], rate: 0.9 }; }

  function allVoices() {
    const s = synth();
    if (!s) return [];
    try { return s.getVoices() || []; } catch (e) { return []; }
  }

  /** Voices whose lang starts with one of the configured codes (LM.APP.speech.voices, in order), local voices first. */
  function pickVoices(list) {
    const out = [];
    (config().voices || []).forEach(function (code) {
      const c = String(code).toLowerCase();
      const hits = (list || []).filter(function (v) {
        const l = String(v.lang || "").toLowerCase().replace("_", "-");
        return (l === c || l.indexOf(c + "-") === 0) && out.indexOf(v) === -1;
      });
      hits.sort(function (a, b) { return (b.localService ? 1 : 0) - (a.localService ? 1 : 0); });
      hits.forEach(function (v) { out.push(v); });
    });
    return out;
  }

  function voices() { return pickVoices(allVoices()); }

  function compute() {
    if (!synth()) return "unsupported";
    const all = allVoices();
    if (!all.length) return waited ? "none" : "loading";
    return pickVoices(all).length ? "ready" : "none";
  }

  function refresh() {
    const next = compute();
    if (next === state) return;
    state = next;
    try { document.documentElement.setAttribute("data-voice", state); } catch (e) { /* no document (unit tests) */ }
    listeners.slice().forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } });
  }

  function status() { if (state === null) refresh(); return state; }
  function available() { return status() === "ready"; }
  function speaking() { return !!current; }

  function onChange(fn) {
    listeners.push(fn);
    return function () { const i = listeners.indexOf(fn); if (i !== -1) listeners.splice(i, 1); };
  }

  function stop() {
    const s = synth();
    if (current) current.token.cancelled = true;
    current = null;
    if (s) { try { s.cancel(); } catch (e) { /* ignore */ } }
  }

  function clean(text) { return String(text == null ? "" : text).replace(GAP, " … ").replace(/\s+/g, " ").trim(); }

  /** One utterance with the given voice (or only the language code while voices are still loading). */
  function utterance(text, voice, rate) {
    const u = new window.SpeechSynthesisUtterance(text);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = (config().voices || [""])[0];
    u.rate = rate || config().rate || 0.9;
    return u;
  }

  function canStart() { const st = status(); return st === "ready" || st === "loading"; }

  function speak(text, opts) {
    opts = opts || {};
    const s = synth();
    const t = clean(text);
    if (!s || !t || !canStart()) return false;
    if (current && current.text === t) { stop(); return false; }
    stop();
    const token = { cancelled: false };
    current = { token: token, text: t };
    const u = utterance(t, voices()[0] || null, opts.rate);
    u.onend = u.onerror = function () {
      if (token.cancelled) return;
      current = null;
      if (opts.onend) opts.onend();
    };
    s.speak(u);
    return true;
  }

  function speakScript(lines, opts) {
    opts = opts || {};
    const s = synth();
    const list = (Array.isArray(lines) ? lines : String(lines || "").split("\n")).map(function (l) { return String(l).trim(); }).filter(Boolean);
    if (!s || !list.length || !canStart()) return false;
    stop();
    const vs = voices();
    const token = { cancelled: false };
    current = { token: token, text: list.join("\n") };
    // "A" / "B" keep their voices; other labels ("Anna:", "Speaker 2:") take the voices in turn as they appear
    const order = [];
    function voiceFor(label) {
      if (!label || !vs.length) return vs[0] || null;
      let k;
      if (label === "A" || label === "B") k = label === "B" ? 1 : 0;
      else { if (order.indexOf(label) === -1) order.push(label); k = order.indexOf(label) % 2; }
      return vs[k && vs.length > 1 ? 1 : 0];
    }
    let i = 0;
    function next() {
      if (token.cancelled) return;
      if (i >= list.length) { current = null; if (opts.onend) opts.onend(); return; }
      const m = LABEL.exec(list[i]);
      const text = clean(m ? m[2] : list[i]);
      if (!text) { i++; next(); return; }
      const u = utterance(text, voiceFor(m && m[1]), opts.rate);
      const wait = opts.pause == null ? LINE_PAUSE : opts.pause;
      u.onend = function () { i++; if (wait) setTimeout(next, wait); else next(); };
      u.onerror = function () { i++; setTimeout(next, 50); };
      s.speak(u);
    }
    next();
    return true;
  }

  /** "No Polish voice found on this device" and a short "How to add one" (spec 05 §4, spec 08 §6). */
  function helpNode() {
    const el = LM.utils.el;
    return el("div", { class: "voice-help", role: "note" }, [
      el("p", { class: "voice-help-title" }, [LM.icon ? LM.icon("volume-x", { size: 16 }) : null, " No " + LM.APP.language + " voice found on this device."]),
      el("details", { class: "voice-help-more" }, [
        el("summary", { text: "How to add one" }),
        el("ul", null, [
          el("li", null, [el("strong", { text: "Windows: " }), "Settings → Time & language → Speech → Add voices, then choose " + LM.APP.language + "."]),
          el("li", null, [el("strong", { text: "macOS: " }), "System Settings → Accessibility → Spoken Content → System voice → Manage voices."]),
          el("li", null, [el("strong", { text: "Android and iOS: " }), "a " + LM.APP.language + " voice is built in; check the text-to-speech settings if it is missing."]),
          el("li", null, [el("strong", { text: "Chrome: " }), "online, Chrome often offers its own " + LM.APP.language + " voice."])
        ]),
        el("p", { class: "tool-note", text: "Reload the page after adding a voice. Everything works without one: listening items show the transcript and dictation is skipped." })
      ])
    ]);
  }

  // Voices arrive asynchronously
  (function init() {
    const s = synth();
    if (s) {
      try {
        if (typeof s.addEventListener === "function") s.addEventListener("voiceschanged", refresh);
        else s.onvoiceschanged = refresh;
      } catch (e) { /* ignore */ }
    }
    const t = setTimeout(function () { waited = true; refresh(); }, LOAD_WAIT);
    if (t && t.unref) t.unref(); // Node (unit tests): do not keep the process alive
    refresh();
  })();

  LM.speech = {
    status: status, available: available, voices: voices, speak: speak, speakScript: speakScript, stop: stop,
    speaking: speaking, onChange: onChange, helpNode: helpNode,
    // for the unit tests: re-read the voices now (e.g. after replacing window.speechSynthesis)
    _refresh: function (done) { waited = !!done; state = null; refresh(); return state; },
    _pickVoices: pickVoices
  };
})(window.LM);
