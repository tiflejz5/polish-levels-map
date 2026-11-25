/*
 * e2e.js — browser smoke tests (stage 1B: syllabus checklist, routes, level status, trail, exams fixture;
 * stage 3: answer hints, lenient accents, character bar, listen buttons, no-voice paths, My words and lang markup).
 *
 *   node tools/e2e.js            (or: npm run e2e)
 *
 * Needs the playwright-core package (e.g. `npm i --no-save playwright-core`) and Chromium / Chrome / Edge.
 * CHROME_PATH may point at the browser. Without the package or a browser the script ends with a message and
 * exit code 0. A dependency-free static server starts by itself.
 *
 * The exam module is tested with tools/fixtures/exam-demo: the fixture is built into a temporary folder with
 * the real build modules and served in place of data/exams-registry.js, data/exam-*.js, data/sets-index.js and
 * data/sets/exam-demo-*.js (page.route). The real registry stays empty.
 */
"use strict";

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function findBrowser() {
  const env = process.env.CHROME_PATH;
  if (env && fs.existsSync(env)) return env;
  const home = os.homedir();
  const cands = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ];
  const pw = path.join(home, "AppData", "Local", "ms-playwright");
  if (fs.existsSync(pw)) {
    fs.readdirSync(pw).filter(function (d) { return /^chromium-\d+$/.test(d); }).sort().reverse().forEach(function (d) {
      cands.unshift(path.join(pw, d, "chrome-win64", "chrome.exe"), path.join(pw, d, "chrome-linux", "chrome"));
    });
  }
  return cands.find(function (p) { return fs.existsSync(p); }) || null;
}

let pw = null;
try { pw = require("playwright-core"); } catch (e) { try { pw = require("playwright"); } catch (e2) { pw = null; } }
const exe = findBrowser();
if (!pw || !exe) {
  console.log("E2E: skipped (" + (!pw ? "no playwright-core package" : "no browser, set CHROME_PATH") + ").");
  process.exit(0);
}

// ---------- the exam fixture, built into a temporary data folder ----------
const C = require("./build/common");
const FIXTURE_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "plm-e2e-"));
C.useExamsDir(path.join(__dirname, "fixtures", "exam-demo"));
C.useDataDir(FIXTURE_DATA);
require("./build/exams")();
require("./build/exercises")();
C.useExamsDir(null);
C.useDataDir(null);

