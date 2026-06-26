# Portfolio Design System

## 1. Atmosphere & Identity

A quiet security command center: dark, precise, and evidence-first. The signature is operational glass: restrained charcoal surfaces, cyan status light, mono labels, and compact proof blocks that feel like reviewed incident notes rather than marketing cards.

## 2. Color

### Palette

| Role              | Token                   | Light     | Dark      | Usage                              |
| ----------------- | ----------------------- | --------- | --------- | ---------------------------------- |
| Surface/primary   | `--bg-primary`          | `#0f1115` | `#0f1115` | Page background                    |
| Surface/secondary | `--bg-secondary`        | `#15181e` | `#15181e` | Section panels                     |
| Surface/card      | `--bg-card`             | `#171a21` | `#171a21` | Cards, proof blocks                |
| Surface/tertiary  | `--bg-tertiary`         | `#1b1f27` | `#1b1f27` | Hover and nested surfaces          |
| Surface/inverse   | `--bg-inverse`          | `#e7e9ee` | `#e7e9ee` | High-contrast inverse text areas   |
| Text/primary      | `--text-primary`        | `#e7e9ee` | `#e7e9ee` | Headlines and important copy       |
| Text/secondary    | `--text-secondary`      | `#aab1bd` | `#aab1bd` | Body copy and descriptions         |
| Text/muted        | `--text-muted`          | `#8b94a3` | `#8b94a3` | Metadata and secondary links       |
| Text/inverse      | `--text-inverse`        | `#0f1115` | `#0f1115` | Text on accent fills               |
| Accent/primary    | `--color-accent`        | `#5aa9b8` | `#5aa9b8` | Links, focus, key actions          |
| Accent/light      | `--color-accent-light`  | `#86c7d2` | `#86c7d2` | Primary hover fills                |
| Accent/strong     | `--color-accent-strong` | `#9bd8e1` | `#9bd8e1` | High-emphasis labels               |
| Accent/dark       | `--color-accent-dark`   | `#3f8290` | `#3f8290` | Timeline and subtle hover          |
| Status/success    | `--color-success`       | `#79b88a` | `#79b88a` | Positive proof markers             |
| Status/warning    | `--color-warning`       | `#d8b568` | `#d8b568` | Caution and stabilization states   |
| Status/error      | `--color-error`         | `#e07a86` | `#e07a86` | Error states                       |
| Border/default    | `--border-primary`      | `#262a33` | `#262a33` | Dividers and card outlines         |
| Border/strong     | `--border-secondary`    | `#333845` | `#333845` | Active language, stronger dividers |

### Rules

- Accent is functional: CTAs, focus, current state, and evidence markers.
- Status colors must stay muted and never compete with the primary accent.
- Raw tech-brand colors are allowed only inside project technology tags.

## 3. Typography

### Scale

| Level   | Size          | Weight            | Line Height         | Tracking            | Usage                    |
| ------- | ------------- | ----------------- | ------------------- | ------------------- | ------------------------ |
| Display | `--text-6xl`  | `--font-semibold` | `--leading-tight`   | `--tracking-tight`  | Hero name                |
| H1      | `--text-5xl`  | `--font-semibold` | `--leading-tight`   | `--tracking-tight`  | Mobile hero name         |
| H2      | `--text-2xl`  | `--font-semibold` | `--leading-tight`   | `--tracking-tight`  | Section titles           |
| H3      | `--text-xl`   | `--font-semibold` | `--leading-snug`    | `--tracking-normal` | Dialog and card headings |
| Body/lg | `--text-xl`   | `--font-normal`   | `--leading-relaxed` | `--tracking-normal` | Hero positioning copy    |
| Body    | `--text-base` | `--font-normal`   | `--leading-relaxed` | `--tracking-normal` | Main copy                |
| Body/sm | `--text-sm`   | `--font-normal`   | `--leading-relaxed` | `--tracking-normal` | Cards and descriptions   |
| Caption | `--text-xs`   | `--font-medium`   | `--leading-snug`    | `--tracking-wide`   | Metadata and labels      |

### Font Stack

- Primary: `Inter`, system UI, sans-serif.
- Mono: `IBM Plex Mono`, `JetBrains Mono`, `SF Mono`, monospace.

### Rules

- Mono type is for labels, metadata, technical affordances, and proof modules.
- Korean body copy must keep comfortable line height and avoid single-syllable orphan wraps where possible.
- Body text does not go below `--text-sm`.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of 4px.

