# Prompty do Claude Code (Opus 5.5) – Polish Levels Map

Nagłówki i uwagi są po polsku (dla Ciebie). Treść promptów jest po angielsku, bo kod, interfejs i dokumentacja tej aplikacji są po angielsku. Wklejaj dokładnie to, co jest w ramce.

- Jeden prompt = jedna sesja Claude Code. Przed kolejnym etapem zrób `/clear`. Zasady są w `CLAUDE.md`, więc Opus zawsze je widzi.
- Po każdym etapie Opus się zatrzymuje. Obejrzyj aplikację i zrzuty, potem wyślij **PROMPT OK** albo **PROMPT POPRAWKI**.
- Jeśli sesja urwie się w połowie etapu: **PROMPT WZNÓW**.
**Punkt startu:** oryginał `english-levels-map` (commit `275be9f`): polski interfejs, uczy angielskiego. Silnik hiszpański (`spanish-levels-map@engine-v1`) nie istnieje, więc port idzie prosto z oryginału (decyzja z 16.11.2026). Od tej chwili ta aplikacja jest całkowicie osobnym projektem.

---

## PROMPT 0 – Start i inwentaryzacja

Co robi: klonuje oryginał do `reference/`, kopiuje kod bez zmian, sprawdza mapę portu z rzeczywistym kodem. Nic jeszcze nie przerabia.
Sprawdź przed „OK”: plik `docs/plan/port-inventory.md` i listę pytań od Opusa.

```
We are starting the Polish Levels Map project. Read CLAUDE.md, then docs/plan/00-READ-ME.md, docs/plan/spec/01-product-and-decisions.md, 02-architecture.md and 03-port-map.md in full.

STAGE 0 — bootstrap and inventory. Branch stage/00-bootstrap.

1. Clone https://github.com/tiflejz5/english-levels-map into reference/english-levels-map and check out commit 275be9f. Make sure .gitignore covers reference/, node_modules/, tmp/ and export files (polish-levels-map-*.json). Never edit or commit anything under reference/.
2. Read the reference README.md and DESIGN.md in full, index.html, and skim every file in js/ and tools/ (header comments and public API).
3. Copy the code UNCHANGED into this repo (index.html, css/, js/, assets/, tools/, package.json, package-lock.json, DESIGN.md), keeping the original file names for now. Commit: "Import code snapshot from english-levels-map@275be9f". Do not copy any teaching content (niezbednik/, cwiczenia/, szlak/, dane/) except the fixtures named in spec 03.
4. Write docs/plan/port-inventory.md: for EVERY reference file in js/, css/, tools/, assets/: size, role in one line, decision (keep / adapt / drop / content), new name, the specs that touch it, number of user-visible string literals, and every English-specific or Polish-exam-specific piece of logic you find (spec 03 §3 is my list; confirm, correct and extend it with file:line references). Mark separately every place where Polish text in the code is UI (goes in stage 2) and where it is a language fact that will be needed for Polish as the TARGET language (moves to LM.lang in stage 3).
5. In the same file: all localStorage keys actually used (compare with spec 02 §5), all routes actually handled (compare with spec 02 §6), all on-demand modules, the unit tests in tools/testy.js grouped by module with a note which survive the port.
6. Run the reference test suite and validators inside reference/ and record the baseline numbers in the inventory.

Do not refactor anything yet. Finish with: a summary, every place where the plan and the code disagree, and your questions. Then STOP and wait for my "OK".
```

---

## PROMPT 1A – Szkielet: `LM`, układ plików, build, pamięć

Co robi: zmienia `ELM` na `LM`, nazwy plików na angielskie, układ `content/` → `data/`, jeden build ze stemplem wersji, nowe klucze `plm.`. Interfejs zostaje jeszcze po polsku.
Sprawdź: `index.html` otwiera się z dysku, testy przechodzą.

