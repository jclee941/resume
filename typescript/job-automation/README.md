# Wanted MCP Server (원티드 MCP 서버)

MCP Server for searching jobs and managing resume on Wanted Korea platform.

**Last Updated**: 2025-12-22
**Version**: 1.4.0
**Status**: ✅ 9 Tools (32 Actions) | 1 Resource | 3 Prompts | CLI | Dashboard | Auto-Apply

## API Capabilities

**Wanted API 지원 기능:**

| 섹션                      | 읽기 | 추가 | 수정 | 삭제 | API                          |
| ------------------------- | :--: | :--: | :--: | :--: | ---------------------------- |
| 프로필 헤드라인           |  ✅  |  -   |  ✅  |  -   | SNS API (`/sns-api/profile`) |
| 경력 (Careers)            |  ✅  |  ✅  |  ✅  |  ✅  | Chaos API v2                 |
| 학력 (Educations)         |  ✅  |  ✅  |  ✅  |  ✅  | Chaos API v2                 |
| 스킬 (Skills)             |  ✅  |  ✅  |  -   |  ✅  | Chaos API **v1**             |
| 활동 (Activities)         |  ✅  |  ✅  |  ✅  |  ✅  | Chaos API v2                 |
| 어학자격 (Language Certs) |  ✅  |  ✅  |  ✅  |  ✅  | Chaos API v2                 |
| 링크 (Links)              |  ✅  |  ❌  |  ❌  |  ❌  | API 500 Error                |

**⚠️ 제한사항:**

- Links API: 서버 오류 (500) 반환 - Wanted 측 문제
- Skills API: **v1** 엔드포인트 사용 (v2 아님), `text` 필드 사용 (`name` 아님)
- CloudFront WAF로 자동화된 브라우저 차단
- 쿠키 기반 인증 필요 (수동 추출)

## Features (8 Tools)

### Public Tools (인증 불필요)

| Tool                    | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `wanted_search_jobs`    | Search jobs by category, location, experience level |
| `wanted_search_keyword` | Search jobs by keyword (회사명, 기술스택, 포지션)   |
| `wanted_get_job_detail` | Get detailed job posting information                |
| `wanted_get_categories` | Get job categories for filtering                    |
| `wanted_get_company`    | Get company info and open positions                 |

### Auth-Required Tools (로그인 필요)

| Tool                 | Description                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `wanted_auth`        | Set cookies/token, check status, logout                                                          |
| `wanted_profile`     | View profile, applications, bookmarks                                                            |
| `wanted_resume`      | Resume management (20 actions): CRUD for careers, educations, skills, activities, language_certs |
| `wanted_resume_sync` | **Automation pipeline** (12 actions): export, import, diff, sync, pipeline operations            |

## Installation

```bash
cd typescript/job-automation
npm install
```

## Usage

### Add to OpenCode MCP Settings

Already configured in `~/.OpenCode/.mcp.json`:

```json
{
  "mcpServers": {
    "wanted": {
      "description": "Wanted Korea job search - 8 tools",
      "command": "node",
      "args": ["/home/jclee/dev/resume/typescript/job-automation/src/index.js"],
      "disabled": false,
      "enabled": true
    }
  }
}
```

### Test Server

```bash
npm start
```

## Authentication Flow

⚠️ **Wanted blocks automated browsers (CloudFront WAF)**

Manual cookie extraction required:

```javascript
// 1. Login to www.wanted.co.kr in your browser
// 2. Open DevTools (F12) → Network tab
// 3. Click any API request to www.wanted.co.kr/api/*
// 4. Copy the Cookie header value

// 5. Set cookies
wanted_auth({
  action: "set_cookies",
  cookies: "your_cookie_string_here",
});

// 6. Check status
wanted_auth({ action: "status" });

// 7. Use auth-required tools
wanted_profile({ view: "overview" });
wanted_resume({ action: "view" });

// 8. Logout
wanted_auth({ action: "logout" });
```

**Session Storage**: `~/.OpenCode/data/wanted-session.json` (24시간 유효)

## Resume Management Examples

### Profile API (SNS API)

