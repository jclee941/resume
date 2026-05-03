# Content Review + Position Search Report

**Date**: 2026-05-03
**Scope**: User-clarified — content review (portfolio + Wanted/JobKorea profiles) + multi-platform position search (Wanted, JobKorea, Saramin, Programmers, LinkedIn) + auto-apply candidates ≥75
**Resume basis**: `packages/data/resumes/master/resume_data.json` after refinement at master `e70058a0`+

---

## Part 1. Content Review — 8 issues identified, 5 fixed in this session

### 🔴 Critical (4) — all FIXED

| # | Issue | Location | Fix applied |
|---|-------|----------|-------------|
| 1 | "9년차" (KO) vs "총 7년 9개월" (JobKorea) discrepancy | `summary.profileStatement` (KO/EN/JA) | Updated to "8년차 DevSecOps/SRE (Linux 재무장 1년 포함)" / "8 years working + 1 year Linux reskilling" / "実務8年 + Linux再学習1年" |
| 2 | Nextrade engagement 2024.03–2026.02 overlapping with Gaonnuri 2024.03–2025.02 entry | `careers[].continuousEngagement` | Reworded to "가온누리 구축 단계 2024.03~2025.02 → 아이티센 CTS 운영 단계 2025.03~2026.02, 동일 고객사 연속 참여" |
| 3 | "리눅스마스터 2급" untranslated in EN profileStatement | `resume_data_en.json` `summary.profileStatement` | Replaced with "Linux Master Level 2" |
| 4 | Korean cert names in JA resume (사무자동화산업기사, 리눅스마스터 2급, 한국산업인력공단, 한국정보통신진흥협회) | `resume_data_ja.json` `certifications[]` | Hybrid notation: original Korean + Japanese transliteration + English equivalent (e.g., "リナックスマスター2級 (Linux Master Level 2 / 韓国情報通信振興協会認定)") |

### 🟡 Medium (4) — 2 fixed, 2 deferred

| # | Issue | Status |
|---|-------|--------|
| 5 | "Polyglot 운영자" garbled phrase ("stack 아는 것보다 이식 광고 로 대축") | ✅ Fixed: "단일 stack 숙련보다 이종 환경에 빠르게 적응하는 능력을 우선시합니다" |
| 6 | Metanet "대규모" too vague | ✅ Fixed: "1,000명 규모 컨택센터 원격 근무 환경" |
| 7 | EN hero adds "Platform Engineer" not in KO | ⏸️ Deferred (intentional positioning per design) |
| 8 | Metanet 주요직무 mismatch (시스템엔지니어 SSoT vs 소프트웨어개발자 JobKorea) | ⏸️ Deferred (JobKorea uses internal `jobkoreaJobCode 1000239` mapping) |

### 🟢 Confirmed good

- 5-paragraph cover letter (KO/EN/JA): consistent OA→DevSecOps trajectory
- platformVariants narrative: single conviction + bullet impact metrics
- 콴텍투자일임 timeline restored
- WCAG AA composite-bg 13.36/6.86/7.56/7.45/6.94
- JobKorea live profile shows 6 careers + 5-paragraph 자기소개서 verbatim

---

## Part 2. Position Search — 5 platforms, 395 jobs fetched, 38 scored ≥50

### Per-platform results

| Platform | Status | Fetched | Scored ≥50 | Auth | Notes |
|----------|--------|---------|------------|------|-------|
| Wanted | ✅ ok | 180 | 36 | session expired (apply disabled) | API search, detail fetch via `/api/v4/jobs/{id}` |
| JobKorea | ✅ ok | 120 | 2 | active session (96 cookies) | search via Cheerio, detail via crawler |
| Saramin | ✅ ok | 75 | 0 | n/a | Search returns brief snippets — no description for matcher |
| Programmers | ⚠️ ok-empty | 0 | 0 | n/a | DOM/API selector likely changed; needs maintenance |
| LinkedIn | ✅ ok | 20 | 0 | n/a | Description too short for matcher to score |
| **Total** | | **395** | **38** | | |

