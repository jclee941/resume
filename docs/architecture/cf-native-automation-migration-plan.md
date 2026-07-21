# Cloudflare-Native Automation Migration Plan

> Generated from an adversarial 4-surface audit (2026-07-21). Status: PLAN — no migrations executed yet.

## Executive Summary

The surface is already ~80% CF-native: deploy runs on Workers Builds (GitHub does only dry-runs), the daily job is a real Cron Trigger, 8 Workflows + Queues (with DLQs) + BrowserSessionDO + Browser Rendering + KV/D1 are all bound and deployed. The remaining work is NOT lift-and-shift; it is (1) wiring gaps where CF machinery exists but has no caller (ResumeSyncWorkflow has no cron, BrowserSessionDO has zero callers, session store is still a file), (2) moving pure-fetch auth (Wanted OneID token mint) server-side into scheduled()->KV, which is the root unblocker for everything downstream, and (3) porting a handful of Node-puppeteer browser crawlers onto the MYBROWSER binding. A hard tail of work is genuinely blocked by platform limits (non-headless/VNC captcha login, CDP scrape of a local human Chrome, JA3 TLS fingerprinting) and by design should stay off-CF, alongside all GitHub-native PR automation and the GitHub PR status-check matrix. The deploy/CI foundation is done, so waves are ordered by leverage: cheap additive wiring first, then activating dormant CF infra, then the browser ports that depend on it.

## Migration Waves

### Wave 0 — Foundation (already done) — confirm and de-duplicate

**Rationale:** Workers Builds is already the sole deploy path (package.json deploy is hard-disabled, all wrangler deploy calls are --dry-run, wrangler.jsonc build.command runs npm run build on push). No deploy foundation to build. Only action is removing redundancy so later waves build on a clean base: the nightly auto-sync-data.yml (verify:ssot) duplicates ci.yml's validate-data SSoT drift gate, and sync:data (data.json generation) already runs inside Workers Builds.

**Depends on:** none

- Confirm Workers Builds is the exclusive deploy mechanism; keep package.json deploy disabled
- Delete or fold auto-sync-data.yml nightly cron into ci.yml validate-data (redundant re-run of an existing PR gate; verify:ssot needs a repo checkout so it is CI, never a Cron Trigger)
- Confirm sync:data / data_en/ja.json emission stays inside npm run build (Workers Builds) — no separate cron

### Wave 1 — Wiring gaps + auth root-unblocker (S, low risk, additive/reversible)

**Rationale:** Highest leverage per line changed: all CF primitives already exist, only the triggers/writes are missing, and each change is purely additive (remove the branch to revert). Moving the Wanted OneID token mint (mintWantedCookies -> POST id-api.wanted.co.kr -> KV SESSIONS) server-side is the single change that unblocks the entire browser/apply chain, because every downstream crawler reads auth:wanted from KV.

**Depends on:** Wave 0

- Add a Cron Trigger -> scheduled() branch that calls env.RESUME_SYNC_WORKFLOW.create({params}) (reuse 0 23 or add an entry); the workflow is fully built and only lacks a cron->create trigger
- Move Wanted OneID token mint (mintWantedCookies, pure fetch) into scheduled(); write cookies to KV SESSIONS as auth:wanted — replaces browser fallbacks and is the root auth unblocker
- Swap file session store (session-store-factory createFileSessionStore) to KV SESSIONS (createMemorySessionStore/KV variant already exists on the CF side)
- Add the systemd-timer schedules as extra cron expressions in wrangler.jsonc (e.g. 00:00 and 01:00 UTC = 09:00/10:00 KST) and branch scheduled() by controller.cron; retire the corresponding systemd timers + install.go once each job is server-side
- Retire the Wanted branch of sync:platforms CLI once the cookie lives in KV (native syncToWanted already mirrors it)

### Wave 2 — Activate dormant CF browser infra (M, med risk) — prerequisite for ports

**Rationale:** BrowserSessionDO is deployed (migration v1) but returns a sessionId that is not connectable and has zero callers; the two Node launcher functions (withStealthBrowser/launchStealthBrowser) are the single seam every browser crawler funnels through. Building a MYBROWSER-backed drop-in and making the DO hand out connectable CF puppeteer.sessions() ids turns the later crawler ports into mostly-config changes.

**Depends on:** Wave 1

- Activate BrowserSessionDO as the account-wide concurrency broker: expose CF puppeteer.sessions() ids for puppeteer.connect(), reconcile hardcoded MAX_CONCURRENT=2 with the per-account Browser Rendering cap, tune KEEP_ALIVE_MS vs the ~60s idle-close
- Provide a BrowserService(env.MYBROWSER)-backed drop-in for withStealthBrowser/launchStealthBrowser (safeBrowserClose -> browser.close(); reuse via session-id connect instead of long-lived handles)
- Rebuild the Node BrowserPool reuse logic on CF session ids + DO storage.setAlarm() cleanup (drop setInterval/unref); size the pool against the account-global cap, not per-worker

### Wave 3 — Port Node-puppeteer crawlers to MYBROWSER + dedupe (M, med risk)

