# Portfolio Design System

## 1. Atmosphere & Identity

An evidence-backed full-stack systems studio: calm, precise, and product-led.
The portfolio demonstrates how user surfaces, APIs, data and asynchronous flows,
security and reliability, and delivery and operations connect in real builds.
`Full-Stack Engineer` is the primary public identity; `Security Automation &
Edge Infrastructure` is supporting depth, never the headline identity.

### Preserve and Remove

- Preserve: dark graphite surfaces, cyan focus and accent, strong contrast,
  restrained motion, existing keyboard behavior, and CJK-safe typography.
- Remove: terminal windows, command prompts, incident-timeline labels,
  packet/status chrome, forced activity glow, fake operational output, and
  security-incident metaphors.
- Prefer inspectable project evidence over recruiter-process framing,
  decorative charts, stock imagery, or unsupported performance claims.

## 2. Color

### Surface tokens

- Primary: `--bg-primary` (`#0f1115`) for the page background.
- Secondary: `--bg-secondary` (`#15181e`) for section groups.
- Card: `--bg-card` (`#171a21`) for project and evidence surfaces.
- Tertiary: `--bg-tertiary` (`#1b1f27`) for interactive state change.

### Text, accent, and border tokens

- Primary text: `--text-primary` (`#e7e9ee`) for headings and primary copy.
- Secondary text: `--text-secondary` (`#aab1bd`) for body copy.
- Muted text: `--text-muted` (`#8b94a3`) for metadata.
- Primary accent: `--color-accent` (`#5aa9b8`) for links, focus, and actions.
- Accent states: `--color-accent-light` (`#86c7d2`),
  `--color-accent-strong` (`#9bd8e1`), and `--color-accent-dark` (`#3f8290`).
- Borders: `--border-primary` (`#262a33`) and `--border-secondary`
  (`#333845`).

- Accent is functional: CTA, link, focus, selected capability, and evidence
  connector. It is not ambient decoration.
- Raw technology-brand colors are allowed only in technology tags when contrast
  remains compliant.
- A content group gets at most one border and one elevation treatment. Do not
  nest glass cards or stack ornamental outlines.

## 3. Typography

### Display and heading scale

- Display uses `--text-6xl` with `--font-semibold` for the hero name.
- H1 uses `--text-5xl` with `--font-semibold` for the compact hero name.
- H2 uses `--text-2xl` with `--font-semibold` for section titles.
- H3 uses `--text-xl` with `--font-semibold` for project and dialog titles.

### Body and label scale

- Large body uses `--text-xl` with `--font-normal` for positioning copy.
- Body uses `--text-base` with `--font-normal` for main copy.
- Small body uses `--text-sm` with `--font-normal` for supporting detail.
- Caption uses `--text-xs` with `--font-medium` for technical labels.

- Primary reading and headings use `Inter`, system UI, sans-serif.
- `IBM Plex Mono`, `JetBrains Mono`, `SF Mono`, monospace is limited to
  technical labels, capability keys, architecture steps, and compact metadata.
- Body text never goes below `--text-sm`; technical styling must not make prose
  resemble a terminal transcript.
- Korean headings and labels use `word-break: keep-all` with
  `overflow-wrap: anywhere` as the emergency fallback.
- Japanese headings and labels use `line-break: strict` with
  `overflow-wrap: anywhere` as the emergency fallback.
- Preserve meaningful lexical units in all locale prose. Avoid isolated Korean
  particles/endings, split Japanese compounds, clipped glyphs, and tofu.

## 4. Spacing and Responsive Layout

All spacing derives from the existing 4px token scale. The content maximum is
`1180px`; readable prose remains narrower. No viewport may gain horizontal
scrolling.

### Audit viewports

- `375px`: one column, content-sized hero, both CTAs visible at `375x812`,
  and wrapped controls.
- `768px`: two featured-build columns with the third build spanning the row.
- `1280px`: three equal featured-build columns within the `1180px` container.

- Below `768px`, featured builds and supporting sections use one column.
- From `768px` through `1023px`, featured builds use two columns and the third
  build spans both columns.
- At `1024px` and above, the three featured builds use equal columns.
- Capability controls wrap in place with no horizontal scroller.
- Interactive targets are at least `44px` in both dimensions. Focus indicators
  are a visible `2px` ring and cannot be hidden by overflow.

## 5. Components and States

### Compact Hero

- Contains name, primary title, supporting line, availability, proposition, two
  CTAs, and three featured-project proof links only.
- The primary CTA targets `#projects`; the secondary CTA targets `/resume.pdf`.
- It is content-sized, not a simulated terminal or oversized status dashboard.

### Featured Build Card

- Shows a factual project title and summary, supported capability layers, a
  code-native architecture flow, technology tags, and an explicit detail link.
- The leading builds are SafetyWallet, Resume Portfolio, and IP Blacklist.
- Missing capability evidence is omitted rather than filled with generic copy.

### Capability Controls

- Five localized controls reveal or emphasize supported evidence without
  removing the project list from the DOM.
- Selected state is conveyed by text/ARIA and shape or border, not color alone.

### Architecture Flow

- Use code-native architecture visuals built with semantic HTML, CSS Grid or
  Flexbox, borders, and inline SVG connectors where needed.
- Do not use generated diagrams, stock bitmaps, terminal screenshots, or fake
  monitoring panels as architecture proof.

### Disclosure and Links

- `#cover-letter` uses native disclosure behavior, collapsed by default, and
  remains keyboard and screen-reader operable.
- Links and buttons implement hover, active, focus-visible, disabled (when
  applicable), and selected/expanded states without shifting layout.

## 6. Motion and Interaction

- Micro motion uses `--transition-fast` for press, focus, and icon state.
- Standard motion uses `--transition-base` for hover and selection.
- Emphasis motion uses `--transition-slow` for dialog or disclosure entrance.

- Animate only `transform`, `opacity`, `filter`, and color where the change
  communicates interaction or state.
- Non-interactive evidence does not float, pulse, glow, or imply live activity.
- `prefers-reduced-motion: reduce` removes non-essential movement and preserves
  every state and piece of content.
- Keyboard order, native disclosure behavior, hash restoration, and dialog
  focus management remain functional across locales.

## 7. Depth and Evidence Visuals

- Subtle depth uses `--shadow-sm` for a resting interactive surface.
- Default depth uses `--shadow-md` for a hovered or selected surface.
- Prominent depth uses `--shadow-lg` for a dialog or fixed action surface.

Graphite tonal separation comes first, then one border, then elevation only
when it communicates hierarchy or interaction. Evidence visuals must map to
real source-backed layers and remain readable at `375px`, `768px`, and `1280px`.

## 8. Accessibility Constraints and Accepted Debt

- Maintain WCAG AA contrast, native landmarks, descriptive visible labels,
  keyboard reachability, and screen-reader state announcements.
- Validate Korean and Japanese wrapping at all audit viewports; English-only
  review is insufficient.
- Do not accept clipping, horizontal overflow, hidden focus, or motion that
  ignores user preferences as design debt.
- Current accepted debt: none. Any future exception must name affected users,
  severity, location, remediation, owner, and explicit approval.

## 9. Template Size Exception and Ownership

`apps/portfolio/index.html` and `apps/portfolio/index-en.html` remain oversized
legacy shells for metadata, landmarks, and build placeholders. Repeatable copy,
cards, and interactive behavior belong in locale data, generators, or focused
CSS/JavaScript modules. `apps/portfolio/worker.js` and locale data snapshots are
generated artifacts and are never hand-edited.
