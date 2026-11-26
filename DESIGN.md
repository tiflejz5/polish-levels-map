# DESIGN.md — Polish Levels Map

The single source of truth for the look and behaviour of the interface. Every stage that changes the UI updates this file in the same branch. Values live as tokens in `css/style.css`; this file says what they are for and which rules hold.

---

## 1. Direction: a “travel map” with editorial typography

- **Metaphor.** Learning Polish is a journey across a map from A1 to C2. Levels are “lands” (Meadow, Forest, Hills, Lake, Mountains, Summit), each in its own colour, and progress is a trail. The brand gradient runs through the land colours in the order A1 → C2.
- **Mood.** Calm, warm and grown-up, with a touch of adventure: the paper of an old atlas (cream, ink) by day and a map at night (deep navy) after dark. For an adult learner, not childish and not corporate.
- **Typography.** Headings, level codes and big numbers use Fraunces (a serif with a variable optical size); text uses Inter.
- **Colour.** Colour carries meaning; it is not decoration. Land colours appear where a level matters; the seven case colours appear only in the Case Lab. The chrome (buttons, links, focus) is ink plus **one accent**, deep crimson, which also writes “Polish” in the wordmark.
- **Gamification.** Only at milestones. Otherwise the app is quiet.
- **What we avoid.** A flag, a rainbow without meaning, heavy effects (WebGL, particles), smooth-scroll libraries and the template “SaaS dashboard”.

## 2. Tokens

All values are CSS variables at the top of `css/style.css`. The theme is chosen by `data-theme="light" | "dark"` on `<html>` (an inline script in `<head>` and `js/theme.js`; the user picks light, dark or auto). Outside the token blocks **no colours are hard-coded**. Check: `npm run contrast` and the audit in section 8.

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

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--accent` | `#750b3a` (deep crimson) | `#ffd0da` (pale rose) | links, the wordmark “Polish”, active tabs, highlights |
| `--accent-bg` | `#750b3a` | `#ffd0da` | fill of the primary button |
| `--accent-hover` | `#570629` | `#ffe6ec` | primary button on hover |
| `--on-accent` | `#fffdf9` | `#0e1526` | text on the accent, success and error fills |
| `--accent-soft` | crimson 8% | rose 12% | chosen option, active profile, counters |
| `--focus-color` / `--focus-ring` | `#750b3a` / 35% | `#ffd0da` / 50% | the focus outline |
| `--selection` | crimson 16% | rose 28% | selected text |

- **One accent** for links, primary buttons, the focus ring and the wordmark (spec 11 §2). Paper, ink, level colours and lands are unchanged.
- **Computed, not picked by eye.** The spec's start values (`#a3203a` / `#f08a9c`) failed: in light, crimson sits at OKLab ΔE 6.5 from the Vocative brick and 6.8 from B2 raspberry; in dark, `#f08a9c` is ΔE 3.6 from `--danger` (a primary button would look like a delete button) and 1.5 from C2 teal under protanopia. Moving the hue alone could not fix the light theme (every crimson hue at L ≈ 0.45 collides with B2, Vocative or Instrumental), so the light accent moved **darker** (OKLCH L 0.37, h 2°) and the dark accent **lighter** (pale rose). `npm run contrast` checks the accent against the six level colours, the seven case colours and `--danger` in both themes: normal vision ΔE ≥ 15, protanopia / deuteranopia ΔE ≥ 8 (worst: light 15.1 / 12.4, dark 15.6 / 13.3), plus text contrast (light 9.6:1, dark 13:1 on the page).
- The pale rose is close to the dark ink (ΔE 8), so links in text are **underlined** (`.md a`, `.wiki-link`, `.tool-eyebrow a`, …): colour is never the only sign of a link.
- **On a level page and its topic pages** (`.view[class*="lvl-"]`) `--accent`, `--accent-soft` and the focus take the land's `--lvl-ink`; the primary button keeps `--accent-bg`.
- The states `--success`, `--warning` and `--danger` (with `-soft`, `-border`, `-fill`, `-bg`) are **reserved**: never a level or accent colour, always with an icon or a word.
- `--info-bg` / `--info-border` stay a neutral blue-grey (information boxes are not branded).

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

### 2.4 Brand gradient, logo and wordmark

