# Application PDF Design System

## 1. Atmosphere & Identity

A quiet security operations dossier. It should feel like a concise incident-response briefing: dense, calm, and credible, with technical evidence grouped for fast recruiter scanning. The signature is a thin amber command rail that separates identity, fit, and evidence without decorative cards.

## 2. Color

### Palette

| Role              | Token               | Light   | Dark    | Usage                             |
| ----------------- | ------------------- | ------- | ------- | --------------------------------- |
| Surface/primary   | --surface-primary   | #F7F4EF | #11100E | A4 paper background               |
| Surface/secondary | --surface-secondary | #FFFFFF | #1A1815 | Evidence panels                   |
| Surface-muted     | --surface-muted     | #EEE8DE | #29241E | Summary bands                     |
| Text/primary      | --text-primary      | #171613 | #F8F5EF | Name, headings, body              |
| Text/secondary    | --text-secondary    | #5B564E | #C8BFB2 | Metadata and supporting text      |
| Text/tertiary     | --text-tertiary     | #837A6F | #958A7D | Dates and quiet labels            |
| Border/default    | --border-default    | #D8D0C4 | #403A31 | Section separators                |
| Border/subtle     | --border-subtle     | #E8E1D7 | #2E2923 | Internal dividers                 |
| Accent/primary    | --accent-primary    | #B15C18 | #D98232 | Security command rail, role label |
| Accent/secondary  | --accent-secondary  | #2E5B4E | #66A088 | Trust/security tags               |
| Status/info       | --status-info       | #25324A | #8EA0C0 | Links and portfolio references    |

### Rules

- Amber is used for document wayfinding and the strongest role-fit signals only.
- Green is reserved for security capability tags and should never dominate the page.
- Do not introduce raw colors in application HTML. Extend this table first.

## 3. Typography

### Scale

| Level   | Size  | Weight | Line Height | Tracking | Usage                   |
| ------- | ----- | ------ | ----------- | -------- | ----------------------- |
| Display | 22pt  | 800    | 1.05        | 0        | Candidate name          |
| H1      | 12pt  | 800    | 1.2         | 0        | Primary role            |
| H2      | 8.4pt | 800    | 1.25        | 0.08em   | Section labels          |
| H3      | 8.7pt | 800    | 1.25        | 0        | Role and project titles |
| Body    | 7.8pt | 400    | 1.42        | 0        | Resume body             |
| Body/sm | 7.1pt | 400    | 1.35        | 0        | Metadata                |
| Caption | 6.8pt | 700    | 1.3         | 0.04em   | Tags and dates          |

### Font Stack

- Primary: NanumSquare, NanumBarunGothic, NanumGothic, system-ui, sans-serif
- Mono: NanumGothicCoding, Noto Sans Mono, monospace
- Serif: not used

### Rules

- Korean copy uses natural phrase grouping. Avoid oversized headings that split semantic phrases.
- Numeric dates use tabular figures.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of 4px.

| Token     | Value | Usage                   |
| --------- | ----- | ----------------------- |
| --space-1 | 4px   | Tight inline separation |
| --space-2 | 8px   | Compact list spacing    |
| --space-3 | 12px  | Panel padding           |
| --space-4 | 16px  | Section spacing         |
| --space-5 | 20px  | Header group spacing    |
| --space-6 | 24px  | Major vertical rhythm   |

### Grid

- Max content width: A4 printable width, 188mm.
- Column system: 1.35fr / 1fr for evidence and profile blocks.
- Breakpoints: print-first; browser preview remains centered at desktop widths.

### Rules

- One A4 page is the default application PDF target.
- Use dense but readable grouping. Cards are allowed only for repeated evidence blocks.

## 5. Components

### Command Header

- **Structure**: candidate identity, target role, contact cluster.
- **Spacing**: `--space-5` bottom, `--space-3` internal.
- **States**: print/static only.
- **Accessibility**: links remain real anchors in HTML.
- **Motion**: none.

### Evidence Item

- **Structure**: title row, period metadata, two concise bullets, tags.
- **Spacing**: `--space-2` between items.
- **States**: print/static only.
- **Accessibility**: semantic list content, no decorative image dependency.
- **Motion**: none.

## 6. Motion & Interaction

### Timing

| Type   | Duration | Easing | Usage                           |
| ------ | -------- | ------ | ------------------------------- |
| Static | 0ms      | none   | Print/PDF application documents |

### Rules

- Application PDFs are static. Do not add animation, hover-only content, or JS-dependent content.

## 7. Depth & Surface

### Strategy

Use borders-only with tonal shifts. No shadows.

| Type    | Value                           | Usage                    |
| ------- | ------------------------------- | ------------------------ |
| Default | 1px solid var(--border-default) | Major blocks             |
| Subtle  | 1px solid var(--border-subtle)  | Internal item separators |
