# Legacy validators (not run)

Validators of the original app (english-levels-map@275be9f), kept unchanged and **not wired** into `npm run validate`.
They read the original content layout (`niezbednik/`, `cwiczenia/`, `dane/`) and some call Python scripts that were not copied.

Stage 4 (spec 06 E11) ports their rules for kept formats to `tools/validate-*.js` on `content/`, then this folder is deleted:

| Legacy file | Becomes | Stage |
|---|---|---|
| waliduj-cwiczenia.js | validate-exercises.js | 4 |
| waliduj-fiszki.js | validate-decks.js | 4 |
| waliduj-v6.js | validate-cheatsheets.js | 4 |
| waliduj-zwroty.js | validate-phrases.js | 4 (data: B1 extras) |
| waliduj-wzorce.js | validate-models.js | E |
| waliduj-mowienie.js | validate-speaking.js | E |

Dropped in stage 1A: waliduj-c1-uoe.js (C1 module, E8), waliduj-szlak.js (trail rules move to the trail build, E9), waliduj-zycie.js ("Life and exam" sections, D13).
