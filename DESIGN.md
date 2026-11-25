# DESIGN.md — Polish Levels Map

This file is the single source of truth about the look and behaviour of the interface. Every later stage of visual work refers to it and extends it.

Plan of the visual work (inherited from the original app):

1. **Foundation** (colours, fonts, tokens, base components) — done.
2. **Sidebar** — done (section 3.1).
3. **The “Today” page, levels and celebrations** — done (sections 3.2–3.5).
4. **Topic page content, the C1 Certificate and the quality check** — done (sections 2.9, 3.7, 3.8, 9).

> **Stage 1B (Polish Levels Map) — what no longer applies below.** The C1 module and the per-exam themes are gone:
> sections 2.9 and 3.8, the `--c1-*` tokens, `[data-section="certyfikat" | "egzamin-osmoklasisty" | "matura-…" | "certyfikat-b2"]`,
> the C1 chip in the sidebar and the “In the C1 exam” callout no longer exist; exams use one generic look with the registry's
> `accent` / `accent2` as `--exam-accent` / `--exam-accent-2`. Routes are the English ones of spec 02 §6 (`#/review`, `#/practice`, …).
> The level page has no category filter: topics are grouped by syllabus category, each row shows the topic, its Polish example
> (`.ess-example`) and, when the page is missing, a dashed “Being written” label (`.ess-pending`). A “soon” level shows
> `.ess-item.is-planned` rows, a “Coming soon” chip in the header, “soon” in the sidebar (`.sb-item.is-soon`), a dimmed land on the
> trail (`.sz-level.is-soon`) and on Today (`.trail-station.is-soon`). New: “Page not found” (`.notfound`), the pending topic page
> (`.page-pending`) and the home level list (`.home-levels`) used while `content/home.md` does not exist.
>
> **Stage 2 (English UI).** This file is translated into English; its content is unchanged and is pruned in stage 7.
> Interface labels quoted below are the English ones of spec 04 (glossary). Renamed classes: `.umiem` → `.know-toggle`,
> `.umiem-lg` → `.know-toggle-lg`, `.ex-umiem*` → `.ex-known*`, `.fiszki-view` → `.cards-view`, `.st-fiszki` → `.st-cards`.
> The microcopy rules (section 6) follow spec 04 §2.

---

## 1. Direction: a “travel map” with editorial typography

- **Metaphor.** Learning is a journey across a map from A1 to C2. Levels are “lands” in their own colours, and progress is a trail. The brand gradient runs through the land colours in the order A1 → C2.
- **Mood.** Calm, warm and grown-up, with a touch of adventure. Not childish and not corporate. The inspiration is the paper of an old atlas (cream, ink) by day and a map at night (deep navy) after dark.
- **Typography.** Headings, level codes and big numbers use a display face with character (Fraunces, a serif with a variable optical size). Text uses a readable sans-serif (Inter).
- **Colour.** Colour carries meaning; it is not decoration. A land's colour appears where a given level matters: a dot, a bar, the level card background, the “I know this” marker. The interface chrome (buttons, links, borders) is neutral: ink plus one accent.
- **Gamification.** Only at milestones (stage 3). Otherwise the app is calm.
- **What we avoid.** White cards with a grey border as the only means of expression, a rainbow without meaning, heavy effects (WebGL, particles), smooth-scroll libraries and the template “SaaS dashboard”.

## 2. Tokens

All values are CSS variables at the top of `css/style.css`. The theme is chosen by `data-theme="light" | "dark"` on `<html>` (an inline script in `<head>` and `js/theme.js`). Outside the token blocks **no colours are hard-coded**. Check: `node tools/contrast.js` and the audit described in section 8.

### 2.1 Surfaces, text, lines

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#faf6ee` | `#0e1526` | page background |
| `--surface` | `#fffdf9` | `#151e33` | cards, fields, menus |
| `--surface-2` | `#f3ede0` | `#1c2742` | sidebar, light fills |
| `--surface-3` | `#e9e1cf` | `#263352` | tracks, chips |
| `--surface-raised` | `#fffefb` | `#19233b` | raised card (hover) |
| `--ink` | `#1d2433` | `#eaf0fa` | main text |
| `--ink-muted` | `#545d6e` | `#a3aec2` | secondary text (≥ 4.5:1 on `surface-2/3` too) |
| `--ink-faint` | `#69707f` | `#8792a8` | placeholders |
| `--line` | `#e6dfcf` | `#27334f` | decorative lines |
| `--line-strong` | `#d4c9b2` | `#34426a` | clearer borders (e.g. the secondary button) |
| `--line-control` | `#8c8471` | `#6d7a99` | field and control borders (≥ 3:1) |

`--ink-muted` was darkened from the brief's starting point (`#5B6475` → `#545d6e`) so that it has 4.5:1 on `--surface-3` too.

### 2.2 Accent and states

- `--accent` (`#2c55c4` light / `#8db0ff` dark): links, focus, highlights.
- The primary button is ink-coloured (`--accent-bg`: `#1d2433` / `#eaf0fa`) with `--on-accent` text. This gives an editorial, “printed” character, and colour stays for the lands.
- The states `--success`, `--warning` and `--danger` (with the variants `-soft`, `-border`, `-fill`, `-bg`) are **reserved**. They are not level colours and always come with an icon or a word.

### 2.3 Lands (levels A1–C2)

Each level has four tokens, separately for both themes:

| Token | Used for |
|---|---|
| `--lvl-xx` | main colour (dot, bar, fill) |
| `--lvl-xx-soft` | background / bar track |
| `--lvl-xx-ink` | text on the `-soft` background (AA ≥ 4.5:1, in practice > 8:1) |
| `--lvl-xx-glow` | glow (dark theme, highlights) |

| Level | Hue | Light | Dark |
|---|---|---|---|
| A1 | green | `#0e9a3f` | `#0e9a3f` |
| A2 | blue | `#0991ed` | `#1a97f4` |
| B1 | violet | `#6133a2` | `#7d52c3` |
| B2 | pink (raspberry) | `#b13065` | `#be3d70` |
| C1 | orange | `#e06d00` | `#e06d00` |
| C2 | teal | `#06999a` | `#12a7a7` |

- An element with the class `.lvl-A1` … `.lvl-C2` gets the context variables `--lvl`, `--lvl-soft`, `--lvl-ink` and `--lvl-glow`. Components use only these.
- **The palette is computed, not picked by eye.** It is checked by the categorical palette validator (the `dataviz` skill) for the light background `#fffdf9`/`#faf6ee` and the dark `#151e33`/`#0e1526`. Result:
  - lightness in the band, saturation ≥ 0.10;
  - neighbouring pairs under protanopia and deuteranopia simulation ΔE ≥ 11.6 (target 8);
  - normal vision ΔE ≥ 17.6 (threshold 15);
  - marker contrast to the background ≥ 3:1.

  The previous palette failed: the blue A2 and the violet B1 had ΔE 4.4 under deuteranopia.
- In the dark theme `-soft` is mixed with the page background (`--bg`), not with the card, because only then does the B1 bar have ≥ 3:1 on its track.
- **A level is never marked by colour alone.** Its code (A1…C2) always comes with it.
- Changing a level colour means running the validator and `node tools/contrast.js` again.

### 2.4 Brand gradient

`--brand-gradient`: linear through `--lvl-a1` → `--lvl-c2`. Used **sparingly**: the logo mark, the progress ring, possibly a single milestone accent. Never as a text background or the background of whole sections.

### 2.5 Typography

| Token | Value |
|---|---|
| `--font-display` | `"Fraunces Variable"`, fallback Iowan / Palatino / Georgia |
| `--font` | `"Inter Variable"`, fallback system fonts |
| `--font-mono` | system monospace |

- **Fluid scale (`clamp`).**
  - `--fs-xs` 12 px, `--fs-sm` 14 px, `--fs-md` 16 px, `--fs-lg` 18 px;
  - `--fs-xl` 20–24 px (section), `--fs-2xl` 26–36 px (page title), `--fs-3xl` 36–56 px, `--fs-4xl` 44–72 px (level code, result).
- **Big headings:** `--tracking-display` (−0.02 em), `--lh-tight`.
- **Capital labels:** `--tracking-caps` (0.08 em).
- **Line length in content:** `--measure` 70ch.
- **Stats and counters:** `font-variant-numeric: tabular-nums` (the `.num` class and component rules).
- **Fraunces:** weight 560–650 in headings, the `opsz` axis automatic (`font-optical-sizing: auto`), so big letters are tighter and bolder.
- **Files:** self-hosted (`assets/fonts/`), only the `latin` and `latin-ext` subsets (ą ć ę ł ń ó ś ź ż), `font-display: swap`.
- **Preload:** only Inter latin and latin-ext (text visible at once) and Fraunces latin (headings).

### 2.6 Spacing, radii, shadows

- **Spacing:** `--space-1` … `--space-8` (4, 8, 12, 16, 24, 32, 48, 64 px).
- **Radii (soft):** `--radius-xs` 6, `--radius-sm` 10, `--radius` 14, `--radius-lg` 20, `--radius-xl` 28, `--radius-pill`.
- **Widths (v7 A1):** `--w-text` 720 px (the column of reading pages, aligned left) and `--w-wide` 1000 px (the container of every view, `.view`). The left edge of the h1 heading is the same on every screen; `--measure` for paragraphs stays.
- **Buttons (v7 A2):** `.btn` has `--radius-sm`; a pill only for chips, filters and toggles. Levels: `.btn-primary` (one per view), `.btn-secondary` (outline), `.btn-link` (alias `.btn-ghost`). Breadcrumbs and back links are `.crumb` (icon `chevron-left`).
- **Layered shadows** (`--shadow-sm`, `--shadow`, `--shadow-hover`, `--shadow-lg`):
  - light: warm, brownish, very subtle;
  - dark: a deep shadow plus a subtle edge and an accent glow on hover.

