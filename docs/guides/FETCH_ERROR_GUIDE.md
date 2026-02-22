# Cloudflare API 키 설정 완벽 가이드

**목적**: Cloudflare Workers 배포를 위한 API 인증 설정  
**대상**: resume.jclee.me 프로젝트  
**소요 시간**: 5-10분

---

## 🎯 현재 상황

### 문제

```
Error: CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, and CLOUDFLARE_ACCOUNT_ID must be set in ~/.env
```

### 원인

- Cloudflare API 인증 정보가 `~/.env` 파일에 없음
- Wrangler CLI 인증 미완료

### 해결책

**Option 1**: API 토큰 설정 (권장, 5분)  
**Option 2**: Wrangler CLI 로그인 (간편, 2분)

---

## ✅ Option 1: API 토큰 설정 (권장)

### 장점

- 더 안전 (제한된 권한)
- CI/CD 자동화 가능
- 토큰 관리 용이

### 단계

#### 1. API 토큰 생성

**접속**: https://dash.cloudflare.com/profile/api-tokens

**순서**:

1. `Create Token` 클릭
2. `Edit Cloudflare Workers` 템플릿 선택
3. **Permissions** 확인:
   - ✅ Account > Workers Scripts > Edit
   - ✅ Account > Workers Routes > Edit
4. **Account Resources**:
   - Include > Specific account > 자신의 계정
5. `Continue to summary`
6. `Create Token`
7. **토큰 복사** (⚠️ 다시 볼 수 없음!)

#### 2. 환경 변수 설정

**빠른 설정** (토큰을 `YOUR_TOKEN_HERE`에 붙여넣기):

```bash
cat >> ~/.env << 'ENVEOF'
CLOUDFLARE_API_TOKEN=YOUR_TOKEN_HERE
CLOUDFLARE_ACCOUNT_ID=a8d9c67f586acdd15eebcc65ca3aa5bb
ENVEOF
```

**또는 대화형**:

```bash
cd /home/jclee/dev/resume
bash auto-fix-api-keys.sh --interactive
```

#### 3. 검증

```bash
grep CLOUDFLARE ~/.env
# 출력:
# CLOUDFLARE_API_TOKEN=abc123...
# CLOUDFLARE_ACCOUNT_ID=a8d9c67f586acdd15eebcc65ca3aa5bb
```

#### 4. 배포

```bash
cd /home/jclee/dev/resume
npm run deploy:wrangler:root
```

---

## ✅ Option 2: Wrangler CLI 로그인 (간편)

### 장점

- 빠른 설정 (2분)
- 환경 변수 불필요
- 브라우저 자동 인증

### 단점

- CI/CD 자동화 어려움
- 로컬 머신에만 유효

### 단계

#### 1. Wrangler 로그인

```bash
cd /home/jclee/dev/resume/typescript/portfolio-worker
npx wrangler login
```

**결과**: 브라우저가 열리며 Cloudflare 로그인 페이지 표시

#### 2. 인증

- Cloudflare 계정으로 로그인
- "Allow Wrangler" 클릭

#### 3. 확인

```bash
npx wrangler whoami
# 출력: 계정 정보 표시
```

#### 4. 배포

```bash
npm run deploy:wrangler:root
```

---

## 🔧 문제 해결

### Issue 1: "Token not found"

**원인**: 환경 변수 형식 오류

**해결**:

```bash
# 현재 설정 확인
cat ~/.env | grep CLOUDFLARE

# 올바른 형식 (공백 없음):
CLOUDFLARE_API_TOKEN=abc123def456

# 잘못된 형식 (공백 있음):
CLOUDFLARE_API_TOKEN = abc123def456  # ❌

# 수정
nano ~/.env  # 공백 제거
```

### Issue 2: "Invalid account ID"

**원인**: Account ID 불일치

**해결**:

```bash
# wrangler.toml의 account_id 확인
cat typescript/portfolio-worker/wrangler.toml | grep account_id
# 출력: account_id = "a8d9c67f586acdd15eebcc65ca3aa5bb"

# .env에 동일한 ID 설정
echo 'CLOUDFLARE_ACCOUNT_ID=a8d9c67f586acdd15eebcc65ca3aa5bb' >> ~/.env
```

