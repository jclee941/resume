# Portfolio Design System

## 1. Atmosphere & Identity

A quiet security command center: dark, precise, and evidence-first. The signature is
operational glass: restrained charcoal surfaces, cyan status light, mono labels on Latin
technical tokens, and compact proof blocks that read like reviewed incident notes rather
than marketing cards. Three moments carry the identity: the hero shell with its faint
operations grid, the mono section index (`01`, `02`, ...) in front of every section title,
and the single left rail that runs through the career timeline.

## 2. Color

### Palette

The site is dark-only. `color-scheme: dark` is declared on `:root`; there is no light theme.

| Role           | Token                   | Value     | Usage                                 |
| -------------- | ----------------------- | --------- | ------------------------------------- |
| Surface/page   | `--bg-primary`          | `#0f1115` | Page background, inset wells          |
| Surface/band   | `--bg-secondary`        | `#15181e` | Header band, ghost buttons            |
| Surface/card   | `--bg-card`             | `#171a21` | Cards and proof blocks                |
| Surface/raised | `--bg-tertiary`         | `#1b1f27` | Hover and nested raised surfaces      |
| Text/primary   | `--text-primary`        | `#e7e9ee` | Headlines and important copy          |
| Text/secondary | `--text-secondary`      | `#aab1bd` | Body copy and descriptions            |
| Text/muted     | `--text-muted`          | `#8b94a3` | Metadata and secondary links          |
| Text/inverse   | `--text-inverse`        | `#0f1115` | Text on accent fills                  |
| Accent/primary | `--color-accent`        | `#5aa9b8` | Links, focus, primary action fill     |
| Accent/light   | `--color-accent-light`  | `#86c7d2` | Primary hover fill                    |
| Accent/strong  | `--color-accent-strong` | `#9bd8e1` | High-emphasis labels on dark surfaces |
| Accent/dark    | `--color-accent-dark`   | `#3f8290` | Rail gradient end                     |
| Accent/deep    | `--color-accent-deep`   | `#2c6470` | Skip link fill                        |
| Status/success | `--color-success`       | `#79b88a` | Positive proof markers, operate phase |
| Status/warning | `--color-warning`       | `#d8b568` | Stabilize phase                       |
| Status/error   | `--color-error`         | `#e07a86` | Error states                          |
| Border/default | `--border-primary`      | `#262a33` | Dividers and card outlines            |
| Border/strong  | `--border-secondary`    | `#333845` | Active language, ghost button edges   |
| Border/subtle  | `--border-subtle`       | 10% text  | Card edge over translucent surfaces   |

RGB channel tokens (`--bg-primary-rgb`, `--bg-secondary-rgb`, `--bg-card-rgb`,
`--color-accent-rgb`, `--color-success-rgb`, `--color-warning-rgb`) exist only to build
alpha variants; every channel token that is referenced is defined.

### Accent washes (state ramp)

One ink at stepped alphas encodes interaction state. No second accent hue exists.

| Token                | Alpha | Usage                                       |
| -------------------- | ----- | ------------------------------------------- |
| `--accent-wash-1`    | 0.05  | Resting tint on evidence surfaces           |
| `--accent-wash-2`    | 0.09  | Hover wash on interactive surfaces          |
| `--accent-wash-3`    | 0.14  | Pressed/selected wash, badge fills          |
| `--accent-line-soft` | 0.18  | Resting accent edge (badges, rails)         |
| `--accent-line`      | 0.36  | Edge of static accent markers (index nodes) |

### Rules

- Accent is functional: primary action, focus, current state, evidence markers.
- Status colors stay muted, always pair with a text label, and never compete with accent.
- Raw technology brand colors (`--tag-*`) are allowed only inside project technology tags.
- State is never a colored border on a rounded surface. Hover and selection use the wash
  ramp with a neutral `--border-secondary` edge, and selection adds a glyph. The
  focus-visible ring is the only colored edge.

## 3. Typography

### Scale

