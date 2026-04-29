# 전체 모노레포 리뷰 — 2026-04-29

**Scope**: resume.jclee.me (portfolio + job-server + job-dashboard + 6 packages + 60 Go scripts + 28 n8n workflows)
**Method**: 5 parallel explorer agents (code quality, architecture, CI/security, docs drift, test+observability) + Oracle senior security review + 직접 sanity verification
**Repository state**: master @ `e02e53d` v1.14.7 production, 2,022 tracked files, 1,054 JS/TS, 162 tests, 47 AGENTS.md

---

## 0. TL;DR — 점검 카테고리별 점수

| 영역 | Health | Top 이슈 |
|---|---|---|
| **보안** | 🟡 P0×2, P1×7 | Cloudflare global API key, plaintext platform cookies in KV |
| **CI/CD** | 🟢 P1×3 | No manual approval gate, no Dependabot |
| **아키텍처** | 🟡 P0×2 | JOB_SERVICE binding 누락, 7 module-level singletons |
| **코드 품질** | 🟢 P1×4 | Validator 4-way duplication, 1637 LOC test-helpers untested |
| **테스트** | 🟡 P0×1 | Jest threshold 90% vs 실제 76-82% (impossible) |
| **문서** | 🟡 P1×5 | CHANGELOG semver bug, 13 BUILD.bazel 미삭제, 잘못된 SSoT 경로 |
| **Production deploy** | 🟢 | v1.14.7 healthy, /metrics 200, D1+KV bindings healthy |

전반적으로 **production-safe**. 가장 시급한 P0는 "**Cloudflare 자격증명 강화**" + "**Jest threshold 정상화**".

---

## 1. P0 — CRITICAL (즉시 조치)

### P0-1 — Cloudflare global API key 사용
**Source**: Oracle (verified: `release.yml:201`)
- `CLOUDFLARE_API_KEY: ${{ secrets.CLOUDFLARE_API_KEY }}` 변수명이 *Token*이 아닌 *Key* — Cloudflare global key 의심
- 글로벌 키는 계정 전체 권한 (blast radius)
- **조치**: Cloudflare API Token으로 교체 (`Workers Scripts:Edit` 스코프), `CLOUDFLARE_API_TOKEN` secret 추가, 글로벌 키 폐기

### P0-2 — Platform cookies plaintext in KV
**Source**: Oracle
- `apps/job-dashboard/src/handlers/auth.js:60-77` Wanted/JobKorea/Saramin 세션 쿠키를 KV에 평문 저장
- D1에는 암호화 저장하면서 KV는 평문 — KV 노출 시 active session 탈취 가능
- **조치**: 단일 helper에서 암호화/복호화 + KV에도 암호화 blob만 저장 + 기존 KV entry 마이그레이션

