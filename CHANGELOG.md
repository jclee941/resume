# Changelog

All notable changes documented automatically from conventional commits.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), [Semantic Versioning](https://semver.org/).

## [v1.0.129] - 2026-04-14

## [v1.5.5] - 2026-04-19

### Changes
- refactor(dashboard): split notifications service into N modules (d338bb9)
- refactor(dashboard): split application workflow into N modules (9a4bb1a)


## [v1.5.4] - 2026-04-19

### Changes
- refactor(pipeline): split job-search-apply-pipeline into N modules (cf46f45)


## [v1.5.3] - 2026-04-19

### Changes
- docs: update AGENTS.md hierarchy for portfolio + profile-sync changes (d3ddee7)


## [v1.5.2] - 2026-04-19

### Changes
- test(profile-sync): add portfolio field mapping unit tests (133c230)


## [v1.5.1] - 2026-04-19

### Changes
- fix(profile-sync): use AddUserFileDB for portfolio URL registration (010103c)


## [v1.5.0] - 2026-04-19

### Changes
- feat(profile-sync): add portfolio field mapping and automate via pipeline (d5fe0ca)


## [v1.4.0] - 2026-04-19

### Changes
- feat(portfolio): align site content with enriched SSoT — DevSecOps/SRE positioning (dad2f7d)
- chore: clean up stale test artifacts and regenerate playwright report (92650ee)
- refactor(profile-sync): modernize truncation to template literals (20b9e66)
- feat(release): add portfolio build and Cloudflare Workers deploy to release pipeline (5a3bd90)


## [v1.3.1] - 2026-04-19

### Changes
- chore(portfolio): sync enriched resume data to portfolio build (f96b26a)


## [v1.3.0] - 2026-04-19

### Changes
- feat(auto-apply): add renew-wanted-session script + pipeline headless fix (d09343f)


## [v1.2.1] - 2026-04-19

### Changes
- docs: README redesign + legacy cleanup + stale doc fixes (f08b4a7)


## [v1.2.0] - 2026-04-19

### Changes
- fix(ci): resolve all test-node failures — API fallback with retry+circuit breaker, resume key mock fix (973933b)
- fix(ci): fix lint errors (singlequote) and update cover letter tests for new template format (b0ce370)
- fix(data): sync cover letter quality content to Wanted profile — remove job-specific phrasing, add structured achievements (94c0a9d)
- fix(data): remove inflated metrics from resume — 95%, 99.99%, 50%, etc. (9f5a983)
- feat: auto-apply browser-based submission + cover letter enhancement + profile enrichment (1b80736)


## [v1.1.1] - 2026-04-15

### Changes
- fix(deploy): remove stale JOB_SERVICE binding from wrangler.json (9c8acbe)


## [v1.1.0] - 2026-04-15

### Changes
- chore(data): sync SSoT resume data and rebuild portfolio worker (a4fc63d)
- fix(profile-sync): truncate Wanted fields to API limits and fix JobKorea selectors (1d5281b)
- fix(jobkorea-sync): empty M_MainField/M_MainJob to prevent code display (58abefa)
- fix(ci): align tests with v2 migration and remove duplicate Referer (08ceecd)
- docs: update README with job automation and recent changes (a0d9b75)
- feat(auto-apply): update wanted strategy to Chaos applications v1 (7f0ea74)
- fix(wanted-sync): make activities sync idempotent (fd9dafa)
- fix(wanted-sync): migrate getDetail to v2 and add Referer header (10437b6)
- chore(data): fix career durations and add awards to resume SSoT (5a9d9ae)
- fix(jobkorea-sync): remove achievements fallback, add structured awards (b8469fd)


## [v1.0.131] - 2026-04-14

### Changes
- fix(wanted-sync): truncate profile fields to Wanted API limits (headline 50, description 150) (79bfbc6)


## [v1.0.130] - 2026-04-14

### Changes
- fix(e2e,wrangler): accept degraded health status, disable JOB_SERVICE binding (e4e89b7)


### Changes
- fix(docs): remove stale GitLab CI and dark mode toggle references (973eb14)
