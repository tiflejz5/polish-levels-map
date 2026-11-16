# Port inventory — english-levels-map@275be9f → Polish Levels Map

Stage 0 output (spec 03). Written on 16 Nov 2026 against the unchanged code snapshot in this repo (commit "Import code snapshot from english-levels-map@275be9f"), which is byte-identical to `reference/english-levels-map/` for `js/`, `css/`, `tools/`, `assets/`.
Where this file and spec 03 disagree, this file wins; every disagreement is listed in §9.

Legend for **Decision**: keep = rename, `ELM`→`LM`, strings to English, no logic change · adapt = real changes (see specs) · drop = removed · replace = new file in a later stage.

## 1. Totals

| Folder | Files | String literals with Polish letters | other text-like literals (≥ 2 words, heuristic) | comments with Polish letters |
|---|---|---|---|---|
| `js/` | 61 | 1,517 | 1,028 | 1,191 |
| `tools/` | 24 | 753 | 367 | 200 |
| `css/` | 2 | 0 | 0 | 254 |
| `assets/` | 9 | 0 | 2 | 3 |

How counted: a small script (`node survey.js`, not committed) scans each `.js` file without comments for string literals. "PL strings" = literals containing `ąćęłńóśźż„”`; "other text" = literals with two or more words and no code-like characters (this column mixes Polish UI text without diacritics, English content snippets and false positives such as CSS class lists; treat it as an upper bound). Spec 03 §4 estimated "~1,500 literals with Polish diacritics in `js/`": confirmed (1,517). Code size: `js/` 1.3 MB, `css/` 280 kB.

## 2. Files

