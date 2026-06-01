# Portfolio Review & Improvement — 2026-05-31

**Scope:** `resume.jclee.me` review + refactor + improvement pass.
**Branch:** `master`
**Baseline health:** typecheck clean, ESLint 0 errors, Jest 1252 passing, 0 `.sh`
operational scripts, 0 `as any`/`@ts-ignore` in source. Known large-file debt
remains (e.g. `mission-control.js` 601 LOC — deferred F6; dashboard handlers);
no new >500 LOC files were introduced in this pass.

The codebase was already in good shape, so this pass targeted verified,
high-ROI correctness/quality issues rather than broad rewrites. Lower-priority
findings are tracked as deferred follow-ups below.

---

## Fixed in this pass

### 1. Timeline SSoT drift (P0 — correctness bug)

`apps/portfolio/src/scripts/modules/timeline.js` read
`window.RESUME_DATA?.resume?.careers`, which the build pipeline **never injects**.
It therefore always fell back to an 86-line hardcoded career array that had
**already drifted** from the SSoT
(`packages/data/resumes/master/resume_data.json`):

| Field                       | SSoT (correct)                          | Stale hardcoded fallback            |
| --------------------------- | --------------------------------------- | ----------------------------------- |
| `careers[0].role`           | `보안운영 엔지니어 (SOC/Security)`      | `(SOC/DevSecOps)`                   |
| `careers[3].role`           | `네트워크 보안 엔지니어 (NSX-T/가상화)` | `보안 엔지니어`                     |
| `careers[3,4,5].companyUrl` | real URLs (jointree / meta-m / mtdata)  | `null` → rendered broken `href="#"` |

**Fix (additive, SSoT-faithful):**

- `tools/scripts/utils/resume-web-data-generator.js` now emits a top-level
  `careers[]` derived from the SSoT (`company`, `companyUrl`, `period`, `role`,
  `myRole`, `description`, plus `achievements` flattened from
  `career.projects[].achievements`). The existing `resume[]` card output is
  unchanged.
- `timeline.js` now reads the build-injected `window.__RESUME_CHAT_DATA__.careers`
  (base64-inlined from the generated `data.json` via
  `lib/build-orchestrator.js` + `lib/html-transformer.js`) and merges UI-only
  presentation metadata (`phase`/`status`) via the new pure, tested
  `mergeCareerUiMeta()`. The 86-line hardcoded career fallback is removed. A
  guarded `description` fallback prevents a latent `TypeError` when impact text
  is derived.

**Why phase/status stay in `timeline.js`:** they are presentation taxonomy
(incident-response stage icons), not resume facts, so they do not belong in the
SSoT. Unknown companies fall back to a safe default (`기초`/`completed`).

### 2. CSS cleanup (P2 — mechanical)

- `apps/portfolio/src/styles/animations.css`: removed dead `#matrix-bg` rules
  (matrix background feature was retired; no remaining references).
- `apps/portfolio/src/styles/terminal.css` + `variables.css`: moved 3 hardcoded
  hex traffic-light button colors into `--terminal-btn-{close,minimize,maximize}`
  CSS variables (project convention bans hardcoded colors).

### 3. Brittle e2e selectors (test correctness)

4 resume tests used `#resume .resume-list li`, which matched 13 inner
incident-stage `<li>` elements after `timeline.js` replaces the server-rendered
`<ul>` with `<div.incident-timeline><article role="listitem">`. Switched to the
semantic `[role="listitem"]` locator (project test guide bans brittle CSS
selectors). Verified failing on baseline and passing after the fix.

### Tests added (TDD)

- `tools/scripts/utils/__tests__/resume-web-data-generator.test.js` (7 tests):
  `careers[]` exists, preserves SSoT data fields, drift guard on role/URL,
  achievements derived from SSoT, empty-careers and no-projects edge cases,
  `resume[]` not regressed.