| Level   | Size          | Weight            | Line Height         | Tracking            | Usage                    |
| ------- | ------------- | ----------------- | ------------------- | ------------------- | ------------------------ |
| Display | `--text-6xl`  | `--font-semibold` | `--leading-tight`   | `--tracking-tight`  | Hero name                |
| H1      | `--text-5xl`  | `--font-semibold` | `--leading-tight`   | `--tracking-tight`  | Mobile hero name         |
| H2      | `--text-3xl`  | `--font-semibold` | `--leading-tight`   | `--tracking-tight`  | Section titles           |
| H3      | `--text-xl`   | `--font-semibold` | `--leading-snug`    | `--tracking-normal` | Card and dialog headings |
| Body/lg | `--text-xl`   | `--font-normal`   | `--leading-relaxed` | `--tracking-normal` | Hero positioning copy    |
| Body    | `--text-base` | `--font-normal`   | `--leading-relaxed` | `--tracking-normal` | Main copy                |
| Body/sm | `--text-sm`   | `--font-normal`   | `--leading-relaxed` | `--tracking-normal` | Cards and descriptions   |
| Label   | `--text-xs`   | `--font-medium`   | `--leading-snug`    | `--tracking-label`  | Eyebrows, metadata       |

`--text-xs` never renders below 12px and body text never goes below `--text-sm`.

### Font stacks

- `--font-sans`: Inter, then the platform Latin UI faces, then `--font-cjk`, then
  `system-ui`. `--font-cjk` is Korean-first on `ko`/`en` pages (Apple SD Gothic Neo,
  Noto Sans KR, Malgun Gothic) and Japanese-first on `ja` pages (Hiragino Sans,
  Noto Sans JP, Yu Gothic UI, Meiryo) so kanji never render with Korean glyph shapes.
- `--font-mono`: IBM Plex Mono for Latin technical tokens only: dates, periods, step
  indices, tech stacks, versions, paths, prompts.
- `--font-label`: the face for eyebrows, chips, badges and buttons that can carry
  localized copy. Mono with `--tracking-label: 0.04em` on English pages; `--font-sans`
  with zero tracking on Korean and Japanese pages. Monospaced Hangul/Kana would render
  with full-cell word gaps, which reads as broken spacing.

### Rules

- Mono is never applied to an element whose text can be Korean or Japanese; use
  `--font-label` instead.
- Korean copy keeps word grouping (`word-break: keep-all`, `auto-phrase` where supported)
  and Japanese keeps kinsoku (`line-break: strict`); `cjk-typography.css` owns both.
- Headlines use `text-wrap: balance`; paragraphs use `text-wrap: pretty`.

## 4. Spacing & Layout

### Base unit

All spacing derives from a base of 4px (`--space-1` 0.25rem through `--space-24` 6rem).
`--space-0` and `--space-32` do not exist.

### Page frame

- `.page-shell` is centered at every width: `width: min(100% - 2 * var(--gutter),
var(--container-max))`, `margin-inline: auto`. `--gutter` is `clamp(1rem, 4vw, 2rem)`.
- `--container-max` is 1040px and 1120px from 1440px viewports.
- The site header is sticky from 769px with a full-bleed translucent band; on smaller
  widths it scrolls with the page so the mobile action bar keeps the viewport.
- Sections are separated by `--section-gap` and a 1px `--border-primary` divider.
- Breakpoints: 480px, 640px, 768px, 1024px, 1440px.

### Rules

- Use CSS Grid for mixed proof/detail layouts; every grid track is `minmax(0, 1fr)`.
  The base reset sets `grid-auto-columns: minmax(0, 1fr)`, so single-column stacks
  never widen to the longest unbreakable CJK phrase or URL they contain.
- Mobile is one readable column with no horizontal scroll of primary content at 320px.
- About-grid text wraps long technology sequences at 320px without widening either
  column; soft breaks follow middle-dot separators.

## 5. Components

### Primitives

#### Surface card

- **Structure**: any static content block (`about-content`, `expertise-block`,
  `profile-card`, `operated-card`, `project-item`, `achievements-list`, `cover-letter-card`,
  `timeline-card`, `hiring-review-packet`, `project-evidence-matrix`).
- **Recipe**: `--bg-card` (or `--glass-bg` where content sits over the atmosphere), 1px
  `--border-subtle` edge, `--radius-lg`, `--shadow-card` (top highlight + small drop).
