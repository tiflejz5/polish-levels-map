# Spec 06 — Engine changes (E1–E12)

The imported engine already has E1–E6 and E8–E12. They are listed so the behaviour is documented in this repo; the Polish work is marked **(new here)**.

## E1. Level status: "available" or "soon"

`content/levels.json`. **soon:** the sidebar shows the level with a "soon" text label; the level page lists the planned topics from the syllabus (titles and examples, no links, no checkboxes) under "B1 is on its way. The topics below are what it will cover."; no final-test or cheat-sheet cards; the trail draws the land dimmed with "Coming soon"; search does not index it; progress on Today counts available levels only. The placement test may still return a "soon" level and then says so. The validator requires an **available** level to be complete: every topic has a page and a quiz; summary, cheat sheet and final test exist.

## E2. Checklist = topics

`LM.SYLLABUS` (from `content/syllabus.json`) is the only list of levels, units, categories and topics. `progress[<topic id>] = true`. The level page groups topics by category (order of first appearance); the trail uses unit order.

## E3. Special-character bar

Under every input that expects Polish text (short-answer, gap-fill, transformation, translate, dictation, paradigm, typed and cloze flashcards, writing trainer, answer fields of "Add mistake"): buttons from `LM.APP.chars` (ą ć ę ł ń ó ś ź ż). Inserts at the cursor of the last focused input, keeps focus, supports undo (`insertText`, fallback `setRangeText`). 44 px targets on touch; `aria-label` "Insert á". Shift or long press gives the capital. Desktop: `Alt` + base letter cycles the marked forms (a → ą, z → ź → ż). One implementation (`js/charbar.js`), attached by `data-charbar`.

## E4. Accent-aware checking

Spec 05 §2: hints `accents` / `ending` / `typo`; preference "Accept answers without accents — you still see the correct spelling"; stats show lenient answers as a separate small number.

## E5. Listening everywhere

`LM.speech` (spec 05 §4). Listen buttons on every row of an examples table and on every blockquote in topic pages; `S` reads the focused example; optional auto-play of the Polish side of a flashcard (default off).
## E6. Item type `paradigm` ("Fill the table")

```json
{
  "id": "…-07", "type": "paradigm", "prompt": "Present tense", "lemma": "…", "gloss": "…",
  "cells": [ { "label": "…", "accepted": ["…"] }, { "label": "…", "accepted": ["…"], "given": true } ],
  "explanation": "…"
}
```

3–8 cells; a `given` cell is shown filled in (0 points); 1 point per answered cell; `correct` = all cells right. Checked per cell with `match`. View: label + input grid (one column under 480 px), character bar, Tab moves down, Enter checks; wrong cells show the right form. Labels are persons for verbs, or cases with their questions for noun phrases ("Genitive (kogo? czego?)"). Listed everywhere item types are listed (hub filters, generator, stats, mistake log, validators, shortcuts). At most two per placement or final test. Working samples: `docs/plan/examples/exercises/`.

## E7. Case Lab

**(new here)** The Case Lab replaces the tense lab: spec 09.

## E8. Exams module: generic only

`exam-core`, `exam-ui`, `exam-logic`, trainers; routes under `#/exams/<id>`. Until stage E the registry is empty and the sidebar group "Exams" is hidden. A fixture exam in `tools/fixtures/exam-demo/` keeps the code under test.

## E9. Trail generated from the syllabus

The build creates the trail: level → `land`, `finalTest`, `units`; unit → one **lesson stop per topic** (`id` = topic id, `page`, `quiz` = topic id when the quiz file exists) and one **checkpoint** at the end (`<unit id>-checkpoint`, `from` = the unit's stops, `size` = min(8, 2 × topics)). Passing rules as in the original: quiz ≥ 3 of 4, or "I know this", or best set ≥ 80% (when no quiz), or Skip; a quiz never ticks "I know this" by itself. Optional `content/trail-overrides.json` may rename stops or change checkpoint size.

## E10. Tests use syllabus categories

Placement: skills `grammar`, `vocabulary`, `reading` (`cases` and `verbs` count as grammar). Final tests: proportional draw over the syllabus categories.

## E11. Validators (`tools/validate-*.js`)

All rules of `docs/plan/scripts/validate_plan.py`, plus:

1. Accepted sentence starts with a subject pronoun and the variant without it is missing → warning.
2. **(new here)** Accepted answer has a 1st or 2nd person past or conditional form (endings *-łem / -łam, -łeś / -łaś, -łbym / -łabym*), the other gender is missing and the prompt has no gender note → warning.
3. Characters outside the Polish alphabet + ASCII in target-language fields → error (catches wrong-language letters and broken encoding). A Polish text field longer than 80 characters with no diacritics at all → warning (probably stripped).4. Multiple choice: exactly one correct option, no duplicates after normalisation, `explanation` required, `optionNotes` length = options length.

## E12. Report a mistake + footer

Every topic page, quiz result, set result and flashcard back has a quiet "Report a mistake" link built from `LM.APP.reportUrl` + a prefilled title (`<topic id>: `), with `LM.APP.reportMail` as a `mailto:` alternative when set. Home footer: version, "No accounts. Your progress stays in this browser.", link to the source repository.
