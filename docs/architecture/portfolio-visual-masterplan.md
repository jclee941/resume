# Portfolio Visual Masterplan

This is the implementation masterplan for the public portfolio Worker. It
applies the normative [Portfolio Design System](../../apps/portfolio/DESIGN.md)
without changing the repository's runtime, security-header, or deployment
architecture.

## Intent

Present an evidence-backed full-stack systems studio. `Full-Stack Engineer` is
the primary public identity; `Security Automation & Edge Infrastructure` is the
supporting differentiator. Visitors should reach real end-to-end build evidence
before career detail or long-form narrative.

The visual system preserves dark graphite surfaces, cyan focus and accent,
strong contrast, restrained motion, keyboard behavior, and CJK-safe type. It
removes terminal, command-prompt, incident, hiring-packet, status-chrome, and
forced-activity metaphors.

## Exact Information Architecture

Every locale uses this section sequence:

1. `#hero`
2. `#projects`
3. `#skills`
4. `#resume`
5. `#operated`
6. `#about`
7. `#cover-letter`
8. `#certifications`
9. `#contact`

Navigation is exactly:

- projects → `#projects`
- stack → `#skills`
- experience → `#resume`
- contact → `#contact`

The first three featured builds are SafetyWallet (`safetywallet-cf-workers-pwa`),
Resume Portfolio (`resume-portfolio`), and IP Blacklist
(`ip-blacklist-platform`) at display orders 1, 2, and 3. Five project cards are
initially visible; every remaining project keeps its prior relative order.

## Exact Locale Copy

The non-breaking spaces and word-joiner entities are part of the documentation
rendering contract. They add safe line-break boundaries without changing the
visible copy.

### KO

- Primary title: 풀스택&#160;엔지니어
- Supporting line: 보안&#160;자동화 · 엣지&#160;인프라
- Hero proposition: 사용자&#160;화면부터 API, 데이터&#160;흐름,
  배포와&#160;관측성까지 직접&#160;설계하고 운영합니다.
- Availability: 풀스택 · 백엔드 · 플랫폼&#160;엔지니어
  포지션의&#160;제안과 면접을&#160;검토합니다.
- Primary CTA: 대표&#160;프로젝트&#160;보기
- Secondary CTA: 이력서&#160;PDF

### EN

- Primary title: Full-Stack Engineer
- Supporting line: Security Automation & Edge Infrastructure
- Hero proposition: I design and operate products end to end, from user
  interfaces and APIs to data flows, deployment, and observability.
- Availability: Open to full-stack, backend, and platform engineering
  opportunities.
- Primary CTA: View featured builds
- Secondary CTA: Resume PDF

### JA

- Primary title: フ&#8288;ル&#8288;ス&#8288;タ&#8288;ッ&#8288;ク&#8288;エ&#8288;ン&#8288;ジ&#8288;ニ&#8288;ア
- Supporting line: セ&#8288;キ&#8288;ュ&#8288;リ&#8288;テ&#8288;ィ&#8288;自&#8288;動&#8288;化&#8288;・&#8203;エ&#8288;ッ&#8288;ジ&#8288;イ&#8288;ン&#8288;フ&#8288;ラ
- Hero proposition: ユ&#8288;ー&#8288;ザ&#8288;ー&#8288;画&#8288;面&#8288;か&#8288;ら&#8288;API、&#8203;デ&#8288;ー&#8288;タ&#8288;フ&#8288;ロ&#8288;ー、&#8203;デ&#8288;プ&#8288;ロ&#8288;イ、&#8203;可&#8288;観&#8288;測&#8288;性&#8288;ま&#8288;で、&#8203;プ&#8288;ロ&#8288;ダ&#8288;ク&#8288;ト&#8288;を&#8288;一&#8288;貫&#8288;し&#8288;て&#8203;設&#8288;計&#8288;・&#8288;運&#8288;用&#8288;し&#8288;ま&#8288;す。
- Availability: フ&#8288;ル&#8288;ス&#8288;タ&#8288;ッ&#8288;ク・&#8203;バ&#8288;ッ&#8288;ク&#8288;エ&#8288;ン&#8288;ド・&#8203;プ&#8288;ラ&#8288;ッ&#8288;ト&#8288;フ&#8288;ォ&#8288;ー&#8288;ム&#8288;エ&#8288;ン&#8288;ジ&#8288;ニ&#8288;ア&#8288;の&#8203;ご&#8288;提&#8288;案&#8288;を&#8288;検&#8288;討&#8288;し&#8288;て&#8288;い&#8288;ま&#8288;す。
- Primary CTA: 注&#8288;目&#8288;プ&#8288;ロ&#8288;ジ&#8288;ェ&#8288;ク&#8288;ト&#8288;を&#8288;見&#8288;る
- Secondary CTA: 履&#8288;歴&#8288;書&#8288;PDF

## Capability Labels

### KO capability labels

제품&#160;UI / 백엔드·API / 데이터·워크플로 /
배포·운영 / 보&#8288;안&#8288;·&#8288;신&#8288;뢰&#8288;성

### EN capability labels

Product UI / Backend & API / Data & Workflows / Delivery & Operations /
Security & Reliability