- `--brand-gradient`: linear through `--lvl-a1` → `--lvl-c2`. Used **sparingly**: the logo mark, the progress ring, the map bar on Today. Never as a text background or the background of a section.
- **Logo** (`LM.logo()`, in HTML `[data-logo]`; `js/ui.js`): the map mark (a compass in a circle with a dotted trail) with the circle and the north needle in the level gradient (an SVG gradient whose stops are `var(--lvl-…)`, so it follows the theme), the south needle in `--line-control`, then the wordmark.
- **Wordmark** (`LM.APP.wordmark = ["Polish", "Levels Map"]`): Fraunces 600; “Polish” in `--accent` (`.logo-word-accent`), “Levels Map” in `--ink`. On hover the wordmark is underlined and the mark turns −12°. The home page heading that equals the app title is drawn the same way (`.home-wordmark`). No flag anywhere.
- **Favicon:** `assets/favicon.svg` (the mark on an ink tile, the gradient with the dark-theme level values, which read better on the dark tile) and `assets/favicon-180.png` (apple-touch-icon, rendered from the SVG). `meta theme-color` follows the page background: `#faf6ee` / `#0e1526`.
- Names (spec 11 §1): app title “Polish Levels Map”, tagline “Your map of Polish, A1–C2”, `<title>` “Polish Levels Map (A1–C2)”, export file `polish-levels-map-YYYY-MM-DD.json`.

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
- **Widths:** `--w-text` 720 px (the column of reading pages, aligned left) and `--w-wide` 1000 px (the container of every view, `.view`). The left edge of the h1 heading is the same on every screen; `--measure` for paragraphs stays.
- **Buttons:** `.btn` has `--radius-sm`; a pill only for chips, filters and toggles. Levels: `.btn-primary` (one per view), `.btn-secondary` (outline), `.btn-link` (alias `.btn-ghost`). Breadcrumbs and back links are `.crumb` (icon `chevron-left`).
- **Layered shadows** (`--shadow-sm`, `--shadow`, `--shadow-hover`, `--shadow-lg`):
  - light: warm, brownish, very subtle;
  - dark: a deep shadow plus a subtle edge on hover.

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

## 3. Base components

| Component | Class / function | Rules |
|---|---|---|
| Card | `.card` (+ `.is-interactive` for clickable ones) | A `--surface` layer on `--bg`, a `--line` border, a `--shadow-sm` shadow. In a level context (`.lvl-XX`) the border gets a touch of the land colour. A clickable card lifts (`translateY(-2px)` + `--shadow-hover`) without a layout shift. |
| Button | `.btn-primary`, `.btn-secondary`, `.btn-link` (alias `.btn-ghost`), `.btn-danger`, `.btn-danger-solid`, `.btn-small` | `--radius-sm`. Primary: `--accent-bg` fill, `--on-accent` text, one per view. Secondary: `--surface` with a `--line-strong` border. Link: accent text. Pressed: `scale(.98)`. ≥ 44 px on touch screens. Links styled as buttons keep their button colours inside Markdown (`.md a:not(.btn)`). |
| “I know this” | `.know-toggle` (+ `.know-toggle-lg`) | A round stamp: ticked = `--lvl-soft` background, `--lvl-ink` text, the box filled with `--lvl`, the check mark “snaps” (`--ease-spring`) only when the user ticks it. Outside a level: success colours. |
| Chip | `.chip` | A small `--surface-3` / `--ink-muted` pill; in a level context `--lvl-soft` / `--lvl-ink`. |
| Tooltip | `[data-tooltip]` | Pure CSS, on hover **and** focus-visible; the same text is in `aria-label`. |
| Progress bar | `.progress` > `.progress-fill` | `transform: scaleX` (`--dur-slow`); colour `--lvl` or `--brand-gradient` (`.is-brand`); track `--lvl-soft`. |
| Progress ring | `LM.ui.progressRing(percent, opts)` | SVG arc, level colour or brand gradient, the number in the middle (`tabular-nums`), `role="progressbar"`. |
| Icon | `LM.icon(name, opts)`, in HTML `<span data-icon="name">` | Lucide, 1.75 px stroke, `currentColor`, `aria-hidden` by default, built with `createElementNS`. |
| Land symbol | `LM.ui.landIcon(level)` (`assets/lands.js`, keys `land-a1` … `land-c2`) | 24 × 24, stroke `currentColor`, coloured `--lvl`. |
| Empty state | `LM.ui.emptyState({ art, title, text, action })` (`assets/empty-states.js`: `no-reviews`, `no-results`, `empty-log`, `empty-notes`) | A 96 px line drawing, one sentence, one action. |
| Focus | `:focus-visible` | A 2 px `--focus-color` outline with a 2 px offset, on every background. |
| Contour background | `::before` of `.level-header`, `.tool-head`, the home `h1` | `assets/contours.svg` as a `data:` mask (file masks are blocked under `file://`) in `--topo-color` at `--topo-opacity`, faded to the left. `.view` has `overflow-x: clip`. |
| Breadcrumbs | `LM.ui.breadcrumbs([...])` | See 3.14. |
| Toast | `LM.ui.toast` | See 3.11. |

### 3.1 Sidebar

Files: `index.html` (markup), `js/sidebar.js` (behaviour), `js/render.js` (tools and levels), the “SIDEBAR” section of `css/style.css`.

