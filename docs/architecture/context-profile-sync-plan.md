# Context/Profile Sync Automation — Baseline Audit & Improvement Plan

**Date:** 2026-05-10
**Auditor:** `verify-context-profile-sync.go`
**Scope:** resume.jclee.me monorepo — portfolio, job-server, job-dashboard, shared packages

---

## Baseline Results

| Claim | Status | Detail |
|---|---|---|
| Epic 6 file-size hygiene | **STALE** | `applications.js` = 1 LOC, `auto-apply.js` = 5 LOC. Already split. No file in split dirs exceeds 500 LOC. |
| Shared packages dead code | **PARTIAL** | `@resume/shared` = 117 non-test imports. `@resume/types`, `@resume/schemas`, `@resume/contracts` = 0 non-test imports. |
| Profile sync one-way | **FAIL** | SSoT → platforms exists. Crawlers → SSoT missing. Git history shows only human commits. |
| No external enrichment | **PARTIAL** | GitHub API: false. LinkedIn/AI exist for job apps, not portfolio/resume enrichment. |
| Build pipeline stale | **STALE** | `worker.js` is newer than `resume_data.json` by ~46.8 hours. Fresh. |

---

## Confirmed Gaps (Require Action)

### Gap 1: `@resume/types`, `@resume/schemas`, `@resume/contracts` Adoption

**Finding:** `@resume/shared` is actively adopted (117 non-test imports across apps), but `@resume/types` has **zero** non-test imports, `@resume/schemas` has **zero** non-test imports, and `@resume/contracts` has **zero** non-test imports.

**Impact:** Apps still define their own types locally, causing drift risk between portfolio, job-server, and job-dashboard.

**Action:** Migrate app-local JSDoc/TS type definitions to `@resume/types`. Replace hand-rolled validators with `@resume/schemas`.

**Files to audit:**
- `apps/portfolio/lib/validators.js` — hand-rolled validation, does NOT use `@resume/schemas`
- `apps/job-server/src/` (search for `typedef`, `@typedef`, `interface`)
- `apps/job-dashboard/src/` (search for local type definitions)

---

### Gap 2: Bidirectional Profile Sync

**Finding:** `unified-resume-sync.js` pushes SSoT data TO job platforms (wanted, jobkorea, linkedin, etc.), but crawlers do NOT write enriched profile data back to `packages/data/resumes/master/resume_data.json`.

**Evidence:**
- `apps/job-server/src/crawlers/` — no write references to `packages/data/` or `resume_data.json`
- Git history on `resume_data.json` (last 5 commits):
  - `ad7d21f0 data(resume): apply Oracle-reviewed wording fixes`
  - `ae8e8620 feat(resume): enhance career descriptions and remove duplicate award`
  - `970168dc data(resume): enhance career roles and descriptions`
  - `8ad65cda fix(resume): correct project field for ITCEN CTS`
  - `31456d09 fix(jobkorea): use careerSummary.ko for M_Career_Text instead of coverLetter.ko`
  
  None are from crawlers or automation.

**Impact:** Job application history, skill evolution, and platform-specific insights are lost to the SSoT.

**Action:** Design a reverse sync pipeline where crawlers/extractors write enriched data back to SSoT as **proposals** (human-reviewed before merge).

**Approach:** Proposal-first architecture
1. Crawler extracts new data (e.g., skills from job history)
2. Generates a `.proposal.json` patch
3. CLI tool or n8n workflow presents proposal for review
4. Human approves → merged into `resume_data.json`
5. Auto-rebuild portfolio

**Files involved:**
- `apps/job-server/src/crawlers/`
- `apps/job-server/src/tools/unified-resume-sync.js`
- `packages/data/resumes/master/resume_data.json`

---

### Gap 3: Portfolio-Focused External Enrichment

**Finding:** GitHub, LinkedIn, and AI integrations exist, but they are job-application-focused, not portfolio/resume-enrichment-focused.

**Evidence:**
- **GitHub API:** `false` — no `api.github.com`, `github.com/api`, or `octokit` usage in app source (excluding node_modules and `.wrangler/`).
- **LinkedIn:** Exists for job application sync (`linkedin-strategy.js`, `platform-crawlers.js`), but no profile enrichment that writes back to `resume_data.json`.
- **AI:** OpenAI/Anthropic providers exist (`apps/job-server/src/shared/services/ai/`) for job matching and cover letters, but NOT for parsing or enriching `resume_data.json`.