```
Read CLAUDE.md, docs/plan/00-READ-ME.md, docs/plan/port-inventory.md, and specs 02 and 03 in full.

STAGE 1, part A — skeleton. Branch stage/01-skeleton from main. One commit per step.

1. Rename the global ELM → LM and the files to the English names of spec 03 (git mv). Update every reference. The tests (now tools/tests.js) must pass before you go on.
2. js/config.js with LM.APP (spec 02 §3) and a js/lang.js stub that is enough to boot (the real one comes in stage 3).
3. Layout of spec 02 §2: create content/ with syllabus.json (copy of docs/plan/syllabus.json), levels.json (A1 "available", the rest "soon"), and the files from docs/plan/examples/ as the first real content (rename *.sample.json to their real names).
4. tools/build.js (spec 02 §4): one entry point, sources in content/, output in data/ with the GENERATED header, version stamp (package.json "lmVersion": 1, --bump rewrites ?v= in index.html). Port the reference build scripts as modules under tools/build/. npm scripts as in CLAUDE.md (check:lang will fail until stage 2; say so).
5. LM.loadModule and all lazy data paths work on file:// and over http.
6. Storage (spec 02 §5): one key registry in profile-data.js; every key under plm.; export / import / reset / delete driven by the registry; new export envelope with the app check on import. Unit test: the registry is fully covered. Remove every legacy migration (list what you removed).

At the end: npm run build, npm test, npm run validate (report what is skipped and why). Open index.html from file:// and from a local http server; screenshots of the home view and one level view (tmp/screens/01a/). The UI is still Polish and the level lists may still come from the old content store; that is expected. Summarize, list open problems, STOP and wait for my "OK". No merge, no push.
```

---

## PROMPT 1B – Szkielet: lista = tematy, nowe adresy, usunięcie staroci

Co robi: lista „I know this” bierze się z sylabusa (1 temat = 1 punkt), angielskie adresy, Szlak generowany z sylabusa, wyrzuca moduł C1 i stare rzeczy.
Sprawdź: strona A1 pokazuje 25 tematów z sylabusa; strona przykładowego tematu (accusative) działa z quizem i zestawem.

```
Continue on branch stage/01-skeleton. Read CLAUDE.md, docs/plan/spec/02-architecture.md §6–§7, 03-port-map.md, and 06-engine-changes.md sections E1, E2, E8, E9.

STAGE 1, part B.

1. E2: LM.SYLLABUS generated from content/syllabus.json is the only source of levels, units, categories and topics. Checklist item = topic (progress[topicId]). Remove the content store (default-data, base-content, elm_content logic), label matching and CATEGORY_MAP. The level page groups topics by syllabus category.
2. Routes of spec 02 §6. No legacy redirects. Every route renders something; unknown routes show "Page not found" with a link home.
3. E1: level status from content/levels.json with all behaviours listed. A missing page in an available level shows "This topic is being written" (the validator rule "available level must be complete" stays a warning until the first content stage).
4. E9: trail generated from the syllabus by the build. Trail view, stop sheet and store work with it.
5. E8: drop c1-*.js and everything only they used; exams move under #/exams/<id>; registry empty; sidebar group hidden when empty; fixture exam under tools/fixtures/exam-demo with unit and e2e coverage.
6. Delete dead code and dead CSS left by 1–5 (list it). Removed tests are listed with the reason.

At the end: build, tests, validators. Screenshots (tmp/screens/01b/, light and dark, 1280 and 390 px): home, A1 level page, the example topic page, its quiz, its set result, the trail, a "soon" level page, Today for a new profile. Summarize and STOP. Wait for my "OK".
```

---

## PROMPT 2 – Angielski interfejs

Co robi: tłumaczy cały interfejs i komentarze w kodzie na angielski według słowniczka ze spec 04. Największy mechaniczny etap (około 1500 tekstów).
Sprawdź: przeklikaj całą aplikację; w interfejsie nigdzie nie może zostać polskie słowo (polskie mogą być tylko treści). `npm run check:lang` na zielono.

```
Read CLAUDE.md, docs/plan/00-READ-ME.md and docs/plan/spec/04-ui-language.md in full (the glossary is binding), plus the "Microcopy" section of DESIGN.md.

STAGE 2 — English UI. Branch stage/02-english-ui from main.

1. LM.plural and LM.fmt in js/utils.js with unit tests (plural, dates in en-US, numbers).
2. tools/check-lang.js and tools/extract-strings.js as spec 04 §4 says.
3. Translate file group by file group in the order of spec 04 §4, one commit per group. Glossary terms exactly. Translate all code comments. Do not change behaviour. Polish text that is a language fact needed for Polish as the target language (see the port inventory) is NOT translated: move it to js/lang.js with a TODO for stage 3.
4. index.html, print.css texts, export file texts, document titles, aria-labels, the shortcut panel. DESIGN.md translated to English (content unchanged; pruning comes in stage 7).
5. Callout rules keyed on the English headings of spec 07 §1.
6. Final pass: run extract-strings, read the whole list for consistency (one term per concept, sentence case, verb + object buttons), fix.

After each group run npm test. At the end: build, tests, npm run check:lang (must pass), e2e. Screenshots (tmp/screens/02/, both themes, 1280 and 390 px) of: home, level page, topic page, quiz, set (each item type the fixtures allow) before and after checking, review session, mistake log, My words, Today, stats, notes, search open, profile menu with settings, data dialogs, placement test start and result, final test start, trail and stop sheet, exam fixture pages, writing trainer, speaking trainer. Report: number of strings, and every string you were unsure how to translate (table: Polish, your English, alternatives). STOP and wait for my "OK".
```