### Issue 3: "Permission denied"

**원인**: API 토큰 권한 부족

**해결**:

1. https://dash.cloudflare.com/profile/api-tokens 접속
2. 해당 토큰의 `Edit` 클릭
3. Permissions 확인 및 수정:
   - Account > Workers Scripts > **Edit** ✅
   - Account > Workers Routes > **Edit** ✅
4. `Update Token`
5. 새 토큰 복사 및 `~/.env` 업데이트

### Issue 4: "Wrangler login failed"

**원인**: 브라우저 세션 만료 또는 차단

**해결**:

```bash
# 로그아웃 후 재시도
npx wrangler logout
npx wrangler login

# 또는 다른 브라우저 사용
BROWSER=firefox npx wrangler login
```

---

## 📊 비교표

| 항목          | API Token  | Wrangler Login |
| ------------- | ---------- | -------------- |
| **설정 시간** | 5분        | 2분            |
| **보안**      | 높음       | 중간           |
| **CI/CD**     | ✅ 가능    | ❌ 불가능      |
| **권한 제어** | ✅ 세밀    | ❌ 전체        |
| **유효 기간** | 설정 가능  | 세션 기반      |
| **추천**      | Production | Development    |

---

## 🎯 추천 설정

### Development (로컬 개발)

```bash
# Wrangler login 사용
npx wrangler login
```

### Production (CI/CD)

```bash
# API Token 사용
echo 'CLOUDFLARE_API_TOKEN=...' >> ~/.env
echo 'CLOUDFLARE_ACCOUNT_ID=...' >> ~/.env
```

### 현재 프로젝트 (resume.jclee.me)

**권장**: **API Token** (Option 1)

**이유**:

- 향후 CI/CD 파이프라인 구축 예정
- 더 안전한 권한 관리
- 자동화 친화적

---

## 📝 체크리스트

배포 전 확인:

- [ ] API 토큰 생성 완료
- [ ] `~/.env`에 `CLOUDFLARE_API_TOKEN` 설정
- [ ] `~/.env`에 `CLOUDFLARE_ACCOUNT_ID` 설정
- [ ] `grep CLOUDFLARE ~/.env` 확인
- [ ] `typescript/portfolio-worker/wrangler.toml`에 `account_id` 존재
- [ ] `npm run build` 성공
- [ ] `npm test` 통과

배포 명령:

```bash
cd /home/jclee/dev/resume
npm run deploy:wrangler:root
```

---

## 🚀 배포 후 검증

### 1. 배포 성공 확인

```bash
# 로그에서 확인
# ✅ Successfully published
# 🌍 https://resume.jclee.me
```

### 2. Health Check

```bash
curl -I https://resume.jclee.me
# HTTP/2 200 OK
```

### 3. E2E 테스트

```bash
npm run test:e2e
```

### 4. 프로덕션 검증

```bash
resume-cli auto verify
```

---

## 📚 참고 자료

### 공식 문서

- **Cloudflare API Tokens**: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/
- **Workers 배포**: https://developers.cloudflare.com/workers/get-started/guide/

### 프로젝트 문서

- **빠른 가이드**: `QUICK_FIX.md`
- **배포 설정**: `DEPLOYMENT_SETUP.md`
- **자동화 리포트**: `FINAL_AUTOMATION_REPORT.md`

---

## 🔐 보안 권장사항

### .env 파일 보호

```bash
# 권한 설정 (본인만 읽기/쓰기)
chmod 600 ~/.env

# Git에서 제외 확인
grep ".env" .gitignore  # .env가 포함되어야 함
```

### 토큰 관리

- ✅ 정기적으로 토큰 교체 (3-6개월)
- ✅ 사용하지 않는 토큰 즉시 삭제
- ✅ 토큰 유출 시 즉시 폐기 및 재생성
- ❌ 토큰을 Git에 커밋하지 않기
- ❌ 토큰을 로그에 출력하지 않기

### 백업

```bash
# .env 백업 (토큰 제외)
cp ~/.env ~/.env.backup.$(date +%Y%m%d)

# 주의: 백업 파일도 권한 관리
chmod 600 ~/.env.backup.*
```

---

**작성일**: 2025-12-19 20:35 KST  
**업데이트**: 자동  
**버전**: 1.0
