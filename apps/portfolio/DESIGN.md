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

| Level   | Size          | Weight            | Line Height         | Tracking             | Usage                    |
| ------- | ------------- | ----------------- | ------------------- | -------------------- | ------------------------ |
| Display | `--text-7xl`  | `--font-bold`     | `--leading-none`    | `--tracking-display` | Hero name                |
| H1      | `--text-5xl`  | `--font-semibold` | `--leading-tight`   | `--tracking-tight`   | Reserved                 |
| H2      | `--text-3xl`  | `--font-semibold` | `--leading-tight`   | `--tracking-tight`   | Section titles           |
| H3      | `--text-xl`   | `--font-semibold` | `--leading-snug`    | `--tracking-normal`  | Card and dialog headings |
| Body/lg | `--text-2xl`  | `--font-medium`   | `--leading-snug`    | `--tracking-normal`  | Hero value sentence      |
| Body    | `--text-base` | `--font-normal`   | `--leading-relaxed` | `--tracking-normal`  | Main copy                |
| Body/sm | `--text-sm`   | `--font-normal`   | `--leading-relaxed` | `--tracking-normal`  | Cards and descriptions   |
| Label   | `--text-xs`   | `--font-medium`   | `--leading-snug`    | `--tracking-label`   | Eyebrows, metadata       |

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

### Section order

Every locale renders the same order: hero → resume (experience) → projects → skills →
about → certifications → cover letter → operated → contact. Experience and projects come
first because they carry the hiring evidence; section ids never change because anchors and
tests depend on them.

### Site header

- **Structure**: `.site-header > nav.minimal-nav` with logo, toggle, links, language list.
- **Links**: localized labels in section order (KO 경력/프로젝트/기술/소개/연락처, EN
  Experience/Projects/Skills/About/Contact, JA 経歴/プロジェクト/スキル/概要/連絡先); never
  English abbreviations on a KO or JA page.
- **Surface**: full-bleed band of `rgb(var(--bg-primary-rgb) / 0.82)` with `--glass-blur`
  and a 1px bottom divider; inner content aligns to the page container.
- **Accessibility**: 44px targets, localized toggle names, current language marked with
  `aria-current` and the strong border.

### Hero

- **Structure**: `.hero-content > .hero-layout` holds `.hero-identity` (name `h1`, role line,
  one value sentence, `ul.hero-proof-list`, `.hero-cta`, `ul.hero-trust`) and `.hero-aside`
  (the profile photo card `.hero-portrait` plus one `.hero-availability` status).
- **Hierarchy**: the name uses `--text-7xl` (`--leading-none`, `--tracking-display`); the
  value sentence uses `--text-2xl` in `--text-primary`; proof bullets stay `--text-base`.
- **Actions**: exactly three — the primary interview contact, the resume PDF, and a quiet
  link to projects. On phones the primary action spans the row above the other two.
- **Trust chips**: built from data — the first two active certifications plus every award,
  verbatim official names, outlined pills under a hairline.
- **Layout**: two columns from 1024px (identity, then the aside); below that the aside
  becomes a row above the name. The shell keeps the masked operations grid; no glow layer.
- **Copy**: the value sentence states what the owner does, never what the page contains. One
  availability status only. The hero carries no recruiter summary, public-project cards,
  review-path cards or role filters.

### Hero proof list

- **Structure**: `ul.hero-proof-list > li`, at most two items.
- **Layout**: one readable column (max 46rem) at every width; `--space-3` gap.
- **Markers**: a 6px accent dot with a soft ring. Static, no motion.

### Role chips

- **Placement**: `section.role-quick-paths` sits at the top of the projects section, above
  `#project-list`, and filters that list.
- **Structure**: `button.role-chip > label + separator + proof` (+ JS count); the separator is
  hidden visually.
- **Variants**: four columns from 1024px, two below.
- **States**: disabled (SSR, `cursor: wait`, 72% opacity), hover/focus, pressed
  (`aria-pressed="true"`: `--accent-wash-3` fill and a check glyph before the label).

### About

- **Structure**: `.about-grid` holds the narrative (`.about-content`) and the expertise
  card (`.expertise-block`, top-aligned so it never stretches into an empty card). The
  profile bento follows full width below 1024px; from 1024px the section is one grid where
  the narrative spans the left column and the expertise tags and the profile bento stack on
  the right. The former achievements list and the core-competency bullets are gone because
  they repeated the experience and project sections.
- **Narrative**: `.about-list` with short accent dashes; no side border.
- **Expertise**: tags in `--font-label` only.
- **Measure**: `.about-content` keeps a 70ch cap when standalone; inside the grid it fills
  its column.

### Profile bento

- **Structure**: `.profile-bento > .profile-card`. The photo card moved to the hero
  (`.hero-portrait`, still a `.profile-card--photo`).
- **Layout**: from 1024px the cards flow in two CSS columns inside the right column of the
  about grid (narrative and right column split 2:3), so a tall card never leaves a gap beside a
  short one; two grid columns from 641px, one below.
