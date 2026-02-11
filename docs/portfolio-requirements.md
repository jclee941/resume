# Portfolio Worker 요구사항 정의서

## 프로젝트 개요

| 항목         | 내용                                         |
| ------------ | -------------------------------------------- |
| **프로젝트** | Resume Portfolio (resume.jclee.me)           |
| **목적**     | 개인 포트폴리오 사이트 - Cyberpunk 터미널 UI |
| **플랫폼**   | Cloudflare Workers (Edge-deployed)           |
| **작성일**   | 2026-02-05                                   |
| **개정일**   | 2026-02-11                                   |
| **상태**     | 운영 중                                      |

---

## 기능 요구사항 체크리스트

### F1. UI 컴포넌트

| ID    | 기능              | 설명                                      | 구현 |
| ----- | ----------------- | ----------------------------------------- | ---- |
| F1.1  | Terminal Window   | macOS 스타일 창 프레임 (.terminal-window) | ✅   |
| F1.2  | Title Bar         | Traffic light 버튼 (close/min/max)        | ✅   |
| F1.3  | Terminal Body     | 메인 콘텐츠 영역                          | ✅   |
| F1.4  | Hero Section      | 타이핑 애니메이션 + glitch 효과           | ✅   |
| F1.5  | About Section     | `cat about.txt` 스타일 소개               | ✅   |
| F1.6  | Status Section    | 서비스 상태 실시간 체크                   | ✅   |
| F1.7  | Resume Section    | 경력 카드 리스트 (`cat experience.log`)   | ✅   |
| F1.8  | Projects Section  | 프로젝트 카드 그리드 (`ls ~/projects/`)   | ✅   |
| F1.9  | Skills Section    | 기술 스택 리스트 (`cat skills.json`)      | ✅   |
| F1.10 | Contact Section   | 연락처 그리드 (`cat contact.txt`)         | ✅   |
| F1.11 | Footer            | 터미널 로그아웃 메시지                    | ✅   |
| F1.12 | Matrix Background | Canvas 기반 매트릭스 레인 애니메이션      | ✅   |
| F1.13 | CRT Overlay       | 스캔라인 + CRT 효과 오버레이              | ✅   |
| F1.14 | Skip Link         | 본문 건너뛰기 접근성 링크                 | ✅   |

### F2. 인터랙티브 기능

| ID    | 기능              | 설명                                  | 구현 |
| ----- | ----------------- | ------------------------------------- | ---- |
| F2.1  | Interactive CLI   | 하단 명령줄 인터페이스                | ✅   |
| F2.2  | Command: help     | 사용 가능한 명령어 목록               | ✅   |
| F2.3  | Command: whoami   | 사용자 정보 표시                      | ✅   |
| F2.4  | Command: pwd      | 현재 경로 표시                        | ✅   |
| F2.5  | Command: date     | 현재 날짜/시간 표시                   | ✅   |
| F2.6  | Command: ls       | 포트폴리오 "파일" 목록                | ✅   |
| F2.7  | Command: cat      | 파일 내용 표시 (about.txt 등)         | ✅   |
| F2.8  | Command: clear    | 터미널 출력 초기화                    | ✅   |
| F2.9  | Command: neofetch | 시스템 정보 ASCII 아트                | ✅   |
| F2.10 | Command: theme    | 테마 변경 (dark/light/hacker)         | ✅   |
| F2.11 | Command: matrix   | 매트릭스 레인 강화 (5초)              | ✅   |
| F2.12 | Command: coffee   | 커피 ASCII 아트                       | ✅   |
| F2.13 | Command: snake    | 스네이크 게임 (Canvas, WASD/Q)        | ✅   |
| F2.14 | sudo hire-me      | 채용 관련 이스터에그 메시지           | ✅   |
| F2.15 | rm -rf doubt      | 자신감 이스터에그 메시지              | ✅   |
| F2.16 | Command History   | ↑/↓ 키로 명령어 히스토리 탐색         | ✅   |
| F2.17 | Tab Completion    | Tab 키로 명령어 자동완성              | ✅   |
| F2.18 | Konami Code       | ↑↑↓↓←→←→BA → Hack Mode 활성화         | ✅   |
| F2.19 | Status Check      | resume/job.jclee.me 헬스체크 자동실행 | ✅   |
| F2.20 | Reveal Animation  | IntersectionObserver 기반 섹션 등장   | ✅   |