### 2.7 Motion

| Token | Value | Used for |
|---|---|---|
| `--dur-fast` | 120 ms | hover, colour |
| `--dur-base` | 200 ms | appearing, menus |
| `--dur-slow` | 320 ms | progress bars and rings |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | default |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | “snaps” (the “I know this” marker) |

Rules in detail: section 4.

### 2.8 Other

- `--selection`: the text selection colour.
- `--scrollbar`, `--scrollbar-hover`: a subtle scrollbar.
- `--topo-color` and `--topo-opacity` (4–5%): the contour pattern behind headers.
- `--topbar-h`: the height of the top bar (“sticky” elements sit under it).
- `--topo-mask`: the contour pattern as a mask (shared by headers and the “Today” hero).
- `--cat-uoe`, `--cat-reading`, `--cat-writing`, `--cat-listening`, `--cat-speaking`, `--cat-grammar`, `--cat-vocab`, `--cat-other`: mistake log category stripes.
- `--c1-cream`, `--c1-cream-muted`: text on navy (the exam tile).

### 2.9 The “C1 Certificate” section (stage 4)

In the C1 tab `js/app.js` sets `data-section="certyfikat"` on `<html>` (outside it `data-section="app"`). Two token blocks override surfaces, text, lines, accent and focus. Components do not change; only the “paper” does:

| Token | Light (“ivory”) | Dark (“midnight navy”) |
|---|---|---|
| `--bg` / `--surface` | `#f9f4e8` / `#fffaf0` | `#090f21` / `#101935` |
| `--ink` / `--ink-muted` | `#17203d` / `#4c5470` (navy ink) | `#f3ecda` / `#bcb4a0` (cream text) |
| `--accent` | `#6b4d00` (dark gold, AA links) | `#e9c25c` (gold) |
| `--accent-bg` / `--on-accent` | `#1b2647` / `#fdf7e8` (navy button) | `#e9c25c` / `#090f21` (gold button) |
| `--focus-color` | `#8a6400` | `#e9c25c` |

- Selectors: `:root:not([data-theme="dark"])[data-section="certyfikat"]` and `:root[data-theme="dark"][data-section="certyfikat"]`.
- The fixed C1 brand accents (`--c1-navy`, `--c1-gold`, `--c1-soft`, `--c1-ink`, `--c1-edge`, `--c1-cream`, `--c1-cream-muted`) work everywhere, e.g. in the C1 chip in the sidebar, the exam tile on “Today” and the “In the C1 exam” callout.
- `tools/contrast.js` checks all pairs in four scopes: light, dark, C1 light, C1 dark.

## 3. Base components

| Component | Class / function | Rules |
|---|---|---|
| Card | `.card` (+ `.is-interactive` for clickable ones) | A `--surface` layer on `--bg`, a `--line` border, a `--shadow-sm` shadow. A card in the context of a level (`.lvl-XX`) has a border with a touch of the land colour. A clickable one lifts (`translateY(-2px)` + `--shadow-hover`) without a layout shift. |
| Button | `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-danger-solid`, `.btn-small` | Pill. The primary is ink-coloured, the secondary `--surface` with a `--line-strong` border, ghost only the accent. Pressed: `scale(.98)`. Min. 44 px on touch screens. |
| “I know this” | `.know-toggle` (+ `.know-toggle-lg`) | A pill with a round box. When ticked: background `--lvl-soft`, colour `--lvl-ink`, the box filled with `--lvl`, the check mark “snaps” (`--ease-spring`). Outside a level: success colours. |
| Chip | `.chip` (+ `.c1-chip`) | A small `--surface-3` / `--ink-muted` pill. In the context of a level: `--lvl-soft` / `--lvl-ink`. |
| Tooltip | `[data-tooltip]` | Pure CSS, appears on hover **and** focus-visible. The content is also in `aria-label`, because the tooltip is only visual. |
| Progress bar | `.progress` > `.progress-fill` (the `progressBar` function in `js/render.js`) | Filled through `transform: scaleX` (`--dur-slow`). Colour `--lvl` or `--brand-gradient` (`.is-brand`). Track `--lvl-soft`. |
| Progress ring | `LM.ui.progressRing(percent, opts)` (`js/ui.js`) | SVG, the arc through `stroke-dashoffset`, the level colour or the brand gradient, the number in the middle (`tabular-nums`). Role `progressbar` with `aria-valuenow`. |
| Icon | `LM.icon(name, opts)` (`js/ui.js`), in HTML `<span data-icon="name">` | Lucide, 1.75 px stroke, `currentColor`, `aria-hidden` by default. Drawn with `createElementNS` (no innerHTML). |
| Logo | `LM.logo()` (in HTML `[data-logo]`), `assets/favicon.svg`, `assets/favicon-180.png` | Mark: a compass in a circle with a dotted trail, the circle and the needle's north in the brand gradient. The name (from `LM.APP.appTitle`) in Fraunces in `--ink`. The gradient is only in the mark, because the light lands (green, orange, teal) give text contrast below 4.5:1. |
| Focus | `:focus-visible` | A 2 px `--focus-color` outline, a 2 px offset, on every background. |
| Contour background | `::before` of the headers `.level-header`, `.tool-head`, the home page's first `h1` and `.c1-title` | A static contour pattern (`assets/warstwice.svg`, in CSS as a `data:` mask, because masks from a file are blocked under `file://`) in `--topo-color` at `--topo-opacity`, faded to the left. `.view` has `overflow-x: clip`, so the pattern never causes horizontal scrolling. |

### 3.1 Sidebar (stage 2)

- **v8 (the rail, sketch A):**
  - Order: Today, **Review** (“Flashcards and mistakes”, `#/review`, icon `layers`, one badge = `LM.reviewQueue.count()`: flashcards + My mistakes + weak spots), Practice, the lab, Writing, a line, the levels, a line, **My exams**, “+N”, the pin. Placement test, Stats and My notes moved to the profile menu, the “My pages” section above “Data”.
  - Land circles of 36 px without a code under them (`aria-label` carries the name). A passed level (`is-passed`): the full `--lvl-soft` background and a ✓ stamp (`LM.ui.stamp`). The current land (`is-current`, `LM.today.currentLevelId()`): a 2 px outline in the land colour, opacity 0.35, a 4 px gap, “Current land” in `aria-label`. Note: at opacity 0.35 the outline has a contrast of about 1.4–1.8:1 (below 3:1 for graphics); the state is also carried by `aria-label` and “You are here” on Today.
  - My exams: a 44×44 tile with the code and the countdown (“15 d”, “today”), C1 navy and gold; the split and order in the pure `LM.examLogic.navSplit` (none of mine = all as before, without “+N”; an open exam stays in the rail). The C1 chip is now drawn by `js/exam-core.js`, `js/c1-core.js` only draws its sections.
  - “+N” (`#exam-more`, `aria-haspopup="dialog"`, `aria-label="Show the other exams (N)"`): the popover `.exam-pop` in `body` (`position: fixed`, a bottom sheet on a phone) with a list of exams, a link and a “Pin” switch (`LM.examMy.pin/unpin`). Focus moves into the list, Esc and a click outside close it, Esc gives focus back to the button; an open popover keeps the sidebar expanded (`LM.sidebar.hold`).
  - A denser rail (`gap` 2 px, 44 px rows, the level progress bar under the caption): at an 860 px window the collapsed rail with 2 of my exams and “+N” fits without scrolling (measured: 685 / 685 px), the expanded one too (the caption under the logo goes below 900 px height).
- **v7 (C1):** level circles have the land symbol (`assets/lands.js`, colour `--lvl-x`) instead of the text “A1”; the level code is a small label under the circle in the collapsed sidebar, and next to it in the expanded one (“A1 · Meadow”). The progress ring is unchanged.

Files: `index.html` (markup), `js/sidebar.js` (behaviour), `js/render.js` (tools and levels), `js/c1-core.js` (C1 chip and sections), the “SIDEBAR” section in `css/style.css`.

**States:**

| State | When | Look |
|---|---|---|
| Narrow rail | default from 768 px | `--rail-w` 72 px. The logo mark, the expand button, the icons Trail / Today / Review (badge) / Practice / the lab / Writing, six level chips with a progress ring in the land colour and the code in the middle, the “C1 Certificate” chip, the pin. |
| Expanded | mouse hover, keyboard focus, the expand button (tablet) | `--panel-w` 288 px, a `position: fixed` layer **over the content** with `--shadow-lg`. The content does not move. Labels, level names, “X / Y known” with a bar, the caption under the logo and the C1 tab sections are visible. |
| Pinned | the pin | The full sidebar all the time, no shadow. The content moves aside (`html[data-sidebar="pinned"] .main { margin-left: --panel-w }`, an animated margin). |
| Drawer | below 768 px | The “Menu” button in the top bar. The sidebar slides in from the left over a dimmed background, a tap on the background closes it. No pin and no expanding here. |

**Behaviour:**
- Hover works only with `(hover: hover) and (pointer: fine)`. It opens after 120 ms (an accidental pass of the cursor does nothing) and closes 250 ms after the cursor leaves.
- Keyboard focus (`:focus-visible`) expands the sidebar, losing it collapses it (unless the sidebar is pinned). Esc collapses it, and focus does not expand it again until it leaves the sidebar.
- A touch tablet: the expand button (`aria-expanded`, “Expand sidebar” / “Collapse sidebar”), a tap outside the sidebar closes it. After going to another page an expanded sidebar collapses.
- The pin has `aria-pressed`, the icon `pin-off` → `pin` and the label “Pin sidebar” / “Unpin sidebar”.
- The pinned state is saved in the key `plm.sidebar` = `{ version: 1, pinned }` (try/catch). It is global for the device, not part of the profile or the export. A script in `<head>` already reads it, so the content does not jump at start.