- **Order:** the logo with the wordmark, the tagline “Your map of Polish, A1–C2”, then Trail, Today, Review (one badge = `LM.reviewQueue.count()`), Practice, Case Lab, Writing (hidden while it has no content), a line, “Levels · all categories” with six land circles, a line, My exams (hidden while the registry is empty), the pin. Placement test, Stats and My notes are in the profile menu.
- **Land circles:** 36 px with the land symbol in the land colour and a progress ring; the code and land name (“A1 · Meadow”) next to it when expanded, “X / Y known” with a bar. A passed level (`is-passed`): a ✓ stamp; the current land (`is-current`): an outline in the land colour and “Current land” in `aria-label`. A **soon** level (`.sb-item.is-soon`): dimmed ring, the italic word “soon” instead of the count, no bar, `aria-label` “Level B1, Hills: coming soon”.

| State | When | Look |
|---|---|---|
| Narrow rail | default from 768 px | `--rail-w` 72 px: the mark, the expand button, the tool icons, six land circles, the pin. |
| Expanded | hover, keyboard focus, the expand button (tablet) | `--panel-w` 288 px, a fixed layer **over the content** with `--shadow-lg`; the content does not move. |
| Pinned | the pin | The full sidebar all the time; the content moves aside (`html[data-sidebar="pinned"]`). |
| Drawer | below 768 px | The “Menu” button in the top bar; the sidebar slides in over a dimmed background. |

- Hover only with `(hover: hover) and (pointer: fine)`: opens after 120 ms, closes 250 ms after the pointer leaves. Keyboard focus expands it, Esc collapses it. The pin has `aria-pressed` and is saved in `plm.sidebar` (device-wide, read in `<head>` so nothing jumps).
- Labels in the rail are hidden with `opacity` (still in the accessibility tree). The active item has `aria-current="page"`. Every target ≥ 44 px. With `prefers-reduced-motion` the change is instant.
- Progress in the sidebar and on Today counts the **whole level** (all categories).

### 3.2 Today

- **Order in the `--w-wide` container** (`.today-stack`): the map card, the “Flashcards and mistakes” card, the `.today-row` row with two columns: Streak | my exam with the nearest date (the mini cover) or, without exams of mine, “Shortcuts” (Placement test, Stats). One column below 800 px.
- **Map card** (`mapCard`, `js/today.js`): on the left the date and “land **B1 · Hills**” (colour `--lvl-ink`) above the h1 with the greeting; on the right (300 px) “Map covered” with a percentage (Fraunces) and a 6-part bar (each part in its land colour, filled in proportion, track `--line`), `role="img"` with the description “Map covered: 41%. A1 100%, …”. The percentage is `LM.learn.mapProgress(stats)`: the average of the 6 levels' “I know this” percentages (a pure function with tests). Under it the topographic Trail (land patches with contour lines, stations with land symbols, a compass rose) at the card's full width (horizontal ≥ 480 px, vertical below). A footer with a `--line` line: “Next stop (B1 · Hills): **…** · N stops left in this land” and a `.btn-secondary` “Continue the trail ›” (the first topic of the current level without “I know this”). A finished level: “Take the X final test” (not passed) or “Start the Y land”. A level with ≥ 70% “I know this” without a passed test gets, under the sentence, the link “Ready for the X final test? Take the test” (`LM.final.readyLevel`); the separate `todayTip` tile is gone from Today.
- **The “Flashcards and mistakes” card** (`LM.review.todayCard`, the `.is-today` variant of the 3.13 card): a 220 px / 1fr / 240 px grid, the number from `LM.reviewQueue.count()`, three rows, “Start review”, the links Decks · My mistakes · + Add mistake. At zero a low card with one line “All done for today. Next: tomorrow (6).” and a “Decks” link (`LM.reviewQueue.upcoming`: the nearest due date and the number of items for tomorrow). One column below 600 px, the button at full width.
- **Streak:** “Streak · 6 days”, the caption “every learning day is a step on the trail”, 7 dots for the last days on the right (18 px, today with an outline; screen reader descriptions).
- Motion: the cards' entry (GSAP, `LM.motion`) is skipped with `prefers-reduced-motion` (checked: the cards are `opacity: 1` at once). Contrast: pairs for the land name and the bar parts; a part's fill has ≥ 3:1 to the card (the `--line` track is a background, the number carries the progress too).
- A “soon” level: its station on the Trail is dimmed (`.trail-station.is-soon`), has “soon” in its label and is not a link; Today never suggests a topic of a soon level.

### 3.3 Celebrations

File: `js/celebrate.js`.
- **Milestones:** the first “I know this”, 10 / 25 / 50 / 100 marks; a level at 25 / 50 / 75 / 100%; streaks of 3 / 7 / 14 / 30 days; the first review session; a finished placement test; a passed final test.
- **Each one once per profile** (`plm.celebrated`, covered by export, import, reset and profile deletion). A profile with earlier progress records the reached milestones without showing them.
- **Form:** a toast card at the bottom: the land circle with its symbol and a ring animated from the previous threshold to the new one (CSS, ≤ 600 ms), a stamp for a passed final test, a Fraunces title and one sentence. It goes after 2.8 s, pauses under the pointer, closes on a click or Esc; `role="status"`; at most 2 cards at a time. No confetti. Reduced motion: the final state at once.

### 3.4 Home page

