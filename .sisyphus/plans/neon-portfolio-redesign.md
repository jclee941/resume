# Neon/Terminal Portfolio Redesign

## TL;DR

> **Quick Summary**: Resume portfolio 테마를 미니멀 화이트에서 다크 네온/터미널 스타일로 전환. CSS 컬러 팔레트 교체, 글로우 이펙트 추가, 히어로 타이핑 애니메이션, 하이브리드 스킬 UI 구현.
> 
> **Deliverables**:
> - 7개 CSS 파일 네온 테마 오버홀
> - 2개 HTML 파일 (KO/EN) 구조 업데이트
> - theme.js 다크 온리 모드 전환
> - worker.js 재생성 및 배포
> 
> **Estimated Effort**: Medium (4-6시간)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 0 → Task 1 → Task 2/3/4 (병렬) → Task 5 → Task 6 → Task 7

---

## Context

### Original Request
Resume portfolio (resume.jclee.me)를 미니멀 화이트 테마에서 다크 모드 + 네온/터미널/사이버펑크 스타일로 리디자인.

### Interview Summary
**Key Discussions**:
- **Theme Toggle**: 다크 온리 - 라이트 모드 제거
- **Animation Intensity**: Moderate - 타이핑 효과, 호버 글로우, 카드 fade-in. 스캔라인/글리치 없음
- **Skills Layout**: 하이브리드 - Observability는 프로그레스 바, 나머지는 글로우 태그
- **Verification**: 배포 후 수동 확인
- **Rollback**: 작업 전 git tag 생성

### Technical Decisions
- `[data-theme="dark"]` 조건부 스타일 제거 → `:root`에서 다크 기본값
- OKLCH 유지하되 글로우 효과용 hex/rgba 추가
- JetBrains Mono 터미널 느낌 강화, Inter 본문 유지
- CSP 해시는 generate-worker.js가 자동 추출 (KO + EN 유니온)

---

## Work Objectives

### Core Objective
미니멀 화이트 테마를 다크 네온/터미널 스타일로 전환하여 시각적 임팩트와 개성 강화.

### Concrete Deliverables
- `src/styles/variables.css` - 네온 컬러 팔레트
- `src/styles/base.css` - 다크 배경 기본값
- `src/styles/components.css` - 글로우 카드, 타이핑 효과, 스킬 바
- `src/styles/layout.css` - 섹션 배경 강화
- `src/styles/utilities.css` - 글로우 유틸리티 클래스
- `src/styles/media.css` - 반응형 조정
- `src/scripts/modules/theme.js` - 다크 온리 간소화
- `index.html` + `index-en.html` - 히어로 및 스킬 섹션 구조

### Definition of Done
- [ ] resume.jclee.me 접속 시 다크 네온 테마 표시
- [ ] 히어로 섹션에 타이핑 애니메이션 동작
- [ ] 호버 시 카드/링크에 글로우 효과
- [ ] Observability 스킬에 프로그레스 바 표시
- [ ] CSP 위반 없음 (콘솔 에러 없음)
- [ ] KO/EN 양쪽 동일하게 동작

