# Resume Portfolio

Cloudflare Worker portfolio for https://resume.jclee.me.

## Build

```bash
node generate-worker.js
```

This compiles `worker.js`, a single-file Cloudflare Worker of about 614KB. Never edit `worker.js` directly.

## Development

```bash
npm run dev
npm run build
```

`npm run dev` uses Wrangler for local preview. `npm run build` runs from the repository root.

## Design

- Terminal-themed dark aesthetic
- Fonts: IBM Plex Mono and Inter
- Palette: intermediate-dim cyberpunk, with `#00d4e0` cyan, `#d946a8` magenta, and `#00d97a` green

## Sections

- hero
- about
- status, 5 items
- experience
- projects
- skills, rendered with CSS progress bars
- infrastructure
- contact

## Styling

CSS lives in `src/styles/` across 14 files:

`variables`, `base`, `layout`, `terminal`, `hero`, `cards`, `skills`, `status`, `contact`, `components`, `animations`, `media`, `utilities`, `main`.

## Data Flow

`data.json` is the source data. The build fills HTML placeholders through `lib/cards.js` and then generates the Worker artifact.

## Notes

- Keep source edits in the HTML, data, and build inputs.
- Never edit `worker.js` directly.
