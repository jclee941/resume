# Changelog

All notable changes documented automatically from conventional commits.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), [Semantic Versioning](https://semver.org/).

## [v1.0.129] - 2026-04-14

## [v1.10.3] - 2026-04-28

### Changes
- chore(data): consolidate SSoT — remove backups, relocate shinhan variants (7f03f11)


## [v1.10.2] - 2026-04-27

### Changes
- data(careers): correct Jointree and MTData workType to dispatched (f69ae81)


## [v1.10.1] - 2026-04-27

### Changes
- ci(release): restore production deploy via wrangler-action with global API key (0dc22b1)


## [v1.10.0] - 2026-04-27

### Changes
- feat(csp): switch to dynamic per-response nonce + strict-dynamic (76661ed)


## [v1.9.6] - 2026-04-27

### Changes
- fix(csp): expand allowed Cloudflare/GA hashes and connect-src (84a07a7)


## [v1.9.5] - 2026-04-27

### Changes
- chore: trigger Cloudflare Workers Builds redeploy (3d61b59)


## [v1.9.4] - 2026-04-27

### Changes
- fix(csp): allow data: in img-src, add Cloudflare challenge script hash (6f7fb6c)


## [v1.9.3] - 2026-04-27

### Changes
- ci(release): remove duplicate wrangler deploy step (8754f4a)


## [v1.9.2] - 2026-04-27

### Changes
- docs(readme): redesign with minimal modern tone (Linear/Vercel style) (85bea3e)


## [v1.9.1] - 2026-04-27

### Changes
- docs(readme): sync structure with current monorepo (types/schemas/contracts, ja locale, ADR-0008) (9dfeb3f)


## [v1.9.0] - 2026-04-27

### Changes
- docs(plan): record 2026-04-27 execution status of Epics 0-5 (0a132ad)
- test(epic-5): remove legacy GitLab YAML check after .gitlab-legacy/ deletion (94ba1fb)
- docs(epic-5): cleanup legacy artifacts, relocate rules, refresh AGENTS.md (c494bff)
- feat(epic-4): scaffold canonical SSoT modules in @resume/shared (9036c86)
- feat(epic-2): create @resume/types, @resume/schemas, @resume/contracts (90dd908)
- build(epic-1): drop Bazel facade, fix tsconfig, decouple ESLint, workspace:* (01ad9b4)
- security(playbook): redact gitlab/grafana token examples to satisfy gitleaks (bd45820)
- security(epic-0): purge committed secrets, harden gitignore, add CI gate (dcb2c1b)


## [v1.8.1] - 2026-04-24

### Changes
- fix(ci): remove duplicate YAML entries causing workflow failure (d11984e)
- Merge branch 'master' of https://github.com/jclee941/resume (f7efbcf)
- ci: resolve deprecation and cache warnings (ab8af4c)


## [v1.8.0] - 2026-04-23

### Changes
- fix(test): update auto-applier strategy test for modularized wanted-helpers (f9cc595)
- fix(ci): remove duplicate run key in validate-go job (bffece8)
- chore: raise file size limit from 200 to 500 LOC (538c0b0)
- chore(gitignore): ignore generated dashboard.html (45c6220)
- docs: add wishket portfolio and n8n workflow export (4a0aba3)
- fix(ci): use temporary directory for individual Go script builds (7e31712)
- Merge branch 'master' of https://github.com/jclee941/resume (2986192)
- refactor: split renew-jobkorea-session into modular session helpers (d90db10)
- refactor: split application-tracker into lifecycle and analytics modules (160b2d3)
- refactor: split approval-manager into workflow state modules (1c0237a)
- refactor: split performance-metrics into core, reporter, and decorators (0df6865)
- refactor: extract wanted-strategy helpers into focused modules (ed3c813)
- refactor: split application-repository into reader and writer modules (8a51726)
- refactor: split auto-apply-config into helpers and validation modules (1e2136c)
- refactor: split job-matcher into domain-specific scoring modules (de47807)
- feat: migrate n8n operational scripts from shell to Go (2103eb2)
- chore: add per-package ESLint flat configs (f3cfdde)
- ci: add Go build validation to GitHub Actions workflow (0419613)
- chore: clean up binary artifacts and update AGENTS.md inventory (8d3b03e)
- docs(cf): update wrangler config references (b9b3c2e)
- chore(cf): migrate portfolio wrangler config to jsonc (0a9e7eb)
- chore(git): remove unused natively submodule (d4900ba)
- chore(ts): add local tsconfig extending root for job-dashboard (9d80da9)
- fix(deps): use file protocol for internal shared dependency (a9ac4c0)
- chore(git): remove generated PDF artifacts from tracking (0fff205)
- fix(gitignore): add missing patterns for tooling artifacts (6166f39)
- fix(lint): exclude natively submodule and ephemeral dirs from eslint (6e81550)
- fix(wanted): preserve about when source content is empty (27c785e)


## [v1.7.0] - 2026-04-21

### Changes
- feat(wanted): append awards and achievements to composed about (a0f0d9a)
- feat(wanted): compose personalProjects into about section (fc10647)


## [v1.6.0] - 2026-04-20

### Changes
- fix(jobkorea): fail loud on portfolio URL and CAPTCHA errors (ed77d5c)
- fix(jobkorea): fail loud on portfolio URL and CAPTCHA errors (355889e)
- chore(jobkorea): migrate rNo to JOBKOREA_RNO env var (68bcd79)
- fix(jobkorea): drive HopeJob roles and locations from SSoT hope section (ff44b60)
- fix(jobkorea): expand change-detection patterns to 15+ additional form fields (87ccebe)
- fix(jobkorea): wire MCP live mode through profile-sync CLI delegation (9dd6e38)
- feat(wanted): sync career.projects[] sub-projects with techStack and achievements (3ed3586)
- docs(schema): expand resume_schema.json to match SSoT (f710a71)
- feat(auth): add JobKorea session renewal script (2e2e7a8)
- fix(data): add education.schoolType/majorType and hope.* to all locales (8375953)
- fix(data): restore JA personal portfolio and summary parity (8bfa0ce)
- fix(data): restore platformVariants to EN and JA resume SSoT (487ba89)
- fix(wanted): stop wiping manual projects and foreign activities (144b705)
- fix(skills): route 7 unmapped skills via aliases to nearest tag (1c31815)


## [v1.5.20] - 2026-04-20

### Changes
- chore: flush uncommitted wip (job-matcher refactor + interview prep + submodule bump) (91001e8)


## [v1.5.19] - 2026-04-20

### Changes
- fix(resume): restore 7 careers profile sync + close unbalanced CSS braces (fa72646)


## [v1.5.18] - 2026-04-20

### Changes
- chore: add natively as submodule under apps/natively (08e5ed3)


## [v1.5.17] - 2026-04-20

### Changes
- docs: add 강남언니 보안엔지니어 면접 준비 자료 (c22f5c8)


## [v1.5.16] - 2026-04-19

### Changes
- build(portfolio): rebuild worker with latest resume PDF (b04ad88)


## [v1.5.15] - 2026-04-19

### Changes
- fix(data): update availability to immediate, sync+rebuild portfolio (4f8fd1c)


## [v1.5.14] - 2026-04-19

### Changes
- fix(lint): resolve all unused-vars warnings across 4 files (1903b5d)


## [v1.5.13] - 2026-04-19

### Changes
- refactor(shared): split lazy-loader into N modules (36edaf3)


## [v1.5.12] - 2026-04-19

### Changes
- refactor(profile-sync): split profile-sync entry into N modules (e9cc702)


## [v1.5.11] - 2026-04-19

### Changes
- refactor(apply): split retry-service into N modules (0c810f4)
- refactor(profile-sync): split jobkorea handler into N modules (82806de)


## [v1.5.10] - 2026-04-19

### Changes
- refactor(shared): split parallel service into N modules (fef52a3)


## [v1.5.9] - 2026-04-19

### Changes
- refactor(crawlers): split base-crawler into N modules (7203e1f)
- refactor(dashboard): split views scripts into N modules (5a5490f)


## [v1.5.8] - 2026-04-19

### Changes
- refactor(tools): split auto-apply tool into N modules (e14b875)


## [v1.5.7] - 2026-04-19

### Changes
- fix(session-broker): remove storage barrel import cycle (58f271d)
- refactor(notifications): split telegram adapter into 5 modules (01a5e62)
- refactor(session-broker): split service into N modules (0609633)


## [v1.5.6] - 2026-04-19

### Changes
- refactor(saramin): split profile-sync into N modules (e63f834)


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
