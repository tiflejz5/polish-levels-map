/*
 * e2e.js — browser smoke tests (stage 1B: syllabus checklist, routes, level status, trail, exams fixture).
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
      ok(/Ta strona potrzebuje profilu/.test(await viewText(s.page)), r + ": no welcome card");
    }
    ok(!s.page.errs.length, "JS errors: " + s.page.errs[0]);
    await s.ctx.close();
  });
  await test("unknown and old routes: \"Page not found\" with a link home, no redirect", async function () {
    const s = await session();
    for (const r of ["#/nope", "#/a1/no-such-topic", "#/dzis", "#/powtorki", "#/cwiczenia", "#/szlak", "#/certyfikat-c1", "#/egzamin-osmoklasisty", "#/exams/nope", "#/a1/sciaga"]) {
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
    await s.page.click('.ess-item[data-topic="a1-cases-accusative"] label.umiem input', { force: true });
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
  await test("\"I know this\" without a profile: dialog; \"Nie teraz\" changes nothing; a new profile gets the tick on the same page", async function () {
    const s = await session();
    await visit(s.page, "#/a1/cases-accusative");
    await s.page.click("label.umiem input", { force: true });
    await s.page.waitForSelector("dialog[open]");
    await s.page.click("button:has-text('Nie teraz')");
    ok(!(await s.page.evaluate(function () { return document.querySelector("label.umiem input").checked; })), "ticked after cancel");
    await s.page.click("label.umiem input", { force: true });
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
    await s.page.click("dialog[open] button:has-text('Quiz (4 pytania)')");
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
    ok(/Przystanek zaliczony/.test(await viewText(s.page)), "not passed");
    ok(await s.page.locator("button:has-text('Zaznacz „Umiem”')").count() === 1, "no \"I know this\" offer");
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