**Accessibility:**
- Labels in the narrow rail are hidden with `opacity` (they stay in the DOM), so a screen reader always knows the item's name.
- A level has an `aria-label`, e.g. “Level A1, Meadow: 9 of 30 topics known (30%)”. The ring is then decorative (`aria-hidden`).
- The active item has `aria-current="page"`, a background and a marker in the land colour (tools: the accent, C1: gold).
- Tab order: logo → expand → tools → levels → C1 (and its sections when expanded) → pin.
- All targets in the rail are ≥ 44 px.

**Motion:**
- The layer's width grows in `--dur-base` with `--ease-out`. It is a layer outside the flow, so it does not recalculate the content layout.
- Labels appear through `opacity` with a 60 ms delay.
- Rings and bars are updated in place (`LM.ui.setRing`) and move smoothly from the previous value.
- With `prefers-reduced-motion` the change is instant (no width or margin transitions).

**Progress numbers (consistency):**
- The sidebar and the “Today” page count the **whole level**, i.e. all categories (`app.getLevelStats`). The sidebar has the caption “Levels · all categories”.
- The bar on the level page counted the **chosen category** and had the note “in this category” (the category filter is gone since stage 1B).
- Before, the sidebar showed a category (“9 / 14”) and “Today” the whole level (“9 / 30”), without saying which.

**C1 Certificate:** a chip in navy and gold (`--c1-navy`, `--c1-gold`, `--c1-soft`, `--c1-ink`, `--c1-edge`). The outer edge `--c1-edge` (navy in the light theme, gold in the dark) has ≥ 3:1 to the sidebar. Stage 4 polishes the details.

### 3.2 The “Today” page — dashboard (stage 3)

**v7 (C2, C6):** the Trail is a topographic map: each land is a `--lvl-x-soft` patch with `--lvl-x` contour lines (from 3 lines in A1 to 8 in C2), a station is a circle with the land symbol, the label “A1 · Meadow” and a percentage; the covered part of the trail is solid, the rest dotted, a compass rose in the corner, a ✓ stamp for a passed final test, a vertical layout below 480 px. The same component without the compass rose is on the home page above the “Levels at a glance” table (`LM.today.compactTrail`). The states “Nothing to review today” and “First day of the streak” have illustrations from `LM.ui.emptyState` (the compass of the tile replaced).

**v7 (A4, A5):** a hero without contour lines. The “Continue”, “Add mistake” tiles and the test tip were replaced by one “Shortcuts” card (`.bento-shortcuts`, `.row` rows with an icon, title, description and chevron). The Flashcards and “Ready for the final test” tiles stayed unchanged.

File: `js/today.js`, the section “THE “TODAY” PAGE — dashboard” in `css/style.css`.

**Bento layout:** 12 columns on a computer, 6 on a tablet (up to 1023 px), 1 on a phone (up to 640 px).

| Tile | Columns (computer) | Content |
|---|---|---|
| Hero | 8 | Date, a greeting by the time of day (“Good morning” 5–12, “Good afternoon” 12–18, “Good evening”), one encouraging sentence depending on the state (details below), the “Your map” ring (total “I know this” progress, brand gradient). A contour background only here. |
| Reviews | 4 | A big number and “Start review”, and at zero an SVG compass and “Nothing to review today”. |
| Test nudge | 12 | Only for a profile without progress and without a test result. |
| Trail A1 → C2 | 12 | SVG: a path through six stations and the covered stretch in the brand gradient. Stations are HTML links with a ring (“I know this” percentage, all categories) and a name. The “You are here” pin stands at the first station below 100%. When the tile is below 480 px wide, the trail is vertical. |
| Streak | 5 | An SVG flame (lit with a streak > 0), the number of days, the longest streak, 7 dots (✓ on a learning day, today with an outline). |
| Exam | 4 | Only with a date set in the C1 Certificate (`c1.daysUntil` / `countdownText`). Navy and gold. |
| Add mistake | 3 | A shortcut to the mistake log form. |
| Continue | 4 (12 with the exam tile) | The last opened topic page. |

**The encouraging sentence**, in the order of checking:
1. There was activity today already → “done, you can rest”.
2. There are reviews → “N mistakes are waiting – a good start”.
3. Nothing done yet → the first topic of the current station with a link to its page.
4. Otherwise → “Suggestion for today: …”.

**Animations** (`js/motion.js`):
- Tiles enter one after another (60 ms stagger), big numbers count up from zero.
- The covered stretch of the trail “draws itself” (DrawSVG), the pin travels to its station (MotionPath).
- Rings fill with a CSS transition.
- Later visits in the same session are only a short refresh (250 ms).

**Technical details of the trail:**
- The centre of a station's ring lies exactly on the path point.
- The pin is on its own SVG layer above the stations (`pointer-events: none`). Its size and lift (32 px) are fixed in screen pixels, whatever the `viewBox` scale.

### 3.3 Celebrations (stage 3)

- **v7 (C5):** confetti removed. Level milestones show a piece of the Trail: the land circle with its symbol and a ring animated from the previous threshold to the new one (a CSS transition ≤ 600 ms), and a stamp for a passed final test. Reduced motion: the final state at once.

File: `js/celebrate.js`.
- **Milestones:**
  - the first “I know this”, 10 / 25 / 50 / 100 “I know this”;
  - level 25 / 50 / 75 / 100% (all categories);
  - streak 3 / 7 / 14 / 30 days;
  - the first review session, a finished placement test.
- **Each milestone is shown once per profile.** Saved in `plm.celebrated` = `{ version: 1, profiles: { id: { ids } } }`, covered by export, import, reset and profile deletion.
- **A profile with existing progress** gets, on its first start (app start, profile change), a record of the milestones already reached, without showing them.
- **Form:** a “toast” card at the bottom of the screen:
  - an icon in the context colour (level or accent), a title in the display font and one sentence;
  - it goes after 2.8 s, pauses under the cursor, closes on a click or Esc;
  - `role="status"` and `pointer-events` only on the card, so it does not block the interface;
  - a queue shows one card at a time, and with several new milestones up to the 2 most important.
- **Confetti:** 22 DOM elements animated with GSAP for about 1 s, in the level colour or the land colours, then removed. With `prefers-reduced-motion` only the card.
- **Texts:** short and concrete, no hype (e.g. “A week in a row – Seven days of learning without a break.”, “A1 complete – … Next stop: A2.”).

### 3.4 Level pages (stage 3)

- **v7 (C1, C3):** above the header “A1 · Meadow” (the land name from the syllabus). A ticked “I know this” is a round stamp in the land colour; the “bounce” (scale 1.25 → 1, rotate −10° → −6°, 220 ms) only when the user ticks it.

- **v7 (A4–A6):** no contour lines in headers and the hero (contours only on the Trail). Topics are rows (`.ess-item`: a 44 px “I know this” on the left, the text, a chevron on the right; a thin line, hover `--row-hover`). The category filter had “All” as its first option (removed in stage 1B).

- **Header:**
  - the word “Level” in capitals;
  - a big level mark (`--fs-4xl`, `--lvl-ink`), the name and the goal from the description;
  - the whole level's progress ring (updated in place after “I know this”);
  - background `linear-gradient(--lvl-soft → --surface)`.
- **Accent:** on a level page and its topic pages (`.view.lvl-XX`) `--accent`, `--accent-soft`, `--focus-color` and `--focus-ring` take the land colour. Links, chips and focus are in the level colour, and the primary button stays ink-coloured.
- **Categories:** a filter as chips (`.chip-btn`, `aria-pressed`, ✓ on the chosen one, 44 px).
- **Topics:** cards with a category chip and the “I know this” pill, a border with a touch of the land colour. Ticked ones have a `--lvl-soft` background.
- **Home page:** the rows of the “Levels at a glance” table have a bar and a hover background in the land colour. The level summary has the land's bar at the top.

### 3.5 Placement test and mistake log (stage 3)

- **Test:**
  - one question on the screen, progress dots with ✓ / ✗ (not only colour);
  - after an answer the letter turns into ✓ / ✗, with the label “Correct” / “Your answer” next to it;
  - the result shows a big level mark (`clamp` up to 6.5 rem, the land colour) with a “pop” animation (GSAP, no motion with `reduced-motion`).
- **Mistake log:**
  - a category stripe next to an entry and on the review card: `--cat-*` tokens in both themes, ≥ 3:1 to the card, the category name always in a chip;
  - the review session: a big card, the context in the display font, “Show answer” (eye icon), then two clear buttons: “I knew it” (green, ✓) and “Wrong again” (repeat icon).

### 3.6 React Bits

Skipped. The app is not in React, and the brief allowed this step only for React.

### 3.7 Topic page content and callouts (stage 4)

- **Content typography.**
  - Paragraphs and lists are at most `--measure` (70 characters).
  - H1, H2 and H3 are in the display face (Fraunces), with a clear size step (`--fs-2xl` / `--fs-xl` / `--fs-lg`).
  - Lists have a marker in the level colour, and the text line height is `--lh-body`.
