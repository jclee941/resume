# Wanted / JobKorea Resume Sync — 정합성 Audit (2026-04-29)

**Scope**: Wanted 원티드 + JobKorea 잡코리아 이력서 자동화 파이프라인 + SSoT 정합성

**Method**: 4 parallel explorer agents (wanted code map, jobkorea code map, SSoT integrity, skills/projects dedup) + 직접 검증.

---

## TL;DR

| 항목 | 결과 |
|---|---|
| ko/en/ja SSoT 키 일치 | ✅ 22/22/22 |
| careers / projects / personalProjects parity | ✅ 7/7/7 across all locales |
| Skills total parity (post-fix) | ✅ 29/29/29 |
| 자동 수정된 finding | 3 (Splunk 중복, OpenTelemetry/Go drift, JK 회사명 정규화) |
| 추가 발견 drift | 2 (선행 미발견 — 이번 세션에서 수정 완료) |
| 미해결 (별도 작업 필요) | 4 (아래 §3) |
| Test 회귀 | 0 — 809/809 pass |

---

## 1. 자동 수정된 정합성 이슈

### Fix 1 — P1: Splunk 중복 + OpenTelemetry/Go locale drift
- **현상**: ko SSoT skills에서 `Splunk`가 `observability` + `security` 두 카테고리에 중복 존재. en/ja에서는 `OpenTelemetry`(observability), `Go`(programming)이 각각 누락 (pre-existing locale drift).
- **수정**:
  - `packages/data/resumes/master/resume_data.json` — observability에서 Splunk 제거 (security는 SIEM 도구로서 canonical)
  - `packages/data/resumes/master/resume_data_en.json` — observability `OpenTelemetry`, programming `Go` 추가
  - `packages/data/resumes/master/resume_data_ja.json` — 동일
- **검증**: `node --eval` SSoT diff scripts → ko/en/ja 카테고리별 항목 + 이름 셋 완전 일치, 총 29 skills.

### Fix 2 — P1: README skill mapping 카운트 (24/12 → 31/45)
- **현상**: `apps/job-server/README.md` 가 SKILL_TAG_MAP=24, unmapped=12 주장. 실제는 `SKILL_TAG_MAP=31 entries`, `SKILL_ALIASES=45 entries`, fallback 라우팅 ~10건.
- **수정**: README §Skills mapping 갱신 + skill-tag-map.js 경로 명시.

### Fix 3 — P2: JobKorea 회사명 (주) 정규화 누락 (Wanted parity)
- **현상**: `wanted-sync-operations.js:251`은 `replace(/\(주\)/g, '').trim()` 처리하지만 `jobkorea-sections.js:155` `mapCareersToFormFields()`는 raw 회사명 (`(주)아이티센 CTS`) 을 그대로 form field에 전송. JobKorea remote 측 정규화 동작이 다를 경우 매칭 실패 가능.
- **수정**:
  - `jobkorea-sections.js`: `normalizeCompanyName()` export 추가 (Wanted와 동일한 `(주)` 스트립 + trim)
  - `Career[].C_Name` 필드에 `normalizeCompanyName(career?.company)` 사용
  - 테스트 갱신 (raw → 정규화) + 신규 회귀 테스트 3건 (`(주)` prefix/suffix, null/undefined, passthrough)

---

## 2. 발견된 미수정 이슈 (별도 작업 필요)

### Issue A — P1: JobKorea profile sync에 skills 매핑 부재
- **현상**: `buildJobKoreaFormData()`가 careers/school/licenses/military/awards/hopeJob/portfolio 7개 섹션은 매핑하나 **skills 섹션 매핑이 전혀 없음**. SSoT 29개 skills는 JobKorea form에 전달되지 않으며, free-text `platformVariants.jobkorea.about` 안에 임베딩된 키워드만 노출됨.
- **권고**: (i) JobKorea의 skills form fields 식별 → `mapSkillsToFormFields()` 추가, 또는 (ii) JobKorea는 about 텍스트 기반 노출이 의도라면 README/AGENTS.md에 명시.
- **차단 요인**: JobKorea form의 skills field name/code (예: `Skl_*`) 식별 필요 → 별도 probe 작업.