| File | Size | Lines | PL strings | other text strings | PL comments | Role | Decision | New name | Specs |
|---|---|---|---|---|---|---|---|---|---|
| js/app.js | 27.4 kB | 672 | 20 | 14 | 58 | boot, state, hash routing, autosave | adapt | app.js | 02 §6, 06 E1/E8 |
| js/base-content.js | 25.5 kB | 767 | 102 | 11 | 1 | built-in English checklist (content store seed) | drop | — | 01 D8, 06 E2 |
| js/c1-core.js | 25.4 kB | 591 | 16 | 16 | 30 | C1 Advanced tab; also hosts the shared Polish `plural()` | drop | — | 06 E8 |
| js/c1-exercises.js | 20.0 kB | 439 | 18 | 19 | 17 | C1 Use of English sets | drop | — | 06 E8 |
| js/c1-speaking.js | 6.7 kB | 128 | 9 | 12 | 2 | C1 speaking trainer | drop | — | 06 E8 |
| js/c1-writing.js | 3.7 kB | 78 | 7 | 5 | 2 | C1 writing trainer config | drop | — | 06 E8 |
| js/callouts.js | 7.0 kB | 139 | 5 | 6 | 9 | callout boxes keyed on heading text | adapt | callouts.js | 07 §1 |
| js/celebrate.js | 10.9 kB | 224 | 29 | 7 | 13 | milestone celebrations | keep | celebrate.js | 04 |
| js/data-menu.js | 10.1 kB | 224 | 30 | 12 | 9 | export / import / reset | adapt | data-menu.js | 02 §5 |
| js/default-data.js | 2.4 kB | 68 | 0 | 1 | 15 | default categories / empty skeleton | drop | — | 06 E2 |
| js/dialogs.js | 4.6 kB | 149 | 2 | 2 | 5 | confirm / prompt / alert on <dialog> | keep | dialogs.js | 04 |
| js/exam-core.js | 45.5 kB | 818 | 71 | 50 | 38 | exam registry: nav, pages, countdown, exam themes | adapt | exam-core.js | 06 E8, 12 |
| js/exam-logic.js | 7.4 kB | 155 | 9 | 1 | 8 | exam pure logic: E8 word count, zones, myExams, Polish dates | adapt | exam-logic.js | 06 E8 |
| js/exam-ui.js | 14.8 kB | 317 | 16 | 19 | 17 | exam date card, covers, My exams | adapt | exam-ui.js | 06 E8 |
| js/exercise-engine.js | 97.4 kB | 1799 | 183 | 120 | 114 | exercise session view, all item types, results, listening | adapt | exercise-engine.js | 05, 06 E3–E6 |
| js/exercise-hub.js | 18.3 kB | 324 | 26 | 24 | 11 | Practice hub, mixes, generator | keep | practice-hub.js | 04, 06 E2 |
| js/exercise-logic.js | 27.0 kB | 590 | 13 | 6 | 34 | pure exercise logic: grading, shuffling, mixes | adapt | exercise-logic.js | 05 §2, 06 E6 |
| js/final-logic.js | 5.4 kB | 119 | 0 | 1 | 8 | final test draw (pure) | adapt | final-logic.js | 06 E10 |
| js/fiszki-browse.js | 26.4 kB | 423 | 63 | 45 | 8 | deck browse and edit | keep | cards-browse.js | 04 |
| js/fiszki-harmonogram.js | 6.0 kB | 135 | 0 | 2 | 5 | SM-2-like scheduler (pure) | keep | cards-schedule.js | — |
| js/fiszki-logic.js | 46.0 kB | 840 | 11 | 3 | 61 | flashcard pure logic: answer check, cloze, queue, words, exams | adapt | cards-logic.js | 05 |
| js/fiszki-store.js | 7.0 kB | 159 | 2 | 1 | 15 | flashcards storage elm.<id>.fiszki | keep | cards-store.js | 02 §5 |
| js/fiszki-words.js | 28.1 kB | 544 | 54 | 22 | 16 | My words: selection menu, list | adapt | words.js | 05 §5 |
| js/fiszki.js | 62.6 kB | 1113 | 108 | 68 | 62 | Decks tab, review session | keep | cards.js | 04, 06 E5 |
| js/journal.js | 20.7 kB | 481 | 46 | 25 | 10 | My mistakes tab | adapt | mistakes.js | 02 §5 |
| js/learning-stats.js | 9.5 kB | 231 | 0 | 1 | 24 | attempts log, aggregates, auto-journal (pure) | keep | learning-stats.js | — |
| js/learning.js | 9.1 kB | 219 | 0 | 1 | 19 | dates, streak, placement algorithm, REVIEW_STEPS (pure) | adapt | learning.js | 02 §5 |
| js/level-final.js | 19.9 kB | 345 | 47 | 37 | 20 | level final test view, badge | adapt | final.js | 06 E10 |
| js/level-test.js | 18.9 kB | 372 | 24 | 38 | 18 | placement test view | keep | placement.js | 06 E10 |
| js/markdown.js | 17.3 kB | 451 | 3 | 6 | 26 | Markdown renderer, [[id]] chips | adapt | markdown.js | 05 §5, 06 E5 |
| js/mistake-task.js | 8.6 kB | 160 | 4 | 3 | 11 | original task inside a mistake card | adapt | mistake-task.js | 06 E8 |
| js/motion.js | 2.0 kB | 58 | 0 | 1 | 3 | GSAP on demand | keep | motion.js | — |
| js/niezbednik.js | 23.4 kB | 496 | 16 | 26 | 37 | topic pages: routing, label matching, view | adapt | handbook.js | 06 E2 |
| js/notes.js | 10.4 kB | 209 | 16 | 15 | 6 | My notes | keep | notes.js | 04 |
| js/pisanie-wzorzec.js | 15.4 kB | 297 | 9 | 18 | 12 | model answer with comments | keep | writing-model.js | 04, 12 |
| js/pisanie-zwroty.js | 13.1 kB | 217 | 20 | 12 | 4 | phrase bank | keep | writing-phrases.js | 04, 07 §8 |
| js/pisanie.js | 11.0 kB | 202 | 20 | 16 | 8 | Writing section list | keep | writing.js | 04 |
| js/powtorki.js | 9.7 kB | 188 | 34 | 14 | 12 | Review: Due today tab | keep | review.js | 04 |
| js/print.js | 1.4 kB | 41 | 0 | 1 | 1 | print preparation | keep | print.js | — |
| js/profile-data.js | 48.6 kB | 1082 | 5 | 2 | 62 | per-profile learning data, key list, markActivity | adapt | profile-data.js | 02 §5 |
| js/profiles.js | 23.8 kB | 574 | 37 | 27 | 17 | profile menu, welcome screen, learning settings | adapt | profiles.js | 04, 06 E4 |
| js/recorder.js | 9.0 kB | 182 | 17 | 11 | 5 | shared voice recorder | keep | recorder.js | — |
| js/render.js | 22.2 kB | 441 | 16 | 17 | 45 | sidebar levels, level page, checklist | adapt | render.js | 06 E1, E2 |
| js/reviews.js | 16.4 kB | 326 | 0 | 1 | 23 | single review queue (pure), legacy redirects | keep | review-queue.js | 02 §6 |
| js/search-logic.js | 8.3 kB | 190 | 2 | 1 | 10 | search engine (pure): fold, tokens, typos | adapt | search-logic.js | 05 |
| js/search.js | 15.9 kB | 324 | 25 | 7 | 7 | search UI | adapt | search.js | 04 |
| js/shortcuts.js | 7.3 kB | 185 | 26 | 7 | 6 | shortcut panel, shared speak() | adapt | shortcuts.js | 05 §4 |
| js/sidebar.js | 6.9 kB | 171 | 2 | 5 | 14 | sidebar behaviour | keep | sidebar.js | 02 §5 |
| js/speaking-trainer.js | 37.8 kB | 641 | 57 | 49 | 15 | speaking trainer (exam formats) | adapt | speaking-trainer.js | 05 §4, 12 |
| js/stats-page.js | 17.2 kB | 295 | 56 | 22 | 10 | Stats page | keep | stats-page.js | 04, 06 E4 |
| js/store.js | 16.8 kB | 434 | 16 | 5 | 29 | storage, content store, migrations, corrupt-data screen | adapt | store.js | 02 §5, 06 E2 |
| js/szlak-logic.js | 10.8 kB | 191 | 2 | 1 | 11 | trail pure logic | adapt | trail-logic.js | 06 E9 |
| js/szlak-store.js | 6.5 kB | 160 | 2 | 1 | 9 | trail storage elm.<id>.szlak | adapt | trail-store.js | 02 §5, 06 E9 |
| js/szlak.js | 36.7 kB | 630 | 81 | 70 | 26 | Trail view and stop sheet | adapt | trail.js | 06 E9 |
| js/tense-lab.js | 34.5 kB | 642 | 43 | 44 | 25 | Tense lab: map, card, timeline, pick, compare | adapt | lab.js + lab-cases.js | 09, 06 E7 |
| js/theme.js | 4.1 kB | 111 | 1 | 1 | 8 | theme switch | keep | theme.js | 02 §5 |
| js/toc.js | 3.6 kB | 88 | 1 | 5 | 3 | table of contents | keep | toc.js | — |
| js/today.js | 25.8 kB | 498 | 44 | 21 | 38 | Today page | keep | today.js | 04, 06 E1 |
| js/ui.js | 19.5 kB | 425 | 9 | 12 | 30 | icons, rings, breadcrumbs, loadModule/loadScript | keep | ui.js | 02 §4 |
| js/utils.js | 4.9 kB | 138 | 0 | 1 | 10 | el(), uid, dates, bold | keep | utils.js | 04 §1 |
| js/writing-trainer.js | 24.0 kB | 438 | 42 | 37 | 19 | shared writing trainer | adapt | writing-trainer.js | 12 |
| css/print.css | 7.6 kB | 116 | 0 | 0 | 8 | print styles | adapt | css/print.css | 11 §5 |
| css/style.css | 272.5 kB | 4407 | 0 | 0 | 246 | all styles and tokens | adapt | css/style.css | 09 §3, 11 |
| tools/e2e-start.js | 17.7 kB | 287 | 42 | 29 | 1 | browser smoke tests (Playwright, skips without it) | adapt | e2e.js | 13 |
| tools/kontrast.js | 13.8 kB | 214 | 81 | 24 | 11 | WCAG contrast of token pairs (6 theme scopes) | adapt | contrast.js | 11 §2 |
| tools/rozklad-odpowiedzi.js | 7.0 kB | 164 | 4 | 3 | 6 | one-off rewrite of A–D answer letters in sets | drop | — | — |
| tools/rozklad-regula.js | 3.2 kB | 72 | 2 | 1 | 3 | rule: balanced A–D answer letters | keep | build/answer-distribution.js | 07 |
| tools/sciagi-pdf.js | 5.8 kB | 115 | 7 | 1 | 3 | cheat sheet → PDF, one-page check | keep | cheatsheets-pdf.js | 11 §5 |
| tools/testy.js | 155.1 kB | 2374 | 345 | 159 | 81 | unit tests (193) | adapt | tests.js | all |
| tools/waliduj-c1-uoe.js | 3.3 kB | 65 | 4 | 2 | 2 | wrapper around Python C1 validator | drop | — | 06 E8 |
| tools/waliduj-cwiczenia.js | 38.6 kB | 575 | 117 | 77 | 22 | exercise + lab validator (Node) | adapt | validate-exercises.js | 06 E11 |
| tools/waliduj-fiszki.js | 6.0 kB | 127 | 9 | 4 | 2 | Python deck validator wrapper + deck rules | adapt | validate-decks.js | 06 E11 |
| tools/waliduj-mowienie.js | 8.0 kB | 143 | 15 | 11 | 1 | speaking data validator | keep (stage E) | validate-speaking.js | 12 |
| tools/waliduj-szlak.js | 2.5 kB | 52 | 1 | 3 | 2 | wrapper around Python trail validator | drop | (rules in validate-trail.js) | 06 E9 |
| tools/waliduj-v6.js | 3.7 kB | 63 | 13 | 3 | 2 | wrapper around validate_v6.py + cheat sheet checks | adapt | validate-cheatsheets.js | 06 E11 |
| tools/waliduj-wzorce.js | 5.6 kB | 93 | 15 | 6 | 2 | model answer comments validator | keep (stage E) | validate-models.js | 12 |
| tools/waliduj-zwroty.js | 4.0 kB | 73 | 23 | 5 | 2 | phrase bank validator | keep | validate-phrases.js | 07 §8 |
| tools/waliduj-zycie.js | 5.8 kB | 95 | 20 | 4 | 1 | 'Życie i egzamin' section validator | drop (stage E may revive) | — | 01 D13 |
| tools/zbuduj-cwiczenia.js | 6.9 kB | 138 | 4 | 4 | 6 | sets + lab → lazy .js | adapt | build/exercises.js | 02 §4 |
| tools/zbuduj-egzaminy.js | 6.0 kB | 107 | 2 | 1 | 7 | exam registry + exam data | adapt | build/exams.js | 06 E8 |
| tools/zbuduj-fiszki.js | 2.0 kB | 41 | 0 | 3 | 2 | decks → lazy .js | adapt | build/decks.js | 02 §4 |
| tools/zbuduj-niezbednik.js | 12.1 kB | 228 | 18 | 11 | 18 | pages, summaries, cheat sheets, placement → data | adapt | build/pages.js | 02 §4 |
| tools/zbuduj-szlak.js | 2.0 kB | 43 | 0 | 3 | 2 | trail + quizzes → lazy .js | adapt | build/trail.js | 06 E9 |
| tools/zbuduj-szukaj.js | 15.0 kB | 251 | 21 | 9 | 15 | search index | adapt | build/search.js | 05 |
| tools/zbuduj-testy-koncowe.js | 2.5 kB | 52 | 6 | 2 | 2 | final test pools → lazy .js | adapt | build/finals.js | 02 §4 |
| tools/zbuduj-zasoby.js | 5.0 kB | 104 | 4 | 1 | 5 | copies fonts, icons, GSAP from node_modules to assets/ | keep | assets.js (not in spec 02 — see Q3) | 02 §4 |
| tools/zbuduj-zwroty.js | 1.2 kB | 28 | 0 | 1 | 2 | phrase bank → lazy .js | adapt | build/phrases.js | 07 §8 |
| assets/favicon-180.png | 9.7 kB | – | 0 | 0 | 0 | favicon | replace (stage 7) | same | 11 |
| assets/favicon.svg | 1.1 kB | 23 | 0 | 0 | 0 | favicon | replace (stage 7) | same | 11 |
| assets/fonts | – | – | 0 | 0 | 0 | Fraunces, Inter: latin + latin-ext woff2 | keep | same | 11 §5 |
| assets/ikony.js | 11.0 kB | 8 | 0 | 0 | 1 | Lucide icon subset | keep | icons.js | — |
| assets/krainy.js | 1.5 kB | 4 | 0 | 0 | 1 | land symbols | keep | lands.js | 01 D15 |
| assets/Lucide-LICENSE.txt | 3.2 kB | 44 | 0 | 0 | 0 | licence | keep | same | — |
| assets/stany-puste.js | 1.6 kB | 4 | 0 | 2 | 1 | empty-state art | keep | empty-states.js | — |
| assets/vendor | – | – | 0 | 0 | 0 | GSAP + DrawSVG + MotionPath | keep | same | — |
| assets/warstwice.svg | 8.5 kB | 1 | 0 | 0 | 0 | contour-line pattern | keep | same | — |