- **Callouts.** `js/callouts.js` recognizes a section by the **heading text**: `## H2` or a bold subheading `**…**` (`p.md-subhead`). The `.md` files stay unchanged. The rules are in one array `CALLOUT_RULES`, and the first match wins. Since stage 2 they key on the English headings of spec 07 §1–2:

  | The heading starts with | Type / class | Icon | Look |
  |---|---|---|---|
  | “Common mistakes for English speakers” (`LM.APP.mistakesHeading`), “The most common trap”, “Watch out” | `callout-trap` | `triangle-alert` | amber (`--warning-soft`), list markers in `--warning` |
  | “Real life vs exam” | `callout-real-exam` | `arrow-left-right` | see 3.14 |
  | “Key ideas”, “What you can do at this level” | `callout-key` | `sparkles` | `--lvl-soft` (level colour) |
  | “What next”, “Are you ready…” | `callout-next` | `map-pin` | a dashed border, links as pill buttons |
  | “Examples”, “Key phrases”, “Word partners” | `callout-examples` | `list-checks` | a left stripe in the level colour, target-language sentences (`em`, the 1st table column) in `--lvl-ink` |

  (The original app also had `callout-exam` for “In the C1 exam”: removed with the C1 module.)

  **How to add a new callout:**
  1. Add an entry to `CALLOUT_RULES` in `js/callouts.js`: `{ match: /^start of the heading/i, type: "name", icon: "lucide-icon", label: "…" }`.
  2. Add the rules `.callout-name` and `.callout-name .callout-icon` to `css/style.css` (the “TOPIC PAGE CONTENT” section), using tokens only.
  3. If the icon is not in `assets/icons.js`, add it to the list in `tools/assets.js` and run `npm run assets`.
  4. Add new colour pairs to `tools/contrast.js`.
- **Tables.**
  - A `.md-table` frame with `--radius` rounding and zebra rows (`--surface-2` mixed with `--surface`).
  - The header has a `--surface-2` background, `--ink` 650 text and a stronger `--line-strong` line.
  - They scroll horizontally inside the frame. Side shadows (`.has-left` / `.has-right`) show that there is more content.
  - A scrolling table is a named region with `tabindex="0"` (keyboard scrolling).
- **`[[id]]` links.** `.wiki-chip`: a pill in the level colour of the target page (`lvl-XX`), with the `notebook-text` icon and the level code. C1 sets (`.is-c1`) were navy with gold and had the `award` icon.
- **“I know this” on narrow screens.** Below 760 px the topic page header `.page-head` is sticky (`position: sticky`, background `--sticky-bg`), so “I know this” is always at hand. Breadcrumbs are hidden then.

### 3.8 C1 Certificate — its own mood (stage 4)

- **The section header `.c1-masthead`.**
  - The wordmark “C1 Advanced · preparation” in Fraunces, without the Cambridge logo or graphics.
  - A big number of days to the exam (`--fs-3xl`, Fraunces, `tabular-nums`) or the link “Set the exam date”.
  - On the overview page there is no number, because the exam date card shows it.
- **Exam paper** (`.c1-ex.card`).
  - A 6 px top edge in `--accent-bg` and fine paper lines (`--line` 30%).
  - Item numbers in the display face.
  - Gap fields are lines to write on (a 2 px bottom edge in `--line-control`).
  - The result always as ✓/✗ plus text and a `-soft` background, not only colour.
  - The “Add to the mistake log” button is next to every mistake.
- **Trainers (Writing, Speaking).**
  - A big timer (`--fs-2xl`, Fraunces) and a word counter.
  - While a visible timer runs, `html.focus-mode` dims the rest of the interface (sidebar, top bar, C1 navigation) to 30%.
  - On hover or focus a dimmed element goes back to 100%, so nothing disappears for the keyboard.
  - The mode ends on pause, when time is up, or on a page change.

### 3.9 Practice: the exercise engine and the Practice hub (extension v2)

- **Item card** (`.ex-card`): above the card progress dots (the same as in the placement test: ✓ / ✗ in the dot). The item type is in capitals, and the instruction in the display face.
- **Multiple choice.**
  - Native radio fields in `role="radiogroup"`, the whole 48 px label is the click target.
  - A number 1–4 in a circle: the chosen option gets a `--accent-soft` background, the correct one ✓ and “Correct”, the wrong one ✗ and “Your answer”.
  - The `___` gap is a line: after checking it is filled green, or red with a strike-through (always with an icon).
- **Put in order.** Words are 44 px buttons (“tap-to-place”), and the answer line is a dashed frame. After a mistake the word where the order differs from the model has ✗ and a `--danger-soft` background.
- **Find the mistake.**
  - Words are buttons with `aria-pressed`, the selected one is underlined in `--accent`.
  - After checking the wrong part has an amber `--warning-soft` background, and a wrongly chosen part has a red line.
- **Feedback.**
  - Shown in `role="status"`: the verdict, the model answer, the explanation, an amber “Trap” box.
  - Animations: a “snap” of the card (`ex-pop`) or a short shake (`ex-shake`), both in CSS and turned off with `prefers-reduced-motion` (a global rule).
- **Phone.** The “Check / Next” buttons stick to the bottom of the card (`position: sticky`, background `--sticky-bg`).
- **Fill the table** (`paradigm`, stage 4).
  - The lemma in the display face with its English gloss; under it a grid of cells, the label above its field (case labels: the English name in `--ink`, the question words in `--ink-muted`).
  - From 480 px two columns filled top to bottom (`grid-auto-flow: column`, so Tab goes down a column); below 480 px one column. Fields 44 px high, full width of the cell.
  - A given cell: `--surface-2` background, dashed border, read-only, the word “given” next to it.
  - After checking: right cells `--success-soft` with ✓, wrong ones `--danger-soft`, struck through, ✗ and the right form under the field (the same chip as a gap model). Points in the status line (“4 / 6 points”).
  - One character bar under the grid serves every cell.
- **Result:** a big number in the display face (`--fs-4xl`), a warm comment by percentage and a “To correct” list. A mixed session adds accuracy per topic.
- **Set cards** (`.ex-set-card`): a top stripe in the level colour, the best and last score, a “Start” button. They look the same in “Check yourself”, in Practice and on the lab card.

### 3.10 The lab (extension v2; the tense lab of the original app, rewritten as the Case Lab in stage 6)

- **Tense group tokens** (axis and accents, ≥ 3:1 to the card and the background, checked in `tools/contrast.js`):

  | Token | Light | Dark |
  |---|---|---|
  | `--tense-past` | `#5b4bc4` (indigo) | `#b3a8ff` |
  | `--tense-present` | `#2c55c4` (accent) | `#8db0ff` |
  | `--tense-future` | `#0e7682` (sea green) | `#5fd3dc` |

  The class `.lab-group-<group>` sets `--tense`. The group colour is only on the axis and in the map column underline. Tiles and cards have the **level** colour (as in the whole app).
- **Map:** three columns (Present / Past / Future) and four aspects. On a narrow screen the columns are one under another. A tile has a left level stripe, the level code and an example in italics.
- **Timeline** (SVG):
  - `-1 … 0 … 1`, a dashed “now” line;
  - points, 12 px segments with a rounded end, a “since long ago” gradient, an arrow into the future, a “result” diamond, a vertical reference marker;
  - labels above the axis in rows without overlap;
  - a compact version (440 units) on a phone and in the comparison columns, so labels are not smaller than about 12 px;
  - a GSAP DrawSVG animation: the axis draws from the left, elements appear one after another. With `reduced-motion` the final state is shown at once;
  - `role="img"` with a description of the scene and the same description as text under the axis.
- **Tabs** are links with `aria-current="page"` (each has its own address). On a narrow screen the tab bar scrolls horizontally.
- **Pick:** big answer buttons (56 px), the path of choices above the question, focus goes to the new question. The result is item cards with a reason and an example.

### 3.11 Stats and the automatic mistake log (extension v2, stage 2)

- **Charts following the `dataviz` skill, without a library** (HTML and SVG on tokens).
  - Number tiles (value `--fs-2xl`, label above it).
  - Horizontal accuracy bars: track `--lvl-soft`, fill `--lvl`, a 4 px rounding at the end.
  - Trend columns: max. 24 px, only the top end rounded, a solid 1 px grid.
  - Activity map: 12 × 7 cells of 16 px.
- **Colour is an extra to the content.**
  - Topic bars have the level colour and the level code in the label.
  - Values and labels are in text colours, never in the data colour.
  - The level palette passes the skill's CVD validator in both themes (weakest pair ΔE 12.4 light / 11.6 dark).
- **Small samples.**
  - Below 5 attempts there is “not enough data” instead of a percentage.
  - A trend column with < 5 attempts is lighter.
  - Under each column is `n=` (the number of attempts).
- **Accessibility.**
  - Trend columns have focus and `aria-label`, with a table in `<details>` next to them.
  - The activity map has `role="img"` with a text summary.
  - No comparisons and no rankings.
- **Automatic mistake log.**
  - Entries from items have a spark chip (“Automatic · came back · mistakes: N”) in `--accent-soft` and a chip filter.
  - The session summary is in an `--info-bg` box.
  - A review done is a green ✓ marker in the feedback.
- **Toast** (`LM.ui.toast`): a dark `--inverse-bg` card at the bottom of the screen (on a phone above the session buttons), `role="status"`, 5 s, paused on hover and focus, the action button underlined.
- **The “I know this” suggestion:** a `--success-soft` box with a spark, “Mark “I know this”” and “Not now”.
- **Switch** in the profile menu: `role="switch"`, a 40 × 24 px track, `--success-fill` when on.

### 3.12 Search and notes (extension v2, stage 2)

- **Search.**
  - A `--surface` card at the top centre (`min(720px, 100vw − 32px)`), full width on a phone.
  - It slides in in 180 ms (no motion with `reduced-motion`).
  - Results are grouped (headings in capitals). The active option has an `--accent-soft` background and a left accent stripe.
  - Matches are highlighted with amber `<mark>`, inserted by splitting the text, not as HTML.
  - The hover zone is 12 px high, the middle 50% of the content area, with a 400 ms delay.
