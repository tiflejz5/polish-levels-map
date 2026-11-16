# Prompty do Claude Code (Opus 5.5) – Polish Levels Map

Nagłówki i uwagi są po polsku (dla Ciebie). Treść promptów jest po angielsku, bo kod, interfejs i dokumentacja tej aplikacji są po angielsku. Wklejaj dokładnie to, co jest w ramce.

- Jeden prompt = jedna sesja Claude Code. Przed kolejnym etapem zrób `/clear`. Zasady są w `CLAUDE.md`, więc Opus zawsze je widzi.
- Po każdym etapie Opus się zatrzymuje. Obejrzyj aplikację i zrzuty, potem wyślij **PROMPT OK** albo **PROMPT POPRAWKI**.
- Jeśli sesja urwie się w połowie etapu: **PROMPT WZNÓW**.
**Warunek startu:** w repozytorium `spanish-levels-map` istnieje tag `engine-v1` (koniec jego etapu 7). Ta aplikacja startuje z kopii tamtego silnika i od tej chwili jest całkowicie osobnym projektem.

---

## PROMPT 0 – Import silnika i inwentaryzacja

Co robi: kopiuje gotowy silnik z aplikacji hiszpańskiej, zmienia nazwę, klucze pamięci i sylabus na polski, usuwa hiszpańskie treści, spisuje wszystko, co w kodzie zostało hiszpańskie.
Sprawdź: `index.html` otwiera „Polish Levels Map”, A1 pokazuje 25 tematów, przykład (accusative) działa; przeczytaj `docs/plan/import-inventory.md`.

```
We are starting the Polish Levels Map project. Read CLAUDE.md, then docs/plan/00-READ-ME.md, docs/plan/spec/01-product-and-decisions.md, 02-architecture.md and 03-import-map.md in full.

STAGE 0 — import. Branch stage/00-import.

1. Clone https://github.com/tiflejz5/spanish-levels-map into reference/spanish-levels-map and check out the tag engine-v1. If the tag does not exist, STOP and tell me. Add reference/, node_modules/, tmp/ and export files to .gitignore. Never edit or commit anything under reference/.
2. Read the reference README.md, DESIGN.md, CLAUDE.md, index.html, js/config.js, js/lang.js and skim every other file in js/ and tools/.
3. Copy the files listed in spec 03 §1 unchanged. Commit: "Import engine from spanish-levels-map@engine-v1". Do not copy content/, data/ or docs/plan.
4. Apply spec 03 §2 for stage 0: new js/config.js (spec 02 §3), a minimal Polish js/lang.js stub that boots, storage prefix plm., export name, package name, lmVersion 1, page title; content/ with syllabus.json (from docs/plan/syllabus.json), levels.json (A1 "available", the rest "soon") and the files from docs/plan/examples/ (rename *.sample.json to their real names); regenerate data/.
5. Write docs/plan/import-inventory.md: spec 03 §3 carried out with file:line references — every Spanish fact left in the copied code, what you already changed, what waits for stage 1, 2 or 3; and the list "report to the Spanish repo".
6. Extend check:lang as spec 03 §3 says.
7. Run tests: list which pass, and which are language-dependent and pending stage 1.

At the end: npm run build, npm test, npm run validate. Screenshots (tmp/screens/00/): home, A1 level page, the example topic, its quiz. Summary, disagreements between plan and code, questions. STOP and wait for my "OK".
```

---

## PROMPT 1 – Polska warstwa językowa

Co robi: `js/lang.js` dla polskiego, pasek znaków (ą ć ę ł ń ó ś ź ż), mowa `pl-PL` z obsługą braku głosu, walidator z ostrzeżeniami o rodzaju (byłem / byłam), testy.
Sprawdź: wpisz „kawe” zamiast „kawę” i „brat” zamiast „brata” (komunikaty o literach i o końcówce); głośniki przy przykładach; zestaw przykładowy do końca, w tym tabelka odmiany.