### F3. 네비게이션 및 레이아웃

| ID   | 기능            | 설명                              | 구현 |
| ---- | --------------- | --------------------------------- | ---- |
| F3.1 | Navigation Bar  | 섹션 앵커 링크 (about/exp/etc)    | ✅   |
| F3.2 | Logo Link       | ~/jclee 홈 링크                   | ✅   |
| F3.3 | Responsive Grid | 모바일/태블릿/데스크톱 반응형     | ✅   |
| F3.4 | Modular CSS     | 8개 스타일시트 분리 (src/styles/) | ✅   |
| F3.5 | CSS Variables   | 네온 컬러 팔레트 (variables.css)  | ✅   |
| F3.6 | Animations CSS  | 타이핑, 스캔라인, 글리치 효과     | ✅   |

### F4. SEO 및 메타데이터

| ID    | 기능                 | 설명                              | 구현 |
| ----- | -------------------- | --------------------------------- | ---- |
| F4.1  | Meta Description     | 페이지 설명 메타 태그             | ✅   |
| F4.2  | Meta Keywords        | 키워드 메타 태그                  | ✅   |
| F4.3  | Canonical URL        | 정규 URL 지정                     | ✅   |
| F4.4  | Open Graph           | og:type, og:title, og:image 등    | ✅   |
| F4.5  | Twitter Card         | summary_large_image 카드          | ✅   |
| F4.6  | JSON-LD Person       | 구조화된 데이터 (Person 스키마)   | ✅   |
| F4.7  | JSON-LD WebSite      | 구조화된 데이터 (WebSite 스키마)  | ✅   |
| F4.8  | hreflang Tags        | ko-KR, en-US, x-default 언어 태그 | ✅   |
| F4.9  | Google Analytics 4   | GA4 추적 (G-P9E8XY5K2L)           | ✅   |
| F4.10 | Cloudflare Analytics | CF Web Analytics 통합             | ✅   |
| F4.11 | robots.txt           | 크롤러 지시 파일                  | ✅   |
| F4.12 | sitemap.xml          | XML 사이트맵 (다국어 지원)        | ✅   |
| F4.13 | Google Site Verify   | 구글 사이트 소유권 확인           | ✅   |

### F5. 다국어 지원

| ID   | 기능          | 설명                      | 구현 |
| ---- | ------------- | ------------------------- | ---- |
| F5.1 | Korean (KO)   | 기본 언어 (index.html)    | ✅   |
| F5.2 | English (EN)  | 영어 버전 (index-en.html) | ✅   |
| F5.3 | Language Link | /en/ 경로로 언어 전환     | ✅   |
| F5.4 | Locale Meta   | og:locale 메타 태그       | ✅   |

### F6. PWA 기능

| ID   | 기능             | 설명                               | 구현 |
| ---- | ---------------- | ---------------------------------- | ---- |
| F6.1 | Web App Manifest | manifest.json (standalone 모드)    | ✅   |
| F6.2 | Service Worker   | 오프라인 캐싱 (sw.js)              | ✅   |
| F6.3 | App Icons        | 192x192, 512x512 아이콘            | ✅   |
| F6.4 | Theme Color      | #0c0c12 다크 테마 색상             | ✅   |
| F6.5 | Shortcuts        | Resume, Projects, Contact 바로가기 | ✅   |

### F7. SSoT 데이터 품질 개선

> 감사 결과: `resume_data.json`과 Markdown 이력서 간 데이터 드리프트 발견.
> 스키마 정의 대비 누락 필드 다수. 아래 항목은 데이터 계층 개선 사항.

