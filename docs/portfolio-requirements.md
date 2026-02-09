# Portfolio Worker 요구사항 정의서

## 프로젝트 개요

| 항목         | 내용                                         |
| ------------ | -------------------------------------------- |
| **프로젝트** | Resume Portfolio (resume.jclee.me)           |
| **목적**     | 개인 포트폴리오 사이트 - Cyberpunk 터미널 UI |
| **플랫폼**   | Cloudflare Workers (Edge-deployed)           |
| **작성일**   | 2026-02-05                                   |
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
| F7.1 | MD↔JSON 데이터 동기화 | Markdown에만 있는 데이터 JSON 반영 (CISSP/CISM/AWS 자격증, AI/ML 스킬 등) | ❌   |
| F7.2 | 스킬 숙련도 레벨      | 스키마 8카테고리 vs JSON 6카테고리 불일치 해소 + proficiency 필드 추가    | ❌   |
| F7.3 | 프로젝트 메트릭 보강  | 빈 metrics 필드 채우기 (사용자 수, 성능 지표, 기술 스택)                  | ❌   |
| F7.4 | 자격증 상세 정보      | 만료일(expiry), 자격번호(credential URL) 필드 추가                        | ❌   |
| F7.5 | GitHub URL 정규화     | github.com URL에 https:// 프로토콜 누락 수정                              | ❌   |
| F7.6 | 성과 정량화           | 미정량 성과 4건에 수치 보강 (541nodes/500RPS/40h→08h 수준)                | ❌   |

### F8. 콘텐츠 확장

> 감사 결과: 현대 포트폴리오 대비 콘텐츠 완성도 평가.
> About(60%), Projects(60%), Skills(50%), Contact(70%) 섹션 보강 필요.

| ID   | 기능                   | 설명                                                     | 현재 점수 | 구현 |
| ---- | ---------------------- | -------------------------------------------------------- | --------- | ---- |
| F8.1 | GitHub 저장소 쇼케이스 | 대표 저장소 카드 (stars, language, description) 표시     | -         | ❌   |
| F8.2 | 역할별 임팩트 메트릭   | 경력 카드에 정량적 성과 (비용 절감, 성능 개선 수치) 표시 | 80%       | ❌   |
| F8.3 | 프로젝트 라이브 링크   | 각 프로젝트에 데모 URL / 스크린샷 추가                   | 60%       | ❌   |
| F8.4 | 스킬 숙련도 시각화     | 프로그레스 바 또는 레이더 차트로 숙련도 표현             | 50%       | ❌   |
| F8.5 | 자격증 뱃지 표시       | 자격증 로고/뱃지 이미지 + 검증 링크                      | 70%       | ❌   |
| F8.6 | 소셜 링크 확장         | LinkedIn, GitHub 프로필 등 소셜 프레즌스 링크 추가       | 70%       | ❌   |
| F8.7 | About 섹션 확장        | 경력 하이라이트, 기술 철학, 관심 분야 추가               | 60%       | ❌   |
| F8.8 | OSS 기여 표시          | 오픈소스 컨트리뷰션 이력 섹션 추가                       | -         | ❌   |

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

---

## 요약

| 카테고리                 | 총 항목 | 완료    | 완료율  |
| ------------------------ | ------- | ------- | ------- |
| F1. UI 컴포넌트          | 14      | 14      | 100%    |
| F2. 인터랙티브 기능      | 20      | 20      | 100%    |
| F3. 네비게이션/레이아웃  | 6       | 6       | 100%    |
| F4. SEO/메타데이터       | 13      | 13      | 100%    |
| F5. 다국어 지원          | 4       | 4       | 100%    |
| F6. PWA 기능             | 5       | 5       | 100%    |
| **F7. SSoT 데이터 품질** | **6**   | **0**   | **0%**  |
| **F8. 콘텐츠 확장**      | **8**   | **0**   | **0%**  |
| NF1. 빌드 파이프라인     | 8       | 8       | 100%    |
| NF2. API 엔드포인트      | 9       | 9       | 100%    |
| NF3. 보안                | 11      | 11      | 100%    |
| NF4. 성능                | 9       | 9       | 100%    |
| NF5. 관측성              | 10      | 10      | 100%    |
| **총합**                 | **123** | **109** | **89%** |

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

---

## 관련 문서

- [AGENTS.md](../AGENTS.md) - 프로젝트 개요
- [typescript/portfolio-worker/AGENTS.md](../typescript/portfolio-worker/AGENTS.md) - 빌드 파이프라인
- [cloudflare-workflows-requirements.md](./cloudflare-workflows-requirements.md) - Job Automation 요구사항