### Must Have
- 다크 배경 (#0c0c12 또는 유사)
- 사이안(#00f0ff) + 마젠타(#ff00ff) 네온 액센트
- 호버 글로우 효과 (box-shadow)
- 타이핑 애니메이션 (히어로)
- Observability 스킬 프로그레스 바

### Must NOT Have (Guardrails)
- 라이트 모드 지원 (제거)
- 스캔라인/글리치/과도한 애니메이션
- 외부 라이브러리 (바닐라 JS/CSS만)
- worker.js 직접 수정 (generate-worker.js로 재생성)
- data.json 변경 (데이터 구조 유지)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: N/A (CSS/비주얼 작업)
- **User wants tests**: Manual-only
- **Framework**: N/A

### Manual Verification Checklist

배포 후 다음 항목 수동 확인:

**Korean (resume.jclee.me)**:
- [ ] 페이지 배경이 다크 (#0c0c12 계열)
- [ ] 히어로 이름에 타이핑 애니메이션
- [ ] 카드 호버 시 사이안/마젠타 글로우
- [ ] Observability 스킬이 프로그레스 바로 표시
- [ ] 나머지 스킬이 글로우 태그로 표시
- [ ] 콘솔에 CSP 에러 없음
- [ ] 모바일 뷰 (375px) 정상 표시

**English (resume.jclee.me/en)**:
- [ ] 동일한 스타일 적용
- [ ] 영문 텍스트 레이아웃 정상

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Preparation):
└── Task 0: Git tag 생성 (롤백 포인트)

Wave 1 (Foundation - Start After Wave 0):
└── Task 1: variables.css 네온 팔레트 오버홀

Wave 2 (Parallel CSS - Start After Wave 1):
├── Task 2: base.css + theme.js 다크 온리
├── Task 3: components.css 글로우 + 타이핑 + 스킬바
└── Task 4: layout.css + utilities.css + media.css

Wave 3 (HTML - Start After Wave 2):
└── Task 5: index.html + index-en.html 구조 업데이트

Wave 4 (Build & Deploy):
├── Task 6: generate-worker.js 실행 + CSP 확인
└── Task 7: Wrangler 배포 + 수동 검증
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 0 | None | 1 | None |
| 1 | 0 | 2, 3, 4 | None |
| 2 | 1 | 5 | 3, 4 |
| 3 | 1 | 5 | 2, 4 |
| 4 | 1 | 5 | 2, 3 |
| 5 | 2, 3, 4 | 6 | None |
| 6 | 5 | 7 | None |
| 7 | 6 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Approach |
|------|-------|---------------------|
| 0 | 0 | Sequential (git tag) |
| 1 | 1 | Sequential (foundation) |
| 2 | 2, 3, 4 | **Parallel** - 3 agents |
| 3 | 5 | Sequential (HTML depends on CSS) |
| 4 | 6, 7 | Sequential (build → deploy) |

---

## TODOs

- [x] 0. Git Tag 생성 (롤백 포인트)

  **What to do**:
  - 현재 커밋에 `pre-neon-redesign` 태그 생성
  - 태그 확인

  **Must NOT do**:
  - 원격 푸시 (로컬 태그만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 git 명령 1개
  - **Skills**: [`git-master`]
    - `git-master`: Git 태그 생성 전문

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 0 (단독)
  - **Blocks**: Task 1
  - **Blocked By**: None

  **References**:
  - 현재 커밋: 작업 디렉토리의 HEAD

  **Acceptance Criteria**:
  ```bash
  git tag pre-neon-redesign
  git tag -l "pre-neon*"
  # Assert: "pre-neon-redesign" 출력
  ```

  **Commit**: NO

---

- [x] 1. variables.css 네온 컬러 팔레트 오버홀

  **What to do**:
  - `:root`에서 다크 테마를 기본값으로 설정
  - `[data-theme="dark"]` 섹션 제거 (더 이상 필요 없음)
  - 네온 컬러 변수 추가:
    ```css
    --bg-primary: #0c0c12;
    --bg-secondary: #12121a;
    --bg-tertiary: #1a1a24;
    --cyber-cyan: #00f0ff;
    --cyber-magenta: #ff00ff;
    --cyber-purple: #bd00ff;
    --glow-cyan: 0 0 20px rgba(0, 240, 255, 0.6);
    --glow-magenta: 0 0 20px rgba(255, 0, 255, 0.5);
    --glow-text-cyan: 0 0 10px rgba(0, 240, 255, 0.8);
    ```
  - 텍스트 컬러 다크 테마용으로 조정
  - 그라디언트 변수 네온 스타일로 업데이트

  **Must NOT do**:
  - 라이트 모드 변수 유지
  - 기존 spacing/typography 변경

  **Recommended Agent Profile**:
  - **Category**: `artistry`
    - Reason: 색상 시스템 디자인, 시각적 일관성 필요
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: CSS 변수 시스템, 컬러 팔레트 전문

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (Foundation)
  - **Blocks**: Task 2, 3, 4
  - **Blocked By**: Task 0

  **References**:
  **Pattern References**:
  - `src/styles/variables.css:1-238` - 현재 OKLCH 컬러 시스템, 다크 모드 변수 구조

  **Target Design Reference**:
  - 사용자 요청: `--bg-primary:#0c0c12`, `--cyber-cyan:#00f0ff`, `--cyber-magenta:#ff00ff`
  - 글로우: `box-shadow 0 0 20px rgba(0,240,255,0.6)`, `text-shadow 0 0 10px`

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  grep -c "cyber-cyan" apps/portfolio/src/styles/variables.css
  # Assert: >= 1
  
  grep -c "data-theme" apps/portfolio/src/styles/variables.css
  # Assert: 0 (다크 모드 조건부 제거됨)
  
  grep "#0c0c12\|0c0c12" apps/portfolio/src/styles/variables.css
  # Assert: 다크 배경 정의됨
  ```

  **Commit**: YES
  - Message: `style(portfolio): replace color palette with neon/terminal theme`
  - Files: `src/styles/variables.css`

---

- [x] 2. base.css + theme.js 다크 온리 전환

  **What to do**:
  - `base.css`: body 배경을 var(--bg-primary)로 유지 (이미 변수 사용 중)
  - `base.css`: ::selection 색상을 네온 계열로 변경
  - `theme.js`: 전체 로직 간소화
    - localStorage/system preference 체크 제거
    - 토글 이벤트 리스너 제거
    - `html.setAttribute('data-theme', 'dark')` 단순 설정만 유지 (또는 제거)

  **Must NOT do**:
  - 라이트 모드 지원 코드 유지
  - prefers-color-scheme 미디어 쿼리 추가

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 간단한 파일 2개 수정
  - **Skills**: []
    - 단순 코드 정리, 특별한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:
  **Pattern References**:
  - `src/styles/base.css:1-66` - 현재 body 스타일, ::selection
  - `src/scripts/modules/theme.js:1-69` - 현재 테마 토글 로직

  **Acceptance Criteria**:
  ```bash
  # theme.js가 간소화됨
  wc -l apps/portfolio/src/scripts/modules/theme.js
  # Assert: < 20 lines (기존 69줄에서 대폭 축소)
  
  # localStorage 로직 제거됨
  grep -c "localStorage" apps/portfolio/src/scripts/modules/theme.js
  # Assert: 0
  ```

  **Commit**: YES (groups with Task 3, 4)
  - Message: `style(portfolio): convert to dark-only mode, remove theme toggle`
  - Files: `src/styles/base.css`, `src/scripts/modules/theme.js`

---

- [x] 3. components.css 글로우 + 타이핑 + 스킬바

  **What to do**:
  - **카드 글로우 효과**:
    ```css
    .resume-item:hover,
    .project-item:hover {
      box-shadow: var(--glow-cyan);
      border-color: var(--cyber-cyan);
    }
    ```
  - **링크 글로우**:
    ```css
    .hero-link:hover,
    .project-link-title:hover {
      color: var(--cyber-cyan);
      text-shadow: var(--glow-text-cyan);
    }
    ```
  - **타이핑 애니메이션** (히어로 이름용):
    ```css
    .typing-effect {
      overflow: hidden;
      border-right: 2px solid var(--cyber-cyan);
      white-space: nowrap;
      animation: 
        typing 2s steps(20, end),
        blink-caret 0.75s step-end infinite;
    }
    @keyframes typing {
      from { width: 0 }
      to { width: 100% }
    }
    @keyframes blink-caret {
      from, to { border-color: transparent }
      50% { border-color: var(--cyber-cyan) }
    }
    ```
  - **스킬 프로그레스 바** (Observability 카테고리):
    ```css
    .skill-bar-container {
      background: var(--bg-tertiary);
      border-radius: 4px;
      height: 8px;
      overflow: hidden;
    }
    .skill-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--cyber-cyan), var(--cyber-magenta));
      box-shadow: var(--glow-cyan);
      transition: width 1s ease;
    }
    ```
  - **스킬 태그 글로우** (다른 카테고리):
    ```css
    .skill-tag-glow {
      background: var(--bg-tertiary);
      border: 1px solid var(--cyber-cyan);
      color: var(--cyber-cyan);
      padding: 4px 12px;
      border-radius: 4px;
      transition: box-shadow 0.3s ease;
    }
    .skill-tag-glow:hover {
      box-shadow: var(--glow-cyan);
    }
    ```
  - **카드 fade-in 애니메이션**:
    ```css
    .fade-in {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .fade-in.visible {
      opacity: 1;
      transform: translateY(0);
    }
    ```

  **Must NOT do**:
  - 스캔라인/글리치 효과
  - 과도한 애니메이션 (3초 이상 루프)
  - 기존 레이아웃 구조 변경

  **Recommended Agent Profile**:
  - **Category**: `artistry`
    - Reason: 시각적 효과, 애니메이션, UI 디자인
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: CSS 애니메이션, 글로우 효과, 인터랙션 디자인

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:
  **Pattern References**:
  - `src/styles/components.css:1-293` - 현재 컴포넌트 스타일, .resume-item, .project-item, .skill-row 구조

  **Target Design Reference**:
  - 글로우: `box-shadow 0 0 20px rgba(0,240,255,0.6)`
  - 타이핑: `steps() + overflow:hidden + border-right cursor`
  - 그라디언트 바: `linear-gradient(90deg, cyan, magenta)`

  **Acceptance Criteria**:
  ```bash
  # 글로우 효과 정의됨
  grep -c "glow-cyan\|box-shadow.*0 0" apps/portfolio/src/styles/components.css
  # Assert: >= 3
  
  # 타이핑 애니메이션 정의됨
  grep -c "@keyframes typing" apps/portfolio/src/styles/components.css
  # Assert: 1
  
  # 스킬 바 정의됨
  grep -c "skill-bar" apps/portfolio/src/styles/components.css
  # Assert: >= 2
  ```

  **Commit**: YES (groups with Task 2, 4)
  - Message: `style(portfolio): add neon glow effects, typing animation, skill bars`
  - Files: `src/styles/components.css`

---

- [x] 4. layout.css + utilities.css + media.css 업데이트

  **What to do**:
  - **layout.css**:
    - `.site-header` 배경 투명 유지 또는 subtle 글래스 효과
    - `.section-title` 네온 액센트 색상
    - `.site-footer` 경계선 네온 색상
  - **utilities.css**:
    - `.glass` 클래스들 다크 테마용 조정 (이미 `[data-theme="dark"]` 있음 → 기본값으로 통합)
    - 글로우 유틸리티 추가:
      ```css
      .glow-cyan { box-shadow: var(--glow-cyan); }
      .glow-magenta { box-shadow: var(--glow-magenta); }
      .text-glow-cyan { text-shadow: var(--glow-text-cyan); }
      .gradient-text {
        background: linear-gradient(90deg, var(--cyber-cyan), var(--cyber-magenta));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      ```
    - `[data-theme="dark"]` 조건부 스타일 제거 → 기본값으로 통합
  - **media.css**: 
    - 현재 파일 확인 후 필요시 모바일에서 글로우 강도 조정 (성능)

  **Must NOT do**:
  - 레이아웃 구조 변경 (max-width, padding 등)
  - 새로운 브레이크포인트 추가

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 유틸리티 클래스 추가, 조건부 스타일 정리
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: CSS 유틸리티 패턴

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:
  **Pattern References**:
  - `src/styles/layout.css:1-88` - 현재 레이아웃 구조
  - `src/styles/utilities.css:1-297` - 현재 유틸리티, 글래스 효과, `[data-theme="dark"]` 조건부 스타일
  - `src/styles/media.css` - 반응형 쿼리 (파일 확인 필요)

  **Acceptance Criteria**:
  ```bash
  # 글로우 유틸리티 추가됨
  grep -c "\.glow-cyan\|\.glow-magenta\|\.gradient-text" apps/portfolio/src/styles/utilities.css
  # Assert: >= 3
  
  # [data-theme="dark"] 조건부 제거됨
  grep -c '\[data-theme="dark"\]' apps/portfolio/src/styles/utilities.css
  # Assert: 0
  ```

  **Commit**: YES (groups with Task 2, 3)
  - Message: `style(portfolio): add glow utilities, consolidate dark theme defaults`
  - Files: `src/styles/layout.css`, `src/styles/utilities.css`, `src/styles/media.css`

---

- [x] 5. index.html + index-en.html 구조 업데이트

  **What to do**:
  - **히어로 섹션**:
    - `.hero-name`에 `typing-effect` 클래스 추가
    - 또는 wrapper `<span class="typing-effect">` 추가
  - **스킬 섹션 구조 변경**:
    - Observability 카테고리: 프로그레스 바 구조로 변경
      ```html
      <div class="skill-bar-container">
        <div class="skill-bar" style="width: 95%"></div>
      </div>
      <span class="skill-label">Grafana, Prometheus, Loki...</span>
      ```
    - 다른 카테고리: `.skill-tag-glow` 클래스 적용
  - **카드 요소**:
    - `.resume-item`, `.project-item`에 `fade-in` 클래스 추가
  - **theme-color 메타 태그**:
    - `#ffffff` → `#0c0c12` 변경
  - **data-theme 초기값**:
    - `<html>` 태그에 `data-theme="dark"` 추가 (또는 JS가 설정)

  **Must NOT do**:
  - 콘텐츠 텍스트 변경 (한글/영문 유지)
  - 새로운 섹션 추가
  - 기존 시맨틱 구조 변경

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: HTML 구조 + CSS 클래스 통합, 바이링구얼 동기화
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 마크업과 스타일 통합

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (Sequential)
  - **Blocks**: Task 6
  - **Blocked By**: Task 2, 3, 4

  **References**:
  **Pattern References**:
  - `index.html:1-200+` - 현재 HTML 구조, 히어로, 스킬 섹션
  - `index-en.html` - 영문 버전 (동일 구조)

  **Data References**:
  - `data.json` skills 구조: observability, cloud, devops, automation, database, security 카테고리

  **Acceptance Criteria**:
  ```bash
  # 타이핑 효과 클래스 적용됨
  grep -c "typing-effect" apps/portfolio/index.html
  # Assert: >= 1
  
  # 스킬 바 구조 추가됨
  grep -c "skill-bar" apps/portfolio/index.html
  # Assert: >= 1
  
  # 테마 컬러 변경됨
  grep 'theme-color.*#0c0c12\|theme-color.*0c0c12' apps/portfolio/index.html
  # Assert: 출력됨
  
  # 영문 버전도 동일 적용
  grep -c "typing-effect" apps/portfolio/index-en.html
  # Assert: >= 1
  ```

  **Commit**: YES
  - Message: `feat(portfolio): update HTML structure for neon theme (typing, skill bars)`
  - Files: `index.html`, `index-en.html`

---

- [x] 6. generate-worker.js 실행 + CSP 확인

  **What to do**:
  - `node generate-worker.js` 실행
  - 빌드 성공 확인 (exit code 0)
  - worker.js 생성 확인
  - CSP 해시 추출 로그 확인 (KO + EN 유니온)

  **Must NOT do**:
  - worker.js 직접 수정
  - generate-worker.js 로직 변경

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 빌드 명령 실행
  - **Skills**: []
    - 빌드 스크립트 실행, 특별한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (Sequential)
  - **Blocks**: Task 7
  - **Blocked By**: Task 5

  **References**:
  **Build References**:
  - `generate-worker.js` - 빌드 엔진
  - `AGENTS.md` 빌드 파이프라인 설명

  **Acceptance Criteria**:
  ```bash
  cd apps/portfolio && node generate-worker.js
  # Assert: Exit code 0
  # Assert: "worker.js" 파일 생성/갱신됨
  
  ls -la apps/portfolio/worker.js
  # Assert: 최근 타임스탬프
  ```

  **Commit**: YES
  - Message: `build(portfolio): regenerate worker.js with neon theme`
  - Files: `worker.js`

---

- [x] 7. Wrangler 배포 + 수동 검증

  **What to do**:
  - Wrangler로 프로덕션 배포:
    ```bash
    source ~/.env && cd apps/portfolio && \
      CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY" \
      CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL" \
      npx wrangler deploy --env production
    ```
  - 배포 성공 확인
  - 수동 검증 체크리스트 수행 (위 Verification Strategy 참조)

  **Must NOT do**:
  - 실패 시 강제 배포
  - 검증 없이 완료 처리

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 배포 명령 + 수동 검증 가이드
  - **Skills**: [`playwright`]
    - `playwright`: 배포 후 스크린샷 캡처 가능 (선택사항)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (Final)
  - **Blocks**: None
  - **Blocked By**: Task 6

  **References**:
  **Deploy References**:
  - `AGENTS.md` 배포 명령
  - `wrangler.toml` 환경 설정

  **Acceptance Criteria**:
  ```bash
  # 배포 성공
  # Assert: Wrangler 출력에 "Published" 또는 성공 메시지
  
  # Health check
  curl -s https://resume.jclee.me/health | jq '.status'
  # Assert: "healthy"
  ```

  **Manual Verification** (사용자 수행):
  - [ ] https://resume.jclee.me 접속 - 다크 배경 확인
  - [ ] 히어로 타이핑 애니메이션 동작
  - [ ] 카드 호버 글로우 확인
  - [ ] https://resume.jclee.me/en 동일 확인
  - [ ] 콘솔 CSP 에러 없음

  **Commit**: NO (이미 Task 6에서 커밋됨)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `style(portfolio): replace color palette with neon/terminal theme` | variables.css | grep 검증 |
| 2+3+4 (grouped) | `style(portfolio): implement neon effects and dark-only mode` | base.css, theme.js, components.css, layout.css, utilities.css, media.css | grep 검증 |
| 5 | `feat(portfolio): update HTML structure for neon theme` | index.html, index-en.html | grep 검증 |
| 6 | `build(portfolio): regenerate worker.js with neon theme` | worker.js | 빌드 성공 |

---

## Success Criteria

### Verification Commands
```bash
# 빌드 성공
cd apps/portfolio && node generate-worker.js && echo "BUILD OK"

# 배포 성공
curl -s https://resume.jclee.me/health | jq '.status'
# Expected: "healthy"

# CSP 에러 없음 (브라우저 콘솔에서 수동 확인)
```

### Final Checklist
- [ ] 다크 배경 (#0c0c12 계열) 적용됨
- [ ] 네온 글로우 효과 동작
- [ ] 타이핑 애니메이션 동작
- [ ] Observability 스킬바 표시
- [ ] KO/EN 양쪽 동일 스타일
- [ ] CSP 위반 없음
- [ ] `pre-neon-redesign` 태그로 롤백 가능

---

## Rollback Procedure

문제 발생 시:
```bash
# 1. 태그로 체크아웃
git checkout pre-neon-redesign

# 2. worker.js 재생성
cd apps/portfolio && node generate-worker.js

# 3. 재배포
source ~/.env && CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY" \
  CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL" npx wrangler deploy --env production
```