- **Notes.**
  - The “Notes” button (notebook icon, an accent dot when a note exists) is in the page header.
  - The panel appears on the right (400 px) on a wide screen, and on a phone as a bottom drawer (up to 70% of the height).
  - A text field in `--lh-body`, with the save status and a counter under it (from 80% of the limit, in `--danger` at the limit).

### 3.13 Exams (extension v2, stage 3)

- **The “Exams” group in the sidebar.**
  - A chip with the code from the registry (34 px, 10 px rounding) has a background in the exam colour (`--exam-accent` from the registry) and a bottom stripe in the second colour (`--exam-accent-2`).
  - “Soon” items have a `--surface-3` chip with an outline, a greyed title and a “soon” badge.
  - The text on the chip is white (on the E8 teal #0e7c86 a contrast of 4.88:1).
- **The E8 exam theme** of the original app: `html[data-section="egzamin-osmoklasisty"]`, friendly, school-like and energetic, not childish (removed in stage 1B; exams now use one generic look).

  | Token | Light | Dark |
  |---|---|---|
  | `--bg` / `--surface` | `#f8f5ec` / `#fffefa` (warm background) | `#0a181b` / `#0d2024` |
  | `--accent` | `#0a6770` (deep teal) | `#66d3da` |
  | `--accent-bg` / `--on-accent` | `#0a5c64` / white | `#f5c84a` / `#10201f` (yellow with dark text) |
  | `--e8-yellow` / `--e8-on-yellow` | `#f5b800` / `#1d2426` | `#f5c84a` / `#10201f` |

  - Yellow is an accent (a bar under the title, the bottom edge of the E8 mark, result badges) and always gets dark text.
  - `tools/contrast.js` checked all pairs also in the E8 light and E8 dark scopes (678 pairs in total).
- **“In the exam …” boxes.**
  - Each exam has its own box in its colour (a 7% exam-colour background, a left stripe), in registry order.
  - Several boxes stand one under another with a 12 px gap.
- **Writing trainer.**
  - The counter has zones in a frame: red < 40 (“Below 40 words only the content is marked”), yellow 40–49 and > 120 (“You are over the limit”), green 50–120. The colour always comes with text.
  - At the end: points of the task, self-assessment by the 4/2/2/2 criteria and the model next to the text.
- **Exercise engine.**
  - A reading text is a sticky panel next to the items on a wide screen, and a folding block on a narrow one.
  - Listening has a `--surface-2` panel with “Play”, the counter “Plays: n/2” and a note about the synthesized voice.
- **“Coming soon”.** A card with an SVG illustration (a compass on scaffolding, in tokens), a `--warning-soft` badge, a description from the registry and the buttons “Back to Today” and a link to a ready exam. No empty tables and no dead links.

### 3.13a “My exams” and covers (pack v7, stage 2)

- **My exams** (`LM.examLogic.myExams`, a pure function with tests): an exam is mine when it has a date set or a finished set and was not unpinned by hand; a manual pin works without a date and sets too. Override in `plm.exams … profiles[id].my = { "<id>": "pinned" | "hidden" }`. Order: the nearest date, then past dates, last the exams without a date.
- **Where it shows:** the home page (the “Your exams” section, mini tiles or one hint line), Today (max. 2 mini tiles), the caption in the sidebar (a countdown only for mine), the “Pin to Today” / “Unpin…” button on the exam's start page.
- **Date card** `LM.examDate.card`: a big number of days (Fraunces) or a state text, a date field, the date written out (“Thursday, May 6, 2027”), `.btn-link` actions “Use the main date” and “Remove date”; without a fixed date: “The date depends on the exam centre.”. One column below 640 px.
- **Covers** (`LM.examCover`): full (start page: a 10 px bar in `accent2`, a Fraunces code of 56–88 px, the name, `subtitle` from the registry), compact (sub-pages: a 6 px bar, a 28 px code) and mini (tile: an 8 px bar, a 32 px code, the countdown, “sets 4/12”). Mini outside the exam section takes its colours from `--exam-accent` (light) and `--exam-accent-2` (dark); `tools/contrast.js` checks these pairs.
- The registry (`data/exams-registry.js`) has `setIds` for each exam (progress without loading the exam data).

### 3.14 Components of pack v6 (extension v6, stages 1–11)

All on existing tokens (no new colours), with pairs checked by `node tools/contrast.js`, targets ≥ 44 px and respecting `prefers-reduced-motion`.

- **The “Real life vs exam” callout (`.callout-real-exam`).**
  - Background `--info-bg`, outline `--info-border`, a 4 px left stripe in `--accent` (`inset box-shadow`), an icon on `--surface` with a ring.
  - Inside a “Real life” / “Exam style” table without a minimum width; up to 640 px each row becomes a card (the `data-label` label above the content), no horizontal scroll.
  - Rows always start with exam chips, so colour is never the only carrier of information.
- **Exam chips.**
  - In text: `.exam-chip` (a pill, a 4 px left stripe in `--exam`, the exam code as text; the hit area enlarged with `::before` to ≥ 44 px).
  - In the sidebar: `.sb-item.exam-chip` with the badge `.exam-chip-badge` (the exam colour + a bottom stripe in the second colour).
- **Margin comments (`.wz-*`, the model answer view in Writing).**
  - The anchor `.wz-anchor`: a 16% background of the comment type colour (`--wz`) and a bottom line, so the type is also recognized by the icon and the caption, not only by colour.
  - From 1024 px comments stand in the right margin at the height of their anchors, and a thin SVG line (`.wz-line`) links them to the text; narrower, the anchor has a number and opens the comment under the paragraph.
  - Type filters (`.wz-filter`, ≥ 44 px, `aria-pressed`; off = struck through and dimmed). Print: comments as footnotes.
- **Level badge (`.lvl-stamp`).** A small badge on the level circle (`.sb-ring-wrap`) in the sidebar, on the Trail and in the level header after the final test is passed; always with the text “passed” (`.lvl-passed-label`, `.trail-passed`), not colour alone. The badge stays after a later fail.
- **Selection menu (`.fc-sel-menu`).** A floating bar next to selected text in the `[data-fc-selectable]` areas (“Add to My words”, “Add meaning”): `position: fixed`, `z-index: 60`, buttons `min-height: 44px`, `mousedown` does not lose the selection, Escape closes it.
- **Phrase bank and the “Phrases” panel (`.zw-*`).** Filters in `.journal-filters`, a group list sticky on the left from 900 px or a horizontal row of chips, a favorites star with text and `aria-pressed`; the panel in the writing trainer at the side from 900 px, a bottom sheet on a phone (animated only with `prefers-reduced-motion: no-preference`).
- **Speaking trainer and recording (`.sp-*`, `.rec-*`).** Part tabs (`role="tablist"`, arrows, Home/End), a red dot and the text “Recording 0:23” (the dot pulses only without `prefers-reduced-motion`), a list of attempts with a player, Download and Delete, numbered picture options, the progress bar of the “Whole exam” mode.

### 3.2a Today after sketch A (pack v8, the “Today” stage)

- **Order in the `--w-wide` container** (`.today-stack`): the map card, the “Flashcards and mistakes” card, the `.today-row` row with two columns: Streak | my exam with the nearest date (the v7 mini cover) or, without exams of mine, “Shortcuts” (Placement test, Stats). One column below 800 px.
- **Map card** (`mapCard`, `js/today.js`; replaces the hero and a separate Trail): on the left the date and “land **B1 · Hills**” (colour `--lvl-ink`) above the h1 with the greeting; on the right (300 px) “Map covered” with a percentage (Fraunces) and a 6-part bar (each part in its land colour, filled in proportion, track `--line`), `role="img"` with the description “Map covered: 41%. A1 100%, …”. The percentage is `LM.learn.mapProgress(stats)`: the average of the 6 levels' “I know this” percentages (a pure function with tests). Under it the v7 topographic Trail at the card's full width (horizontal ≥ 480 px, vertical below). A footer with a `--line` line: “Next stop (B1 · Hills): **…** · N stops left in this land” and a `.btn-secondary` “Continue the trail ›” (the first topic of the current level without “I know this”). A finished level: “Take the X final test” (not passed) or “Start the Y land”. A level with ≥ 70% “I know this” without a passed test gets, under the sentence, the link “Ready for the X final test? Take the test” (`LM.final.readyLevel`); the separate `todayTip` tile is gone from Today.
- **The “Flashcards and mistakes” card** (`LM.review.todayCard`, the `.is-today` variant of the 3.15 card): a 220 px / 1fr / 240 px grid, the number from `LM.reviewQueue.count()`, three rows, “Start review”, the links Decks · My mistakes · + Add mistake. At zero a low card with one line “All done for today. Next: tomorrow (6).” and a “Decks” link (`LM.reviewQueue.upcoming`: the nearest due date and the number of items for tomorrow). One column below 600 px, the button at full width.
- **Streak:** “Streak · 6 days”, the caption “every learning day is a step on the trail”, 7 dots for the last days on the right (18 px, today with an outline; screen reader descriptions).
- Removed from Today: the hero with the ring and the tip, the separate review tile, the separate Trail tile, the placement test tip, the flame in the streak, the “Continue” and “Add mistake” rows (they live on in “Continue the trail” and in the review card).
- Motion: the cards' entry (GSAP, `LM.motion`) is skipped with `prefers-reduced-motion` (checked: the cards are `opacity: 1` at once). Contrast: pairs for the land name and the bar parts; a part's fill has ≥ 3:1 to the card (the `--line` track is a background, the number carries the progress too).

### 3.16 Content pages and items (pack v8, the “content” stage, S1–S5)

- **S1 Breadcrumbs** (`LM.ui.breadcrumbs([{ label, href?, onclick? }, …])`, `js/ui.js`): one component above the h1 instead of the top “Back to …” links: “Level A1 › Cases › Accusative” (level and category go back to the list with its scroll position), “Flashcards and mistakes › Decks › …”, “Writing › …”, “Practice › …”. `<nav aria-label="Breadcrumbs"><ol>`, the last item `aria-current="page"`, the “›” separator from CSS. Below 640 px only “‹ parent” shows (the second-to-last item; with one item, that item). Targets ≥ 44 px. The bottom “Back to the list” button is gone too.
- **S2 Previous / next topic** (`topicNav`, `js/handbook.js`; `LM.learn.topicNeighbors` with a test): at the end of a topic page “‹ Previous: …” and “Next topic: … ›”, in the syllabus order (only topics with a page); after the level's last topic “Start A2 ›” (a link to the next level's list). Shortcuts `[` and `]` (not in text fields). Below 640 px the links stand one under another.
- **S3 Table of contents** (`js/toc.js`): topic pages with ≥ 4 `##` sections get a table of contents. From 1200 px it sticks on the right (a 240 px column between `--w-text` and `--w-wide`, `position: sticky`) with scrollspy (`IntersectionObserver`, a reading line at 25% of the height; `aria-current="location"`). A narrower screen: a `<details>` “On this page” above the content. The router owns the hash, so jumps use `scrollIntoView` (with focus on the heading, no animation with `prefers-reduced-motion`). In print the list is hidden (`css/print.css`).
- **S4 Set state in the level list** (`LM.exercises.setLabels`, `LM.exLogic.bestSetLabel` with a test): the label “set 8/10” (the best result of the topic's sets; the set with the highest percentage) before the arrow in a row with a page, a dot in the land colour at ≥ 80%. Added after the exercise index loads, so the list draws at once.
- **S5 Shortcuts** (`js/shortcuts.js`): in items 1–4 and A–D choose an answer (with options that are letters A–H only: the option with that text), Enter checks, **S** reads the sentence (`LM.exLogic.speechText`: before checking a gap is a pause “…”, after checking the model answer; a target-language voice from `LM.lang`; without a voice a message), **?** opens the shortcuts panel for the current view (sets, review session, exams, topic page). In the review session S reads the card's sentence (a cloze with the gap as a pause), and the old “suspend” moved from S to **W**. In exam exercises Enter in an answer field selects “Check”, and S reads the last chosen row. Shortcuts do not work in text fields (except Enter).

### 3.15 Flashcards and mistakes (pack v8, the “reviews” stage)

- **The `#/review` view:** a `pageHead` header (eyebrow “Learning”, title “Flashcards and mistakes”, the chip “N to review” from `LM.reviewQueue.count()`), under it `role="tablist"` tabs (`.pw-tabs`, `role="tab"` links with `aria-selected`, tabindex 0 only on the active one; arrows, Home and End move the focus, Enter and Space open): Due today, Decks, My mistakes, My words. The tab state is in the address. Files: `js/review.js` (header, tabs, card), `js/cards.js`, `js/mistakes.js`, `js/words.js` (tab content), `js/review-queue.js` (counts and queue).
- **The “Due today” card** (`LM.review.card`, the same as the `bento-reviews` tile on Today): the number (Fraunces), “to review · about N min”, three rows (flashcards from decks, mistakes from the log, weak spots from practice). The row marker has a different shape (square, circle, diamond), so it does not rely on colour; a non-empty row is a link to the session `?only=…`. Then “Start review”, “Short session (10)” (from 11 items) and the links “Decks”, “My mistakes”, “+ Add mistake”. When done: `LM.ui.emptyState({ art: "brak-powtorek" })` with the nearest due date. Layout: three columns from 900 px, two down to 599 px, one below; targets ≥ 44 px.
- **The session `#/review/session`:** one progress bar for the whole session, items in the existing views: a flashcard (ratings 1–4, shortcuts as before), a mistake (a card from the “My mistakes” deck), an item (the exercise engine's view: `startSingle` with the hooks `progress`, `nextLabel`, `renderDone`; the result comes back to the session, correct = Good, wrong = Again). Filters `?only=mistakes|weak|decks|deck:<id>`, `&max=10`. Summary: number of items, % Good or Easy, time, how many tomorrow, the breakdown by kind, the hardest ones; ≥ 5 items = a learning day (`LM.markActivity`).
- **My mistakes:** the entry state label comes from its card (“Due today”, “Learning”, “Review in N days”, “Mastered” at an interval ≥ 21 days, “Suspended”), the filters “Due today” / “All” / “Mastered” are computed from the card state; the “Add to flashcards” button is gone (every entry has a card).
- Contrast: new pairs in `tools/contrast.js` (tabs, counter, card links, row markers).

### 3.17 Language layer: listen buttons, character bar, voice help, answer hints (stage 3)

- **Listen button** (`.listen-btn`): a 44 px round icon button (`volume-2`, accent colour, `--accent-soft` on hover) at the end of the Polish cell of an examples table and in the top-right corner of a blockquote. Hidden by CSS unless `<html data-voice="ready">` (`js/speech.js`), so a device without a Polish voice never shows a dead button. Accessible name "Listen to example 3" / "Listen to the text"; the tooltip names the S shortcut.
- **Character bar** (`.charbar`, `.charbar-key`): one row of 44 × 44 px keys (`--surface`, `--line-control` border, `--radius-sm`), wraps on narrow screens; `lang="pl"` on each key; aria-label "Insert ą" (contains the visible letter, WCAG 2.5.3). One bar per item under its fields; none after checking.
- **Voice help** (`.voice-help`): a note box in `--warning-soft` with a `--warning-border` border: "No Polish voice found on this device." and a `<details>` "How to add one" (Windows, macOS, Android and iOS, Chrome). Used in Learning settings, listening items and dictation.
- **Answer hints** (`.ex-near.is-accents | is-ending | is-typo`): the existing `.ex-spelling` style (warning colour, 600) with the closest answer in bold and `lang="pl"`; `.is-lenient` (accepted without accents) uses `--success`. Flashcards: `.fc-result.is-accents` and `.is-ending` in the warning colour like `.is-typo`. Colour is never alone: the text names the kind of mistake.
- **Gloss** (`.md-gloss`): an English gloss in parentheses at the end of a blockquote line, in `--ink-muted`, outside the `lang` span.

## 4. Motion

- **Simple things in CSS only.** Hover, focus, appearing and colour transitions are done in CSS. We animate `opacity` and `transform`. The exception is a short colour transition when the theme changes (the class `html.theme-anim`).
- **Times.** `--dur-fast` for micro-interactions, `--dur-base` for entries and menus, `--dur-slow` for bars and rings. Nothing longer than 400 ms except celebrations (stage 3).
- **GSAP.** The file `assets/vendor/gsap.min.js` (npm `gsap`, free with all plugins) copied by `npm run assets`.
  - It is loaded **only on demand**: `LM.loadGsap().then(gsap => …)` injects a `<script>`. This also works under `file://`, where a dynamic `import()` of modules is blocked.
  - Every animation goes through `gsap.matchMedia()` with a `(prefers-reduced-motion: reduce)` branch without motion.
  - On leaving a view: `mm.revert()` / `ctx.revert()`. The app does not use React, so instead of `useGSAP` we clean up on a route change.
  - All GSAP animations go through `js/motion.js`: `LM.motion.run(plugins, setup)` loads GSAP and plugins, calls `setup(gsap, reduce)` inside `gsap.matchMedia()` and cleans up (`mm.revert()`) on the next animation and on a page change (`app.onRoute`). When GSAP does not load or motion is reduced, the view shows its final state at once.
  - Plugins in use: DrawSVG and MotionPath (only the trail on “Today”). The files `assets/vendor/*.min.js` are copied by `npm run assets`.
  - Where it loads: “Today”, the test result screen, celebrations and the lab timeline. Other screens do not load GSAP (item animations are in CSS). Stage 4 added no GSAP animations (callouts, the exam paper and focus mode are CSS).
  - The trail measures the length to a station with one `getTotalLength()` on the path cut to the successive segments. We do not sample `getPointAtLength()`, because with a 4× CPU slowdown that cost about 650 ms per render.
- **No smooth scrolling.** No Lenis or similar libraries. Scrolling is native (nested panels, text fields, iPad).
- **No heavy background effects.** WebGL and canvas particles are forbidden.
- **`prefers-reduced-motion: reduce`.** A global rule shortens animations and transitions to 0.01 ms. Only instant changes stay (colour, opacity without motion).

## 5. Accessibility

- **WCAG AA contrast.** Text ≥ 4.5:1, components, field borders, bars and markers ≥ 3:1, in both themes. Checked by `node tools/contrast.js` (stage 4: 98 pairs in 4 scopes, 392 checks; now 298 checks in the light and dark scopes). The level palettes are checked by the CVD validator (section 2.3).
- **Visible focus.** `:focus-visible`, a 2 px outline in the accent colour, on every interactive element.
- **Touch targets.** Min. 44 × 44 px with `pointer: coarse` and in menus, toggles and icon buttons.
- **Colour is never the only carrier of information.** Levels have codes, states an icon or a word, an exercise result ✓/✗ plus text.
- **Icons.** Decorative icons have `aria-hidden="true"`. A button with only an icon has `aria-label` and a tooltip.
- **Motion.** As in section 4 (`prefers-reduced-motion`).
- **Accessible name = visible text** (WCAG 2.5.3). We do not override a visible label with `aria-label`. Extra context for screen readers goes in `<span class="visually-hidden">` (the profile button, the C1 mark, the day counter).
- **Links in text** are underlined, not only coloured (WCAG 1.4.1).
- **Keyboard.** Everything works from the keyboard. Menus and dialogs have Esc, arrows and focus return (unchanged from earlier stages).

## 6. Microcopy

Since stage 2 the interface is English; the full rules and the glossary are in spec 04 (binding).

- **Language.** American English, plain and short (B1-readable), second person, warm and factual: “Save it now. It comes back tomorrow as a review.”
- **Buttons.** Verb plus object, sentence case: “Add mistake”, “Start review (3)”, “See result”. Never “OK” alone and never “Click here”.
- **No pressure, no judging.** Mistakes are “things to review”, not “failures”. The streak encourages (“Streak continues”) and never threatens.
- **Empty states.** They say what will appear here and offer one action (“Add your first mistake”).
- **Errors.** They say what to fix: “Type the correct answer.”, “A name can have up to 30 characters.”
- **Test results.** Always with “approximate” and a note that this is not an official test.
- **Typography.**
  - curly quotes “…”;
  - an en dash – in ranges (A1–C2) and in sentences;
  - the ellipsis … as one character;
  - a space between a number and its unit (“3 days”).
- **Plurals and formats.** `LM.plural(n, "day", "days")`, dates and numbers through `LM.fmt` (US English).

## 7. Libraries and assets

| Library | Version | Licence | How it gets into the page |
|---|---|---|---|
| `@fontsource-variable/fraunces` | 5.3 | SIL OFL 1.1 | `npm run assets` → `assets/fonts/fraunces-latin*.woff2` (axes wght + opsz) |
| `@fontsource-variable/inter` | 5.3 | SIL OFL 1.1 | `npm run assets` → `assets/fonts/inter-latin*.woff2` (axis wght) |
| `lucide-static` | 1.59 | ISC | `npm run assets` → `assets/icons.js` (only the icons in use, the list in `tools/assets.js`) |
| `gsap` | 3.15 | GreenSock “no charge” (the standard licence, free with plugins since 3.13) | `npm run assets` → `assets/vendor/gsap.min.js`, `DrawSVGPlugin.min.js`, `MotionPathPlugin.min.js` (loaded on demand) |

- **Why we copy into `assets/`.** The site works without a build step, from disk (`file://`) and on GitHub Pages. `node_modules/` is in `.gitignore`, and the copied files are in the repository. After `npm install` or a package update run `npm run assets`.
- **No external CDN** and no Google Fonts.

## 8. Quality check (every stage)

1. `npm run build`: assets and data without errors.
2. `npm test`: logic tests.
3. `node tools/contrast.js`: 0 failing pairs.
4. Audit of hard-coded values: in `css/style.css` outside the token blocks there are no colour literals (`#…`, `rgb(…)`), font sizes or radii in px, or times outside tokens (exception: 0.01 ms in the `prefers-reduced-motion` rule).

   Documented exceptions with fixed colours:
   - `meta theme-color` in `<head>` and `THEME_COLOR` in `js/theme.js` — the script runs before CSS loads;
   - the standalone `assets/favicon.svg`.
5. Screenshots: light and dark theme at 390, 768 and 1280 px. No horizontal scroll from 360 px.
6. Performance (from stage 4):
   - Lighthouse mobile and desktop on a server with gzip (as GitHub Pages), with a test profile in `localStorage`. Without a profile Lighthouse measures the welcome screen.
   - Animation smoothness with `Emulation.setCPUThrottlingRate` 4× at 390 and 1280 px.

## 9. Review results

(Results of the original app's stages, kept for reference.)

**Stage 1, accessibility review** (an automatic Playwright + Edge audit, 8 routes, both themes, 1280 and 390 px):
- contrast of all rendered text: 0 failures;
- interactive elements without an accessible name: 0;
- focus visible on 25 successive elements from the keyboard;
- 200% zoom: no horizontal scroll;
- touch targets ≥ 44 px after fixes (select lists in the Part 1–3 gaps and the “Add to the mistake log” button on touch screens).

Limitation: an automatic audit does not replace a test with a screen reader (NVDA / VoiceOver).

**Stage 1, design critique** (screenshots 360–1280 px):
- Unified faces on the “Today” page: level codes and big numbers in Fraunces.
- For later stages: the sidebar has too little hierarchy between tools and lands (stage 2). Content cards are still mostly light, so land backgrounds in headers and celebrations stay for stage 3. Tables and content blocks of topic pages to polish in stage 4.

**Size** (HTML + CSS + JS without data files):
- code: before 310.8 KB (gzip 95.6 KB), after 358.9 KB (gzip 109.4 KB), i.e. +48.1 KB (gzip +13.7 KB);
- new woff2 fonts: 253.9 KB in 4 files, downloaded by `unicode-range` and cached;
- GSAP (71 KB) is not loaded in stage 1.

**Stage 2 (sidebar):**
- Playwright audit, both themes: a logical Tab order in the sidebar, the focus outline not cut off (after making the logo text in the sidebar smaller), targets ≥ 44 px, contrast in the expanded sidebar without issues, transitions 0 s with `reduced-motion`.
- The C1 chip got a short accessible name.
- Behaviour tests: delays 120 / 250 ms, the content does not move when expanded (the content's left edge stays at 72 px), pinning moves the content to 288 px and survives a reload, tablet (tap / tap outside), the drawer on a phone.
- Critique: at 0% the land rings are pale (only the track), so the “undiscovered lands” are worth showing in stage 3. The C1 chip to polish in stage 4.

**Stage 3 (Today, celebrations, levels, test, mistake log):**
- Playwright audit, both themes, 11 routes, 1280 and 390 px:
  - contrast of rendered text and accessible names: 0 problems;
  - focus visible, 200% without horizontal scroll;
  - after a fix the category chips are 44 px.
- Token contrast: 188 pairs (category stripes, test labels and the exam tile were added). The dark `--success-fill` lightened to `#2fa35d`, so navy text has ≥ 4.5:1.
- Behaviour tests:
  - celebrations: the first “I know this”, 10 “I know this” and A1 25% in the queue, Esc, no repeats, only the card with `reduced-motion`;
  - trail: the pin above the current station, with and without animation.
- Critique:
  - the trail is horizontal on a tablet (480 px threshold), because the vertical one left half the tile empty;
  - the suggestion link in the hero on its own line.
- Size:
  - code always loaded: 376.0 → 421.3 KB (gzip 115.4 → 130.9 KB, i.e. +15.4 KB);
  - GSAP with plugins on demand: 97 KB (gzip 39.4 KB), of which the core 71.2 KB, DrawSVG 4.2 KB and MotionPath 21.5 KB.

**Stage 4 (topic page content, C1 Certificate, quality check):**
- **Critique** (36 screenshots: “Today”, a level, a topic page with callouts and a table, a C1 exercise, a trainer, the C1 overview; both themes; 390 / 768 / 1280 px):
  - no horizontal scroll and no console errors;
  - fixes: the C1 header without a repeated number of days on the overview page, a lighter ivory (`--bg #f9f4e8`), because level A2 / C1 had 2.9:1 on it.
- **Accessibility:**
  - Playwright audit: 13 routes, both themes, 1280 and 390 px, 0 problems with contrast, names, focus, targets < 44 px and 200% zoom;
  - Lighthouse found 3 accessible names that did not match the visible text and a link in the C1 breadcrumbs marked only by colour; fixed, accessibility is now 100 on all measured screens.
- **Token contrast:** 392 checks, 0 failing.
- **Design-system audit:**
  - 184 colour literals, all in token definitions, 0 outside them;
  - in JS only the documented `THEME_COLOR`;
  - the unused `--success-border` removed, and `--lh-body` and `--measure` wired into content;
  - unused but kept on purpose: the scale steps `--space-1/3/7/8` and `--radius-xl`.
- **Lighthouse** (a server with gzip, a test profile, simulated slow 4G and CPU 4×):

  | Screen | Performance | Accessibility | FCP | LCP | TBT | CLS |
  |---|---|---|---|---|---|---|
  | “Today”, mobile | 81 | 100 | 0.9 s | 5.2 s | 80 ms | 0.003 |
  | A2 topic page with callouts, mobile | 82 | 100 | 0.9 s | 4.8 s | 120 ms | 0.003 |
  | C1 exercise, mobile | 85 | 100 | 0.9 s | 4.4 s | 50 ms | 0.003 |
  | “Today”, desktop | 98 | 100 | 0.2 s | 1.1 s | 0 ms | 0.001 |

  - `defer` on scripts cut mobile FCP from 3.2 s to 0.9 s.
  - Mobile LCP is limited by downloading about 520 KB (gzip) before the first view render, including 131 KB of Handbook content and 41 KB of C1 data.
  - The next step, outside the stage's scope, was loading the C1 data and the placement test on demand.
- **Smoothness** (CPU 4×, 390 and 1280 px, 8 routes):
  - animations have a p95 frame of 17 ms, i.e. 60 fps;
  - entering a route has one longer render frame;
  - the “Today” render took 540 ms because of trail sampling; after the simplification it takes 240 ms, and the longest frame dropped from about 500 to 50–67 ms.
- **Size** (everything `index.html` loads, gzip):

  | Version | JS | CSS | Fonts | Total |
  |---|---|---|---|---|
  | before the design work (`b3b65c4`) | 261 KB | 12 KB | — | 275 KB |
  | after stage 4 | 285 KB | 29 KB | 196 KB | 523 KB |

  - The difference is +248 KB, of which 196 KB are fonts (downloaded once, cached).
  - Stage 4 added +6 KB gzip (callouts, C1, CSS).
  - GSAP with plugins (97 KB, gzip 39 KB) loads only on demand.

## 10. Changelog

- **Stage 1 (foundation).**
  - A new palette and tokens (“map paper” and “map at night”), the land palette checked for colour blindness.
  - Fraunces and Inter fonts (self-hosted).
  - Lucide icons instead of text characters.
  - Logo (a compass with a trail) and favicons.
  - Base components: card, buttons, “I know this”, chip, tooltip, progress bar and ring, focus, selection, scrollbar, contour background.
  - `tools/contrast.js` (152 pairs), `tools/assets.js`.
  - All font sizes, radii and animation times on tokens.
- **Stage 2 (sidebar).**
  - A 72 px narrow rail with land rings, expanding over the content, a pin (`plm.sidebar`), a drawer below 768 px.
  - Shared progress numbers (the whole level in the sidebar and on “Today”, “in this category” on the level page).
  - A unified top bar.
- **Stage 3.**
  - “Today” as a bento dashboard with the A1 → C2 trail and GSAP animations (`js/motion.js`).
  - Milestone celebrations (`js/celebrate.js`, `plm.celebrated`).
  - Level page headers and cards with the land accent.
  - A test with dots and clear states, a mistake log with category stripes.
  - The screen layout unchanged.
- **Stage 4.**
  - Callouts by heading text (`js/callouts.js`), content typography, tables with zebra rows and scroll shadows, `[[id]]` chips, a sticky “I know this” on phones.
  - C1 Certificate: section tokens (ivory / midnight navy with gold), a header with the number of days, the exam paper, focus mode for trainers.
  - Quality check: `defer` for scripts, a faster trail, accessible name fixes.
  - No new `localStorage` keys and no changes in `.md` files and data.

- **Pack v6 (stages 1–11).**
  - New components described in 3.14: the “Real life vs exam” callout, exam chips (C1 in the sidebar too), margin comments, the level badge, the selection menu, the phrase bank, the speaking trainer with recording.
  - Final check: the full v6 validator in `npm run validate` and `build`, a review at 360 / 768 / 1280 px in both themes.

- **Pack v7, the “layout” stage (A1–A8).**
  - Tokens `--w-text` / `--w-wide`, one left edge; buttons of one shape, `.btn-link`, `.crumb`.
  - `LM.ui.pageHead` (an `.eyebrow` label instead of an icon in a circle); contour lines removed from headers and the hero.
  - Rows instead of cards (the level list, “Shortcuts”), the “All” filter, `minmax(260px, 1fr)` grids.
  - “In the exam …” boxes before “Real life vs exam” (`examBoxAnchorIndex` + a test). No `localStorage` key changes.

- **Pack v7, the “exams” stage (B1–B3).**
  - “My exams”: `myExams` + the `my` field in `plm.exams`; a section on the home page, tiles on Today, pinning, the sidebar indicator only for mine.
  - One date card (`LM.examDate.card`) for C1 and the registry exams, the date written out, “Use the main date”, “Remove date”.
  - Exam covers (full, compact, mini), the `subtitle` field in the manifest, new pairs in `tools/contrast.js`.

- **Pack v7, the “map” stage (C1–C6).**
  - Lands A1–C2 (`assets/lands.js`, `LM.ui.landIcon`, `LANDS`), symbols in the sidebar and the level header.
  - The trail as a topographic map (the shape generator moved to `js/today.js`: `blobPath`, `terrainGroup`), a compact variant on the home page.
  - “I know this” as a stamp (`LM.ui.stamp`), the key-word marker in the exercise engine (`.ex-hl`), land progress instead of confetti, `LM.ui.emptyState` with 5 illustrations (`assets/empty-states.js`).

- **Pack v8, the “rail” stage (sketch A).**
  - A new rail order and one item “Review” (“Flashcards and mistakes”), the ✓ stamp and the outline of the current land, only my exams with “+N” and a popover, the “My pages” section in the profile menu, the same content in the drawer on a phone.
  - `LM.examLogic.navSplit` (a test in `tools/tests.js`), new pairs in `tools/contrast.js` (+N, popover, exam tiles), `?v=126`.

- **Pack v8, the “reviews” stage (spec 20 R1–R3).**
  - One schedule (`schedule()`), the mistake log migrated to “My mistakes” cards (`settings.migratedJournal`, fixed ids `u-mb-…`), new entries get a card at once, weak spots as `ex:<id>` in the `cards` map (+ an optional `daily[…].exNew`).
  - `js/review-queue.js`: `queue` / `count` / `breakdown` / `estimateMinutes` / `weakTasks` / `redirectFor` with tests (order, interleaving, limits, the 04:00 day boundary, empty, `count` matching the queue length).
  - The `#/review` view (Due today / Decks / My mistakes / My words), the session `#/review/session` with filters, the Today tile, redirects of the old routes, `?v=127`.

- **Pack v8, the “Today” stage (spec 20 D).**
  - `LM.learn.mapProgress` (+ tests), `LM.reviewQueue.upcoming` (+ a test), `LM.final.readyLevel`; the map card with the Trail inside, the “Flashcards and mistakes” card (state and zero), the Streak | exam row or “Shortcuts”.
  - The old Today tiles removed, pairs in `tools/contrast.js`, `?v=128`.

- **Pack v8, the “content” stage (spec 20 S1–S5), one commit per point.**
  - `LM.ui.breadcrumbs`, `topicNav` + `LM.learn.topicNeighbors`, `js/toc.js`, `LM.exLogic.bestSetLabel` + `LM.exercises.setLabels`, `js/shortcuts.js` + `LM.exLogic.speechText` (tests in `tools/tests.js`).
  - The “suspend” shortcut in the review session: S → W; `?v=129`.

- **Pack v8, final check (an independent review).**
  - `interleave` in `js/review-queue.js`: when both rules cannot be met, it falls back to “topic only”, then “kind only”; the whole queue is interleaved (new ones come earlier only when needed), and a topic that takes half of the rest goes at once (no block of one topic at the end). A random test: when a split is possible, never the same topic in a row.
  - The “+N” popover closes when focus leaves it (Tab out of the list), Esc and a click outside as before.
  - Targets ≥ 44 px: the “I know this” label, filter buttons, list topic links, “‹ Flashcards and mistakes”, review card links; the Flashcards and mistakes tabs fit at 360 px without scrolling.
  - Checked through export → reset → import (the real data menu code): mistake log, cards (including an own deck), my exams, progress, results, an old file without flashcards.

- **Fix “hint in My mistakes cards”.**
  - `journalCard` (js/cards-logic.js) builds the card from the entry's whole context (a cloze with the gap in its own line, accepted answers “A – make”, “make”, “A”; for a transformation from the engine only the gap), `.fc-text` with `white-space: pre-line`.
  - A “mistake” item with a ref to an item shows the original item (`js/mistake-task.js`: `parseRef`, `viewFor`, `singleExercise`; `LM.exercises.startSingle` with `noJournal`).
  - Repair of existing cards: `repairJournalCards` + `settings.journalCardsV2`. The context of engine entries completed with the words to put in order, gap hints and the pair list; `?v=132`.
- **Flashcards: schedule (a fix).**
  - `fuzzed()` without a minimum of ±1 d (below 20 d saved = preview; before, Easy on a new card gave 3 d instead of 4 d).
  - `mergeStates` + `mergeStored` in `cards-store.js`: a save merges with localStorage, the `storage` event syncs browser tabs; `force` for undo and import. Keys unchanged.
  - The message “Next review: in N days” after a rating, “Due today / Later” in the deck legend; `?v=134`.
- **v9 (look polish, no content changes).** Rules in the “v9 LOOK POLISH” section at the end of `css/style.css`, other changes in place.
  - Exam tiles in the rail: the card background, the code in ink colour, the exam colour only as a 6 px dot; the list in the rail fades at the bottom instead of cutting a tile.
  - Logo: the compass mark in plain `--ink` (the brand gradient stays only in the progress ring).
  - Labels without capitals and letter spacing (sentence case, colour `--ink-muted`); `.eyebrow` no longer uses the accent.
  - Weights: 700–900 and 650 replaced by 600; buttons and filters 500.
  - No coloured stripes on cards (exercise sets, the lab); examples in lab tiles in text colour. The A1–C2 badge marks the level.
  - Exam chips with a dot instead of a thick left edge.
  - The exam banner without a side stripe and without a repeated “Set date”; “Pin to Today” in a row with “Notes”.
  - Dark theme: hover without the blue glow, weaker `--lvl-*-glow`.
  - Filters (`.chip-btn`) 36 px instead of 44 px.
  - Lesson: “Notes” and “I know this” 40 px and `--radius-sm`; the marker in the table of contents sits on the list's line.
  - Writing: “Phrase bank” as one paragraph; more even spacing around “Your exams” and the “Streak” card.
- **Stage 2 of Polish Levels Map (English UI).** The interface, comments and this file in English (spec 04); `LM.plural` and `LM.fmt`; `npm run check:lang` and `tools/extract-strings.js`; callouts keyed on the English headings of spec 07; classes renamed (`.know-toggle`, `.ex-known`, `.cards-view`, `.st-cards`); the trail step label in CSS says “Step”.
- **Stage 3 of Polish Levels Map (language layer).** Listen buttons, the character bar, the voice help box and answer hints (section 3.17); `lang` markup for Polish italics, the Polish table column and blockquotes.
- **Stage 4 of Polish Levels Map (exercises).** The “Fill the table” item (section 3.9); every item type checked with Polish data (quotes, dashes, names in Put in order); case labels with their question words.
