# Spec 08 — Polish: language decisions

## 1. Teaching approach

- **Cases are taught by use, not by table order.** Syllabus order: nominative → instrumental (identity) → accusative → genitive → locative → dative → vocative, singular first, plural at A2, numerals and irregular nouns at B1–B2. The Case Lab always shows the school order (Nominative, Genitive, Dative, Accusative, Instrumental, Locative, Vocative) with English names first, Polish names and question words next to them: "Genitive (*dopełniacz*: kogo? czego?)".
- **Gender.** Vocabulary lists tag every noun `(m)`, `(f)`, `(n)`; masculine subtypes (personal / animate / inanimate) are introduced with the accusative and used from then on only where they matter. Plural: "masculine personal" vs "other" (avoid the terms virile / non-virile in learner text).
- **Aspect.** From A2 every verb is listed as a pair, imperfective first: *robić / zrobić*. Tasks state the aspect need through context (signal words, result vs process), never through grammar labels alone.
- **Pronunciation.** The alphabet page gives English "sounds like" hints. Elsewhere the listen buttons do the work; no respelling in ordinary pages.
- **Formal address.** `pan / pani` + 3rd person is the default with strangers in dialogues; `ty` among friends. Never `wy` as a polite singular.
- **Speaker gender.** Dialogues alternate male and female speakers so both verb forms appear. Tasks follow spec 05 §3.
- **Word order.** Models use neutral order. Pages point out where another order is natural. Sentence tasks: spec 05 §3.

## 2. Terminology

nominative (*mianownik*) · genitive (*dopełniacz*) · dative (*celownik*) · accusative (*biernik*) · instrumental (*narzędnik*) · locative (*miejscownik*) · vocative (*wołacz*) · imperfective / perfective aspect (*niedokonany / dokonany*) · masculine personal plural · conditional mood (*tryb przypuszczający*) · adjectival / adverbial participle · reflexive particle *się* · verbs of motion.

## 3. What English speakers get wrong (source for mistakes sections and distractors)

Nominative everywhere (*Lubię kawa*, *Nie mam czas*, *Mieszkam w Kraków*) · *Jestem student* (→ studentem) · *Jestem 30 lat* (→ mam 30 lat) · subject pronoun in every sentence (*Ja idę, ja mam…*) · inventing articles (*ten* or *jeden* for "the / a") · wrong gender agreement (*moja brat*, *dobry kawa*) · one aspect for everything (*Jutro będę zrobić*, *Wczoraj robiłem zakupy i wróciłem* mix-ups) · *iść* for going by vehicle · *w* vs *na* (*w poczcie*, *na kinie*) · *znać / wiedzieć / umieć* · *lubić* vs *podobać się* · single negation (*Nikt przyszedł*) · position of *się* at the start of a sentence · numerals (*pięć koty*, *dwa kobiety*) · masculine personal plural (*dobre studenty*) · *ty* to strangers, *wy* as formal "you" · missing genitive after *nie ma* · *o* + accusative instead of locative · *mówić* vs *powiedzieć* · tense shift in reported speech (*Powiedział, że był zmęczony* for a present state) · false friends (*aktualnie, ewentualnie, sympatyczny, pensja, lektura, konkurs, szef*) · spelling: missing diacritics, *ó / u*, *rz / ż*, *ch / h*; capital letters on months, days, nationalities used as adjectives.

## 4. Case Lab

Data and views: spec 09. Content plan:

- `cases.json`: 7 cards. Written in level extras: A1 (nominative, instrumental, accusative, genitive, locative — singular uses), A2 (dative, plural endings added to all cards), B1 (vocative, trigger lists completed: verbs and prepositions), B2 (numerals and irregular notes).
- `models.json`: 14 model phrases covering the main patterns: *nowy student, dobry lekarz, mały kot, stary dom, nowy pokój, dobra kawa, nowa lekcja, mała ulica, długa noc, małe okno, dobre piwo, nowe mieszkanie, trudne imię, małe muzeum*.
- `trees.json`: "Pick the case" (preposition? → which → motion or location; no preposition → subject / after *być* / object / negated object / recipient / tool / addressing someone) · "Imperfective or perfective?" · "*w* or *na*?" · "*iść*, *jechać* or a prefixed verb?".
- Aspect and tense strip: five forms with timeline scenes.
- Case colours: seven tokens `--case-nom … --case-voc`, validated for colour-blind separation and AA like the level palette; always shown with the case name.

## 5. Decks

One deck per vocabulary topic, plus:

| Deck | Level | Cards | Content |
|---|---|---|---|
| `verbs-core-100` | A1–A2 | 100 | infinitive typed + cloze in the present |
| `aspect-pairs` | A2–B1 | 60 | typed: give the perfective partner; cloze: choose the aspect |
| `case-accusative`, `case-genitive`, `case-locative`, `case-instrumental`, `case-dative` | A1–A2 | 30 each | cloze: noun phrase in brackets in the nominative |
| `prepositions-cases` | A2–B1 | 40 | cloze: preposition + right case |
| `numbers-nouns` | A2–B1 | 30 | cloze: *pięć (kot)* |
| `motion-verbs` | A2–B2 | 40 | cloze |
| `verb-government` | B1–B2 | 40 | cloze: *szukać (praca)* |
| `false-friends` | B1–B2 | 30 | typed |
| `connectors` | B1–C1 | 30 | cloze |
| `idioms` | B2–C1 | 30 | cloze |

Cloze hints for form decks show the lemma in the nominative / infinitive in brackets inside the sentence (target language) and the English meaning as `hint`.

## 6. Speech

`pl-PL`. Many desktop systems have no Polish voice installed. Learning settings show "No Polish voice found on this device" with a short "How to add one" text (Windows: Settings → Time & language → Speech; macOS: System Settings → Accessibility → Spoken Content; Android / iOS: built in; Chrome offers an online voice). All features must work without a voice (spec 05 §4).

## 7. Notes for the proofreader subagent

Check: case endings after every preposition, verb and numeral; masculine personal forms; animate accusative; aspect in every past and future form; consonant alternations (*k→c, g→dz, r→rz, t→ci, d→dzi, ł→l*); mobile *e* (*pies / psa*); *się* placement; double negation; commas before *że, który, żeby, bo, ale*; diacritics complete; *ó/u, rz/ż, ch/h*; lower-case months, days and adjectives of nationality; natural word order; register (*pan / pani* forms consistent inside a dialogue); no calques from English (*robić sens*, *mieć rację* is fine, *być poprawnym* for "be right" is not).

The owner is a native speaker and reviews the first unit of every level personally before the rest of the level is written.