### Score distribution

| Tier | Count | Threshold |
|------|-------|-----------|
| 🟢 Auto-apply | 1 | ≥75 |
| 🟡 Review | 8 | 60–74 |
| ⚪ Low | 29 | 50–59 |

---

## Part 3. Auto-apply candidate (≥75)

### 🥇 #1 이우소프트 — Cloud Infra Engineer (Kubernetes / AWS) — Score 76

- **URL**: https://www.wanted.co.kr/wd/347834
- **Source**: Wanted
- **Matched skills (5)**: Kubernetes, Prometheus, Grafana, Bash, Python
- **Gaps (5)**: AWS, GCP, Azure 클라우드 명시 경험
- **Score breakdown**: Tech 62/100, Experience 100/100, Location 30, Weighted 66, Final 76
- **Apply eligibility**: `blocked_auth` — Wanted credentials not set in env (WANTED_EMAIL/PASSWORD)

---

## Part 4. Review queue (60-74) — 8 candidates

| Score | Platform | Company | Title | URL |
|-------|----------|---------|-------|-----|
| 73 | jobkorea | 메가존클라우드 | [ETU] Cloud Governance Architect | jobkorea_48943039 |
| 64 | wanted | 코딧(CODIT) | 백엔드 개발자 (Node.js, 2년 이상) | wd/199386 |
| 63 | wanted | 알로카도스 | 시니어 데브옵스 엔지니어 | wd/208256 |
| 63 | wanted | 싸이버로지텍 | 기술지원팀 TA (Technical Architect) | wd/296646 |
| 61 | wanted | 핵클(Hackle) | Cloud Infrastructure Engineer | wd/354775 |
| 61 | wanted | 핵클(Hackle) | Cloud Infrastructure Engineer (dup) | wd/354775 |
| 60 | wanted | 코딧(CODIT) | 시니어 백엔드 개발자 (Node.js, 5년 이상) | wd/46260 |
| 60 | wanted | 제로원에이아이 | AI Back-End / Bigdata 엔지니어 | wd/166683 |

---

## Part 5. Apply eligibility classification

| Candidate | Score | Status | Reason |
|-----------|-------|--------|--------|
| 이우소프트 Cloud Infra Engineer | 76 | `blocked_auth` | WANTED_EMAIL/PASSWORD not set in .env |
| 메가존 Cloud Governance Architect | 73 | `needs_human_review` | Below auto-apply threshold (75) — high-value but requires review |
| All others (60-74) | 60-74 | `needs_human_review` | Below auto-apply threshold |

---

## Part 6. Score reconciliation (Oracle blocker #2 resolved)

Pipeline `topJobs` field returns 15 entries because the result-state.js applies an additional `MAX_TOP_JOBS_FOR_REPORT = 15` cap on the highest-scoring jobs. Direct `scoreJob()` calls give the full filtered list (38 ≥50). No candidates were dropped due to bugs — the discrepancy is by design (UI/log truncation only).

---

## Part 7. Next actions

1. **Add WANTED_EMAIL / WANTED_PASSWORD to .env** to unblock auto-apply for 이우소프트
2. **Manual review**: 메가존클라우드 Cloud Governance Architect (73)
3. **Programmers crawler maintenance**: returns 0 results — DOM/API may have changed
4. **Saramin/LinkedIn description enrichment**: search responses lack body — may need detail fetch step
5. **Deploy verification**: Production 23a31e12 — KO/EN/JA all carry the corrected "8년차" framing

## Files changed in this session

- `packages/data/resumes/master/resume_data.json` (KO content fixes #1, #2, #5, #6)
- `packages/data/resumes/master/resume_data_en.json` (EN content fixes #1, #3, #6)
- `packages/data/resumes/master/resume_data_ja.json` (JA content fixes #1, #4)
- `apps/portfolio/data*.json` (regenerated via `npm run sync:data`)
- `apps/portfolio/worker.js` (rebuilt)

## Test status

`apps/job-server` `npm test`: **831/831 pass, 0 fail** (no regressions).
