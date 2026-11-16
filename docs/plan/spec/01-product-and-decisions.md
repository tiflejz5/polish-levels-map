# Spec 01 — Product and decisions

## 1. What we build

**Polish Levels Map**: Polish A1–C2 (CEFR), explained in English. Repository `polish-levels-map`, served from GitHub Pages at `…/polish-levels-map/`.

**Learner.** An English-speaking adult or teen (native, or reading English at B1+) learning Polish on their own: partners and relatives of Poles, expats, heritage speakers. Explanations are contrastive with English.

Same promise as the original: an open skills map. For every level it shows what you need to know; every point has an explanation with examples and practice; you tick off what you know; a trail leads from A1 to C2; flashcards and a mistake log bring things back at the right time. No accounts, no server, data stays in the browser.

## 2. What stays exactly as in the original

Levels with categories and an "I know this" checklist · topic pages · level summaries · trail (stops, quizzes, checkpoints) · Today · placement test · level final tests and badges · practice hub (sets, mixes, generator, weak spots) · flashcards with scheduling, My words, mistake log, one review queue · stats · notes · search · cheat sheets and print · writing (model answers, phrase bank, trainer) · speaking trainer with recording · profiles, guest mode, export / import / reset · themes · sidebar · celebrations · keyboard shortcuts.

## 3. Decisions (made; do not reopen without the owner)

**D1. A standalone app in its own repository.** It starts as a copy of the Spanish app's engine at tag `engine-v1` and from then on is independent: no shared code, no sync. The original English app and the Spanish app are not touched.

**D2. Copy, do not rewrite.** Everything language-neutral is taken as is. Only the language layer, the lab, the branding and the content are new.

**D3. Fresh start for data.** Storage prefix `plm.`, schema version 1 everywhere, no legacy migration code.

**D4. UI text is English, written directly in the code.** No translation layer: this app has one UI language. Rules and glossary: spec 04.

**D5. Gender and aspect are first-class.** Answers that depend on the speaker's gender accept both forms (byłem / byłam) unless the prompt fixes the gender. Free word order means sentence tasks need care (specs 05, 07, 08). The signature tool is a **Case Lab** (spec 09), not a tense lab.

**D6. Explanations are contrastive with English.** The mistakes section is "Common mistakes for English speakers": where English habits mislead (word order instead of cases, articles, one past tense instead of aspect). Distractors are those mistakes.

**D7. Accents and diacritics count.** An answer that differs only in diacritics is wrong, **with a specific hint**, and a special-character bar (ą ć ę ł ń ó ś ź ż) sits under every answer field. A setting "Accept answers without accents" (default off) turns such answers into "correct, with a reminder". Details: spec 05.

**D8. Checklist = topics, 1:1.** A topic is the checklist item (same id). No editable content store in localStorage.

**D9. Categories come from the syllabus.** cases, verbs, grammar, functions, vocabulary.
**D10. Vocabulary is split into several topics per level**, so the trail and decks have natural homes for words.

**D11. New item type "Fill the table"** (`paradigm`) for conjugation and declension: the core drill of an inflected language.

**D12. Exams come last and research-first** (spec 12). The generic exam module is kept and tested with a fixture; the special "Certyfikat C1" module of the original is dropped.

**D13. "Real life vs exam" sections are postponed** to the exams stage.

**D14. Usable early.** A level without content shows as "coming soon". Public beta when A1 is complete. Every page has a "Report a mistake" link (E12).

**D15. Lands are reused** with English names: Meadow (A1), Forest (A2), Hills (B1), Lake (B2), Mountains (C1), Summit (C2). Same symbols and level colours (they are computed for colour-blind safety).

## 4. Out of scope

Accounts and sync · native mobile apps · AI tutor or chat inside the app · human audio recordings (speech synthesis only) · UI in other languages · any shared code or shared build with other apps.

## 5. Risks and how the plan handles them

| Risk | Handling |
|---|---|
| Language errors in generated content | two independent reviewer subagents per batch, validators, "Report a mistake" link; the owner is a native speaker and reviews the calibration unit of every level |
| Old-language logic left in the code | inventory in stage 0, `check:lang`, rule "language facts only in `lang.js` / `config.js`" |
| Volume: 133 topics | units as batches, levels released one by one, "coming soon" state |
| Same origin as the owner's other apps on GitHub Pages | storage prefix `plm.`; QA with the other apps' data present |
| Exam facts out of date | research-first stage, official links, "checked on" note |
| No speech voice on the device | every speech feature degrades (transcript, hidden buttons, dictation skipped); QA covers it |