const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".md": "text/markdown" };
const server = http.createServer(function (req, res) {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

let passed = 0;
const failures = [];
async function test(name, fn) {
  try { await fn(); passed++; console.log("  ok  " + name); } catch (e) { failures.push(name); console.log("  FAIL " + name + "\n       " + e.message); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg); }

async function main() {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  const URL = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await pw.chromium.launch({ executablePath: exe, headless: true });

  async function session(w, h, withProfile, opts) {
    opts = opts || {};
    const ctx = await browser.newContext({ viewport: { width: w || 1280, height: h || 800 }, reducedMotion: opts.reducedMotion || "no-preference" });
    await ctx.addInitScript(function (profile) {
      if (localStorage.getItem("e2e_seeded")) return;
      localStorage.setItem("e2e_seeded", "1");
      if (profile) localStorage.setItem("plm.profiles", JSON.stringify({ version: 1, activeId: "p_e2e", profiles: [{ id: "p_e2e", name: "Test Claude", progress: {} }] }));
    }, !!withProfile);
    if (opts.examFixture) {
      await ctx.route(/\/data\/(exams-registry|exam-[a-z0-9-]+|sets-index|sets\/exam-demo-[a-z0-9-]+)\.js(\?.*)?$/, function (route) {
        const rel = new globalThis.URL(route.request().url()).pathname.replace(/^\/data\//, "");
        const file = path.join(FIXTURE_DATA, rel);
        if (!fs.existsSync(file)) return route.continue();
        route.fulfill({ status: 200, contentType: "text/javascript", body: fs.readFileSync(file, "utf8") });
      });
    }
    const page = await ctx.newPage();
    page.errs = [];
    page.on("pageerror", function (e) { page.errs.push(e.message); });
    return { ctx: ctx, page: page };
  }
  async function visit(page, hash, wait) { await page.goto(URL + hash); await page.reload(); await page.waitForTimeout(wait || 900); }
  const viewText = function (page) { return page.innerText("#view").then(function (t) { return t.replace(/\s+/g, " ").trim(); }); };

  console.log("\nRoutes (spec 02 §6)");
  await test("every route renders something, without a profile too; personal pages show the welcome card", async function () {
    const s = await session();
    const routes = ["#/", "#/a1", "#/b1", "#/a1/cases-accusative", "#/a1/verbs-byc", "#/a1/test", "#/a1/cheatsheet", "#/practice", "#/practice/set/a1-cases-accusative-1",
      "#/lab", "#/writing", "#/writing/phrases", "#/trail", "#/today", "#/review", "#/review/decks", "#/review/mistakes", "#/review/words", "#/stats", "#/notes", "#/placement"];
    for (const r of routes) {
      await visit(s.page, r, 600);
      ok((await viewText(s.page)).length > 30, r + ": empty screen");
    }
    for (const r of ["#/today", "#/review", "#/stats", "#/notes"]) {
      await visit(s.page, r, 600);
      ok(/This page needs a profile/.test(await viewText(s.page)), r + ": no welcome card");
    }
    ok(!s.page.errs.length, "JS errors: " + s.page.errs[0]);
    await s.ctx.close();
  });
  await test("unknown and old routes: \"Page not found\" with a link home, no redirect", async function () {
    const s = await session();
    for (const r of ["#/nope", "#/a1/no-such-topic", "#/dzis", "#/powtorki", "#/cwiczenia", "#/szlak", "#/certyfikat-c1", "#/egzamin-osmoklasisty", "#/exams/nope", "#/a1/sciaga"]) { // pl-fixture: routes of the original app must not exist
      await visit(s.page, r, 500);
      ok(/Page not found/.test(await viewText(s.page)), r + ": no \"Page not found\"");
      ok(await s.page.evaluate(function () { return location.hash; }) === r, r + ": address changed");
      ok(await s.page.locator('#view a[href="#/"]').count() === 1, r + ": no link home");
    }
    await s.ctx.close();
  });

  console.log("\nChecklist = syllabus topics (E2) and level status (E1)");
  await test("A1: 25 topics from the syllabus, grouped by category, each a link with \"I know this\"", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/a1");
    ok(await s.page.locator(".essentials .ess-item").count() === 25, "rows: " + await s.page.locator(".essentials .ess-item").count());
    ok(await s.page.locator(".essentials .ess-item input[type=checkbox]").count() === 25, "checkboxes");
    const groups = await s.page.locator(".ess-group-title").allInnerTexts();
    ok(groups.length >= 4 && groups.indexOf("Cases") !== -1, "groups: " + groups.join(", "));
    ok(await s.page.locator('.ess-item[data-topic="a1-cases-accusative"] a[href="#/a1/cases-accusative"]').count() === 1, "topic link");
    ok(await s.page.locator(".ess-item.is-pending").count() === 24, "\"Being written\" rows");
    await s.page.click('.ess-item[data-topic="a1-cases-accusative"] label.know-toggle input', { force: true });
    await s.page.waitForTimeout(300);
    const progress = await s.page.evaluate(function () { return JSON.parse(localStorage.getItem("plm.profiles")).profiles[0].progress; });
    ok(progress["a1-cases-accusative"] === true && Object.keys(progress).length === 1, "progress: " + JSON.stringify(progress));
    ok(/1 \/ 25/.test(await s.page.innerText("#level-list")), "sidebar count");
    await s.ctx.close();
  });
  await test("\"soon\" level: planned topics without links or checkboxes, no test or cheat sheet card, \"soon\" in the sidebar", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/b1");
    const t = await viewText(s.page);
    ok(/B1 is on its way\. The topics below are what it will cover\./.test(t), "lead");
    ok(await s.page.locator(".essentials .ess-item.is-planned").count() > 10, "planned topics");
    ok(await s.page.locator(".essentials a, .essentials input").count() === 0, "links or checkboxes on a soon level");
    ok(await s.page.locator(".lf-level-card, .sciaga-card").count() === 0, "final test / cheat sheet card");
    ok(/soon/.test(await s.page.innerText('#level-list a[href="#/b1"]')), "sidebar label");
    await visit(s.page, "#/b1/test");
    ok(/B1 is on its way/.test(await viewText(s.page)), "final test of a soon level");
    await s.ctx.close();
  });
  await test("topic page: the example page renders; a topic without a page says \"This topic is being written\"", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/a1/cases-accusative");
    ok(await s.page.locator("article.md h1").innerText() === "Accusative: the direct object", "title");
    ok(await s.page.locator(".sz-bar").count() === 1, "trail bar");
    await visit(s.page, "#/a1/verbs-byc");
    ok(/This topic is being written\./.test(await viewText(s.page)), "pending page");
    ok(!s.page.errs.length, "JS errors: " + s.page.errs[0]);
    await s.ctx.close();
  });
  await test("\"I know this\" without a profile: dialog; \"Not now\" changes nothing; a new profile gets the tick on the same page", async function () {
    const s = await session();
    await visit(s.page, "#/a1/cases-accusative");
    await s.page.click("label.know-toggle input", { force: true });
    await s.page.waitForSelector("dialog[open]");
    await s.page.click("button:has-text('Not now')");
    ok(!(await s.page.evaluate(function () { return document.querySelector("label.know-toggle input").checked; })), "ticked after cancel");
    await s.page.click("label.know-toggle input", { force: true });
    await s.page.fill("#guest-name", "Ola");
    await s.page.keyboard.press("Enter");
    await s.page.waitForTimeout(700);
    ok(await s.page.evaluate(function () { return location.hash; }) === "#/a1/cases-accusative", "address changed");
    ok(await s.page.evaluate(function () { return JSON.parse(localStorage.getItem("plm.profiles")).profiles[0].progress["a1-cases-accusative"] === true; }), "tick not saved");
    await s.ctx.close();
  });

  console.log("\nTrail generated from the syllabus (E9)");
  await test("trail: A1 has 25 stops + 5 checkpoints; five soon lands dimmed; one current stop; sheet opens and closes", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/trail", 1500);
    ok(await s.page.locator(".sz-level").count() === 6, "lands");
    ok(await s.page.locator(".sz-level.is-soon").count() === 5, "soon lands");
    ok(/Coming soon/.test(await s.page.innerText(".sz-level.is-soon")), "\"Coming soon\"");
    ok(await s.page.locator(".sz-node").count() === 30, "nodes: " + await s.page.locator(".sz-node").count());
    ok(await s.page.locator(".sz-node.is-review").count() === 5, "checkpoints");
    ok(await s.page.locator(".sz-node.is-current").count() === 1, "one current stop");
    ok((await s.page.locator(".sz-node.is-current").getAttribute("data-stop")) === "a1-grammar-alphabet-pronunciation", "first topic is current");
    await s.page.focus(".sz-node.is-current button");
    await s.page.keyboard.press("Enter");
    await s.page.waitForSelector("dialog[open]");
    await s.page.keyboard.press("Escape");
    await s.page.waitForTimeout(300);
    ok(!s.page.errs.length, "JS errors: " + s.page.errs[0]);
    await s.ctx.close();
  });
  await test("stop quiz ≥ 3/4 passes the stop and offers \"I know this\" without ticking it", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/trail", 1500);
    await s.page.evaluate(function () { LM.trail.openSheet("a1-cases-accusative", { force: true }); });
    await s.page.click("dialog[open] button:has-text('Quiz (4 questions)')");
    for (let i = 0; i < 4; i++) {
      await s.page.waitForSelector(".ex-card .ex-option");
      const idx = await s.page.evaluate(function () {
        const it = LM.exercises.currentItem();
        const opts = [].slice.call(document.querySelectorAll(".ex-card .ex-option-text")).map(function (b) { return b.innerText.trim(); });
        return opts.indexOf(it.options[it.correct].trim());
      });
      await s.page.locator(".ex-card .ex-option").nth(idx).click();
      await s.page.click(".ex-check");
      await s.page.click(".ex-next");
      await s.page.waitForTimeout(200);
    }
    await s.page.waitForSelector(".sz-result");
    ok(/Stop done/.test(await viewText(s.page)), "not passed");
    ok(await s.page.locator("button:has-text('Mark “I know this”')").count() === 1, "no \"I know this\" offer");
    const progress = await s.page.evaluate(function () { return Object.keys(JSON.parse(localStorage.getItem("plm.profiles")).profiles[0].progress).length; });
    ok(progress === 0, "ticked automatically");
    const st = await s.page.evaluate(function () { return JSON.parse(localStorage.getItem("plm.trail.p_e2e")); });
    ok(st.version === 1 && st.stops["a1-cases-accusative"] && st.stops["a1-cases-accusative"].best === 4, "saved in plm.trail.<id>");
    await s.ctx.close();
  });
  await test("Today for a new profile: A1 is \"here\", the other lands are soon, map progress counts A1 only", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/today", 1500);
    ok(await s.page.locator(".trail-station.is-current.lvl-A1").count() === 1, "current station");
    ok(await s.page.locator(".trail-station.is-soon").count() === 5, "soon stations");
    ok(await s.page.locator(".map-seg").count() === 1, "map segments: " + await s.page.locator(".map-seg").count());
    await s.ctx.close();
  });

  console.log("\nExams (E8)");
  await test("empty registry: the sidebar group \"Exams\" is hidden and the home page has no exams section", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/");
    ok(await s.page.evaluate(function () { return document.getElementById("exams-nav").hidden && document.getElementById("exams-more-nav").hidden; }), "group visible");
    ok(await s.page.locator(".home-exams").count() === 0, "home exams section");
    await s.ctx.close();
  });
  await test("fixture exam: sidebar tile, overview with date card and sources note, page, practice list, writing trainer, soon exam", async function () {
    const s = await session(1280, 900, true, { examFixture: true });
    await visit(s.page, "#/exams/exam-demo", 1500);
    ok(!(await s.page.evaluate(function () { return document.getElementById("exams-nav").hidden; })), "group hidden");
    ok(await s.page.locator('#exams-nav a.exam-chip[href="#/exams/exam-demo"]').count() === 1, "sidebar tile");
    let t = await viewText(s.page);
    ok(/Demo exam: overview/.test(t) && /Exam information checked on November 2026/.test(t), "overview: " + t.slice(0, 160));
    ok(await s.page.locator('[id="exam-date-exam-demo"]').count() === 1, "date card");
    await visit(s.page, "#/exams/exam-demo/writing-part", 1200);
    ok(/Demo exam: writing part/.test(await viewText(s.page)), "page");
    await visit(s.page, "#/exams/exam-demo/practice", 1500);
    ok(/Short texts|Demo exam: short texts/.test(await viewText(s.page)) && await s.page.locator(".ex-set-card").count() === 1, "set card");
    await visit(s.page, "#/exams/exam-demo/writing/demo-email", 1500);
    ok(/Fixture email|Write an email/.test(await viewText(s.page)), "writing task");
    await visit(s.page, "#/exams/exam-soon", 1000);
    ok(/Work in progress/.test(await viewText(s.page)), "soon exam");
    await visit(s.page, "#/exams/nope", 800);
    ok(/Page not found/.test(await viewText(s.page)), "unknown exam");
    ok(!s.page.errs.length, "JS errors: " + s.page.errs[0]);
    await s.ctx.close();
  });

  console.log("\nLanguage layer (stage 3: spec 05, spec 06 E3–E5)");
  // A fake Web Speech API: with a Polish voice (listen buttons) or with English voices only (no-voice paths)
  const fakeVoices = function (ctx, langs) {
    return ctx.addInitScript(function (list) {
      const voices = list.map(function (l, i) { return { lang: l, name: "Fake " + l + " " + i, localService: true, voiceURI: "fake-" + i, default: i === 0 }; });
      const fake = { spoken: [], speaking: false, pending: false, paused: false,
        getVoices: function () { return voices; },
        speak: function (u) { fake.spoken.push(u.text); setTimeout(function () { if (u.onend) u.onend(); }, 30); },
        cancel: function () {}, addEventListener: function () {} };
      Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    }, langs);
  };
  const GAP_ITEM = { id: "e2e-gap-1", type: "gap-fill", topic: "a1-cases-accusative", level: "A1", text: "Mam {{1}} i {{2}}.", gaps: [{ accepted: ["brata"] }, { accepted: ["siostrę"] }] }; // pl-fixture: target-language test data
  const SINGLE_HOST = "#/a1/verbs-byc";
  async function single(page, item) {
    await page.evaluate(function (it) {
      LM.exercises.startSingle({ item: it, back: { href: "#/practice", label: "Practice" }, noJournal: true, onDone: function () {} });
    }, item);
    await page.waitForSelector(".ex-view .ex-card");
  }
  async function answerGaps(page, texts) {
    const inputs = page.locator(".ex-gap-input");
    for (let i = 0; i < texts.length; i++) await inputs.nth(i).fill(texts[i]);
    await page.click("button:has-text('Check')");
    await page.waitForTimeout(250);
  }
  await test("answer hints: accents-only, ending, typo — 0 points with the closest answer; lenient mode counts accents with the reminder", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, SINGLE_HOST); // a route the exercise engine does not own (startSingle keeps its own route)
    const cases = [["siostre", "accents", /Almost\. Check the Polish letters: siostrę/], ["siostra", "ending", /Right word, wrong ending: siostrę/], ["siotrę", "typo", /Looks like a typo: siostrę/]]; // pl-fixture: target-language test data
    for (const c of cases) {
      await single(s.page, GAP_ITEM);
      await answerGaps(s.page, ["brata", c[0]]);
      const hint = s.page.locator(".ex-near.is-" + c[1]);
      ok(await hint.count() === 1, c[1] + ": no hint");
      ok(c[2].test(await hint.innerText()), c[1] + ": " + await hint.innerText());
      ok(/1 \/ 2 points/.test(await viewText(s.page)), c[1] + ": points");
    }
    await s.page.evaluate(function () { LM.profileData.setPref("lenientAccents", true); });
    await single(s.page, GAP_ITEM);
    await answerGaps(s.page, ["brata", "siostre"]);
    ok(/2 \/ 2 points/.test(await viewText(s.page)), "lenient: points");
    ok(/Accepted without accents\. Check the Polish letters: siostrę/.test(await s.page.innerText(".ex-near.is-lenient")), "lenient: reminder"); // pl-fixture: target-language test data
    const att = await s.page.evaluate(function () { const a = LM.profileData.attempts().items; return a[a.length - 1]; });
    ok(att && att.correct === true && att.lenient === true, "attempt not logged as lenient: " + JSON.stringify(att));
    ok(!s.page.errs.length, "JS errors: " + s.page.errs[0]);
    await s.ctx.close();
  });
  await test("character bar: a button inserts at the cursor and keeps the focus; Shift gives the capital; Alt + letter cycles", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, SINGLE_HOST); // a route the exercise engine does not own (startSingle keeps its own route)
    await single(s.page, GAP_ITEM);
    ok(await s.page.locator(".charbar .charbar-key").count() === 9, "nine keys");
    const second = s.page.locator(".ex-gap-input").nth(1);
    await second.fill("siostr");
    await second.focus();
    await s.page.click(".charbar-key[aria-label='Insert ę']"); // pl-fixture: target-language test data
    ok(await second.inputValue() === "siostrę", "insert: " + await second.inputValue()); // pl-fixture: target-language test data
    ok(await s.page.evaluate(function () { return document.activeElement === document.querySelectorAll(".ex-gap-input")[1]; }), "focus left the field");
    await s.page.click(".charbar-key[aria-label='Insert ś']", { modifiers: ["Shift"] }); // pl-fixture: target-language test data
    ok(/Ś$/.test(await second.inputValue()), "shift: " + await second.inputValue()); // pl-fixture: target-language test data
    const first = s.page.locator(".ex-gap-input").first();
    await first.fill("");
    await first.focus();
    const seen = [];
    for (let i = 0; i < 3; i++) { await s.page.keyboard.press("Alt+KeyZ"); seen.push(await first.inputValue()); }
    ok(seen.join(",") === "ź,ż,z", "Alt+Z cycle: " + seen.join(",")); // pl-fixture: target-language test data
    await s.page.keyboard.press("Alt+KeyA");
    ok(await first.inputValue() === "zą", "Alt+A: " + await first.inputValue()); // pl-fixture: target-language test data
    await first.evaluate(function (n) { n.blur(); });
    await s.page.keyboard.press("?");
    await s.page.waitForSelector("dialog[open]");
    ok(/Alt \+ letter/.test(await s.page.innerText("dialog[open]")) && /a → ą/.test(await s.page.innerText("dialog[open]")), "shortcut panel entry"); // pl-fixture: target-language test data
    await s.ctx.close();
  });
  await test("topic page markup: Polish italics, the Polish column and listen buttons with a voice; S reads the focused example", async function () {
    const s = await session(1280, 900, true);
    await fakeVoices(s.ctx, ["pl-PL", "en-US"]); // pl-fixture: target-language test data
    await visit(s.page, "#/a1/cases-accusative", 1200);
    ok(await s.page.evaluate(function () { return document.documentElement.getAttribute("data-voice"); }) === "ready", "voice state");
    ok(await s.page.locator("article.md em[lang=pl]").count() > 10, "italics with lang");
    ok(await s.page.locator("article.md em:not([lang])").count() === 0, "italics without lang");
    const rows = await s.page.locator("article.md tr.has-listen").count();
    ok(rows === 8, "rows with a listen button: " + rows);
    ok(await s.page.locator("article.md td[lang=pl]").count() === 8, "Polish cells");
    ok(await s.page.locator("article.md tr.has-listen .listen-btn").first().isVisible(), "button hidden with a voice");
    await s.page.click("article.md tr.has-listen .listen-btn >> nth=0");
    await s.page.waitForTimeout(100);
    const spoken = await s.page.evaluate(function () { return window.speechSynthesis.spoken.slice(); });
    ok(spoken[0] === "Mam brata i siostrę.", "spoken: " + JSON.stringify(spoken)); // pl-fixture: target-language test data
    await s.page.focus("article.md tr.has-listen >> nth=2 >> .listen-btn");
    await s.page.keyboard.press("s");
    await s.page.waitForTimeout(100);
    const spoken2 = await s.page.evaluate(function () { return window.speechSynthesis.spoken.slice(); });
    ok(spoken2[spoken2.length - 1] === "Czytasz książkę czy gazetę?", "S: " + JSON.stringify(spoken2)); // pl-fixture: target-language test data
    ok(!s.page.errs.length, "JS errors: " + s.page.errs[0]);
    await s.ctx.close();
  });
  await test("no Polish voice: listen buttons hidden, settings explain how to add one, dictation is skipped, listening shows the transcript", async function () {
    const s = await session(1280, 900, true);
    await fakeVoices(s.ctx, ["en-US", "de-DE"]); // pl-fixture: target-language test data
    await visit(s.page, "#/a1/cases-accusative", 1200);
    ok(await s.page.evaluate(function () { return document.documentElement.getAttribute("data-voice"); }) === "none", "voice state");
    ok(await s.page.locator("article.md .listen-btn:visible").count() === 0, "visible listen buttons");
    await s.page.click("#profile-btn");
    await s.page.waitForTimeout(300);
    const menu = await s.page.innerText("#profile-menu");
    ok(/No Polish voice found on this device\./.test(menu) && /How to add one/.test(menu), "settings help");
    await s.page.keyboard.press("Escape");
    await visit(s.page, SINGLE_HOST); // a route the exercise engine does not own (startSingle keeps its own route)
    await single(s.page, { id: "e2e-dict-1", type: "dictation", topic: "a1-cases-accusative", level: "A1", text: "Mam brata.", accepted: [] });
    ok(/No Polish voice found on this device/.test(await viewText(s.page)), "dictation help");
    await s.page.click("button:has-text('Skip')");
    await s.page.waitForTimeout(250);
    ok(/Skipped/.test(await viewText(s.page)), "dictation skipped");
    await single(s.page, { id: "e2e-listen-1", type: "multiple-choice", kind: "listening", topic: "a1-cases-accusative", level: "A1", script: "A: Dzień dobry.\nB: Dzień dobry.", prompt: "Who speaks?", options: ["two people", "one person"], correct: 0 }); // pl-fixture: target-language test data
    await s.page.click("button:has-text('Show the transcript to read')");
    await s.page.waitForTimeout(200);
    ok(await s.page.locator(".ex-transcript[lang=pl]").count() === 1, "transcript");
    ok(!s.page.errs.length, "JS errors: " + s.page.errs[0]);
    await s.ctx.close();
  });
  await test("My words: \"Add to My words\" on a Polish selection, not on English text", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/a1/cases-accusative", 1000);
    const select = function (sel) {
      return s.page.evaluate(function (q) {
        const n = document.querySelector(q);
        const r = document.createRange();
        r.selectNodeContents(n.firstChild && n.firstChild.nodeType === 3 ? n.firstChild : n);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      }, sel);
    };
    await select("article.md td[lang=pl]");
    await s.page.waitForTimeout(400);
    ok(await s.page.locator(".fc-sel-menu:not([hidden]) button:has-text('Add to My words')").count() === 1, "no Add to My words on Polish");
    await select("article.md h1 + p");
    await s.page.waitForTimeout(400);
    ok(await s.page.locator(".fc-sel-menu:not([hidden])").count() === 1, "menu hidden on English");
    ok(await s.page.locator(".fc-sel-menu:not([hidden]) button:has-text('Add to My words')").count() === 0, "Add to My words on English");
    await s.ctx.close();
  });


  await test("speaking trainer: cards without usefulPhrases or prepSeconds draw every tab without errors (phrasesBox fix)", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/a1", 600);
    await s.page.addScriptTag({ url: URL + "js/recorder.js" });
    await s.page.addScriptTag({ url: URL + "js/speaking-trainer.js" });
    const out = await s.page.evaluate(function () {
      const data = {
        format: "matura", criteria: [{ id: "a", label: "Content" }],
        intro: { seconds: 60, groups: [{ questions: ["Q1"] }] },
        roleplay: { seconds: 60, cards: [{ situation: "Situation", elements: ["one"], examinerLines: ["Line"] }] },
        picture: { seconds: 60, cards: [{ description: "Picture", questions: ["Q2"] }] },
        choice: { seconds: 60, cards: [{ situation: "Choose", options: ["A", "B"], criteria: ["why"], questions: ["Q3"] }] }
      };
      const t = LM.speakingTrainer.create({ data: function () { return data; }, section: function () { return { label: "Speaking" }; },
        crumb: function (l) { return LM.utils.el("p", { text: l }); }, notFound: function (m) { return LM.utils.el("p", { text: m }); }, examId: "e2e" });
      const view = document.getElementById("view");
      view.replaceChildren();
      t.render(view);
      return Array.prototype.map.call(document.querySelectorAll(".sp-tab"), function (b) {
        b.click();
        return document.querySelector("#sp-panel").children.length > 1 ? "ok" : "empty";
      });
    });
    ok(out.length === 5 && out.every(function (x) { return x === "ok"; }), "tabs: " + out.join(","));
    ok(!s.page.errs.length, "JS errors: " + s.page.errs[0]);
    await s.ctx.close();
  });

  console.log("\nExercises with Polish data (stage 4)");
  const SETS4 = ["a1-cases-accusative-1", "a1-cases-accusative-2", "a1-cases-accusative-3"];
  /** Items of the content sets, loaded in the page (data/sets/*.js). */
  async function setItems(page) {
    return page.evaluate(function (ids) {
      return LM.exercises.loadSets(ids).then(function (sets) { return [].concat.apply([], sets.map(function (s) { return s.items; })); });
    }, SETS4);
  }
  /** A fake Polish voice: the engine then shows dictation and listen controls (headless browsers have no voices). */
  async function fakeVoice(page) {
    await page.evaluate(function () {
      LM.speech.status = function () { return "ready"; };
      LM.speech.available = function () { return true; };
      LM.speech.speak = function (t, o) { setTimeout(function () { if (o && o.onend) o.onend(); }, 30); return true; };
    });
  }
  /** Answers the item on screen through the UI: right = the model answer, otherwise a wrong one. */
  async function answer(page, it, right) {
    await page.evaluate(function (a) {
      const it = a.it, right = a.right, X = LM.exLogic;
      const fill = function (el, v) { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); };
      const q = function (s) { return document.querySelector(".ex-card " + s); };
      const qa = function (s) { return Array.prototype.slice.call(document.querySelectorAll(".ex-card " + s)); };
      if (it.type === "multiple-choice") {
        const want = right ? it.options[it.correct] : it.options[(it.correct + 1) % it.options.length];
        qa(".ex-option").find(function (l) { return l.querySelector(".ex-option-text").textContent === want; }).querySelector("input").click();
      } else if (it.type === "reorder") {
        const words = right ? X.answerTokens(it.answers[0], it) : null;
        if (!words) { while (q(".ex-pool .ex-token")) q(".ex-pool .ex-token").click(); return; }
        words.forEach(function (w) { qa(".ex-pool .ex-token").find(function (b) { return b.textContent === w; }).click(); });
      } else if (it.type === "find-error") {
        qa(".ex-word")[right ? it.errorRange[0] : (it.errorRange[0] + 1) % it.tokens.length].click();
        if (right && it.errorRange[1] !== it.errorRange[0]) qa(".ex-word")[it.errorRange[1]].click();
        fill(q("#ex-fix"), right ? it.fixes[0] : "x");
      } else if (it.type === "short-answer") fill(q(".ex-gap-input"), right ? it.accepted[0] : "x");
      else if (it.type === "gap-fill") qa(".ex-gap-input").forEach(function (el, i) { fill(el, right || i ? it.gaps[i].accepted[0] : "x"); });
      else if (it.type === "match") {
        it.pairs.forEach(function (p, i) {
          qa(".ex-match-list")[0].querySelectorAll("button")[i].click();
          const target = right ? p[1] : it.pairs[(i + 1) % it.pairs.length][1];
          Array.prototype.slice.call(document.querySelectorAll(".ex-card .ex-match-list")[1].querySelectorAll("button"))
            .find(function (b) { return b.querySelector(".ex-match-text").textContent === target; }).click();
        });
      } else if (it.type === "transformation") fill(q(".ex-tr-input"), right ? it.answers[0] : "x y");
      else if (it.type === "translate") fill(q("#ex-answer"), right ? it.accepted[0] : it.accepted[0].split(" ").slice(1).join(" "));
      else if (it.type === "dictation") fill(q("#ex-answer"), right ? it.text : it.text.split(" ").slice(0, -1).join(" "));
      else if (it.type === "paradigm") qa(".ex-par-input:not(.is-given)").forEach(function (el, i) {
        const open = it.cells.filter(function (c) { return !c.given; });
        fill(el, right || i ? open[i].accepted[0] : "x");
      });
    }, { it: it, right: right });
    await page.waitForTimeout(80);
  }
  async function check(page) { await page.click(".ex-card .ex-check"); await page.waitForTimeout(250); }

  await test("every item type of the Polish sets renders, checks right and wrong answers, and scores in points", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, SINGLE_HOST);
    await fakeVoice(s.page);
    const items = await setItems(s.page);
    const types = {};
    for (const it of items) {
      for (const right of [true, false]) {
        await single(s.page, it);
        if (it.type === "dictation") await s.page.click(".ex-card button:has-text('Play')");
        await answer(s.page, it, right);
        await check(s.page);
        const verdict = await s.page.innerText(".ex-card .lt-verdict");
        ok(right ? /^Correct!/.test(verdict) : !/^Correct!/.test(verdict), it.id + (right ? " right: " : " wrong: ") + verdict);
      }
      types[it.type] = true;
    }
    ok(Object.keys(types).length === 10, "types: " + Object.keys(types).join(", "));
    ok(!s.page.errs.length, "JS errors: " + s.page.errs[0]);
    await s.ctx.close();
  });
  await test("paradigm: case labels with questions, Tab goes down the column, Enter checks, wrong cells show the right form", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, SINGLE_HOST);
    const items = await setItems(s.page);
    const cases = items.find(function (it) { return it.type === "paradigm" && it.cells.some(function (c) { return c.given; }); });
    await single(s.page, cases);
    const labels = await s.page.locator(".ex-par-label").allInnerTexts();
    ok(/^Nominative \(.+\?\)$/.test(labels[0]) && /^Accusative \(/.test(labels[1]), "labels: " + labels.join(" | "));
    ok(await s.page.locator(".ex-par-input.is-given[readonly]").count() === 1, "given cell");
    const six = items.find(function (it) { return it.type === "paradigm" && it.cells.length === 6; });
    await single(s.page, six);
    const pos = await s.page.evaluate(function () { return Array.prototype.map.call(document.querySelectorAll(".ex-par-cell"), function (c) { const r = c.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }); });
    ok(pos[0][0] === pos[1][0] && pos[1][1] > pos[0][1] && pos[3][0] > pos[0][0], "two columns filled top to bottom: " + JSON.stringify(pos));
    await s.page.focus(".ex-par-input >> nth=0");
    await s.page.keyboard.press("Tab");
    ok(await s.page.evaluate(function () { return document.activeElement.id; }) === "ex-par-1", "Tab goes to the cell below");
    await s.page.keyboard.type("dobrego lekarzem"); // pl-fixture: a wrong ending in one cell
    await s.page.keyboard.press("Enter");
    await s.page.waitForTimeout(250);
    ok(await s.page.locator(".ex-par-model").count() === 6, "every unanswered or wrong cell shows the right form");
    ok(/0 \/ 6 points/.test(await s.page.innerText(".ex-status")), "points in the live status");
    ok(await s.page.locator(".ex-status[aria-live=polite]").count() === 1, "aria-live");
    ok(!s.page.errs.length, "JS errors: " + s.page.errs[0]);
    await s.ctx.close();
  });
  await test("paradigm on a 320 px phone: one column, no horizontal scroll, 44 px fields", async function () {
    const s = await session(320, 700, true);
    await visit(s.page, SINGLE_HOST);
    const items = await setItems(s.page);
    await single(s.page, items.find(function (it) { return it.type === "paradigm" && it.cells.length === 6; }));
    const d = await s.page.evaluate(function () {
      const xs = Array.prototype.map.call(document.querySelectorAll(".ex-par-cell"), function (c) { return Math.round(c.getBoundingClientRect().left); });
      return { one: xs.every(function (x) { return x === xs[0]; }), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
        h: Math.min.apply(null, Array.prototype.map.call(document.querySelectorAll(".ex-par-input"), function (i) { return i.getBoundingClientRect().height; })) };
    });
    ok(d.one, "one column");
    ok(d.sw <= d.cw, "horizontal scroll " + d.sw + ">" + d.cw);
    ok(d.h >= 44, "field height " + d.h);
    await s.ctx.close();
  });
  await test("a whole set ends with the result in points (gap-fill, match and paradigm count a point per part)", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/practice/set/a1-cases-accusative-1", 900);
    await s.page.click("button:has-text('Start')");
    const items = await setItems(s.page);
    for (let i = 0; i < 10; i++) {
      const id = await s.page.evaluate(function () { return LM.exercises.currentItem().id; });
      await answer(s.page, items.find(function (it) { return it.id === id; }), i % 3 !== 0);
      await check(s.page);
      await s.page.click(".ex-next");
      await s.page.waitForTimeout(150);
    }
    const score = await s.page.innerText(".ex-result-score");
    ok(/\d+\/19 points/.test(score), "result: " + score);
    ok(!s.page.errs.length, "JS errors: " + s.page.errs[0]);
    await s.ctx.close();
  });
  await test("practice hub: the generator lists the new item type", async function () {
    const s = await session(1280, 900, true);
    await visit(s.page, "#/practice", 900);
    ok(await s.page.locator("[data-type='paradigm']").count() === 1, "no paradigm chip");
    ok(await s.page.locator("[data-type='transformation']").count() === 1 && await s.page.locator("[data-type='short-answer']").count() === 1, "chips");
    await s.ctx.close();
  });

  console.log("\nPhones");
  await test("no horizontal scroll at 320, 360 and 375 px", async function () {
    const s = await session(375, 812, true);
    const bad = [];
    for (const w of [320, 360, 375]) {
      await s.page.setViewportSize({ width: w, height: 812 });
      for (const r of ["#/", "#/today", "#/a1", "#/b1", "#/a1/cases-accusative", "#/trail", "#/review", "#/practice", "#/nope"]) {
        await s.page.goto(URL + r); await s.page.waitForTimeout(450);
        const d = await s.page.evaluate(function () { return [document.documentElement.scrollWidth, document.documentElement.clientWidth]; });
        if (d[0] > d[1]) bad.push(r + " @" + w + " (" + d[0] + ">" + d[1] + ")");
      }
    }
    ok(!bad.length, "horizontal scroll: " + bad.join("; "));
    await s.ctx.close();
  });
  await test("prefers-reduced-motion: the current trail stop does not pulse", async function () {
    const s = await session(1280, 800, true, { reducedMotion: "reduce" });
    await visit(s.page, "#/trail", 1500);
    ok(await s.page.evaluate(function () { return getComputedStyle(document.querySelector(".sz-node.is-current .sz-circle")).animationName; }) === "none", "animation with reduced motion");
    await s.ctx.close();
  });

  await browser.close();
  server.close();
  fs.rmSync(FIXTURE_DATA, { recursive: true, force: true });
  console.log("\nE2E: " + passed + " ok, " + failures.length + " failed");
  if (failures.length) process.exit(1);
}

main().catch(function (e) { console.error(e); server.close(); process.exit(1); });