`content/home.md` (spec 11 §4) rendered by `js/handbook.js` (`renderHome`):
- The `# Polish Levels Map` heading drawn as the wordmark; the three-sentence intro; under it (for a new or guest profile) the “Where do you want to start?” card (placement test or Start at A1, `LM.trail.firstRunCard`) and the compact Trail map (`LM.today.compactTrail`).
- “Levels at a glance”: a table whose first column becomes level links (a dot in the land colour) and whose **Status** column is filled from `content/levels.json` (“Available” / “Coming soon”), so the text never goes stale. Rows have a bar and a hover background in the land colour.
- “How it works”, “Your data” (the privacy sentence) and “Found a mistake?”.
- Footer `.home-foot`: version, “No accounts. Your progress stays in this browser.”, the source link.

### 3.5 Level pages

- **Header** (`.level-hero`): “A1 · Meadow” above, a big level code (`--fs-4xl`, `--lvl-ink`), the goal from the syllabus, the whole level's progress ring (updated in place), background `linear-gradient(--lvl-soft → --surface)`, a link to the level's place on the Trail.
- **Topics** grouped by syllabus category (no filter). A row (`.ess-item`): a 44 px “I know this” stamp, the topic title and its Polish example (`.ess-example`, `lang="pl"`), the set label (“set 8/10”), a chevron. A topic without a page has a dashed “Being written” label (`.ess-pending`) and opens the pending page (`.page-pending`) with its title, summary and example.
- **Cards below:** the final test (`.lf-level-card`) and the cheat sheet (`.cheatsheet-card`), only for available levels with that content.

### 3.6 “Soon” levels (E1)

A level set to `soon` in `content/levels.json` is visible but not usable. Everywhere it says so in words, never by colour or dimming alone:

| Place | Look |
|---|---|
| Sidebar | `.sb-item.is-soon`: dimmed ring, “soon” instead of the count, `aria-label` “coming soon”. |
| Level page | `.view.is-soon`: the header with a “Coming soon” chip (`.level-soon-chip`) instead of the ring; the planned topics as plain rows (`.ess-item.is-planned`: title and example, no links, no checkboxes); no final test or cheat sheet card. |
| Trail and Today | the land patch dimmed (`.sz-level.is-soon`, `.trail-station.is-soon`), “Coming soon” / “soon” in the label, no stops to open. |
| Topic links | a `[[id]]` chip of a soon topic is a span (`.wiki-chip.is-soon`) with the word “soon”, not a link. |
| Search | topics of soon levels are left out of the index. |
| Placement result | a result at a soon level says so and starts the trail at the highest available level below it. |
| Home | the Status column of “Levels at a glance” says “Coming soon” (filled from `content/levels.json`). |

### 3.7 Topic page content and callouts

- **Content typography.**
  - Paragraphs and lists are at most `--measure` (70 characters).
  - H1, H2 and H3 are in the display face (Fraunces), with a clear size step (`--fs-2xl` / `--fs-xl` / `--fs-lg`).
  - Lists have a marker in the level colour, and the text line height is `--lh-body`.
- **Callouts.** `js/callouts.js` recognizes a section by the **heading text**: `## H2` or a bold subheading `**…**` (`p.md-subhead`). The `.md` files stay unchanged. The rules are in one array `CALLOUT_RULES`, and the first match wins. They key on the English headings of spec 07 §1–2:

  | The heading starts with | Type / class | Icon | Look |
  |---|---|---|---|
  | “Common mistakes for English speakers” (`LM.APP.mistakesHeading`), “The most common trap”, “Watch out” | `callout-trap` | `triangle-alert` | amber (`--warning-soft`), list markers in `--warning` |
  | “Real life vs exam” | `callout-real-exam` | `arrow-left-right` | see 3.16 |
  | “Key ideas”, “What you can do at this level” | `callout-key` | `sparkles` | `--lvl-soft` (level colour) |
  | “What next”, “Are you ready…” | `callout-next` | `map-pin` | a dashed border, links as pill buttons |
  | “Examples”, “Key phrases”, “Word partners” | `callout-examples` | `list-checks` | a left stripe in the level colour, target-language sentences (`em`, the 1st table column) in `--lvl-ink` |

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
- **`[[id]]` links.** `.wiki-chip`: a pill in the level colour of the target page (`lvl-XX`), with the `notebook-text` icon and the level code.
- **“I know this” on narrow screens.** Below 760 px the topic page header `.page-head` is sticky (`position: sticky`, background `--sticky-bg`), so “I know this” is always at hand. Breadcrumbs are hidden then.

### 3.8 Language layer: listen buttons, character bar, voice help, answer hints