Notes on the table:

- `tools/testy.js` is 155 kB with 345 Polish-letter literals: test names and fixture texts. Test names are translated in stage 2; English-language fixtures are replaced in stage 3 (§7).
- The four Python-wrapping validators (`waliduj-c1-uoe`, `waliduj-fiszki` part 1, `waliduj-szlak`, `waliduj-v6`) call `scripts/*.py` or `docs/rozbudowa-v6/scripts/validate_v6.py`, which were **not copied** (they validate English content). Their rules are re-implemented in Node from `docs/plan/scripts/validate_plan.py` in stage 4 (E11).
- `css/style.css` has six theme scopes: app, and five exam sections (`certyfikat`, `certyfikat-b2`, `egzamin-osmoklasisty`, `matura-podstawowa`, `matura-rozszerzona`: 41 selectors). All exam scopes go in stage 1B; the exam accent comes from the registry later (spec 03 §2).

## 3. English-specific and Polish-exam-specific logic (spec 03 §3, checked)

Each item: what it is, where, what happens to it, stage.

### 3.1 Answer checking — two separate checkers (confirmed, plus one new finding)

| Place | What | Goes to | Stage |
|---|---|---|---|
| `js/exercise-logic.js:31-38` `normalize` | trim, lower-case, `’`→`'`, drop final punctuation | `LM.lang.normalizeAnswer` | 3 |
| `js/exercise-logic.js:53` `distance` + `:197` typo hint | Levenshtein "close" check | `LM.exLogic.match` (`near`) | 3 |
| `js/exercise-logic.js:205` `FIXED_CONTRACTIONS`, `:212` `normalizeSentence`, `:219` `expandWord`, `:231` `sentenceVariants`, `:245`, `:289` | English contractions, `'s` / `'d` double reading | **deleted**; `LM.lang.variants` returns `[str]` | 3 |
| `js/exercise-logic.js:304` `evaluateSentence` (word diff) | word-by-word diff against the closest variant | stays generic, calls `LM.lang.normalizeSentence` | 3 |
| `js/exercise-logic.js:318-327`, `:372` `trNorm`, `:385` `trTokens`, `:417` `scoreTransformationParts` | Cambridge Part 4 rules: contractions count as two words, word limit `[2, 5]` | `trTokens` uses `LM.lang.countWords`; contraction rule deleted; `scoreTransformationParts` kept (spec 03) | 3–4 |
| `js/exercise-logic.js:365` `plural(n, one, few, many)` | Polish three-form plural in a **pure** file (used in messages) | `LM.plural` (English) | 2 |
| **new:** `js/fiszki-logic.js:45` `normalize`, `:55` `levenshtein`, `:72` `checkAnswer` | flashcards have their **own** answer checker (exact / typo / wrong) | replaced by `LM.exLogic.match` (spec 05 §2 says "used by every typed answer in exercises and flashcards") | 3 |