**Rationale:** With the launcher seam (Wave 2) and cookies-in-KV (Wave 1) in place, JobKorea is the lowest-friction win (already injects this.browserRunner; page APIs used are all supported by @cloudflare/puppeteer). Main residual risk is anti-bot: CF datacenter egress IPs raise block/CAPTCHA odds and lose base-crawler TLS-fingerprint stealth — validate JobKorea/Saramin before spending scarce browser-concurrency budget.

**Depends on:** Wave 1; Wave 2

- Port JobKorea browser crawl (searchWithBrowser/getJobDetail) from withStealthBrowser to BrowserService.newPage() via JobCrawlingWorkflow / crawl-tasks queue
- Reconcile Saramin + Remember browser paths: confirm a browser is actually needed vs the existing fetch path (crawlRemember already fetch-based) before porting
- Retire the Node-runtime WantedCrawler duplicate — Wanted needs no browser and crawlWanted is already CF-native fetch()

### Wave 4 — Consolidate auto-apply + notifications onto the native runtime (L, med risk)

**Rationale:** AutoApplyScheduler is half-migrated (already writes createAutomationRun/completeAutomationRun to D1); the CF-native shape is Cron Triggers own the schedule, a DO owns the singleton overlap-lock + currentRun, D1 owns history. The Telegram send is already CF-native via the notifications queue, so the standalone cron scripts should be dissolved, not ported.

**Depends on:** Wave 1; Wave 3

- Move auto-apply-cron OneID refresh into scheduled() writing KV (overlaps Wave 1); drop the Puppeteer/CDP local-browser fallback strategies
- Re-home AutoApplyScheduler: Cron Triggers for schedule, a Durable Object (BrowserSessionDO pattern) for the overlap-lock + in-flight state, D1 for history/stats; delete parseCronExpression/findNextRun
- Dissolve send-jobs-telegram.js into JobCrawlingWorkflow (crawl) + notifications Queue (send); replace the local submit-queue.json input with a D1/R2/Queue payload
- Ensure TELEGRAM_BOT_TOKEN/CHAT_ID are Worker Secrets at the edge (delivery code needs no change)

### Wave 5 — Browser-based multi-platform profile sync (XL, high risk) — the real tail

**Rationale:** This is the bulk of remaining effort and the known non-native gap (resume-sync-platforms.js already stubs syncToLinkedIn/syncToRemember with 'requires browser automation - delegate to job-server'). It is a full Playwright->@cloudflare/puppeteer rewrite, needs Workflow-step-per-platform (not a serial loop) to respect concurrency/duration caps, and depends on the captcha + HttpOnly-cookie decisions being resolved first.

**Depends on:** Wave 2; Wave 4; Owner decisions on captcha + browser anti-bot risk

- Rewrite profile-sync handlers (jobkorea/saramin/remember/jumpit/programmers/rallit/rocketpunch/indeed/linkedin) from Playwright launchPersistentContext to a CF Workflow with one durable step per platform, cookies loaded from KV/DO and injected via page.setCookie()
- Validate @cloudflare/puppeteer CDP Network.setCookie support for the auto-apply HttpOnly OneID token injection BEFORE committing (blocks the auto-apply browser path if unsupported)
- Migrate auto-apply browser-helpers cookie loading from fs/homedir to KV SESSIONS / D1

## Recommended First Slice

- **What:** Add a Cron Trigger -> scheduled() branch that calls env.RESUME_SYNC_WORKFLOW.create({params}), wiring the already-complete ResumeSyncWorkflow (export -> diff -> KV backup -> sync -> verify -> D1 history -> telegram) to a schedule. Reuse the existing 0 23 cron or add one entry in wrangler.jsonc and one branch in the scheduled-cliproxy chain.
- **Why:** Smallest possible change with the highest leverage: the entire native pipeline already exists and is bound (RESUME_SYNC_WORKFLOW, KV SESSIONS, JOB_DB, telegram delivery) — the only gap is the missing cron->create trigger. It is purely additive (revert by deleting the branch), touches no browser/anti-bot surface, exercises the full CF-native data-sync path end-to-end, and proves the scheduled()->Workflow pattern that Waves 1 and 4 reuse. Audit 3 explicitly rates it 'Low risk, high leverage'.
- **Effort:** S

## Keep Off-CF (by design)

