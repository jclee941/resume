# Portfolio Fix & Modernize

## TL;DR

> **Quick Summary**: Fix all JavaScript errors, accessibility issues, and SEO meta tag problems in resume.jclee.me portfolio. Remove broken Sentry integration, add WCAG-compliant tap targets, and correct /en/ page social sharing URLs.
> 
> **Deliverables**:
> - Zero console errors on page load
> - All tap targets ≥44px (WCAG 2.5.5 compliant)
> - Correct og:url and twitter:url on /en/ page
> - aria-labels on all external links
> 
> **Estimated Effort**: Short (1-2 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 6 (Build/Deploy)

---

## Context

### Original Request
Resume portfolio (resume.jclee.me) 컨텐츠 현행화 및 고도화 - Fix all identified issues and modernize the site.

### Interview Summary
**Key Discussions**:
- JavaScript errors caused by Sentry script loading order and undefined DSN
- Accessibility tap targets measuring 17-26px instead of required 44px
- /en/ page social meta tags pointing to wrong URLs
- User preference: NO quantified metrics, conservative tone, minimal design

**Research Findings**:
- Sentry regex patterns are valid (false alarm)
- Sentry CDN integrity hash is correct
- Root cause: sentry-config.js loads before Sentry CDN bundle
- CSP already includes googletagmanager.com
- All accessibility fixes are straightforward CSS/HTML changes

### Metis Review
**Identified Gaps** (addressed):
- Sentry DSN is placeholder → Decision: Remove Sentry entirely
- Test strategy unclear → Decision: Manual Playwright verification
- GA CSP verification needed → Added as explicit task

---

## Work Objectives

### Core Objective
Eliminate all console errors and accessibility violations in the portfolio site while ensuring correct social media sharing for the English version.

### Concrete Deliverables
- `index.html` - Sentry scripts removed
- `index-en.html` - Sentry removed + og:url/twitter:url fixed
- `src/styles/components.css` - Tap targets ≥44px
- `lib/cards.js` - aria-labels added, href='#' pattern fixed
- `generate-worker.js` - Sentry config removed from build
- Deployed and verified on resume.jclee.me

### Definition of Done
- [ ] `npm run build` succeeds without errors
- [ ] Browser DevTools Console shows zero errors on page load
- [ ] All interactive elements have tap targets ≥44px
- [ ] Facebook/Twitter debuggers show correct /en/ URLs
- [ ] Lighthouse Accessibility score ≥95

### Must Have
- Zero JavaScript console errors
- WCAG 2.5.5 compliant tap targets (44px minimum)
- Correct social sharing URLs for /en/ page
- aria-labels on external links

### Must NOT Have (Guardrails)
- No quantified metrics in any content (user hates "50+", "99.9%")
- No framework additions (vanilla JS only)
- No direct worker.js edits (auto-generated)
- No content changes (already done in previous session)
- No major design changes (minimal style already applied)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (Jest + Playwright in tests/)
- **User wants tests**: Manual verification (faster turnaround)
- **Framework**: Playwright for browser automation

### Automated Verification (Agent-Executable)

Each task includes verification procedures the agent can execute directly without user intervention. Verification uses Playwright browser automation skill for UI checks and Bash for build/deploy commands.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Remove Sentry from HTML files [no dependencies]
├── Task 2: Fix CSS tap targets [no dependencies]
└── Task 3: Fix SEO meta tags [no dependencies]

Wave 2 (After Wave 1):
├── Task 4: Fix cards.js accessibility [depends: none, but logical order]
└── Task 5: Verify CSP configuration [depends: none]

Wave 3 (After Wave 2):
└── Task 6: Build, Deploy, Verify [depends: 1, 2, 3, 4, 5]

Critical Path: Task 1 → Task 6
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 6 | 2, 3 |
| 2 | None | 6 | 1, 3 |
| 3 | None | 6 | 1, 2 |
| 4 | None | 6 | 5 |
| 5 | None | 6 | 4 |
| 6 | 1, 2, 3, 4, 5 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | 3x sisyphus-junior (parallel, quick category) |
| 2 | 4, 5 | 2x sisyphus-junior (parallel, quick category) |
| 3 | 6 | 1x sisyphus-junior (sequential, includes deploy) |

---

## TODOs

### Task 1: Remove Sentry Integration from HTML Files

**What to do**:
- Remove Sentry CDN script tag from index.html (lines 269-273)
- Remove sentry-config.js script reference from index.html (line 268)
- Remove same Sentry scripts from index-en.html
- Remove sentry-config.js from generate-worker.js file reads (lines 144-147)
- Remove SENTRY_CONFIG embedding from worker code generation (line 400)
- Remove /sentry-config.js route handler from worker (search for "sentry-config.js")

**Must NOT do**:
- Do not modify sentry-config.js file itself (will be orphaned, can delete later)
- Do not change any other script loading order

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Simple find-and-remove operations across 3 files
- **Skills**: [`git-master`]
  - `git-master`: For atomic commit after changes
- **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: Not needed for script removal

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 2, 3)
- **Blocks**: Task 6
- **Blocked By**: None