### 3.2 Speech — four files, five implementations (confirmed)

| Place | Voice choice | Stage |
|---|---|---|
| `js/exercise-engine.js:440-491` (`synth`, listening scripts with two voices: `/^en[-_]GB/` then US, speaker labels "A:", "Man:", "Speaker 2:") | `en-GB` → `en-US`; `u.lang = "en-GB"` fallback at `:491` | 3 |
| `js/exercise-engine.js:968-978` (dictation) | same, `:978` | 3 |
| `js/shortcuts.js:111-133` (`speak`, key **S**) | `en-GB` → `/^en/`, `:133` | 3 |
| `js/speaking-trainer.js:40-54` (`voiceOk`, "Examiner reads aloud") | `:44`, `:53-54` | 3 (trainer itself waits for stage E) |
| `js/tense-lab.js:75-88` (listen buttons) | `:86-88` | 3 (lab rewritten in 6) |

All become `LM.speech` (`pl-PL`, no variants). Listening scripts: the two-voice speaker-label logic is generic and stays inside `LM.speech`.

### 3.3 Flashcards and My words

| Place | What | Stage |
|---|---|---|
| `js/fiszki-logic.js:369` `isPolish` (diacritics test) | detects the **explanation** language; here Polish is the **target**, so the meaning flips: `LM.lang.isTarget` | 3 |
| callers `js/fiszki-words.js:80`, `js/fiszki.js:719-720` | "offer selection only if not Polish" / "speak the side that is not Polish" → "only if target" / "speak the target side" | 3 |
| `js/fiszki-logic.js:363` `ABBREVIATIONS` (English: e.g, mr, mrs…), `:393` `splitSentences`, `:402` initials rule, `:433` `extractSentence` | sentence splitting | `LM.lang.abbreviations` | 3 |
| `js/fiszki-logic.js:375` `wordFromSelection`, `:384` `findWord`, `:446` `makeCloze`, `:457` `wordKey` | word boundaries; uses `\p{L}` already (OK for ł, ż), but `findWord` must be checked with Polish inflected forms | 3 |
| `js/fiszki-words.js:42-43` `inPolishColumn` (columns "Polski", "Po polsku", "Znaczenie") | Polish column is **excluded** today; here the Polish column is the target side. Replaced by the `lang` attribute (spec 05 §5) | 3 |
| `js/fiszki-words.js:122`, `:380` "Znaczenie po polsku" | UI text about the meaning language → "Meaning in English" | 2 |
| `js/fiszki-words.js:364` `localeCompare(…, "en")` | A–Z sort of target words → `LM.APP.targetLang` | 3 |
| `js/fiszki-logic.js:620-628` `EXAMS` (`e8`, `mp`, `mr`, `matura`, `b2`, `c1`) + `examsOf`; `js/fiszki-browse.js:109,127`; `js/fiszki.js:998-1001` exam → deck map | Polish-exam codes hard-coded | registry-driven, empty until stage E | 1B |

