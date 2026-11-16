# Spec 12 — Exams (stage E, research first)

## 1. Why this stage starts with research

Exam formats are facts about the world that change. Web checks made while writing this plan (November 2026) show that Poland amended the act on the Polish language, including the certification of Polish as a foreign language, in April 2026. **Nothing about exam structure is specified here.** The stage begins by reading official sources.

## 2. Candidates

| Exam | Why | Official source to read |
|---|---|---|
| State certificate exam in Polish as a foreign language, B1 | the level usually asked for citizenship (verify) | certyfikatpolski.pl, NAWA |
| the same, B2 / C1 | university admission | certyfikatpolski.pl |

## 3. Step E-1: research report (stop for "OK")

Write `docs/plan/exams-research.md`: for each exam the parts, tasks per part, timing, scoring and pass rule, recent changes, dates and fees pattern, **links to official pages and sample papers with the access date**; what could not be confirmed officially; which task types map to existing item types and set kinds (`reading` with `passage`, `listening` with `script`); which need new speaking-trainer formats or writing-trainer configs; estimated volume; a proposal which exam to build first. Legal check: only original tasks "in the style of"; no official papers, recordings or logos in the repo.

The owner reads it, checks two facts personally against the official site, and says "OK".

## 4. Step E-2: build (per exam)

Folder `content/exams/<exam id>/`: `manifest.json`, `pages/*.md` (overview with countdown, one page per part with strategies, exam-day page, review plan), `sets/*.json`, `training/writing.json` (tasks, rubric, model answers with `modelNotes`), `training/speaking.json`, `links.json`. Registry entry in `content/exams/registry.json` (`id`, `code`, `label`, `level`, `status`, accents, `order`, `description`, `subtitle`, `sources`, `checkedOn`).

Also in this stage: "Real life vs exam" sections on topic pages (D13) for the exam's level; exam chips; exam decks; trail branches; "Exam flashcards" tile. Every exam overview page shows "Exam information checked on <Month YYYY>. Always confirm on the official site: <link>".

## 5. Engine work expected

Speaking-trainer formats and writing configs as data; registry-driven chips; nothing exam-specific in code.
