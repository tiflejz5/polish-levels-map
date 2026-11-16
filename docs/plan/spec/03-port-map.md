# Spec 03 — Port map (english-levels-map → this app)

The app is ported directly from the original `english-levels-map` (Polish UI, teaches English) at commit `275be9f` (11 Nov 2026). The Spanish app's engine (`spanish-levels-map@engine-v1`) was the planned shortcut, but it does not exist yet; this spec replaces the former "import map".

Stage 0 produces `docs/plan/port-inventory.md`: this table checked against the real files, with line counts and the number of user-visible strings per file. If the inventory disagrees with this spec, the inventory wins — report the difference.

Legend: **K** keep (rename, `ELM`→`LM`, strings to English), **A** adapt (real changes, see spec), **D** drop, **P** content (written new under `content/`).

## 1. `js/` → `js/`

| Reference file | New file | | Notes |
|---|---|---|---|
| utils.js | utils.js | K | + `LM.plural`, `LM.fmt` (spec 04 §1) |
| ui.js, motion.js, celebrate.js, dialogs.js, theme.js, print.js, toc.js, sidebar.js | same names | K | keys `plm.theme`, `plm.sidebar` |
| learning.js | learning.js | A | remove `REVIEW_STEPS` and other legacy; keep today(), streak, placement algorithm |
| profile-data.js | profile-data.js | A | key registry (spec 02 §5); no journal migration |
| store.js, default-data.js, base-content.js | store.js | A | **content store removed** (D8). `store.js` keeps profiles, export/import/reset, corrupt-data screen. `default-data.js`, `base-content.js` → D; checklist comes from `LM.SYLLABUS` |
| profiles.js, data-menu.js | same | A | English, new export format, app check on import |
| markdown.js | markdown.js | A | `lang` attributes for target-language text (spec 05 §5), listen buttons (E5) |
| callouts.js | callouts.js | A | rules keyed on the **English** headings of spec 07 |
| shortcuts.js | shortcuts.js | A | speech through `LM.speech` |
| niezbednik.js | handbook.js | A | no label matching (D8); routes `#/a1/<category>-<slug>` |
| render.js | render.js | A | categories from the syllabus; level status "soon" (E1) |
| app.js | app.js | A | new routes, no legacy redirects, guest mode kept |
| today.js | today.js | K | |
| level-test.js | placement.js | K | |
| level-final.js, final-logic.js | final.js, final-logic.js | A | categories from the syllabus in proportional draw (E10) |
| journal.js, mistake-task.js | mistakes.js, mistake-task.js | A | no legacy `review` stage; C1 refs removed |
| reviews.js, powtorki.js | review-queue.js, review.js | K | |
| fiszki.js, fiszki-browse.js, fiszki-store.js, fiszki-harmonogram.js | cards.js, cards-browse.js, cards-store.js, cards-schedule.js | K | exam chips read codes from the exam registry, not a hard-coded list |
| fiszki-logic.js | cards-logic.js | A | `isPolish` → `LM.lang.isTarget`; sentence extraction through `LM.lang`; no journal migration |
| fiszki-words.js | words.js | A | selection menu offers target-language text only, detected by `lang` attribute |
| exercise-logic.js | exercise-logic.js | A | sentence normalisation and comparison move behind `LM.lang` (spec 05); English contractions removed; + `paradigm` (E6) |
| exercise-engine.js | exercise-engine.js | A | speech through `LM.speech`; character bar (E3); accent and ending feedback (E4) |
| exercise-hub.js | practice-hub.js | K | |
| learning-stats.js, stats-page.js | same | K | type labels in English, category labels from the syllabus |
| search-logic.js, search.js | same | A | folding through `LM.lang.fold` |
| notes.js | notes.js | K | |
| tense-lab.js | lab.js + lab-cases.js | A | **Case Lab** (spec 09). Card layout, decision trees, compare view, search entries and the timeline drawing function are kept; the tense grid is dropped |
| szlak.js, szlak-logic.js, szlak-store.js | trail.js, trail-logic.js, trail-store.js | A | trail generated from syllabus (E9); stop = topic |
| pisanie.js, pisanie-wzorzec.js, pisanie-zwroty.js | writing.js, writing-model.js, writing-phrases.js | K | |
| writing-trainer.js | writing-trainer.js | A | word-count rules from the exam config, no CKE rules in engine |
| speaking-trainer.js, recorder.js | same | A | formats stay data-driven; speech through `LM.speech` |
| exam-core.js, exam-ui.js, exam-logic.js | same | A | generic only (E8): registry under `#/exams/<id>`; remove E8/matura specifics (CKE word counting → config) |
| c1-core.js, c1-exercises.js, c1-writing.js, c1-speaking.js | — | D | their task types that sets still need (open cloze, word formation, key-word transformation) already exist as generic item types; `scoreTransformationParts` stays in exercise-logic |
| — | config.js, lang.js, speech.js, charbar.js | new | spec 02 §3, spec 05, E3 |