### 3.4 Search

| Place | What | Stage |
|---|---|---|
| `js/search-logic.js:21` `FOLD` table (`ł`→`l`, `ß`, `ø`, quotes), `:24` `fold` | `LM.lang.fold` (spec 05: same length, ł handled) | 3 |
| `js/search-logic.js:37`, `:141`, `:174` tokeniser `[^a-z0-9']` | works only after folding; must use `LM.lang.wordPattern` so highlight offsets stay right | 3 |
| `js/journal.js:164,246,248`, `js/profiles.js:53`, `js/search.js:62`, `js/profile-data.js:487`, `js/notes.js:172` `toLocaleLowerCase("pl")` | locale-specific lower-casing of UI data (names, queries) | plain `toLowerCase()` or `LM.lang.fold` | 2 |

### 3.5 Tense lab (spec 09)

`js/tense-lab.js:29-37` fixed groups present / past / future × simple / continuous / perfect / perfect-continuous; `:52` `isForm`; `:56` data `dane/lab-dane.js`; 12 × `lang: "en"`. Kept: card layout, pick tree, compare, timeline drawing, search entries, notes button. Stage 6.

### 3.6 Exams (Polish school exams)

| Place | What | Stage |
|---|---|---|
| `js/exam-logic.js:5,18` `countWordsE8` (CKE rules) | → exam config, not engine | 1B |
| `js/exam-core.js:116` `toLocaleDateString("pl-PL")` | → `LM.fmt.date` | 2 |
| `js/exam-core.js:45` lazy `niezbednik/<exam>-dane.js` | → `data/exam-<id>.js` | 1B |
| `js/exam-core.js:500` recorder + speaking trainer modules | kept generic | 1B |
| `js/c1-*.js`, `ELM.c1` used by `js/render.js:185,202`, `js/app.js:223,275,296` | dropped | 1B |
| CSS exam scopes (§2 notes), `tools/kontrast.js:27-38` | dropped / registry | 1B, 7 |

### 3.7 Polish UI helpers that look generic

| Place | What | Stage |
|---|---|---|
| **15 copies** of `plural(n, one, few, many)`: own body in `c1-core.js:250`, `exam-ui.js:21`, `exercise-logic.js:365`, `fiszki.js:43`, `level-final.js:44`, `szlak.js:31`; **delegating to `ELM.c1.plural`** in `exam-core.js:37`, `exercise-engine.js:1348`, `journal.js:224`, `pisanie.js:37`, `powtorki.js:35`, `search.js:272`, `stats-page.js:35`, `today.js:34`; `pisanie-zwroty.js:37` delegates to `ELM.pisanie.plural` | → one `LM.plural` (spec 04 §1) | 2 (see §9, item 6) |
| dates: `js/fiszki.js:116,120,1082`, `js/fiszki-browse.js:394`, `js/notes.js:135,150` (`pl-PL`) | → `LM.fmt` | 2 |
| `js/callouts.js:18-23` rules match Polish headings (*najczęstsza pułapka, na egzaminie c1, życie i egzamin, kluczowe myśli, co dalej, przykład*) | → English headings of spec 07 §1 | 2 |
| typography: „…” in 1,517 literals | → “…” | 2 |
| `index.html:2` `lang="pl"`, `:9` title, `:50` noscript text | → `lang="en"`, new title | 1A / 2 |

### 3.8 Target-language markup: `lang` attributes (**not in spec 03 §3**)

The engine marks target-language text with hard-coded `lang: "en"` (53 places) and UI or explanation text with `lang: "pl"` (8 places). In this app the target is `pl` and the UI is `en`, so both sets swap meaning:

- `lang: "en"` → `LM.APP.targetLang`: `exercise-engine.js` (16: 537, 762, 799, 867-871, 903, 940-942, 1047, 1121, 1269, 1330 …), `speaking-trainer.js` (13), `tense-lab.js` (12), `fiszki.js` (4: 167, 190, 197, 203), `writing-trainer.js` (3), `level-test.js` (2), `pisanie-zwroty.js` (2), `pisanie-wzorzec.js` (1).
- `lang: "pl"` → removed (the UI is English, `<html lang="en">`): `exercise-engine.js:956` (translate source; here the source is English, spec 07), `level-test.js:199`, `pisanie-wzorzec.js:123,172`, `pisanie-zwroty.js:167,172`, `writing-trainer.js:289`.
- `exercise-engine.js:855` `match` mode `translation`: left column `pl`, right `en` → flips.
- Phrase bank fields `en` / `pl` (`pisanie-zwroty.js:171-172`, `writing-trainer.js:288-289`): spec 07 §8 renames them to `text` (target) / `en` (meaning).

Stage 3 (`markdown.js` conventions, spec 05 §5) and stage 4 (item types).

## 4. Polish text in code: UI vs. language facts

Almost all Polish text in `js/` is **UI** (translated in stage 2). Polish text that is a **language fact** and must survive as data for Polish as the target language is small:

| Place | Fact | Moves to |
|---|---|---|
| `js/search-logic.js:21` | `ł` → `l` folding | `LM.lang.stripMarks` / `fold` |
| `js/fiszki-logic.js:369` | Polish diacritics set `ąćęłńóśźż` | `LM.lang.isTarget`, `LM.APP.chars` |
| `js/fiszki-words.js:42-43` | column names "Polski", "Po polsku" | none: replaced by `lang` attributes |
| `js/exercise-logic.js:365` and the 14 other `plural` copies | Polish plural rule (1 / 2–4 / 5+) | **not needed** for UI. Spec 05 has no Polish plural in `LM.lang`; add one only if content generation needs it |

Everything else with Polish letters in `js/` (1,500+ literals, 1,191 comments) is UI or comment → stage 2.

## 5. localStorage keys (compared with spec 02 §5)

All 23 key names used in the code, with their location. All 31 `localStorage` calls in `js/` sit inside a `try` block (checked with a script: a `try {` within the 6 lines before each call).

| Key in code | Where defined | Spec 02 §5 | New key |
|---|---|---|---|
| `elm_theme_v1` | `theme.js:18` | ✓ | `plm.theme` |
| `elm_sidebar_v1` | `sidebar.js:23` | ✓ | `plm.sidebar` |
| `elm_profiles_v1` | `store.js:24` | ✓ | `plm.profiles` |
| `elm_ui_v1` | `store.js:25` | ✓ | `plm.ui` |
| `elm_content_v1` | `store.js:22` | dropped ✓ | — |
| `elm_content_corrupt_backup` | `store.js:27` | dropped ✓ | — |
| `elm_progress_v1` | `store.js:23` | dropped ✓ | — |
| `elm_celebrated_v1` | `profile-data.js:57` | ✓ | `plm.celebrated` |
| `elm_journal_v1` | `profile-data.js:57` | ✓ | `plm.journal` |
| `elm_activity_v1` | `profile-data.js:57` | ✓ | `plm.activity` |
| `elm_leveltest_v1` | `profile-data.js:57` | ✓ | `plm.placement` |
| `elm_exercises_v1` | `profile-data.js:57` | ✓ | `plm.exercises` |
| `elm_attempts_v1` | `profile-data.js:58` | ✓ | `plm.attempts` |
| `elm_autojournal_v1` | `profile-data.js:58` | ✓ | `plm.autojournal` |
| `elm_learnprefs_v1` | `profile-data.js:58` | ✓ | `plm.prefs` |
| `elm_notes_v1` | `profile-data.js:58` | ✓ | `plm.notes` |
| `elm_exams_v1` | `profile-data.js:59` | ✓ | `plm.exams` |
| `elm_leveltests_v1` | `profile-data.js:59` | ✓ | `plm.finals` |
| `elm_phrases_v1` | `profile-data.js:59` | ✓ | `plm.phrases` |
| `elm_speaking_v1` | `profile-data.js:59` | ✓ | `plm.speaking` |
| `elm_c1_v1` | `c1-core.js:29` | merged into `plm.exams` | — (device-wide today, not exported; dropped with C1) |
| `elm.<profileId>.fiszki` | `fiszki-store.js:18` | ✓ | `plm.cards.<profileId>` |
| `elm.<profileId>.szlak` | `szlak-store.js:18` | ✓ | `plm.trail.<profileId>` |
| `elm_search_recent_v1` | `search.js:25` | ✓ | `plm.search-recent` |

Result: spec 02 §5 matches the code; no key is missing from the spec. The key list lives in `profile-data.js:57-59` already, so the registry of spec 02 grows from it.

Legacy code to remove in stage 1A (D3, "no migrations"): `store.js:74` `migrate` + `CURRENT_VERSION` (content store), `store.js:261` `migrateProfilesV1` (sample profiles `p_<name>`), `store.js:23` old progress import, `learning.js:19` `REVIEW_STEPS` (kept only for export compatibility), `fiszki-logic.js:784` `migrateJournal`, `:725-740` `journalCardsV2` rebuild, `:598` flags `migratedJournal` / `journalCardsV2` / `c1DeckV6`, `reviews.js:203` `redirectFor` (legacy routes), journal entry field `review`.

## 6. Routes (compared with spec 02 §6)

Handled in `app.js:217-291` (`applyRoute`), each module's `parseRoute`, plus `reviews.redirectFor`:

| Route in code | Module | Spec 02 §6 |
|---|---|---|
| `#/`, empty | home | `#/` |
| `#/dzis` | today.js | `#/today` |
| `#/szlak` | szlak.js | `#/trail` |
| `#/a1` … `#/c2` | render.js | same |
| `#/a1/<category>-<slug>` (file path, label matching) | niezbednik.js | same shape, ids from the syllabus |
| `#/a1/test`, `#/a1/sciaga` | level-final.js, niezbednik.js | `#/a1/test`, `#/a1/cheatsheet` |
| `#/test-poziomu` | level-test.js | `#/placement` |
| `#/powtorki[/na-dzis]`, `/talie[/…]`, `/talie/tematy/<lvl>`, `/talie/talia/<id>`, `/moje-bledy`, `/moje-slowa`, `/sesja[?tylko=…&max=…]` | powtorki.js, fiszki.js, journal.js | `#/review`, `/decks[/…]`, `/mistakes`, `/words`, `/session` |
| `#/cwiczenia`, `/mieszane`, `/zestaw/<id>`, `/mix/<id>`, `/sesja`, `/slabe[/<topic>]` | exercise-hub.js, exercise-engine.js | `#/practice…`, `/set/`, `/mix/`, `/session`, `/weak` (`/mieszane` has no counterpart: see §9 item 8) |
| `#/laboratorium-czasow[/<tense>]`, `/dobierz`, `/porownaj/<a>/<b>` | tense-lab.js | `#/lab[/…]` |
| `#/statystyki`, `#/notatki` | stats-page.js, notes.js | `#/stats`, `#/notes` |
| `#/pisanie`, `/wzorce/<exam>/<id>`, `/zwroty[/<group>]` | pisanie.js | `#/writing…`, `/models/…`, `/phrases…` |
| `#/certyfikat-c1[/…]` (5 sub-routes) | c1-*.js | dropped |
| `#/<exam id>[/…]` incl. `/trening-mowienie` | exam-core.js | `#/exams/<exam id>[/…]` |
| legacy `#/fiszki…`, `#/bledy…` → redirects | reviews.js:203 | dropped (no legacy redirects) |
| unknown hash | falls back to **home** (`app.js:286`) | "Page not found" (stage 1B) |