- **States**: static. Non-interactive cards never move or recolor on hover.

#### Interactive surface

- **Structure**: link or button cards (`hero-public-proof a`, `hero-review-path a`,
  `role-chip`, `project-review-rail__link`, `project-evidence-card`, case-study
  `project-card`, `skill-domain-card`, `contact-item`).
- **Recipe**: surface card at `--radius-md`. Hover/focus: `--accent-wash-2` fill and
  `--border-secondary` edge. Pressed/selected: `--accent-wash-3` fill plus a glyph (check
  on role chips, rotated chevron on skill cards).
- **Motion**: color only; no lift. Keyboard focus adds the 2px accent ring.

#### Button (`.link-subtle`)

- **Variants**: ghost (`--bg-secondary`, `--border-secondary` edge) and primary
  (`.link-subtle--primary`, `--color-accent` fill under the `--sheen-accent` top light
  with a `--highlight-accent` inner edge, `--text-inverse` text).
- **Spacing**: 44px minimum height, `--space-2` × `--space-4` padding, `--radius-full`.
- **Type**: `--font-label`, `--text-sm`, `--font-medium`.
- **States**: hover (ghost: wash and accent text; primary: `--color-accent-light` fill), active
  (`translateY(1px)`), focus-visible ring.

#### Badge and tag

- **Structure**: `phase-badge`, `project-meta-badge`, `tech-tag`, `tag`, `expertise-tag`,
  `cert-status`, `status-badge--active`.
- **Recipe**: `--font-label` (tech tags and badges with Latin values use `--font-mono`),
  `--text-xs`, `--radius-sm` (pills use `--radius-full`), tinted text with a matching
  `--accent-wash-*` or status wash; edges at most `--accent-line-soft`.

#### Section heading

- **Structure**: `.section-title` (`h2`) inside each `main > section`.
- **Signature**: a mono two-digit index from a CSS counter is drawn before the title
  (`content: counter(...) / ''`, hidden from assistive technology).

### Site header

- **Structure**: `.site-header > nav.minimal-nav` with logo, toggle, links, language list.
- **Surface**: full-bleed band of `rgb(var(--bg-primary-rgb) / 0.82)` with `--glass-blur`
  and a 1px bottom divider; inner content aligns to the page container.
- **Accessibility**: 44px targets, localized toggle names, current language marked with
  `aria-current` and the strong border.

### Hero content groups

- **Structure**: `.hero-content` contains `.hero-intro` (identity, positioning,
  primary actions and recruiter summary), `.hero-evidence` (career proof and public
  projects), and `.hero-navigation` (section links and role filters).
- **Layout**: only the introduction uses two desktop columns. Groups follow DOM order
  with `--space-8` gaps separated by hairline dividers; no implicit row spans or CSS
  order corrections. Public projects use four equal desktop columns, two at tablet, one
  on mobile.
- **Surface**: the hero shell (`.section-hero::before`) spans the container exactly and
  provides the depth; `.section-hero::after` draws the faint operations grid, masked to
  the top of the shell. Content is padded inside the shell (`--space-10` desktop,
  `--space-5` mobile). Evidence and navigation use open spacing rather than enclosing
  cards; project and path links keep their own interactive surface.
- **Accessibility**: primary actions precede secondary navigation in keyboard order;
  retained copy stays visible at every width. Role chips remain disabled in SSR until
  enhanced. The document owns scrolling.
- **Copy**: preserve all action links, public project details, availability/status copy
  and career evidence; do not invent career claims.
- **Accepted debt**: identity and target-role terminology still overlap to retain the
  localized recruiter summary contract.

### Hero proof list

- **Structure**: `ul.hero-proof-list > li`.
- **Variants**: one column on mobile, two columns from 641px with the first item
  spanning both columns to retain the primary-experience hierarchy.
- **Spacing**: `--space-3` gap; open layout without outer padding or panel.
- **Markers**: a 6px accent dot with a soft ring. Static, no motion.

### Hero review path

- **Structure**: `nav.hero-review-path > a > span + strong`.
- **Variants**: three equal columns on desktop; two columns with the final link
  spanning the row on mobile.
- **States**: interactive surface.

### Hiring review packet