### Issue B — P1: Zod 스키마 (packages/schemas) 가 SSoT 22 키 중 ~6개만 검증
- **현상**: `packages/schemas/src/resume.js` 는 `profile/careers/projects/skills/certifications/educations`만 검증. 실제 SSoT 키 22개 중 `personalProjects, hero, platformVariants, availability, careerGap, ossContributions, awards, achievements, infrastructure, contact, hope, military, languages, summary, current, sectionDescriptions` 등 16개는 미검증.
- **권고**: 필드 추가 검증 — 또는 의도적 미검증 필드를 명시적으로 문서화.

### Issue C — P1: Shinhan / Application 변형이 parallel SSoT
- **현상**: `packages/data/resumes/applications/shinhan/shinhan_resume_data*.json` 3개와 다수의 application별 .md 파일이 master SSoT에서 파생되지 않은 독립 소스로 존재. `tools/scripts/utils/sync-resume-data.js`의 `LANGUAGE_SOURCES`에도 포함되지 않음 → 마스터 변경 시 자동 전파 안 됨.
- **권고**: (i) overlay 패턴으로 마스터에서 생성 또는 (ii) "intentionally independent per-application" 명시 + drift CI 가드 추가.

### Issue D — P2: JobKorea profile read-back 부재
- **현상**: `JobKoreaCrawler.getProfile()` 이 빈 placeholder 반환 (`platforms/jobkorea/jobkorea-crawler.js:192-202`). 따라서 sync 후 idempotency / drift 검증이 불가능.
- **권고**: Playwright DOM extractor 구현, 또는 read-back이 의도적으로 구현되지 않음을 README에 표기.

---

## 3. 알려진 한계 (이전 세션에서 이미 문서화)

| ID | File | 한계 |
|---|---|---|
| BUG-W1 (fixed) | wanted-sections.js | about 150-char 잘림 → 3000으로 수정 (commit `ae7dc16`) |
| BUG-W2 (fixed) | wanted-sync-operations.js | headline 50-char 잘림 → 150 |
| BUG-J1 (fixed) | jobkorea-sections.js | school type code locale alias mapping |
| Skills v2 broken | wanted endpoints/resume.js | Wanted Skills v2 → 404, v1 only |
| Links API broken | docs | Wanted Links API → 500 |
| Wanted skills additive only | wanted-sync-operations.js | remote skills 삭제 안 함 — SSoT에 없는 remote skills 보존 |
| 7 of 8 Wanted sections | scripts/ci-resume-sync.js | 1개 미커버 섹션 (정확한 누락 항목은 별도 식별 필요) |

---

## 4. SSoT 캐노니컬 위치 — 문서 정정

`AGENTS.md` (root) 와 일부 README 가 `packages/data/resume_data.json` 을 SSoT로 명시하나 실제 캐노니컬 파일은:

```
packages/data/resumes/master/resume_data.json   (45 KB, 1055 lines, 22 top-level keys)
packages/data/resumes/master/resume_data_en.json
packages/data/resumes/master/resume_data_ja.json
```

문서를 후속 PR에서 업데이트해야 함.

---

## 5. Verification — 이번 세션

| Check | Result |
|---|---|
| 모든 SSoT JSON parse | ✅ 3/3 valid |
| ko/en/ja key parity (22) | ✅ |
| Skills count parity (29) | ✅ |
| `normalizeCompanyName` 단위 테스트 | ✅ 3/3 new pass |
| `apps/job-server` test suite | ✅ 809/809 pass (이전 806 + 3 new) |
| `wanted-sync-operations.test.js` | ✅ 16/16 pass (회귀 없음) |
| `jobkorea-sections.test.js` | ✅ 44/44 pass (이전 41 + 3 new) |

---

## 6. 변경 파일 (이 audit 1개 커밋)

```
packages/data/resumes/master/resume_data.json       (-5 lines: Splunk dedup)
packages/data/resumes/master/resume_data_en.json    (+10/-1: OpenTelemetry+Go add, Splunk dedup)
packages/data/resumes/master/resume_data_ja.json    (+10/-1: OpenTelemetry+Go add, Splunk dedup)
apps/job-server/scripts/profile-sync/jobkorea-sections.js   (+11: normalizeCompanyName + use)
apps/job-server/scripts/profile-sync/__tests__/jobkorea-sections.test.js  (+18/-2: tests)
apps/job-server/README.md                           (+2/-2: skill counts)
docs/architecture/RESUME_SYNC_AUDIT_2026-04-29.md   (+this file)
```