## 7. On-demand modules and data

Mechanism: `ELM.loadScript(src)` and `ELM.loadModule(file)` (`ui.js:308-324`, version taken from the `?v=` of `js/ui.js`), plus `ELM.exercises.asset()` (`exercise-engine.js:64`) and a similar helper in `level-final.js:28`. All are plain `<script>` tags, so `file://` works.

| Loaded on demand | By | New path (spec 02 §4) |
|---|---|---|
| `js/recorder.js`, `js/speaking-trainer.js` | exam-core.js:500, c1-speaking.js:80 | same (renamed) |
| `js/pisanie-wzorzec.js`, `js/pisanie-zwroty.js` | pisanie.js:181-187, writing-trainer.js:309 | `js/writing-model.js`, `js/writing-phrases.js` |
| `niezbednik/test-poziomu-dane.js` | level-test.js:348 | `data/placement.js` |
| `niezbednik/testy-poziomow/<lvl>.js` | level-final.js | `data/final-<level>.js` |
| `szlak/quizy-<lvl>.js` | szlak.js:131 | `data/quizzes-<level>.js` |
| `cwiczenia/cwiczenia-indeks.js`, `cwiczenia/tematy/<id>.js` | exercise-engine.js:74 | `data/sets-index.js`, `data/sets/<id>.js` |
| `dane/lab-dane.js` | tense-lab.js:56 | `data/lab.js` |
| `dane/szukaj-indeks.js` | search.js:72 | `data/search-index.js` |
| `dane/fiszki/talie/<id>.js` | fiszki.js | `data/decks/<id>.js` |
| `dane/pisanie/zwroty-dane.js` | pisanie-zwroty.js | `data/phrases.js` |
| `niezbednik/<exam>-dane.js` | exam-core.js:45 | `data/exam-<id>.js` |
| `assets/vendor/gsap.min.js` + plugins | ui.js:332-334 | same |

Loaded at start by `index.html` and **missing in this repo** (content was not copied): `niezbednik/niezbednik-dane.js`, `niezbednik/certyfikat-c1-dane.js`, `dane/egzaminy-rejestr.js`, `szlak/szlak-dane.js`, `dane/fiszki/fiszki-indeks.js`. So the snapshot does not boot until stage 1A generates `data/`. This is expected.

## 8. Unit tests and baseline

### 8.1 Baseline in `reference/` (Node 26.8.1, Python 3.14.7)

| Command | Result |
|---|---|
| `node tools/testy.js` | **193 ok, 0 failed** |
| `waliduj-cwiczenia` | OK |
| `waliduj-fiszki` | OK, 2 warnings |
| `waliduj-c1-uoe` | OK |
| `waliduj-szlak` | OK |
| `waliduj-zycie` | OK, 15 warnings |
| `waliduj-wzorce` | OK (28 texts) |
| `waliduj-zwroty` | OK (14 groups, 179 phrases) |
| `waliduj-mowienie` | OK |
| `waliduj-v6` | 0 errors, 2 warnings |
| `e2e-start.js` | skipped (no `playwright-core`) |

`npm run build` was **not** run in `reference/`: it writes generated files there (the rule is: never edit `reference/`).

In **this repo** (snapshot without content): `node tools/testy.js` runs 31 tests, then stops with `ENOENT … cwiczenia/tematy` (it reads the English exercise sets). Expected; fixed in stage 1A.

### 8.2 Tests by group, and what survives

