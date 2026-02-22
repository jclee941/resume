# CI/CD 자동화 가이드

**작성일**: 2025-12-23  
**버전**: 1.0  
**상태**: ✅ 완료

---

## 📋 개요

이 문서는 Resume 프로젝트의 CI/CD 자동화 시스템을 설명합니다.

---

## 🚀 워크플로우 구조

### 1. CI 워크플로우 (`.github/workflows/ci.yml`)

**트리거**: Pull Request, develop 브랜치 push

**작업 순서**:

```
lint → typecheck → test-unit → test-e2e → test-coverage → build → security-audit → summary
```

#### 작업 상세

##### 1.1 Lint (코드 품질 검사)

```yaml
- ESLint 실행
- 에러 카운트 확인
- 에러 발견 시 실패
- 경고는 허용
```

**통과 조건**:

- ESLint 에러 0개

##### 1.2 TypeCheck (타입 검사)

```yaml
- TypeScript 컴파일 검사
- JSDoc 타입 검증
- 결과 리포트 생성
```

**통과 조건**:

- 치명적인 타입 에러 없음

##### 1.3 Unit Tests (단위 테스트)

```yaml
- Jest 단위 테스트 실행
- 커버리지 수집
- Codecov 업로드
```

**통과 조건**:

- 모든 테스트 통과
- 커버리지 90% 이상

##### 1.4 E2E Tests (E2E 테스트)

```yaml
- Playwright 설치
- 프로젝트 빌드
- E2E 테스트 실행
```

**통과 조건**:

- 모든 E2E 테스트 통과

##### 1.5 Coverage Check (커버리지 검사)

```yaml
- 커버리지 임계값 확인
- Statements: 90%
- Branches: 90%
- Functions: 90%
- Lines: 90%
```

**통과 조건**:

- 모든 메트릭 90% 이상

##### 1.6 Build (빌드 검증)

```yaml
- 프로젝트 빌드
- worker.js 생성 확인
- 파일 크기 검증
```

**통과 조건**:

- worker.js 정상 생성
- 최소 크기 충족

##### 1.7 Security Audit (보안 감사)

```yaml
- npm audit 실행
- 취약점 확인
- Critical/High 경고
```

**통과 조건**:

- Critical/High 취약점 없음 (권장)

---

### 2. Deploy 워크플로우 (`.github/workflows/ci.yml`)

**트리거**: master 브랜치 push, 수동 실행

**작업 순서**:

```
validate → build → deploy → verify → lighthouse → notify
```

#### 작업 상세

##### 2.1 Validate (배포 전 검증)

```yaml
- 버전 정보 수집
- 커밋 정보 수집
- 모든 테스트 실행
- 커버리지 확인
- Lint 검사
```

**통과 조건**:

- 모든 테스트 통과
- 커버리지 90% 이상
- Lint 에러 없음

##### 2.2 Build (워커 빌드)

```yaml
- 빌드 메타데이터 설정
- worker.js 생성
- 빌드 검증
- JavaScript 유효성 검사
```

**통과 조건**:

- worker.js 정상 생성
- 유효한 JavaScript 코드

##### 2.3 Deploy (Cloudflare 배포)

```yaml
- 빌드 아티팩트 다운로드
- Cloudflare Workers 배포
- 배포 전파 대기
```

**통과 조건**:

- Cloudflare 배포 성공

##### 2.4 Verify (배포 검증)

```yaml
- Health check (재시도 5회)
- 메인 페이지 확인
- 핵심 콘텐츠 검증
- i18n 지원 확인
- 성능 확인
- 보안 헤더 확인
```

**통과 조건**:

- Health check 성공
- HTTP 200 응답
- 핵심 콘텐츠 존재
- 응답 시간 < 2초

##### 2.5 Lighthouse (성능 테스트)

```yaml
- Lighthouse CI 실행
- 성능 메트릭 수집
- 결과 업로드
```

**통과 조건**:

- Lighthouse 점수 기준 충족

##### 2.6 Notify (알림)

```yaml
- 배포 정보 수집
- n8n webhook 호출
- 배포 요약 생성
```

**통과 조건**:

- 알림 전송 성공

---

## 🔧 설정 방법

### 1. GitHub Secrets 설정

필수 Secrets:

```bash
CLOUDFLARE_API_TOKEN      # Cloudflare API 토큰
CLOUDFLARE_ACCOUNT_ID     # Cloudflare 계정 ID
```

선택 Secrets:

```bash
N8N_WEBHOOK_URL          # n8n webhook URL
SLACK_WEBHOOK_URL        # Slack webhook URL
CODECOV_TOKEN            # Codecov 토큰
```

### 2. Secrets 설정 방법

#### GitHub UI에서:

1. Repository → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. Name과 Value 입력
4. "Add secret" 클릭

#### GitHub CLI로:

```bash
# Cloudflare API Token
gh secret set CLOUDFLARE_API_TOKEN

# Cloudflare Account ID
gh secret set CLOUDFLARE_ACCOUNT_ID

# n8n Webhook URL (선택)
gh secret set N8N_WEBHOOK_URL

# Slack Webhook URL (선택)
gh secret set SLACK_WEBHOOK_URL
```

---

## 📊 워크플로우 실행

### CI 워크플로우 실행

#### Pull Request 생성 시 자동 실행:

```bash
git checkout -b feature/new-feature
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
# GitHub에서 PR 생성
```

#### develop 브랜치 push 시 자동 실행:

```bash
git checkout develop
git merge feature/new-feature
git push origin develop
```

### Deploy 워크플로우 실행

#### master 브랜치 push 시 자동 실행:

```bash
git checkout master
git merge develop
git push origin master
```

#### 수동 실행:

1. GitHub → Actions → "Deploy - Enhanced with Verification"
2. "Run workflow" 클릭
3. Environment 선택 (production/staging)
4. "Run workflow" 클릭

---

## 🔍 검증 체크리스트

### CI 검증

- [ ] ESLint 에러 0개
- [ ] TypeScript 에러 없음
- [ ] 모든 단위 테스트 통과
- [ ] 모든 E2E 테스트 통과
- [ ] 커버리지 90% 이상
- [ ] 빌드 성공
- [ ] 보안 취약점 없음

### Deploy 검증

- [ ] 모든 테스트 통과
- [ ] 빌드 성공
- [ ] Cloudflare 배포 성공
- [ ] Health check 통과
- [ ] 메인 페이지 정상
- [ ] 핵심 콘텐츠 존재
- [ ] i18n 작동
- [ ] 성능 기준 충족
- [ ] 보안 헤더 존재

---

## 🚨 문제 해결

### CI 실패 시

#### Lint 실패:

```bash
# 로컬에서 확인
npm run lint

# 자동 수정
npm run lint:fix
```

#### Test 실패:

```bash
# 로컬에서 테스트
npm test

# 특정 테스트만
npm test -- tests/unit/lib/utils.test.js
```

#### Coverage 실패:

```bash
# 커버리지 확인
npm run test:coverage

# 커버리지 리포트 확인
open coverage/lcov-report/index.html
```

#### Build 실패:

```bash
# 로컬에서 빌드
npm run build

# 빌드 로그 확인
npm run build:debug
```

### Deploy 실패 시

#### Health Check 실패:

```bash
# 로컬에서 health check
curl https://resume.jclee.me/health

# 로그 확인
wrangler tail
```

#### Verification 실패:

```bash
# 메인 페이지 확인
curl -I https://resume.jclee.me

# 콘텐츠 확인
curl https://resume.jclee.me | grep "Infrastructure"
```

#### Rollback:

```bash
# Cloudflare 대시보드에서 이전 버전으로 롤백
# 또는 wrangler CLI 사용
wrangler rollback
```

---

## 📈 모니터링

### GitHub Actions

#### 워크플로우 상태 확인:

```
Repository → Actions → 워크플로우 선택
```

#### 실행 로그 확인:

```
Actions → 워크플로우 실행 → Job 선택 → Step 로그 확인
```

### Cloudflare

#### 배포 상태 확인:

```
Cloudflare Dashboard → Workers → resume → Deployments
```

#### 로그 확인:

```bash
wrangler tail
```

### n8n Webhook

#### Webhook 로그 확인:

```
n8n → Workflows → Deployment Webhook → Executions
```

---

## 🎯 베스트 프랙티스

### 1. 커밋 메시지

```bash
# 좋은 예
feat: add i18n support for Korean
fix: resolve memory leak in ab-testing
docs: update CI/CD documentation

# 나쁜 예
update
fix bug
changes
```

### 2. Pull Request

```markdown
# PR 템플릿

## 변경 사항

- 기능 A 추가
- 버그 B 수정

## 테스트

- [ ] 단위 테스트 추가
- [ ] E2E 테스트 추가
- [ ] 수동 테스트 완료

## 체크리스트

- [ ] Lint 통과
- [ ] 테스트 통과
- [ ] 문서 업데이트
```

### 3. 배포 전 체크

```bash
# 로컬에서 모든 검증 실행
npm test
npm run test:coverage
npm run lint
npm run typecheck
npm run build

# 모두 통과하면 배포
git push origin master
```

---

## 📚 참고 자료

### GitHub Actions

- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Workflow 문법](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

### Cloudflare Workers

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Workers 문서](https://developers.cloudflare.com/workers/)

### 테스팅

- [Jest 문서](https://jestjs.io/)
- [Playwright 문서](https://playwright.dev/)

---

**작성**: Auto Agent  
**최종 업데이트**: 2025-12-23  
**버전**: 1.0