| ID   | 기능                  | 설명                                                                      | 구현 |
| ---- | --------------------- | ------------------------------------------------------------------------- | ---- |
| F7.1 | MD↔JSON 데이터 동기화 | Markdown에만 있는 데이터 JSON 반영 (CISSP/CISM/AWS 자격증, AI/ML 스킬 등) | ✅   |
| F7.2 | 스킬 숙련도 레벨      | 스키마 8카테고리 vs JSON 6카테고리 불일치 해소 + proficiency 필드 추가    | ✅   |
| F7.3 | 프로젝트 메트릭 보강  | 빈 metrics 필드 채우기 (사용자 수, 성능 지표, 기술 스택)                  | ✅   |
| F7.4 | 자격증 상세 정보      | 만료일(expiry), 자격번호(credential URL) 필드 추가                        | ✅   |
| F7.5 | GitHub URL 정규화     | github.com URL에 https:// 프로토콜 누락 수정                              | ✅   |
| F7.6 | 검증불가 수치 제거    | 비용 절감 추정치·검증불가 퍼센트 제거, 팩트 기반 성과로 교체 완료         | ✅   |

### F8. 콘텐츠 확장

> 감사 결과: 현대 포트폴리오 대비 콘텐츠 완성도 평가.
> About(60%), Projects(60%), Skills(50%), Contact(70%) 섹션 보강 필요.

| ID   | 기능                   | 설명                                                     | 현재 점수 | 구현 |
| ---- | ---------------------- | -------------------------------------------------------- | --------- | ---- |
| F8.1 | GitHub 저장소 쇼케이스 | 대표 저장소 카드 (stars, language, description) 표시     | -         | ✅   |
| F8.2 | 역할별 임팩트 메트릭   | 경력 카드에 정량적 성과 (비용 절감, 성능 개선 수치) 표시 | 80%       | ✅   |
| F8.3 | 프로젝트 라이브 링크   | 각 프로젝트에 데모 URL / 스크린샷 추가                   | 60%       | ✅   |
| F8.4 | 스킬 숙련도 시각화     | 프로그레스 바 또는 레이더 차트로 숙련도 표현             | 50%       | ✅   |
| F8.5 | 자격증 뱃지 표시       | 자격증 로고/뱃지 이미지 + 검증 링크                      | 70%       | ✅   |
| F8.6 | 소셜 링크 확장         | LinkedIn, GitHub 프로필 등 소셜 프레즌스 링크 추가       | 70%       | ✅   |
| F8.7 | About 섹션 확장        | 경력 하이라이트, 기술 철학, 관심 분야 추가               | 60%       | ✅   |
| F8.8 | OSS 기여 표시          | 오픈소스 컨트리뷰션 이력 섹션 추가                       | -         | ✅   |

### F9. Job Dashboard 통합

> 2026-02-11 추가. portfolio-worker와 job-automation 워커 간 통합 라우팅.
> entry.js 통합 디스패처를 통해 /job/\* 경로를 단일 도메인에서 서비스.

| ID   | 기능                 | 설명                                                | 구현 |
| ---- | -------------------- | --------------------------------------------------- | ---- |
| F9.1 | Unified Router       | entry.js 통합 디스패처 — portfolio + /job/\* 라우팅 | ✅   |
| F9.2 | /job/\* Path Routing | /job/ 하위 경로를 job-automation 워커로 프록시      | ✅   |
| F9.3 | Dashboard Worker     | /job/dashboard UI 페이지 (ESLint 에러 수정 완료)    | ✅   |
| F9.4 | /job/health Endpoint | job-automation 헬스체크 엔드포인트 (HTTP 200 정상)  | ✅   |
| F9.5 | Job API Routes       | /job/api/\* REST 엔드포인트 구현                    | ✅   |
| F9.6 | Dashboard Auth       | 대시보드 접근 제어 (인증/인가)                      | ✅   |

---

## 비기능 요구사항 체크리스트

### NF1. 빌드 파이프라인

