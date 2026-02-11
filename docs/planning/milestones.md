# 마일스톤 로드맵

## 프로젝트 개요

| 항목       | 내용                 |
| ---------- | -------------------- |
| **기간**   | 2026-02-05 ~ 진행중  |
| **커밋**   | 170+ (Feb 5–11 기준) |
| **세션**   | 48 개발 세션         |
| **브랜치** | master               |
| **작성일** | 2026-02-11           |

---

## 완료된 마일스톤

### M1. Portfolio Neon Redesign ✅

| 항목         | 내용                                         |
| ------------ | -------------------------------------------- |
| **기간**     | 2026-02-05 ~ 2026-02-07                      |
| **요구사항** | F1 (14), F2 (20), F3 (6) — 40항목 전체 완료  |
| **산출물**   | Cyberpunk 터미널 UI, 매트릭스 배경, CRT 효과 |

- 14개 UI 컴포넌트 (터미널 윈도우, 히어로, 섹션별 카드)
- 20개 인터랙티브 CLI 명령어 (help, neofetch, snake 게임 포함)
- 반응형 그리드, 모듈러 CSS (8개 스타일시트 분리)
- 네온 컬러 팔레트, 타이핑/글리치 애니메이션

### M2. SEO & PWA Foundation ✅

| 항목         | 내용                                           |
| ------------ | ---------------------------------------------- |
| **기간**     | 2026-02-05 ~ 2026-02-07                        |
| **요구사항** | F4 (13), F5 (4), F6 (5) — 22항목 전체 완료     |
| **산출물**   | OG/Twitter 메타, JSON-LD, 다국어, PWA manifest |

- SEO 메타데이터 (Open Graph, Twitter Card, JSON-LD Person/WebSite)
- 한국어/영어 다국어 지원 (hreflang 태그)
- PWA (manifest.json, Service Worker, 앱 아이콘, 바로가기)
- GA4 + Cloudflare Analytics 이중 추적

### M3. Build Pipeline & Security ✅

| 항목         | 내용                                         |
| ------------ | -------------------------------------------- |
| **기간**     | 2026-02-05 ~ 2026-02-08                      |
| **요구사항** | NF1 (8), NF2 (9), NF3 (11), NF4 (9) — 37항목 |
| **산출물**   | generate-worker.js, CSP 해시, Edge 배포      |

- HTML minification, CSP SHA-256 해시 자동 추출
- 9개 API 엔드포인트 (/, /en, /health, /metrics 등)
- 11개 보안 헤더 (CSP, HSTS, X-Frame-Options 등)
- Edge deployment, zero runtime I/O, 355KB 번들

### M4. Observability ✅

| 항목         | 내용                               |
| ------------ | ---------------------------------- |
| **기간**     | 2026-02-06 ~ 2026-02-08            |
| **요구사항** | NF5 (10) — 10항목 전체 완료        |
| **산출물**   | Prometheus 메트릭, Web Vitals 수집 |

- Prometheus exposition format (/metrics)
- Web Vitals 5종 수집 (LCP, INP, CLS, FCP, TTFB)
- Geographic metrics (국가/Colo별 분포)
- Health endpoint JSON 응답

### M5. Cloudflare Workflows ✅

| 항목         | 내용                                                    |
| ------------ | ------------------------------------------------------- |
| **기간**     | 2026-02-07 ~ 2026-02-09                                 |
| **요구사항** | 별도 문서 (cloudflare-workflows-requirements.md) 62항목 |
| **산출물**   | 8개 Cloudflare Workflow 구현                            |

- health-check, backup, cleanup 워크플로우
- job-automation 워커 연동
- 별도 요구사항 정의서 100% 완료 (62/62)

### M6. Stealth Browser Migration ✅

| 항목       | 내용                                            |
| ---------- | ----------------------------------------------- |
| **기간**   | 2026-02-08 ~ 2026-02-10                         |
| **산출물** | 3개 크롤러 withStealthBrowser 마이그레이션 완료 |

- BaseCrawler 기반 anti-bot stealth 아키텍처
- Wanted, Saramin, Jobkorea 크롤러 통합
- 세션 관리, 쿠키 퍼시스턴스

### M7. CI/CD Pipeline Foundation ✅

| 항목         | 내용                                      |
| ------------ | ----------------------------------------- |
| **기간**     | 2026-02-08 ~ 2026-02-11                   |
| **요구사항** | NF6 (9) — 9항목 전체 완료                 |
| **산출물**   | ci.yml, staging deploy, composite actions |

- ci.yml 메인 파이프라인 (lint, test, build, deploy)
- 스테이징 환경 자동 배포
- Auto-rollback, PR preview
- Composite actions (.github/actions/setup/)
- permissions block 최소 권한 적용, security-scan 강화
- ESLint warning 임계값 설정, 배포 작업 타임아웃 적용

### M8. Test Infrastructure & Cleanup ✅ (부분)

| 항목         | 내용                                     |
| ------------ | ---------------------------------------- |
| **기간**     | 2026-02-09 ~ 2026-02-12                  |
| **요구사항** | NF7 (7) — 6항목 완료, 1항목 미완료       |
| **산출물**   | Jest + Playwright 설정, 데드 테스트 정리 |

