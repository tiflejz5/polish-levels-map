/*
 * contrast.js — checks the WCAG contrast of token pairs in both themes
 * (css/style.css). Text: min. 4.5:1, components, field borders and bars: 3:1.
 *
 * Usage (from the project folder):
 *   node tools/contrast.js
 * Exit code 1 when a pair does not reach the minimum.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const css = fs.readFileSync(path.join(__dirname, "..", "css", "style.css"), "utf8").replace(/\r\n/g, "\n");

function block(selectorStart) {
  const i = css.indexOf(selectorStart);
  if (i === -1) throw new Error("Block not found: " + selectorStart);
  const open = css.indexOf("{", i), close = css.indexOf("}", open);
  const vars = {};
  css.slice(open + 1, close).replace(/--([\w-]+):\s*([^;]+);/g, function (_, k, v) { vars[k] = v.trim(); });
  return vars;
}
const light = block(":root,\n:root[data-theme=\"light\"]");
const dark = Object.assign({}, light, block(":root[data-theme=\"dark\"]"));

function parse(c) {
  c = c.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), 1];
  m = /^rgba?\(([^)]+)\)$/.exec(c);
  if (m) { const p = m[1].split(",").map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  throw new Error("Unsupported colour: " + c);
}
function over(fg, bg) { const a = fg[3]; return [0, 1, 2].map(function (i) { return fg[i] * a + bg[i] * (1 - a); }).concat(1); }
function lum(c) {
  return [0, 1, 2].map(function (i) { const v = c[i] / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
}
function ratio(a, b) { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }

// [foreground, background, (base under a translucent background), minimum, description]
const pairs = [];
["bg", "surface", "surface-2", "surface-3", "empty-bg"].forEach(function (bg) {
  pairs.push(["ink", bg, null, 4.5, "tekst / " + bg]);
  pairs.push(["ink-muted", bg, null, 4.5, "secondary text / " + bg]);
});
["uoe", "reading", "writing", "listening", "speaking", "grammar", "vocab", "other"].forEach(function (c) {
  pairs.push(["cat-" + c, "surface", null, 3, "mistake log category stripe (" + c + ") / card"]);
});
pairs.push(
  ["ink-faint", "surface", null, 4.5, "placeholder / pole"],
  ["accent", "surface", null, 4.5, "link / karta"],
  ["accent", "bg", null, 4.5, "link / background"],
  ["accent", "surface-2", null, 4.5, "link / sidebar"],
  ["accent", "info-bg", "surface", 4.5, "link / info box"],
  ["accent", "accent-soft", "surface", 4.5, "link / accent highlight"],
  ["ink", "info-bg", "surface", 4.5, "text / info box"],
  ["ink", "accent-soft", "surface", 4.5, "text / active profile"],
  ["ink", "hover", "surface-2", 4.5, "text / hover in the sidebar"],
  ["on-accent", "accent-bg", null, 4.5, "primary button text"],
  ["on-accent", "accent-hover", null, 4.5, "primary button text (hover)"],
  ["on-accent", "danger-bg", null, 4.5, "“delete” button text"],
  ["on-accent", "danger-hover", null, 4.5, "“delete” button text (hover)"],
  ["on-accent", "success-fill", null, 3, "✓ mark / ticked box"],
  ["danger", "surface", null, 4.5, "error / card"],
  ["danger", "danger-soft", "surface", 4.5, "error / error background"],
  ["success", "surface", null, 4.5, "success / card"],
  ["success", "success-soft", "surface", 4.5, "success / success background"],
  ["warning", "surface", null, 4.5, "warning / card"],
  ["ink", "warning-soft", "surface", 4.5, "text / warning banner"],
  ["inverse-text", "inverse-bg", null, 4.5, "key word (transformation)"],
  ["line-control", "surface", null, 3, "field border / card"],
  ["line-control", "bg", null, 3, "field border / background"],
  ["line-control", "surface-2", null, 3, "field border / sidebar"],
  ["success-fill", "surface", null, 3, "ticked “I know this” / card"],
  ["focus-color", "surface", null, 3, "focus ring / card"],
  ["focus-color", "bg", null, 3, "focus ring / background"],
  ["focus-color", "surface-2", null, 3, "focus ring / sidebar"],
  ["accent-bg", "bg", null, 3, "primary button / background"],
  ["danger-bg", "surface", null, 3, "✗ mark / card"],
  ["ink-muted", "lvl-a1-soft", null, 4.5, "the “X / Y known” counter / active level (A1)"],
  ["on-accent", "accent-bg", null, 4.5, "review badge / background"],
  ["on-accent", "success-fill", null, 4.5, "“I knew it”, the “Correct” label / background"],
  ["on-accent", "danger-bg", null, 4.5, "the “Your answer” label / background"],
  ["ink", "info-bg", "surface", 4.5, "“Real life vs exam” callout: text / background"],
  ["accent", "surface", null, 3, "“Real life vs exam” callout: icon / icon background"],
  ["ink", "surface", null, 4.5, "exam chip (“Real life vs exam”): text / background"],
  ["ink", "surface-3", null, 4.5, "exam chip on hover: text / background"],
  ["ink-muted", "surface", null, 4.5, "card on a phone: column label / background"],
  ["warning", "surface", null, 3, "trap icon / icon background"],
  ["tense-past", "surface", null, 3, "timeline: past / card"],
  ["tense-present", "surface", null, 3, "timeline: present / card"],
  ["tense-future", "surface", null, 3, "timeline: future / card"],
  ["tense-past", "bg", null, 3, "timeline: past / background"],
  ["tense-future", "bg", null, 3, "timeline: future / background"],
  ["ink", "warning-soft", "surface", 4.5, "find the mistake: the wrong word / background"],
  ["accent", "accent-soft", "surface", 4.5, "chosen option / word: text / background"],
  ["danger", "danger-soft", "surface", 4.5, "wrong word / gap: text / background"],
  ["success", "success-soft", "surface", 4.5, "correct gap: text / background"],
  ["warning", "danger-soft", "surface", 4.5, "“Watch the spelling” / wrong answer background"],
  ["success", "danger-soft", "surface", 4.5, "“Correct: …” / wrong answer background"],
  ["accent", "surface-3", null, 3, "stats: learning day / day without learning"],
  ["accent", "surface", null, 3, "stats: trend column / card"],
  ["accent", "accent-soft", "surface", 3, "stats: accuracy bar / track"],
  ["inverse-text", "inverse-bg", null, 4.5, "toast: text / background"],
  // Exam covers (B3), full and compact: --accent-soft background on the section's --bg
  ["accent", "accent-soft", "bg", 4.5, "exam cover: code / background"],
  ["ink", "accent-soft", "bg", 4.5, "exam cover: name and date / background"],
  ["ink-muted", "accent-soft", "bg", 4.5, "exam cover: level and institution / background"],
  // Sidebar v8: the “+N” button and the popover
  ["ink-muted", "surface-2", null, 4.5, "sidebar: “+N” text and captions / sidebar background"],
  ["line-control", "surface-2", null, 3, "sidebar: dashed “+N” outline / sidebar background"],
  ["ink", "surface", null, 4.5, "“+N” popover: exam name / background"],
  ["ink-muted", "surface", null, 4.5, "“+N” popover: level and institution / background"],
  // Flashcards and mistakes (v8): tabs, the header counter, the “Due today” card
  ["ink-muted", "bg", null, 4.5, "Flashcards and mistakes tabs: inactive / background"],
  ["accent", "bg", null, 3, "tabs: active indicator / background"],
  ["accent", "accent-soft", "bg", 4.5, "the “N to review” counter in the header: text / background"],
  ["accent", "surface", null, 4.5, "“Due today” card: the links “Decks”, “My mistakes”, “+ Add mistake” / card"],
  ["lvl-a2", "surface", null, 3, "“Due today” card: flashcard marker / card"],
  ["lvl-b2", "surface", null, 3, "“Due today” card: mistake marker / card"],
  ["lvl-c1", "surface", null, 3, "“Due today” card: item marker / card"]
);
["a1", "a2", "b1", "b2", "c1", "c2"].forEach(function (l) {
  const L = l.toUpperCase();
  pairs.push(
    ["lvl-" + l + "-ink", "lvl-" + l + "-soft", null, 4.5, "level text " + L + " / background " + L],
    ["lvl-" + l + "-ink", "surface", null, 4.5, "tekst poziomu " + L + " / karta"],
    ["lvl-" + l, "lvl-" + l + "-soft", null, 3, "bar " + L + " / track"],
    ["lvl-" + l, "surface", null, 3, "marker " + L + " / card"],
    ["lvl-" + l, "bg", null, 3, "marker " + L + " / background"],
    ["on-accent", "lvl-" + l, null, 3, "“I know this” check mark / fill " + L],
    ["lvl-" + l + "-ink", "bg", null, 4.5, "land label " + L + " above the heading / background"],
    ["ink", "lvl-" + l + "-glow", "surface", 4.5, "key-word marker " + L + " / item card"],
    ["lvl-" + l, "lvl-" + l + "-soft", null, 3, "land symbol " + L + " / patch on the Trail"],
    ["lvl-" + l + "-ink", "surface", null, 4.5, "Today: name of the current land " + L + " / map card"]
  );
});

let fails = 0;
let checked = 0;
[["LIGHT", light], ["DARK", dark]].forEach(function (theme) {
  const t = theme[1];
  const bad = [];
  pairs.concat(t["exam-mark-bg"] ? [["exam-on-mark", "exam-mark-bg", null, 4.5, "exam result badge / background"], ["exam-mark-ink", "bg", null, 4.5, "text in the exam accent colour / background"]] : []).forEach(function (p) {
    let b = parse(t[p[1]]);
    if (b[3] < 1) b = over(b, parse(t[p[2] || "surface"]));
    let f = parse(t[p[0]]);
    if (f[3] < 1) f = over(f, b);
    const r = ratio(f, b);
    checked++;
    if (r < p[3]) { fails++; bad.push("  TOO LOW " + r.toFixed(2) + " (min " + p[3] + ")  " + p[4]); }
  });
  console.log("== " + theme[0] + ": " + (pairs.length - bad.length) + "/" + pairs.length + " ok");
  bad.forEach(function (b) { console.log(b); });
});
// Mini cover (tile on the home page and Today): colours from the registry, outside the exam section → the accent bar on --surface (3:1)
// Exam colours come from the registry: content/exams/registry.json (empty until stage E) and the fixture exam
const regs = [path.join(__dirname, "..", "content", "exams", "registry.json"), path.join(__dirname, "fixtures", "exam-demo", "registry.json")];
const manifest = { exams: [].concat.apply([], regs.filter(function (p) { return fs.existsSync(p); }).map(function (p) { return JSON.parse(fs.readFileSync(p, "utf8")).exams || []; })) };
[["LIGHT", light], ["DARK", dark]].forEach(function (theme) {
  const bad = [];
  manifest.exams.forEach(function (e) {
    const bg = parse(theme[1].surface);
    if (!e.accent) return;
    const r = ratio(parse(theme[0] === "DARK" ? (e.accent2 || e.accent) : e.accent), bg); // light: the bar in accent, dark: in accent2
    checked++;
    if (r < 3) { fails++; bad.push("  TOO LOW " + r.toFixed(2) + " (min 3)  mini cover bar " + e.code + " / card"); }
  });
  // Exam tile in the sidebar (code and countdown, 44×44): white text on the exam colour (4.5:1)
  manifest.exams.forEach(function (e) {
    const fg = "#ffffff";
    const bgc = e.accent;
    if (!bgc) return;
    const pairsT = [[fg, "code and countdown " + e.code]];
    pairsT.forEach(function (pt) {
      const rt = ratio(parse(pt[0]), parse(bgc));
      checked++;
      if (rt < 4.5) { fails++; bad.push("  TOO LOW " + rt.toFixed(2) + " (min 4.5)  sidebar tile: " + pt[1] + " / tile background"); }
    });
  });
  console.log("== MINI COVERS " + theme[0] + ": " + (bad.length ? "failures" : "ok"));
  bad.forEach(function (b) { console.log(b); });
});
console.log("Pairs checked: " + checked + ", failing: " + fails);
if (fails) process.exit(1);