## 2. Other folders

| Reference | New | | Notes |
|---|---|---|---|
| css/style.css, css/print.css | css/ | A | remove `html[data-section="certyfikat"]` and per-exam themes that no longer exist; exam accent from the registry via CSS variables; case colour tokens (spec 09); app accent (spec 11) |
| assets/ (fonts, ikony.js, krainy.js, stany-puste.js, vendor, favicons) | assets/ | K | rename `krainy.js → lands.js`, `stany-puste.js → empty-states.js`, `ikony.js → icons.js`; new favicon (spec 11); font subsets must include latin-ext |
| index.html | index.html | A | English; `lang="en"`; app title; `?v=` stamped by the build |
| tools/zbuduj-*.js | tools/build.js (+ small modules in tools/build/) | A | one entry point; sources in `content/`, output in `data/`; version stamp |
| tools/waliduj-*.js, scripts/*.py, docs/**/validate_*.py | tools/validate-*.js | A | rules for kept data formats are ported; exam-specific validators wait for stage E; rules from `docs/plan/scripts/validate_plan.py` added |
| tools/testy.js | tools/tests.js | A | all tests for kept logic must pass after rename; tests of dropped code are deleted and listed in the stage summary; English-language fixtures are replaced by Polish ones in `tools/fixtures/lang/` (stage 3) |
| tools/kontrast.js | tools/contrast.js | A | token pairs updated |
| tools/e2e-start.js, tools/sciagi-pdf.js | tools/e2e.js, tools/cheatsheets-pdf.js | K | |
| tools/rozklad-*.js | (inventory decides) | ? | answer-distribution checks; keep if generic |
| niezbednik/**, cwiczenia/**, szlak/**, dane/** | — | P | **no English-teaching content is copied.** Formats are reused (spec 07); a few files serve as format reference only |
| dane/fiszki/scheduler-vectors.json | tools/fixtures/scheduler-vectors.json | K | scheduler regression vectors are language-neutral |
| DESIGN.md | DESIGN.md | A | translated to English (stage 2), lab section rewritten (stage 6), pruned and finished (stage 7) |
| README.md, docs/INSTRUKCJA.md | README.md | A | rewritten in English in stage 7 |
| docs/rozbudowa-* | — | D | history of the old app; stays in `reference/` |

## 3. Things that look generic but are English-specific (check each in stage 0)

1. `exercise-logic.js`: `FIXED_CONTRACTIONS`, `expandWord`, `sentenceVariants` (`'s` / `'d` readings), `trNorm`, `trTokens`, word limits that count contractions as two words.
2. Speech: hard-coded `en-GB` / `en-US` in `exercise-engine.js`, `shortcuts.js`, `speaking-trainer.js`, `tense-lab.js` (four separate copies of voice picking → one `LM.speech`).
3. `fiszki-logic.js`: `isPolish` (it detects the *UI/explanation* language today; here Polish is the *target* language — the meaning flips), abbreviation list in `extractSentence`, cloze helpers that assume English word boundaries.
4. `fiszki-words.js`: detection of the "Polski" table column (here the Polish column is the target side).
5. `search-logic.js`: `FOLD` table and tokeniser `[^a-z0-9']`.
6. `tense-lab.js`: fixed groups present / past / future × aspects simple / continuous / perfect.
7. `exam-logic.js`: CKE word counting, Polish date formatting (`pl-PL` month names) → `LM.fmt` (en-US).
8. `callouts.js`: rules match Polish heading text.
9. `plural(n, one, few, many)`: Polish three-form plural used for **UI** text → English two-form `LM.plural`. (A Polish three-form plural may come back later inside `LM.lang` if content needs it; never in UI code.)
10. Typography in strings: Polish quotes „…” → English “…”; date formats `dd.mm.yyyy` → `Nov 12, 2026`.
11. Exam codes hard-coded in chips and in "Życie i egzamin" (E8, MP, MR, B2, C1) → from registry.
12. Level-test and final-test proportional draw uses the four original category ids.

**Trap specific to this project:** the reference contains a lot of Polish text that is UI (must go) and the new app needs Polish text as *content* (must stay, in `content/` and `LM.lang` only). `check:lang` (spec 04 §4) separates them by location, not by language detection.

## 4. Size of the job (from the reference, for planning)

About 60 JS files, 1.1 MB; `style.css` 275 kB; roughly 1,500 string literals with Polish diacritics in `js/` plus an estimated few hundred without. Stage 2 (English UI) is the largest mechanical stage; split it by file groups and commit per group.