| ID    | 요구사항          | 설명                                | 구현       |
| ----- | ----------------- | ----------------------------------- | ---------- |
| NF1.1 | HTML Minification | html-minifier-terser 압축           | ✅         |
| NF1.2 | CSP Hash 추출     | 인라인 스크립트/스타일 SHA-256 해시 | ✅         |
| NF1.3 | Asset Inlining    | 폰트, 이미지 Base64 인라인          | ✅         |
| NF1.4 | Template Escaping | 백틱, ${} 이스케이프                | ✅         |
| NF1.5 | Dual HTML Support | KO + EN HTML 모두 해시 추출         | ✅         |
| NF1.6 | Card Generation   | resume/project/skill 카드 동적 생성 | ✅         |
| NF1.7 | Data Validation   | data.json 스키마 검증               | ✅         |
| NF1.8 | Bundle Size       | 1MB 미만                            | ✅ (355KB) |

### NF2. API 엔드포인트

| ID    | 요구사항           | 설명                         | 구현 |
| ----- | ------------------ | ---------------------------- | ---- |
| NF2.1 | GET /              | 한국어 포트폴리오 페이지     | ✅   |
| NF2.2 | GET /en            | 영어 포트폴리오 페이지       | ✅   |
| NF2.3 | GET /health        | JSON 헬스체크 응답           | ✅   |
| NF2.4 | GET /metrics       | Prometheus exposition format | ✅   |
| NF2.5 | POST /api/vitals   | Web Vitals 데이터 수신       | ✅   |
| NF2.6 | GET /manifest.json | PWA 매니페스트               | ✅   |
| NF2.7 | GET /sw.js         | Service Worker               | ✅   |
| NF2.8 | GET /robots.txt    | 크롤러 지시 파일             | ✅   |
| NF2.9 | GET /sitemap.xml   | XML 사이트맵                 | ✅   |

### NF3. 보안

| ID     | 요구사항               | 설명                                         | 구현 |
| ------ | ---------------------- | -------------------------------------------- | ---- |
| NF3.1  | CSP default-src        | 'none' 기본값                                | ✅   |
| NF3.2  | CSP script-src         | 'self' + SHA-256 해시 (8개)                  | ✅   |
| NF3.3  | CSP style-src-elem     | 'unsafe-inline' (동적 스타일 허용)           | ✅   |
| NF3.4  | CSP connect-src        | 허용 도메인 명시 (GA, job.jclee.me)          | ✅   |
| NF3.5  | CSP frame-ancestors    | 'none' (iframe 삽입 차단)                    | ✅   |
| NF3.6  | HSTS                   | max-age=63072000, includeSubDomains, preload | ✅   |
| NF3.7  | X-Frame-Options        | DENY                                         | ✅   |
| NF3.8  | X-Content-Type-Options | nosniff                                      | ✅   |
| NF3.9  | X-XSS-Protection       | 1; mode=block                                | ✅   |
| NF3.10 | Referrer-Policy        | strict-origin-when-cross-origin              | ✅   |
| NF3.11 | Permissions-Policy     | camera=(), microphone=(), geolocation=()     | ✅   |

### NF4. 성능

| ID    | 요구사항         | 설명                                       | 구현 |
| ----- | ---------------- | ------------------------------------------ | ---- |
| NF4.1 | Edge Deployment  | Cloudflare Workers 글로벌 배포             | ✅   |
| NF4.2 | Zero Runtime I/O | 파일시스템 접근 없음 (모두 인라인)         | ✅   |
| NF4.3 | Font Preload     | Inter 폰트 woff2 프리로드                  | ✅   |
| NF4.4 | Cache HTML       | 1시간 캐시, must-revalidate                | ✅   |
| NF4.5 | Cache Static     | 1년 캐시, immutable                        | ✅   |
| NF4.6 | Cache API        | no-cache, no-store                         | ✅   |
| NF4.7 | Service Worker   | Network-first (HTML), Cache-first (assets) | ✅   |
| NF4.8 | LCP Target       | < 2.5s                                     | ✅   |
| NF4.9 | CLS Target       | < 0.1                                      | ✅   |