- ci.yml 13-job PR matrix: branch-protection required checks are a GitHub construct with no CF equivalent; Workers Builds runs one build command in one container and cannot post 13 independent required checks. Keep as the GitHub PR gate.
- release.yml: GitHub Releases API, git tags, and reproducible-source artifact publishing are GitHub-native; CF has no release/tag registry (R2 could hold the tarball but not the release semantics).
- All GitHub PR automation (01_branch-to-pr, 10_pr-review, 11_security-pr-review, 12_dependabot-auto-merge, 13_pr-auto-merge, 14_bot-auto-fix): driven by GitHub push/PR/review events and gh CLI; no CF equivalent for PR lifecycle. Only the MiniMax LLM call could optionally move to the Workers AI binding.
- provision-queues.yml and delete-standalone-job-worker.yml: one-shot CF-API runbooks (already wrangler/api.cloudflare.com); nothing recurring to schedule. Likely already spent — retire rather than migrate.
- MCP stdio server (apps/job-server/src/index.js): Workers have no stdin/stdout process model; it is local dev tooling, not scheduled automation. Off-CF by design (a hosted variant would be a rewrite to MCP-over-HTTP).
- Fastify server/dashboard: every route is already re-implemented as CF Worker handlers; server.listen/SIGTERM lifecycle has no Workers analogue. Retire as the dev mirror, do not port.
- Host-resource halves of ops:monitor / ops:maintenance / metrics-exporter.js (uptime/free/df, log/tmp/backup housekeeping, Prometheus file-scrape on :9101): these introspect the self-hosted box; Workers are serverless with no host. App-level halves are already covered by HealthCheck/Cleanup/Backup Workflows + observability/Analytics Engine.
- session-broker (docker-compose non-headless VNC stack, CLOAK_BROWSER_HEADLESS=false, persistent Chrome profile): CF Browser Rendering is headless-only with ephemeral sessions and per-account concurrency caps; human-assisted captcha/2FA login cannot run on it. Keep self-hosted; feed resulting cookies into KV out-of-band.
- Manual-CAPTCHA session renewal (renew-jobkorea-session.js HEADLESS=false, 180s human window) and auto:extract CDP scrape (port 9222 on a logged-in desktop Chrome): human-in-the-loop and local-browser only — fundamentally not portable to a stateless headless Worker.
- TLS-fingerprint (JA3) fetch layer (base-crawler/tls.js undici custom dispatchers): Workers fetch() has a fixed TLS stack with no per-request fingerprint control. base-crawler already auto-degrades to standard fetch, so accept reduced TLS stealth on CF egress or keep fingerprint-sensitive fetches off-CF.
- vault-seed.go Supabase Vault (pgsodium vault.set_secret): D1 has no secret-encryption extension or stored procedures — this is a RETARGET to CF Secrets Store / wrangler secret, not a Postgres->D1 port. This is the only runtime Supabase dependency; sync data already lives in D1, so Postgres->D1 for the sync surface is N/A.
- auto:verify leg (npx tsc --noEmit + worker build): a CI/Workers-Builds concern, not runtime automation — belongs in CI, not a Cron Trigger.

## Open Questions (need owner decision)

- Self-hosted runner: 13_pr-auto-merge.yml has a HARDCODED runs-on: self-hosted (line 38, not visibility-conditional) on a PUBLIC repo for a job that runs pure gh CLI with no build — is this a bug (jobs may never be picked up)? Should it be ubuntu-latest? And why do 10/11/14 prefer NAS-backed pip/venv/Go caches that Workers Builds does not address?
- Captcha strategy: JobKorea login is captcha-gated. Is a third-party captcha-solving API acceptable (cookies then pushed to KV), or does manual/human renewal stay permanently off-CF via the session-broker? This decision gates Wave 5 and the JobKorea auth path.
- Browser Rendering anti-bot risk: CF datacenter egress IPs raise block/CAPTCHA odds and lose base-crawler TLS-fingerprint stealth. Acceptable for JobKorea/Saramin crawls, or keep those specific crawls off-CF? (Wanted is safe — fetch-only.)
- @cloudflare/puppeteer CDP support: does it expose Network.setCookie via createCDPSession for HttpOnly cookie injection (auto-apply OneID token)? page.setCookie() cannot set HttpOnly, so if CDP setCookie is unsupported the auto-apply browser path is blocked, not partial — needs verification before Wave 5 scheduling.
- Browser Rendering concurrency cap: default is ~3-10 concurrent browsers per account; the profile-sync loop touches 9+ platforms. Is a paid-plan raise required, or is Workflow-step-per-platform serialization sufficient?
- Secrets ownership: who provisions Worker Secrets / CF Secrets Store for TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, WANTED/JOBKOREA/SARAMIN credentials, and JOBKOREA_RNO/cookies? And does vault-seed.go retarget to CF Secrets Store or stay on Supabase Vault as an off-CF ops tool?
- Retire-vs-keep timing: should the Fastify server, MCP stdio server, systemd timers + install.go, and host ops scripts be retired now that CF mirrors exist, or kept as self-hosted dev/convenience mirrors until the OneID-API auth refresh is fully server-side?

## Appendix — Full per-surface audit

### CI/CD & repo automation (.github/workflows/*.yml + deploy/build scripts in package.json & wrangler.jsonc)

**Already CF-native:**

- Deployment is already Workers Builds, not GitHub Actions: package.json:45 hard-disables `deploy` ('Manual deploy is disabled. Use git push to master for Cloudflare Workers Builds.'), and no workflow deploys — every `wrangler deploy` in ci.yml:365-366 and release.yml:129 is `--dry-run`. wrangler.jsonc:7-10 `build.command: npm run build` is what the managed Workers Builds container runs on each push/PR.
- Daily scheduled job is already a CF Cron Trigger: wrangler.jsonc:41-43 `triggers.crons: ['0 23 * * *']` fires the Worker's `scheduled()` handler (apps/portfolio/entry.js:196 -> jobWorker.scheduled). No GitHub schedule involved.
- Async/orchestration runtime fully bound in wrangler.jsonc: Queues crawl-tasks + notifications + DLQs (112-135), 7 Workflows (75-111), Durable Object BrowserSessionDO (30-35,50-57), D1 DB+JOB_DB (58-69), KV SESSIONS/RATE_LIMIT_KV/NONCE_KV (70-74), Browser Rendering MYBROWSER (47-49), Workers AI (44-46).
- Observability is CF-native: wrangler.jsonc:11-25 persists logs + traces at the edge; CI does not ship telemetry.
- CI validates the CF config without deploying: ci.yml `wrangler-dry-run` (348-366) packages production+preview with `--dry-run`, `merged-worker-e2e` (368-383) exercises the merged Worker, and validate-go runs tools/ci/validate-cloudflare-native.go (290) + verify:worker-config (360) to gate the binding inventory.
- Repo is PUBLIC, so every conditional `github.repository_visibility == 'private' && 'self-hosted' || 'ubuntu-latest'` currently resolves to ubuntu-latest — there is effectively no self-hosted runner in the active build/deploy path.