```javascript
// View current profile
wanted_resume({ action: "view" });

// Update headline (description)
wanted_resume({
  action: "update_headline",
  text: "DevSecOps Engineer | 8년차 | 보안/인프라",
});

// Update introduction
wanted_resume({
  action: "update_intro",
  text: "DevSecOps Engineer | 보안 전문가",
});
```

### Resume API (Chaos API)

```javascript
// List all resumes
wanted_resume({ action: "list_resumes" });

// Get specific resume detail
wanted_resume({ action: "get_resume", resume_id: "AwcIAQMKDgtIAgcDCwUAB01F" });

// Save resume and regenerate PDF
wanted_resume({ action: "save_resume", resume_id: "AwcICwcLBAFIAgcDCwUAB01F" });
```

### Career Management (Chaos API v2)

```javascript
// Update career
wanted_resume({
  action: "update_career",
  resume_id: "AwcICwcLBAFIAgcDCwUAB01F",
  career_id: 5941540,
  career: {
    title: "DevSecOps Engineer",
    employment_type: "FULLTIME",
    projects: [
      {
        title: "보안 인프라 구축",
        description: "- Kubernetes 보안 강화\n- CI/CD 파이프라인 보안 자동화",
      },
    ],
  },
});

// Add career
wanted_resume({
  action: "add_career",
  resume_id: "AwcICwcLBAFIAgcDCwUAB01F",
  career: {
    title: "DevSecOps Engineer",
    company_name: "회사명",
    employment_type: "FULLTIME",
    start_time: "2024-01-01",
    end_time: "2024-12-31",
    served: false,
    projects: [{ title: "프로젝트명", description: "업무 내용" }],
  },
});

// Delete career
wanted_resume({
  action: "delete_career",
  resume_id: "...",
  career_id: 5941540,
});
```

### Education Management (Chaos API v2) ✅ NEW

```javascript
// Update education
wanted_resume({
  action: "update_education",
  resume_id: "AwcICwcLBAFIAgcDCwUAB01F",
  education_id: 123456,
  education: {
    school_name: "한국대학교",
    major: "컴퓨터공학",
    degree: "학사",
    start_time: "2010-03-01",
    end_time: "2014-02-28",
    description: "졸업논문: 클라우드 보안"
  }
})

// Add education
wanted_resume({
  action: "add_education",
  resume_id: "...",
  education: { school_name: "대학교", major: "전공", degree: "학사", ... }
})

// Delete education
wanted_resume({ action: "delete_education", resume_id: "...", education_id: 123456 })
```

### Skill Management (Chaos API v1) ✅ NEW

```javascript
// Add skill (requires tag_type_id from Wanted skill database)
wanted_resume({
  action: "add_skill",
  resume_id: "AwcICwcLBAFIAgcDCwUAB01F",
  tag_type_id: 674, // DevOps tag ID
});

// Delete skill
wanted_resume({ action: "delete_skill", resume_id: "...", skill_id: 12345 });
```

### Activity Management (Chaos API v2) ✅ NEW

```javascript
// Update activity
wanted_resume({
  action: "update_activity",
  resume_id: "AwcICwcLBAFIAgcDCwUAB01F",
  activity_id: 789,
  activity: {
    title: "오픈소스 기여",
    description: "Kubernetes 보안 플러그인 개발",
    start_time: "2023-01-01",
    activity_type: "OPENSOURCE"
  }
})

// Add/Delete activity
wanted_resume({ action: "add_activity", resume_id: "...", activity: {...} })
wanted_resume({ action: "delete_activity", resume_id: "...", activity_id: 789 })
```

### Language Certificate Management (Chaos API v2) ✅ NEW

```javascript
// Update language certificate
wanted_resume({
  action: "update_language_cert",
  resume_id: "AwcICwcLBAFIAgcDCwUAB01F",
  cert_id: 456,
  language_cert: {
    language_type: "ENGLISH",
    test_type: "TOEIC",
    score: "950",
    acquired_time: "2023-06-15"
  }
})

// Add/Delete language certificate
wanted_resume({ action: "add_language_cert", resume_id: "...", language_cert: {...} })
wanted_resume({ action: "delete_language_cert", resume_id: "...", cert_id: 456 })
```