```
Read CLAUDE.md, docs/plan/spec/05-language-layer.md in full, 06-engine-changes.md (E3, E4, E5, E6, E11), 08-polish.md, and docs/plan/import-inventory.md.

STAGE 1 — Polish language layer. Branch stage/01-language-layer from main.

1. js/lang.js implementing the full LM.lang interface for Polish (spec 05 §1), with the unit tests of spec 05 §6 and Polish fixtures in tools/fixtures/lang/.
2. Answer checking: verify match with Polish data (accents hint wording "Check the Polish letters", ending hint on case endings, lenient mode).
3. Speech: pl-PL voices, no voice variants (remove that setting and its UI), the "How to add a voice" help text (spec 05 §4), every no-voice path tested.
4. Character bar with the Polish letters, Alt + letter cycling (z → ź → ż, a → ą …).
5. Run every item type end to end with Polish data (tokenising with Polish quotes and dashes, reorder tiles, cloze around words with diacritics, paradigm with case labels). Add two more example sets on the example topic for the remaining item types (dictation, transformation, short-answer), written with the pipeline of spec 10 §4.
6. Validators: Polish alphabet check, speaker-gender heuristic, "no diacritics" warning (E11); remove the Spanish heuristics. Python and Node validators agree on the example content.
7. Minimal runnable pools so every flow works: 12 placement questions spread over levels, 10 final-test items for A1 (marked temporary in the "note").
8. Clear every "pending stage 1" item of the import inventory.

At the end: build, validate, tests, check:lang, e2e. Screenshots (tmp/screens/01/): accents-only wrong answer, ending hint, typo hint; character bar on desktop and phone; listen buttons; the no-voice state with the help text; every item type before and after checking; My words menu on a Polish selection and its absence on English text. STOP and wait for my "OK".
```

---

## PROMPT 2 – Case Lab

Co robi: zupełnie nowe narzędzie zamiast laboratorium czasów: mapa siedmiu przypadków, karta przypadka z końcówkami, drzewko „Pick the case”, porównanie, przeglądarka odmiany, pasek aspektu.
Sprawdź: czy to jest czytelne dla kogoś, kto nie zna przypadków; telefon; kolory w obu motywach.

```
Read CLAUDE.md, docs/plan/spec/09-case-lab.md in full, 08-polish.md §4, DESIGN.md (lab section), the lab sample in content/lab, and the imported lab code.

STAGE 2 — Case Lab. Branch stage/02-case-lab from main.

1. Remove the Tense & Mood Lab view and its data formats; keep the shared parts and the timeline drawing function (spec 09, first paragraph).
2. js/lab-cases.js with the six views of spec 09 §2, the data formats of §1 and the design rules of §3 (seven validated case colour tokens, never colour alone, 320 px, keyboard).
3. Content of spec 09 §4, written with the pipeline of spec 10 §4. The owner is a native speaker and will read every Polish form: make the declension tables easy to review (one commit with models.json alone).
4. Validators for lab data (all 14 forms per model, topic ids exist, alphabet check). Search entries. Lab map under 500 ms.
5. DESIGN.md: lab section rewritten for the Case Lab.

At the end: build, validate, tests, contrast, e2e. Screenshots (tmp/screens/02/, both themes, 1280 and 390 px): each of the six views. STOP and wait for my "OK".
```

---

## PROMPT 3 – Marka, dokumentacja, QA

Co robi: nazwa i kolor aplikacji, strona główna, `README.md` i `DESIGN.md` dla tej aplikacji, pełna kontrola.
Sprawdź: wygląd w obu motywach, telefon, wydruk; czy nigdzie nie został ślad po hiszpańskiej aplikacji.

```
Read CLAUDE.md, docs/plan/spec/11-design-and-branding.md and 13-qa-and-launch.md in full, the current DESIGN.md and README.md, and docs/plan/import-inventory.md.

STAGE 3 — branding, docs, QA. Branch stage/03-branding-qa from main.

1. Accent and wordmark (spec 11 §1–§2); contrast script and palette validation green (accent against level colours and case colours); favicon and theme-color.
2. content/home.md (spec 11 §4).
3. README.md and DESIGN.md rewritten for this app (no mention of Spanish except one line of origin).
4. Clear every remaining item of the import inventory. check:lang green.
5. Run the whole QA matrix of spec 13 §1 that does not need real content, with data of the original app (elm_*) and of the Spanish app (slm.*) present in the same origin. Fix findings. Print check on A4 and US Letter.

At the end: all commands green. Screenshots (tmp/screens/03/): home, level page, lab, both themes, phone widths, print previews. A short "engine ready" report. STOP and wait for my "OK".
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
