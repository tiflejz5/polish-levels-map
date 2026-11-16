# Spec 09 — Case Lab

Route `#/lab`, title "Case Lab", data in `content/lab/`. It replaces the tense lab of the original app (`tense-lab.js`). Reused from it: card page layout, decision-tree view, compare view, listen buttons, search entries, notes button, the timeline drawing function. New: `js/lab-cases.js`.

## 1. Data

`cases.json` — seven cards (sample: `docs/plan/examples/lab/cases.sample.json`):

```json
{
  "id": "genitive", "name": "Dopełniacz", "nameEn": "Genitive", "questions": "kogo? czego?", "level": "A1",
  "summary": "Absence, possession, quantity, and after many prepositions.",
  "uses": [ { "label": "After negation", "pl": "Nie mam czasu.", "en": "I don't have time." } ],
  "triggers": { "prepositions": ["do", "z", "od", "bez", "dla", "u", "obok", "koło"], "verbs": ["szukać", "słuchać", "używać", "bać się", "potrzebować"], "other": ["dużo", "mało", "kilka", "5+"] },
  "endings": {
    "singular": { "masculine": "-a / -u", "feminine": "-y / -i", "neuter": "-a" },
    "plural": { "masculine personal": "-ów", "other": "-ów / — / -i / -y" },
    "adjective": { "singular": { "masculine": "-ego", "feminine": "-ej", "neuter": "-ego" }, "plural": "-ych / -ich" }
  },
  "traps": ["English has no ending here, so learners forget it after nie: Nie mam czas ✗ → Nie mam czasu ✓"],
  "contrasts": [ { "with": "accusative", "rule": "Positive sentence: accusative. Negated: genitive.", "examples": ["Mam samochód.", "Nie mam samochodu."] } ],
  "topicIds": ["a1-cases-genitive-basics", "a2-cases-genitive-plural-quantities"], "setTags": ["genitive"]
}
```

`models.json` — 14 model phrases (adjective + noun) with all 14 forms each: *nowy student, dobry lekarz, mały kot, stary dom, nowy pokój, dobra kawa, nowa lekcja, mała ulica, długa noc, małe okno, dobre piwo, nowe mieszkanie, trudne imię, małe muzeum*.

`trees.json` — decision trees in the reference format: "Pick the case" (preposition? → which → motion or location; no preposition → subject / after *być* / object / negated object / recipient / tool / addressing someone) · "Imperfective or perfective?" · "*w* or *na*?" · "*iść*, *jechać* or a prefixed verb?".

`aspect.json` — five forms (present, past imperfective, past perfective, future imperfective, future perfective) with timeline scenes, one example pair each.

## 2. Views

1. **Map:** seven case cards in the school order (Nominative, Genitive, Dative, Accusative, Instrumental, Locative, Vocative): English name, Polish name, question words, one-line use, level chip.
2. **Case card:** uses with listen buttons · endings table (nouns and adjectives) with a singular / plural switch · trigger chips (prepositions, verbs, other) · traps · contrasts · links to topics and "Practice this case" (sets by `setTags`).
3. **Pick the case:** decision tree; the result links to the case card.
4. **Compare:** two cases side by side (rule + example pairs).
5. **Declension viewer:** choose a model phrase → all 14 forms; or choose a case → all models in that case. Listen buttons. On phones the table becomes cards.
6. **Aspect and tense strip:** the five forms on one timeline.

## 3. Design

- Seven case colour tokens `--case-nom … --case-voc`, light and dark, validated like the level palette (colour-blind separation, AA). **Never colour alone:** the case name is always shown.
- From 320 px without horizontal scroll; tables scroll inside their frame or turn into cards.
- Keyboard: arrows move between map cards, Enter opens; the switch and chips are buttons; `?` lists shortcuts.
- Lab map under 500 ms on a warm cache.

## 4. Content for the engine stage

Only enough to see every view: 3 case cards (nominative, accusative, genitive), 4 model phrases, the "Pick the case" tree for those three cases, the aspect strip. The rest is written in level extras (spec 08 §4). All of it goes through the content pipeline (spec 10 §4).