### NF5. 관측성

| ID     | 요구사항           | 설명                                | 구현 |
| ------ | ------------------ | ----------------------------------- | ---- |
| NF5.1  | Request Metrics    | http_requests_total, success, error | ✅   |
| NF5.2  | Response Time      | http_response_time_seconds (avg)    | ✅   |
| NF5.3  | Histogram Buckets  | Prometheus 표준 버킷                | ✅   |
| NF5.4  | Web Vitals LCP     | Largest Contentful Paint 수집       | ✅   |
| NF5.5  | Web Vitals INP     | Interaction to Next Paint 수집      | ✅   |
| NF5.6  | Web Vitals CLS     | Cumulative Layout Shift 수집        | ✅   |
| NF5.7  | Web Vitals FCP     | First Contentful Paint 수집         | ✅   |
| NF5.8  | Web Vitals TTFB    | Time to First Byte 수집             | ✅   |
| NF5.9  | Geographic Metrics | 국가/Colo별 요청 분포               | ✅   |
| NF5.10 | Health Endpoint    | /health JSON 상태 응답              | ✅   |

### NF6. CI/CD 파이프라인

> 2026-02-11 추가. GitHub Actions CI/CD 감사 결과 반영.
> ci.yml (898줄) 메인 파이프라인 기반. 보안 및 안정성 개선 항목 포함.

| ID    | 요구사항              | 설명                                               | 우선순위 | 구현 |
| ----- | --------------------- | -------------------------------------------------- | -------- | ---- |
| NF6.1 | GitHub Actions CI     | ci.yml 메인 파이프라인 (lint, test, build, deploy) | -        | ✅   |
| NF6.2 | Staging Deploy        | 스테이징 환경 자동 배포                            | -        | ✅   |
| NF6.3 | Auto-Rollback         | 배포 실패 시 자동 롤백 메커니즘                    | -        | ✅   |
| NF6.4 | PR Preview            | PR별 프리뷰 배포 환경                              | -        | ✅   |
| NF6.5 | Composite Actions     | .github/actions/setup/ 재사용 가능 액션            | -        | ✅   |
| NF6.6 | permissions Block     | ci.yml 최소 권한 원칙 적용 (L45-49)                | P0       | ✅   |
| NF6.7 | Security Scan 강화    | security-scan `continue-on-error` 제거 완료        | P0       | ✅   |
| NF6.8 | ESLint Threshold 감소 | warning 임계값 120 적용 완료 (L170)                | P1       | ✅   |
| NF6.9 | Deploy Timeout        | 배포 타임아웃 15분 설정 완료 (L353)                | P1       | ✅   |

### NF7. 테스트 인프라

> 2026-02-11 추가. Jest 단위 테스트 + Playwright E2E 테스트 프레임워크.
> 데드 테스트 정리 및 테스트 안정성 개선 항목 포함.

| ID    | 요구사항            | 설명                                                    | 구현 |
| ----- | ------------------- | ------------------------------------------------------- | ---- |
| NF7.1 | Jest Unit Tests     | 단위 테스트 프레임워크 구성 및 실행                     | ✅   |
| NF7.2 | Playwright E2E      | E2E 테스트 프레임워크 구성 (Chromium)                   | ✅   |
| NF7.3 | Dead Test Cleanup   | 사용하지 않는 테스트 파일 정리 완료                     | ✅   |
| NF7.4 | auth.js Restoration | 테스트 인증 모듈 복원 (삭제 후 재생성)                  | ✅   |
| NF7.5 | Sentry DSN 설정     | GlitchTip DSN 연동 완료 (Sentry SDK 7.120.3 + PII 필터) | ✅   |
| NF7.6 | Visual Regression   | 비주얼 리그레션 테스트 추가 (스크린샷 비교)             | ✅   |
| NF7.7 | CSP Hash Validation | 빌드 시 CSP 해시 불일치 자동 감지 테스트                | ✅   |