- **Type**: labels in `--font-label`; values in `--font-sans`.

### Cover letter

- **Structure**: `article.cover-letter-card` with chrome strip, headline, numbered
  paragraph rail and closing line.
- **Rules**: the paragraph rail is a continuous spine with mono indices; the closing
  prompt is mono while the closing sentence is sans.
- **Fold**: the server renders every paragraph; in the browser all but the first fold
  behind `.cover-letter__toggle`, whose label names how many paragraphs it reveals (an
  unlabeled fold once read as missing text). Print shows every paragraph. From 1024px the
  card is a grid: the headline sits in a left column beside the paragraphs and the toggle.

### Career timeline

- **Structure**: `ul.incident-timeline > li.timeline-node > marker + content(header + card)`.
- **Layout**: a single left rail at every width. The rail sits in a fixed marker column
  (`--timeline-rail-x`), the dot is centered on it, and the card fills the remaining width.
- **Card**: company, role and team on the left; up to three achievements visible as
  `ul.timeline-highlights` on the right (desktop) or below (mobile). A role without
  achievements shows its full description as `.timeline-summary` — never a truncated line.
- **States**: active role dot carries a static success ring (no pulse); the expand button
  exists only when there is more (remaining achievements or the role description), and
  cards expand via `.timeline-node.is-expanded .timeline-details`.
- **Earlier roles**: the four most recent roles stay visible; older ones carry
  `.timeline-node--older` and appear when `.timeline-more-btn`, labelled with their count,
  is pressed. Print shows every role.

### Certifications

- **Structure**: `ul.cert-list > li.cert-item` (status, name, issuer, date).
- **Layout**: two columns from 769px and three from 1200px, rows separated by hairlines.

### Project list item

- **Structure**: `li.project-item` with header, case notes (`dl.project-case-notes`), an
  optional diagram, optional description remainder, tech line, one status badge and links.
- **Case notes**: exactly three rows — 문제 / 한 일 / 결과 (EN Problem / What I did / Result,
  JA 課題 / 担当 / 結果); no row whose value carries no information.
- **Badges and links**: one status badge (LIVE when a demo or dashboard exists, otherwise the
  activity badge); no language or REPO badge. Links are labelled pills with a `↗` glyph,
  never bracketed text, and only links that belong to the project.
- **Featured**: the first three projects (by `displayOrder`) render as
  `.project-card--featured` with a diagram; the rest collapse behind the more button.
- **Phones**: at 640px and below the list is a horizontal snap carousel; cards take 88% of
  the width so the next one peeks in, and the role filter scrolls the carousel to its first
  match.
- **Disclosure controls**: the project, earlier-role and cover-letter buttons share one pill
  (`project-more.css`) and always state what they reveal.

### Architecture diagram

- **Structure**: `figure.project-diagram` with two build-time SVGs (`--wide` left-to-right,
  `--narrow` top-to-bottom), each `role="img"` with its own `<title>`/`<desc>`.
- **Data**: a `diagram` spec on the project in the SSoT; nodes name only components that the
  project's own text mentions. Edge labels are localized; tech names stay identical.
- **Layout**: SVGs render at intrinsic size (`max-width: 100%`) so text keeps one scale.
  Featured cards place the narrow variant in a right column from 1024px; tablets show the
  wide variant below the notes; phones show the narrow variant.

### Case-study grid and deep dive

- **Structure**: JS-rendered `.case-study-deep-dives` grid of `.project-card` buttons that
  open `.deep-dive-overlay`.
- **Disclosure**: the section stays `hidden` until the project list's more button expands
  it; that button's label mentions the case studies when they exist.
- **Motion**: cards fade in only under `prefers-reduced-motion: no-preference`; without
  motion they render visible immediately.

### Skill domain cards

- **Structure**: static `article.skill-domain-card` (icon, `h3`, count) with every skill as a
  visible `li.skill-item` pill in a `ul.skill-list` labelled by the heading.
- **Rules**: no accordion, no search box, no tier label; cards are static surfaces. Cards
  flow in CSS columns (up to three, each at least 16rem) so short cards fill the gaps a row
  grid leaves; reading order runs down each column. On phones the cards form a horizontal
  snap carousel (82% wide) so the next domain peeks in.

### Operated, contact and footer

- `.operated-grid`: three columns from 769px of surface cards.
- `.contact-grid`: two columns on phones, three from 768px and a single row from 1024px of
  interactive surfaces with a `>` prompt.
- `.site-footer`: muted build line; links underlined.

### Mobile action bar and back-to-top

- `.recruiter-action-bar`: fixed glass bar above the safe area on ≤768px, labels in
  `--font-label`. It stays hidden while the hero actions or the cover letter are in view
  and sets `body.has-action-bar` while visible.
- `.back-to-top`: 44px glass square, shown after 400px of scroll; on ≤768px it hides while
  the action bar is visible so two floating controls never cover the text.

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
SEO metadata, section order, and placeholder placement. Copy, cards, or interactive UI logic
should live in generator modules or CSS modules instead.
