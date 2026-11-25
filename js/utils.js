/*
 * utils.js — small helpers used across the app, plus LM.plural and LM.fmt (spec 04 §1).
 *
 * SECURITY: text typed by the user goes into the DOM only as text
 * (textContent / value). We never use innerHTML with user data, so e.g.
 * <script>alert(1)</script> is shown as plain text.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  /**
   * Creates a DOM element.
   *   el("button", { class: "btn", text: "Save note", onclick: fn }, [children])
   * - "text"     → textContent (safe)
   * - "value"    → form field value
   * - "onXxx"    → event listener for "xxx"
   * - checked/disabled/hidden → boolean properties
   * - anything else → HTML attributes (null/false = skip)
   * Children: element, text (always as a text node) or an array.
   */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        const value = attrs[key];
        if (key === "checked" || key === "disabled" || key === "hidden") {
          node[key] = !!value;
          return;
        }
        if (value === null || value === undefined || value === false) return;
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else if (key === "value") node.value = value;
        else if (key.indexOf("on") === 0 && typeof value === "function") {
          node.addEventListener(key.slice(2), value);
        } else node.setAttribute(key, value === true ? "" : String(value));
      });
    }
    appendChildren(node, children);
    return node;
  }

  /** Appends children to a parent; text always as a safe text node. */
  function appendChildren(parent, children) {
    if (children === null || children === undefined || children === false) return;
    if (Array.isArray(children)) {
      children.forEach(function (c) { appendChildren(parent, c); });
      return;
    }
    if (children instanceof Node) parent.appendChild(children);
    else parent.appendChild(document.createTextNode(String(children)));
  }

  /**
   * Turns text into a DOM fragment with **bold** support.
   * Line breaks are kept by CSS (white-space: pre-wrap).
   * Every piece goes into the DOM as text, so HTML is never executed.
   */
  function formatText(text) {
    const frag = document.createDocumentFragment();
    const parts = String(text || "").split(/\*\*([\s\S]+?)\*\*/);
    parts.forEach(function (part, i) {
      if (!part) return;
      // Odd indexes are the pieces between ** **
      if (i % 2 === 1) frag.appendChild(el("strong", { text: part }));
      else frag.appendChild(document.createTextNode(part));
    });
    return frag;
  }

  /** Unique id: prefix + time + random string, e.g. "t_lq2k9x8f3a". */
  function uid(prefix) {
    let rand = "";
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(2);
      window.crypto.getRandomValues(arr);
      rand = arr[0].toString(36) + arr[1].toString(36);
    } else {
      rand = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
    return prefix + "_" + Date.now().toString(36) + rand.slice(0, 8);
  }

  /** Fits a textarea's height to its content. */
  function autoGrow(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = (textarea.scrollHeight + 2) + "px";
  }

  /** Today's date as YYYY-MM-DD (local time). */
  function dateStamp() {
    const d = new Date();
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /** Is the value a plain object {…} (not an array, not null)? */
  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /**
   * Content scroll position. On a computer <main> scrolls; on a phone
   * (narrow layout) the whole page scrolls, so both cases are handled.
   */
  function getScroll() {
    const main = document.getElementById("main");
    return (main && main.scrollTop) || window.scrollY || 0;
  }

  function setScroll(y) {
    const main = document.getElementById("main");
    if (main) main.scrollTop = y;
    window.scrollTo(0, y);
  }

  /**
   * TEMPORARY (removed at the end of stage 2): three-form plural of the inherited Polish UI strings.
   * Callers move to LM.plural one file group at a time.
   */
  function plural(n, one, few, many) {
    if (n === 1) return one;
    const d = n % 10, t = n % 100;
    return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
  }

  // ---------- English UI: plurals and formatting (spec 04 §1) ----------

  /** UI locale from LM.APP (config.js); never hard-coded here. */
  function uiLocale() { return (LM.APP && LM.APP.uiLocale) || undefined; }

  const formatters = {};
  function dtf(key, options) {
    if (!formatters[key]) formatters[key] = new Intl.DateTimeFormat(uiLocale(), options);
    return formatters[key];
  }

  /** "1 day", "3 days", "1,250 cards". Two English forms; only exactly 1 is singular. */
  function englishPlural(n, one, many) {
    return fmtNumber(n) + " " + pluralWord(n, one, many);
  }

  /** The word alone: pluralWord(3, "day", "days") → "days" (when the number is shown separately). */
  function pluralWord(n, one, many) {
    return Number(n) === 1 ? one : many;
  }

  /** Date | timestamp | "YYYY-MM-DD" (read as a local day, no time-zone shift) | ISO string → Date or null. */
  function toDate(value) {
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === "number") { const d = new Date(value); return isNaN(d.getTime()) ? null : d; }
    if (typeof value === "string") {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  function fmtNumber(n, maxDigits) {
    const x = Number(n);
    if (!isFinite(x)) return "";
    return new Intl.NumberFormat(uiLocale(), { maximumFractionDigits: maxDigits == null ? 0 : maxDigits }).format(x);
  }

  const fmt = {
    /** "Nov 12, 2026" */
    date: function (v) { const d = toDate(v); return d ? dtf("date", { month: "short", day: "numeric", year: "numeric" }).format(d) : ""; },
    /** "November 12, 2026" */
    longDate: function (v) { const d = toDate(v); return d ? dtf("longDate", { month: "long", day: "numeric", year: "numeric" }).format(d) : ""; },
    /** "Nov 12" */
    dayMonth: function (v) { const d = toDate(v); return d ? dtf("dayMonth", { month: "short", day: "numeric" }).format(d) : ""; },
    /** "Thursday"; weekday(v, "short") → "Thu" */
    weekday: function (v, style) {
      const d = toDate(v);
      const s = style === "short" || style === "narrow" ? style : "long";
      return d ? dtf("weekday-" + s, { weekday: s }).format(d) : "";
    },
    /** "3:05 PM" */
    time: function (v) { const d = toDate(v); return d ? dtf("time", { hour: "numeric", minute: "2-digit" }).format(d) : ""; },
    /** "Nov 12, 2026, 3:05 PM" */
    dateTime: function (v) { const d = toDate(v); return d ? fmt.date(d) + ", " + fmt.time(d) : ""; },
    /** "1,234"; number(2.345, 1) → "2.3" */
    number: fmtNumber,
    /** Value already in percent: percent(42) → "42%", percent(12.5, 1) → "12.5%" */
    percent: function (n, maxDigits) { const s = fmtNumber(n, maxDigits); return s ? s + "%" : ""; },
    toDate: toDate
  };

  LM.plural = englishPlural;
  LM.pluralWord = pluralWord;
  LM.fmt = fmt;

  LM.utils = {
    plural: plural,
    getScroll: getScroll,
    setScroll: setScroll,
    el: el,
    appendChildren: appendChildren,
    formatText: formatText,
    uid: uid,
    autoGrow: autoGrow,
    dateStamp: dateStamp,
    isPlainObject: isPlainObject
  };
})(window.LM);