### JA capability labels

プ&#8288;ロ&#8288;ダ&#8288;ク&#8288;ト&#8288;UI /
バ&#8288;ッ&#8288;ク&#8288;エ&#8288;ン&#8288;ド・API /
デ&#8288;ー&#8288;タ&#8288;・&#8288;ワ&#8288;ー&#8288;ク&#8288;フ&#8288;ロ&#8288;ー /
デ&#8288;リ&#8288;バ&#8288;リ&#8288;ー・運&#8288;用 /
セ&#8288;キ&#8288;ュ&#8288;リ&#8288;テ&#8288;ィ&#8288;・&#8288;信&#8288;頼&#8288;性

Capability evidence uses stable keys: `userSurface`, `backendApi`, `dataAsync`,
`securityReliability`, `deliveryOperations`, and `architectureSteps`. Render
only non-empty supported layers. Controls may emphasize evidence but never hide
projects from the DOM.

## Component and Content Decisions

- Hero: compact identity, exact locale copy, two CTAs, and three featured-build
  proof links. No recruiter review path, packet, quick-role block, or status UI.
- Featured builds: three equal columns at desktop, two columns with the third
  spanning at tablet, and one column on mobile.
- Architecture evidence: code-native HTML/CSS/inline-SVG flows generated from
  `architectureSteps`; no stock or generated bitmap diagrams.
- Cover letter: native disclosure, collapsed by default. Summaries are KO
  `업무 방식 자세히 보기`, EN `Read how I work`, and JA
  `仕事の進め方を読む`.
- Evidence: all public claims remain factual and source-backed. No invented
  scale, performance, tenure, user, or business-outcome metrics.

## Responsive, CJK, Motion, and Accessibility

- Audit every locale at `375px`, `768px`, and `1280px`; use
  `domcontentloaded`, never `networkidle` or arbitrary sleeps.
- The maximum content width is `1180px`; no horizontal overflow is permitted.
- Korean headings/labels use `word-break: keep-all`; Japanese headings/labels
  use `line-break: strict`; both use `overflow-wrap: anywhere` only as fallback.
- Interactive targets are at least `44px` and focus uses a visible `2px` ring.
- Motion signals interaction or state, uses compositor-safe properties, and
  respects `prefers-reduced-motion` without removing content.
- Validate native semantics, keyboard order, disclosure state, dialog focus,
  contrast, and CJK lexical-unit wrapping.

## Source Boundaries

Never hand-edit generated `apps/portfolio/worker.js`, locale data snapshots,
PDFs, or OG assets.

### Design contract

- Owner: [Portfolio Design System](../../apps/portfolio/DESIGN.md).
- Rule: tokens, primitives, states, responsive behavior, and accessibility are
  normative there.

### Resume and project facts

- Owner: [KO resume SSoT](../../packages/data/resumes/master/resume_data.json)
  plus aligned EN and JA sources.
- Rule: sync facts through the data pipeline; do not patch portfolio snapshots.

### Hero copy and render

- Owners: [hero copy](../../apps/portfolio/lib/hero-content-data.js) and
  [hero renderer](../../apps/portfolio/lib/hero-content.js).
- Rule: keep locale copy separate from renderer structure.

### Project render and interactions

- Owners: [card renderers](../../apps/portfolio/lib/cards/) and
  [project interactions](../../apps/portfolio/src/scripts/modules/project-cards.js).
- Rule: render stable evidence keys and preserve accessible DOM behavior.

### Visual implementation

- Owner: [portfolio styles](../../apps/portfolio/src/styles/).
- Rule: apply existing tokens and this contract without a framework replacement.

### Locale routing and SEO

- Owners: [edge entry](../../apps/portfolio/entry.js), router helpers,
  templates, and [sitemap](../../apps/portfolio/sitemap.xml).
- Rule: keep canonical and hreflang relationships explicit.

Existing timeline modularization, merged `/job/*` routing, CSP/security headers,
static asset handling, and Cloudflare Workers Builds authority remain intact.

## QA and Release Gates

Focused implementation tasks add their own Jest and Playwright contracts. The
integrated gate builds the generated Worker, verifies KO/EN/JA behavior, runs
Axe and visual review, and captures `375px`, `768px`, and `1280px` evidence.

Documentation verification depends on the installed `pandoc` executable and the
repository Playwright dependency declared in
[`package.json`](../../package.json). Missing either dependency blocks the
rendered-document gate; grep-only or source-only review cannot replace it.

Normal production delivery remains Cloudflare Workers Builds after approved
integration. Local Wrangler commands are dry-run or emergency verification;
they do not replace the normal deployment authority. Live completion requires
`npm run verify:production` and an exact `/health.git_sha` match.

## Done Definition

- The exact identity, locale copy, IA, navigation, capability labels, and first
  three featured builds are present in all locales.
- Removed command-center and recruiter-packet patterns are absent from the
  rendered product.
- Source-backed code-native architecture evidence is readable at all three
  audit widths with no CJK clipping or horizontal overflow.
- Keyboard, focus, disclosure, reduced-motion, locale routing, CSP/security
  headers, and deployment boundaries remain verified.