---

## PROMPT 3 – Polska warstwa językowa

Co robi: `js/lang.js` dla polskiego, sprawdzanie odpowiedzi z podpowiedzią o polskich literach i o końcówce, pasek znaków (ą ć ę ł ń ó ś ź ż), jeden moduł mowy `pl-PL` z obsługą braku głosu, przyciski odsłuchu.
Sprawdź: wpisz „kawe” zamiast „kawę” i „brat” zamiast „brata” (komunikaty o literach i o końcówce); głośniki przy przykładach; stan bez polskiego głosu.

```
Read CLAUDE.md, docs/plan/spec/05-language-layer.md in full, 06-engine-changes.md sections E3, E4, E5, 08-polish.md, and the port inventory entries for exercise-logic, cards-logic, words, search-logic, shortcuts and the speech code.

STAGE 3 — Polish language layer. Branch stage/03-language-layer from main.

1. js/lang.js implementing the full LM.lang interface for Polish (spec 05 §1). Remove every English-specific rule from the other files (contractions, 's / 'd readings, en-GB / en-US, the FOLD table, isPolish, abbreviation lists); they call LM.lang. Where the original logic detected Polish as the explanation language, it now detects Polish as the target language: check every call site.
2. LM.exLogic.match exactly as spec 05 §2 (hints accents / ending / typo; wording "Check the Polish letters"), used by every typed answer in exercises and flashcards. Preference lenientAccents with the behaviour and the stats note of E4.
3. js/speech.js (LM.speech) replacing all four voice implementations: pl-PL voices, no voice variants, the "How to add a voice" help text (spec 05 §4), every no-voice path kept and tested.
4. markdown.js: lang attributes by the conventions of spec 05 §5; listen buttons (E5); the My words selection menu uses the lang attribute.
5. js/charbar.js (E3) on every Polish input, with Alt + letter cycling (a → ą, z → ź → ż) and the shortcut panel entry.
6. Search uses LM.lang.fold; check highlighting with Polish text (ł has no decomposition: test it).
7. Unit tests of spec 05 §6, Polish fixtures in tools/fixtures/lang/ (replace the English ones).
8. check:lang now enforces: Polish language facts only in js/lang.js, js/config.js and content/.

At the end: build, tests, check:lang, e2e. Screenshots (tmp/screens/03/): accents-only wrong answer, ending hint, typo hint, lenient mode on; character bar on desktop and phone; listen buttons on the example page; My words menu on a Polish selection and its absence on English text; the no-voice state with the help text. STOP and wait for my "OK".
```

---

## PROMPT 4 – Ćwiczenia: typ „Fill the table” i walidatory

Co robi: sprawdza cały silnik zadań na polskich danych, dodaje typ `paradigm` (odmiana przez przypadki i osoby), przenosi walidatory do Node z polskimi heurystykami.
Sprawdź: zestaw przykładowy od początku do wyniku; zadanie z tabelką odmiany na telefonie.

