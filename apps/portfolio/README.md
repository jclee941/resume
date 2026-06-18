# Resume Portfolio

Cloudflare Worker portfolio for <https://resume.jclee.me>.

## Build

```bash
node generate-worker.js
```

This compiles `worker.js`, a single-file Cloudflare Worker (roughly 0.8 MB after
the in-process job-dashboard merge described in `docs/adr/0009-single-worker-consolidation.md`).
Never edit `worker.js` directly.

## Development

```bash
npm run dev
npm run build
```

`npm run dev` uses Wrangler for local preview. `npm run build` runs from the
repository root.

## Design

- Clean dark-neutral professional layout
- Fonts: Inter for primary UI text, with IBM Plex Mono reserved for compact
  technical accents
- Palette: graphite backgrounds with a restrained teal accent (`#5aa9b8`)
- No terminal chrome, CLI panels, or neon/cyberpunk presentation layer

## Sections

- hero
- about
- cover-letter
- experience / resume
- certifications
- projects
- skills, rendered as searchable capability cards
- operated
- contact

## Styling

CSS lives in `src/styles/` across focused modules:

`variables`, `base`, `layout`, `hero`, `cards`, `skills`, `contact`,
`components`, `animations`, `media`, `utilities`, and `main`.

`main.css` imports the active clean-layout styles only; the removed terminal
stylesheet is not part of the build.

## Data Flow

`data.json` is the source data. The build fills HTML placeholders through
`lib/cards.js` and then generates the Worker artifact.

## Notes

- Keep source edits in the HTML, data, and build inputs.
- Never edit `worker.js` directly.