**⚠️ 미지원 기능:**

```javascript
// Links API: 서버 오류 (500) 반환 - Wanted 측 문제
// 링크 관리는 웹 인터페이스(https://www.wanted.co.kr/cv) 사용
```

## Automation Pipeline (자동화 파이프라인) ✅ NEW

### wanted_resume_sync Tool

```javascript
// 1. Export: 현재 이력서를 JSON 파일로 내보내기
wanted_resume_sync({ action: "export", resume_id: "AwcICwcLBAFIAgcDCwUAB01F" });
// → ~/.OpenCode/data/wanted-resume/{resume_id}.json

// 2. Diff: 로컬 파일과 원격 이력서 비교
wanted_resume_sync({ action: "diff", resume_id: "AwcICwcLBAFIAgcDCwUAB01F" });

// 3. Sync: 로컬 변경사항을 원격에 적용
wanted_resume_sync({ action: "sync", resume_id: "...", dry_run: true }); // 미리보기
wanted_resume_sync({ action: "sync", resume_id: "..." }); // 실제 적용

// 4. Import: JSON 파일에서 이력서 가져오기
wanted_resume_sync({ action: "import", resume_id: "...", dry_run: true });

// 5. Section-specific Sync: 특정 섹션만 동기화
wanted_resume_sync({ action: "sync_careers", resume_id: "...", dry_run: true });
wanted_resume_sync({ action: "sync_skills", resume_id: "...", dry_run: true });
wanted_resume_sync({
  action: "sync_educations",
  resume_id: "...",
  dry_run: true,
});
```

### Pipeline Operations

```javascript
// 파이프라인 상태 확인
wanted_resume_sync({ action: "pipeline_status" });

// 전체 파이프라인 실행 (백업 → 업데이트 적용 → PDF 재생성)
wanted_resume_sync({ action: "pipeline_run", resume_id: "..." });

// n8n 웹훅으로 스케줄링
wanted_resume_sync({
  action: "pipeline_schedule",
  resume_id: "...",
  webhook_url: "https://n8n.jclee.me/webhook/wanted-resume-sync",
});
```

### CLI Commands

```bash
# CLI 사용법 보기
node src/cli.js --help

# Export / Import / Diff / Sync
node src/cli.js export AwcICwcLBAFIAgcDCwUAB01F
node src/cli.js diff AwcICwcLBAFIAgcDCwUAB01F
node src/cli.js sync AwcICwcLBAFIAgcDCwUAB01F --dry-run
node src/cli.js sync AwcICwcLBAFIAgcDCwUAB01F

# Section-specific Sync
node src/cli.js sync:careers AwcICwcLBAFIAgcDCwUAB01F
node src/cli.js sync:skills AwcICwcLBAFIAgcDCwUAB01F

# Pipeline Operations
node src/cli.js pipeline status
node src/cli.js pipeline run AwcICwcLBAFIAgcDCwUAB01F

# npm scripts
npm run export -- AwcICwcLBAFIAgcDCwUAB01F
npm run sync -- AwcICwcLBAFIAgcDCwUAB01F
npm run pipeline -- status
```

### Data Files

```
~/.OpenCode/data/wanted-resume/
├── {resume_id}.json           # 내보낸 이력서 데이터
├── {resume_id}_updates.json   # 적용할 업데이트 (파이프라인용)
├── {resume_id}_backup_*.json  # 자동 백업
├── pipeline-status.json       # 파이프라인 실행 상태
└── pipeline-config.json       # 웹훅 설정
```

### n8n Workflow Integration

`workflows/resume-sync-pipeline.json` 파일을 n8n에 가져와서 자동화:

1. Webhook 트리거 → 파라미터 검증
2. Export → Diff → 변경사항 확인
3. 변경사항 있으면 Sync 실행
4. Slack 알림 전송

```bash
# n8n 워크플로우 가져오기
curl -X POST https://n8n.jclee.me/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d @workflows/resume-sync-pipeline.json
```