| Token        | Value     | Usage                               |
| ------------ | --------- | ----------------------------------- |
| `--space-1`  | `0.25rem` | Icon-to-label and tight inline gaps |
| `--space-2`  | `0.5rem`  | Compact controls                    |
| `--space-3`  | `0.75rem` | Small card and list gaps            |
| `--space-4`  | `1rem`    | Standard card padding               |
| `--space-5`  | `1.25rem` | Comfortable module padding          |
| `--space-6`  | `1.5rem`  | Section groups                      |
| `--space-8`  | `2rem`    | Major group gaps                    |
| `--space-10` | `2.5rem`  | Large section spacing               |
| `--space-12` | `3rem`    | Page section spacing                |
| `--space-16` | `4rem`    | Hero and page rhythm                |
| `--space-20` | `5rem`    | Large hero spacing                  |
| `--space-24` | `6rem`    | Maximum section separation          |

### Grid

- Max content width: `--container-max` (`1040px`), with `1120px` allowed at wide desktop.
- Narrow readable width: `--container-narrow` (`760px`).
- Breakpoints follow the existing CSS: `480px`, `640px`, `768px`, `1440px`.

### Rules

- Use CSS Grid for mixed proof/detail layouts.
- Keep mobile one-column layouts scannable and avoid first-screen sections exceeding the viewport without a strong reason.

## 5. Components

### Hero Proof List

- **Structure**: `ul.hero-proof-list > li`.
- **Variants**: one-column mobile, two-column tablet/desktop.
- **Spacing**: `--space-3` gap, `--space-4` padding.
- **States**: static evidence block.
- **Accessibility**: list keeps native semantics and an `aria-label`.
- **Motion**: none.

### Hero Review Path

- **Structure**: `nav.hero-review-path > a > span + strong`.
- **Variants**: three equal columns on desktop; one-column scan path on mobile.
- **Spacing**: `--space-2` gap, `--space-3` link padding.
- **States**: hover/focus uses accent border and subtle background only.
- **Accessibility**: nav uses a locale-specific `aria-label`; link text remains visible.
- **Motion**: translateY hover only, matching existing subtle link motion.

### Hiring Review Packet

- **Structure**: `div.hiring-review-packet > p + dl > div > dt + dd`.
- **Variants**: compact one-column mobile; three-card grid on wider viewports.
- **Spacing**: `--space-3` to `--space-5`.
- **States**: static evidence block.
- **Accessibility**: keeps definition-list semantics and explicit section label.
- **Motion**: none.

### Link Subtle Button

- **Structure**: anchor with `.link-subtle`, optional `.link-subtle--primary`.
- **Variants**: secondary outline and primary accent fill.
- **Spacing**: `--space-2` vertical, `--space-4` horizontal, minimum tap target 44px.
- **States**: hover, active, focus-visible.
- **Accessibility**: visible focus ring, descriptive link text.
- **Motion**: transform and color only.

### Project Card

- **Structure**: `.project-card` with icon, title group, tags, metrics, CTA.
- **Variants**: card grid and deep-dive overlay.
- **Spacing**: `--space-3` to `--space-5`.
- **States**: hover, focus, active dialog open.
- **Accessibility**: keyboard focus and dialog controls.
- **Motion**: transform and opacity only.

## 6. Motion & Interaction

### Timing

| Type     | Duration            | Easing                 | Usage                        |
| -------- | ------------------- | ---------------------- | ---------------------------- |
| Micro    | `--transition-fast` | `ease`                 | Button press and icon shifts |
| Standard | `--transition-base` | `ease`                 | Hover and color transitions  |
| Emphasis | `--transition-slow` | `ease` or cubic-bezier | Card and overlay entrance    |

### Rules

- Animate `transform`, `opacity`, and color only.
- Respect `prefers-reduced-motion` globally.
- Every interactive element needs hover and focus-visible treatment.

## 7. Depth & Surface

### Strategy

Mixed, with strict roles:

| Level     | Token                                          | Usage                                       |
| --------- | ---------------------------------------------- | ------------------------------------------- |
| Subtle    | `--shadow-sm`                                  | Resting cards and glass proof blocks        |
| Default   | `--shadow-md`                                  | Hovered project cards                       |
| Prominent | `--shadow-lg`                                  | Hero shell, fixed bars, overlays            |
| Glass     | `--glass-bg`, `--glass-border`, `--glass-blur` | Evidence blocks and floating mobile actions |

Surfaces must feel layered through tonal shifts first, then low-opacity borders, then shadows only where elevation communicates interaction or focus.

## 8. Template Size Exception

`apps/portfolio/index.html` and `apps/portfolio/index-en.html` remain oversized legacy HTML shells because they carry document metadata, structural landmarks, and build placeholders for the generated Cloudflare Worker. New repeatable or frequently edited content must be split out of these files.

Current split points:

- Hero content is generated by `apps/portfolio/lib/hero-content.js`.
- Locale page assembly is handled by `apps/portfolio/lib/localized-page-builder.js`.
- Resume, project, skill, contact, and cover-letter content continues to flow through existing placeholder generators.

Allowed edits inside the oversized HTML shells are limited to stable document structure, SEO metadata, and placeholder placement. Copy, review-path content, cards, or interactive UI logic should live in generator modules or CSS modules instead.