- **Listen button** (`.listen-btn`): a 44 px round icon button (`volume-2`, accent colour, `--accent-soft` on hover) at the end of the Polish cell of an examples table and in the top-right corner of a blockquote. Hidden by CSS unless `<html data-voice="ready">` (`js/speech.js`), so a device without a Polish voice never shows a dead button. Accessible name "Listen to example 3" / "Listen to the text"; the tooltip names the S shortcut.
- **Character bar** (`.charbar`, `.charbar-key`): one row of 44 × 44 px keys (`--surface`, `--line-control` border, `--radius-sm`), wraps on narrow screens; `lang="pl"` on each key; aria-label "Insert ą" (contains the visible letter, WCAG 2.5.3). One bar per item under its fields; none after checking.
- **Voice help** (`.voice-help`): a note box in `--warning-soft` with a `--warning-border` border: "No Polish voice found on this device." and a `<details>` "How to add one" (Windows, macOS, Android and iOS, Chrome). Used in Learning settings, listening items and dictation.
- **Answer hints** (`.ex-near.is-accents | is-ending | is-typo`): the existing `.ex-spelling` style (warning colour, 600) with the closest answer in bold and `lang="pl"`; `.is-lenient` (accepted without accents) uses `--success`. Flashcards: `.fc-result.is-accents` and `.is-ending` in the warning colour like `.is-typo`. Colour is never alone: the text names the kind of mistake.
- **Gloss** (`.md-gloss`): an English gloss in parentheses at the end of a blockquote line, in `--ink-muted`, outside the `lang` span.

### 3.9 Practice: the exercise engine and the Practice hub

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
- **Fill the table** (`paradigm`).
  - The lemma in the display face with its English gloss; under it a grid of cells, the label above its field (case labels: the English name in `--ink`, the question words in `--ink-muted`).
  - From 480 px two columns filled top to bottom (`grid-auto-flow: column`, so Tab goes down a column); below 480 px one column. Fields 44 px high, full width of the cell.
  - A given cell: `--surface-2` background, dashed border, read-only, the word “given” next to it.
  - After checking: right cells `--success-soft` with ✓, wrong ones `--danger-soft`, struck through, ✗ and the right form under the field (the same chip as a gap model). Points in the status line (“4 / 6 points”).
  - One character bar under the grid serves every cell.
- **Result:** a big number in the display face (`--fs-4xl`), a warm comment by percentage and a “To correct” list. A mixed session adds accuracy per topic.
- **Set cards** (`.ex-set-card`): a top stripe in the level colour, the best and last score, a “Start” button. They look the same in “Check yourself”, in Practice and on the lab card.

### 3.10 The Case Lab (spec 09)

Route `#/lab`, `js/lab-cases.js` (LM.lab) on top of the shared lab parts in `js/lab.js` (LM.labKit: timeline, decision tree, compare picker, listen buttons, notes button, practice, lazy loader). Data `data/lab.js` (cases, models, trees, aspect) is loaded on demand and prefetched on idle time or when a pointer comes near a lab link.

- **Case colour tokens** (stripes, dots, table row markers; never text):

  | Token | Case | Light | Dark |
  |---|---|---|---|
  | `--case-nom` | Nominative | `#1c8cb4` (sky) | `#1c8cb4` |
  | `--case-gen` | Genitive | `#9f7a23` (ochre) | `#9f7a23` |
  | `--case-dat` | Dative | `#89428f` (plum) | `#a860af` |
  | `--case-acc` | Accusative | `#1b7548` (green) | `#40aa70` |
  | `--case-ins` | Instrumental | `#c1587d` (rose) | `#b2466e` |
  | `--case-loc` | Locative | `#547cd3` (blue) | `#6992eb` |
  | `--case-voc` | Vocative | `#a33e23` (brick) | `#c55d41` |

  The class `.case-nom` … `.case-voc` sets `--case`. **Computed, not picked by eye:** the same hue per case in both themes, checked with the `dataviz` palette validator against `#fffdf9` (light) and `#151e33` (dark): lightness band, chroma ≥ 0.10, contrast ≥ 3:1 (also in `tools/contrast.js`, on the card and the page background). Colour-blind separation (protanopia / deuteranopia, OKLab ΔE) on the adjacent pairs of the school order and on the pairs the lab shows together (nom–acc, gen–acc, acc–loc, nom–ins, gen–loc, nom–voc, dat–loc, gen–ins): light ≥ 7.6 (gen–acc; all others ≥ 8), dark ≥ 8.5; normal vision ΔE ≥ 14.9 on those pairs. Seven hues cannot all be apart from each other (no 7-colour set passes all 21 pairs), so **colour is never alone**: the case name is always next to it, on the map, the card, the tables and the tree results.