| Group (reference) | Tests | Module | Survives | Notes |
|---|---|---|---|---|
| Daty | 5 | learning | ✓ | |
| Harmonogram powtórek | 7 | learning `REVIEW_STEPS` | ✗ | legacy (§5); delete in 1A |
| Seria nauki | 8 | learning | ✓ | |
| Test poziomu | 11 | learning | ✓ | pool fixtures generic |
| Silnik zadań | 22 | exercise-logic | partly | reads `cwiczenia/tematy` (English sets) → rewrite on the example set (1A/4); contraction and `'s` tests → Polish fixtures (3) |
| Testy końcowe poziomów | 16 | final-logic | partly | 4 categories → syllabus categories (E10, stage 4); reads real English pools (`:693-745`) → fixture |
| Dziennik podejść i statystyki | 9 | learning-stats | ✓ | |
| Wyszukiwarka | 5 | search-logic | ✓ → Polish fixtures | stage 3 |
| Egzaminy: strefy licznika | 2 | exam-logic | ✗ | E8 word zones → exam config fixture (1B) |
| Fiszki: harmonogram (vectors) | 11 | cards-schedule | ✓ | `dane/fiszki/scheduler-vectors.json` copied |
| Fiszki: ocena, cloze, kolejka, TSV/CSV, stan | 14 | cards-logic | ✓ → Polish fixtures for check/cloze | stage 3 |
| Talia Certyfikat C1 | 1 | cards (C1) | ✗ | dropped with C1 |
| Szlak: logika | 9 | trail-logic | ✓ | input format changes with E9 |
| Szlak: magazyn | 4 | trail-store | ✓ | keys → `plm.` |
| Ulubione zwroty | 2 | profile-data | ✓ | |
| Trener mówienia: seen | 1 | profile-data | ✓ | |
| Egzaminy z tagów karty | 1 | cards-logic `examsOf` | rewrite | registry-driven (1B) |
| Moje słowa | 14 | cards-logic | ✓ → Polish fixtures (`isTarget`, abbreviations, cloze) | stage 3 |
| Powtórki v8: migracja Dziennika | 9 | cards-logic `migrateJournal` | ✗ | legacy (§5) |
| Powtórki v8: kolejka | 13 | review-queue | ✓ | |
| Dziś v8 | 4 | learning | ✓ | |
| Treści v8: sąsiedzi tematu | 1 | handbook | rewrite | reads `niezbednik/index.json` → syllabus |
| Treści v8: etykieta zestawu | 1 | exercise-logic | ✓ | |
| Treści v8: odsłuch klawiszem S | 2 | exercise-logic `speechText` | ✓ | |
| Kontrola v8: przeplatanie | 3 | review-queue | ✓ | |
| Rozkład liter A–D | 1 | tools/rozklad-regula | ✓ | |
| Karty „Moje błędy” | 11 | cards-logic, mistake-task | partly | `journalCardsV2` parts are legacy; C1 refs `c1:<set>:<n>` dropped |
| Fiszki: harmonogram i zapis | 6 | cards-logic | ✓ | |
| **Total** | **193** | | ≈ 160 survive (some with new fixtures), ≈ 30 are deleted as legacy / C1 / E8 | exact list in the stage 1A and 1B summaries |

## 9. Plan vs. code: disagreements and gaps

1. **Second answer checker.** Flashcards (`fiszki-logic.js:45-80`) have their own normalize / Levenshtein / `checkAnswer`. Spec 03 lists only exercise-logic. Spec 05 §2 already requires one `match` for both: no spec change, only a wider stage 3 scope.
2. **`lang` attributes** (§3.8): 53 hard-coded `lang: "en"` and 8 `lang: "pl"`, missing from spec 03 §3. Proposal: add item 13 to spec 03 §3 ("hard-coded `lang` attributes; target and UI languages swap").
3. **`isPolish` flips meaning** (already noted in spec 03 after the plan revision): confirmed at 3 call sites.
4. **Python validators.** Four Node validators are thin wrappers around Python scripts that were not copied. Spec 03 says "rules for kept data formats are ported". In practice the rules to keep are in `waliduj-cwiczenia.js` (Node, 575 lines) and `docs/plan/scripts/validate_plan.py`. Until stage 4, `npm run validate` can only run the Node-native rules.
5. **`tools/zbuduj-zasoby.js`** (copies fonts, icons and GSAP from `node_modules` into `assets/`) is not in spec 02 §2's tools list. Proposal: keep it as `tools/assets.js` and the npm script `assets` (needed only after updating the font, icon or GSAP packages).
6. **`plural` delegates to C1.** Eight files use `ELM.c1.plural` and fall back to the *many* form. Stage 1B drops `c1-*.js` before stage 2 introduces `LM.plural`, so between 1B and 2 these UI texts show the wrong Polish plural form (no crash). Proposal: in 1B, move the existing Polish `plural` into `utils.js` as a temporary `LM.plural3`; stage 2 replaces it.
7. **Exam CSS scopes**: five exam sections (41 selectors), not only `certyfikat` as spec 03 §2 says. All go in 1B.
8. **Route `#/cwiczenia/mieszane`** (mixed sets list) has no counterpart in spec 02 §6. Proposal: `#/practice/mixes`.
9. **Unknown routes** fall back to home today; spec 02 wants "Page not found" (already in prompt 1B).
10. **`tools/rozklad-*`**: spec 03 left them open. Decision: keep `rozklad-regula.js` (validator rule with a unit test), drop `rozklad-odpowiedzi.js` (one-off data rewrite).
11. **`elm_c1_v1`** is device-wide and not exported; spec 02 maps it into `plm.exams`. Since C1 is dropped, nothing to migrate (D3): consistent.
12. **Corrupt-data screen.** `store.js` rescues a broken *content store* (`elm_content_corrupt_backup`). With the content store removed (D8), the screen should cover broken `plm.profiles` instead. Proposal for 1A: keep the screen, point it at profiles, no backup key.
13. **`index.html`** loads 5 content data files that do not exist here (§7), so the snapshot does not open until 1A. Expected, listed so nobody reads it as a bug.
14. **Test count**: spec 03 gave no number; baseline is 193.

## 10. Questions for the owner

1. §9.5: keep the asset-copy tool as `npm run assets`? (recommended: yes)
2. §9.6: temporary `LM.plural3` between stages 1B and 2, or accept wrong Polish plural forms in the still-Polish UI for one stage? (recommended: accept; it is invisible in English later and costs nothing)
3. §9.8: `#/practice/mixes` for the mixed-set list?
4. Speaking trainer, writing trainer and model answers (`speaking-trainer.js`, `writing-trainer.js`, `pisanie-*.js`) are kept in the engine but have no content until stage E (and B1 for the phrase bank). Hide their sidebar entries while their data is empty, like the exams group? (recommended: yes, same rule as E8)