```
Read CLAUDE.md, docs/plan/spec/06-engine-changes.md sections E6, E10, E11, docs/plan/spec/07-content-model.md in full, 08-polish.md, and docs/plan/scripts/validate_plan.py. Look at the example set and quiz in content/.

STAGE 4 — exercises. Branch stage/04-exercises from main.

1. Run every existing item type end to end with Polish data; fix anything that still assumes English (tokenising with Polish quotes and dashes, speech text, word limits, reorder tiles, cloze around words with diacritics, capital letters at sentence start, free word order in reorder and translate).
2. E6: the paradigm type: pure logic + tests, view (keyboard, touch, character bar, aria-live, 320 px), case labels with their questions, and every integration listed in E6.
3. E10: placement and final tests use syllabus categories.
4. E11: tools/validate-*.js: all rules for kept formats from the reference validators and all rules of docs/plan/scripts/validate_plan.py, plus the E11 heuristics (subject pronoun, speaker gender, Polish alphabet, "no diacritics" warning). Wire into npm run validate and npm run build. Python and Node validators agree on the example content (0 errors).
5. tools/strip-keys.js (spec 10 §4, step 4).
6. Add two more example sets on the example topic that exercise the remaining types (dictation, transformation, short-answer), so every type has Polish test data. Follow spec 10 §4 for these items (solver + proofreader) on a small scale.

At the end: build, validate, tests, e2e. Screenshots (tmp/screens/04/): every item type before and after checking, paradigm on phone, a set result in points, the practice hub. STOP and wait for my "OK".
```

---

## PROMPT 5 – Pętla nauki

Co robi: sprawdza i domyka fiszki, powtórki, Moje słowa, dziennik błędów, test poziomu, testy końcowe, Dziś, statystyki, notatki, wyszukiwarkę.
Sprawdź: przejdź drogę nowego użytkownika od zera (spec 13, wiersz „Flows”).

```
Read CLAUDE.md, docs/plan/spec/06-engine-changes.md (E1, E2, E9, E10, E12), docs/plan/spec/13-qa-and-launch.md §1, and the reference README sections on reviews, Today, level test and final tests.

STAGE 5 — learning loop. Branch stage/05-learning-loop from main.

1. Flashcards, review queue, My words, mistake log, weak spots: verify every flow with Polish data; scheduler regression vectors pass; cards and mistakes render Polish with lang attributes and listen buttons; deck index, deck tiles and "exam flashcards" read from content and the (empty) exam registry.
2. Placement test and final tests with minimal runnable pools (12 placement questions spread over levels, 10 final-test items for A1; mark them as temporary in the file "note"). Written with spec 10 §4.
3. Today, stats, notes, search index, celebrations, streak: texts and numbers right with one available level.
4. E12: "Report a mistake" links and the home footer.
5. Guest mode and first-run screen (placement test or start at A1).
6. Run the "Flows" and "Storage" rows of the QA matrix, with the original app's data (elm_* keys) present in the same origin. Fix what you find. e2e tests for: first run → placement → trail stop → quiz; set → mistake logged → review session; export → reset → import; foreign file refused.

At the end: build, validate, tests, e2e, check:lang. Screenshots (tmp/screens/05/) of each flow's key screens. List of bugs found and fixed. STOP and wait for my "OK".
```

---

## PROMPT 6 – Case Lab

Co robi: przerabia Laboratorium czasów oryginału na Case Lab: mapa siedmiu przypadków, karta przypadka z końcówkami, drzewko „Pick the case”, porównanie, przeglądarka odmiany, pasek aspektu.
Sprawdź: czy to jest czytelne dla kogoś, kto nie zna przypadków; telefon; kolory w obu motywach. Tabele odmiany przeczytaj w całości.

```
Read CLAUDE.md, docs/plan/spec/09-case-lab.md in full, 06-engine-changes.md section E7, 08-polish.md §4, DESIGN.md (lab section), the lab sample in content/lab, and the reference tense lab (js/tense-lab.js and its data) for code and format reference.

STAGE 6 — Case Lab. Branch stage/06-case-lab from main.

1. From the ported tense lab keep the shared parts (card page layout, decision-tree view, compare view, listen buttons, search entries, notes button) and make the timeline drawing a separate reusable function; drop the tense grid and its data format.
2. js/lab-cases.js with the six views of spec 09 §2, the data formats of §1 and the design rules of §3 (seven validated case colour tokens, never colour alone, 320 px, keyboard).
3. Content of spec 09 §4, written with the pipeline of spec 10 §4. The owner is a native speaker and will read every Polish form: make the declension tables easy to review (one commit with models.json alone).
4. Validators for lab data (all 14 forms per model, topic ids exist, alphabet check). Search entries. Lab map under 500 ms on a warm cache.
5. DESIGN.md: lab section rewritten for the Case Lab.

At the end: build, validate, tests, contrast, e2e. Screenshots (tmp/screens/06/, both themes, 1280 and 390 px): each of the six views. STOP and wait for my "OK".
```

---