- Jest 단위 테스트 프레임워크
- Playwright E2E 테스트 (Chromium)
- 데드 테스트 파일 정리, auth.js 복원
- 비주얼 리그레션 테스트 (11개 스냅샷 베이스라인, desktop+mobile)
- CSP 해시 불일치 자동 감지 테스트
- **미완료**: NF7.5 Sentry DSN (7 tests skipped — DSN 미발급, 차단됨)

### M9. Documentation ✅

| 항목         | 내용                                               |
| ------------ | -------------------------------------------------- |
| **기간**     | 2026-02-09 ~ 2026-02-12                            |
| **요구사항** | NF8 (5) — 5항목 전체 완료                          |
| **산출물**   | 27개 AGENTS.md, CONTRIBUTING.md, CODEOWNERS, JSDoc |

- 27개 AGENTS.md 계층 구조 (전 디렉토리 커버)
- CONTRIBUTING.md 기여 가이드라인
- .github/CODEOWNERS PR 리뷰어 자동 지정
- ESLint flat config (eslint.config.cjs)
- JSDoc 공개 API 문서화 (portfolio-worker/lib/ 5개 모듈)

---

### M10. SSoT Data Quality ✅

| 항목         | 내용                              |
| ------------ | --------------------------------- |
| **기간**     | 2026-02-09 ~ 2026-02-12           |
| **요구사항** | F7 (6) — 6항목 전체 완료          |
| **산출물**   | resume_data.json 데이터 품질 정비 |

- MD↔JSON 동기화, 검증불가 수치 제거
- 스킬 숙련도 proficiency 필드 추가 (8카테고리 정합)
- 경력 프로젝트 7건 metrics 보강
- 자격증 credentialId 필드 추가
- GitHub URL https:// 프로토콜 정규화 확인

### M11. Job Dashboard Integration ✅

| 항목         | 내용                                                |
| ------------ | --------------------------------------------------- |
| **기간**     | 2026-02-11 ~ 2026-02-12                             |
| **요구사항** | F9 (6) — 6항목 전체 완료                            |
| **산출물**   | entry.js 통합 라우터, Dashboard SPA, REST API, Auth |

- Unified router (entry.js), /job/\* path routing
- Dashboard worker SPA (dashboard.js — 자동화, 통계, CRUD 모달)
- 14개 API 핸들러, 40+ REST 엔드포인트
- Bearer+cookie 인증, CSRF, rate-limit, webhook 서명 검증
- /job/health 헬스체크 엔드포인트

---

## 미시작 마일스톤

### M12. Content Expansion ✅

| 항목         | 내용                                             |
| ------------ | ------------------------------------------------ |
| **기간**     | 2026-02-12                                       |
| **요구사항** | F8 (8) — 8항목 전체 완료                         |
| **산출물**   | cards.js 확장, About 섹션 확장, OSS 플레이스홀더 |

- GitHub 저장소 쇼케이스 (stars/language/forks 렌더링)
- 경력 카드 임팩트 메트릭 [METRICS] 표시
- 프로젝트 GitHub/Demo 링크 버튼
- 스킬 숙련도 [95] 뱃지 시각화 (8카테고리)
- 자격증 [ACTIVE]/[EXPIRED] 상태 뱃지
- LinkedIn 소셜 링크 확장
- About 섹션 3블록 확장 (career/philosophy/focus)
- ossContributions 플레이스홀더 구조

### M13. CI/CD Hardening ✅

| 항목         | 내용                                                      |
| ------------ | --------------------------------------------------------- |
| **기간**     | 2026-02-11                                                |
| **요구사항** | NF6.6–NF6.9 — 4항목 전체 완료                             |
| **산출물**   | permissions block, security-scan, ESLint 임계값, 타임아웃 |

- ci.yml permissions block 최소 권한 적용
- security-scan continue-on-error 제거
- ESLint warning 임계값 138→120 감소
- 배포 작업 타임아웃 설정

### M14. Sentry Integration 📋

| 항목         | 내용                          |
| ------------ | ----------------------------- |
| **요구사항** | NF7.5 — 1항목 미완료 (차단됨) |

- NF7.5: Sentry DSN 설정 (현재 7개 테스트 skip — DSN 미발급, 차단됨)

---

## 전체 진행 현황

| 상태      | 마일스톤 수 | 항목 수 |
| --------- | ----------- | ------- |
| ✅ 완료   | 13          | 149     |
| 📋 미시작 | 1           | 0/1     |
| **총합**  | **14**      | **150** |

---

## 관련 문서

- [portfolio-requirements.md](../portfolio-requirements.md) — 요구사항 정의서 (150항목)
- [cloudflare-workflows-requirements.md](../cloudflare-workflows-requirements.md) — Workflow 요구사항 (62항목)
- [NEXT_STEPS_ROADMAP.md](./NEXT_STEPS_ROADMAP.md) — 장기 로드맵
- [AGENTS.md](../../AGENTS.md) — 프로젝트 개요