### P0-3 — Jest coverage threshold IMPOSSIBLE
**Source**: Test infra explorer
- `jest.config.cjs` 90% threshold, 실제 statements 76.61%, branches 75.53%
- packages/shared/src/{auth,crypto,rate-limit,retry}/* 모두 0% coverage
- CI는 `test:jest` 실행 안 하기 때문에 이 mismatch가 silent failure
- **조치**: (a) threshold를 75% 등 현실적 수치로 낮추거나 (b) browser-only 모듈을 coverageIgnorePatterns에 추가 + 누락 테스트 작성

### P0-4 — JOB_SERVICE Service Binding 누락
**Source**: Architecture explorer (verified: `apps/portfolio/wrangler.jsonc` no `services` key)
- `apps/portfolio/entry.js:22-28` 에서 `env.JOB_SERVICE.fetch()` 호출
- `apps/portfolio/wrangler.jsonc` 에 `services: [{binding: "JOB_SERVICE", service: "job"}]` 없음
- production에서는 503 fallback이 항상 발동되어 `/job/*` 라우트 미작동
- **조치**: wrangler.jsonc production env에 service binding 추가

### P0-5 — 7 Module-level singletons (anti-pattern)
**Source**: Code quality + architecture explorers
| File | Line | Pattern |
|---|---|---|
| `apps/job-server/src/shared/services/browser-pool.js` | 364 | `let globalPool = null` |
| `apps/job-server/src/shared/services/cache.js` | 351 | `let globalCache = null` |
| `apps/job-server/src/shared/services/auth/auth-service.js` | 264 | `let instance = null` |
| `apps/job-server/src/shared/services/metrics/global-metrics.js` | 3 | `let globalMetrics = null` |
| `apps/job-server/src/shared/services/stats/stats-service.js` | 141 | `let instance = null` |
| `apps/job-server/src/shared/services/lazy-loader/registry.js` | 3 | `let globalRegistry = null` |
| `apps/job-server/src/shared/services/applications/application-service.js` | 177 | `let instance = null` |

AGENTS.md `shared/AGENTS.md` 명시: **"No global state or singletons"**. 직접 위반.
- **조치**: factory 패턴 또는 DI container로 교체. 점진적 (1 service per PR).

---

## 2. P1 — HIGH

### P1-1 — Production deploy 자동화 (manual approval gate 없음)
**Source**: Oracle
- `release.yml` `workflow_run` trigger → CI success 시 자동 production deploy
- **조치**: GitHub Environment "production" 만들고 required reviewer 1명 설정

### P1-2 — `/api/auth/sync` admin auth + CSRF 우회
**Source**: Oracle (verified: `auth.js:13-18`, `index.js:115-119`)
- platform cookie 수신 endpoint이 admin 인증 우회 + CSRF 우회
- `AUTH_SYNC_SECRET` 미설정 시 fail-open 위험
- **조치**: route entry에서 `!env.AUTH_SYNC_SECRET → 503` fail-closed + 회귀 테스트

### P1-3 — `/api/auto-apply/run` CSRF 우회 (state-changing)
**Source**: Oracle (`index.js:115-118`)
- 명시적으로 `skipCsrf` 처리됨에도 state-changing endpoint
- **조치**: skipCsrf 목록에서 제거 + `X-CSRF-Token` 강제

### P1-4 — Rate limiting non-atomic (KV race)
**Source**: Oracle (`middleware/rate-limit.js:72-81`)
- KV read/put non-atomic — concurrent requests bypass possible
- **조치**: Durable Object per IP 또는 CF Rate Limiting WAF로 이전

### P1-5 — Dashboard admin token replay risk
**Source**: Oracle (`services/auth.js:76-100`)
- Long-lived bearer token + 24h cookie, no `iat`/`exp`/`jti`/revocation
- **조치**: 짧은 lifetime의 HMAC/JWT + KV revocation list

### P1-6 — `.affected/`, `.affected-review/` build cache tracked in git
**Source**: 직접 verification
- CI cache 파일 5개가 `git ls-files`에 보임
- **조치**: `.gitignore`에 `.affected/`, `.affected-review/` 추가 + `git rm --cached`

### P1-7 — JK retry 5회 = 계정 ban risk
**Source**: Oracle (`jobkorea-strategy.js:12-17`)
- `maxRetries: 5` (default 3) — captcha/rate-limit 후에도 재시도
- **조치**: 3회로 축소, captcha/auth 에러는 non-retryable 마킹

### P1-8 — public n8n webhook URL exposed in portfolio data
**Source**: Oracle (`apps/portfolio/data.json:219, 231`)
- `https://n8n.jclee.me/webhook/portfolio/demo` 가 portfolio site에 공개
- **조치**: signed token 또는 captcha 보호, 또는 read-only landing으로 교체

### P1-9 — CHANGELOG.md semver order broken
**Source**: 직접 verification
- v1.0.129 (line 6)가 v1.14.7 (line 8) 위에 배치 — release script bug
- **조치**: release.yml에서 generate-changelog 스크립트 수정 또는 manual reorder

### P1-10 — 13 BUILD.bazel 파일 미삭제 (ADR-0008 미이행)
**Source**: 직접 verification
- ADR-0008 (2026-04-27 accepted) "Drop Bazel facade"
- 13 BUILD.bazel 파일 + `tools/scripts/bazel/` 디렉터리 잔존
- **조치**: ADR-0008 cleanup PR — 모든 BUILD.bazel 삭제 + ADR-0001 update

### P1-11 — gitlab-legacy 5 Go files orphan
**Source**: Code quality explorer (verified: `tools/scripts/deployment/gitlab-legacy/{main,oauth,prereqs,runner,utils}.go`)
- Epic 5 cleanup 미완료 — 어디에서도 참조 안 됨
- **조치**: `git rm -rf tools/scripts/deployment/gitlab-legacy/`

### P1-12 — `validate-application-variants.js` zero test coverage
**Source**: Test infra explorer
- 156 LOC contract validator (방금 추가) — 0 tests
- **조치**: 6 test cases (각 contract 위반 시나리오 + happy path)

---

## 3. P2 — MEDIUM (Tech debt)

| # | 영역 | Finding | File |
|---|---|---|---|
| P2-1 | 문서 | README.md 잘못된 SSoT 경로 | `README.md:28` (`packages/data/resume_data.json`) |
| P2-2 | 문서 | portfolio README 614KB 주장 | `apps/portfolio/README.md:11` (실제 410K) |
| P2-3 | 문서 | job-server README "9 tools" | 실제 14 registered (`handlers/tools.js`) |
| P2-4 | 문서 | Root AGENTS.md commit hash stale `bc2aff0` | HEAD `e02e53d` |
| P2-5 | 문서 | AGENTS.md count claim "43+" | 실제 47 |
| P2-6 | 문서 | PDF_GENERATION.md `tools/tools/scripts/build/` × 3 | line 132, 181, 518 |
| P2-7 | 문서 | ADR-0001 still references Bazel facade | `docs/adr/0001-monorepo-structure.md:12` |
| P2-8 | 코드 | Validator duplication 4 places, 937 LOC | portfolio + dashboard + job-server + tools |
| P2-9 | 코드 | normalizeCompanyName not in `@resume/shared` | `jobkorea-sections.js:149` (only) |
| P2-10 | 코드 | console.log/error in worker production code | `worker.js:231-2251` (generated, fix source) |
| P2-11 | 테스트 | test-helpers/{mocks,setup,fixtures}.js 1637 LOC untested | `apps/job-server/src/test-helpers/` |
| P2-12 | 테스트 | packages/cli no tests | `packages/cli/` |
| P2-13 | 테스트 | n8n workflows no schema validation | 28 JSON files in `infrastructure/n8n/` |
| P2-14 | 보안 | `puppeteer` aliased to `rebrowser-puppeteer` | supply chain risk acceptable for stealth |
| P2-15 | 보안 | `imap-simple@5.1.0` legacy | 2021 last update |
| P2-16 | 보안 | `compatibility_date: 2026-02-21` outdated | both wrangler.jsonc |
| P2-17 | 보안 | No Dependabot/Renovate config | `.github/dependabot.yml` 없음 |
| P2-18 | 옵저빌리티 | `cf_metrics` hardcoded defaults (cache_hit=0.85) | `metrics.js:94-96` |
| P2-19 | 옵저빌리티 | ES logger silent failure (no DLQ) | `es-logger.js:79-98` |
| P2-20 | SSoT | hardcoded terminal Easter egg in index.html | `index.html:1298-1320` |
| P2-21 | OpenAPI | `/api/health/notifications`, `/api/status`, `/api/cleanup` 미문서화 | `packages/contracts/openapi.yaml` |
| P2-22 | CI | SSoT drift check (`sync:data && git diff --exit-code`) PR 차단 안 함 | scheduled auto-sync only |

---

## 4. P3 — Minor

| # | Finding |
|---|---|
| P3-1 | 1 TODO in `skill-tag-map.js:43` (documented Wanted skill probe gap) |
| P3-2 | `tools/scripts/README.md` Last Updated 2025-11-11 |
| P3-3 | `apps/job-dashboard/README.md:534` "(8th workflow) TBD" 모호 |
| P3-4 | ADR-0007 "47 endpoints" vs README "30+ endpoints" |
| P3-5 | docs/README.md duplicate `JOB_JCLEE_ME_IMPLEMENTATION.md` entry |
| P3-6 | `web-vitals.js:92-107` no retry on beacon failure |
| P3-7 | n8n location `infrastructure/n8n/` vs theoretical `packages/contracts/n8n/` |

---

## 5. ✅ Compliance Highlights (positive findings)

- **Hexagonal architecture**: services/ → clients/ direct imports = **0 found** ✓
- **Deprecated `lib/`**: `apps/job-server/src/lib/` does NOT exist ✓
- **packages/types**: zero runtime deps ✓
- **No circular package deps**: `grep "from '@resume/" packages/` = 0 matches ✓
- **CSP/HSTS/X-Frame**: `security-headers.js` OWASP-compliant, per-response nonce + strict-dynamic ✓
- **Pull request secret exposure**: workflows use `pull_request` not `pull_request_target` ✓
- **gitleaks --redact**: enabled in CI ✓
- **Production health**: v1.14.7 deployed, `/health` 200, `/metrics` 200, D1+KV healthy ✓
- **Test suite**: 818/818 job-server pass, 13/13 schemas pass, 7/7 ProfileAggregator pass ✓
- **Recent commits**: 모든 신규 코드 (normalizeCompanyName, validate-application-variants는 P1) 테스트 커버됨 ✓

---

## 6. Effort estimate

| Tier | Count | 예상 시간 |
|---|---|---|
| P0 | 5 | 1-2 days |
| P1 | 12 | 2-3 days |
| P2 | 22 | 3-5 days (점진적) |
| P3 | 7 | 1 day |
| **Total** | **46** | **7-11 days** if all addressed |

**권고 우선순위**:
1. 즉시: P0-1 (Cloudflare key rotate), P0-3 (Jest threshold) — 2-4시간
2. 이번 주: P0-2 (KV cookie encrypt), P0-4 (JOB_SERVICE binding), P1-2/3 (auth/CSRF gaps) — 1일
3. 이번 sprint: P1 나머지 + 가장 큰 P2 (validator consolidation, BUILD.bazel cleanup, CHANGELOG fix) — 3-5일
4. Backlog: P2/P3 점진적 처리

---

## 7. Methodology

본 리뷰에 사용된 에이전트:
- explore × 5 (code quality, architecture, CI/security, docs drift, test+observability) — 병렬 background
- oracle × 1 (senior security + production risk review)
- 직접 sanity verification (.env tracking 정정, BUILD.bazel/AGENTS.md count 확인 등)

**Notable correction during verification**: Oracle/CI explorer가 `.env` files를 "committed real credentials"로 분류했으나, 실제 `git ls-files` 결과 **gitignored** + tracked 안 됨. 디스크에는 평문이지만 git history에는 없음. P0 → 디스크 수준 secret manager 권고로 강등.

---

## 8. References

- 이전 audits: `RESUME_SYNC_AUDIT_2026-04-29.md`
- ADRs: `docs/adr/0001..0008`
- Production: https://resume.jclee.me v1.14.7 deployed 2026-04-29T01:05:46