## PROMPT 7 – Marka, dokumentacja, QA

Co robi: nazwa i kolor aplikacji, strona główna, `README.md` i `DESIGN.md` dla tej aplikacji, pełna kontrola silnika.
Sprawdź: wygląd w obu motywach, telefon, wydruk; czy nigdzie nie został ślad po angielskiej aplikacji (polski interfejs, klucze `elm_`, egzaminy CKE).

```
Read CLAUDE.md, docs/plan/spec/11-design-and-branding.md and 13-qa-and-launch.md in full, the current DESIGN.md and README.md, and docs/plan/port-inventory.md.

STAGE 7 — branding, docs, QA. Branch stage/07-branding-qa from main.

1. Accent and wordmark (spec 11 §1–§2); contrast script and palette validation green (accent against level colours and case colours); favicon and theme-color.
2. content/home.md (spec 11 §4).
3. DESIGN.md: prune removed features, add accent, Case Lab, character bar, listen buttons, "soon" states; design-review history dropped. README.md in English: what this is, how to run, routes, storage keys, data formats, how to add a topic / set / deck / level, commands; one line of origin (ported from english-levels-map).
4. Clear every remaining item of the port inventory. check:lang green.
5. Run the whole QA matrix of spec 13 §1 that does not need real content, with data of the original app (elm_*) present in the same origin. Fix findings. Print check on A4 and US Letter.

At the end: all commands green. Screenshots (tmp/screens/07/): home, level page, lab, both themes, phone widths, print previews. A short "engine ready" report. STOP and wait for my "OK".
```

---

## PROMPT C – Treści: jeden poziom (powtarzalny)

Jak używać: podmień dwie wartości w pierwszej linii. Jeden poziom to zwykle 2–3 sesje: gdy kontekst robi się długi, zacznij nową sesję i wklej ten sam prompt z kolejnym zakresem jednostek.
Sprawdź: po pierwszej jednostce poziomu Opus zatrzyma się na **kalibrację**. Przeczytaj strony uważnie jako native speaker. Twoje poprawki staną się regułami w `content/STYLE-NOTES.md`.
```
LEVEL = A1     UNITS = 1-2
(Replace the two values above. They apply to everything below.)

Read CLAUDE.md, docs/plan/00-READ-ME.md, docs/plan/spec/07-content-model.md, docs/plan/spec/10-content-production.md and docs/plan/spec/08-polish.md in full. Read content/syllabus.json for LEVEL, content/STYLE-NOTES.md if it exists, the example page, quiz and set (they are the quality bar), and every existing page of LEVEL (and the last unit of the previous level) so you know what the learner already has.

CONTENT STAGE — branch stage/content-LEVEL (create from main, or continue it if it exists).

For each unit in UNITS, in order, run the pipeline of spec 10 §4 exactly: plan → write (pages, then quizzes, then sets) → validate → solver subagent on key-less items → native-proofreader subagent → fix → validate → build → look in the browser → commit with the batch report. Use the subagent briefs of spec 10 §5 verbatim. Topic ids, file names and section headings come from the syllabus and spec 07; do not invent topics.

Rules that matter most:
- Mistakes sections and distractors use real, typical learner errors (spec 08 §3).
- A page may only use grammar taught earlier in the syllabus order.
- Accepted answers are complete (spec 05 §3).
- All content is original.

If UNITS starts with unit 1: after unit 1 is committed, STOP for calibration. Show me the list of files and the batch report, and ask me for corrections. When I answer, write my corrections into content/STYLE-NOTES.md, apply them to unit 1, then continue with the remaining units.

At the end of UNITS: npm run build, npm run validate, npm test. Give me: topics done, counts (pages, quiz items, set items), solver disagreements and how each was resolved, proofreader findings fixed or rejected (with reasons), and anything you are not sure about linguistically (quote the sentence). STOP and wait for my "OK" or for the next UNITS range.
```

---

## PROMPT X – Dodatki poziomu (powtarzalny)

Jak używać: po wszystkich jednostkach poziomu. Przy pierwszym poziomie powstaje też cała pula testu poziomu (60 pytań) i strona główna.
Sprawdź: test końcowy od początku do końca, ściągę w podglądzie wydruku, talie fiszek.