**Impact:** Resume SSoT does not benefit from external data (GitHub repos, LinkedIn endorsements, AI-extracted skills).

**Action:** Add portfolio-focused enrichment pipeline:
- GitHub API → project list + contribution stats
- LinkedIn API → endorsements + job history
- AI parser → skill extraction from job descriptions

**Files involved:**
- `apps/job-server/src/shared/services/ai/`
- `apps/job-server/src/auto-apply/strategies/linkedin-strategy.js`
- `apps/job-server/src/crawlers/unified/platform-crawlers.js`

---

## Stale Assumptions (No Action Needed)

### Assumption 1: Epic 6 File-Size Hygiene

- `apps/job-dashboard/src/handlers/applications.js` is **1 LOC** (thin re-export to `./applications/index.js`).
- `apps/job-dashboard/src/handlers/auto-apply.js` is **5 LOC** (thin re-exports to `./auto-apply/*.js`).
- Split directories exist:
  - `apps/job-dashboard/src/handlers/applications/` — 11 files, max 221 LOC (`application-repository.js`)
  - `apps/job-dashboard/src/handlers/auto-apply/` — 13 files, max 164 LOC (`match-scoring.js`)
- **No file in either split directory exceeds 500 LOC.**

**Conclusion:** Epic 6 file splits have already been completed. The AGENTS.md anti-pattern list referencing 9544L/10963L is stale.

---

### Assumption 2: Build Pipeline Stale

- `apps/portfolio/worker.js` mtime: **2026-05-10 22:53**
- `packages/data/resumes/master/resume_data.json` mtime: **2026-05-09 00:02**
- **worker.js is newer by ~46.8 hours.**
- `npm run automate:ssot` already chains `sync:data && build`, so the pipeline is correct.

**Conclusion:** No stale build detected. `sync:data` does not auto-trigger build, but `automate:ssot` handles this.

---

## Recommendations for Next Steps

1. **Migrate `apps/portfolio/lib/validators.js` to use `@resume/schemas`** instead of hand-rolled validation.
2. **Evaluate `@resume/types`, `@resume/schemas`, `@resume/contracts`** — either adopt them in app code or deprecate them to reduce maintenance overhead.
3. **Add a bidirectional sync mechanism**: crawlers → SSoT enrichment pipeline for profile data (e.g., scrape job history from platforms and update `resume_data.json`).
4. **Consider GitHub API integration** for repository/activity enrichment into `resume_data.json`.
5. **Ensure `npm run sync:data` is always followed by `npm run build`** in automation (already handled by `automate:ssot`).
6. **Document the split of `applications.js` and `auto-apply.js`** in architecture docs to close Epic 6 tracking and remove stale references.

---

## How to Reproduce

Run the verification script:

```bash
go run tools/scripts/verification/verify-context-profile-sync.go
```

The script exits with code `1` when confirmed gaps or partial truths exist, and `0` when only stale assumptions are found.

---

## Appendix: Verification Script Claims

**Claim A: Epic 6 file-size hygiene is pending**
- Check actual line counts of `applications.js` and `auto-apply.js`
- FAIL if either > 500 LOC (per architecture rules)
- Also check if these are thin re-exports (< 50 LOC importing from other files)

**Claim B: Shared packages are dead code**
- Search for imports of `@resume/types`, `@resume/schemas`, `@resume/shared`, `@resume/contracts` across apps
- Check `apps/portfolio/lib/validators.js` — does it use `@resume/schemas` or hand-roll?
- FAIL if zero imports found across all apps

**Claim C: Profile sync is one-way**
- Check `apps/job-server/src/crawlers/` for any code that writes to `packages/data/`
- Check if crawlers output to SSoT resume_data.json or separate config files
- Check `packages/data/resumes/master/resume_data.json` modification history (git log)
- FAIL if no evidence of crawlers writing back to SSoT

**Claim D: No external profile enrichment**
- Search for GitHub API integration in the codebase
- Search for LinkedIn sync
- Search for any AI/parser integration for resume updates
- FAIL if none found

**Claim E: Build pipeline gaps**
- Check if `npm run sync:data` triggers a portfolio rebuild
- Check if `apps/portfolio/worker.js` timestamp is newer than `packages/data/resumes/master/resume_data.json`
- FAIL if resume data is newer than worker.js (indicates stale build)
