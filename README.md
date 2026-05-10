```markdown
# resume.jclee.me

[![CI](https://github.com/jclee941/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/jclee941/resume/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-000000.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Node](https://img.shields.io/badge/node-≥22-43853D?logo=node.js&logoColor=white)](https://nodejs.org)

> DevSecOps/SRE 엔지니어를 위한 **이력서 자동화 모노레포**입니다.  
> 단일 진실원(SSoT) 데이터에서 파생되는 Cloudflare Workers 포트폴리오, 구직 자동화 파이프라인, 셀프호스팅 관측 도구를 포함합니다.

[포트폴리오 →](https://resume.jclee.me) · [English](https://resume.jclee.me/en) · [日本語](https://resume.jclee.me/ja) · [Health](https://resume.jclee.me/health) · [Metrics](https://resume.jclee.me/metrics)

---

## 개요

이 저장소는 단순한 정적 사이트가 아닌, **단일 진실원(SSoT)** 기반으로 운영되는 모노레포입니다.  
`packages/data`의 중앙 집중식 이력서 데이터를 통해 포트폴리오 웹사이트, 구직 자동화 시스템, 대시보드를 동기화하고 일관성을 유지합니다.

```
┌──────────────────────────────────────────────────────┐
│  packages/data/resumes/master/resume_data.json       │
│  (Single Source of Truth)                            │
└──────────────┬───────────────────┬───────────────────┘
               │                   │
      ┌────────▼────────┐ ┌────────▼────────┐
      │ Edge Portfolio  │ │ Job Automation  │
      │ (CF Workers)    │ │ (Docker/n8n)    │
      └─────────────────┘ └─────────────────┘
```

## 주요 기능

- **SSoT 이력서 관리**: 하나의 JSON 소스로부터 포트폴리오, 구직 프로필, 대시보드 데이터를 동기화
- **에지 포트폴리오**: Cloudflare Workers 기반 SSR/i18n 사이트 (한국어, 영어, 일본어)
- **구직 자동화**: Wanted/JobKorea 연동 및 자동 지원 파이프라인 (`apps/job-server`, `apps/job-dashboard`)
- **셀프호스팅 관측**: `/health`, `/metrics` 엔드포인트 및 MCP 서버 제공
- **엄격한 테스트**: Playwright E2E(접근성, 시각적 회귀, 모바일, SEO, 보안), 통합/단위 테스트

## 기술 스택

- **런타임**: Node.js ≥22, Cloudflare Workers
- **언어**: TypeScript, JavaScript, Go(CI 검증)
- **테스트**: Jest, Playwright, Node.js Native Test Runner
- **인프라**: Cloudflare Workers, Docker · Docker Compose
- **품질**: ESLint, TypeScript 엄격 모드, 데이터 스키마 검증

## 프로젝트 구조

```text
resume/
├── apps/
│   ├── portfolio/              # Cloudflare Workers 에지 포트폴리오
│   ├── job-server/             # 구직 자동화 MCP 서버 (Docker 지원)
│   └── job-dashboard/          # 구직 현황 대시보드
├── packages/
│   ├── cli/                    # 이력서 검증 CLI
│   ├── data/                   # SSoT 이력서 데이터
│   ├── shared/                 # 공유 유틸리티
│   ├── types/                  # TypeScript 타입
│   ├── schemas/                # 데이터 스키마
│   ├── contracts/              # API 계약
│   └── env/                    # 환경 설정
├── tests/
│   ├── e2e/                    # Playwright E2E 테스트
│   ├── integration/            # 통합 테스트
│   └── unit/                   # 단위 테스트
├── tools/                      # 빌드 및 CI 스크립트
├── Dockerfile
├── docker-compose.yml
└── wrangler.jsonc
```

## 설치

```bash
git clone <repository-url>
cd resume
npm install
```

## 사용법

### 로컬 개발

```bash
# 데이터 동기화 → 빌드 → 타입체크 → 테스트
npm run automate:ssot

# 포트폴리오 로컬 개발 서버 실행
npm run dev
```

### 빌드 및 동기화

| 스크립트 | 설명 |
|---|---|
| `npm run build` | `apps/portfolio` HTML 템플릿에서 `worker.js` 생성 |
| `npm run build:full` | 포트폴리오 + CLI 전체 빌드 |
| `npm run sync:data` | SSoT 데이터를 각 앱에 동기화 |
| `npm run sync:pptx` | 신한은행 PPTX 형식 이력서 생성 |
| `npm run automate:full` | 전체 동기화 → 린트 → 타입체크 → 테스트 → 빌드 → Go 검증 |

### 테스트

```bash
# 전체 테스트 실행
npm test

# 개별 스위트
npm run test:jest       # Jest 단위 테스트
npm run test:node       # job-server Node native 테스트
npm run test:schemas    # 스키마 검증
```

E2E(접근성, UI 회귀, 보안 등)는 Playwright로 실행합니다:

```bash
npx playwright test
```

### Docker

`apps/job-server`를 독립 컨테이너로 실행할 수 있습니다.

```bash
docker-compose up -d mcp-server
```

- **포트**: `3000`
- **헬스체크**: `/health` 엔드포인트 기반 (`30s` 간격)
- **볼륨**: `job_automation_data`로 데이터 영속화

## 배포

- **포트폴리오**: `master` 브랜치에 `git push` 시 Cloudflare Workers 자동 빌드가 트리거됩니다. 수동 배포는 비