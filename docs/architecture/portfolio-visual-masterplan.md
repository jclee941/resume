# Portfolio Visual Masterplan

This document is the implementation masterplan for the current portfolio visual
upgrade. It is scoped to the public portfolio Worker surface and must stay
aligned with the live source under [`apps/portfolio/`](../../apps/portfolio/).
It does not replace the design system in
[`apps/portfolio/DESIGN.md`](../../apps/portfolio/DESIGN.md); it explains how
the current upgrade uses that system.

## Intent

The visual direction is a dark operational glass portfolio for recruiters and
hiring teams. The page should feel like reviewed operational evidence, not a
marketing landing page: charcoal surfaces, restrained cyan accents, compact
proof blocks, mono metadata, clear focus states, and practical paths from role
fit to evidence.

The upgrade has four user-facing outcomes:

- Recruiters can land in the hero and immediately choose a proof path:
  career context, project evidence, or contact/PDF handoff.
- Role-fit chips make Security Ops, SRE / Observability, DevSecOps / IaC, and
  Automation evidence scannable without hiding the underlying project list.
- Career timeline rendering is maintainable, localized, and accessible without
  leaving all timeline structure in one module.
- Locale SEO is explicit: `/`, `/ko/`, `/en/`, and `/ja/` advertise consistent
  canonical and hreflang relationships, with `/ko/` as the Korean alternate.

## Source Boundaries

Use the existing portfolio source boundaries. Do not hand-edit
`apps/portfolio/worker.js`; it is generated.

| Area                                      | Current owner                                                                                                                                                                                                                                                                                                                                          | Rule                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Visual tokens and component contracts     | [`apps/portfolio/DESIGN.md`](../../apps/portfolio/DESIGN.md)                                                                                                                                                                                                                                                                                           | New UI must use existing tokens and component roles before adding any new pattern.                                                 |
| Hero proof copy and review path data      | [`apps/portfolio/lib/hero-content-data.js`](../../apps/portfolio/lib/hero-content-data.js) and [`apps/portfolio/lib/hero-content.js`](../../apps/portfolio/lib/hero-content.js)                                                                                                                                                                        | Keep localized recruiter copy in data, with rendering in the generator.                                                            |
| Recruiter quick paths and evidence matrix | [`apps/portfolio/src/scripts/modules/recruiter-enhancements.js`](../../apps/portfolio/src/scripts/modules/recruiter-enhancements.js), [`recruiter-enhancements-data.js`](../../apps/portfolio/src/scripts/modules/recruiter-enhancements-data.js), and [`recruiter-role-proofs.js`](../../apps/portfolio/src/scripts/modules/recruiter-role-proofs.js) | Keep role definitions, proof counting, rendering, and binding separated enough to test reinitialization and localization.          |
| Timeline behavior                         | [`timeline.js`](../../apps/portfolio/src/scripts/modules/timeline.js), [`timeline-rendering.js`](../../apps/portfolio/src/scripts/modules/timeline-rendering.js), and [`timeline-career-meta.js`](../../apps/portfolio/src/scripts/modules/timeline-career-meta.js)                                                                                    | `timeline.js` owns orchestration and events; rendering labels/HTML and career UI metadata stay modular.                            |
| SEO locale routing                        | [`entry.js`](../../apps/portfolio/entry.js), [`constants.js`](../../apps/portfolio/lib/entry-router-utils/constants.js), [`html-localization.js`](../../apps/portfolio/lib/entry-router-utils/html-localization.js), templates, and [`sitemap.xml`](../../apps/portfolio/sitemap.xml)                                                                  | Root `/` remains stable Korean content; `/ko/`, `/en/`, and `/ja/` must advertise route-specific canonicals and shared alternates. |

## Visual System

Build on the design system's "quiet security command center" identity:

- Surfaces: use `--bg-primary`, `--bg-secondary`, `--bg-card`,
  `--bg-tertiary`, `--glass-bg`, `--glass-border`, and existing shadow tokens.
- Accent: reserve `--color-accent` and related accent tokens for CTAs, focus,
  active state, and evidence markers.
- Type: use Inter for body and headings; use the mono stack for labels,
  counters, status, and proof metadata.
- Motion: use transform, opacity, and color only; respect
  `prefers-reduced-motion`.
