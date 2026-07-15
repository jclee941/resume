# Portfolio Worker 요구사항 정의서

> **SUPERSEDED / 규범 종료**
>
> 이 문서의 Cyberpunk 터미널 UI 및 기능 체크리스트는 과거 구현 이력으로만
> 보존됩니다. 현재 포트폴리오의 정체성·시각·반응형·컴포넌트 규범은
> [Portfolio Design System](../apps/portfolio/DESIGN.md), 정확한 IA·다국어 문구·구현
> 경계는 [Portfolio Visual Masterplan](./architecture/portfolio-visual-masterplan.md)이
> 소유합니다. 아래 항목은 새 구현을 강제하거나 현재 수락 기준으로 사용할
> 수 없습니다.

## 현재 규범

- 공개 정체성은 `Full-Stack Engineer`를 주제로, `Security Automation &
  Edge Infrastructure`를 보조 강점으로 사용합니다.
- 페이지 IA, 다국어 문구, featured build, capability label, 반응형
  규칙은 visual masterplan이 소유합니다.
- 색상, 타이포그래피, 컴포넌트 상태, 모션, 접근성 제약은
  Portfolio Design System이 소유합니다.
- 실제 런타임과 배포 구조는 소스, ADR, Cloudflare 설정이 소유하며 이
  역사 문서가 덮어쓰지 않습니다.

## 역사적 구현 범위

다음 항목은 2026년 2월 시점의 구현 재고였으며 현재 필수 요구사항이
아닙니다.

### 표면과 상호작용

- 단일 페이지 포트폴리오, 반응형 네비게이션, 다크 모드, 접근 가능한
  키보드 상호작용이 구현되었습니다.
- 커리어, 프로젝트, 기술, 연락처, 이력서 다운로드 표면이 존재했습니다.
- 과거의 Terminal Window, Command Prompt, status badge 표현은 현재
  디자인 규범에서 제거 대상입니다.

### 데이터와 다국어

- 이력·프로젝트 데이터는 master JSON SSoT에서 포트폴리오 스냅샷으로
  동기화되었습니다.
- KO, EN, JA 라우팅과 SEO alternate 관계가 구현되었습니다.
- JSON-LD, sitemap, robots, PWA manifest는 각각의 현재 소스가 소유합니다.

### Worker 및 API

- Cloudflare Worker가 포트폴리오 페이지와 정적 자산을 제공합니다.
- 병합된 edge entry가 `/job/*` dashboard API를 in-process로 라우팅합니다.
- health, metrics, PDF, OG, sitemap, robots 경로는 현재 라우트 소스와
  계약 테스트로 검증합니다.

### 보안과 신뢰성

아래 항목은 시각 브랜드와 관계없이 유지해야 할 런타임 불변조건입니다.

- CSP hash 생성과 검증을 우회하지 않습니다.
- HSTS, content-type, frame, referrer, permissions 보안 헤더를 현재 계약에
  맞게 유지합니다.
- 외부 입력 검증, rate limit, CORS, secret 분리, 감사 로깅을 약화하지
  않습니다.
- 생성 산출물을 수작업하지 않고 정본 소스와 검증된 생성기를
  사용합니다.

### 빌드·테스트·배포

- npm workspace 명령이 빌드, 린트, 타입 검사, Jest, Playwright 진입점을
  소유합니다.
- Cloudflare Workers Builds가 정상 프로덕션 배포 권한을 소유합니다.
- 로컬 Wrangler는 dry-run 검증 또는 비상 운영 표면으로만 사용합니다.
- 배포 후에는 live health SHA와 프로덕션 검증을 실행합니다.

## 역사 보존 정책

세부 항목 ID와 2026년 2월 완료 통계는 Git 이력에서 조회합니다. 현재
문서는 낡은 150개 체크리스트를 다시 규범화하지 않고, 현재 소유권과
유지해야 할 비시각 불변조건만 명시합니다.

## 관련 문서

- [Portfolio Design System](../apps/portfolio/DESIGN.md) - 현재 시각·접근성 구현 계약
- [Portfolio Visual Masterplan](./architecture/portfolio-visual-masterplan.md) - 현재 IA·다국어 문구·소스 경계
- [AGENTS.md](../AGENTS.md) - 프로젝트 개요
- [apps/portfolio/AGENTS.md](../apps/portfolio/AGENTS.md) - 빌드·콘텐츠 소유권