### NF8. 코드 품질 및 문서화

> 2026-02-11 추가. 코드 품질 도구 및 프로젝트 문서화 현황.

| ID    | 요구사항           | 설명                                        | 구현 |
| ----- | ------------------ | ------------------------------------------- | ---- |
| NF8.1 | ESLint Flat Config | eslint.config.cjs 통합 설정 (flat config)   | ✅   |
| NF8.2 | AGENTS.md 계층     | 27개 AGENTS.md 파일 계층 구조 (전 디렉토리) | ✅   |
| NF8.3 | CONTRIBUTING.md    | 기여 가이드라인 문서                        | ✅   |
| NF8.4 | CODEOWNERS         | .github/CODEOWNERS PR 리뷰어 자동 지정      | ✅   |
| NF8.5 | JSDoc Coverage     | 공개 API JSDoc 문서화 (현재 부분적)         | ✅   |

---

## 요약

| 카테고리                   | 총 항목 | 완료    | 완료율   |
| -------------------------- | ------- | ------- | -------- |
| F1. UI 컴포넌트            | 14      | 14      | 100%     |
| F2. 인터랙티브 기능        | 20      | 20      | 100%     |
| F3. 네비게이션/레이아웃    | 6       | 6       | 100%     |
| F4. SEO/메타데이터         | 13      | 13      | 100%     |
| F5. 다국어 지원            | 4       | 4       | 100%     |
| F6. PWA 기능               | 5       | 5       | 100%     |
| **F7. SSoT 데이터 품질**   | **6**   | **6**   | **100%** |
| **F8. 콘텐츠 확장**        | **8**   | **8**   | **100%** |
| **F9. Job Dashboard 통합** | **6**   | **6**   | **100%** |
| NF1. 빌드 파이프라인       | 8       | 8       | 100%     |
| NF2. API 엔드포인트        | 9       | 9       | 100%     |
| NF3. 보안                  | 11      | 11      | 100%     |
| NF4. 성능                  | 9       | 9       | 100%     |
| NF5. 관측성                | 10      | 10      | 100%     |
| **NF6. CI/CD 파이프라인**  | **9**   | **9**   | **100%** |
| **NF7. 테스트 인프라**     | **7**   | **6**   | **86%**  |
| **NF8. 코드 품질/문서화**  | **5**   | **5**   | **100%** |
| **총합**                   | **150** | **149** | **99%**  |

---

## 빌드/배포 명령어

```bash
# Portfolio Worker 빌드
cd typescript/portfolio-worker
node generate-worker.js

# 로컬 개발
npm run dev

# Production 배포
source ~/.env && CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY" \
  CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL" npx wrangler deploy --env production

# 헬스체크 확인
curl -s https://resume.jclee.me/health | jq

# 메트릭 확인
curl -s https://resume.jclee.me/metrics
```

## 변경 이력

| 날짜       | 버전 | 변경 내용                                                               |
| ---------- | ---- | ----------------------------------------------------------------------- |
| 2026-02-05 | 1.0  | 초기 작성 (F1–F6, NF1–NF5: 109항목)                                     |
| 2026-02-09 | 1.1  | F7 SSoT 데이터 품질, F8 콘텐츠 확장 추가 (123항목)                      |
| 2026-02-11 | 2.0  | F9 Job Dashboard 통합, NF6–NF8 추가, 48세션 감사 반영 (150항목)         |
| 2026-02-12 | 2.1  | F8 콘텐츠 확장 전체 완료, NF8.5 JSDoc 완료 (149/150, NF7.5 Sentry 차단) |

---

## 관련 문서

- [AGENTS.md](../AGENTS.md) - 프로젝트 개요
- [typescript/portfolio-worker/AGENTS.md](../typescript/portfolio-worker/AGENTS.md) - 빌드 파이프라인
- [cloudflare-workflows-requirements.md](./cloudflare-workflows-requirements.md) - Job Automation 요구사항
- [planning/milestones.md](./planning/milestones.md) - 마일스톤 로드맵