- Layout: keep recruiter proof modules compact, one-column on mobile, and
  grid-based on tablet/desktop. Avoid nested cards and unrelated decorative
  effects.

## Recruiter Proof Path

The first viewport should show a direct hiring review path:

1. Hero identity and positioning state the role family.
2. Hero proof list gives immediate evidence categories.
3. Hero review path links to career context, project evidence, and contact/PDF.
4. Hiring review packet summarizes target roles, evidence set, and contact
   handoff.
5. Role-fit quick paths let a recruiter filter attention by hiring need while
   preserving all project cards in the DOM.

The role chips are proof chips, not filters that remove content. Their count
labels come from actual project-card role tags, are localized, and are exposed
through ARIA labels. Reinitialization must not double-bind click handlers or
duplicate the quick paths/evidence matrix.

## Timeline Modularization

Timeline work should stay split by responsibility:

- `timeline-career-meta.js`: UI-only phase/status metadata keyed by stable
  career periods.
- `timeline-rendering.js`: localized labels, phase icon mapping, impact text,
  and timeline node HTML including `aria-controls` details regions.
- `timeline.js`: data merge, DOM replacement, animation class application,
  expand/collapse behavior, and keyboard navigation.

The acceptance bar is not only visual. Expand buttons must control real detail
regions, update visible and accessible labels, and keep localized phase labels
for Korean, English, and Japanese pages.

## SEO And Locale Alignment

The SEO contract for this upgrade is:

- `/` keeps canonical `https://resume.jclee.me/`.
- `/ko/` keeps canonical `https://resume.jclee.me/ko/`.
- `/en/` keeps canonical `https://resume.jclee.me/en/`.
- `/ja/` keeps canonical `https://resume.jclee.me/ja/`.
- Every locale page advertises `ko-KR` as `https://resume.jclee.me/ko/`,
  `en-US` as `/en/`, `ja-JP` as `/ja/`, and `x-default` as `/`.
- `sitemap.xml` uses the same alternate set.

Keep metadata changes in templates, router localization helpers, and sitemap
sources. Do not rely on historical SEO docs under `apps/portfolio/` when they
conflict with current source.

## QA Gates

Before commit, run focused checks that match the changed surface:

```bash
npm run build
npx playwright test tests/e2e/portfolio-enhancements.spec.js tests/e2e/accessibility.spec.js tests/e2e/seo.spec.js tests/e2e/seo-hreflang.spec.js --project=chromium
```

Capture local browser screenshots for `/`, `/en/`, and `/ja/` at:

- `375px` mobile
- `768px` tablet
- `1280px` desktop

The visual QA pass must inspect CJK text, not only English:

- Korean and Japanese hero, role-chip, timeline, and contact text do not clip.
- Mono labels and proof counts remain readable beside CJK body text.
- Role chips wrap without overlapping, truncating, or changing tap targets.
- Timeline phase badges and expand buttons retain visible focus and readable
  labels.
- Mobile recruiter actions and hero proof modules do not obscure content.

## Release Path

Use normal git and Cloudflare Workers Builds flow:

1. Keep the implementation commits small enough to review by surface: hero proof
   path, recruiter proof chips, timeline modularization, SEO/hreflang, and QA
   fixes.
2. Run the focused build/E2E gate and attach the screenshot evidence to the
   review notes or PR.
3. Push to the production branch only after the local gate is green.
4. Let Cloudflare Workers Builds deploy from the push. Do not use the disabled
   root `npm run deploy` path for normal production release.
5. After Workers Builds finishes, run:

```bash
npm run verify:production
```

Production verification must confirm the deployed portfolio serves the expected
routes, security headers, content integrity, and deploy-verification checks from
the live `https://resume.jclee.me` surface.

## Done Definition

The visual upgrade is done when:

- The dark operational glass system from `DESIGN.md` is visible in the hero,
  recruiter proof modules, timeline, and mobile action surfaces.
- Recruiter proof paths and role-fit chips connect role intent to real project
  evidence without hiding content or duplicating handlers.
- Timeline rendering is modular, localized, and accessible.
- Canonical/hreflang output is consistent across pages and sitemap.
- Local screenshots at `375`, `768`, and `1280` pass CJK visual review.
- Focused E2E/build checks pass before push.
- Cloudflare Workers Builds deploys from the production branch.
- `npm run verify:production` passes against the live site.
