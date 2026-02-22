# Cloudflare API 토큰 생성 가이드

**목적**: Resume 포트폴리오 배포를 위한 Cloudflare Workers API 토큰 생성

---

## ⚡ 빠른 시작 (3분 소요)

### 1단계: Cloudflare Dashboard 접속

**URL**: https://dash.cloudflare.com/profile/api-tokens

브라우저에서 위 링크를 열고 Cloudflare 계정으로 로그인하세요.

---

### 2단계: 토큰 생성

1. **"Create Token"** 버튼 클릭

2. **"Edit Cloudflare Workers"** 템플릿 선택
   - 템플릿 목록에서 찾기
   - 또는 "Create Custom Token"으로 직접 설정

3. **권한 설정** (Custom Token 사용 시)
   - Account - Workers Scripts - **Edit**
   - Account - Workers KV Storage - **Edit**
   - Zone - Workers Routes - **Edit**

4. **"Continue to summary"** 클릭

5. **"Create Token"** 클릭

---

### 3단계: 토큰 복사

**⚠️ 중요**: 토큰은 **한 번만 표시**됩니다!

```
생성된 토큰 예시:
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**즉시 복사**하세요. (다시 볼 수 없습니다)

---

### 4단계: 환경 변수 설정

#### Option A: .env 파일에 저장 (권장)

```bash
# .env 파일 편집
vim ~/.env

# 다음 라인을 찾아서 토큰 값 업데이트:
CLOUDFLARE_API_TOKEN=여기에_복사한_토큰_붙여넣기

# 저장 후 종료 (:wq)
```

#### Option B: 일회성 환경 변수

```bash
export CLOUDFLARE_API_TOKEN=여기에_복사한_토큰_붙여넣기
```

---

### 5단계: Account ID 확인 (선택사항)

**필요한 경우**: wrangler.toml에 account_id가 없으면

1. Cloudflare Dashboard: https://dash.cloudflare.com/
2. 왼쪽 메뉴에서 **"Workers & Pages"** 클릭
3. 오른쪽 사이드바에서 **"Account ID"** 확인
4. 32자리 hex 문자열 복사

```bash
# .env에 추가
vim ~/.env
# 추가: CLOUDFLARE_ACCOUNT_ID=복사한_account_id
```

---

## 🚀 배포 실행

### 환경 변수 로드 및 배포

```bash
# 환경 변수 새로고침
source ~/.env

# 토큰 확인
echo "Token length: ${#CLOUDFLARE_API_TOKEN}"
# 출력: Token length: 40 (정상적인 길이)

# 배포 실행 (자동화 스크립트)
cd /home/jclee/dev/resume
./scripts/deployment/quick-deploy.sh
```

**실행 결과**:

- ✓ Prerequisites 체크
- ✓ Tests 실행 (10/10)
- ✓ Worker 빌드
- ✓ Cloudflare 배포
- ✓ 7단계 검증

---

## 🔍 토큰 검증

배포 전 토큰이 유효한지 확인:

```bash
cd /home/jclee/dev/resume/typescript/portfolio-worker
source ~/.env
npx wrangler whoami
```

**성공 시 출력**:

```
Getting User settings...
👋 You are logged in with an API Token, associated with the email 'your@email.com'!
```

**실패 시**:

- "Invalid request headers" → 토큰 형식 오류
- "Unable to authenticate" → 토큰 만료 또는 권한 부족

---

## 🔐 토큰 보안

### 중요 사항

1. **절대 공유하지 마세요**
   - API 토큰은 계정 접근 권한을 제공합니다
   - Git 커밋에 포함하지 마세요 (.env는 .gitignore에 포함)

2. **권한 최소화**
   - "Edit Cloudflare Workers" 권한만 부여
   - 전체 계정 접근 권한은 불필요

3. **주기적 갱신**
   - 90일마다 토큰 재생성 권장
   - 만료일 설정 권장

4. **유출 시 즉시 폐기**
   - Dashboard → API Tokens → Roll 또는 Delete

---

## 🆘 문제 해결

### 토큰 생성 시 "Edit Cloudflare Workers" 템플릿이 없어요

**해결**:

1. "Create Custom Token" 클릭
2. 다음 권한 수동 추가:
   - Account - Workers Scripts - Edit
   - Account - Workers KV Storage - Edit
   - Zone - Workers Routes - Edit

---

### "Invalid format for Authorization header" 오류

**원인**: 토큰에 공백 또는 잘못된 문자 포함

**해결**:

```bash
# .env 파일 확인
cat ~/.env | grep CLOUDFLARE_API_TOKEN

# 공백 제거 확인 (토큰 앞뒤 공백 없어야 함)
# 올바른 형식: CLOUDFLARE_API_TOKEN=xxxxxxxx
# 잘못된 형식: CLOUDFLARE_API_TOKEN= xxxxxxxx (공백 있음)
```

---

### 토큰이 저장되지 않아요

**원인**: .env 파일 권한 또는 심볼릭 링크 문제

**해결**:

```bash
# .env 파일 권한 확인
ls -la ~/.env
# 출력: -rw------- (600 권한이어야 함)

# 권한 설정
chmod 600 ~/.env

# 심볼릭 링크 확인
readlink -f ~/.env
# 실제 파일 경로 표시
```

---

### wrangler whoami가 실패해요

**원인 1**: 환경 변수가 로드되지 않음

**해결**:

```bash
source ~/.env
npx wrangler whoami
```

**원인 2**: 토큰 만료 또는 권한 부족

**해결**:

1. Dashboard에서 토큰 확인
2. 만료됐으면 새 토큰 생성
3. 권한 부족하면 권한 추가

---

## 📚 추가 리소스

| 리소스                        | 링크                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------- |
| **시각적 배포 가이드** ⭐ NEW | docs/DEPLOYMENT_VISUAL_GUIDE.md                                              |
| **인증 방법 비교** ⭐ NEW     | docs/CLOUDFLARE_AUTH_METHODS.md                                              |
| Cloudflare API Tokens 문서    | https://developers.cloudflare.com/fundamentals/api/get-started/create-token/ |
| Workers 배포 가이드           | https://developers.cloudflare.com/workers/get-started/guide/                 |
| Wrangler 문서                 | https://developers.cloudflare.com/workers/wrangler/                          |
| 프로젝트 배포 가이드          | docs/MANUAL_DEPLOYMENT_GUIDE.md                                              |
| 자동화 스크립트 가이드        | scripts/README.md                                                            |

---

## ✅ 체크리스트

배포 전 다음을 확인하세요:

- [ ] Cloudflare 계정 로그인 확인
- [ ] API 토큰 생성 ("Edit Cloudflare Workers" 권한)
- [ ] 토큰을 ~/.env 파일에 저장
- [ ] `source ~/.env` 실행
- [ ] `npx wrangler whoami`로 검증 성공
- [ ] Account ID 확인 (필요시)
- [ ] 배포 스크립트 실행 준비

---

**다음 단계**:

```bash
source ~/.env
cd /home/jclee/dev/resume
./scripts/deployment/quick-deploy.sh
```

---

**Last Updated**: 2025-11-12T00:55:00Z
**Maintainer**: OpenCode AI Assistant
**Version**: 1.0.0