**References**:

**Pattern References**:
- `apps/portfolio/index.html:267-282` - Current script block with Sentry

**File References**:
- `apps/portfolio/index.html` - Korean HTML, lines 267-282
- `apps/portfolio/index-en.html` - English HTML, similar location
- `apps/portfolio/generate-worker.js` - Lines 144-147 (file read), line 400 (embedding)

**WHY Each Reference Matters**:
- index.html shows the exact script tags to remove and their order
- generate-worker.js shows how sentry-config.js is embedded and where to remove references

**Acceptance Criteria**:

```bash
# Agent runs after changes:
grep -r "sentry" apps/portfolio/index.html || echo "OK: No sentry in index.html"
grep -r "sentry" apps/portfolio/index-en.html || echo "OK: No sentry in index-en.html"
grep -r "sentry-config" apps/portfolio/generate-worker.js || echo "OK: No sentry-config in generate-worker.js"
# Assert: All three should output "OK: No sentry..."
```

**Commit**: YES
- Message: `fix(portfolio): remove broken Sentry integration`
- Files: `index.html`, `index-en.html`, `generate-worker.js`
- Pre-commit: N/A (verification via grep)

---

### Task 2: Fix Accessibility Tap Targets in CSS

**What to do**:
- Add `min-height: 44px; min-width: 44px; display: inline-flex; align-items: center; padding: 8px 0;` to `.hero-link` class
- Add `min-height: 44px; padding: 8px 0;` to `.project-link-title` class
- Verify `.contact-links a` already has 44px (it does per research)

**Must NOT do**:
- Do not change colors, fonts, or other visual styles
- Do not add padding that breaks the minimal design aesthetic

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Simple CSS property additions to 2 classes
- **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: For understanding CSS layout implications
- **Skills Evaluated but Omitted**:
  - `playwright`: Not needed for CSS changes themselves

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 3)
- **Blocks**: Task 6
- **Blocked By**: None

**References**:

**Pattern References**:
- `apps/portfolio/src/styles/components.css:174-188` - `.contact-links a` shows correct 44px pattern to follow

**File References**:
- `apps/portfolio/src/styles/components.css` - Lines 26-38 (.hero-link), Lines 111-129 (.project-link-title)

**WHY Each Reference Matters**:
- components.css lines 26-38 show .hero-link needs min-height added
- components.css lines 111-129 show .project-link-title needs min-height added
- components.css lines 174-188 show the correct pattern already implemented for .contact-links

**Acceptance Criteria**:

```bash
# Agent runs after changes:
grep -A5 "\.hero-link {" apps/portfolio/src/styles/components.css | grep "min-height: 44px"
# Assert: Returns matching line

grep -A5 "\.project-link-title {" apps/portfolio/src/styles/components.css | grep "min-height: 44px"
# Assert: Returns matching line
```

**Commit**: YES
- Message: `fix(a11y): add 44px minimum tap targets for WCAG 2.5.5`
- Files: `src/styles/components.css`
- Pre-commit: CSS syntax check via build

---

### Task 3: Fix SEO Meta Tags on English Page

**What to do**:
- Change `og:url` from `https://resume.jclee.me` to `https://resume.jclee.me/en/` (line 50)
- Change `twitter:url` from `https://resume.jclee.me` to `https://resume.jclee.me/en/` (line 76)

**Must NOT do**:
- Do not change any other meta tags
- Do not modify the Korean index.html
- Do not change canonical URL (already correct)

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Two simple string replacements in one file
- **Skills**: None needed
- **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: Not needed for meta tag changes

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2)
- **Blocks**: Task 6
- **Blocked By**: None

**References**:

**Pattern References**:
- `apps/portfolio/index.html:48-56` - Korean og:url correctly points to root (compare)

**File References**:
- `apps/portfolio/index-en.html` - Line 50 (og:url), Line 76 (twitter:url)

**WHY Each Reference Matters**:
- index-en.html line 50 has og:url that needs /en/ suffix
- index-en.html line 76 has twitter:url that needs /en/ suffix
- Compare with index.html to understand the pattern (root URL is correct for Korean)

**Acceptance Criteria**:

```bash
# Agent runs after changes:
grep 'og:url' apps/portfolio/index-en.html | grep '/en/'
# Assert: Returns line with og:url containing /en/

grep 'twitter:url' apps/portfolio/index-en.html | grep '/en/'
# Assert: Returns line with twitter:url containing /en/
```

**Commit**: YES
- Message: `fix(seo): correct og:url and twitter:url for /en/ page`
- Files: `index-en.html`
- Pre-commit: N/A

---

### Task 4: Fix Accessibility in cards.js

**What to do**:
- Add aria-label to project links (line 73): `aria-label="${escapeHtml(project.title)} (opens in new tab)"`
- Add aria-label to hero email link (line 165): `aria-label="Send email to qws941@kakao.com"`
- Fix href='#' pattern (lines 62-73): Only add `target="_blank" rel="noopener noreferrer"` when link is NOT '#'

**Must NOT do**:
- Do not change the visual appearance of links
- Do not modify other card generation functions

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Template string modifications in one file
- **Skills**: None needed
- **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: Changes are functional, not visual

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Task 5)
- **Blocks**: Task 6
- **Blocked By**: None (logical ordering after Wave 1)

**References**:

**Pattern References**:
- `apps/portfolio/lib/templates.js:26` - generateLink() helper with aria-label support (reference pattern)

**File References**:
- `apps/portfolio/lib/cards.js` - Line 62-73 (project link generation), Line 165 (hero email)

**WHY Each Reference Matters**:
- cards.js lines 62-73 show the href='#' fallback and target='_blank' that needs conditional logic
- cards.js line 165 shows the email link needing aria-label
- templates.js line 26 shows an existing pattern for aria-labels to follow

**Acceptance Criteria**:

```bash
# Agent runs after changes:
grep -n "aria-label" apps/portfolio/lib/cards.js
# Assert: Returns at least 2 lines (project link + email link)

grep -n 'target="_blank"' apps/portfolio/lib/cards.js
# Assert: Should show conditional logic, not unconditional
```

**Commit**: YES
- Message: `fix(a11y): add aria-labels and fix href="#" pattern in cards.js`
- Files: `lib/cards.js`
- Pre-commit: `node -c lib/cards.js` (syntax check)

---

### Task 5: Verify CSP Configuration for Google Analytics

**What to do**:
- Verify `https://www.googletagmanager.com` is in script-src (should already be there)
- Add `https://www.google-analytics.com` to script-src if missing
- Add `https://www.google-analytics.com` to connect-src if missing

**Must NOT do**:
- Do not remove existing CSP domains
- Do not change other security headers

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Simple verification and potential one-line addition
- **Skills**: None needed
- **Skills Evaluated but Omitted**:
  - `playwright`: Not needed for config file changes

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Task 4)
- **Blocks**: Task 6
- **Blocked By**: None

**References**:

**File References**:
- `apps/portfolio/lib/security-headers.js` - Line 37 (cspScriptSrc), Line 40 (cspConnectSrc)

**WHY Each Reference Matters**:
- security-headers.js line 37 shows current script-src domains
- security-headers.js line 40 shows current connect-src domains
- These are the only places CSP is configured

**Acceptance Criteria**:

```bash
# Agent runs after verification/changes:
grep "googletagmanager" apps/portfolio/lib/security-headers.js
# Assert: Returns line(s) showing googletagmanager.com in CSP

grep "google-analytics" apps/portfolio/lib/security-headers.js || echo "INFO: google-analytics not needed if GA works"
# Assert: Either returns match OR GA works without it (verify in Task 6)
```

**Commit**: YES (if changes made) | NO (if verification only)
- Message: `fix(csp): add google-analytics.com to CSP allowlist`
- Files: `lib/security-headers.js`
- Pre-commit: `node -c lib/security-headers.js`

---

### Task 6: Build, Deploy, and Verify

