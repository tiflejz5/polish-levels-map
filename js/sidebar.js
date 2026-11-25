/*
 * sidebar.js — behaviour of the left sidebar (DESIGN.md, section 3.1).
 *
 * States:
 *   narrow rail (72 px)  — default from 768 px width,
 *   expanded (288 px)    — over the content (a layer outside the flow, with a shadow),
 *                          on mouse hover (delay 120 ms / closing
 *                          250 ms), on keyboard focus or after a tap on
 *                          the expand button (tablet),
 *   pinned               — full sidebar all the time, the content moves aside
 *                          (html[data-sidebar="pinned"]),
 *   drawer (< 768 px)    — the “Menu” button in the top bar (js/app.js).
 *
 * Pinning is saved for the whole device (not in the profile or the export):
 *   plm.sidebar = { version: 1, pinned: true|false }
 * A script in <head> (index.html) already reads the state, so the content does not jump.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const KEY = LM.APP.storagePrefix + "sidebar"; // device-wide key (registry: js/profile-data.js)
  const OPEN_DELAY = 120;   // ms — ignore an accidental mouse pass
  const CLOSE_DELAY = 250;  // ms — time for the cursor to come back

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const narrow = window.matchMedia("(max-width: 767px)");

  let pinned = document.documentElement.getAttribute("data-sidebar") === "pinned";
  let expanded = false;
  let hovering = false;
  let held = false;            // an open “+N” popover (js/exam-core.js) keeps the sidebar expanded
  let focusSuppressed = false; // after Esc / collapsing with the button: focus in the sidebar does not expand it again
  let openTimer = null;
  let closeTimer = null;

  let sidebar, panel, toggleBtn, pinBtn;

  // ---------- Saving (try/catch: without storage access it works until the tab closes) ----------

  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify({ version: 1, pinned: pinned })); } catch (e) { /* not saved */ }
  }

  // ---------- Stan ----------

  function isOpen() { return pinned || expanded; }

  function setExpanded(value) {
    if (narrow.matches) value = false; // on a phone the sidebar is a drawer (body.nav-open)
    expanded = !!value;
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    sidebar.classList.toggle("is-expanded", isOpen());
    sidebar.classList.toggle("is-overlay", expanded && !pinned);
    toggleBtn.setAttribute("aria-expanded", isOpen() ? "true" : "false");
    const label = isOpen() ? "Collapse sidebar" : "Expand sidebar";
    toggleBtn.setAttribute("aria-label", label);
    toggleBtn.setAttribute("data-tooltip", label);
    toggleBtn.replaceChildren(LM.icon(isOpen() ? "panel-left-close" : "panel-left-open", { size: 20 }));
  }

  function paintPin() {
    document.documentElement.setAttribute("data-sidebar", pinned ? "pinned" : "rail");
    pinBtn.setAttribute("aria-pressed", pinned ? "true" : "false");
    pinBtn.querySelector(".sb-icon").replaceChildren(LM.icon(pinned ? "pin" : "pin-off", { size: 20 }));
    pinBtn.querySelector(".sb-label").textContent = pinned ? "Unpin sidebar" : "Pin sidebar";
    pinBtn.setAttribute("aria-label", pinned ? "Unpin sidebar" : "Pin sidebar");
    toggleBtn.hidden = pinned; // a pinned sidebar is always expanded
  }

  function togglePin() {
    pinned = !pinned;
    save();
    paintPin();
    // After unpinning the sidebar stays expanded if the cursor is over it (it collapses when the cursor leaves)
    setExpanded(!pinned && hovering && finePointer.matches);
  }

  // ---------- Events ----------

  function onEnter() {
    hovering = true;
    if (pinned || narrow.matches || !finePointer.matches) return;
    clearTimeout(closeTimer);
    if (!expanded) openTimer = setTimeout(function () { setExpanded(true); }, OPEN_DELAY);
  }

  function onLeave() {
    hovering = false;
    clearTimeout(openTimer);
    if (held || pinned || narrow.matches || !finePointer.matches || !expanded) return;
    closeTimer = setTimeout(function () {
      // Keyboard focus in the sidebar keeps it expanded
      const active = document.activeElement;
      if (panel.contains(active) && active.matches(":focus-visible") && !focusSuppressed) return;
      setExpanded(false);
    }, CLOSE_DELAY);
  }

  function onFocusIn(e) {
    if (pinned || narrow.matches || focusSuppressed || expanded) return;
    // Keyboard focus only (a mouse click / tap does not expand through focus)
    if (e.target.matches(":focus-visible")) setExpanded(true);
  }

  function onFocusOut(e) {
    if (panel.contains(e.relatedTarget)) return;
    focusSuppressed = false;
    if (!pinned && !hovering && !held && expanded) setExpanded(false);
  }

  function onKeyDown(e) {
    if (e.key === "Escape" && expanded && !pinned && !narrow.matches) {
      e.stopPropagation();
      focusSuppressed = true;
      setExpanded(false);
    }
  }

  /** A tap / click outside the expanded sidebar closes it (tablet). */
  function onPointerDownOutside(e) {
    if (!expanded || pinned || narrow.matches || held) return;
    if (!panel.contains(e.target)) setExpanded(false);
  }

  /** After going to another page: collapse an expanded (unpinned) sidebar unless the cursor is over it. */
  function afterNavigate() {
    if (!sidebar || pinned) return;
    if (expanded && !hovering) setExpanded(false);
  }

  function init() {
    sidebar = document.getElementById("sidebar");
    panel = document.getElementById("sb-panel");
    toggleBtn = document.getElementById("sb-toggle");
    pinBtn = document.getElementById("sb-pin");
    if (!sidebar || !panel) return;

    panel.addEventListener("mouseenter", onEnter);
    panel.addEventListener("mouseleave", onLeave);
    panel.addEventListener("focusin", onFocusIn);
    panel.addEventListener("focusout", onFocusOut);
    panel.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDownOutside);
    toggleBtn.addEventListener("click", function () {
      const open = !expanded;
      focusSuppressed = !open; // collapsed with the button: focus stays on the button, the sidebar does not expand
      setExpanded(open);
    });
    pinBtn.addEventListener("click", togglePin);
    const onMedia = function () { setExpanded(false); };
    if (narrow.addEventListener) narrow.addEventListener("change", onMedia); else narrow.addListener(onMedia);

    paintPin();
    setExpanded(false);
  }

  /** A “+N” popover is open: the sidebar does not collapse under it; after it closes the usual rules apply again. */
  function hold(on) {
    held = !!on;
    if (!held && sidebar && !pinned && expanded && !hovering && !panel.contains(document.activeElement)) setExpanded(false);
  }

  LM.sidebar = { hold: hold, init: init, afterNavigate: afterNavigate, isPinned: function () { return pinned; } };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window.LM);
