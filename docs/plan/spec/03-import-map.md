# Spec 03 — Import map (spanish-levels-map@engine-v1 → this app)

Stage 0 copies the finished Spanish app's engine and turns it into the Polish app's skeleton. It also writes `docs/plan/import-inventory.md`: this table checked against the real files. If the inventory disagrees with this spec, the inventory wins — report the difference.

## 1. What is copied unchanged

`index.html` (title and meta changed) · `css/` · `js/` **except** `config.js`, `lang.js` and the lab view · `assets/` (favicons replaced in stage 3) · `tools/` (build, validators, tests, contrast, check-lang, strip-keys, e2e) · `package.json` (name, `lmVersion` reset to 1) · `DESIGN.md`, `README.md` (adapted in stage 3) · `.gitignore`.

## 2. What is replaced

| Spanish app | Here | Stage |
|---|---|---|
| `js/config.js` | new values (spec 02 §3): name, prefix `plm.`, `pl-PL`, Polish characters, no voice variants | 0 |
| `js/lang.js` | Polish rules (spec 05) | 1 (stage 0 leaves a minimal stub so the app boots) |
| `content/**` | deleted; then `content/syllabus.json` from `docs/plan/syllabus.json`, `levels.json` (all "soon" except A1), examples from `docs/plan/examples/` | 0 |
| `data/**` | regenerated | 0 |
| lab view and `content/lab` | Case Lab (spec 09); the timeline drawing code is kept for the aspect strip | 2 |
| accent colour, wordmark, favicon, home text | spec 11 | 3 |
| tests with Spanish fixtures | same tests with Polish fixtures | 1 |
| validator heuristics for Spanish (regional variants, `¿ ¡`) | Polish heuristics (speaker gender, diacritics) | 1 |
| docs/plan | this plan | – |

## 3. What to look for in the inventory (Spanish facts that must not survive)

Search the copied code for: `es-`, `Spanish`, `español`, `Spain`, `Latin America`, `vosotros`, the letters `ñ á é í ó ú ü ¿ ¡` outside `lang.js` / `config.js`, voice-variant UI, storage prefix `slm.`, export name, report URL, texts on the home page and in the first-run screen, README and DESIGN mentions, test fixtures, e2e selectors with Spanish content, the favicon and Open Graph image. `npm run check:lang` must be extended so that it fails on any of these outside `js/lang.js`, `js/config.js` and `content/`.

Every language fact found outside those two files is also a bug in the Spanish app's portability: list them in the inventory under "report to the Spanish repo" (the owner decides whether to fix them there; this project does not depend on it).

## 4. Result of stage 0

The app opens from `file://`, shows "Polish Levels Map", the A1 level page lists the 25 topics of the syllabus, the example topic (accusative) opens with its quiz and set, storage is under `plm.`, all unit tests that do not depend on language pass, and the language-dependent ones are listed as "pending stage 1".