- **Structure**: `.hiring-review-packet` header plus a definition list of numbered
  `dt`/`dd` rows separated by hairlines.
- **Surface**: glass surface with a 2px accent light along its top edge.
- **Accessibility**: keeps definition-list semantics and its explicit label.

### Role chips

- **Structure**: `button.role-chip > label + separator + proof` (+ JS count).
- **Variants**: two columns from 769px, one column below.
- **States**: disabled (SSR, `cursor: wait`, 72% opacity), hover/focus, pressed
  (`aria-pressed="true"`: `--accent-wash-3` fill and a check glyph before the label).

### About

- **Structure**: `.about-grid` holds the narrative (`.about-content`) and the expertise
  card (`.expertise-block`); both stretch to equal height. The profile bento and the
  achievements list follow full width.
- **Narrative**: `.about-list` with short accent dashes; no side border.
- **Expertise**: tags in `--font-label`; competencies with an accent `>` marker.
- **Measure**: `.about-content` keeps a 70ch cap when standalone; inside the grid it fills
  its column.

### Profile bento

- **Structure**: `.profile-bento > .profile-card` (photo first when present).
- **Layout**: three columns from 1024px, two from 641px, one below.
- **Type**: labels in `--font-label`; values in `--font-sans`.

### Achievements

- **Structure**: `.achievements-block > ul.achievements-list > li.achievement-card`.
- **Recipe**: one surface card; rows separated by hairlines with an accent `>` marker.

### Cover letter

- **Structure**: `article.cover-letter-card` with chrome strip, headline, numbered
  paragraph rail and closing line.
- **Rules**: the paragraph rail is a continuous spine with mono indices; the closing
  prompt is mono while the closing sentence is sans.

### Career timeline

- **Structure**: `ul.incident-timeline > li.timeline-node > marker + content(header + card)`.
- **Layout**: a single left rail at every width. The rail sits in a fixed marker column
  (`--timeline-rail-x`), the dot is centered on it, and the card fills the remaining width.
- **States**: active role dot carries a static success ring (no pulse); cards expand via
  `.timeline-node.is-expanded .timeline-details`.

### Certifications

- **Structure**: `ul.cert-list > li.cert-item` (status, name, issuer, date).
- **Layout**: two columns from 769px, rows separated by hairlines.

### Project list item

- **Structure**: `li.project-item` with header, case notes (`dl.project-case-notes`),
  optional description remainder, tech line, meta badges and links.
- **Layout**: CSS grid areas; badges sit beside the title on desktop and below it on
  mobile; tech line and links share the footer row.
- **Case notes**: label/value rows (`dt` in `--font-label`, `dd` in body text) separated by
  hairlines. The description paragraph renders only sentences not already shown in the
  notes, so no sentence appears twice.

### Project review rail

- **Structure**: `li.project-review-rail` with eyebrow, header and three link cards.
- **Rules**: the link eyebrow is clamped to one line because it comes from free-form
  taglines.

### Case-study grid and deep dive

- **Structure**: JS-rendered `.case-study-deep-dives` grid of `.project-card` buttons that
  open `.deep-dive-overlay`.
- **Motion**: cards fade in only under `prefers-reduced-motion: no-preference`; without
  motion they render visible immediately.

### Skill search

- **Structure**: a labeled textbox, polite live result count, domain cards and an inline
  empty-result paragraph. KO, EN and JA use the same bundled styles.
- **States**: an empty query shows all cards without a counter; a skill-name query counts
  matching entries once across cards; a domain-name query retains every skill and its
  evidence. No matches show a localized explanation and zero count. Clearing restores all
  entries without changing expanded-card state.
- **Accessibility**: retain keyboard card toggles and input focus while filtering;
  announce counts through the existing live region. Search radius uses `--radius-md` and
  the minimum input height remains 44px in every locale.

### Operated, contact and footer

- `.operated-grid`: three columns from 769px of surface cards.
- `.contact-grid`: three columns from 768px of interactive surfaces with a `>` prompt.
- `.site-footer`: muted build line; links underlined.

### Mobile action bar and back-to-top

- `.recruiter-action-bar`: fixed glass bar above the safe area on ≤768px, labels in
  `--font-label`.
