# Changelog

All notable changes documented automatically from conventional commits.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), [Semantic Versioning](https://semver.org/).

## [v1.0.129] - 2026-04-14

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