| Item | Current | CF target | Feasibility | Effort | Risk |
|---|---|---|---|---|---|
| ci.yml (13-job PR-gating CI) | GitHub Actions: pull_request+push(master)+dispatch; 13 parallel jobs (secret-scan/gitleaks, lint, typecheck, 3x tests, validate-data, validate-go, validate-openapi, env-drift, architecture-hardening, wrangler-dry-run, merged-worker-e2e) gated by branch protection — .github/workflows/ci.yml | Workers Builds (build/dry-run half is already there); KEEP the PR status-check matrix on GitHub | keep | S | low |
| release.yml (reproducible source release) | GitHub Actions: workflow_run after CI success on master + dispatch; decides next version (Go), builds deterministic source tarball twice, gitleaks-scans it, reproduces build+dry-run, writes manifest, publishes a GitHub Release with asset — .github/workflows/release.yml | KEEP (GitHub Releases + git tags — no Cloudflare equivalent) | keep | S | low |
| post-deploy-verify.yml | GitHub Actions: push(master)+schedule('0 */6 * * *')+dispatch; waits for exact deploy SHA at /health, runs strict Playwright merged-worker production contract vs https://resume.jclee.me, opens/comments/closes GitHub Issues on failure — .github/workflows/post-deploy-verify.yml | Cron Triggers + Browser Rendering (MYBROWSER) for the 6-hourly synthetic check; KEEP the push-gated exact-SHA verification and GitHub Issue lifecycle | partial | L | med |
| auto-sync-data.yml (name: 'Verify SSoT Data') | GitHub Actions: schedule('0 0 * * *')+dispatch; runs `npm ci` + `npm run verify:ssot` (regenerates resume snapshots from repo SSoT and asserts no drift) — .github/workflows/auto-sync-data.yml | KEEP (repo-content integrity check); ideally fold into CI's existing SSoT drift gate | keep | S | low |
| provision-queues.yml | GitHub Actions: manual workflow_dispatch (confirm 'PROVISION'); `npx wrangler queues list/create` for crawl-tasks, notifications + their DLQs — .github/workflows/provision-queues.yml | KEEP (manual CF infra runbook; already uses CF-native wrangler) | keep | S | low |
| delete-standalone-job-worker.yml | GitHub Actions: manual workflow_dispatch (confirm 'DELETE-job'); one-shot CF-API migration that deletes the legacy `job` Worker + its zone route with pre-flight, smoke tests, and auto-rollback (ADR 0008 #10) — .github/workflows/delete-standalone-job-worker.yml | KEEP (one-time destructive migration; already pure CF API) | keep | S | low |
| 01_branch-to-pr.yml | GitHub Actions: push to feat/fix/hotfix/... branches + dispatch; opens a ready PR with auto-merge label when none exists, using a MiniMax LLM decision (scripts/llm_decide.py) — .github/workflows/01_branch-to-pr.yml | KEEP (GitHub PR automation) | keep | S | low |
| 10_pr-review.yml | GitHub Actions: pull_request(opened/reopened/ready/synchronize); installs pr-agent from jclee941/.github and posts an AI code review via MiniMax — .github/workflows/10_pr-review.yml | KEEP (GitHub PR review automation) | keep | S | low |
| 11_security-pr-review.yml | GitHub Actions: pull_request_target labeled 'security-review' (author-gated); runs pr-agent deep security audit via MiniMax — .github/workflows/11_security-pr-review.yml | KEEP (GitHub PR security review) | keep | S | low |
| 12_dependabot-auto-merge.yml | GitHub Actions: pull_request from dependabot[bot]; fetch-metadata, approve + enable auto-merge for patch/minor/github_actions, flag majors, self-heal BLOCKED PRs — .github/workflows/12_dependabot-auto-merge.yml | KEEP (pure GitHub-native PR/merge automation) | keep | S | low |
| 13_pr-auto-merge.yml | GitHub Actions: pull_request_review(submitted)+labeled+dispatch; enables auto-merge (squash) for human-authored PRs, self-heals stale BLOCKED PRs — .github/workflows/13_pr-auto-merge.yml | KEEP (GitHub-native auto-merge) | keep | S | med |
| 14_bot-auto-fix.yml | GitHub Actions: pull_request(opened/synchronize) on .github/scripts/docs paths; runs Go naming validator --fix and pushes fixes back to the PR branch, gated by a MiniMax LLM decision — .github/workflows/14_bot-auto-fix.yml | KEEP (GitHub PR auto-fix automation) | keep | S | low |
| Deploy & build scripts (package.json + wrangler.jsonc) | package.json `deploy` (45) hard-disabled -> Workers Builds; `build`/`build:worker` (39-40) invoked by wrangler.jsonc `build.command` (7-10). `deploy:wrangler:root` (86) exists only as a manual escape hatch — package.json, wrangler.jsonc | Workers Builds (already the deploy mechanism) | keep | S | low |

### job-server BROWSER automation (crawlers/*, browser-pool/*, session-broker, auto-apply) vs CF Browser Rendering MYBROWSER + BrowserSessionDO

**Already CF-native:**

- BrowserService wraps @cloudflare/puppeteer on env.MYBROWSER with stealth + session mgmt (newPage/browse/withPage) — packages/shared/src/browser/browser-service.js; Worker-safe, no Node globals.
- stealth-patches.js is pure JS (generateFingerprint/applyStealthPatches/humanDelay), typed for @cloudflare/puppeteer Page, no fs/process/node imports — packages/shared/src/browser/stealth-patches.js; already shared by both the CF and Node stacks.
- StealthBrowserCrawler already targets BrowserService/MYBROWSER incl. screenshot-to-R2 and CAPTCHA detection — apps/job-server/src/crawlers/stealth-browser-crawler.js (CF-native but currently unused: no `new`/`extends` anywhere).
- BrowserSessionDO implements a MYBROWSER session pool with MAX_CONCURRENT=2, keep-alive, idle-timeout eviction via storage.setAlarm() — apps/job-dashboard/src/durable-objects/browser-session-do.js; bound as BROWSER_SESSION and migration v1 in wrangler.jsonc (deployed but has no caller: no env.BROWSER_SESSION.get()).
- Deployed crawl path is browserless Worker fetch(): crawlWanted (Wanted /api/v4), crawlLinkedIn (guest HTML), crawlRemember (career-api) — apps/job-dashboard/src/workflows/job-crawling/platform-crawlers.js, driven by JobCrawlingWorkflow + crawl-tasks Queue in wrangler.jsonc.
- CAPTCHA *detection* (CaptchaDetector.detectInHtml) is pure HTML inspection and already runs in the CF path — consumed by apps/job-server/src/crawlers/stealth-browser-crawler.js:121.

| Item | Current | CF target | Feasibility | Effort | Risk |
|---|---|---|---|---|---|
| JobKorea crawl (search + job detail) — real-browser SPA render | Node puppeteer via withStealthBrowser (import('puppeteer'), PUPPETEER_EXECUTABLE_PATH) — apps/job-server/platforms/jobkorea/jobkorea-crawler.js (searchWithBrowser L89, getJobDetail L109) + apps/job-server/src/crawlers/browser-utils.js | Browser Rendering (MYBROWSER) via BrowserService/StealthBrowserCrawler, invoked from JobCrawlingWorkflow / crawl-tasks Queue consumer | direct | M | med |
| Saramin + Remember crawl (browser paths) | Node puppeteer via withStealthBrowser — apps/job-server/platforms/saramin/saramin-crawler.js (L83/L127) and apps/job-server/platforms/remember/remember-crawler.js (L101/L186) | Browser Rendering (MYBROWSER) via BrowserService | direct | M | med |
| Wanted crawl (search / detail / apply) | Pure API fetch via base-crawler rateLimitedFetch (no browser) — apps/job-server/platforms/wanted/wanted-crawler.js (apiBase /api/v4) | Workers fetch() (no Browser Rendering needed) — already realized in apps/job-dashboard/.../platform-crawlers.js crawlWanted | keep | S | low |
| Node puppeteer launcher abstraction (withStealthBrowser / launchStealthBrowser) | import('puppeteer') with --no-sandbox launch args, PUPPETEER_EXECUTABLE_PATH, protocolTimeout, browser.process().kill(SIGKILL) — apps/job-server/src/crawlers/browser-utils.js | Replace with BrowserService (env.MYBROWSER) — packages/shared/src/browser/browser-service.js | partial | M | med |
| Node BrowserPool (instance reuse pool) | In-process Node puppeteer pool: live Browser objects in a Map, setInterval cleanup, per-instance maxBrowsers=3 — apps/job-server/src/shared/services/browser-pool/{browser-lifecycle.js,pool-manager.js,resource-tracking.js} | BrowserSessionDO (already exists) fronting MYBROWSER, using CF puppeteer.sessions()/connect(sessionId) for reuse | partial | L | med |
| BrowserSessionDO activation (wire the deployed DO to actual callers) | DO exists and self-launches a browser on acquire but never returns a connectable endpoint; zero callers — apps/job-dashboard/src/durable-objects/browser-session-do.js (#handleAcquire L74) | Use DO as the single account-wide concurrency broker in front of MYBROWSER; hand out session IDs for puppeteer.connect() | partial | M | med |
| Wanted login / session mint (browser auth flow) | External Docker 'stealthy-auto-browse' HTTP microservice at localhost:8080 via CloakBrowser (+ mkdirSync persistent profileDir) — apps/job-server/src/session-broker/browser/cloak-browser.js + wanted-login-flow.js | Browser Rendering (MYBROWSER) drives the login form-fill + cookie harvest; persist session to KV (SESSIONS) / D1 instead of profileDir | partial | L | high |
| Manual-CAPTCHA session renewal (JobKorea + Wanted) | Node puppeteer with HEADLESS=false for human CAPTCHA solving, 180s manual-login window, fs session files — apps/job-server/scripts/renew-jobkorea-session.js (handleCaptchaIfNeeded, loginConfirmationTimeoutMs=180000) and renew-wanted-session.js | None for the human-in-the-loop portion | blocked | XL | high |
| Auto-apply browser flow + HttpOnly cookie injection | Node puppeteer via launchStealthBrowser; cookies loaded from fs (readFileSync/homedir/.opencode/data); CDP createCDPSession()+Network.setCookie to set HttpOnly Wanted OneID token — apps/job-server/src/auto-apply/browser-helpers.js (initBrowser L39, mintAndSetWantedToken L130) | Browser Rendering (MYBROWSER) + KV/D1 for cookie storage; CDP via @cloudflare/puppeteer | partial | L | high |
| TLS-fingerprint fetch layer (JA3 stealth) under base-crawler | undici Agent/ProxyAgent with custom TLS connect options (ciphers/curves) built by TLSFingerprintManager — apps/job-server/src/crawlers/base-crawler/tls.js + base-crawler.js | None — Workers fetch() has a fixed TLS stack with no per-request fingerprint control | blocked | S | med |

### Scheduled DATA/CONTENT sync automation (resume SSoT → job platforms, telegram notifications, secret seeding)

**Already CF-native:**

- ResumeSyncWorkflow is a real CF Workflow (apps/job-dashboard/src/workflows/resume-sync.js): export -> diff -> backup(KV SESSIONS) -> sync -> verify -> history(D1 JOB_DB.resume_sync_history) -> telegram notify. Bound as RESUME_SYNC_WORKFLOW in wrangler.jsonc.
- Master resume data already lives in D1: getMasterResumeData reads JOB_DB.resumes (apps/job-dashboard/src/workflows/resume-sync-data.js) - no Postgres in the runtime sync path.
- Wanted export + sync run over fetch to wanted.co.kr API with auth pulled from KV SESSIONS 'auth:wanted' (resume-sync-data.js exportFromWanted, resume-sync-platforms.js syncToWanted/wantedApiRequest).
- Telegram delivery is already edge-portable fetch to api.telegram.org with retry/rate-limit (apps/job-server/src/shared/services/notifications/telegram-adapter/delivery.js), consumed by the notifications queue + notification-consumer.js.
- Cron Trigger '0 23 * * *' (wrangler.jsonc triggers.crons) routes entry.js scheduled -> jobWorker.scheduled -> scheduledCliproxyAutoApply (apps/job-dashboard/src/handlers/auto-apply/scheduled-cliproxy.js).
- Queues crawl-tasks + notifications with DLQs and max_retries are declared in wrangler.jsonc; queue-workflow-dispatcher.js can create RESUME_SYNC_WORKFLOW from a queue message.
- Queue provisioning is done with wrangler via manual workflow_dispatch (.github/workflows/provision-queues.yml), not an external provisioner.

| Item | Current | CF target | Feasibility | Effort | Risk |
|---|---|---|---|---|---|
| Daily 'auto-sync-data' GHA cron (actually verify:ssot) | GitHub Actions schedule cron '0 0 * * *' running `npm run verify:ssot` -> node tools/scripts/utils/verify-resume-sync.mjs (.github/workflows/auto-sync-data.yml) | Keep on GitHub Actions (CI determinism gate); not a Cron Triggers candidate | keep | S | low |
| SSoT -> portfolio data.json generation (sync:data) | node build script tools/scripts/utils/sync-resume-data.js (via resume-sync-runner.js), invoked by `npm run build` | Workers Builds - already the build.command in wrangler.jsonc ('npm run build') | keep | S | low |
| Schedule wiring for ResumeSyncWorkflow | CF Workflow exists but is only triggered by HTTP route env.RESUME_SYNC_WORKFLOW.create (apps/job-dashboard/src/routes/workflows.js) and the queue dispatcher; no cron creates it. The 0 23 cron runs only cliproxy auto-apply. | Cron Triggers -> scheduled() branch that calls env.RESUME_SYNC_WORKFLOW.create({params}) | direct | S | low |
| sync:platforms Wanted path | Node CLI apps/job-server/platforms/sync-platforms.js -> SessionManager API (src/tools/auth.js), local session files / auto-renew via WANTED_EMAIL/PASSWORD | Already mirrored by ResumeSyncWorkflow syncToWanted (fetch) + KV SESSIONS auth | direct | S | low |
| Browser-based profile sync (jobkorea/saramin/remember/jumpit/programmers/rallit/rocketpunch/indeed/linkedin) | Local Playwright chromium.launchPersistentContext with on-disk userDataDir ~/.opencode/browser-data (apps/job-server/scripts/profile-sync/browser-handler.js, constants.js CONFIG.USER_DATA_DIR; jobkorea-handler.js, saramin-handler.js) | Browser Rendering (MYBROWSER) + BrowserSessionDO for session state, orchestrated by a CF Workflow (one durable step per platform) | partial | XL | high |
| auto:sync CDP cookie extraction / session bootstrap | node scripts/auto-all.js --sync -> auto-all/orchestration.js -> cdp-cookies.js: connects to a human desktop Chrome via --remote-debugging-port=9222 and reads local FS session files | No viable CF equivalent; optionally headless credential login inside Browser Rendering | blocked | XL | high |
| send-jobs-telegram.js (worthy-jobs -> telegram) | Node script apps/job-server/scripts/send-jobs-telegram.js: crawl mode uses local Playwright UnifiedJobCrawler (src/crawlers/unified), queue mode reads a local submit-queue.json; sends via TelegramNotificationAdapter | Fold into JobCrawlingWorkflow + Browser Rendering for the crawl; notifications queue for send; move the queue-file input to D1/R2 or a Queue message | partial | L | med |
| Telegram notification delivery | fetch to api.telegram.org with retry/rate-limit/history (telegram-adapter/delivery.js), plus optional automation webhook fallback (triggerAutomationWebhook) | Already CF-native; consumed by notifications queue + notification-consumer.js + ResumeSyncWorkflow | keep | S | low |
| vault-seed.go secret seeding (only live Supabase/Postgres dependency) | Go + pgx connecting to Supabase Postgres via SUPABASE_DIRECT_URL, calling vault.set_secret()/vault.get_secret() (Supabase Vault / pgsodium) for 30 secrets (tools/scripts/vault-seed.go) | Cloudflare Secrets Store or `wrangler secret put` / CF API - NOT D1 | blocked | M | med |
| sync:jobkorea 1Password env injection wrapper | root package.json `op:run` (go run ./onepassword/run) injecting op:// secrets + JOBKOREA_SYNC_MODE=hybrid-api around profile-sync.js jobkorea --apply | Worker Secrets (JOBKOREA_COOKIES/RNO/EMAIL) supplying the same values the vault-seed categories model | partial | M | med |

### Remaining node-runtime automation and operational scripts: apps/job-server package scripts (server/dashboard, auto/auto:sync/auto:verify, ops:daily-run/monitor/maintenance), cron entrypoints, in-process scheduler, session state backing, redis usage, and scripts/ + infrastructure/ automation (systemd timers, docker-compose session-broker).

**Already CF-native:**

- CF Cron Trigger ["0 23 * * *"] wired to the merged worker scheduled() handler which runs cliproxy auto-apply (wrangler.jsonc triggers.crons; apps/job-dashboard/src/index.js:196 -> src/handlers/auto-apply/scheduled-cliproxy.js)
- 8 Cloudflare Workflows registered and implemented: JobCrawling, Application, ResumeSync, DailyReport, HealthCheck, Backup, Cleanup (wrangler.jsonc workflows[]; apps/job-dashboard/src/workflows/*.js) - these already are the CF-native form of the daily-run/report/maintenance/backup/health jobs
- Queues crawl-tasks + notifications with DLQs and bounded batch/retry/concurrency (wrangler.jsonc queues; apps/job-dashboard/src/queues/queue-consumer.js, notification-consumer.js, notification-dlq-handler.js)
- Browser Rendering (MYBROWSER) doing REAL jobkorea/saramin form submission inside a Workflow step, with 20s page timeout and 5-min step timeout + retries (apps/job-dashboard/src/workflows/application/browser-rendering-submit.js; application-submissions.js step.do)
- BrowserSessionDO Durable Object registered for browser-session coordination (wrangler.jsonc migrations v1 + durable_objects; apps/job-dashboard/src/durable-objects/browser-session-do.js)
- @cloudflare/puppeteer StealthBrowserCrawler bound to MYBROWSER for CF-side page rendering (apps/job-server/src/crawlers/stealth-browser-crawler.js; @cloudflare/puppeteer is already an optionalDependency in apps/job-server/package.json)
- KV as the CF-native session/rate-limit/nonce store: SESSIONS (env.SESSIONS.get('auth:wanted') in apps/job-dashboard/src/workflows/application/platforms.js), RATE_LIMIT_KV, NONCE_KV (wrangler.jsonc kv_namespaces)
- D1 DB + JOB_DB holding automation-run records; scheduler already writes via d1Client.createAutomationRun/completeAutomationRun (wrangler.jsonc d1_databases; apps/job-server/src/auto-apply/scheduler.js)
- Job search/crawl via plain fetch() to platform REST APIs - no browser needed, fully CF-portable (apps/job-dashboard/src/workflows/job-crawling/platform-crawlers.js: wanted/remember/saramin fetch calls)
- LLM-backed job discovery via Cliproxy chat-completions fetch (apps/job-dashboard/src/services/cliproxy-client.js)
- CF-native auto-apply dispatch that routes jobkorea/saramin to CRAWL_TASKS queue or APPLICATION_WORKFLOW (apps/job-dashboard/src/handlers/auto-apply/native-dispatch.js)
- No Redis/ioredis anywhere in the codebase - only occurrence is a 'Redis' skill-name string in infrastructure/database/supabase/seed/seed.sql; the Redis-shaped concerns (shared session cache, rate-limit, overlap lock) already map to KV + Durable Objects

| Item | Current | CF target | Feasibility | Effort | Risk |
|---|---|---|---|---|---|
| server / dashboard scripts (Fastify HTTP app) | Long-running Fastify process (fastify listen + process signals + @fastify/static filesystem + @fastify/swagger-ui): apps/job-server/src/server/index.js (npm scripts server, server:dev, dashboard, dashboard:dev), containerized via docker-compose.yml mcp-server | Workers (already exists as the merged apps/job-dashboard worker + apps/portfolio entry.js) | keep | M | low |
| MCP stdio server (job-automation main) | @modelcontextprotocol/sdk stdio-transport server: apps/job-server/src/index.js (npm start -> node src/index.js), run in docker-compose.yml | None (Workers cannot host a stdio MCP server); optionally a remote MCP-over-HTTP Worker | keep | L | med |
| auto / auto:sync / auto:verify (unified automation runner) | node apps/job-server/scripts/auto-all.js + scripts/auto-all/*.js: CDP over ws to a local Chrome on 127.0.0.1:9222 to scrape cookies (cdp-cookies.js), execSync spawning npm/npx (platform-runners.js, verification.js), and fs reads/writes of ~/.opencode/data/<platform>-session.json | partial: ResumeSyncWorkflow / job-sync Workflow (sync); nothing for CDP cookie scrape or build-verify | blocked | XL | high |
| ops:daily-run (Go orchestrator) | go run apps/job-server/scripts/ops/auto-daily-run/main.go: a Go wrapper that exec.Command("node", ...) runs scripts/auto-all.js --extract --sync and src/auto-apply/cli/index.js (stats/search/unified/report) | Cron Trigger + scheduled() -> runAutoApply, plus DailyReportWorkflow (all already built) | partial | M | med |
| ops:monitor (Go host+app monitor) | go run apps/job-server/scripts/ops/auto-monitor/main.go: exec node cli 'stats' then shells to host uptime / free -h / df -h for CPU/mem/disk | HealthCheckWorkflow + Cron Trigger for the app-stats half; Workers observability/Analytics Engine (already enabled) for metrics | partial | M | low |
| ops:maintenance (Go housekeeping) | GO111MODULE=off go run apps/job-server/scripts/ops/auto-maintenance (main.go/cleanup.go/copy.go/command.go): deletes old logs/*.log, data/cache, *.tmp; df disk check; copies config/ + package.json into local backups/<ts>/; node/npm --version checks | CleanupWorkflow + BackupWorkflow (already registered) | partial | M | low |
| auto-apply-cron.js (systemd cron entrypoint) | node apps/job-server/scripts/auto-apply-cron.js (via infrastructure/systemd/resume-auto-apply.timer -> run-auto-apply.go): loads .env by hand, checks session, refreshes it, spawns the auto-apply CLI, appendFileSync logs to ~/.opencode/data/wanted-logs/ | Cron Trigger + scheduled() writing session to KV SESSIONS + D1 run record (partially already built) | partial | L | med |
| AutoApplyScheduler (in-process cron) | apps/job-server/src/auto-apply/scheduler.js: EventEmitter + setTimeout self-rescheduling loop, in-memory stats/history[], preventOverlapping flag, optional d1Client | Cron Triggers (schedule) + Durable Object (overlap lock + in-flight state) + D1 (history/stats) | partial | L | med |
| Session persistence (file store) | apps/job-server/src/shared/services/session/session-manager/session-store-factory.js: createFileSessionStore writing sessions.json via Node fs (existsSync/readFileSync/writeFileSync/chmodSync) | KV SESSIONS (direct) and/or D1 for queryable session metadata | direct | S | low |
| session-broker (non-headless VNC browser stack) | infrastructure/docker/docker-compose.session-broker.yml + session-broker.Dockerfile: Fastify server + psyb0t/stealthy-auto-browse container, CLOAK_BROWSER_HEADLESS=false, VNC on 5900, persistent Chrome profile volume /app/profiles/wanted (apps/job-server/src/session-broker/**, browser/cloak-browser.js) | None viable for the browser; session-broker HTTP routes already mirrored in the Worker | blocked | XL | high |
| renew-wanted-session.js / renew-jobkorea-session.js | apps/job-server/scripts/renew-wanted-session.js and renew-jobkorea-session.js: withStealthBrowser() Puppeteer login with cookie injection + DOM polling; jk-auto-sync-with-captcha.js for JobKorea captcha | Wanted: OneID API fetch (direct, no browser). JobKorea: MYBROWSER for non-captcha, else off-CF | partial | L | med |
| metrics-exporter.js (Prometheus exporter) | node apps/job-server/scripts/metrics-exporter.js: http.createServer on :9101 serving /metrics, reading ~/.opencode/data/wanted-login-metrics.json and wanted-session.json from local fs | Workers observability (already enabled) + Analytics Engine; optionally a /metrics Worker route reading D1/KV | partial | M | low |
| send-jobs-telegram.js (notification sender) | node apps/job-server/scripts/send-jobs-telegram.js: TelegramNotificationAdapter fetch to Telegram Bot API, but crawls saramin/jobkorea live and reads a local submit-queue.json | notifications Queue + notification-consumer (already built) for the send; JobCrawlingWorkflow for the crawl | partial | M | low |
| systemd timers (host scheduler) | infrastructure/systemd/resume-auto-apply.timer (09:00), infrastructure/automation/job-daily-run.timer (10:00 Asia/Seoul), resume-sync.timer (09:00) with matching .service units and install.go provisioner | Cron Triggers (wrangler.jsonc triggers.crons already has one entry) | direct | S | low |