- **Aspect tokens:** `--aspect-impf` (light `#2c55c4`, dark `#8db0ff`) and `--aspect-perf` (`#0e7682` / `#5fd3dc`), ≥ 3:1. The shape carries the meaning too: imperfective = a line (process), perfective = a diamond (result), and the word is written next to each form.
- **Tabs:** Map, Case card, Pick the case, Compare, Declension, Aspect. Links with `aria-current="page"`, each view has its own address; on a narrow screen the bar scrolls horizontally.
- **Map:** seven cards in the school order (Nominative → Vocative), a left stripe in the case colour, the English name with a colour dot, the Polish name and question words (`lang="pl"`), the one-line use and the level chip. A case without a card yet is a dashed card “Being written” (not a link). Arrow keys move between cards (up / down by the visual grid), Home / End, Enter opens. Below: three links to Pick the case, Declension and Aspect. While the data loads, the seven names draw at once in a skeleton grid.
- **Case card:** a header with the stripe, “Case n of 7”, the notes button; uses (Polish with a listen button, English under it); endings table (Gender / Noun / Adjective) with a Singular / Plural switch (two buttons, `aria-pressed`); trigger chips grouped as prepositions, verbs, other (buttons that read the word aloud); traps (the “Common mistakes” callout); contrasts with an example pair and “Compare side by side”; “Model phrases in the …” and “Practice this case” (sets of its topics and sets whose items carry one of its `setTags`).
- **Pick the case:** the decision tree view of the original lab: 56 px answer buttons, the path of choices above the question, focus moves to the new question or the result, Back and Start again. The result names the case, the reason and an example with a listen button, and links to the card (or says the card is being written). Several trees get chips above the card (`#/lab/pick/<tree>`).
- **Compare:** two selects, two columns (stripe, name, uses, singular endings), and the “Differences” table from the contrasts of both cards. One column below 860 px.
- **Declension viewer:** “One phrase, all forms” (rows = the seven cases with colour marker, name and question words; columns Singular / Plural) or “One case, all phrases”. What differs from the dictionary form is underlined (`.lab-end`, 2 px, not colour), every form has a listen button. Up to 640 px every table of the lab turns into cards (the column label above each value), so nothing scrolls sideways from 320 px.
- **Aspect strip:** one SVG timeline (`LM.labKit.timeline` with five lanes sharing one axis and one dashed “now” line), the lane name above each line, element labels below; under it the five forms as cards with the example. `role="img"` with the whole description; GSAP DrawSVG on entry, none with reduced motion.
- **Timeline function** (`LM.labKit.timeline({ lanes, compact, ariaLabel })`): `-1 … 0 … 1`; points, 12 px ranges with round ends, a fading “since long ago” start, an arrow into the future, a result diamond, repeats, a dashed marker; labels without overlap; a compact 440-unit version on phones so labels stay ≥ about 12 px.
- **Keyboard:** `?` opens “Shortcuts in the lab”. All switches and chips are buttons or links, ≥ 44 px in the lab.
- **Speed:** the map draws in about 120–170 ms after navigation start on a warm cache (e2e checks < 500 ms).

### 3.11 Stats and the automatic mistake log

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

### 3.12 Search and notes

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

### 3.13 Flashcards and mistakes

