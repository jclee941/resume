# 이재철 | 보안 자동화 · 인프라 엔지니어

**Security Automation · Infrastructure · SIEM Engineering**

금융권 보안 인프라를 구축하고, 탐지부터 알림까지 이어지는 운영 흐름을 코드로 연결합니다.
반복 작업의 자동화뿐 아니라 변경 이력, 장애 대응, 감사에 필요한 근거를 남기는 일을 중요하게 생각합니다.

**[포트폴리오](https://resume.jclee.me)** · **[이력서 PDF](https://resume.jclee.me/resume-full.pdf)** · [LinkedIn](https://linkedin.com/in/jclee0109) · [이메일](mailto:qws941@kakao.com)

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
아래는 업무 경력과 별개로, 직접 구현하고 관리하는 개인 포트폴리오 저장소의 구성입니다.

## Resume Portfolio

이력서를 게시하는 정적 페이지에서 출발해, 콘텐츠 동기화·엣지 서비스·작업 자동화·배포 검증을
함께 관리하는 모노레포로 구성했습니다. 화면뿐 아니라 **데이터가 바뀌고, 서비스가 동작하고, 변경을 검증하는 과정**을 코드로 확인할 수 있습니다.

### 01. 콘텐츠를 한 곳에서 관리하는 포트폴리오

한국어·영어·일본어 이력서 데이터를 원본에서 동기화하고 Cloudflare Worker 번들로 생성합니다.
공개 포트폴리오와 `/job/*` 대시보드는 하나의 Worker 진입점에서 요청을 분기합니다.

[콘텐츠 원본](packages/data/resumes/master/resume_data.json) · [빌드 진입점](apps/portfolio/generate-worker.js) · [요청 라우팅](apps/portfolio/entry.js)

### 02. 반복 작업을 연결하는 자동화 런타임

Node.js 기반 MCP 서버에 도구·리소스·프롬프트를 등록하고,
채용 정보 수집과 지원 관리 작업을 대시보드의 큐·워크플로우로 구성합니다.

[MCP 서버](apps/job-server/src/index.js) · [대시보드 런타임](apps/job-dashboard/src/index.js) · [워크플로우](apps/job-dashboard/src/workflows/)

### 03. 타입과 검증의 책임 분리

도메인 타입, 런타임 스키마, API 계약을 공유 패키지로 구분합니다.
앱마다 같은 타입을 다시 정의하는 대신 공통 계약을 사용하고, 외부 입력은 스키마로 검증합니다.

[공유 타입](packages/types/) · [런타임 스키마](packages/schemas/) · [OpenAPI 계약](packages/contracts/openapi.yaml)

### 04. 설계 결정과 배포 검증

설계 변경의 이유와 트레이드오프는 ADR로 기록합니다.
GitHub Actions는 코드 검증을, Cloudflare Workers Builds는 프로덕션 배포를 담당합니다.
단위·통합 테스트와 Playwright E2E를 별도 검증 계층으로 관리합니다.

[단일 Worker로 통합한 이유](docs/adr/0009-single-worker-consolidation.md) · [CI 구성](.github/workflows/ci.yml) · [테스트](tests/) · [배포 구조](docs/architecture/DEPLOYMENT_PIPELINE.md)

## 기술 구성

- **Edge & Runtime**: Cloudflare Workers · D1 · Queues · Workflows · Node.js · Docker
- **Code & Contracts**: JavaScript · TypeScript · Zod · OpenAPI
- **Automation & Operations**: Go · Python · GitHub Actions · 1Password
- **Verification**: Jest · Node.js Test Runner · Playwright · ESLint

<details>
<summary><strong>개발자용 안내: 로컬 실행과 검증</strong></summary>

### 포트폴리오 로컬 실행

Node.js 22 이상과 npm이 필요합니다. 저장소 루트에서 실행합니다.

```bash
npm ci
npm run build
npm run dev
```

로컬 포트폴리오: <http://localhost:8787>

`build`는 이력서 데이터를 동기화한 뒤 Worker를 생성합니다.
`apps/portfolio/worker.js`와 파생 데이터는 직접 수정하지 않습니다.
외부 플랫폼 연동과 일부 대시보드 기능에는 별도 바인딩·인증 설정이 필요합니다.
시크릿은 소스에 넣지 않고 1Password 또는 Cloudflare Workers Secrets로 관리합니다.

### 검증 명령

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

전체 테스트에는 Go와 Python도 필요합니다. 세부 명령과 실행 조건은
[package.json](package.json), [테스트 가이드](tests/AGENTS.md)를 참고하세요.

### 코드 탐색과 기여

- [저장소 구조와 규칙](./AGENTS.md)
- [설계 결정과 운영 문서](docs/README.md)
- [기여 안내](CONTRIBUTING.md)
- [변경 이력](CHANGELOG.md)

프로덕션 배포 경로는 [배포 구조](docs/architecture/DEPLOYMENT_PIPELINE.md)를 따릅니다.
로컬 실행과 검증은 프로덕션 배포를 수행하지 않습니다.

</details>

---

[MIT License](LICENSE) · 경력 및 협업 문의: [qws941@kakao.com](mailto:qws941@kakao.com)
