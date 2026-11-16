# Polish Levels Map – zacznij tutaj

Paczka dla Claude Code (Opus 5.5) do zbudowania **osobnej aplikacji** do nauki polskiego, z objaśnieniami po angielsku, w tym samym zamyśle co Twoja `english-levels-map`. Osobne repozytorium, osobny adres, osobne dane.

**Dla kogo:** dla osoby anglojęzycznej uczącej się polskiego. Objaśnienia porównują polski z angielskim (sekcja „Common mistakes for English speakers”).

**Ważne:** ta aplikacja powstaje przez port prosto z oryginału `english-levels-map` (commit `275be9f`), bo silnik hiszpański (`spanish-levels-map@engine-v1`) jeszcze nie istnieje. To jednorazowa kopia: potem projekty są całkiem niezależne. Silnik to 9 sesji (etapy 0–7), treści bez zmian według promptów C, X, L, E.

## Co jest w paczce

| Plik | Po co |
|---|---|
| `START-TUTAJ.md` | ten plik |
| `CLAUDE.md` | stałe zasady projektu; Claude Code czyta go sam w każdej sesji |
| `docs/plan/00-READ-ME.md` | zasady i tabela etapów |
| `docs/plan/PROMPTS.md` | **prompty do wklejania**, etap po etapie (opisy po polsku) |
| `docs/plan/spec/` | specyfikacje: decyzje, architektura, mapa importu, język interfejsu, warstwa językowa, zmiany w silniku, model treści, decyzje językowe, Case Lab, produkcja treści, marka, egzaminy, QA |
| `docs/plan/syllabus.json` | pełny sylabus A1–C2: 133 tematów w poziomach i jednostkach (z niego powstaje też Szlak) |
| `docs/plan/examples/` | wzorce jakości: strona tematu, quiz, zestaw zadań, fiszki, karta laboratorium, pytania testu poziomu |
| `docs/plan/scripts/validate_plan.py` | walidator sylabusa i treści |

## Najważniejsze decyzje

Pełna lista: `docs/plan/spec/01-product-and-decisions.md`.

1. **Kopia gotowego silnika, potem pełna niezależność.** Nowe są tylko: warstwa językowa, Case Lab, marka i treści.
2. **Własne klucze localStorage z prefiksem `plm.`** (ten sam adres bazowy na GitHub Pages co inne Twoje aplikacje).
3. **Polskie znaki się liczą**, ale odpowiedź różniąca się tylko nimi dostaje osobną podpowiedź, a pod każdym polem jest pasek znaków (ą ć ę ł ń ó ś ź ż). Osobna podpowiedź „dobre słowo, zła końcówka” przy błędnym przypadku.
4. **Przypadki uczone według użycia**, nie według tabeli: mianownik → narzędnik (Jestem studentem) → biernik → dopełniacz → miejscownik → celownik → wołacz.
5. **Case Lab** zamiast laboratorium czasów: mapa przypadków, końcówki, drzewko „Pick the case”, przeglądarka odmiany, pasek aspektu.
6. **Rodzaj mówiącego i aspekt** są wbudowane w zasady treści i walidator (byłem / byłam, robić / zrobić).
7. **Typ zadania „Fill the table”** służy tu do odmiany przez przypadki i osoby.
8. **Egzamin certyfikatowy na końcu i najpierw badanie oficjalnych źródeł**, bo przepisy zmieniły się w 2026 r.

## Jak zacząć

1. Załóż na GitHubie puste repozytorium `polish-levels-map`.
2. Sklonuj je i rozpakuj do niego tę paczkę (`CLAUDE.md` i folder `docs/` w głównym katalogu).
3. Commit „Plan: specs, syllabus, examples, prompts” i push.
4. Otwórz Claude Code w tym folderze, model Opus 5.5.
5. Wklej **PROMPT 0** z `docs/plan/PROMPTS.md`.

Dalej zawsze tak samo: prompt → Opus pracuje i się zatrzymuje → oglądasz → **PROMPT OK** albo **PROMPT POPRAWKI**.

## Skala

| Faza | Prompty | Sesje (orientacyjnie) |
|---|---|---|
| Silnik | 0, 1A, 1B, 2, 3, 4, 5, 6, 7 | 9 |
| A1 | C (2–3 razy), X | 3–4 |
| Publikacja | L | 1 |
| Każdy kolejny poziom | C + X | 3–4 |
| Egzamin | E1, E2 | 2 |

Do działającej aplikacji z całym A1: około 13–14 sesji.

## Na co uważać

- **Ty jesteś recenzentem polskiego.** Pierwsza jednostka każdego poziomu to obowiązkowy przystanek: przeczytaj strony uważnie, popraw, a Twoje uwagi trafią do `content/STYLE-NOTES.md` i będą obowiązywać dalej. Tabele odmiany w Case Lab przejrzyj w całości.
- Wiele komputerów nie ma polskiego głosu syntezatora; aplikacja to obsługuje, ale sprawdź u siebie.
- **Nie zmieniaj identyfikatorów w sylabusie** po starcie treści (są kluczami postępu). Tytuły możesz zmieniać.

## Co możesz zmienić przed PROMPT 0

| Temat | Co przyjąłem | Gdzie |
|---|---|---|
| Nazwa | Polish Levels Map, repo `polish-levels-map` | spec 02, 11 |
| Angielski interfejsu | amerykański | spec 04 |
| Kolor akcentu | #a3203a (crimson) | spec 11 |
| Zakres sylabusa | 133 tematów | `docs/plan/syllabus.json` (potem uruchom walidator) |
| Licencja | do Twojej decyzji przy publikacji | spec 13 |

## Sprawdzenie paczki

```
python3 docs/plan/scripts/validate_plan.py docs/plan
```

Powinno wypisać `133 topics` i `0 error(s), 0 warning(s)`.
