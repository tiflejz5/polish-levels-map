/*
 * timer.js — LM.timer(opts): the countdown of the writing and speaking trainers (moved out of the old C1 module).
 *
 * State lives in a registry by key, so a timer keeps counting when the page is drawn again (e.g. profile switch).
 * opts: key, seconds, label, exam — exam: true shows whole minutes, seconds in the last 5 minutes, the last minute in red.
 * While a timer runs on screen the rest of the interface dims (html.focus-mode).
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const el = LM.utils.el;
  const timers = {};
  let ticker = null;

  function timerState(key, seconds) {
    if (!timers[key] || timers[key].total !== seconds) {
      timers[key] = { total: seconds, remaining: seconds, running: false, endAt: 0, view: null };
    }
    return timers[key];
  }

  function formatTime(t, exam) {
    const r = Math.max(0, t.remaining);
    const mmss = Math.floor(r / 60) + ":" + String(r % 60).padStart(2, "0");
    if (exam && r > 300) return Math.ceil(r / 60) + " min";
    return mmss;
  }

  function paint(t) {
    const v = t.view;
    if (!v) return;
    v.display.textContent = t.remaining <= 0 ? "Time is up" : formatTime(t, v.exam);
    const dangerFrom = v.exam ? 60 : 10;
    v.root.classList.toggle("is-danger", t.remaining > 0 && t.remaining <= dangerFrom);
    v.root.classList.toggle("is-over", t.remaining <= 0);
    v.root.classList.toggle("is-running", t.running);
    v.toggle.textContent = t.running ? "Pause" : (t.remaining < t.total && t.remaining > 0 ? "Resume" : "Start");
    v.toggle.disabled = t.remaining <= 0;
    updateFocus();
  }

  function updateFocus() {
    const any = Object.keys(timers).some(function (k) {
      const t = timers[k];
      return t.running && t.view && document.contains(t.view.root);
    });
    document.documentElement.classList.toggle("focus-mode", any);
  }

  function tick() {
    let any = false;
    Object.keys(timers).forEach(function (key) {
      const t = timers[key];
      if (!t.running) return;
      t.remaining = Math.max(0, Math.round((t.endAt - Date.now()) / 1000));
      if (t.remaining <= 0) {
        t.running = false;
        if (LM.markActivity) LM.markActivity(); // a timer that ran out = a finished session
      } else any = true;
      paint(t);
    });
    if (!any && ticker) { clearInterval(ticker); ticker = null; }
  }

  LM.timer = function (opts) {
    const t = timerState(opts.key, opts.seconds);
    const display = el("span", { class: "c1-timer-display", role: "timer", "aria-label": opts.label });
    const toggle = el("button", {
      type: "button",
      class: "btn btn-primary btn-small",
      onclick: function () {
        if (t.running) {
          t.remaining = Math.max(0, Math.round((t.endAt - Date.now()) / 1000));
          t.running = false;
        } else if (t.remaining > 0) {
          t.endAt = Date.now() + t.remaining * 1000;
          t.running = true;
          if (!ticker) ticker = setInterval(tick, 250);
        }
        paint(t);
      }
    }, "Start");
    const reset = el("button", {
      type: "button",
      class: "btn btn-secondary btn-small",
      onclick: function () { t.running = false; t.remaining = t.total; paint(t); }
    }, "Reset");
    const root = el("div", { class: "c1-timer" + (opts.exam ? " is-exam" : "") }, [
      opts.label ? el("span", { class: "c1-timer-label", text: opts.label }) : null,
      display,
      el("span", { class: "c1-timer-buttons" }, [toggle, reset])
    ]);
    t.view = { root: root, display: display, toggle: toggle, exam: !!opts.exam };
    if (t.running && !ticker) ticker = setInterval(tick, 250);
    paint(t);
    return root;
  };
})(window.LM);