## Job Search Examples

```javascript
// Search DevOps jobs
wanted_search_jobs({ tag_type_ids: [674], limit: 10 });

// Search by keyword
wanted_search_keyword({ query: "토스", limit: 10 });
wanted_search_keyword({ query: "kubernetes", limit: 10 });

// Get job detail
wanted_get_job_detail({ job_id: 325174 });

// Get categories
wanted_get_categories();

// Get company info with open jobs
wanted_get_company({ company_id: 12345, include_jobs: true });
```

## Job Categories (tag_type_ids)

| ID   | Category               |
| ---- | ---------------------- |
| 674  | DevOps / 시스템관리자  |
| 672  | 보안 엔지니어          |
| 665  | 시스템/네트워크 관리자 |
| 872  | 서버 개발자            |
| 669  | 프론트엔드 개발자      |
| 899  | 파이썬 개발자          |
| 1634 | 머신러닝 엔지니어      |
| 655  | 데이터 엔지니어        |
| 876  | 프로덕트 매니저        |

## API Endpoints Used

### Public API (api/v4)

| Endpoint                          | Description                                    | Auth |
| --------------------------------- | ---------------------------------------------- | ---- |
| `GET /api/v4/jobs`                | Search jobs by filters                         | ❌   |
| `GET /api/v4/search`              | Keyword search (returns companies, jobs, tags) | ❌   |
| `GET /api/v4/jobs/{id}`           | Job detail                                     | ❌   |
| `GET /api/v4/tags`                | Categories                                     | ❌   |
| `GET /api/v4/companies/{id}`      | Company info                                   | ❌   |
| `GET /api/v4/companies/{id}/jobs` | Company job listings                           | ❌   |

### SNS API (sns-api) - Social/Profile Features

| Endpoint                                           | Description                                    | Auth |
| -------------------------------------------------- | ---------------------------------------------- | ---- |
| `GET /sns-api/profile`                             | Full user profile (careers, skills, education) | ✅   |
| `GET /sns-api/profile/{hash}/recommenders/summary` | Recommendations                                | ✅   |

### Chaos API (api/chaos) - Resume & Internal Features

| Endpoint                                                      | Description           | Auth   |
| ------------------------------------------------------------- | --------------------- | ------ |
| `GET /api/chaos/resumes/v1`                                   | List all resumes      | ✅     |
| `GET /api/chaos/resumes/v1/{resumeId}`                        | Get resume detail     | ✅     |
| `PUT /api/chaos/resumes/v1/{resumeId}`                        | Update resume status  | ✅     |
| `PUT /api/chaos/resumes/v1/{resumeId}/pdf`                    | Regenerate PDF        | ✅     |
| **Careers (v2)**                                              |                       |        |
| `POST /api/chaos/resumes/v2/{resumeId}/careers`               | Add career            | ✅     |
| `PATCH /api/chaos/resumes/v2/{resumeId}/careers/{id}`         | Update career         | ✅     |
| `DELETE /api/chaos/resumes/v2/{resumeId}/careers/{id}`        | Delete career         | ✅     |
| **Educations (v2)**                                           |                       |        |
| `POST /api/chaos/resumes/v2/{resumeId}/educations`            | Add education         | ✅     |
| `PATCH /api/chaos/resumes/v2/{resumeId}/educations/{id}`      | Update education      | ✅     |
| `DELETE /api/chaos/resumes/v2/{resumeId}/educations/{id}`     | Delete education      | ✅     |
| **Skills (v1 only!)**                                         |                       |        |
| `POST /api/chaos/resumes/v1/{resumeId}/skills`                | Add skill             | ✅     |
| `DELETE /api/chaos/resumes/v1/{resumeId}/skills/{id}`         | Delete skill          | ✅     |
| **Activities (v2)**                                           |                       |        |
| `POST /api/chaos/resumes/v2/{resumeId}/activities`            | Add activity          | ✅     |
| `PATCH /api/chaos/resumes/v2/{resumeId}/activities/{id}`      | Update activity       | ✅     |
| `DELETE /api/chaos/resumes/v2/{resumeId}/activities/{id}`     | Delete activity       | ✅     |
| **Language Certs (v2)**                                       |                       |        |
| `POST /api/chaos/resumes/v2/{resumeId}/language_certs`        | Add cert              | ✅     |
| `PATCH /api/chaos/resumes/v2/{resumeId}/language_certs/{id}`  | Update cert           | ✅     |
| `DELETE /api/chaos/resumes/v2/{resumeId}/language_certs/{id}` | Delete cert           | ✅     |
| **Links (BROKEN)**                                            |                       |        |
| `PATCH /api/chaos/resumes/v2/{resumeId}/links/{id}`           | Update link           | ❌ 500 |
| **Other**                                                     |                       |        |
| `GET /api/chaos/notifications/v1/feed/status`                 | Notification status   | ✅     |
| `GET /api/chaos/proposal/v1/search`                           | Proposal/offer search | ✅     |
| `GET /api/chaos/recruit/v2/positions/recommended`             | Recommended jobs      | ✅     |
| `GET /api/chaos/jobs/v1/history`                              | Job view history      | ✅     |