- `.back-to-top`: 44px glass square, shown after 400px of scroll.

## 6. Motion & Interaction

### Timing

| Type     | Duration            | Easing       | Usage                        |
| -------- | ------------------- | ------------ | ---------------------------- |
| Micro    | `--transition-fast` | `--ease-out` | Button press and icon shifts |
| Standard | `--transition-base` | `--ease-out` | Hover and color transitions  |
| Emphasis | `--transition-slow` | `--ease-out` | Card and overlay entrance    |

### Rules

- Animate `transform`, `opacity`, and color only.
- Only interactive elements react to hover; there is no global link or button lift.
- No permanent loops: status dots and level indicators are static.
- `prefers-reduced-motion: reduce` removes transitions and animations and never leaves
  content in a hidden entrance state.
- Every interactive element needs hover and focus-visible treatment.

## 7. Depth & Surface

| Level     | Token                                          | Usage                                       |
| --------- | ---------------------------------------------- | ------------------------------------------- |
| Card      | `--shadow-card`                                | Resting cards (top highlight + small drop)  |
| Hover     | `--shadow-card-hover`                          | Hovered interactive cards                   |
| Prominent | `--shadow-lg`                                  | Hero shell, fixed bars, overlays            |
| Glass     | `--glass-bg`, `--glass-border`, `--glass-blur` | Evidence blocks and floating mobile actions |
| Accent    | `--sheen-accent`, `--highlight-accent`         | Primary action fill: top light, inner edge  |

Shadows are tinted to the page hue (`rgb(4 6 10 / …)`), never neutral black. Surfaces feel
layered through tonal shifts first, then low-opacity borders, then shadows only where
elevation communicates interaction or focus.

## 8. Accessibility Constraints

- Text contrast meets WCAG AA on every surface; `--text-muted` is the floor for text.
- `prefers-contrast: more` strengthens the dark theme (brighter secondary/muted text,
  stronger borders, solid surfaces); it never swaps individual tokens to a light theme.
- `forced-colors: active` hands surfaces and focus to system colors.
- Touch targets are at least 44×44px; focus-visible rings are 2px accent with offset.
- Print renders black on white with link targets and no interactive chrome.

## 9. CSS Architecture

`src/styles/main.css` is the ordered import graph; cascade order is part of behavior:

1. Tokens: `variables.css` (the only token source).
2. Base: `base.css`, `accessibility.css`.
3. Layout: `layout.css`, `site-header.css`.
4. Primitives: `surfaces.css`, `buttons.css`.
5. Sections: hero, recruiter, about, cover letter, timeline, credentials, projects,
   deep dive, skills, operated, contact, action bar files in page order.
6. Cross-cutting: `animations.css`, `cjk-typography.css`, `contrast-modes.css`,
   `print.css` (last).

Rules: one component per file, at most 200 lines per file, no late "stabilization"
override layers; a fix lands in the file that owns the component.

## 10. Accepted Debt

- The JA page is produced from the KO shell by string transforms
  (`lib/japanese-template/`), so JA-only layout needs land as CSS `:lang(ja)` rules.
- Free-form project taglines feed the review-rail eyebrow; the one-line clamp hides the
  overflow instead of the data supplying a short label.
- Inline `<style>` blocks in the content-pack HTML shells (font faces, theme transitions)
  stay outside this stylesheet because their CSP hashes are computed at build time.

## 11. Template Size Exception

`apps/portfolio/index.html` and `apps/portfolio/index-en.html` remain oversized legacy
HTML shells because they carry document metadata, structural landmarks, and build
placeholders for the generated Cloudflare Worker. New repeatable or frequently edited
content must be split out of these files.

Current split points:

- Hero content is generated by `apps/portfolio/lib/hero-content.js`.
- Locale page assembly is handled by `apps/portfolio/lib/localized-page-builder.js`.
- Resume, project, skill, contact, and cover-letter content continues to flow through
  existing placeholder generators.

Allowed edits inside the oversized HTML shells are limited to stable document structure,
SEO metadata, and placeholder placement. Copy, review-path content, cards, or interactive
UI logic should live in generator modules or CSS modules instead.