- **The `#/review` view:** a `pageHead` header (eyebrow “Learning”, title “Flashcards and mistakes”, the chip “N to review” from `LM.reviewQueue.count()`), under it `role="tablist"` tabs (`.pw-tabs`, `role="tab"` links with `aria-selected`, tabindex 0 only on the active one; arrows, Home and End move the focus, Enter and Space open): Due today, Decks, My mistakes, My words. The tab state is in the address. Files: `js/review.js` (header, tabs, card), `js/cards.js`, `js/mistakes.js`, `js/words.js` (tab content), `js/review-queue.js` (counts and queue).
- **The “Due today” card** (`LM.review.card`, the same as the `bento-reviews` tile on Today): the number (Fraunces), “to review · about N min”, three rows (flashcards from decks, mistakes from the log, weak spots from practice). The row marker has a different shape (square, circle, diamond), so it does not rely on colour; a non-empty row is a link to the session `?only=…`. Then “Start review”, “Short session (10)” (from 11 items) and the links “Decks”, “My mistakes”, “+ Add mistake”. When done: `LM.ui.emptyState({ art: "no-reviews" })` with the nearest due date. Layout: three columns from 900 px, two down to 599 px, one below; targets ≥ 44 px.
- **The session `#/review/session`:** one progress bar for the whole session, items in the existing views: a flashcard (ratings 1–4, shortcuts as before), a mistake (a card from the “My mistakes” deck), an item (the exercise engine's view: `startSingle` with the hooks `progress`, `nextLabel`, `renderDone`; the result comes back to the session, correct = Good, wrong = Again). Filters `?only=mistakes|weak|decks|deck:<id>`, `&max=10`. Summary: number of items, % Good or Easy, time, how many tomorrow, the breakdown by kind, the hardest ones; ≥ 5 items = a learning day (`LM.markActivity`).
- **My mistakes:** the entry state label comes from its card (“Due today”, “Learning”, “Review in N days”, “Mastered” at an interval ≥ 21 days, “Suspended”), the filters “Due today” / “All” / “Mastered” are computed from the card state; the “Add to flashcards” button is gone (every entry has a card).
- Contrast: new pairs in `tools/contrast.js` (tabs, counter, card links, row markers).

### 3.14 Content pages and items

- **S1 Breadcrumbs** (`LM.ui.breadcrumbs([{ label, href?, onclick? }, …])`, `js/ui.js`): one component above the h1 instead of the top “Back to …” links: “Level A1 › Cases › Accusative” (level and category go back to the list with its scroll position), “Flashcards and mistakes › Decks › …”, “Writing › …”, “Practice › …”. `<nav aria-label="Breadcrumbs"><ol>`, the last item `aria-current="page"`, the “›” separator from CSS. Below 640 px only “‹ parent” shows (the second-to-last item; with one item, that item). Targets ≥ 44 px. The bottom “Back to the list” button is gone too.
- **S2 Previous / next topic** (`topicNav`, `js/handbook.js`; `LM.learn.topicNeighbors` with a test): at the end of a topic page “‹ Previous: …” and “Next topic: … ›”, in the syllabus order (only topics with a page); after the level's last topic “Start A2 ›” (a link to the next level's list). Shortcuts `[` and `]` (not in text fields). Below 640 px the links stand one under another.
- **S3 Table of contents** (`js/toc.js`): topic pages with ≥ 4 `##` sections get a table of contents. From 1200 px it sticks on the right (a 240 px column between `--w-text` and `--w-wide`, `position: sticky`) with scrollspy (`IntersectionObserver`, a reading line at 25% of the height; `aria-current="location"`). A narrower screen: a `<details>` “On this page” above the content. The router owns the hash, so jumps use `scrollIntoView` (with focus on the heading, no animation with `prefers-reduced-motion`). In print the list is hidden (`css/print.css`).
- **S4 Set state in the level list** (`LM.exercises.setLabels`, `LM.exLogic.bestSetLabel` with a test): the label “set 8/10” (the best result of the topic's sets; the set with the highest percentage) before the arrow in a row with a page, a dot in the land colour at ≥ 80%. Added after the exercise index loads, so the list draws at once.
- **S5 Shortcuts** (`js/shortcuts.js`): in items 1–4 and A–D choose an answer (with options that are letters A–H only: the option with that text), Enter checks, **S** reads the sentence (`LM.exLogic.speechText`: before checking a gap is a pause “…”, after checking the model answer; a target-language voice from `LM.lang`; without a voice a message), **?** opens the shortcuts panel for the current view (sets, review session, exams, topic page). In the review session S reads the card's sentence (a cloze with the gap as a pause), and the old “suspend” moved from S to **W**. In exam exercises Enter in an answer field selects “Check”, and S reads the last chosen row. Shortcuts do not work in text fields (except Enter).

### 3.15 Placement test and mistake log

- **Test:**
  - one question on the screen, progress dots with ✓ / ✗ (not only colour);
  - after an answer the letter turns into ✓ / ✗, with the label “Correct” / “Your answer” next to it;
  - the result shows a big level mark (`clamp` up to 6.5 rem, the land colour) with a “pop” animation (GSAP, no motion with `reduced-motion`).
- **Mistake log:**
  - a category stripe next to an entry and on the review card: `--cat-*` tokens in both themes, ≥ 3:1 to the card, the category name always in a chip;
  - the review session: a big card, the context in the display font, “Show answer” (eye icon), then two clear buttons: “I knew it” (green, ✓) and “Wrong again” (repeat icon).

### 3.16 Exams (stage E)

The exam engine is generic and stays hidden until `content/exams/registry.json` lists an exam (spec 12); `tools/fixtures/exam-demo` keeps it under test.
- One look for every exam: the registry's `accent` / `accent2` become `--exam-accent` / `--exam-accent-2` (cover bars, chips, the sidebar tile); `tools/contrast.js` checks them (bar ≥ 3:1 on the card, white code on the tile ≥ 4.5:1).
- **Covers** (`LM.examCover`): full (start page), compact (sub-pages), mini (Today and home tiles). **Date card** (`LM.examDate.card`): days to the exam in Fraunces, a date field, US date format.
- **“Coming soon” exam:** a card with an SVG illustration in tokens, a `--warning-soft` badge, the registry's description and a way back. No empty tables, no dead links.
- **Writing trainer:** a word counter with zones (always with text), a big timer; while a visible timer runs `html.focus-mode` dims the rest of the interface to 30% (back to 100% on hover or focus).
- A task prompt carries `lang="pl"` only when the registry marks the exam `promptInTarget: true`.

#### Components kept for stage E (exam content)

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

### 3.17 Print

`css/print.css` (loaded with `media="print"`) and `js/print.js` (forces the light tokens while printing):
- `@page { size: auto; margin: 12mm }`: the paper chosen in the print dialog, **A4 or US Letter**.
- No interface (sidebar, top bar, buttons, “I know this”, notes, toasts, the table of contents); black text on white; cards without shadows; land colours only as thin lines. Answers hidden behind “Show answers” print at the end under “Answers”.
- **Cheat sheet** (`#/a1/cheatsheet`, `.cheatsheet-view`): one sheet, two columns, a header with the level code; type ≥ 9.5 pt. `node tools/cheatsheets-pdf.js` prints every cheat sheet on A4 and on US Letter and fails when one needs a second page.

## 4. Motion

- **Simple things in CSS only.** Hover, focus, appearing and colour transitions are done in CSS. We animate `opacity` and `transform`. The exception is a short colour transition when the theme changes (the class `html.theme-anim`).
- **Times.** `--dur-fast` for micro-interactions, `--dur-base` for entries and menus, `--dur-slow` for bars and rings. Nothing longer than 400 ms except celebrations.
- **GSAP.** The file `assets/vendor/gsap.min.js` (npm `gsap`, free with all plugins) copied by `npm run assets`.
  - It is loaded **only on demand**: `LM.loadGsap().then(gsap => …)` injects a `<script>`. This also works under `file://`, where a dynamic `import()` of modules is blocked.
  - Every animation goes through `gsap.matchMedia()` with a `(prefers-reduced-motion: reduce)` branch without motion.
  - On leaving a view: `mm.revert()` / `ctx.revert()`. The app does not use React, so instead of `useGSAP` we clean up on a route change.
  - All GSAP animations go through `js/motion.js`: `LM.motion.run(plugins, setup)` loads GSAP and plugins, calls `setup(gsap, reduce)` inside `gsap.matchMedia()` and cleans up (`mm.revert()`) on the next animation and on a page change (`app.onRoute`). When GSAP does not load or motion is reduced, the view shows its final state at once.
  - Plugins in use: DrawSVG and MotionPath (only the trail on “Today”). The files `assets/vendor/*.min.js` are copied by `npm run assets`.
  - Where it loads: “Today”, the test result screen, celebrations and the Case Lab aspect strip. Other screens do not load GSAP (item animations, callouts and focus mode are CSS).
  - The trail measures the length to a station with one `getTotalLength()` on the path cut to the successive segments. We do not sample `getPointAtLength()`, because with a 4× CPU slowdown that cost about 650 ms per render.
- **No smooth scrolling.** No Lenis or similar libraries. Scrolling is native (nested panels, text fields, iPad).
- **No heavy background effects.** WebGL and canvas particles are forbidden.
- **`prefers-reduced-motion: reduce`.** A global rule shortens animations and transitions to 0.01 ms. Only instant changes stay (colour, opacity without motion).

## 5. Accessibility

- **WCAG AA contrast.** Text ≥ 4.5:1, components, field borders, bars and markers ≥ 3:1, in both themes. Checked by `npm run contrast` (163 token pairs per theme, the exam fixture colours and the accent palette check: 358 checks). The level, case and accent palettes are checked for colour-blind separation (sections 2.2, 2.3, 3.10).
- **Visible focus.** `:focus-visible`, a 2 px outline in the accent colour, on every interactive element.
- **Touch targets.** Min. 44 × 44 px with `pointer: coarse` and in menus, toggles and icon buttons.
- **Colour is never the only carrier of information.** Levels have codes, states an icon or a word, an exercise result ✓/✗ plus text.
- **Icons.** Decorative icons have `aria-hidden="true"`. A button with only an icon has `aria-label` and a tooltip.
- **Motion.** As in section 4 (`prefers-reduced-motion`).
- **Accessible name = visible text** (WCAG 2.5.3). We do not override a visible label with `aria-label`. Extra context for screen readers goes in `<span class="visually-hidden">` (the profile button, the day counter).
- **Links in text** are underlined, not only coloured (WCAG 1.4.1).
- **Keyboard.** Everything works from the keyboard. Menus and dialogs have Esc, arrows and focus return (unchanged from earlier stages).
- **Target-language markup.** Every Polish word or sentence in the interface carries `lang="pl"` (`LM.APP.targetLang`), so screen readers switch voice and hyphenation; the page itself is `lang="en"`.
- **Heading order.** One `h1` per view, no skipped levels; cards inside a view start at `h2`.

## 6. Microcopy

The interface is English; the full rules and the glossary are in spec 04 (binding).

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
3. `npm run contrast`: 0 failing pairs, the accent palette check green; `npm run check:lang` green.
4. Audit of hard-coded values: in `css/style.css` outside the token blocks there are no colour literals (`#…`, `rgb(…)`), font sizes or radii in px, or times outside tokens (exception: 0.01 ms in the `prefers-reduced-motion` rule).

   Documented exceptions with fixed colours:
   - `meta theme-color` in `<head>` and `THEME_COLOR` in `js/theme.js` — the script runs before CSS loads;
   - the standalone `assets/favicon.svg` (and `favicon-180.png`, rendered from it);
   - `css/print.css` (black on white paper).
5. Screenshots: light and dark theme at 320, 390, 768 and 1280 px. No horizontal scroll from 320 px.
6. Performance:
   - Lighthouse mobile and desktop on a server with gzip (as GitHub Pages), with a test profile in `localStorage`. Without a profile Lighthouse measures the welcome screen.
   - Animation smoothness with `Emulation.setCPUThrottlingRate` 4× at 390 and 1280 px.