```
LEVEL = A1
(Replace the value above.)

Read CLAUDE.md, docs/plan/spec/07-content-model.md, 10-content-production.md §3–§7, docs/plan/spec/08-polish.md, content/STYLE-NOTES.md, and ALL topic pages of LEVEL.

LEVEL EXTRAS — continue branch stage/content-LEVEL. One commit per item. Same pipeline as content batches (validate → solver → proofreader → fix) for everything with answers.

1. Level summary and cheat sheet (one page on A4 and on US Letter: check with tools/cheatsheets-pdf.js).
2. Final test pool: 30 items meeting spec 07 §6.
3. Decks: one per vocabulary topic of LEVEL, plus the form decks assigned to LEVEL in spec 08 §5. Deck index updated.
4. Lab: content for forms first taught at LEVEL (spec 08 §4), trees extended.
5. Mixed sets: one per unit, plus two thematic mixes.
6. If this is the first level: the complete placement pool (60 questions, all six levels, spec 07 §6) and content/home.md. If LEVEL is B1: the phrase bank (spec 07 §8).
7. Set LEVEL to "available" in content/levels.json; the rule "available level is complete" must pass. Update content counts in README.

At the end: build, validate, tests, e2e. Do the final test once in the browser to pass and once to fail. Screenshots (tmp/screens/x-LEVEL/): level page, cheat sheet print preview, final test result, deck list, lab with the new content, placement result. Report as in the content stage. STOP and wait for my "OK".
```

---

## PROMPT L – Publikacja

Kiedy: gdy A1 jest kompletne.
Sprawdź: adres na GitHub Pages na komputerze i telefonie.

```
Read CLAUDE.md and docs/plan/spec/13-qa-and-launch.md in full.

LAUNCH — branch stage/launch from main.

1. Run the complete QA matrix (spec 13 §1). Fix findings; list what you could not test and why.
2. Go through the launch checklist (spec 13 §3) item by item. For LICENSE, propose the texts and ask me to confirm before adding them.
3. Scripted content check (checklist item 9).

Report the checklist with a status per item. STOP and wait for my "OK". After my "OK": merge, push, wait for GitHub Pages, open the URL with a hard reload, confirm the version number, tag v0.1.0, and tell me exactly what you checked.
```

---

## PROMPT E1 – Egzaminy: badanie (najpierw fakty)

Sprawdź: raport i dwie rzeczy samodzielnie na oficjalnej stronie egzaminu.

```
Read CLAUDE.md and docs/plan/spec/12-exams.md in full.

EXAMS, step E-1 — research only, no code. Branch stage/exams-research.

Use web search and read the OFFICIAL sources named in spec 12 §2 (and official sample papers) as they are today. Write docs/plan/exams-research.md exactly as spec 12 §3 describes. Describe in your own words; quote nothing longer than a short phrase. Do not download or store official papers or recordings.

STOP and wait for my "OK" and my choice of exam.
```

## PROMPT E2 – Egzaminy: budowa wybranego egzaminu

```
EXAM = (id I chose)

Read CLAUDE.md, docs/plan/spec/12-exams.md, docs/plan/exams-research.md, specs 07, 08 and 10.

EXAMS, step E-2 — branch stage/exams-EXAM. Build the exam as spec 12 §4–§5. All tasks are original, "in the style of". Content goes through the pipeline of spec 10 §4. Every exam page shows the "checked on" note and the official link.

At the end: build, validate, tests, e2e, screenshots of every exam view. Report and STOP. Wait for my "OK".
```

---

## PROMPT OK – akceptacja etapu

```
OK. Merge the stage branch into main (no squash, keep the step commits), push, and delete the branch. Confirm that npm run build leaves the working tree clean. Tell me the commit hash.
```

## PROMPT POPRAWKI – gdy coś jest nie tak

```
Not OK yet. Stay on the stage branch. Problems:
1. (what I saw, where, what I expected)
2. …
For each: find the cause, fix it, add a test if it is logic, and show me before/after. If a problem comes from the spec, say so and propose a spec change instead of working around it. Then STOP and wait for my "OK" again.
```

## PROMPT WZNÓW – sesja urwała się w połowie

```
We were in the middle of a stage. Read CLAUDE.md and docs/plan/00-READ-ME.md. Run git status, git branch and git log --oneline -15 to see which stage branch we are on and which steps are committed. Open docs/plan/PROMPTS.md, find the prompt for this stage, and tell me which numbered steps are done, which is in progress, and what you will do next. Then continue from there and finish the stage as that prompt says.
```
