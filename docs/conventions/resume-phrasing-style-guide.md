# Resume Phrasing Style Guide (SSOT Normalization Rules)

**Scope:** `packages/data/resumes/master/resume_data.json` (KO), `resume_data_en.json`,
`resume_data_ja.json`, `resume_master.md`, and any code that embeds resume phrasing
(e.g. cover-letter fallback templates). `applications/` trees are intentionally
independent and NOT governed by this guide.

**Enforcement:** mechanically checkable rules are encoded in
`tests/unit/data/ssot-phrasing-normalization.test.js`. Rules marked `[guard]` below
are test-enforced; the rest are editorial rules applied during normalization passes.

## 1. Absolute Content Rules

- No unverifiable quantified claims: no percentages, ratios, multipliers
  (`3배`, `3x`), plus-counts (`500+`), or scale phrases (`수백`, `수천`) as
  performance claims. Dates, periods, versions, certification grades
  (`리눅스마스터 2급`), and product names containing digits (`1Password`, `D1`,
  `IPv4`) are allowed. `[guard]`
- No invented facts. Normalization rephrases existing facts only.
- IDs, periods, URLs, emails, phone numbers, enum values, and runtime
  placeholders are byte-immutable:
  - `summary.totalExperience` stays `"재직 합계"` / `"working total"` /
    `"在職合計"` (rewritten at sync time by `resume-sync-runner.js`). `[guard]`
  - `N년차` / `N years` / `N年目` patterns inside `profileStatement` are
    runtime-computed placeholders — never bake concrete values.
- Locale files mirror KO intent. Structure, key sets, array ids/orders stay
  identical (enforced by `ssot-locale-parity.test.js`).

## 2. Terminology Canon (KO)

| Concept                      | Canonical                                                                                  | Banned variants                      |
| ---------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ |
| 알림 채널 쌍                 | `Slack/SMS 알림`                                                                           | `Slack·SMS`, `슬랙/SMS` `[guard]`    |
| 개념 나열 구분자 (문장 내)   | `·` (가운뎃점)                                                                             | `-` 하이픈 나열, `・` (JA 전용)      |
| FortiManager API (상세 서술) | `FortiManager JSON-RPC API` — `careers[].description`, `careers[].projects[].description`  |                                      |
| FortiManager API (요약 서술) | `FortiManager API` — summary, wantedSummary, platformVariants, careerSummary, achievements |                                      |
| Splunk 탐지 문맥             | `Splunk ES` (넥스트레이드/아이티센 ES 작업)                                                | `Splunk Enterprise Security` 풀네임  |
| Splunk 일반 플랫폼 문맥      | `Splunk` (개인 알림 프로젝트의 Saved Search 등)                                            |                                      |
| 금융위 인가 (요약)           | `금융위 본인가`                                                                            |                                      |
| 금융위 인가 (자소서 서사)    | `금융위원회 본인가` 첫 언급 허용                                                           |                                      |
| 금감원 감사 (요약)           | `금감원 감사`                                                                              |                                      |
| 금감원 감사 (서사)           | `금융감독원 정기 감사`                                                                     |                                      |
| 구직 상태 복합 표기          | `구직 중 · 즉시 투입 가능`                                                                 | `구직 중 - 즉시 투입 가능` `[guard]` |
| 매매체결시스템               | 붙여쓰기 `매매체결시스템`                                                                  | `매매체결 시스템`                    |
| 망분리·엔드포인트 보안       | `망분리`, `엔드포인트 보안`                                                                | `네트워크 분리`                      |

## 3. Field-Value Taxonomies

- `careers[].workType`: no space before parenthesis — `정규직(파견)`. `[guard]`
  `SI+SM` (metanet) is an engagement model, not an employment type; it is
  flagged as unverifiable and left untouched until the owner confirms the
  actual employment form.
- `careers[].teamSize`: team descriptor first, disclosure in parenthesis —
  `인프라 운영팀(규모 미공개)`. Never start the value with `규모 미공개`. `[guard]`
  Named cells (`정보보안팀 자동화 셀`, `보안 구축 셀`) are team names and stay.
- `careers[].company`: legal form `(주)회사명` only here. Prose and summaries
  use the short form (`아이티센 CTS`, `가온누리정보시스템`).

## 4. Sentence-Ending Rules per Field Family (KO)

**습니다체 (complete sentences, end with `다.`)** `[guard]`

- `summary.profileStatement`
- `summary.aboutSection.careerHighlights[]`
- `careers[].description`, `careers[].projects[].description`
- `projects[].description`, `personalProjects[].description`
- `careerGap.reason`
- `achievements[]`
- `ossContributions[].description`
- `coverLetter.ko.*`, `careerSummary.ko.paragraphs[]/closing`

**명사형 종결 (noun-ending fragments; must not contain `습니다`/`입니다`)** `[guard]`

- `summary.coreCompetencies[]`
- `summary.aboutSection.currentFocus[]`
- `careers[].projects[].achievements[]`
- `careers[].wantedSummary`, `careers[].myRole`
- `personalProjects[].highlights[]`
- `infrastructure[].description`
- `sectionDescriptions.*`
- `careerGap.result`

**Exempt:** `summary.aboutSection.techPhilosophy[]` (aphorisms),
`platformVariants.*.about` (structured headline+bullet format — terminology
rules still apply), enums, URLs, periods, `hero`, `hope`.

## 5. Cross-Field Consistency `[guard]`

- `availability === current.status + ' · ' + current.availability`
- `hope.roles` deep-equals `current.desiredRoles`
- `contact.email/phone/github` === `personal.email/phone/github`

## 6. Prose Deduplication

Sibling fields describing the same fact for different render surfaces
(`careers[].description` ↔ `careers[].projects[].description` ↔ top-level
`projects[]`) must use identical canonical phrasing for the shared fact;
surface-specific sentences may differ in scope, never in terminology or claims.
Within one field family, a fact appears once per locale — no KO/EN duplicated
items inside a single KO array (e.g. bilingual duplicate highlights are merged
to the KO phrasing; the EN wording lives in `resume_data_en.json`).

## 7. Locale Conventions

- **EN:** no `·` separator — use commas or `and`. Sentence case, factual and
  concise (ATS-friendly). `coverLetter.en` mirrors the KO narrative
  paragraph-by-paragraph (본인가 심사·감사 대응을 데이터 근거로 설명하는 서사).
- **JA:** list separator `・`, 敬体(です/ます). `coverLetter.ja` mirrors the KO
  narrative paragraph-by-paragraph.
- `coverLetter.ko` is the canonical narrative; EN/JA headlines and closings are
  aligned to its intent, not the retired "From OA to Security" storyline.

## 8. Embedded Phrasing in Code

Hardcoded resume phrasing in runtime code (e.g.
`apps/job-server/.../cover-letter-generator/template-selection.js` fallbacks)
follows Rule 1 (no quantified claims) and the terminology canon. Portfolio UI
copy (`apps/portfolio/lib/hero-content-data.js`, `lib/i18n.js`,
`src/scripts/modules/recruiter-enhancements-data.js`) is app copy pinned by
e2e tests — out of this guide's scope.
