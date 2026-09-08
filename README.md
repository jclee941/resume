# 이재철 | 보안 자동화 · 인프라 엔지니어

**Security Automation · Infrastructure · SIEM Engineering**

금융권 보안 인프라를 구축하고, 탐지부터 알림까지 이어지는 운영 흐름을 코드로 연결합니다.

반복 작업의 자동화뿐 아니라 변경 이력, 장애 대응, 감사에 필요한 근거를 남기는 일을 중요하게 생각합니다.

**[포트폴리오](https://resume.jclee.me)** · **[이력서 PDF](https://resume.jclee.me/resume-full.pdf)** · [LinkedIn](https://linkedin.com/in/jclee0109) · [이메일](mailto:qws941@kakao.com)

[주요 경험](#주요-경험) · [프로젝트 소개](#프로젝트-소개) · [기술 구성](#기술-구성) · [개발자 안내](#개발자-안내)

---

## 주요 경험

- **금융권 보안 인프라 구축**:
  넥스트레이드 매매체결시스템의 망분리와 보안 솔루션 연동을 수행하고,
  방화벽·NAC·DLP 정책 운영 스크립트와 DR 절차를 작성했습니다.
- **SIEM 탐지·알림 자동화**:
  Splunk ES, FortiGate/FortiManager, Webhook, Slack·SMS를 연결해
  보안 이벤트의 탐지·분류·알림 흐름과 정책 조회 자동화를 설계했습니다.
- **운영 근거와 감사 대응**:
  금융보안데이터센터 인프라와 DLP 정책을 운영하고,
  금융감독원 감사 및 금융위 본인가 심사에 필요한 점검·대응 자료를 정리했습니다.

경력별 역할과 프로젝트 설명은 [경력 요약](packages/data/resumes/master/resume_summary.md)에서 확인할 수 있습니다.

## 프로젝트 소개

**Resume Portfolio**는 이력서 콘텐츠, 공개 웹사이트, 채용 작업 자동화를 함께 관리하는 개인 프로젝트입니다.
위의 업무 경력과는 별개로 직접 구현하고 관리하며, 관련 앱과 공유 패키지를 하나의 저장소에 모았습니다.

화면뿐 아니라 **콘텐츠 변경 → 서비스 동작 → 검증·배포**로 이어지는 구현을 아래 코드에서 확인할 수 있습니다.

### 콘텐츠 동기화와 웹 서비스

한국어·영어·일본어 이력서 데이터를 원본에서 동기화하고 Cloudflare Worker 번들로 생성합니다.
하나의 기준 데이터에서 파생 콘텐츠를 만드는 SSoT(Single Source of Truth) 방식입니다.
공개 포트폴리오와 `/job/*` 대시보드는 하나의 Worker 진입점에서 요청을 분기합니다.

[콘텐츠 원본](packages/data/resumes/master/resume_data.json) · [빌드 진입점](apps/portfolio/generate-worker.js) · [요청 라우팅](apps/portfolio/entry.js)

### 채용 작업 자동화

Node.js 기반 MCP(Model Context Protocol) 서버에 도구·리소스·프롬프트를 등록하고,
채용 정보 수집과 지원 관리 작업을 대시보드의 큐·워크플로우로 구성합니다.

[MCP 서버](apps/job-server/src/index.js) · [대시보드 런타임](apps/job-dashboard/src/index.js) · [워크플로우](apps/job-dashboard/src/workflows/)

### 타입과 입력 검증

도메인 타입, 런타임 스키마, API 계약을 공유 패키지로 구분합니다.
앱마다 같은 타입을 다시 정의하는 대신 공통 계약을 사용하고, 외부 입력은 스키마로 검증합니다.

[공유 타입](packages/types/) · [런타임 스키마](packages/schemas/) · [OpenAPI 계약](packages/contracts/openapi.yaml)

### 설계 기록과 배포 검증

설계 변경의 이유와 트레이드오프는 ADR(Architecture Decision Record, 설계 결정 기록)로 남깁니다.
GitHub Actions는 코드 검증을, Cloudflare Workers Builds는 프로덕션 배포를 담당합니다.
단위·통합 테스트와 Playwright E2E를 별도 검증 계층으로 관리합니다.

[단일 Worker로 통합한 이유](docs/adr/0009-single-worker-consolidation.md) · [CI 구성](.github/workflows/ci.yml) · [테스트](tests/) · [배포 구조](docs/architecture/DEPLOYMENT_PIPELINE.md)

## 기술 구성

| 역할                | 사용 기술                                        |
| ------------------- | ------------------------------------------------ |
| 웹 서비스·실행 환경 | Cloudflare Workers · Node.js · Docker            |
| 데이터·비동기 작업  | D1 · Queues · Workflows                          |
| 코드·데이터 계약    | JavaScript · TypeScript · Zod · OpenAPI          |
| 자동화·운영         | Go · Python · GitHub Actions · 1Password         |
| 테스트·정적 검증    | Jest · Node.js Test Runner · Playwright · ESLint |

## 개발자 안내

구현을 살펴보려면 [코드 탐색](#코드-탐색)부터, 직접 실행하려면 아래 로컬 실행 안내부터 확인하세요.

<details>
<summary><strong>로컬 실행과 검증 명령 펼치기</strong></summary>

### 포트폴리오 로컬 실행

Node.js 22 이상과 npm이 필요합니다. 저장소 루트에서 실행합니다.

```bash
npm ci
npm run build
npm run dev
```

로컬 포트폴리오: <http://localhost:8787>

- **빌드 원본**: `build`는 이력서 데이터를 동기화한 뒤 Worker를 생성합니다.
  `apps/portfolio/worker.js`와 파생 데이터는 직접 수정하지 않습니다.
- **실행 범위**: 외부 플랫폼 연동과 일부 대시보드 기능에는 별도 바인딩·인증 설정이 필요합니다.
- **시크릿 관리**: 소스에 넣지 않고 1Password 또는 Cloudflare Workers Secrets로 관리합니다.
- **배포 분리**: 위 명령은 로컬 실행용이며 프로덕션 배포를 수행하지 않습니다.

### 검증 명령

| 명령                | 확인하는 항목                                      |
| ------------------- | -------------------------------------------------- |
| `npm run lint`      | ESLint 코드 규칙                                   |
| `npm run typecheck` | TypeScript 타입 검사                               |
| `npm test`          | 루트 스크립트에 등록된 JavaScript·Python·Go 테스트 |
| `npm run test:e2e`  | Playwright 브라우저 E2E 테스트                     |

전체 테스트에는 Go와 Python도 필요합니다. 세부 명령과 실행 조건은
[package.json](package.json), [테스트 가이드](tests/AGENTS.md)를 참고하세요.

</details>

### 코드 탐색

| 살펴볼 내용                 | 시작 경로                                  |
| --------------------------- | ------------------------------------------ |
| 공개 포트폴리오·요청 라우팅 | [apps/portfolio/](apps/portfolio/)         |
| MCP 서버·채용 자동화        | [apps/job-server/](apps/job-server/)       |
| 대시보드 API·큐·워크플로우  | [apps/job-dashboard/](apps/job-dashboard/) |
| 이력서 콘텐츠 원본          | [packages/data/](packages/data/)           |
| 공통 타입·스키마·API 계약   | [packages/](packages/)                     |
| 테스트·검증 계층            | [tests/](tests/)                           |

### 문서와 기여

- [저장소 구조와 규칙](./AGENTS.md)
- [설계 결정과 운영 문서](docs/README.md)
- [기여 안내](CONTRIBUTING.md)
- [변경 이력](CHANGELOG.md)

프로덕션 배포 경로는 [배포 구조](docs/architecture/DEPLOYMENT_PIPELINE.md)를 따릅니다.

---

[MIT License](LICENSE) · 경력 및 협업 문의: [qws941@kakao.com](mailto:qws941@kakao.com)