## Dashboard (대시보드) ✅ NEW

웹 기반 지원 현황 대시보드:

```bash
# 대시보드 서버 시작
npm run dashboard

# 개발 모드 (자동 재시작)
npm run dashboard:dev
```

**기능 (Integrated v2.0):**

- 🔐 **보안 로그인**: Google OAuth 2.0 기반 인증 (Whitelist: `qwer941a@gmail.com`)
- 📊 **통합 분석**: 채용 지원 현황 + 포트폴리오 트래픽(Cloudflare) 통합 뷰
- 📈 **실시간 통계**: 전체 지원, 상태별, 소스별 차트 시각화
- 📋 **지원 목록 관리**: 필터링, 정렬, 페이지네이션
- ➕ **수동 지원 추가**: 수동 지원 내역 관리
- 🔔 **n8n 웹훅 통합**: 자동화 워크플로우 연결

**환경 변수 설정:**

```env
GOOGLE_CLIENT_ID=your_client_id
CF_API_KEY=your_cloudflare_api_key
CF_EMAIL=your_email
```

**API 엔드포인트:**

| Endpoint                       | Method         | Description                |
| ------------------------------ | -------------- | -------------------------- |
| `/api/auth/google`             | POST           | Google 로그인 검증         |
| `/api/cf/stats`                | GET            | Cloudflare 포트폴리오 통계 |
| `/api/stats`                   | GET            | 전체 통계                  |
| `/api/stats/weekly`            | GET            | 주간 통계                  |
| `/api/applications`            | GET/POST       | 지원 목록/추가             |
| `/api/applications/:id`        | GET/PUT/DELETE | 지원 상세/수정/삭제        |
| `/api/applications/:id/status` | PUT            | 상태 업데이트              |
| `/api/report`                  | GET            | 일일 리포트                |
| `/api/report/weekly`           | GET            | 주간 리포트                |
| `/api/search`                  | GET            | 채용공고 검색              |
| `/api/n8n/trigger`             | POST           | n8n 워크플로우 트리거      |
| `/api/n8n/webhook`             | POST           | n8n 웹훅 수신              |
| `/api/auto-apply/run`          | POST           | 자동 지원 실행             |
| `/api/config`                  | GET/PUT        | 설정 조회/저장             |
| `/api/health`                  | GET            | 헬스체크                   |

## Auto-Apply (자동 지원) ✅ NEW

Playwright 기반 자동 지원 시스템:

```bash
# 자동 지원 실행 (dry-run)
npm run auto-apply:dry

# 실제 지원 실행
npm run auto-apply
```

**지원 플랫폼:**

- ✅ Wanted (원티드)
- ✅ JobKorea (잡코리아)
- ✅ Saramin (사람인)
- ✅ LinkedIn (Easy Apply)

**설정 옵션:**

```javascript
{
  maxDailyApplications: 10,  // 일일 최대 지원 수
  minMatchScore: 70,         // 최소 매칭 점수
  autoApply: false,          // 자동 지원 활성화
  dryRun: true,              // 테스트 모드
  excludeCompanies: [],      // 제외할 회사
  preferredCompanies: []     // 우선 지원 회사
}
```