**What to do**:
1. Run `npm run build` in portfolio-worker directory
2. Verify build succeeds and worker.js is generated
3. Deploy using: `source /home/jclee/.env && CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY" CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL" npx wrangler deploy --env production`
4. Verify deployment via browser automation

**Must NOT do**:
- Do not skip verification steps
- Do not deploy if build fails

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
  - Reason: Requires browser automation for verification
- **Skills**: [`playwright`]
  - `playwright`: For browser automation verification
- **Skills Evaluated but Omitted**:
  - `git-master`: Final commit handled after all verification passes

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 3 (sequential, final)
- **Blocks**: None (final task)
- **Blocked By**: Tasks 1, 2, 3, 4, 5

**References**:

**Build References**:
- `apps/portfolio/package.json` - Build and deploy scripts
- `apps/portfolio/wrangler.toml` - Cloudflare deployment config

**Deploy Command**:
```bash
source /home/jclee/.env && cd /home/jclee/dev/resume/apps/portfolio && \
CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY" CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL" \
npx wrangler deploy --env production
```

**WHY Each Reference Matters**:
- package.json contains the build script that generates worker.js
- Deploy command uses credentials from .env file

**Acceptance Criteria**:

**Build Verification**:
```bash
cd /home/jclee/dev/resume/apps/portfolio && npm run build
# Assert: Exit code 0, worker.js generated
ls -la worker.js | head -1
# Assert: File exists and has recent timestamp
```

**Deploy Verification**:
```bash
# After deploy completes, verify health endpoint:
curl -s https://resume.jclee.me/health | jq .status
# Assert: Returns "healthy"
```

**Browser Verification (using playwright skill)**:
```
# Agent executes via playwright browser automation:
1. Navigate to: https://resume.jclee.me
2. Open DevTools Console (capture console messages)
3. Assert: Zero JavaScript errors in console
4. Assert: No "Sentry" related errors
5. Assert: No CSP violation errors
6. Screenshot: .sisyphus/evidence/task-6-console-clean.png

7. Navigate to: https://resume.jclee.me/en/
8. Inspect: meta[property="og:url"] content attribute
9. Assert: Contains "/en/"
10. Inspect: meta[name="twitter:url"] content attribute
11. Assert: Contains "/en/"

12. Click: First project link
13. Assert: Link opens (or has correct href, not "#")

14. Measure: .hero-link element height
15. Assert: Height >= 44px
16. Measure: .project-link-title element height
17. Assert: Height >= 44px

18. Screenshot: .sisyphus/evidence/task-6-final-verification.png
```

**Evidence to Capture**:
- [ ] Build output showing success
- [ ] Wrangler deploy output showing deployment URL
- [ ] Console screenshot showing zero errors
- [ ] Element measurements showing ≥44px tap targets

**Commit**: YES
- Message: `deploy: portfolio fixes - Sentry removed, a11y improved, SEO fixed`
- Files: All changed files from Tasks 1-5
- Pre-commit: Build must succeed

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(portfolio): remove broken Sentry integration` | index.html, index-en.html, generate-worker.js | grep for sentry |
| 2 | `fix(a11y): add 44px minimum tap targets for WCAG 2.5.5` | src/styles/components.css | grep for min-height |
| 3 | `fix(seo): correct og:url and twitter:url for /en/ page` | index-en.html | grep for /en/ |
| 4 | `fix(a11y): add aria-labels and fix href="#" pattern` | lib/cards.js | grep for aria-label |
| 5 | `fix(csp): add google-analytics.com to CSP allowlist` | lib/security-headers.js | grep (if changed) |
| 6 | `deploy: portfolio fixes complete` | (squash or final tag) | browser verification |

---

## Success Criteria

### Verification Commands
```bash
# Build succeeds
cd apps/portfolio && npm run build
# Expected: Exit 0, worker.js updated

# No Sentry references
grep -r "sentry" apps/portfolio/*.html
# Expected: No matches

# Health check passes
curl -s https://resume.jclee.me/health | jq .status
# Expected: "healthy"
```

### Final Checklist
- [ ] All "Must Have" present (zero errors, 44px targets, correct URLs, aria-labels)
- [ ] All "Must NOT Have" absent (no metrics, no framework additions, no worker.js edits)
- [ ] Build passes without errors
- [ ] Browser console shows zero JavaScript errors
- [ ] Lighthouse Accessibility ≥95