- `tests/unit/portfolio-worker/timeline-career-data.test.js` (7 tests): source
  contract (no hardcode, reads `__RESUME_CHAT_DATA__`), `mergeCareerUiMeta`
  behavior incl. achievements pass-through and non-array edge.

### Verification

- `npm run typecheck`: PASS · `npm run lint`: 0 errors · `npm run test:jest`:
  1259 passing (68 suites) · `npm run test:tools`: 25 passing · `npm run build`:
  OK.
- Decoded built `worker.js` `__RESUME_CHAT_DATA__.careers`: 6 entries, each with
  3 SSoT achievements, `[0].role = 보안운영 엔지니어 (SOC/Security)`,
  `[3].companyUrl = https://www.jointree.co.kr/`.
- Resume Playwright e2e (display all / verify content / count / hoverable): 4/4
  pass on a clean server.
- **Full Playwright E2E is NOT green:** 4 Projects-section tests fail due to the
  documented pre-existing F2 debt (see below). All other checks above pass.

---

## Deferred (tracked follow-ups — NOT done this pass)

These were intentionally scoped out as independent refactor PRs to keep this
change focused and reviewable. Priority order:

| ID     | Item                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F2** | `project-cards.js` SSoT drift          | `apps/portfolio/src/scripts/modules/project-cards.js` has a hardcoded `PROJECTS` array (4 deep-dive work projects) that at runtime replaces the 9 server-rendered `li.project-item` with `.project-card` divs. Same drift class as the timeline F1 bug, but larger: the deep-dive schema (metrics/architecture/tools) is not currently in the SSoT/generated data, so a faithful fix requires extending the generator with a work-project deep-dive contract. **This causes 4 known-failing Projects-section e2e tests (see below).** |
| **F3** | `index.html` inline scripts (~800 LOC) | Terminal CLI engine, konami code, tech filter, status checker are inline `<script>` blocks. Extract to `src/scripts/modules/`. CSP SHA-256 hashes are recomputed by the build, but moving ~800 lines carries DOM-ordering/regression risk; warrants its own PR with browser smoke coverage.                                                                                                                                                                                                                                           |
| **F5** | `apps/job-dashboard/src` raw errors    | 36 raw `throw new Error(...)` sites; `@resume/shared/errors` (`normalizeError`, typed `AppError`/`ExternalServiceError`) is used in some files but under-used at throw sites. Convert opportunistically when touching those files.                                                                                                                                                                                                                                                                                                    |
| **F6** | `mission-control.js` (601 LOC)         | Five responsibilities (status widgets, command palette, UTC clock, keyboard nav, lifecycle). Split into focused modules. Not failing any policy gate; defer until touched.                                                                                                                                                                                                                                                                                                                                                            |

### Known-failing e2e (pre-existing, tied to F2)

`npm run test:e2e` currently has 4 failures in the Projects section, **verified
pre-existing on baseline** (they fail identically with this pass's changes
stashed):

- `comprehensive.spec.js` › Projects Section › should display all project cards
- `comprehensive.spec.js` › Projects Section › should verify each project card content
- `comprehensive.spec.js` › Data Consistency › project count should match data.json
- `comprehensive.spec.js` › Data Consistency › project titles should match data.json order

Root cause: the e2e expects `#projects .project-list li.project-item` /
`.project-link-title` (the server-rendered DOM), but `project-cards.js` replaces
that DOM at runtime with a hardcoded `.project-card` grid of only 4 projects
(vs 9 in `data.json`). Fixing this is the F2 deliverable — both the data drift
and the e2e should be resolved together once the project deep-dive SSoT contract
exists.

---

## Notes for reviewers

- `apps/portfolio/worker.js` is a generated artifact; it was regenerated only by
  `npm run build`, never hand-edited.
- Follow-up hardening (non-blocking): `createTimelineNode()` interpolates career
  fields into `innerHTML` without `escapeHtml()`. The source is repo-controlled
  SSoT, so this is low risk, but adding an escape helper is the right next step.