## n8n Workflow Integration ✅ NEW

> **⚠️ Internal Network Required**: `n8n.jclee.me` is an internal-only service (no public DNS). Access requires VPN or internal network connection.

n8n 워크플로우 자동화:

```bash
# 워크플로우 파일
workflows/
├── job-application-automation.json  # 채용공고 검색 → 지원 추가 → Slack 알림
├── daily-job-report.json            # 일일 리포트 → Slack 전송
└── resume-sync-pipeline.json        # 이력서 동기화 파이프라인
```

**웹훅 트리거:**

```bash
# 채용공고 검색 트리거
curl -X POST https://n8n.jclee.me/webhook/job-search-trigger \
  -H "Content-Type: application/json" \
  -d '{"keyword": "DevOps", "minScore": 80}'
```

## Files

```
typescript/job-automation/
├── src/
│   ├── index.js              # MCP server entry (9 tools, 1 resource, 3 prompts)
│   ├── cli.js                # CLI for pipeline operations
│   ├── e2e.test.js           # E2E tests (10 tests)
│   ├── pipeline.test.js      # Pipeline tests (12 tests)
│   ├── lib/
│   │   ├── wanted-api.js     # Wanted API client (40+ API methods)
│   │   └── job-matcher.js    # Job matching engine
│   ├── crawlers/
│   │   ├── index.js          # Unified crawler
│   │   ├── base-crawler.js   # Base crawler class
│   │   ├── wanted-crawler.js
│   │   ├── jobkorea-crawler.js
│   │   ├── saramin-crawler.js
│   │   └── linkedin-crawler.js
│   ├── auto-apply/
│   │   ├── index.js
│   │   ├── auto-applier.js   # Playwright-based auto applier
│   │   ├── application-manager.js  # Application tracking
│   │   └── cli.js            # Auto-apply CLI
│   ├── dashboard/
│   │   ├── server.js         # Dashboard HTTP server
│   │   └── public/
│   │       └── index.html    # Dashboard UI
│   └── tools/
│       ├── search-jobs.js    # Category search
│       ├── search-keyword.js # Keyword search
│       ├── get-job-detail.js # Job detail
│       ├── get-categories.js # Categories
│       ├── get-company.js    # Company info
│       ├── auth.js           # Cookie/token auth + SessionManager
│       ├── profile.js        # Profile view
│       ├── resume.js         # Resume management (20 actions)
│       └── resume-sync.js    # Automation pipeline (12 actions)
├── workflows/
│   ├── resume-sync-pipeline.json       # Resume sync n8n workflow
│   ├── job-application-automation.json # Job search automation
│   └── daily-job-report.json           # Daily report workflow
├── package.json              # v1.4.0
└── README.md
```

## MCP Resources

| Resource URI              | Description                           |
| ------------------------- | ------------------------------------- |
| `wanted://session/status` | Current authentication session status |

## MCP Prompts

| Prompt                 | Description                           |
| ---------------------- | ------------------------------------- |
| `search-devops-jobs`   | Search for DevOps/Infrastructure jobs |
| `update-resume-career` | Update career information in resume   |
| `full-job-search`      | Complete job search workflow          |

## Testing

```bash
# Run all tests
npm test              # E2E tests (10 tests)
npm run test:e2e      # Same as npm test
npm run test:pipeline # Pipeline tests (12 tests)

# Test requirements
# - Valid session: Set cookies via wanted_auth first
# - Resume ID: Update RESUME_ID in test files if needed
```

**Test Coverage:**

- E2E tests: Basic tool functionality, authentication, API responses
- Pipeline tests: Export, diff, sync, pipeline operations, section-specific sync

## Security Notes

- Session stored locally in `~/.OpenCode/data/wanted-session.json`
- Cookies/tokens expire after 24 hours (local cache)
- Use `wanted_auth({ action: "logout" })` to clear session
- Never share your session file or cookies
- Resume data stored in `~/.OpenCode/data/wanted-resume/`
